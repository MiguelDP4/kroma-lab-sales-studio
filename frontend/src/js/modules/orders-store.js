/**
 * Almacén reactivo de pedidos B2B y gestión comercial de Kroma Lab UV DTF.
 * Administra el ciclo de vida comercial, pagos, métricas y órdenes de taller.
 */

import { ORDER_STATUS } from '../../shared/business-config.js';

const STORAGE_KEY_ORDERS = 'kromalab_orders';

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',       // Pendiente de pago
  PARTIAL: 'PARTIAL',       // Anticipo 50%
  PAID: 'PAID',             // Pagado 100%
  CANCELLED: 'CANCELLED',   // Cancelado
};

export const PAYMENT_STATUS_LABELS = {
  [PAYMENT_STATUS.PENDING]: { label: 'Pendiente', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
  [PAYMENT_STATUS.PARTIAL]: { label: 'Anticipo 50%', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  [PAYMENT_STATUS.PAID]: { label: 'Pagado', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  [PAYMENT_STATUS.CANCELLED]: { label: 'Anulado', color: '#64748b', bg: 'rgba(100, 116, 139, 0.15)' },
};

export const PRODUCTION_STATUS_LABELS = {
  [ORDER_STATUS.IN_AUDLEY_QUEUE]: { label: 'En Cola Audley', color: 'var(--cerulean)', bg: 'rgba(28, 114, 147, 0.15)' },
  [ORDER_STATUS.PRINTING]: { label: 'Imprimiendo UV', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  [ORDER_STATUS.LAMINATING_CUTTING]: { label: 'Laminado y Corte', color: 'var(--baltic-blue)', bg: 'rgba(6, 90, 130, 0.2)' },
  [ORDER_STATUS.READY_FOR_DELIVERY]: { label: 'Listo para Entrega', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  [ORDER_STATUS.COMPLETED]: { label: 'Entregado', color: '#9eb3c2', bg: 'rgba(158, 179, 194, 0.15)' },
  [ORDER_STATUS.CANCELLED]: { label: 'Cancelado', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
};

const INITIAL_SEED_ORDERS = [
  {
    id: 'KL-00042',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    customer: {
      name: 'Rodrigo Méndez',
      company: 'Café San Cristóbal',
      phone: '+502 5555-1234',
      nit: '7845129-4',
      address: 'San Cristóbal, Zona 8 de Mixco',
      email: 'rodrigo@cafesancristobal.gt',
    },
    items: [
      {
        title: 'Logo Tazas 5 × 5 cm',
        widthCm: 5,
        heightCm: 5,
        qty: 150,
        actualLinearMeters: 1.58,
        stickersPerRow: 5,
        rows: 30,
        includeCutting: true,
        cuttingRateUnit: 0.30,
        finishType: 'Barniz con Relieve 3D',
        fileInfo: { name: 'logo_cafe_300dpi.png', sizeFormatted: '2.4 MB' },
      }
    ],
    metrics: {
      totalBillableMeters: 1.58,
      tierRate: 115.0,
      materialTotalQ: 181.70,
      cuttingTotalQ: 45.0,
      grandTotalQ: 226.70,
      hasCutting: true,
    },
    productionStatus: ORDER_STATUS.IN_AUDLEY_QUEUE,
    paymentStatus: PAYMENT_STATUS.PAID,
    paymentMethod: 'TRANSFER',
    workshopNotes: 'Prioridad alta, entrega por la tarde. Verificar registro de barniz UV.',
  },
  {
    id: 'KL-00041',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    customer: {
      name: 'Alejandro Morales',
      company: 'Barbería Vintage',
      phone: '+502 5111-2233',
      nit: 'CF',
      address: 'Zona 1, Centro Histórico',
      email: 'contacto@barberiavintage.com',
    },
    items: [
      {
        title: 'Logos Espejo 8 × 5 cm',
        widthCm: 8,
        heightCm: 5,
        qty: 80,
        actualLinearMeters: 3.20,
        stickersPerRow: 3,
        rows: 27,
        includeCutting: true,
        cuttingRateUnit: 0.30,
        finishType: 'Barniz con Relieve 3D',
        fileInfo: { name: 'vintage_barber.pdf', sizeFormatted: '4.8 MB' },
      }
    ],
    metrics: {
      totalBillableMeters: 3.20,
      tierRate: 115.0,
      materialTotalQ: 368.0,
      cuttingTotalQ: 25.0, // Mínimo de corte
      grandTotalQ: 393.0,
      hasCutting: true,
    },
    productionStatus: ORDER_STATUS.PRINTING,
    paymentStatus: PAYMENT_STATUS.PARTIAL,
    paymentMethod: 'TRANSFER',
    workshopNotes: 'Anticipo de Q200.00 recibido por transferencia. Saldo contraentrega.',
  },
  {
    id: 'KL-00040',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    customer: {
      name: 'Claudia Estrada',
      company: 'Sport Gym GT',
      phone: '+502 5999-8877',
      nit: '1029384-5',
      address: 'Carretera a El Salvador, Km 14',
      email: 'gerencia@sportgym.gt',
    },
    items: [
      {
        title: 'Termos Deportivos 10 × 10 cm',
        widthCm: 10,
        heightCm: 10,
        qty: 50,
        actualLinearMeters: 2.50,
        stickersPerRow: 2,
        rows: 25,
        includeCutting: false,
        cuttingRateUnit: 0,
        finishType: 'Barniz Brillante',
        fileInfo: { name: 'sportgym_vector.ai', sizeFormatted: '1.8 MB' },
      }
    ],
    metrics: {
      totalBillableMeters: 2.50,
      tierRate: 115.0,
      materialTotalQ: 287.50,
      cuttingTotalQ: 0.0,
      grandTotalQ: 287.50,
      hasCutting: false,
    },
    productionStatus: ORDER_STATUS.READY_FOR_DELIVERY,
    paymentStatus: PAYMENT_STATUS.PAID,
    paymentMethod: 'TRANSFER',
    workshopNotes: 'Empacado en tubo rígido continuo. Listo para mensajero.',
  },
  {
    id: 'KL-00039',
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    customer: {
      name: 'Mario Gómez',
      company: 'Restaurante Los Almendros',
      phone: '+502 5222-3344',
      nit: '4455667-8',
      address: 'Zona 4, 4 Grados Norte',
      email: 'compras@losalmendros.gt',
    },
    items: [
      {
        title: 'Señalización Acrílicos 12 × 8 cm',
        widthCm: 12,
        heightCm: 8,
        qty: 40,
        actualLinearMeters: 1.66,
        stickersPerRow: 2,
        rows: 20,
        includeCutting: true,
        cuttingRateUnit: 0.35,
        finishType: 'Sin Barniz (Mate)',
        fileInfo: { name: 'almendros_logos.png', sizeFormatted: '3.1 MB' },
      }
    ],
    metrics: {
      totalBillableMeters: 1.66,
      tierRate: 115.0,
      materialTotalQ: 190.90,
      cuttingTotalQ: 25.0,
      grandTotalQ: 215.90,
      hasCutting: true,
    },
    productionStatus: ORDER_STATUS.COMPLETED,
    paymentStatus: PAYMENT_STATUS.PAID,
    paymentMethod: 'TRANSFER',
    workshopNotes: 'Entregado y recibido a conformidad.',
  },
];

class OrdersStore {
  constructor() {
    this.listeners = new Set();
    this.orders = this._loadOrders();
  }

  _loadOrders() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY_ORDERS);
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.warn('Error al leer pedidos de localStorage', e);
      }
    }
    return JSON.parse(JSON.stringify(INITIAL_SEED_ORDERS));
  }

  _saveOrders() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(this.orders));
      } catch (e) {
        console.warn('Error al guardar pedidos en localStorage', e);
      }
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  _notify() {
    this._saveOrders();
    this.listeners.forEach(fn => {
      try {
        fn(this.orders);
      } catch (err) {
        console.error('Error en listener de ordersStore:', err);
      }
    });
  }

  getOrders() {
    return this.orders;
  }

  getOrderById(id) {
    return this.orders.find(o => o.id === id) || null;
  }

  createOrder({ customer = {}, cartTotals = {}, items = [], workshopNotes = '' }) {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    const newId = `KL-${randomNum}`;

    const newOrder = {
      id: newId,
      createdAt: new Date().toISOString(),
      customer: {
        name: customer.name || 'Cliente Mostrador',
        company: customer.company || '',
        phone: customer.phone || '+502 5555-0000',
        nit: customer.nit || 'CF',
        address: customer.address || 'Ciudad de Guatemala',
        email: customer.email || '',
      },
      items: items.map((it, idx) => ({
        title: it.title || `Diseño #${idx + 1}`,
        widthCm: parseFloat(it.widthCm) || 5,
        heightCm: parseFloat(it.heightCm) || 5,
        qty: parseInt(it.qty, 10) || 50,
        actualLinearMeters: parseFloat(it.actualLinearMeters) || 1.0,
        stickersPerRow: it.stickersPerRow || 5,
        rows: it.rows || 10,
        includeCutting: Boolean(it.includeCutting),
        cuttingRateUnit: it.cuttingRateUnit || 0,
        finishType: it.finishType || 'Barniz con Relieve 3D',
        fileInfo: it.fileInfo || null,
        previewUrl: it.previewUrl || null,
      })),
      metrics: {
        totalBillableMeters: parseFloat(cartTotals.totalBillableMeters) || 1.0,
        tierRate: parseFloat(cartTotals.tierRate) || 140.0,
        materialTotalQ: parseFloat(cartTotals.materialTotalQ) || 140.0,
        cuttingTotalQ: parseFloat(cartTotals.cuttingTotalQ) || 0.0,
        grandTotalQ: parseFloat(cartTotals.grandTotalQ) || 140.0,
        hasCutting: Boolean(cartTotals.hasCutting),
      },
      productionStatus: ORDER_STATUS.IN_AUDLEY_QUEUE,
      paymentStatus: PAYMENT_STATUS.PENDING,
      paymentMethod: 'TRANSFER',
      workshopNotes: workshopNotes || customer.notes || '',
    };

    this.orders.unshift(newOrder);
    this._notify();
    return newOrder;
  }

  updateProductionStatus(orderId, newStatus) {
    const order = this.getOrderById(orderId);
    if (!order) return false;

    order.productionStatus = newStatus;
    order.updatedAt = new Date().toISOString();
    this._notify();
    return true;
  }

  updatePaymentStatus(orderId, newPaymentStatus) {
    const order = this.getOrderById(orderId);
    if (!order) return false;

    order.paymentStatus = newPaymentStatus;
    order.updatedAt = new Date().toISOString();
    this._notify();
    return true;
  }

  deleteOrder(orderId) {
    const index = this.orders.findIndex(o => o.id === orderId);
    if (index === -1) return false;

    this.orders.splice(index, 1);
    this._notify();
    return true;
  }

  getSummaryMetrics() {
    const activeOrders = this.orders.filter(
      o => o.productionStatus !== ORDER_STATUS.COMPLETED && o.productionStatus !== ORDER_STATUS.CANCELLED
    );

    const activeMeters = activeOrders.reduce(
      (sum, o) => sum + o.metrics.totalBillableMeters, 0
    );

    const totalRevenueQ = this.orders.reduce(
      (sum, o) => sum + o.metrics.grandTotalQ, 0
    );

    const pendingPaymentQ = this.orders
      .filter(o => o.paymentStatus === PAYMENT_STATUS.PENDING)
      .reduce((sum, o) => sum + o.metrics.grandTotalQ, 0);

    return {
      totalOrdersCount: this.orders.length,
      activeOrdersCount: activeOrders.length,
      activeMeters,
      totalRevenueQ,
      pendingPaymentQ,
    };
  }

  resetToInitial() {
    this.orders = JSON.parse(JSON.stringify(INITIAL_SEED_ORDERS));
    this._notify();
  }
}

export const ordersStore = new OrdersStore();
