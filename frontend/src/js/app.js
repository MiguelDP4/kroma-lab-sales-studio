/**
 * SPA Entrypoint — Kroma Lab Sales Studio
 * Manejo de logo, roles en navbar, enrutador SPA y cotizador interactivo.
 */

import { store } from './store.js';
import { calculateQuote } from './modules/quoter-engine.js';
import { drawRollCanvas } from './modules/roll-simulator.js';
import { BUSINESS_CONFIG } from '../shared/business-config.js';
import { Router } from './router.js';
import { initCartDrawer, openCartDrawer } from './components/cart-drawer.js';
import { cartStore } from './modules/cart-store.js';
import { validatePrintFile, readFileAsDataURL } from './modules/file-uploader.js';

import { quoterView } from './views/quoter-view.js';
import { ordersView } from './views/orders-view.js';
import { productionView } from './views/production-view.js';
import { clientsView } from './views/clients-view.js';
import { usersView } from './views/users-view.js';
import { reportsView } from './views/reports-view.js';

export const routes = [
  quoterView,
  { ...quoterView, path: '/cotizador' },
  ordersView,
  productionView,
  clientsView,
  reportsView,
  usersView,
];

export const router = new Router(routes, 'app');

export function initApp() {
  initTheme();
  initNavbarRoleSync();
  initMobileNav();
  initCartDrawer();
  router.init();
}

/**
 * Inicialización y sincronización del switch de tema (Dark/Light)
 */
function initTheme() {
  const themeToggle = document.getElementById('themeToggleBtn');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      store.toggleTheme();
    });
  }

  store.subscribe((state) => {
    updateThemeUI(state.theme);
  });
  updateThemeUI(store.state.theme);
}

function updateThemeUI(theme) {
  const icon = document.getElementById('themeToggleIcon');
  if (icon) {
    icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
  // Re-dibujar canvas al cambiar el tema para adaptar el contraste
  const canvas = document.getElementById('rollCanvas');
  if (canvas && store.state.activeQuote) {
    drawRollCanvas(canvas, store.state.activeQuote, theme === 'dark');
  }
}

/**
 * Control del menú hamburguesa en dispositivos móviles
 */
export function initMobileNav() {
  const toggleBtn = document.getElementById('mobileNavToggle');
  const navLinks = document.getElementById('navRoleLinks');
  const navIcon = document.getElementById('mobileNavIcon');

  if (toggleBtn && navLinks) {
    toggleBtn.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('is-open');
      toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      if (navIcon) navIcon.textContent = isOpen ? '✕' : '☰';
    });

    navLinks.addEventListener('click', (e) => {
      if (e.target.matches('a, a *')) {
        navLinks.classList.remove('is-open');
        toggleBtn.setAttribute('aria-expanded', 'false');
        if (navIcon) navIcon.textContent = '☰';
      }
    });

    document.addEventListener('click', (e) => {
      if (!navLinks.contains(e.target) && !toggleBtn.contains(e.target) && navLinks.classList.contains('is-open')) {
        navLinks.classList.remove('is-open');
        toggleBtn.setAttribute('aria-expanded', 'false');
        if (navIcon) navIcon.textContent = '☰';
      }
    });
  }
}

/**
 * Control dinámico del Navbar según el rol del usuario:
 * - "Sales Studio" SOLO se muestra para ADMIN y EMPLOYEE.
 * - Clientes y visitantes sin registrar SOLO ven "Kroma Lab".
 */
