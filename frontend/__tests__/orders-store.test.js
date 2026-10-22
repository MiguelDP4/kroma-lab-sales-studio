import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ordersStore, PAYMENT_STATUS } from '../src/js/modules/orders-store.js';
import { apiClient } from '../src/js/modules/api-client.js';
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
    expect(newOrder.productionStatus).toBe(ORDER_STATUS.PENDING_REVIEW);
    expect(newOrder.paymentStatus).toBe(PAYMENT_STATUS.PENDING);
    expect(newOrder.metrics.grandTotalQ).toBe(255.0);
    expect(newOrder.items[0].title).toBe('Stickers 6x6');

    // Creación con argumentos vacíos usa fallbacks
    const fallbackOrder = ordersStore.createOrder({});
    expect(fallbackOrder.customer.name).toBe('Cliente Mostrador');
    expect(fallbackOrder.metrics.grandTotalQ).toBe(140.0);
  });

  it('preserva y almacena canvasSnapshot, rotationDeg y fileUrl al crear una orden y al mapear desde backend', () => {
    const orderWithSnapshot = ordersStore.createOrder({
      customer: { name: 'Empresa Técnica' },
      cartTotals: {
        canvasSnapshot: 'data:image/png;base64,sampleSnapOrder',
        rotationDeg: 90,
      },
      items: [
        {
          title: 'Logo 5x5',
          widthCm: 5,
          heightCm: 5,
          qty: 100,
          canvasSnapshot: 'data:image/png;base64,sampleSnapOrder',
          rotationDeg: 90,
          fileUrl: 'https://r2.dev/logo5x5.png',
          fileName: 'logo5x5.png',
        }
      ],
    });

    expect(orderWithSnapshot.canvasSnapshot).toBe('data:image/png;base64,sampleSnapOrder');
    expect(orderWithSnapshot.rotationDeg).toBe(90);
    expect(orderWithSnapshot.fileUrl).toBe('https://r2.dev/logo5x5.png');
    expect(orderWithSnapshot.items[0].canvasSnapshot).toBe('data:image/png;base64,sampleSnapOrder');
    expect(orderWithSnapshot.items[0].rotationDeg).toBe(90);

    // Mapeo desde Backend conservando snapshots locales previos
    const mapped = ordersStore._mapBackendOrder({
      id: orderWithSnapshot.id,
      code: orderWithSnapshot.id,
      customerName: 'Empresa Técnica',
      widthCm: 5,
      heightCm: 5,
      qty: 100,
      linearMeters: 1.0,
      materialPriceQ: 140,
      totalAmountQ: 140,
      status: 'IN_AUDLEY_QUEUE',
      paymentStatus: 'PENDING',
    });

    expect(mapped.canvasSnapshot).toBe('data:image/png;base64,sampleSnapOrder');
    expect(mapped.rotationDeg).toBe(90);
    expect(mapped.fileUrl).toBe('https://r2.dev/logo5x5.png');
    expect(mapped.items[0].canvasSnapshot).toBe('data:image/png;base64,sampleSnapOrder');
    expect(mapped.items[0].rotationDeg).toBe(90);
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
  it('gestiona comprobantes de pago bancarios al crear y adjuntar boletas', async () => {
    // 1. Crear orden con boleta inicial
    const orderWithReceipt = ordersStore.createOrder({
      customer: { name: 'Cliente con Boleta' },
      cartTotals: {
        totalBillableMeters: 1.0,
        grandTotalQ: 140.0,
      },
      paymentReceiptUrl: 'https://pub-r2.dev/assets/payments/boleta_bi.jpg',
      paymentReceiptFileName: 'boleta_bi.jpg',
    });

    expect(orderWithReceipt.paymentReceiptUrl).toBe('https://pub-r2.dev/assets/payments/boleta_bi.jpg');
    expect(orderWithReceipt.paymentReceiptFileName).toBe('boleta_bi.jpg');

    // 2. Mapear desde Backend conservando boleta
    const mapped = ordersStore._mapBackendOrder({
      id: orderWithReceipt.id,
      code: orderWithReceipt.id,
      customerName: 'Cliente con Boleta',
      widthCm: 5,
      heightCm: 5,
      qty: 50,
      linearMeters: 1.0,
      materialPriceQ: 140,
      totalAmountQ: 140,
      status: 'PENDING_REVIEW',
      paymentStatus: 'PARTIAL',
      paymentReceiptUrl: 'https://pub-r2.dev/assets/payments/boleta_bi_actualizada.jpg',
      paymentReceiptFileName: 'boleta_bi_actualizada.jpg',
    });
    expect(mapped.paymentReceiptUrl).toBe('https://pub-r2.dev/assets/payments/boleta_bi_actualizada.jpg');
    expect(mapped.paymentReceiptFileName).toBe('boleta_bi_actualizada.jpg');

    // 3. attachPaymentReceipt exitoso y sincronizado con API
    const attachSpy = vi.spyOn(apiClient.orders, 'attachReceipt').mockResolvedValueOnce({
      success: true,
      order: {
        id: orderWithReceipt.id,
        paymentReceiptUrl: 'https://pub-r2.dev/assets/payments/boleta_confirmada.pdf',
        paymentReceiptFileName: 'boleta_confirmada.pdf',
        amountPaidQ: 70.0,
        paymentStatus: PAYMENT_STATUS.PARTIAL,
      },
    });

    const updated = await ordersStore.attachPaymentReceipt(orderWithReceipt.id, {
      paymentReceiptUrl: 'https://pub-r2.dev/assets/payments/boleta_confirmada.pdf',
      paymentReceiptFileName: 'boleta_confirmada.pdf',
      amountPaidQ: 70.0,
      paymentStatus: PAYMENT_STATUS.PARTIAL,
    });

    expect(updated).not.toBeNull();
    expect(updated.paymentReceiptUrl).toBe('https://pub-r2.dev/assets/payments/boleta_confirmada.pdf');
    expect(updated.amountPaidQ).toBe(70.0);
    expect(updated.paymentStatus).toBe(PAYMENT_STATUS.PARTIAL);
    expect(attachSpy).toHaveBeenCalled();

    // 4. attachPaymentReceipt tolerante a error en backend
    attachSpy.mockRejectedValueOnce(new Error('Backend offline'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const fallbackUpdate = await ordersStore.attachPaymentReceipt(orderWithReceipt.id, {
      amountPaidQ: 140.0,
      paymentStatus: PAYMENT_STATUS.PAID,
    });
    expect(fallbackUpdate.paymentStatus).toBe(PAYMENT_STATUS.PAID);
    expect(fallbackUpdate.amountPaidQ).toBe(140.0);
    expect(warnSpy).toHaveBeenCalled();

    // 5. attachPaymentReceipt en orden inexistente retorna null
    const nonExistent = await ordersStore.attachPaymentReceipt('INEXISTENTE-999', { amountPaidQ: 50 });
    expect(nonExistent).toBeNull();

    attachSpy.mockRestore();
    warnSpy.mockRestore();
  });
});