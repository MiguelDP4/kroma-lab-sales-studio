/**
 * Almacén reactivo de producción y tablero Kanban para la impresora industrial Audley.
 * Gestiona el ciclo de vida de las órdenes de taller y el monitor de consumo de bobina PET.
 */

import { ORDER_STATUS } from '../../shared/business-config.js';

const STORAGE_KEY_ORDERS = 'kromalab_production_orders';
const STORAGE_KEY_ROLL = 'kromalab_production_roll';

export const KANBAN_STAGES = [
  { id: ORDER_STATUS.IN_AUDLEY_QUEUE, title: '1. En Cola Audley', badgeClass: 'badge-queue', color: 'var(--cerulean)' },
  { id: ORDER_STATUS.PRINTING, title: '2. Imprimiendo UV', badgeClass: 'badge-printing', color: 'var(--color-warning)' },
  { id: ORDER_STATUS.LAMINATING_CUTTING, title: '3. Laminado y Corte', badgeClass: 'badge-laminating', color: 'var(--baltic-blue)' },
  { id: ORDER_STATUS.READY_FOR_DELIVERY, title: '4. Listo / Empaque', badgeClass: 'badge-ready', color: 'var(--color-success)' },
];

const INITIAL_ROLL = {
  totalMeters: 100.0,
  installedAt: new Date().toISOString(),
  notes: 'Bobina Audley PET Film A (30cm x 100m)',
};

const INITIAL_ORDERS = [
  {
    id: 'KL-00042',
    clientName: 'Café San Cristóbal',
    contactPhone: '+502 5555-1234',
    title: 'Stickers Logo Tazas 5 × 5 cm',
    widthCm: 5,
    heightCm: 5,
    qty: 150,
    meters: 1.58,
    includeCutting: true,
    finishType: 'Barniz con Relieve 3D',
    status: ORDER_STATUS.IN_AUDLEY_QUEUE,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    notes: 'Prioridad alta, entrega por la tarde.',
  },
  {
    id: 'KL-00043',
    clientName: 'Taller Mecánico El Águila',
    contactPhone: '+502 4444-9876',
    title: 'Calcomanías Servicio 12 × 6 cm',
    widthCm: 12,
    heightCm: 6,
    qty: 60,
    meters: 2.10,
    includeCutting: false,
    finishType: 'Brillo Directo Estándar',
    status: ORDER_STATUS.IN_AUDLEY_QUEUE,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    notes: 'Entrega en rollo continuo sin cortar.',
  },
  {
    id: 'KL-00041',
    clientName: 'Barbería Vintage',
    contactPhone: '+502 5111-2233',
    title: 'Logos Espejo 8 × 5 cm',
    widthCm: 8,
    heightCm: 5,
    qty: 80,
    meters: 3.20,
    includeCutting: true,
    finishType: 'Barniz con Relieve 3D',
    status: ORDER_STATUS.PRINTING,
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    notes: 'Verificar alineación de blanco opaco.',
  },
  {
    id: 'KL-00040',
    clientName: 'Sport Gym GT',
    contactPhone: '+502 5999-8877',
    title: 'Termos Deportivos 10 × 10 cm',
    widthCm: 10,
    heightCm: 10,
    qty: 50,
    meters: 2.50,
    includeCutting: false,
    finishType: 'Barniz Brillante',
    status: ORDER_STATUS.READY_FOR_DELIVERY,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    notes: 'Listo para recolección en taller.',
  },
];

class ProductionStore {
  constructor() {
    this.listeners = new Set();
    this.state = this._loadState();
  }

