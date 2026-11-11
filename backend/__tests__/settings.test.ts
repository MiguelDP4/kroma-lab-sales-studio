import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { seedDatabase, ensureDefaultSystemSettings } from '../src/db/seed';

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
      const origFindMany = prisma.systemSetting.findMany.bind(prisma.systemSetting);
      const origUpsert = prisma.systemSetting.upsert.bind(prisma.systemSetting);

      vi.spyOn(prisma.systemSetting, 'findMany')
        .mockRejectedValueOnce(new Error('DB failure'))
        .mockImplementation(origFindMany as any);
      const resPublic = await request(app).get('/api/settings/shipping');
      expect(resPublic.status).toBe(500);

      vi.spyOn(prisma.systemSetting, 'findMany')
        .mockRejectedValueOnce(new Error('DB failure'))
        .mockImplementation(origFindMany as any);
      const resAdmin = await request(app).get('/api/settings').set('Authorization', `Bearer ${adminToken}`);
      expect(resAdmin.status).toBe(500);

      vi.spyOn(prisma.systemSetting, 'upsert')
        .mockRejectedValueOnce(new Error('DB failure'))
        .mockImplementation(origUpsert as any);
      const resPut = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ FREE_SHIPPING_THRESHOLD: '600' });
      expect(resPut.status).toBe(500);
    });
  });

  describe('POST /api/settings & Descripción (Solo ADMIN)', () => {
    it('bloquea la creación de parámetro si no está autenticado (401) o no es ADMIN (403)', async () => {
      const resUnauth = await request(app)
        .post('/api/settings')
        .send({ key: 'TEST_NEW_KEY', value: '123', description: 'Prueba' });
      expect(resUnauth.status).toBe(401);

      const resCust = await request(app)
        .post('/api/settings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ key: 'TEST_NEW_KEY', value: '123', description: 'Prueba' });
      expect(resCust.status).toBe(403);
    });

    it('rechaza clave con espacios o valor vacío con código 400', async () => {
      const resInvalidKey = await request(app)
        .post('/api/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ key: 'CLAVE CON ESPACIOS', value: '100' });
      expect(resInvalidKey.status).toBe(400);

      const resEmptyVal = await request(app)
        .post('/api/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ key: 'VALID_KEY', value: '' });
      expect(resEmptyVal.status).toBe(400);
    });

    it('crea un nuevo parámetro con key, value y description (201) y rechaza duplicado (409)', async () => {
      await prisma.systemSetting.deleteMany({ where: { key: 'MAX_DISCOUNT_PCT' } });

      const resCreate = await request(app)
        .post('/api/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          key: 'MAX_DISCOUNT_PCT',
          value: '15',
          description: 'Descuento máximo permitido para clientes VIP.',
        });

      expect(resCreate.status).toBe(201);
      expect(resCreate.body.success).toBe(true);
      expect(resCreate.body.setting.key).toBe('MAX_DISCOUNT_PCT');
      expect(resCreate.body.setting.value).toBe('15');
      expect(resCreate.body.setting.description).toBe('Descuento máximo permitido para clientes VIP.');

      // Intento duplicado debe retornar 409 Conflict
      const resDup = await request(app)
        .post('/api/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          key: 'MAX_DISCOUNT_PCT',
          value: '20',
        });

      expect(resDup.status).toBe(409);
      expect(resDup.body.success).toBe(false);

      // Actualización con descripción mediante PUT
      const resPut = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send([
          {
            key: 'MAX_DISCOUNT_PCT',
            value: '18',
            description: 'Descripción actualizada vía PUT.',
          },
        ]);

      expect(resPut.status).toBe(200);
      const updatedItem = resPut.body.settings.find((s: any) => s.key === 'MAX_DISCOUNT_PCT');
      expect(updatedItem.value).toBe('18');
      expect(updatedItem.description).toBe('Descripción actualizada vía PUT.');

      await prisma.systemSetting.deleteMany({ where: { key: 'MAX_DISCOUNT_PCT' } });
    });

    it('ensureDefaultSystemSettings crea las claves base con descripción si faltan', async () => {
      await prisma.systemSetting.deleteMany({
        where: { key: { in: ['FREE_SHIPPING_THRESHOLD', 'FREE_SHIPPING_THRESHOLD_OUTSIDE_CAPITAL'] } },
      });

      await ensureDefaultSystemSettings();

      const settings = await prisma.systemSetting.findMany({
        where: { key: { in: ['FREE_SHIPPING_THRESHOLD', 'FREE_SHIPPING_THRESHOLD_OUTSIDE_CAPITAL'] } },
      });

      expect(settings.length).toBe(2);
      const cap = settings.find((s) => s.key === 'FREE_SHIPPING_THRESHOLD');
      expect(cap?.value).toBe('575');
      expect(cap?.description).toBeTruthy();
    });

    it('maneja errores de base de datos en POST /api/settings (500)', async () => {
      const origFindUnique = prisma.systemSetting.findUnique.bind(prisma.systemSetting);
      vi.spyOn(prisma.systemSetting, 'findUnique')
        .mockRejectedValueOnce(new Error('DB failure'))
        .mockImplementation(origFindUnique as any);
      const res = await request(app)
        .post('/api/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ key: 'ANY_KEY', value: '123' });
      expect(res.status).toBe(500);
    });
  });
});
