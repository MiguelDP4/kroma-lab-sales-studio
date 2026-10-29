import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { signToken } from '../src/middlewares/auth';
import { prisma } from '../src/db/prisma';

const app = createApp();

describe('Cart API (/api/cart)', () => {
  let userToken: string;
  let testUser: any;

  beforeAll(async () => {
    testUser = await prisma.user.create({
      data: {
        name: 'Cart Tester',
        email: `cart_${Date.now()}@test.gt`,
        password: 'Password123!',
        role: 'CUSTOMER',
        isVerified: true,
      },
    });

    userToken = signToken({
      id: testUser.id,
      email: testUser.email,
      role: testUser.role,
      name: testUser.name,
    });
  });

  afterAll(async () => {
    if (testUser?.id) {
      await prisma.user.deleteMany({ where: { id: testUser.id } });
    }
  });

  it('obtiene el carrito vacío inicialmente', async () => {
    const res = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.cart.items).toBeDefined();
  });

  it('agrega un item al carrito', async () => {
    const res = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Stickers 5x5 cm',
        widthCm: 5,
        heightCm: 5,
        qty: 100,
        rotationDeg: 0,
        rows: 5,
        stickersPerRow: 5,
        actualLinearMeters: 0.35,
        fileUrl: 'https://r2.dev/sticker.png',
        fileName: 'sticker.png',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.item.title).toBe('Stickers 5x5 cm');
    expect(Number(res.body.item.widthCm)).toBe(5);
  });

  it('sincroniza el carrito completo con múltiples items', async () => {
    const items = [
      {
        title: 'Diseño 1 (10x10 cm)',
        widthCm: 10,
        heightCm: 10,
        qty: 50,
        fileUrl: 'https://r2.dev/design1.png',
        fileName: 'design1.png',
      },
      {
        title: 'Diseño 2 (5x7 cm)',
        widthCm: 5,
        heightCm: 7,
        qty: 30,
        fileUrl: 'https://r2.dev/design2.png',
        fileName: 'design2.png',
      },
    ];

    const res = await request(app)
      .put('/api/cart/sync')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ items });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.cart.items.length).toBe(2);
  });

  it('elimina un item del carrito por id', async () => {
    const getRes = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${userToken}`);

    const itemId = getRes.body.cart.items[0].id;

    const delRes = await request(app)
      .delete(`/api/cart/items/${itemId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);

    const checkRes = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${userToken}`);

    expect(checkRes.body.cart.items.length).toBe(1);
  });

  it('vacía el carrito completamente', async () => {
    const res = await request(app)
      .delete('/api/cart')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const checkRes = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${userToken}`);

    expect(checkRes.body.cart.items.length).toBe(0);
  });
});
