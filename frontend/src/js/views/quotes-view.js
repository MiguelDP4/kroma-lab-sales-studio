/**
 * Vista de Cotizaciones Guardadas y Conversión a Orden (QuotesView)
 * Enfoque Mobile-First en tarjetas ergonómicas con conversión directa en 1 clic.
 */

import { quotesStore } from '../modules/quotes-store.js';
import { cartStore } from '../modules/cart-store.js';
import { openCartDrawer } from '../components/cart-drawer.js';
import { store } from '../store.js';

let currentFilter = 'ALL';
let currentSearch = '';

export function resetQuotesViewFilters() {
  currentFilter = 'ALL';
  currentSearch = '';
}

export const quotesView = {
  path: '/quotes',
  name: 'quotes',
  allowedRoles: ['VISITOR', 'CUSTOMER', 'EMPLOYEE', 'ADMIN'],
  render: () => {
    const metrics = quotesStore.getMetrics();
    const quotes = quotesStore.filterQuotes(currentSearch, currentFilter);

    return `
      <!-- Encabezado y Métricas de Cotizaciones -->
      <div style="max-width: 1100px; margin: 1rem auto 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.25rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              <span class="badge" style="color: var(--cerulean); border-color: var(--cerulean);">📋 Presupuestos B2B</span>
              <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border-color: #10b981;">
                Conversión en 1 Clic
              </span>
            </div>
            <h1 style="font-size: clamp(1.6rem, 3.5vw, 2.3rem); font-weight: 800; margin: 0.4rem 0 0.2rem; color: var(--text-primary); letter-spacing: -0.02em;">
              Cotizaciones Guardadas
            </h1>
            <p style="color: var(--text-secondary); font-size: 0.95rem; margin: 0;">
              Consulta presupuestos de clientes y convierte proyectos a órdenes de producción en la Audley con un solo clic.
            </p>
          </div>

          <a href="/" class="btn btn-primary" data-link style="min-height: 44px; display: inline-flex; align-items: center; gap: 0.4rem;">
            <span>+ Nueva Cotización</span>
            <span>📐</span>
          </a>
        </div>

        <!-- Tarjetas de Métricas KPI -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.85rem; margin-bottom: 1.5rem;">
          <div class="calc-card" style="padding: 1rem; text-align: center;">
            <div style="font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">
              Total Cotizadas
            </div>
            <div style="font-size: 1.8rem; font-weight: 900; color: var(--text-primary); margin: 0.25rem 0;" id="kpiTotalQuotes">
              ${metrics.totalQuotes}
            </div>
            <div style="font-size: 0.76rem; color: var(--text-muted);">
              Presupuestos generados
            </div>
          </div>

          <div class="calc-card" style="padding: 1rem; text-align: center;">
            <div style="font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">
              Guardadas (Pendientes)
            </div>
            <div style="font-size: 1.8rem; font-weight: 900; color: var(--cerulean); margin: 0.25rem 0;" id="kpiSavedQuotes">
              ${metrics.savedCount}
            </div>
            <div style="font-size: 0.76rem; color: var(--text-muted);">
              Listas para conversión
            </div>
          </div>

          <div class="calc-card" style="padding: 1rem; text-align: center;">
            <div style="font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">
              Convertidas a Orden
            </div>
            <div style="font-size: 1.8rem; font-weight: 900; color: #10b981; margin: 0.25rem 0;" id="kpiConvertedQuotes">
              ${metrics.convertedCount}
            </div>
            <div style="font-size: 0.76rem; color: var(--text-muted);">
              En cola o terminadas
            </div>
          </div>

          <div class="calc-card" style="padding: 1rem; text-align: center;">
            <div style="font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">
              Tasa de Conversión
            </div>
            <div style="font-size: 1.8rem; font-weight: 900; color: #f59e0b; margin: 0.25rem 0;" id="kpiConversionRate">
              ${metrics.conversionRate}%
            </div>
            <div style="font-size: 0.76rem; color: var(--text-muted);">
              Efectividad comercial
            </div>
          </div>
        </div>

        <!-- Filtros y Barra de Búsqueda Mobile-First -->
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center; margin-bottom: 1.5rem;">
          <!-- Pestañas de Estado -->
          <div style="display: flex; gap: 0.35rem; background: var(--bg-surface-elevated); padding: 0.3rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); flex-wrap: wrap;">
            <button type="button" class="btn btn-secondary filter-quote-tab ${currentFilter === 'ALL' ? 'is-active btn-primary' : ''}" data-filter="ALL" style="min-height: 40px; font-size: 0.82rem; padding: 0.35rem 0.75rem;">
              Todas (${metrics.totalQuotes})
            </button>
            <button type="button" class="btn btn-secondary filter-quote-tab ${currentFilter === 'SAVED' ? 'is-active btn-primary' : ''}" data-filter="SAVED" style="min-height: 40px; font-size: 0.82rem; padding: 0.35rem 0.75rem;">
              💾 Pendientes (${metrics.savedCount})
            </button>
            <button type="button" class="btn btn-secondary filter-quote-tab ${currentFilter === 'CONVERTED' ? 'is-active btn-primary' : ''}" data-filter="CONVERTED" style="min-height: 40px; font-size: 0.82rem; padding: 0.35rem 0.75rem;">
              ⚡ Convertidas (${metrics.convertedCount})
            </button>
          </div>

          <!-- Buscador -->
          <div style="flex: 1; min-width: 240px; position: relative;">
            <input type="search" id="inputSearchQuotes" class="input-control" placeholder="Buscar por proyecto, cliente, teléfono o código..." value="${currentSearch}" style="min-height: 44px; padding-left: 2.25rem;">
            <span style="position: absolute; left: 0.85rem; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none;">🔍</span>
          </div>
        </div>

        <!-- Mensaje de Feedback -->
        <div id="quotesViewFeedback" style="display: none; padding: 0.75rem 1rem; border-radius: var(--radius-sm); margin-bottom: 1.25rem; font-size: 0.88rem; font-weight: 600;"></div>

        <!-- Listado en Tarjetas (Mobile-First) -->
        <div id="quotesListContainer" style="display: flex; flex-direction: column; gap: 1rem;">
          ${renderQuotesCards(quotes)}
        </div>

        <!-- Modal Lightbox para Ampliar Snapshot de Bobina -->
        <div id="snapshotLightboxModal" class="modal-backdrop" style="display: none;" role="dialog" aria-modal="true" aria-label="Montaje en bobina">
          <div class="modal-card" style="width: min(800px, 95vw); max-height: 92vh; padding: 1.25rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
              <h3 style="margin: 0; font-size: 1.1rem; font-weight: 800; color: var(--text-primary);">
                📐 Disposición de Impresión en Bobina Audley (28 cm)
              </h3>
              <button type="button" id="btnCloseSnapshotLightbox" class="btn-close-modal" style="min-width: 44px; min-height: 44px;" aria-label="Cerrar ampliación">✕</button>
            </div>
            <div style="text-align: center; background: #090e1c; border-radius: var(--radius-sm); padding: 0.5rem; overflow: auto; border: 1px solid var(--border-color);">
              <img id="snapshotLightboxImg" src="" alt="Montaje completo" style="max-width: 100%; height: auto; display: block; margin: 0 auto; border-radius: 2px;">
            </div>
            <div style="display: flex; justify-content: flex-end; margin-top: 1rem;">
              <button type="button" id="btnDismissSnapshotLightbox" class="btn btn-secondary" style="min-height: 44px;">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  onMount: () => {
    resetQuotesViewFilters();
    // Sincronizar en segundo plano con el backend API
    quotesStore.syncWithApi().catch(() => {});

    // Adjuntar escuchas de eventos
    attachQuotesViewEvents();

    // Suscribirse a cambios en quotesStore
    const unsubscribe = quotesStore.subscribe((quotes) => {
      updateQuotesUI(quotes);
    });

    return () => {
      unsubscribe();
    };
  },
};

function renderQuotesCards(quotes) {
  if (!quotes || quotes.length === 0) {
    return `
      <div class="calc-card" style="text-align: center; padding: 3rem 1.5rem; background: var(--bg-surface-elevated);">
        <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">📋</div>
        <h3 style="font-size: 1.2rem; font-weight: 700; margin: 0 0 0.5rem; color: var(--text-primary);">
          No se encontraron cotizaciones
        </h3>
        <p style="color: var(--text-secondary); font-size: 0.9rem; max-width: 420px; margin: 0 auto 1.25rem;">
          Calcula un tiraje en el cotizador interactivo y pulsa "Guardar Cotización" para conservarla o enviarla a producción.
        </p>
        <a href="/" class="btn btn-primary" data-link style="min-height: 44px;">
          Ir al Cotizador UV DTF 📐
        </a>
      </div>
    `;
  }

  const role = store.state.user?.role || 'CUSTOMER';
  const isStaff = role === 'ADMIN' || role === 'EMPLOYEE';

  return quotes.map((q) => {
    const isConverted = q.status === 'CONVERTED';
    const statusBadge = isConverted
      ? `<span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border-color: #10b981;">⚡ Convertida a Orden</span>`
      : `<span class="badge" style="background: rgba(2, 132, 199, 0.15); color: var(--cerulean); border-color: var(--cerulean);">💾 Presupuesto Guardado</span>`;

    const formattedDate = q.createdAt ? new Date(q.createdAt).toLocaleDateString('es-GT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) : 'Reciente';

    // Generar texto para WhatsApp
    const clientArtUrl = q.fileUrl || null;
    const clientArtText = clientArtUrl ? `🖼️ *Arte del cliente:* ${clientArtUrl}\n` : '';
    const snapUrl = q.canvasSnapshotUrl || (q.canvasSnapshot && !q.canvasSnapshot.startsWith('data:') ? q.canvasSnapshot : null);
    const snapText = snapUrl ? `📐 *Montaje en bobina:* ${snapUrl}\n` : '';

    const waText = encodeURIComponent(
      `¡Hola! Te comparto la cotización formal de Kroma Lab UV DTF:\n` +
      `📌 *Proyecto:* ${q.projectName}\n` +
      `🔖 *Código:* ${q.code}\n` +
      `📏 *Medidas:* ${q.widthCm} x ${q.heightCm} cm (${q.qty} piezas)\n` +
      `📐 *Metros lineales:* ${Number(q.linearMeters).toFixed(2)} m\n` +
      `✂️ *Corte:* ${q.withCutting ? 'Despiece individual incluido' : 'En rollo continuo'}\n` +
      clientArtText +
      snapText +
      `💰 *Total:* Q${Number(q.totalPriceQ).toFixed(2)}\n\n` +
      `¿Deseas que lo ingresemos a cola de impresión?`
    );

    const waPhone = q.leadPhone ? q.leadPhone.replace(/[^0-9]/g, '') : '50254066217';
    const waUrl = `https://wa.me/${waPhone}?text=${waText}`;

    return `
      <div class="calc-card quote-item-card" data-quote-id="${q.id}" style="padding: 1.25rem; border-left: 4px solid ${isConverted ? '#10b981' : 'var(--cerulean)'};">
        
        <!-- Cabecera de la Tarjeta -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 0.75rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.35rem;">
              <span style="font-family: monospace; font-size: 0.88rem; font-weight: 800; color: var(--text-primary); background: var(--bg-surface-elevated); padding: 0.2rem 0.5rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
                ${q.code}
              </span>
              ${statusBadge}
            </div>
            <h2 style="font-size: 1.2rem; font-weight: 800; margin: 0 0 0.25rem; color: var(--text-primary);">
              ${q.projectName}
            </h2>
            <div style="font-size: 0.85rem; color: var(--text-secondary);">
              <strong>👤 ${q.leadName}</strong>
              ${q.companyName ? `• 🏢 ${q.companyName}` : ''}
              ${q.leadPhone ? `• 📞 ${q.leadPhone}` : ''}
              • 🕒 ${formattedDate}
            </div>
          </div>

          <!-- Total en Quetzales -->
          <div style="text-align: right; background: rgba(28, 114, 147, 0.08); padding: 0.6rem 0.9rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">
              Total Presupuesto
            </div>
            <div style="font-size: 1.35rem; font-weight: 900; color: var(--cerulean);">
              Q${Number(q.totalPriceQ).toFixed(2)}
            </div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">
              Tarifa: Q${Number(q.unitRateQ).toFixed(2)}/m
            </div>
          </div>
        </div>

        <!-- Chips de Especificaciones Técnicas -->
        <div style="display: flex; gap: 0.45rem; flex-wrap: wrap; margin-bottom: 1rem;">
          <span class="badge" style="font-size: 0.8rem; padding: 0.25rem 0.6rem;">
            📏 ${q.widthCm} × ${q.heightCm} cm
          </span>
          <span class="badge" style="font-size: 0.8rem; padding: 0.25rem 0.6rem;">
            📦 ${q.qty} piezas
          </span>
          <span class="badge" style="font-size: 0.8rem; padding: 0.25rem 0.6rem;">
            📐 ${Number(q.linearMeters).toFixed(2)} m lineales
          </span>
          <span class="badge" style="font-size: 0.8rem; padding: 0.25rem 0.6rem; color: ${q.withCutting ? '#10b981' : 'var(--text-muted)'};">
            ${q.withCutting ? '✂️ Con corte (+Q' + Number(q.cuttingPriceQ).toFixed(2) + ')' : '📦 En rollo continuo'}
          </span>
          
        </div>

        <!-- Previsualización del Arte Adjunto por el Cliente -->
        ${(q.fileUrl || q.fileName || q.previewUrl) ? `
          <div class="quote-artwork-box" style="margin-top: -0.25rem; margin-bottom: 0.75rem; background: var(--bg-surface-elevated); padding: 0.65rem 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 0.75rem; flex: 1; min-width: 200px;">
              ${(q.previewUrl || q.fileUrl) ? `
                <img src="${q.previewUrl || q.fileUrl}" alt="Arte del cliente" style="width: 44px; height: 44px; object-fit: contain; border-radius: 4px; border: 1px solid var(--border-color); background: #090e1c;">
              ` : `
                <div style="width: 44px; height: 44px; border-radius: 4px; border: 1px solid var(--border-color); background: #090e1c; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">📁</div>
              `}
              <div style="overflow: hidden;">
                <div style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                  🖼️ ${q.fileName || 'Diseño UV DTF adjunto'}
                </div>
                <div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 0.15rem;">
                  ${q.fileSizeBytes ? `${(q.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB • ` : ''}Archivo listo para impresión
                </div>
              </div>
            </div>
            ${(q.fileUrl && !q.fileUrl.startsWith('data:')) ? `
              <a href="${q.fileUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="font-size: 0.78rem; padding: 0.35rem 0.65rem; min-height: 44px; display: inline-flex; align-items: center; gap: 0.35rem;" title="Ver archivo original">
                <span>🔗 Ver Archivo</span>
              </a>
            ` : ''}
          </div>
        ` : ''}

        <!-- Previsualización del montaje en bobina (Snapshot técnico) -->
        ${q.canvasSnapshot ? `
          <div class="quote-snapshot-box" style="margin-top: -0.25rem; margin-bottom: 1rem; background: var(--bg-surface-elevated); padding: 0.65rem 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 0.75rem; flex: 1; min-width: 200px;">
              <img src="${q.canvasSnapshot}" alt="Montaje en bobina" class="quote-snapshot-thumb" data-snapshot="${q.canvasSnapshot}" style="width: 100px; height: 44px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border-color); background: #090e1c; cursor: pointer;" title="Haz clic para ampliar la disposición en bobina">
              <div>
                <div style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary); display: flex; align-items: center; gap: 0.35rem;">
                  <span>📐 Disposición en Bobina Audley</span>
                  <span class="badge" style="font-size: 0.68rem; padding: 0.1rem 0.4rem; color: var(--cerulean); border-color: var(--cerulean);">28 cm</span>
                </div>
                <div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 0.15rem;">
                  ${q.stickersPerRow} por fila • ${q.rows} filas • ${q.widthCm}×${q.heightCm} cm
                </div>
              </div>
            </div>
            <button type="button" class="btn btn-secondary btn-expand-snapshot" data-snapshot="${q.canvasSnapshot}" style="font-size: 0.78rem; padding: 0.35rem 0.65rem; min-height: 44px; display: inline-flex; align-items: center; gap: 0.35rem;" title="Ver montaje técnico en tamaño completo">
              <span>🔍 Ampliar</span>
            </button>
          </div>
        ` : ''}

        <!-- Notas si existen -->
        ${q.notes ? `
          <div style="font-size: 0.84rem; color: var(--text-secondary); background: var(--bg-surface-elevated); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); border-left: 3px solid var(--border-color); margin-bottom: 1rem;">
            💬 <em>${q.notes}</em>
          </div>
        ` : ''}

        <!-- Acciones Principales y Conversión Directa en 1 Clic -->
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; flex-wrap: wrap; border-top: 1px solid var(--border-color); padding-top: 0.85rem;">
          
          <!-- Lado Izquierdo: Estado de Conversión o Botón 1-Clic -->
          <div>
            ${isConverted ? `
              <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <span style="font-size: 0.85rem; font-weight: 700; color: #10b981;">
                  ✅ Orden en Taller: ${q.convertedOrderCode || 'KL-2026-XXX'}
                </span>
                <a href="/pedidos" class="btn btn-secondary" data-link style="font-size: 0.78rem; padding: 0.3rem 0.65rem; min-height: 36px;">
                  🔍 Ver en Pedidos
                </a>
              </div>
            ` : isStaff ? `
              <button type="button" class="btn btn-primary btn-convert-quote" data-quote-id="${q.id}" style="min-height: 44px; display: inline-flex; align-items: center; gap: 0.4rem; background: linear-gradient(135deg, #059669, #10b981);">
                <span>⚡ Convertir en Orden de Producción</span>
              </button>
            ` : `
              <div style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.82rem; color: var(--text-secondary);">
                <span class="badge" style="background: rgba(139, 92, 246, 0.15); color: #8b5cf6; border: 1px solid #8b5cf6;">
                  ⏳ Pendiente de Confirmación
                </span>
                <span>Envía tu pedido por WhatsApp para confirmar e iniciar producción</span>
              </div>
            `}
          </div>

          <!-- Lado Derecho: Acciones Secundarias (WhatsApp, Cotizador, Eliminar) -->
          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <button type="button" class="btn btn-primary btn-add-quote-to-cart" data-quote-id="${q.id}" style="font-size: 0.8rem; padding: 0.4rem 0.75rem; min-height: 40px; display: inline-flex; align-items: center; gap: 0.35rem;" title="Agregar esta cotización al carrito">
              <span>🛒 Agregar al Carrito</span>
            </button>

            <button type="button" class="btn btn-secondary btn-load-quoter" data-width="${q.widthCm}" data-height="${q.heightCm}" data-qty="${q.qty}" data-cutting="${q.withCutting}" style="font-size: 0.8rem; padding: 0.4rem 0.75rem; min-height: 40px;" title="Cargar en Cotizador">
              <span>🔄 Cotizador</span>
            </button>

            <button type="button" class="btn btn-secondary btn-delete-quote" data-quote-id="${q.id}" style="color: #ef4444; font-size: 0.8rem; padding: 0.4rem 0.65rem; min-height: 40px;" title="Eliminar cotización">
              <span>🗑️</span>
            </button>
          </div>

        </div>

      </div>
    `;
  }).join('');
}

