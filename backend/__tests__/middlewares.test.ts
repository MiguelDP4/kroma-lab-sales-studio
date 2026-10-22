import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { authenticate, requireRole, signToken } from '../src/middlewares/auth';
import { errorHandler } from '../src/middlewares/errorHandler';

describe('Middlewares & Error Handling', () => {
  describe('auth.ts', () => {
    it('autentica mediante cookie "token"', () => {
      const token = signToken({
        id: 'user-123',
        email: 'test@kromalab.gt',
        role: 'EMPLOYEE',
        name: 'Carlos Taller',
      });

      const req: any = {
        headers: {},
        cookies: { token },
      };
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      authenticate(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.email).toBe('test@kromalab.gt');
    });

    it('rechaza si no hay ningún token ni header ni cookie', () => {
      const req: any = { headers: {}, cookies: {} };
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      authenticate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'No autenticado. Token requerido.' })
      );
    });

    it('rechaza token corrupto o inválido con 401', () => {
      const req: any = {
        headers: { authorization: 'Bearer token-invalido-xyz' },
        cookies: {},
      };
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      authenticate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Token inválido o expirado.' })
      );
    });

    it('requireRole bloquea con 401 si no hay usuario en la request', () => {
      const req: any = {};
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      requireRole('ADMIN')(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('requireRole bloquea con 403 si el rol no tiene los privilegios necesarios', () => {
      const req: any = {
        user: { id: 'u1', email: 'c@k.gt', role: 'CUSTOMER', name: 'Cliente' },
      };
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      requireRole('ADMIN', 'EMPLOYEE')(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  describe('errorHandler.ts', () => {
    it('formatea errores de validación de Zod con código 400', () => {
      const schema = z.object({ email: z.string().email() });
      let zodError: any;
      try {
        schema.parse({ email: 'no-es-correo' });
      } catch (err) {
        zodError = err;
      }

      const req: any = {};
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      errorHandler(zodError, req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Error de validación en los datos enviados.',
        })
      );
    });

    it('maneja errores con statusCode numérico', () => {
      const customErr: any = new Error('No autorizado');
      customErr.statusCode = 403;

      const req: any = {};
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      errorHandler(customErr, req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('maneja errores completamente vacíos con código 500 y mensaje por defecto', () => {
      const emptyErr: any = {};

      const req: any = {};
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      errorHandler(emptyErr, req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Error interno del servidor.',
        })
      );
    });
  });
});
