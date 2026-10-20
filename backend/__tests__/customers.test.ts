import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { seedDatabase } from '../src/db/seed';

const app = createApp();

describe('Customers API (/api/customers)', () => {
  let adminToken: string;
  let createdCustomerId: string;
  const testEmail = `esteban-${Date.now()}@granbarbero.gt`;

  beforeAll(async () => {
    await seedDatabase();
    await prisma.customer.deleteMany({
      where: { email: { contains: 'granbarbero.gt' } },
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'miguel@kromalab.gt', password: 'Admin2026!' });
    adminToken = loginRes.body.token;
  });

  afterAll(async () => {
    await prisma.customer.deleteMany({
      where: { email: { contains: 'granbarbero.gt' } },
    });
  });

  it('lista la cartera de clientes B2B con métricas 360 enriquecidas', async () => {
    const res = await request(app)
      .get('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.customers.length).toBeGreaterThanOrEqual(1);

    const first = res.body.customers[0];
    expect(first.totalOrders).toBeDefined();
    expect(first.totalMeters).toBeDefined();
    expect(first.totalSpentQ).toBeDefined();
  });

  it('crea un nuevo cliente B2B exitosamente', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        companyName: 'Barbería El Gran Barbero',
        managerName: 'Esteban Morales',
        phone: '+502 5555-4321',
        email: testEmail,
        address: 'Zona 14, Ciudad de Guatemala',
        taxId: '5412890-1',
        tier: 'NUEVO',
        sector: 'BARBERIAS',
        notes: 'Personalización de frascos de tónico capilar.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.customer.companyName).toBe('Barbería El Gran Barbero');
    createdCustomerId = res.body.customer.id;
  });

  it('rechaza la creación de un cliente con correo duplicado (409)', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        companyName: 'Barbería Duplicada',
        managerName: 'Otro Esteban',
        phone: '+502 5555-4321',
        email: testEmail,
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('obtiene el detalle de un cliente por su ID', async () => {
    const res = await request(app)
      .get(`/api/customers/${createdCustomerId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.customer.id).toBe(createdCustomerId);
  });

  it('retorna 404 si el cliente no existe', async () => {
    const res = await request(app)
      .get('/api/customers/id-inexistente-xyz')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('actualiza el perfil del cliente', async () => {
    const res = await request(app)
      .put(`/api/customers/${createdCustomerId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        tier: 'RECURRENTE',
        notes: 'Ya realizó su segunda compra de pliegos UV DTF.',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.customer.tier).toBe('RECURRENTE');
  });
});
