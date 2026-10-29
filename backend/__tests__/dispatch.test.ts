import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { seedDatabase } from '../src/db/seed';

const app = createApp();

describe('Dispatch API (/api/dispatch)', () => {
  let adminToken: string;
  let testOrderId: string;
  let createdDispatchId: string;

  beforeAll(async () => {
    await seedDatabase();
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'miguel@kromalab.gt', password: 'Admin2026!' });
    adminToken = loginRes.body.token;

    const order = await prisma.order.findFirst();
    testOrderId = order!.id;
  });

  it('lista las remisiones de taller y guías de entrega en /api/dispatch', async () => {
    const res = await request(app)
      .get('/api/dispatch')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.dispatchNotes.length).toBeGreaterThanOrEqual(1);
  });

  it('crea una nueva remisión con folio oficial correlativo', async () => {
    const res = await request(app)
      .post('/api/dispatch')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        orderId: testOrderId,
        customerName: 'Rodrigo Castillo',
        customerPhone: '+502 5555-1234',
        customerAddress: 'Zona 10, Ciudad de Guatemala',
        deliveryMethod: 'CARGO_EXPRESO',
        trackingNumber: 'CX-891234',
        packagesCount: 1,
        linearMeters: 2.68,
        totalAmountQ: 320.20,
        balanceDueQ: 0.0,
        checklistPassed: true,
        notes: 'Envío prioritario con sello de seguridad.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.dispatchNote.folio).toMatch(/^REM-\d{4}-\d{3}$/);
    createdDispatchId = res.body.dispatchNote.id;
  });

  it('obtiene la remisión por ID', async () => {
    const res = await request(app)
      .get(`/api/dispatch/${createdDispatchId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.dispatchNote.id).toBe(createdDispatchId);
  });

  it('retorna 404 al consultar una remisión inexistente', async () => {
    const res = await request(app)
      .get('/api/dispatch/id-inexistente-123')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('retorna 404 al intentar actualizar una remisión inexistente', async () => {
    const res = await request(app)
      .put('/api/dispatch/id-inexistente-123/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'IN_TRANSIT', trackingNumber: 'CX-000' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('actualiza el estado a DELIVERED y sincroniza la orden vinculada a COMPLETED', async () => {
    const res = await request(app)
      .put(`/api/dispatch/${createdDispatchId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'DELIVERED',
        deliveryRecipientName: 'Marta Pérez',
        deliveryRecipientDpi: '2456 78912 0101',
        trackingNumber: 'CX-891234-CONFIRMED',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.dispatchNote.status).toBe('DELIVERED');
    expect(res.body.dispatchNote.deliveryRecipientName).toBe('Marta Pérez');

    const updatedOrder = await prisma.order.findUnique({ where: { id: testOrderId } });
    expect(updatedOrder?.status).toBe('COMPLETED');
  });

  it('elimina una remisión de despacho por ID', async () => {
    const res = await request(app)
      .delete(`/api/dispatch/${createdDispatchId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const checkRes = await request(app)
      .get(`/api/dispatch/${createdDispatchId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(checkRes.status).toBe(404);
  });
});
