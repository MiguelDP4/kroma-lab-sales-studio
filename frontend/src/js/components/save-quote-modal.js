/**
 * Componente Modal para Guardar Cotizaciones UV DTF (SaveQuoteModal)
 * Diseño Mobile-First para clientes y taller. Permite registrar un proyecto con su nombre,
 * datos de contacto y especificaciones de tiraje para seguimiento o conversión a orden.
 */

import { store } from '../store.js';
import { quotesStore } from '../modules/quotes-store.js';
import { uploadFileToStorage, uploadCanvasSnapshotToStorage, readFileAsDataURL } from '../modules/file-uploader.js';
import { generateCanvasSnapshot } from '../modules/roll-simulator.js';

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
              Q140.00
            </div>
          </div>
          <div id="saveQuoteCuttingSummary" style="font-size: 0.82rem; color: var(--text-muted); margin-top: 0.25rem;">
            Entrega: Rollo continuo sin corte
          </div>
          <div id="saveQuoteSnapshotWrap" style="display: none; margin-top: 0.65rem; border-top: 1px dashed var(--border-color); padding-top: 0.5rem; align-items: center; gap: 0.75rem;">
            <img id="saveQuoteSnapshotImg" src="" alt="Montaje en bobina" style="width: 100px; height: 40px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border-color); background: #090e1c;">
            <span style="font-size: 0.78rem; color: var(--text-secondary);">
              📐 <strong>Disposición técnica en bobina registrada</strong>
            </span>
          </div>
          <div id="saveQuoteArtWrap" style="display: none; margin-top: 0.65rem; border-top: 1px dashed var(--border-color); padding-top: 0.5rem; align-items: center; gap: 0.75rem;">
            <img id="saveQuoteArtImg" src="" alt="Arte del cliente" style="width: 44px; height: 44px; object-fit: contain; border-radius: 4px; border: 1px solid var(--border-color); background: #090e1c;">
            <div style="font-size: 0.82rem; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              🖼️ <strong id="saveQuoteArtName">archivo.png</strong>
              <div id="saveQuoteArtSize" style="font-size: 0.75rem; color: var(--text-muted);"></div>
            </div>
          </div>
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
  if (btnClose) btnClose.addEventListener('click', closeSaveQuoteModal);

  const btnCancel = document.getElementById('btnCancelSaveQuote');
  if (btnCancel) btnCancel.addEventListener('click', closeSaveQuoteModal);

  const modal = document.getElementById('saveQuoteModal');
  // Modal backdrop click disabled per QA specs (Task 5)

  if (typeof document !== 'undefined') {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const m = document.getElementById('saveQuoteModal');
        if (m && m.style.display !== 'none') {
          closeSaveQuoteModal();
        }
      }
    });
  }

  const form = document.getElementById('formSaveQuote');
  if (form) {
    form.addEventListener('submit', handleSaveQuoteSubmit);
  }
}

