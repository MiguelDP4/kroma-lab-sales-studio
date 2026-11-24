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
      .send({ email: 'testadmin@kromalab.gt', password: 'TestAdmin2026!' });
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

  it('actualiza el perfil del cliente con tarifa preferencial y condiciones de crédito', async () => {
    const res = await request(app)
      .put(`/api/customers/${createdCustomerId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        tier: 'RECURRENTE',
        notes: 'Ya realizó su segunda compra de pliegos UV DTF.',
        customRatePerMeterQ: 75.0,
        exemptFromMinimum: true,
        allowCredit: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.customer.tier).toBe('RECURRENTE');
    expect(Number(res.body.customer.customRatePerMeterQ)).toBe(75);
    expect(res.body.customer.exemptFromMinimum).toBe(true);
    expect(res.body.customer.allowCredit).toBe(true);
  });

  it('genera el estado de cuenta consolidado (statement) y permite liquidar el corte en bloque', async () => {
    // 1. Crear dos órdenes pendientes a Q75/m vinculadas al cliente
    const order1 = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: createdCustomerId,
        customerName: 'Esteban Morales',
        customerPhone: '+502 5555-4321',
        widthCm: 5,
        heightCm: 5,
        qty: 30,
        linearMeters: 0.45,
        unitRateQ: 75.0,
        materialPriceQ: 33.75,
        totalAmountQ: 33.75,
        status: 'COMPLETED',
        paymentStatus: 'PENDING',
        items: [
          { title: 'Logo_Taza_A.png', fileName: 'Logo_Taza_A.png', widthCm: 5, heightCm: 5, qty: 30, actualLinearMeters: 0.45 },
        ],
      });
    expect(order1.status).toBe(201);
    expect(order1.body.order.status).toBe('COMPLETED');

    const order2 = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: createdCustomerId,
        customerName: 'Esteban Morales',
        customerPhone: '+502 5555-4321',
        widthCm: 8,
        heightCm: 8,
        qty: 50,
        linearMeters: 1.2,
        unitRateQ: 75.0,
        materialPriceQ: 90.0,
        totalAmountQ: 90.0,
        status: 'COMPLETED',
        paymentStatus: 'PENDING',
        items: [
          { title: 'Logo_Termo_B.png', fileName: 'Logo_Termo_B.png', widthCm: 8, heightCm: 8, qty: 50, actualLinearMeters: 1.2 },
        ],
      });
    expect(order2.status).toBe(201);

    // 2. Consultar estado de cuenta consolidado
    const stmtRes = await request(app)
      .get(`/api/customers/${createdCustomerId}/statement`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(stmtRes.status).toBe(200);
    expect(stmtRes.body.success).toBe(true);
    expect(stmtRes.body.statement.ordersCount).toBe(2);
    expect(stmtRes.body.statement.totalPieces).toBe(80);
    expect(stmtRes.body.statement.totalMeters).toBe(1.65);
    expect(stmtRes.body.statement.balanceDueQ).toBe(123.75);
    expect(stmtRes.body.statement.items.length).toBe(2);

    // 3. Liquidar corte completo
    const settleRes = await request(app)
      .post(`/api/customers/${createdCustomerId}/settle-statement`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        method: 'CASH',
        notes: 'Pago completo semanal',
      });

    expect(settleRes.status).toBe(201);
    expect(settleRes.body.success).toBe(true);
    expect(settleRes.body.settledOrdersCount).toBe(2);
    expect(settleRes.body.totalSettledQ).toBe(123.75);

    // 4. Intentar liquidar de nuevo cuando ya no hay pendientes retorna 400
    const emptySettleRes = await request(app)
      .post(`/api/customers/${createdCustomerId}/settle-statement`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ method: 'CASH' });
    expect(emptySettleRes.status).toBe(400);

    // 5. 404 para cliente inexistente en statement y settle-statement
    const notFoundStmt = await request(app)
      .get('/api/customers/id-inexistente-xyz/statement')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(notFoundStmt.status).toBe(404);

    const notFoundSettle = await request(app)
      .post('/api/customers/id-inexistente-xyz/settle-statement')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ method: 'CASH' });
    expect(notFoundSettle.status).toBe(404);

    // Limpiar órdenes creadas en el test
    await prisma.payment.deleteMany({ where: { orderId: { in: [order1.body.order.id, order2.body.order.id] } } });
    await prisma.order.deleteMany({ where: { id: { in: [order1.body.order.id, order2.body.order.id] } } });
  });

  it('elimina un cliente por su ID', async () => {
    const res = await request(app)
      .delete(`/api/customers/${createdCustomerId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const getRes = await request(app)
      .get(`/api/customers/${createdCustomerId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(getRes.status).toBe(404);
  });
});
