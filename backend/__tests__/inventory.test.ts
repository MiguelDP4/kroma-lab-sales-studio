import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { seedDatabase } from '../src/db/seed';

const app = createApp();

describe('Inventory API (/api/inventory)', () => {
  let adminToken: string;
  let filmAId: string;

  beforeAll(async () => {
    await seedDatabase();
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'testadmin@kromalab.gt', password: 'TestAdmin2026!' });
    adminToken = loginRes.body.token;

    const filmA = await prisma.inventoryItem.findUnique({ where: { code: 'FILM_A' } });
    filmAId = filmA!.id;

    // Crear insumos de prueba con stock crítico y bajo
    await prisma.inventoryItem.upsert({
      where: { code: 'TEST_CRITICAL' },
      update: {},
      create: {
        code: 'TEST_CRITICAL',
        name: 'Insumo Crítico Test',
        category: 'CONSUMABLES',
        unit: 'uds',
        currentStock: 5.0,
        minStockThreshold: 10.0,
        unitCostQ: 20.0,
        optimalRatio: 1.5,
      },
    });

    await prisma.inventoryItem.upsert({
      where: { code: 'TEST_LOW' },
      update: {},
      create: {
        code: 'TEST_LOW',
        name: 'Insumo Bajo Test',
        category: 'CONSUMABLES',
        unit: 'uds',
        currentStock: 12.0,
        minStockThreshold: 10.0,
        unitCostQ: 20.0,
        optimalRatio: 1.5,
      },
    });
  });

  it('lista los insumos de taller con semáforo de existencias (OPTIMAL, LOW, CRITICAL)', async () => {
    const res = await request(app)
      .get('/api/inventory')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.items.some((i: any) => i.status === 'CRITICAL')).toBe(true);
    expect(res.body.items.some((i: any) => i.status === 'LOW')).toBe(true);
  });

  it('registra un reabastecimiento de compra e inserta entrada en Kardex', async () => {
    const initialItem = await prisma.inventoryItem.findUnique({ where: { id: filmAId } });
    const initialStock = initialItem!.currentStock;

    const res = await request(app)
      .post('/api/inventory/restock')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        itemId: filmAId,
        quantity: 50.0,
        unitCostQ: 6.00,
        reference: 'FACT-9021',
        notes: 'Compra de 1 bobina de Film A PET 30cm',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(Number(res.body.item.currentStock)).toBe(Number(initialStock) + 50.0);
    expect(res.body.movement.type).toBe('IN_PURCHASE');
    expect(Number(res.body.movement.totalCostQ)).toBe(300.0);
  });

  it('retorna 404 si se intenta reabastecer un insumo inexistente', async () => {
    const res = await request(app)
      .post('/api/inventory/restock')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        itemId: 'id-inexistente-999',
        quantity: 10.0,
        unitCostQ: 5.0,
      });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('registra un ajuste físico de inventario', async () => {
    const res = await request(app)
      .post('/api/inventory/adjust')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        itemId: filmAId,
        newStock: 160.0,
        reason: 'Conteo físico fin de mes',
        notes: 'Diferencia por calibración de tracción en máquina Audley.',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Number(res.body.item.currentStock)).toBe(160.0);
    expect(res.body.movement.type).toBe('ADJUSTMENT');
  });

  it('retorna 404 si se intenta ajustar un insumo inexistente', async () => {
    const res = await request(app)
      .post('/api/inventory/adjust')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        itemId: 'id-inexistente-999',
        newStock: 10.0,
        reason: 'Error',
      });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('lista el histórico de movimientos del Kardex', async () => {
    const res = await request(app)
      .get('/api/inventory/kardex')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.movements.length).toBeGreaterThanOrEqual(2);
  });
});