export function syncNavbarRole(role) {
  const salesStudioTag = document.getElementById('salesStudioTag');
  const navLinksContainer = document.getElementById('navRoleLinks');

  const isStaff = role === 'ADMIN' || role === 'EMPLOYEE';

  if (salesStudioTag) {
    salesStudioTag.style.display = isStaff ? 'inline-block' : 'none';
  }

  if (navLinksContainer) {
    if (isStaff) {
      navLinksContainer.innerHTML = `
        <a href="/produccion" class="nav-link" data-link>Cola Audley</a>
        <a href="/pedidos" class="nav-link" data-link>Pedidos</a>
        <a href="/clientes" class="nav-link" data-link>Clientes</a>
        <a href="/reportes" class="nav-link" data-link>Reportes</a>
        <a href="/" class="nav-link" data-link>Cotizador</a>
        ${role === 'ADMIN' ? '<a href="/usuarios" class="nav-link" data-link>Usuarios</a>' : ''}
      `;
    } else if (role === 'CUSTOMER') {
      navLinksContainer.innerHTML = `
        <a href="/" class="nav-link" data-link>Cotizador</a>
        <a href="/pedidos" class="nav-link" data-link>Mis Pedidos</a>
      `;
    } else {
      // Visitante no registrado
      navLinksContainer.innerHTML = `
        <a href="/" class="nav-link" data-link>Cotizador</a>
        <a href="#contacto" class="nav-link">WhatsApp</a>
      `;
    }
  }
}

let lastSyncedRole = null;

function initNavbarRoleSync() {
  store.subscribe((state) => {
    const role = state.user?.role || 'VISITOR';
    if (role !== lastSyncedRole) {
      lastSyncedRole = role;
      syncNavbarRole(role);
      // Re-resolver la ruta para revalidar permisos RBAC si el rol cambió
      if (typeof window !== 'undefined' && router && router.currentRoute) {
        router.resolve(window.location.pathname);
      }
    }
  });
  lastSyncedRole = store.state.user?.role || 'VISITOR';
  syncNavbarRole(lastSyncedRole);
}

/**
 * Inicialización de la interfaz del cotizador interactivo
 */
