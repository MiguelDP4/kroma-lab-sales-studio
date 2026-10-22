import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApiClient, getApiBaseUrl } from '../src/js/modules/api-client';

describe('ApiClient — Cliente HTTP Frontend', () => {
  let client;

  beforeEach(() => {
    localStorage.clear();
    client = new ApiClient('http://localhost:4000/api');
    vi.restoreAllMocks();
  });

  it('inicializa con baseUrl y lee token previo de localStorage', () => {
    localStorage.setItem('kromalab_jwt_token', 'token-guardado-123');
    const newClient = new ApiClient('http://localhost:4000/api');
    expect(newClient.token).toBe('token-guardado-123');
  });

  it('guarda y remueve token con setToken y clearToken', () => {
    client.setToken('nuevo-token-abc');
    expect(client.token).toBe('nuevo-token-abc');
    expect(localStorage.getItem('kromalab_jwt_token')).toBe('nuevo-token-abc');

    client.clearToken();
    expect(client.token).toBeNull();
    expect(localStorage.getItem('kromalab_jwt_token')).toBeNull();
  });

  it('ejecuta peticiones exitosas con cabeceras correctas', async () => {
    client.setToken('jwt-valido');

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [1, 2, 3] }),
    });

    const res = await client._request('/orders');
    expect(res.success).toBe(true);
    expect(client.isOnline).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:4000/api/orders',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer jwt-valido',
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('lanza error tipado cuando res.ok es false', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ message: 'No encontrado' }),
    });

    await expect(client._request('/inexistente')).rejects.toThrow('No encontrado');
  });

  it('marca isOnline en false cuando ocurre error de red en fetch', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(client._request('/error-red')).rejects.toThrow('Failed to fetch');
    expect(client.isOnline).toBe(false);
  });

  it('checkHealth retorna status y actualiza isOnline', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok', database: 'connected' }),
    });

    const res = await client.checkHealth();
    expect(res.status).toBe('ok');
    expect(client.isOnline).toBe(true);

    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const resFail = await client.checkHealth();
    expect(resFail.status).toBe('error');
    expect(client.isOnline).toBe(false);
  });

  it('auth.login guarda el token retornado y auth.logout lo limpia', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, token: 'token-login-xyz' }),
    });

    const res = await client.auth.login('miguel@kromalab.gt', 'Admin2026!');
    expect(res.success).toBe(true);
    expect(client.token).toBe('token-login-xyz');

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    await client.auth.logout();
    expect(client.token).toBeNull();
  });

  it('auth invoca me, updateProfile, listUsers, createUser, resetPassword y deleteUser correctamente', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, token: 'token-reg-123' }),
    });

    await client.auth.register({ name: 'Nuevo', email: 'n@k.gt', password: '123' });
    expect(client.token).toBe('token-reg-123');

    await client.auth.me();
    await client.auth.updateProfile({ name: 'Miguel' });
    await client.auth.listUsers();
    await client.auth.createUser({ name: 'Operador' });
    await client.auth.resetPassword('u1', 'nuevaClave');
    await client.auth.deleteUser('u1');
    expect(global.fetch).toHaveBeenCalledTimes(7);
  });

  it('orders gestiona list (con y sin query params), getById, create, updateStatus, updatePayment, getStats', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    await client.orders.list();
    await client.orders.list({ status: 'PRINTING', paymentStatus: 'PARTIAL', search: 'Test' });
    await client.orders.getById('o1');
    await client.orders.create({ totalAmountQ: 100 });
    await client.orders.updateStatus('o1', 'COMPLETED');
    await client.orders.updatePayment('o1', { paymentStatus: 'PAID' });
    await client.orders.getStats();

    expect(global.fetch).toHaveBeenCalledTimes(7);
  });

  it('customers gestiona list, getById, create y update', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    await client.customers.list();
    await client.customers.getById('c1');
    await client.customers.create({ managerName: 'Rodrigo' });
    await client.customers.update('c1', { notes: 'Actualizado' });

    expect(global.fetch).toHaveBeenCalledTimes(4);
  });

  it('dispatch gestiona list, getById, create y updateStatus', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    await client.dispatch.list();
    await client.dispatch.getById('d1');
    await client.dispatch.create({ folio: 'REM-001' });
    await client.dispatch.updateStatus('d1', { status: 'DELIVERED' });

    expect(global.fetch).toHaveBeenCalledTimes(4);
  });

  it('inventory gestiona list, recordRestock, adjustStock y listKardex', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    await client.inventory.list();
    await client.inventory.recordRestock({ itemId: 'i1', quantity: 10 });
    await client.inventory.adjustStock({ itemId: 'i1', newStock: 20 });
    await client.inventory.listKardex();

    expect(global.fetch).toHaveBeenCalledTimes(4);
  });

  it('receivables gestiona list, listPayments, recordPayment y voidPayment', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    await client.receivables.list();
    await client.receivables.listPayments();
    await client.receivables.recordPayment({ orderId: 'o1', amountPaidQ: 50 });
    await client.receivables.voidPayment('p1');

    expect(global.fetch).toHaveBeenCalledTimes(4);
  });

  it('workshop gestiona getConfig y updateConfig', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    await client.workshop.getConfig();
    await client.workshop.updateConfig({ rateTier1: 130 });

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('quotes gestiona list (con y sin query params), getById, create, update, convertToOrder y delete', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    await client.quotes.list();
    await client.quotes.list({ status: 'SAVED', search: 'Stickers' });
    await client.quotes.getById('q1');
    await client.quotes.create({ projectName: 'Stickers Termos', totalPriceQ: 140 });
    await client.quotes.update('q1', { projectName: 'Stickers Termos Yeti' });
    await client.quotes.convertToOrder('q1');
    await client.quotes.delete('q1');

    expect(global.fetch).toHaveBeenCalledTimes(7);
  });
  it('getApiBaseUrl resuelve url por defecto, de window.__KROMA_API_URL__ y de localStorage', () => {
    // Default
    expect(getApiBaseUrl()).toBe('http://localhost:4000/api');

    // LocalStorage
    localStorage.setItem('kromalab_api_url', 'https://custom-api.example.com/api');
    expect(getApiBaseUrl()).toBe('https://custom-api.example.com/api');
    localStorage.removeItem('kromalab_api_url');

    // Window global
    window.__KROMA_API_URL__ = 'https://prod-api.onrender.com/api';
    expect(getApiBaseUrl()).toBe('https://prod-api.onrender.com/api');
    delete window.__KROMA_API_URL__;
  });

    it('storage gestiona getStatus, getPresignedUrl, confirmUpload, getDownloadUrl y deleteAsset', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    await client.storage.getStatus();
    await client.storage.getPresignedUrl({ fileName: 'logo.png', fileType: 'image/png', fileSizeBytes: 1024 });
    await client.storage.confirmUpload({ fileKey: 'assets/quotes/1.png', fileUrl: 'https://pub-r2.dev/1.png', fileName: '1.png', fileSizeBytes: 1024 });
    await client.storage.getDownloadUrl('assets/orders/1.png');
    await client.storage.deleteAsset('assets/quotes/1.png');

    expect(global.fetch).toHaveBeenCalledTimes(5);
  });

});
