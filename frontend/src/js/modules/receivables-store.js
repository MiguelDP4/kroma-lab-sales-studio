/**
 * Almacén Reactivo de Cuentas por Cobrar y Saldos B2B (ReceivablesStore) — Kroma Lab.
 * Administra el estado de cuenta por cliente, registro de abonos parciales o liquidaciones,
 * conciliación de transferencias bancarias locales y generación de recordatorios por WhatsApp.
 */

import { ordersStore, PAYMENT_STATUS } from './orders-store.js';
import { apiClient } from './api-client.js';

export const STORAGE_KEY_PAYMENTS = 'kromalab_payments';

export const PAYMENT_METHODS = {
  TRANSFER: { id: 'TRANSFER', label: 'Transferencia Bancaria', icon: '🏦' },
  CASH: { id: 'CASH', label: 'Efectivo en Taller', icon: '💵' },
  CARD: { id: 'CARD', label: 'Tarjeta Débito/Crédito (POS)', icon: '💳' },
  DEPOSIT: { id: 'DEPOSIT', label: 'Boleta de Depósito Bancario', icon: '📄' },
  CHECK: { id: 'CHECK', label: 'Cheque Compensable', icon: '📑' },
};

export const AGING_STATUS = {
  CURRENT: {
    id: 'CURRENT',
    label: 'Al Día (0-7 días)',
    badge: '🟢 Al Día',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.15)',
    border: '#10b981',
    maxDays: 7,
  },
  ATTENTION: {
    id: 'ATTENTION',
    label: 'Por Vencer (8-15 días)',
    badge: '🟡 8-15 días',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.15)',
    border: '#f59e0b',
    maxDays: 15,
  },
  OVERDUE: {
    id: 'OVERDUE',
    label: 'En Mora (> 15 días)',
    badge: '🔴 En Mora (>15d)',
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.15)',
    border: '#ef4444',
    maxDays: Infinity,
  },
};

export const BANK_ACCOUNTS_GT = [
  { bank: 'Banco Industrial', type: 'Monetaria GTQ', number: '144-002931-2', name: 'Kroma Lab / Miguel Dubois' },
  { bank: 'BAC Credomatic', type: 'Monetaria GTQ', number: '90-341902-1', name: 'Kroma Lab / Miguel Dubois' },
  { bank: 'Banrural', type: 'Monetaria GTQ', number: '3033-09182-1', name: 'Kroma Lab / Miguel Dubois' },
];

export const INITIAL_SEED_PAYMENTS = [
  {
    id: 'PAY-1001',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    orderId: 'KL-00042',
    clientId: 'CLI-001',
    clientName: 'Rodrigo Méndez (Café San Cristóbal)',
    clientPhone: '+502 5555-1234',
    amountQ: 226.70,
    method: 'TRANSFER',
    reference: 'BI-482910',
    notes: 'Liquidación total de pedido de logos para tazas',
    recordedBy: 'Miguel Dubois',
  },
  {
    id: 'PAY-1002',
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    orderId: 'KL-00041',
    clientId: 'CLI-002',
    clientName: 'Alejandro Morales (Barbería Vintage)',
    clientPhone: '+502 5111-2233',
    amountQ: 200.00,
    method: 'TRANSFER',
    reference: 'BAC-992144',
    notes: 'Anticipo inicial para corte y preparación de bobina',
    recordedBy: 'Miguel Dubois',
  },
  {
    id: 'PAY-1003',
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    orderId: 'KL-00040',
    clientId: null,
    clientName: 'Claudia Estrada (Sport Gym GT)',
    clientPhone: '+502 5999-8877',
    amountQ: 287.50,
    method: 'TRANSFER',
    reference: 'BI-331092',
    notes: 'Transferencia confirmada antes de despacho en tubo rígido',
    recordedBy: 'Miguel Dubois',
  },
  {
    id: 'PAY-1004',
    timestamp: new Date(Date.now() - 3600000 * 48).toISOString(),
    orderId: 'KL-00039',
    clientId: null,
    clientName: 'Mario Gómez (Restaurante Los Almendros)',
    clientPhone: '+502 5222-3344',
    amountQ: 215.90,
    method: 'CASH',
    reference: 'EFE-0039',
    notes: 'Pago en efectivo recibido al entregar en Zona 4',
    recordedBy: 'Miguel Dubois',
  },
];

