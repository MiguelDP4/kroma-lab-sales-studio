import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { seedDatabase } from '../src/db/seed';
import { emailService } from '../src/services/email.service';

const app = createApp();

describe('Orders API (/api/orders)', () => {
  let adminToken: string;
  let customerToken: string;
  let createdOrderId: string;

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
    expect(res.body.order.code).toMatch(/^\d{10}$/);
    expect(Number(res.body.order.totalAmountQ)).toBe(295.5);
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
    expect(Number(res.body.order.amountPaidQ)).toBe(150.0);

    const res2 = await request(app)
      .put(`/api/orders/${createdOrderId}/payment`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ paymentStatus: 'PAID' });

    expect(res2.status).toBe(200);
    expect(res2.body.order.paymentStatus).toBe('PAID');
  });

  it('permite adjuntar comprobante de pago con POST /api/orders/:id/receipt y registrar abono', async () => {
    const res = await request(app)
      .post(`/api/orders/${createdOrderId}/receipt`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        receiptUrl: 'https://pub-r2.dev/assets/payments/boleta_bi_12345.jpg',
        receiptFileName: 'boleta_bi_12345.jpg',
        amountPaidQ: 145.5,
        bankName: 'BI',
        bankReference: 'DEP-8849201',
        notes: 'Depósito monetario en agencia San José',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.order.paymentReceiptUrl).toBe('https://pub-r2.dev/assets/payments/boleta_bi_12345.jpg');
    expect(res.body.order.paymentReceiptFileName).toBe('boleta_bi_12345.jpg');
    expect(res.body.payment).toBeDefined();
    expect(res.body.payment.bankReference).toBe('DEP-8849201');

    // Adjuntar solo comprobante sin monto previo
    const resWithoutAmount = await request(app)
      .post(`/api/orders/${createdOrderId}/receipt`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        receiptUrl: 'https://pub-r2.dev/assets/payments/boleta_simple.jpg',
      });
    expect(resWithoutAmount.status).toBe(200);
    expect(resWithoutAmount.body.payment).toBeNull();
    expect(resWithoutAmount.body.order.paymentReceiptFileName).toBe('comprobante_bancario');

    // 404 si la orden no existe
    const res404 = await request(app)
      .post('/api/orders/ord_inexistente_999/receipt')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ receiptUrl: 'https://pub-r2.dev/test.jpg' });
    expect(res404.status).toBe(404);

    // 403 si un cliente CUSTOMER intenta adjuntar a una orden ajena
    const res403 = await request(app)
      .post(`/api/orders/${createdOrderId}/receipt`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ receiptUrl: 'https://pub-r2.dev/test.jpg' });
    expect(res403.status).toBe(403);
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

  it('permite editar las dimensiones de una estampa y totales de una orden con PUT /api/orders/:id', async () => {
    const res = await request(app)
      .put(`/api/orders/${createdOrderId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        linearMeters: 2.4,
        unitRateQ: 75.0,
        materialPriceQ: 180.0,
        totalAmountQ: 180.0,
        notes: 'Dimensiones corregidas a 8x6 cm',
        items: [
          {
            title: 'Estampa Corregida',
            widthCm: 8,
            heightCm: 6,
            qty: 120,
            actualLinearMeters: 2.4,
            stickersPerRow: 3,
            rows: 40,
            includeCutting: false,
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Number(res.body.order.widthCm)).toBe(8);
    expect(Number(res.body.order.heightCm)).toBe(6);
    expect(Number(res.body.order.linearMeters)).toBe(2.4);
    expect(Number(res.body.order.totalAmountQ)).toBe(180);
    expect(res.body.order.items[0].title).toBe('Estampa Corregida');
    expect(Number(res.body.order.items[0].widthCm)).toBe(8);
    expect(Number(res.body.order.items[0].heightCm)).toBe(6);

    const notFound = await request(app)
      .put('/api/orders/orden-inexistente-999')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notes: 'No existe' });
    expect(notFound.status).toBe(404);
  });

  it('notifica por correo al administrador (miguel@kromalab.gt) cuando entra un pedido en PENDING_REVIEW', async () => {
    const notifySpy = vi.spyOn(emailService, 'sendNewOrderAdminNotificationEmail');

    const res = await request(app)
      .post('/api/orders')
      .send({
        customerName: 'Cliente Notificación',
        customerPhone: '+502 5555-8899',
        customerEmail: 'cliente.notif@ejemplo.gt',
        widthCm: 5,
        heightCm: 5,
        qty: 50,
        linearMeters: 1.0,
        unitRateQ: 150.0,
        materialPriceQ: 150.0,
        totalAmountQ: 150.0,
      });

    expect(res.status).toBe(201);
    expect(res.body.order.status).toBe('PENDING_REVIEW');
    expect(notifySpy).toHaveBeenCalledTimes(1);
    expect(notifySpy.mock.calls[0][0].code).toBe(res.body.order.code);

    notifySpy.mockClear();

    // Si el ADMIN registra un pedido directo como COMPLETED, no se auto-notifica
    const adminDirectRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerName: 'Pedido Directo Admin',
        customerPhone: '+502 5555-7700',
        widthCm: 5,
        heightCm: 5,
        qty: 20,
        linearMeters: 0.5,
        unitRateQ: 75.0,
        materialPriceQ: 37.5,
        totalAmountQ: 37.5,
        status: 'COMPLETED',
        paymentStatus: 'PENDING',
      });

    expect(adminDirectRes.status).toBe(201);
    expect(notifySpy).not.toHaveBeenCalled();

    notifySpy.mockRestore();
    await prisma.order.deleteMany({
      where: { id: { in: [res.body.order.id, adminDirectRes.body.order.id] } },
    });
  });
});
