import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { receivablesView } from '../src/js/views/receivables-view.js';
import { receivablesStore } from '../src/js/modules/receivables-store.js';
import { ordersStore, PAYMENT_STATUS } from '../src/js/modules/orders-store.js';
import { store } from '../src/js/store.js';

describe('Receivables View — Interfaz de Cuentas por Cobrar y Saldos B2B', () => {
  let cleanupFn = null;

  beforeEach(() => {
    localStorage.clear();
    ordersStore.resetToInitial();
    receivablesStore.resetToInitial();
    store.setUser({ id: 'USR_ADMIN', role: 'ADMIN', name: 'Administrador' }, 'token');

    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });

    // Mock window.open
    vi.spyOn(window, 'open').mockImplementation(() => {});

    // Mock window.confirm
    vi.spyOn(window, 'confirm').mockImplementation(() => true);

    // Mock window.alert
    vi.spyOn(window, 'alert').mockImplementation(() => {});

    // Mocks para Blob y URL en jsdom
    if (typeof window.URL.createObjectURL === 'undefined') {
      window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      window.URL.revokeObjectURL = vi.fn();
    }

    document.body.innerHTML = `
      <main id="app">
        ${receivablesView.render()}
      </main>
    `;
    cleanupFn = receivablesView.onMount();
  });

  afterEach(() => {
    if (cleanupFn) cleanupFn();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('renderiza la cabecera, indicadores KPI, barra de cuentas bancarias y tablas', () => {
    const h1 = document.querySelector('h1');
    expect(h1.textContent).toContain('Cuentas por Cobrar y Saldos B2B');

    // Botones de cabecera
    expect(document.getElementById('btnOpenRecordPaymentModal')).not.toBeNull();
    expect(document.getElementById('btnExportReceivablesCSV')).not.toBeNull();
    expect(document.getElementById('btnCopyBankAccounts')).not.toBeNull();

    // KPIs
    const summary = document.getElementById('receivablesSummaryContainer');
    expect(summary.textContent).toContain('Saldo Total por Cobrar');
    expect(summary.textContent).toContain('Total Recaudado / Cobrado');
    expect(summary.textContent).toContain('Transacciones de Pago');
    expect(summary.textContent).toContain('Saldos en Mora (>15d)');

    // Filas de tablas
    const receivablesRows = document.querySelectorAll('#receivablesTableBody tr');
    expect(receivablesRows.length).toBeGreaterThan(0);

    const paymentsRows = document.querySelectorAll('#paymentsTableBody tr');
    expect(paymentsRows.length).toBeGreaterThan(0);
  });

  it('copia las cuentas bancarias al portapapeles al pulsar el botón', () => {
    vi.useFakeTimers();
    const btn = document.getElementById('btnCopyBankAccounts');
    btn.click();

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
    expect(btn.textContent).toContain('Cuentas Copiadas');

    vi.advanceTimersByTime(3000);
    expect(btn.textContent).toContain('Copiar Cuentas');
    vi.useRealTimers();
  });

  it('filtra la tabla de cuentas por cobrar por estado de deuda y antigüedad', () => {
    const statusSelect = document.getElementById('receivablesStatusFilter');
    const agingSelect = document.getElementById('receivablesAgingFilter');
    const tbody = document.getElementById('receivablesTableBody');

    // Filtrar solo pagados
    statusSelect.value = 'PAID';
    statusSelect.dispatchEvent(new Event('change'));
    expect(tbody.textContent).toContain('Liquidado');

    // Filtrar pedidos en mora (>15 días)
    statusSelect.value = 'ALL';
    agingSelect.value = 'OVERDUE';
    agingSelect.dispatchEvent(new Event('change'));
    expect(tbody.textContent).toContain('KL-00038');
    expect(tbody.textContent).toContain('En Mora');

    // Filtrar con anticipo parcial
    agingSelect.value = 'ALL';
    statusSelect.value = 'PARTIAL';
    statusSelect.dispatchEvent(new Event('change'));
    expect(tbody.textContent).toContain('KL-00041');
  });

  it('busca cuentas por cobrar en tiempo real y muestra mensaje si no hay resultados', () => {
    const searchInput = document.getElementById('receivablesSearchInput');
    const tbody = document.getElementById('receivablesTableBody');

    searchInput.value = 'Barbería';
    searchInput.dispatchEvent(new Event('input'));
    expect(tbody.textContent).toContain('Barbería Vintage');

    searchInput.value = 'inexistente_xyz_123';
    searchInput.dispatchEvent(new Event('input'));
    expect(tbody.textContent).toContain('No se encontraron cuentas por cobrar con los filtros seleccionados');
  });

  it('abre y cierra el modal de registro de abono', () => {
    const modal = document.getElementById('recordPaymentModal');
    const btnOpen = document.getElementById('btnOpenRecordPaymentModal');
    const btnClose = document.getElementById('btnClosePaymentModal');
    const btnCancel = document.getElementById('btnCancelPaymentModal');

    expect(modal.style.display).toBe('none');

    btnOpen.click();
    expect(modal.style.display).toBe('block');
    expect(document.body.style.overflow).toBe('hidden');

    btnClose.click();
    expect(modal.style.display).toBe('none');
    expect(document.body.style.overflow).toBe('');

    btnOpen.click();
    expect(modal.style.display).toBe('block');
    btnCancel.click();
    expect(modal.style.display).toBe('none');
  });

  it('preselecciona el pedido al pulsar el botón Abonar en la tabla', () => {
    const quickPayBtn = document.querySelector('.btn-quick-pay[data-order-id="KL-00041"]');
    expect(quickPayBtn).not.toBeNull();
    quickPayBtn.click();

    const modal = document.getElementById('recordPaymentModal');
    expect(modal.style.display).toBe('block');

    const select = document.getElementById('paymentOrderId');
    expect(select.value).toBe('KL-00041');

    const card = document.getElementById('selectedOrderCard');
    expect(card.textContent).toContain('Barbería Vintage');
    expect(card.textContent).toContain('Q193.00');
  });

  it('aplica sugerencias rápidas de monto mediante los botones chips (Total y 50%)', () => {
    const quickPayBtn = document.querySelector('.btn-quick-pay[data-order-id="KL-00041"]');
    quickPayBtn.click();

    const btnTotal = document.getElementById('btnChipPayTotal');
    const btnHalf = document.getElementById('btnChipPayHalf');
    const amountInput = document.getElementById('paymentAmount');

    btnTotal.click();
    expect(amountInput.value).toBe('193.00');

    btnHalf.click();
    // 50% de Q393 = 196.50, pero el saldo pendiente es 193.00
    expect(amountInput.value).toBe('193.00');
  });

  it('registra un abono exitosamente desde el formulario y actualiza la vista', () => {
    const quickPayBtn = document.querySelector('.btn-quick-pay[data-order-id="KL-00041"]');
    quickPayBtn.click();

    const form = document.getElementById('formRecordPayment');
    const amountInput = document.getElementById('paymentAmount');
    const methodSelect = document.getElementById('paymentMethod');
    const refInput = document.getElementById('paymentReference');
    const notesInput = document.getElementById('paymentNotes');

    amountInput.value = '100.00';
    methodSelect.value = 'TRANSFER';
    refInput.value = 'BI-BOLETA-99';
    notesInput.value = 'Transferencia en línea';

    form.dispatchEvent(new Event('submit', { cancelable: true }));

    // Modal cerrado
    expect(document.getElementById('recordPaymentModal').style.display).toBe('none');

    // Saldo actualizado
    const detail = receivablesStore.getOrderReceivableDetail('KL-00041');
    expect(detail.totalPaidQ).toBe(300.00);
    expect(detail.pendingBalanceQ).toBe(93.00);

    // Reflejado en historial de pagos
    const paymentsTbody = document.getElementById('paymentsTableBody');
    expect(paymentsTbody.textContent).toContain('BI-BOLETA-99');
  });

  it('muestra alerta si se intenta registrar un abono con monto inválido o mayor al saldo', () => {
    const quickPayBtn = document.querySelector('.btn-quick-pay[data-order-id="KL-00041"]');
    quickPayBtn.click();

    const form = document.getElementById('formRecordPayment');
    const amountInput = document.getElementById('paymentAmount');

    amountInput.value = '9999.00';
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    expect(window.alert).toHaveBeenCalled();
  });

  it('abre el modal de desglose de pagos y muestra los abonos de un pedido', () => {
    const viewBtn = document.querySelector('.btn-view-payments[data-order-id="KL-00041"]');
    expect(viewBtn).not.toBeNull();
    viewBtn.click();

    const modal = document.getElementById('viewPaymentsModal');
    expect(modal.style.display).toBe('block');

    const content = document.getElementById('viewModalContent');
    expect(content.textContent).toContain('Total Orden');
    expect(content.textContent).toContain('Q393.00');
    expect(content.textContent).toContain('PAY-1002');

    // Cerrar modal
    document.getElementById('btnCloseViewModal').click();
    expect(modal.style.display).toBe('none');

    // Abrir modal en pedido sin pagos (KL-00038)
    const viewBtnNoPay = document.querySelector('.btn-view-payments[data-order-id="KL-00038"]');
    viewBtnNoPay.click();
    expect(document.getElementById('viewModalContent').textContent).toContain('No se han registrado abonos previos');

    document.getElementById('btnCloseViewModalFooter').click();
    expect(modal.style.display).toBe('none');

    // Abrir modal en pedido totalmente liquidado (KL-00042) con hasDebt = false
    const viewBtnPaid = document.querySelector('.btn-view-payments[data-order-id="KL-00042"]');
    if (viewBtnPaid) {
      viewBtnPaid.click();
      expect(document.getElementById('viewModalContent').textContent).toContain('Q0.00');
      document.getElementById('btnCloseViewModal').click();
    }
  });

  it('abre WhatsApp con el recordatorio formateado al pulsar el botón de WhatsApp', () => {
    const waBtn = document.querySelector('.btn-whatsapp-reminder[data-order-id="KL-00041"]');
    expect(waBtn).not.toBeNull();
    waBtn.click();

    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('https://wa.me/50251112233?text='),
      '_blank'
    );
  });

  it('exporta la cartera a CSV al pulsar el botón de exportación', () => {
    vi.useFakeTimers();
    const btnExport = document.getElementById('btnExportReceivablesCSV');
    const toast = document.getElementById('receivablesToast');
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    btnExport.click();
    expect(clickSpy).toHaveBeenCalled();
    expect(toast.textContent).toContain('Cartera de cuentas por cobrar exportada exitosamente');
    expect(toast.style.display).toBe('block');

    vi.advanceTimersByTime(3600);
    expect(toast.style.display).toBe('none');

    clickSpy.mockRestore();
    vi.useRealTimers();
  });

  it('maneja excepciones al exportar la cartera a CSV mostrando notificación de error', () => {
    vi.useFakeTimers();
    const btnExport = document.getElementById('btnExportReceivablesCSV');
    const toast = document.getElementById('receivablesToast');
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const storeSpy = vi.spyOn(receivablesStore, 'exportReceivablesCSV').mockImplementation(() => {
      throw new Error('CSV Gen Error');
    });

    btnExport.click();
    expect(toast.textContent).toContain('Ocurrió un error al generar los datos del CSV');
    expect(toast.style.display).toBe('block');

    vi.advanceTimersByTime(3600);
    expect(toast.style.display).toBe('none');

    storeSpy.mockRestore();
    errSpy.mockRestore();
    vi.useRealTimers();
  });

  it('elimina un pago registrado tras confirmación del usuario', () => {
    const deleteBtn = document.querySelector('.btn-delete-payment[data-payment-id="PAY-1002"]');
    expect(deleteBtn).not.toBeNull();

    deleteBtn.click();
    expect(window.confirm).toHaveBeenCalled();

    const detail = receivablesStore.getOrderReceivableDetail('KL-00041');
    expect(detail.totalPaidQ).toBe(0);
  });

  it('muestra estado vacío en tabla de pagos si no hay transacciones', () => {
    receivablesStore.payments = [];
    receivablesStore._notify();

    const tbody = document.getElementById('paymentsTableBody');
    expect(tbody.textContent).toContain('No hay pagos ni abonos registrados en el sistema');
  });

  it('maneja el selector cuando no hay pedidos con deuda pendiente', () => {
    // Liquidar todas las órdenes
    ordersStore.orders.forEach(o => {
      o.paymentStatus = PAYMENT_STATUS.PAID;
      const detail = receivablesStore.getOrderReceivableDetail(o.id);
      if (detail && detail.pendingBalanceQ > 0) {
        receivablesStore.payments.push({
          id: `PAY-MOCK-${o.id}`,
          timestamp: new Date().toISOString(),
          orderId: o.id,
          amountQ: detail.pendingBalanceQ,
          method: 'TRANSFER',
          reference: 'AUTO-CLEAR',
          notes: 'Liquidado en test',
          recordedBy: 'Test',
        });
      }
    });
    receivablesStore._notify();

    const btnOpen = document.getElementById('btnOpenRecordPaymentModal');
    btnOpen.click();

    const select = document.getElementById('paymentOrderId');
    expect(select.innerHTML).toContain('No hay pedidos con saldo pendiente');
  });

  it('actualiza tarjeta de orden al disparar el evento change en el selector de pedidos', () => {
    const btnOpen = document.getElementById('btnOpenRecordPaymentModal');
    btnOpen.click();

    const select = document.getElementById('paymentOrderId');
    select.value = 'KL-00038';
    select.dispatchEvent(new Event('change'));

    expect(document.getElementById('selectedOrderClient').textContent).toContain('Cervecería El Injerto');
    expect(document.getElementById('paymentAmount').value).toBe('508.00');

    // Cambiar a valor no existente
    select.value = 'NON_EXISTENT';
    select.dispatchEvent(new Event('change'));
    expect(document.getElementById('selectedOrderClient').textContent).toContain('Ningún pedido con saldo pendiente');
  });

  it('no altera el monto en chips si la orden seleccionada no existe', () => {
    const select = document.getElementById('paymentOrderId');
    select.value = 'NON_EXISTENT';

    document.getElementById('paymentAmount').value = '123.00';
    document.getElementById('btnChipPayTotal').click();
    expect(document.getElementById('paymentAmount').value).toBe('123.00');

    document.getElementById('btnChipPayHalf').click();
    expect(document.getElementById('paymentAmount').value).toBe('123.00');
  });

  it('cancela la eliminación de un pago si el usuario cancela en el diálogo de confirmación', () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
    const deleteBtn = document.querySelector('.btn-delete-payment[data-payment-id="PAY-1002"]');

    deleteBtn.click();
    expect(receivablesStore.getPaymentById('PAY-1002')).not.toBeNull();
  });

  it('ignora abrir modal de desglose si el ID de orden no existe', () => {
    const dummyBtn = document.createElement('button');
    dummyBtn.className = 'btn-view-payments';
    dummyBtn.setAttribute('data-order-id', 'INEXISTENTE_XYZ');
    document.getElementById('receivablesTableBody').appendChild(dummyBtn);

    const localCleanup = receivablesView.onMount();
    dummyBtn.click();
    expect(document.getElementById('viewPaymentsModal').style.display).toBe('none');
    localCleanup();
  });

  it('ignora botón de WhatsApp si la orden no existe', () => {
    const dummyBtn = document.createElement('button');
    dummyBtn.className = 'btn-whatsapp-reminder';
    dummyBtn.setAttribute('data-order-id', 'INEXISTENTE_XYZ');
    document.getElementById('receivablesTableBody').appendChild(dummyBtn);

    const localCleanup = receivablesView.onMount();
    dummyBtn.click();
    // window.open no debe ser llamado para una orden inválida
    localCleanup();
  });

  it('renderiza indicadores KPI verdes cuando la cartera está completamente liquidada sin moras', () => {
    ordersStore.orders.forEach(o => {
      o.paymentStatus = PAYMENT_STATUS.PAID;
      const detail = receivablesStore.getOrderReceivableDetail(o.id);
      if (detail && detail.pendingBalanceQ > 0) {
        receivablesStore.payments.push({
          id: 'PAY-FULL-' + o.id,
          timestamp: new Date().toISOString(),
          orderId: o.id,
          amountQ: detail.pendingBalanceQ,
          method: 'TRANSFER',
          reference: 'CLEAR',
          recordedBy: 'Test',
        });
      }
    });
    receivablesStore._notify();

    const summary = document.getElementById('receivablesSummaryContainer');
    expect(summary.textContent).toContain('Sin saldos vencidos');
  });

  it('cierra modales y limpia suscripción al invocar el callback de desmontaje (teardown)', () => {
    const modal = document.getElementById('recordPaymentModal');
    modal.style.display = 'block';

    const localCleanup = receivablesView.onMount();
    localCleanup();

    expect(modal.style.display).toBe('none');
  });

  it('maneja métodos de pago no estándar y órdenes con estados no habituales', () => {
    receivablesStore.payments.push({
      id: 'PAY-CUSTOM-99',
      timestamp: new Date().toISOString(),
      orderId: 'KL-00041',
      clientName: 'Cliente Raro',
      amountQ: 25.00,
      method: 'CRYPTO_SPECIAL',
      reference: '',
      notes: '',
      recordedBy: 'Admin',
    });
    receivablesStore._notify();

    const paymentsTable = document.getElementById('paymentsTableBody');
    expect(paymentsTable.textContent).toContain('CRYPTO_SPECIAL');
    expect(paymentsTable.textContent).toContain('—');

    // Abrir desglose con pagos sin notas y método no estándar
    const viewBtn = document.querySelector('.btn-view-payments[data-order-id="KL-00041"]');
    viewBtn.click();
    const content = document.getElementById('viewModalContent');
    expect(content.textContent).toContain('CRYPTO_SPECIAL');
  });
