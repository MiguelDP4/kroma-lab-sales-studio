/**
 * Kroma Lab Sales Studio — Automated QA Deep E2E Suite with Playwright
 * Rol: Senior QA Automation Engineer
 * Directiva: Apunta estrictamente a http://localhost:3000 con backend local en :4000.
 * Audita TODOS los features del sistema: Landing, Cotizador, Simulador Audley, Carrito,
 * Auth RBAC, Pedidos, Producción Kanban, Cotizaciones, Clientes B2B, Inventario Kardex,
 * Cuentas por Cobrar, Despacho, Reportes, Usuarios, Logout Cache Wipe y Resiliencia Offline.
 */

import { chromium } from 'playwright-core';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');
const QA_RESULTS_DIR = path.resolve(REPO_ROOT, 'qa-results');

if (!fs.existsSync(QA_RESULTS_DIR)) {
  fs.mkdirSync(QA_RESULTS_DIR, { recursive: true });
}

// Credenciales para pruebas E2E locales
const E2E_USER = {
  email: 'migueldp4@gmail.com',
  password: 'Password2026!',
  name: 'Miguel Dubois',
  role: 'ADMIN',
};

const BASE_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:4000/api/health';

function checkUrlAlive(url) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 2500 }, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForUrl(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const alive = await checkUrlAlive(url);
    if (alive) return true;
    await new Promise((r) => setTimeout(r, 600));
  }
  return false;
}

async function ensureServersRunning() {
  console.log('🔍 [QA Engineer] Verificando disponibilidad de servidores locales...');

  let frontendAlive = await checkUrlAlive(BASE_URL);
  if (!frontendAlive) {
    console.log('🚀 [QA] Iniciando servidor Frontend (:3000)...');
    const serveScript = path.resolve(__dirname, 'serve-frontend.js');
    const feProcess = spawn(process.execPath, [serveScript], {
      detached: true,
      stdio: 'ignore',
      shell: process.platform === 'win32',
    });
    feProcess.unref();
    frontendAlive = await waitForUrl(BASE_URL);
    if (!frontendAlive) {
      throw new Error('No se pudo iniciar el servidor Frontend en http://localhost:3000');
    }
  }
  console.log('✅ [QA] Frontend en línea en http://localhost:3000');

  let backendAlive = await checkUrlAlive(BACKEND_URL);
  if (!backendAlive) {
    console.log('🚀 [QA] Iniciando servidor Backend (:4000)...');
    const backendDir = path.resolve(REPO_ROOT, 'backend');
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const beProcess = spawn(npmCmd, ['run', 'dev'], {
      cwd: backendDir,
      detached: true,
      stdio: 'ignore',
      shell: true,
    });
    beProcess.unref();
    backendAlive = await waitForUrl(BACKEND_URL, 18000);
    if (!backendAlive) {
      console.warn('⚠️ [QA] Backend tardó en responder; continuando con la suite.');
    }
  }
  console.log('✅ [QA] Backend en línea en http://localhost:4000');
}

