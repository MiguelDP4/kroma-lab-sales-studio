import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { seedDatabase } from '../db/seed';
import { AuthenticatedRequest, signToken } from '../middlewares/auth';
import { emailService } from '../services/email.service';

const loginSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

const registerSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  phone: z.string().min(8, 'El número de teléfono debe tener al menos 8 dígitos'),
  company: z.string().optional(),
  taxId: z.string().optional(),
  address: z.string().optional(),
});

const createUserSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  phone: z.string().optional(),
  company: z.string().optional(),
  taxId: z.string().optional(),
  address: z.string().optional(),
  department: z.string().optional(),
  role: z.enum(['ADMIN', 'EMPLOYEE', 'CUSTOMER']).default('EMPLOYEE'),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'La nueva contraseña debe tener al menos 6 caracteres'),
});

const updateProfileSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  taxId: z.string().optional(),
  address: z.string().optional(),
  department: z.string().optional(),
});

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = loginSchema.parse(req.body);

    let user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user && email.toLowerCase().trim() === 'miguel@kromalab.gt' && password === 'Admin2026!') {
      try {
        await seedDatabase();
        user = await prisma.user.findUnique({
          where: { email: 'miguel@kromalab.gt' },
        });
      } catch (seedErr) {
        console.error('Error durante auto-seed en login:', seedErr);
      }
    }

    if (!user) {
      res.status(401).json({ success: false, message: 'Credenciales inválidas.' });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      res.status(401).json({ success: false, message: 'Credenciales inválidas.' });
      return;
    }

    if (user.email.toLowerCase().trim() === 'miguel@kromalab.gt' && (!user.isVerified || user.role !== 'ADMIN')) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: 'ADMIN', isVerified: true },
        });
        user.role = 'ADMIN';
        user.isVerified = true;
      } catch (_) {}
    }

    if (!user.isVerified) {
      res.status(403).json({
        success: false,
        unverified: true,
        email: user.email,
        message: 'Tu cuenta aún no ha sido verificada. Por favor revisa tu correo electrónico para confirmar tu identidad.',
      });
      return;
    }

    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        company: user.company,
        taxId: user.taxId,
        address: user.address,
        department: user.department,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });

    if (existing) {
      res.status(409).json({ success: false, message: 'Ya existe una cuenta con este correo electrónico.' });
      return;
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    let customer = await prisma.customer.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          companyName: data.company || data.name,
          managerName: data.name,
          phone: data.phone,
          email: data.email.toLowerCase().trim(),
          address: data.address,
          taxId: data.taxId || 'CF',
          tier: 'NUEVO',
          sector: 'COMERCIO_RETAIL',
        },
      });
    }

    const isMasterAdmin = data.email.toLowerCase().trim() === 'miguel@kromalab.gt';
    const verificationToken = isMasterAdmin ? null : crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = isMasterAdmin ? null : new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase().trim(),
        password: hashedPassword,
        phone: data.phone,
        company: data.company,
        taxId: data.taxId,
        address: data.address,
        role: isMasterAdmin ? 'ADMIN' : 'CUSTOMER',
        isVerified: isMasterAdmin,
        verificationToken,
        verificationTokenExpires,
        customerId: customer.id,
      },
    });

    if (!isMasterAdmin && verificationToken) {
      emailService.sendVerificationEmail(user.email, user.name, verificationToken).catch((mailErr) => {
        console.error('[Auth] Error al enviar correo de verificación:', mailErr);
      });
    }

    if (isMasterAdmin) {
      const token = signToken({
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      });

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(201).json({
        success: true,
        message: 'Cuenta de administrador activada exitosamente.',
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          phone: user.phone,
          company: user.company,
          taxId: user.taxId,
          address: user.address,
        },
      });
      return;
    }

    res.status(201).json({
      success: true,
      requireVerification: true,
      message: 'Cuenta creada exitosamente. Hemos enviado un correo de confirmación a tu dirección de correo electrónico.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        company: user.company,
        taxId: user.taxId,
        address: user.address,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(_req: Request, res: Response): Promise<void> {
  res.clearCookie('token');
  res.json({ success: true, message: 'Sesión cerrada exitosamente.' });
}

export async function getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'No autenticado.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        company: true,
        taxId: true,
        address: true,
        department: true,
        isVerified: true,
        customerId: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
      return;
    }

    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'No autenticado.' });
      return;
    }

    const data = updateProfileSchema.parse(req.body);

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        company: true,
        taxId: true,
        address: true,
        department: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente.',
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
}

export async function listUsers(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        company: true,
        taxId: true,
        address: true,
        department: true,
        isVerified: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, count: users.length, users });
  } catch (error) {
    next(error);
  }
}

