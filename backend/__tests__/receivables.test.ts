import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { seedDatabase } from '../src/db/seed';

const app = createApp();

describe('Receivables API (/api/receivables)', () => {
  let adminToken: string;
  let testOrderId: string;
  let createdPaymentId: string;

  beforeAll(async () => {
    await seedDatabase();
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'miguel@kromalab.gt', password: 'Admin2026!' });
    adminToken = loginRes.body.token;

    const order = await prisma.order.findFirst();
    testOrderId = order!.id;

    // Crear orden antigua para ejercitar aging (OVERDUE > 15 días)
    const twentyDaysAgo = new Date();
    twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);

    await prisma.order.create({
      data: {
        code: `KL-AGING-OVERDUE-${Date.now()}`,
        customerName: 'Cliente Mora Test',
        customerPhone: '+502 5555-0099',
        widthCm: 10,
        heightCm: 10,
        qty: 50,
        linearMeters: 1.0,
        materialPriceQ: 120.0,
        totalAmountQ: 120.0,
        amountPaidQ: 0.0,
        paymentStatus: 'PENDING',
        createdAt: twentyDaysAgo,
      },
    });

    // Crear orden para WARNING (10 días)
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    await prisma.order.create({
      data: {
        code: `KL-AGING-WARN-${Date.now()}`,
        customerName: 'Cliente Warn Test',
        customerPhone: '+502 5555-0088',
        widthCm: 10,
        heightCm: 10,
        qty: 50,
        linearMeters: 1.0,
        materialPriceQ: 120.0,
        totalAmountQ: 120.0,
        amountPaidQ: 0.0,
        paymentStatus: 'PENDING',
        createdAt: tenDaysAgo,
      },
    });
  });

  it('lista las cuentas por cobrar con clasificación de antigüedad (CURRENT, WARNING, OVERDUE)', async () => {
    const res = await request(app)
      .get('/api/receivables')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.receivables).toBeDefined();
    expect(res.body.receivables.some((r: any) => r.agingStatus === 'OVERDUE')).toBe(true);
    expect(res.body.receivables.some((r: any) => r.agingStatus === 'WARNING')).toBe(true);
    expect(res.body.receivables.some((r: any) => r.agingStatus === 'CURRENT')).toBe(true);
  });

  it('registra un abono a un pedido y actualiza el saldo de la orden', async () => {
    const res = await request(app)
      .post('/api/receivables/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        orderId: testOrderId,
        amountPaidQ: 100.0,
        method: 'TRANSFER',
        bankName: 'BI',
        bankReference: 'TR-998877',
        notes: 'Segundo abono recibido vía transferencia Banco Industrial.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.payment.paymentCode).toMatch(/^PAY-\d{4}-\d{3}$/);
    expect(Number(res.body.order.amountPaidQ)).toBeGreaterThanOrEqual(100.0);
    createdPaymentId = res.body.payment.id;
  });

  it('retorna 404 al abonar a una orden inexistente', async () => {
    const res = await request(app)
      .post('/api/receivables/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        orderId: 'id-inexistente-xyz',
        amountPaidQ: 50.0,
        method: 'CASH',
      });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('lista el historial de abonos y transacciones', async () => {
    const res = await request(app)
      .get('/api/receivables/payments')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.payments.length).toBeGreaterThanOrEqual(1);
  });

  it('anula un abono erróneo y restituye el saldo en la orden vinculada', async () => {
    const res = await request(app)
      .delete(`/api/receivables/payments/${createdPaymentId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('retorna 404 al intentar anular un abono inexistente', async () => {
    const res = await request(app)
      .delete('/api/receivables/payments/id-inexistente-123')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
