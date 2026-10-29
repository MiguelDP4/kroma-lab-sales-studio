import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { seedDatabase } from '../src/db/seed';

const app = createApp();

describe('Controller Error Handlers & Catch Blocks', () => {
  let adminToken: string;
  let testOrderId: string;
  let testCustomerId: string;
  let testDispatchId: string;
  let testPaymentId: string;

  beforeAll(async () => {
    await seedDatabase();
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'testadmin@kromalab.gt', password: 'TestAdmin2026!' });
    adminToken = loginRes.body.token;

    const order = await prisma.order.findFirst();
    testOrderId = order!.id;

    const customer = await prisma.customer.findFirst();
    testCustomerId = customer!.id;

    const dispatch = await prisma.dispatchNote.findFirst();
    testDispatchId = dispatch!.id;

    const payment = await prisma.payment.findFirst();
    testPaymentId = payment!.id;
  });

  it('captura error de base de datos en login', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockRejectedValueOnce(new Error('DB Error'));
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'testadmin@kromalab.gt', password: 'TestAdmin2026!' });
    expect(res.status).toBe(500);
  });

  it('captura error de base de datos en getMe', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockRejectedValueOnce(new Error('DB Error'));
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(500);
  });

  it('captura error de base de datos en listUsers', async () => {
    vi.spyOn(prisma.user, 'findMany').mockRejectedValueOnce(new Error('DB Error'));
    const res = await request(app)
      .get('/api/auth/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(500);
  });

  it('captura error de base de datos en updateProfile', async () => {
    vi.spyOn(prisma.user, 'update').mockRejectedValueOnce(new Error('DB Error'));
    const res = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Nuevo Nombre' });
    expect(res.status).toBe(500);
  });

  it('captura error de base de datos en listCustomers', async () => {
    vi.spyOn(prisma.customer, 'findMany').mockRejectedValueOnce(new Error('DB Error'));
    const res = await request(app)
      .get('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(500);
  });

  it('captura error de base de datos en getCustomerById', async () => {
    vi.spyOn(prisma.customer, 'findUnique').mockRejectedValueOnce(new Error('DB Error'));
    const res = await request(app)
      .get(`/api/customers/${testCustomerId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(500);
  });

  it('captura error de base de datos en updateCustomer', async () => {
    vi.spyOn(prisma.customer, 'update').mockRejectedValueOnce(new Error('DB Error'));
    const res = await request(app)
      .put(`/api/customers/${testCustomerId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notes: 'Nota' });
    expect(res.status).toBe(500);
  });

  it('captura error de base de datos en listDispatchNotes', async () => {
    vi.spyOn(prisma.dispatchNote, 'findMany').mockRejectedValueOnce(new Error('DB Error'));
    const res = await request(app)
      .get('/api/dispatch')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(500);
  });

  it('captura error de base de datos en getDispatchNoteById', async () => {
    vi.spyOn(prisma.dispatchNote, 'findUnique').mockRejectedValueOnce(new Error('DB Error'));
    const res = await request(app)
      .get(`/api/dispatch/${testDispatchId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(500);
  });

  it('captura error de base de datos en updateDispatchStatus', async () => {
    vi.spyOn(prisma.dispatchNote, 'findUnique').mockRejectedValueOnce(new Error('DB Error'));
    const res = await request(app)
      .put(`/api/dispatch/${testDispatchId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'IN_TRANSIT' });
    expect(res.status).toBe(500);
  });

  it('captura error de base de datos en listInventory', async () => {
    vi.spyOn(prisma.inventoryItem, 'findMany').mockRejectedValueOnce(new Error('DB Error'));
    const res = await request(app)
      .get('/api/inventory')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(500);
  });

  it('captura error de base de datos en listKardex', async () => {
    vi.spyOn(prisma.inventoryMovement, 'findMany').mockRejectedValueOnce(new Error('DB Error'));
    const res = await request(app)
      .get('/api/inventory/kardex')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(500);
  });

  it('captura error de base de datos en updateOrderPayment', async () => {
    vi.spyOn(prisma.order, 'update').mockRejectedValueOnce(new Error('DB Error'));
    const res = await request(app)
      .put(`/api/orders/${testOrderId}/payment`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ paymentStatus: 'PARTIAL' });
    expect(res.status).toBe(500);
  });

  it('captura error de base de datos en getOrderStats', async () => {
    vi.spyOn(prisma.order, 'findMany').mockRejectedValueOnce(new Error('DB Error'));
    const res = await request(app)
      .get('/api/orders/stats')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(500);
  });

  it('captura error de base de datos en listReceivables', async () => {
    vi.spyOn(prisma.order, 'findMany').mockRejectedValueOnce(new Error('DB Error'));
    const res = await request(app)
      .get('/api/receivables')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(500);
  });

  it('captura error de base de datos en recordPayment', async () => {
    vi.spyOn(prisma, '$transaction').mockRejectedValueOnce(new Error('DB Error'));
    const res = await request(app)
      .post('/api/receivables/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        orderId: testOrderId,
        amountPaidQ: 50.0,
        method: 'CASH',
      });
    expect(res.status).toBe(500);
  });

  it('captura error de base de datos en voidPayment', async () => {
    vi.spyOn(prisma, '$transaction').mockRejectedValueOnce(new Error('DB Error'));
    const res = await request(app)
      .delete(`/api/receivables/payments/${testPaymentId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(500);
  });

  it('captura error de base de datos en getWorkshopConfig', async () => {
    vi.spyOn(prisma.workshopConfig, 'findUnique').mockRejectedValueOnce(new Error('DB Error'));
    const res = await request(app).get('/api/workshop');
    expect(res.status).toBe(500);
  });

  it('captura error de base de datos en updateWorkshopConfig', async () => {
    vi.spyOn(prisma.workshopConfig, 'upsert').mockRejectedValueOnce(new Error('DB Error'));
    const res = await request(app)
      .put('/api/workshop')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rateTier1: 135.0 });
    expect(res.status).toBe(500);
  });

  it('captura error de base de datos en listQuotes', async () => {
    vi.spyOn(prisma.quote, 'findMany').mockRejectedValueOnce(new Error('DB Error'));
    const res = await request(app).get('/api/quotes');
    expect(res.status).toBe(500);
  });

  it('captura error de base de datos en getQuoteById', async () => {
    vi.spyOn(prisma.quote, 'findFirst').mockRejectedValueOnce(new Error('DB Error'));
    const res = await request(app).get('/api/quotes/cot_test');
    expect(res.status).toBe(500);
  });

  it('captura error de base de datos en createQuote', async () => {
    vi.spyOn(prisma.quote, 'create').mockRejectedValueOnce(new Error('DB Error'));
    const res = await request(app)
      .post('/api/quotes')
      .send({
        leadName: 'Lead Test',
        leadPhone: '+502 5555-0000',
        widthCm: 5,
        heightCm: 5,
        qty: 10,
        linearMeters: 1,
        unitRateQ: 140,
        materialPriceQ: 140,
        totalPriceQ: 140,
      });
    expect(res.status).toBe(500);
  });

  it('captura error de base de datos en updateQuote', async () => {
    vi.spyOn(prisma.quote, 'findUnique').mockRejectedValueOnce(new Error('DB Error'));
    const res = await request(app)
      .put('/api/quotes/cot_test')
      .send({ projectName: 'Error' });
    expect(res.status).toBe(500);
  });

  it('captura error de base de datos en convertToOrder', async () => {
    vi.spyOn(prisma.quote, 'findUnique').mockRejectedValueOnce(new Error('DB Error'));
    const res = await request(app)
      .post('/api/quotes/cot_test/convert')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(500);
  });

  it('captura error de base de datos en deleteQuote', async () => {
    vi.spyOn(prisma.quote, 'findUnique').mockRejectedValueOnce(new Error('DB Error'));
    const res = await request(app).delete('/api/quotes/cot_test');
    expect(res.status).toBe(500);
  });

  it('captura error de base de datos en attachPaymentReceipt', async () => {
    vi.spyOn(prisma.order, 'findUnique').mockRejectedValueOnce(new Error('DB Error'));
    const res = await request(app)
      .post(`/api/orders/${testOrderId}/receipt`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ receiptUrl: 'https://pub-r2.dev/test.jpg' });
    expect(res.status).toBe(500);
  });
});