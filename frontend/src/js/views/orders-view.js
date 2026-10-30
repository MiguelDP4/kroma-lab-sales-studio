/**
 * Vista de Gestión de Pedidos UV DTF (Diferenciada por Rol: Cliente vs Staff).
 * Proporciona supervisión comercial, actualización de estados de pago y producción,
 * y generación de la Hoja de Ruta / Orden de Taller para la impresora Audley.
 */

import { store } from '../store.js';
import { ordersStore, PAYMENT_STATUS, PAYMENT_STATUS_LABELS, PRODUCTION_STATUS_LABELS } from '../modules/orders-store.js';
import { productionStore } from '../modules/production-store.js';
import { ORDER_STATUS, BUSINESS_CONFIG } from '../../shared/business-config.js';
import { clientsStore, CLIENT_TIERS } from '../modules/clients-store.js';
import { calculateOrderProfitability } from '../modules/profitability-engine.js';
import {
  printDocument,
  KROMA_PRINT_PALETTE,
  renderKromaDocumentHeader,
  renderKromaReceiptItemsAndSummary,
} from '../modules/print-helper.js';
import { uploadFileToStorage, readFileAsDataURL, validateReceiptFile, formatFileSize } from '../modules/file-uploader.js';

/**
 * Genera el HTML unificado del Recibo de Servicio de Impresión UV DTF / Orden de Trabajo
 * siguiendo la identidad visual y paleta oficial de Kroma Lab.
 * @param {object} order
 * @returns {string}
 */
