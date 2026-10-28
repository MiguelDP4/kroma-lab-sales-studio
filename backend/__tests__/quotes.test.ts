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

  it('guarda una nueva cotización exitosamente en /api/quotes incluyendo OrderItem por defecto', async () => {
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
        fileUrl: 'https://pub-r2.dev/assets/logo_sancristobal.png',
        fileName: 'logo_sancristobal.png',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.quote).toBeDefined();
    expect(res.body.quote.code).toMatch(/^COT-\d{4}-\d{3}$/);
    expect(res.body.quote.projectName).toBe('Stickers Café San Cristóbal 5x5cm');
    expect(res.body.quote.status).toBe('SAVED');
    expect(Array.isArray(res.body.quote.items)).toBe(true);
    expect(res.body.quote.items.length).toBe(1);
    expect(Number(res.body.quote.items[0].widthCm)).toBe(5.0);
    expect(Number(res.body.quote.items[0].heightCm)).toBe(5.0);
    expect(res.body.quote.items[0].qty).toBe(100);
    expect(res.body.quote.items[0].fileUrl).toBe('https://pub-r2.dev/assets/logo_sancristobal.png');
    expect(res.body.quote.items[0].fileName).toBe('logo_sancristobal.png');

    createdQuoteId = res.body.quote.id;
    createdQuoteCode = res.body.quote.code;
  });

  it('guarda una cotización con múltiples OrderItems explícitos', async () => {
    const res = await request(app)
      .post('/api/quotes')
      .send({
        projectName: 'Combo Stickers Restaurante',
        leadName: 'Ana Lucía Gómez',
        leadPhone: '+502 5555-0404',
        leadEmail: 'ana.diseno@kromalab.gt',
        companyName: 'Restaurante El Rincón',
        widthCm: 8.0,
        heightCm: 5.0,
        qty: 150,
        linearMeters: 2.5,
        stickersPerRow: 3,
        rows: 50,
        unitRateQ: 130.0,
        materialPriceQ: 325.0,
        cuttingPriceQ: 0.0,
        totalPriceQ: 325.0,
        withCutting: false,
        items: [
          {
            title: 'Logo Principal 8x5 cm',
            widthCm: 8.0,
            heightCm: 5.0,
            qty: 100,
            rotationDeg: 0,
            rows: 34,
            stickersPerRow: 3,
            includeCutting: false,
            fileUrl: 'https://pub-r2.dev/assets/rincon_logo.png',
            fileName: 'rincon_logo.png',
            actualLinearMeters: 1.7,
          },
          {
            title: 'Código QR Menú 5x5 cm',
            widthCm: 5.0,
            heightCm: 5.0,
            qty: 50,
            rotationDeg: 0,
            rows: 10,
            stickersPerRow: 5,
            includeCutting: false,
            fileUrl: 'https://pub-r2.dev/assets/rincon_qr.png',
            fileName: 'rincon_qr.png',
            actualLinearMeters: 0.8,
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.quote.items.length).toBe(2);
    expect(res.body.quote.items[0].title).toBe('Logo Principal 8x5 cm');
    expect(res.body.quote.items[0].fileUrl).toBe('https://pub-r2.dev/assets/rincon_logo.png');
    expect(res.body.quote.items[1].title).toBe('Código QR Menú 5x5 cm');
    expect(res.body.quote.items[1].fileUrl).toBe('https://pub-r2.dev/assets/rincon_qr.png');
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

  it('lista las cotizaciones registradas con sus orderItems y permite filtrar por status y búsqueda', async () => {
    const resAll = await request(app)
      .get('/api/quotes')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resAll.status).toBe(200);
    expect(resAll.body.success).toBe(true);
    expect(resAll.body.quotes.length).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(resAll.body.quotes[0].items)).toBe(true);

    const resFilter = await request(app)
      .get('/api/quotes?status=SAVED&search=San Cristóbal')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resFilter.status).toBe(200);
    expect(resFilter.body.quotes.length).toBeGreaterThanOrEqual(1);
    expect(resFilter.body.quotes[0].projectName).toContain('Café San Cristóbal');
    expect(resFilter.body.quotes[0].items.length).toBeGreaterThanOrEqual(1);
  });

  it('filtra cotizaciones del cliente autenticado incluyendo items', async () => {
    const res = await request(app)
      .get('/api/quotes')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.quotes.every((q: any) => q.leadEmail === 'rodrigo@promoguate.gt')).toBe(true);
    expect(Array.isArray(res.body.quotes[0].items)).toBe(true);
  });

  it('obtiene el detalle de una cotización por ID y por código correlativo con items de orden', async () => {
    const resById = await request(app).get(`/api/quotes/${createdQuoteId}`);
    expect(resById.status).toBe(200);
    expect(resById.body.quote.id).toBe(createdQuoteId);
    expect(Array.isArray(resById.body.quote.items)).toBe(true);
    expect(resById.body.quote.items.length).toBe(1);
    expect(resById.body.quote.items[0].fileUrl).toBe('https://pub-r2.dev/assets/logo_sancristobal.png');

    const resByCode = await request(app).get(`/api/quotes/${createdQuoteCode}`);
    expect(resByCode.status).toBe(200);
    expect(resByCode.body.quote.code).toBe(createdQuoteCode);
    expect(Array.isArray(resByCode.body.quote.items)).toBe(true);
  });

  it('retorna 404 al consultar una cotización inexistente', async () => {
    const res = await request(app).get('/api/quotes/cot_inexistente_999');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('actualiza datos de una cotización guardada y sincroniza items', async () => {
    const res = await request(app)
      .put(`/api/quotes/${createdQuoteId}`)
      .send({
        projectName: 'Stickers Café San Cristóbal 5x5cm - Edición Actualizada',
        notes: 'Se requiere corte circular especial',
        items: [
          {
            title: 'Stickers Café Actualizados 5x5 cm',
            widthCm: 5.0,
            heightCm: 5.0,
            qty: 120,
            rotationDeg: 90,
            rows: 24,
            stickersPerRow: 5,
            includeCutting: true,
            fileUrl: 'https://pub-r2.dev/assets/logo_sancristobal_v2.png',
            fileName: 'logo_sancristobal_v2.png',
            actualLinearMeters: 1.2,
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.quote.projectName).toContain('Edición Actualizada');
    expect(res.body.quote.notes).toBe('Se requiere corte circular especial');
    expect(res.body.quote.items.length).toBe(1);
    expect(res.body.quote.items[0].title).toBe('Stickers Café Actualizados 5x5 cm');
    expect(res.body.quote.items[0].qty).toBe(120);
    expect(res.body.quote.items[0].fileUrl).toBe('https://pub-r2.dev/assets/logo_sancristobal_v2.png');
  });

  it('retorna 404 al actualizar una cotización inexistente', async () => {
    const res = await request(app)
      .put('/api/quotes/cot_inexistente_999')
      .send({ projectName: 'Nuevo' });

    expect(res.status).toBe(404);
  });

  it('convierte una cotización guardada a orden de producción real en 1 clic clonando OrderItems', async () => {
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

    // Verificar que los items de la orden fueron clonados desde la cotización
    expect(Array.isArray(res.body.order.items)).toBe(true);
    expect(res.body.order.items.length).toBe(1);
    expect(res.body.order.items[0].title).toBe('Stickers Café Actualizados 5x5 cm');
    expect(res.body.order.items[0].fileUrl).toBe('https://pub-r2.dev/assets/logo_sancristobal_v2.png');

    // Verificar que la cotización cambió a CONVERTED
    expect(res.body.quote.status).toBe('CONVERTED');
    expect(res.body.quote.convertedOrderId).toBe(res.body.order.id);
    expect(res.body.quote.convertedOrderCode).toBe(res.body.order.code);
    expect(Array.isArray(res.body.quote.items)).toBe(true);
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

    const delRes = await request(app)
      .delete(`/api/quotes/${tempId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);

    const getRes = await request(app).get(`/api/quotes/${tempId}`);
    expect(getRes.status).toBe(404);
  });

  it('retorna 404 al eliminar una cotización inexistente', async () => {
    const res = await request(app)
      .delete('/api/quotes/cot_inexistente_999')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it('bloquea a un cliente si intenta consultar, modificar o eliminar cotización ajena', async () => {
    // Crear cotización de otro cliente
    const otherRes = await request(app)
      .post('/api/quotes')
      .send({
        projectName: 'Cotización Privada de Otro Cliente',
        leadName: 'Juan Pérez',
        leadPhone: '+502 5555-8888',
        leadEmail: 'juan.perez@otrocliente.gt',
        widthCm: 6,
        heightCm: 6,
        qty: 100,
        linearMeters: 1.2,
        unitRateQ: 140.0,
        materialPriceQ: 168.0,
        totalPriceQ: 168.0,
      });

    const otherId = otherRes.body.quote.id;

    // Intentar consultar como cliente rodrigo@promoguate.gt
    const getRes = await request(app)
      .get(`/api/quotes/${otherId}`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(getRes.status).toBe(403);

    // Intentar modificar como cliente rodrigo@promoguate.gt
    const putRes = await request(app)
      .put(`/api/quotes/${otherId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ projectName: 'Hacked' });
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
    expect(res.body.quote.items.length).toBe(1);

    // Convertir cotización que tiene cliente en la base de datos
    const convRes = await request(app)
      .post(`/api/quotes/${res.body.quote.id}/convert`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(convRes.status).toBe(201);
    expect(convRes.body.order.customerId).toBeDefined();
    expect(convRes.body.order.items.length).toBe(1);
  });

  it('permite listar con status=ALL', async () => {
    const res = await request(app)
      .get('/api/quotes?status=ALL')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.quotes.length).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(res.body.quotes[0].items)).toBe(true);
  });
});