export function initQuoter() {
  const widthInput = document.getElementById('stickerWidth');
  const heightInput = document.getElementById('stickerHeight');
  const qtyInput = document.getElementById('stickerQty');
  const cuttingCheckbox = document.getElementById('optCutting');

  if (!widthInput || !heightInput || !qtyInput) return;

  function handleCalculate() {
    const w = parseFloat(widthInput.value) || 5;
    const h = parseFloat(heightInput.value) || 5;
    const q = parseInt(qtyInput.value, 10) || 50;
    const cut = cuttingCheckbox ? cuttingCheckbox.checked : false;

    const quote = calculateQuote({ widthCm: w, heightCm: h, qty: q, includeCutting: cut });
    store.setActiveQuote(quote);
    renderQuoteResults(quote);

    const canvas = document.getElementById('rollCanvas');
    if (canvas) {
      drawRollCanvas(canvas, quote, store.state.theme === 'dark');
    }
  }

  widthInput.addEventListener('input', handleCalculate);
  heightInput.addEventListener('input', handleCalculate);
  qtyInput.addEventListener('input', handleCalculate);
  if (cuttingCheckbox) {
    cuttingCheckbox.addEventListener('change', handleCalculate);
  }

  // Configurar botones de presets rápidos
  const presetChips = document.querySelectorAll('.btn-chip[data-w]');
  presetChips.forEach(chip => {
    chip.addEventListener('click', () => {
      presetChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      widthInput.value = chip.dataset.w;
      heightInput.value = chip.dataset.h;
      handleCalculate();
    });
  });

  // Botón de WhatsApp
  const btnWhatsApp = document.getElementById('btnQuoteWhatsApp');
  if (btnWhatsApp) {
    btnWhatsApp.addEventListener('click', () => {
      sendWhatsAppQuote(store.state.activeQuote);
    });
  }

  // Zona de Carga de Archivos de Impresión (Dropzone)
  let currentAttachedFile = null;
  let currentPreviewUrl = null;

  const dropzone = document.getElementById('quoterDropzone');
  const fileInput = document.getElementById('quoterFileInput');
  const emptyState = document.getElementById('dropzoneEmptyState');
  const selectedState = document.getElementById('dropzoneFileSelected');
  const fileNameEl = document.getElementById('dropzoneFileName');
  const fileSizeEl = document.getElementById('dropzoneFileSize');
  const thumbWrap = document.getElementById('dropzoneThumbWrap');
  const btnRemoveFile = document.getElementById('btnRemoveFile');
  const errorMsgEl = document.getElementById('dropzoneError');

  function clearDropzoneFile() {
    currentAttachedFile = null;
    currentPreviewUrl = null;
    if (fileInput) fileInput.value = '';
    if (emptyState) emptyState.style.display = 'flex';
    if (selectedState) selectedState.style.display = 'none';
    if (errorMsgEl) errorMsgEl.style.display = 'none';
  }

  async function handleFileSelected(file) {
    if (!file) return;
    const validation = validatePrintFile(file);
    if (!validation.valid) {
      if (errorMsgEl) {
        errorMsgEl.textContent = validation.error;
        errorMsgEl.style.display = 'block';
      }
      return;
    }

    if (errorMsgEl) errorMsgEl.style.display = 'none';
    currentAttachedFile = validation.fileData;

    try {
      currentPreviewUrl = await readFileAsDataURL(file);
    } catch (_) {
      currentPreviewUrl = null;
    }

    if (fileNameEl) fileNameEl.textContent = currentAttachedFile.name;
    if (fileSizeEl) fileSizeEl.textContent = currentAttachedFile.sizeFormatted;

    if (thumbWrap) {
      if (currentPreviewUrl) {
        thumbWrap.innerHTML = `<img src="${currentPreviewUrl}" alt="Preview" class="dropzone-thumb-img">`;
      } else {
        thumbWrap.innerHTML = `<span style="font-size: 1.5rem;">📁</span>`;
      }
    }

    if (emptyState) emptyState.style.display = 'none';
    if (selectedState) selectedState.style.display = 'flex';
  }

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', (e) => {
      if (e.target.closest('#btnRemoveFile')) return;
      fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) handleFileSelected(file);
    });

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) handleFileSelected(file);
    });
  }

  if (btnRemoveFile) {
    btnRemoveFile.addEventListener('click', (e) => {
      e.stopPropagation();
      clearDropzoneFile();
    });
  }

  // Botón Agregar al Carrito
  const btnAddToCart = document.getElementById('btnAddToCart');
  if (btnAddToCart) {
    btnAddToCart.addEventListener('click', () => {
      const w = parseFloat(widthInput.value) || 5;
      const h = parseFloat(heightInput.value) || 5;
      const q = parseInt(qtyInput.value, 10) || 50;
      const cut = cuttingCheckbox ? cuttingCheckbox.checked : false;

      cartStore.addItem({
        title: `Stickers ${w} × ${h} cm`,
        widthCm: w,
        heightCm: h,
        qty: q,
        includeCutting: cut,
        fileInfo: currentAttachedFile,
        previewUrl: currentPreviewUrl,
      });

      clearDropzoneFile();
      openCartDrawer();
    });
  }

  // Redimensionado responsivo del canvas
  window.addEventListener('resize', () => {
    const canvas = document.getElementById('rollCanvas');
    if (canvas && store.state.activeQuote) {
      drawRollCanvas(canvas, store.state.activeQuote, store.state.theme === 'dark');
    }
  });

  // Cálculo inicial
  handleCalculate();
}

/**
 * Actualiza el DOM con los resultados numéricos de la cotización
 */
