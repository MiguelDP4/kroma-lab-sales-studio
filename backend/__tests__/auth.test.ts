import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { prisma } from '../src/db/prisma';
import request from 'supertest';
import { createApp } from '../src/app';
import { seedDatabase } from '../src/db/seed';
import { signToken } from '../src/middlewares/auth';
import { getMe, updateProfile } from '../src/controllers/auth.controller';
import { emailService } from '../src/services/email.service';

const app = createApp();

describe('Auth API (/api/auth)', () => {
  let adminToken: string;

  beforeAll(async () => {
    await seedDatabase();
    it('permite a ADMIN actualizar rol y estado de un colaborador en /api/auth/users/:id', async () => {
    const createRes = await request(app)
      .post('/api/auth/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Empleado Prueba',
        email: `empleado_${Date.now()}@test.gt`,
        password: 'Password123!',
        role: 'EMPLOYEE',
      });

    const newUserId = createRes.body.user.id;

    const patchRes = await request(app)
      .patch(`/api/auth/users/${newUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        role: 'ADMIN',
        department: 'Impresión UV',
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.success).toBe(true);
    expect(patchRes.body.user.role).toBe('ADMIN');
    expect(patchRes.body.user.department).toBe('Impresión UV');
  });
});

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: '@pruebas.gt' } } });
    await prisma.customer.deleteMany({ where: { companyName: 'Empresa Test S.A.' } });
  });

  it('inicia sesión exitosamente con credenciales válidas de Admin', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'testadmin@kromalab.gt', password: 'TestAdmin2026!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('testadmin@kromalab.gt');
    expect(res.body.user.role).toBe('ADMIN');
    adminToken = res.body.token;
  });

  it('rechaza inicio de sesión con contraseña incorrecta (401)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'testadmin@kromalab.gt', password: 'WrongPassword!' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rechaza inicio de sesión con correo inexistente (401)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'noexiste@kromalab.gt', password: 'Password123!' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('registra una nueva cuenta de cliente B2B exitosamente en /api/auth/register', async () => {
    const randomEmail = `cliente_${Date.now()}@pruebas.gt`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Cliente Nuevo Test',
        email: randomEmail,
        password: 'PasswordSegura2026!',
        phone: '+502 5999-1122',
        company: 'Empresa Test S.A.',
        taxId: '9876543-2',
        address: 'Zona 14, Guatemala',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.requireVerification).toBe(true);
    expect(res.body.user.email).toBe(randomEmail);
    expect(res.body.user.role).toBe('CUSTOMER');

    // Rechaza correo duplicado (409)
    const dupRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Cliente Duplicado',
        email: randomEmail,
        password: 'OtraPassword123!',
        phone: '+502 5999-1122',
      });
    expect(dupRes.status).toBe(409);
    expect(dupRes.body.success).toBe(false);
  });

  it('obtiene el perfil del usuario autenticado en /api/auth/me', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.name).toBe('Test Administrator');
    expect(res.body.user.role).toBe('ADMIN');
  });

  it('retorna 404 en /api/auth/me si el usuario del token ya no existe en BD', async () => {
    const ghostToken = signToken({
      id: 'id-inexistente-fantasma',
      email: 'fantasma@kromalab.gt',
      role: 'ADMIN',
      name: 'Fantasma',
    });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${ghostToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('controlador getMe retorna 401 si no hay req.user', async () => {
    const req: any = {};
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    await getMe(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('controlador updateProfile retorna 401 si no hay req.user', async () => {
    const req: any = {};
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    await updateProfile(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('bloquea /api/auth/me si no se envía token (401)', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('actualiza el perfil del usuario autenticado en /api/auth/profile', async () => {
    const res = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        phone: '+502 5555-9999',
        company: 'Kroma Lab Central',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.phone).toBe('+502 5555-9999');
    expect(res.body.user.company).toBe('Kroma Lab Central');
  });

  it('permite a ADMIN listar todos los usuarios en /api/auth/users', async () => {
    const res = await request(app)
      .get('/api/auth/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.users.length).toBeGreaterThanOrEqual(2);
  });

  it('permite a ADMIN crear un nuevo colaborador en /api/auth/users', async () => {
    const emailOperador = `operador_${Date.now()}@kromalab.gt`;
    const res = await request(app)
      .post('/api/auth/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Operador Corte y Empaque',
        email: emailOperador,
        password: 'PasswordOperador2026!',
        role: 'EMPLOYEE',
        department: 'Corte y Calandrado',
        phone: '+502 5555-4433',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe(emailOperador);
    expect(res.body.user.role).toBe('EMPLOYEE');

    const createdUserId = res.body.user.id;

    // Rechaza correo duplicado (409)
    const dupRes = await request(app)
      .post('/api/auth/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Duplicado',
        email: emailOperador,
        password: 'OtraPassword123!',
      });
    expect(dupRes.status).toBe(409);

    // ADMIN puede restablecer contraseña del usuario creado
    const resetRes = await request(app)
      .put(`/api/auth/users/${createdUserId}/reset-password`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ newPassword: 'NuevaPassword2026!' });
    expect(resetRes.status).toBe(200);
    expect(resetRes.body.success).toBe(true);

    // ADMIN puede eliminar usuario creado
    const delRes = await request(app)
      .delete(`/api/auth/users/${createdUserId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);
  });

  it('ADMIN no puede eliminar su propia cuenta activa (400)', async () => {
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);
    const adminId = meRes.body.user.id;

    const res = await request(app)
      .delete(`/api/auth/users/${adminId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('retorna 404 si se intenta restablecer contraseña o eliminar usuario inexistente', async () => {
    const resetRes = await request(app)
      .put('/api/auth/users/usr-inexistente-xyz/reset-password')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ newPassword: 'Password123!' });
    expect(resetRes.status).toBe(404);

    const delRes = await request(app)
      .delete('/api/auth/users/usr-inexistente-xyz')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(delRes.status).toBe(404);
  });

  it('cierra la sesión exitosamente en /api/auth/logout', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
  it('rechaza cambio de contraseña si la contraseña actual no es correcta (400) (Task 7)', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        currentPassword: 'WrongPassword!',
        newPassword: 'BrandNewPass2026!'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('La contraseña actual no es correcta');
  });

  it('procesa solicitud de cambio de contraseña enviando correo de verificación (Task 7)', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        currentPassword: 'TestAdmin2026!',
        newPassword: 'BrandNewPass2026!'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('correo de verificación');

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);
    const userInDb = await prisma.user.findUnique({ where: { id: meRes.body.user.id } });
    expect(userInDb?.verificationToken).toBeDefined();

    // Confirmar cambio mediante verify-email
    const verifyRes = await request(app)
      .get(`/api/auth/verify-email?token=${userInDb?.verificationToken}`);
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifyRes.body.message).toContain('contraseña ha sido actualizada');
  });

  it('rechaza cambio de correo si la contraseña actual no es correcta (400) (Task 8)', async () => {
    const res = await request(app)
      .post('/api/auth/change-email')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        currentPassword: 'WrongPassword!',
        newEmail: 'nuevo_correo_test@empresa.gt'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('La contraseña actual no es correcta');
  });

  it('procesa solicitud de cambio de correo y lo confirma con token de verificación (Task 8)', async () => {
    const targetEmail = `nuevo_email_${Date.now()}@pruebas.gt`;
    const res = await request(app)
      .post('/api/auth/change-email')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        currentPassword: 'BrandNewPass2026!',
        newEmail: targetEmail
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('correo de verificación');

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);
    const userInDb = await prisma.user.findUnique({ where: { id: meRes.body.user.id } });
    expect(userInDb?.verificationToken).toBeDefined();

    // Confirmar cambio mediante verify-email
    const verifyRes = await request(app)
      .get(`/api/auth/verify-email?token=${userInDb?.verificationToken}`);
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifyRes.body.user.email).toBe(targetEmail);
  });

  describe('Flujo "Olvidé mi contraseña" y Cambio Obligatorio', () => {
    it('genera y envía contraseña temporal si el correo existe, bloquea rutas hasta cambiarla y desbloquea tras el cambio', async () => {
      const recoveryEmail = `recovery_${Date.now()}@kromalab.gt`;
      await request(app)
        .post('/api/auth/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Usuario Recuperación',
          email: recoveryEmail,
          password: 'InitialPassword123!',
          role: 'CUSTOMER',
        });

      let capturedTempPw = '';
      const mailSpy = vi
        .spyOn(emailService, 'sendTemporaryPasswordEmail')
        .mockImplementation(async (_email, _name, tempPw) => {
          capturedTempPw = tempPw;
          return true;
        });

      // 1. Correo inexistente responde 200 sin enviar correo
      const unknownRes = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'noexiste_en_bd@kromalab.gt' });
      expect(unknownRes.status).toBe(200);
      expect(mailSpy).not.toHaveBeenCalled();

      // 2. Correo existente genera contraseña temporal y la envía por correo
      const forgotRes = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: recoveryEmail });
      expect(forgotRes.status).toBe(200);
      expect(forgotRes.body.success).toBe(true);
      expect(mailSpy).toHaveBeenCalledTimes(1);
      expect(capturedTempPw.startsWith('Kroma!')).toBe(true);

      // 3. Login con contraseña temporal retorna mustChangePassword = true
      const loginTempRes = await request(app)
        .post('/api/auth/login')
        .send({ email: recoveryEmail, password: capturedTempPw });
      expect(loginTempRes.status).toBe(200);
      expect(loginTempRes.body.user.mustChangePassword).toBe(true);
      const tempToken = loginTempRes.body.token;

      // 4. Rutas protegidas se bloquean con 403 mientras mustChangePassword sea true
      const blockedRes = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${tempToken}`);
      expect(blockedRes.status).toBe(403);
      expect(blockedRes.body.mustChangePassword).toBe(true);

      // /api/auth/me sí sigue accesible para validar el estado pendiente
      const meForcedRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tempToken}`);
      expect(meForcedRes.status).toBe(200);
      expect(meForcedRes.body.user.mustChangePassword).toBe(true);

      // 5. Rechaza reutilizar la misma contraseña temporal
      const samePwRes = await request(app)
        .post('/api/auth/force-change-password')
        .set('Authorization', `Bearer ${tempToken}`)
        .send({ newPassword: capturedTempPw, confirmPassword: capturedTempPw });
      expect(samePwRes.status).toBe(400);

      // 6. Rechaza si confirmPassword no coincide
      const mismatchRes = await request(app)
        .post('/api/auth/force-change-password')
        .set('Authorization', `Bearer ${tempToken}`)
        .send({ newPassword: 'MiNuevaClave2026!', confirmPassword: 'OtraClave2026!' });
      expect(mismatchRes.status).toBe(400);

      // 7. Cambio obligatorio exitoso emite nuevo token sin bloqueo
      const forceOkRes = await request(app)
        .post('/api/auth/force-change-password')
        .set('Authorization', `Bearer ${tempToken}`)
        .send({ newPassword: 'MiNuevaClave2026!', confirmPassword: 'MiNuevaClave2026!' });
      expect(forceOkRes.status).toBe(200);
      expect(forceOkRes.body.success).toBe(true);
      expect(forceOkRes.body.user.mustChangePassword).toBe(false);
      expect(forceOkRes.body.token).toBeTruthy();

      // 8. Login posterior con la nueva clave ya no exige cambio y permite continuar
      const finalLoginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: recoveryEmail, password: 'MiNuevaClave2026!' });
      expect(finalLoginRes.status).toBe(200);
      expect(finalLoginRes.body.user.mustChangePassword).toBe(false);

      const allowedRes = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${finalLoginRes.body.token}`);
      expect(allowedRes.status).toBe(200);

      mailSpy.mockRestore();
    });

    it('retorna 500 en /api/auth/forgot-password si falla el servicio de correo', async () => {
      const failEmail = `failmail_${Date.now()}@kromalab.gt`;
      await request(app)
        .post('/api/auth/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Falla Correo',
          email: failEmail,
          password: 'InitialPassword123!',
          role: 'CUSTOMER',
        });

      const mailSpy = vi
        .spyOn(emailService, 'sendTemporaryPasswordEmail')
        .mockResolvedValueOnce(false);

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: failEmail });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      mailSpy.mockRestore();
    });

    it('emailService.sendTemporaryPasswordEmail cubre envío SMTP exitoso, error SMTP y fallback local', async () => {
      const svc: any = emailService;
      const origConfigured = svc.isConfigured;
      const origTransporter = svc.transporter;

      svc.isConfigured = true;
      svc.transporter = { sendMail: vi.fn().mockResolvedValue({ messageId: 'msg-123' }) };
      expect(await emailService.sendTemporaryPasswordEmail('u@kromalab.gt', 'User', 'Kroma!Abc123')).toBe(true);

      svc.transporter = { sendMail: vi.fn().mockRejectedValue(new Error('SMTP down')) };
      expect(await emailService.sendTemporaryPasswordEmail('u@kromalab.gt', 'User', 'Kroma!Abc123')).toBe(false);

      svc.isConfigured = false;
      svc.transporter = null;
      expect(await emailService.sendTemporaryPasswordEmail('u@kromalab.gt', 'User', 'Kroma!Abc123')).toBe(true);

      svc.isConfigured = origConfigured;
      svc.transporter = origTransporter;
    });
  });
});
