/**
 * Vista de Gestión de Pedidos UV DTF (Diferenciada por Rol: Cliente vs Staff).
 * Proporciona supervisión comercial, actualización de estados de pago y producción,
 * y generación de la Hoja de Ruta / Orden de Taller para la impresora Audley.
 */

import { store } from '../store.js';
import { ordersStore, PAYMENT_STATUS, PAYMENT_STATUS_LABELS, PRODUCTION_STATUS_LABELS } from '../modules/orders-store.js';
import { ORDER_STATUS, BUSINESS_CONFIG } from '../../shared/business-config.js';

export const ordersView = {
  path: '/pedidos',
  name: 'orders',
  allowedRoles: ['CUSTOMER', 'EMPLOYEE', 'ADMIN'],
  render: () => {
    const role = store.state.user?.role || 'CUSTOMER';
    const isStaff = role === 'ADMIN' || role === 'EMPLOYEE';

    return `
      <div style="padding: 2rem 0 4rem;">
        <!-- Cabecera de la Vista -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <span class="badge">${isStaff ? 'Gestión Operativa B2B' : 'Portal de Clientes'}</span>
            <h1 style="font-size: clamp(1.8rem, 3.5vw, 2.4rem); font-weight: 800; margin: 0.5rem 0 0.25rem;">
              ${isStaff ? 'Control General de Pedidos' : 'Mis Pedidos UV DTF'}
            </h1>
            <p style="color: var(--text-secondary); font-size: 0.95rem;">
              ${isStaff ? 'Supervisión de tirajes, cobros y hojas de trabajo para la máquina Audley.' : 'Consulta el avance de producción de tus stickers y comprobantes.'}
            </p>
          </div>

          <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
            ${isStaff ? `
              <button id="btnOpenNewOrderModal" class="btn btn-secondary" style="font-size: 0.88rem; padding: 0.55rem 1rem;">
                <span>+</span>
                <span>Registrar Pedido</span>
              </button>
            ` : ''}
            <a href="/" class="btn btn-primary" data-link style="font-size: 0.88rem; padding: 0.55rem 1rem;">
              <span>+</span>
              <span>Nueva Cotización / Pedido</span>
            </a>
          </div>
        </div>

        <!-- Métricas KPI para Staff -->
        ${isStaff ? `
          <div id="ordersMetricsContainer" class="orders-metrics-grid">
            <!-- Inyectado por renderOrdersMetrics() -->
          </div>
        ` : ''}

        <!-- Barra de Búsqueda y Filtros -->
        <div class="orders-controls-bar">
          <div class="orders-filters-group">
            <input type="text" id="orderSearchInput" class="input-control orders-search-input" placeholder="Buscar por # orden, cliente o NIT...">
            
            <select id="filterProductionStatus" class="input-control" style="max-width: 190px;">
              <option value="ALL">Producción: Todos</option>
              <option value="${ORDER_STATUS.IN_AUDLEY_QUEUE}">En Cola Audley</option>
              <option value="${ORDER_STATUS.PRINTING}">Imprimiendo UV</option>
              <option value="${ORDER_STATUS.LAMINATING_CUTTING}">Laminado y Corte</option>
              <option value="${ORDER_STATUS.READY_FOR_DELIVERY}">Listo para Entrega</option>
              <option value="${ORDER_STATUS.COMPLETED}">Entregado</option>
            </select>

            <select id="filterPaymentStatus" class="input-control" style="max-width: 170px;">
              <option value="ALL">Pago: Todos</option>
              <option value="${PAYMENT_STATUS.PENDING}">Pendiente</option>
              <option value="${PAYMENT_STATUS.PARTIAL}">Anticipo 50%</option>
              <option value="${PAYMENT_STATUS.PAID}">Pagado</option>
            </select>
          </div>
        </div>

        <!-- Tabla Principal de Pedidos -->
        <div class="calc-card" style="padding: 1.25rem; overflow-x: auto; -webkit-overflow-scrolling: touch;">
          <div class="mobile-scroll-hint">
            <span>👈 Desliza horizontalmente para ver más columnas 👉</span>
          </div>
          <table class="orders-table">
            <thead>
              <tr>
                <th>Código</th>
                ${isStaff ? '<th>Cliente</th>' : ''}
                <th>Diseño & Medida</th>
                <th>Metros</th>
                <th>Total</th>
                <th>Estado Producción</th>
                ${isStaff ? '<th>Estado Pago</th>' : ''}
                <th style="text-align: right;">Acciones</th>
              </tr>
            </thead>
            <tbody id="ordersTableBody">
              <!-- Filas generadas por renderOrdersTable() -->
            </tbody>
          </table>
          <div id="ordersEmptyState" class="kanban-empty-col" style="display: none; margin: 1.5rem 0;">
            No se encontraron pedidos que coincidan con los filtros seleccionados.
          </div>
        </div>
      </div>

      <!-- MODAL: FICHA DE DETALLES DEL PEDIDO -->
      <div id="orderDetailModal" class="modal-backdrop" style="display: none;">
        <div class="modal-card" style="width: min(640px, 94vw);">
          <div class="modal-header">
            <div>
              <span class="badge" id="modalDetailBadge">#KL-00000</span>
              <h2 id="modalDetailTitle" style="font-size: 1.35rem; font-weight: 800; margin-top: 0.35rem;">Detalle del Pedido</h2>
            </div>
            <button type="button" class="btn-close-modal" id="btnCloseDetailModal">✕</button>
          </div>

          <div id="modalDetailContent" style="font-size: 0.92rem; line-height: 1.6;">
            <!-- Contenido inyectado dinámicamente -->
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem;">
            <button type="button" class="btn btn-primary" id="btnOkDetailModal">Cerrar Ficha</button>
          </div>
        </div>
      </div>

      <!-- MODAL: HOJA DE RUTA / ORDEN DE TALLER AUDLEY (IMPRIMIBLE) -->
      <div id="workshopSheetModal" class="modal-backdrop" style="display: none;">
        <div class="modal-card" style="width: min(780px, 95vw); max-height: 92vh;">
          <div class="modal-header btn-print-hide">
            <div>
              <span class="badge" style="color: var(--cerulean); border-color: var(--cerulean);">Taller Industrial</span>
              <h2 style="font-size: 1.35rem; font-weight: 800; margin-top: 0.35rem;">Hoja de Taller Audley UV DTF</h2>
            </div>
            <button type="button" class="btn-close-modal" id="btnCloseWorkshopModal">✕</button>
          </div>

          <div id="workshopSheetContainer">
            <!-- Hoja técnica inyectada dinámicamente -->
          </div>

          <div class="btn-print-hide" style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
            <span style="font-size: 0.85rem; color: var(--text-muted);">
              💡 Imprime esta ficha o colócala junto a la bobina montada en la máquina.
            </span>
            <div style="display: flex; gap: 0.75rem;">
              <button type="button" class="btn btn-secondary" id="btnCancelWorkshopModal">Cerrar</button>
              <button type="button" class="btn btn-primary" id="btnPrintWorkshopSheet">
                <span>🖨️</span>
                <span>Imprimir Hoja de Taller</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- MODAL: REGISTRAR PEDIDO MANUAL (STAFF) -->
      <div id="staffCreateOrderModal" class="modal-backdrop" style="display: none;">
        <div class="modal-card" style="width: min(540px, 94vw);">
          <div class="modal-header">
            <div>
              <h2 style="font-size: 1.25rem; font-weight: 800;">+ Registrar Pedido Manual</h2>
              <p style="font-size: 0.85rem; color: var(--text-secondary);">Ingreso directo a cartera comercial y cola de taller</p>
            </div>
            <button type="button" class="btn-close-modal" id="btnCloseCreateOrderModal">✕</button>
          </div>

          <form id="formStaffCreateOrder">
            <div class="input-row">
              <div class="form-group">
                <label class="form-label" for="manualCustName">Contacto:</label>
                <input type="text" id="manualCustName" class="input-control" placeholder="Ej. Rodrigo Méndez" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="manualCustCompany">Empresa / Marca:</label>
                <input type="text" id="manualCustCompany" class="input-control" placeholder="Ej. Café San Cristóbal">
              </div>
            </div>

            <div class="input-row">
              <div class="form-group">
                <label class="form-label" for="manualCustPhone">WhatsApp:</label>
                <input type="tel" id="manualCustPhone" class="input-control" placeholder="+502 5555-1234" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="manualCustNit">NIT (SAT):</label>
                <input type="text" id="manualCustNit" class="input-control" value="CF">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="manualCustAddress">Dirección de Entrega:</label>
              <input type="text" id="manualCustAddress" class="input-control" placeholder="Zona, municipio...">
            </div>

            <div class="input-row">
              <div class="form-group">
                <label class="form-label" for="manualItemTitle">Nombre del Diseño:</label>
                <input type="text" id="manualItemTitle" class="input-control" placeholder="Ej. Stickers Logo 5x5" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="manualItemQty">Cantidad (piezas):</label>
                <input type="number" id="manualItemQty" class="input-control" value="100" min="1" max="10000" required>
              </div>
            </div>

            <div class="input-row">
              <div class="form-group">
                <label class="form-label" for="manualItemWidth">Ancho (cm):</label>
                <input type="number" id="manualItemWidth" class="input-control" value="5" min="0.5" max="28" step="0.1" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="manualItemHeight">Alto (cm):</label>
                <input type="number" id="manualItemHeight" class="input-control" value="5" min="0.5" max="150" step="0.1" required>
              </div>
            </div>

            <div class="input-row">
              <div class="form-group">
                <label class="form-label" for="manualMeters">Metros Facturables:</label>
                <input type="number" id="manualMeters" class="input-control" value="1.5" min="0.1" max="100" step="0.05" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="manualTotalQ">Total (Q):</label>
                <input type="number" id="manualTotalQ" class="input-control" value="172.50" min="1" max="100000" step="0.05" required>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="manualPaymentStatus">Estado de Pago Inicial:</label>
              <select id="manualPaymentStatus" class="input-control">
                <option value="${PAYMENT_STATUS.PENDING}">Pendiente de Pago</option>
                <option value="${PAYMENT_STATUS.PARTIAL}">Anticipo 50%</option>
                <option value="${PAYMENT_STATUS.PAID}">Pagado 100%</option>
              </select>
            </div>

            <div class="form-group">
              <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; cursor: pointer;">
                <input type="checkbox" id="manualCheckCutting">
                <span>✂️ Incluye servicio de corte perimetral individual</span>
              </label>
            </div>

            <div class="form-group">
              <label class="form-label" for="manualNotes">Notas de Producción:</label>
              <textarea id="manualNotes" class="input-control" rows="2" placeholder="Instrucciones para el taller..."></textarea>
            </div>

            <div class="modal-actions-footer">
              <button type="button" class="btn btn-secondary" id="btnCancelCreateOrderModal">Cancelar</button>
              <button type="submit" class="btn btn-primary">Crear Pedido</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  onMount: () => {
    const role = store.state.user?.role || 'CUSTOMER';
    const isStaff = role === 'ADMIN' || role === 'EMPLOYEE';

    const metricsContainer = document.getElementById('ordersMetricsContainer');
    const tableBody = document.getElementById('ordersTableBody');
    const emptyState = document.getElementById('ordersEmptyState');
    const searchInput = document.getElementById('orderSearchInput');
    const filterProd = document.getElementById('filterProductionStatus');
    const filterPay = document.getElementById('filterPaymentStatus');

    // Modales
    const detailModal = document.getElementById('orderDetailModal');
    const btnCloseDetailModal = document.getElementById('btnCloseDetailModal');
    const btnOkDetailModal = document.getElementById('btnOkDetailModal');

    const workshopModal = document.getElementById('workshopSheetModal');
    const btnCloseWorkshopModal = document.getElementById('btnCloseWorkshopModal');
    const btnCancelWorkshopModal = document.getElementById('btnCancelWorkshopModal');
    const btnPrintWorkshopSheet = document.getElementById('btnPrintWorkshopSheet');

    const createModal = document.getElementById('staffCreateOrderModal');
    const btnOpenNewOrder = document.getElementById('btnOpenNewOrderModal');
    const btnCloseCreateModal = document.getElementById('btnCloseCreateOrderModal');
    const btnCancelCreateModal = document.getElementById('btnCancelCreateOrderModal');
    const formCreateOrder = document.getElementById('formStaffCreateOrder');

    function toggleModal(modal, show) {
      if (modal) modal.style.display = show ? 'block' : 'none';
    }

    if (btnCloseDetailModal) btnCloseDetailModal.addEventListener('click', () => toggleModal(detailModal, false));
    if (btnOkDetailModal) btnOkDetailModal.addEventListener('click', () => toggleModal(detailModal, false));

    if (btnCloseWorkshopModal) btnCloseWorkshopModal.addEventListener('click', () => toggleModal(workshopModal, false));
    if (btnCancelWorkshopModal) btnCancelWorkshopModal.addEventListener('click', () => toggleModal(workshopModal, false));
    if (btnPrintWorkshopSheet) btnPrintWorkshopSheet.addEventListener('click', () => {
      if (typeof window !== 'undefined') window.print();
    });

    if (btnOpenNewOrder) btnOpenNewOrder.addEventListener('click', () => toggleModal(createModal, true));
    if (btnCloseCreateModal) btnCloseCreateModal.addEventListener('click', () => toggleModal(createModal, false));
    if (btnCancelCreateModal) btnCancelCreateModal.addEventListener('click', () => toggleModal(createModal, false));

    // Submit de creación manual de orden
    if (formCreateOrder) {
      formCreateOrder.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('manualCustName')?.value || 'Cliente';
        const company = document.getElementById('manualCustCompany')?.value || '';
        const phone = document.getElementById('manualCustPhone')?.value || '+502 5555-0000';
        const nit = document.getElementById('manualCustNit')?.value || 'CF';
        const address = document.getElementById('manualCustAddress')?.value || '';

        const itemTitle = document.getElementById('manualItemTitle')?.value || 'Stickers';
        const itemQty = parseInt(document.getElementById('manualItemQty')?.value, 10) || 50;
        const itemWidth = parseFloat(document.getElementById('manualItemWidth')?.value) || 5;
        const itemHeight = parseFloat(document.getElementById('manualItemHeight')?.value) || 5;
        const meters = parseFloat(document.getElementById('manualMeters')?.value) || 1.5;
        const totalQ = parseFloat(document.getElementById('manualTotalQ')?.value) || 172.5;
        const paymentStatus = document.getElementById('manualPaymentStatus')?.value || PAYMENT_STATUS.PENDING;
        const includeCutting = Boolean(document.getElementById('manualCheckCutting')?.checked);
        const notes = document.getElementById('manualNotes')?.value || '';

        const newOrder = ordersStore.createOrder({
          customer: { name, company, phone, nit, address },
          cartTotals: {
            totalBillableMeters: meters,
            tierRate: 115.0,
            materialTotalQ: totalQ,
            cuttingTotalQ: includeCutting ? 25.0 : 0.0,
            grandTotalQ: totalQ,
            hasCutting: includeCutting,
          },
          items: [
            {
              title: itemTitle,
              widthCm: itemWidth,
              heightCm: itemHeight,
              qty: itemQty,
              actualLinearMeters: meters,
              stickersPerRow: 5,
              rows: 10,
              includeCutting,
              cuttingRateUnit: 0.30,
              finishType: 'Barniz con Relieve 3D',
            }
          ],
          workshopNotes: notes,
        });

        // Actualizar estado de pago si fue seleccionado
        if (paymentStatus !== PAYMENT_STATUS.PENDING) {
          ordersStore.updatePaymentStatus(newOrder.id, paymentStatus);
        }

        formCreateOrder.reset();
        toggleModal(createModal, false);
      });
    }

    // Render de KPIs para Staff
    function renderOrdersMetrics() {
      if (!metricsContainer || !isStaff) return;
      const metrics = ordersStore.getSummaryMetrics();

      metricsContainer.innerHTML = `
        <div class="orders-metric-card" style="border-top: 4px solid var(--cerulean);">
          <span class="orders-metric-title">Pedidos Activos</span>
          <span class="orders-metric-value">${metrics.activeOrdersCount}</span>
        </div>
        <div class="orders-metric-card" style="border-top: 4px solid var(--color-warning);">
          <span class="orders-metric-title">Metros en Taller</span>
          <span class="orders-metric-value" style="color: var(--cerulean);">${metrics.activeMeters.toFixed(2)} m</span>
        </div>
        <div class="orders-metric-card" style="border-top: 4px solid var(--color-success);">
          <span class="orders-metric-title">Total Facturación</span>
          <span class="orders-metric-value" style="color: var(--color-success);">Q${metrics.totalRevenueQ.toFixed(2)}</span>
        </div>
        <div class="orders-metric-card" style="border-top: 4px solid var(--color-danger);">
          <span class="orders-metric-title">Pendiente de Cobro</span>
          <span class="orders-metric-value" style="color: ${metrics.pendingPaymentQ > 0 ? '#ef4444' : 'var(--text-secondary)'};">
            Q${metrics.pendingPaymentQ.toFixed(2)}
          </span>
        </div>
      `;
    }

    // Render de Tabla de Pedidos
    function renderOrdersTable() {
      if (!tableBody) return;
      const allOrders = ordersStore.getOrders();
      const q = (searchInput?.value || '').toLowerCase().trim();
      const prodFilter = filterProd?.value || 'ALL';
      const payFilter = filterPay?.value || 'ALL';

      const filtered = allOrders.filter(o => {
        const matchesQuery = !q || 
          o.id.toLowerCase().includes(q) ||
          o.customer.name.toLowerCase().includes(q) ||
          o.customer.company.toLowerCase().includes(q) ||
          o.customer.nit.toLowerCase().includes(q);

        const matchesProd = prodFilter === 'ALL' || o.productionStatus === prodFilter;
        const matchesPay = payFilter === 'ALL' || o.paymentStatus === payFilter;

        return matchesQuery && matchesProd && matchesPay;
      });

      if (filtered.length === 0) {
        tableBody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
      }

      if (emptyState) emptyState.style.display = 'none';

      tableBody.innerHTML = filtered.map(order => {
        const itemsSummary = order.items.length > 0
          ? `${order.items[0].title} (${order.items[0].qty} uds)`
          : 'Diseños varios';

        const prodStyle = PRODUCTION_STATUS_LABELS[order.productionStatus];
        const payStyle = PAYMENT_STATUS_LABELS[order.paymentStatus];

        return `
          <tr data-order-row="${order.id}">
            <td style="font-weight: 700; font-family: var(--font-mono);">
              ${order.id}
              <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: normal;">
                ${new Date(order.createdAt).toLocaleDateString('es-GT', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </td>

            ${isStaff ? `
              <td>
                <div style="font-weight: 700; color: var(--text-primary);">${order.customer.company || order.customer.name}</div>
                <div style="font-size: 0.8rem; color: var(--text-secondary);">${order.customer.name} • ${order.customer.phone}</div>
              </td>
            ` : ''}

            <td>
              <div>${itemsSummary}</div>
              <div style="font-size: 0.78rem; color: var(--text-muted);">
                ${order.items[0] ? `${order.items[0].widthCm} × ${order.items[0].heightCm} cm` : ''}
                ${order.items.length > 1 ? ` (+${order.items.length - 1} más)` : ''}
              </div>
            </td>

            <td style="font-family: var(--font-mono); font-weight: 600;">
              ${order.metrics.totalBillableMeters.toFixed(2)} m
            </td>

            <td style="font-weight: 800; font-family: var(--font-mono); color: var(--text-primary);">
              Q${order.metrics.grandTotalQ.toFixed(2)}
            </td>

            <td>
              ${isStaff ? `
                <select class="select-status select-prod-status" data-order-id="${order.id}" style="background: ${prodStyle.bg}; color: ${prodStyle.color}; border-color: ${prodStyle.color};">
                  <option value="${ORDER_STATUS.IN_AUDLEY_QUEUE}" ${order.productionStatus === ORDER_STATUS.IN_AUDLEY_QUEUE ? 'selected' : ''}>En Cola Audley</option>
                  <option value="${ORDER_STATUS.PRINTING}" ${order.productionStatus === ORDER_STATUS.PRINTING ? 'selected' : ''}>Imprimiendo UV</option>
                  <option value="${ORDER_STATUS.LAMINATING_CUTTING}" ${order.productionStatus === ORDER_STATUS.LAMINATING_CUTTING ? 'selected' : ''}>Laminado y Corte</option>
                  <option value="${ORDER_STATUS.READY_FOR_DELIVERY}" ${order.productionStatus === ORDER_STATUS.READY_FOR_DELIVERY ? 'selected' : ''}>Listo para Entrega</option>
                  <option value="${ORDER_STATUS.COMPLETED}" ${order.productionStatus === ORDER_STATUS.COMPLETED ? 'selected' : ''}>Entregado</option>
                  <option value="${ORDER_STATUS.CANCELLED}" ${order.productionStatus === ORDER_STATUS.CANCELLED ? 'selected' : ''}>Cancelado</option>
                </select>
              ` : `
                <span class="badge" style="background: ${prodStyle.bg}; color: ${prodStyle.color}; border-color: ${prodStyle.color};">
                  ${prodStyle.label}
                </span>
              `}
            </td>

            ${isStaff ? `
              <td>
                <select class="select-status select-pay-status" data-order-id="${order.id}" style="background: ${payStyle.bg}; color: ${payStyle.color}; border-color: ${payStyle.color};">
                  <option value="${PAYMENT_STATUS.PENDING}" ${order.paymentStatus === PAYMENT_STATUS.PENDING ? 'selected' : ''}>Pendiente</option>
                  <option value="${PAYMENT_STATUS.PARTIAL}" ${order.paymentStatus === PAYMENT_STATUS.PARTIAL ? 'selected' : ''}>Anticipo 50%</option>
                  <option value="${PAYMENT_STATUS.PAID}" ${order.paymentStatus === PAYMENT_STATUS.PAID ? 'selected' : ''}>Pagado</option>
                </select>
              </td>
            ` : ''}

            <td style="text-align: right; white-space: nowrap;">
              <button class="btn-action-icon btn-view-order" data-order-id="${order.id}" title="Ver Ficha">
                <span>🔍</span>
              </button>
              ${isStaff ? `
                <button class="btn-action-icon btn-workshop-sheet" data-order-id="${order.id}" title="Hoja de Taller Audley">
                  <span>🖨️</span>
                </button>
              ` : ''}
              <a href="https://api.whatsapp.com/send?phone=${(order.customer.phone || BUSINESS_CONFIG.phoneWhatsApp).replace(/\D/g, '')}&text=${encodeURIComponent(`*KROMA LAB — Pedido #${order.id}*\nHola, deseo consultar el estado de este pedido.`)}" target="_blank" rel="noopener noreferrer" class="btn-action-icon" title="Chat WhatsApp">
                <span>💬</span>
              </a>
            </td>
          </tr>
        `;
      }).join('');

      attachTableEvents();
    }

    function showOrderDetailsModal(orderId) {
      const order = ordersStore.getOrderById(orderId);
      if (!order) return;

      const badgeEl = document.getElementById('modalDetailBadge');
      const titleEl = document.getElementById('modalDetailTitle');
      const contentEl = document.getElementById('modalDetailContent');

      if (badgeEl) badgeEl.textContent = `#${order.id}`;
      if (titleEl) titleEl.textContent = order.customer.company || order.customer.name;

      if (contentEl) {
        const prodStyle = PRODUCTION_STATUS_LABELS[order.productionStatus];
        const payStyle = PAYMENT_STATUS_LABELS[order.paymentStatus];

        contentEl.innerHTML = `
          <div class="order-detail-meta-grid">
            <div>
              <span style="color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase;">Cliente / Contacto:</span>
              <div style="font-weight: 700;">${order.customer.name}</div>
              <div style="color: var(--text-secondary); font-size: 0.85rem;">${order.customer.company}</div>
            </div>
            <div>
              <span style="color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase;">Facturación SAT:</span>
              <div style="font-weight: 700; font-family: var(--font-mono);">NIT: ${order.customer.nit || 'CF'}</div>
              <div style="color: var(--text-secondary); font-size: 0.85rem;">${order.customer.phone}</div>
            </div>
            <div>
              <span style="color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase;">Estado de Producción:</span>
              <div><strong style="color: ${prodStyle.color};">${prodStyle.label}</strong></div>
            </div>
            <div>
              <span style="color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase;">Estado de Pago:</span>
              <div><strong style="color: ${payStyle.color};">${payStyle.label}</strong></div>
            </div>
          </div>

          <div style="margin-bottom: 1rem;">
            <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.5rem;">Diseños incluidos en el pedido:</h4>
            ${order.items.map((it, idx) => `
              <div style="background: var(--bg-surface-elevated); padding: 0.75rem 1rem; border-radius: 4px; border: 1px solid var(--border-color); margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <strong>${idx + 1}. ${it.title}</strong>
                  <div style="font-size: 0.82rem; color: var(--text-secondary);">
                    ${it.widthCm} × ${it.heightCm} cm • ${it.qty} unidades • ${it.includeCutting ? '✂️ Con corte' : '📜 En rollo'}
                  </div>
                </div>
                <span class="badge" style="font-size: 0.75rem;">${it.actualLinearMeters.toFixed(2)} m</span>
              </div>
            `).join('')}
          </div>

          <div style="background: var(--bg-surface-elevated); padding: 1rem; border-radius: 4px; border: 1px solid var(--border-color); font-family: var(--font-mono);">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
              <span>Metros Facturables:</span>
              <strong>${order.metrics.totalBillableMeters.toFixed(2)} m</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
              <span>Corte Individual:</span>
              <strong>+Q${order.metrics.cuttingTotalQ.toFixed(2)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 1.15rem; font-weight: 800; border-top: 1px solid var(--border-color); padding-top: 0.5rem; color: var(--color-success);">
              <span>Total Estimado:</span>
              <span>Q${order.metrics.grandTotalQ.toFixed(2)}</span>
            </div>
          </div>

          ${order.workshopNotes ? `
            <div style="margin-top: 1rem; padding: 0.75rem; background: rgba(28, 114, 147, 0.1); border-left: 3px solid var(--cerulean); border-radius: 4px; font-size: 0.88rem;">
              <strong>Notas:</strong> ${order.workshopNotes}
            </div>
          ` : ''}
        `;
      }

      toggleModal(detailModal, true);
    }

    function showWorkshopSheetModal(orderId) {
      const order = ordersStore.getOrderById(orderId);
      if (!order) return;

      const container = document.getElementById('workshopSheetContainer');
      if (container) {
        container.innerHTML = `
          <div class="workshop-sheet-card">
            <div class="workshop-sheet-header">
              <div>
                <h1 style="font-size: 1.5rem; font-weight: 900; margin: 0; color: #0f172a; letter-spacing: -0.02em;">
                  KROMA LAB — ORDEN DE TRABAJO
                </h1>
                <p style="margin: 0.25rem 0 0; font-size: 0.85rem; color: #475569;">
                  Taller de Impresión Industrial UV DTF (Bobina Audley 28 cm útiles)
                </p>
              </div>
              <div style="text-align: right;">
                <div style="font-family: monospace; font-size: 1.4rem; font-weight: 900; color: #0284c7;">#${order.id}</div>
                <div style="font-size: 0.8rem; color: #64748b;">
                  Fecha: ${new Date(order.createdAt).toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </div>
              </div>
            </div>

            <div class="workshop-meta-grid">
              <div>
                <strong style="display: block; font-size: 0.8rem; text-transform: uppercase; color: #64748b;">Cliente / Marca:</strong>
                <span style="font-size: 1.05rem; font-weight: 800; color: #0f172a;">${order.customer.company || order.customer.name}</span>
                <div style="font-size: 0.85rem; color: #334155;">Contacto: ${order.customer.name} (${order.customer.phone})</div>
                <div style="font-size: 0.82rem; color: #64748b;">NIT: ${order.customer.nit || 'CF'}</div>
              </div>
              <div>
                <strong style="display: block; font-size: 0.8rem; text-transform: uppercase; color: #64748b;">Especificaciones de Tirada:</strong>
                <div style="font-size: 0.95rem; font-weight: 700; color: #0284c7;">
                  Metraje Total: ${order.metrics.totalBillableMeters.toFixed(2)} metros lineales
                </div>
                <div style="font-size: 0.85rem; color: #334155;">
                  Acabado: <strong>${order.metrics.hasCutting ? '✂️ CORTE INDIVIDUAL' : '📜 EN ROLLO CONTINUO'}</strong>
                </div>
                <div style="font-size: 0.85rem; color: #334155;">
                  Barniz: <strong>${order.items[0]?.finishType || 'Barniz UV 3D'}</strong>
                </div>
              </div>
            </div>

            <h3 style="font-size: 1rem; font-weight: 800; margin: 1rem 0 0.5rem; color: #0f172a;">
              Detalle de Diseños a Imprimir:
            </h3>
            <table class="workshop-table">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Diseño / Arte</th>
                  <th>Medidas (cm)</th>
                  <th>Cantidad</th>
                  <th>Acomodo / Fila</th>
                  <th>Metros</th>
                  <th>Archivo</th>
                </tr>
              </thead>
              <tbody>
                ${order.items.map((it, idx) => `
                  <tr>
                    <td style="font-weight: 700;">${idx + 1}</td>
                    <td><strong>${it.title}</strong></td>
                    <td style="font-family: monospace;">${it.widthCm} × ${it.heightCm} cm</td>
                    <td style="font-weight: 800; font-family: monospace;">${it.qty} pcs</td>
                    <td>${it.stickersPerRow} / fila (${it.rows} filas)</td>
                    <td style="font-family: monospace; font-weight: 700;">${it.actualLinearMeters.toFixed(2)}m</td>
                    <td style="font-size: 0.8rem; color: #475569;">${it.fileInfo ? it.fileInfo.name : 'Archivo RIP directo'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div style="border: 1px solid #e2e8f0; background: #f8fafc; padding: 1rem; border-radius: 6px;">
              <strong style="font-size: 0.85rem; text-transform: uppercase; color: #0f172a;">Control de Calidad del Operador (Checklist):</strong>
              <div class="workshop-checklist">
                <div>[ ] Test de inyectores (Nozzle check) OK</div>
                <div>[ ] Cama blanca fotográfica alineada</div>
                <div>[ ] Lámpara UV curando barniz</div>
                <div>[ ] Calandrado con Film B completado</div>
                <div>[ ] ${order.metrics.hasCutting ? 'Corte perimetral recto finalizado' : 'Rebobinado en tubo rígido'}</div>
                <div>[ ] Etiquetas de código #${order.id} colocadas</div>
              </div>
            </div>

            ${order.workshopNotes ? `
              <div style="margin-top: 1rem; padding: 0.75rem; border: 1px dashed #cbd5e1; font-size: 0.88rem; color: #1e293b;">
                <strong>Instrucciones Especiales:</strong> ${order.workshopNotes}
              </div>
            ` : ''}
          </div>
        `;
      }

      toggleModal(workshopModal, true);
    }

    function attachTableEvents() {
      // Cambio de estado de producción
      document.querySelectorAll('.select-prod-status').forEach(sel => {
        sel.addEventListener('change', (e) => {
          const id = e.target.dataset.orderId;
          const status = e.target.value;
          ordersStore.updateProductionStatus(id, status);
        });
      });

      // Cambio de estado de pago
      document.querySelectorAll('.select-pay-status').forEach(sel => {
        sel.addEventListener('change', (e) => {
          const id = e.target.dataset.orderId;
          const status = e.target.value;
          ordersStore.updatePaymentStatus(id, status);
        });
      });

      // Ver detalle
      document.querySelectorAll('.btn-view-order').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.orderId;
          showOrderDetailsModal(id);
        });
      });

      // Hoja de Taller
      document.querySelectorAll('.btn-workshop-sheet').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.orderId;
          showWorkshopSheetModal(id);
        });
      });
    }

    // Filtros interactivos
    if (searchInput) searchInput.addEventListener('input', renderOrdersTable);
    if (filterProd) filterProd.addEventListener('change', renderOrdersTable);
    if (filterPay) filterPay.addEventListener('change', renderOrdersTable);

    // Suscripción al almacén de pedidos
    const unsubscribe = ordersStore.subscribe(() => {
      renderOrdersMetrics();
      renderOrdersTable();
    });

    // Render inicial
    renderOrdersMetrics();
    renderOrdersTable();

    return () => {
      unsubscribe();
    };
  }
};
