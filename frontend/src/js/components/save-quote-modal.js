/**
 * Componente Modal para Guardar Cotizaciones UV DTF (SaveQuoteModal)
 * Diseño Mobile-First para clientes y taller. Permite registrar un proyecto con su nombre,
 * datos de contacto y especificaciones de tiraje para seguimiento o conversión a orden.
 * Garantiza subida persistente de imágenes y montajes a Cloudflare R2 / Neon (OrderItems).
 */

import { store } from '../store.js';
import { quotesStore } from '../modules/quotes-store.js';
import { uploadFileToStorage, uploadCanvasSnapshotToStorage, readFileAsDataURL } from '../modules/file-uploader.js';
import { generateCanvasSnapshot } from '../modules/roll-simulator.js';
import { mapOrderItem } from '../modules/order-item.js';

let modalInitialized = false;
let currentQuoteData = null;

export function initSaveQuoteModal() {
  let container = document.getElementById('saveQuoteModalContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'saveQuoteModalContainer';
    if (typeof document !== 'undefined' && document.body) {
      document.body.appendChild(container);
    }
  }

  container.innerHTML = `
    <div id="saveQuoteModal" class="modal-backdrop" style="display: none;" role="dialog" aria-modal="true" aria-labelledby="saveQuoteModalTitle">
      <div class="modal-card" style="width: min(540px, 95vw); max-height: 92vh; overflow-y: auto;">
        
        <!-- Encabezado del Modal -->
        <div class="modal-header">
          <div>
            <span class="badge" style="color: var(--cerulean); border-color: var(--cerulean);">💾 Presupuesto Comercial</span>
            <h2 id="saveQuoteModalTitle" style="font-size: 1.3rem; font-weight: 800; margin: 0.4rem 0 0.15rem;">
              Guardar Cotización UV DTF
            </h2>
            <p style="color: var(--text-secondary); font-size: 0.88rem; margin: 0;">
              Guarda este presupuesto para consultarlo más tarde o convertirlo a orden de producción en 1 clic.
            </p>
          </div>
          <button type="button" class="btn-close-modal" id="btnCloseSaveQuoteModal" aria-label="Cerrar modal" style="min-width: 44px; min-height: 44px;">✕</button>
        </div>

        <!-- Resumen del Tiraje Actual -->
        <div id="saveQuoteSummaryBox" style="background: var(--bg-surface-elevated); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.85rem 1rem; margin-bottom: 1.25rem;">
          <div style="font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 0.35rem;">
            📐 Especificaciones de Impresión
          </div>
          <div style="display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 0.5rem;">
            <div id="saveQuoteSpecsSummary" style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">
              5 × 5 cm • 50 piezas • 1.00 m
            </div>
            <div id="saveQuoteTotalSummary" style="font-size: 1.2rem; font-weight: 900; color: var(--cerulean);">
              Q150.00
            </div>
          </div>
          <div id="saveQuoteCuttingSummary" style="font-size: 0.82rem; color: var(--text-muted); margin-top: 0.25rem;">
            Entrega: Rollo continuo sin corte
          </div>
          <div id="saveQuoteItemsGallery" style="margin-top: 0.75rem; border-top: 1px dashed var(--border-color); padding-top: 0.75rem; display: flex; flex-direction: column; gap: 0.65rem;"></div>
        </div>

        <!-- Feedback de Error / Éxito -->
        <div id="saveQuoteFeedbackMsg" style="display: none; padding: 0.75rem 1rem; border-radius: var(--radius-sm); margin-bottom: 1rem; font-size: 0.88rem; font-weight: 600;"></div>

        <!-- Formulario -->
        <form id="formSaveQuote">
          <div class="form-group" style="margin-bottom: 1rem;">
            <label class="form-label" for="saveQuoteProjectName" style="font-weight: 700;">
              Nombre o Referencia del Proyecto: <span style="color: #ef4444;">*</span>
            </label>
            <input type="text" id="saveQuoteProjectName" class="input-control" required style="min-height: 44px;" placeholder="Ej. Stickers Café San Cristóbal, Logos Termos...">
          </div>

          <div class="input-row" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
            <div class="form-group">
              <label class="form-label" for="saveQuoteLeadName" style="font-weight: 600;">
                Nombre del Cliente o Contacto: <span style="color: #ef4444;">*</span>
              </label>
              <input type="text" id="saveQuoteLeadName" class="input-control" required style="min-height: 44px;" placeholder="Tu nombre y apellido">
            </div>
            <div class="form-group">
              <label class="form-label" for="saveQuoteCompanyName" style="font-weight: 600;">
                Empresa o Negocio: (opcional)
              </label>
              <input type="text" id="saveQuoteCompanyName" class="input-control" style="min-height: 44px;" placeholder="Ej. Café & Roastery, Taller...">
            </div>
          </div>

          <div class="input-row" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
            <div class="form-group">
              <label class="form-label" for="saveQuoteLeadPhone" style="font-weight: 600;">
                Teléfono / WhatsApp: <span style="color: #ef4444;">*</span>
              </label>
              <input type="tel" id="saveQuoteLeadPhone" class="input-control" required style="min-height: 44px;" placeholder="+502 5555-0000">
            </div>
            <div class="form-group">
              <label class="form-label" for="saveQuoteLeadEmail" style="font-weight: 600;">
                Correo Electrónico: (opcional)
              </label>
              <input type="email" id="saveQuoteLeadEmail" class="input-control" style="min-height: 44px;" placeholder="pedidos@empresa.gt">
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 1.25rem;">
            <label class="form-label" for="saveQuoteNotes" style="font-weight: 600;">
              Notas de Producción o Acabado:
            </label>
            <textarea id="saveQuoteNotes" class="input-control" rows="2" placeholder="Especificaciones sobre relieve de barniz 3D, empaque especial, fecha de entrega requerida..."></textarea>
          </div>

          <div style="display: flex; justify-content: flex-end; align-items: center; gap: 0.75rem; border-top: 1px solid var(--border-color); padding-top: 1.25rem; flex-wrap: wrap;">
            <button type="button" class="btn btn-secondary" id="btnCancelSaveQuote" style="min-height: 44px;">
              Cancelar
            </button>
            <button type="submit" class="btn btn-primary" id="btnSubmitSaveQuote" style="min-height: 44px;">
              <span>💾 Guardar Cotización</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  `;

  attachModalEventListeners();
  modalInitialized = true;
}