export function renderOrderReceiptSheetHtml(order) {
  const isCustomer = (store.state.user?.role || 'CUSTOMER') === 'CUSTOMER';
  const isStaff = store.state.user?.role === 'ADMIN' || store.state.user?.role === 'EMPLOYEE';
  if (!order) return '';
  const P = KROMA_PRINT_PALETTE;

  const formattedDate = new Date(order.createdAt).toLocaleDateString('es-GT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const metrics = order.metrics;
  const totalMeters = Number(metrics.totalBillableMeters);
  const grandTotalQ = Number(metrics.grandTotalQ);
  const cuttingTotalQ = Number(metrics.cuttingTotalQ || 0);
  const tierRate = Number(metrics.tierRate || 115.0);

  const rawItems = order.items.length > 0
    ? order.items
    : [
        {
          title: 'Impresión UV DTF en Bobina Audley',
          widthCm: 28,
          heightCm: 100,
          qty: 1,
          actualLinearMeters: totalMeters,
          stickersPerRow: 1,
          rows: 1,
          finishType: 'Barniz con Relieve 3D',
        },
      ];

  const receiptItems = rawItems.map((it) => {
    const qty = Number(it.qty);
    const meters = Number(it.actualLinearMeters);
    const lineSubQ = Number((meters * tierRate).toFixed(2));
    const unitRef = lineSubQ / qty;

    const rot = it.rotationDeg ? ` • 🔄 ${it.rotationDeg}°` : '';

    return {
      qty,
      descriptionHtml: `<strong>${it.title}</strong><div style="font-size: 0.72rem; color: ${P.TEXT_MUTED}; margin-top: 2px;">${it.stickersPerRow} / fila (${it.rows} filas)${rot}</div>`,
      measure: `${it.widthCm} × ${it.heightCm} cm`,
      linearMeters: `${meters.toFixed(2)} m`,
      ratePerMeter: `Q${tierRate.toFixed(2)}`,
      unitCostRef: `Q${unitRef.toFixed(2)}`,
      subtotal: `Q${lineSubQ.toFixed(2)}`,
    };
  });

  const totalPieces = receiptItems.reduce((acc, it) => acc + it.qty, 0);
  const finishLabel = rawItems[0].finishType || 'Barniz con Relieve 3D';
  const cuttingModeLabel = metrics.hasCutting ? '✂️ CORTE INDIVIDUAL' : '📜 EN ROLLO CONTINUO';
  const customer = order.customer;

  const headerHtml = renderKromaDocumentHeader({
    title: 'RECIBO DE SERVICIO DE IMPRESIÓN UV DTF — ORDEN DE TRABAJO',
    subtitle: 'KROMA LAB — IMPRESIÓN INDUSTRIAL UV DTF',
    folioBadge: `Orden #${order.id}`,
    logoIdPrefix: `order-logo-${order.id}`,
    metaRows: [
      {
        label: 'Proveedor:',
        value: 'Kroma Lab — Miguel Dubois',
        highlight: true,
      },
      {
        label: 'Cliente:',
        value: `${customer.company || customer.name} (${customer.name} • ${customer.phone} • NIT: ${customer.nit || 'CF'})`,
        highlight: true,
      },
      {
        label: 'Fecha:',
        value: `${formattedDate}   |   Pedido #${order.id}`,
      },
      {
        label: 'Modalidad:',
        value: `Servicio de impresión UV DTF — Acabado: ${cuttingModeLabel}`,
      },
      {
        label: 'Tarifa acordada:',
        value: `Q${tierRate.toFixed(2)} por metro lineal (${totalMeters.toFixed(2)} metros lineales)`,
        highlight: true,
      },
    ],
  });

    const checklistAndNotesHtml = !isCustomer ? `
    <div style="border: 1px solid ${P.POWDER_BLUE}; background: ${P.BG_LIGHT}; padding: 0.75rem 0.9rem; border-radius: 4px; border-left: 4px solid ${P.REGAL_NAVY}; height: 100%;">
      <strong style="font-size: 0.78rem; text-transform: uppercase; color: ${P.REGAL_NAVY}; display: block; margin-bottom: 0.35rem;">
        Control de Calidad del Operador (Checklist):
      </strong>
      <div class="workshop-checklist" style="font-size: 0.76rem; color: ${P.SPACE_INDIGO}; display: grid; grid-template-columns: repeat(auto-fit, minmax(185px, 1fr)); gap: 0.25rem 0.65rem;">
        <div>[ ] Test de inyectores (Nozzle check) OK</div>
        <div>[ ] Cama blanca fotográfica alineada</div>
        <div>[ ] Lámpara UV curando barniz</div>
        <div>[ ] Calandrado con Film B completado</div>
        <div>[ ] ${metrics.hasCutting ? 'Corte perimetral recto finalizado' : 'Rebobinado en tubo rígido'}</div>
        <div>[ ] Etiquetas de código #${order.id} colocadas</div>
      </div>
      ${order.workshopNotes ? `
        <div style="margin-top: 0.55rem; padding-top: 0.45rem; border-top: 1px dashed ${P.POWDER_BLUE}; font-size: 0.8rem; color: ${P.SPACE_INDIGO};">
          <strong style="color: ${P.REGAL_NAVY};">Instrucciones Especiales:</strong> ${order.workshopNotes}
        </div>
      ` : ''}
    </div>
  ` : (order.workshopNotes ? `
    <div style="border: 1px solid ${P.POWDER_BLUE}; background: ${P.BG_LIGHT}; padding: 0.75rem 0.9rem; border-radius: 4px; border-left: 4px solid ${P.REGAL_NAVY}; height: 100%;">
      <div style="font-size: 0.8rem; color: ${P.SPACE_INDIGO};">
        <strong style="color: ${P.REGAL_NAVY};">Instrucciones Especiales:</strong> ${order.workshopNotes}
      </div>
    </div>
  ` : '');

  const summaryLines = [
    {
      label: 'Total de piezas impresas:',
      value: `${totalPieces.toLocaleString('es-GT')} unidades`,
    },
    {
      label: 'Total de metros lineales procesados:',
      value: `${totalMeters.toFixed(2)} m`,
    },
  ];

  if (cuttingTotalQ > 0) {
    summaryLines.push({
      label: 'Servicio de corte individual:',
      value: `Q ${cuttingTotalQ.toFixed(2)}`,
    });
  }

  summaryLines.push({
    label: 'TOTAL A CANCELAR:',
    value: `Q ${grandTotalQ.toFixed(2)}`,
    isGrand: true,
  });

  const tableAndSummaryHtml = renderKromaReceiptItemsAndSummary({
    items: receiptItems,
    totals: {
      totalQty: `${totalPieces.toLocaleString('es-GT')}`,
      totalMeters: `${totalMeters.toFixed(2)} m`,
      rateLabel: `Q${tierRate.toFixed(2)}`,
      grandTotal: `Q${grandTotalQ.toFixed(2)}`,
    },
    summaryLines,
    leftSlotHtml: checklistAndNotesHtml,
  });

  const snapshotsHtml = '';

  return `
    <div class="workshop-sheet-card kroma-print-sheet">
      ${headerHtml}
      ${tableAndSummaryHtml}
      ${snapshotsHtml}
    </div>
  `;
}

export function formatOrderWhatsAppMessage(order) {
  if (!order) return '';
  const artUrls = (order.items || [])
    .map(it => it.fileInfo?.fileUrl || it.fileUrl)
    .filter(Boolean);
  if (!artUrls.length && order.fileUrl) {
    artUrls.push(order.fileUrl);
  }
  const snapUrls = (order.items || [])
    .map(it => it.canvasSnapshotUrl || (it.canvasSnapshot && !it.canvasSnapshot.startsWith('data:') ? it.canvasSnapshot : null))
    .filter(Boolean);
  if (!snapUrls.length && order.canvasSnapshot && !order.canvasSnapshot.startsWith('data:')) {
    snapUrls.push(order.canvasSnapshot);
  }
  let waOrderLinks = '';
  if (artUrls.length > 0) {
    waOrderLinks += `\n🖼️ *Arte:* ${artUrls.join(' | ')}`;
  }
  if (snapUrls.length > 0) {
    waOrderLinks += `\n📐 *Montaje:* ${snapUrls.join(' | ')}`;
  }
  if (order.paymentReceiptUrl) {
    waOrderLinks += `\n🧾 *Boleta:* ${order.paymentReceiptUrl}`;
  }
  return `*KROMA LAB — Pedido #${order.id}*\nHola, deseo consultar el estado de este pedido.${waOrderLinks}`;
}

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
              <option value="${ORDER_STATUS.PENDING_REVIEW}">Por Confirmar</option>
              <option value="${ORDER_STATUS.IN_AUDLEY_QUEUE}">En cola de impresión</option>
              <option value="${ORDER_STATUS.PRINTING}">Imprimiendo</option>
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
        <div class="calc-card orders-table-wrapper" style="padding: 1.25rem; overflow-x: auto; -webkit-overflow-scrolling: touch;">
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
        </div>

        <!-- Tarjetas de Pedidos Estilo Despacho (<= 1200px) -->
        <div id="ordersCardsContainer" class="orders-cards-grid dispatch-cards-grid"></div>

        <div id="ordersEmptyState" class="kanban-empty-col" style="display: none; margin: 1.5rem 0;">
          No se encontraron pedidos que coincidan con los filtros seleccionados.
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
            ${isStaff ? `<span style="font-size: 0.85rem; color: var(--text-muted);">
              💡 Imprime esta ficha o colócala junto a la bobina montada en la máquina.
            </span>` : ''}
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
            <!-- AUTOCOMPLETADO INTELIGENTE B2B PARA STAFF -->
            <div class="client-autofill-box" id="manualAutofillBox">
              <div class="client-autofill-header">
                <label class="form-label" for="manualClientAutofillSelect" style="margin: 0; font-weight: 700; color: var(--cerulean); display: flex; align-items: center; gap: 0.35rem;">
                  <span>⚡</span>
                  <span>Autocompletar desde Cartera B2B:</span>
                </label>
                <button type="button" id="btnManualClearAutofill" class="btn-clear-autofill" style="display: none;">
                  Desvincular ✕
                </button>
              </div>
              <select id="manualClientAutofillSelect" class="input-control" aria-label="Seleccionar cliente B2B existente">
                <option value="">-- Seleccionar cliente existente o ingresar nuevo --</option>
                ${clientsStore.getClients().map(c => `
                  <option value="${c.id}">${c.company} (${c.name}) • ${CLIENT_TIERS[c.tier]?.badge || c.tier}</option>
                `).join('')}
              </select>
              <div id="manualAutofillBadgeContainer" style="display: none; margin-top: 0.5rem;"></div>
            </div>

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

            <div class="form-group" style="margin-top: -0.25rem; margin-bottom: 0.85rem;">
              <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; cursor: pointer; color: var(--text-secondary);">
                <input type="checkbox" id="manualCheckSaveClient" checked>
                <span>💾 Vincular / Sincronizar en Cartera de Clientes B2B</span>
              </label>
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

      <!-- MODAL: VISOR LIGHTBOX DE MONTAJE EN BOBINA (SNAPSHOT TÉCNICO) -->
      <div id="orderSnapshotLightboxModal" class="modal-backdrop" style="display: none; z-index: 10000;">
        <div class="modal-card" style="width: min(880px, 96vw); max-height: 94vh; padding: 1.25rem;">
          <div class="modal-header" style="margin-bottom: 0.75rem;">
            <div>
              <span class="badge" style="color: var(--cerulean); border-color: var(--cerulean);">Montaje Técnico</span>
              <h3 style="font-size: 1.15rem; font-weight: 800; margin-top: 0.25rem;">
                Disposición en Bobina Audley (28 cm útiles)
              </h3>
            </div>
            <button type="button" class="btn-close-modal" id="btnCloseOrderSnapshotLightbox" aria-label="Cerrar visor">✕</button>
          </div>
          <div style="background: #090e1c; border-radius: var(--radius-sm); border: 1px solid var(--border-color); padding: 0.75rem; display: flex; justify-content: center; align-items: center; overflow: auto; max-height: 70vh;">
            <img id="orderSnapshotLightboxImg" src="" alt="Esquema técnico de bobina" style="max-width: 100%; height: auto; object-fit: contain; border-radius: 4px;">
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
            <span style="font-size: 0.8rem; color: var(--text-muted);">
              💡 Este esquema representa la orientación y distribución requerida en el software RIP Photoprint.
            </span>
            <button type="button" class="btn btn-secondary" id="btnDismissOrderSnapshotLightbox" style="min-height: 38px;">
              Cerrar
            </button>
          </div>
        </div>
      </div>

      <!-- MODAL: VISOR LIGHTBOX DE COMPROBANTE DE PAGO BANCARIO -->
      <div id="receiptLightboxModal" class="modal-backdrop" style="display: none; z-index: 10001;">
        <div class="modal-card" style="width: min(760px, 96vw); max-height: 94vh; padding: 1.25rem;">
          <div class="modal-header" style="margin-bottom: 0.75rem;">
            <div>
              <span class="badge" style="color: #10b981; border-color: #10b981;">Comprobante de Pago</span>
              <h3 id="receiptLightboxTitle" style="font-size: 1.15rem; font-weight: 800; margin-top: 0.25rem;">
                Inspección de Boleta Bancaria
              </h3>
            </div>
            <button type="button" class="btn-close-modal" id="btnCloseReceiptLightbox" aria-label="Cerrar visor">✕</button>
          </div>
          <div id="receiptLightboxContainer" style="background: #090e1c; border-radius: var(--radius-sm); border: 1px solid var(--border-color); padding: 0.75rem; display: flex; justify-content: center; align-items: center; overflow: auto; max-height: 68vh; min-height: 200px;">
            <img id="receiptLightboxImg" src="" alt="Comprobante Bancario" style="max-width: 100%; height: auto; object-fit: contain; border-radius: 4px; display: none;">
            <div id="receiptLightboxPdf" style="display: none; text-align: center; padding: 2rem;">
              <span style="font-size: 3rem; display: block; margin-bottom: 1rem;">📄</span>
              <p style="font-size: 0.95rem; color: #fff; margin-bottom: 1.25rem;">Documento PDF adjunto como comprobante bancario.</p>
              <a id="receiptLightboxPdfLink" href="" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 0.5rem; text-decoration: none;">
                <span>Abrir PDF en pestaña nueva ↗</span>
              </a>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
            <span style="font-size: 0.8rem; color: var(--text-muted);">
              💡 Verifica número de boleta, fecha y monto depositado antes de autorizar producción.
            </span>
            <button type="button" class="btn btn-secondary" id="btnDismissReceiptLightbox" style="min-height: 38px;">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    `;
  },

  onMount: () => {
    ordersStore.syncWithApi().catch(() => {});
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
    // Lightbox modal para comprobante de pago bancario
    const receiptLightboxModal = document.getElementById('receiptLightboxModal');
    const receiptLightboxTitle = document.getElementById('receiptLightboxTitle');
    const receiptLightboxImg = document.getElementById('receiptLightboxImg');
    const receiptLightboxPdf = document.getElementById('receiptLightboxPdf');
    const receiptLightboxPdfLink = document.getElementById('receiptLightboxPdfLink');
    const btnCloseReceiptLightbox = document.getElementById('btnCloseReceiptLightbox');
    const btnDismissReceiptLightbox = document.getElementById('btnDismissReceiptLightbox');

    function openReceiptLightbox(url, name = 'Comprobante Bancario') {
      if (!receiptLightboxModal || !url) return;
      if (receiptLightboxTitle) receiptLightboxTitle.textContent = name;
      const isPdf = url.toLowerCase().includes('.pdf');
      if (isPdf) {
        if (receiptLightboxImg) receiptLightboxImg.style.display = 'none';
        if (receiptLightboxPdf) receiptLightboxPdf.style.display = 'block';
        if (receiptLightboxPdfLink) receiptLightboxPdfLink.href = url;
      } else {
        if (receiptLightboxPdf) receiptLightboxPdf.style.display = 'none';
        if (receiptLightboxImg) {
          receiptLightboxImg.src = url;
          receiptLightboxImg.style.display = 'block';
        }
      }
      receiptLightboxModal.style.display = 'block';
    }

    function closeReceiptLightbox() {
      if (receiptLightboxModal) {
        receiptLightboxModal.style.display = 'none';
      }
    }

    if (btnCloseReceiptLightbox) btnCloseReceiptLightbox.addEventListener('click', closeReceiptLightbox);
    if (btnDismissReceiptLightbox) btnDismissReceiptLightbox.addEventListener('click', closeReceiptLightbox);
    if (receiptLightboxModal) {
      receiptLightboxModal.addEventListener('click', (e) => {
        if (e.target === receiptLightboxModal) closeReceiptLightbox();
      });
    }

    // Lightbox modal para snapshot técnico de bobina
    const snapshotModal = document.getElementById('orderSnapshotLightboxModal');
    const snapshotImg = document.getElementById('orderSnapshotLightboxImg');
    const btnCloseSnapshot = document.getElementById('btnCloseOrderSnapshotLightbox');
    const btnDismissSnapshot = document.getElementById('btnDismissOrderSnapshotLightbox');

    function openOrderSnapshot(url) {
      if (snapshotModal && snapshotImg && url) {
        snapshotImg.src = url;
        snapshotModal.style.display = 'block';
      }
    }

    function closeOrderSnapshot() {
      if (snapshotModal) {
        snapshotModal.style.display = 'none';
      }
    }

    if (btnCloseSnapshot) btnCloseSnapshot.addEventListener('click', closeOrderSnapshot);
    if (btnDismissSnapshot) btnDismissSnapshot.addEventListener('click', closeOrderSnapshot);
    if (snapshotModal) {
      snapshotModal.addEventListener('click', (e) => {
        if (e.target === snapshotModal) closeOrderSnapshot();
      });
    }

    if (detailModal) {
      detailModal.addEventListener('click', async (e) => {
        // Snapshot lightbox
        const snapTarget = e.target.closest('.btn-expand-order-snapshot, .order-snapshot-img');
        if (snapTarget && snapTarget.dataset.snapshot) {
          openOrderSnapshot(snapTarget.dataset.snapshot);
          return;
        }

        // Receipt lightbox
        const receiptTarget = e.target.closest('.btn-view-receipt-lightbox, .order-receipt-thumbnail');
        if (receiptTarget && receiptTarget.dataset.receipt) {
          openReceiptLightbox(receiptTarget.dataset.receipt, receiptTarget.dataset.name || 'Comprobante Bancario');
          return;
        }

        // Trigger upload / replace receipt
        const triggerUpload = e.target.closest('.btn-trigger-upload-receipt, .btn-trigger-replace-receipt');
        if (triggerUpload && triggerUpload.dataset.orderId) {
          const fileInput = document.getElementById(`modalReceiptFileInput_${triggerUpload.dataset.orderId}`);
          if (fileInput) fileInput.click();
          return;
        }

        // Staff quick action: Anticipo 50%
        const btnPartial = e.target.closest('.btn-quick-pay-partial');
        if (btnPartial && btnPartial.dataset.orderId) {
          const o = ordersStore.getOrderById(btnPartial.dataset.orderId);
          if (o) {
            const half = Number(((o.metrics?.grandTotalQ || 0) * 0.5).toFixed(2));
            await ordersStore.attachPaymentReceipt(o.id, { amountPaidQ: half, paymentStatus: PAYMENT_STATUS.PARTIAL });
            showOrderDetailsModal(o.id);
          }
          return;
        }

        // Staff quick action: Pagado 100%
        const btnFull = e.target.closest('.btn-quick-pay-full');
        if (btnFull && btnFull.dataset.orderId) {
          const o = ordersStore.getOrderById(btnFull.dataset.orderId);
          if (o) {
            const full = Number((o.metrics?.grandTotalQ || 0).toFixed(2));
            await ordersStore.attachPaymentReceipt(o.id, { amountPaidQ: full, paymentStatus: PAYMENT_STATUS.PAID });
            showOrderDetailsModal(o.id);
          }
          return;
        }

        // Staff quick action: Aprobar para producción
        const btnApprove = e.target.closest('.btn-quick-approve-production');
        if (btnApprove && btnApprove.dataset.orderId) {
          const o = ordersStore.getOrderById(btnApprove.dataset.orderId);
          if (o) {
            ordersStore.updateProductionStatus(o.id, ORDER_STATUS.IN_AUDLEY_QUEUE);
            showOrderDetailsModal(o.id);
          }
          return;
        }

        // Abrir Recibo / Hoja de Taller desde el modal de detalle
        const btnOpenReceipt = e.target.closest('.btn-open-receipt-from-detail');
        if (btnOpenReceipt && btnOpenReceipt.dataset.orderId) {
          toggleModal(detailModal, false);
          showWorkshopSheetModal(btnOpenReceipt.dataset.orderId);
          return;
        }
      });

      // Handle file input change for receipt upload inside detail modal
      detailModal.addEventListener('change', async (e) => {
        if (e.target && e.target.classList.contains('modal-receipt-input')) {
          const fileInput = e.target;
          const orderId = fileInput.dataset.orderId;
          const order = ordersStore.getOrderById(orderId);
          if (!order || !fileInput.files || fileInput.files.length === 0) return;

          const file = fileInput.files[0];
          const validation = validateReceiptFile(file);
          const statusEl = document.getElementById(`modalReceiptStatus_${orderId}`);
          if (!validation.valid) {
            if (statusEl) {
              statusEl.style.color = '#ef4444';
              statusEl.textContent = validation.error;
            }
            return;
          }

          if (statusEl) {
            statusEl.style.color = 'var(--cerulean)';
            statusEl.textContent = 'Subiendo comprobante...';
          }

          try {
            const res = await uploadFileToStorage(file, {
              context: 'payments',
              orderId: order.backendId || order.id,
            });
            await ordersStore.attachPaymentReceipt(order.id, {
              paymentReceiptUrl: res?.fileUrl || null,
              paymentReceiptFileName: file.name,
            });
            showOrderDetailsModal(order.id);
          } catch (err) {
            console.warn('[OrdersView] Error subiendo boleta:', err);
            if (statusEl) {
              statusEl.style.color = '#ef4444';
              statusEl.textContent = 'Error al subir: ' + err.message;
            }
          }
        }
      });
    }

    if (workshopModal) {
      workshopModal.addEventListener('click', (e) => {
        const target = e.target.closest('.btn-expand-order-snapshot, .workshop-snapshot-img');
        if (target && target.dataset.snapshot) {
          openOrderSnapshot(target.dataset.snapshot);
        }
      });
    }

    if (btnPrintWorkshopSheet) btnPrintWorkshopSheet.addEventListener('click', () => {
      const container = document.getElementById('workshopSheetContainer');
      if (container && container.innerHTML.trim()) {
        printDocument(container.innerHTML, 'Hoja de Taller Audley UV DTF — Kroma Lab');
      } else if (typeof window !== 'undefined' && window.print) {
        window.print();
      }
    });

    let manualSelectedClientId = null;
    const manualSelect = document.getElementById('manualClientAutofillSelect');
    const btnManualClear = document.getElementById('btnManualClearAutofill');
    const manualBadgeContainer = document.getElementById('manualAutofillBadgeContainer');

    function updateManualBadge(client) {
      if (!manualBadgeContainer) return;
      if (!client) {
        manualBadgeContainer.style.display = 'none';
        manualBadgeContainer.innerHTML = '';
        if (btnManualClear) btnManualClear.style.display = 'none';
        return;
      }
      const tier = CLIENT_TIERS[client.tier] || { badge: client.tier, bg: 'rgba(28, 114, 147, 0.15)', color: 'var(--cerulean)' };
      manualBadgeContainer.style.display = 'block';
      manualBadgeContainer.innerHTML = `
        <div class="autofill-linked-badge" style="background: ${tier.bg}; color: ${tier.color}; border: 1px solid ${tier.color};">
          <span>🏢 Cliente Vinculado: <strong>${client.company}</strong></span>
          <span class="badge" style="background: ${tier.color}; color: #fff;">${tier.badge}</span>
        </div>
      `;
      if (btnManualClear) btnManualClear.style.display = 'inline-flex';
    }

    if (manualSelect) {
      manualSelect.addEventListener('change', (e) => {
        const id = e.target.value;
        if (id) {
          const c = clientsStore.getClientById(id);
          if (c) {
            manualSelectedClientId = c.id;
            const nameEl = document.getElementById('manualCustName');
            const compEl = document.getElementById('manualCustCompany');
            const phoneEl = document.getElementById('manualCustPhone');
            const nitEl = document.getElementById('manualCustNit');
            const addrEl = document.getElementById('manualCustAddress');
            const notesEl = document.getElementById('manualNotes');

            if (nameEl) nameEl.value = c.name;
            if (compEl) compEl.value = c.company;
            if (phoneEl) phoneEl.value = c.phone;
            if (nitEl) nitEl.value = c.nit;
            if (addrEl) addrEl.value = c.address;
            if (notesEl && c.notes) notesEl.value = c.notes;
            updateManualBadge(c);
          }
        } else {
          manualSelectedClientId = null;
          updateManualBadge(null);
        }
      });
    }

    if (btnManualClear) {
      btnManualClear.addEventListener('click', () => {
        manualSelectedClientId = null;
        if (manualSelect) manualSelect.value = '';
        updateManualBadge(null);
        const nameEl = document.getElementById('manualCustName');
        const compEl = document.getElementById('manualCustCompany');
        const phoneEl = document.getElementById('manualCustPhone');
        const nitEl = document.getElementById('manualCustNit');
        const addrEl = document.getElementById('manualCustAddress');
        if (nameEl) nameEl.value = '';
        if (compEl) compEl.value = '';
        if (phoneEl) phoneEl.value = '';
        if (nitEl) nitEl.value = 'CF';
        if (addrEl) addrEl.value = '';
      });
    }

    if (btnOpenNewOrder) {
      btnOpenNewOrder.addEventListener('click', () => {
        if (manualSelect) {
          manualSelect.innerHTML = `
            <option value="">-- Seleccionar cliente existente o ingresar nuevo --</option>
            ${clientsStore.getClients().map(c => `
              <option value="${c.id}">${c.company} (${c.name}) • ${CLIENT_TIERS[c.tier]?.badge || c.tier}</option>
            `).join('')}
          `;
        }
        manualSelectedClientId = null;
        updateManualBadge(null);
        toggleModal(createModal, true);
      });
    }
    if (btnCloseCreateModal) btnCloseCreateModal.addEventListener('click', () => toggleModal(createModal, false));
    if (btnCancelCreateModal) btnCancelCreateModal.addEventListener('click', () => toggleModal(createModal, false));

    // Submit de creación manual de orden
    if (formCreateOrder) {
      formCreateOrder.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('manualCustName')?.value.trim() || 'Cliente';
        const company = document.getElementById('manualCustCompany')?.value.trim() || '';
        const phone = document.getElementById('manualCustPhone')?.value.trim() || '+502 5555-0000';
        const nit = document.getElementById('manualCustNit')?.value.trim() || 'CF';
        const address = document.getElementById('manualCustAddress')?.value.trim() || '';
        const shouldSync = Boolean(document.getElementById('manualCheckSaveClient')?.checked);

        const itemTitle = document.getElementById('manualItemTitle')?.value || 'Stickers';
        const itemQty = parseInt(document.getElementById('manualItemQty')?.value, 10) || 50;
        const itemWidth = parseFloat(document.getElementById('manualItemWidth')?.value) || 5;
        const itemHeight = parseFloat(document.getElementById('manualItemHeight')?.value) || 5;
        const meters = parseFloat(document.getElementById('manualMeters')?.value) || 1.5;
        const totalQ = parseFloat(document.getElementById('manualTotalQ')?.value) || 172.5;
        const paymentStatus = document.getElementById('manualPaymentStatus')?.value || PAYMENT_STATUS.PENDING;
        const includeCutting = Boolean(document.getElementById('manualCheckCutting')?.checked);
        const notes = document.getElementById('manualNotes')?.value.trim() || '';

        let linkedClientId = manualSelectedClientId;

        if (shouldSync) {
          if (linkedClientId) {
            clientsStore.updateClient(linkedClientId, {
              address: address || undefined,
              phone: phone || undefined,
              nit: nit || undefined,
              company: company || undefined,
              name: name || undefined,
            });
          } else {
            const existing = (nit && nit !== 'CF' ? clientsStore.getClientByNit(nit) : null) || clientsStore.getClientByPhone(phone);
            if (existing) {
              linkedClientId = existing.id;
              clientsStore.updateClient(existing.id, {
                address: address || existing.address,
                company: company || existing.company,
                name: name || existing.name,
              });
            } else if (company || name) {
              const created = clientsStore.createClient({
                name: name || company,
                company: company || name,
                phone,
                nit,
                address: address || 'Ciudad de Guatemala',
                notes,
                tier: 'NUEVO',
              });
              linkedClientId = created.id;
            }
          }
        }

        const newOrder = ordersStore.createOrder({
          customer: { name, company, phone, nit, address, clientId: linkedClientId || null },
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
        manualSelectedClientId = null;
        updateManualBadge(null);
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
      const cardsContainer = document.getElementById('ordersCardsContainer');

      // Skeleton removed per QA spec

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
        if (cardsContainer) cardsContainer.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
      }

      if (emptyState) emptyState.style.display = 'none';

      tableBody.innerHTML = filtered.map(order => {
        const itemsSummary = order.items.length > 0
          ? `${order.items[0].title} (${order.items[0].qty} uds)`
          : 'Diseños varios';

        const prodOrder = productionStore?.state?.orders?.find(po => po.id === order.id || po.id === order.code);
        const currentProdStatus = prodOrder?.status || order.productionStatus;
        const prodStyle = PRODUCTION_STATUS_LABELS[currentProdStatus] || { label: currentProdStatus || 'Por Confirmar', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' };
        const payStyle = PAYMENT_STATUS_LABELS[order.paymentStatus];
        const orderWaMsg = formatOrderWhatsAppMessage(order);

        return `
          <tr data-order-row="${order.id}">
            <td style="font-weight: 700; font-family: var(--font-mono);">
              ${order.id}
              <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: normal;">
                ${new Date(order.createdAt).toLocaleDateString('es-GT', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
              ${order.paymentReceiptUrl ? `
                <div style="margin-top: 0.25rem;">
                  <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid #10b981; font-size: 0.72rem; padding: 2px 6px;">📄 Boleta</span>
                </div>
              ` : `
                <div style="margin-top: 0.25rem;">
                  <span class="badge" style="background: rgba(245, 158, 11, 0.1); color: #d97706; border: 1px solid rgba(245, 158, 11, 0.3); font-size: 0.72rem; padding: 2px 6px;">⏳ Boleta Pendiente</span>
                </div>
              `}
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
              <span class="badge" style="background: ${prodStyle.bg}; color: ${prodStyle.color}; border-color: ${prodStyle.color};">
                ${prodStyle.label}
              </span>
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

            <td class="orders-actions-cell" style="text-align: right;">
              <div class="orders-actions-group">
                <button class="btn-action-icon btn-view-order" data-order-id="${order.id}" title="Ver Ficha">
                  <span>🔍</span>
                </button>
                ${isStaff ? `
                  <button class="btn-action-icon btn-workshop-sheet" data-order-id="${order.id}" title="Hoja de Taller Audley">
                    <span>🖨️</span>
                  </button>
                  <button type="button" class="btn-action-icon btn-add-to-production" data-order-id="${order.id}" title="Agregar a Cola de Producción">
                    <span>⚙️</span>
                  </button>
                ` : ''}
                <a href="https://api.whatsapp.com/send?phone=${(order.customer.phone || BUSINESS_CONFIG.phoneWhatsApp).replace(/\D/g, '')}&text=${encodeURIComponent(orderWaMsg)}" target="_blank" rel="noopener noreferrer" class="btn-action-icon" title="Chat WhatsApp">
                  <span>💬</span>
                </a>
                ${isStaff ? `
                  <button type="button" class="btn-action-icon btn-cancel-order ${order.productionStatus === ORDER_STATUS.CANCELLED ? 'disabled' : ''}" data-order-id="${order.id}" title="${order.productionStatus === ORDER_STATUS.CANCELLED ? 'Orden Cancelada' : 'Cancelar Pedido'}" style="${order.productionStatus === ORDER_STATUS.CANCELLED ? 'opacity: 0.45; cursor: not-allowed;' : 'color: #ef4444; border-color: rgba(239, 68, 68, 0.35);'}">
                    <span>🚫</span>
                  </button>
                ` : ''}
              </div>
            </td>
          </tr>
        `;
      }).join('');

      if (cardsContainer) {
        cardsContainer.innerHTML = filtered.map(order => {
          const itemsSummary = order.items.length > 0
            ? `${order.items[0].title} (${order.items[0].qty} uds)`
            : 'Diseños varios';

          const prodOrder = productionStore?.state?.orders?.find(po => po.id === order.id || po.id === order.code);
        const currentProdStatus = prodOrder?.status || order.productionStatus;
        const prodStyle = PRODUCTION_STATUS_LABELS[currentProdStatus] || { label: currentProdStatus || 'Por Confirmar', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' };
          const payStyle = PAYMENT_STATUS_LABELS[order.paymentStatus];
          const orderWaMsg = formatOrderWhatsAppMessage(order);
          const totalPieces = order.items.reduce((acc, i) => acc + (i.qty || 0), 0);

          return `
            <div class="dispatch-card order-card" data-order-card="${order.id}" style="border-top: 4px solid ${prodStyle.color};">
              <!-- Cabecera: Folio, Boleta, Fecha y Selectores/Badges de Estado -->
              <div class="dispatch-card-header">
                <div>
                  <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                    <span class="dispatch-card-folio">#${order.id}</span>
                    ${order.paymentReceiptUrl ? `
                      <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid #10b981; font-size: 0.72rem; padding: 2px 6px;">
                        📄 Boleta
                      </span>
                    ` : `
                      <span class="badge" style="background: rgba(245, 158, 11, 0.1); color: #d97706; border: 1px solid rgba(245, 158, 11, 0.3); font-size: 0.72rem; padding: 2px 6px;">
                        ⏳ Boleta Pendiente
                      </span>
                    `}
                  </div>
                  <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.25rem;">
                    📅 ${new Date(order.createdAt).toLocaleDateString('es-GT', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                                    <span class="badge" style="background: ${prodStyle.bg}; color: ${prodStyle.color}; border-color: ${prodStyle.color}; padding: 0.35rem 0.65rem;">
                    ${prodStyle.label}
                  </span>
                  ${isStaff ? `
                    <select class="select-status select-pay-status" data-order-id="${order.id}" style="background: ${payStyle.bg}; color: ${payStyle.color}; border-color: ${payStyle.color}; min-height: 38px; padding: 0.35rem 0.65rem;">
                      <option value="${PAYMENT_STATUS.PENDING}" ${order.paymentStatus === PAYMENT_STATUS.PENDING ? 'selected' : ''}>Pendiente</option>
                      <option value="${PAYMENT_STATUS.PARTIAL}" ${order.paymentStatus === PAYMENT_STATUS.PARTIAL ? 'selected' : ''}>Anticipo 50%</option>
                      <option value="${PAYMENT_STATUS.PAID}" ${order.paymentStatus === PAYMENT_STATUS.PAID ? 'selected' : ''}>Pagado</option>
                    </select>
                  ` : `
                    <span class="badge" style="background: ${payStyle.bg}; color: ${payStyle.color}; border-color: ${payStyle.color}; padding: 0.35rem 0.65rem;">
                      ${payStyle.label}
                    </span>
                  `}
                </div>
              </div>

              <!-- Cuerpo: Cliente, Dimensiones y Métricas Grid -->
              <div class="dispatch-card-body">
                <div class="dispatch-card-client-row">
                  <div>
                    <div class="dispatch-card-client-name">
                      👤 ${order.customer.company || order.customer.name}
                    </div>
                    <div class="dispatch-card-client-phone">
                      📞 <span>${order.customer.phone || 'Sin teléfono'}</span>
                      ${order.customer.nit ? `<span>• NIT: ${order.customer.nit}</span>` : ''}
                    </div>
                  </div>
                  <div style="text-align: right;">
                    <span class="badge" style="background: rgba(2, 132, 199, 0.12); color: var(--cerulean); border-color: var(--cerulean); font-size: 0.78rem;">
                      ${itemsSummary}
                    </span>
                    ${order.items[0] ? `
                      <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">
                        ${order.items[0].widthCm} × ${order.items[0].heightCm} cm ${order.items.length > 1 ? `(+ ${order.items.length - 1} más)` : ''}
                      </div>
                    ` : ''}
                  </div>
                </div>

                ${order.customer.address ? `
                  <div class="dispatch-card-address" title="${order.customer.address}">
                    📍 <span style="color: var(--text-primary); font-weight: 500;">${order.customer.address}</span>
                  </div>
                ` : ''}

                <div class="dispatch-card-metrics-grid">
                  <div class="dispatch-card-metric-col">
                    <span>Metraje</span>
                    <span style="color: var(--cerulean);">${order.metrics.totalBillableMeters.toFixed(2)} m</span>
                  </div>
                  <div class="dispatch-card-metric-col">
                    <span>Piezas</span>
                    <span style="color: var(--text-primary);">${totalPieces} uds</span>
                  </div>
                  <div class="dispatch-card-metric-col">
                    <span>Total Orden</span>
                    <span style="color: var(--text-primary);">Q${order.metrics.grandTotalQ.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <!-- Pie: Acciones Táctiles -->
              <div class="dispatch-card-footer">
                <button 
                  type="button" 
                  class="btn btn-secondary btn-view-order" 
                  data-order-id="${order.id}" 
                  style="font-size: 0.85rem; padding: 0.5rem 0.9rem; min-height: 42px; display: inline-flex; align-items: center; gap: 0.4rem;"
                  title="Ver Detalle del Pedido"
                >
                  <span>🔍</span>
                  <span>Ver Detalle</span>
                </button>

                <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 0.45rem;">
                  ${isStaff ? `
                    <button 
                      type="button" 
                      class="btn btn-secondary btn-workshop-sheet" 
                      data-order-id="${order.id}" 
                      title="Hoja de Taller Audley"
                      style="font-size: 0.85rem; padding: 0.5rem 0.9rem; min-height: 42px; display: inline-flex; align-items: center; gap: 0.4rem;"
                    >
                      <span>🖨️</span>
                      <span>Taller</span>
                    </button>

                    <button 
                      type="button" 
                      class="btn btn-primary btn-add-to-production" 
                      data-order-id="${order.id}" 
                      title="Agregar a Cola de Producción"
                      style="font-size: 0.85rem; padding: 0.5rem 0.9rem; min-height: 42px; display: inline-flex; align-items: center; gap: 0.4rem;"
                    >
                      <span>⚙️</span>
                      <span>A Producción</span>
                    </button>

                    ${order.productionStatus !== ORDER_STATUS.CANCELLED ? `
                      <button 
                        type="button" 
                        class="btn btn-secondary btn-cancel-order" 
                        data-order-id="${order.id}" 
                        title="Cancelar Pedido"
                        style="font-size: 0.85rem; padding: 0.5rem 0.8rem; min-height: 42px; display: inline-flex; align-items: center; gap: 0.35rem; color: #ef4444; border-color: rgba(239, 68, 68, 0.4);"
                      >
                        <span>🚫</span>
                        <span>Cancelar</span>
                      </button>
                    ` : ''}
                  ` : ''}

                  <a 
                    href="https://api.whatsapp.com/send?phone=${(order.customer.phone || BUSINESS_CONFIG.phoneWhatsApp).replace(/\D/g, '')}&text=${encodeURIComponent(orderWaMsg)}" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    class="btn-action-icon" 
                    title="Chat WhatsApp"
                    style="min-height: 42px; min-width: 42px;"
                  >
                    <span>💬</span>
                  </a>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }

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
        const prodStyle = PRODUCTION_STATUS_LABELS[order.productionStatus] || { label: order.productionStatus || 'Por Confirmar', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' };
        const payStyle = PAYMENT_STATUS_LABELS[order.paymentStatus];
        const orderWaMsg = formatOrderWhatsAppMessage(order);

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
              <div style="background: var(--bg-surface-elevated); padding: 0.75rem 1rem; border-radius: 4px; border: 1px solid var(--border-color); margin-bottom: 0.75rem;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem;">
                  <div>
                    <strong>${idx + 1}. ${it.title}</strong>
                    <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 0.15rem;">
                      ${it.widthCm} × ${it.heightCm} cm • ${it.qty} unidades • ${it.includeCutting ? '✂️ Con corte' : '📜 En rollo'}${it.rotationDeg ? ` • 🔄 Rotado ${it.rotationDeg}°` : ''}
                    </div>
                  </div>
                  <span class="badge" style="font-size: 0.75rem;">${it.actualLinearMeters.toFixed(2)} m</span>
                </div>

                ${(it.canvasSnapshot || order.canvasSnapshot) ? `
                  <div class="order-canvas-snapshot-box" style="margin-top: 0.65rem; padding: 0.5rem 0.75rem; background: rgba(2, 132, 199, 0.06); border: 1px solid rgba(2, 132, 199, 0.2); border-radius: 4px; display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 0.65rem; min-width: 180px;">
                      <img src="${it.canvasSnapshot || order.canvasSnapshot}" alt="Montaje en Bobina" class="order-snapshot-img" data-snapshot="${it.canvasSnapshot || order.canvasSnapshot}" style="width: 80px; height: 40px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border-color); background: #090e1c; cursor: pointer;" title="Clic para ampliar vista técnica de bobina">
                      <div>
                        <div style="font-size: 0.82rem; font-weight: 700; color: var(--cerulean); display: flex; align-items: center; gap: 0.3rem;">
                          <span>📐 Vista de Bobina (28 cm)</span>
                        </div>
                        <div style="font-size: 0.74rem; color: var(--text-muted);">
                          ${it.stickersPerRow || 1}/fila • ${it.rows || 1} filas${it.rotationDeg ? ` (${it.rotationDeg}°)` : ''}
                        </div>
                      </div>
                    </div>
                    <button type="button" class="btn btn-secondary btn-expand-order-snapshot" data-snapshot="${it.canvasSnapshot || order.canvasSnapshot}" style="font-size: 0.78rem; padding: 0.3rem 0.65rem; min-height: 38px; display: inline-flex; align-items: center; gap: 0.35rem;">
                      <span>🔍 Ampliar</span>
                    </button>
                  </div>
                ` : ''}

                ${(it.previewUrl || it.fileInfo?.fileUrl || it.fileUrl || order.previewUrl || order.fileUrl) ? `
                  <div class="order-item-thumbnail-wrap" style="margin-top: 0.65rem; display: flex; align-items: center; gap: 0.65rem; background: var(--bg-surface-elevated); padding: 0.45rem 0.65rem; border-radius: 4px; border: 1px solid var(--border-color);">
                    <img src="${it.previewUrl || it.fileInfo?.fileUrl || it.fileUrl || order.previewUrl || order.fileUrl}" alt="Arte a imprimir" class="order-item-thumbnail-img" style="width: 44px; height: 44px; object-fit: contain; border-radius: 4px; border: 1px solid var(--border-color); background: #090e1c;">
                    <div style="font-size: 0.8rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      <span style="color: var(--text-primary); font-weight: 600;">🖼️ ${it.fileInfo?.name || it.fileName || order.fileName || 'Diseño a imprimir'}</span>
                      <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 2px;">Miniatura para impresión</div>
                    <a href="${it.fileInfo?.fileUrl || it.fileUrl || order.fileUrl}" target="_blank" rel="noopener noreferrer" class="btn-download-r2" style="display: none;"></a>
                    </div>
                  </div>
                ` : ''}
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


          <!-- SECCIÓN DE COMPROBANTE DE PAGO BANCARIO -->
          <div class="order-receipt-section" style="margin-top: 1rem; padding: 0.85rem; background: var(--bg-surface-elevated); border: 1px solid var(--border-color); border-radius: 6px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.4rem;">
              <strong style="font-size: 0.92rem; color: var(--cerulean); display: flex; align-items: center; gap: 0.35rem;">
                <span>🧾</span>
                <span>Comprobante de Pago Bancario:</span>
              </strong>
              ${order.paymentReceiptUrl ? `
                <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid #10b981; font-size: 0.75rem;">
                  ✓ Verificado / Adjunto
                </span>
              ` : `
                <span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid #f59e0b; font-size: 0.75rem;">
                  ⏳ Pendiente de Boleta
                </span>
              `}
            </div>

            ${order.paymentReceiptUrl ? `
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; background: rgba(2, 132, 199, 0.05); padding: 0.65rem 0.75rem; border-radius: 4px; border: 1px solid rgba(2, 132, 199, 0.15);">
                <div style="display: flex; align-items: center; gap: 0.65rem; min-width: 180px;">
                  ${(order.paymentReceiptUrl.toLowerCase().endsWith('.pdf') || (order.paymentReceiptFileName && order.paymentReceiptFileName.toLowerCase().endsWith('.pdf'))) ? `
                    <span style="font-size: 2rem;">📄</span>
                  ` : `
                    <img src="${order.paymentReceiptUrl}" alt="Boleta de Pago" class="order-receipt-thumbnail" data-receipt="${order.paymentReceiptUrl}" data-name="${order.paymentReceiptFileName || 'Comprobante'}" style="width: 60px; height: 45px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border-color); cursor: pointer;" title="Clic para ampliar boleta">
                  `}
                  <div>
                    <div style="font-weight: 700; font-size: 0.84rem; color: var(--text-primary); word-break: break-all;">
                      ${order.paymentReceiptFileName || 'comprobante_bancario'}
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">
                      Abono: Q${Number(order.amountPaidQ || 0).toFixed(2)} de Q${Number(order.metrics?.grandTotalQ || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                  <button type="button" class="btn btn-secondary btn-view-receipt-lightbox" data-receipt="${order.paymentReceiptUrl}" data-name="${order.paymentReceiptFileName || 'Comprobante'}" style="font-size: 0.78rem; padding: 0.35rem 0.75rem; min-height: 38px;">
                    <span>🔍 Ver Comprobante</span>
                  </button>
                  <button type="button" class="btn btn-secondary btn-trigger-replace-receipt" data-order-id="${order.id}" style="font-size: 0.78rem; padding: 0.35rem 0.65rem; min-height: 38px;">
                    <span>🔄 Cambiar</span>
                  </button>
                  <input type="file" id="modalReceiptFileInput_${order.id}" accept="image/*,.jpg,.jpeg,.png,.pdf" style="display: none;" class="modal-receipt-input" data-order-id="${order.id}">
                </div>
              </div>
            ` : `
              <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.65rem;">
                Aún no se ha adjuntado comprobante. Realiza tu depósito o transferencia a nuestras cuentas autorizadas:
                <div style="font-size: 0.78rem; line-height: 1.5; margin-top: 0.35rem; color: var(--text-primary);">
                  <div>• <strong>Banco Industrial (Monetaria):</strong> <code style="font-weight: 700;">5371667253</code></div>
                  <div style="font-size: 0.72rem; color: var(--text-muted);">Miguel Angel Dubois / Kroma Lab</div>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <input type="file" id="modalReceiptFileInput_${order.id}" accept="image/*,.jpg,.jpeg,.png,.pdf" style="display: none;" class="modal-receipt-input" data-order-id="${order.id}">
                <button type="button" class="btn btn-primary btn-trigger-upload-receipt" data-order-id="${order.id}" style="font-size: 0.82rem; padding: 0.45rem 0.85rem; min-height: 40px;">
                  <span>📎 Adjuntar Boleta (JPG, PNG, PDF)</span>
                </button>
                <span id="modalReceiptStatus_${order.id}" style="font-size: 0.8rem; color: var(--text-muted);"></span>
              </div>
            `}

            <!-- Acciones Rápidas para Staff -->
            ${isStaff ? `
              <div style="margin-top: 0.75rem; padding-top: 0.65rem; border-top: 1px dashed var(--border-color); display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap;">
                <span style="font-size: 0.78rem; font-weight: 700; color: var(--cerulean);">⚡ Acciones Rápidas de Cobranza (Staff):</span>
                <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
                  <button type="button" class="btn btn-secondary btn-quick-pay-partial" data-order-id="${order.id}" style="font-size: 0.76rem; padding: 0.25rem 0.55rem; min-height: 34px;">
                    <span>✓ Anticipo 50%</span>
                  </button>
                  <button type="button" class="btn btn-secondary btn-quick-pay-full" data-order-id="${order.id}" style="font-size: 0.76rem; padding: 0.25rem 0.55rem; min-height: 34px;">
                    <span>✓ Pagado 100%</span>
                  </button>
                  ${order.productionStatus === ORDER_STATUS.PENDING_REVIEW ? `
                    <button type="button" class="btn btn-primary btn-quick-approve-production" data-order-id="${order.id}" style="font-size: 0.76rem; padding: 0.25rem 0.65rem; min-height: 34px; background: #0284c7; border-color: #0284c7;">
                      <span>⚡ Aprobar para Producción</span>
                    </button>
                  ` : ''}
                </div>
              </div>
            ` : ''}
          </div>

          ${isStaff ? (() => {
            const prof = calculateOrderProfitability(order);
            return `
              <div style="margin-top: 0.75rem; padding: 0.75rem 1rem; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 4px; font-size: 0.82rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                  <strong style="color: #10b981;">Rentabilidad Staff Audley:</strong>
                  <span class="badge" style="font-size: 0.72rem; background: ${prof.profitability.badgeColor}22; color: ${prof.profitability.badgeColor}; border-color: ${prof.profitability.badgeColor};">
                    ${prof.profitability.profitMarginPercent.toFixed(1)}% Margen
                  </span>
                </div>
                <div style="display: flex; justify-content: space-between; font-family: var(--font-mono); color: var(--text-secondary); flex-wrap: wrap; gap: 0.4rem;">
                  <span>Costo Prod: Q${prof.costs.totalProductionCostQ.toFixed(2)}</span>
                  <span>Utilidad Neta: <strong style="color: #10b981;">Q${prof.profitability.netProfitQ.toFixed(2)}</strong></span>
                  <span>Q${prof.profitability.profitPerMeterQ.toFixed(2)}/m</span>
                </div>
              </div>
            `;
          })() : ''}

          ${order.workshopNotes ? `
            <div style="margin-top: 1rem; padding: 0.75rem; background: rgba(28, 114, 147, 0.1); border-left: 3px solid var(--cerulean); border-radius: 4px; font-size: 0.88rem;">
              <strong>Notas:</strong> ${order.workshopNotes}
            </div>
          ` : ''}

          <div style="margin-top: 1rem; display: flex; justify-content: flex-end; gap: 0.5rem; flex-wrap: wrap;">
            <button type="button" class="btn btn-secondary btn-open-receipt-from-detail" data-order-id="${order.id}" style="font-size: 0.85rem; padding: 0.5rem 1rem; display: inline-flex; align-items: center; gap: 0.4rem;">
              <span>🖨️</span>
              <span>Imprimir Recibo / Orden</span>
            </button>
            <a href="https://api.whatsapp.com/send?phone=${(order.customer.phone || BUSINESS_CONFIG.phoneWhatsApp).replace(/\D/g, '')}&text=${encodeURIComponent(orderWaMsg)}" target="_blank" rel="noopener noreferrer" class="btn btn-whatsapp" style="font-size: 0.85rem; padding: 0.5rem 1rem; text-decoration: none;">
              <span>💬 Enviar / Consultar por WhatsApp</span>
            </a>
          </div>
        `;
      }

      toggleModal(detailModal, true);
    }

    function showWorkshopSheetModal(orderId) {
      const order = ordersStore.getOrderById(orderId);
      if (!order) return;

      const container = document.getElementById('workshopSheetContainer');
      if (container) {
        container.innerHTML = renderOrderReceiptSheetHtml(order);
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

      // Agregar a Cola de Producción
      document.querySelectorAll('.btn-add-to-production').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.dataset.orderId;
          const order = ordersStore.getOrderById(id);
          if (!order) return;

          ordersStore.updateProductionStatus(id, ORDER_STATUS.IN_AUDLEY_QUEUE);

          const existingProd = productionStore?.getState()?.orders?.find(o => o.id === order.id || o.id === order.code);
          if (!existingProd && productionStore?.addOrder) {
            productionStore.addOrder({
              id: order.code || order.id,
              clientName: order.customer.name,
              contactPhone: order.customer.phone,
              title: order.items?.[0]?.title || `Orden ${order.code || order.id}`,
              widthCm: order.metrics?.widthCm || order.items?.[0]?.widthCm || 5,
              heightCm: order.metrics?.heightCm || order.items?.[0]?.heightCm || 5,
              qty: order.metrics?.totalStickers || order.items?.[0]?.qty || 50,
              meters: order.metrics?.totalBillableMeters || 1.0,
              includeCutting: order.metrics?.hasCutting,
              finishType: 'Barniz con Relieve 3D',
              fileUrl: order.items?.[0]?.fileUrl || null,
              fileName: order.items?.[0]?.fileName || null,
              canvasSnapshot: order.items?.[0]?.canvasSnapshot || order.canvasSnapshot || null,
              canvasSnapshotUrl: order.items?.[0]?.canvasSnapshotUrl || null,
              notes: order.workshopNotes || '',
            });
          } else if (existingProd && productionStore?.setOrderStatus) {
            productionStore.setOrderStatus(existingProd.id, ORDER_STATUS.IN_AUDLEY_QUEUE);
          }

          renderOrdersTable();
          renderOrdersMetrics();
        });
      });

      // Cancelar Pedido (Task QA)
      document.querySelectorAll('.btn-cancel-order').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.dataset.orderId;
          const order = ordersStore.getOrderById(id);
          if (!order) return;

          if (order.productionStatus === ORDER_STATUS.CANCELLED) {
            return;
          }

          if (typeof window !== 'undefined' && window.confirm && !window.confirm(`¿Estás seguro de cancelar la orden #${order.id}?`)) {
            return;
          }

          ordersStore.updateProductionStatus(id, ORDER_STATUS.CANCELLED);

          const existingProd = productionStore?.getState()?.orders?.find(o => o.id === order.id || o.id === order.code);
          if (existingProd && productionStore?.setOrderStatus) {
            productionStore.setOrderStatus(existingProd.id, ORDER_STATUS.CANCELLED);
          }

          renderOrdersTable();
          renderOrdersMetrics();
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
