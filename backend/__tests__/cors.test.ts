import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('CORS and App Middleware', () => {
  it('permite solicitudes sin cabecera origin (Postman/Curl)', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
  });

  it('permite solicitudes desde el frontend local http://localhost:3000', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:3000');

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });

  it('permite solicitudes desde otros orígenes en desarrollo', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://otra-app.com');

    expect(res.status).toBe(200);
  });
});
