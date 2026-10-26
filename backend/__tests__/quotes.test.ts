import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { seedDatabase } from '../src/db/seed';

const app = createApp();

describe('Quotes API (/api/quotes)', () => {
  let adminToken: string;
  let customerToken: string;
  let createdQuoteId: string;
  let createdQuoteCode: string;

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

  it('guarda una nueva cotización exitosamente en /api/quotes', async () => {
    const res = await request(app)
      .post('/api/quotes')
      .send({
        projectName: 'Stickers Café San Cristóbal 5x5cm',
        leadName: 'Rodrigo Méndez',
        leadPhone: '+502 5555-1234',
        leadEmail: 'rodrigo@promoguate.gt',
        companyName: 'Café San Cristóbal',
        widthCm: 5.0,
        heightCm: 5.0,
        qty: 100,
        linearMeters: 1.0,
        stickersPerRow: 5,
        rows: 20,
        unitRateQ: 140.0,
        materialPriceQ: 140.0,
        cuttingPriceQ: 30.0,
        totalPriceQ: 170.0,
        withCutting: true,
        finishType: 'GLOSSY_VARNISH',
        notes: 'Barniz con relieve en el logo central',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.quote).toBeDefined();
    expect(res.body.quote.code).toMatch(/^COT-\d{4}-\d{3}$/);
    expect(res.body.quote.projectName).toBe('Stickers Café San Cristóbal 5x5cm');
    expect(res.body.quote.status).toBe('SAVED');

    createdQuoteId = res.body.quote.id;
    createdQuoteCode = res.body.quote.code;
  });

  it('rechaza cotización si el ancho supera los 28 cm útiles de bobina Audley', async () => {
    const res = await request(app)
      .post('/api/quotes')
      .send({
        projectName: 'Error Bobina',
        leadName: 'Carlos Test',
        leadPhone: '+502 5555-0000',
        widthCm: 29.5, // Supera los 28 cm útiles
        heightCm: 10.0,
        qty: 10,
        linearMeters: 1.0,
        unitRateQ: 140.0,
        materialPriceQ: 140.0,
        totalPriceQ: 140.0,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('lista las cotizaciones registradas y permite filtrar por status y búsqueda', async () => {
    const resAll = await request(app)
      .get('/api/quotes')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resAll.status).toBe(200);
    expect(resAll.body.success).toBe(true);
    expect(resAll.body.quotes.length).toBeGreaterThanOrEqual(1);

    const resFilter = await request(app)
      .get('/api/quotes?status=SAVED&search=San Cristóbal')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resFilter.status).toBe(200);
    expect(resFilter.body.quotes.length).toBeGreaterThanOrEqual(1);
    expect(resFilter.body.quotes[0].projectName).toContain('Café San Cristóbal');
  });

  it('filtra cotizaciones del cliente autenticado', async () => {
    const res = await request(app)
      .get('/api/quotes')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.quotes.every((q: any) => q.leadEmail === 'rodrigo@promoguate.gt')).toBe(true);
  });

  it('obtiene el detalle de una cotización por ID y por código correlativo', async () => {
    const resById = await request(app).get(`/api/quotes/${createdQuoteId}`);
    expect(resById.status).toBe(200);
    expect(resById.body.quote.id).toBe(createdQuoteId);

    const resByCode = await request(app).get(`/api/quotes/${createdQuoteCode}`);
    expect(resByCode.status).toBe(200);
    expect(resByCode.body.quote.code).toBe(createdQuoteCode);
  });

  it('retorna 404 al consultar una cotización inexistente', async () => {
    const res = await request(app).get('/api/quotes/cot_inexistente_999');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('actualiza datos de una cotización guardada', async () => {
    const res = await request(app)
      .put(`/api/quotes/${createdQuoteId}`)
      .send({
        projectName: 'Stickers Café San Cristóbal 5x5cm - Edición Actualizada',
        notes: 'Se requiere corte circular especial',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.quote.projectName).toContain('Edición Actualizada');
    expect(res.body.quote.notes).toBe('Se requiere corte circular especial');
  });

  it('retorna 404 al actualizar una cotización inexistente', async () => {
    const res = await request(app)
      .put('/api/quotes/cot_inexistente_999')
      .send({ projectName: 'Nuevo' });

    expect(res.status).toBe(404);
  });

  it('convierte una cotización guardada a orden de producción real en 1 clic', async () => {
    const res = await request(app)
      .post(`/api/quotes/${createdQuoteId}/convert`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.order).toBeDefined();
    expect(res.body.order.code).toMatch(/^\d{10}$/);
    expect(Number(res.body.order.widthCm)).toBe(5.0);
    expect(Number(res.body.order.heightCm)).toBe(5.0);
    expect(res.body.order.qty).toBe(100);
    expect(res.body.order.status).toBe('PENDING_REVIEW');
    expect(res.body.order.notes).toContain('Edición Actualizada');

    // Verificar que la cotización cambió a CONVERTED
    expect(res.body.quote.status).toBe('CONVERTED');
    expect(res.body.quote.convertedOrderId).toBe(res.body.order.id);
    expect(res.body.quote.convertedOrderCode).toBe(res.body.order.code);
  });

  it('retorna 404 al convertir una cotización inexistente', async () => {
    const res = await request(app)
      .post('/api/quotes/cot_inexistente_999/convert')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it('rechaza con 403 si un cliente CUSTOMER intenta convertir una cotización a orden de producción', async () => {
    const res = await request(app)
      .post(`/api/quotes/${createdQuoteId}/convert`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('elimina una cotización guardada', async () => {
    // Crear cotización temporal para eliminar
    const tempRes = await request(app)
      .post('/api/quotes')
      .send({
        projectName: 'Cotización a borrar',
        leadName: 'Test Delete',
        leadPhone: '+502 5555-9999',
        widthCm: 8,
        heightCm: 5,
        qty: 50,
        linearMeters: 1.0,
        unitRateQ: 140.0,
        materialPriceQ: 140.0,
        totalPriceQ: 140.0,
      });

    const tempId = tempRes.body.quote.id;

    const delRes = await request(app).delete(`/api/quotes/${tempId}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);

    const getRes = await request(app).get(`/api/quotes/${tempId}`);
    expect(getRes.status).toBe(404);
  });

  it('retorna 404 al eliminar una cotización inexistente', async () => {
    const res = await request(app).delete('/api/quotes/cot_inexistente_999');
    expect(res.status).toBe(404);
  });

  it('bloquea a un cliente si intenta consultar, modificar o eliminar cotización ajena', async () => {
    // Crear cotización ajena con otro email
    const otherRes = await request(app)
      .post('/api/quotes')
      .send({
        projectName: 'Cotización Ajena',
        leadName: 'Otro Cliente',
        leadPhone: '+502 5555-7777',
        leadEmail: 'otro@cliente.gt',
        widthCm: 10,
        heightCm: 10,
        qty: 20,
        linearMeters: 1.0,
        unitRateQ: 140.0,
        materialPriceQ: 140.0,
        totalPriceQ: 140.0,
      });

    const otherId = otherRes.body.quote.id;

    // Intentar ver como cliente rodrigo@promoguate.gt
    const getRes = await request(app)
      .get(`/api/quotes/${otherId}`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(getRes.status).toBe(403);

    // Intentar editar como cliente rodrigo@promoguate.gt
    const putRes = await request(app)
      .put(`/api/quotes/${otherId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ projectName: 'Hack' });
    expect(putRes.status).toBe(403);

    // Intentar eliminar como cliente rodrigo@promoguate.gt
    const delRes = await request(app)
      .delete(`/api/quotes/${otherId}`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(delRes.status).toBe(403);
  });

  it('crea cotización con valores por defecto y sin notas, vinculando email de usuario autenticado', async () => {
    const res = await request(app)
      .post('/api/quotes')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        leadName: 'Rodrigo Méndez Test',
        leadPhone: '+502 5555-1234',
        widthCm: 10,
        heightCm: 10,
        qty: 20,
        linearMeters: 1.0,
        unitRateQ: 140.0,
        materialPriceQ: 140.0,
        totalPriceQ: 140.0,
      });

    expect(res.status).toBe(201);
    expect(res.body.quote.projectName).toBe('Cotización UV DTF');
    expect(res.body.quote.leadEmail).toBe('rodrigo@promoguate.gt');

    // Convertir cotización que tiene cliente en la base de datos
    const convRes = await request(app)
      .post(`/api/quotes/${res.body.quote.id}/convert`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(convRes.status).toBe(201);
    expect(convRes.body.order.customerId).toBeDefined();
  });

  it('permite listar con status=ALL', async () => {
    const res = await request(app)
      .get('/api/quotes?status=ALL')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.quotes.length).toBeGreaterThanOrEqual(1);
  });
});