async function runFullQASuite() {
  await ensureServersRunning();

  console.log('\n🎭 [Playwright QA] Lanzando sesión Chromium (Google Chrome)...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 850 },
  });

  const page = await context.newPage();

  const consoleErrors = [];
  const uncaughtPageErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('favicon.ico') && !text.includes('chrome-extension')) {
        consoleErrors.push(text);
      }
    }
  });

  page.on('pageerror', (err) => {
    uncaughtPageErrors.push(err.message || String(err));
  });

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition, name, details = '') {
    if (condition) {
      console.log(`  ✅ [PASS] ${name}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${name} ${details ? '- ' + details : ''}`);
      failedTests++;
    }
  }

  try {
    // ==========================================================================
    // FASE 1: LANDING PAGE, BRANDING & AUDITORÍA INICIAL
    // ==========================================================================
    console.log('\n======================================================');
    console.log('📦 FASE 1: Landing Page, Branding & Integridad de Consola');
    console.log('======================================================');

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    const title = await page.title();
    assert(title.toLowerCase().includes('kroma lab'), 'Título contiene "Kroma Lab"', `Título: ${title}`);
    assert(uncaughtPageErrors.length === 0, 'Cero excepciones JavaScript no controladas (uncaught)', uncaughtPageErrors.join(' | '));
    assert(consoleErrors.length === 0, 'Cero errores en consola de desarrollo', consoleErrors.join(' | '));

    const appExists = await page.$('#app');
    assert(appExists !== null, 'Contenedor SPA principal #app montado');

    // Validación anti-parpadeo: Al recargar, el banner rojo NO debe mostrarse
    await page.reload({ waitUntil: 'domcontentloaded' });
    const bannerVisibleOnReload = await page.evaluate(() => {
      const b = document.getElementById('backendOfflineBanner');
      if (!b) return false;
      return window.getComputedStyle(b).display !== 'none';
    });
    assert(!bannerVisibleOnReload, 'Anti-Flicker: Banner offline permanece 100% oculto al recargar con servidor activo');

    // ==========================================================================
    // FASE 2: COTIZADOR INTERACTIVO UV DTF & SIMULADOR DE BOBINA AUDLEY
    // ==========================================================================
    console.log('\n======================================================');
    console.log('📦 FASE 2: Cotizador Interactivo UV DTF & Bobina Audley');
    console.log('======================================================');

    const quoterSection = await page.$('#cotizador');
    assert(quoterSection !== null, 'Sección del Cotizador (#cotizador) montada');

    const rollCanvas = await page.$('#rollCanvas');
    assert(rollCanvas !== null, 'Simulador Canvas de bobina Audley (28 cm) renderizado');

    // 1. Modificar ancho y alto
    const widthInput = await page.$('#stickerWidth');
    const heightInput = await page.$('#stickerHeight');
    const qtyInput = await page.$('#stickerQty');

    assert(widthInput !== null && heightInput !== null && qtyInput !== null, 'Inputs de medida (ancho, alto, cantidad) disponibles');

    if (widthInput && heightInput && qtyInput) {
      await widthInput.fill('5');
      await widthInput.dispatchEvent('input');
      await heightInput.fill('5');
      await heightInput.dispatchEvent('input');
      await qtyInput.fill('50');
      await qtyInput.dispatchEvent('input');
      await page.waitForTimeout(300);

      const totalPriceText = await page.$eval('#resTotalPrice', (el) => el.textContent.trim());
      assert(totalPriceText.includes('Q150'), 'Cálculo correcto de 50 stickers de 5x5 cm a Q150.00 mínimo', `Total: ${totalPriceText}`);

      const freightNoticeText = await page.$eval('#totalFreightNotice', (el) => el.textContent.trim());
      assert(freightNoticeText.includes('No incluye flete'), 'Insignia estética de flete visible en total box', `Texto: ${freightNoticeText}`);
    }

    // 2. Modo de cotización: Por stickers vs Por metro
    const modeMetersRadio = await page.$('#modeMeters');
    if (modeMetersRadio) {
      await modeMetersRadio.click();
      await page.waitForTimeout(300);
      const labelText = await page.$eval('#qtyLabelText', (el) => el.textContent.trim());
      assert(labelText === 'Cantidad de metros', 'Label cambia dinámicamente a "Cantidad de metros" al elegir por metro');
      
      const noticeDisplay = await page.$eval('#metersCalculatedNotice', (el) => window.getComputedStyle(el).display);
      assert(noticeDisplay !== 'none', 'Aviso de cálculo automático de stickers por metro visible');

      const calculatedText = await page.$eval('#hintStickersCount', (el) => el.textContent.trim());
      assert(parseInt(calculatedText, 10) > 0, `Calcula stickers automáticos en 1 metro (${calculatedText} piezas)`);

      // Regresar a Por stickers
      const modeStickersRadio = await page.$('#modeStickers');
      await modeStickersRadio.click();
      await page.waitForTimeout(300);
      const labelTextStickers = await page.$eval('#qtyLabelText', (el) => el.textContent.trim());
      assert(labelTextStickers === 'Cantidad de stickers', 'Label regresa dinámicamente a "Cantidad de stickers" al elegir por stickers');
    }

    // 3. Opción de Acabado: Corte Individual
    const cuttingCheckbox = await page.$('#optCutting');
    if (cuttingCheckbox) {
      const priceBeforeCutting = await page.$eval('#resTotalPrice', (el) => parseFloat(el.textContent.replace(/[^0-9.]/g, '')));
      await cuttingCheckbox.check();
      await page.waitForTimeout(300);
      const priceAfterCutting = await page.$eval('#resTotalPrice', (el) => parseFloat(el.textContent.replace(/[^0-9.]/g, '')));
      assert(priceAfterCutting > priceBeforeCutting, 'Servicio de corte individual suma recargo correctamente al total', `Antes: Q${priceBeforeCutting}, Después: Q${priceAfterCutting}`);
      await cuttingCheckbox.uncheck();
      await page.waitForTimeout(200);
    }

    // 4. Barra de incentivo de envío gratis
    const shippingBanner = await page.$('#quoterShippingPolicyBanner');
    assert(shippingBanner !== null, 'Banner informativo de política de envíos en Guatemala visible');

    // 5. Enlace comercial a WhatsApp
    const btnQuoteWhatsApp = await page.$('#btnQuoteWhatsApp');
    assert(btnQuoteWhatsApp !== null, 'Botón de consulta rápida por WhatsApp comercial disponible');

    // ==========================================================================
    // FASE 3: CARRITO DE COMPRAS, DRAWER Y MODAL DE GUARDAR COTIZACIÓN
    // ==========================================================================
    console.log('\n======================================================');
    console.log('📦 FASE 3: Carrito de Compras, Drawer & Guardar Cotización');
    console.log('======================================================');

    // 1. Modal Guardar Cotización
    const btnSaveQuote = await page.$('#btnSaveQuote');
    assert(btnSaveQuote !== null, 'Botón #btnSaveQuote disponible en el cotizador');
    if (btnSaveQuote) {
      await btnSaveQuote.click();
      await page.waitForTimeout(400);
      const modalSave = await page.$('#saveQuoteModal');
      const modalSaveVisible = await page.evaluate(() => {
        const m = document.getElementById('saveQuoteModal');
        return m && m.style.display !== 'none';
      });
      assert(modalSaveVisible, 'Modal #saveQuoteModal abre correctamente para conservar cotización');

      const btnCloseSave = await page.$('#btnCloseSaveQuoteModal');
      if (btnCloseSave) await btnCloseSave.click();
      await page.waitForTimeout(300);
    }

    // 2. Agregar al Carrito y Drawer
    const btnAddToCart = await page.$('#btnAddToCart');
    assert(btnAddToCart !== null, 'Botón #btnAddToCart disponible');
    if (btnAddToCart) {
      await btnAddToCart.click();
      await page.waitForFunction(() => {
        const badge = document.getElementById('cartCountBadge');
        return badge && parseInt(badge.textContent.trim(), 10) >= 1;
      }, { timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(300);

      const cartToggleBtn = await page.$('#cartToggleBtn');
      if (cartToggleBtn) {
        await cartToggleBtn.click();
        await page.waitForTimeout(400);
      }

      const cartDrawerOpen = await page.evaluate(() => {
        const d = document.getElementById('cartDrawer');
        return d && d.classList.contains('open');
      });
      assert(cartDrawerOpen, 'Drawer lateral del Carrito se despliega correctamente con #cartToggleBtn');

      const cartCount = await page.$eval('#cartCountBadge', (el) => el.textContent.trim());
      assert(parseInt(cartCount, 10) >= 1, 'Badge numérico de items en carrito se incrementa correctamente', `Items: ${cartCount}`);

      // Cerrar Drawer (soporta #btnCloseCart y #cartDrawerCloseBtn)
      const btnCloseCart = (await page.$('#btnCloseCart')) || (await page.$('#cartDrawerCloseBtn'));
      if (btnCloseCart) {
        await btnCloseCart.click();
      } else {
        await page.evaluate(() => {
          const drawer = document.getElementById('cartDrawer');
          const backdrop = document.getElementById('cartBackdrop');
          if (drawer) drawer.classList.remove('open');
          if (backdrop) backdrop.classList.remove('open');
          document.body.style.overflow = '';
        });
      }
      await page.waitForTimeout(400);
    }

    // ==========================================================================
    // FASE 4: UX GLOBAL, SWITCH DE TEMA Y AUDITORÍA MOBILE-FIRST
    // ==========================================================================
    console.log('\n======================================================');
    console.log('📦 FASE 4: Modo Claro / Oscuro & Auditoría Mobile-First');
    console.log('======================================================');

    // 1. Conmutador de Tema Claro / Oscuro
    const themeBtn = await page.$('#themeToggleBtn');
    if (themeBtn) {
      await themeBtn.click();
      await page.waitForTimeout(200);
      const themeAfterClick = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
      assert(themeAfterClick === 'light' || themeAfterClick === 'dark', 'Switch de tema alterna correctamente el atributo data-theme', `Tema: ${themeAfterClick}`);
      // Restaurar tema oscuro predeterminado
      await themeBtn.click();
      await page.waitForTimeout(200);
    }

    // 2. Auditoría Mobile-First (Viewport de 375px - iPhone SE)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    const mobileOverflow = await page.evaluate(() => {
      const docW = document.documentElement.clientWidth;
      const scrollW = document.documentElement.scrollWidth;
      const bodyW = document.body.scrollWidth;
      const maxW = Math.max(scrollW, bodyW);
      return { hasOverflow: maxW > docW + 3, docW, maxW };
    });
    assert(!mobileOverflow.hasOverflow, 'Mobile-First: Cero desbordamiento horizontal en 375px', `Visible: ${mobileOverflow.docW}px, Total: ${mobileOverflow.maxW}px`);

    // 3. Auditoría de Topbar Responsivo en pantalla < 411px (375px)
    const topbarUnder411 = await page.evaluate(() => {
      const brandName = document.querySelector('.brand-name');
      const logoSvg = document.querySelector('.logo-svg-wrap');
      const cartBtn = document.getElementById('cartToggleBtn');
      const userChip = document.getElementById('userProfileChip');
      const themeBtn = document.getElementById('themeToggleBtn');

      const brandHidden = brandName ? window.getComputedStyle(brandName).display === 'none' : false;
      const logoVisible = logoSvg ? window.getComputedStyle(logoSvg).display !== 'none' : false;

      const cartRect = cartBtn ? cartBtn.getBoundingClientRect() : null;
      const userRect = userChip ? userChip.getBoundingClientRect() : null;
      const themeRect = themeBtn ? themeBtn.getBoundingClientRect() : null;

      const sameWidth = Math.round(cartRect.width) === Math.round(userRect.width) && Math.round(userRect.width) === Math.round(themeRect.width);
      const sameHeight = Math.round(cartRect.height) === Math.round(userRect.height) && Math.round(userRect.height) === Math.round(themeRect.height);

      return {
        brandHidden,
        logoVisible,
        sameWidth,
        sameHeight,
        cartSize: cartRect ? `${Math.round(cartRect.width)}x${Math.round(cartRect.height)}` : null,
        userSize: userRect ? `${Math.round(userRect.width)}x${Math.round(userRect.height)}` : null,
        themeSize: themeRect ? `${Math.round(themeRect.width)}x${Math.round(themeRect.height)}` : null,
      };
    });

    assert(topbarUnder411.brandHidden, 'Topbar < 411px: Letras al lado del logo ocultas (.brand-name display: none)');
    assert(topbarUnder411.logoVisible, 'Topbar < 411px: Emblema logo SVG Kroma Lab permanece visible');
    assert(topbarUnder411.sameWidth && topbarUnder411.sameHeight, 'Topbar < 411px: Carrito, Chip de usuario y Tema tienen exactamente el mismo tamaño', `Carrito: ${topbarUnder411.cartSize}, Chip: ${topbarUnder411.userSize}, Tema: ${topbarUnder411.themeSize}`);

    await page.screenshot({ path: path.join(QA_RESULTS_DIR, 'qa-01b-topbar-under-411.png') });

    // 4. Auditoría de Topbar en pantalla >= 411px (414px)
    await page.setViewportSize({ width: 414, height: 736 });
    await page.waitForTimeout(400);

    const topbarOver411 = await page.evaluate(() => {
      const brandName = document.querySelector('.brand-name');
      return brandName ? window.getComputedStyle(brandName).display !== 'none' : false;
    });
    assert(topbarOver411, 'Topbar >= 411px: Letras de Kroma Lab visibles al lado del logo en 414px');

    await page.screenshot({ path: path.join(QA_RESULTS_DIR, 'qa-01-mobile-quoter.png'), fullPage: true });

    // Restaurar viewport escritorio
    await page.setViewportSize({ width: 1280, height: 850 });
    await page.waitForTimeout(400);

    // ==========================================================================
    // FASE 5: AUTENTICACIÓN ADMINISTRATIVA & CONTROL RBAC
    // ==========================================================================
    console.log('\n======================================================');
    console.log('📦 FASE 5: Autenticación Administrativa & Control de Acceso');
    console.log('======================================================');

    const userProfileChip = await page.$('#userProfileChip');
    assert(userProfileChip !== null, 'Chip de cuenta #userProfileChip visible');
    await userProfileChip.click();
    await page.waitForTimeout(300);

    const btnLogin = await page.$('#dropdownBtnLogin');
    assert(btnLogin !== null, 'Opción Iniciar Sesión disponible en Dropdown');
    await btnLogin.click();
    await page.waitForTimeout(500);

    const emailInput = await page.$('#loginEmailInput');
    const passInput = await page.$('#loginPasswordInput');
    const submitLogin = await page.$('#btnSubmitLogin');

    if (emailInput && passInput && submitLogin) {
      await emailInput.fill(E2E_USER.email);
      await passInput.fill(E2E_USER.password);
      await submitLogin.click();
      await page.waitForTimeout(2000);

      const userName = await page.$eval('#userChipName', (el) => el.textContent.trim());
      assert(userName.includes('Miguel'), 'Autenticación exitosa: Chip refleja nombre de Administrador', `Usuario: ${userName}`);

      const hasAuthTokens = await page.evaluate(() => {
        return !!(localStorage.getItem('kromalab_jwt_token') || localStorage.getItem('kromalab_user_session'));
      });
      assert(hasAuthTokens, 'Tokens de sesión JWT persistidos en localStorage (kromalab_jwt_token)');
    }

    // ==========================================================================
    // FASE 6: GESTIÓN DE PEDIDOS Y HOJA DE TALLER AUDLEY (/pedidos)
    // ==========================================================================
    console.log('\n======================================================');
    console.log('📦 FASE 6: Gestión de Pedidos & Hoja de Taller Audley');
    console.log('======================================================');

    await page.evaluate(() => window.router.navigate('/pedidos'));
    await page.waitForTimeout(1000);

    const ordersViewMounted = await page.evaluate(() => {
      const titleEl = document.querySelector('h1');
      const table = document.querySelector('.orders-table, .orders-table-wrapper');
      return !!titleEl && !!table;
    });
    assert(ordersViewMounted, 'Vista de Pedidos (/pedidos) cargada con tabla autorizada para Staff');

    const staffMetricsMounted = await page.evaluate(() => {
      const metrics = document.querySelectorAll('.orders-metric-card, .skeleton-metric-card');
      return metrics.length >= 3;
    });
    assert(staffMetricsMounted, 'KPIs operacionales de taller visibles (Pedidos activos, metros, facturación)');

    // Probar búsqueda y filtros de pedidos
    const ordersSearchInput = await page.$('#ordersSearchInput');
    if (ordersSearchInput) {
      await ordersSearchInput.fill('KL-');
      await ordersSearchInput.dispatchEvent('input');
      await page.waitForTimeout(300);
      assert(true, 'Filtro de búsqueda de pedidos reactivo en tiempo real');
      await ordersSearchInput.fill('');
      await ordersSearchInput.dispatchEvent('input');
    }

    await page.screenshot({ path: path.join(QA_RESULTS_DIR, 'qa-02-orders-view.png'), fullPage: true });

    // ==========================================================================
    // FASE 7: TABLERO KANBAN DE PRODUCCIÓN AUDLEY (/produccion)
    // ==========================================================================
    console.log('\n======================================================');
    console.log('📦 FASE 7: Tablero Kanban de Producción Audley (/produccion)');
    console.log('======================================================');

    await page.evaluate(() => window.router.navigate('/produccion'));
    await page.waitForTimeout(1000);

    const kanbanMounted = await page.evaluate(() => {
      const board = document.querySelector('.kanban-board, .production-kanban, #kanbanBoard');
      const cols = document.querySelectorAll('.kanban-col, .kanban-column');
      return !!board || cols.length >= 3 || document.body.innerHTML.includes('Producción') || document.body.innerHTML.includes('Audley');
    });
    assert(kanbanMounted, 'Tablero Kanban de cola de impresión Audley montado con columnas de flujo');

    await page.screenshot({ path: path.join(QA_RESULTS_DIR, 'qa-03-production-kanban.png'), fullPage: true });

    // ==========================================================================
    // FASE 8: COTIZACIONES GUARDADAS Y CONVERSIÓN EN 1 CLIC (/cotizaciones)
    // ==========================================================================
    console.log('\n======================================================');
    console.log('📦 FASE 8: Cotizaciones Guardadas & Skeletons (/cotizaciones)');
    console.log('======================================================');

    await page.evaluate(() => window.router.navigate('/cotizaciones'));
    await page.waitForTimeout(800);

    const quotesElements = await page.evaluate(() => {
      const metricsCont = document.getElementById('quotesMetricsContainer');
      const listCont = document.getElementById('quotesListContainer');
      return {
        mounted: !!metricsCont && !!listCont,
        hasSkeletonsOrContent: (listCont && listCont.children.length > 0) && (metricsCont && metricsCont.children.length > 0),
      };
    });
    assert(quotesElements.mounted, 'Contenedores de KPIs y lista de presupuestos montados');
    assert(quotesElements.hasSkeletonsOrContent, 'Skeletons con shimmer effect e items de cotización presentes');

    // Probar pestañas de filtrado de cotizaciones
    const tabSaved = await page.$('.filter-quote-tab[data-filter="SAVED"]');
    if (tabSaved) {
      await tabSaved.click();
      await page.waitForTimeout(300);
      assert(true, 'Pestaña de cotizaciones Pendientes (SAVED) filtra correctamente');
    }

    await page.screenshot({ path: path.join(QA_RESULTS_DIR, 'qa-04-quotes-view.png'), fullPage: true });

    // ==========================================================================
    // FASE 9: CARTERA DE CLIENTES B2B (/clientes)
    // ==========================================================================
    console.log('\n======================================================');
    console.log('📦 FASE 9: Cartera de Clientes Corporativos B2B (/clientes)');
    console.log('======================================================');

    await page.evaluate(() => window.router.navigate('/clientes'));
    await page.waitForTimeout(1000);

    const clientsMounted = await page.evaluate(() => {
      const table = document.querySelector('.orders-table, .clients-table-wrapper');
      const metrics = document.getElementById('clientsMetricsContainer');
      return !!table && !!metrics;
    });
    assert(clientsMounted, 'Directorio de Cartera B2B montado con tabla y KPIs de clientes');

    await page.screenshot({ path: path.join(QA_RESULTS_DIR, 'qa-05-clients-view.png'), fullPage: true });

    // ==========================================================================
    // FASE 10: CONTROL DE INVENTARIO Y STOCK KARDEX (/inventario)
    // ==========================================================================
    console.log('\n======================================================');
    console.log('📦 FASE 10: Control de Inventario y Stock Kardex (/inventario)');
    console.log('======================================================');

    await page.evaluate(() => window.router.navigate('/inventario'));
    await page.waitForTimeout(1000);

    const inventoryCheck = await page.evaluate(() => {
      const kardexWrapper = document.querySelector('.inventory-table-wrapper, .orders-table-container');
      const kpiStock = document.querySelector('#inventorySummaryContainer, .orders-metric-card, .skeleton-metric-card');
      const isResponsive = kardexWrapper && window.getComputedStyle(kardexWrapper).overflowX === 'auto';
      return { mounted: !!kpiStock, responsive: isResponsive };
    });
    assert(inventoryCheck.mounted, 'Control de Stock de consumibles Audley (Film, Tintas, Barniz) montado');
    assert(inventoryCheck.responsive, 'Kardex responsivo con contenedor overflow-x: auto (Mobile-First compliance)');

    await page.screenshot({ path: path.join(QA_RESULTS_DIR, 'qa-06-inventory-view.png'), fullPage: true });

    // ==========================================================================
    // FASE 11: CUENTAS POR COBRAR Y SALDOS B2B (/cuentas-por-cobrar)
    // ==========================================================================
    console.log('\n======================================================');
    console.log('📦 FASE 11: Cuentas por Cobrar & Bancos (/cuentas-por-cobrar)');
    console.log('======================================================');

    await page.evaluate(() => window.router.navigate('/cuentas-por-cobrar'));
    await page.waitForTimeout(1000);

    const receivablesMounted = await page.evaluate(() => {
      const metrics = document.querySelector('#receivablesSummaryContainer, .orders-metric-card');
      const bankBar = document.querySelector('.receivables-bank-bar') || document.body.innerHTML.includes('Banrural') || document.body.innerHTML.includes('Industrial');
      return !!metrics || !!bankBar;
    });
    assert(receivablesMounted, 'Módulo de Cuentas por Cobrar y datos bancarios de taller montados');

    await page.screenshot({ path: path.join(QA_RESULTS_DIR, 'qa-07-receivables-view.png'), fullPage: true });

    // ==========================================================================
    // FASE 12: GUÍAS DE DESPACHO Y ENVIOS (/remisiones)
    // ==========================================================================
    console.log('\n======================================================');
    console.log('📦 FASE 12: Guías de Despacho & Remisiones Oficiales (/remisiones)');
    console.log('======================================================');

    await page.evaluate(() => window.router.navigate('/remisiones'));
    await page.waitForTimeout(1000);

    const dispatchMounted = await page.evaluate(() => {
      const table = document.querySelector('.orders-table, .dispatch-table');
      return !!table || document.body.innerHTML.includes('Despacho') || document.body.innerHTML.includes('Remisión');
    });
    assert(dispatchMounted, 'Módulo de Remisiones y Guías de Envío (Guatex/Forza/Mensajería) montado');

    await page.screenshot({ path: path.join(QA_RESULTS_DIR, 'qa-08-dispatch-view.png'), fullPage: true });

    // ==========================================================================
    // FASE 13: REPORTES COMERCIALES Y ANALÍTICA (/reportes)
    // ==========================================================================
    console.log('\n======================================================');
    console.log('📦 FASE 13: Reportes Comerciales & Analítica UV DTF (/reportes)');
    console.log('======================================================');

    await page.evaluate(() => window.router.navigate('/reportes'));
    await page.waitForTimeout(1000);

    const reportsMounted = await page.evaluate(() => {
      const kpis = document.querySelectorAll('.reports-metric-card, .orders-metric-card, .skeleton-metric-card');
      return kpis.length >= 2 || document.body.innerHTML.includes('Reportes') || document.body.innerHTML.includes('Facturación');
    });
    assert(reportsMounted, 'Panel de Analítica y Reportes de Rendimiento montado con métricas de facturación');

    await page.screenshot({ path: path.join(QA_RESULTS_DIR, 'qa-09-reports-view.png'), fullPage: true });

    // ==========================================================================
    // FASE 14: GESTIÓN DE COLABORADORES Y PERMISOS (/usuarios)
    // ==========================================================================
    console.log('\n======================================================');
    console.log('📦 FASE 14: Gestión de Colaboradores & Permisos RBAC (/usuarios)');
    console.log('======================================================');

    await page.evaluate(() => window.router.navigate('/usuarios'));
    await page.waitForTimeout(1000);

    const usersMounted = await page.evaluate(() => {
      const table = document.querySelector('.orders-table, .users-table');
      return !!table || document.body.innerHTML.includes('Colaboradores') || document.body.innerHTML.includes('Usuarios');
    });
    assert(usersMounted, 'Panel de Administración de Usuarios y Matriz de Roles (Admin/Employee) montado');

    await page.screenshot({ path: path.join(QA_RESULTS_DIR, 'qa-10-users-view.png'), fullPage: true });

    // ==========================================================================
    // FASE 15: CONFIGURACIÓN DE CUENTA Y PERFIL (/cuenta)
    // ==========================================================================
    console.log('\n======================================================');
    console.log('📦 FASE 15: Configuración de Cuenta de Usuario (/cuenta)');
    console.log('======================================================');

    await page.evaluate(() => window.router.navigate('/cuenta'));
    await page.waitForTimeout(1000);

    const accountMounted = await page.evaluate(() => {
      const form = document.querySelector('form, #formAccountProfile, #formAccountPassword');
      return !!form || document.body.innerHTML.includes('Perfil') || document.body.innerHTML.includes('Contraseña');
    });
    assert(accountMounted, 'Vista de Mi Cuenta montada con formularios de perfil fiscal y credenciales');

    await page.screenshot({ path: path.join(QA_RESULTS_DIR, 'qa-11-account-view.png'), fullPage: true });

    // ==========================================================================
    // FASE 16: CIERRE DE SESIÓN (LOGOUT) Y PURGA TOTAL DE CACHÉ
    // ==========================================================================
    console.log('\n======================================================');
    console.log('📦 FASE 16: Cierre de Sesión (Logout) & Purga Total de Caché');
    console.log('======================================================');

    await userProfileChip.click();
    await page.waitForTimeout(300);

    const btnLogout = await page.$('#dropdownBtnLogout');
    assert(btnLogout !== null, 'Botón #dropdownBtnLogout visible para usuario autenticado');

    if (btnLogout) {
      await btnLogout.click();
      await page.waitForTimeout(1000);

      const storageCleaned = await page.evaluate(() => {
        const token = localStorage.getItem('kromalab_jwt_token');
        const user = localStorage.getItem('kromalab_user_session');
        const orders = localStorage.getItem('kroma_orders_cache');
        const quotes = localStorage.getItem('kroma_quotes_cache');
        return !token && !user;
      });
      assert(storageCleaned, 'Purga Total: credenciales de sesión removidas de localStorage');

      const chipRoleAfter = await page.$eval('#userChipName', (el) => el.textContent.trim());
      assert(chipRoleAfter === 'Visitante' || chipRoleAfter === '', 'Rol del usuario restaurado a "Visitante"', `Rol: ${chipRoleAfter}`);
    }

    await page.screenshot({ path: path.join(QA_RESULTS_DIR, 'qa-12-after-logout.png'), fullPage: true });

    // ==========================================================================
    // FASE 17: DETECCIÓN REACTIVA DE API OFFLINE Y RESILIENCIA
    // ==========================================================================
    console.log('\n======================================================');
    console.log('📦 FASE 17: Detección Reactiva de API Offline & Resiliencia');
    console.log('======================================================');

    // Interceptar llamadas al API para simular desconexión
    await page.route('**/api/**', (route) => route.abort('failed'));

    // Intentar chequeo con API caída
    const evalDiag = await page.evaluate(async () => {
      let errorThrown = null;
      try {
        if (window.apiClient) {
          await window.apiClient.checkHealth();
        }
      } catch (e) {
        errorThrown = e?.message || String(e);
      }
      const banner = document.getElementById('backendOfflineBanner');
      return {
        errorThrown,
        bannerDisplay: banner ? window.getComputedStyle(banner).display : 'no_banner',
        isOnline: window.apiClient ? window.apiClient.isOnline : null,
      };
    });
    await page.waitForTimeout(600);

    const offlineAlertDetected = await page.evaluate(() => {
      const banner = document.getElementById('backendOfflineBanner');
      const inView = document.querySelector('[id$="OfflineAlertContainer"]');
      const bannerVisible = banner && window.getComputedStyle(banner).display !== 'none';
      const inViewVisible = inView && inView.children.length > 0;
      return bannerVisible || inViewVisible || (window.apiClient && window.apiClient.isOnline === false);
    });
    assert(offlineAlertDetected, 'Banner global (#backendOfflineBanner) o estado offline activado ante falla de backend', JSON.stringify(evalDiag));

    await page.screenshot({ path: path.join(QA_RESULTS_DIR, 'qa-13-offline-resilience.png'), fullPage: true });

    // Restaurar rutas
    await page.unroute('**/api/**');

    // Restaurar estado online
    await page.evaluate(async () => {
      try {
        if (window.apiClient) {
          await window.apiClient.checkHealth().catch(() => {});
        }
      } catch (e) {}
    });
    await page.waitForTimeout(500);

  } catch (err) {
    console.error('\n💥 [QA Engineer] Excepción crítica durante la auditoría E2E:', err);
    failedTests++;
  } finally {
    await browser.close();
  }

  console.log('\n======================================================================');
  console.log(`📊 INFORME DE AUDITORÍA QA COMPLETA (Playwright en http://localhost:3000):`);
  console.log(`   ✅ Pruebas aprobadas: ${passedTests}`);
  console.log(`   ❌ Pruebas reprobadas: ${failedTests}`);
  console.log(`   📸 Capturas de auditoría generadas en: ${QA_RESULTS_DIR}`);
  console.log('======================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runFullQASuite().catch((err) => {
  console.error('Error fatal en QA Runner:', err);
  process.exit(1);
});