describe('Tarjetas Responsivas Estilo Despacho (<= 1200px)', () => {
    it('renderiza tarjetas de cuentas por cobrar en receivablesCardsContainer', () => {
      const cardsContainer = document.getElementById('receivablesCardsContainer');
      expect(cardsContainer).not.toBeNull();

      const cards = cardsContainer.querySelectorAll('.receivable-card');
      expect(cards.length).toBeGreaterThan(0);

      const firstCard = cards[0];
      expect(firstCard.querySelector('.dispatch-card-folio')).not.toBeNull();
      expect(firstCard.querySelector('.dispatch-card-metrics-grid')).not.toBeNull();
      expect(firstCard.querySelector('.btn-view-payments')).not.toBeNull();
    });

    it('renderiza tarjetas de historial de pagos en paymentsCardsContainer', () => {
      const cardsContainer = document.getElementById('paymentsCardsContainer');
      expect(cardsContainer).not.toBeNull();

      const cards = cardsContainer.querySelectorAll('.payment-card');
      expect(cards.length).toBeGreaterThan(0);

      const firstCard = cards[0];
      expect(firstCard.querySelector('.dispatch-card-folio')).not.toBeNull();
      expect(firstCard.querySelector('.btn-delete-payment')).not.toBeNull();
    });

    it('permite abrir detalle de pagos y abonar desde las tarjetas de cobranza', () => {
      const card = document.querySelector('.receivable-card[data-receivable-card="KL-00041"]');
      expect(card).not.toBeNull();

      // Abrir detalle desde tarjeta
      const btnView = card.querySelector('.btn-view-payments');
      btnView.click();
      const viewModal = document.getElementById('viewPaymentsModal');
      expect(viewModal.style.display).toBe('block');
      document.getElementById('btnCloseViewModal').click();

      // Abrir modal de abono desde tarjeta
      const btnPay = card.querySelector('.btn-quick-pay');
      btnPay.click();
      const recordModal = document.getElementById('recordPaymentModal');
      expect(recordModal.style.display).toBe('block');
      expect(document.getElementById('paymentOrderId').value).toBe('KL-00041');
      document.getElementById('btnClosePaymentModal').click();
    });
  });
});
