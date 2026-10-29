/**
 * Vista de Producción y Tablero Kanban de la Impresora Industrial Audley UV DTF (28 cm útiles).
 * Supervisión de estaciones de trabajo, monitor de consumo de film PET y gestión de órdenes.
 */

import { productionStore, KANBAN_STAGES } from '../modules/production-store.js';
import { dispatchStore } from '../modules/dispatch-store.js';
import { ordersStore } from '../modules/orders-store.js';
import { ORDER_STATUS } from '../../shared/business-config.js';

const IS_TEST_ENV = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';

export const productionView = {
  path: '/produccion',
  name: 'production',
  allowedRoles: ['EMPLOYEE', 'ADMIN'],
  render: () => `
    <div class="kanban-view-wrap">
      <!-- Encabezado de Producción -->
      <div class="kanban-top-bar">
        <div>
          <span class="badge" style="color: var(--cerulean); border-color: var(--cerulean);">Taller Industrial • Audley UV DTF</span>
          <h1 style="font-size: clamp(1.8rem, 3.5vw, 2.4rem); font-weight: 800; margin: 0.5rem 0 0.25rem;">
            Tablero de Producción — Impresora Audley
          </h1>
          <p style="color: var(--text-secondary); font-size: 0.95rem;">
            Supervisión visual de estaciones de trabajo y monitoreo de film PET (28 cm útiles).
          </p>
        </div>

        <div class="kanban-top-actions">
          <button id="btnKanbanHelp" class="btn-help-kanban" title="¿Cómo funciona el flujo de producción?">
            <span>💡</span>
            <span>¿Cómo funciona el Sistema Kanban?</span>
          </button>
          <button id="btnMountRoll" class="btn btn-secondary" style="font-size: 0.88rem; padding: 0.55rem 1rem;">
            <span>🔄</span>
            <span>Bobina Film</span>
          </button>
          <button id="btnNewOrderModal" class="btn btn-primary" style="font-size: 0.88rem; padding: 0.55rem 1rem;">
            <span>+</span>
            <span>Nueva Orden</span>
          </button>
        </div>
      </div>

      <!-- Monitor de Bobina de Film PET -->
      <div id="rollMonitorContainer" class="roll-monitor-card">
        <!-- Renderizado dinámico por renderRollMonitor() -->
      </div>

      <!-- Tablero Kanban de 4 Estaciones -->
      <div class="kanban-board-grid" id="kanbanBoardGrid">
        <!-- Renderizado dinámico por renderKanbanColumns() -->
      </div>
    </div>

    <!-- MODAL EDUCATIVO: EXPLICACIÓN DEL SISTEMA KANBAN EN TALLER UV DTF -->
    <div id="kanbanHelpModal" class="modal-backdrop" style="display: none;">
      <div class="modal-card" style="width: min(620px, 94vw);">
        <div class="modal-header">
          <div>
            <span class="badge" style="color: var(--cerulean); border-color: var(--cerulean);">Metodología Visual</span>
            <h2 style="font-size: 1.35rem; font-weight: 800; margin-top: 0.35rem;">
              ¿Cómo funciona el Sistema Kanban en Kroma Lab?
            </h2>
          </div>
          <button type="button" class="btn-close-modal" id="btnCloseHelpModal">✕</button>
        </div>

        <div class="kanban-edu-section">
          <h3>📌 ¿Qué es Kanban?</h3>
          <p>
            <strong>Kanban</strong> (del japonés: <em>"tarjeta visual"</em> o señalización) es un sistema de producción ágil inventado por Taiichi Ohno en Toyota. En lugar de acumular trabajo en papel, <strong>cada pedido es una tarjeta visible</strong> que se mueve por las etapas físicas del taller en tiempo real.
          </p>
        </div>

        <div class="kanban-edu-section">
          <h3>⚙️ Las 4 Estaciones de Trabajo UV DTF:</h3>
          <div class="kanban-flow-steps">
            <div class="kanban-flow-item" style="border-left: 4px solid var(--cerulean);">
              <strong>1. En Cola Audley (Preparación y RIP):</strong>
              <span>Los artes gráficos están validados a 300 DPI y listos para enviar al software RIP (Photoprint). Aquí se acumulan metros lineales continuos sobre los 28 cm útiles de bobina.</span>
            </div>
            <div class="kanban-flow-item" style="border-left: 4px solid var(--color-warning);">
              <strong>2. Imprimiendo UV (En Máquina):</strong>
              <span>La impresora industrial Audley está aplicando físicamente tinta CMYK, cama blanca fotográfica opaca y barniz UV 3D curado con lámpara LED.</span>
            </div>
            <div class="kanban-flow-item" style="border-left: 4px solid var(--baltic-blue);">
              <strong>3. Laminado y Corte (Post-proceso):</strong>
              <span>El film base A impreso se calandra con el Film B de transferencia. Si el cliente pagó despiece individual (✂️), pasa a corte perimetral de precisión; si no, permanece en rollo continuo.</span>
            </div>
            <div class="kanban-flow-item" style="border-left: 4px solid var(--color-success);">
              <strong>4. Listo / Empaque (Control de Calidad):</strong>
              <span>Verificación técnica final de relieve y adherencia. Se enrolla en tubo protector o se empacan los recuadros listos para entrega inmediata en moto o recolección.</span>
            </div>
          </div>
        </div>

        <div class="kanban-edu-section">
          <h3>🛑 La Regla de Oro: Límite WIP (Work In Progress)</h3>
          <p>
            La máquina Audley imprime un rollo continuo a la vez. No acumules más de 1 o 2 órdenes en <em>"Imprimiendo UV"</em> simultáneamente. Si la estación de <em>Laminado y Corte</em> se satura, pausa el envío a impresión para evitar cuellos de botella y cuidar la calidad del taller.
          </p>
        </div>

        <div style="text-align: right; margin-top: 1.5rem;">
          <button type="button" class="btn btn-primary" id="btnOkHelpModal">Entendido, volver al Tablero</button>
        </div>
      </div>
    </div>

    <!-- MODAL: MONTAR NUEVA BOBINA DE FILM PET -->
    <div id="mountRollModal" class="modal-backdrop" style="display: none;">
      <div class="modal-card" style="width: min(480px, 94vw);">
        <div class="modal-header">
          <div>
            <h2 style="font-size: 1.25rem; font-weight: 800;">🔄 Montar Bobina de Film PET</h2>
            <p style="font-size: 0.85rem; color: var(--text-secondary);">Actualiza el metraje del desbobinador de la Audley</p>
          </div>
          <button type="button" class="btn-close-modal" id="btnCloseMountRollModal">✕</button>
        </div>

        <form id="formMountRoll">
          <div class="form-group">
            <label class="form-label" for="inputRollMeters">Longitud del Rollo (Metros lineales):</label>
            <input type="number" id="inputRollMeters" class="input-control" value="100" min="10" max="500" step="1" required>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.35rem;">
              Estándar industrial: 100 metros (30 cm nominal / 28 cm imprimibles).
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="inputRollNotes">Identificación / Lote de Bobina:</label>
            <input type="text" id="inputRollNotes" class="input-control" value="Bobina Audley PET Film A (100m)">
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem;">
            <button type="button" class="btn btn-secondary" id="btnCancelMountRoll">Cancelar</button>
            <button type="submit" class="btn btn-primary">Guardar e Instalar</button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL: REGISTRAR NUEVA ORDEN DE TALLER -->
    <div id="newOrderModal" class="modal-backdrop" style="display: none;">
      <div class="modal-card" style="width: min(520px, 94vw);">
        <div class="modal-header">
          <div>
            <h2 style="font-size: 1.25rem; font-weight: 800;">+ Nueva Orden de Taller</h2>
            <p style="font-size: 0.85rem; color: var(--text-secondary);">Ingresa el pedido directamente a la Cola Audley</p>
          </div>
          <button type="button" class="btn-close-modal" id="btnCloseNewOrderModal">✕</button>
        </div>

        <form id="formNewOrder">
          <div class="form-group">
            <label class="form-label" for="inputClientName">Cliente o Marca:</label>
            <input type="text" id="inputClientName" class="input-control" placeholder="Ej. Café San Cristóbal" required>
          </div>

          <div class="form-group">
            <label class="form-label" for="inputContactPhone">WhatsApp de Contacto:</label>
            <input type="tel" id="inputContactPhone" class="input-control" placeholder="+502 5555-1234" required>
          </div>

          <div class="input-row">
            <div class="form-group">
              <label class="form-label" for="inputOrderWidth">Ancho (cm):</label>
              <input type="number" id="inputOrderWidth" class="input-control" value="5" min="1" max="28" step="0.1" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="inputOrderHeight">Alto (cm):</label>
              <input type="number" id="inputOrderHeight" class="input-control" value="5" min="1" max="150" step="0.1" required>
            </div>
          </div>

          <div class="input-row">
            <div class="form-group">
              <label class="form-label" for="inputOrderQty">Cantidad (piezas):</label>
              <input type="number" id="inputOrderQty" class="input-control" value="100" min="1" max="10000" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="inputOrderMeters">Metros lineales estimados:</label>
              <input type="number" id="inputOrderMeters" class="input-control" value="1.5" min="0.1" max="100" step="0.05" required>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="selectFinishType">Tipo de Barniz / Acabado:</label>
            <select id="selectFinishType" class="input-control">
              <option value="Barniz con Relieve 3D">Barniz con Relieve 3D</option>
              <option value="Brillo Directo Estándar">Brillo Directo Estándar</option>
              <option value="Sin Barniz (Mate)">Sin Barniz (Mate)</option>
            </select>
          </div>

          <div class="form-group">
            <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; cursor: pointer;">
              <input type="checkbox" id="checkCutting">
              <span>✂️ Requiere corte perimetral individual (despiece)</span>
            </label>
          </div>

          <div class="form-group">
            <label class="form-label" for="inputOrderNotes">Notas para el operador:</label>
            <textarea id="inputOrderNotes" class="input-control" rows="2" placeholder="Instrucciones de empaque, color o urgencia..."></textarea>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem;">
            <button type="button" class="btn btn-secondary" id="btnCancelNewOrder">Cancelar</button>
            <button type="submit" class="btn btn-primary">Registrar en Cola</button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL: DETALLES DE LA ORDEN DE TALLER -->
    <div id="orderDetailModal" class="modal-backdrop" style="display: none;">
      <div class="modal-card" style="width: min(520px, 94vw);">
        <div class="modal-header">
          <div>
            <span class="badge" id="detailOrderBadge">#KL-00000</span>
            <h2 id="detailOrderClient" style="font-size: 1.3rem; font-weight: 800; margin-top: 0.35rem;">Cliente</h2>
          </div>
          <button type="button" class="btn-close-modal" id="btnCloseDetailModal">✕</button>
        </div>

        <div id="detailOrderBody" style="font-size: 0.92rem; line-height: 1.6;">
          <!-- Detalle inyectado dinámicamente -->
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem;">
          <button type="button" class="btn btn-primary" id="btnOkDetailModal">Cerrar Ficha</button>
        </div>
      </div>
    </div>
  `,

  onMount: () => {
    // Referencias a contenedores y modales
    const rollContainer = document.getElementById('rollMonitorContainer');
    const boardGrid = document.getElementById('kanbanBoardGrid');

    const helpModal = document.getElementById('kanbanHelpModal');
    const btnKanbanHelp = document.getElementById('btnKanbanHelp');
    const btnCloseHelpModal = document.getElementById('btnCloseHelpModal');
    const btnOkHelpModal = document.getElementById('btnOkHelpModal');

    const mountModal = document.getElementById('mountRollModal');
    const btnMountRoll = document.getElementById('btnMountRoll');
    const btnCloseMountRollModal = document.getElementById('btnCloseMountRollModal');
    const btnCancelMountRoll = document.getElementById('btnCancelMountRoll');
    const formMountRoll = document.getElementById('formMountRoll');

    const newOrderModal = document.getElementById('newOrderModal');
    const btnNewOrderModal = document.getElementById('btnNewOrderModal');
    const btnCloseNewOrderModal = document.getElementById('btnCloseNewOrderModal');
    const btnCancelNewOrder = document.getElementById('btnCancelNewOrder');
    const formNewOrder = document.getElementById('formNewOrder');

    const detailModal = document.getElementById('orderDetailModal');
    const btnCloseDetailModal = document.getElementById('btnCloseDetailModal');
    const btnOkDetailModal = document.getElementById('btnOkDetailModal');

    // Apertura y cierre de modales
    function toggleModal(modal, show) {
      if (modal) modal.style.display = show ? 'block' : 'none';
    }

    if (btnKanbanHelp) btnKanbanHelp.addEventListener('click', () => toggleModal(helpModal, true));
    if (btnCloseHelpModal) btnCloseHelpModal.addEventListener('click', () => toggleModal(helpModal, false));
    if (btnOkHelpModal) btnOkHelpModal.addEventListener('click', () => toggleModal(helpModal, false));

    if (btnMountRoll) btnMountRoll.addEventListener('click', () => toggleModal(mountModal, true));
    if (btnCloseMountRollModal) btnCloseMountRollModal.addEventListener('click', () => toggleModal(mountModal, false));
    if (btnCancelMountRoll) btnCancelMountRoll.addEventListener('click', () => toggleModal(mountModal, false));

    if (btnNewOrderModal) btnNewOrderModal.addEventListener('click', () => toggleModal(newOrderModal, true));
    if (btnCloseNewOrderModal) btnCloseNewOrderModal.addEventListener('click', () => toggleModal(newOrderModal, false));
    if (btnCancelNewOrder) btnCancelNewOrder.addEventListener('click', () => toggleModal(newOrderModal, false));

    if (btnCloseDetailModal) btnCloseDetailModal.addEventListener('click', () => toggleModal(detailModal, false));
    if (btnOkDetailModal) btnOkDetailModal.addEventListener('click', () => toggleModal(detailModal, false));

    // Submit de Montar Bobina
    if (formMountRoll) {
      formMountRoll.addEventListener('submit', (e) => {
        e.preventDefault();
        const meters = parseFloat(document.getElementById('inputRollMeters')?.value) || 100;
        const notes = document.getElementById('inputRollNotes')?.value || 'Bobina Audley PET Film A';
        productionStore.mountNewRoll(meters, notes);
        toggleModal(mountModal, false);
      });
    }

    // Submit de Nueva Orden
    if (formNewOrder) {
      formNewOrder.addEventListener('submit', (e) => {
        e.preventDefault();
        const clientName = document.getElementById('inputClientName')?.value;
        const contactPhone = document.getElementById('inputContactPhone')?.value;
        const widthCm = parseFloat(document.getElementById('inputOrderWidth')?.value) || 5;
        const heightCm = parseFloat(document.getElementById('inputOrderHeight')?.value) || 5;
        const qty = parseInt(document.getElementById('inputOrderQty')?.value, 10) || 100;
        const meters = parseFloat(document.getElementById('inputOrderMeters')?.value) || 1.5;
        const finishType = 'Barniz con Relieve 3D';
        const includeCutting = Boolean(document.getElementById('checkCutting')?.checked);
        const notes = document.getElementById('inputOrderNotes')?.value || '';

        productionStore.addOrder({
          clientName,
          contactPhone,
          title: `Stickers ${widthCm} × ${heightCm} cm`,
          widthCm,
          heightCm,
          qty,
          meters,
          finishType,
          includeCutting,
          notes,
        });

        formNewOrder.reset();
        toggleModal(newOrderModal, false);
      });
    }

    // Render del Monitor de Bobina
    function renderRollMonitor() {
      if (!rollContainer) return;
      const metrics = productionStore.getMetrics();
      const roll = productionStore.getState().roll;

      rollContainer.innerHTML = `
        <div class="roll-monitor-header">
          <div class="roll-monitor-title">
            <span>🎞️ Bobina Activa:</span>
            <span style="font-family: var(--font-mono); color: var(--cerulean);">${roll.notes || 'Bobina Audley PET Film A'}</span>
          </div>
          <span class="badge" style="font-size: 0.75rem;">Ancho útil: 28 cm</span>
        </div>

        <div class="roll-progress-track">
          <div class="roll-progress-bar ${metrics.isRollLow ? 'warning' : ''}" style="width: ${metrics.percentRemaining.toFixed(1)}%;"></div>
        </div>

        <div class="roll-stats-grid">
          <div class="roll-stat-item">
            <span class="roll-stat-label">Capacidad de Bobina</span>
            <span class="roll-stat-value">${metrics.totalRollMeters.toFixed(1)} m</span>
          </div>
          <div class="roll-stat-item">
            <span class="roll-stat-label">Metros Consumidos</span>
            <span class="roll-stat-value" style="color: var(--text-secondary);">${metrics.printedMeters.toFixed(2)} m</span>
          </div>
          <div class="roll-stat-item">
            <span class="roll-stat-label">Film Restante Disponible</span>
            <span class="roll-stat-value" style="color: ${metrics.isRollLow ? '#ef4444' : 'var(--color-success)'};">
              ${metrics.remainingMeters.toFixed(2)} m (${metrics.percentRemaining.toFixed(0)}%)
            </span>
          </div>
          <div class="roll-stat-item">
            <span class="roll-stat-label">Tirada en Cola Audley</span>
            <span class="roll-stat-value" style="color: var(--cerulean);">${metrics.queueMeters.toFixed(2)} m</span>
          </div>
        </div>

        ${metrics.isQueueExceedingRoll ? `
          <div class="roll-alert-box">
            <span>⚠️</span>
            <span><strong>Alerta de Bobina:</strong> La tirada en cola (${metrics.queueMeters.toFixed(2)} m) supera el film restante (${metrics.remainingMeters.toFixed(2)} m). Deberás montar una bobina nueva durante esta jornada.</span>
          </div>
        ` : ''}
      `;
    }

    // Render de las Columnas del Tablero Kanban
    function renderKanbanColumns() {
      if (!boardGrid) return;
      const state = productionStore.getState();
      const orders = state.orders;

      boardGrid.innerHTML = KANBAN_STAGES.map((stage, stageIndex) => {
        const stageOrders = orders.filter(o => o.status === stage.id);
        const stageMeters = stageOrders.reduce((sum, o) => sum + (o.meters || 0), 0);

        return `
          <div class="kanban-column" style="border-top: 4px solid ${stage.color};" data-stage="${stage.id}">
            <div class="kanban-col-header">
              <div class="kanban-col-title-wrap">
                <span class="kanban-col-title">${stage.title}</span>
                <span class="kanban-col-meters">${stageMeters.toFixed(2)} m en estación</span>
              </div>
              <span class="badge" style="font-size: 0.72rem;">${stageOrders.length}</span>
            </div>

            <div class="kanban-cards-list">
              ${stageOrders.length === 0 ? `
                <div class="kanban-empty-col">Estación libre / Sin órdenes</div>
              ` : stageOrders.map(order => `
                <div class="kanban-card" data-order-id="${order.id}">
                  <div class="kanban-card-head">
                    <span class="kanban-card-id">#${order.id}</span>
                    <span class="kanban-card-meters">${order.meters.toFixed(2)}m</span>
                  </div>
                  <div class="kanban-card-client">${order.clientName}</div>
                  <div class="kanban-card-title">${order.qty} pcs (${order.widthCm}×${order.heightCm} cm)</div>
                  
                  <div class="kanban-card-badges">
                    <span class="kanban-badge ${order.includeCutting ? 'badge-cut' : 'badge-roll'}">
                      ${order.includeCutting ? '✂️ Con corte' : '📜 En rollo'}
                    </span>
                    
                  </div>

                  <div class="kanban-card-actions">
                    <div>
                      ${stageIndex > 0 ? `
                        <button class="btn-kanban-nav btn-regress" data-order-id="${order.id}" title="Regresar a etapa previa">◀</button>
                      ` : ''}
                      <button class="btn-kanban-nav btn-detail" data-order-id="${order.id}" title="Ver ficha técnica">🔍</button>
                      ${stageIndex === KANBAN_STAGES.length - 1 ? `
                        <button type="button" class="btn-kanban-nav btn-emit-dispatch" data-order-id="${order.id}" title="Emitir Guía de Despacho" style="display: inline-flex; align-items: center;">🚚</button>
                      ` : ''}
                    </div>

                    <button class="btn-kanban-nav ${stageIndex === KANBAN_STAGES.length - 1 ? 'success' : ''} btn-advance" data-order-id="${order.id}" title="Avanzar etapa">
                      ${stageIndex === KANBAN_STAGES.length - 1 ? '✅ Entregar' : 'Avanzar ▶'}
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }).join('');

      // Adjuntar eventos a las tarjetas recién renderizadas
      attachCardEventListeners();
    }

    function showOrderDetails(orderId) {
      const order = productionStore.getState().orders.find(o => o.id === orderId);
      if (!order) return;

      const badgeEl = document.getElementById('detailOrderBadge');
      const clientEl = document.getElementById('detailOrderClient');
      const bodyEl = document.getElementById('detailOrderBody');

      if (badgeEl) badgeEl.textContent = `#${order.id}`;
      if (clientEl) clientEl.textContent = order.clientName;
      if (bodyEl) {
        bodyEl.innerHTML = `
          <div style="background: var(--bg-surface-elevated); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); margin-bottom: 1rem;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
              <span style="color: var(--text-secondary);">Producto:</span>
              <strong>${order.title}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
              <span style="color: var(--text-secondary);">Medidas:</span>
              <strong>${order.widthCm} × ${order.heightCm} cm (${order.qty} unidades)</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
              <span style="color: var(--text-secondary);">Metros Lineales (28 cm útiles):</span>
              <strong style="color: var(--cerulean); font-family: var(--font-mono);">${order.meters.toFixed(2)} m</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
              <span style="color: var(--text-secondary);">Acabado:</span>
              <strong>${order.includeCutting ? '✂️ Despiece / Corte Recto Individual' : '📜 En Rollo Continuo'}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-secondary);">Barniz UV:</span>
              <strong>${order.finishType}</strong>
            </div>
          </div>

          <div style="margin-bottom: 0.75rem;">
            <span style="color: var(--text-secondary); font-size: 0.85rem;">Contacto de WhatsApp:</span>
            <div>
              <a href="https://wa.me/${order.contactPhone.replace(/\D/g, '')}" target="_blank" rel="noopener noreferrer" style="color: var(--color-success); font-weight: 700;">
                💬 ${order.contactPhone}
              </a>
            </div>
          </div>

          ${order.notes ? `
            <div style="padding: 0.75rem; background: rgba(28, 114, 147, 0.1); border-left: 3px solid var(--cerulean); border-radius: 4px; font-size: 0.86rem;">
              <strong>Notas de Taller:</strong> ${order.notes}
            </div>
          ` : ''}
        `;
      }

      toggleModal(detailModal, true);
    }

    function attachCardEventListeners() {
      // Avanzar orden
      document.querySelectorAll('.btn-advance').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const orderId = btn.dataset.orderId;
          productionStore.advanceOrder(orderId);
        });
      });

      // Retroceder orden
      document.querySelectorAll('.btn-regress').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const orderId = btn.dataset.orderId;
          productionStore.regressOrder(orderId);
        });
      });

      // Ver detalle
      document.querySelectorAll('.btn-detail').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const orderId = btn.dataset.orderId;
          showOrderDetails(orderId);
        });
      });
    }

    // Suscribirse a cambios en el almacén de producción
    const unsubscribe = productionStore.subscribe(() => {
      renderRollMonitor();
      renderKanbanColumns();
    });

    let unsubOrders = null;
    if (!IS_TEST_ENV && typeof ordersStore !== 'undefined' && ordersStore.subscribe) {
      unsubOrders = ordersStore.subscribe(() => {
        if (typeof productionStore.syncWithOrdersStore === 'function') {
          productionStore.syncWithOrdersStore();
        }
      });
      if (typeof productionStore.syncWithApi === 'function') {
        productionStore.syncWithApi().catch(err => {
          console.warn('[ProductionView] Error al sincronizar con backend:', err);
        });
      }
    }

    // Render inicial
    renderRollMonitor();
    renderKanbanColumns();

    // Retornar teardown para el router SPA
    return () => {
      unsubscribe();
      if (unsubOrders) unsubOrders();
    };
  }
};
