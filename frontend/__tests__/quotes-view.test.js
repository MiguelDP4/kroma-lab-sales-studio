import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { quotesView, resetQuotesViewFilters } from '../src/js/views/quotes-view.js';
import { quotesStore } from '../src/js/modules/quotes-store.js';
import { cartStore } from '../src/js/modules/cart-store.js';
import { store } from '../src/js/store.js';

describe('QuotesView — Interfaz de Cotizaciones Guardadas y Conversión a Orden', () => {
  beforeEach(() => {
    localStorage.clear();
    quotesStore.resetToDefaults();
    resetQuotesViewFilters();
    store.state.user = { role: 'ADMIN', name: 'Miguel Dubois' };
    vi.spyOn(quotesStore, 'syncWithApi').mockResolvedValue([]);
    document.body.innerHTML = `<div id="app">${quotesView.render()}</div>`;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('renderiza encabezado, tarjetas KPI, pestañas de filtro y tarjetas de cotizaciones', () => {
    const html = quotesView.render();
    expect(html).toContain('Cotizaciones Guardadas');
    expect(html).toContain('Total Cotizadas');
    expect(html).toContain('Guardadas (Pendientes)');
    expect(html).toContain('Convertidas a Orden');
    expect(html).toContain('COT-2026-001');
    expect(html).toContain('Stickers Termos Stanley 8x5cm');
  });

  it('renderiza estado vacío cuando no existen cotizaciones', () => {
    quotesStore.quotes = [];
    const html = quotesView.render();
    expect(html).toContain('No se encontraron cotizaciones');
    expect(html).toContain('Ir al Cotizador UV DTF');
  });

  it('ejecuta onMount, sincroniza con API y retorna función de limpieza', () => {
    const cleanup = quotesView.onMount();

    expect(quotesStore.syncWithApi).toHaveBeenCalled();
    expect(typeof cleanup).toBe('function');
    cleanup();
  });

  it('filtra cotizaciones al pulsar las pestañas de estado (SAVED, CONVERTED, ALL)', () => {
    quotesView.onMount();

    const tabSaved = document.querySelector('.filter-quote-tab[data-filter="SAVED"]');
    expect(tabSaved).not.toBeNull();
    tabSaved.click();

    const container = document.getElementById('quotesListContainer');
    expect(container.textContent).toContain('Stickers Termos Stanley');

    const tabConverted = document.querySelector('.filter-quote-tab[data-filter="CONVERTED"]');
    tabConverted.click();
    expect(container.textContent).toContain('Logos Acrílico 5x5cm');
  });

  it('filtra cotizaciones en tiempo real mediante el buscador', () => {
    quotesView.onMount();

    const searchInput = document.getElementById('inputSearchQuotes');
    expect(searchInput).not.toBeNull();

    searchInput.value = 'Miel Pura Inexistente';
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));

    const container = document.getElementById('quotesListContainer');
    expect(container.textContent).toContain('No se encontraron cotizaciones');
  });

  it('convierte una cotización guardada a orden en 1 clic al pulsar .btn-convert-quote', async () => {
    vi.spyOn(quotesStore, 'convertToOrder').mockImplementation(async (id) => {
      const q = quotesStore.getQuoteById(id);
      q.status = 'CONVERTED';
      q.convertedOrderId = 'ord_test_001';
      q.convertedOrderCode = 'KL-2026-999';
      return {
        success: true,
        order: { id: 'ord_test_001', code: 'KL-2026-999' },
        quote: q,
      };
    });

    quotesView.onMount();

    const btnConvert = document.querySelector('.btn-convert-quote[data-quote-id="qt_001"]');
    expect(btnConvert).not.toBeNull();

    btnConvert.click();

    await vi.waitFor(() => {
      const feedback = document.getElementById('quotesViewFeedback');
      expect(feedback.textContent).toContain('convertida exitosamente');
    });

    const quote = quotesStore.getQuoteById('qt_001');
    expect(quote.status).toBe('CONVERTED');
  });

  it('elimina una cotización al pulsar .btn-delete-quote', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    quotesView.onMount();

    const btnDelete = document.querySelector('.btn-delete-quote[data-quote-id="qt_003"]');
    expect(btnDelete).not.toBeNull();

    btnDelete.click();

    const feedback = document.getElementById('quotesViewFeedback');
    expect(feedback.textContent).toContain('eliminada exitosamente');
    expect(quotesStore.getQuoteById('qt_003')).toBeNull();
  });

  it('cancela la eliminación si el usuario rechaza confirm', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    quotesView.onMount();

    const btnDelete = document.querySelector('.btn-delete-quote[data-quote-id="qt_003"]');
    expect(btnDelete).not.toBeNull();

    btnDelete.click();

    expect(quotesStore.getQuoteById('qt_003')).not.toBeNull();
  });

  it('carga especificaciones en cotizador al pulsar .btn-load-quoter', () => {
    vi.useFakeTimers();
    const mockW = document.createElement('input');
    mockW.id = 'stickerWidth';
    const mockH = document.createElement('input');
    mockH.id = 'stickerHeight';
    const mockQ = document.createElement('input');
    mockQ.id = 'stickerQty';
    const mockC = document.createElement('input');
    mockC.id = 'optCutting';
    mockC.type = 'checkbox';
    document.body.appendChild(mockW);
    document.body.appendChild(mockH);
    document.body.appendChild(mockQ);
    document.body.appendChild(mockC);

    quotesView.onMount();

    const btnLoad = document.querySelector('.btn-load-quoter');
    expect(btnLoad).not.toBeNull();

    btnLoad.click();
    expect(window.location.hash).toBe('#/');

    vi.advanceTimersByTime(200);
    expect(mockW.value).toBe(btnLoad.dataset.width);
    expect(mockH.value).toBe(btnLoad.dataset.height);
    expect(mockQ.value).toBe(btnLoad.dataset.qty);

    vi.useRealTimers();
  });

  it('muestra mensaje de error si falla la conversión de una cotización', async () => {
    vi.spyOn(quotesStore, 'convertToOrder').mockRejectedValueOnce(new Error('Fallo de conexión'));
    quotesView.onMount();

    const btnConvert = document.querySelector('.btn-convert-quote[data-quote-id="qt_001"]');
    expect(btnConvert).not.toBeNull();

    btnConvert.click();

    await vi.waitFor(() => {
      const feedback = document.getElementById('quotesViewFeedback');
      expect(feedback.textContent).toContain('Fallo de conexión');
    });

    // Caso cuando el error lanzado no tiene mensaje
    vi.spyOn(quotesStore, 'convertToOrder').mockRejectedValueOnce({});
    btnConvert.click();
    await vi.waitFor(() => {
      const feedback = document.getElementById('quotesViewFeedback');
      expect(feedback.textContent).toContain('Error al convertir cotización');
    });
  });

  it('no muestra el botón de convertir a producción si el usuario es CUSTOMER', () => {
    store.state.user = { role: 'CUSTOMER', name: 'Cliente B2B' };
    document.body.innerHTML = `<div id="app">${quotesView.render()}</div>`;
    quotesView.onMount();

    const btnConvert = document.querySelector('.btn-convert-quote');
    expect(btnConvert).toBeNull();
    expect(document.body.innerHTML).toContain('Pendiente de Confirmación');
  });

  it('muestra mensaje de error si falla la eliminación de una cotización', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(quotesStore, 'deleteQuote').mockImplementationOnce(() => {
      throw new Error('Error de prueba al eliminar');
    });
    quotesView.onMount();

    const btnDelete = document.querySelector('.btn-delete-quote[data-quote-id="qt_003"]');
    expect(btnDelete).not.toBeNull();

    btnDelete.click();

    const feedback = document.getElementById('quotesViewFeedback');
    expect(feedback.textContent).toContain('Error de prueba al eliminar');

    // Caso cuando el error lanzado no tiene mensaje
    vi.spyOn(quotesStore, 'deleteQuote').mockImplementationOnce(() => {
      throw {};
    });
    btnDelete.click();
    expect(feedback.textContent).toContain('Error al eliminar cotización');
  });

  it('elimina cotización sin nombre asignando texto por defecto en diálogo de confirmación', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const newQ = quotesStore.createQuote({
      projectName: '',
      leadName: 'Anónimo',
      leadPhone: '+502 5555-1111',
    });
    newQ.projectName = null;
    newQ.code = null;

    document.body.innerHTML = `<div id="app">${quotesView.render()}</div>`;
    quotesView.onMount();

    const btnDelete = document.querySelector(`.btn-delete-quote[data-quote-id="${newQ.id}"]`);
    if (btnDelete) {
      btnDelete.click();
      expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('esta cotización'));
    }
  });

  it('ignora clics en áreas neutrales del contenedor de cotizaciones', () => {
    quotesView.onMount();
    const container = document.getElementById('quotesListContainer');
    expect(container).not.toBeNull();

    // Clic en el contenedor general sin botón
    container.click();
    const feedback = document.getElementById('quotesViewFeedback');
    expect(feedback.style.display).toBe('none');
  });

  it('no renderiza recuadro redundante de snapshot de bobina en las tarjetas de cotización', () => {
    quotesStore.createQuote({
      projectName: 'Proyecto con Snapshot',
      leadName: 'Cliente Bobina',
      leadPhone: '+502 5555-7777',
      widthCm: 6,
      heightCm: 6,
      qty: 60,
      linearMeters: 1.0,
      canvasSnapshot: 'data:image/png;base64,mockFullSnapshotData',
    });

    document.body.innerHTML = `<div id="app">${quotesView.render()}</div>`;
    quotesView.onMount();

    const snapshotBox = document.querySelector('.quote-snapshot-box');
    expect(snapshotBox).toBeNull();
  });

  it('no muestra el chip de barniz ni botón de WhatsApp, y permite agregar la cotización al carrito sin eliminarla', () => {
    quotesStore.quotes = [
      {
        id: 'q-cart-test',
        code: 'COT-CART-001',
        projectName: 'Prueba Carrito Quote',
        leadName: 'María López',
        leadPhone: '50255551234',
        widthCm: 5,
        heightCm: 5,
        qty: 100,
        linearMeters: 1.0,
        totalPriceQ: 140,
        withCutting: false,
        status: 'SAVED',
        fileUrl: 'https://pub-r2.dev/assets/quotes/maria_logo.png',
        canvasSnapshotUrl: 'https://pub-r2.dev/assets/quotes/maria_esquema.png',
        createdAt: new Date().toISOString(),
      },
    ];

    document.body.innerHTML = `<div id="app">${quotesView.render()}</div>`;
    quotesView.onMount();

    // 1. Verificar que NO hay botón de WhatsApp en la tarjeta de cotización
    expect(document.querySelector('a.btn-whatsapp')).toBeNull();

    // 2. Verificar que NO está el chip "✨ Barniz Relieve 3D"
    expect(document.body.innerHTML).not.toContain('Barniz Relieve 3D');

    // 3. Verificar botón de agregar al carrito y ausencia de caja redundante de arte
    expect(document.querySelector('.quote-artwork-box')).toBeNull();

    const btnAddToCart = document.querySelector('.btn-add-quote-to-cart');
    expect(btnAddToCart).not.toBeNull();

    cartStore.clearCart();
    expect(cartStore.getItems().length).toBe(0);

    btnAddToCart.click();

    // 4. Se agregó al carrito conservando la imagen y metadatos de archivo
    const cartItems = cartStore.getItems();
    expect(cartItems.length).toBe(1);
    expect(cartItems[0].title).toBe('Prueba Carrito Quote');
    expect(cartItems[0].widthCm).toBe(5);
    expect(cartItems[0].qty).toBe(100);
    expect(cartItems[0].fileUrl).toBe('https://pub-r2.dev/assets/quotes/maria_logo.png');
    expect(cartItems[0].previewUrl).toBe('https://pub-r2.dev/assets/quotes/maria_logo.png');
    expect(cartItems[0].fileInfo).not.toBeNull();
    expect(cartItems[0].fileInfo.fileUrl).toBe('https://pub-r2.dev/assets/quotes/maria_logo.png');

    // 5. La cotización NO se eliminó de quotesStore
    expect(quotesStore.getQuoteById('q-cart-test')).not.toBeNull();
  });
  it('muestra badge "Sin cuenta asignada" para cotizaciones anónimas y permite a Admin asignarla a una cuenta', () => {
    quotesStore.quotes = [{
      id: 'qt_unassigned_01',
      code: 'COT-2026-901',
      projectName: 'Proyecto Sin Cuenta',
      leadName: 'Cliente WhatsApp',
      leadPhone: '+502 5555-0000',
      leadEmail: null,
      companyName: null,
      widthCm: 10,
      heightCm: 10,
      qty: 50,
      linearMeters: 1.5,
      stickersPerRow: 2,
      rows: 25,
      unitRateQ: 140,
      materialPriceQ: 210,
      cuttingPriceQ: 0,
      totalPriceQ: 210,
      withCutting: false,
      status: 'SAVED',
      createdAt: new Date().toISOString(),
    }];

    document.body.innerHTML = `<div id="app">${quotesView.render()}</div>`;
    quotesView.onMount();

    // 1. Verificar badge de sin cuenta
    expect(document.body.innerHTML).toContain('Sin cuenta asignada');

    // 2. Abrir modal de asignación
    const btnAssign = document.querySelector('.btn-assign-quote[data-quote-id="qt_unassigned_01"]');
    expect(btnAssign).not.toBeNull();
    btnAssign.click();

    const assignModal = document.getElementById('assignQuoteModal');
    expect(assignModal.style.display).toBe('block');

    // 3. Completar formulario de asignación
    const nameInput = document.getElementById('assignLeadName');
    const compInput = document.getElementById('assignCompanyName');
    const emailInput = document.getElementById('assignLeadEmail');
    const phoneInput = document.getElementById('assignLeadPhone');

    nameInput.value = 'Carlos Gómez';
    compInput.value = 'Publicidad Express';
    emailInput.value = 'carlos@express.gt';
    phoneInput.value = '+502 5555-9876';

    const formAssign = document.getElementById('formAssignQuote');
    formAssign.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    // 4. Verificar que se actualizó en quotesStore
    const updated = quotesStore.getQuoteById('qt_unassigned_01');
    expect(updated.leadName).toBe('Carlos Gómez');
    expect(updated.companyName).toBe('Publicidad Express');
    expect(updated.leadEmail).toBe('carlos@express.gt');
    expect(updated.leadPhone).toBe('+502 5555-9876');

    // 5. Verificar feedback de éxito
    const feedback = document.getElementById('quotesViewFeedback');
    expect(feedback.textContent).toContain('asignada exitosamente a Carlos Gómez');
  });

  it('muestra modal de conversión para cotizaciones sin cuenta y permite crear pedido sin cuenta asignada en 1 clic', async () => {
    vi.spyOn(quotesStore, 'convertToOrder').mockResolvedValue({
      success: true,
      order: { id: 'ord_unassigned_001', code: 'KL-2026-888' },
    });

    quotesStore.quotes = [{
      id: 'qt_unassigned_02',
      code: 'COT-2026-902',
      projectName: 'Proyecto Mostrador Directo',
      leadName: 'Cliente Mostrador',
      leadPhone: '+502 5555-1111',
      leadEmail: null,
      companyName: null,
      widthCm: 5,
      heightCm: 5,
      qty: 100,
      linearMeters: 1.0,
      stickersPerRow: 5,
      rows: 20,
      unitRateQ: 140,
      materialPriceQ: 140,
      cuttingPriceQ: 0,
      totalPriceQ: 140,
      withCutting: false,
      status: 'SAVED',
      createdAt: new Date().toISOString(),
    }];

    document.body.innerHTML = `<div id="app">${quotesView.render()}</div>`;
    quotesView.onMount();

    // 1. Clic en botón convertir
    const btnConvert = document.querySelector('.btn-convert-quote[data-quote-id="qt_unassigned_02"]');
    expect(btnConvert).not.toBeNull();
    btnConvert.click();

    // 2. Verificar que se abrió el modal de advertencia de sin cuenta
    const modal = document.getElementById('unassignedConvertModal');
    expect(modal.style.display).toBe('block');

    // 3. Clic en crear pedido sin cuenta asignada
    const btnDirect = document.getElementById('btnConvertDirectUnassigned');
    expect(btnDirect).not.toBeNull();
    btnDirect.click();

    await vi.waitFor(() => {
      expect(quotesStore.convertToOrder).toHaveBeenCalledWith('qt_unassigned_02');
    });
  });
});
