import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  receivablesStore,
  calculateAging,
  AGING_STATUS,
  PAYMENT_METHODS,
  STORAGE_KEY_PAYMENTS,
} from '../src/js/modules/receivables-store.js';
import { ordersStore, PAYMENT_STATUS } from '../src/js/modules/orders-store.js';

describe('Receivables Store — Almacén de Cuentas por Cobrar y Saldos B2B', () => {
  beforeEach(() => {
    localStorage.clear();
    ordersStore.resetToInitial();
    receivablesStore.resetToInitial();
  });

  describe('Cálculo de Antigüedad de Deuda (Aging)', () => {
    it('clasifica órdenes recientes (<= 7 días) como CURRENT (Al Día)', () => {
      const recentDate = new Date(Date.now() - 3600000 * 24 * 3).toISOString();
      const res = calculateAging(recentDate);
      expect(res.days).toBe(3);
      expect(res.status.id).toBe(AGING_STATUS.CURRENT.id);
    });

    it('clasifica órdenes de 8 a 15 días como ATTENTION (Por Vencer)', () => {
      const midDate = new Date(Date.now() - 3600000 * 24 * 10).toISOString();
      const res = calculateAging(midDate);
      expect(res.days).toBe(10);
      expect(res.status.id).toBe(AGING_STATUS.ATTENTION.id);
    });

    it('clasifica órdenes de más de 15 días como OVERDUE (En Mora)', () => {
      const oldDate = new Date(Date.now() - 3600000 * 24 * 20).toISOString();
      const res = calculateAging(oldDate);
      expect(res.days).toBe(20);
      expect(res.status.id).toBe(AGING_STATUS.OVERDUE.id);
    });
  });

  describe('Detalle de Cuentas por Cobrar de Pedidos', () => {
    it('obtiene el detalle de una orden pagada al 100% (KL-00042)', () => {
      const detail = receivablesStore.getOrderReceivableDetail('KL-00042');
      expect(detail).not.toBeNull();
      expect(detail.orderId).toBe('KL-00042');
      expect(detail.grandTotalQ).toBe(226.70);
      expect(detail.totalPaidQ).toBe(226.70);
      expect(detail.pendingBalanceQ).toBe(0);
      expect(detail.paymentStatus).toBe(PAYMENT_STATUS.PAID);
      expect(detail.hasDebt).toBe(false);
    });

    it('obtiene el detalle de una orden con anticipo parcial (KL-00041)', () => {
      const detail = receivablesStore.getOrderReceivableDetail('KL-00041');
      expect(detail).not.toBeNull();
      expect(detail.grandTotalQ).toBe(393.00);
      expect(detail.totalPaidQ).toBe(200.00);
      expect(detail.pendingBalanceQ).toBe(193.00);
      expect(detail.paymentStatus).toBe(PAYMENT_STATUS.PARTIAL);
      expect(detail.hasDebt).toBe(true);
      expect(detail.paymentsCount).toBe(1);
    });

    it('obtiene el detalle de una orden en mora sin pagos (KL-00038)', () => {
      const detail = receivablesStore.getOrderReceivableDetail('KL-00038');
      expect(detail).not.toBeNull();
      expect(detail.grandTotalQ).toBe(508.00);
      expect(detail.totalPaidQ).toBe(0);
      expect(detail.pendingBalanceQ).toBe(508.00);
      expect(detail.paymentStatus).toBe(PAYMENT_STATUS.PENDING);
      expect(detail.isOverdue).toBe(true);
      expect(detail.agingStatus.id).toBe('OVERDUE');
    });

    it('retorna null cuando el pedido no existe', () => {
      expect(receivablesStore.getOrderReceivableDetail('KL-INEXISTENTE')).toBeNull();
    });
  });

  describe('Filtros y Búsqueda de Cuentas por Cobrar (getAllReceivables)', () => {
    it('retorna todas las cuentas por cobrar sin filtros', () => {
      const all = receivablesStore.getAllReceivables({ status: 'ALL' });
      expect(all.length).toBeGreaterThanOrEqual(5);
    });

    it('filtra únicamente pedidos con deuda pendiente (DEBT_ONLY)', () => {
      const withDebt = receivablesStore.getAllReceivables({ status: 'DEBT_ONLY' });
      expect(withDebt.length).toBeGreaterThan(0);
      withDebt.forEach(item => {
        expect(item.hasDebt).toBe(true);
        expect(item.pendingBalanceQ).toBeGreaterThan(0);
      });
    });

    it('filtra pedidos totalmente pagados (PAID)', () => {
      const paid = receivablesStore.getAllReceivables({ status: 'PAID' });
      expect(paid.length).toBeGreaterThan(0);
      paid.forEach(item => {
        expect(item.pendingBalanceQ).toBe(0);
        expect(item.paymentStatus).toBe(PAYMENT_STATUS.PAID);
      });
    });

    it('filtra pedidos con anticipo parcial (PARTIAL) y pendientes (PENDING)', () => {
      const partials = receivablesStore.getAllReceivables({ status: 'PARTIAL' });
      partials.forEach(item => {
        expect(item.totalPaidQ).toBeGreaterThan(0);
        expect(item.hasDebt).toBe(true);
      });

      const pendings = receivablesStore.getAllReceivables({ status: 'PENDING' });
      pendings.forEach(item => {
        expect(item.totalPaidQ).toBe(0);
        expect(item.hasDebt).toBe(true);
      });
    });

    it('filtra por estado de antigüedad (OVERDUE)', () => {
      const overdue = receivablesStore.getAllReceivables({ aging: 'OVERDUE' });
      expect(overdue.length).toBeGreaterThan(0);
      expect(overdue[0].agingStatus.id).toBe('OVERDUE');
    });

    it('busca pedidos por nombre de empresa o cliente', () => {
      const results = receivablesStore.getAllReceivables({ search: 'Barbería Vintage' });
      expect(results.length).toBe(1);
      expect(results[0].orderId).toBe('KL-00041');
    });

    it('busca pedidos por número de orden o NIT', () => {
      const byOrder = receivablesStore.getAllReceivables({ search: 'KL-00042' });
      expect(byOrder.length).toBe(1);

      const byNit = receivablesStore.getAllReceivables({ search: '6549871-2' });
      expect(byNit.length).toBe(1);
      expect(byNit[0].orderId).toBe('KL-00038');
    });

    it('busca pedidos por número telefónico', () => {
      const byPhone = receivablesStore.getAllReceivables({ search: '51112233' });
      expect(byPhone.length).toBe(1);
    });

    it('retorna arreglo vacío si no hay coincidencias', () => {
      const empty = receivablesStore.getAllReceivables({ search: 'cadena_sin_sentido_xyz' });
      expect(empty).toEqual([]);
    });
  });

  describe('Registro de Abonos y Pagos (recordPayment)', () => {
    it('registra un abono parcial y actualiza el saldo y estado del pedido', () => {
      const res = receivablesStore.recordPayment({
        orderId: 'KL-00041',
        amountQ: 50.00,
        method: 'CASH',
        reference: 'EF-1029',
        notes: 'Abono en efectivo en taller',
        recordedBy: 'Miguel Dubois',
      });

      expect(res.payment.id).toMatch(/^PAY-\d+$/);
      expect(res.payment.amountQ).toBe(50.00);
      expect(res.detail.totalPaidQ).toBe(250.00);
      expect(res.detail.pendingBalanceQ).toBe(143.00);
      expect(res.detail.paymentStatus).toBe(PAYMENT_STATUS.PARTIAL);

      const orderInStore = ordersStore.getOrderById('KL-00041');
      expect(orderInStore.paymentStatus).toBe(PAYMENT_STATUS.PARTIAL);
    });

    it('liquida el 100% de la deuda cambiando el estado a PAID en ordersStore', () => {
      const res = receivablesStore.recordPayment({
        orderId: 'KL-00041',
        amountQ: 193.00, // Saldo exacto restante
        method: 'TRANSFER',
        reference: 'BI-LIQUIDADO',
        notes: 'Pago final contraentrega',
      });

      expect(res.detail.pendingBalanceQ).toBe(0);
      expect(res.detail.paymentStatus).toBe(PAYMENT_STATUS.PAID);

      const orderInStore = ordersStore.getOrderById('KL-00041');
      expect(orderInStore.paymentStatus).toBe(PAYMENT_STATUS.PAID);
    });

    it('falla si el pedido no existe', () => {
      expect(() => {
        receivablesStore.recordPayment({
          orderId: 'NO-EXISTE',
          amountQ: 100,
        });
      }).toThrow('no existe');
    });

    it('falla si el monto es menor o igual a cero', () => {
      expect(() => {
        receivablesStore.recordPayment({
          orderId: 'KL-00041',
          amountQ: 0,
        });
      }).toThrow('mayor a Q0.00');

      expect(() => {
        receivablesStore.recordPayment({
          orderId: 'KL-00041',
          amountQ: -15,
        });
      }).toThrow('mayor a Q0.00');
    });

    it('falla si el monto supera el saldo pendiente', () => {
      expect(() => {
        receivablesStore.recordPayment({
          orderId: 'KL-00041',
          amountQ: 999.00, // Saldo es 193.00
        });
      }).toThrow('excede el saldo pendiente');
    });

    it('aplica valores por defecto seguros para método, referencia y operador', () => {
      const res = receivablesStore.recordPayment({
        orderId: 'KL-00038',
        amountQ: 100.00,
        method: 'UNKNOWN_METHOD',
        reference: '',
        notes: '',
        recordedBy: '',
      });

      expect(res.payment.method).toBe('TRANSFER');
      expect(res.payment.reference).toBe('Sin referencia');
      expect(res.payment.recordedBy).toBe('Operador de Taller');
    });
  });

  describe('Eliminación de Abonos (deletePayment)', () => {
    it('elimina un abono existente y recalcula el saldo del pedido', () => {
      const before = receivablesStore.getOrderReceivableDetail('KL-00041');
      expect(before.totalPaidQ).toBe(200.00);

      const deleted = receivablesStore.deletePayment('PAY-1002');
      expect(deleted).toBe(true);

      const after = receivablesStore.getOrderReceivableDetail('KL-00041');
      expect(after.totalPaidQ).toBe(0);
      expect(after.pendingBalanceQ).toBe(393.00);
      expect(after.paymentStatus).toBe(PAYMENT_STATUS.PENDING);
    });

    it('retorna false si el ID de abono no existe', () => {
      expect(receivablesStore.deletePayment('PAY-INEXISTENTE')).toBe(false);
    });
  });

  describe('Resumen Consolidado y KPIs (getReceivablesSummary)', () => {
    it('calcula los totales de cartera, recaudación, morosidad y tasa de cobranza', () => {
      const summary = receivablesStore.getReceivablesSummary();
      expect(summary.totalReceivableQ).toBeGreaterThan(0);
      expect(summary.totalCollectedQ).toBeGreaterThan(0);
      expect(summary.clientsWithDebtCount).toBeGreaterThanOrEqual(2);
      expect(summary.overdueCount).toBeGreaterThanOrEqual(1);
      expect(summary.collectionRatePercent).toBeGreaterThan(0);
      expect(summary.collectionRatePercent).toBeLessThanOrEqual(100);
    });
  });

  describe('Generación de Recordatorios por WhatsApp', () => {
    it('construye una URL y mensaje formal para cobro por WhatsApp con datos bancarios', () => {
      const reminder = receivablesStore.generateWhatsAppReminder('KL-00041');
      expect(reminder).not.toBeNull();
      expect(reminder.phone).toBe('50251112233');
      expect(reminder.text).toContain('KL-00041');
      expect(reminder.text).toContain('Q193.00');
      expect(reminder.text).toContain('5371667253'); // Banco Industrial
      expect(reminder.url).toContain('https://wa.me/50251112233?text=');
    });

    it('retorna null si la orden no existe', () => {
      expect(receivablesStore.generateWhatsAppReminder('KL-FAKE')).toBeNull();
    });
  });

  describe('Exportación de Cartera a CSV', () => {
    it('genera archivo CSV con encabezados RFC 4180 y UTF-8 BOM', () => {
      const csv = receivablesStore.exportReceivablesCSV();
      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toContain('No. Orden');
      expect(csv).toContain('Total Facturado (Q)');
      expect(csv).toContain('Saldo Pendiente (Q)');
      expect(csv).toContain('KL-00041');
      expect(csv).toContain('Barbería Vintage');
    });

    it('maneja órdenes con campos nulos o faltantes en exportReceivablesCSV sin arrojar error', () => {
      const getSpy = vi.spyOn(receivablesStore, 'getAllReceivables').mockReturnValueOnce([
        {
          orderId: null,
          createdAt: null,
          customer: null,
          linearMeters: null,
          grandTotalQ: null,
          totalPaidQ: null,
          pendingBalanceQ: null,
          paymentStatus: null,
          agingDays: null,
          agingStatus: null,
          paymentsCount: null,
        },
      ]);

      const csv = receivablesStore.exportReceivablesCSV();
      expect(csv).toContain('""');
      expect(csv).toContain('"0.00"');
      expect(csv).toContain('"PENDING"');
      expect(csv).toContain('"Al Día"');

      getSpy.mockRestore();
    });
  });

  describe('Persistencia y Manejo de Errores en localStorage', () => {
    it('maneja errores de parseo en localStorage cargando datos semilla', () => {
      localStorage.setItem(STORAGE_KEY_PAYMENTS, 'invalid JSON {{{');
      const storeWithCorruptData = new (receivablesStore.constructor)();
      expect(storeWithCorruptData.getPayments().length).toBeGreaterThan(0);
    });

    it('maneja excepciones al escribir en localStorage sin fallar', () => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
        throw new Error('QuotaExceeded');
      });

      expect(() => {
        receivablesStore._savePayments();
      }).not.toThrow();
      expect(errSpy).toHaveBeenCalled();
    });

    it('captura errores en listeners sin interrumpir la ejecución', () => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const unsub = receivablesStore.subscribe(() => {
        throw new Error('Listener error');
      });

      receivablesStore.recordPayment({
        orderId: 'KL-00041',
        amountQ: 10,
      });

      expect(errSpy).toHaveBeenCalled();
      unsub();
    });
  });

  describe('Métodos Auxiliares y Cobertura de Ramas', () => {
    it('obtiene pago por ID y pagos por orden', () => {
      const p = receivablesStore.getPaymentById('PAY-1001');
      expect(p).not.toBeNull();
      expect(p.orderId).toBe('KL-00042');

      expect(receivablesStore.getPaymentById('INEXISTENTE')).toBeNull();

      const list = receivablesStore.getPaymentsByOrder('KL-00041');
      expect(list.length).toBeGreaterThan(0);
    });

    it('formatea teléfono sin prefijo 502 agregándolo automáticamente en WhatsApp', () => {
      const order = ordersStore.getOrderById('KL-00041');
      order.customer.phone = '55551234'; // Sin 502
      const reminder = receivablesStore.generateWhatsAppReminder('KL-00041');
      expect(reminder.phone).toBe('50255551234');
    });

    it('elimina pago incluso si la orden ya no existe en ordersStore', () => {
      const p = receivablesStore.recordPayment({
        orderId: 'KL-00041',
        amountQ: 5,
      });
      const paymentId = p.payment.id;
      // Simular orden eliminada
      ordersStore.deleteOrder('KL-00041');
      expect(receivablesStore.deletePayment(paymentId)).toBe(true);
    });

    it('calcula resumen de cartera cuando no existen deudas pendientes ni órdenes', () => {
      ordersStore.orders = [];
      receivablesStore.payments = [];
      const summary = receivablesStore.getReceivablesSummary();
      expect(summary.totalReceivableQ).toBe(0);
      expect(summary.collectionRatePercent).toBe(100);
    });

    it('cubre fallbacks de _mapBackendPayment y filtros avanzados en getReceivables', () => {
      // 1. _mapBackendPayment con objeto mínimo
      const m1 = receivablesStore._mapBackendPayment({
        id: 'pay_999',
        amountPaidQ: '200'
      });
      expect(m1.id).toBe('pay_999');
      expect(m1.clientName).toBe('Cliente B2B');
      expect(m1.method).toBe('TRANSFER');
      expect(m1.reference).toBe('Sin referencia');
      expect(m1.recordedBy).toBe('Operador de Taller');

      // 2. _mapBackendPayment con objeto completo
      const m2 = receivablesStore._mapBackendPayment({
        paymentCode: 'PAY-2026-999',
        id: 'back_999',
        createdAt: '2026-10-23T10:00:00Z',
        order: { code: 'ORD-999', customerName: 'Empresa Test', customerPhone: '5551234' },
        bankReference: 'BOLETA-1234',
        registeredBy: { name: 'Admin Miguel' },
        amountPaidQ: 350
      });
      expect(m2.id).toBe('PAY-2026-999');
      expect(m2.orderId).toBe('ORD-999');
      expect(m2.clientName).toBe('Empresa Test');
      expect(m2.clientPhone).toBe('5551234');
      expect(m2.reference).toBe('BOLETA-1234');
      expect(m2.recordedBy).toBe('Admin Miguel');

      // 3. getReceivables con busqueda por telefono, empresa y NIT
      ordersStore.orders = [
        {
          id: 'test_ord_1',
          code: 'KL-00099',
          orderNumber: 'KL-00099',
          customer: {
            name: 'Cliente Busqueda',
            phone: '502 9988-7766',
            company: 'Cafe Dubois',
            nit: '1234567-8'
          },
          metrics: { grandTotalQ: 500 },
          createdAt: new Date().toISOString(),
          status: 'COMPLETED',
          paymentStatus: 'PENDING'
        }
      ];

      const byPhone = receivablesStore.getAllReceivables({ search: '99887766' });
      expect(byPhone.length).toBe(1);

      const byCompany = receivablesStore.getAllReceivables({ search: 'Dubois' });
      expect(byCompany.length).toBe(1);

      const byNit = receivablesStore.getAllReceivables({ search: '1234567' });
      expect(byNit.length).toBe(1);

      const noMatch = receivablesStore.getAllReceivables({ search: 'zzzz_inexistente' });
      expect(noMatch.length).toBe(0);
    });
  });
});
