/**
 * Vista de Remisiones de Taller y Guías de Entrega (DispatchView) — Kroma Lab UV DTF.
 * Control logístico de despacho, generación de remisiones oficiales numeradas (REM-YYYY-XXX),
 * checklist técnico de control de calidad auditado, vinculación de couriers y formato imprimible para taller y mensajería.
 * Diseño alineado con el estándar visual de "Control General de Pedidos".
 */

import {
  dispatchStore,
  DELIVERY_METHODS,
  DISPATCH_STATUS,
  PACKAGE_TYPES,
} from '../modules/dispatch-store.js';
import { ordersStore } from '../modules/orders-store.js';
import { downloadCSV } from '../modules/reports-engine.js';
import {
  printDocument,
  KROMA_PRINT_PALETTE,
  renderKromaDocumentHeader,
  renderKromaReceiptItemsAndSummary,
} from '../modules/print-helper.js';

export const dispatchView = {
  path: '/despacho',
  name: 'dispatch',
  allowedRoles: ['ADMIN', 'EMPLOYEE'],

  render: () => {
    const metrics = dispatchStore.getSummaryMetrics();
    const activeOrders = ordersStore.getOrders().filter(
      (o) => o.productionStatus !== 'CANCELLED'
    );

    return `
      <div style="padding: 2rem 0 4rem;">
        <!-- Cabecera de la Vista (Estilo Control General de Pedidos) -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem; flex-wrap: wrap;">
              <span class="badge">Gestión de Taller</span>
              <span class="badge" style="background: rgba(2, 132, 199, 0.15); color: #0284c7; border-color: #0284c7;">Logística & Despacho UV DTF</span>
            </div>
            <h1 style="font-size: clamp(1.8rem, 3.5vw, 2.4rem); font-weight: 800; margin: 0.5rem 0 0.25rem;">
              Remisiones y Guías de Entrega
            </h1>
            <p style="color: var(--text-secondary); font-size: 0.95rem;">
              Supervisión de empaque, inspección de calidad técnica, guías de mensajería y entrega a clientes.
            </p>
          </div>

          <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
            <button id="btnExportDispatchCSV" class="btn btn-secondary" style="font-size: 0.88rem; padding: 0.55rem 1rem;">
              <span>📥</span>
              <span>Exportar CSV</span>
            </button>
            <button id="btnOpenCreateDispatchModal" class="btn btn-primary" style="font-size: 0.88rem; padding: 0.55rem 1rem;">
              <span>+ Nueva Remisión</span>
            </button>
          </div>
        </div>

        <!-- Indicadores KPI Logísticos (Estilo orders-metrics-grid) -->
        <div id="dispatchMetricsGrid" class="orders-metrics-grid">
          ${renderMetricsHtml(metrics)}
        </div>

        <!-- Barra de Búsqueda y Filtros (Estilo orders-controls-bar) -->
        <div class="orders-controls-bar">
          <div class="orders-filters-group">
            <input 
              type="text" 
              id="dispatchSearchInput" 
              class="input-control orders-search-input" 
              placeholder="Buscar por # remisión, orden, cliente o courier..."
            >
            
            <select id="dispatchStatusFilter" class="input-control" style="max-width: 190px;">
              <option value="ALL">Estado: Todos</option>
              <option value="PREPARED">Empacado en Taller</option>
              <option value="IN_TRANSIT">En Ruta / Courier</option>
              <option value="DELIVERED">Entregado</option>
              <option value="CANCELLED">Anulado</option>
            </select>

            <select id="dispatchMethodFilter" class="input-control" style="max-width: 190px;">
              <option value="ALL">Envío: Todos</option>
              <option value="MOTO_LOCAL">Moto Local</option>
              <option value="CARGO_EXPRESO">Cargo Expreso</option>
              <option value="GUATEX">Guatex</option>
              <option value="FORZAGRO">Forza Express</option>
              <option value="PICKUP_TALLER">Retiro en Taller</option>
            </select>

            <button id="btnResetDispatchFilters" class="btn btn-secondary" style="padding: 0.55rem 0.85rem; font-size: 0.85rem;" title="Restablecer filtros">
              Limpiar
            </button>
          </div>
        </div>

        <!-- Rejilla Principal de Tarjetas de Remisión y Despacho Responsivas -->
        <div id="dispatchCardsContainer" class="dispatch-cards-grid">
          ${renderDispatchCardsHtml(dispatchStore.getDispatchNotes())}
        </div>
      </div>

      <!-- MODAL 1: NUEVA REMISIÓN DE DESPACHO -->
      <div id="createDispatchModal" class="modal-backdrop" style="display: none;">
        <div class="modal-card" style="width: min(720px, 95vw); max-height: 92vh; overflow-y: auto;">
          <div class="modal-header">
            <div>
              <span class="badge" style="color: #0284c7; border-color: #0284c7;">Taller & Logística</span>
              <h2 style="font-size: 1.35rem; font-weight: 800; margin-top: 0.35rem;">+ Emitir Remisión de Despacho</h2>
            </div>
            <button type="button" class="btn-close-modal" id="btnCloseCreateDispatchModal">✕</button>
          </div>

          <form id="formCreateDispatch" style="padding: 1.25rem 0 0.5rem;">
            <!-- Selección de Orden -->
            <div class="form-group" style="margin-bottom: 1rem;">
              <label class="form-label" for="selectDispatchOrder" style="font-weight: 700;">Seleccionar Pedido de Taller:</label>
              <select id="selectDispatchOrder" class="input-control" required style="min-height: 44px; font-weight: 600;">
                <option value="">-- Elige una orden para despachar --</option>
                ${activeOrders.map((o) => `
                  <option value="${o.id}">
                    #${o.id} - ${o.customer.company || o.customer.name} (${o.metrics.totalBillableMeters.toFixed(2)}m - Q${o.metrics.grandTotalQ.toFixed(2)}) [${o.productionStatus}]
                  </option>
                `).join('')}
              </select>
            </div>

            <div class="input-row" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
              <div class="form-group">
                <label class="form-label" for="inputDispatchClientName">Cliente / Destinatario:</label>
                <input type="text" id="inputDispatchClientName" class="input-control" placeholder="Nombre de cliente o empresa" required style="min-height: 44px;">
              </div>
              <div class="form-group">
                <label class="form-label" for="inputDispatchClientPhone">Teléfono WhatsApp:</label>
                <input type="tel" id="inputDispatchClientPhone" class="input-control" placeholder="+502 5555-1234" required style="min-height: 44px;">
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 1rem;">
              <label class="form-label" for="inputDispatchAddress">Dirección de Entrega / Destino:</label>
              <input type="text" id="inputDispatchAddress" class="input-control" placeholder="Dirección completa o sucursal de entrega" required style="min-height: 44px;">
            </div>

            <!-- Datos Logísticos -->
            <div class="input-row" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
              <div class="form-group">
                <label class="form-label" for="selectDeliveryMethod">Método de Transporte:</label>
                <select id="selectDeliveryMethod" class="input-control" style="min-height: 44px;">
                  <option value="MOTO_LOCAL">🛵 Moto Local (Capital / Villa Nueva)</option>
                  <option value="CARGO_EXPRESO">🚚 Cargo Expreso (Nacional)</option>
                  <option value="GUATEX">📦 Guatex</option>
                  <option value="FORZAGRO">⚡ Forza Delivery</option>
                  <option value="PICKUP_TALLER">🏬 Retiro en Taller (San José el Placer)</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label" for="inputCourierName">Empresa / Nombre de Mensajero:</label>
                <input type="text" id="inputCourierName" class="input-control" placeholder="Ej. Cargo Expreso, Mensajería..." style="min-height: 44px;">
              </div>

              <div class="form-group">
                <label class="form-label" for="inputTrackingNumber">No. Guía / Tracking (opcional):</label>
                <input type="text" id="inputTrackingNumber" class="input-control" placeholder="Ej. CX-902812" style="min-height: 44px;">
              </div>
            </div>

            <!-- Embalaje y Bultos -->
            <div class="input-row" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
              <div class="form-group">
                <label class="form-label" for="selectPackageType">Tipo de Empaque:</label>
                <select id="selectPackageType" class="input-control" style="min-height: 44px;">
                  <option value="RIGID_TUBE">📜 Tubo Rígido (Bobina Enrollada)</option>
                  <option value="FLAT_PACK">📁 Sobre Plano (Stickers Cortados)</option>
                  <option value="BOX">📦 Caja Reforzada (Volumen)</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label" for="inputPackagesCount">Cantidad de Bultos:</label>
                <input type="number" id="inputPackagesCount" class="input-control" value="1" min="1" max="50" style="min-height: 44px;" required>
              </div>

              <div class="form-group">
                <label class="form-label" for="inputShippingCost">Costo Envío (Q):</label>
                <input type="number" id="inputShippingCost" class="input-control" value="0.00" min="0" step="0.5" style="min-height: 44px;">
              </div>

              <div class="form-group">
                <label class="form-label" for="selectShippingPaidBy">Pago del Flete:</label>
                <select id="selectShippingPaidBy" class="input-control" style="min-height: 44px;">
                  <option value="CLIENT">Cobro en Destino (Paga Cliente)</option>
                  <option value="INCLUDED">Flete Incluido / Retiro Taller</option>
                  <option value="PREPAID">Prepagado en Factura</option>
                </select>
              </div>
            </div>

            <!-- Checklist de Calidad Técnica UV DTF -->
            <div style="background: var(--bg-surface-elevated, #f8fafc); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 1rem; margin-bottom: 1.25rem;">
              <strong style="display: block; font-size: 0.88rem; text-transform: uppercase; color: #0284c7; margin-bottom: 0.5rem;">
                ✓ Checklist Técnico de Calidad (Operador Audley):
              </strong>
              <div style="display: grid; grid-template-columns: 1fr; gap: 0.4rem; font-size: 0.88rem;">
                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                  <input type="checkbox" id="checkQACurado" checked>
                  <span>Curado UV y adherencia probada en muestra testigo</span>
                </label>
                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                  <input type="checkbox" id="checkQABarniz" checked>
                  <span>Alineación de capas: Blanco + CMYK + Barniz 3D con relieve</span>
                </label>
                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                  <input type="checkbox" id="checkQAAcabado" checked>
                  <span>Bobina continua limpia con film B / o Corte recto auditado</span>
                </label>
                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                  <input type="checkbox" id="checkQAMedidas" checked>
                  <span>Metraje lineal y conteo de piezas auditado vs orden</span>
                </label>
                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                  <input type="checkbox" id="checkQAEmpaque" checked>
                  <span>Sellado impermeable contra polvo y humedad</span>
                </label>
              </div>
            </div>

            <div class="input-row" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
              <div class="form-group">
                <label class="form-label" for="inputDispatchedBy">Despachado en Taller Por:</label>
                <input type="text" id="inputDispatchedBy" class="input-control" value="Miguel Dubois" required style="min-height: 44px;">
              </div>
              <div class="form-group">
                <label class="form-label" for="inputPendingBalance">Saldo Contraentrega a Cobrar (Q):</label>
                <input type="number" id="inputPendingBalance" class="input-control" value="0.00" min="0" step="0.01" style="min-height: 44px; font-weight: 700; color: #ef4444;">
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 1.5rem;">
              <label class="form-label" for="inputDispatchNotes">Observaciones / Notas Especiales:</label>
              <textarea id="inputDispatchNotes" class="input-control" rows="2" placeholder="Instrucciones para el mensajero o cliente receptor..."></textarea>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 0.75rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
              <button type="button" class="btn btn-secondary" id="btnCancelCreateDispatch" style="min-height: 44px;">Cancelar</button>
              <button type="submit" class="btn btn-primary" id="btnSubmitCreateDispatch" style="min-height: 44px;">
                <span>📋 Emitir Remisión Oficial</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- MODAL 2: HOJA OFICIAL DE DESPACHO / REMISIÓN IMPRIMIBLE -->
      <div id="dispatchSheetModal" class="modal-backdrop" style="display: none;">
        <div class="modal-card" style="width: min(840px, 96vw); max-height: 94vh; overflow-y: auto;">
          <div class="modal-header btn-print-hide">
            <div>
              <span class="badge" style="color: #0284c7; border-color: #0284c7;">Remisión Oficial de Entrega</span>
              <h2 style="font-size: 1.35rem; font-weight: 800; margin-top: 0.35rem;">Hoja de Despacho UV DTF</h2>
            </div>
            <button type="button" class="btn-close-modal" id="btnCloseDispatchSheetModal">✕</button>
          </div>

          <div id="dispatchSheetDocumentContainer" class="dispatch-sheet-card">
            <!-- Documento oficial inyectado dinámicamente -->
          </div>

          <div class="btn-print-hide" style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem; border-top: 1px solid var(--border-color); padding-top: 1rem; flex-wrap: wrap; gap: 0.75rem;">
            <span style="font-size: 0.85rem; color: var(--text-muted);">
              🖨️ Documento listo para imprimir o guardar en PDF (formato carta/oficio).
            </span>
            <div style="display: flex; gap: 0.75rem;">
              <button type="button" class="btn btn-secondary" id="btnCancelDispatchSheetModal" style="min-height: 44px;">Cerrar</button>
              <button type="button" class="btn btn-primary" id="btnPrintDispatchSheet" style="min-height: 44px;">
                <span>🖨️</span>
                <span>Imprimir Hoja de Despacho</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- MODAL 3: ACTUALIZAR ESTADO DE DESPACHO / ENTREGA -->
      <div id="updateDispatchStatusModal" class="modal-backdrop" style="display: none;">
        <div class="modal-card" style="width: min(520px, 94vw);">
          <div class="modal-header">
            <div>
              <span class="badge" style="color: #10b981; border-color: #10b981;">Trazabilidad Logística</span>
              <h2 id="updateStatusModalTitle" style="font-size: 1.25rem; font-weight: 800; margin-top: 0.35rem;">Actualizar Estado</h2>
            </div>
            <button type="button" class="btn-close-modal" id="btnCloseUpdateStatusModal">✕</button>
          </div>

          <form id="formUpdateDispatchStatus" style="padding: 1.25rem 0 0.5rem;">
            <input type="hidden" id="inputUpdateStatusNoteId">

            <div class="form-group" style="margin-bottom: 1rem;">
              <label class="form-label" for="selectNewDispatchStatus" style="font-weight: 700;">Nuevo Estado:</label>
              <select id="selectNewDispatchStatus" class="input-control" style="min-height: 44px;">
                <option value="IN_TRANSIT">🚚 En Ruta / Courier</option>
                <option value="DELIVERED">✅ Entregado a Conformidad</option>
                <option value="PREPARED">📦 En Taller (Reingreso / Empaque)</option>
                <option value="CANCELLED">❌ Anulado</option>
              </select>
            </div>

            <div id="inTransitFieldsGroup" style="margin-bottom: 1rem;">
              <div class="form-group" style="margin-bottom: 0.75rem;">
                <label class="form-label" for="inputStatusCourierName">Nombre del Transporte / Courier:</label>
                <input type="text" id="inputStatusCourierName" class="input-control" placeholder="Ej. Cargo Expreso, Mensajero Moto..." style="min-height: 44px;">
              </div>
              <div class="form-group">
                <label class="form-label" for="inputStatusTracking">No. de Guía / Tracking:</label>
                <input type="text" id="inputStatusTracking" class="input-control" placeholder="Ej. CX-8829102" style="min-height: 44px;">
              </div>
            </div>

            <div id="deliveredFieldsGroup" style="display: none; margin-bottom: 1rem;">
              <div class="form-group" style="margin-bottom: 0.75rem;">
                <label class="form-label" for="inputStatusReceivedBy">Nombre de Quien Recibe:</label>
                <input type="text" id="inputStatusReceivedBy" class="input-control" placeholder="Nombre completo del receptor" style="min-height: 44px;">
              </div>
              <div class="form-group">
                <label class="form-label" for="inputStatusReceiverIdDoc">No. DPI o Documento (opcional):</label>
                <input type="text" id="inputStatusReceiverIdDoc" class="input-control" placeholder="Ej. DPI 2489 10294 0101" style="min-height: 44px;">
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 1.5rem;">
              <label class="form-label" for="inputStatusNotes">Notas de Entrega / Comentarios:</label>
              <textarea id="inputStatusNotes" class="input-control" rows="2" placeholder="Observaciones de recepción o ruta..."></textarea>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 0.75rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
              <button type="button" class="btn btn-secondary" id="btnCancelUpdateStatus" style="min-height: 44px;">Cancelar</button>
              <button type="submit" class="btn btn-primary" style="min-height: 44px;">
                <span>Guardar Estado</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    <!-- MODAL DE CONFIRMACIÓN DE ELIMINACIÓN DE REMISIÓN -->
    <div id="deleteDispatchModal" class="modal-backdrop" style="display: none;">
      <div class="modal-card" style="width: min(440px, 94vw);">
        <div class="modal-header">
          <h2 style="font-size: 1.2rem; font-weight: 800; color: #ef4444;">Eliminar Remisión</h2>
          <button type="button" class="btn-close-modal" id="btnCloseDeleteDispatchModal" aria-label="Cerrar modal">✕</button>
        </div>

        <input type="hidden" id="deleteDispatchId" value="">

        <div id="deleteDispatchError" style="display: none; padding: 0.75rem 1rem; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: var(--radius-sm); color: #fca5a5; font-size: 0.85rem; margin-bottom: 1rem;"></div>

        <p style="font-size: 0.92rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 1.25rem;">
          ¿Estás seguro de que deseas eliminar permanentemente la remisión <strong id="deleteDispatchFolio" style="color: var(--text-primary);">-</strong>? Esta acción no se puede deshacer.
        </p>

        <div class="modal-actions-footer" style="display: flex; gap: 0.75rem; justify-content: flex-end;">
          <button type="button" class="btn btn-secondary" id="btnCancelDeleteDispatchModal">Cancelar</button>
          <button type="button" class="btn btn-primary" id="btnConfirmDeleteDispatch" style="background: #ef4444; border-color: #ef4444;">Eliminar Permanentemente</button>
        </div>
      </div>
    </div>
  `;
},
  onMount: () => {
    dispatchStore.syncWithApi().catch(() => {});
    // Referencias al DOM
    const searchInput = document.getElementById('dispatchSearchInput');
    const statusFilter = document.getElementById('dispatchStatusFilter');
    const methodFilter = document.getElementById('dispatchMethodFilter');
    const btnResetFilters = document.getElementById('btnResetDispatchFilters');
    const cardsContainer = document.getElementById('dispatchCardsContainer');
    const metricsGrid = document.getElementById('dispatchMetricsGrid');
    const btnExportCsv = document.getElementById('btnExportDispatchCSV');

    // Modales
    const createModal = document.getElementById('createDispatchModal');
    const btnOpenCreateModal = document.getElementById('btnOpenCreateDispatchModal');
    const btnCloseCreateModal = document.getElementById('btnCloseCreateDispatchModal');
    const btnCancelCreate = document.getElementById('btnCancelCreateDispatch');
    const formCreateDispatch = document.getElementById('formCreateDispatch');
    const selectOrder = document.getElementById('selectDispatchOrder');

    const sheetModal = document.getElementById('dispatchSheetModal');
    const btnCloseSheetModal = document.getElementById('btnCloseDispatchSheetModal');
    const btnCancelSheetModal = document.getElementById('btnCancelDispatchSheetModal');
    const btnPrintSheet = document.getElementById('btnPrintDispatchSheet');
    const sheetContainer = document.getElementById('dispatchSheetDocumentContainer');

    const updateStatusModal = document.getElementById('updateDispatchStatusModal');
    const btnCloseUpdateStatusModal = document.getElementById('btnCloseUpdateStatusModal');
    const btnCancelUpdateStatus = document.getElementById('btnCancelUpdateStatus');
    const formUpdateStatus = document.getElementById('formUpdateDispatchStatus');
    const selectNewStatus = document.getElementById('selectNewDispatchStatus');
    const inTransitGroup = document.getElementById('inTransitFieldsGroup');
    const deliveredGroup = document.getElementById('deliveredFieldsGroup');

    function toggleModal(modal, show) {
      if (modal) modal.style.display = show ? 'block' : 'none';
    }

    function applyFilters() {
      const term = (searchInput?.value || '').trim().toLowerCase();
      const status = statusFilter?.value || 'ALL';
      const method = methodFilter?.value || 'ALL';

      let notes = dispatchStore.getDispatchNotes();

      if (term) {
        notes = notes.filter((n) => {
          return (
            n.id.toLowerCase().includes(term) ||
            n.orderId.toLowerCase().includes(term) ||
            n.clientName.toLowerCase().includes(term) ||
            (n.courierName && n.courierName.toLowerCase().includes(term)) ||
            (n.trackingNumber && n.trackingNumber.toLowerCase().includes(term))
          );
        });
      }

      if (status !== 'ALL') {
        notes = notes.filter((n) => n.status === status);
      }

      if (method !== 'ALL') {
        notes = notes.filter((n) => n.deliveryMethod === method);
      }

      if (cardsContainer) cardsContainer.innerHTML = renderDispatchCardsHtml(notes);
      attachCardEventListeners();
    }

    // Buscador y filtros
    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (statusFilter) statusFilter.addEventListener('change', applyFilters);
    if (methodFilter) methodFilter.addEventListener('change', applyFilters);
    if (btnResetFilters) {
      btnResetFilters.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        if (statusFilter) statusFilter.value = 'ALL';
        if (methodFilter) methodFilter.value = 'ALL';
        applyFilters();
      });
    }

    // Exportar CSV
    if (btnExportCsv) {
      btnExportCsv.addEventListener('click', () => {
        const csv = dispatchStore.exportToCsv();
        const dateStr = new Date().toISOString().slice(0, 10);
        downloadCSV(`kromalab_remisiones_despacho_${dateStr}.csv`, csv);
      });
    }

    // Apertura modal creación
    if (btnOpenCreateModal) {
      btnOpenCreateModal.addEventListener('click', () => {
        toggleModal(createModal, true);
      });
    }

    if (btnCloseCreateModal) btnCloseCreateModal.addEventListener('click', () => toggleModal(createModal, false));
    if (btnCancelCreate) btnCancelCreate.addEventListener('click', () => toggleModal(createModal, false));

    // Selección dinámica de orden en el formulario de creación
    if (selectOrder) {
      selectOrder.addEventListener('change', () => {
        const orderId = selectOrder.value;
        if (!orderId) return;

        const order = ordersStore.getOrderById(orderId);
        if (!order) return;

        const clientNameEl = document.getElementById('inputDispatchClientName');
        const phoneEl = document.getElementById('inputDispatchClientPhone');
        const addressEl = document.getElementById('inputDispatchAddress');
        const packageTypeEl = document.getElementById('selectPackageType');
        const pendingBalanceEl = document.getElementById('inputPendingBalance');

        if (clientNameEl) clientNameEl.value = order.customer.company || order.customer.name;
        if (phoneEl) phoneEl.value = order.customer.phone || '';
        if (addressEl) addressEl.value = order.customer.address || 'Entrega en Taller';
        if (packageTypeEl) {
          packageTypeEl.value = order.metrics?.hasCutting ? 'FLAT_PACK' : 'RIGID_TUBE';
        }
        if (pendingBalanceEl) {
          const isPaid = order.paymentStatus === 'PAID';
          pendingBalanceEl.value = isPaid ? '0.00' : (order.metrics?.grandTotalQ || 0).toFixed(2);
        }
      });
    }

    // Submit de Nueva Remisión
    if (formCreateDispatch) {
      formCreateDispatch.addEventListener('submit', (e) => {
        e.preventDefault();
        const orderId = document.getElementById('selectDispatchOrder')?.value;
        if (!orderId) return;

        const clientName = document.getElementById('inputDispatchClientName').value;
        const clientPhone = document.getElementById('inputDispatchClientPhone').value;
        const deliveryAddress = document.getElementById('inputDispatchAddress').value;
        const deliveryMethod = document.getElementById('selectDeliveryMethod').value;
        const courierName = document.getElementById('inputCourierName').value;
        const trackingNumber = document.getElementById('inputTrackingNumber').value;
        const packageType = document.getElementById('selectPackageType').value;
        const packagesCount = parseInt(document.getElementById('inputPackagesCount')?.value, 10) || 1;
        const shippingCostQ = parseFloat(document.getElementById('inputShippingCost')?.value) || 0;
        const shippingPaidBy = document.getElementById('selectShippingPaidBy').value;
        const dispatchedBy = document.getElementById('inputDispatchedBy')?.value || 'Operador Taller';
        const pendingBalanceQ = parseFloat(document.getElementById('inputPendingBalance')?.value) || 0;
        const notes = document.getElementById('inputDispatchNotes')?.value || '';

        const qualityChecklist = {
          curadoAdherencia: Boolean(document.getElementById('checkQACurado').checked),
          capasBarniz: Boolean(document.getElementById('checkQABarniz').checked),
          formatoAcabado: Boolean(document.getElementById('checkQAAcabado').checked),
          conteoMedidas: Boolean(document.getElementById('checkQAMedidas').checked),
          empaqueProtector: Boolean(document.getElementById('checkQAEmpaque').checked),
        };

        const newNote = dispatchStore.createDispatchNote({
          orderId,
          clientName,
          clientPhone,
          deliveryAddress,
          deliveryMethod,
          courierName,
          trackingNumber,
          packageType,
          packagesCount,
          shippingCostQ,
          shippingPaidBy,
          dispatchedBy,
          pendingBalanceQ,
          qualityChecklist,
          notes,
        });

        toggleModal(createModal, false);
        formCreateDispatch.reset();

        // Mostrar directamente la hoja de despacho emitida
        showDispatchSheet(newNote.id);
      });
    }

    // Modal de Hoja de Despacho
    function showDispatchSheet(noteId) {
      const note = dispatchStore.getDispatchNoteById(noteId);
      if (!note || !sheetContainer) return;

      const order = ordersStore.getOrderById(note.orderId);
      sheetContainer.innerHTML = renderDispatchSheetHtml(note, order);
      toggleModal(sheetModal, true);
    }

    if (btnCloseSheetModal) btnCloseSheetModal.addEventListener('click', () => toggleModal(sheetModal, false));
    if (btnCancelSheetModal) btnCancelSheetModal.addEventListener('click', () => toggleModal(sheetModal, false));
    if (btnPrintSheet) {
      btnPrintSheet.addEventListener('click', () => {
        if (sheetContainer && sheetContainer.innerHTML.trim()) {
          printDocument(sheetContainer.innerHTML, 'Remisión de Despacho — Kroma Lab');
        } else if (typeof window !== 'undefined' && window.print) {
          window.print();
        }
      });
    }

    // Modal de cambio de estado
    function openUpdateStatusModal(noteId) {
      const note = dispatchStore.getDispatchNoteById(noteId);
      if (!note) return;

      const noteIdInput = document.getElementById('inputUpdateStatusNoteId');
      const titleEl = document.getElementById('updateStatusModalTitle');
      const statusSelect = document.getElementById('selectNewDispatchStatus');
      const courierInput = document.getElementById('inputStatusCourierName');
      const trackingInput = document.getElementById('inputStatusTracking');
      const receiverInput = document.getElementById('inputStatusReceivedBy');
      const idDocInput = document.getElementById('inputStatusReceiverIdDoc');
      const notesInput = document.getElementById('inputStatusNotes');

      noteIdInput.value = note.id;
      titleEl.textContent = `Actualizar ${note.id} (#${note.orderId})`;
      courierInput.value = note.courierName || '';
      trackingInput.value = note.trackingNumber || '';
      receiverInput.value = note.receivedBy || note.clientName;
      idDocInput.value = note.receiverIdDoc || '';
      notesInput.value = note.notes || '';

      // Sugerir siguiente estado lógico
      if (statusSelect) {
        if (note.status === DISPATCH_STATUS.PREPARED.id) {
          statusSelect.value = DISPATCH_STATUS.IN_TRANSIT.id;
        } else if (note.status === DISPATCH_STATUS.IN_TRANSIT.id) {
          statusSelect.value = DISPATCH_STATUS.DELIVERED.id;
        } else {
          statusSelect.value = note.status;
        }
      }

      updateStatusFieldsVisibility();
      toggleModal(updateStatusModal, true);
    }

    function updateStatusFieldsVisibility() {
      const val = selectNewStatus?.value;
      inTransitGroup.style.display = val === 'IN_TRANSIT' ? 'block' : 'none';
      deliveredGroup.style.display = val === 'DELIVERED' ? 'block' : 'none';
    }

    if (selectNewStatus) {
      selectNewStatus.addEventListener('change', updateStatusFieldsVisibility);
    }

    if (btnCloseUpdateStatusModal) btnCloseUpdateStatusModal.addEventListener('click', () => toggleModal(updateStatusModal, false));
    if (btnCancelUpdateStatus) btnCancelUpdateStatus.addEventListener('click', () => toggleModal(updateStatusModal, false));

    if (formUpdateStatus) {
      formUpdateStatus.addEventListener('submit', (e) => {
        e.preventDefault();
        const noteId = document.getElementById('inputUpdateStatusNoteId')?.value;
        const newStatus = selectNewStatus?.value;
        if (!noteId || !newStatus) return;

        const extraData = {
          courierName: document.getElementById('inputStatusCourierName').value,
          trackingNumber: document.getElementById('inputStatusTracking').value,
          receivedBy: document.getElementById('inputStatusReceivedBy').value,
          receiverIdDoc: document.getElementById('inputStatusReceiverIdDoc').value,
          notes: document.getElementById('inputStatusNotes').value,
        };

        dispatchStore.updateDispatchStatus(noteId, newStatus, extraData);
        toggleModal(updateStatusModal, false);
      });
    }

    // Escuchadores de eventos para filas de la tabla
    function attachCardEventListeners() {
      // Cambio interactivo directo de estado desde la tabla (.select-dispatch-status)
      document.querySelectorAll('.select-dispatch-status').forEach((sel) => {
        sel.addEventListener('change', () => {
          const noteId = sel.dataset.noteId;
          const newStatus = sel.value;
          if (newStatus === DISPATCH_STATUS.DELIVERED.id) {
            // Abrir modal de entrega para registrar quien recibe y DPI
            openUpdateStatusModal(noteId);
            if (selectNewStatus) {
              selectNewStatus.value = DISPATCH_STATUS.DELIVERED.id;
              updateStatusFieldsVisibility();
            }
          } else {
            dispatchStore.updateDispatchStatus(noteId, newStatus);
          }
        });
      });

      // Ver Hoja de Despacho
      document.querySelectorAll('.btn-view-dispatch-sheet').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.noteId;
          showDispatchSheet(id);
        });
      });

      // Abrir modal de detalles y entrega
      document.querySelectorAll('.btn-status-dispatch').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.noteId;
          openUpdateStatusModal(id);
        });
      });

      // Eliminar
      document.querySelectorAll('.btn-delete-dispatch').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.noteId;
          if (confirm(`¿Estás seguro de eliminar la remisión ${id}?`)) {
            dispatchStore.deleteDispatchNote(id);
          }
        });
      });
    }

    const attachRowEventListeners = attachCardEventListeners;
    attachCardEventListeners();

    // Suscripción reactiva al almacén de despacho
    const unsubDispatch = dispatchStore.subscribe(() => {
      const updatedMetrics = dispatchStore.getSummaryMetrics();
      if (metricsGrid) metricsGrid.innerHTML = renderMetricsHtml(updatedMetrics);
      applyFilters();
    });

    // Suscripción al almacén de órdenes
    const unsubOrders = ordersStore.subscribe(() => {
      applyFilters();
    });

    // Función de limpieza al desmontar la vista
    return () => {
      unsubDispatch();
      unsubOrders();
    };
  },
};

