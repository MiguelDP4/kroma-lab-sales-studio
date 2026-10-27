import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  dispatchView,
  renderMetricsHtml,
  renderDispatchCardsHtml,
  renderTableRowsHtml,
  renderDispatchSheetHtml,
} from '../src/js/views/dispatch-view.js';
import { dispatchStore, DISPATCH_STATUS } from '../src/js/modules/dispatch-store.js';
import { ordersStore } from '../src/js/modules/orders-store.js';
import * as reportsEngine from '../src/js/modules/reports-engine.js';

describe('Dispatch View — Interfaz de Remisiones y Guías de Entrega UV DTF', () => {
  let container;
  let cleanup;

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    vi.restoreAllMocks();
  });

  describe('Renderizado de Componentes Puros y Plantillas HTML', () => {
    it('renderiza la estructura básica de la vista con cabecera y modales', () => {
      const html = dispatchView.render();
      expect(html).toContain('Remisiones y Guías de Entrega');
      expect(html).toContain('Logística & Despacho UV DTF');
      expect(html).toContain('+ Nueva Remisión');
      expect(html).toContain('Exportar CSV');
      expect(html).toContain('id="createDispatchModal"');
      expect(html).toContain('id="dispatchSheetModal"');
      expect(html).toContain('id="updateDispatchStatusModal"');
    });

    it('renderiza las tarjetas KPI de resumen logístico', () => {
      const metrics = {
        preparedCount: 3,
        inTransitCount: 2,
        deliveredCount: 5,
        todayDispatchedCount: 2,
        totalMetersDispatched: 14.5,
        totalShippedAmountQ: 1850.0,
      };

      const html = renderMetricsHtml(metrics);
      expect(html).toContain('Empacadas en Taller');
      expect(html).toContain('3');
      expect(html).toContain('En Ruta / Courier');
      expect(html).toContain('2');
      expect(html).toContain('Entregadas');
      expect(html).toContain('5');
      expect(html).toContain('14.50m');
      expect(html).toContain('Q1850.00');
    });

    it('renderiza mensaje vacío amigable cuando no hay remisiones', () => {
      const html = renderTableRowsHtml([]);
      expect(html).toContain('No hay remisiones de despacho registradas');
      expect(html).toContain('Emite una nueva remisión pulsando "+ Nueva Remisión"');
    });

    it('renderiza filas de remisiones con datos logísticos, badges de cobro y acciones', () => {
      const notes = dispatchStore.getDispatchNotes();
      const html = renderTableRowsHtml(notes);

      expect(html).toContain('REM-2026-001');
      expect(html).toContain('Rodrigo Méndez');
      expect(html).toContain('Cargo Expreso');
      expect(html).toContain('btn-view-dispatch-sheet');
      expect(html).toContain('btn-whatsapp-dispatch');
      expect(html).toContain('btn-status-dispatch');
    });

    it('renderiza badge de cobro contraentrega cuando pendingBalanceQ > 0', () => {
      const mockNotes = [
        {
          ...dispatchStore.getDispatchNoteById('REM-2026-001'),
          pendingBalanceQ: 350.0,
          trackingNumber: '',
        },
      ];
      const html = renderTableRowsHtml(mockNotes);
      expect(html).toContain('Cobrar Q350.00');
    });

    it('renderiza la hoja oficial de despacho imprimible con metadatos, checklist y firmas', () => {
      const note = dispatchStore.getDispatchNoteById('REM-2026-001');
      const order = ordersStore.getOrderById(note.orderId);
      const html = renderDispatchSheetHtml(note, order);

      expect(html).toContain('KROMA LAB UV DTF');
      expect(html).toContain('REMISIÓN DE DESPACHO');
      expect(html).toContain(note.id);
      expect(html).toContain(note.clientName);
      expect(html).toContain('Control de Calidad Técnico en Taller');
      expect(html).toContain('Garantía y Condiciones de Aplicación');
      expect(html).toContain('Despachado en Taller (Firma y Sello)');
      expect(html).toContain('Receptor / Transportista');
    });

    it('renderiza la hoja oficial con ítems de fallback si el pedido es nulo', () => {
      const note = dispatchStore.getDispatchNoteById('REM-2026-001');
      const html = renderDispatchSheetHtml(note, null);

      expect(html).toContain('Pliego Film UV DTF');
      expect(html).toContain('Barniz con Relieve 3D');
    });

    it('renderiza la hoja oficial con alerta roja de cobro si pendingBalanceQ > 0', () => {
      const note = {
        ...dispatchStore.getDispatchNoteById('REM-2026-001'),
        pendingBalanceQ: 250.0,
        receiverIdDoc: '',
        receivedBy: '',
      };
      const order = ordersStore.getOrderById(note.orderId);
      const html = renderDispatchSheetHtml(note, order);

      expect(html).toContain('COBRO CONTRAENTREGA: Q250.00');
      expect(html).toContain('COBRAR AL RECEPTOR: Q250.00');
      expect(html).toContain('Firma de Recibido Conforme');
    });
  });

  describe('Interacciones y Ciclo de Vida (onMount)', () => {
    beforeEach(() => {
      container.innerHTML = dispatchView.render();
      cleanup = dispatchView.onMount();
    });

    it('filtra remisiones por término de búsqueda en tiempo real', () => {
      const searchInput = document.getElementById('dispatchSearchInput');
      const cardsContainer = document.getElementById('dispatchCardsContainer');

      searchInput.value = 'Rodrigo';
      searchInput.dispatchEvent(new Event('input'));

      expect(cardsContainer.innerHTML).toContain('Rodrigo Méndez');
      expect(cardsContainer.innerHTML).not.toContain('Licda. Brenda');
    });

    it('filtra remisiones por estado', () => {
      const statusFilter = document.getElementById('dispatchStatusFilter');
      const cardsContainer = document.getElementById('dispatchCardsContainer');

      statusFilter.value = 'DELIVERED';
      statusFilter.dispatchEvent(new Event('change'));

      expect(cardsContainer.innerHTML).toContain('REM-2026-001');
      expect(cardsContainer.innerHTML).not.toContain('REM-2026-002');
    });

    it('filtra remisiones por método de envío', () => {
      const methodFilter = document.getElementById('dispatchMethodFilter');
      const cardsContainer = document.getElementById('dispatchCardsContainer');

      methodFilter.value = 'CARGO_EXPRESO';
      methodFilter.dispatchEvent(new Event('change'));

      expect(cardsContainer.innerHTML).toContain('Cargo Expreso');
      expect(cardsContainer.innerHTML).not.toContain('Moto Local');
    });

    it('restablece todos los filtros con el botón Limpiar', () => {
      const searchInput = document.getElementById('dispatchSearchInput');
      const statusFilter = document.getElementById('dispatchStatusFilter');
      const methodFilter = document.getElementById('dispatchMethodFilter');
      const btnReset = document.getElementById('btnResetDispatchFilters');

      searchInput.value = 'TextoInexistente';
      statusFilter.value = 'DELIVERED';
      methodFilter.value = 'GUATEX';
      btnReset.click();

      expect(searchInput.value).toBe('');
      expect(statusFilter.value).toBe('ALL');
      expect(methodFilter.value).toBe('ALL');
    });

    it('descarga el archivo CSV al pulsar Exportar CSV', () => {
      const spy = vi.spyOn(reportsEngine, 'downloadCSV').mockImplementation(() => true);
      const btnExport = document.getElementById('btnExportDispatchCSV');

      btnExport.click();
      expect(spy).toHaveBeenCalled();
      expect(spy.mock.calls[0][0]).toContain('kromalab_remisiones_despacho');
    });

    it('abre y cierra el modal de nueva remisión con el botón X y Cancelar', () => {
      const createModal = document.getElementById('createDispatchModal');
      const btnOpen = document.getElementById('btnOpenCreateDispatchModal');
      const btnClose = document.getElementById('btnCloseCreateDispatchModal');
      const btnCancel = document.getElementById('btnCancelCreateDispatch');

      expect(createModal.style.display).toBe('none');
      btnOpen.click();
      expect(createModal.style.display).toBe('block');
      btnClose.click();
      expect(createModal.style.display).toBe('none');

      btnOpen.click();
      expect(createModal.style.display).toBe('block');
      btnCancel.click();
      expect(createModal.style.display).toBe('none');
    });

    it('auto-completa datos del cliente al seleccionar una orden en el selector', () => {
      const selectOrder = document.getElementById('selectDispatchOrder');
      const clientInput = document.getElementById('inputDispatchClientName');
      const phoneInput = document.getElementById('inputDispatchClientPhone');
      const balanceInput = document.getElementById('inputPendingBalance');

      selectOrder.value = 'KL-00041';
      selectOrder.dispatchEvent(new Event('change'));

      expect(clientInput.value).toContain('Barbería Vintage');
      expect(phoneInput.value).toBe('+502 5111-2233');
      expect(parseFloat(balanceInput.value)).toBeGreaterThanOrEqual(0);

      // Si se selecciona orden vacía o inválida no rompe
      selectOrder.value = '';
      expect(() => selectOrder.dispatchEvent(new Event('change'))).not.toThrow();

      selectOrder.value = 'ORD-INEXISTENTE-99';
      expect(() => selectOrder.dispatchEvent(new Event('change'))).not.toThrow();
    });

    it('ignora submit de creación si el selector de orden está vacío', () => {
      const form = document.getElementById('formCreateDispatch');
      const selectOrder = document.getElementById('selectDispatchOrder');
      selectOrder.value = '';

      expect(() => {
        form.dispatchEvent(new Event('submit', { cancelable: true }));
      }).not.toThrow();
    });

    it('emite una nueva remisión al enviar el formulario y abre la hoja para imprimir', () => {
      const form = document.getElementById('formCreateDispatch');
      const selectOrder = document.getElementById('selectDispatchOrder');
      const clientInput = document.getElementById('inputDispatchClientName');
      const phoneInput = document.getElementById('inputDispatchClientPhone');
      const addressInput = document.getElementById('inputDispatchAddress');
      const sheetModal = document.getElementById('dispatchSheetModal');

      selectOrder.value = 'KL-00040';
      clientInput.value = 'Cliente Test Despacho';
      phoneInput.value = '+502 5555-9988';
      addressInput.value = 'Zona 4, Gran Vía';

      form.dispatchEvent(new Event('submit', { cancelable: true }));

      expect(sheetModal.style.display).toBe('block');
      expect(document.getElementById('dispatchSheetDocumentContainer').innerHTML).toContain('Cliente Test Despacho');
    });

    it('abre el modal de hoja de despacho al pulsar el botón de impresora en una fila y lo cierra', () => {
      const sheetModal = document.getElementById('dispatchSheetModal');
      const firstPrintBtn = document.querySelector('.btn-view-dispatch-sheet');
      const btnCloseSheet = document.getElementById('btnCloseDispatchSheetModal');
      const btnCancelSheet = document.getElementById('btnCancelDispatchSheetModal');

      firstPrintBtn.click();
      expect(sheetModal.style.display).toBe('block');
      expect(document.getElementById('dispatchSheetDocumentContainer').innerHTML).toContain('REMISIÓN DE DESPACHO');

      btnCloseSheet.click();
      expect(sheetModal.style.display).toBe('none');

      firstPrintBtn.click();
      expect(sheetModal.style.display).toBe('block');
      btnCancelSheet.click();
      expect(sheetModal.style.display).toBe('none');
    });

    it('lanza window.print al hacer click en Imprimir Hoja de Despacho', () => {
      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
      const btnPrint = document.getElementById('btnPrintDispatchSheet');

      btnPrint.click();
      expect(printSpy).toHaveBeenCalled();
    });

    it('abre el modal de cambio de estado y alterna visibilidad de campos de ruta y entrega', () => {
      const updateModal = document.getElementById('updateDispatchStatusModal');
      const firstStatusBtn = document.querySelector('.btn-status-dispatch');
      const btnCloseUpdate = document.getElementById('btnCloseUpdateStatusModal');
      const btnCancelUpdate = document.getElementById('btnCancelUpdateStatus');

      firstStatusBtn.click();
      expect(updateModal.style.display).toBe('block');

      const selectStatus = document.getElementById('selectNewDispatchStatus');
      const inTransitGroup = document.getElementById('inTransitFieldsGroup');
      const deliveredGroup = document.getElementById('deliveredFieldsGroup');

      selectStatus.value = 'IN_TRANSIT';
      selectStatus.dispatchEvent(new Event('change'));
      expect(inTransitGroup.style.display).toBe('block');
      expect(deliveredGroup.style.display).toBe('none');

      selectStatus.value = 'DELIVERED';
      selectStatus.dispatchEvent(new Event('change'));
      expect(inTransitGroup.style.display).toBe('none');
      expect(deliveredGroup.style.display).toBe('block');

      selectStatus.value = 'PREPARED';
      selectStatus.dispatchEvent(new Event('change'));
      expect(inTransitGroup.style.display).toBe('none');
      expect(deliveredGroup.style.display).toBe('none');

      btnCloseUpdate.click();
      expect(updateModal.style.display).toBe('none');

      firstStatusBtn.click();
      btnCancelUpdate.click();
      expect(updateModal.style.display).toBe('none');
    });

    it('guarda el nuevo estado y actualiza el store al enviar formUpdateDispatchStatus', () => {
      const updateModal = document.getElementById('updateDispatchStatusModal');
      const firstStatusBtn = document.querySelector('.btn-status-dispatch');
      const targetNoteId = firstStatusBtn.dataset.noteId;

      firstStatusBtn.click();
      const selectStatus = document.getElementById('selectNewDispatchStatus');
      const receiverInput = document.getElementById('inputStatusReceivedBy');
      const idDocInput = document.getElementById('inputStatusReceiverIdDoc');
      const form = document.getElementById('formUpdateDispatchStatus');

      selectStatus.value = 'DELIVERED';
      selectStatus.dispatchEvent(new Event('change'));
      receiverInput.value = 'Juan Carlos Receptor';
      idDocInput.value = 'DPI 1234 56789 0101';

      form.dispatchEvent(new Event('submit', { cancelable: true }));

      expect(updateModal.style.display).toBe('none');
      const updatedNote = dispatchStore.getDispatchNoteById(targetNoteId);
      expect(updatedNote.status).toBe('DELIVERED');
      expect(updatedNote.receivedBy).toBe('Juan Carlos Receptor');
    });

    it('ignora submit de actualización si falta noteId o nuevo estado', () => {
      const form = document.getElementById('formUpdateDispatchStatus');
      const noteIdInput = document.getElementById('inputUpdateStatusNoteId');
      noteIdInput.value = '';

      expect(() => {
        form.dispatchEvent(new Event('submit', { cancelable: true }));
      }).not.toThrow();
    });

    it('elimina una remisión tras confirmación del usuario', () => {
      vi.spyOn(window, 'confirm').mockImplementation(() => true);
      const deleteBtn = document.querySelector('.btn-delete-dispatch');
      const noteId = deleteBtn.dataset.noteId;

      deleteBtn.click();
      expect(dispatchStore.getDispatchNoteById(noteId)).toBeNull();
    });

    it('cancela la eliminación si el usuario rechaza el confirm', () => {
      vi.spyOn(window, 'confirm').mockImplementation(() => false);
      const deleteBtn = document.querySelector('.btn-delete-dispatch');
      const noteId = deleteBtn.dataset.noteId;

      deleteBtn.click();
      expect(dispatchStore.getDispatchNoteById(noteId)).toBeTruthy();
    });

    it('reacciona a notificaciones de dispatchStore y ordersStore', () => {
      const initialCards = document.querySelectorAll('#dispatchCardsContainer .dispatch-card').length;
      dispatchStore.createDispatchNote({
        orderId: 'KL-00042',
        clientName: 'Reactivity Test Client',
      });

      const updatedCards = document.querySelectorAll('#dispatchCardsContainer .dispatch-card').length;
      expect(updatedCards).toBeGreaterThan(initialCards);

      // Notificación de ordersStore
      expect(() => ordersStore._notify()).not.toThrow();

      // Cambio interactivo de estado desde selector (.select-dispatch-status)
      const statusSelect = document.querySelector('.select-dispatch-status');
      if (statusSelect) {
        const noteId = statusSelect.dataset.noteId;
        statusSelect.value = 'IN_TRANSIT';
        statusSelect.dispatchEvent(new Event('change'));
        expect(dispatchStore.getDispatchNoteById(noteId).status).toBe('IN_TRANSIT');

        const freshSelect = document.querySelector(`.select-dispatch-status[data-note-id="${noteId}"]`);
        freshSelect.value = 'DELIVERED';
        freshSelect.dispatchEvent(new Event('change'));
        expect(document.getElementById('updateDispatchStatusModal').style.display).toBe('block');

        // Si ya está DELIVERED y abrimos el modal de estado, conserva DELIVERED (líneas 585-586)
        dispatchStore.updateDispatchStatus(noteId, 'DELIVERED', { receivedBy: 'Receptor Final', receiverIdDoc: '1234' });
        const btnStatus = document.querySelector(`.btn-status-dispatch[data-note-id="${noteId}"]`);
        if (btnStatus) btnStatus.click();
        expect(document.getElementById('selectNewDispatchStatus').value).toBe('DELIVERED');

        // Fallback window.print si sheetContainer está vacío (líneas 550-551)
        const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
        document.getElementById('dispatchSheetDocumentContainer').innerHTML = '';
        document.getElementById('btnPrintDispatchSheet').click();
        expect(printSpy).toHaveBeenCalled();

        // Cobertura de ramas en renderDispatchSheetHtml (sin order, bultos plurales, saldo pendiente, items con 0m)
        const sheetUnpaid = renderDispatchSheetHtml(
          {
            id: 'REM-TEST-99',
            orderId: 'KL-9999',
            dispatchedAt: new Date().toISOString(),
            dispatchedBy: 'Miguel Dubois',
            clientName: 'Cliente Prueba',
            clientPhone: '5555-1234',
            deliveryMethod: 'UNKNOWN_METHOD',
            packageType: 'UNKNOWN_PACK',
            packagesCount: 3,
            courierName: '',
            trackingNumber: '',
            deliveryAddress: 'Zona 10',
            shippingCostQ: 35,
            shippingPaidBy: 'Cliente',
            totalOrderMeters: 0,
            totalOrderAmountQ: 300,
            pendingBalanceQ: 150,
            receivedBy: 'Juan',
            receiverIdDoc: '9876543210101',
          },
          {
            customer: { nit: '' },
            metrics: { tierRate: 0 },
            items: [
              { title: 'Item A', widthCm: 5, heightCm: 5, qty: 10, actualLinearMeters: 0, finishType: '', includeCutting: true },
            ],
          }
        );
        expect(sheetUnpaid).toContain('COBRO CONTRAENTREGA: Q150.00');
        expect(sheetUnpaid).toContain('3 bultos');
        expect(sheetUnpaid).toContain('(DPI: 9876543210101)');

        // Cobertura de ramas en renderDispatchCardsHtml (CANCELLED, sin teléfono, método/empaque desconocido) y renderDispatchSheetHtml sin order
        const cardsFallback = renderDispatchCardsHtml([
          {
            id: 'REM-CARD-99',
            orderId: 'KL-9999',
            dispatchedAt: new Date().toISOString(),
            status: 'CANCELLED',
            deliveryMethod: 'UNKNOWN',
            packageType: 'UNKNOWN',
            clientName: 'Cliente Sin Tel',
            clientPhone: '',
            trackingNumber: '',
            deliveryAddress: 'Guatemala',
            totalOrderMeters: 5,
            packagesCount: 1,
            totalOrderAmountQ: 150,
            pendingBalanceQ: 0,
          },
          {
            id: 'REM-CARD-100',
            orderId: 'KL-1000',
            dispatchedAt: new Date().toISOString(),
            status: 'UNKNOWN_STATUS',
            deliveryMethod: 'MOTO_LOCAL',
            packageType: 'RIGID_TUBE',
            clientName: 'Cliente Con Guía',
            clientPhone: '5555-9999',
            trackingNumber: 'GUIA-ABC',
            deliveryAddress: 'Mixco',
            totalOrderMeters: 10,
            packagesCount: 2,
            totalOrderAmountQ: 300,
            pendingBalanceQ: 50,
          },
        ]);
        expect(cardsFallback).toContain('Sin teléfono');
        expect(cardsFallback).toContain('Guía: GUIA-ABC');

        const sheetNoOrder = renderDispatchSheetHtml({
          id: 'REM-NO-ORD',
          orderId: 'KL-0000',
          dispatchedAt: new Date().toISOString(),
          dispatchedBy: 'Miguel Dubois',
          clientName: 'Cliente Pagado',
          clientPhone: '5555-0000',
          deliveryMethod: 'MOTO_LOCAL',
          packageType: 'RIGID_TUBE',
          packagesCount: 1,
          courierName: 'Mensajero Kroma',
          trackingNumber: 'TRK-01',
          deliveryAddress: 'Villa Nueva',
          shippingCostQ: 0,
          shippingPaidBy: 'Kroma Lab',
          totalOrderMeters: 5,
          totalOrderAmountQ: 150,
          pendingBalanceQ: 0,
          receivedBy: '',
          receiverIdDoc: '',
        });
        expect(sheetNoOrder).toContain('1 bulto');
        expect(sheetNoOrder).toContain('Firma de Recibido Conforme');
      }
    });
  });
});
