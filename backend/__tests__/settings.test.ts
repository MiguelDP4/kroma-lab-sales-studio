import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { seedDatabase } from '../src/db/seed';

const app = createApp();

describe('System Settings API (/api/settings)', () => {
  let adminToken: string;
  let customerToken: string;

  beforeAll(async () => {
    await seedDatabase();

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'testadmin@kromalab.gt', password: 'TestAdmin2026!' });
    adminToken = adminLogin.body.token;

    const customerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'rodrigo@promoguate.gt', password: 'Cliente2026!' });
    customerToken = customerLogin.body.token;
  });

  describe('GET /api/settings/shipping (Público)', () => {
    it('obtiene los umbrales de envío gratis por defecto o sembrados', async () => {
      const res = await request(app).get('/api/settings/shipping');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.shipping).toBeDefined();
      expect(res.body.shipping.capital).toBe(575);
      expect(res.body.shipping.interior).toBe(1000);
    });

    it('retorna valores por defecto cuando no hay registros en la base de datos', async () => {
      await prisma.systemSetting.deleteMany();

      const res = await request(app).get('/api/settings/shipping');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.shipping.capital).toBe(575);
      expect(res.body.shipping.interior).toBe(1000);
    });
  });

  describe('GET /api/settings (Solo ADMIN)', () => {
    it('bloquea la petición si no se envía token (401)', async () => {
      const res = await request(app).get('/api/settings');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('bloquea a usuarios con rol no administrativo (CUSTOMER / 403)', async () => {
      const res = await request(app)
        .get('/api/settings')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('permite a un ADMIN listar todas las configuraciones', async () => {
      await prisma.systemSetting.createMany({
        data: [
          { key: 'FREE_SHIPPING_THRESHOLD', value: '575' },
          { key: 'FREE_SHIPPING_THRESHOLD_OUTSIDE_CAPITAL', value: '1000' },
        ],
      });

      const res = await request(app)
        .get('/api/settings')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.settings)).toBe(true);
      expect(res.body.settings.length).toBeGreaterThanOrEqual(2);

      const keys = res.body.settings.map((s: any) => s.key);
      expect(keys).toContain('FREE_SHIPPING_THRESHOLD');
      expect(keys).toContain('FREE_SHIPPING_THRESHOLD_OUTSIDE_CAPITAL');
    });
  });

  describe('PUT /api/settings (Solo ADMIN)', () => {
    it('rechaza actualización no autenticada (401)', async () => {
      const res = await request(app)
        .put('/api/settings')
        .send([{ key: 'FREE_SHIPPING_THRESHOLD', value: '600' }]);

      expect(res.status).toBe(401);
    });

    it('rechaza actualización por usuarios sin rol ADMIN (403)', async () => {
      const res = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send([{ key: 'FREE_SHIPPING_THRESHOLD', value: '600' }]);

      expect(res.status).toBe(403);
    });

    it('rechaza valores o claves vacías con error 400', async () => {
      const res = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send([{ key: '', value: '' }]);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('actualiza configuraciones enviando formato { settings: [...] }', async () => {
      const res = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          settings: [
            { key: 'FREE_SHIPPING_THRESHOLD', value: '590' },
            { key: 'FREE_SHIPPING_THRESHOLD_OUTSIDE_CAPITAL', value: '1050' },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const publicRes = await request(app).get('/api/settings/shipping');
      expect(publicRes.body.shipping.capital).toBe(590);
      expect(publicRes.body.shipping.interior).toBe(1050);
    });

    it('actualiza configuraciones enviando formato de arreglo', async () => {
      const res = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send([
          { key: 'FREE_SHIPPING_THRESHOLD', value: '600' },
          { key: 'FREE_SHIPPING_THRESHOLD_OUTSIDE_CAPITAL', value: '1100' },
        ]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const publicRes = await request(app).get('/api/settings/shipping');
      expect(publicRes.body.shipping.capital).toBe(600);
      expect(publicRes.body.shipping.interior).toBe(1100);
    });

    it('actualiza configuraciones enviando formato de objeto/mapa', async () => {
      const res = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          FREE_SHIPPING_THRESHOLD: '575',
          FREE_SHIPPING_THRESHOLD_OUTSIDE_CAPITAL: '1000',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const publicRes = await request(app).get('/api/settings/shipping');
      expect(publicRes.body.shipping.capital).toBe(575);
      expect(publicRes.body.shipping.interior).toBe(1000);
    });

    it('seeding es idempotente y no sobreescribe configuraciones personalizadas existentes', async () => {
      // Modificamos a un valor personalizado
      await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          FREE_SHIPPING_THRESHOLD: '750',
        });

      // Ejecutamos seed nuevamente
      await seedDatabase();

      // Debe conservar 750 y no revertirse a 575
      const publicRes = await request(app).get('/api/settings/shipping');
      expect(publicRes.body.shipping.capital).toBe(750);

      // Revertimos a 575 para consistencia
      await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          FREE_SHIPPING_THRESHOLD: '575',
        });
    });

    it('maneja errores internos de base de datos en endpoints de settings', async () => {
      const spyFindMany = vi.spyOn(prisma.systemSetting, 'findMany').mockRejectedValueOnce(new Error('DB failure'));
      const resPublic = await request(app).get('/api/settings/shipping');
      expect(resPublic.status).toBe(500);
      spyFindMany.mockRestore();

      const spyFindManyAdmin = vi.spyOn(prisma.systemSetting, 'findMany').mockRejectedValueOnce(new Error('DB failure'));
      const resAdmin = await request(app).get('/api/settings').set('Authorization', `Bearer ${adminToken}`);
      expect(resAdmin.status).toBe(500);
      spyFindManyAdmin.mockRestore();

      const spyUpsert = vi.spyOn(prisma.systemSetting, 'upsert').mockRejectedValueOnce(new Error('DB failure'));
      const resPut = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ FREE_SHIPPING_THRESHOLD: '600' });
      expect(resPut.status).toBe(500);
      spyUpsert.mockRestore();
    });
  });
});
