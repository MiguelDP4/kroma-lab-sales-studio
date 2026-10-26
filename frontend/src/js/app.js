import { apiClient } from './modules/api-client.js';
import { ordersStore } from './modules/orders-store.js';
import { clientsStore } from './modules/clients-store.js';
import { inventoryStore } from './modules/inventory-store.js';
import { receivablesStore } from './modules/receivables-store.js';
import { dispatchStore } from './modules/dispatch-store.js';
import { usersStore } from './modules/users-store.js';
/**
 * SPA Entrypoint — Kroma Lab Sales Studio
 * Manejo de logo, roles en navbar, enrutador SPA y cotizador interactivo.
 */

import { store } from './store.js';
import { calculateQuote } from './modules/quoter-engine.js';
import { drawRollCanvas, generateCanvasSnapshot } from './modules/roll-simulator.js';
import { BUSINESS_CONFIG } from '../shared/business-config.js';
import { Router } from './router.js';
import { initCartDrawer, openCartDrawer } from './components/cart-drawer.js';
import { cartStore } from './modules/cart-store.js';
import { validatePrintFile, readFileAsDataURL, uploadFileToStorage, uploadCanvasSnapshotToStorage } from './modules/file-uploader.js';
import { initUserProfileModal, openUserProfileModal, closeUserProfileModal } from './components/user-profile-modal.js';
import { initSaveQuoteModal, openSaveQuoteModal, closeSaveQuoteModal } from './components/save-quote-modal.js';
import { initPrintListeners, printDocument } from './modules/print-helper.js';
import { quotesStore } from './modules/quotes-store.js';

import { quoterView } from './views/quoter-view.js';
import { ordersView } from './views/orders-view.js';
import { productionView } from './views/production-view.js';
import { clientsView } from './views/clients-view.js';
import { usersView } from './views/users-view.js';
import { reportsView } from './views/reports-view.js';
import { profitabilityView } from './views/profitability-view.js';
import { inventoryView } from './views/inventory-view.js';
import { receivablesView } from './views/receivables-view.js';
import { dispatchView } from './views/dispatch-view.js';
import { quotesView } from './views/quotes-view.js';
import { softwareView } from './views/software-view.js';

export const routes = [
  quoterView,
  { ...quoterView, path: '/cotizador' },
  quotesView,
  { ...quotesView, path: '/cotizaciones' },
  ordersView,
  productionView,
  clientsView,
  reportsView,
  profitabilityView,
  inventoryView,
  receivablesView,
  { ...receivablesView, path: '/cuentas-por-cobrar' },
  dispatchView,
  { ...dispatchView, path: '/remisiones' },
  usersView,
  softwareView,
  { ...softwareView, path: '/spot-studio' },
  { ...softwareView, path: '/preprensa' },
];

export const router = new Router(routes, 'app');

export function purgeLegacyMockStorage() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const IS_TEST = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
  if (IS_TEST) return;

  const keysToClean = [
    'kromalab_dispatch_notes',
    'kromalab_orders',
    'kromalab_clients',
    'kromalab_quotes',
    'kromalab_payments',
    'kromalab_production_orders',
    'kromalab_users',
  ];

  keysToClean.forEach(key => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      if (
        raw.includes('Claudia Estrada') ||
        raw.includes('Alejandro Morales') ||
        raw.includes('Rodrigo Méndez') ||
        raw.includes('Barbería Vintage') ||
        raw.includes('Sport Gym') ||
        raw.includes('REM-2026-00') ||
        raw.includes('KL-0004') ||
        raw.includes('CLI-00') ||
        raw.includes('COT-2026-00') ||
        raw.includes('PAY-2026-00') ||
        raw.includes('carlos.taller@kromalab.gt') ||
        raw.includes('sofia.ventas@kromalab.gt')
      ) {
        localStorage.removeItem(key);
      }
    } catch (_) {}
  });
}

