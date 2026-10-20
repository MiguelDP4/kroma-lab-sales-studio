import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';

const app = createApp();

describe('Health Check API', () => {
  it('retorna 200 OK y estado conectado de la base de datos', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toContain('Kroma Lab Sales Studio');
    expect(res.body.database).toBe('connected');
  });

  it('retorna 500 si falla la conexión a la base de datos', async () => {
    const querySpy = vi.spyOn(prisma, '$queryRaw').mockRejectedValueOnce(new Error('DB Connection lost'));

    const res = await request(app).get('/api/health');
    expect(res.status).toBe(500);
    expect(res.body.status).toBe('error');
    expect(res.body.database).toBe('disconnected');
    expect(res.body.error).toBe('DB Connection lost');

    querySpy.mockRestore();
  });
});