function attachQuotesViewEvents() {
  // Pestañas de Filtro
  const tabBtns = document.querySelectorAll('.filter-quote-tab');
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      currentFilter = btn.dataset.filter || 'ALL';
      tabBtns.forEach(b => {
        b.classList.remove('is-active', 'btn-primary');
        b.classList.add('btn-secondary');
      });
      btn.classList.add('is-active', 'btn-primary');
      btn.classList.remove('btn-secondary');
      refreshQuotesList();
    });
  });

  // Búsqueda
  const searchInput = document.getElementById('inputSearchQuotes');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value;
      refreshQuotesList();
    });
  }

  // Delegación de eventos para botones de acción en tarjetas
  const container = document.getElementById('quotesListContainer');
  if (container) {
    container.addEventListener('click', async (e) => {
      // Agregar al Carrito
      const btnAddToCart = e.target.closest('.btn-add-quote-to-cart');
      if (btnAddToCart) {
        const quoteId = btnAddToCart.dataset.quoteId;
        handleAddQuoteToCart(quoteId);
        return;
      }

      // 1. Convertir a Orden en 1 Clic
      const btnConvert = e.target.closest('.btn-convert-quote');
      if (btnConvert) {
        const quoteId = btnConvert.dataset.quoteId;
        await handleConvertQuote(quoteId);
        return;
      }

      // 2. Cargar en Cotizador
      const btnLoad = e.target.closest('.btn-load-quoter');
      if (btnLoad) {
        const { width, height, qty, cutting } = btnLoad.dataset;
        loadQuoteIntoQuoter({ width, height, qty, cutting: cutting === 'true' });
        return;
      }

      // 3. Eliminar Cotización
      const btnDelete = e.target.closest('.btn-delete-quote');
      if (btnDelete) {
        const quoteId = btnDelete.dataset.quoteId;
        handleDeleteQuote(quoteId);
        return;
      }

      // 4. Ampliar Snapshot de Bobina en Lightbox
      const btnSnapshot = e.target.closest('.btn-expand-snapshot, .quote-snapshot-thumb');
      if (btnSnapshot) {
        const snapshotUrl = btnSnapshot.dataset.snapshot;
        if (snapshotUrl) {
          openSnapshotLightbox(snapshotUrl);
        }
        return;
      }
    });
  }

  // Escuchas para cerrar el Lightbox del Snapshot
  const modalLightbox = document.getElementById('snapshotLightboxModal');
  const btnCloseLightbox = document.getElementById('btnCloseSnapshotLightbox');
  const btnDismissLightbox = document.getElementById('btnDismissSnapshotLightbox');

  if (btnCloseLightbox) {
    btnCloseLightbox.addEventListener('click', closeSnapshotLightbox);
  }
  if (btnDismissLightbox) {
    btnDismissLightbox.addEventListener('click', closeSnapshotLightbox);
  }
  if (modalLightbox) {
    modalLightbox.addEventListener('click', (e) => {
      if (e.target === modalLightbox) {
        closeSnapshotLightbox();
      }
    });
  }
}

