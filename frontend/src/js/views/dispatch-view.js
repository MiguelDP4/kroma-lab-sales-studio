/**
 * Vista de Remisiones de Taller y Guías de Entrega (DispatchView) — Kroma Lab UV DTF.
 * Control logístico de despacho, generación de remisiones oficiales numeradas (REM-YYYY-XXX),
 * checklist técnico de control de calidad auditado, vinculación de couriers y formato imprimible para taller y mensajería.
 */

import {
  dispatchStore,
  DELIVERY_METHODS,
  DISPATCH_STATUS,
  PACKAGE_TYPES,
  SHIPPING_PAYMENT_TYPES,
  QUALITY_CHECKLIST_LABELS,
} from '../modules/dispatch-store.js';
import { ordersStore } from '../modules/orders-store.js';
import { downloadCSV } from '../modules/reports-engine.js';

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
        <!-- Cabecera de la Vista -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1.25rem;">
          <div style="flex: 1 1 340px; min-width: 0;">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem; flex-wrap: wrap;">
              <span class="badge">Producción & Taller</span>
              <span class="badge" style="background: rgba(2, 132, 199, 0.15); color: #0284c7; border-color: #0284c7;">
                Logística & Despacho UV DTF
              </span>
            </div>
            <h1 style="font-size: clamp(1.8rem, 3.5vw, 2.4rem); font-weight: 800; margin: 0.25rem 0;">
              Remisiones y Guías de Entrega
            </h1>
            <p style="color: var(--text-secondary); font-size: 0.95rem; margin: 0;">
              Control de empaque, inspección de calidad técnica, generación de remisiones oficiales y guías para mensajería.
            </p>
          </div>

          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center; flex-shrink: 0;">
            <button id="btnOpenCreateDispatchModal" class="btn btn-primary" style="font-size: 0.88rem; padding: 0.6rem 1.1rem; min-height: 44px; display: inline-flex; align-items: center; gap: 0.4rem; white-space: nowrap;">
              <span>📦</span>
              <span>+ Nueva Remisión</span>
            </button>
            <button id="btnExportDispatchCSV" class="btn btn-secondary" style="font-size: 0.88rem; padding: 0.6rem 1rem; min-height: 44px; display: inline-flex; align-items: center; gap: 0.4rem; white-space: nowrap;">
              <span>📥</span>
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        <!-- Indicadores KPI Logísticos -->
        <div id="dispatchMetricsGrid" class="profitability-kpi-grid" style="margin-bottom: 2rem;">
          ${renderMetricsHtml(metrics)}
        </div>

        <!-- Barra de Búsqueda y Filtros -->
        <div class="card" style="padding: 1.25rem; margin-bottom: 1.5rem; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
          <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
            <div style="flex: 2 1 240px; position: relative;">
              <span style="position: absolute; left: 0.85rem; top: 50%; transform: translateY(-50%); font-size: 1rem; color: var(--text-muted); pointer-events: none;">🔍</span>
              <input 
                type="text" 
                id="dispatchSearchInput" 
                class="input-control" 
                placeholder="Buscar por folio (REM-), pedido (#KL-), cliente o courier..." 
                style="padding-left: 2.5rem; min-height: 44px;"
              >
            </div>

            <div style="flex: 1 1 180px;">
              <select id="dispatchStatusFilter" class="input-control" style="min-height: 44px;">
                <option value="ALL">Todos los Estados</option>
                <option value="PREPARED">📦 Empacado en Taller</option>
                <option value="IN_TRANSIT">🚚 En Ruta / Courier</option>
                <option value="DELIVERED">✅ Entregado a Conformidad</option>
                <option value="CANCELLED">❌ Anulado</option>
              </select>
            </div>

            <div style="flex: 1 1 200px;">
              <select id="dispatchMethodFilter" class="input-control" style="min-height: 44px;">
                <option value="ALL">Todos los Métodos de Envío</option>
                <option value="MOTO_LOCAL">🛵 Moto Local (Capital / VN)</option>
                <option value="CARGO_EXPRESO">🚚 Cargo Expreso (Nacional)</option>
                <option value="GUATEX">📦 Guatex</option>
                <option value="FORZAGRO">⚡ Forza Express</option>
                <option value="PICKUP_TALLER">🏬 Retiro en Taller</option>
              </select>
            </div>

            <button id="btnResetDispatchFilters" class="btn btn-secondary" style="min-height: 44px; padding: 0 1rem;" title="Restablecer filtros">
              Limpiar
            </button>
          </div>
        </div>

        <!-- Tabla de Remisiones Emitidas -->
        <div class="card" style="padding: 0; overflow: hidden; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
          <div style="padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
            <div>
              <h3 style="margin: 0; font-size: 1.1rem; font-weight: 700;">Registro de Remisiones de Taller</h3>
              <p style="margin: 0.2rem 0 0; font-size: 0.85rem; color: var(--text-secondary);">
                Historial cronológico de pliegos y bobinas despachadas
              </p>
            </div>
            <span id="dispatchCountBadge" class="badge" style="background: rgba(2, 132, 199, 0.15); color: #0284c7; border-color: #0284c7;">
              ${dispatchStore.getDispatchNotes().length} registros
            </span>
          </div>

          <div class="table-container" style="margin: 0; border: none; border-radius: 0;">
            <div class="mobile-scroll-hint">Desliza horizontalmente para ver todas las columnas →</div>
            <table class="data-table" style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr>
                  <th>Folio / Fecha</th>
                  <th>Pedido Ref.</th>
                  <th>Cliente & Destino</th>
                  <th>Logística & Courier</th>
                  <th>Metros & Bultos</th>
                  <th>Saldo Cobro</th>
                  <th>Estado</th>
                  <th style="text-align: right;">Acciones</th>
                </tr>
              </thead>
              <tbody id="dispatchTableBody">
                ${renderTableRowsHtml(dispatchStore.getDispatchNotes())}
              </tbody>
            </table>
          </div>
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
            <div style="background: var(--bg-secondary, #f8fafc); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 1rem; margin-bottom: 1.25rem;">
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
    `;
  },

  onMount: () => {
    // Referencias al DOM
    const searchInput = document.getElementById('dispatchSearchInput');
    const statusFilter = document.getElementById('dispatchStatusFilter');
    const methodFilter = document.getElementById('dispatchMethodFilter');
    const btnResetFilters = document.getElementById('btnResetDispatchFilters');
    const tableBody = document.getElementById('dispatchTableBody');
    const metricsGrid = document.getElementById('dispatchMetricsGrid');
    const countBadge = document.getElementById('dispatchCountBadge');
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

      if (tableBody) tableBody.innerHTML = renderTableRowsHtml(notes);
      if (countBadge) countBadge.textContent = `${notes.length} registros`;
      attachRowEventListeners();
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

        const clientName = document.getElementById('inputDispatchClientName')?.value;
        const clientPhone = document.getElementById('inputDispatchClientPhone')?.value;
        const deliveryAddress = document.getElementById('inputDispatchAddress')?.value;
        const deliveryMethod = document.getElementById('selectDeliveryMethod')?.value;
        const courierName = document.getElementById('inputCourierName')?.value;
        const trackingNumber = document.getElementById('inputTrackingNumber')?.value;
        const packageType = document.getElementById('selectPackageType')?.value;
        const packagesCount = parseInt(document.getElementById('inputPackagesCount')?.value, 10) || 1;
        const shippingCostQ = parseFloat(document.getElementById('inputShippingCost')?.value) || 0;
        const shippingPaidBy = document.getElementById('selectShippingPaidBy')?.value;
        const dispatchedBy = document.getElementById('inputDispatchedBy')?.value || 'Operador Taller';
        const pendingBalanceQ = parseFloat(document.getElementById('inputPendingBalance')?.value) || 0;
        const notes = document.getElementById('inputDispatchNotes')?.value || '';

        const qualityChecklist = {
          curadoAdherencia: Boolean(document.getElementById('checkQACurado')?.checked),
          capasBarniz: Boolean(document.getElementById('checkQABarniz')?.checked),
          formatoAcabado: Boolean(document.getElementById('checkQAAcabado')?.checked),
          conteoMedidas: Boolean(document.getElementById('checkQAMedidas')?.checked),
          empaqueProtector: Boolean(document.getElementById('checkQAEmpaque')?.checked),
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
        window.print();
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

      if (noteIdInput) noteIdInput.value = note.id;
      if (titleEl) titleEl.textContent = `Actualizar ${note.id} (#${note.orderId})`;
      if (courierInput) courierInput.value = note.courierName || '';
      if (trackingInput) trackingInput.value = note.trackingNumber || '';
      if (receiverInput) receiverInput.value = note.receivedBy || note.clientName || '';
      if (idDocInput) idDocInput.value = note.receiverIdDoc || '';
      if (notesInput) notesInput.value = note.notes || '';

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
      if (inTransitGroup) inTransitGroup.style.display = val === 'IN_TRANSIT' ? 'block' : 'none';
      if (deliveredGroup) deliveredGroup.style.display = val === 'DELIVERED' ? 'block' : 'none';
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
          courierName: document.getElementById('inputStatusCourierName')?.value,
          trackingNumber: document.getElementById('inputStatusTracking')?.value,
          receivedBy: document.getElementById('inputStatusReceivedBy')?.value,
          receiverIdDoc: document.getElementById('inputStatusReceiverIdDoc')?.value,
          notes: document.getElementById('inputStatusNotes')?.value,
        };

        dispatchStore.updateDispatchStatus(noteId, newStatus, extraData);
        toggleModal(updateStatusModal, false);
      });
    }

    // Escuchadores de eventos para filas de la tabla
    function attachRowEventListeners() {
      // Ver Hoja de Despacho
      document.querySelectorAll('.btn-view-dispatch-sheet').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.noteId;
          showDispatchSheet(id);
        });
      });

      // Actualizar Estado
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

    attachRowEventListeners();

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
 * Renderizado de indicadores KPI logísticos
 */