export function calculateAging(orderCreatedAt) {
  const created = orderCreatedAt ? new Date(orderCreatedAt).getTime() : NaN;
  const now = Date.now();
  const diffDays = isNaN(created) ? 0 : Math.max(0, Math.floor((now - created) / (1000 * 60 * 60 * 24)));

  if (diffDays <= 7) return { days: diffDays, status: AGING_STATUS.CURRENT };
  if (diffDays <= 15) return { days: diffDays, status: AGING_STATUS.ATTENTION };
  return { days: diffDays, status: AGING_STATUS.OVERDUE };
}

class ReceivablesStore {
  constructor() {
    this.listeners = new Set();
    this.payments = this._loadPayments();
  }

  _loadPayments() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY_PAYMENTS);
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error('Error al leer pagos de localStorage:', e);
      }
    }
    return JSON.parse(JSON.stringify(INITIAL_SEED_PAYMENTS));
  }


  _mapBackendPayment(p) {
    return {
      id: p.paymentCode || p.id,
      backendId: p.id,
      timestamp: p.createdAt,
      orderId: p.order?.code || p.orderId,
      clientId: null,
      clientName: p.customerName || p.order?.customerName || 'Cliente B2B',
      clientPhone: p.order?.customerPhone || '',
      amountQ: Number(p.amountPaidQ),
      method: p.method || 'TRANSFER',
      reference: p.bankReference || p.reference || 'Sin referencia',
      notes: p.notes || '',
      recordedBy: p.registeredBy?.name || 'Operador de Taller',
    };
  }

  async syncWithApi() {
    try {
      if (typeof apiClient !== 'undefined' && apiClient.receivables) {
        const res = await apiClient.receivables.listPayments();
        if (res && res.success && Array.isArray(res.payments)) {
          if (res.payments.length > 0) {
            const apiPayments = res.payments.map(p => this._mapBackendPayment(p));
            const apiIds = new Set(apiPayments.map(p => p.id));
            const localOnly = this.payments.filter(p => !apiIds.has(p.id) && !p.backendId);
            this.payments = [...apiPayments, ...localOnly];
            this._savePayments();
            this._notify();
          }
          return this.payments;
        }
      }
    } catch (err) {
      console.warn('[ReceivablesStore] Sincronización API no disponible:', err.message);
    }
    return this.payments;
  }

  _savePayments() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY_PAYMENTS, JSON.stringify(this.payments));
      } catch (e) {
        console.error('Error al guardar pagos en localStorage:', e);
      }
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  _notify() {
    this._savePayments();
    this.listeners.forEach(fn => {
      try {
        fn(this.getReceivablesSummary());
      } catch (err) {
        console.error('Error en listener de receivablesStore:', err);
      }
    });
  }

  getPayments() {
    return [...this.payments].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  getPaymentById(id) {
    return this.payments.find(p => p.id === id) || null;
  }

  getPaymentsByOrder(orderId) {
    return this.payments.filter(p => p.orderId === orderId);
  }

  /**
   * Obtiene la relación de cobranza y estado de saldo para un pedido específico.
   */
  getOrderReceivableDetail(orderId) {
    const order = ordersStore.getOrderById(orderId);
    if (!order) return null;

    const payments = this.getPaymentsByOrder(orderId);
    const totalPaidQ = payments.reduce((sum, p) => sum + (parseFloat(p.amountQ) || 0), 0);
    const grandTotalQ = parseFloat(order.metrics?.grandTotalQ) || 0;
    const pendingBalanceQ = Math.max(0, Math.round((grandTotalQ - totalPaidQ + Number.EPSILON) * 100) / 100);

    let paymentStatus = PAYMENT_STATUS.PENDING;
    if (pendingBalanceQ <= 0.01 && totalPaidQ > 0) {
      paymentStatus = PAYMENT_STATUS.PAID;
    } else if (totalPaidQ > 0) {
      paymentStatus = PAYMENT_STATUS.PARTIAL;
    }

    const aging = calculateAging(order.createdAt);

    return {
      orderId: order.id,
      createdAt: order.createdAt,
      customer: order.customer || {},
      itemsSummary: (order.items || []).map(i => i.title).join(', ') || 'Impresión UV DTF',
      linearMeters: order.metrics?.totalBillableMeters || 0,
      grandTotalQ,
      totalPaidQ,
      pendingBalanceQ,
      paymentStatus,
      paymentsCount: payments.length,
      payments,
      agingDays: aging.days,
      agingStatus: aging.status,
      hasDebt: pendingBalanceQ > 0.01,
      isOverdue: aging.status.id === 'OVERDUE' && pendingBalanceQ > 0.01,
    };
  }

  /**
   * Obtiene todas las cuentas por cobrar integrando los pedidos en ordersStore con el histórico de pagos.
   */
  getAllReceivables({ status = 'ALL', search = '', aging = 'ALL' } = {}) {
    const allOrders = ordersStore.getOrders();
    const cleanSearch = (search || '').trim().toLowerCase();

    const receivables = allOrders.map(order => this.getOrderReceivableDetail(order.id)).filter(Boolean);

    return receivables.filter(item => {
      // Filtro de estado de pago
      if (status === 'DEBT_ONLY' && !item.hasDebt) return false;
      if (status === 'PAID' && item.hasDebt) return false;
      if (status === 'PENDING' && (item.totalPaidQ > 0 || !item.hasDebt)) return false;
      if (status === 'PARTIAL' && (item.totalPaidQ === 0 || !item.hasDebt)) return false;

      // Filtro de antigüedad
      if (aging !== 'ALL' && item.agingStatus.id !== aging) return false;

      // Filtro de búsqueda
      if (cleanSearch) {
        const orderIdMatch = item.orderId.toLowerCase().includes(cleanSearch);
        const nameMatch = (item.customer.name || '').toLowerCase().includes(cleanSearch);
        const companyMatch = (item.customer.company || '').toLowerCase().includes(cleanSearch);
        const cleanPhoneQuery = cleanSearch.replace(/\D/g, '');
        const phoneMatch = cleanPhoneQuery.length > 0 && (item.customer.phone || '').replace(/\D/g, '').includes(cleanPhoneQuery);
        const nitMatch = (item.customer.nit || '').toLowerCase().includes(cleanSearch);
        if (!orderIdMatch && !nameMatch && !companyMatch && !phoneMatch && !nitMatch) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Registra un abono o liquidación total a un pedido.
   */
  recordPayment({
    orderId,
    amountQ,
    method = 'TRANSFER',
    reference = '',
    notes = '',
    recordedBy = 'Miguel Dubois',
  }) {
    const order = ordersStore.getOrderById(orderId);
    if (!order) {
      throw new Error(`El pedido ${orderId} no existe.`);
    }

    const parsedAmount = Math.round((parseFloat(amountQ) + Number.EPSILON) * 100) / 100;
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new Error('El monto del abono debe ser mayor a Q0.00.');
    }

    const currentDetail = this.getOrderReceivableDetail(orderId);
    if (parsedAmount > currentDetail.pendingBalanceQ + 0.05) {
      throw new Error(
        `El monto ingresado (Q${parsedAmount.toFixed(2)}) excede el saldo pendiente (Q${currentDetail.pendingBalanceQ.toFixed(2)}).`
      );
    }

    const paymentId = `PAY-${Math.floor(1000 + Math.random() * 9000)}`;
    const newPayment = {
      id: paymentId,
      timestamp: new Date().toISOString(),
      orderId: order.id,
      clientId: order.customer?.clientId || null,
      clientName: order.customer?.company || order.customer?.name || 'Cliente B2B',
      clientPhone: order.customer?.phone || '',
      amountQ: parsedAmount,
      method: PAYMENT_METHODS[method] ? method : 'TRANSFER',
      reference: reference.trim() || 'Sin referencia',
      notes: notes.trim(),
      recordedBy: recordedBy || 'Operador de Taller',
    };

    this.payments.unshift(newPayment);

    // Recalcular saldo y sincronizar paymentStatus en ordersStore
    const updatedDetail = this.getOrderReceivableDetail(orderId);
    ordersStore.updatePaymentStatus(orderId, updatedDetail.paymentStatus);

    this._notify();

    if (typeof apiClient !== 'undefined' && apiClient.receivables) {
      const targetOrderId = order.backendId || order.id;
      apiClient.receivables.recordPayment({
        orderId: targetOrderId,
        amountPaidQ: parsedAmount,
        method: newPayment.method === 'CHEQUE' ? 'CHEQUE' : (newPayment.method || 'TRANSFER'),
        bankReference: newPayment.reference,
        notes: newPayment.notes,
      }).then(res => {
        if (res && res.payment) {
          newPayment.backendId = res.payment.id;
          if (res.payment.paymentCode) newPayment.id = res.payment.paymentCode;
          this._savePayments();
        }
      }).catch(() => {});
    }

    return {
      payment: newPayment,
      detail: updatedDetail,
    };
  }

  /**
   * Elimina un abono por error de digitación y recalcula el estado del pedido.
   */
  deletePayment(paymentId) {
    const index = this.payments.findIndex(p => p.id === paymentId);
    if (index === -1) return false;

    const removed = this.payments.splice(index, 1)[0];
    const updatedDetail = this.getOrderReceivableDetail(removed.orderId);
    if (updatedDetail) {
      ordersStore.updatePaymentStatus(removed.orderId, updatedDetail.paymentStatus);
    }

    this._notify();

    if (typeof apiClient !== 'undefined' && apiClient.receivables && removed.backendId) {
      apiClient.receivables.voidPayment(removed.backendId).catch(() => {});
    }

    return true;
  }

  /**
   * Resumen KPI consolidado de cartera y cobranza.
   */
  getReceivablesSummary() {
    const allReceivables = this.getAllReceivables({ status: 'ALL' });

    let totalReceivableQ = 0;
    let overdueDebtQ = 0;
    let overdueCount = 0;
    const clientsWithDebtSet = new Set();

    allReceivables.forEach(r => {
      if (r.hasDebt) {
        totalReceivableQ += r.pendingBalanceQ;
        const clientKey = r.customer?.clientId || r.customer?.phone || r.customer?.name || r.orderId;
        clientsWithDebtSet.add(clientKey);

        if (r.isOverdue) {
          overdueDebtQ += r.pendingBalanceQ;
          overdueCount += 1;
        }
      }
    });

    const totalCollectedQ = this.payments.reduce((sum, p) => sum + (parseFloat(p.amountQ) || 0), 0);
    const grandTotalInvoicedQ = totalCollectedQ + totalReceivableQ;
    const collectionRatePercent = grandTotalInvoicedQ > 0
      ? Math.round((totalCollectedQ / grandTotalInvoicedQ) * 100)
      : 100;

    return {
      totalReceivableQ: Math.round(totalReceivableQ * 100) / 100,
      totalCollectedQ: Math.round(totalCollectedQ * 100) / 100,
      clientsWithDebtCount: clientsWithDebtSet.size,
      overdueDebtQ: Math.round(overdueDebtQ * 100) / 100,
      overdueCount,
      collectionRatePercent,
      totalOrdersEvaluated: allReceivables.length,
      totalPaymentsCount: this.payments.length,
    };
  }

  /**
   * Genera el mensaje y la URL para recordatorio de cobro por WhatsApp adaptado a Guatemala.
   */
  generateWhatsAppReminder(orderId) {
    const detail = this.getOrderReceivableDetail(orderId);
    if (!detail) return null;

    const customer = detail.customer || {};
    const name = customer.name || customer.company || 'Estimado cliente';
    const cleanPhone = (customer.phone || '').replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('502') ? cleanPhone : `502${cleanPhone}`;

    const text = [
      `¡Hola *${name}*! Te saludamos de *Kroma Lab UV DTF* 🎨`,
      `Esperamos que te encuentres muy bien. Te compartimos el estado de cuenta correspondiente a tu pedido *#${detail.orderId}*:`,
      '',
      `📋 *Trabajo:* ${detail.itemsSummary}`,
      `📏 *Metraje:* ${detail.linearMeters.toFixed(2)} metros lineales`,
      `💰 *Total del pedido:* Q${detail.grandTotalQ.toFixed(2)}`,
      `✅ *Abonado a la fecha:* Q${detail.totalPaidQ.toFixed(2)}`,
      `⚠️ *Saldo pendiente:* Q${detail.pendingBalanceQ.toFixed(2)}`,
      '',
      'Para tu comodidad, puedes realizar tu transferencia a nuestras cuentas monetarias:',
      '🏦 *Banco Industrial:* 144-002931-2',
      '🏦 *BAC Credomatic:* 90-341902-1',
      'A nombre de: *Kroma Lab*',
      '',
      'Por favor envíanos la fotografía de la boleta o captura de pantalla al completar tu pago. ¡Muchas gracias por tu confianza!',
    ].join('\n');

    return {
      phone: phoneWithCountry,
      text,
      url: `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`,
    };
  }

  /**
   * Exporta la cartera completa de cuentas por cobrar a CSV (RFC 4180 con UTF-8 BOM).
   */
  exportReceivablesCSV() {
    const receivables = this.getAllReceivables({ status: 'ALL' });
    const BOM = '\uFEFF';

    const escapeCSV = val => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const toFixed2 = val => (Number(val) || 0).toFixed(2);

    const headers = [
      'No. Orden',
      'Fecha Emisión',
      'Cliente / Contacto',
      'Empresa',
      'Teléfono WhatsApp',
      'NIT',
      'Dirección',
      'Metros Bobina',
      'Total Facturado (Q)',
      'Total Cobrado (Q)',
      'Saldo Pendiente (Q)',
      'Estado de Pago',
      'Antigüedad (Días)',
      'Estado Antigüedad',
      'No. de Abonos',
    ];

    const rows = receivables.map(r => {
      const dateStr = (r.createdAt ? new Date(r.createdAt) : new Date()).toISOString().slice(0, 10);

      return [
        escapeCSV(r.orderId || ''),
        escapeCSV(dateStr),
        escapeCSV(r.customer?.name || ''),
        escapeCSV(r.customer?.company || ''),
        escapeCSV(r.customer?.phone || ''),
        escapeCSV(r.customer?.nit || 'CF'),
        escapeCSV(r.customer?.address || ''),
        escapeCSV(toFixed2(r.linearMeters)),
        escapeCSV(toFixed2(r.grandTotalQ)),
        escapeCSV(toFixed2(r.totalPaidQ)),
        escapeCSV(toFixed2(r.pendingBalanceQ)),
        escapeCSV(r.paymentStatus || 'PENDING'),
        escapeCSV(r.agingDays || 0),
        escapeCSV(r.agingStatus?.label || 'Al Día'),
        escapeCSV(r.paymentsCount || 0),
      ];
    });

    return BOM + [headers.join(','), ...rows.map(row => row.join(','))].join('\r\n');
  }

  resetToInitial() {
    this.payments = JSON.parse(JSON.stringify(INITIAL_SEED_PAYMENTS));
    this._savePayments();
    this._notify();
  }
}

export const receivablesStore = new ReceivablesStore();