export function openSnapshotLightbox(imgUrl) {
  const modal = document.getElementById('snapshotLightboxModal');
  const img = document.getElementById('snapshotLightboxImg');
  if (modal && img) {
    img.src = imgUrl;
    modal.style.display = 'block';
  }
}

export function closeSnapshotLightbox() {
  const modal = document.getElementById('snapshotLightboxModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

async function handleConvertQuote(quoteId) {
  try {
    showQuotesFeedback('Procesando conversión a orden de producción en taller...', 'info');
    const result = await quotesStore.convertToOrder(quoteId);

    if (result && result.success) {
      showQuotesFeedback(
        `✅ ¡Excelente! La cotización fue convertida exitosamente a la Orden ${result.order?.code || 'de producción'}. Ya está disponible en el panel de Pedidos y Kanban.`,
        'success'
      );
      refreshQuotesList();
    }
  } catch (err) {
    showQuotesFeedback(err?.message || 'Error al convertir cotización.', 'error');
  }
}

function handleAddQuoteToCart(quoteId) {
  const q = quotesStore.getQuoteById(quoteId);
  if (!q) return;

  const fileUrl = q.fileUrl || null;
  const fileName = q.fileName || null;
  const fileSizeBytes = q.fileSizeBytes || null;
  const previewUrl = q.previewUrl || fileUrl || null;

  cartStore.addItem({
    title: q.projectName || ('Sticker ' + q.widthCm + 'x' + q.heightCm + 'cm'),
    widthCm: q.widthCm,
    heightCm: q.heightCm,
    qty: q.qty,
    includeCutting: Boolean(q.withCutting),
    fileUrl,
    fileName,
    previewUrl,
    fileSizeBytes,
    fileInfo: (fileName || fileUrl) ? {
      name: fileName || 'Diseño UV DTF',
      fileUrl: fileUrl,
      size: fileSizeBytes || 0,
    } : null,
    canvasSnapshot: q.canvasSnapshot || null,
    canvasSnapshotUrl: q.canvasSnapshotUrl || null,
    rotationDeg: q.rotationDeg || 0,
    actualLinearMeters: q.linearMeters || 0,
    stickersPerRow: q.stickersPerRow || 1,
    rows: q.rows || 1,
  });

  showQuotesFeedback('Cotización "' + (q.projectName || q.code) + '" agregada al carrito de compras.', 'success');
  openCartDrawer();
}

function handleDeleteQuote(quoteId) {
  const quote = quotesStore.getQuoteById(quoteId);
  const name = quote?.projectName || quote?.code || 'esta cotización';

  if (typeof window !== 'undefined' && window.confirm && !window.confirm(`¿Estás seguro de eliminar "${name}"?`)) {
    return;
  }

  try {
    quotesStore.deleteQuote(quoteId);
    showQuotesFeedback(`Cotización eliminada exitosamente.`, 'info');
    refreshQuotesList();
  } catch (err) {
    showQuotesFeedback(err?.message || 'Error al eliminar cotización.', 'error');
  }
}

function loadQuoteIntoQuoter({ width, height, qty, cutting }) {
  if (typeof window !== 'undefined') {
    if (window.router) {
      window.router.navigate('/');
    }
    if (window.location) {
      window.location.hash = '#/';
    }
    setTimeout(() => {
      const wInput = document.getElementById('stickerWidth');
      const hInput = document.getElementById('stickerHeight');
      const qInput = document.getElementById('stickerQty');
      const cInput = document.getElementById('optCutting');

      if (wInput) wInput.value = width;
      if (hInput) hInput.value = height;
      if (qInput) qInput.value = qty;
      if (cInput) cInput.checked = cutting;

      // Disparar evento input para recalcular
      if (wInput) wInput.dispatchEvent(new Event('input', { bubbles: true }));
    }, 150);
  }
}

function refreshQuotesList() {
  const quotes = quotesStore.filterQuotes(currentSearch, currentFilter);
  const container = document.getElementById('quotesListContainer');
  if (container) {
    container.innerHTML = renderQuotesCards(quotes);
  }
  updateKPIDisplay();
}

function updateQuotesUI(quotes) {
  refreshQuotesList();
}

function updateKPIDisplay() {
  const m = quotesStore.getMetrics();
  const elTotal = document.getElementById('kpiTotalQuotes');
  const elSaved = document.getElementById('kpiSavedQuotes');
  const elConverted = document.getElementById('kpiConvertedQuotes');
  const elRate = document.getElementById('kpiConversionRate');

  if (elTotal) elTotal.textContent = m.totalQuotes;
  if (elSaved) elSaved.textContent = m.savedCount;
  if (elConverted) elConverted.textContent = m.convertedCount;
  if (elRate) elRate.textContent = `${m.conversionRate}%`;
}

function showQuotesFeedback(msg, type = 'info') {
  const el = document.getElementById('quotesViewFeedback');
  if (!el) return;

  el.style.display = 'block';
  el.textContent = msg;

  if (type === 'success') {
    el.style.background = 'rgba(16, 185, 129, 0.15)';
    el.style.color = '#10b981';
    el.style.border = '1px solid #10b981';
  } else if (type === 'error') {
    el.style.background = 'rgba(239, 68, 68, 0.15)';
    el.style.color = '#ef4444';
    el.style.border = '1px solid #ef4444';
  } else {
    el.style.background = 'rgba(2, 132, 199, 0.15)';
    el.style.color = 'var(--cerulean)';
    el.style.border = '1px solid var(--cerulean)';
  }
}
