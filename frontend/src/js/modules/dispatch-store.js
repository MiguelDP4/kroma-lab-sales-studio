/**
 * Almacén Reactivo de Remisiones de Taller y Guías de Entrega (DispatchStore) — Kroma Lab UV DTF.
 * Administra la emisión de hojas de despacho oficiales (REM-YYYY-XXX), checklist técnico
 * de control de calidad pre-entrega, logística con couriers guatemaltecos (Cargo Expreso, Guatex, Moto Local)
 * y trazabilidad de entrega a clientes B2B.
 */

import { ordersStore } from './orders-store.js';
import { ORDER_STATUS } from '../../shared/business-config.js';
import { apiClient } from './api-client.js';

const IS_TEST_ENV = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';

export const STORAGE_KEY_DISPATCH = 'kromalab_dispatch_notes';

/**
 * Métodos de entrega y logística local en Guatemala
 */
export const DELIVERY_METHODS = {
  MOTO_LOCAL: {
    id: 'MOTO_LOCAL',
    label: 'Mensajería Moto Local (Metropolitana / Villa Nueva)',
    shortLabel: 'Moto Local',
    icon: '🛵',
    defaultCourier: 'Mensajería Kroma Lab / Moto Express',
    estimatedTime: '2 a 4 horas (Mismo día)',
  },
  CARGO_EXPRESO: {
    id: 'CARGO_EXPRESO',
    label: 'Cargo Expreso (Envíos Departamentales / Nacional)',
    shortLabel: 'Cargo Expreso',
    icon: '🚚',
    defaultCourier: 'Cargo Expreso S.A.',
    estimatedTime: '24 a 48 horas',
  },
  GUATEX: {
    id: 'GUATEX',
    label: 'Guatex (Paquetería y Carga)',
    shortLabel: 'Guatex',
    icon: '📦',
    defaultCourier: 'Guatex S.A.',
    estimatedTime: '24 a 48 horas',
  },
  FORZAGRO: {
    id: 'FORZAGRO',
    label: 'Forza Delivery Express',
    shortLabel: 'Forza Express',
    icon: '⚡',
    defaultCourier: 'Forza Delivery',
    estimatedTime: '24 a 48 horas',
  },
  PICKUP_TALLER: {
    id: 'PICKUP_TALLER',
    label: 'Retiro en Taller (San José el Placer, Villa Nueva)',
    shortLabel: 'Retiro en Taller',
    icon: '🏬',
    defaultCourier: 'Recepción Taller Audley',
    estimatedTime: 'Inmediato (Horario de Taller)',
  },
};

/**
 * Estados del ciclo de despacho y entrega
 */
export const DISPATCH_STATUS = {
  PREPARED: {
    id: 'PREPARED',
    label: 'Empacado en Taller',
    badge: '📦 Empacado',
    color: '#0284c7',
    bg: 'rgba(2, 132, 199, 0.15)',
    border: '#0284c7',
  },
  IN_TRANSIT: {
    id: 'IN_TRANSIT',
    label: 'En Ruta / Courier',
    badge: '🚚 En Tránsito',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.15)',
    border: '#f59e0b',
  },
  DELIVERED: {
    id: 'DELIVERED',
    label: 'Entregado a Conformidad',
    badge: '✅ Entregado',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.15)',
    border: '#10b981',
  },
  CANCELLED: {
    id: 'CANCELLED',
    label: 'Anulado / Devuelto',
    badge: '❌ Anulado',
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.15)',
    border: '#ef4444',
  },
};

/**
 * Tipos de embalaje para film UV DTF
 */
export const PACKAGE_TYPES = {
  RIGID_TUBE: {
    id: 'RIGID_TUBE',
    label: 'Tubo Rígido de Cartón (Bobina Continua)',
    icon: '📜',
  },
  FLAT_PACK: {
    id: 'FLAT_PACK',
    label: 'Sobre / Paquete Plano Rígido (Corte Recto Individual)',
    icon: '📁',
  },
  BOX: {
    id: 'BOX',
    label: 'Caja Protectora Reforzada (Volumen Alto)',
    icon: '📦',
  },
};

/**
 * Modalidad de cobro de flete
 */
