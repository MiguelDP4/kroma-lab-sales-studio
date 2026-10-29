import { describe, it, expect, beforeEach, vi } from 'vitest';
import { productionStore, KANBAN_STAGES } from '../src/js/modules/production-store.js';
import { ORDER_STATUS } from '../src/shared/business-config.js';

describe('Production Store — Almacén Kanban y Bobina de Film', () => {
  beforeEach(() => {
    localStorage.clear();
    productionStore.resetToInitial();
  });

  it('inicializa con las 4 etapas de Kanban y órdenes de ejemplo', () => {
    expect(KANBAN_STAGES).toHaveLength(4);
    const state = productionStore.getState();
    expect(state.orders.length).toBeGreaterThanOrEqual(4);
    expect(state.roll.totalMeters).toBe(100.0);
  });

  it('calcula métricas de producción y consumo de bobina correctamente', () => {
    const metrics = productionStore.getMetrics();
    expect(metrics.totalRollMeters).toBe(100.0);
    expect(metrics.remainingMeters).toBeLessThanOrEqual(100.0);
    expect(metrics.percentRemaining).toBeGreaterThan(0);
    expect(metrics.queueMeters).toBeGreaterThan(0);
    expect(metrics.activeOrdersCount).toBeGreaterThan(0);
  });

  it('avanza una orden a través de las etapas Kanban y la completa al final', () => {
    // KL-00042 empieza en IN_AUDLEY_QUEUE
    expect(productionStore.advanceOrder('KL-00042')).toBe(true);
    let order = productionStore.getState().orders.find(o => o.id === 'KL-00042');
    expect(order.status).toBe(ORDER_STATUS.PRINTING);

    expect(productionStore.advanceOrder('KL-00042')).toBe(true);
    order = productionStore.getState().orders.find(o => o.id === 'KL-00042');
    expect(order.status).toBe(ORDER_STATUS.LAMINATING_CUTTING);

    expect(productionStore.advanceOrder('KL-00042')).toBe(true);
    order = productionStore.getState().orders.find(o => o.id === 'KL-00042');
    expect(order.status).toBe(ORDER_STATUS.READY_FOR_DELIVERY);

    // Avanzar desde READY_FOR_DELIVERY completa la orden
    expect(productionStore.advanceOrder('KL-00042')).toBe(true);
    order = productionStore.getState().orders.find(o => o.id === 'KL-00042');
    expect(order.status).toBe(ORDER_STATUS.COMPLETED);

    // Intentar avanzar una orden completada retorna false
    expect(productionStore.advanceOrder('KL-00042')).toBe(false);

    // Intentar avanzar ID inexistente retorna false
    expect(productionStore.advanceOrder('NO-EXISTE')).toBe(false);
  });

  it('retrocede una orden a la etapa previa de producción', () => {
    // KL-00041 empieza en PRINTING
    expect(productionStore.regressOrder('KL-00041')).toBe(true);
    const order = productionStore.getState().orders.find(o => o.id === 'KL-00041');
    expect(order.status).toBe(ORDER_STATUS.IN_AUDLEY_QUEUE);

    // No se puede retroceder antes de la primera etapa
    expect(productionStore.regressOrder('KL-00041')).toBe(false);

    // Orden inexistente retorna false
    expect(productionStore.regressOrder('NO-EXISTE')).toBe(false);
  });

  it('permite cambiar el estado de una orden a cualquier etapa o retorna false si no existe', () => {
    expect(productionStore.setOrderStatus('KL-00040', ORDER_STATUS.PRINTING)).toBe(true);
    const order = productionStore.getState().orders.find(o => o.id === 'KL-00040');
    expect(order.status).toBe(ORDER_STATUS.PRINTING);

    expect(productionStore.setOrderStatus('INVALID-ID', ORDER_STATUS.PRINTING)).toBe(false);
  });

  it('agrega una nueva orden a la cola de producción con valores predeterminados seguros', () => {
    const newOrder = productionStore.addOrder({
      clientName: 'Nuevo Cliente B2B',
      contactPhone: '+502 5900-1122',
      title: 'Etiquetas 6x6 cm',
      widthCm: 6,
      heightCm: 6,
      qty: 100,
      meters: 2.4,
      includeCutting: true,
      finishType: 'Barniz con Relieve 3D',
      notes: 'Urgente',
    });

    expect(newOrder.id).toMatch(/^KL-\d{5}$/);
    expect(newOrder.status).toBe(ORDER_STATUS.IN_AUDLEY_QUEUE);
    expect(newOrder.clientName).toBe('Nuevo Cliente B2B');
    expect(newOrder.meters).toBe(2.4);

    // Orden con campos vacíos toma defaults
    const fallbackOrder = productionStore.addOrder({});
    expect(fallbackOrder.clientName).toBe('Cliente General');
    expect(fallbackOrder.meters).toBe(1.0);
  });

  it('permite instalar/montar una nueva bobina de film y resetea el metraje', () => {
    productionStore.mountNewRoll(50.0, 'Bobina corta 50m');
    const state = productionStore.getState();
    expect(state.roll.totalMeters).toBe(50.0);
    expect(state.roll.notes).toBe('Bobina corta 50m');

    // Default con 100m si se llama sin argumentos
    productionStore.mountNewRoll();
    expect(productionStore.getState().roll.totalMeters).toBe(100.0);
  });

  it('notifica a los subscriptores y permite desuscribirse', () => {
    const listener = vi.fn();
    const unsubscribe = productionStore.subscribe(listener);

    productionStore.advanceOrder('KL-00042');
    expect(listener).toHaveBeenCalled();

    unsubscribe();
    listener.mockClear();
    productionStore.advanceOrder('KL-00042');
    expect(listener).not.toHaveBeenCalled();
  });

  it('detecta alerta de bobina baja y cola que supera el metraje restante', () => {
    // Instalar bobina pequeña de 10m
    productionStore.mountNewRoll(10.0, 'Bobina pequeña');

    // Agregar órdenes pesadas que consuman film
    productionStore.addOrder({ meters: 20.0, status: ORDER_STATUS.IN_AUDLEY_QUEUE });
    const metrics = productionStore.getMetrics();
    expect(metrics.isRollLow).toBe(true);
    expect(metrics.isQueueExceedingRoll).toBe(true);
  });

  it('captura errores si un listener falla durante notify', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const badListener = vi.fn(() => { throw new Error('Listener crash'); });
    const unsub = productionStore.subscribe(badListener);

    expect(() => productionStore.advanceOrder('KL-00042')).not.toThrow();
    expect(errorSpy).toHaveBeenCalled();

    unsub();
    errorSpy.mockRestore();
  });

  it('maneja excepciones de localStorage de manera tolerante', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded');
    });

    expect(() => productionStore.mountNewRoll(50)).not.toThrow();
    expect(warnSpy).toHaveBeenCalled();

    setItemSpy.mockRestore();
    warnSpy.mockRestore();
  });
  it('sincroniza órdenes desde ordersStore al tablero Kanban sin lanzar excepción', () => {
    expect(() => productionStore.syncWithOrdersStore()).not.toThrow();
  });

  it('actualiza el estado de una orden y sincroniza con ordersStore y apiClient', () => {
    const res = productionStore.setOrderStatus('KL-00042', ORDER_STATUS.PRINTING);
    expect(res).toBe(true);
    const order = productionStore.getState().orders.find(o => o.id === 'KL-00042');
    expect(order.status).toBe(ORDER_STATUS.PRINTING);
  });
});
