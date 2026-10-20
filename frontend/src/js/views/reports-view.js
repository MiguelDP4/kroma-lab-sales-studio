/**
 * Vista de Reportes Comerciales, Consumo de Bobina Audley UV DTF y Analítica B2B.
 * Proporciona supervisión financiera, cobranza, cálculo de insumos (Film A/B, tinta UV),
 * monitoreo de la meta de clientes B2B recurrentes y exportación de datos a CSV compatible con Excel.
 */

import { store } from '../store.js';
import { ordersStore, PAYMENT_STATUS, PRODUCTION_STATUS_LABELS } from '../modules/orders-store.js';
import { clientsStore, CLIENT_TIERS } from '../modules/clients-store.js';
import {
  REPORT_PERIODS,
  filterOrdersByPeriod,
  calculateCommercialReport,
  generateOrdersCSV,
  generateClientsPortfolioCSV,
  generateRollConsumptionCSV,
  downloadCSV,
} from '../modules/reports-engine.js';

export const reportsView = {
  path: '/reportes',
  name: 'reports',
  allowedRoles: ['EMPLOYEE', 'ADMIN'],

  render: () => {
    return `
      <div style="padding: 2rem 0 4rem;">
        <!-- Cabecera de la Vista de Reportes -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; flex-wrap: wrap; gap: 1.25rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem; flex-wrap: wrap;">
              <span class="badge">Inteligencia Comercial</span>
              <span class="badge" style="background: rgba(28, 114, 147, 0.15); color: var(--cerulean); border-color: var(--cerulean);">
                Bobina Audley 28cm
              </span>
            </div>
            <h1 style="font-size: clamp(1.8rem, 3.5vw, 2.4rem); font-weight: 800; margin: 0.25rem 0;">
              Reportes y Analítica Comercial
            </h1>
            <p style="color: var(--text-secondary); font-size: 0.95rem; margin: 0;">
              Supervisión de ingresos, cobranza, consumo de metros de bobina Audley y avance de cartera B2B.
            </p>
          </div>

          <!-- Filtro de Período y Botones de Exportación -->
          <div style="display: flex; flex-direction: column; gap: 0.75rem; align-items: flex-end; width: min(100%, 460px);">
            <div style="display: flex; align-items: center; gap: 0.5rem; width: 100%;">
              <label for="reportsPeriodFilter" style="font-size: 0.85rem; font-weight: 700; color: var(--text-secondary); white-space: nowrap;">
                Período:
              </label>
              <select id="reportsPeriodFilter" class="input-control" style="padding: 0.45rem 0.75rem; font-size: 0.9rem;">
                ${Object.values(REPORT_PERIODS).map(p => `
                  <option value="${p.id}">${p.label}</option>
                `).join('')}
              </select>
            </div>

            <!-- Botones de Exportación CSV / Excel (Mobile-First >= 44px) -->
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; width: 100%; justify-content: flex-end;">
              <button id="btnExportOrdersCSV" class="btn btn-secondary btn-export-csv" title="Descargar pedidos detallados en CSV" style="font-size: 0.82rem; padding: 0.55rem 0.85rem; min-height: 44px; display: inline-flex; align-items: center; gap: 0.35rem;">
                <span>📥</span>
                <span>Pedidos (.csv)</span>
              </button>
              <button id="btnExportClientsCSV" class="btn btn-secondary btn-export-csv" title="Descargar cartera B2B en CSV" style="font-size: 0.82rem; padding: 0.55rem 0.85rem; min-height: 44px; display: inline-flex; align-items: center; gap: 0.35rem;">
                <span>🏢</span>
                <span>Cartera B2B (.csv)</span>
              </button>
              <button id="btnExportRollCSV" class="btn btn-secondary btn-export-csv" title="Descargar consumo de bobina en CSV" style="font-size: 0.82rem; padding: 0.55rem 0.85rem; min-height: 44px; display: inline-flex; align-items: center; gap: 0.35rem;">
                <span>📜</span>
                <span>Consumo Bobina (.csv)</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Notificación de Exportación / Toast -->
        <div id="reportsNotification" class="reports-notification" style="display: none;"></div>

        <!-- SECCIÓN 1: FACTURACIÓN Y COBRANZA -->
        <div style="margin-bottom: 2.5rem;">
          <h2 style="font-size: 1.25rem; font-weight: 800; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>💰</span>
            <span>Facturación Comercial y Cobranza</span>
          </h2>
          <div id="financialMetricsGrid" class="orders-metrics-grid">
            <!-- Inyectado por renderFinancialMetrics() -->
          </div>
        </div>

        <!-- SECCIÓN 2: CONSUMO DE BOBINA AUDLEY UV DTF E INSUMOS -->
        <div style="margin-bottom: 2.5rem;">
          <h2 style="font-size: 1.25rem; font-weight: 800; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>📜</span>
            <span>Consumo Industrial de Bobina Audley UV DTF (28 cm)</span>
          </h2>
          <div id="rollMetricsGrid" class="orders-metrics-grid">
            <!-- Inyectado por renderRollMetrics() -->
          </div>
        </div>

        <!-- SECCIÓN 3: CARTERA B2B Y FIDELIZACIÓN (META 20-30 CLIENTES) -->
        <div style="margin-bottom: 2.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
            <h2 style="font-size: 1.25rem; font-weight: 800; margin: 0; display: flex; align-items: center; gap: 0.5rem;">
              <span>🏆</span>
              <span>Cartera B2B & Top Clientes</span>
            </h2>
            <div id="b2bGoalBadgeContainer">
              <!-- Inyectado con badge de meta -->
            </div>
          </div>

          <!-- Barra de Progreso de la Meta B2B -->
          <div id="b2bGoalProgressBar" class="b2b-goal-card" style="margin-bottom: 1.25rem;">
            <!-- Inyectado dinámicamente -->
          </div>

          <!-- Tabla de Ranking de Clientes con Scroll Táctil -->
          <div class="mobile-scroll-hint">Desliza para ver columnas fiscales y totales ↔</div>
          <div class="orders-table-container">
            <table class="orders-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Empresa / Marca</th>
                  <th>Contacto</th>
                  <th>Nivel</th>
                  <th>Metros Comprados</th>
                  <th>Total Facturado</th>
                  <th>Saldo Pendiente</th>
                </tr>
              </thead>
              <tbody id="topClientsTableBody">
                <!-- Inyectado dinámicamente -->
              </tbody>
            </table>
          </div>
        </div>

        <!-- SECCIÓN 4: DESGLOSE DE PEDIDOS Y ESTADOS -->
        <div>
          <h2 style="font-size: 1.25rem; font-weight: 800; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>📊</span>
            <span>Distribución de Estados en Taller</span>
          </h2>
          <div id="statusBreakdownGrid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
            <!-- Inyectado dinámicamente -->
          </div>
        </div>
      </div>
    `;
  },

  onMount: () => {
    let currentPeriod = 'ALL';

    const periodFilter = document.getElementById('reportsPeriodFilter');
    const btnExportOrders = document.getElementById('btnExportOrdersCSV');
    const btnExportClients = document.getElementById('btnExportClientsCSV');
    const btnExportRoll = document.getElementById('btnExportRollCSV');
    const notificationEl = document.getElementById('reportsNotification');

    function showNotification(msg) {
      if (!notificationEl) return;
      notificationEl.textContent = msg;
      notificationEl.style.display = 'block';
      setTimeout(() => {
        if (notificationEl) notificationEl.style.display = 'none';
      }, 3500);
    }

    function renderAll() {
      const allOrders = ordersStore.getOrders();
      const allClients = clientsStore.getClients();
      const report = calculateCommercialReport(allOrders, allClients, currentPeriod);

      renderFinancialMetrics(report);
      renderRollMetrics(report);
      renderB2BGoal(report);
      renderTopClientsTable(report);
      renderStatusBreakdown(report);
    }

    function renderFinancialMetrics(report) {
      const container = document.getElementById('financialMetricsGrid');
      if (!container) return;

      const f = report.financials;

      container.innerHTML = `
        <div class="orders-metric-card" style="border-top: 4px solid var(--color-success);">
          <span class="orders-metric-title">Facturación Bruta</span>
          <span class="orders-metric-value" style="color: var(--color-success);">Q${f.grossRevenueQ.toFixed(2)}</span>
          <span style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.25rem;">
            ${report.ordersBreakdown.active} pedidos en el período
          </span>
        </div>

        <div class="orders-metric-card" style="border-top: 4px solid var(--cerulean);">
          <span class="orders-metric-title">Recaudado / Cobrado</span>
          <span class="orders-metric-value" style="color: var(--cerulean);">Q${f.paidRevenueQ.toFixed(2)}</span>
          <div style="font-size: 0.78rem; color: var(--cerulean); font-weight: 700; margin-top: 0.25rem;">
            ${f.collectionRatePercent}% efectividad de cobro
          </div>
        </div>

        <div class="orders-metric-card" style="border-top: 4px solid ${f.pendingDebtQ > 0 ? '#ef4444' : 'var(--text-muted)'};">
          <span class="orders-metric-title">Saldo Pendiente de Cobro</span>
          <span class="orders-metric-value" style="color: ${f.pendingDebtQ > 0 ? '#ef4444' : 'var(--text-muted)'};">
            Q${f.pendingDebtQ.toFixed(2)}
          </span>
          <span style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.25rem;">
            ${f.pendingDebtQ > 0 ? '⚠️ Cuentas por cobrar activas' : '✅ Sin saldos en mora'}
          </span>
        </div>

        <div class="orders-metric-card" style="border-top: 4px solid var(--color-warning);">
          <span class="orders-metric-title">Ticket Promedio</span>
          <span class="orders-metric-value" style="color: var(--text-primary);">Q${f.averageTicketQ.toFixed(2)}</span>
          <span style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.25rem;">
            Corte opcional: Q${f.cuttingRevenueQ.toFixed(2)}
          </span>
        </div>
      `;
    }

    function renderRollMetrics(report) {
      const container = document.getElementById('rollMetricsGrid');
      if (!container) return;

      const r = report.audleyRoll;

      container.innerHTML = `
        <div class="orders-metric-card" style="border-top: 4px solid var(--cerulean);">
          <span class="orders-metric-title">Metros Bobina Impresos</span>
          <span class="orders-metric-value" style="color: var(--cerulean);">${r.totalMeters.toFixed(2)} m</span>
          <span style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.25rem;">
            ${r.completedMeters.toFixed(2)}m entregados • ${r.inQueueMeters.toFixed(2)}m en cola
          </span>
        </div>

        <div class="orders-metric-card" style="border-top: 4px solid #8b5cf6;">
          <span class="orders-metric-title">Bobinas Estándar Usadas</span>
          <span class="orders-metric-value" style="color: #8b5cf6;">${r.rollsEquivalent100m.toFixed(2)}</span>
          <span style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.25rem;">
            Equivalente en rollos de 100 metros
          </span>
        </div>

        <div class="orders-metric-card" style="border-top: 4px solid #f59e0b;">
          <span class="orders-metric-title">Stickers Producidos</span>
          <span class="orders-metric-value" style="color: #f59e0b;">${r.totalStickersCount.toLocaleString()}</span>
          <span style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.25rem;">
            Unidades UV DTF transferibles
          </span>
        </div>

        <div class="orders-metric-card" style="border-top: 4px solid var(--baltic-blue);">
          <span class="orders-metric-title">Tinta UV Consumida</span>
          <span class="orders-metric-value" style="color: var(--baltic-blue);">${r.estimatedInkLiters.toFixed(2)} L</span>
          <span style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.25rem;">
            Film A: ${r.estimatedFilmAMeters.toFixed(1)}m • Film B: ${r.estimatedFilmBMeters.toFixed(1)}m
          </span>
        </div>
      `;
    }

    function renderB2BGoal(report) {
      const badgeContainer = document.getElementById('b2bGoalBadgeContainer');
      const progressBarContainer = document.getElementById('b2bGoalProgressBar');
      const p = report.b2bPortfolio;

      if (badgeContainer) {
        badgeContainer.innerHTML = `
          <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border-color: #10b981; font-weight: 700;">
            🎯 Meta: ${p.activeRecurringClients} / ${p.targetClients} Clientes (${p.goalProgressPercent}%)
          </span>
        `;
      }

      if (progressBarContainer) {
        progressBarContainer.innerHTML = `
          <div style="background: var(--bg-surface-elevated); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
              <span style="font-weight: 700; font-size: 0.95rem;">
                Avance hacia la consolidación de 20-30 clientes B2B recurrentes:
              </span>
              <strong style="font-family: var(--font-mono); font-size: 1.05rem; color: #10b981;">
                ${p.activeRecurringClients} de ${p.targetClients} cuentas clave (${p.goalProgressPercent}%)
              </strong>
            </div>
            <div style="width: 100%; height: 10px; background: rgba(158, 179, 194, 0.2); border-radius: var(--radius-full); overflow: hidden;">
              <div style="width: ${p.goalProgressPercent}%; height: 100%; background: linear-gradient(90deg, var(--cerulean), #10b981); border-radius: var(--radius-full); transition: width 0.5s ease;"></div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.4rem;">
              <span>0 clientes</span>
              <span>10 clientes (Punto de equilibrio)</span>
              <span>25 clientes (Meta de flujo Q20k/mes)</span>
            </div>
          </div>
        `;
      }
    }

    function renderTopClientsTable(report) {
      const tbody = document.getElementById('topClientsTableBody');
      if (!tbody) return;

      const ranking = report.b2bPortfolio.topClientsRanking;

      if (ranking.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
              No se registran compras de clientes para el período seleccionado.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = ranking.map(c => {
        const tier = CLIENT_TIERS[c.tier] || { badge: c.tier, color: 'var(--cerulean)', bg: 'rgba(28, 114, 147, 0.15)' };
        return `
          <tr>
            <td style="font-weight: 800; font-family: var(--font-mono); color: var(--cerulean);">#${c.rank}</td>
            <td style="font-weight: 700; color: var(--text-primary);">${c.company}</td>
            <td style="color: var(--text-secondary);">${c.name}</td>
            <td>
              <span class="badge" style="background: ${tier.bg}; color: ${tier.color}; border-color: ${tier.color}; font-size: 0.75rem;">
                ${tier.badge}
              </span>
            </td>
            <td style="font-family: var(--font-mono); font-weight: 600;">${c.totalMeters.toFixed(2)} m</td>
            <td style="font-family: var(--font-mono); font-weight: 800; color: var(--color-success);">Q${c.totalSpentQ.toFixed(2)}</td>
            <td style="font-family: var(--font-mono); font-weight: 700; color: ${c.pendingDebtQ > 0 ? '#ef4444' : 'var(--text-muted)'};">
              Q${c.pendingDebtQ.toFixed(2)}
            </td>
          </tr>
        `;
      }).join('');
    }

    function renderStatusBreakdown(report) {
      const container = document.getElementById('statusBreakdownGrid');
      if (!container) return;

      const pPay = report.ordersBreakdown.payment;
      const pProd = report.ordersBreakdown.production;

      container.innerHTML = `
        <div style="background: var(--bg-surface-elevated); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
          <h3 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.75rem; color: var(--text-primary);">
            Estado de Cobros
          </h3>
          <div style="display: flex; flex-direction: column; gap: 0.45rem; font-size: 0.88rem;">
            <div style="display: flex; justify-content: space-between;">
              <span>✅ Pagados 100%:</span>
              <strong>${pPay[PAYMENT_STATUS.PAID] || 0}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>⏳ Anticipo 50%:</span>
              <strong style="color: #f59e0b;">${pPay[PAYMENT_STATUS.PARTIAL] || 0}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>🔴 Pendientes de pago:</span>
              <strong style="color: #ef4444;">${pPay[PAYMENT_STATUS.PENDING] || 0}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>⏸️ Cancelados:</span>
              <span style="color: var(--text-muted);">${pPay[PAYMENT_STATUS.CANCELLED] || 0}</span>
            </div>
          </div>
        </div>

        <div style="background: var(--bg-surface-elevated); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
          <h3 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.75rem; color: var(--text-primary);">
            Cola de Taller Audley
          </h3>
          <div style="display: flex; flex-direction: column; gap: 0.45rem; font-size: 0.88rem;">
            <div style="display: flex; justify-content: space-between;">
              <span>📥 En Cola Audley:</span>
              <strong>${pProd['IN_AUDLEY_QUEUE'] || 0}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>🖨️ Imprimiendo UV:</span>
              <strong style="color: #f59e0b;">${pProd['PRINTING'] || 0}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>✂️ Laminado y Corte:</span>
              <strong style="color: var(--baltic-blue);">${pProd['LAMINATING_CUTTING'] || 0}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>📦 Listo / Entregado:</span>
              <strong style="color: #10b981;">${(pProd['READY_FOR_DELIVERY'] || 0) + (pProd['COMPLETED'] || 0)}</strong>
            </div>
          </div>
        </div>
      `;
    }

    // Event Listeners
    if (periodFilter) {
      periodFilter.addEventListener('change', (e) => {
        currentPeriod = e.target.value;
        renderAll();
      });
    }

    if (btnExportOrders) {
      btnExportOrders.addEventListener('click', () => {
        const allOrders = ordersStore.getOrders();
        const filtered = filterOrdersByPeriod(allOrders, currentPeriod);
        const csv = generateOrdersCSV(filtered);
        const success = downloadCSV(`pedidos_kroma_lab_${currentPeriod.toLowerCase()}.csv`, csv);
        showNotification(success ? '✅ Archivo de pedidos exportado en CSV.' : '⚠️ Pedidos generados para exportación.');
      });
    }

    if (btnExportClients) {
      btnExportClients.addEventListener('click', () => {
        const allClients = clientsStore.getClients();
        const allOrders = ordersStore.getOrders();
        const csv = generateClientsPortfolioCSV(allClients, allOrders);
        const success = downloadCSV('cartera_clientes_b2b_kroma_lab.csv', csv);
        showNotification(success ? '✅ Archivo de cartera B2B exportado en CSV.' : '⚠️ Cartera exportada.');
      });
    }

    if (btnExportRoll) {
      btnExportRoll.addEventListener('click', () => {
        const allOrders = ordersStore.getOrders();
        const filtered = filterOrdersByPeriod(allOrders, currentPeriod);
        const csv = generateRollConsumptionCSV(filtered);
        const success = downloadCSV(`consumo_bobina_audley_${currentPeriod.toLowerCase()}.csv`, csv);
        showNotification(success ? '✅ Archivo de consumo de bobina exportado en CSV.' : '⚠️ Consumo exportado.');
      });
    }

    // Suscripción reactiva a cambios en pedidos y clientes
    const unsubOrders = ordersStore.subscribe(() => renderAll());
    const unsubClients = clientsStore.subscribe(() => renderAll());

    // Render Inicial
    renderAll();

    // Teardown
    return () => {
      unsubOrders();
      unsubClients();
    };
  },
};