export async function initBackendSync() {
  const IS_TEST = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
  try {
    const health = await apiClient.checkHealth();
    if (health && health.status === 'ok') {
      if (IS_TEST && !apiClient.token) {
        try {
          const res = await apiClient.auth.login('miguel@kromalab.gt', 'Admin2026!');
          if (res && res.token) {
            apiClient.setToken(res.token);
          }
        } catch (_) {}
      }
      if (apiClient.token) {
        await Promise.allSettled([
          ordersStore.syncWithApi(),
          clientsStore.syncWithApi(),
          inventoryStore.syncWithApi(),
          receivablesStore.syncWithApi(),
          dispatchStore.syncWithApi(),
          usersStore.syncWithApi(),
          quotesStore.syncWithApi(),
        ]);
      }
    }
  } catch (err) {
    console.warn('[BackendSync] Servidor backend offline o no disponible:', err?.message || err);
  }
}

export function initApp() {
  purgeLegacyMockStorage();
  initTheme();
  initNavbarRoleSync();
  initMobileNav();
  initCartDrawer();
  initUserProfileModal();
  initSaveQuoteModal();
  initPrintListeners();
  router.init();
  initBackendSync();
}

/**
 * Estado en memoria para imagen activa, rotación y relación de aspecto del simulador de bobina
 */
let currentPreviewImg = null;
let currentRotation = 0;
let currentImageAspectRatio = null;

export function getActivePreviewImg() {
  return currentPreviewImg;
}

export function getActiveRotation() {
  return currentRotation;
}

export function getActiveImageAspectRatio() {
  return currentImageAspectRatio;
}

export function setActivePreviewImg(img, rotation = 0) {
  currentPreviewImg = img;
  currentRotation = rotation;
  if (img && (img.naturalWidth || img.width)) {
    const nw = img.naturalWidth || img.width || 1;
    const nh = img.naturalHeight || img.height || 1;
    currentImageAspectRatio = nh / nw;
  } else {
    currentImageAspectRatio = null;
  }
  redrawRollCanvas();
}

export function redrawRollCanvas() {
  const canvas = document.getElementById('rollCanvas');
  if (canvas && store.state.activeQuote) {
    drawRollCanvas(canvas, store.state.activeQuote, store.state.theme === 'dark', currentPreviewImg, currentRotation);
  }
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
  redrawRollCanvas();
}

/**
 * Control del menú hamburguesa en dispositivos móviles
 */
export function initMobileNav() {
  const toggleBtn = document.getElementById('mobileNavToggle');
  const navLinks = document.getElementById('navRoleLinks');
  const navIcon = document.getElementById('mobileNavIcon');
  const sidebar = document.getElementById('appSidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  const closeBtn = document.getElementById('sidebarCloseBtn');

  function openSidebar() {
    if (navLinks) navLinks.classList.add('is-open');
    if (sidebar) {
      sidebar.classList.add('is-open');
      sidebar.setAttribute('aria-hidden', 'false');
    }
    if (backdrop) {
      backdrop.classList.add('is-open');
      backdrop.setAttribute('aria-hidden', 'false');
    }
    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'true');
    if (navIcon) navIcon.textContent = '✕';
    if (typeof document !== 'undefined' && document.body) {
      document.body.style.overflow = 'hidden';
    }
  }

  function closeSidebar() {
    if (navLinks) navLinks.classList.remove('is-open');
    if (sidebar) {
      sidebar.classList.remove('is-open');
      sidebar.setAttribute('aria-hidden', 'true');
    }
    if (backdrop) {
      backdrop.classList.remove('is-open');
      backdrop.setAttribute('aria-hidden', 'true');
    }
    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
    if (navIcon) navIcon.textContent = '☰';
    if (typeof document !== 'undefined' && document.body) {
      document.body.style.overflow = '';
    }
  }

  function toggleSidebar() {
    const isOpen = (sidebar && sidebar.classList.contains('is-open')) || (navLinks && navLinks.classList.contains('is-open'));
    if (isOpen) {
      closeSidebar();
    } else {
      openSidebar();
    }
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleSidebar);
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', closeSidebar);
  }

  if (backdrop) {
    backdrop.addEventListener('click', closeSidebar);
  }

  if (navLinks) {
    navLinks.addEventListener('click', (e) => {
      if (e.target.matches('a, a *')) {
        closeSidebar();
      }
    });
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeSidebar();
      }
    });

    document.addEventListener('click', (e) => {
      const isNavOpen = (sidebar && sidebar.classList.contains('is-open')) || (navLinks && navLinks.classList.contains('is-open'));
      if (
        isNavOpen &&
        (!sidebar || !sidebar.contains(e.target)) &&
        (!navLinks || !navLinks.contains(e.target)) &&
        (!toggleBtn || !toggleBtn.contains(e.target)) &&
        (!backdrop || !backdrop.contains(e.target))
      ) {
        closeSidebar();
      }
    });
  }
}

