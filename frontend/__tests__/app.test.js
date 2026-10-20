import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initApp, syncNavbarRole, renderQuoteResults, sendWhatsAppQuote, initMobileNav } from '../src/js/app.js';
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
        <button id="mobileNavToggle" aria-expanded="false">
          <span id="mobileNavIcon">☰</span>
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
      expect(nav.innerHTML).toContain('Rentabilidad');
      expect(nav.innerHTML).toContain('Usuarios');
      expect(nav.innerHTML).toContain('Inventario');
      expect(nav.innerHTML).toContain('Cobranza');
      expect(nav.innerHTML).toContain('Reportes');
      expect(nav.innerHTML).toContain('Rentabilidad');
    });

    it('muestra "Sales Studio" y enlaces de producción cuando el rol es EMPLOYEE', () => {
      syncNavbarRole('EMPLOYEE');
      const tag = document.getElementById('salesStudioTag');
      const nav = document.getElementById('navRoleLinks');

      expect(tag.style.display).toBe('inline-block');
      expect(nav.innerHTML).toContain('Cola Audley');
      expect(nav.innerHTML).toContain('Rentabilidad');
      expect(nav.innerHTML).toContain('Inventario');
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
      expect(nav.innerHTML).toContain('Inventario');
      expect(nav.innerHTML).toContain('Reportes');
      expect(nav.innerHTML).toContain('Rentabilidad');

      store.clearUser();
      expect(tag.style.display).toBe('none');
    });
  });

  describe('Control de Menú Hamburguesa Móvil (Mobile-First)', () => {
    it('alterna la clase is-open, el aria-expanded y el ícono al pulsar el botón hamburguesa', () => {
      initApp();

      const toggleBtn = document.getElementById('mobileNavToggle');
      const nav = document.getElementById('navRoleLinks');
      const icon = document.getElementById('mobileNavIcon');

      expect(nav.classList.contains('is-open')).toBe(false);
      expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
      expect(icon.textContent).toBe('☰');

      toggleBtn.click();
      expect(nav.classList.contains('is-open')).toBe('true' ? true : false);
      expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');
      expect(icon.textContent).toBe('✕');

      toggleBtn.click();
      expect(nav.classList.contains('is-open')).toBe(false);
      expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
      expect(icon.textContent).toBe('☰');
    });

    it('cierra el menú al hacer clic en un enlace de navegación', () => {
      initApp();
      syncNavbarRole('CUSTOMER');

      const toggleBtn = document.getElementById('mobileNavToggle');
      const nav = document.getElementById('navRoleLinks');
      const icon = document.getElementById('mobileNavIcon');

      toggleBtn.click();
      expect(nav.classList.contains('is-open')).toBe(true);

      const firstLink = nav.querySelector('a');
      firstLink.click();

      expect(nav.classList.contains('is-open')).toBe(false);
      expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
      expect(icon.textContent).toBe('☰');
    });

    it('cierra el menú al hacer clic fuera del área del menú', () => {
      initApp();

      const toggleBtn = document.getElementById('mobileNavToggle');
      const nav = document.getElementById('navRoleLinks');
      const icon = document.getElementById('mobileNavIcon');

      toggleBtn.click();
      expect(nav.classList.contains('is-open')).toBe(true);

      // Clic fuera en el body/main
      document.getElementById('app').click();

      expect(nav.classList.contains('is-open')).toBe(false);
      expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
      expect(icon.textContent).toBe('☰');
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

      await new Promise(r => setTimeout(r, 200));

      // Verificar que se muestre el estado de archivo seleccionado
      expect(emptyState.style.display).toBe('none');
      expect(selectedState.style.display).toBe('flex');

      // Quitar archivo
      btnRemoveFile.click();
      expect(emptyState.style.display).toBe('flex');
      expect(selectedState.style.display).toBe('none');

      // Simular selección de archivo no-imagen (PDF) donde currentPreviewUrl es null
      const pdfFile = new File(['dummy-pdf'], 'documento.pdf', { type: 'application/pdf' });
      Object.defineProperty(fileInput, 'files', {
        value: [pdfFile],
        writable: true,
      });
      fileInput.dispatchEvent(new Event('change'));
      await new Promise(r => setTimeout(r, 200));
      expect(selectedState.style.display).toBe('flex');

      // Simular selección de archivo inválido (.exe)
      btnRemoveFile.click();
      const invalidFile = new File(['virus'], 'programa.exe', { type: 'application/x-msdownload' });
      Object.defineProperty(fileInput, 'files', {
        value: [invalidFile],
        writable: true,
      });
      fileInput.dispatchEvent(new Event('change'));
      await new Promise(r => setTimeout(r, 50));
      const dropzoneError = document.getElementById('dropzoneError');
      expect(dropzoneError.style.display).toBe('block');
      expect(dropzoneError.textContent).toContain('Formato no soportado');
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

  describe('Sidebar Drawer y Acciones del Topbar', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <header class="navbar">
          <button id="mobileNavToggle" aria-expanded="false">
            <span id="mobileNavIcon">☰</span>
          </button>
          <span id="salesStudioTag" style="display: none;">Sales Studio</span>
          <div id="userProfileChip">
            <span id="userChipAvatar">👤</span>
            <span id="userChipName">Admin</span>
          </div>
          <button id="themeToggleBtn"><span id="themeToggleIcon">☀️</span></button>
        </header>

        <div id="sidebarBackdrop" class="sidebar-backdrop"></div>
        <aside id="appSidebar" class="app-sidebar">
          <button id="sidebarCloseBtn">✕</button>
          <nav id="navRoleLinks"></nav>
          <div id="sidebarUserCard">
            <div id="sidebarUserAvatar">M</div>
            <div id="sidebarUserName">Miguel Dubois</div>
            <div id="sidebarUserRole">ADMINISTRADOR</div>
          </div>
        </aside>

        <main id="app"></main>
      `;
      initApp();
    });

    it('abre y cierra el sidebar drawer usando el botón hamburguesa del topbar', () => {
      const toggleBtn = document.getElementById('mobileNavToggle');
      const sidebar = document.getElementById('appSidebar');
      const backdrop = document.getElementById('sidebarBackdrop');
      const icon = document.getElementById('mobileNavIcon');

      expect(sidebar.classList.contains('is-open')).toBe(false);

      toggleBtn.click();
      expect(sidebar.classList.contains('is-open')).toBe(true);
      expect(backdrop.classList.contains('is-open')).toBe(true);
      expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');
      expect(icon.textContent).toBe('✕');

      toggleBtn.click();
      expect(sidebar.classList.contains('is-open')).toBe(false);
      expect(backdrop.classList.contains('is-open')).toBe(false);
      expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
      expect(icon.textContent).toBe('☰');
    });

    it('cierra el sidebar drawer pulsando el botón de cierre (✕)', () => {
      const toggleBtn = document.getElementById('mobileNavToggle');
      const sidebar = document.getElementById('appSidebar');
      const closeBtn = document.getElementById('sidebarCloseBtn');

      toggleBtn.click();
      expect(sidebar.classList.contains('is-open')).toBe(true);

      closeBtn.click();
      expect(sidebar.classList.contains('is-open')).toBe(false);
    });

    it('cierra el sidebar drawer haciendo clic en el telón de fondo (backdrop)', () => {
      const toggleBtn = document.getElementById('mobileNavToggle');
      const sidebar = document.getElementById('appSidebar');
      const backdrop = document.getElementById('sidebarBackdrop');

      toggleBtn.click();
      expect(sidebar.classList.contains('is-open')).toBe(true);

      backdrop.click();
      expect(sidebar.classList.contains('is-open')).toBe(false);
    });

    it('cierra el sidebar drawer al presionar la tecla Escape', () => {
      const toggleBtn = document.getElementById('mobileNavToggle');
      const sidebar = document.getElementById('appSidebar');

      toggleBtn.click();
      expect(sidebar.classList.contains('is-open')).toBe(true);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(sidebar.classList.contains('is-open')).toBe(false);
    });

    it('cierra el sidebar drawer automáticamente al hacer clic en un enlace de navegación', () => {
      const toggleBtn = document.getElementById('mobileNavToggle');
      const sidebar = document.getElementById('appSidebar');
      const navLinks = document.getElementById('navRoleLinks');

      navLinks.innerHTML = '<a href="/cotizador" class="nav-link" data-link>Cotizador</a>';
      const link = navLinks.querySelector('a');

      toggleBtn.click();
      expect(sidebar.classList.contains('is-open')).toBe(true);

      link.click();
      expect(sidebar.classList.contains('is-open')).toBe(false);
    });

    it('cierra el sidebar drawer al hacer clic fuera del sidebar y del toggle', () => {
      const toggleBtn = document.getElementById('mobileNavToggle');
      const sidebar = document.getElementById('appSidebar');

      toggleBtn.click();
      expect(sidebar.classList.contains('is-open')).toBe(true);

      document.getElementById('app').click();
      expect(sidebar.classList.contains('is-open')).toBe(false);
    });

    it('no cierra el sidebar drawer si se hace clic dentro del sidebar en un área sin enlace', () => {
      const toggleBtn = document.getElementById('mobileNavToggle');
      const sidebar = document.getElementById('appSidebar');

      toggleBtn.click();
      expect(sidebar.classList.contains('is-open')).toBe(true);

      sidebar.click();
      expect(sidebar.classList.contains('is-open')).toBe(true);
    });

    it('actualiza el chip de perfil y tarjeta del sidebar al cambiar de rol', () => {
      syncNavbarRole('ADMIN');
      expect(document.getElementById('userChipName').textContent).toContain('Admin');
      expect(document.getElementById('sidebarUserRole').textContent).toBe('ADMINISTRADOR');

      syncNavbarRole('EMPLOYEE');
      expect(document.getElementById('userChipName').textContent).toBe('Operador Taller');
      expect(document.getElementById('sidebarUserRole').textContent).toBe('OPERADOR TALLER');

      syncNavbarRole('CUSTOMER');
      expect(document.getElementById('userChipName').textContent).toBe('Cliente B2B');
      expect(document.getElementById('sidebarUserRole').textContent).toBe('CLIENTE REGISTRADO');

      syncNavbarRole('VISITOR');
      expect(document.getElementById('userChipName').textContent).toBe('Visitante');
      expect(document.getElementById('sidebarUserRole').textContent).toBe('COTIZADOR WEB');
    });
  });

});
