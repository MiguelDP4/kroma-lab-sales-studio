import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'kroma-lab-sales-studio-jwt-secret-key-2026';

export interface AuthUserPayload {
  id: string;
  email: string;
  role: string;
  name: string;
  mustChangePassword?: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
}

export function signToken(payload: AuthUserPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    res.status(401).json({ success: false, message: 'No autenticado. Token requerido.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
    req.user = decoded;

    if (decoded.mustChangePassword) {
      const reqPath = (req.originalUrl || req.path || '').split('?')[0];
      const allowedWhenForced = [
        '/api/auth/me',
        '/api/auth/logout',
        '/api/auth/force-change-password',
        '/api/auth/change-password',
      ];
      if (!allowedWhenForced.some((p) => reqPath.endsWith(p))) {
        res.status(403).json({
          success: false,
          mustChangePassword: true,
          message: 'Por seguridad debes cambiar tu contraseña temporal antes de continuar.',
        });
        return;
      }
    }

    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Token inválido o expirado.' });
    return;
  }
}

export function optionalAuthenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
      req.user = decoded;
    } catch (_) {}
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'No autenticado.' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Acceso restringido. Se requiere uno de los siguientes roles: ${roles.join(', ')}`,
      });
      return;
    }

    next();
  };
}