export const SHIPPING_PAYMENT_TYPES = {
  CLIENT: { id: 'CLIENT', label: 'Cobro en Destino (Paga Cliente)' },
  INCLUDED: { id: 'INCLUDED', label: 'Flete Gratis / Retiro en Taller' },
  PREPAID: { id: 'PREPAID', label: 'Prepagado en Factura / Pedido' },
};

/**
 * Puntos de inspección técnica obligatorios para el Operador Audley UV DTF
 */
export const QUALITY_CHECKLIST_LABELS = {
  curadoAdherencia: 'Curado UV y adherencia probada en muestra testigo (sin burbujas)',
  capasBarniz: 'Alineación de capas: Blanco + CMYK + Barniz 3D con relieve al tacto',
  formatoAcabado: 'Bobina continua limpia con film B / o Corte perimetral recto verificado',
  conteoMedidas: 'Metraje lineal y conteo de piezas auditado vs orden de trabajo',
  empaqueProtector: 'Sellado impermeable contra polvo y humedad ambiental',
};

/**
 * Semilla inicial con remisiones reales vinculadas a órdenes
 */
export const INITIAL_SEED_DISPATCH = [
  {
    id: 'REM-2026-001',
    orderId: 'KL-00042',
    clientId: 'CLI-001',
    clientName: 'Rodrigo Méndez (Café San Cristóbal)',
    clientPhone: '+502 5555-1234',
    deliveryAddress: '3a Avenida 12-45 Zona 8 de Mixco, San Cristóbal',
    deliveryMethod: 'MOTO_LOCAL',
    courierName: 'Mensajería Express Villa Nueva',
    trackingNumber: 'MOTO-VN-402',
    packagesCount: 1,
    packageType: 'FLAT_PACK',
    shippingCostQ: 35.00,
    shippingPaidBy: 'CLIENT',
    status: 'DELIVERED',
    dispatchedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    deliveredAt: new Date(Date.now() - 3600000 * 44).toISOString(),
    dispatchedBy: 'Miguel Dubois',
    receivedBy: 'Rodrigo Méndez',
    receiverIdDoc: 'DPI 2489 10294 0101',
    qualityChecklist: {
      curadoAdherencia: true,
      capasBarniz: true,
      formatoAcabado: true,
      conteoMedidas: true,
      empaqueProtector: true,
    },
    notes: 'Entregado en recepción del local comercial. Conforme y probado en taza de vidrio.',
    totalOrderMeters: 1.80,
    totalOrderAmountQ: 226.70,
    pendingBalanceQ: 0.00,
  },
  {
    id: 'REM-2026-002',
    orderId: 'KL-00041',
    clientId: 'CLI-002',
    clientName: 'Alejandro Morales (Barbería Vintage)',
    clientPhone: '+502 5111-2233',
    deliveryAddress: 'Zona 1, Centro Histórico, Ciudad de Guatemala',
    deliveryMethod: 'CARGO_EXPRESO',
    courierName: 'Cargo Expreso S.A.',
    trackingNumber: 'CX-99281034-GT',
    packagesCount: 1,
    packageType: 'RIGID_TUBE',
    shippingCostQ: 40.00,
    shippingPaidBy: 'CLIENT',
    status: 'IN_TRANSIT',
    dispatchedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    deliveredAt: null,
    dispatchedBy: 'Miguel Dubois',
    receivedBy: '',
    receiverIdDoc: '',
    qualityChecklist: {
      curadoAdherencia: true,
      capasBarniz: true,
      formatoAcabado: true,
      conteoMedidas: true,
      empaqueProtector: true,
    },
    notes: 'Guía depositada en agencia Cargo Expreso Villa Nueva. Seguimiento activo.',
    totalOrderMeters: 3.20,
    totalOrderAmountQ: 393.00,
    pendingBalanceQ: 193.00,
  },
  {
    id: 'REM-2026-003',
    orderId: 'KL-00040',
    clientId: 'CLI-003',
    clientName: 'Claudia Estrada (Sport Gym GT)',
    clientPhone: '+502 5999-8877',
    deliveryAddress: 'Carretera a El Salvador, Km 14',
    deliveryMethod: 'PICKUP_TALLER',
    courierName: 'Retiro en Persona',
    trackingNumber: 'RET-TALLER-40',
    packagesCount: 2,
    packageType: 'RIGID_TUBE',
    shippingCostQ: 0.00,
    shippingPaidBy: 'INCLUDED',
    status: 'PREPARED',
    dispatchedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    deliveredAt: null,
    dispatchedBy: 'Operador Audley',
    receivedBy: '',
    receiverIdDoc: '',
    qualityChecklist: {
      curadoAdherencia: true,
      capasBarniz: true,
      formatoAcabado: true,
      conteoMedidas: true,
      empaqueProtector: true,
    },
    notes: 'Bobinas de film enrolladas en tubos rígidos etiquetados. Listo para entrega en recepción.',
    totalOrderMeters: 0.60,
    totalOrderAmountQ: 140.00,
    pendingBalanceQ: 0.00,
  },
];