export function openSaveQuoteModal(quoteData = null) {
  if (!modalInitialized) {
    initSaveQuoteModal();
  }

  const modal = document.getElementById('saveQuoteModal');
  if (!modal) return;

  currentQuoteData = quoteData || getCurrentQuoterSpecs();

  // Actualizar resumen visual
  const specsEl = document.getElementById('saveQuoteSpecsSummary');
  const totalEl = document.getElementById('saveQuoteTotalSummary');
  const cuttingEl = document.getElementById('saveQuoteCuttingSummary');

  const lm = Number(currentQuoteData.linearMeters ?? currentQuoteData.billableMeters ?? 1.0);
  const total = Number(currentQuoteData.totalPriceQ ?? 140.0);
  const cutPrice = Number(currentQuoteData.cuttingPriceQ ?? currentQuoteData.cuttingTotalQ ?? 0.0);

  if (specsEl) {
    if (currentQuoteData.items && currentQuoteData.items.length > 1) {
      specsEl.textContent = `${currentQuoteData.items.length} diseños • ${currentQuoteData.qty} piezas • ${lm.toFixed(2)} m`;
    } else {
      specsEl.textContent = `${currentQuoteData.widthCm} × ${currentQuoteData.heightCm} cm • ${currentQuoteData.qty} piezas • ${lm.toFixed(2)} m`;
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

  // Pre-llenar datos de usuario logeado si está autenticado
  const user = store.state.user;
  const projectInput = document.getElementById('saveQuoteProjectName');
  const nameInput = document.getElementById('saveQuoteLeadName');
  const companyInput = document.getElementById('saveQuoteCompanyName');
  const phoneInput = document.getElementById('saveQuoteLeadPhone');
  const emailInput = document.getElementById('saveQuoteLeadEmail');
  const notesInput = document.getElementById('saveQuoteNotes');

  if (projectInput) {
    projectInput.value = `Stickers ${currentQuoteData.widthCm}×${currentQuoteData.heightCm} cm (${currentQuoteData.qty} pcs)`;
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

  // Intentar leer desglose calculado en DOM o calcular
  const totalText = document.getElementById('resTotalPrice')?.textContent || 'Q140.00';
  const totalPriceQ = parseFloat(totalText.replace(/[^0-9.]/g, '')) || 140.0;

  const metersText = document.getElementById('resBillableMeters')?.textContent || '1.00';
  const linearMeters = parseFloat(metersText.replace(/[^0-9.]/g, '')) || 1.0;

  const stickersPerRow = parseInt(document.getElementById('resStickersPerRow')?.textContent || '1', 10) || 1;
  const rows = parseInt(document.getElementById('resRows')?.textContent || '1', 10) || 1;

  const rollCanvas = typeof document !== 'undefined' ? document.getElementById('rollCanvas') : null;
  const canvasSnapshot = rollCanvas ? generateCanvasSnapshot(rollCanvas, { widthCm, heightCm, qty, linearMeters, stickersPerRow, rows }) : null;

  return {
    widthCm,
    heightCm,
    qty,
    linearMeters,
    stickersPerRow,
    rows,
    withCutting,
    unitRateQ: 140.0,
    materialPriceQ: linearMeters * 140.0,
    cuttingPriceQ: withCutting ? Math.max(qty * 0.35, 25.0) : 0,
    totalPriceQ,
    finishType: 'GLOSSY_VARNISH',
    canvasSnapshot,
    rotationDeg: 0,
  };
}

export async function handleSaveQuoteSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();

  const projectName = document.getElementById('saveQuoteProjectName')?.value?.trim();
  const leadName = document.getElementById('saveQuoteLeadName')?.value?.trim();
  const leadPhone = document.getElementById('saveQuoteLeadPhone')?.value?.trim();
  const leadEmail = document.getElementById('saveQuoteLeadEmail')?.value?.trim();
  const companyName = document.getElementById('saveQuoteCompanyName')?.value?.trim();
  const notes = document.getElementById('saveQuoteNotes')?.value?.trim();

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

  // Estrategia 1 (Lazy Upload): Si el usuario adjuntó un archivo y no se ha subido aún, subir ahora a R2
  if (specs.rawFile && !specs.fileUrl) {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>⏳ Subiendo a R2...</span>`;
    }
    showSaveQuoteFeedback('☁️ Subiendo archivo a Cloudflare R2...', 'info');

    try {
      const uploadRes = await uploadFileToStorage(specs.rawFile, {
        context: 'quotes',
      });
      specs.fileUrl = uploadRes.fileUrl;
      specs.fileKey = uploadRes.fileKey;
      specs.provider = uploadRes.provider;
    } catch (uploadErr) {
      console.warn('[Storage] Error al subir archivo a R2 desde modal de cotización:', uploadErr);
      specs.provider = 'local';
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>💾 Guardar Cotización</span>`;
      }
    }
  }

  // Fallback seguro: si no hay fileUrl remoto pero sí previewUrl o rawFile en memoria, asegurar URL
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

  // Si la instantánea del canvas es un base64 y no se ha subido aún, subir ahora a R2
  if (specs.canvasSnapshot && specs.canvasSnapshot.startsWith('data:') && !specs.canvasSnapshotUrl) {
    try {
      const snapUrl = await uploadCanvasSnapshotToStorage(
        specs.canvasSnapshot,
        `esquema_${specs.widthCm}x${specs.heightCm}cm.png`,
        { context: 'quotes' }
      );
      if (snapUrl) {
        specs.canvasSnapshotUrl = snapUrl;
      }
    } catch (snapErr) {
      console.warn('[Storage] Error al subir canvas snapshot en modal cotización:', snapErr);
    }
  }

  const newQuote = quotesStore.createQuote({
    projectName,
    leadName,
    leadPhone,
    leadEmail,
    companyName,
    notes,
    items: specs.items || [],
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
