import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { reportsView } from '../src/js/views/reports-view.js';
import { ordersStore, PAYMENT_STATUS } from '../src/js/modules/orders-store.js';
import { clientsStore } from '../src/js/modules/clients-store.js';
import { store } from '../src/js/store.js';
import * as reportsEngine from '../src/js/modules/reports-engine.js';

describe('Reports View — Interfaz de Reportes Comerciales y Analítica UV DTF', () => {
  let cleanupFn = null;
  let downloadSpy;

  beforeEach(() => {
    localStorage.clear();
    ordersStore.resetToInitial();
    clientsStore._loadClients();
    store.setUser({ id: 'USR_ADMIN', role: 'ADMIN', name: 'Administrador' }, 'token');

    downloadSpy = vi.spyOn(reportsEngine, 'downloadCSV').mockImplementation(() => true);

    document.body.innerHTML = `
      <main id="app">
        ${reportsView.render()}
      </main>
    `;
    cleanupFn = reportsView.onMount();
  });

  afterEach(() => {
    if (cleanupFn) cleanupFn();
    downloadSpy.mockRestore();
    document.body.innerHTML = '';
  });

  it('renderiza la interfaz completa de reportes con encabezado, métricas y controles', () => {
    const title = document.querySelector('h1');
    expect(title.textContent).toContain('Reportes y Analítica Comercial');

    // Controles
    expect(document.getElementById('reportsPeriodFilter')).not.toBeNull();
    expect(document.getElementById('btnExportOrdersCSV')).not.toBeNull();
    expect(document.getElementById('btnExportClientsCSV')).not.toBeNull();
    expect(document.getElementById('btnExportRollCSV')).not.toBeNull();

    // Métricas Financieras
    const finGrid = document.getElementById('financialMetricsGrid');
    expect(finGrid.textContent).toContain('Facturación Bruta');
    expect(finGrid.textContent).toContain('Recaudado / Cobrado');
    expect(finGrid.textContent).toContain('Saldo Pendiente de Cobro');
    expect(finGrid.textContent).toContain('Ticket Promedio');

    // Métricas de Bobina
    const rollGrid = document.getElementById('rollMetricsGrid');
    expect(rollGrid.textContent).toContain('Metros Bobina Impresos');
    expect(rollGrid.textContent).toContain('Bobinas Estándar Usadas');
    expect(rollGrid.textContent).toContain('Stickers Producidos');
    expect(rollGrid.textContent).toContain('Tinta UV Consumida');

    // Cartera B2B y Top Clientes
    expect(document.getElementById('b2bGoalBadgeContainer').textContent).toContain('Meta:');
    expect(document.getElementById('b2bGoalProgressBar').textContent).toContain('25 cuentas clave');
    const tableRows = document.querySelectorAll('#topClientsTableBody tr');
    expect(tableRows.length).toBeGreaterThan(0);
  });

  it('actualiza métricas reactivamente al cambiar el filtro de período', () => {
    const filter = document.getElementById('reportsPeriodFilter');
    expect(filter.value).toBe('ALL');

    // Cambiar a TODAY (solo órdenes de hoy)
    filter.value = 'TODAY';
    filter.dispatchEvent(new Event('change'));

    const finGrid = document.getElementById('financialMetricsGrid');
    expect(finGrid).not.toBeNull();

    // Cambiar a un período sin órdenes
    const origGetOrders = ordersStore.getOrders;
    ordersStore.getOrders = () => [];
    filter.value = 'TODAY';
    filter.dispatchEvent(new Event('change'));

    const emptyRow = document.getElementById('topClientsTableBody');
    expect(emptyRow.textContent).toContain('No se registran compras de clientes');

    ordersStore.getOrders = origGetOrders;
  });

  it('dispara la exportación de Pedidos en CSV al pulsar btnExportOrdersCSV', () => {
    const btn = document.getElementById('btnExportOrdersCSV');
    btn.click();

    expect(downloadSpy).toHaveBeenCalledWith(
      expect.stringContaining('pedidos_kroma_lab'),
      expect.stringContaining('\uFEFF')
    );

    const notification = document.getElementById('reportsNotification');
    expect(notification.style.display).toBe('block');
    expect(notification.textContent).toContain('Archivo de pedidos exportado');
  });

  it('dispara la exportación de Cartera B2B en CSV al pulsar btnExportClientsCSV', () => {
    const btn = document.getElementById('btnExportClientsCSV');
    btn.click();

    expect(downloadSpy).toHaveBeenCalledWith(
      'cartera_clientes_b2b_kroma_lab.csv',
      expect.stringContaining('\uFEFF')
    );

    const notification = document.getElementById('reportsNotification');
    expect(notification.style.display).toBe('block');
    expect(notification.textContent).toContain('Archivo de cartera B2B exportado');
  });

  it('dispara la exportación de Consumo de Bobina Audley al pulsar btnExportRollCSV', () => {
    const btn = document.getElementById('btnExportRollCSV');
    btn.click();

    expect(downloadSpy).toHaveBeenCalledWith(
      expect.stringContaining('consumo_bobina_audley'),
      expect.stringContaining('\uFEFF')
    );

    const notification = document.getElementById('reportsNotification');
    expect(notification.style.display).toBe('block');
    expect(notification.textContent).toContain('Archivo de consumo de bobina exportado');
  });

  it('muestra retroalimentación alternativa si downloadCSV retorna false', () => {
    downloadSpy.mockReturnValue(false);

    const btn = document.getElementById('btnExportOrdersCSV');
    btn.click();
    expect(document.getElementById('reportsNotification').textContent).toContain('Pedidos generados para exportación');

    const btnClients = document.getElementById('btnExportClientsCSV');
    btnClients.click();
    expect(document.getElementById('reportsNotification').textContent).toContain('Cartera exportada');

    const btnRoll = document.getElementById('btnExportRollCSV');
    btnRoll.click();
    expect(document.getElementById('reportsNotification').textContent).toContain('Consumo exportado');
  });

  it('permite filtrar por diferentes períodos y renderiza clientes con tier personalizado', () => {
    // Añadir un cliente con tier no estándar que tenga compras
    clientsStore.createClient({
      name: 'Cliente Especial',
      company: 'Empresa Custom Tier',
      tier: 'TIER_CUSTOM_99',
    });
    const c = clientsStore.getClients()[0];
    ordersStore.createOrder({
      customer: { clientId: c.id, company: c.company, name: c.name },
      cartTotals: { totalBillableMeters: 4.0, grandTotalQ: 460.0 },
    });

    const filter = document.getElementById('reportsPeriodFilter');
    ['THIS_WEEK', 'THIS_MONTH', 'LAST_30_DAYS'].forEach(period => {
      filter.value = period;
      filter.dispatchEvent(new Event('change'));
      expect(document.getElementById('financialMetricsGrid')).not.toBeNull();
    });

    // Verificar que la tabla incluye al nuevo cliente
    filter.value = 'ALL';
    filter.dispatchEvent(new Event('change'));
    expect(document.getElementById('topClientsTableBody').innerHTML).toContain('Empresa Custom Tier');
    expect(document.getElementById('topClientsTableBody').innerHTML).toContain('Q460.00');
  });

  it('re-renderiza las métricas automáticamente cuando cambia el almacén de pedidos', () => {
    const initialGross = document.getElementById('financialMetricsGrid').textContent;

    // Crear un nuevo pedido
    ordersStore.createOrder({
      customer: { name: 'Cliente Nuevo', company: 'Empresa Test', phone: '12345678' },
      cartTotals: { totalBillableMeters: 5.0, grandTotalQ: 575.0 },
      items: [{ title: 'Nuevo Diseño', qty: 100 }],
    });

    const updatedGross = document.getElementById('financialMetricsGrid').textContent;
    expect(updatedGross).not.toBe(initialGross);
    expect(updatedGross).toContain('2206.10');
    expect(updatedGross).toContain('6 pedidos en el período');
  });

  it('oculta la notificación de exportación después del tiempo de espera', () => {
    vi.useFakeTimers();
    const btn = document.getElementById('btnExportOrdersCSV');
    btn.click();

    const notification = document.getElementById('reportsNotification');
    expect(notification.style.display).toBe('block');

    vi.advanceTimersByTime(3600);
    expect(notification.style.display).toBe('none');
    vi.useRealTimers();
  });

  it('renderiza indicador verde de cobranza cuando no existen saldos pendientes', () => {
    ordersStore.getOrders().forEach(o => {
      ordersStore.updatePaymentStatus(o.id, PAYMENT_STATUS.PAID);
    });

    const finGrid = document.getElementById('financialMetricsGrid');
    expect(finGrid.textContent).toContain('Sin saldos en mora');
  });
});