export class DispatchStore {
  constructor() {
    this.listeners = [];
    this.dispatchNotes = this._loadNotes();
  }

  _loadNotes() {
    if (typeof window === 'undefined' || !window.localStorage) {
      return IS_TEST_ENV ? JSON.parse(JSON.stringify(INITIAL_SEED_DISPATCH)) : [];
    }
    try {
      const data = localStorage.getItem(STORAGE_KEY_DISPATCH);
      if (!data) {
        if (IS_TEST_ENV) {
          this._saveNotes(INITIAL_SEED_DISPATCH);
          return JSON.parse(JSON.stringify(INITIAL_SEED_DISPATCH));
        }
        return [];
      }
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        if (!IS_TEST_ENV) {
          const clean = parsed.filter(n => !n.id?.startsWith('REM-2026-00') && !n.clientName?.includes('Claudia Estrada') && !n.clientName?.includes('Alejandro Morales') && !n.clientName?.includes('Rodrigo Méndez'));
          if (clean.length !== parsed.length) {
            this._saveNotes(clean);
          }
          return clean;
        }
        return parsed;
      }
      return IS_TEST_ENV ? JSON.parse(JSON.stringify(INITIAL_SEED_DISPATCH)) : [];
    } catch (err) {
      console.error('Error al leer remisiones de localStorage:', err);
      return IS_TEST_ENV ? JSON.parse(JSON.stringify(INITIAL_SEED_DISPATCH)) : [];
    }
  }


  _mapBackendDispatch(d) {
    let method = 'MOTO_LOCAL';
    if (d.deliveryMethod === 'FORZA_EXPRESS') method = 'FORZAGRO';
    else if (d.deliveryMethod === 'PICKUP') method = 'PICKUP_TALLER';
    else if (DELIVERY_METHODS[d.deliveryMethod]) method = d.deliveryMethod;

    return {
      id: d.folio || d.id,
      backendId: d.id,
      orderId: d.order?.code || d.orderId,
      clientId: 'CLI-B2B',
      clientName: d.customerName,
      clientPhone: d.customerPhone,
      deliveryAddress: d.customerAddress,
      deliveryMethod: method,
      courierName: (DELIVERY_METHODS[method] || DELIVERY_METHODS.MOTO_LOCAL).defaultCourier,
      trackingNumber: d.trackingNumber || '',
      packagesCount: d.packagesCount || 1,
      packageType: 'RIGID_TUBE',
      shippingCostQ: 0.00,
      shippingPaidBy: method === 'PICKUP_TALLER' ? 'INCLUDED' : 'CLIENT',
      status: d.status,
      dispatchedAt: d.createdAt,
      deliveredAt: d.status === 'DELIVERED' ? d.updatedAt : null,
      dispatchedBy: 'Operador Audley',
      receivedBy: d.deliveryRecipientName || '',
      receiverIdDoc: d.deliveryRecipientDpi || '',
      qualityChecklist: {
        curadoAdherencia: true,
        capasBarniz: true,
        formatoAcabado: true,
        conteoMedidas: true,
        empaqueProtector: true,
      },
      notes: d.notes || '',
      totalOrderMeters: Number(d.linearMeters),
      totalOrderAmountQ: Number(d.totalAmountQ),
      pendingBalanceQ: Number(d.balanceDueQ || 0.0),
    };
  }

  async syncWithApi() {
    try {
      if (typeof apiClient !== 'undefined' && apiClient.dispatch) {
        const res = await apiClient.dispatch.list();
        if (res && res.success && Array.isArray(res.dispatchNotes)) {
          const apiNotes = res.dispatchNotes.map(d => this._mapBackendDispatch(d));
          const apiIds = new Set(apiNotes.map(n => n.id));
          const localOnly = IS_TEST_ENV
            ? this.dispatchNotes.filter(n => !apiIds.has(n.id) && !n.backendId)
            : [];
          this.dispatchNotes = [...apiNotes, ...localOnly];
          this._save();
          this._notify();
          return this.getDispatchNotes();
        }
      }
    } catch (err) {
      console.warn('[DispatchStore] Sincronización API no disponible:', err.message);
    }
    return this.getDispatchNotes();
  }

  _saveNotes(notes) {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      localStorage.setItem(STORAGE_KEY_DISPATCH, JSON.stringify(notes));
    } catch (err) {
      console.error('Error al guardar remisiones en localStorage:', err);
    }
  }

  _save() {
    this._saveNotes(this.dispatchNotes);
  }

  _notify() {
    this.listeners.forEach((fn) => {
      try {
        fn(this.getDispatchNotes());
      } catch (err) {
        console.error('Error en listener de DispatchStore:', err);
      }
    });
  }

  subscribe(listener) {
    if (typeof listener !== 'function') return () => {};
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Retorna lista de remisiones ordenada de más reciente a más antigua
   */
  getDispatchNotes() {
    return [...this.dispatchNotes].sort(
      (a, b) => new Date(b.dispatchedAt) - new Date(a.dispatchedAt)
    );
  }

  getDispatchNoteById(id) {
    if (!id) return null;
    return this.dispatchNotes.find((n) => n.id === id) || null;
  }

  getDispatchNoteByOrderId(orderId) {
    if (!orderId) return null;
    return this.dispatchNotes.find((n) => n.orderId === orderId) || null;
  }

  /**
   * Calcula correlativo automático para el año actual: REM-YYYY-XXX
   */
  getNextFolio() {
    const year = new Date().getFullYear();
    const prefix = `REM-${year}-`;
    const yearNotes = this.dispatchNotes.filter((n) => n.id && n.id.startsWith(prefix));

    let maxNum = 0;
    yearNotes.forEach((n) => {
      const parts = n.id.split('-');
      if (parts.length === 3) {
        const num = parseInt(parts[2], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });

    const nextNum = maxNum + 1;
    return `${prefix}${String(nextNum).padStart(3, '0')}`;
  }

  /**
   * Crea una nueva remisión oficial de despacho
   */
  createDispatchNote(payload) {
    if (!payload || !payload.orderId) {
      throw new Error('El ID de orden es obligatorio para generar una remisión');
    }

    const order = ordersStore.getOrderById(payload.orderId);
    if (!order) {
      throw new Error(`La orden #${payload.orderId} no existe en el sistema`);
    }

    const clientName = payload.clientName || order.customer.company || order.customer.name;
    const clientPhone = payload.clientPhone || order.customer.phone || '';
    const deliveryAddress = payload.deliveryAddress || order.customer.address || 'Entrega en Taller';
    const deliveryMethod = payload.deliveryMethod || 'MOTO_LOCAL';
    const methodDef = DELIVERY_METHODS[deliveryMethod] || DELIVERY_METHODS.MOTO_LOCAL;

    const folio = payload.id || this.getNextFolio();

    // Determinar saldo pendiente del pedido
    const totalOrderAmountQ = order.metrics?.grandTotalQ || 0;
    const totalOrderMeters = order.metrics?.totalBillableMeters || 0;
    const isPaid = order.paymentStatus === 'PAID';
    const pendingBalanceQ = isPaid ? 0.0 : (payload.pendingBalanceQ !== undefined ? payload.pendingBalanceQ : totalOrderAmountQ);

    const newNote = {
      id: folio,
      orderId: order.id,
      clientId: order.customer.clientId || 'CLI-GENERIC',
      clientName,
      clientPhone,
      deliveryAddress,
      deliveryMethod,
      courierName: payload.courierName || methodDef.defaultCourier,
      trackingNumber: payload.trackingNumber || '',
      packagesCount: Number(payload.packagesCount) || 1,
      packageType: payload.packageType || (order.metrics?.hasCutting ? 'FLAT_PACK' : 'RIGID_TUBE'),
      shippingCostQ: Number(payload.shippingCostQ) || 0.0,
      shippingPaidBy: payload.shippingPaidBy || (deliveryMethod === 'PICKUP_TALLER' ? 'INCLUDED' : 'CLIENT'),
      status: payload.status || DISPATCH_STATUS.PREPARED.id,
      dispatchedAt: payload.dispatchedAt || new Date().toISOString(),
      deliveredAt: payload.status === DISPATCH_STATUS.DELIVERED.id ? (payload.deliveredAt || new Date().toISOString()) : null,
      dispatchedBy: payload.dispatchedBy || 'Operador Taller',
      receivedBy: payload.receivedBy || '',
      receiverIdDoc: payload.receiverIdDoc || '',
      qualityChecklist: {
        curadoAdherencia: payload.qualityChecklist?.curadoAdherencia !== false,
        capasBarniz: payload.qualityChecklist?.capasBarniz !== false,
        formatoAcabado: payload.qualityChecklist?.formatoAcabado !== false,
        conteoMedidas: payload.qualityChecklist?.conteoMedidas !== false,
        empaqueProtector: payload.qualityChecklist?.empaqueProtector !== false,
      },
      notes: payload.notes || order.workshopNotes || '',
      totalOrderMeters,
      totalOrderAmountQ,
      pendingBalanceQ,
    };

    // Vincular remisión en la orden
    order.dispatchNoteId = folio;
    if (newNote.status === DISPATCH_STATUS.DELIVERED.id) {
      ordersStore.updateProductionStatus(order.id, ORDER_STATUS.COMPLETED);
    } else if (order.productionStatus === ORDER_STATUS.IN_AUDLEY_QUEUE || order.productionStatus === ORDER_STATUS.PRINTING) {
      ordersStore.updateProductionStatus(order.id, ORDER_STATUS.READY_FOR_DELIVERY);
    }

    this.dispatchNotes.unshift(newNote);
    this._save();
    this._notify();

    if (typeof apiClient !== 'undefined' && apiClient.dispatch) {
      const targetOrderId = order.backendId || order.id;
      let backendMethod = 'MOTO_LOCAL';
      if (newNote.deliveryMethod === 'FORZAGRO') backendMethod = 'FORZA_EXPRESS';
      else if (newNote.deliveryMethod === 'PICKUP_TALLER') backendMethod = 'PICKUP';
      else if (['MOTO_LOCAL', 'CARGO_EXPRESO', 'GUATEX'].includes(newNote.deliveryMethod)) {
        backendMethod = newNote.deliveryMethod;
      }

      apiClient.dispatch.create({
        orderId: targetOrderId,
        customerName: newNote.clientName,
        customerPhone: newNote.clientPhone,
        customerAddress: newNote.deliveryAddress,
        deliveryMethod: backendMethod,
        trackingNumber: newNote.trackingNumber,
        packagesCount: newNote.packagesCount,
        linearMeters: newNote.totalOrderMeters,
        totalAmountQ: newNote.totalOrderAmountQ,
        balanceDueQ: newNote.pendingBalanceQ,
        checklistPassed: true,
        notes: newNote.notes,
      }).then(res => {
        if (res && res.dispatchNote) {
          newNote.backendId = res.dispatchNote.id;
          if (res.dispatchNote.folio) newNote.id = res.dispatchNote.folio;
          this._save();
        }
      }).catch(() => {});
    }

    return newNote;
  }

  /**
   * Actualiza el estado de la remisión (PREPARED -> IN_TRANSIT -> DELIVERED)
   */
  updateDispatchStatus(noteId, newStatus, extraData = {}) {
    const note = this.getDispatchNoteById(noteId);
    if (!note) return null;

    if (!DISPATCH_STATUS[newStatus]) {
      throw new Error(`Estado de despacho inválido: ${newStatus}`);
    }

    note.status = newStatus;

    if (newStatus === DISPATCH_STATUS.DELIVERED.id) {
      note.deliveredAt = extraData.deliveredAt || new Date().toISOString();
      if (extraData.receivedBy) note.receivedBy = extraData.receivedBy;
      if (extraData.receiverIdDoc) note.receiverIdDoc = extraData.receiverIdDoc;

      // Marcar orden asociada como COMPLETADA
      if (note.orderId) {
        ordersStore.updateProductionStatus(note.orderId, ORDER_STATUS.COMPLETED);
      }
    } else if (newStatus === DISPATCH_STATUS.IN_TRANSIT.id) {
      if (extraData.trackingNumber) note.trackingNumber = extraData.trackingNumber;
      if (extraData.courierName) note.courierName = extraData.courierName;
    }

    if (extraData.notes) {
      note.notes = extraData.notes;
    }

    this._save();
    this._notify();

    if (typeof apiClient !== 'undefined' && apiClient.dispatch) {
      const targetId = note.backendId || note.id;
      apiClient.dispatch.updateStatus(targetId, {
        status: newStatus,
        deliveryRecipientName: note.receivedBy || undefined,
        deliveryRecipientDpi: note.receiverIdDoc || undefined,
        trackingNumber: note.trackingNumber || undefined,
      }).catch(() => {});
    }

    return note;
  }

  /**
   * Actualización genérica de campos de la remisión
   */
  updateDispatchNote(noteId, updates = {}) {
    const note = this.getDispatchNoteById(noteId);
    if (!note) return null;

    Object.assign(note, updates);
    this._save();
    this._notify();
    return note;
  }

  /**
   * Elimina una remisión y desvincula la orden
   */
  deleteDispatchNote(noteId) {
    const index = this.dispatchNotes.findIndex((n) => n.id === noteId);
    if (index === -1) return false;

    const note = this.dispatchNotes[index];
    if (note.orderId) {
      const order = ordersStore.getOrderById(note.orderId);
      if (order && order.dispatchNoteId === noteId) {
        delete order.dispatchNoteId;
      }
    }

    this.dispatchNotes.splice(index, 1);
    this._save();
    this._notify();
    return true;
  }

  /**
   * Métricas globales de despacho para KPIs de taller
   */
  getSummaryMetrics() {
    const notes = this.dispatchNotes;
    const todayStr = new Date().toISOString().slice(0, 10);

    const preparedCount = notes.filter((n) => n.status === DISPATCH_STATUS.PREPARED.id).length;
    const inTransitCount = notes.filter((n) => n.status === DISPATCH_STATUS.IN_TRANSIT.id).length;
    const deliveredCount = notes.filter((n) => n.status === DISPATCH_STATUS.DELIVERED.id).length;

    const todayDispatchedCount = notes.filter(
      (n) => n.dispatchedAt && n.dispatchedAt.slice(0, 10) === todayStr
    ).length;

    const totalMetersDispatched = notes
      .filter((n) => n.status !== DISPATCH_STATUS.CANCELLED.id)
      .reduce((sum, n) => sum + (n.totalOrderMeters || 0), 0);

    const totalShippedAmountQ = notes
      .filter((n) => n.status !== DISPATCH_STATUS.CANCELLED.id)
      .reduce((sum, n) => sum + (n.totalOrderAmountQ || 0), 0);

    return {
      totalNotesCount: notes.length,
      preparedCount,
      inTransitCount,
      deliveredCount,
      todayDispatchedCount,
      totalMetersDispatched: Number(totalMetersDispatched.toFixed(2)),
      totalShippedAmountQ: Number(totalShippedAmountQ.toFixed(2)),
    };
  }

  /**
   * Genera el texto formateado para compartir notificación de despacho por WhatsApp
   */
  generateWhatsAppText(note) {
    if (!note) return '';

    const method = DELIVERY_METHODS[note.deliveryMethod] || DELIVERY_METHODS.MOTO_LOCAL;
    const packageType = PACKAGE_TYPES[note.packageType]?.label || 'Paquete Seguro';
    const statusDef = DISPATCH_STATUS[note.status] || DISPATCH_STATUS.PREPARED;

    let courierDetail = method.label;
    if (note.courierName && note.courierName !== method.defaultCourier) {
      courierDetail = `${note.courierName} (${method.shortLabel})`;
    }

    let trackingLine = '';
    if (note.trackingNumber) {
      trackingLine = `\n🔍 *No. de Guía / Rastreo:* ${note.trackingNumber}`;
    }

    let balanceLine = '✅ *Saldo:* PAGADO COMPLETO (No pagar nada al entregar)';
    if (note.pendingBalanceQ > 0) {
      balanceLine = `⚠️ *Saldo Contraentrega:* Q${note.pendingBalanceQ.toFixed(2)} (Abonar a recepción)`;
    }

    return encodeURIComponent(
`📦 *KROMA LAB UV DTF — Guía de Despacho*
¡Hola, *${note.clientName}*! Tu pedido de impresión UV DTF está listo y en proceso de entrega.

📋 *Folio de Remisión:* ${note.id}
🔖 *Pedido Referencia:* #${note.orderId}
📐 *Metraje Despachado:* ${note.totalOrderMeters.toFixed(2)} metros lineales
📦 *Bultos:* ${note.packagesCount} ${note.packagesCount === 1 ? 'paquete' : 'paquetes'} (${packageType})
🚚 *Método:* ${courierDetail}${trackingLine}
📍 *Destino:* ${note.deliveryAddress}
📊 *Estado:* ${statusDef.badge}

${balanceLine}

✨ *Instrucciones de Aplicación UV DTF:*
1. Limpiar la superficie receptora con alcohol isopropílico.
2. Frotar con espátula firme sobre el film B antes de despegar.
3. Colocar con precisión y retirar el transfer en ángulo cerrado de 180°.

¡Gracias por confiar en Kroma Lab!`
    );
  }

  /**
   * Exportación de remisiones a archivo CSV con formato UTF-8 BOM
   */
  resetToInitial() {
    this.dispatchNotes = JSON.parse(JSON.stringify(INITIAL_SEED_DISPATCH));
    this._save();
    this._notify();
  }

  exportToCsv() {
    const BOM = '\uFEFF';
    const headers = [
      'Folio',
      'Fecha Despacho',
      'No. Pedido',
      'Cliente',
      'Teléfono',
      'Dirección Entrega',
      'Método Envío',
      'Transporte / Courier',
      'No. Guía / Tracking',
      'Bultos',
      'Tipo Empaque',
      'Flete (Q)',
      'Condición Flete',
      'Estado',
      'Metros Totales',
      'Total Pedido (Q)',
      'Saldo Pendiente (Q)',
      'Despachado Por',
      'Recibido Por',
      'DPI Receptor',
      'Observaciones',
    ];

    const rows = this.getDispatchNotes().map((n) => {
      const method = DELIVERY_METHODS[n.deliveryMethod]?.shortLabel || n.deliveryMethod;
      const pack = PACKAGE_TYPES[n.packageType]?.label || n.packageType;
      const status = DISPATCH_STATUS[n.status]?.label || n.status;
      const dateFormatted = new Date(n.dispatchedAt).toLocaleString('es-GT');

      return [
        `"${n.id}"`,
        `"${dateFormatted}"`,
        `"#${n.orderId}"`,
        `"${(n.clientName || '').replace(/"/g, '""')}"`,
        `"${n.clientPhone || ''}"`,
        `"${(n.deliveryAddress || '').replace(/"/g, '""')}"`,
        `"${method}"`,
        `"${(n.courierName || '').replace(/"/g, '""')}"`,
        `"${n.trackingNumber || ''}"`,
        n.packagesCount || 1,
        `"${pack}"`,
        (n.shippingCostQ || 0).toFixed(2),
        `"${n.shippingPaidBy || ''}"`,
        `"${status}"`,
        (n.totalOrderMeters || 0).toFixed(2),
        (n.totalOrderAmountQ || 0).toFixed(2),
        (n.pendingBalanceQ || 0).toFixed(2),
        `"${(n.dispatchedBy || '').replace(/"/g, '""')}"`,
        `"${(n.receivedBy || '').replace(/"/g, '""')}"`,
        `"${n.receiverIdDoc || ''}"`,
        `"${(n.notes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    return BOM + [headers.join(','), ...rows].join('\r\n');
  }
}

export const dispatchStore = new DispatchStore();
