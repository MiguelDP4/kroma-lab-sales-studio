import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { seedDatabase } from '../src/db/seed';

const app = createApp();

describe('Workshop Config API (/api/workshop)', () => {
  let adminToken: string;

  beforeAll(async () => {
    await seedDatabase();
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'miguel@kromalab.gt', password: 'Admin2026!' });
    adminToken = loginRes.body.token;
  });

  it('obtiene la configuración técnica de taller Audley (28 cm útiles y cuentas bancarias)', async () => {
    const res = await request(app).get('/api/workshop');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.config.printableRollWidthCm).toBe(28.0);
    expect(res.body.config.rollWidthCm).toBe(30.0);
    expect(res.body.config.bankBiAccount).toBe('144-002931-2');
    expect(res.body.config.bankBacAccount).toBe('90-341902-1');
    expect(res.body.config.bankBanruralAccount).toBe('3033-09182-1');
  });

  it('crea automáticamente la configuración por defecto si no existe en la BD', async () => {
    await prisma.workshopConfig.deleteMany();

    const res = await request(app).get('/api/workshop');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.config.id).toBe('default');
    expect(res.body.config.printableRollWidthCm).toBe(28.0);
  });

  it('permite a ADMIN actualizar parámetros del taller Audley', async () => {
    const res = await request(app)
      .put('/api/workshop')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        rateTier4: 102.5,
        monthlyNetTargetQ: 22000.0,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.config.rateTier4).toBe(102.5);
    expect(res.body.config.monthlyNetTargetQ).toBe(22000.0);
  });
});