export function renderMetricsHtml(m) {
  return `
    <div class="kpi-card" style="border-left: 4px solid #0284c7;">
      <span class="kpi-label">Empacadas en Taller</span>
      <div class="kpi-value" style="color: #0284c7;">${m.preparedCount}</div>
      <span class="kpi-subtext">Listas para recolección o salida</span>
    </div>

    <div class="kpi-card" style="border-left: 4px solid #f59e0b;">
      <span class="kpi-label">En Ruta / Courier</span>
      <div class="kpi-value" style="color: #f59e0b;">${m.inTransitCount}</div>
      <span class="kpi-subtext">Con mensajería o paquetería activa</span>
    </div>

    <div class="kpi-card" style="border-left: 4px solid #10b981;">
      <span class="kpi-label">Entregadas</span>
      <div class="kpi-value" style="color: #10b981;">${m.deliveredCount}</div>
      <span class="kpi-subtext">${m.todayDispatchedCount} despachadas hoy</span>
    </div>

    <div class="kpi-card" style="border-left: 4px solid var(--cerulean, #1c7293);">
      <span class="kpi-label">Metros Despachados</span>
      <div class="kpi-value" style="font-family: monospace;">${m.totalMetersDispatched.toFixed(2)}m</div>
      <span class="kpi-subtext">Valor: Q${m.totalShippedAmountQ.toFixed(2)}</span>
    </div>
  `;
}

