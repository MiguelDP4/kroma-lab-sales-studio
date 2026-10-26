/**
 * Vista de Cuentas por Cobrar y Saldos B2B (ReceivablesView) — Kroma Lab.
 * Supervisa saldos adeudados de clientes, antigüedad de mora (0-7d, 8-15d, >15d),
 * registro de abonos parciales, conciliación bancaria y recordatorios por WhatsApp.
 * Rediseño Mobile-First con columnas optimizadas y formato de orden de 10 dígitos.
 */

import {
  receivablesStore,
  PAYMENT_METHODS,
  AGING_STATUS,
  BANK_ACCOUNTS_GT,
} from '../modules/receivables-store.js';
import { PAYMENT_STATUS, PAYMENT_STATUS_LABELS } from '../modules/orders-store.js';
import { downloadCSV } from '../modules/reports-engine.js';

export const receivablesView = {
  path: '/cobranza',
  name: 'receivables',
  allowedRoles: ['ADMIN', 'EMPLOYEE'],

  render: () => {
    return `
      <div class="receivables-view" style="padding: 1.5rem 0 4rem;">
        <!-- Cabecera de la Vista -->
        <div class="receivables-header-bar">
          <div style="flex: 1 1 320px; min-width: 0;">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem; flex-wrap: wrap;">
              <span class="badge">Finanzas & Cobranza</span>
              <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border-color: #10b981;">
                Saldos B2B Guatemala
              </span>
            </div>
            <h1 style="font-size: clamp(1.6rem, 3.2vw, 2.2rem); font-weight: 800; margin: 0.25rem 0; line-height: 1.2;">
              Cuentas por Cobrar y Saldos B2B
            </h1>
            <p style="color: var(--text-secondary); font-size: 0.9rem; margin: 0;">
              Control de créditos a clientes, registro de abonos y anticipos, conciliación bancaria y cobranza por WhatsApp.
            </p>
          </div>

          <div class="receivables-header-actions">
            <button id="btnOpenRecordPaymentModal" class="btn btn-primary" style="font-size: 0.88rem; padding: 0.6rem 1.1rem; min-height: 44px; display: inline-flex; align-items: center; gap: 0.4rem; white-space: nowrap;">
              <span>➕</span>
              <span>Registrar Abono / Pago</span>
            </button>
            <button id="btnExportReceivablesCSV" class="btn btn-secondary" style="font-size: 0.88rem; padding: 0.6rem 1rem; min-height: 44px; display: inline-flex; align-items: center; gap: 0.4rem; white-space: nowrap;">
              <span>📥</span>
              <span>Exportar Cartera CSV</span>
            </button>
          </div>
        </div>

        <!-- Notificación Toast de Cobranza -->
        <div id="receivablesToast" class="reports-notification" style="display: none; margin-bottom: 1.5rem;"></div>

        <!-- Tarjetas de Resumen KPI de Cobranza -->
        <div id="receivablesSummaryContainer" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 1rem; margin-bottom: 1.75rem;">
          <!-- Inyectado por renderSummaryKPIs() -->
        </div>

        <!-- Barra de Cuentas Bancarias de Taller -->
        <div class="receivables-bank-bar">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <span style="font-size: 1.5rem;">🏦</span>
            <div>
              <div style="font-size: 0.85rem; font-weight: 800; color: var(--text-primary);">Cuenta Monetaria para Pagos de Clientes (GTQ):</div>
              <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.2rem; display: flex; gap: 1rem; flex-wrap: wrap;">
                <span><strong>BI:</strong> 5371667253 (Monetaria)</span>
                <span><em>A nombre de: Miguel Angel Dubois / Kroma Lab</em></span>
              </div>
            </div>
          </div>
          <button id="btnCopyBankAccounts" class="btn btn-secondary" style="font-size: 0.78rem; padding: 0.4rem 0.8rem; min-height: 40px;">
            📋 Copiar Cuentas
          </button>
        </div>

        <!-- SECCIÓN 1: TABLA PRINCIPAL DE CUENTAS POR COBRAR -->
        <div class="receivables-section-card">
          <div class="receivables-section-header">
            <div>
              <h2 style="font-size: 1.25rem; font-weight: 800; margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                <span>📑</span>
                <span>Cartera de Pedidos y Estado de Deuda</span>
              </h2>
              <p style="color: var(--text-secondary); font-size: 0.85rem; margin: 0.25rem 0 0;">
                Seguimiento de pedidos con saldo pendiente, plazos de crédito y gestión de cobro directo.
              </p>
            </div>

            <!-- Filtros de Cartera Responsivos -->
            <div class="receivables-filters-bar">
              <input type="text" id="receivablesSearchInput" class="input-control" placeholder="Buscar por cliente, orden, NIT...">
              <select id="receivablesStatusFilter" class="input-control">
                <option value="DEBT_ONLY">⚠️ Con Deuda Pendiente</option>
                <option value="ALL">Todos los Pedidos</option>
                <option value="PARTIAL">🟡 Con Anticipo (50%)</option>
                <option value="PENDING">🔴 Sin Abonos (0%)</option>
                <option value="PAID">🟢 Pagados 100%</option>
              </select>
              <select id="receivablesAgingFilter" class="input-control">
                <option value="ALL">Todas las Edades</option>
                <option value="OVERDUE">🔴 En Mora (>15 días)</option>
                <option value="ATTENTION">🟡 Por Vencer (8-15d)</option>
                <option value="CURRENT">🟢 Al Día (0-7 días)</option>
              </select>
            </div>
          </div>

          <div class="mobile-scroll-hint receivables-mobile-scroll-hint">Desliza para ver columnas de saldo, mora y cobranza ↔</div>
          <div class="orders-table-container receivables-table-wrapper">
            <table class="orders-table receivables-table">
              <thead>
                <tr>
                  <th class="col-order-code">No. Orden</th>
                  <th class="col-order-date">Fecha & Antigüedad</th>
                  <th class="col-order-client">Cliente & Empresa</th>
                  <th class="col-order-total">Total (Q)</th>
                  <th class="col-order-paid">Abonado (Q)</th>
                  <th class="col-order-balance">Saldo Pendiente (Q)</th>
                  <th class="col-order-status">Estado</th>
                  <th class="col-order-actions">Acciones de Cobro</th>
                </tr>
              </thead>
              <tbody id="receivablesTableBody">
                <!-- Inyectado por renderReceivablesTable() -->
              </tbody>
            </table>
          </div>

          <!-- Tarjetas de Cobranza Estilo Despacho (<= 1200px) -->
          <div id="receivablesCardsContainer" class="receivables-cards-grid dispatch-cards-grid">
            <!-- Inyectado por renderReceivablesTable() -->
          </div>
          <div id="receivablesEmptyState" class="kanban-empty-col" style="display: none; margin: 1.5rem 0;">
            No se encontraron cuentas por cobrar con los filtros seleccionados.
          </div>
        </div>

        <!-- SECCIÓN 2: HISTORIAL DE ABONOS Y PAGOS RECIENTES -->
        <div class="receivables-section-card">
          <div class="receivables-section-header">
            <div>
              <h2 style="font-size: 1.25rem; font-weight: 800; margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                <span>💳</span>
                <span>Historial de Pagos y Abonos Registrados</span>
              </h2>
              <p style="color: var(--text-secondary); font-size: 0.85rem; margin: 0.25rem 0 0;">
                Registro detallado de transacciones recibidas por transferencia, efectivo o tarjeta en taller.
              </p>
            </div>
          </div>

          <div class="mobile-scroll-hint receivables-mobile-scroll-hint">Desliza para ver referencias bancarias y montos ↔</div>
          <div class="orders-table-container receivables-table-wrapper">
            <table class="orders-table receivables-payments-table">
              <thead>
                <tr>
                  <th class="col-pay-id">ID Pago</th>
                  <th class="col-pay-date">Fecha & Hora</th>
                  <th class="col-pay-order">No. Orden</th>
                  <th class="col-pay-client">Cliente / Razón Social</th>
                  <th class="col-pay-method">Método</th>
                  <th class="col-pay-ref">No. Boleta / Ref</th>
                  <th class="col-pay-amount">Monto (Q)</th>
                  <th class="col-pay-recorded">Registrado Por</th>
                  <th class="col-pay-action">Acción</th>
                </tr>
              </thead>
              <tbody id="paymentsTableBody">
                <!-- Inyectado por renderPaymentsTable() -->
              </tbody>
            </table>
          </div>

          <!-- Tarjetas de Pagos Estilo Despacho (<= 1200px) -->
          <div id="paymentsCardsContainer" class="payments-cards-grid dispatch-cards-grid">
            <!-- Inyectado por renderPaymentsTable() -->
          </div>
          <div id="paymentsEmptyState" class="kanban-empty-col" style="display: none; margin: 1.5rem 0;">
            No hay pagos ni abonos registrados en el sistema.
          </div>
        </div>

        <!-- MODAL 1: REGISTRAR ABONO / PAGO -->
        <div id="recordPaymentModal" class="modal-backdrop" style="display: none;">
          <div class="modal-card" style="width: min(540px, 94vw);">
            <div class="modal-header">
              <div>
                <h2 style="font-size: 1.25rem; font-weight: 800; margin: 0;">➕ Registrar Abono a Pedido</h2>
                <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0.25rem 0 0;">
                  Ingresa el monto recibido, método de pago y referencia bancaria para liquidar saldo.
                </p>
              </div>
              <button type="button" class="btn-close-modal" id="btnClosePaymentModal">✕</button>
            </div>

            <form id="formRecordPayment">
              <div class="form-group">
                <label class="form-label" for="paymentOrderId" style="font-weight: 700;">Pedido a Abonar:</label>
                <select id="paymentOrderId" class="input-control" style="min-height: 44px;" required>
                  <!-- Inyectado dinámicamente -->
                </select>
              </div>

              <!-- Tarjeta de Información del Pedido Seleccionado -->
              <div id="selectedOrderCard" style="background: var(--bg-surface); padding: 0.85rem 1rem; border-radius: var(--radius-md); margin-bottom: 1.25rem; border: 1px solid var(--border-color);">
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.35rem;">
                  <span id="selectedOrderClient" style="font-weight: 800; font-size: 0.95rem; color: var(--text-primary);"></span>
                  <span id="selectedOrderAging" class="badge" style="font-size: 0.72rem;"></span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; font-size: 0.8rem; border-top: 1px solid var(--border-color); padding-top: 0.4rem; margin-top: 0.4rem;">
                  <div>
                    <span style="color: var(--text-muted); display: block;">Total:</span>
                    <strong id="selectedOrderTotal" style="font-family: var(--font-mono);">Q0.00</strong>
                  </div>
                  <div>
                    <span style="color: var(--text-muted); display: block;">Abonado:</span>
                    <strong id="selectedOrderPaid" style="font-family: var(--font-mono); color: #10b981;">Q0.00</strong>
                  </div>
                  <div>
                    <span style="color: var(--text-muted); display: block;">Saldo Pendiente:</span>
                    <strong id="selectedOrderBalance" style="font-family: var(--font-mono); color: #ef4444;">Q0.00</strong>
                  </div>
                </div>
              </div>

              <!-- Botones Rápidos de Monto (Chips táctiles) -->
              <div style="margin-bottom: 1rem;">
                <label class="form-label" style="font-weight: 700; margin-bottom: 0.35rem;">Sugerencia de Abono:</label>
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                  <button type="button" id="btnChipPayTotal" class="btn btn-secondary" style="font-size: 0.78rem; padding: 0.35rem 0.75rem; min-height: 38px;">
                    💰 Saldo Total
                  </button>
                  <button type="button" id="btnChipPayHalf" class="btn btn-secondary" style="font-size: 0.78rem; padding: 0.35rem 0.75rem; min-height: 38px;">
                    ½ Anticipo 50%
                  </button>
                </div>
              </div>

              <div class="input-row">
                <div class="form-group">
                  <label class="form-label" for="paymentAmount" style="font-weight: 700;">Monto a Abonar (Q):</label>
                  <input type="number" id="paymentAmount" class="input-control" placeholder="Ej: 193.00" min="0.01" step="any" style="min-height: 44px;" required>
                </div>
                <div class="form-group">
                  <label class="form-label" for="paymentMethod" style="font-weight: 700;">Método de Pago:</label>
                  <select id="paymentMethod" class="input-control" style="min-height: 44px;">
                    <option value="TRANSFER">🏦 Transferencia Bancaria</option>
                    <option value="CASH">💵 Efectivo en Taller</option>
                    <option value="CARD">💳 Tarjeta Débito/Crédito (POS)</option>
                    <option value="DEPOSIT">📄 Boleta de Depósito</option>
                    <option value="CHEQUE">📑 Cheque</option>
                  </select>
                </div>
              </div>

              <div class="input-row">
                <div class="form-group">
                  <label class="form-label" for="paymentReference" style="font-weight: 700;">No. Boleta / Referencia Bancaria:</label>
                  <input type="text" id="paymentReference" class="input-control" placeholder="Ej: BI-981244 o Boleta 55102" style="min-height: 44px;">
                </div>
                <div class="form-group">
                  <label class="form-label" for="paymentRecordedBy" style="font-weight: 700;">Registrado Por:</label>
                  <input type="text" id="paymentRecordedBy" class="input-control" value="Miguel Dubois" style="min-height: 44px;">
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="paymentNotes" style="font-weight: 700;">Observaciones del Pago:</label>
                <textarea id="paymentNotes" class="input-control" placeholder="Detalles de conciliación, comprobante en WhatsApp..." rows="2"></textarea>
              </div>

              <div class="modal-actions-footer" style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.5rem;">
                <button type="button" class="btn btn-secondary" id="btnCancelPaymentModal">Cancelar</button>
                <button type="submit" class="btn btn-primary">Registrar Abono</button>
              </div>
            </form>
          </div>
        </div>

        <!-- MODAL 2: DETALLE DE ABONOS DE UN PEDIDO -->
        <div id="viewPaymentsModal" class="modal-backdrop" style="display: none;">
          <div class="modal-card" style="width: min(560px, 94vw);">
            <div class="modal-header">
              <div>
                <h2 style="font-size: 1.25rem; font-weight: 800; margin: 0;" id="viewModalTitle">Detalle de Pagos</h2>
                <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0.25rem 0 0;" id="viewModalSubtitle">
                  Histórico de transacciones registradas para este pedido.
                </p>
              </div>
              <button type="button" class="btn-close-modal" id="btnCloseViewModal">✕</button>
            </div>

            <div id="viewModalContent" style="margin-top: 1rem;">
              <!-- Inyectado dinámicamente -->
            </div>

            <div class="modal-actions-footer" style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.5rem;">
              <button type="button" class="btn btn-secondary" id="btnCloseViewModalFooter">Cerrar</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  onMount: () => {
    receivablesStore.syncWithApi().catch(() => {});
    // Modales y Controles
    const recordModal = document.getElementById('recordPaymentModal');
    const viewModal = document.getElementById('viewPaymentsModal');

    const btnOpenRecord = document.getElementById('btnOpenRecordPaymentModal');
    const btnCloseRecord = document.getElementById('btnClosePaymentModal');
    const btnCancelRecord = document.getElementById('btnCancelPaymentModal');
    const formRecord = document.getElementById('formRecordPayment');
    const orderSelect = document.getElementById('paymentOrderId');

    const btnCloseView = document.getElementById('btnCloseViewModal');
    const btnCloseViewFooter = document.getElementById('btnCloseViewModalFooter');

    const btnCopyAccounts = document.getElementById('btnCopyBankAccounts');
    const btnExportCSV = document.getElementById('btnExportReceivablesCSV');

    const searchInput = document.getElementById('receivablesSearchInput');
    const statusFilter = document.getElementById('receivablesStatusFilter');
    const agingFilter = document.getElementById('receivablesAgingFilter');

    const btnPayTotal = document.getElementById('btnChipPayTotal');
    const btnPayHalf = document.getElementById('btnChipPayHalf');

    function toggleModal(modal, show) {
      if (modal) modal.style.display = show ? 'block' : 'none';
      if (typeof document !== 'undefined' && document.body) {
        document.body.style.overflow = show ? 'hidden' : '';
      }
    }

    // Actualiza la tarjeta resumen dentro del modal de registro de pago
    function updateSelectedOrderCard() {
      if (!orderSelect) return;
      const orderId = orderSelect.value;
      const detail = receivablesStore.getOrderReceivableDetail(orderId);

      const clientEl = document.getElementById('selectedOrderClient');
      const agingEl = document.getElementById('selectedOrderAging');
      const totalEl = document.getElementById('selectedOrderTotal');
      const paidEl = document.getElementById('selectedOrderPaid');
      const balanceEl = document.getElementById('selectedOrderBalance');
      const amountInput = document.getElementById('paymentAmount');

      if (!detail) {
        if (clientEl) clientEl.textContent = 'Ningún pedido con saldo pendiente seleccionado.';
        return;
      }

      if (clientEl) clientEl.textContent = `${detail.orderId} — ${detail.customer?.company || detail.customer?.name || 'Cliente'}`;
      if (agingEl) {
        agingEl.textContent = detail.agingStatus.badge;
        agingEl.style.background = detail.agingStatus.bg;
        agingEl.style.color = detail.agingStatus.color;
        agingEl.style.borderColor = detail.agingStatus.border;
      }
      if (totalEl) totalEl.textContent = `Q${detail.grandTotalQ.toFixed(2)}`;
      if (paidEl) paidEl.textContent = `Q${detail.totalPaidQ.toFixed(2)}`;
      if (balanceEl) balanceEl.textContent = `Q${detail.pendingBalanceQ.toFixed(2)}`;

      if (amountInput && (!amountInput.value || parseFloat(amountInput.value) <= 0)) {
        amountInput.value = detail.pendingBalanceQ.toFixed(2);
      }
    }

    function populateOrderSelect(preselectedId = null) {
      if (!orderSelect) return;
      const receivables = receivablesStore.getAllReceivables({ status: 'DEBT_ONLY' });

      if (receivables.length === 0) {
        orderSelect.innerHTML = '<option value="">No hay pedidos con saldo pendiente</option>';
        updateSelectedOrderCard();
        return;
      }

      orderSelect.innerHTML = receivables.map(r => `
        <option value="${r.orderId}">
          ${r.orderId} - ${r.customer?.company || r.customer?.name || 'Cliente'} (Saldo: Q${r.pendingBalanceQ.toFixed(2)})
        </option>
      `).join('');

      if (preselectedId && receivables.some(r => r.orderId === preselectedId)) {
        orderSelect.value = preselectedId;
      }

      updateSelectedOrderCard();
    }

    if (orderSelect) {
      orderSelect.addEventListener('change', () => {
        const amountInput = document.getElementById('paymentAmount');
        if (amountInput) amountInput.value = '';
        updateSelectedOrderCard();
      });
    }

    if (btnPayTotal) {
      btnPayTotal.addEventListener('click', () => {
        const detail = receivablesStore.getOrderReceivableDetail(orderSelect?.value);
        if (detail) {
          document.getElementById('paymentAmount').value = detail.pendingBalanceQ.toFixed(2);
        }
      });
    }

    if (btnPayHalf) {
      btnPayHalf.addEventListener('click', () => {
        const detail = receivablesStore.getOrderReceivableDetail(orderSelect?.value);
        if (detail) {
          const half = Math.round((detail.grandTotalQ * 0.5 + Number.EPSILON) * 100) / 100;
          const suggested = Math.min(half, detail.pendingBalanceQ);
          document.getElementById('paymentAmount').value = suggested.toFixed(2);
        }
      });
    }

    if (btnOpenRecord) {
      btnOpenRecord.addEventListener('click', () => {
        populateOrderSelect();
        toggleModal(recordModal, true);
      });
    }

    if (btnCloseRecord) btnCloseRecord.addEventListener('click', () => toggleModal(recordModal, false));
    if (btnCancelRecord) btnCancelRecord.addEventListener('click', () => toggleModal(recordModal, false));

    if (btnCloseView) btnCloseView.addEventListener('click', () => toggleModal(viewModal, false));
    if (btnCloseViewFooter) btnCloseViewFooter.addEventListener('click', () => toggleModal(viewModal, false));

    if (formRecord) {
      formRecord.addEventListener('submit', (e) => {
        e.preventDefault();
        const orderId = orderSelect?.value;
        const amount = parseFloat(document.getElementById('paymentAmount')?.value) || 0;
        const method = document.getElementById('paymentMethod')?.value || 'TRANSFER';
        const reference = document.getElementById('paymentReference')?.value || '';
        const recordedBy = document.getElementById('paymentRecordedBy')?.value || 'Miguel Dubois';
        const notes = document.getElementById('paymentNotes')?.value || '';

        try {
          receivablesStore.recordPayment({
            orderId,
            amountQ: amount,
            method,
            reference,
            recordedBy,
            notes,
          });

          formRecord.reset();
          toggleModal(recordModal, false);
        } catch (err) {
          alert(err.message || 'Error al registrar el abono.');
        }
      });
    }

    // Copiar cuentas bancarias al portapapeles
    if (btnCopyAccounts) {
      btnCopyAccounts.addEventListener('click', () => {
        const text = [
          '🏦 *Cuenta Monetaria para Pagos — Kroma Lab UV DTF*',
          '• Banco Industrial (Monetaria): 5371667253',
          'A nombre de: Miguel Angel Dubois / Kroma Lab',
        ].join('\n');

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text);
          btnCopyAccounts.textContent = '✅ Cuentas Copiadas';
          setTimeout(() => {
            btnCopyAccounts.textContent = '📋 Copiar Cuentas';
          }, 2500);
        }
      });
    }

    // Toast de Notificación
    const toastEl = document.getElementById('receivablesToast');
    function showToast(message) {
      if (!toastEl) return;
      toastEl.textContent = message;
      toastEl.style.display = 'block';
      setTimeout(() => {
        if (toastEl) toastEl.style.display = 'none';
      }, 3500);
    }

    // Exportar CSV
    if (btnExportCSV) {
      btnExportCSV.addEventListener('click', () => {
        try {
          const csvContent = receivablesStore.exportReceivablesCSV();
          const filename = `cartera_cuentas_por_cobrar_${new Date().toISOString().slice(0, 10)}.csv`;
          downloadCSV(filename, csvContent);
          showToast('✅ Cartera de cuentas por cobrar exportada exitosamente en CSV.');
        } catch (err) {
          console.error('Error al exportar CSV:', err);
          showToast('❌ Ocurrió un error al generar los datos del CSV.');
        }
      });
    }

    if (searchInput) searchInput.addEventListener('input', renderReceivablesTable);
    if (statusFilter) statusFilter.addEventListener('change', renderReceivablesTable);
    if (agingFilter) agingFilter.addEventListener('change', renderReceivablesTable);

    // ==========================================
    // RENDERIZADO DE COMPONENTES
    // ==========================================
    function renderSummaryKPIs() {
      const container = document.getElementById('receivablesSummaryContainer');
      if (!container) return;

      const summary = receivablesStore.getReceivablesSummary();

      container.innerHTML = `
        <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; border-left: 4px solid ${summary.totalReceivableQ > 0 ? '#ef4444' : '#10b981'};">
          <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Saldo Total por Cobrar</span>
          <div style="font-size: 1.4rem; font-weight: 800; font-family: var(--font-mono); color: ${summary.totalReceivableQ > 0 ? '#ef4444' : '#10b981'}; margin: 0.2rem 0;">
            Q${summary.totalReceivableQ.toFixed(2)}
          </div>
          <span style="font-size: 0.78rem; color: var(--text-secondary);">${summary.clientsWithDebtCount} clientes con saldo pendiente</span>
        </div>

        <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; border-left: 4px solid #10b981;">
          <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Total Recaudado / Cobrado</span>
          <div style="font-size: 1.4rem; font-weight: 800; font-family: var(--font-mono); color: #10b981; margin: 0.2rem 0;">
            Q${summary.totalCollectedQ.toFixed(2)}
          </div>
          <span style="font-size: 0.78rem; color: var(--text-secondary);">Tasa de efectividad: ${summary.collectionRatePercent}%</span>
        </div>

        <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; border-left: 4px solid var(--cerulean);">
          <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Transacciones de Pago</span>
          <div style="font-size: 1.4rem; font-weight: 800; font-family: var(--font-mono); color: var(--cerulean); margin: 0.2rem 0;">
            ${summary.totalPaymentsCount} Abonos
          </div>
          <span style="font-size: 0.78rem; color: var(--text-secondary);">${summary.totalOrdersEvaluated} pedidos evaluados</span>
        </div>

        <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; border-left: 4px solid ${summary.overdueCount > 0 ? '#ef4444' : '#10b981'};">
          <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Saldos en Mora (>15d)</span>
          <div style="font-size: 1.4rem; font-weight: 800; font-family: var(--font-mono); color: ${summary.overdueCount > 0 ? '#ef4444' : '#10b981'}; margin: 0.2rem 0;">
            Q${summary.overdueDebtQ.toFixed(2)}
          </div>
          <span style="font-size: 0.78rem; color: var(--text-secondary);">${summary.overdueCount > 0 ? `${summary.overdueCount} pedidos en mora crítica` : 'Sin saldos vencidos'}</span>
        </div>
      `;
    }

    function renderReceivablesTable() {
      const tbody = document.getElementById('receivablesTableBody');
      const cardsContainer = document.getElementById('receivablesCardsContainer');
      const emptyState = document.getElementById('receivablesEmptyState');
      if (!tbody) return;

      const searchVal = searchInput?.value || '';
      const statusVal = statusFilter?.value || 'DEBT_ONLY';
      const agingVal = agingFilter?.value || 'ALL';

      const items = receivablesStore.getAllReceivables({
        status: statusVal,
        aging: agingVal,
        search: searchVal,
      });

      if (items.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" style="text-align: center; padding: 2.5rem 1rem; color: var(--text-secondary);">
              No se encontraron cuentas por cobrar con los filtros seleccionados.
            </td>
          </tr>
        `;
        if (cardsContainer) cardsContainer.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
      }

      if (emptyState) emptyState.style.display = 'none';

      // 1. Render Desktop Table Rows (> 1200px)
      tbody.innerHTML = items.map(item => {
        const aging = item.agingStatus;
        const pMeta = PAYMENT_STATUS_LABELS[item.paymentStatus] || { label: item.paymentStatus, color: '#64748b', bg: 'rgba(100, 116, 139, 0.15)' };
        const hasDebt = item.hasDebt;

        return `
          <tr class="receivables-row">
            <td class="col-order-code">
              <span class="mobile-td-label">No. Orden:</span>
              <span class="receivables-code-badge">${item.orderId}</span>
            </td>
            <td class="col-order-date">
              <span class="mobile-td-label">Fecha / Antigüedad:</span>
              <div class="receivables-date-text">
                ${new Date(item.createdAt).toLocaleDateString('es-GT', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              <span class="badge" style="background: ${aging.bg}; color: ${aging.color}; border-color: ${aging.border}; font-size: 0.68rem; margin-top: 0.2rem;">
                ${aging.badge} (${item.agingDays}d)
              </span>
            </td>
            <td class="col-order-client">
              <span class="mobile-td-label">Cliente & Empresa:</span>
              <div class="receivables-client-name">
                ${item.customer?.company || item.customer?.name || 'Cliente B2B'}
              </div>
              <div class="receivables-client-sub">
                ${item.customer?.phone || 'Sin teléfono'} • NIT: ${item.customer?.nit || 'CF'}
              </div>
            </td>
            <td class="col-order-total">
              <span class="mobile-td-label">Total (Q):</span>
              <span class="val-mono">Q${item.grandTotalQ.toFixed(2)}</span>
            </td>
            <td class="col-order-paid">
              <span class="mobile-td-label">Abonado (Q):</span>
              <span class="val-mono text-success">Q${item.totalPaidQ.toFixed(2)}</span>
            </td>
            <td class="col-order-balance">
              <span class="mobile-td-label">Saldo Pendiente (Q):</span>
              <span class="val-mono val-balance ${hasDebt ? 'text-danger' : 'text-success'}">
                Q${item.pendingBalanceQ.toFixed(2)}
              </span>
            </td>
            <td class="col-order-status">
              <span class="mobile-td-label">Estado:</span>
              <span class="badge" style="background: ${pMeta.bg}; color: ${pMeta.color}; border-color: ${pMeta.color}; font-size: 0.72rem; white-space: nowrap;">
                ${pMeta.label}
              </span>
            </td>
            <td class="col-order-actions">
              <span class="mobile-td-label">Acciones de Cobro:</span>
              <div class="receivables-actions-col">
                ${hasDebt ? `
                  <button type="button" class="btn btn-primary btn-quick-pay" data-order-id="${item.orderId}" title="Registrar abono">
                    ➕ Abonar
                  </button>
                  <button type="button" class="btn btn-secondary btn-whatsapp-reminder" data-order-id="${item.orderId}" title="Enviar recordatorio por WhatsApp">
                    💬 WhatsApp
                  </button>
                ` : `
                  <span class="receivables-settled-badge">
                    ✓ Liquidado
                  </span>
                `}
                <button type="button" class="btn btn-secondary btn-view-payments" data-order-id="${item.orderId}" title="Ver historial de pagos">
                  Ver Detalle
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      // 2. Render Mobile/Responsive Cards (<= 1200px)
      if (cardsContainer) {
        cardsContainer.innerHTML = items.map(item => {
          const aging = item.agingStatus;
          const pMeta = PAYMENT_STATUS_LABELS[item.paymentStatus] || { label: item.paymentStatus, color: '#64748b', bg: 'rgba(100, 116, 139, 0.15)' };
          const hasDebt = item.hasDebt;

          return `
            <div class="dispatch-card receivable-card" data-receivable-card="${item.orderId}" style="border-top: 4px solid ${hasDebt ? aging.color : '#10b981'};">
              <!-- Cabecera: Folio, Antigüedad y Estado -->
              <div class="dispatch-card-header">
                <div>
                  <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                    <span class="dispatch-card-folio">#${item.orderId}</span>
                    <span class="badge" style="background: ${aging.bg}; color: ${aging.color}; border-color: ${aging.border}; font-size: 0.72rem; font-weight: 700;">
                      ${aging.badge} (${item.agingDays}d)
                    </span>
                  </div>
                  <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.25rem;">
                    📅 ${new Date(item.createdAt).toLocaleDateString('es-GT', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>

                <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                  <span class="badge" style="background: ${pMeta.bg}; color: ${pMeta.color}; border-color: ${pMeta.color}; font-size: 0.76rem; font-weight: 700; padding: 0.35rem 0.65rem;">
                    ${pMeta.label}
                  </span>
                </div>
              </div>

              <!-- Cuerpo: Cliente y Métricas Financieras (3 columnas) -->
              <div class="dispatch-card-body">
                <div class="dispatch-card-client-row">
                  <div>
                    <div class="dispatch-card-client-name">
                      👤 ${item.customer?.company || item.customer?.name || 'Cliente B2B'}
                    </div>
                    <div class="dispatch-card-client-phone">
                      📞 <span>${item.customer?.phone || 'Sin teléfono'}</span>
                      <span>• NIT: ${item.customer?.nit || 'CF'}</span>
                    </div>
                  </div>
                </div>

                <div class="dispatch-card-metrics-grid">
                  <div class="dispatch-card-metric-col">
                    <span>Total</span>
                    <span style="color: var(--text-primary);">Q${item.grandTotalQ.toFixed(2)}</span>
                  </div>
                  <div class="dispatch-card-metric-col">
                    <span>Abonado</span>
                    <span style="color: #10b981;">Q${item.totalPaidQ.toFixed(2)}</span>
                  </div>
                  <div class="dispatch-card-metric-col">
                    <span>Saldo Pendiente</span>
                    <span style="color: ${hasDebt ? '#ef4444' : '#10b981'}; font-size: 1.05rem;">Q${item.pendingBalanceQ.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <!-- Pie: Acciones Táctiles de Cobranza -->
              <div class="dispatch-card-footer">
                <button 
                  type="button" 
                  class="btn btn-secondary btn-view-payments" 
                  data-order-id="${item.orderId}" 
                  style="font-size: 0.85rem; padding: 0.5rem 0.9rem; min-height: 42px; display: inline-flex; align-items: center; gap: 0.4rem;"
                  title="Ver historial de pagos"
                >
                  <span>🔍</span>
                  <span>Ver Detalle</span>
                </button>

                <div style="display: flex; align-items: center; gap: 0.45rem;">
                  ${hasDebt ? `
                    <button 
                      type="button" 
                      class="btn btn-primary btn-quick-pay" 
                      data-order-id="${item.orderId}" 
                      style="font-size: 0.85rem; padding: 0.5rem 0.9rem; min-height: 42px; display: inline-flex; align-items: center; gap: 0.4rem;"
                      title="Registrar abono"
                    >
                      ➕ Abonar
                    </button>
                    <button 
                      type="button" 
                      class="btn btn-secondary btn-whatsapp-reminder" 
                      data-order-id="${item.orderId}" 
                      style="font-size: 0.85rem; padding: 0.5rem 0.85rem; min-height: 42px; color: #10b981; border-color: rgba(16, 185, 129, 0.4); display: inline-flex; align-items: center; gap: 0.4rem;"
                      title="Enviar recordatorio por WhatsApp"
                    >
                      💬 WhatsApp
                    </button>
                  ` : `
                    <span class="receivables-settled-badge" style="font-size: 0.85rem; color: #10b981; font-weight: 700; padding: 0.5rem 0.75rem;">
                      ✓ Liquidado
                    </span>
                  `}
                </div>
              </div>
            </div>
          `;
        }).join('');
      }

      // Enlazar eventos de botones de acción en tabla y tarjetas
      [tbody, cardsContainer].forEach(container => {
        if (!container) return;
        container.querySelectorAll('.btn-quick-pay').forEach(btn => {
          btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-order-id');
            populateOrderSelect(id);
            toggleModal(recordModal, true);
          });
        });

        container.querySelectorAll('.btn-whatsapp-reminder').forEach(btn => {
          btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-order-id');
            const reminder = receivablesStore.generateWhatsAppReminder(id);
            if (reminder) {
              window.open(reminder.url, '_blank');
            }
          });
        });

        container.querySelectorAll('.btn-view-payments').forEach(btn => {
          btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-order-id');
            openViewPaymentsModal(id);
          });
        });
      });
    }

    function renderPaymentsTable() {
      const tbody = document.getElementById('paymentsTableBody');
      const cardsContainer = document.getElementById('paymentsCardsContainer');
      const emptyState = document.getElementById('paymentsEmptyState');
      if (!tbody) return;

      const payments = receivablesStore.getPayments();

      if (payments.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="9" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
              No hay pagos ni abonos registrados en el sistema.
            </td>
          </tr>
        `;
        if (cardsContainer) cardsContainer.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
      }

      if (emptyState) emptyState.style.display = 'none';

      // 1. Render Desktop Table Rows (> 1200px)
      tbody.innerHTML = payments.map(p => {
        const methodMeta = PAYMENT_METHODS[p.method] || { label: p.method, icon: '💵' };

        return `
          <tr class="receivables-payment-row">
            <td class="col-pay-id">
              <span class="mobile-td-label">ID Pago:</span>
              <span class="receivables-pay-code">${p.id}</span>
            </td>
            <td class="col-pay-date">
              <span class="mobile-td-label">Fecha & Hora:</span>
              <span style="font-size: 0.8rem; color: var(--text-secondary);">
                ${new Date(p.timestamp).toLocaleDateString('es-GT', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </td>
            <td class="col-pay-order">
              <span class="mobile-td-label">No. Orden:</span>
              <span style="font-family: var(--font-mono); font-weight: 800;">${p.orderId}</span>
            </td>
            <td class="col-pay-client">
              <span class="mobile-td-label">Cliente / Razón Social:</span>
              <strong>${p.clientName}</strong>
            </td>
            <td class="col-pay-method">
              <span class="mobile-td-label">Método:</span>
              <span class="badge" style="font-size: 0.72rem;">
                ${methodMeta.icon} ${methodMeta.label}
              </span>
            </td>
            <td class="col-pay-ref">
              <span class="mobile-td-label">No. Boleta / Ref:</span>
              <span style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--cerulean);">
                ${p.reference || '—'}
              </span>
            </td>
            <td class="col-pay-amount">
              <span class="mobile-td-label">Monto (Q):</span>
              <span style="font-family: var(--font-mono); font-weight: 800; color: #10b981;">
                Q${p.amountQ.toFixed(2)}
              </span>
            </td>
            <td class="col-pay-recorded">
              <span class="mobile-td-label">Registrado Por:</span>
              <span style="font-size: 0.8rem; color: var(--text-secondary);">${p.recordedBy}</span>
            </td>
            <td class="col-pay-action">
              <span class="mobile-td-label">Acción:</span>
              <button type="button" class="btn btn-secondary btn-delete-payment" data-payment-id="${p.id}" title="Eliminar abono" style="min-height: 44px; padding: 0.4rem 0.75rem; font-size: 0.78rem; color: #ef4444; border-color: rgba(239, 68, 68, 0.3);">
                🗑️ Anular
              </button>
            </td>
          </tr>
        `;
      }).join('');

      // 2. Render Mobile/Responsive Cards (<= 1200px)
      if (cardsContainer) {
        cardsContainer.innerHTML = payments.map(p => {
          const methodMeta = PAYMENT_METHODS[p.method] || { label: p.method, icon: '💵' };

          return `
            <div class="dispatch-card payment-card" data-payment-card="${p.id}" style="border-top: 4px solid #10b981;">
              <!-- Cabecera: ID Pago, No. Orden y Método -->
              <div class="dispatch-card-header">
                <div>
                  <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                    <span class="dispatch-card-folio" style="color: var(--cerulean);">${p.id}</span>
                    <span class="badge" style="color: var(--cerulean); border-color: var(--cerulean); font-size: 0.78rem; font-weight: 700;">
                      Pedido #${p.orderId}
                    </span>
                  </div>
                  <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.25rem;">
                    📅 ${new Date(p.timestamp).toLocaleDateString('es-GT', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                  <span class="badge" style="font-size: 0.76rem; padding: 0.35rem 0.65rem;">
                    ${methodMeta.icon} ${methodMeta.label}
                  </span>
                </div>
              </div>

              <!-- Cuerpo: Cliente, Referencia y Métricas Grid -->
              <div class="dispatch-card-body">
                <div class="dispatch-card-client-row">
                  <div>
                    <div class="dispatch-card-client-name">
                      👤 ${p.clientName}
                    </div>
                    <div class="dispatch-card-client-phone">
                      <span>Boleta / Referencia: </span>
                      <span style="font-family: var(--font-mono); font-weight: 700; color: var(--cerulean);">${p.reference || '—'}</span>
                    </div>
                  </div>
                </div>

                <div class="dispatch-card-metrics-grid" style="grid-template-columns: repeat(2, 1fr);">
                  <div class="dispatch-card-metric-col">
                    <span>Monto Recibido</span>
                    <span style="color: #10b981; font-size: 1.05rem;">Q${p.amountQ.toFixed(2)}</span>
                  </div>
                  <div class="dispatch-card-metric-col">
                    <span>Registrado Por</span>
                    <span style="color: var(--text-secondary); font-size: 0.85rem; font-family: var(--font-sans);">${p.recordedBy}</span>
                  </div>
                </div>
              </div>

              <!-- Pie: Acción de Anular Pago -->
              <div class="dispatch-card-footer" style="justify-content: flex-end;">
                <button 
                  type="button" 
                  class="btn btn-secondary btn-delete-payment" 
                  data-payment-id="${p.id}" 
                  style="font-size: 0.85rem; min-height: 42px; padding: 0.45rem 0.85rem; color: #ef4444; border-color: rgba(239, 68, 68, 0.4); display: inline-flex; align-items: center; gap: 0.4rem;"
                  title="Eliminar abono"
                >
                  <span>🗑️</span>
                  <span>Anular Abono</span>
                </button>
              </div>
            </div>
          `;
        }).join('');
      }

      // Enlazar eventos de eliminación en tabla y tarjetas
      [tbody, cardsContainer].forEach(container => {
        if (!container) return;
        container.querySelectorAll('.btn-delete-payment').forEach(btn => {
          btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-payment-id');
            if (confirm(`¿Estás seguro de anular el pago ${id}? Esto revertirá el saldo de la orden.`)) {
              receivablesStore.deletePayment(id);
            }
          });
        });
      });
    }

    function openViewPaymentsModal(orderId) {
      const detail = receivablesStore.getOrderReceivableDetail(orderId);
      if (!detail) return;

      const title = document.getElementById('viewModalTitle');
      const subtitle = document.getElementById('viewModalSubtitle');
      const content = document.getElementById('viewModalContent');

      if (title) title.textContent = `Abonos de Pedido #${detail.orderId}`;
      if (subtitle) subtitle.textContent = `${detail.customer?.company || detail.customer?.name} • ${detail.itemsSummary}`;

      if (content) {
        content.innerHTML = `
          <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1rem;">
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; font-size: 0.85rem;">
              <div>
                <span style="color: var(--text-muted); display: block; font-size: 0.75rem;">Total Orden:</span>
                <strong style="font-family: var(--font-mono); font-size: 1.1rem;">Q${detail.grandTotalQ.toFixed(2)}</strong>
              </div>
              <div>
                <span style="color: var(--text-muted); display: block; font-size: 0.75rem;">Total Abonado:</span>
                <strong style="font-family: var(--font-mono); font-size: 1.1rem; color: #10b981;">Q${detail.totalPaidQ.toFixed(2)}</strong>
              </div>
              <div>
                <span style="color: var(--text-muted); display: block; font-size: 0.75rem;">Saldo Pendiente:</span>
                <strong style="font-family: var(--font-mono); font-size: 1.1rem; color: ${detail.hasDebt ? '#ef4444' : '#10b981'};">Q${detail.pendingBalanceQ.toFixed(2)}</strong>
              </div>
            </div>
          </div>

          <h3 style="font-size: 0.95rem; font-weight: 800; margin: 1rem 0 0.5rem;">Desglose de Transacciones:</h3>
          ${detail.payments.length === 0 ? `
            <div style="text-align: center; padding: 1.5rem; color: var(--text-secondary); font-size: 0.85rem; background: var(--bg-surface); border-radius: var(--radius-md);">
              No se han registrado abonos previos para este pedido.
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              ${detail.payments.map(p => {
                const method = PAYMENT_METHODS[p.method] || { label: p.method, icon: '💵' };
                return `
                  <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-surface); padding: 0.75rem 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); flex-wrap: wrap; gap: 0.5rem;">
                    <div>
                      <div style="font-weight: 800; font-size: 0.85rem; color: var(--text-primary);">
                        ${method.icon} ${method.label} • <span style="font-family: var(--font-mono); color: var(--cerulean);">${p.id}</span>
                      </div>
                      <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.15rem;">
                        ${new Date(p.timestamp).toLocaleDateString('es-GT', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} • Ref: <strong>${p.reference || 'Sin ref'}</strong>
                      </div>
                      ${p.notes ? `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem; font-style: italic;">"${p.notes}"</div>` : ''}
                    </div>
                    <div style="font-family: var(--font-mono); font-weight: 800; font-size: 1.1rem; color: #10b981;">
                      +Q${p.amountQ.toFixed(2)}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        `;
      }

      toggleModal(viewModal, true);
    }

    function renderAll() {
      renderSummaryKPIs();
      renderReceivablesTable();
      renderPaymentsTable();
    }

    const unsub = receivablesStore.subscribe(() => {
      renderAll();
    });

    renderAll();

    return () => {
      unsub();
      toggleModal(recordModal, false);
      toggleModal(viewModal, false);
    };
  },
};