/**
 * Renderizado de indicadores KPI logísticos (Estilo orders-metric-card con borde superior temático)
 */
export function renderMetricsHtml(m) {
  return `
    <div class="orders-metric-card" style="border-top: 4px solid var(--cerulean);">
      <span class="orders-metric-title">Empacadas en Taller</span>
      <span class="orders-metric-value" style="color: var(--text-primary);">${m.preparedCount}</span>
    </div>

    <div class="orders-metric-card" style="border-top: 4px solid var(--color-warning);">
      <span class="orders-metric-title">En Ruta / Courier</span>
      <span class="orders-metric-value" style="color: ${m.inTransitCount > 0 ? '#ef4444' : 'var(--text-secondary)'};">
        ${m.inTransitCount}
      </span>
    </div>

    <div class="orders-metric-card" style="border-top: 4px solid var(--color-success);">
      <span class="orders-metric-title">Entregadas</span>
      <span class="orders-metric-value" style="color: var(--color-success);">${m.deliveredCount}</span>
    </div>

    <div class="orders-metric-card" style="border-top: 4px solid #8b5cf6;">
      <span class="orders-metric-title">Metros Despachados</span>
      <span class="orders-metric-value" style="color: var(--cerulean);">${m.totalMetersDispatched.toFixed(2)}m</span>
    </div>

    <div class="orders-metric-card" style="border-top: 4px solid var(--color-success);">
      <span class="orders-metric-title">Monto Despachado</span>
      <span class="orders-metric-value" style="color: var(--color-success);">Q${m.totalShippedAmountQ.toFixed(2)}</span>
    </div>
  `;
}