/**
 * Renderizado de filas de la tabla de remisiones
 */
export function renderTableRowsHtml(notes) {
  if (!notes || notes.length === 0) {
    return `
      <tr>
        <td colspan="8" style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
          <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">📦</div>
          <div style="font-weight: 700; font-size: 1.05rem;">No hay remisiones de despacho registradas</div>
          <div style="font-size: 0.85rem;">Emite una nueva remisión pulsando "+ Nueva Remisión"</div>
        </td>
      </tr>
    `;
  }

  return notes.map((n) => {
    const method = DELIVERY_METHODS[n.deliveryMethod] || DELIVERY_METHODS.MOTO_LOCAL;
    const statusDef = DISPATCH_STATUS[n.status] || DISPATCH_STATUS.PREPARED;
    const pack = PACKAGE_TYPES[n.packageType] || PACKAGE_TYPES.RIGID_TUBE;
    const dateFormatted = new Date(n.dispatchedAt).toLocaleDateString('es-GT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const waUrl = `https://api.whatsapp.com/send?phone=${(n.clientPhone || '').replace(/\D/g, '')}&text=${dispatchStore.generateWhatsAppText(n)}`;

    const isPaid = n.pendingBalanceQ <= 0;

    return `
      <tr style="border-bottom: 1px solid var(--border-color);">
        <!-- Folio y Fecha -->
        <td>
          <div style="font-weight: 800; font-family: monospace; color: #0284c7; font-size: 0.95rem;">
            ${n.id}
          </div>
          <div style="font-size: 0.78rem; color: var(--text-muted);">${dateFormatted}</div>
        </td>

        <!-- Pedido Ref. -->
        <td>
          <a href="/pedidos" data-link style="font-weight: 700; text-decoration: none; color: var(--text-primary);">
            #${n.orderId}
          </a>
        </td>

        <!-- Cliente & Destino -->
        <td>
          <div style="font-weight: 700; color: var(--text-primary);">${n.clientName}</div>
          <div style="font-size: 0.8rem; color: var(--text-secondary); max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${n.deliveryAddress}">
            📍 ${n.deliveryAddress}
          </div>
          <div style="font-size: 0.78rem; color: var(--text-muted);">📞 ${n.clientPhone}</div>
        </td>

        <!-- Logística & Courier -->
        <td>
          <div style="font-weight: 600; font-size: 0.88rem; display: flex; align-items: center; gap: 0.3rem;">
            <span>${method.icon}</span>
            <span>${method.shortLabel}</span>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-secondary);">${n.courierName}</div>
          ${n.trackingNumber ? `
            <div style="font-size: 0.75rem; font-family: monospace; color: #0284c7;">
              Guía: ${n.trackingNumber}
            </div>
          ` : ''}
        </td>

        <!-- Metros & Bultos -->
        <td>
          <div style="font-weight: 700; font-family: monospace;">${n.totalOrderMeters.toFixed(2)}m</div>
          <div style="font-size: 0.78rem; color: var(--text-secondary);">
            ${n.packagesCount} ${n.packagesCount === 1 ? 'bulto' : 'bultos'} (${pack.label.split(' ')[0]})
          </div>
        </td>

        <!-- Saldo Cobro -->
        <td>
          ${isPaid ? `
            <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border-color: #10b981; font-size: 0.78rem;">
              ✓ Pagado
            </span>
          ` : `
            <span class="badge" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; border-color: #ef4444; font-size: 0.78rem; font-weight: 700;">
              Cobrar Q${n.pendingBalanceQ.toFixed(2)}
            </span>
          `}
        </td>

        <!-- Estado -->
        <td>
          <span class="badge" style="background: ${statusDef.bg}; color: ${statusDef.color}; border-color: ${statusDef.border};">
            ${statusDef.badge}
          </span>
        </td>

        <!-- Acciones -->
        <td style="text-align: right; white-space: nowrap;">
          <button class="btn-action-icon btn-view-dispatch-sheet" data-note-id="${n.id}" title="Ver e Imprimir Remisión Oficial">
            <span>🖨️</span>
          </button>
          <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn-action-icon btn-whatsapp-dispatch" title="Enviar Guía a Cliente por WhatsApp">
            <span>📲</span>
          </a>
          <button class="btn-action-icon btn-status-dispatch" data-note-id="${n.id}" title="Actualizar Estado (En Ruta / Entregado)">
            <span>🚚</span>
          </button>
          <button class="btn-action-icon btn-delete-dispatch" data-note-id="${n.id}" title="Eliminar Remisión" style="color: #ef4444;">
            <span>🗑️</span>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Renderizado de la Hoja de Despacho Oficial (Documento imprimible)
 */
export function renderDispatchSheetHtml(note, order) {
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

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; padding: 1.5rem; background: #ffffff; border-radius: 8px;">
      <!-- Encabezado Oficial -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0284c7; padding-bottom: 1.25rem; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 1rem;">
        <div style="display: flex; align-items: center; gap: 0.85rem;">
          <svg width="48" height="48" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="45" stroke="#1c7293" stroke-width="6" fill="#065a82"/>
            <path d="M30 35 L50 22 L70 35 L70 65 L50 78 L30 65 Z" stroke="#ffffff" stroke-width="4" fill="none"/>
            <circle cx="50" cy="50" r="14" fill="#10b981"/>
          </svg>
          <div>
            <div style="font-size: 1.4rem; font-weight: 900; letter-spacing: 0.05em; color: #065a82; line-height: 1.1;">KROMA LAB UV DTF</div>
            <div style="font-size: 0.78rem; font-weight: 800; color: #0284c7; text-transform: uppercase; letter-spacing: 0.08em;">Taller Industrial de Impresión Digital</div>
            <div style="font-size: 0.75rem; color: #64748b;">San José el Placer, Villa Nueva, Guatemala | Tel / WhatsApp: (502) 5406-6217</div>
          </div>
        </div>

        <div style="text-align: right;">
          <div style="display: inline-block; background: #065a82; color: #ffffff; padding: 0.35rem 0.85rem; border-radius: 4px; font-size: 0.85rem; font-weight: 800; letter-spacing: 0.05em;">
            REMISIÓN DE DESPACHO
          </div>
          <div style="font-family: monospace; font-size: 1.45rem; font-weight: 900; color: #0284c7; margin-top: 0.25rem;">
            ${note.id}
          </div>
          <div style="font-size: 0.8rem; color: #475569;">Fecha: ${new Date(note.dispatchedAt).toLocaleString('es-GT')}</div>
          <div style="font-size: 0.8rem; color: #475569;">Ref. Pedido: <strong style="color: #0f172a;">#${note.orderId}</strong></div>
        </div>
      </div>

      <!-- Cuadrícula de Destinatario y Logística -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem; margin-bottom: 1.5rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 1rem;">
        <div>
          <strong style="display: block; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 0.35rem;">
            1. Destinatario / Cliente B2B:
          </strong>
          <div style="font-size: 1.1rem; font-weight: 800; color: #0f172a;">${note.clientName}</div>
          <div style="font-size: 0.85rem; color: #334155; margin-top: 0.2rem;">
            📍 <strong>Dirección de Entrega:</strong> ${note.deliveryAddress}
          </div>
          <div style="font-size: 0.85rem; color: #334155;">📞 <strong>Teléfono:</strong> ${note.clientPhone}</div>
          <div style="font-size: 0.82rem; color: #64748b;">NIT: ${order?.customer?.nit || 'CF'}</div>
        </div>

        <div>
          <strong style="display: block; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 0.35rem;">
            2. Información Logística & Transporte:
          </strong>
          <div style="font-size: 0.95rem; font-weight: 700; color: #0284c7;">
            ${method.icon} ${method.label}
          </div>
          <div style="font-size: 0.85rem; color: #334155;">
            <strong>Transporte / Courier:</strong> ${note.courierName}
          </div>
          ${note.trackingNumber ? `
            <div style="font-size: 0.85rem; color: #334155;">
              <strong>No. Guía / Rastreo:</strong> <span style="font-family: monospace; font-weight: 700;">${note.trackingNumber}</span>
            </div>
          ` : ''}
          <div style="font-size: 0.85rem; color: #334155;">
            <strong>Embalaje:</strong> ${note.packagesCount} ${note.packagesCount === 1 ? 'bulto' : 'bultos'} (${pack.label})
          </div>
          <div style="font-size: 0.85rem; color: #334155;">
            <strong>Flete:</strong> Q${note.shippingCostQ.toFixed(2)} (${note.shippingPaidBy})
          </div>
        </div>
      </div>

      <!-- Detalle del Contenido del Despacho -->
      <div style="margin-bottom: 1.5rem;">
        <strong style="display: block; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; color: #0f172a; margin-bottom: 0.5rem;">
          3. Contenido del Paquete / Diseños Impresos:
        </strong>
        <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; border: 1px solid #cbd5e1;">
          <thead>
            <tr style="background: #f1f5f9; border-bottom: 1px solid #cbd5e1; text-align: left;">
              <th style="padding: 0.6rem 0.75rem;">No.</th>
              <th style="padding: 0.6rem 0.75rem;">Descripción del Arte</th>
              <th style="padding: 0.6rem 0.75rem;">Medidas (cm)</th>
              <th style="padding: 0.6rem 0.75rem;">Cantidad</th>
              <th style="padding: 0.6rem 0.75rem;">Metros</th>
              <th style="padding: 0.6rem 0.75rem;">Acabado</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((it, idx) => `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 0.55rem 0.75rem; font-weight: 700;">${idx + 1}</td>
                <td style="padding: 0.55rem 0.75rem;"><strong>${it.title}</strong></td>
                <td style="padding: 0.55rem 0.75rem; font-family: monospace;">${it.widthCm} × ${it.heightCm} cm</td>
                <td style="padding: 0.55rem 0.75rem; font-weight: 800; font-family: monospace;">${it.qty} pcs</td>
                <td style="padding: 0.55rem 0.75rem; font-family: monospace; font-weight: 700;">${it.actualLinearMeters ? it.actualLinearMeters.toFixed(2) + 'm' : '-'}</td>
                <td style="padding: 0.55rem 0.75rem; font-size: 0.8rem; color: #475569;">
                  ${it.finishType || 'Barniz 3D'} ${it.includeCutting ? '(Corte Recto)' : '(En Rollo)'}
                </td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background: #f8fafc; font-weight: 700;">
              <td colspan="4" style="padding: 0.6rem 0.75rem; text-align: right;">Total Metraje Lineal:</td>
              <td colspan="2" style="padding: 0.6rem 0.75rem; font-family: monospace; color: #0284c7;">
                ${note.totalOrderMeters.toFixed(2)} metros
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Checklist Técnico de Calidad Auditado -->
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 0.85rem 1rem; margin-bottom: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
          <strong style="font-size: 0.82rem; text-transform: uppercase; color: #166534;">
            ✓ Control de Calidad Técnico en Taller (Auditoría Superada):
          </strong>
          <span style="font-size: 0.75rem; font-weight: 800; color: #166534; background: #dcfce7; padding: 0.2rem 0.5rem; border-radius: 3px;">
            100% VERIFICADO
          </span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 0.35rem; font-size: 0.8rem; color: #14532d;">
          <div>[✓] ${QUALITY_CHECKLIST_LABELS.curadoAdherencia}</div>
          <div>[✓] ${QUALITY_CHECKLIST_LABELS.capasBarniz}</div>
          <div>[✓] ${QUALITY_CHECKLIST_LABELS.formatoAcabado}</div>
          <div>[✓] ${QUALITY_CHECKLIST_LABELS.conteoMedidas}</div>
          <div>[✓] ${QUALITY_CHECKLIST_LABELS.empaqueProtector}</div>
        </div>
      </div>

      <!-- Bloque Financiero y Aviso de Cobro -->
      <div style="background: ${isPaid ? '#f8fafc' : '#fef2f2'}; border: 1px solid ${isPaid ? '#e2e8f0' : '#fecaca'}; border-radius: 6px; padding: 1rem; margin-bottom: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <div style="font-size: 0.8rem; text-transform: uppercase; color: #64748b; font-weight: 700;">Condición Financiera de Entrega:</div>
            <div style="font-size: 1.15rem; font-weight: 800; color: ${isPaid ? '#10b981' : '#dc2626'};">
              ${isPaid ? '✅ PEDIDO CANCELADO EN SU TOTALIDAD (NO COBRAR)' : `⚠️ COBRO CONTRAENTREGA: Q${note.pendingBalanceQ.toFixed(2)}`}
            </div>
            <div style="font-size: 0.8rem; color: #475569;">
              Total Orden: Q${note.totalOrderAmountQ.toFixed(2)} | Flete: Q${note.shippingCostQ.toFixed(2)}
            </div>
          </div>
          ${!isPaid ? `
            <div style="background: #dc2626; color: #ffffff; padding: 0.5rem 1rem; border-radius: 6px; font-weight: 800; font-size: 0.95rem; text-align: center;">
              COBRAR AL RECEPTOR: Q${note.pendingBalanceQ.toFixed(2)}
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Términos y Garantía UV DTF -->
      <div style="border: 1px dashed #cbd5e1; border-radius: 6px; padding: 0.75rem 1rem; font-size: 0.75rem; color: #475569; margin-bottom: 1.5rem; line-height: 1.4;">
        <strong style="color: #0f172a;">Garantía y Condiciones de Aplicación:</strong>
        <ol style="margin: 0.25rem 0 0; padding-left: 1.2rem;">
          <li>El receptor debe revisar el estado del empaque y material al momento de la entrega.</li>
          <li>Garantía de fijación y adherencia UV DTF válida aplicando sobre superficies rígidas desengrasadas con alcohol isopropílico.</li>
          <li>Cualquier observación o inconformidad física debe reportarse al taller dentro de las 48 horas posteriores a la recepción con muestra fotográfica.</li>
        </ol>
      </div>

      <!-- Cajas de Firmas -->
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 2rem; margin-top: 2rem; padding-top: 1rem;">
        <div style="border-top: 1px solid #64748b; text-align: center; padding-top: 0.5rem;">
          <div style="font-weight: 800; font-size: 0.9rem; color: #0f172a;">${note.dispatchedBy}</div>
          <div style="font-size: 0.78rem; color: #64748b;">Despachado en Taller (Firma y Sello)</div>
          <div style="font-size: 0.72rem; color: #94a3b8;">Kroma Lab UV DTF</div>
        </div>

        <div style="border-top: 1px solid #64748b; text-align: center; padding-top: 0.5rem;">
          <div style="font-weight: 800; font-size: 0.9rem; color: #0f172a;">
            ${note.receivedBy || 'Firma de Recibido Conforme'}
          </div>
          <div style="font-size: 0.78rem; color: #64748b;">
            Receptor / Transportista ${note.receiverIdDoc ? `(DPI: ${note.receiverIdDoc})` : '(Nombre, Firma y DPI)'}
          </div>
          <div style="font-size: 0.72rem; color: #94a3b8;">Fecha y Hora de Recepción</div>
        </div>
      </div>
    </div>
  `;
}
