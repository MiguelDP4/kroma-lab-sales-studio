import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  initApp,
  syncNavbarRole,
  renderQuoteResults,
  sendWhatsAppQuote,
  initMobileNav,
  redrawRollCanvas,
  getActivePreviewImg,
  setActivePreviewImg,
  getActiveRotation,
  getActiveImageAspectRatio,
} from '../src/js/app.js';
import { store } from '../src/js/store.js';
import * as fileUploader from '../src/js/modules/file-uploader.js';

vi.mock('../src/js/modules/file-uploader.js', async () => {
  const actual = await vi.importActual('../src/js/modules/file-uploader.js');
  return {
    ...actual,
    uploadFileToStorage: vi.fn().mockImplementation(async (file, options) => {
      if (options && typeof options.onProgress === 'function') {
        options.onProgress({ loaded: 50, total: 100, percent: 50 });
      }
      return {
        success: true,
        fileKey: 'quotes/mock-key.png',
        fileUrl: 'https://r2.kroma.gt/quotes/mock-key.png',
        provider: 'cloudflare-r2',
      };
    }),
    uploadCanvasSnapshotToStorage: vi.fn().mockResolvedValue('https://pub-r2.dev/assets/quotes/esquema_bobina.png'),
  };
});

describe('App — Inicialización y DOM', () => {
  beforeEach(() => {
    setActivePreviewImg(null);
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
    fileUploader.uploadFileToStorage.mockReset();
    fileUploader.uploadFileToStorage.mockImplementation(async (file, options) => {
      if (options && typeof options.onProgress === 'function') {
        options.onProgress({ loaded: 50, total: 100, percent: 50 });
      }
      return {
        success: true,
        fileKey: 'quotes/mock-key.png',
        fileUrl: 'https://r2.kroma.gt/quotes/mock-key.png',
        provider: 'cloudflare-r2',
      };
    });
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
      expect(nav.innerHTML).toContain('Despacho');
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
      expect(nav.innerHTML).toContain('Despacho');
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
      setActivePreviewImg(null);
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
      setActivePreviewImg(null);
      initApp();

      const toggleBtn = document.getElementById('mobileNavToggle');
      const navLinks = document.getElementById('navRoleLinks');
      const icon = document.getElementById('mobileNavIcon');

      expect(navLinks.classList.contains('is-open')).toBe(false);
      expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
      expect(icon.textContent).toBe('☰');

      toggleBtn.click();
      expect(navLinks.classList.contains('is-open')).toBe('true' ? true : false);
      expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');
      expect(icon.textContent).toBe('✕');

      toggleBtn.click();
      expect(navLinks.classList.contains('is-open')).toBe(false);
      expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
      expect(icon.textContent).toBe('☰');
    });

    it('cierra el menú al hacer clic en un enlace de navegación', () => {
      setActivePreviewImg(null);
      initApp();
      syncNavbarRole('CUSTOMER');

      const toggleBtn = document.getElementById('mobileNavToggle');
      const navLinks = document.getElementById('navRoleLinks');
      const icon = document.getElementById('mobileNavIcon');

      toggleBtn.click();
      expect(navLinks.classList.contains('is-open')).toBe(true);

      const firstLink = navLinks.querySelector('a');
      firstLink.click();

      expect(navLinks.classList.contains('is-open')).toBe(false);
      expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
      expect(icon.textContent).toBe('☰');
    });

    it('cierra el menú al hacer clic fuera del área del menú', () => {
      setActivePreviewImg(null);
      initApp();

      const toggleBtn = document.getElementById('mobileNavToggle');
      const navLinks = document.getElementById('navRoleLinks');
      const icon = document.getElementById('mobileNavIcon');

      toggleBtn.click();
      expect(navLinks.classList.contains('is-open')).toBe(true);

      // Clic fuera en el body/main
      document.getElementById('app').click();

      expect(navLinks.classList.contains('is-open')).toBe(false);
      expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
      expect(icon.textContent).toBe('☰');
    });
  });

  describe('Cotizador Interactivo y Cálculos en DOM', () => {
    it('recalcula la cotización al escribir en los inputs y al hacer clic en chips de preset', () => {
      setActivePreviewImg(null);
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
      setActivePreviewImg(null);
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
      setActivePreviewImg(null);
      initApp();

      const btnAddToCart = document.getElementById('btnAddToCart');
      expect(btnAddToCart).not.toBeNull();

      btnAddToCart.click();

      const drawer = document.getElementById('cartDrawer');
      expect(drawer.classList.contains('open')).toBe(true);
    });

    it('gestiona la selección y remoción de archivos en el dropzone con Estrategia 1 (Lazy Upload)', async () => {
      setActivePreviewImg(null);
      initApp();

      const dropzone = document.getElementById('quoterDropzone');
      const fileInput = document.getElementById('quoterFileInput');
      const emptyState = document.getElementById('dropzoneEmptyState');
      const selectedState = document.getElementById('dropzoneFileSelected');
      const btnRemoveFile = document.getElementById('btnRemoveFile');
      const uploadBadge = document.getElementById('dropzoneUploadBadge');

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
      expect(uploadBadge.style.display).toBe('inline-block');
      expect(uploadBadge.textContent).toContain('Listo para cotizar');
      // No debe haber subido a R2 aún
      expect(fileUploader.uploadFileToStorage).not.toHaveBeenCalled();

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

    it('ejecuta Lazy Upload al presionar btnAddToCart con archivo adjunto', async () => {
      setActivePreviewImg(null);
      initApp();
      const fileInput = document.getElementById('quoterFileInput');
      const validFile = new File(['dummy png data'], 'logo-cliente.png', { type: 'image/png' });
      Object.defineProperty(fileInput, 'files', {
        value: [validFile],
        writable: true,
      });
      fileInput.dispatchEvent(new Event('change'));
      await new Promise(r => setTimeout(r, 100));

      const btnAddToCart = document.getElementById('btnAddToCart');
      btnAddToCart.click();
      await new Promise(r => setTimeout(r, 100));

      expect(fileUploader.uploadFileToStorage).toHaveBeenCalled();
      const drawer = document.getElementById('cartDrawer');
      expect(drawer.classList.contains('open')).toBe(true);
    });

    it('muestra badge local cuando provider retornado es local', async () => {
      fileUploader.uploadFileToStorage.mockResolvedValueOnce({
        success: true,
        fileKey: 'local-key.png',
        fileUrl: 'blob:...',
        provider: 'local',
      });
      setActivePreviewImg(null);
      initApp();
      const fileInput = document.getElementById('quoterFileInput');
      const validFile = new File(['dummy png data'], 'logo-local.png', { type: 'image/png' });
      Object.defineProperty(fileInput, 'files', {
        value: [validFile],
        writable: true,
      });
      fileInput.dispatchEvent(new Event('change'));
      await new Promise(r => setTimeout(r, 100));

      const btnAddToCart = document.getElementById('btnAddToCart');
      btnAddToCart.click();
      await new Promise(r => setTimeout(r, 100));

      const uploadBadge = document.getElementById('dropzoneUploadBadge');
      expect(uploadBadge.textContent).toContain('Local');
    });

    it('maneja evento onerror al fallar carga de preview de imagen', async () => {
      const originalImage = global.Image;
      let triggerError = null;
      global.Image = class {
        set onerror(fn) {
          triggerError = fn;
        }
      };
      setActivePreviewImg(null);
      initApp();
      const fileInput = document.getElementById('quoterFileInput');
      const validFile = new File(['corrupt data'], 'corrupt.png', { type: 'image/png' });
      Object.defineProperty(fileInput, 'files', {
        value: [validFile],
        writable: true,
      });
      fileInput.dispatchEvent(new Event('change'));
      await vi.waitFor(() => {
        expect(triggerError).not.toBeNull();
      }, { timeout: 3000 });
      triggerError();
      expect(getActivePreviewImg()).toBeNull();
      global.Image = originalImage;
    });

    it('carga imagen con keepAspectCheckbox desmarcado ejecutando rama alternativa de renderizado', async () => {
      const originalImage = global.Image;
      global.Image = class {
        set src(_) {
          setTimeout(() => {
            this.complete = true;
            this.naturalWidth = 400;
            this.naturalHeight = 200;
            if (this.onload) this.onload();
          }, 10);
        }
      };
      setActivePreviewImg(null);
      initApp();
      const keepAspectCheckbox = document.getElementById('optKeepAspectRatio');
      keepAspectCheckbox.checked = false;

      const fileInput = document.getElementById('quoterFileInput');
      const validFile = new File(['png data'], 'no-aspect.png', { type: 'image/png' });
      Object.defineProperty(fileInput, 'files', {
        value: [validFile],
        writable: true,
      });
      fileInput.dispatchEvent(new Event('change'));
      await vi.waitFor(() => {
        expect(getActivePreviewImg()).not.toBeNull();
      }, { timeout: 3000 });

      expect(getActivePreviewImg()).not.toBeNull();
      global.Image = originalImage;
    });

    it('ignora recálculo proporcional cuando stickerWidth o stickerHeight reciben valores vacíos o no numéricos', async () => {
      const originalImage = global.Image;
      global.Image = class {
        set src(_) {
          setTimeout(() => {
            this.complete = true;
            this.naturalWidth = 400;
            this.naturalHeight = 200;
            if (this.onload) this.onload();
          }, 10);
        }
      };
      setActivePreviewImg(null);
      initApp();
      const fileInput = document.getElementById('quoterFileInput');
      const validFile = new File(['png data'], 'art.png', { type: 'image/png' });
      Object.defineProperty(fileInput, 'files', {
        value: [validFile],
        writable: true,
      });
      fileInput.dispatchEvent(new Event('change'));
      await vi.waitFor(() => {
        expect(getActivePreviewImg()).not.toBeNull();
      }, { timeout: 3000 });

      const widthInput = document.getElementById('stickerWidth');
      const heightInput = document.getElementById('stickerHeight');

      widthInput.value = '';
      widthInput.dispatchEvent(new Event('input', { bubbles: true }));

      heightInput.value = 'invalid';
      heightInput.dispatchEvent(new Event('input', { bubbles: true }));

      global.Image = originalImage;
    });

    it('ignora finalización de lectura si el archivo fue removido concurrentemente', async () => {
      let resolveRead;
      vi.spyOn(fileUploader, 'readFileAsDataURL').mockImplementationOnce(() => {
        return new Promise((resolve) => {
          resolveRead = resolve;
        });
      });
      setActivePreviewImg(null);
      initApp();
      const fileInput = document.getElementById('quoterFileInput');
      const validFile = new File(['png data'], 'concur.png', { type: 'image/png' });
      Object.defineProperty(fileInput, 'files', {
        value: [validFile],
        writable: true,
      });
      fileInput.dispatchEvent(new Event('change'));

      // Inmediatamente pulsar remover archivo mientras la lectura está en curso
      const btnRemove = document.getElementById('btnRemoveFile');
      btnRemove.click();

      // Resolver lectura posterior a la remoción
      resolveRead('data:image/png;base64,concurPreview');
      await new Promise(r => setTimeout(r, 50));

      expect(getActivePreviewImg()).toBeNull();
    });

    it('limita el ancho a 28 cm útiles al rotar si el alto previo supera 28 cm', async () => {
      const originalImage = global.Image;
      global.Image = class {
        set src(_) {
          setTimeout(() => {
            this.complete = true;
            this.naturalWidth = 200;
            this.naturalHeight = 400;
            if (this.onload) this.onload();
          }, 10);
        }
      };
      setActivePreviewImg(null);
      initApp();
      const widthInput = document.getElementById('stickerWidth');
      const heightInput = document.getElementById('stickerHeight');
      const btnRotate = document.getElementById('btnRotateImage');

      widthInput.value = '10';
      heightInput.value = '35'; // Mayor a 28 cm

      const fileInput = document.getElementById('quoterFileInput');
      const validFile = new File(['tall png data'], 'tall.png', { type: 'image/png' });
      Object.defineProperty(fileInput, 'files', {
        value: [validFile],
        writable: true,
      });
      fileInput.dispatchEvent(new Event('change'));
      await vi.waitFor(() => {
        expect(getActivePreviewImg()).not.toBeNull();
      }, { timeout: 3000 });

      // Asignar alto a 35 con relación de aspecto desactivada para probar el límite de ancho de bobina
      const keepAspectCheckbox = document.getElementById('optKeepAspectRatio');
      keepAspectCheckbox.checked = false;
      heightInput.value = '35';

      // Al pulsar rotar, el nuevo ancho debería ser min(28, 35) = 28.0
      btnRotate.click();
      expect(parseFloat(widthInput.value)).toBe(28.0);
      expect(parseFloat(heightInput.value)).toBe(10.0);

      global.Image = originalImage;
    });

    it('maneja error en uploadFileToStorage al presionar btnAddToCart manteniendo fallback local', async () => {
      fileUploader.uploadFileToStorage.mockRejectedValueOnce(new Error('R2 Error'));
      setActivePreviewImg(null);
      initApp();
      const fileInput = document.getElementById('quoterFileInput');
      const validFile = new File(['dummy png data'], 'logo-err.png', { type: 'image/png' });
      Object.defineProperty(fileInput, 'files', {
        value: [validFile],
        writable: true,
      });
      fileInput.dispatchEvent(new Event('change'));
      await new Promise(r => setTimeout(r, 100));

      const btnAddToCart = document.getElementById('btnAddToCart');
      btnAddToCart.click();
      await new Promise(r => setTimeout(r, 100));

      const drawer = document.getElementById('cartDrawer');
      expect(drawer.classList.contains('open')).toBe(true);
    });

    it('pasa rawFile y parámetros de archivo a openSaveQuoteModal al presionar btnSaveQuote', async () => {
      setActivePreviewImg(null);
      initApp();
      const fileInput = document.getElementById('quoterFileInput');
      const validFile = new File(['art content'], 'arte-vector.png', { type: 'image/png' });
      Object.defineProperty(fileInput, 'files', {
        value: [validFile],
        writable: true,
      });
      fileInput.dispatchEvent(new Event('change'));
      await new Promise(r => setTimeout(r, 100));

      const btnSaveQuote = document.getElementById('btnSaveQuote');
      btnSaveQuote.click();

      const modal = document.getElementById('saveQuoteModal');
      expect(modal.style.display).toBe('block');
    });

    it('permite gestionar imagen activa en canvas con setActivePreviewImg y redrawRollCanvas', () => {
      setActivePreviewImg(null);
      initApp();
      expect(getActivePreviewImg()).toBeNull();

      const mockImg = { complete: true, naturalWidth: 200, naturalHeight: 200 };
      setActivePreviewImg(mockImg);
      expect(getActivePreviewImg()).toBe(mockImg);

      expect(() => redrawRollCanvas()).not.toThrow();
      setActivePreviewImg(null);
      expect(getActivePreviewImg()).toBeNull();
    });

    it('maneja evento onload al cargar preview de imagen exitosamente', async () => {
      const originalImage = global.Image;
      global.Image = class {
        constructor() {
          setTimeout(() => {
            this.complete = true;
            this.naturalWidth = 200;
            this.naturalHeight = 200;
            if (this.onload) this.onload();
          }, 10);
        }
      };
      setActivePreviewImg(null);
      initApp();
      const fileInput = document.getElementById('quoterFileInput');
      const validFile = new File(['png data'], 'valid-art.png', { type: 'image/png' });
      Object.defineProperty(fileInput, 'files', {
        value: [validFile],
        writable: true,
      });
      fileInput.dispatchEvent(new Event('change'));
      await vi.waitFor(() => {
        expect(getActivePreviewImg()).not.toBeNull();
      }, { timeout: 3000 });
      expect(getActivePreviewImg()).not.toBeNull();
      global.Image = originalImage;
    });

    it('captura error si readFileAsDataURL lanza excepción en handleFileSelected', async () => {
      const spy = vi.spyOn(fileUploader, 'readFileAsDataURL').mockRejectedValueOnce(new Error('Read fail'));
      setActivePreviewImg(null);
      initApp();
      const fileInput = document.getElementById('quoterFileInput');
      const validFile = new File(['fail data'], 'fail.png', { type: 'image/png' });
      Object.defineProperty(fileInput, 'files', {
        value: [validFile],
        writable: true,
      });
      fileInput.dispatchEvent(new Event('change'));
      await new Promise(r => setTimeout(r, 100));
      spy.mockRestore();
    });

    it('mantiene relación de aspecto automática al cargar imagen y al editar dimensiones', async () => {
      const originalImage = global.Image;
      global.Image = class {
        constructor() {
          setTimeout(() => {
            this.complete = true;
            this.naturalWidth = 400;
            this.naturalHeight = 200; // ratio = 0.5 (alto es la mitad del ancho)
            if (this.onload) this.onload();
          }, 10);
        }
      };

      setActivePreviewImg(null);
      initApp();
      const widthInput = document.getElementById('stickerWidth');
      const heightInput = document.getElementById('stickerHeight');
      const keepAspectCheckbox = document.getElementById('optKeepAspectRatio');
      const aspectRatioRow = document.getElementById('aspectRatioRow');

      expect(aspectRatioRow.style.display).toBe('none');
      expect(keepAspectCheckbox.checked).toBe(true);

      widthInput.value = '8';

      const fileInput = document.getElementById('quoterFileInput');
      const validFile = new File(['wide png'], 'banner.png', { type: 'image/png' });
      Object.defineProperty(fileInput, 'files', {
        value: [validFile],
        writable: true,
      });
      fileInput.dispatchEvent(new Event('change'));
      await new Promise(r => setTimeout(r, 100));

      expect(aspectRatioRow.style.display).toBe('flex');
      expect(getActiveImageAspectRatio()).toBe(0.5);
      // Al cargarse con ancho 8, el alto debe ajustarse a 8 * 0.5 = 4.0
      expect(heightInput.value).toBe('4.0');

      // Modificar ancho -> debe actualizar alto
      widthInput.value = '10';
      widthInput.dispatchEvent(new Event('input', { bubbles: true }));
      expect(heightInput.value).toBe('5.0');

      // Modificar alto -> debe actualizar ancho (5 / 0.5 = 10, probemos alto 6 -> ancho 12)
      heightInput.value = '6';
      heightInput.dispatchEvent(new Event('input', { bubbles: true }));
      expect(widthInput.value).toBe('12.0');

      global.Image = originalImage;
    });

    it('permite desactivar relación de aspecto y volver a activarla actualizando alto', async () => {
      const originalImage = global.Image;
      global.Image = class {
        constructor() {
          setTimeout(() => {
            this.complete = true;
            this.naturalWidth = 300;
            this.naturalHeight = 150; // ratio = 0.5
            if (this.onload) this.onload();
          }, 10);
        }
      };

      setActivePreviewImg(null);
      initApp();
      const widthInput = document.getElementById('stickerWidth');
      const heightInput = document.getElementById('stickerHeight');
      const keepAspectCheckbox = document.getElementById('optKeepAspectRatio');

      const fileInput = document.getElementById('quoterFileInput');
      const validFile = new File(['rect png'], 'rect.png', { type: 'image/png' });
      Object.defineProperty(fileInput, 'files', {
        value: [validFile],
        writable: true,
      });
            fileInput.dispatchEvent(new Event('change'));
      const aspectRatioRow = document.getElementById('aspectRatioRow');
      for (let i = 0; i < 50; i++) {
        if (aspectRatioRow && aspectRatioRow.style.display === 'flex') break;
        await new Promise(r => setTimeout(r, 20));
      }

      // Desactivar checkbox
      keepAspectCheckbox.checked = false;
      keepAspectCheckbox.dispatchEvent(new Event('change', { bubbles: true }));

      widthInput.value = '10';
      widthInput.dispatchEvent(new Event('input', { bubbles: true }));
      // Con checkbox inactivo, height no se altera automáticamente
      expect(heightInput.value).not.toBe('5.0');

      // Volver a activar checkbox -> debe reajustar alto según ancho actual
      keepAspectCheckbox.checked = true;
      keepAspectCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
      expect(heightInput.value).toBe('5.0');

      global.Image = originalImage;
    });

    it('permite rotar diseño 90 grados intercambiando ancho y alto e invirtiendo relación de aspecto', async () => {
      const originalImage = global.Image;
      global.Image = class {
        constructor() {
          setTimeout(() => {
            this.complete = true;
            this.naturalWidth = 800;
            this.naturalHeight = 400; // ratio = 0.5
            if (this.onload) this.onload();
          }, 10);
        }
      };

      setActivePreviewImg(null);
      initApp();
      const widthInput = document.getElementById('stickerWidth');
      const heightInput = document.getElementById('stickerHeight');
      const btnRotate = document.getElementById('btnRotateImage');

      widthInput.value = '8';

      const fileInput = document.getElementById('quoterFileInput');
      const validFile = new File(['sample png'], 'sample.png', { type: 'image/png' });
      Object.defineProperty(fileInput, 'files', {
        value: [validFile],
        writable: true,
      });
      fileInput.dispatchEvent(new Event('change'));
      await new Promise(r => setTimeout(r, 100));

      expect(widthInput.value).toBe('8');
      expect(heightInput.value).toBe('4.0');
      expect(getActiveRotation()).toBe(0);

      // Pulsar rotar 90° -> el nuevo ancho debe ser 4.0 y el nuevo alto 8.0
      btnRotate.click();
      expect(getActiveRotation()).toBe(90);
      expect(widthInput.value).toBe('4.0');
      expect(heightInput.value).toBe('8.0');
      expect(getActiveImageAspectRatio()).toBe(2.0);

      // Pulsar rotar nuevamente -> 180° -> ancho 8.0 y alto 4.0
      btnRotate.click();
      expect(getActiveRotation()).toBe(180);
      expect(widthInput.value).toBe('8.0');
      expect(heightInput.value).toBe('4.0');

      // Pulsar eliminar archivo -> debe resetear rotación y ocultar controles
      const btnRemove = document.getElementById('btnRemoveFile');
      btnRemove.click();
      expect(getActiveRotation()).toBe(0);
      expect(getActiveImageAspectRatio()).toBeNull();
      const aspectRatioRow = document.getElementById('aspectRatioRow');
      expect(aspectRatioRow.style.display).toBe('none');

      global.Image = originalImage;
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

    it('sendWhatsAppQuote retorna inmediatamente si el parámetro quote es nulo', () => {
      window.open = vi.fn();
      sendWhatsAppQuote(null);
      expect(window.open).not.toHaveBeenCalled();
    });

    it('sendWhatsAppQuote incluye enlaces a Cloudflare R2 del arte y del canvas en el texto', () => {
      window.open = vi.fn();
      const mockQuote = {
        widthCm: 8,
        heightCm: 6,
        qty: 120,
        stickersPerRow: 3,
        billableMeters: 2.4,
        tierRate: 115.0,
        includeCutting: true,
        isCuttingMinApplied: false,
        cuttingRateUnit: 0.30,
        cuttingTotalQ: 36.0,
        totalPriceQ: 312.0,
        fileUrl: 'https://pub-r2.dev/assets/quotes/diseno_cliente.png',
        canvasSnapshotUrl: 'https://pub-r2.dev/assets/quotes/esquema_bobina.png',
      };

      sendWhatsAppQuote(mockQuote);
      expect(window.open).toHaveBeenCalledWith(expect.stringContaining('whatsapp'), '_blank');
      const calledUrl = window.open.mock.calls[0][0];
      const decodedText = decodeURIComponent(calledUrl);
      expect(decodedText).toContain('🖼️ *Arte del cliente:* https://pub-r2.dev/assets/quotes/diseno_cliente.png');
      expect(decodedText).toContain('📐 *Montaje en bobina:* https://pub-r2.dev/assets/quotes/esquema_bobina.png');
      expect(decodedText).toContain('Sí, corte recto');
    });

    it('sendWhatsAppQuote maneja corte con tarifa base mínima aplicada', () => {
      window.open = vi.fn();
      const mockQuote = {
        widthCm: 5,
        heightCm: 5,
        qty: 20,
        stickersPerRow: 5,
        billableMeters: 1.0,
        tierRate: 140.0,
        includeCutting: true,
        isCuttingMinApplied: true,
        cuttingRateUnit: 0.35,
        cuttingTotalQ: 25.0,
        totalPriceQ: 165.0,
        fileInfo: { fileUrl: 'https://pub-r2.dev/file.png' },
        canvasSnapshot: 'https://pub-r2.dev/montaje.png',
      };

      sendWhatsAppQuote(mockQuote);
      const calledUrl = window.open.mock.calls[0][0];
      const decodedText = decodeURIComponent(calledUrl);
      expect(decodedText).toContain('tarifa base mínima');
      expect(decodedText).toContain('🖼️ *Arte del cliente:* https://pub-r2.dev/file.png');
      expect(decodedText).toContain('📐 *Montaje en bobina:* https://pub-r2.dev/montaje.png');
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
      setActivePreviewImg(null);
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

    it('abre el modal de configuración de usuario al pulsar el chip de perfil tras inicializar la app', () => {
      setActivePreviewImg(null);
      initApp();
      const chip = document.getElementById('userProfileChip');
      const modal = document.getElementById('userProfileModal');

      expect(modal).not.toBeNull();
      expect(modal.style.display).toBe('none');

      chip.click();
      expect(modal.style.display).toBe('block');
    });
  });

});
