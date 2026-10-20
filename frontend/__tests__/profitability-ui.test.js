import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { profitabilityView } from '../src/js/views/profitability-view.js';
import { ordersStore } from '../src/js/modules/orders-store.js';
import { store } from '../src/js/store.js';
import * as profEngine from '../src/js/modules/profitability-engine.js';

describe('Profitability View — Interfaz de Costos Industriales y Rentabilidad Unitaria UV DTF', () => {
  let cleanupFn = null;

  beforeEach(() => {
    localStorage.clear();
    ordersStore.resetToInitial();
    store.setUser({ id: 'USR_ADMIN', role: 'ADMIN', name: 'Administrador' }, 'token');

    document.body.innerHTML = `
      <main id="app">
        ${profitabilityView.render()}
      </main>
    `;
    cleanupFn = profitabilityView.onMount();
  });

  afterEach(() => {
    if (cleanupFn) cleanupFn();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('renderiza la cabecera, indicadores principales, simulador y tablas', () => {
    const h1 = document.querySelector('h1');
    expect(h1.textContent).toContain('Costos y Rentabilidad Unitaria');

    // Botón de configuración de costos
    expect(document.getElementById('btnOpenCostsConfigModal')).not.toBeNull();

    // Contenedor de meta mensual
    const goalCard = document.getElementById('monthlyGoalCardContainer');
    expect(goalCard.textContent).toContain('Meta Estratégica Mensual');
    expect(goalCard.textContent).toContain('Flujo Neto Proyectado');

    // Simulador
    expect(document.getElementById('simMeters')).not.toBeNull();
    expect(document.getElementById('simMetersSlider')).not.toBeNull();
    expect(document.getElementById('simStickers')).not.toBeNull();
    expect(document.getElementById('simFinish')).not.toBeNull();
    expect(document.getElementById('simCutting')).not.toBeNull();
    expect(document.getElementById('simCustomPrice')).not.toBeNull();

    // KPIs de simulación
    expect(document.getElementById('resTotalCost').textContent).not.toBe('Q0.00');
    expect(document.getElementById('resSellingPrice').textContent).not.toBe('Q0.00');
    expect(document.getElementById('resNetProfit').textContent).not.toBe('Q0.00');
    expect(document.getElementById('resMarginPercent').textContent).toContain('%');

    // Tabla de desglose de costos
    const costRows = document.querySelectorAll('#costBreakdownTableBody tr');
    expect(costRows.length).toBeGreaterThanOrEqual(8);

    // Tabla de órdenes históricas
    const orderRows = document.querySelectorAll('#ordersProfitabilityTableBody tr');
    expect(orderRows.length).toBeGreaterThan(0);
  });

  it('sincroniza el slider y el campo numérico de metros y recalcula en vivo', () => {
    const metersInput = document.getElementById('simMeters');
    const metersSlider = document.getElementById('simMetersSlider');
    const metersDisplay = document.getElementById('simMetersDisplay');
    const sellingPriceEl = document.getElementById('resSellingPrice');

    // Mover slider a 5 metros
    metersSlider.value = '5.0';
    metersSlider.dispatchEvent(new Event('input'));

    expect(metersInput.value).toBe('5.0');
    expect(metersDisplay.textContent).toContain('5.00 m');
    // 5m en escala es Q115/m -> Q575.00
    expect(sellingPriceEl.textContent).toBe('Q575.00');

    // Cambiar input manual a 10 metros
    metersInput.value = '10.0';
    metersInput.dispatchEvent(new Event('input'));

    expect(metersSlider.value).toBe('10.0');
    expect(metersDisplay.textContent).toContain('10.00 m');
    // 10m en escala es Q105/m -> Q1050.00
    expect(sellingPriceEl.textContent).toBe('Q1050.00');
  });

  it('recalcula costos al alternar acabado con barniz vs sin barniz (mate)', () => {
    const finishSelect = document.getElementById('simFinish');
    const totalCostEl = document.getElementById('resTotalCost');

    const costWithVarnish = parseFloat(totalCostEl.textContent.replace('Q', ''));

    // Cambiar a mate / sin barniz
    finishSelect.value = 'Sin Barniz / Mate';
    finishSelect.dispatchEvent(new Event('change'));

    const costWithoutVarnish = parseFloat(totalCostEl.textContent.replace('Q', ''));
    expect(costWithoutVarnish).toBeLessThan(costWithVarnish);

    // Verificar tabla de desglose
    const tableText = document.getElementById('costBreakdownTableBody').textContent;
    expect(tableText).toContain('0 ml (Sin barniz)');
  });

  it('incluye rubro de corte y actualiza precio al marcar checkbox de corte', () => {
    const cuttingCheckbox = document.getElementById('simCutting');
    const costTable = document.getElementById('costBreakdownTableBody');
    const sellingPriceEl = document.getElementById('resSellingPrice');

    const priceWithoutCut = parseFloat(sellingPriceEl.textContent.replace('Q', ''));
    expect(costTable.textContent).not.toContain('Navaja de Corte Perimetral');

    // Activar corte
    cuttingCheckbox.checked = true;
    cuttingCheckbox.dispatchEvent(new Event('change'));

    const priceWithCut = parseFloat(sellingPriceEl.textContent.replace('Q', ''));
    expect(priceWithCut).toBeGreaterThan(priceWithoutCut);
    expect(document.getElementById('costBreakdownTableBody').textContent).toContain('Navaja de Corte Perimetral');
  });

  it('permite sobrescribir el precio con un valor manual y restablecerlo a la escala', () => {
    const customPriceInput = document.getElementById('simCustomPrice');
    const btnResetPrice = document.getElementById('btnResetPriceToScale');
    const sellingPriceEl = document.getElementById('resSellingPrice');
    const sellingRateEl = document.getElementById('resSellingRate');
    const indicatorEl = document.getElementById('priceTierIndicator');

    // Fijar precio manual
    customPriceInput.value = '350.00';
    customPriceInput.dispatchEvent(new Event('input'));

    expect(sellingPriceEl.textContent).toBe('Q350.00');
    expect(sellingRateEl.textContent).toBe('Precio Manual');
    expect(indicatorEl.textContent).toContain('Precio fijado manualmente en Q350.00');

    // Restablecer a escala automática
    btnResetPrice.click();
    expect(customPriceInput.value).toBe('');
    expect(sellingRateEl.textContent).toContain('Tarifa: Q');
    expect(indicatorEl.textContent).toContain('Escala Kroma Lab');
  });

  it('abre, cierra y cancela el modal de configuración de costos', () => {
    const modal = document.getElementById('costsConfigModal');
    const btnOpen = document.getElementById('btnOpenCostsConfigModal');
    const btnClose = document.getElementById('btnCloseCostsModal');
    const btnCancel = document.getElementById('btnCancelCostsModal');

    expect(modal.style.display).toBe('none');

    // Abrir modal
    btnOpen.click();
    expect(modal.style.display).toBe('block');
    expect(document.body.style.overflow).toBe('hidden');

    // Cerrar con cruz
    btnClose.click();
    expect(modal.style.display).toBe('none');
    expect(document.body.style.overflow).toBe('');

    // Abrir y cancelar
    btnOpen.click();
    expect(modal.style.display).toBe('block');
    btnCancel.click();
    expect(modal.style.display).toBe('none');
  });

  it('guarda nuevos precios de insumos en el modal y actualiza los cálculos globales', () => {
    const btnOpen = document.getElementById('btnOpenCostsConfigModal');
    const form = document.getElementById('formCostsConfig');
    const cfgFilmA = document.getElementById('cfgFilmA');
    const cfgGoal = document.getElementById('cfgMonthlyGoal');

    btnOpen.click();

    cfgFilmA.value = '900.00';
    cfgGoal.value = '30000.00';

    form.dispatchEvent(new Event('submit', { cancelable: true }));

    // Modal se cierra
    expect(document.getElementById('costsConfigModal').style.display).toBe('none');

    // Guardado en storage
    const updatedCfg = profEngine.getCostsConfig();
    expect(updatedCfg.filmARoll100mQ).toBe(900.0);
    expect(updatedCfg.monthlyTargetNetProfitQ).toBe(30000.0);

    // Meta actualizada en el card
    expect(document.getElementById('monthlyGoalCardContainer').textContent).toContain('Q30000.00');
  });

  it('restablece los precios de insumos a valores de fábrica desde el modal', () => {
    // Primero modificar
    profEngine.saveCostsConfig({ filmARoll100mQ: 950.0 });
    const btnOpen = document.getElementById('btnOpenCostsConfigModal');
    const btnResetFactory = document.getElementById('btnResetCostsFactory');

    btnOpen.click();
    btnResetFactory.click();

    expect(document.getElementById('cfgFilmA').value).toBe('600');
    expect(profEngine.getCostsConfig().filmARoll100mQ).toBe(600.0);
  });

  it('reacciona en tiempo real a modificaciones en ordersStore', () => {
    const tbody = document.getElementById('ordersProfitabilityTableBody');
    const initialRowsCount = tbody.querySelectorAll('tr').length;

    // Crear un nuevo pedido en ordersStore
    ordersStore.createOrder({
      customer: { name: 'Cliente Reactivo', company: 'Reactivo S.A.', phone: '50212345678', nit: 'CF' },
      items: [{ title: 'Pegatinas Vinil', widthCm: 10, heightCm: 10, qty: 100, actualLinearMeters: 2.0 }],
      metrics: { totalBillableMeters: 2.0, basePriceQ: 230.0, grandTotalQ: 230.0, hasCutting: false },
    });

    const newRowsCount = tbody.querySelectorAll('tr').length;
    expect(newRowsCount).toBe(initialRowsCount + 1);
    expect(tbody.textContent).toContain('Reactivo S.A.');
  });

  it('muestra estado vacío amigable cuando no existen pedidos en ordersStore', () => {
    ordersStore.orders = [];
    ordersStore._notify();

    const tbody = document.getElementById('ordersProfitabilityTableBody');
    expect(tbody.textContent).toContain('No hay pedidos registrados en taller');
  });

  it('muestra mensaje celebratorio cuando se alcanza la meta mensual de Q20,000 netos', () => {
    // Simular un pedido masivo que supera la meta
    ordersStore.orders = [
      {
        id: 'ORD-SUPER-PROFIT',
        productionStatus: 'COMPLETED',
        metrics: { totalBillableMeters: 250.0, grandTotalQ: 35000.0, hasCutting: false },
        items: [{ qty: 5000 }],
        customer: { name: 'Cliente Mayorista' },
      },
    ];
    ordersStore._notify();

    const goalCard = document.getElementById('monthlyGoalCardContainer');
    expect(goalCard.textContent).toContain('¡Meta mensual de Q20,000 alcanzada!');

    const tbody = document.getElementById('ordersProfitabilityTableBody');
    expect(tbody.textContent).toContain('Cliente Mayorista');
  });

  it('maneja órdenes con clientes sin nombre o anónimos en la tabla histórica', () => {
    ordersStore.orders = [
      {
        id: 'ORD-ANON',
        productionStatus: 'COMPLETED',
        metrics: { totalBillableMeters: 1.0, grandTotalQ: 140.0, hasCutting: false },
        items: [{ qty: 50 }],
        customer: null,
      },
    ];
    ordersStore._notify();

    const tbody = document.getElementById('ordersProfitabilityTableBody');
    expect(tbody.textContent).toContain('Cliente');
  });

  it('maneja valores vacíos en inputs del simulador aplicando fallbacks seguros', () => {
    const metersInput = document.getElementById('simMeters');
    const stickersInput = document.getElementById('simStickers');

    metersInput.value = '';
    metersInput.dispatchEvent(new Event('input'));

    stickersInput.value = '';
    stickersInput.dispatchEvent(new Event('input'));

    expect(document.getElementById('resTotalCost').textContent).not.toBe('Q0.00');
  });

  it('aplica fallbacks al guardar configuración con campos vacíos en el modal', () => {
    const btnOpen = document.getElementById('btnOpenCostsConfigModal');
    const form = document.getElementById('formCostsConfig');

    btnOpen.click();

    document.getElementById('cfgFilmA').value = '';
    document.getElementById('cfgFilmB').value = '';
    document.getElementById('cfgInk').value = '';
    document.getElementById('cfgElectricity').value = '';
    document.getElementById('cfgMaintenance').value = '';
    document.getElementById('cfgLabor').value = '';
    document.getElementById('cfgCutting').value = '';
    document.getElementById('cfgMonthlyGoal').value = '';

    form.dispatchEvent(new Event('submit', { cancelable: true }));

    const saved = profEngine.getCostsConfig();
    expect(saved.filmARoll100mQ).toBe(600.0);
    expect(saved.monthlyTargetNetProfitQ).toBe(20000.0);
  });
});