  _loadState() {
    let orders = INITIAL_ORDERS;
    let roll = INITIAL_ROLL;

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const savedOrders = window.localStorage.getItem(STORAGE_KEY_ORDERS);
        if (savedOrders) orders = JSON.parse(savedOrders);

        const savedRoll = window.localStorage.getItem(STORAGE_KEY_ROLL);
        if (savedRoll) roll = JSON.parse(savedRoll);
      } catch (e) {
        console.warn('Error al cargar datos de producción desde localStorage', e);
      }
    }

    return { orders, roll };
  }

  _saveState() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(this.state.orders));
        window.localStorage.setItem(STORAGE_KEY_ROLL, JSON.stringify(this.state.roll));
      } catch (e) {
        console.warn('Error al guardar datos de producción en localStorage', e);
      }
    }
  }

  getState() {
    return this.state;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  _notify() {
    this._saveState();
    this.listeners.forEach(fn => {
      try {
        fn(this.state);
      } catch (err) {
        console.error('Error en listener de producción:', err);
      }
    });
  }

  /**
   * Cambia el estado de una orden a uno específico
   */
  setOrderStatus(orderId, newStatus) {
    const order = this.state.orders.find(o => o.id === orderId);
    if (!order) return false;

    order.status = newStatus;
    order.updatedAt = new Date().toISOString();
    this._notify();
    return true;
  }

  /**
   * Avanza la orden a la siguiente etapa de producción
   */
  advanceOrder(orderId) {
    const stageIds = KANBAN_STAGES.map(s => s.id);
    const order = this.state.orders.find(o => o.id === orderId);
    if (!order) return false;

    const currentIndex = stageIds.indexOf(order.status);
    if (currentIndex >= 0 && currentIndex < stageIds.length - 1) {
      return this.setOrderStatus(orderId, stageIds[currentIndex + 1]);
    } else if (order.status === ORDER_STATUS.READY_FOR_DELIVERY) {
      // Marcar como completado y archivar
      return this.setOrderStatus(orderId, ORDER_STATUS.COMPLETED);
    }
    return false;
  }

  /**
   * Retrocede la orden a la etapa anterior
   */
  regressOrder(orderId) {
    const stageIds = KANBAN_STAGES.map(s => s.id);
    const order = this.state.orders.find(o => o.id === orderId);
    if (!order) return false;

    const currentIndex = stageIds.indexOf(order.status);
    if (currentIndex > 0) {
      return this.setOrderStatus(orderId, stageIds[currentIndex - 1]);
    }
    return false;
  }

  /**
   * Agrega una nueva orden a la cola de producción
   */
  addOrder(orderData) {
    const newId = `KL-${String(Math.floor(10000 + Math.random() * 90000))}`;
    const newOrder = {
      id: orderData.id || newId,
      clientName: orderData.clientName || 'Cliente General',
      contactPhone: orderData.contactPhone || '+502 5555-0000',
      title: orderData.title || `Stickers ${orderData.widthCm || 5} × ${orderData.heightCm || 5} cm`,
      widthCm: parseFloat(orderData.widthCm) || 5,
      heightCm: parseFloat(orderData.heightCm) || 5,
      qty: parseInt(orderData.qty, 10) || 50,
      meters: parseFloat(orderData.meters) || 1.0,
      includeCutting: Boolean(orderData.includeCutting),
      finishType: orderData.finishType || 'Barniz con Relieve 3D',
      status: ORDER_STATUS.IN_AUDLEY_QUEUE,
      createdAt: new Date().toISOString(),
      notes: orderData.notes || '',
    };

    this.state.orders.unshift(newOrder);
    this._notify();
    return newOrder;
  }

  /**
   * Instala / Reinicia una bobina de film PET en la máquina
   */
  mountNewRoll(meters = 100.0, notes = 'Bobina Audley PET Film A (100m)') {
    this.state.roll = {
      totalMeters: parseFloat(meters) || 100.0,
      installedAt: new Date().toISOString(),
      notes,
    };
    this._notify();
  }

  /**
   * Métricas y estadísticas calculadas en tiempo real
   */
  getMetrics() {
    const orders = this.state.orders;

    // Metros procesados (en máquina, laminando, listos o completados con la bobina actual)
    const printedMeters = orders
      .filter(o => o.status === ORDER_STATUS.PRINTING || 
                   o.status === ORDER_STATUS.LAMINATING_CUTTING || 
                   o.status === ORDER_STATUS.READY_FOR_DELIVERY || 
                   o.status === ORDER_STATUS.COMPLETED)
      .reduce((sum, o) => sum + (o.meters || 0), 0);

    const queueMeters = orders
      .filter(o => o.status === ORDER_STATUS.IN_AUDLEY_QUEUE)
      .reduce((sum, o) => sum + (o.meters || 0), 0);

    const totalRoll = this.state.roll.totalMeters || 100.0;
    const remainingMeters = Math.max(0, totalRoll - printedMeters);
    const percentRemaining = Math.max(0, Math.min(100, (remainingMeters / totalRoll) * 100));

    return {
      totalRollMeters: totalRoll,
      printedMeters,
      remainingMeters,
      percentRemaining,
      queueMeters,
      isRollLow: remainingMeters < 15.0,
      isQueueExceedingRoll: queueMeters > remainingMeters,
      activeOrdersCount: orders.filter(o => o.status !== ORDER_STATUS.COMPLETED && o.status !== ORDER_STATUS.CANCELLED).length,
    };
  }

  /**
   * Reinicia el almacén a los datos de fábrica (útil para pruebas)
   */
  resetToInitial() {
    this.state = {
      orders: JSON.parse(JSON.stringify(INITIAL_ORDERS)),
      roll: { ...INITIAL_ROLL },
    };
    this._notify();
  }
}

export const productionStore = new ProductionStore();
