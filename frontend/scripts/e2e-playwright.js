/**
 * Kroma Lab Sales Studio — Automated E2E Suite with Playwright
 * Directiva: Apunta estrictamente a http://localhost:3000 con backend local.
 * Audita consola, desbordamientos visuales mobile-first, skeletons, quoter y logout cache purge.
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

/**
 * Comprueba si una URL HTTP responde con status < 500
 */
function checkUrlAlive(url) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 2000 }, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Espera hasta que una URL esté lista
 */
async function waitForUrl(url, timeoutMs = 12000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const alive = await checkUrlAlive(url);
    if (alive) return true;
    await new Promise((r) => setTimeout(r, 600));
  }
  return false;
}

/**
 * Asegura que tanto el Frontend como el Backend estén corriendo localmente
 */
async function ensureServersRunning() {
  console.log('🔍 [E2E] Verificando estado de los servidores locales...');

  let frontendAlive = await checkUrlAlive(BASE_URL);
  if (!frontendAlive) {
    console.log('🚀 [E2E] Frontend no detectado en :3000. Iniciando servidor frontend...');
    const serveScript = path.resolve(__dirname, 'serve-frontend.js');
    const feProcess = spawn(process.execPath, [serveScript], {
      detached: true,
      stdio: 'ignore',
    });
    feProcess.unref();
    frontendAlive = await waitForUrl(BASE_URL);
    if (!frontendAlive) {
      throw new Error('No se pudo iniciar el servidor Frontend en http://localhost:3000');
    }
    console.log('✅ [E2E] Frontend iniciado y respondiendo en http://localhost:3000');
  } else {
    console.log('✅ [E2E] Frontend activo en http://localhost:3000');
  }

  let backendAlive = await checkUrlAlive(BACKEND_URL);
  if (!backendAlive) {
    console.log('🚀 [E2E] Backend no detectado en :4000. Iniciando servidor backend...');
    const backendDir = path.resolve(REPO_ROOT, 'backend');
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const beProcess = spawn(npmCmd, ['run', 'dev'], {
      cwd: backendDir,
      detached: true,
      stdio: 'ignore',
    });
    beProcess.unref();
    backendAlive = await waitForUrl(BACKEND_URL, 18000);
    if (!backendAlive) {
      console.warn('⚠️ [E2E] Backend no respondió a tiempo; se continuará con pruebas frontend y modo offline.');
    } else {
      console.log('✅ [E2E] Backend iniciado y respondiendo en http://localhost:4000');
    }
  } else {
    console.log('✅ [E2E] Backend activo en http://localhost:4000');
  }
}

/**
 * Suite Principal de Pruebas E2E
 */