function attachModalEventListeners() {
  const btnClose = document.getElementById('btnCloseSaveQuoteModal');
  const btnCancel = document.getElementById('btnCancelSaveQuote');
  const form = document.getElementById('formSaveQuote');

  if (btnClose) {
    btnClose.addEventListener('click', closeSaveQuoteModal);
  }
  if (btnCancel) {
    btnCancel.addEventListener('click', closeSaveQuoteModal);
  }

  // Cerrar únicamente con la tecla Escape (no con clic fuera del backdrop para evitar pérdida accidental de datos)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('saveQuoteModal');
      if (modal && modal.style.display === 'block') {
        closeSaveQuoteModal();
      }
    }
  });

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      handleSaveQuoteSubmit();
    });
  }
}

export function openSaveQuoteModal(quoteData = null) {
  if (!modalInitialized || !document.getElementById('saveQuoteModal')) {
    initSaveQuoteModal();
  }

  currentQuoteData = quoteData || getCurrentQuoterSpecs();
  const modal = document.getElementById('saveQuoteModal');
  if (!modal) return;

  // Actualizar resumen en el modal
  const specsEl = document.getElementById('saveQuoteSpecsSummary');
  const totalEl = document.getElementById('saveQuoteTotalSummary');
  const cuttingEl = document.getElementById('saveQuoteCuttingSummary');

  const width = currentQuoteData.widthCm || 5;
  const height = currentQuoteData.heightCm || 5;
  const qty = currentQuoteData.qty || 50;
  const meters = (currentQuoteData.linearMeters !== undefined) ? currentQuoteData.linearMeters : 1.0;
  const total = currentQuoteData.totalPriceQ || 150.0;
  const cutPrice = currentQuoteData.cuttingPriceQ || 0.0;

  if (specsEl) {
    if (currentQuoteData.items && currentQuoteData.items.length > 1) {
      specsEl.textContent = `Combo ${currentQuoteData.items.length} Diseños • ${qty} piezas • ${Number(meters).toFixed(2)} m`;
    } else {
      specsEl.textContent = `${width} × ${height} cm • ${qty} piezas • ${Number(meters).toFixed(2)} m`;
    }
  }
  if (totalEl) {
    totalEl.textContent = `Q${total.toFixed(2)}`;
  }
  if (cuttingEl) {
    cuttingEl.textContent = currentQuoteData.withCutting
      ? `✂️ Con despiece individual (+Q${cutPrice.toFixed(2)})`
      : '📦 Entrega en rollo continuo sin corte';
  }

  // Previsualización del snapshot de la bobina si está disponible
  const snapshotWrap = document.getElementById('saveQuoteSnapshotWrap');
  const snapshotImg = document.getElementById('saveQuoteSnapshotImg');
  if (snapshotWrap && snapshotImg) {
    if (currentQuoteData.canvasSnapshot) {
      snapshotImg.src = currentQuoteData.canvasSnapshot;
      snapshotWrap.style.display = 'flex';
    } else {
      snapshotWrap.style.display = 'none';
    }
  }

  // Previsualización del arte del cliente
  const artWrap = document.getElementById('saveQuoteArtWrap');
  const artImg = document.getElementById('saveQuoteArtImg');
  const artName = document.getElementById('saveQuoteArtName');
  const artSize = document.getElementById('saveQuoteArtSize');

  const artUrl = currentQuoteData.previewUrl || currentQuoteData.fileUrl || null;
  const fileName = currentQuoteData.fileName || (currentQuoteData.rawFile ? currentQuoteData.rawFile.name : null);

  if (artWrap && artImg && artName) {
    if (artUrl || fileName) {
      artWrap.style.display = 'flex';
      if (artUrl) {
        artImg.src = artUrl;
        artImg.style.display = 'block';
      } else {
        artImg.style.display = 'none';
      }
      artName.textContent = fileName || 'Diseño adjunto';
      if (artSize) {
        const sizeBytes = currentQuoteData.fileSizeBytes || (currentQuoteData.rawFile ? currentQuoteData.rawFile.size : null);
        artSize.textContent = sizeBytes ? `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB` : '';
      }
    } else {
      artWrap.style.display = 'none';
    }
  }

  // Render de galería completa de todos los diseños y montajes técnicos (OrderItems)
  const galleryEl = document.getElementById('saveQuoteItemsGallery');
  const allItems = (currentQuoteData.items && currentQuoteData.items.length > 0)
    ? currentQuoteData.items
    : [currentQuoteData];

  if (galleryEl) {
    galleryEl.innerHTML = allItems.map((it, idx) => {
      const itArtUrl = it.previewUrl || it.fileUrl || null;
      const itFileName = it.fileName || it.fileInfo?.name || (it.rawFile ? it.rawFile.name : null);
      const snapshot = it.canvasSnapshot || it.canvasSnapshotUrl || null;
      const sizeBytes = it.fileSizeBytes || it.fileInfo?.size || (it.rawFile ? it.rawFile.size : null);
      const sizeFormatted = sizeBytes ? `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB` : '';

      return `
        <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.6rem 0.75rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.45rem; flex-wrap: wrap; gap: 0.25rem;">
            <div style="font-size: 0.84rem; font-weight: 700; color: var(--text-primary);">
              🎨 ${it.title || ('Diseño #' + (idx + 1))}
            </div>
            <div style="font-size: 0.76rem; color: var(--text-secondary); font-weight: 600;">
              ${it.widthCm} × ${it.heightCm} cm • ${it.qty} pcs ${it.includeCutting ? '• ✂️ Corte' : ''}
            </div>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 0.5rem; flex: 1; min-width: 140px;">
              ${itArtUrl ? `
                <img src="${itArtUrl}" alt="Arte" style="width: 40px; height: 40px; object-fit: contain; border-radius: 4px; border: 1px solid var(--border-color); background: #090e1c;">
              ` : `
                <div style="width: 40px; height: 40px; border-radius: 4px; border: 1px solid var(--border-color); background: #090e1c; display: flex; align-items: center; justify-content: center; font-size: 1.1rem;">📁</div>
              `}
              <div style="font-size: 0.78rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                <span style="color: var(--text-primary); font-weight: 600;">${itFileName || 'Diseño adjunto'}</span>
                ${sizeFormatted ? `<div style="color: var(--text-muted); font-size: 0.72rem;">${sizeFormatted}</div>` : ''}
              </div>
            </div>
            ${snapshot ? `
              <div style="display: flex; align-items: center; gap: 0.4rem;">
                <img src="${snapshot}" alt="Montaje" style="width: 80px; height: 36px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border-color); background: #090e1c;">
                <span style="font-size: 0.72rem; color: var(--text-muted);">📐 Bobina 28cm</span>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  // Pre-llenar datos de usuario logeado si está autenticado
  const user = store.state.user;
  const projectInput = document.getElementById('saveQuoteProjectName');
  const nameInput = document.getElementById('saveQuoteLeadName');
  const companyInput = document.getElementById('saveQuoteCompanyName');
  const phoneInput = document.getElementById('saveQuoteLeadPhone');
  const emailInput = document.getElementById('saveQuoteLeadEmail');
  const notesInput = document.getElementById('saveQuoteNotes');

  if (projectInput) {
    if (currentQuoteData.items && currentQuoteData.items.length > 1) {
      projectInput.value = `Proyecto ${currentQuoteData.items.length} diseños (${currentQuoteData.qty} piezas)`;
    } else {
      projectInput.value = `Stickers ${currentQuoteData.widthCm}×${currentQuoteData.heightCm} cm (${currentQuoteData.qty} pcs)`;
    }
  }
  if (nameInput) nameInput.value = user?.name || '';
  if (companyInput) companyInput.value = user?.company || '';
  if (phoneInput) phoneInput.value = user?.phone || '';
  if (emailInput) emailInput.value = user?.email || '';
  if (notesInput) notesInput.value = '';

  const feedback = document.getElementById('saveQuoteFeedbackMsg');
  if (feedback) {
    feedback.style.display = 'none';
    feedback.textContent = '';
  }

  modal.style.display = 'block';
  if (projectInput) setTimeout(() => projectInput.focus(), 50);
}

export function closeSaveQuoteModal() {
  const modal = document.getElementById('saveQuoteModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

export function getCurrentQuoterSpecs() {
  const wInput = document.getElementById('stickerWidth');
  const hInput = document.getElementById('stickerHeight');
  const qInput = document.getElementById('stickerQty');
  const cutInput = document.getElementById('optCutting');

  const widthCm = Number(wInput?.value) || 5;
  const heightCm = Number(hInput?.value) || 5;
  const qty = Number(qInput?.value) || 50;
  const withCutting = Boolean(cutInput?.checked);

  const priceEl = document.getElementById('resTotalPrice');
  const rateEl = document.getElementById('resTierRate');
  const metersEl = document.getElementById('resBillableMeters');
  const cutCostEl = document.getElementById('resCuttingCost');

  let totalPriceQ = 150.0;
  if (priceEl) {
    const rawText = priceEl.textContent.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(rawText);
    if (!isNaN(parsed) && parsed > 0) totalPriceQ = parsed;
  }

  let unitRateQ = 150.0;
  if (rateEl) {
    const rawRate = rateEl.textContent.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(rawRate);
    if (!isNaN(parsed) && parsed > 0) unitRateQ = parsed;
  }

  let linearMeters = 1.0;
  if (metersEl) {
    const rawMeters = metersEl.textContent.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(rawMeters);
    if (!isNaN(parsed) && parsed > 0) linearMeters = parsed;
  }

  let cuttingPriceQ = 0.0;
  if (withCutting && cutCostEl) {
    const rawCut = cutCostEl.textContent.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(rawCut);
    if (!isNaN(parsed) && parsed > 0) cuttingPriceQ = parsed;
  }

  const materialPriceQ = Math.max(0, totalPriceQ - cuttingPriceQ);

  const rollCanvas = document.getElementById('rollCanvas');
  let canvasSnapshot = null;
  if (rollCanvas) {
    canvasSnapshot = generateCanvasSnapshot(rollCanvas, {
      widthCm,
      heightCm,
      qty,
      includeCutting: withCutting,
      stickersPerRow: Math.max(1, Math.floor(28.0 / widthCm)),
      rows: Math.ceil(qty / Math.max(1, Math.floor(28.0 / widthCm))),
    });
  }

  return {
    widthCm,
    heightCm,
    qty,
    linearMeters,
    stickersPerRow: Math.max(1, Math.floor(28.0 / widthCm)),
    rows: Math.ceil(qty / Math.max(1, Math.floor(28.0 / widthCm))),
    withCutting,
    unitRateQ,
    materialPriceQ,
    cuttingPriceQ,
    totalPriceQ,
    canvasSnapshot,
    finishType: 'GLOSSY_VARNISH',
  };
}

export async function handleSaveQuoteSubmit() {
  const projectInput = document.getElementById('saveQuoteProjectName');
  const nameInput = document.getElementById('saveQuoteLeadName');
  const companyInput = document.getElementById('saveQuoteCompanyName');
  const phoneInput = document.getElementById('saveQuoteLeadPhone');
  const emailInput = document.getElementById('saveQuoteLeadEmail');
  const notesInput = document.getElementById('saveQuoteNotes');

  const projectName = projectInput?.value?.trim();
  const leadName = nameInput?.value?.trim();
  const companyName = companyInput?.value?.trim() || null;
  const leadPhone = phoneInput?.value?.trim();
  const leadEmail = emailInput?.value?.trim() || null;
  const notes = notesInput?.value?.trim() || '';

  if (!projectName) {
    showSaveQuoteFeedback('Por favor asigna un nombre o referencia al proyecto.', 'error');
    return false;
  }
  if (!leadName || leadName.length < 2) {
    showSaveQuoteFeedback('El nombre de contacto debe tener al menos 2 caracteres.', 'error');
    return false;
  }
  if (!leadPhone || leadPhone.length < 8) {
    showSaveQuoteFeedback('El número de teléfono debe tener al menos 8 dígitos.', 'error');
    return false;
  }

  const specs = currentQuoteData || getCurrentQuoterSpecs();
  const submitBtn = document.getElementById('btnSubmitSaveQuote');

  // Subir archivos y snapshots de ítems a Cloudflare R2 para almacenamiento permanente
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>⏳ Subiendo a R2...</span>`;
  }

  try {
    // 1. Subida para cada OrderItem si existen en combo
    if (specs.items && Array.isArray(specs.items) && specs.items.length > 0) {
      for (const it of specs.items) {
        if (it.rawFile && !it.fileUrl) {
          try {
            const uploadRes = await uploadFileToStorage(it.rawFile, { context: 'quotes' });
            it.fileUrl = uploadRes.fileUrl;
            it.fileKey = uploadRes.fileKey;
            it.fileName = uploadRes.fileName || it.rawFile.name;
            it.fileSizeBytes = uploadRes.fileSizeBytes || it.rawFile.size;
            it.provider = uploadRes.provider;
          } catch (uploadErr) {
            console.warn('[Storage] Error al subir archivo de ítem a R2:', uploadErr);
          }
        }
        if (it.canvasSnapshot && it.canvasSnapshot.startsWith('data:') && !it.canvasSnapshotUrl) {
          try {
            const snapUrl = await uploadCanvasSnapshotToStorage(
              it.canvasSnapshot,
              `esquema_${it.widthCm}x${it.heightCm}cm.png`,
              { context: 'quotes' }
            );
            if (snapUrl) it.canvasSnapshotUrl = snapUrl;
          } catch (snapErr) {
            console.warn('[Storage] Error al subir snapshot canvas de ítem:', snapErr);
          }
        }
      }
    }

    // 2. Subida para archivo general de la cotización
    if (specs.rawFile && !specs.fileUrl) {
      showSaveQuoteFeedback('☁️ Subiendo archivo a Cloudflare R2...', 'info');
      try {
        const uploadRes = await uploadFileToStorage(specs.rawFile, { context: 'quotes' });
        specs.fileUrl = uploadRes.fileUrl;
        specs.fileKey = uploadRes.fileKey;
        specs.fileName = uploadRes.fileName || specs.rawFile.name;
        specs.fileSizeBytes = uploadRes.fileSizeBytes || specs.rawFile.size;
        specs.provider = uploadRes.provider;
      } catch (uploadErr) {
        console.warn('[Storage] Error al subir archivo a R2 desde modal de cotización:', uploadErr);
        specs.provider = 'local';
      }
    }

    // Fallback seguro de lectura local solo si falló la subida remota
    if (!specs.fileUrl) {
      if (specs.previewUrl) {
        specs.fileUrl = specs.previewUrl;
      } else if (specs.rawFile && typeof FileReader !== 'undefined') {
        try {
          specs.fileUrl = await readFileAsDataURL(specs.rawFile);
        } catch (_) {}
      }
    }

    if (!specs.previewUrl && specs.fileUrl) {
      specs.previewUrl = specs.fileUrl;
    }
    if (!specs.fileName && specs.rawFile) {
      specs.fileName = specs.rawFile.name;
    }
    if (!specs.fileSizeBytes && specs.rawFile) {
      specs.fileSizeBytes = specs.rawFile.size;
    }

    // Subida de snapshot general de canvas
    if (specs.canvasSnapshot && specs.canvasSnapshot.startsWith('data:') && !specs.canvasSnapshotUrl) {
      try {
        const snapUrl = await uploadCanvasSnapshotToStorage(
          specs.canvasSnapshot,
          `esquema_${specs.widthCm}x${specs.heightCm}cm.png`,
          { context: 'quotes' }
        );
        if (snapUrl) specs.canvasSnapshotUrl = snapUrl;
      } catch (snapErr) {
        console.warn('[Storage] Error al subir canvas snapshot en modal cotización:', snapErr);
      }
    }

  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>💾 Guardar Cotización</span>`;
    }
  }

  // Normalizar ítems usando mapOrderItem
  const finalItems = (specs.items && Array.isArray(specs.items) && specs.items.length > 0)
    ? specs.items.map(it => mapOrderItem(it))
    : [mapOrderItem({
        title: projectName,
        widthCm: specs.widthCm,
        heightCm: specs.heightCm,
        qty: specs.qty,
        linearMeters: specs.linearMeters,
        includeCutting: specs.withCutting,
        stickersPerRow: specs.stickersPerRow,
        rows: specs.rows,
        fileUrl: specs.fileUrl || null,
        fileName: specs.fileName || null,
        fileSizeBytes: specs.fileSizeBytes || null,
        previewUrl: specs.previewUrl || specs.fileUrl || null,
        canvasSnapshot: specs.canvasSnapshot || null,
        canvasSnapshotUrl: specs.canvasSnapshotUrl || null,
        rotationDeg: specs.rotationDeg || 0,
      })];

  const newQuote = quotesStore.createQuote({
    projectName,
    leadName,
    leadPhone,
    leadEmail,
    companyName,
    notes,
    items: finalItems,
    ...specs,
    canvasSnapshot: specs.canvasSnapshot || null,
    canvasSnapshotUrl: specs.canvasSnapshotUrl || null,
    rotationDeg: specs.rotationDeg || 0,
    fileName: specs.fileName || (specs.rawFile ? specs.rawFile.name : null),
    fileUrl: specs.fileUrl || null,
    previewUrl: specs.previewUrl || specs.fileUrl || null,
    fileKey: specs.fileKey || null,
    fileSizeBytes: specs.fileSizeBytes || (specs.rawFile ? specs.rawFile.size : null),
  });

  showSaveQuoteFeedback(`✅ ¡Cotización ${newQuote.code} guardada exitosamente!`, 'success');

  // Redirigir o dar opción de ver
  setTimeout(() => {
    closeSaveQuoteModal();
    if (typeof window !== 'undefined') {
      if (window.router) {
        window.router.navigate('/cotizaciones');
      }
      if (window.location) {
        window.location.hash = '#/quotes';
      }
    }
  }, 750);

  return true;
}

function showSaveQuoteFeedback(msg, type = 'info') {
  const el = document.getElementById('saveQuoteFeedbackMsg');
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
