import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initApp, syncNavbarRole, renderQuoteResults, sendWhatsAppQuote } from '../src/js/app.js';
import { store } from '../src/js/store.js';

describe('App — Inicialización y DOM', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <header>
        <div class="brand-name">
          <span class="brand-title">KROMA LAB</span>
          <span id="salesStudioTag" style="display: none;">Sales Studio</span>
        </div>
        <nav id="navRoleLinks"></nav>
        <button id="themeToggleBtn">
          <span id="themeToggleIcon">☀️</span>
        </button>
      </header>

      <main id="app"></main>

    `;
    store.setTheme('dark');
    store.clearUser();
  });

  it('enlaza el botón de cambio de tema y actualiza el icono y estado al hacer clic', () => {
    initApp();

    const button = document.getElementById('themeToggleBtn');
    const icon = document.getElementById('themeToggleIcon');

    expect(store.state.theme).toBe('dark');
    expect(icon.textContent).toBe('☀️');

    button.click();

    expect(store.state.theme).toBe('light');
    expect(icon.textContent).toBe('🌙');
  });

  describe('Control de Navbar según Rol (RBAC)', () => {
    it('muestra "Sales Studio" y enlaces operativos cuando el rol es ADMIN', () => {
      syncNavbarRole('ADMIN');
      const tag = document.getElementById('salesStudioTag');
      const nav = document.getElementById('navRoleLinks');

      expect(tag.style.display).toBe('inline-block');
      expect(nav.innerHTML).toContain('Cola Audley');
      expect(nav.innerHTML).toContain('Usuarios');
    });

    it('muestra "Sales Studio" y enlaces de producción cuando el rol es EMPLOYEE', () => {
      syncNavbarRole('EMPLOYEE');
      const tag = document.getElementById('salesStudioTag');
      const nav = document.getElementById('navRoleLinks');

      expect(tag.style.display).toBe('inline-block');
      expect(nav.innerHTML).toContain('Cola Audley');
      expect(nav.innerHTML).not.toContain('Usuarios');
    });

    it('oculta "Sales Studio" y muestra enlaces de autoservicio para CUSTOMER', () => {
      syncNavbarRole('CUSTOMER');
      const tag = document.getElementById('salesStudioTag');
      const nav = document.getElementById('navRoleLinks');

      expect(tag.style.display).toBe('none');
      expect(nav.innerHTML).toContain('Mis Pedidos');
      expect(nav.innerHTML).not.toContain('Cola Audley');
    });

    it('oculta "Sales Studio" y muestra enlaces informativos para VISITOR no registrado', () => {
      syncNavbarRole('VISITOR');
      const tag = document.getElementById('salesStudioTag');
      const nav = document.getElementById('navRoleLinks');

      expect(tag.style.display).toBe('none');
      expect(nav.innerHTML).toContain('Cotizador');
      expect(nav.innerHTML).not.toContain('Mis Pedidos');
    });

    it('sincroniza reactivamente el navbar al cambiar el usuario y rol en el store', () => {
      initApp();
      const tag = document.getElementById('salesStudioTag');
      expect(tag.style.display).toBe('none');

      store.setUser({ id: '1', role: 'ADMIN' }, 'fake-jwt');
      expect(tag.style.display).toBe('inline-block');
      const nav = document.getElementById('navRoleLinks');
      expect(nav.innerHTML).toContain('Usuarios');

      store.clearUser();
      expect(tag.style.display).toBe('none');
    });
  });

  describe('Cotizador Interactivo y Cálculos en DOM', () => {
    it('recalcula la cotización al escribir en los inputs y al hacer clic en chips de preset', () => {
      initApp();

      const widthInput = document.getElementById('stickerWidth');
      const chip = document.querySelector('.btn-chip[data-w="8"]');

      chip.click();
      expect(widthInput.value).toBe('8');
      expect(store.state.activeQuote.widthCm).toBe(8);

      const totalPriceEl = document.getElementById('resTotalPrice');
      expect(totalPriceEl.textContent).toContain('Q');

      // Probar evento resize de ventana
      window.dispatchEvent(new Event('resize'));

      // Probar clic en botón WhatsApp del formulario
      window.open = vi.fn();
      const btnWhatsApp = document.getElementById('btnQuoteWhatsApp');
      btnWhatsApp.click();
      expect(window.open).toHaveBeenCalledWith(expect.stringContaining('whatsapp'), '_blank');
    });


    it('renderiza resultados con corte opcional activo', () => {
      initApp();
      const mockQuote = {
        widthCm: 5,
        heightCm: 5,
        qty: 100,
        stickersPerRow: 5,
        rows: 20,
        physicalLengthCm: 105.7,
        billableMeters: 1.06,
        isUnderMin: false,
        maxInOneMeter: 95,
        tierRate: 115.0,
        materialPriceQ: 121.9,
        includeCutting: true,
        cuttingRateUnit: 0.30,
        cuttingTotalQ: 30.0,
        isCuttingMinApplied: false,
        totalPriceQ: 151.9,
        unitPriceQ: 1.52,
      };

      renderQuoteResults(mockQuote);

      const cuttingCostEl = document.getElementById('resCuttingCost');
      expect(cuttingCostEl.innerHTML).toContain('+Q30.00');

      const cuttingCard = document.getElementById('cuttingCard');
      expect(cuttingCard.classList.contains('active')).toBe(true);

      // Probar render cuando no incluye corte y cuando está por debajo del mínimo (isUnderMin: true)
      mockQuote.includeCutting = false;
      mockQuote.isUnderMin = true;
      mockQuote.actualLinearMeters = 0.5;
      renderQuoteResults(mockQuote);
      expect(cuttingCostEl.textContent).toContain('No incluido');
      expect(document.getElementById('minimumNotice').style.display).toBe('block');
    });

    it('agrega el diseño al carrito y abre el drawer al hacer clic en btnAddToCart', () => {
      initApp();

      const btnAddToCart = document.getElementById('btnAddToCart');
      expect(btnAddToCart).not.toBeNull();

      btnAddToCart.click();

      const drawer = document.getElementById('cartDrawer');
      expect(drawer.classList.contains('open')).toBe(true);
    });

    it('gestiona la selección y remoción de archivos en el dropzone', async () => {
      initApp();

      const dropzone = document.getElementById('quoterDropzone');
      const fileInput = document.getElementById('quoterFileInput');
      const emptyState = document.getElementById('dropzoneEmptyState');
      const selectedState = document.getElementById('dropzoneFileSelected');
      const btnRemoveFile = document.getElementById('btnRemoveFile');

      // Drag events
      dropzone.dispatchEvent(new Event('dragover'));
      expect(dropzone.classList.contains('dragover')).toBe(true);

      dropzone.dispatchEvent(new Event('dragleave'));
      expect(dropzone.classList.contains('dragover')).toBe(false);

      fileInput.click = vi.fn();
      dropzone.click();
      expect(fileInput.click).toHaveBeenCalled();

      const dropEvent = new Event('drop');
      dropzone.dispatchEvent(dropEvent);

      // Simular selección de archivo válido
      const validFile = new File(['dummy'], 'logo.png', { type: 'image/png' });
      Object.defineProperty(fileInput, 'files', {
        value: [validFile],
        writable: true,
      });
      fileInput.dispatchEvent(new Event('change'));

      await new Promise(r => setTimeout(r, 50));

      // Verificar que se muestre el estado de archivo seleccionado
      expect(emptyState.style.display).toBe('none');
      expect(selectedState.style.display).toBe('flex');

      // Quitar archivo
      btnRemoveFile.click();
      expect(emptyState.style.display).toBe('flex');
      expect(selectedState.style.display).toBe('none');
    });

    it('maneja de forma segura initQuoter si no existen inputs en el DOM', () => {
      document.body.innerHTML = '';
      expect(() => initApp()).not.toThrow();
    });


    it('abre el enlace de WhatsApp con la cotización formateada al llamar a sendWhatsAppQuote', () => {
      window.open = vi.fn();
      const mockQuote = {
        widthCm: 5,
        heightCm: 5,
        qty: 50,
        stickersPerRow: 5,
        billableMeters: 1.0,
        tierRate: 140.0,
        includeCutting: false,
        totalPriceQ: 140.0,
      };

      sendWhatsAppQuote(mockQuote);
      expect(window.open).toHaveBeenCalledWith(expect.stringContaining('whatsapp'), '_blank');
    });
  });
});