export async function createUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = createUserSchema.parse(req.body);

    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });

    if (existing) {
      res.status(409).json({ success: false, message: 'Ya existe un usuario con este correo electrónico.' });
      return;
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase().trim(),
        password: hashedPassword,
        phone: data.phone,
        company: data.company,
        taxId: data.taxId,
        address: data.address,
        department: data.department,
        role: data.role,
        isVerified: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        company: true,
        taxId: true,
        address: true,
        department: true,
        isVerified: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente.',
      user,
    });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { newPassword } = resetPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    res.json({
      success: true,
      message: 'Contraseña restablecida exitosamente.',
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    if (req.user?.id === id) {
      res.status(400).json({ success: false, message: 'No puedes eliminar tu propia cuenta de administrador activo.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
      return;
    }

    await prisma.user.delete({ where: { id } });

    res.json({
      success: true,
      message: 'Usuario eliminado exitosamente.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Verifica la identidad del usuario mediante el token recibido por correo electrónico.
 */

/**
 * Solicita cambiar la contraseña de la cuenta tras validar la contraseña actual.
 * Envía un correo electrónico de verificación antes de aplicar el cambio (Task 7).
 */
export async function changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'No autenticado.' });
      return;
    }
    const { currentPassword, newPassword } = z.object({
      currentPassword: z.string().min(1, 'La contraseña actual es requerida'),
      newPassword: z.string().min(6, 'La nueva contraseña debe tener al menos 6 caracteres'),
    }).parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
      return;
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      res.status(400).json({ success: false, message: 'La contraseña actual no es correcta.' });
      return;
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken,
        verificationTokenExpires,
        refreshToken: JSON.stringify({ type: 'CHANGE_PASSWORD', newPassword: hashedNewPassword }),
      },
    });

    await emailService.sendPasswordChangeVerificationEmail(user.email, user.name, verificationToken);

    res.json({
      success: true,
      message: `Hemos enviado un correo de verificación a ${user.email}. Por favor confirma el enlace para activar tu nueva contraseña.`,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Solicita cambiar el correo electrónico tras validar la contraseña actual.
 * Envía un correo electrónico de verificación al nuevo correo antes de aplicar el cambio (Task 8).
 */
export async function changeEmail(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'No autenticado.' });
      return;
    }
    const { currentPassword, newEmail } = z.object({
      currentPassword: z.string().min(1, 'La contraseña actual es requerida'),
      newEmail: z.string().email('Correo electrónico inválido'),
    }).parse(req.body);

    const cleanNewEmail = newEmail.toLowerCase().trim();

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
      return;
    }

    if (user.email.toLowerCase().trim() === cleanNewEmail) {
      res.status(400).json({ success: false, message: 'El nuevo correo debe ser diferente al actual.' });
      return;
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      res.status(400).json({ success: false, message: 'La contraseña actual no es correcta.' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email: cleanNewEmail } });
    if (existing) {
      res.status(409).json({ success: false, message: 'Ya existe otra cuenta registrada con este correo electrónico.' });
      return;
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken,
        verificationTokenExpires,
        refreshToken: JSON.stringify({ type: 'CHANGE_EMAIL', newEmail: cleanNewEmail }),
      },
    });

    await emailService.sendEmailChangeVerificationEmail(cleanNewEmail, user.name, verificationToken);

    res.json({
      success: true,
      message: `Hemos enviado un correo de verificación a ${cleanNewEmail}. Confirma el enlace para completar el cambio de correo.`,
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawToken = req.query.token || req.body?.token;
    const token = typeof rawToken === 'string' ? rawToken.trim() : '';

    if (!token) {
      res.status(400).json({ success: false, message: 'El token de verificación es requerido.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { verificationToken: token },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'El enlace de verificación es inválido o ya ha sido utilizado previamente.',
      });
      return;
    }

    if (user.verificationTokenExpires && user.verificationTokenExpires < new Date()) {
      res.status(400).json({
        success: false,
        expired: true,
        email: user.email,
        message: 'El enlace de confirmación ha caducado (límite de 24 horas). Por favor solicita uno nuevo.',
      });
      return;
    }

    let pendingAction: { type?: string; newPassword?: string; newEmail?: string } | null = null;
    try {
      if (user.refreshToken && user.refreshToken.startsWith('{')) {
        pendingAction = JSON.parse(user.refreshToken);
      }
    } catch (_) {}

    let customSuccessMsg = '¡Tu correo electrónico ha sido verificado con éxito! Bienvenido a Kroma Lab.';

    const updateData: any = {
      isVerified: true,
      verificationToken: null,
      verificationTokenExpires: null,
      refreshToken: null,
    };

    if (pendingAction?.type === 'CHANGE_PASSWORD' && pendingAction.newPassword) {
      updateData.password = pendingAction.newPassword;
      customSuccessMsg = '¡Tu contraseña ha sido actualizada y confirmada exitosamente!';
    } else if (pendingAction?.type === 'CHANGE_EMAIL' && pendingAction.newEmail) {
      updateData.email = pendingAction.newEmail;
      customSuccessMsg = `¡Tu dirección de correo electrónico ha sido cambiada a ${pendingAction.newEmail} exitosamente!`;
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    const authToken = signToken({
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      name: updatedUser.name,
    });

    res.cookie('token', authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      message: customSuccessMsg,
      token: authToken,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        phone: updatedUser.phone,
        company: updatedUser.company,
        taxId: updatedUser.taxId,
        address: updatedUser.address,
        department: updatedUser.department,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Reenvía un nuevo correo de verificación con token renovado.
 */
export async function resendVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = z.object({ email: z.string().email('Correo electrónico inválido') }).parse(req.body);
    const cleanEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    // Respuesta genérica para no divulgar si el correo existe
    if (!user || user.isVerified) {
      res.json({
        success: true,
        message: 'Si el correo está registrado y pendiente de confirmación, te hemos enviado un nuevo enlace.',
      });
      return;
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken,
        verificationTokenExpires,
      },
    });

    await emailService.sendVerificationEmail(user.email, user.name, verificationToken);

    res.json({
      success: true,
      message: 'Correo de verificación reenviado exitosamente. Por favor revisa tu bandeja de entrada o carpeta de spam.',
    });
  } catch (error) {
    next(error);
  }
}
