import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { inventoryView } from '../src/js/views/inventory-view.js';
import { inventoryStore, STOCK_STATUS } from '../src/js/modules/inventory-store.js';
import { store } from '../src/js/store.js';

describe('Inventory View — Interfaz de Control de Inventario y Stock de Taller', () => {
  let cleanupFn = null;

  beforeEach(() => {
    localStorage.clear();
    inventoryStore.resetToInitial();
    store.setUser({ id: 'USR_ADMIN', role: 'ADMIN', name: 'Administrador' }, 'token');

    // Mocks para Blob y URL en jsdom
    if (typeof window.URL.createObjectURL === 'undefined') {
      window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      window.URL.revokeObjectURL = vi.fn();
    }

    document.body.innerHTML = `
      <main id="app">
        ${inventoryView.render()}
      </main>
    `;
    cleanupFn = inventoryView.onMount();
  });

  afterEach(() => {
    if (cleanupFn) cleanupFn();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('renderiza la cabecera, indicadores KPI, cuadrícula de insumos y tabla de Kardex', () => {
    const h1 = document.querySelector('h1');
    expect(h1.textContent).toContain('Inventario de Insumos de Taller');

    // Botones de acción principales
    expect(document.getElementById('btnOpenRestockModal')).not.toBeNull();
    expect(document.getElementById('btnExportKardexCSV')).not.toBeNull();

    // KPIs de resumen
    const summary = document.getElementById('inventorySummaryContainer');
    expect(summary.textContent).toContain('Valor Total Bodega');
    expect(summary.textContent).toContain('Alertas de Stock');
    expect(summary.textContent).toContain('Film Disponible');
    expect(summary.textContent).toContain('Tintas UV en Taller');

    // Cuadrícula de insumos
    const grid = document.getElementById('inventoryGrid');
    expect(grid.children.length).toBe(7);
    expect(grid.textContent).toContain('Film A Base PET');
    expect(grid.textContent).toContain('Tinta UV Industrial CMYK');

    // Tabla Kardex
    const tableRows = document.querySelectorAll('#kardexTableBody tr');
    expect(tableRows.length).toBeGreaterThan(0);
  });

  it('filtra los insumos de la cuadrícula por categoría seleccionada', () => {
    const btnInk = document.querySelector('button[data-category="INK"]');
    const btnAll = document.querySelector('button[data-category="ALL"]');
    const grid = document.getElementById('inventoryGrid');

    // Filtrar por TINTAS UV
    btnInk.click();
    expect(btnInk.className).toContain('btn-primary');
    expect(grid.children.length).toBe(3); // CMYK, White, Varnish
    expect(grid.textContent).toContain('Tinta UV Industrial CMYK');
    expect(grid.textContent).not.toContain('Film A Base PET');

    // Regresar a TODOS
    btnAll.click();
    expect(grid.children.length).toBe(7);
  });

  it('abre y cierra el modal de reabastecimiento con el botón de cabecera y botón de cancelar', () => {
    const modal = document.getElementById('restockModal');
    const btnOpen = document.getElementById('btnOpenRestockModal');
    const btnClose = document.getElementById('btnCloseRestockModal');
    const btnCancel = document.getElementById('btnCancelRestockModal');

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

  it('abre el modal de reabastecimiento pre-seleccionando el insumo desde la tarjeta', () => {
    const modal = document.getElementById('restockModal');
    const quickBtn = document.querySelector('.btn-quick-restock[data-item-id="ink_white"]');
    const select = document.getElementById('restockItemId');
    const unitLabel = document.getElementById('restockUnitLabel');

    quickBtn.click();
    expect(modal.style.display).toBe('block');
    expect(select.value).toBe('ink_white');
    expect(unitLabel.textContent).toContain('ml');
  });

  it('registra una entrada/compra exitosamente desde el formulario del modal', () => {
    const btnOpen = document.getElementById('btnOpenRestockModal');
    const form = document.getElementById('formRestock');
    const select = document.getElementById('restockItemId');
    const qtyInput = document.getElementById('restockQuantity');
    const costInput = document.getElementById('restockCostQ');
    const supplierInput = document.getElementById('restockSupplier');
    const invoiceInput = document.getElementById('restockInvoice');
    const notesInput = document.getElementById('restockNotes');

    btnOpen.click();
    select.value = 'film_a';
    qtyInput.value = '100';
    costInput.value = '600';
    supplierInput.value = 'Audley Import';
    invoiceInput.value = 'FAC-555';
    notesInput.value = 'Rollo nuevo en bodega';

    form.dispatchEvent(new Event('submit', { cancelable: true }));

    // Modal se cierra
    expect(document.getElementById('restockModal').style.display).toBe('none');

    // Stock se actualizó
    const filmA = inventoryStore.getItemById('film_a');
    expect(filmA.currentStock).toBe(185.0 + 100.0);

    // Movimiento en Kardex
    const kardexText = document.getElementById('kardexTableBody').textContent;
    expect(kardexText).toContain('Rollo nuevo en bodega');
    expect(kardexText).toContain('FAC-555');
  });

  it('abre el modal de ajuste físico y actualiza el stock real', () => {
    const modal = document.getElementById('adjustStockModal');
    const quickAdjustBtn = document.querySelector('.btn-quick-adjust[data-item-id="plotter_blades"]');
    const form = document.getElementById('formAdjustStock');
    const newStockInput = document.getElementById('adjustNewStock');
    const reasonSelect = document.getElementById('adjustReason');
    const notesInput = document.getElementById('adjustNotes');

    quickAdjustBtn.click();
    expect(modal.style.display).toBe('block');
    expect(document.getElementById('adjustItemName').textContent).toContain('Navajas de Corte');

    newStockInput.value = '5'; // Se contaron 5 navajas (antes eran 8)
    reasonSelect.value = 'Desgaste prematuro de cuchilla';
    notesInput.value = '3 navajas descartadas';

    form.dispatchEvent(new Event('submit', { cancelable: true }));

    expect(modal.style.display).toBe('none');

    const updated = inventoryStore.getItemById('plotter_blades');
    expect(updated.currentStock).toBe(5);

    // Reflejado en Kardex
    const kardexText = document.getElementById('kardexTableBody').textContent;
    expect(kardexText).toContain('3 navajas descartadas');
  });

  it('cierra el modal de ajuste con los botones de cerrar y cancelar', () => {
    const modal = document.getElementById('adjustStockModal');
    const quickAdjustBtn = document.querySelector('.btn-quick-adjust[data-item-id="film_a"]');
    const btnClose = document.getElementById('btnCloseAdjustModal');
    const btnCancel = document.getElementById('btnCancelAdjustModal');

    quickAdjustBtn.click();
    expect(modal.style.display).toBe('block');

    btnClose.click();
    expect(modal.style.display).toBe('none');

    quickAdjustBtn.click();
    expect(modal.style.display).toBe('block');

    btnCancel.click();
    expect(modal.style.display).toBe('none');
  });

  it('filtra la tabla de Kardex por tipo de movimiento y por búsqueda', () => {
    const searchInput = document.getElementById('kardexSearchInput');
    const typeFilter = document.getElementById('kardexTypeFilter');
    const tbody = document.getElementById('kardexTableBody');

    // Filtrar por salidas de producción
    typeFilter.value = 'OUT_PRODUCTION';
    typeFilter.dispatchEvent(new Event('change'));

    expect(tbody.textContent).toContain('Salida por Tiraje');

    // Filtrar por búsqueda
    searchInput.value = 'KL-00039';
    searchInput.dispatchEvent(new Event('input'));

    expect(tbody.textContent).toContain('KL-00039');

    // Búsqueda sin coincidencias
    searchInput.value = 'inexistente_xyz_123';
    searchInput.dispatchEvent(new Event('input'));

    expect(tbody.textContent).toContain('No se encontraron movimientos registrados en el Kardex');
  });

  it('exporta el Kardex a CSV al pulsar el botón de exportación', () => {
    vi.useFakeTimers();
    const btnExport = document.getElementById('btnExportKardexCSV');
    const toast = document.getElementById('inventoryToast');
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    btnExport.click();
    expect(clickSpy).toHaveBeenCalled();
    expect(toast.textContent).toContain('Kardex de inventario exportado exitosamente');
    expect(toast.style.display).toBe('block');

    vi.advanceTimersByTime(3600);
    expect(toast.style.display).toBe('none');

    clickSpy.mockRestore();
    vi.useRealTimers();
  });

  it('maneja excepciones al exportar Kardex a CSV mostrando notificación de error', () => {
    vi.useFakeTimers();
    const btnExport = document.getElementById('btnExportKardexCSV');
    const toast = document.getElementById('inventoryToast');
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const storeSpy = vi.spyOn(inventoryStore, 'exportKardexCSV').mockImplementation(() => {
      throw new Error('Kardex CSV Error');
    });

    btnExport.click();
    expect(toast.textContent).toContain('Ocurrió un error al generar el Kardex en CSV');
    expect(toast.style.display).toBe('block');

    vi.advanceTimersByTime(3600);
    expect(toast.style.display).toBe('none');

    storeSpy.mockRestore();
    errSpy.mockRestore();
    vi.useRealTimers();
  });

  it('reacciona en tiempo real cuando se actualiza inventoryStore', () => {
    const summary = document.getElementById('inventorySummaryContainer');

    // Realizar ajuste directo en el store
    inventoryStore.recordRestock({
      itemId: 'film_a',
      quantity: 50,
      costTotalQ: 300,
    });

    expect(summary.textContent).toContain('395.0 m');
    expect(document.getElementById('inventoryGrid').textContent).toContain('235.0');
  });

  it('muestra estado vacío si una categoría no contiene insumos', () => {
    // Vaciar temporalmente una categoría
    inventoryStore.items = inventoryStore.items.filter(it => it.category !== 'BLADE');
    inventoryStore._notify();

    const btnBlade = document.querySelector('button[data-category="BLADE"]');
    btnBlade.click();

    const grid = document.getElementById('inventoryGrid');
    expect(grid.textContent).toContain('No hay insumos en esta categoría');
  });

  it('aplica fallbacks seguros al enviar reabastecimiento o ajustes con campos vacíos o cero', () => {
    const formRestock = document.getElementById('formRestock');
    const selectRestock = document.getElementById('restockItemId');
    selectRestock.value = 'film_a';
    document.getElementById('restockQuantity').value = '';
    document.getElementById('restockCostQ').value = '';
    document.getElementById('restockSupplier').value = '';
    document.getElementById('restockInvoice').value = '';
    document.getElementById('restockNotes').value = '';

    formRestock.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(document.getElementById('restockModal').style.display).toBe('none');

    const formAdjust = document.getElementById('formAdjustStock');
    document.getElementById('adjustItemId').value = 'film_a';
    document.getElementById('adjustNewStock').value = '';
    document.getElementById('adjustNotes').value = '';

    formAdjust.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(document.getElementById('adjustStockModal').style.display).toBe('none');
  });

  it('renderiza alertas críticas y de nivel bajo en los KPIs cuando hay desabastecimiento', () => {
    inventoryStore.recordManualAdjustment({
      itemId: 'film_a',
      newStock: 0,
      reason: 'Agotado total',
    });
    inventoryStore.recordManualAdjustment({
      itemId: 'film_b',
      newStock: 35, // Nivel bajo (30 < 35 <= 45)
      reason: 'Bajo stock',
    });

    const summary = document.getElementById('inventorySummaryContainer');
    expect(summary.textContent).toContain('1 Críticos');
    expect(summary.textContent).toContain('insumos en nivel bajo');
  });

  it('maneja items con categoría no estándar y movimientos de kardex sin notas ni referencia', () => {
    inventoryStore.items.push({
      id: 'custom_cleaner',
      name: 'Limpiador Especial',
      category: 'OTHER_EQUIP',
      unit: 'litros',
      currentStock: 10,
      minThreshold: 2,
      criticalThreshold: 1,
      costPerUnitQ: 50,
      packageSize: 1,
      supplier: 'Generic',
      location: 'Estante 3',
      lastRestockDate: new Date().toISOString(),
      status: 'OPTIMAL',
      statusMeta: { badge: '🟢 Óptimo', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', border: '#10b981' },
      stockPercent: 100,
      totalValueQ: 500,
    });

    inventoryStore.kardex.unshift({
      id: 'KRDX-99999',
      timestamp: new Date().toISOString(),
      itemId: 'custom_cleaner',
      itemName: 'Limpiador Especial',
      type: 'CUSTOM_AUDIT',
      quantity: 5,
      unit: 'litros',
      previousStock: 5,
      newStock: 10,
      costTotalQ: 250,
      referenceOrderId: null,
      invoiceNumber: null,
      notes: null,
    });

    inventoryStore._notify();

    const grid = document.getElementById('inventoryGrid');
    expect(grid.textContent).toContain('Limpiador Especial');
    expect(grid.textContent).toContain('OTHER_EQUIP');

    const table = document.getElementById('kardexTableBody');
    expect(table.textContent).toContain('KRDX-99999');
    expect(table.textContent).toContain('CUSTOM_AUDIT');
    expect(table.textContent).toContain('—');
  });

  it('ignora clics en botón de ajuste rápido cuando el elemento no existe en el store', () => {
    const dummyBtn = document.createElement('button');
    dummyBtn.className = 'btn-quick-adjust';
    dummyBtn.setAttribute('data-item-id', 'non_existent_id');
    document.getElementById('inventoryGrid').appendChild(dummyBtn);

    // Re-ejecutar onMount para enlazar eventos
    const localCleanup = inventoryView.onMount();
    dummyBtn.click();
    expect(document.getElementById('adjustStockModal').style.display).toBe('none');
    localCleanup();
  });

  it('cierra modales y limpia suscripción al invocar el callback de desmontaje', () => {
    const modal = document.getElementById('restockModal');
    modal.style.display = 'block';

    const localCleanup = inventoryView.onMount();
    localCleanup();

    expect(modal.style.display).toBe('none');
  });
  it('renderiza la tabla Kardex dentro de un contenedor responsivo con clase inventory-table-wrapper', () => {
    const wrapper = document.querySelector('.inventory-table-wrapper');
    expect(wrapper).not.toBeNull();
    expect(wrapper.className).toContain('orders-table-container');
    expect(wrapper.style.overflowX).toBe('auto');
  });
});
