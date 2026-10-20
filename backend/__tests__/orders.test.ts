import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { seedDatabase } from '../src/db/seed';

const app = createApp();

describe('Orders API (/api/orders)', () => {
  let adminToken: string;
  let customerToken: string;
  let createdOrderId: string;

  beforeAll(async () => {
    await seedDatabase();

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'miguel@kromalab.gt', password: 'Admin2026!' });
    adminToken = adminLogin.body.token;

    const customerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'rodrigo@promoguate.gt', password: 'Cliente2026!' });
    customerToken = customerLogin.body.token;
  });

  it('lista las órdenes registradas en /api/orders', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.orders.length).toBeGreaterThanOrEqual(1);
  });

  it('filtra órdenes por status, paymentStatus y búsqueda de texto', async () => {
    const res = await request(app)
      .get('/api/orders?status=PRINTING&paymentStatus=PARTIAL&search=Rodrigo')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.orders)).toBe(true);

    const resTax = await request(app)
      .get('/api/orders?search=7845129')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resTax.status).toBe(200);
  });

  it('filtra órdenes para rol CUSTOMER mostrando solo sus pedidos', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.orders.every((o: any) => o.customerEmail === 'rodrigo@promoguate.gt')).toBe(true);
  });

  it('crea una nueva orden con código generado automáticamente', async () => {
    const newOrderData = {
      customerName: 'Café San José',
      customerPhone: '+502 5555-5678',
      customerEmail: 'pedidos@cafesanjose.gt',
      customerTaxId: '9823145-2',
      customerAddress: 'San José El Placer, Villa Nueva',
      widthCm: 10.0,
      heightCm: 6.0,
      qty: 100,
      linearMeters: 2.5,
      unitRateQ: 115.0,
      materialPriceQ: 287.5,
      withCutting: true,
      cuttingPriceQ: 8.0,
      totalAmountQ: 295.5,
      stickersPerRow: 2,
      rows: 50,
      notes: 'Stickers térmicos para vasos.',
    };

    const res = await request(app).post('/api/orders').send(newOrderData);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.order.code).toMatch(/^KL-\d{4}-\d{3}$/);
    expect(res.body.order.totalAmountQ).toBe(295.5);
    createdOrderId = res.body.order.id;
  });

  it('obtiene el detalle de una orden por su ID', async () => {
    const res = await request(app)
      .get(`/api/orders/${createdOrderId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.order.id).toBe(createdOrderId);
    expect(res.body.order.customerName).toBe('Café San José');
  });

  it('rechaza con 404 si la orden no existe', async () => {
    const res = await request(app)
      .get('/api/orders/id-inexistente-xyz')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('bloquea con 403 si un cliente intenta consultar orden de otro cliente', async () => {
    const res = await request(app)
      .get(`/api/orders/${createdOrderId}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('actualiza el estado de producción de una orden', async () => {
    const res = await request(app)
      .put(`/api/orders/${createdOrderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'PRINTING' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.order.status).toBe('PRINTING');
  });

  it('actualiza el estado de pago de una orden con y sin monto', async () => {
    const res = await request(app)
      .put(`/api/orders/${createdOrderId}/payment`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ paymentStatus: 'PARTIAL', amountPaidQ: 150.0 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.order.paymentStatus).toBe('PARTIAL');
    expect(res.body.order.amountPaidQ).toBe(150.0);

    const res2 = await request(app)
      .put(`/api/orders/${createdOrderId}/payment`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ paymentStatus: 'PAID' });

    expect(res2.status).toBe(200);
    expect(res2.body.order.paymentStatus).toBe('PAID');
  });

  it('retorna estadísticas consolidadas en /api/orders/stats', async () => {
    const res = await request(app)
      .get('/api/orders/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.stats.totalOrders).toBeGreaterThanOrEqual(2);
    expect(res.body.stats.totalBillingQ).toBeGreaterThan(0);
  });
});
