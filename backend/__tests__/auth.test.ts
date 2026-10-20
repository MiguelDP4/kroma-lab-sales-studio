import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { seedDatabase } from '../src/db/seed';
import { signToken } from '../src/middlewares/auth';
import { getMe, updateProfile } from '../src/controllers/auth.controller';

const app = createApp();

describe('Auth API (/api/auth)', () => {
  let adminToken: string;

  beforeAll(async () => {
    await seedDatabase();
  });

  it('inicia sesión exitosamente con credenciales válidas de Admin', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'miguel@kromalab.gt', password: 'Admin2026!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('miguel@kromalab.gt');
    expect(res.body.user.role).toBe('ADMIN');
    adminToken = res.body.token;
  });

  it('rechaza inicio de sesión con contraseña incorrecta (401)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'miguel@kromalab.gt', password: 'WrongPassword!' });

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
    expect(res.body.token).toBeDefined();
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
    expect(res.body.user.name).toBe('Miguel Dubois');
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
});
