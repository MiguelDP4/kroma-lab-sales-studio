import { describe, it, expect, beforeEach, vi } from 'vitest';
import { clientsStore, CLIENT_CATEGORIES, CLIENT_TIERS } from '../src/js/modules/clients-store.js';
import { ordersStore, PAYMENT_STATUS } from '../src/js/modules/orders-store.js';

describe('Clients Store — Almacén de Cartera de Clientes B2B', () => {
  beforeEach(() => {
    localStorage.clear();
    ordersStore.resetToInitial();
    clientsStore.resetToInitial();
  });

  it('inicializa con los clientes B2B semilla', () => {
    const clients = clientsStore.getClients();
    expect(clients.length).toBeGreaterThanOrEqual(5);
    expect(clients[0].id).toBe('CLI-001');
    expect(clients[0].company).toBe('Café San Cristóbal');
  });

  it('obtiene un cliente por ID o null si no existe', () => {
    const client = clientsStore.getClientById('CLI-001');
    expect(client).not.toBeNull();
    expect(client.name).toBe('Rodrigo Méndez');

    expect(clientsStore.getClientById('CLI-NO-EXISTE')).toBeNull();
  });

  it('busca clientes por NIT con sanitización', () => {
    const client = clientsStore.getClientByNit('7845129-4');
    expect(client).not.toBeNull();
    expect(client.company).toBe('Café San Cristóbal');

    // CF o valores vacíos devuelven null
    expect(clientsStore.getClientByNit('CF')).toBeNull();
    expect(clientsStore.getClientByNit('')).toBeNull();
    expect(clientsStore.getClientByNit('NIT-INVENTADO')).toBeNull();
  });

  it('busca clientes por teléfono con sanitización de caracteres no numéricos', () => {
    const client = clientsStore.getClientByPhone('55551234');
    expect(client).not.toBeNull();
    expect(client.company).toBe('Café San Cristóbal');

    expect(clientsStore.getClientByPhone('')).toBeNull();
    expect(clientsStore.getClientByPhone('9999999999')).toBeNull();
  });

  it('crea un nuevo cliente con ID generado y valores sanitizados', () => {
    const newClient = clientsStore.createClient({
      company: 'Tazas y Termos GT',
      name: 'Estuardo Pérez',
      phone: '+502 4321-8765',
      nit: '554433-2',
      email: 'estuardo@termos.gt',
      address: 'Zona 14, Ciudad de Guatemala',
      category: 'PROMOCIONALES_MERCH',
      tier: 'VIP',
      notes: 'Requiere pruebas de adherencia para acero inoxidable',
    });

    expect(newClient.id).toMatch(/^CLI-\d+$/);
    expect(newClient.company).toBe('Tazas y Termos GT');
    expect(newClient.category).toBe('PROMOCIONALES_MERCH');
    expect(newClient.tier).toBe('VIP');

    const retrieved = clientsStore.getClientById(newClient.id);
    expect(retrieved).not.toBeNull();

    // Creación con campos vacíos usa fallbacks seguros
    const fallbackClient = clientsStore.createClient({});
    expect(fallbackClient.company).toBe('Cliente B2B');
    expect(fallbackClient.category).toBe('COMERCIO_GENERAL');
    expect(fallbackClient.tier).toBe('NUEVO');
  });

  it('actualiza datos de un cliente existente', () => {
    const updated = clientsStore.updateClient('CLI-001', {
      company: 'Café San Cristóbal & Roastery',
      tier: 'RECURRENTE',
      phone: '+502 5555-9999',
      nit: '7845129-4',
      address: 'Nueva sucursal San Cristóbal',
      notes: 'Actualización comercial',
    });

    expect(updated).toBe(true);
    const client = clientsStore.getClientById('CLI-001');
    expect(client.company).toBe('Café San Cristóbal & Roastery');
    expect(client.tier).toBe('RECURRENTE');
    expect(client.phone).toBe('+502 5555-9999');

    // Cliente inexistente retorna false
    expect(clientsStore.updateClient('NO-EXISTE', { name: 'X' })).toBe(false);
  });

  it('elimina un cliente por ID', () => {
    const initialCount = clientsStore.getClients().length;
    expect(clientsStore.deleteClient('CLI-005')).toBe(true);
    expect(clientsStore.getClients().length).toBe(initialCount - 1);
    expect(clientsStore.getClientById('CLI-005')).toBeNull();

    expect(clientsStore.deleteClient('CLI-INEXISTENTE')).toBe(false);
  });

  it('obtiene las órdenes e historial de un cliente desde ordersStore', () => {
    const client = clientsStore.getClientById('CLI-001');
    const orders = clientsStore.getClientOrders(client);
    expect(orders.length).toBeGreaterThanOrEqual(1);
    expect(orders[0].id).toBe('KL-00042');

    const metrics = clientsStore.getClientMetrics(client);
    expect(metrics.ordersCount).toBeGreaterThanOrEqual(1);
    expect(metrics.totalMetersPurchased).toBeGreaterThan(0);
    expect(metrics.totalSpentQ).toBeGreaterThan(0);
    expect(metrics.lastOrderDate).toBeDefined();

    // Cliente inexistente retorna array vacío y métricas en cero
    expect(clientsStore.getClientOrders('INEXISTENTE')).toEqual([]);
    const emptyMetrics = clientsStore.getClientMetrics('INEXISTENTE');
    expect(emptyMetrics.ordersCount).toBe(0);
    expect(emptyMetrics.totalMetersPurchased).toBe(0);
  });

  it('calcula métricas consolidadas de la cartera B2B', () => {
    const portfolio = clientsStore.getPortfolioMetrics();
    expect(portfolio.totalClients).toBeGreaterThanOrEqual(5);
    expect(portfolio.targetClients).toBe(25);
    expect(portfolio.activeClientsCount).toBeGreaterThan(0);
    expect(portfolio.vipCount).toBeGreaterThanOrEqual(1);
    expect(portfolio.totalPortfolioMeters).toBeGreaterThan(0);
    expect(portfolio.totalPortfolioRevenueQ).toBeGreaterThan(0);
  });

  it('notifica a los subscriptores y permite desuscribirse', () => {
    const listener = vi.fn();
    const unsub = clientsStore.subscribe(listener);

    clientsStore.updateClient('CLI-002', { notes: 'Nueva nota' });
    expect(listener).toHaveBeenCalled();

    unsub();
    listener.mockClear();
    clientsStore.updateClient('CLI-002', { notes: 'Otra nota' });
    expect(listener).not.toHaveBeenCalled();
  });

  it('captura errores si un subscriptor falla en notify', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const badListener = vi.fn(() => { throw new Error('Crash listener'); });
    const unsub = clientsStore.subscribe(badListener);

    expect(() => clientsStore.updateClient('CLI-001', { name: 'Test' })).not.toThrow();
    expect(errorSpy).toHaveBeenCalled();

    unsub();
    errorSpy.mockRestore();
  });

  it('maneja excepciones de localStorage tolerando fallos de lectura y escritura', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('StorageFull');
    });

    expect(() => clientsStore.updateClient('CLI-001', { name: 'Test' })).not.toThrow();
    expect(warnSpy).toHaveBeenCalled();

    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('ReadFail');
    });
    expect(() => clientsStore._loadClients()).not.toThrow();

    getItemSpy.mockRestore();
    setItemSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('recupera clientes guardados como array en localStorage y tolera datos no array', () => {
    localStorage.setItem('kromalab_clients', JSON.stringify([{ id: 'CLI-888', company: 'Custom' }]));
    clientsStore._loadClients();
    expect(clientsStore.getClients()[0].id).toBe('CLI-888');

    localStorage.setItem('kromalab_clients', '{"key": "not an array"}');
    clientsStore._loadClients();
    expect(clientsStore.getClients().length).toBeGreaterThanOrEqual(5);
  });
});
