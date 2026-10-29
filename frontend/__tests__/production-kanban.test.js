import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { productionView } from '../src/js/views/production-view.js';
import { productionStore } from '../src/js/modules/production-store.js';
import { ordersStore } from '../src/js/modules/orders-store.js';
import { dispatchStore } from '../src/js/modules/dispatch-store.js';
import { apiClient } from '../src/js/modules/api-client.js';
import * as printHelper from '../src/js/modules/print-helper.js';
import { ORDER_STATUS } from '../../shared/business-config.js';

describe('Production View — Tablero Kanban y Monitor de Bobina', () => {
  let cleanupFn = null;

  beforeEach(() => {
    localStorage.clear();
    productionStore.resetToInitial();
    document.body.innerHTML = `
      <main id="app">
        ${productionView.render()}
      </main>
    `;
    cleanupFn = productionView.onMount();
  });

  afterEach(() => {
    if (cleanupFn) cleanupFn();
    document.body.innerHTML = '';
  });

  it('renderiza la estructura básica del tablero con encabezado y modales', () => {
    expect(productionView.path).toBe('/produccion');
    expect(productionView.allowedRoles).toEqual(['EMPLOYEE', 'ADMIN']);

    const title = document.querySelector('h1');
    expect(title.textContent).toContain('Tablero de Producción');

    const helpBtn = document.getElementById('btnKanbanHelp');
    expect(helpBtn).not.toBeNull();
  });

  it('renderiza las 4 columnas de producción y el monitor de bobina', () => {
    const columns = document.querySelectorAll('.kanban-column');
    expect(columns.length).toBe(4);

    const rollMonitor = document.getElementById('rollMonitorContainer');
    expect(rollMonitor.textContent).toContain('Bobina Activa:');
    expect(rollMonitor.textContent).toContain('Capacidad de Bobina');
  });

  it('abre y cierra el modal educativo sobre el Sistema Kanban', () => {
    const helpModal = document.getElementById('kanbanHelpModal');
    const btnHelp = document.getElementById('btnKanbanHelp');
    const btnClose = document.getElementById('btnCloseHelpModal');
    const btnOk = document.getElementById('btnOkHelpModal');

    expect(helpModal.style.display).toBe('none');

    btnHelp.click();
    expect(helpModal.style.display).toBe('block');

    btnClose.click();
    expect(helpModal.style.display).toBe('none');

    btnHelp.click();
    expect(helpModal.style.display).toBe('block');

    btnOk.click();
    expect(helpModal.style.display).toBe('none');
  });

  it('abre el modal de montar bobina y actualiza el metraje al enviar el formulario', () => {
    const mountModal = document.getElementById('mountRollModal');
    const btnMount = document.getElementById('btnMountRoll');
    const form = document.getElementById('formMountRoll');
    const inputMeters = document.getElementById('inputRollMeters');
    const inputNotes = document.getElementById('inputRollNotes');

    btnMount.click();
    expect(mountModal.style.display).toBe('block');

    inputMeters.value = '150';
    inputNotes.value = 'Bobina Especial 150m';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(mountModal.style.display).toBe('none');
    expect(productionStore.getState().roll.totalMeters).toBe(150);
  });

  it('permite cancelar el modal de montar bobina', () => {
    const mountModal = document.getElementById('mountRollModal');
    const btnMount = document.getElementById('btnMountRoll');
    const btnCancel = document.getElementById('btnCancelMountRoll');

    btnMount.click();
    expect(mountModal.style.display).toBe('block');

    btnCancel.click();
    expect(mountModal.style.display).toBe('none');
  });

  it('abre el modal de nueva orden y la agrega a la cola al enviar', () => {
    const newOrderModal = document.getElementById('newOrderModal');
    const btnOpen = document.getElementById('btnNewOrderModal');
    const form = document.getElementById('formNewOrder');

    btnOpen.click();
    expect(newOrderModal.style.display).toBe('block');

    document.getElementById('inputClientName').value = 'Cliente Test Kanban';
    document.getElementById('inputContactPhone').value = '+502 5555-9999';
    document.getElementById('inputOrderWidth').value = '8';
    document.getElementById('inputOrderHeight').value = '4';
    document.getElementById('inputOrderQty').value = '200';
    document.getElementById('inputOrderMeters').value = '3.5';
    document.getElementById('checkCutting').checked = true;

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(newOrderModal.style.display).toBe('none');
    const queueColumn = document.querySelector('[data-stage="IN_AUDLEY_QUEUE"]');
    expect(queueColumn.textContent).toContain('Cliente Test Kanban');
  });

  it('avanza una orden de etapa mediante el botón de la tarjeta', () => {
    // KL-00042 empieza en IN_AUDLEY_QUEUE
    const cardBtnAdvance = document.querySelector('.btn-advance[data-order-id="KL-00042"]');
    expect(cardBtnAdvance).not.toBeNull();

    cardBtnAdvance.click();

    // Debe haberse movido a PRINTING
    const printingCol = document.querySelector('[data-stage="PRINTING"]');
    expect(printingCol.textContent).toContain('KL-00042');
  });

  it('retrocede una orden de etapa mediante el botón regress', () => {
    // KL-00041 empieza en PRINTING
    const cardBtnRegress = document.querySelector('.btn-regress[data-order-id="KL-00041"]');
    expect(cardBtnRegress).not.toBeNull();

    cardBtnRegress.click();

    const queueCol = document.querySelector('[data-stage="IN_AUDLEY_QUEUE"]');
    expect(queueCol.textContent).toContain('KL-00041');
  });

  it('abre el modal de detalle y muestra la ficha técnica completa', () => {
    const detailModal = document.getElementById('orderDetailModal');
    const btnDetail = document.querySelector('.btn-detail[data-order-id="KL-00042"]');
    expect(btnDetail).not.toBeNull();

    btnDetail.click();
    expect(detailModal.style.display).toBe('block');
    expect(document.getElementById('detailOrderClient').textContent).toBe('Café San Cristóbal');

    const btnClose = document.getElementById('btnCloseDetailModal');
    btnClose.click();
    expect(detailModal.style.display).toBe('none');
  });

  it('muestra la alerta de bobina cuando la cola excede el film disponible', () => {
    // Forzar bobina pequeña
    productionStore.mountNewRoll(5.0, 'Bobina restante corta');
    const alertBox = document.querySelector('.roll-alert-box');
    expect(alertBox).not.toBeNull();
    expect(alertBox.textContent).toContain('Alerta de Bobina');
  });

  it('permite cancelar el modal de nueva orden', () => {
    const newOrderModal = document.getElementById('newOrderModal');
    const btnOpen = document.getElementById('btnNewOrderModal');
    const btnCancel = document.getElementById('btnCancelNewOrder');

    btnOpen.click();
    expect(newOrderModal.style.display).toBe('block');

    btnCancel.click();
    expect(newOrderModal.style.display).toBe('none');
  });

  it('avanza una orden desde la última etapa (Listo / Empaque) completándola y archivándola', () => {
    // KL-00040 está en READY_FOR_DELIVERY (última columna)
    const readyCol = document.querySelector('[data-stage="READY_FOR_DELIVERY"]');
    expect(readyCol.textContent).toContain('KL-00040');

    const btnEntregar = readyCol.querySelector('.btn-advance[data-order-id="KL-00040"]');
    expect(btnEntregar.textContent).toContain('Entregar');
    expect(btnEntregar.classList.contains('success')).toBe(true);

    btnEntregar.click();

    // Ya no debe estar en la columna activa de entrega (pasa a COMPLETED)
    const updatedReadyCol = document.querySelector('[data-stage="READY_FOR_DELIVERY"]');
    expect(updatedReadyCol.textContent).not.toContain('KL-00040');
  });

  it('maneja el envío de formularios con campos vacíos usando valores predeterminados', () => {
    // Formulario de nueva orden con campos vacíos
    const formNew = document.getElementById('formNewOrder');
    document.getElementById('inputOrderWidth').value = '';
    document.getElementById('inputOrderHeight').value = '';
    document.getElementById('inputOrderQty').value = '';
    document.getElementById('inputOrderMeters').value = '';
    document.getElementById('selectFinishType').value = '';
    document.getElementById('inputOrderNotes').value = '';

    formNew.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    // Formulario de montar bobina con valores vacíos
    const formMount = document.getElementById('formMountRoll');
    document.getElementById('inputRollMeters').value = '';
    document.getElementById('inputRollNotes').value = '';

    formMount.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(productionStore.getState().roll.totalMeters).toBe(100);
  });

  it('renderiza la ficha técnica de una orden sin notas y sin corte perimetral', () => {
    const detailModal = document.getElementById('orderDetailModal');
    // KL-00043 no tiene corte y finishType diferente
    const btnDetail = document.querySelector('.btn-detail[data-order-id="KL-00043"]');
    btnDetail.click();

    expect(detailModal.style.display).toBe('block');
    const bodyText = document.getElementById('detailOrderBody').textContent;
    expect(bodyText).toContain('En Rollo Continuo');

    const btnOk = document.getElementById('btnOkDetailModal');
    btnOk.click();
    expect(detailModal.style.display).toBe('none');
  });

  describe('Sincronización con Backend PUT y Ciclo de Estados de Órdenes', () => {
    it('dispara PUT /api/orders/:id/status al avanzar una orden a través de todas las fases del Kanban', async () => {
      const updateStatusSpy = vi.spyOn(apiClient.orders, 'updateStatus').mockResolvedValue({ success: true });

      // KL-00042 empieza en IN_AUDLEY_QUEUE
      const btnAdvance = document.querySelector('.btn-advance[data-order-id="KL-00042"]');
      expect(btnAdvance).not.toBeNull();

      // 1. IN_AUDLEY_QUEUE -> PRINTING
      btnAdvance.click();
      expect(updateStatusSpy).toHaveBeenCalledWith('KL-00042', ORDER_STATUS.PRINTING);
      let order = productionStore.getState().orders.find(o => o.id === 'KL-00042');
      expect(order.status).toBe(ORDER_STATUS.PRINTING);

      // 2. PRINTING -> LAMINATING_CUTTING
      const btnAdvance2 = document.querySelector('.btn-advance[data-order-id="KL-00042"]');
      btnAdvance2.click();
      expect(updateStatusSpy).toHaveBeenCalledWith('KL-00042', ORDER_STATUS.LAMINATING_CUTTING);
      order = productionStore.getState().orders.find(o => o.id === 'KL-00042');
      expect(order.status).toBe(ORDER_STATUS.LAMINATING_CUTTING);

      // 3. LAMINATING_CUTTING -> READY_FOR_DELIVERY
      const btnAdvance3 = document.querySelector('.btn-advance[data-order-id="KL-00042"]');
      btnAdvance3.click();
      expect(updateStatusSpy).toHaveBeenCalledWith('KL-00042', ORDER_STATUS.READY_FOR_DELIVERY);
      order = productionStore.getState().orders.find(o => o.id === 'KL-00042');
      expect(order.status).toBe(ORDER_STATUS.READY_FOR_DELIVERY);

      // 4. READY_FOR_DELIVERY -> COMPLETED
      const btnAdvance4 = document.querySelector('.btn-advance[data-order-id="KL-00042"]');
      expect(btnAdvance4.textContent).toContain('Entregar');
      btnAdvance4.click();
      expect(updateStatusSpy).toHaveBeenCalledWith('KL-00042', ORDER_STATUS.COMPLETED);
      order = productionStore.getState().orders.find(o => o.id === 'KL-00042');
      expect(order.status).toBe(ORDER_STATUS.COMPLETED);

      updateStatusSpy.mockRestore();
    });

    it('maneja rechazos de red en el PUT request sin lanzar excepciones en la UI', async () => {
      const updateStatusSpy = vi.spyOn(apiClient.orders, 'updateStatus').mockRejectedValue(new Error('Network error'));
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const btnAdvance = document.querySelector('.btn-advance[data-order-id="KL-00042"]');
      expect(() => btnAdvance.click()).not.toThrow();

      updateStatusSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });
  });

  describe('Emisión de Guía de Despacho desde el Tablero Kanban', () => {
    it('abre el modal de emitir guía de despacho al pulsar btn-emit-dispatch cuando no existe remisión previa', () => {
      // Limpiar remisiones para simular que KL-00040 aún no ha sido despachada
      dispatchStore.dispatchNotes = [];

      const btnDispatch = document.querySelector('.btn-emit-dispatch[data-order-id="KL-00040"]');
      expect(btnDispatch).not.toBeNull();

      btnDispatch.click();

      const modal = document.getElementById('kanbanCreateDispatchModal');
      expect(modal.style.display).toBe('block');
      expect(document.getElementById('kanbanDispatchOrderId').value).toBe('KL-00040');
      expect(document.getElementById('inputKanbanClientName').value).toContain('Sport Gym');
    });

    it('permite cancelar el modal de emisión de despacho', () => {
      dispatchStore.dispatchNotes = [];

      const btnDispatch = document.querySelector('.btn-emit-dispatch[data-order-id="KL-00040"]');
      btnDispatch.click();

      const modal = document.getElementById('kanbanCreateDispatchModal');
      expect(modal.style.display).toBe('block');

      const btnCancel = document.getElementById('btnCancelKanbanDispatchModal');
      btnCancel.click();
      expect(modal.style.display).toBe('none');
    });

    it('emite la remisión oficial, abre la hoja imprimible y permite imprimirla', () => {
      dispatchStore.dispatchNotes = [];
      const printSpy = vi.spyOn(printHelper, 'printDocument').mockImplementation(() => {});

      const btnDispatch = document.querySelector('.btn-emit-dispatch[data-order-id="KL-00040"]');
      btnDispatch.click();

      // Completar datos y enviar
      document.getElementById('inputKanbanAddress').value = '10 Calle 5-20 Zona 14, Guatemala';
      document.getElementById('selectKanbanDeliveryMethod').value = 'CARGO_EXPRESO';
      document.getElementById('inputKanbanCourier').value = 'Cargo Expreso';
      document.getElementById('inputKanbanTracking').value = 'CX-998877';

      const form = document.getElementById('formKanbanCreateDispatch');
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      // Se cierra el modal de formulario
      expect(document.getElementById('kanbanCreateDispatchModal').style.display).toBe('none');

      // Se abre el modal de la hoja imprimible
      const sheetModal = document.getElementById('kanbanDispatchSheetModal');
      expect(sheetModal.style.display).toBe('block');
      expect(document.getElementById('kanbanDispatchSheetContainer').textContent).toContain('CX-998877');

      // Probar impresión
      const btnPrint = document.getElementById('btnPrintKanbanDispatchSheet');
      btnPrint.click();
      expect(printSpy).toHaveBeenCalled();

      // Cerrar hoja imprimible
      const btnCloseSheet = document.getElementById('btnCloseKanbanDispatchSheetModal');
      btnCloseSheet.click();
      expect(sheetModal.style.display).toBe('none');

      printSpy.mockRestore();
    });

    it('abre directamente la hoja imprimible si la orden ya contaba con remisión previa', () => {
      // Restaurar semillas donde KL-00040 ya tiene remisión (REM-2026-003)
      dispatchStore.resetToInitial();

      const btnDispatch = document.querySelector('.btn-emit-dispatch[data-order-id="KL-00040"]');
      btnDispatch.click();

      const formModal = document.getElementById('kanbanCreateDispatchModal');
      const sheetModal = document.getElementById('kanbanDispatchSheetModal');

      // No debe abrir el formulario, debe abrir directamente la hoja
      expect(formModal.style.display).toBe('none');
      expect(sheetModal.style.display).toBe('block');

      const btnCancelSheet = document.getElementById('btnCancelKanbanDispatchSheetModal');
      btnCancelSheet.click();
      expect(sheetModal.style.display).toBe('none');
    });
  });
});
