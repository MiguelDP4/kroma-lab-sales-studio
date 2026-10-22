import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DispatchStore,
  STORAGE_KEY_DISPATCH,
  DELIVERY_METHODS,
  DISPATCH_STATUS,
  PACKAGE_TYPES,
  INITIAL_SEED_DISPATCH,
} from '../src/js/modules/dispatch-store.js';
import { ordersStore } from '../src/js/modules/orders-store.js';
import { ORDER_STATUS } from '../src/shared/business-config.js';

describe('DispatchStore — Almacén de Remisiones y Guías de Entrega UV DTF', () => {
  let store;

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    store = new DispatchStore();
  });

  describe('Inicialización y Persistencia en localStorage', () => {
    it('carga las remisiones semilla iniciales si el almacenamiento está vacío', () => {
      const notes = store.getDispatchNotes();
      expect(notes.length).toBe(INITIAL_SEED_DISPATCH.length);
      expect(notes[0].id).toBe('REM-2026-003'); // Más reciente por fecha
    });

    it('maneja entorno sin window o sin localStorage retornando copias de semillas', () => {
      const origLocalStorage = window.localStorage;
      delete window.localStorage;

      const noStorageStore = new DispatchStore();
      expect(noStorageStore.getDispatchNotes().length).toBe(INITIAL_SEED_DISPATCH.length);

      expect(() => noStorageStore._saveNotes([])).not.toThrow();

      window.localStorage = origLocalStorage;
    });

    it('maneja datos corruptos en localStorage retornando las semillas iniciales sin explotar', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      localStorage.setItem(STORAGE_KEY_DISPATCH, 'INVALID_JSON_CORRUPT{{{');

      const corruptedStore = new DispatchStore();
      expect(corruptedStore.getDispatchNotes().length).toBe(INITIAL_SEED_DISPATCH.length);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('maneja fallos de cuota o escritura en localStorage silenciosamente', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceeded');
      });

      expect(() => {
        store._save();
      }).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('permite suscribirse y desuscribirse a cambios reactivos', () => {
      const listener = vi.fn();
      const unsubscribe = store.subscribe(listener);

      store._notify();
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      store._notify();
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('ignora suscripciones con tipos que no son funciones', () => {
      const unsub = store.subscribe(null);
      expect(typeof unsub).toBe('function');
      unsub();
    });

    it('atrapa errores lanzados por listeners sin romper el flujo de notificación', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const badListener = vi.fn(() => {
        throw new Error('Listener crash');
      });
      store.subscribe(badListener);

      expect(() => store._notify()).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('Consultas y Búsqueda de Remisiones', () => {
    it('obtiene una remisión por su ID', () => {
      const note = store.getDispatchNoteById('REM-2026-001');
      expect(note).toBeTruthy();
      expect(note.orderId).toBe('KL-00042');
      expect(note.clientName).toContain('Rodrigo Méndez');
    });

    it('retorna null al buscar un ID inexistente o nulo', () => {
      expect(store.getDispatchNoteById('REM-INEXISTENTE')).toBeNull();
      expect(store.getDispatchNoteById(null)).toBeNull();
    });

    it('obtiene una remisión vinculada por orderId', () => {
      const note = store.getDispatchNoteByOrderId('KL-00041');
      expect(note).toBeTruthy();
      expect(note.id).toBe('REM-2026-002');
    });

    it('retorna null al buscar por orderId inexistente o vacío', () => {
      expect(store.getDispatchNoteByOrderId('ORD-FAKE')).toBeNull();
      expect(store.getDispatchNoteByOrderId('')).toBeNull();
    });
  });

  describe('Generación de Correlativo (getNextFolio)', () => {
    it('calcula el correlativo siguiente correlativo para el año en curso', () => {
      const next = store.getNextFolio();
      const year = new Date().getFullYear();
      expect(next).toBe(`REM-${year}-004`);
    });

    it('comienza en 001 si no hay remisiones previas para el año actual', () => {
      store.dispatchNotes = [];
      const next = store.getNextFolio();
      const year = new Date().getFullYear();
      expect(next).toBe(`REM-${year}-001`);
    });

    it('ignora IDs con formato no estándar en getNextFolio', () => {
      store.dispatchNotes = [{ id: 'CUSTOM_ID_999' }];
      const next = store.getNextFolio();
      const year = new Date().getFullYear();
      expect(next).toBe(`REM-${year}-001`);
    });
  });

  describe('Creación de Remisiones (createDispatchNote)', () => {
    it('lanza error si no se proporciona orderId', () => {
      expect(() => {
        store.createDispatchNote({});
      }).toThrow('El ID de orden es obligatorio');
    });

    it('lanza error si la orden no existe en ordersStore', () => {
      expect(() => {
        store.createDispatchNote({ orderId: 'ORD-999999' });
      }).toThrow('no existe en el sistema');
    });

    it('crea una nueva remisión exitosamente para un pedido existente usando defaults', () => {
      const existingOrder = ordersStore.createOrder({
        customer: { name: 'Empresa Test', company: '', phone: '', address: '' },
        items: [{ title: 'Item Test', widthCm: 10, heightCm: 10, qty: 10, actualLinearMeters: 1.0 }],
        metrics: { grandTotalQ: 140.0, totalBillableMeters: 1.0, hasCutting: true },
      });

      // Creamos sin pasar nombre, fono, direccion ni deliveryMethod
      const note = store.createDispatchNote({
        orderId: existingOrder.id,
      });

      expect(note.id).toMatch(/^REM-\d{4}-\d{3}$/);
      expect(note.clientName).toBe('Empresa Test');
      expect(note.clientPhone).toBe('+502 5555-0000');
      expect(note.deliveryAddress).toBe('Ciudad de Guatemala');
      expect(note.deliveryMethod).toBe('MOTO_LOCAL');
      expect(note.packageType).toBe('RIGID_TUBE');
      expect(note.pendingBalanceQ).toBe(140.0);
    });

    it('asigna folio personalizado si se pasa explícitamente en el payload', () => {
      const order = ordersStore.getOrders()[0];
      const note = store.createDispatchNote({
        id: 'REM-CUSTOM-999',
        orderId: order.id,
      });
      expect(note.id).toBe('REM-CUSTOM-999');
    });

    it('establece el saldo pendiente en 0 si la orden está pagada (PAID)', () => {
      const order = ordersStore.getOrders().find((o) => o.paymentStatus === 'PAID') || ordersStore.getOrders()[0];
      const note = store.createDispatchNote({
        orderId: order.id,
        deliveryMethod: 'PICKUP_TALLER',
      });

      expect(note.pendingBalanceQ).toBe(0);
      expect(note.shippingPaidBy).toBe('INCLUDED');
    });

    it('permite sobreescribir el checklist de calidad', () => {
      const order = ordersStore.getOrders()[0];
      const note = store.createDispatchNote({
        orderId: order.id,
        qualityChecklist: {
          curadoAdherencia: true,
          capasBarniz: false,
          formatoAcabado: true,
          conteoMedidas: true,
          empaqueProtector: true,
        },
      });

      expect(note.qualityChecklist.capasBarniz).toBe(false);
      expect(note.qualityChecklist.curadoAdherencia).toBe(true);
    });

    it('marca la orden como COMPLETED si la remisión se crea con estado DELIVERED', () => {
      const order = ordersStore.getOrders()[0];
      const note = store.createDispatchNote({
        orderId: order.id,
        status: DISPATCH_STATUS.DELIVERED.id,
        receivedBy: 'Cliente Recepción',
      });

      expect(note.status).toBe(DISPATCH_STATUS.DELIVERED.id);
      const updatedOrder = ordersStore.getOrderById(order.id);
      expect(updatedOrder.productionStatus).toBe(ORDER_STATUS.COMPLETED);
    });
  });

  describe('Actualización de Estado de Despacho (updateDispatchStatus)', () => {
    it('retorna null si la remisión no existe', () => {
      expect(store.updateDispatchStatus('REM-FAKE', 'IN_TRANSIT')).toBeNull();
    });

    it('lanza error ante un estado inválido', () => {
      expect(() => {
        store.updateDispatchStatus('REM-2026-003', 'ESTADO_INVENTADO');
      }).toThrow('Estado de despacho inválido');
    });

    it('transiciona a IN_TRANSIT actualizando guía y transporte', () => {
      const note = store.updateDispatchStatus('REM-2026-003', DISPATCH_STATUS.IN_TRANSIT.id, {
        trackingNumber: 'TRACK-999-GT',
        courierName: 'Mensajero Juan Pérez',
        notes: 'Salió en ruta a las 10:30 AM',
      });

      expect(note.status).toBe(DISPATCH_STATUS.IN_TRANSIT.id);
      expect(note.trackingNumber).toBe('TRACK-999-GT');
      expect(note.courierName).toBe('Mensajero Juan Pérez');
      expect(note.notes).toBe('Salió en ruta a las 10:30 AM');
    });

    it('transiciona a DELIVERED actualizando fecha de entrega, receptor y completando la orden', () => {
      const note = store.updateDispatchStatus('REM-2026-003', DISPATCH_STATUS.DELIVERED.id, {
        receivedBy: 'Claudia Estrada',
        receiverIdDoc: 'DPI 2001 44552 0101',
      });

      expect(note.status).toBe(DISPATCH_STATUS.DELIVERED.id);
      expect(note.receivedBy).toBe('Claudia Estrada');
      expect(note.receiverIdDoc).toBe('DPI 2001 44552 0101');
      expect(note.deliveredAt).toBeTruthy();

      const order = ordersStore.getOrderById(note.orderId);
      expect(order).toBeTruthy();
      expect(order.productionStatus).toBe(ORDER_STATUS.COMPLETED);
    });

    it('maneja actualización a DELIVERED cuando la remisión no tiene orderId', () => {
      const note = store.getDispatchNoteById('REM-2026-003');
      const origOrderId = note.orderId;
      delete note.orderId;

      expect(() => {
        store.updateDispatchStatus('REM-2026-003', DISPATCH_STATUS.DELIVERED.id, {});
      }).not.toThrow();

      note.orderId = origOrderId;
    });

    it('permite actualizar a CANCELLED y PREPARED', () => {
      const note = store.updateDispatchStatus('REM-2026-001', DISPATCH_STATUS.CANCELLED.id, {
        notes: 'Cancelado por solicitud del cliente',
      });
      expect(note.status).toBe('CANCELLED');
      expect(note.notes).toBe('Cancelado por solicitud del cliente');
    });
  });

  describe('Actualización Genérica y Eliminación', () => {
    it('permite actualizar campos genéricos con updateDispatchNote', () => {
      const updated = store.updateDispatchNote('REM-2026-001', {
        notes: 'Nota actualizada por supervisor',
        packagesCount: 3,
      });

      expect(updated.notes).toBe('Nota actualizada por supervisor');
      expect(updated.packagesCount).toBe(3);
    });

    it('retorna null si updateDispatchNote no encuentra la remisión', () => {
      expect(store.updateDispatchNote('REM-NO-EXISTE', {})).toBeNull();
    });

    it('elimina una remisión y desvincula la orden correspondiente', () => {
      const targetNote = store.getDispatchNoteById('REM-2026-002');
      const order = ordersStore.getOrderById(targetNote.orderId);
      if (order) order.dispatchNoteId = targetNote.id;

      const success = store.deleteDispatchNote('REM-2026-002');
      expect(success).toBe(true);
      expect(store.getDispatchNoteById('REM-2026-002')).toBeNull();

      if (order) {
        expect(order.dispatchNoteId).toBeUndefined();
      }
    });

    it('elimina remisión sin romper si la orden vinculada ya no existe en ordersStore', () => {
      const targetNote = store.getDispatchNoteById('REM-2026-001');
      targetNote.orderId = 'ORD-INEXISTENTE-99';

      const success = store.deleteDispatchNote('REM-2026-001');
      expect(success).toBe(true);
    });

    it('retorna false al intentar eliminar un ID inexistente', () => {
      expect(store.deleteDispatchNote('REM-INVENTADO')).toBe(false);
    });
  });

  describe('Métricas de Resumen (getSummaryMetrics)', () => {
    it('calcula métricas de despacho globales y del día de hoy', () => {
      const metrics = store.getSummaryMetrics();
      expect(metrics.totalNotesCount).toBe(3);
      expect(metrics.preparedCount).toBe(1);
      expect(metrics.inTransitCount).toBe(1);
      expect(metrics.deliveredCount).toBe(1);
      expect(metrics.totalMetersDispatched).toBeGreaterThan(0);
      expect(metrics.totalShippedAmountQ).toBeGreaterThan(0);
    });

    it('excluye remisiones canceladas de metros y monto despachado', () => {
      store.updateDispatchStatus('REM-2026-003', DISPATCH_STATUS.CANCELLED.id);
      const metrics = store.getSummaryMetrics();
      expect(metrics.totalNotesCount).toBe(3);
      expect(metrics.preparedCount).toBe(0);
    });
  });

  describe('Generador de Texto WhatsApp (generateWhatsAppText)', () => {
    it('retorna cadena vacía si no se le pasa una remisión', () => {
      expect(store.generateWhatsAppText(null)).toBe('');
    });

    it('genera un mensaje codificado con datos logísticos y de aplicación', () => {
      const note = store.getDispatchNoteById('REM-2026-001');
      const text = decodeURIComponent(store.generateWhatsAppText(note));

      expect(text).toContain('KROMA LAB UV DTF — Guía de Despacho');
      expect(text).toContain('REM-2026-001');
      expect(text).toContain('Rodrigo Méndez');
      expect(text).toContain('3a Avenida 12-45 Zona 8 de Mixco');
      expect(text).toContain('Instrucciones de Aplicación UV DTF');
    });

    it('indica saldo contraentrega adeudado si pendingBalanceQ > 0', () => {
      const mockNote = {
        ...store.getDispatchNoteById('REM-2026-001'),
        pendingBalanceQ: 150.0,
      };
      const text = decodeURIComponent(store.generateWhatsAppText(mockNote));
      expect(text).toContain('Saldo Contraentrega:* Q150.00');
    });

    it('maneja remisión con courier por defecto sin tracking number', () => {
      const mockNote = {
        ...store.getDispatchNoteById('REM-2026-001'),
        courierName: 'Mensajería Kroma Lab / Moto Express', // default courier
        trackingNumber: '',
        packagesCount: 3,
        pendingBalanceQ: 0,
      };
      const text = decodeURIComponent(store.generateWhatsAppText(mockNote));
      expect(text).toContain('3 paquetes');
      expect(text).not.toContain('No. de Guía / Rastreo');
      expect(text).toContain('PAGADO COMPLETO');
    });
  });

  describe('Exportación CSV (exportToCsv)', () => {
    it('genera un archivo CSV con BOM UTF-8 y cabeceras completas', () => {
      const csv = store.exportToCsv();
      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toContain('Folio,Fecha Despacho,No. Pedido,Cliente');
      expect(csv).toContain('REM-2026-001');
      expect(csv).toContain('REM-2026-002');
      expect(csv).toContain('REM-2026-003');
    });
  });
});