async function runE2ESuite() {
  await ensureServersRunning();

  console.log('\n🎭 [Playwright] Iniciando navegador Chromium (Google Chrome)...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  const consoleErrors = [];
  const uncaughtPageErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignorar advertencias no críticas
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
    // --------------------------------------------------------------------------
    // TEST 1: Carga Limpia de la Landing Page y Validación de Consola
    // --------------------------------------------------------------------------
    console.log('\n📋 TEST 1: Carga de Landing Page y Validación de Consola');
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const title = await page.title();
    assert(title.toLowerCase().includes('kroma lab'), 'Título contiene "Kroma Lab"', `Título: ${title}`);
    assert(uncaughtPageErrors.length === 0, 'Sin errores no controlados (uncaught exceptions)', uncaughtPageErrors.join(' | '));
    assert(consoleErrors.length === 0, 'Sin errores en consola del navegador', consoleErrors.join(' | '));

    const appExists = await page.$('#app');
    assert(appExists !== null, 'Elemento contenedor #app montado en el DOM');

    // --------------------------------------------------------------------------
    // TEST 2: Cotizador Interactivo y Simulador Canvas Audley
    // --------------------------------------------------------------------------
    console.log('\n📋 TEST 2: Cotizador Interactivo y Simulador Canvas');
    const quoterSection = await page.$('#cotizador');
    assert(quoterSection !== null, 'Sección del Cotizador (#cotizador) presente en la vista');

    const canvas = await page.$('#rollCanvas');
    assert(canvas !== null, 'Canvas del simulador de bobina Audley (#rollCanvas) montado');

    // Cambiar cantidad de stickers a 100 y verificar recalculo
    const qtyInput = await page.$('#stickerQty');
    if (qtyInput) {
      await qtyInput.fill('100');
      await qtyInput.dispatchEvent('input');
      await qtyInput.dispatchEvent('change');
      await page.waitForTimeout(400);

      const totalPrice = await page.$eval('#resTotalPrice', (el) => el.textContent.trim());
      assert(totalPrice.includes('Q'), 'Cálculo reactivo de precio en Quetzales (#resTotalPrice)', `Precio: ${totalPrice}`);
    } else {
      assert(false, 'Input #stickerQty no encontrado');
    }

    // --------------------------------------------------------------------------
    // TEST 3: Auditoría Mobile-First (Viewport 375px) y Cero Desbordamiento Horizontal
    // --------------------------------------------------------------------------
    console.log('\n📋 TEST 3: Auditoría Mobile-First (375px) y Cero Desbordamiento Horizontal');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(600);

    const overflowCheck = await page.evaluate(() => {
      const docWidth = document.documentElement.clientWidth;
      const scrollWidth = document.documentElement.scrollWidth;
      const bodyWidth = document.body.scrollWidth;
      const maxWidth = Math.max(scrollWidth, bodyWidth);
      return {
        hasOverflow: maxWidth > docWidth + 3,
        docWidth,
        maxWidth,
      };
    });

    assert(
      !overflowCheck.hasOverflow,
      'Cero desbordamiento horizontal en viewport móvil de 375px',
      `Ancho visible: ${overflowCheck.docWidth}px, Ancho scroll: ${overflowCheck.maxWidth}px`
    );

    const mobileShot = path.join(QA_RESULTS_DIR, 'e2e-mobile-quoter.png');
    await page.screenshot({ path: mobileShot, fullPage: true });
    console.log(`  📸 Captura móvil guardada en: ${mobileShot}`);

    // Restaurar viewport de escritorio
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(400);

    // --------------------------------------------------------------------------
    // TEST 4: Autenticación Real de Administrador (migueldp4@gmail.com)
    // --------------------------------------------------------------------------
    console.log('\n📋 TEST 4: Inicio de Sesión Real de Administrador');

    const userProfileChip = await page.$('#userProfileChip');
    assert(userProfileChip !== null, 'Chip de usuario #userProfileChip disponible');
    await userProfileChip.click();
    await page.waitForTimeout(400);

    const btnLogin = await page.$('#dropdownBtnLogin');
    assert(btnLogin !== null, 'Botón de Iniciar Sesión en Dropdown disponible');

    if (btnLogin) {
      await btnLogin.click();
      await page.waitForTimeout(600);

      const emailInput = await page.$('#loginEmailInput');
      const passInput = await page.$('#loginPasswordInput');
      const submitBtn = await page.$('#btnSubmitLogin');

      assert(emailInput !== null && passInput !== null && submitBtn !== null, 'Formulario de Login modal disponible');

      if (emailInput && passInput && submitBtn) {
        await emailInput.fill(E2E_USER.email);
        await passInput.fill(E2E_USER.password);
        await submitBtn.click();
        await page.waitForTimeout(2000);

        const chipNameAfterLogin = await page.$eval('#userChipName', (el) => el.textContent.trim());
        const hasToken = await page.evaluate(() => {
          return !!(localStorage.getItem('kroma_access_token') || localStorage.getItem('kroma_user'));
        });

        assert(
          hasToken || chipNameAfterLogin.includes('Miguel'),
          'Sesión iniciada exitosamente como Administrador',
          `Usuario en chip: ${chipNameAfterLogin}`
        );
      }
    }

    // --------------------------------------------------------------------------
    // TEST 5: Navegación SPA Protegida, Skeletons de Carga y Tablas
    // --------------------------------------------------------------------------
    console.log('\n📋 TEST 5: Navegación a /pedidos, Skeletons de Carga y Auditoría Visual');

    // Navegar a /pedidos como Administrador
    await page.evaluate(() => {
      if (window.router) window.router.navigate('/pedidos');
      else window.history.pushState({}, '', '/pedidos');
    });
    await page.waitForTimeout(1000);

    const ordersMounted = await page.evaluate(() => {
      const ordersContainer = document.querySelector('.orders-table, .orders-table-container, .skeleton-table, #ordersContainer');
      const skeletonPresent = document.querySelector('.skeleton-table, .skeleton-row, .skeleton-text, .skeleton-metric-card');
      return {
        mounted: !!ordersContainer || document.body.innerHTML.includes('Pedidos'),
        hadSkeletonOrData: !!ordersContainer || !!skeletonPresent,
      };
    });

    assert(ordersMounted.mounted, 'Vista /pedidos cargada y autorizada para Administrador');

    const ordersShot = path.join(QA_RESULTS_DIR, 'e2e-orders-view.png');
    await page.screenshot({ path: ordersShot, fullPage: true });
    console.log(`  📸 Captura vista de pedidos guardada en: ${ordersShot}`);

    // --------------------------------------------------------------------------
    // TEST 6: Logout con Purga Total de Caché y Cero Fuga de Datos
    // --------------------------------------------------------------------------
    console.log('\n📋 TEST 6: Cierre de Sesión (Logout) y Purga Total de Caché');

    await userProfileChip.click();
    await page.waitForTimeout(400);

    const btnLogout = await page.$('#dropdownBtnLogout');
    assert(btnLogout !== null, 'Botón de Cerrar Sesión #dropdownBtnLogout visible en menú de Admin');

    if (btnLogout) {
      await btnLogout.click();
      await page.waitForTimeout(1000);

      // Verificar purga total de localStorage
      const storageWiped = await page.evaluate(() => {
        const hasAuthToken = !!localStorage.getItem('kroma_access_token');
        const hasUser = !!localStorage.getItem('kroma_user');
        const hasOrders = !!localStorage.getItem('kroma_orders_cache');
        const hasQuotes = !!localStorage.getItem('kroma_quotes_cache');
        const hasCust = !!localStorage.getItem('kroma_customers_cache');
        const hasReceivables = !!localStorage.getItem('kroma_receivables_cache');
        const hasDispatch = !!localStorage.getItem('kroma_dispatch_cache');
        const hasInventory = !!localStorage.getItem('kroma_inventory_cache');
        return !hasAuthToken && !hasUser && !hasOrders && !hasQuotes && !hasCust && !hasReceivables && !hasDispatch && !hasInventory;
      });

      assert(storageWiped, 'Purga total de localStorage al cerrar sesión (0 datos residuales de tablas)');

      const chipNameAfterLogout = await page.$eval('#userChipName', (el) => el.textContent.trim());
      assert(
        chipNameAfterLogout === 'Visitante' || chipNameAfterLogout === '',
        'Chip de usuario restaurado al estado de "Visitante"',
        `Estado actual: ${chipNameAfterLogout}`
      );

      const logoutShot = path.join(QA_RESULTS_DIR, 'e2e-after-logout.png');
      await page.screenshot({ path: logoutShot });
      console.log(`  📸 Captura post-logout guardada en: ${logoutShot}`);
    }

    // --------------------------------------------------------------------------
    // TEST 7: Detección Reactiva de API Offline y Banner de Advertencia
    // --------------------------------------------------------------------------
    console.log('\n📋 TEST 7: Detección Reactiva de API Offline y Banner');

    // Interceptar llamadas al API para simular desconexión
    await page.route('**/api/**', (route) => route.abort('failed'));

    // Forzar chequeo de salud con API bloqueado
    await page.evaluate(async () => {
      try {
        if (window.apiClient) {
          await window.apiClient.checkHealth().catch(() => {});
        }
      } catch (e) {}
    });
    await page.waitForTimeout(600);

    const offlineAlertActive = await page.evaluate(() => {
      const banner = document.getElementById('backendOfflineBanner');
      const inViewAlert = document.querySelector('[id$="OfflineAlertContainer"]');
      const bannerVisible = banner && banner.style.display !== 'none' && !banner.hidden;
      const inViewVisible = inViewAlert && inViewAlert.children.length > 0;
      return bannerVisible || inViewVisible;
    });

    assert(
      offlineAlertActive,
      'Banner de alerta offline (#backendOfflineBanner) o notificación en vista activada'
    );

    const offlineShot = path.join(QA_RESULTS_DIR, 'e2e-offline-alert.png');
    await page.screenshot({ path: offlineShot });
    console.log(`  📸 Captura banner offline guardada en: ${offlineShot}`);

    // Restaurar rutas
    await page.unroute('**/api/**');

  } catch (err) {
    console.error('💥 [E2E] Excepción durante la ejecución de Playwright:', err);
    failedTests++;
  } finally {
    await browser.close();
  }

  console.log('\n======================================================');
  console.log(`📊 RESULTADOS E2E PLAYWRIGHT (http://localhost:3000):`);
  console.log(`   ✅ Pruebas pasadas: ${passedTests}`);
  console.log(`   ❌ Pruebas fallidas: ${failedTests}`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runE2ESuite().catch((err) => {
  console.error('Error fatal en runner E2E:', err);
  process.exit(1);
});
