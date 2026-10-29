import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { prisma } from '../src/db/prisma';
import { createApp } from '../src/app';
import { emailService } from '../src/services/email.service';

const app = createApp();

describe('Email Verification API (/api/auth)', () => {
  const testEmail = `test_verify_${Date.now()}@pruebas.gt`;
  let sendMailSpy: any;

  beforeAll(() => {
    sendMailSpy = vi.spyOn(emailService, 'sendVerificationEmail').mockResolvedValue(true);
  });

  afterAll(async () => {
    sendMailSpy.mockRestore();
    try {
      await prisma.user.deleteMany({ where: { email: { contains: '@pruebas.gt' } } });
      await prisma.customer.deleteMany({ where: { email: { contains: '@pruebas.gt' } } });
    } catch (_) {}
  });

  it('registra una nueva cuenta y genera token de verificación enviando correo', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Cliente Verificación',
        email: testEmail,
        password: 'Password2026!',
        phone: '+502 5406-6217',
        company: 'Empresa Demo S.A.',
        taxId: '1234567-8',
        address: 'San José El Placer, Villa Nueva',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.requireVerification).toBe(true);
    expect(sendMailSpy).toHaveBeenCalledWith(testEmail, 'Cliente Verificación', expect.any(String));

    const userInDb = await prisma.user.findUnique({ where: { email: testEmail } });
    expect(userInDb).not.toBeNull();
    expect(userInDb?.isVerified).toBe(false);
    expect(userInDb?.verificationToken).toBeDefined();
    expect(userInDb?.verificationTokenExpires).toBeDefined();
  });

  it('rechaza el inicio de sesión si la cuenta aún no está verificada (403)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: 'Password2026!',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.unverified).toBe(true);
    expect(res.body.message).toContain('no ha sido verificada');
  });

  it('rechaza verificación con token inexistente o inválido (404)', async () => {
    const res = await request(app)
      .get('/api/auth/verify-email?token=token-falso-inexistente');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('rechaza verificación si el token ha expirado (400)', async () => {
    const userInDb = await prisma.user.findUnique({ where: { email: testEmail } });
    expect(userInDb).not.toBeNull();

    // Simular token expirado en BD
    await prisma.user.update({
      where: { id: userInDb!.id },
      data: {
        verificationTokenExpires: new Date(Date.now() - 3600000), // Expiró hace 1 hora
      },
    });

    const res = await request(app)
      .get(`/api/auth/verify-email?token=${userInDb!.verificationToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.expired).toBe(true);
  });

  it('reenvía un nuevo correo de verificación renovando el token', async () => {
    sendMailSpy.mockClear();

    const res = await request(app)
      .post('/api/auth/resend-verification')
      .send({ email: testEmail });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(sendMailSpy).toHaveBeenCalledWith(testEmail, 'Cliente Verificación', expect.any(String));

    const updatedUser = await prisma.user.findUnique({ where: { email: testEmail } });
    expect(updatedUser?.verificationTokenExpires!.getTime()).toBeGreaterThan(Date.now());
  });

  it('verifica exitosamente la cuenta con el nuevo token válido', async () => {
    const updatedUser = await prisma.user.findUnique({ where: { email: testEmail } });
    const validToken = updatedUser!.verificationToken;

    const res = await request(app)
      .post('/api/auth/verify-email')
      .send({ token: validToken });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(testEmail);

    const verifiedUserInDb = await prisma.user.findUnique({ where: { email: testEmail } });
    expect(verifiedUserInDb?.isVerified).toBe(true);
    expect(verifiedUserInDb?.verificationToken).toBeNull();
  });

  it('permite iniciar sesión normalmente una vez verificada la cuenta', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: 'Password2026!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe(testEmail);
  });
});