/**
 * Renderizado de tarjetas responsivas de remisión y despacho UV DTF.
 * Diseño estructurado en cuadrícula adaptativa (Card Grid) que elimina
 * desbordamientos de tabla ancha y presenta toda la información de forma clara y táctil.
 */
export function renderDispatchCardsHtml(notes) {
  if (!notes || notes.length === 0) {
    return `
      <div class="calc-card" style="text-align: center; padding: 3rem 1.5rem; color: var(--text-muted); width: 100%; grid-column: 1 / -1;">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📦</div>
        <div style="font-weight: 700; font-size: 1.1rem; color: var(--text-primary); margin-bottom: 0.25rem;">
          No hay remisiones de despacho registradas
        </div>
        <div style="font-size: 0.9rem;">
          Emite una nueva remisión pulsando "+ Nueva Remisión"
        </div>
      </div>
    `;
  }

  return notes.map((n) => {
    const method = DELIVERY_METHODS[n.deliveryMethod] || DELIVERY_METHODS.MOTO_LOCAL;
    const statusDef = DISPATCH_STATUS[n.status] || DISPATCH_STATUS.PREPARED;
    const pack = PACKAGE_TYPES[n.packageType] || PACKAGE_TYPES.RIGID_TUBE;
    const dateFormatted = new Date(n.dispatchedAt).toLocaleDateString('es-GT', {
      day: '2-digit',
      month: 'short',
    });
    const waUrl = `https://api.whatsapp.com/send?phone=${(n.clientPhone || '').replace(/\D/g, '')}&text=${dispatchStore.generateWhatsAppText(n)}`;
    const isPaid = n.pendingBalanceQ <= 0;

    return `
      <div class="dispatch-card" data-note-id="${n.id}" style="border-top: 4px solid ${statusDef.color};">
        <!-- Cabecera de la Tarjeta: Folio, Pedido, Estado y Saldo -->
        <div class="dispatch-card-header">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              <span class="dispatch-card-folio">${n.id}</span>
              <a href="/pedidos" data-link class="badge" style="color: var(--cerulean); border-color: var(--cerulean); text-decoration: none; font-size: 0.78rem; font-weight: 700;">
                Pedido #${n.orderId}
              </a>
            </div>
            <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.25rem;">
              📅 Emitida: ${dateFormatted}
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <select 
              class="select-status select-dispatch-status" 
              data-note-id="${n.id}" 
              style="background: ${statusDef.bg}; color: ${statusDef.color}; border-color: ${statusDef.color}; min-height: 36px; padding: 0.35rem 0.65rem;"
            >
              <option value="PREPARED" ${n.status === 'PREPARED' ? 'selected' : ''}>📦 Empacado</option>
              <option value="IN_TRANSIT" ${n.status === 'IN_TRANSIT' ? 'selected' : ''}>🚚 En Ruta</option>
              <option value="DELIVERED" ${n.status === 'DELIVERED' ? 'selected' : ''}>✅ Entregado</option>
              <option value="CANCELLED" ${n.status === 'CANCELLED' ? 'selected' : ''}>❌ Anulado</option>
            </select>

            ${isPaid ? `
              <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border-color: #10b981; font-weight: 600; padding: 0.35rem 0.65rem;">
                ✓ Pagado
              </span>
            ` : `
              <span class="badge" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; border-color: #ef4444; font-weight: 700; padding: 0.35rem 0.65rem;">
                Cobrar Q${n.pendingBalanceQ.toFixed(2)}
              </span>
            `}
          </div>
        </div>

        <!-- Cuerpo de la Tarjeta: Cliente, Logística y Dirección -->
        <div class="dispatch-card-body">
          <div class="dispatch-card-client-row">
            <div>
              <div class="dispatch-card-client-name">
                👤 ${n.clientName}
              </div>
              <div class="dispatch-card-client-phone">
                📞 <span>${n.clientPhone || 'Sin teléfono'}</span>
              </div>
            </div>
            <div style="text-align: right;">
              <span class="badge" style="background: rgba(2, 132, 199, 0.12); color: var(--cerulean); border-color: var(--cerulean); font-size: 0.78rem;">
                ${method.icon} ${method.shortLabel}
              </span>
              ${n.trackingNumber ? `
                <div style="font-size: 0.75rem; color: var(--cerulean); font-family: var(--font-mono); margin-top: 0.25rem; font-weight: 600;">
                  Guía: ${n.trackingNumber}
                </div>
              ` : ''}
            </div>
          </div>

          <div class="dispatch-card-address" title="${n.deliveryAddress}">
            📍 <span style="color: var(--text-primary); font-weight: 500;">${n.deliveryAddress}</span>
          </div>

          <div class="dispatch-card-metrics-grid">
            <div class="dispatch-card-metric-col">
              <span>Metraje</span>
              <span style="color: var(--cerulean);">${n.totalOrderMeters.toFixed(2)} m</span>
            </div>
            <div class="dispatch-card-metric-col">
              <span>Bultos</span>
              <span style="color: var(--text-primary);">${n.packagesCount} (${pack.label.split(' ')[0]})</span>
            </div>
            <div class="dispatch-card-metric-col">
              <span>Total Orden</span>
              <span style="color: var(--text-primary);">Q${n.totalOrderAmountQ.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <!-- Pie de la Tarjeta: Acciones táctiles -->
        <div class="dispatch-card-footer">
          <button 
            type="button"
            class="btn btn-secondary btn-view-dispatch-sheet" 
            data-note-id="${n.id}" 
            style="font-size: 0.85rem; padding: 0.5rem 0.9rem; min-height: 42px; display: inline-flex; align-items: center; gap: 0.4rem;"
            title="Ver e Imprimir Hoja de Despacho"
          >
            <span>🖨️</span>
            <span>Hoja de Taller</span>
          </button>

          <div style="display: flex; align-items: center; gap: 0.45rem;">
            <a 
              href="${waUrl}" 
              target="_blank" 
              rel="noopener noreferrer" 
              class="btn-action-icon btn-whatsapp-dispatch" 
              title="Enviar Guía a Cliente por WhatsApp"
              style="min-height: 42px; min-width: 42px;"
            >
              <span>💬</span>
            </a>

            <button 
              type="button"
              class="btn-action-icon btn-status-dispatch" 
              data-note-id="${n.id}" 
              title="Detalles y Datos de Entrega"
              style="min-height: 42px; min-width: 42px;"
            >
              <span>🚚</span>
            </button>

            <button 
              type="button"
              class="btn-action-icon btn-delete-dispatch" 
              data-note-id="${n.id}" 
              title="Eliminar Remisión" 
              style="color: #ef4444; min-height: 42px; min-width: 42px;"
            >
              <span>🗑️</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Alias de retrocompatibilidad
export const renderTableRowsHtml = renderDispatchCardsHtml;

/**
 * Renderizado de la Hoja de Despacho Oficial (Documento imprimible con formato unificado de Recibo Kroma Lab)
 */
export function renderDispatchSheetHtml(note, order) {
  const P = KROMA_PRINT_PALETTE;
  const method = DELIVERY_METHODS[note.deliveryMethod] || DELIVERY_METHODS.MOTO_LOCAL;
  const pack = PACKAGE_TYPES[note.packageType] || PACKAGE_TYPES.RIGID_TUBE;
  const isPaid = note.pendingBalanceQ <= 0;

  const items = order?.items || [
    {
      title: 'Pliego Film UV DTF',
      widthCm: 28,
      heightCm: 100,
      qty: 1,
      actualLinearMeters: note.totalOrderMeters,
      stickersPerRow: 1,
      rows: 1,
      finishType: 'Barniz con Relieve 3D',
    },
  ];

  const totalMeters = Number(note.totalOrderMeters);
  const grandTotalQ = Number(note.totalOrderAmountQ);
  const tierRate = Number(
    order?.metrics?.tierRate || (totalMeters > 0 ? grandTotalQ / totalMeters : 30.0)
  );
  const totalPieces = items.reduce((acc, it) => acc + Number(it.qty), 0);
  const formattedDate = new Date(note.dispatchedAt).toLocaleDateString('es-GT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const headerHtml = renderKromaDocumentHeader({
    title: 'REMISIÓN DE DESPACHO — SERVICIO DE IMPRESIÓN UV DTF',
    subtitle: 'KROMA LAB UV DTF — IMPRESIÓN INDUSTRIAL UV DTF',
    folioBadge: `${note.id}   |   Ref. Pedido #${note.orderId}`,
    logoIdPrefix: 'kroma-dispatch-logo',
    metaRows: [
      {
        label: 'Proveedor:',
        value: 'Kroma Lab — Miguel Dubois',
        highlight: true,
      },
      {
        label: 'Cliente:',
        value: `${note.clientName}   |   Tel: ${note.clientPhone}   |   NIT: ${order?.customer?.nit || 'CF'}`,
        highlight: true,
      },
      {
        label: 'Fecha:',
        value: `${formattedDate}   |   Remisión: ${note.id}   |   Ref. Pedido: #${note.orderId}`,
        highlight: false,
      },
      {
        label: 'Modalidad:',
        value: `${method.icon} ${method.label} — Courier: ${note.courierName || '—'}${note.trackingNumber ? ` (Guía: ${note.trackingNumber})` : ''} — Empaque: ${note.packagesCount} ${note.packagesCount === 1 ? 'bulto' : 'bultos'} (${pack.label})`,
        highlight: false,
      },
      {
        label: 'Tarifa acordada:',
        value: `Q${tierRate.toFixed(2)} por metro lineal   |   Dirección: 📍 ${note.deliveryAddress}   |   Flete: Q${note.shippingCostQ.toFixed(2)} (${note.shippingPaidBy})`,
        highlight: true,
      },
    ],
  });

  const formattedItems = items.map((it) => {
    const qtyNum = Number(it.qty);
    const mNum = Number(it.actualLinearMeters);
    const lineSub = mNum > 0 ? mNum * tierRate : grandTotalQ / Math.max(1, items.length);
    const unitRef = lineSub / qtyNum;

    return {
      qty: `${qtyNum} pcs`,
      descriptionHtml: `
        <strong>${it.title}</strong>
        <div style="font-size: 0.76rem; color: ${P.TEXT_MUTED}; margin-top: 2px;">
          ${it.finishType || 'Barniz con Relieve 3D'} ${it.includeCutting ? '(Corte Recto)' : '(En Rollo)'}
        </div>
      `,
      measure: `${it.widthCm} × ${it.heightCm} cm`,
      linearMeters: `${mNum.toFixed(2)} m`,
      ratePerMeter: `Q${tierRate.toFixed(2)}`,
      unitCostRef: `Q${unitRef.toFixed(2)}`,
      subtotal: `Q${lineSub.toFixed(2)}`,
    };
  });

  const financialConditionHtml = `
    <div style="background: ${isPaid ? P.BG_LIGHT : '#fef2f2'}; border: 1px solid ${isPaid ? P.POWDER_BLUE : '#fecaca'}; border-left: 4px solid ${isPaid ? '#10b981' : '#dc2626'}; padding: 0.75rem 1rem; height: 100%; display: flex; flex-direction: column; justify-content: center;">
      <div style="font-size: 0.76rem; text-transform: uppercase; color: ${P.REGAL_NAVY}; font-weight: 800;">
        Condición Financiera de Entrega:
      </div>
      <div style="font-size: 0.98rem; font-weight: 800; color: ${isPaid ? '#10b981' : '#dc2626'}; margin: 0.2rem 0;">
        ${isPaid ? '✅ PEDIDO CANCELADO EN SU TOTALIDAD (NO COBRAR)' : `⚠️ COBRO CONTRAENTREGA: Q${note.pendingBalanceQ.toFixed(2)}`}
      </div>
      <div style="font-size: 0.78rem; color: ${P.TEXT_MUTED};">
        Total Orden: Q${grandTotalQ.toFixed(2)} | Flete: Q${note.shippingCostQ.toFixed(2)}
      </div>
      ${!isPaid ? `
        <div style="margin-top: 0.45rem; background: #dc2626; color: #ffffff; padding: 0.35rem 0.75rem; border-radius: 4px; font-weight: 800; font-size: 0.85rem; text-align: center;">
          COBRAR AL RECEPTOR: Q${note.pendingBalanceQ.toFixed(2)}
        </div>
      ` : ''}
    </div>
  `;

  const tableAndSummaryHtml = renderKromaReceiptItemsAndSummary({
    items: formattedItems,
    totals: {
      totalQty: totalPieces.toLocaleString('es-GT'),
      totalMeters: `${totalMeters.toFixed(2)} m`,
      rateLabel: `Q${tierRate.toFixed(2)}`,
      grandTotal: `Q${grandTotalQ.toFixed(2)}`,
    },
    summaryLines: [
      { label: 'Total de piezas impresas:', value: `${totalPieces.toLocaleString('es-GT')} unidades` },
      { label: 'Total de metros lineales procesados:', value: `${totalMeters.toFixed(2)} metros` },
      { label: 'Total a pagar:', value: `Q${grandTotalQ.toFixed(2)}`, isGrand: true },
    ],
    leftSlotHtml: financialConditionHtml,
  });

  return `
    <div class="kroma-print-sheet" style="font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; color: ${P.SPACE_INDIGO}; padding: 1.5rem; background: ${P.WHITE}; border-radius: 8px;">
      ${headerHtml}
      ${tableAndSummaryHtml}
      </div>

      <!-- Términos y Garantía UV DTF -->
      <div style="background: ${P.BG_ELEVATED}; border: 1px solid ${P.POWDER_BLUE}; padding: 0.65rem 1rem; font-size: 0.75rem; color: ${P.TEXT_MUTED}; margin-bottom: 1.25rem; line-height: 1.4;">
        <strong style="color: ${P.SPACE_INDIGO};">Garantía y Condiciones de Aplicación:</strong>
        <ol style="margin: 0.25rem 0 0; padding-left: 1.2rem;">
          <li>El receptor debe revisar el estado del empaque y material al momento de la entrega.</li>
          <li>Garantía de fijación y adherencia UV DTF válida aplicando sobre superficies rígidas desengrasadas con alcohol isopropílico.</li>
          <li>Cualquier observación o inconformidad física debe reportarse al taller dentro de las 48 horas posteriores a la recepción con muestra fotográfica.</li>
        </ol>
      </div>

      <!-- Cajas de Firmas -->
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 2rem; margin-top: 1.5rem; padding-top: 0.75rem;">
        <div style="border-top: 2px solid ${P.SPACE_INDIGO}; text-align: center; padding-top: 0.45rem;">
          <div style="font-weight: 800; font-size: 0.88rem; color: ${P.SPACE_INDIGO};">${note.dispatchedBy}</div>
          <div style="font-size: 0.78rem; font-weight: 700; color: ${P.REGAL_NAVY};">KROMA LAB — Despachado en Taller (Firma y Sello)</div>
        </div>

        <div style="border-top: 2px solid ${P.SPACE_INDIGO}; text-align: center; padding-top: 0.45rem;">
          <div style="font-weight: 800; font-size: 0.88rem; color: ${P.SPACE_INDIGO};">
            ${note.receivedBy || 'Firma de Recibido Conforme'}
          </div>
          <div style="font-size: 0.78rem; font-weight: 700; color: ${P.REGAL_NAVY};">
            Receptor / Transportista ${note.receiverIdDoc ? `(DPI: ${note.receiverIdDoc})` : '(Nombre, Firma y DPI)'}
          </div>
        </div>
      </div>
    </div>
  `;
}
