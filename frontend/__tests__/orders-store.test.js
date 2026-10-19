import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ordersStore, PAYMENT_STATUS } from '../src/js/modules/orders-store.js';
import { ORDER_STATUS } from '../src/shared/business-config.js';

describe('Orders Store — Almacén Reactivo de Pedidos', () => {
  beforeEach(() => {
    localStorage.clear();
    ordersStore.resetToInitial();
  });

  it('inicializa con las órdenes de ejemplo', () => {
    const orders = ordersStore.getOrders();
    expect(orders.length).toBeGreaterThanOrEqual(4);
    expect(orders[0].id).toBe('KL-00042');
  });

  it('obtiene una orden por ID o retorna null si no existe', () => {
    const order = ordersStore.getOrderById('KL-00042');
    expect(order).not.toBeNull();
    expect(order.customer.company).toBe('Café San Cristóbal');

    expect(ordersStore.getOrderById('NO-EXISTE')).toBeNull();
  });

  it('crea una nueva orden con cálculo de ID y defaults seguros', () => {
    const newOrder = ordersStore.createOrder({
      customer: {
        name: 'Cliente Nuevo',
        company: 'Empresa GT',
        phone: '+502 5555-1111',
        nit: '998877-6',
        address: 'Villa Nueva, San José el Placer',
      },
      cartTotals: {
        totalBillableMeters: 2.0,
        tierRate: 115.0,
        materialTotalQ: 230.0,
        cuttingTotalQ: 25.0,
        grandTotalQ: 255.0,
        hasCutting: true,
      },
      items: [
        { title: 'Stickers 6x6', widthCm: 6, heightCm: 6, qty: 50, includeCutting: true }
      ],
      workshopNotes: 'Laminado urgente',
    });

    expect(newOrder.id).toMatch(/^KL-\d{5}$/);
    expect(newOrder.productionStatus).toBe(ORDER_STATUS.IN_AUDLEY_QUEUE);
    expect(newOrder.paymentStatus).toBe(PAYMENT_STATUS.PENDING);
    expect(newOrder.metrics.grandTotalQ).toBe(255.0);
    expect(newOrder.items[0].title).toBe('Stickers 6x6');

    // Creación con argumentos vacíos usa fallbacks
    const fallbackOrder = ordersStore.createOrder({});
    expect(fallbackOrder.customer.name).toBe('Cliente Mostrador');
    expect(fallbackOrder.metrics.grandTotalQ).toBe(140.0);
  });

  it('actualiza el estado de producción de una orden', () => {
    expect(ordersStore.updateProductionStatus('KL-00042', ORDER_STATUS.PRINTING)).toBe(true);
    const order = ordersStore.getOrderById('KL-00042');
    expect(order.productionStatus).toBe(ORDER_STATUS.PRINTING);

    expect(ordersStore.updateProductionStatus('INVALID-ID', ORDER_STATUS.PRINTING)).toBe(false);
  });

  it('actualiza el estado de pago de una orden', () => {
    expect(ordersStore.updatePaymentStatus('KL-00041', PAYMENT_STATUS.PAID)).toBe(true);
    const order = ordersStore.getOrderById('KL-00041');
    expect(order.paymentStatus).toBe(PAYMENT_STATUS.PAID);

    expect(ordersStore.updatePaymentStatus('INVALID-ID', PAYMENT_STATUS.PAID)).toBe(false);
  });

  it('elimina una orden por ID', () => {
    const initialCount = ordersStore.getOrders().length;
    expect(ordersStore.deleteOrder('KL-00039')).toBe(true);
    expect(ordersStore.getOrders().length).toBe(initialCount - 1);
    expect(ordersStore.getOrderById('KL-00039')).toBeNull();

    expect(ordersStore.deleteOrder('NO-EXISTE')).toBe(false);
  });

  it('calcula métricas de resumen financiero y operativo', () => {
    const metrics = ordersStore.getSummaryMetrics();
    expect(metrics.totalOrdersCount).toBeGreaterThan(0);
    expect(metrics.activeOrdersCount).toBeGreaterThan(0);
    expect(metrics.activeMeters).toBeGreaterThan(0);
    expect(metrics.totalRevenueQ).toBeGreaterThan(0);
    expect(metrics.pendingPaymentQ).toBeGreaterThanOrEqual(0);
  });

  it('notifica a los subscriptores y permite desuscribirse', () => {
    const listener = vi.fn();
    const unsub = ordersStore.subscribe(listener);

    ordersStore.updateProductionStatus('KL-00042', ORDER_STATUS.READY_FOR_DELIVERY);
    expect(listener).toHaveBeenCalled();

    unsub();
    listener.mockClear();
    ordersStore.updateProductionStatus('KL-00042', ORDER_STATUS.COMPLETED);
    expect(listener).not.toHaveBeenCalled();
  });

  it('captura errores si un listener falla durante notify', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const badListener = vi.fn(() => { throw new Error('Listener crash'); });
    const unsub = ordersStore.subscribe(badListener);

    expect(() => ordersStore.updatePaymentStatus('KL-00042', PAYMENT_STATUS.PAID)).not.toThrow();
    expect(errorSpy).toHaveBeenCalled();

    unsub();
    errorSpy.mockRestore();
  });

  it('maneja excepciones de localStorage de manera tolerante', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded');
    });

    expect(() => ordersStore.updateProductionStatus('KL-00042', ORDER_STATUS.PRINTING)).not.toThrow();
    expect(warnSpy).toHaveBeenCalled();

    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('ReadFailed');
    });
    expect(() => ordersStore._loadOrders()).not.toThrow();

    getItemSpy.mockRestore();
    setItemSpy.mockRestore();
    warnSpy.mockRestore();
  });
});