export function renderQuoteResults(quote) {
  const setEl = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  setEl('resStickersPerRow', `${quote.stickersPerRow} pzas / fila`);
  setEl('resRows', `${quote.rows} filas`);
  setEl('resPhysicalLength', `${quote.physicalLengthCm.toFixed(1)} cm`);
  setEl('resBillableMeters', `${quote.billableMeters.toFixed(2)} m ${quote.isUnderMin ? '(Mínimo 1m)' : ''}`);
  setEl('resTierRate', `Q${quote.tierRate.toFixed(2)} / m`);
  setEl('resTotalPrice', `Q${quote.totalPriceQ.toFixed(2)}`);
  setEl('canvasStats', `${quote.stickersPerRow} por fila (${(quote.stickersPerRow * quote.widthCm).toFixed(1)} cm)`);
  setEl('resUnitHint', `Costo aprox: Q${quote.unitPriceQ.toFixed(2)} por sticker ${quote.includeCutting ? '(impreso y cortado)' : ''}`);

  // Detalle de corte
  const resCuttingCost = document.getElementById('resCuttingCost');
  if (resCuttingCost) {
    if (quote.includeCutting) {
      const cutHintText = quote.isCuttingMinApplied 
        ? `(Mínimo Q${BUSINESS_CONFIG.cuttingMinimumQ.toFixed(2)})` 
        : `(Q${quote.cuttingRateUnit.toFixed(2)} c/u)`;
      resCuttingCost.innerHTML = `<span style="color: var(--color-success); font-weight: 700;">+Q${quote.cuttingTotalQ.toFixed(2)}</span> <span style="font-size: 0.82rem; font-weight: 500; color: var(--text-secondary);">${cutHintText}</span>`;
    } else {
      resCuttingCost.textContent = 'No incluido (En rollo continuo)';
    }
  }

  const cuttingCard = document.getElementById('cuttingCard');
  if (cuttingCard) {
    cuttingCard.classList.toggle('active', quote.includeCutting);
  }

  const badgeRate = document.getElementById('cuttingBadgeRate');
  if (badgeRate) {
    badgeRate.textContent = `+Q${quote.cuttingRateUnit.toFixed(2)} / pza`;
  }

  // Tags de escala de corte
  const tag1 = document.getElementById('tierTag1');
  const tag2 = document.getElementById('tierTag2');
  const tag3 = document.getElementById('tierTag3');
  if (tag1 && tag2 && tag3) {
    tag1.classList.toggle('active', quote.qty <= 50);
    tag2.classList.toggle('active', quote.qty > 50 && quote.qty <= 200);
    tag3.classList.toggle('active', quote.qty > 200);
  }

  // Aviso de aprovechamiento de metro mínimo
  const noticeBox = document.getElementById('minimumNotice');
  if (noticeBox) {
    if (quote.isUnderMin) {
      noticeBox.style.display = 'block';
      noticeBox.innerHTML = `💡 <strong>Aprovecha tu metro:</strong> El pedido mínimo es 1 metro lineal (Q140.00). Tus ${quote.qty} stickers ocupan aprox. ${(quote.actualLinearMeters).toFixed(2)} m. ¡Puedes pedir hasta <strong>${quote.maxInOneMeter} piezas</strong> por el mismo precio exacto de Q140.00!`;
    } else {
      noticeBox.style.display = 'none';
    }
  }
}

/**
 * Genera el enlace directo a WhatsApp con el desglose comercial
 */
export function sendWhatsAppQuote(quote) {
  if (!quote) return;
  const cuttingTotalQ = quote.cuttingTotalQ || 0;
  const cuttingRateUnit = quote.cuttingRateUnit || 0;
  const cutDetail = quote.isCuttingMinApplied 
    ? `(+Q${cuttingTotalQ.toFixed(2)} tarifa base mínima)`
    : `(+Q${cuttingTotalQ.toFixed(2)} por ${quote.qty} pzas a Q${cuttingRateUnit.toFixed(2)} c/u)`;

  const cuttingText = quote.includeCutting
    ? `• *Corte / Acabado:* Sí, corte recto con máquinas de precisión ${cutDetail}\n`
    : `• *Corte / Acabado:* No (Entrega estándar en rollo continuo)\n`;

  const text = `*KROMA LAB — Cotización UV DTF*\n\n` +
    `Hola, deseo consultar la siguiente cotización:\n` +
    `• *Medida de sticker:* ${quote.widthCm} × ${quote.heightCm} cm\n` +
    `• *Cantidad:* ${quote.qty} stickers\n` +
    `• *Acomodo:* ${quote.stickersPerRow} stickers por fila (28 cm útiles)\n` +
    `• *Metros requeridos:* ${quote.billableMeters.toFixed(2)} m\n` +
    `• *Tarifa material:* Q${quote.tierRate.toFixed(2)} / m\n` +
    cuttingText +
    `• *TOTAL ESTIMADO:* Q${quote.totalPriceQ.toFixed(2)}\n\n` +
    `¿Qué disponibilidad tienen para entrega esta semana? Muchas gracias.`;

  const url = `https://api.whatsapp.com/send?phone=${BUSINESS_CONFIG.phoneWhatsApp}&text=${encodeURIComponent(text)}`;
  if (typeof window !== 'undefined') {
    window.open(url, '_blank');
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', initApp);
}