/**
 * Control dinámico del Navbar y Sidebar Drawer según el rol del usuario (RBAC)
 */
export function syncNavbarRole(role) {
  const salesStudioTag = document.getElementById('salesStudioTag');
  const navLinksContainer = document.getElementById('navRoleLinks');
  const userChipName = document.getElementById('userChipName');
  const userChipAvatar = document.getElementById('userChipAvatar');
  const sidebarUserName = document.getElementById('sidebarUserName');
  const sidebarUserAvatar = document.getElementById('sidebarUserAvatar');
  const sidebarUserRole = document.getElementById('sidebarUserRole');

  const isStaff = role === 'ADMIN' || role === 'EMPLOYEE';

  if (salesStudioTag) {
    salesStudioTag.style.display = isStaff ? 'inline-block' : 'none';
  }

  // Actualizar tarjeta de usuario y chip
  const currentUser = store.state.user;
  const currentName = currentUser?.name;

  if (role === 'ADMIN') {
    if (userChipName) userChipName.textContent = currentName ? `${currentName} (Admin)` : 'Miguel Dubois (Admin)';
    if (userChipAvatar) userChipAvatar.textContent = '👑';
    if (sidebarUserName) sidebarUserName.textContent = currentName || 'Miguel Dubois';
    if (sidebarUserAvatar) sidebarUserAvatar.textContent = currentName ? currentName[0].toUpperCase() : 'M';
    if (sidebarUserRole) sidebarUserRole.textContent = 'ADMINISTRADOR';
  } else if (role === 'EMPLOYEE') {
    if (userChipName) userChipName.textContent = currentName || 'Operador Taller';
    if (userChipAvatar) userChipAvatar.textContent = '🛠️';
    if (sidebarUserName) sidebarUserName.textContent = currentName || 'Operador Audley';
    if (sidebarUserAvatar) sidebarUserAvatar.textContent = currentName ? currentName[0].toUpperCase() : 'O';
    if (sidebarUserRole) sidebarUserRole.textContent = 'OPERADOR TALLER';
  } else if (role === 'CUSTOMER') {
    if (userChipName) userChipName.textContent = currentName || 'Cliente B2B';
    if (userChipAvatar) userChipAvatar.textContent = '🏢';
    if (sidebarUserName) sidebarUserName.textContent = currentName || 'Cliente B2B';
    if (sidebarUserAvatar) sidebarUserAvatar.textContent = currentName ? currentName[0].toUpperCase() : 'C';
    if (sidebarUserRole) sidebarUserRole.textContent = 'CLIENTE REGISTRADO';
  } else {
    // Visitante no registrado
    if (userChipName) userChipName.textContent = 'Visitante';
    if (userChipAvatar) userChipAvatar.textContent = '👤';
    if (sidebarUserName) sidebarUserName.textContent = 'Visitante';
    if (sidebarUserAvatar) sidebarUserAvatar.textContent = 'V';
    if (sidebarUserRole) sidebarUserRole.textContent = 'COTIZADOR WEB';
  }

  if (navLinksContainer) {
    if (isStaff) {
      navLinksContainer.innerHTML = `
        <div class="sidebar-section-title">🏭 Producción & Taller</div>
        <a href="/produccion" class="nav-link" data-link>
          <span class="nav-link-icon">🖨️</span>
          <span>Cola Audley</span>
        </a>
        <a href="/pedidos" class="nav-link" data-link>
          <span class="nav-link-icon">📋</span>
          <span>Pedidos</span>
        </a>
        <a href="/despacho" class="nav-link" data-link>
          <span class="nav-link-icon">🚚</span>
          <span>Despacho</span>
        </a>
        <a href="/inventario" class="nav-link" data-link>
          <span class="nav-link-icon">📦</span>
          <span>Inventario</span>
        </a>

        <div class="sidebar-section-title">💼 Gestión Comercial</div>
        <a href="/" class="nav-link" data-link>
          <span class="nav-link-icon">🧮</span>
          <span>Cotizador</span>
        </a>
        <a href="/cotizaciones" class="nav-link" data-link>
          <span class="nav-link-icon">📑</span>
          <span>Cotizaciones</span>
        </a>
        <a href="/software" class="nav-link" data-link>
          <span class="nav-link-icon">⚡</span>
          <span>Kroma Spot Studio</span>
        </a>
        <a href="/clientes" class="nav-link" data-link>
          <span class="nav-link-icon">👥</span>
          <span>Clientes</span>
        </a>
        <a href="/cobranza" class="nav-link" data-link>
          <span class="nav-link-icon">💰</span>
          <span>Cobranza</span>
        </a>

        <div class="sidebar-section-title">📊 Inteligencia & Finanzas</div>
        <a href="/reportes" class="nav-link" data-link>
          <span class="nav-link-icon">📈</span>
          <span>Reportes</span>
        </a>
        <a href="/rentabilidad" class="nav-link" data-link>
          <span class="nav-link-icon">💵</span>
          <span>Rentabilidad</span>
        </a>

        <div class="sidebar-section-title">⚡ Software & I+D</div>
        <a href="/software" class="nav-link" data-link>
          <span class="nav-link-icon">⚡</span>
          <span>Kroma Spot Studio</span>
        </a>

        ${role === 'ADMIN' ? `
        <div class="sidebar-section-title">⚙️ Sistema & Permisos</div>
        <a href="/usuarios" class="nav-link" data-link>
          <span class="nav-link-icon">👤</span>
          <span>Usuarios</span>
        </a>
        ` : ''}
      `;
    } else if (role === 'CUSTOMER') {
      navLinksContainer.innerHTML = `
        <div class="sidebar-section-title">🛍️ Autoservicio</div>
        <a href="/" class="nav-link" data-link>
          <span class="nav-link-icon">🧮</span>
          <span>Cotizador</span>
        </a>
        <a href="/cotizaciones" class="nav-link" data-link>
          <span class="nav-link-icon">📑</span>
          <span>Mis Cotizaciones</span>
        </a>
        <a href="/pedidos" class="nav-link" data-link>
          <span class="nav-link-icon">📦</span>
          <span>Mis Pedidos</span>
        </a>

        <div class="sidebar-section-title">⚡ Software de Preprensa</div>
        <a href="/software" class="nav-link" data-link>
          <span class="nav-link-icon">⚡</span>
          <span>Kroma Spot Studio</span>
        </a>
      `;
    } else {
      // Visitante no registrado
      navLinksContainer.innerHTML = `
        <div class="sidebar-section-title">🎨 Kroma Lab</div>
        <a href="/" class="nav-link" data-link>
          <span class="nav-link-icon">🧮</span>
          <span>Cotizador</span>
        </a>
        <a href="/cotizaciones" class="nav-link" data-link>
          <span class="nav-link-icon">📑</span>
          <span>Cotizaciones</span>
        </a>
        <a href="/software" class="nav-link" data-link>
          <span class="nav-link-icon">⚡</span>
          <span>Kroma Spot Studio</span>
        </a>
        <a href="#contacto" class="nav-link">
          <span class="nav-link-icon">💬</span>
          <span>WhatsApp</span>
        </a>
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
    } else {
      syncNavbarRole(role);
    }
  });
  lastSyncedRole = store.state.user?.role || 'VISITOR';
  syncNavbarRole(lastSyncedRole);
}

export function initQuoter() {
  const widthInput = document.getElementById('stickerWidth');
  const heightInput = document.getElementById('stickerHeight');
  const qtyInput = document.getElementById('stickerQty');
  const cuttingCheckbox = document.getElementById('optCutting');
  const keepAspectCheckbox = document.getElementById('optKeepAspectRatio');
  const btnRotate = document.getElementById('btnRotateImage');
  const aspectRatioRow = document.getElementById('aspectRatioRow');

  if (!widthInput || !heightInput || !qtyInput) return;

  function handleCalculate() {
    const w = parseFloat(widthInput.value) || 5;
    const h = parseFloat(heightInput.value) || 5;
    const q = parseInt(qtyInput.value, 10) || 50;
    const cut = cuttingCheckbox ? cuttingCheckbox.checked : false;

    const quote = calculateQuote({ widthCm: w, heightCm: h, qty: q, includeCutting: cut });
    store.setActiveQuote(quote);
    renderQuoteResults(quote);
    redrawRollCanvas();
  }

  widthInput.addEventListener('input', () => {
    if (keepAspectCheckbox && keepAspectCheckbox.checked && currentPreviewImg && currentImageAspectRatio) {
      const w = parseFloat(widthInput.value);
      if (!isNaN(w) && w > 0) {
        heightInput.value = (w * currentImageAspectRatio).toFixed(1);
      }
    }
    handleCalculate();
  });

  heightInput.addEventListener('input', () => {
    if (keepAspectCheckbox && keepAspectCheckbox.checked && currentPreviewImg && currentImageAspectRatio && currentImageAspectRatio > 0) {
      const h = parseFloat(heightInput.value);
      if (!isNaN(h) && h > 0) {
        const newW = Math.min(BUSINESS_CONFIG.printableWidthCm, h / currentImageAspectRatio);
        widthInput.value = newW.toFixed(1);
      }
    }
    handleCalculate();
  });

  qtyInput.addEventListener('input', handleCalculate);
  if (cuttingCheckbox) {
    cuttingCheckbox.addEventListener('change', handleCalculate);
  }

  if (keepAspectCheckbox) {
    keepAspectCheckbox.addEventListener('change', () => {
      if (keepAspectCheckbox.checked && currentPreviewImg && currentImageAspectRatio) {
        const w = parseFloat(widthInput.value) || 5;
        heightInput.value = (w * currentImageAspectRatio).toFixed(1);
        handleCalculate();
      }
    });
  }

  if (btnRotate) {
    btnRotate.addEventListener('click', () => {
      currentRotation = (currentRotation + 90) % 360;

      if (currentImageAspectRatio && currentImageAspectRatio > 0) {
        currentImageAspectRatio = 1 / currentImageAspectRatio;
      }

      const oldW = parseFloat(widthInput.value) || 5;
      const oldH = parseFloat(heightInput.value) || 5;
      const newW = Math.min(BUSINESS_CONFIG.printableWidthCm, oldH);
      const newH = oldW;

      widthInput.value = newW.toFixed(1);
      heightInput.value = newH.toFixed(1);

      handleCalculate();
    });
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

  // Zona de Carga de Archivos de Impresión (Dropzone)
  let currentAttachedFile = null;
  let currentRawFile = null;
  let currentPreviewUrl = null;

  // Botón de WhatsApp
  const btnWhatsApp = document.getElementById('btnQuoteWhatsApp');
  if (btnWhatsApp) {
    btnWhatsApp.addEventListener('click', async () => {
      let fileUrl = currentAttachedFile ? currentAttachedFile.fileUrl : null;
      if (currentRawFile && currentAttachedFile && !fileUrl) {
        try {
          const uploadRes = await uploadFileToStorage(currentRawFile, { context: 'quotes' });
          currentAttachedFile.fileKey = uploadRes.fileKey;
          currentAttachedFile.fileUrl = uploadRes.fileUrl;
          currentAttachedFile.provider = uploadRes.provider;
          fileUrl = uploadRes.fileUrl;
        } catch (uploadErr) {
          console.warn('[Storage] Error al subir archivo para cotización WhatsApp:', uploadErr);
        }
      }

      const rollCanvas = document.getElementById('rollCanvas');
      const calculated = store.state.activeQuote;
      let canvasSnapshotUrl = null;
      if (rollCanvas && calculated) {
        try {
          const snapshotBase64 = generateCanvasSnapshot(rollCanvas, calculated);
          if (snapshotBase64) {
            canvasSnapshotUrl = await uploadCanvasSnapshotToStorage(
              snapshotBase64,
              `esquema_${calculated.widthCm}x${calculated.heightCm}cm.png`,
              { context: 'quotes' }
            );
          }
        } catch (snapErr) {
          console.warn('[Storage] Error al subir snapshot canvas para cotización WhatsApp:', snapErr);
        }
      }

      const quoteToSend = {
        ...store.state.activeQuote,
        fileUrl,
        canvasSnapshotUrl,
        fileName: currentAttachedFile ? currentAttachedFile.name : null,
      };
      sendWhatsAppQuote(quoteToSend);
    });
  }

  const dropzone = document.getElementById('quoterDropzone');
  const fileInput = document.getElementById('quoterFileInput');
  const emptyState = document.getElementById('dropzoneEmptyState');
  const selectedState = document.getElementById('dropzoneFileSelected');
  const fileNameEl = document.getElementById('dropzoneFileName');
  const fileSizeEl = document.getElementById('dropzoneFileSize');
  const thumbWrap = document.getElementById('dropzoneThumbWrap');
  const btnRemoveFile = document.getElementById('btnRemoveFile');
  const errorMsgEl = document.getElementById('dropzoneError');
  const progressWrap = document.getElementById('dropzoneProgressWrap');
  const progressBar = document.getElementById('dropzoneProgressBar');
  const progressPercent = document.getElementById('dropzoneProgressPercent');
  const progressLabel = document.getElementById('dropzoneProgressLabel');
  const uploadBadge = document.getElementById('dropzoneUploadBadge');

  function clearDropzoneFile() {
    currentAttachedFile = null;
    currentRawFile = null;
    currentPreviewUrl = null;
    currentPreviewImg = null;
    currentRotation = 0;
    currentImageAspectRatio = null;

    if (aspectRatioRow) aspectRatioRow.style.display = 'none';

    redrawRollCanvas();

    if (fileInput) fileInput.value = '';
    if (emptyState) emptyState.style.display = 'flex';
    if (selectedState) selectedState.style.display = 'none';
    if (errorMsgEl) errorMsgEl.style.display = 'none';
    if (progressWrap) progressWrap.style.display = 'none';
    if (uploadBadge) uploadBadge.style.display = 'none';
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
    currentRawFile = file;
    currentAttachedFile = {
      ...validation.fileData,
      fileKey: null,
      fileUrl: null,
      provider: 'pending',
    };

    try {
      currentPreviewUrl = await readFileAsDataURL(file);
    } catch (_) {
      currentPreviewUrl = null;
    }

    if (!currentAttachedFile || currentAttachedFile.name !== validation.fileData.name) {
      return;
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

    // Estrategia 1 (Lazy Upload): No subir al bucket de Cloudflare R2 todavía.
    // Se mantiene en memoria del navegador para previsualización con cero latencia
    if (uploadBadge) {
      uploadBadge.style.display = 'inline-block';
      uploadBadge.textContent = '📁 Listo para cotizar';
      uploadBadge.style.background = 'rgba(2, 132, 199, 0.15)';
      uploadBadge.style.color = 'var(--cerulean)';
    }

    if (progressWrap) {
      progressWrap.style.display = 'none';
    }

    // Cargar imagen en memoria para renderizado en la bobina
    if (currentPreviewUrl && typeof Image !== 'undefined') {
      const img = new Image();
      img.onload = () => {
        currentPreviewImg = img;
        currentRotation = 0;
        const nw = img.naturalWidth || img.width || 1;
        const nh = img.naturalHeight || img.height || 1;
        currentImageAspectRatio = nh / nw;

        if (aspectRatioRow) {
          aspectRatioRow.style.display = 'flex';
        }

        if (keepAspectCheckbox && keepAspectCheckbox.checked) {
          const currentW = parseFloat(widthInput.value) || 5;
          const newH = Math.round((currentW * currentImageAspectRatio) * 10) / 10;
          heightInput.value = (newH).toFixed(1);
          handleCalculate();
        } else {
          redrawRollCanvas();
        }
      };
      img.onerror = () => {
        currentPreviewImg = null;
        currentRotation = 0;
        currentImageAspectRatio = null;
        if (aspectRatioRow) aspectRatioRow.style.display = 'none';
        redrawRollCanvas();
      };
      img.src = currentPreviewUrl;
    } else {
      currentPreviewImg = null;
      currentRotation = 0;
      currentImageAspectRatio = null;
      if (aspectRatioRow) aspectRatioRow.style.display = 'none';
      redrawRollCanvas();
    }
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
    btnAddToCart.addEventListener('click', async () => {
      const w = parseFloat(widthInput.value) || 5;
      const h = parseFloat(heightInput.value) || 5;
      const q = parseInt(qtyInput.value, 10) || 50;
      const cut = cuttingCheckbox ? cuttingCheckbox.checked : false;

      // Estrategia 1 (Lazy Upload): Si hay un archivo seleccionado y aún no se ha subido a R2, subir ahora
      if (currentRawFile && currentAttachedFile && !currentAttachedFile.fileUrl) {
        if (progressWrap && progressBar && progressPercent) {
          progressWrap.style.display = 'block';
          progressBar.style.width = '0%';
          progressPercent.textContent = '0%';
          if (progressLabel) progressLabel.textContent = 'Subiendo a Cloudflare R2...';
        }

        try {
          const uploadRes = await uploadFileToStorage(currentRawFile, {
            context: 'quotes',
            onProgress: ({ percent }) => {
              if (progressBar) progressBar.style.width = `${percent}%`;
              if (progressPercent) progressPercent.textContent = `${percent}%`;
            },
          });

          currentAttachedFile.fileKey = uploadRes.fileKey;
          currentAttachedFile.fileUrl = uploadRes.fileUrl;
          currentAttachedFile.provider = uploadRes.provider;

          if (uploadBadge) {
            uploadBadge.style.display = 'inline-block';
            uploadBadge.textContent = uploadRes.provider === 'cloudflare-r2' ? '☁️ R2 Activo' : '💾 Local';
            uploadBadge.style.background = 'rgba(16, 185, 129, 0.15)';
            uploadBadge.style.color = '#10b981';
          }
        } catch (uploadErr) {
          console.warn('[Storage] Error al subir archivo en carrito a R2:', uploadErr);
          currentAttachedFile.provider = 'local';
        } finally {
          if (progressWrap) progressWrap.style.display = 'none';
        }
      }

      const calculated = calculateQuote({ widthCm: w, heightCm: h, qty: q, includeCutting: cut });
      const rollCanvas = document.getElementById('rollCanvas');
      const canvasSnapshot = generateCanvasSnapshot(rollCanvas, calculated);
      let canvasSnapshotUrl = null;
      if (canvasSnapshot) {
        try {
          canvasSnapshotUrl = await uploadCanvasSnapshotToStorage(
            canvasSnapshot,
            `bobina_${w}x${h}cm.png`,
            { context: 'orders' }
          );
        } catch (snapErr) {
          console.warn('[Storage] Error al subir snapshot canvas al carrito:', snapErr);
        }
      }

      cartStore.addItem({
        title: `Stickers ${w} × ${h} cm`,
        widthCm: w,
        heightCm: h,
        qty: q,
        includeCutting: cut,
        actualLinearMeters: calculated.actualLinearMeters,
        stickersPerRow: calculated.stickersPerRow,
        rows: calculated.rows,
        fileInfo: currentAttachedFile ? { ...currentAttachedFile } : null,
        fileUrl: currentAttachedFile ? currentAttachedFile.fileUrl : null,
        fileName: currentAttachedFile ? currentAttachedFile.name : null,
        previewUrl: currentPreviewUrl,
        canvasSnapshot: canvasSnapshot || null,
        canvasSnapshotUrl: canvasSnapshotUrl || null,
        rotationDeg: currentRotation || 0,
      });

      clearDropzoneFile();
      openCartDrawer();
    });
  }

  // Botón Guardar Cotización
  const btnSaveQuote = document.getElementById('btnSaveQuote');
  if (btnSaveQuote) {
    btnSaveQuote.addEventListener('click', () => {
      const w = parseFloat(widthInput.value) || 5;
      const h = parseFloat(heightInput.value) || 5;
      const q = parseInt(qtyInput.value, 10) || 50;
      const cut = cuttingCheckbox ? cuttingCheckbox.checked : false;

      const calculated = calculateQuote({ widthCm: w, heightCm: h, qty: q, includeCutting: cut });
      const rollCanvas = document.getElementById('rollCanvas');
      const canvasSnapshot = generateCanvasSnapshot(rollCanvas, calculated);

      openSaveQuoteModal({
        widthCm: w,
        heightCm: h,
        qty: q,
        linearMeters: calculated.billableMeters,
        stickersPerRow: calculated.stickersPerRow,
        rows: calculated.rows,
        withCutting: cut,
        unitRateQ: calculated.tierRate,
        materialPriceQ: calculated.materialPriceQ,
        cuttingPriceQ: calculated.cuttingTotalQ,
        totalPriceQ: calculated.totalPriceQ,
        rawFile: currentRawFile || null,
        fileName: currentAttachedFile ? currentAttachedFile.name : null,
        fileUrl: currentAttachedFile ? currentAttachedFile.fileUrl : null,
        fileKey: currentAttachedFile ? currentAttachedFile.fileKey : null,
        fileSizeBytes: currentAttachedFile ? currentAttachedFile.size : null,
        provider: currentAttachedFile ? currentAttachedFile.provider : null,
        canvasSnapshot,
        rotationDeg: currentRotation,
      });
    });
  }

  // Redimensionado responsivo del canvas
  window.addEventListener('resize', () => {
    redrawRollCanvas();
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

  const clientArtUrl = quote.fileUrl || quote.fileInfo?.fileUrl || null;
  const clientArtText = clientArtUrl ? `• 🖼️ *Arte del cliente:* ${clientArtUrl}\n` : '';

  const snapUrl = quote.canvasSnapshotUrl || (quote.canvasSnapshot && !quote.canvasSnapshot.startsWith('data:') ? quote.canvasSnapshot : null);
  const snapText = snapUrl ? `• 📐 *Montaje en bobina:* ${snapUrl}\n` : '';

  const text = `*KROMA LAB — Cotización UV DTF*\n\n` +
    `Hola, deseo consultar la siguiente cotización:\n` +
    `• *Medida de sticker:* ${quote.widthCm} × ${quote.heightCm} cm\n` +
    `• *Cantidad:* ${quote.qty} stickers\n` +
    `• *Acomodo:* ${quote.stickersPerRow} stickers por fila (28 cm útiles)\n` +
    `• *Metros requeridos:* ${quote.billableMeters.toFixed(2)} m\n` +
    `• *Tarifa material:* Q${quote.tierRate.toFixed(2)} / m\n` +
    cuttingText +
    clientArtText +
    snapText +
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

export { openUserProfileModal, closeUserProfileModal, initUserProfileModal, openSaveQuoteModal, closeSaveQuoteModal, initSaveQuoteModal, printDocument, initPrintListeners };
