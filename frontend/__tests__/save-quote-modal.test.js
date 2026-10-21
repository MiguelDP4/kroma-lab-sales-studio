import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  initSaveQuoteModal,
  openSaveQuoteModal,
  closeSaveQuoteModal,
  handleSaveQuoteSubmit,
  getCurrentQuoterSpecs,
} from '../src/js/components/save-quote-modal.js';
import { store } from '../src/js/store.js';
import { quotesStore } from '../src/js/modules/quotes-store.js';
import * as fileUploader from '../src/js/modules/file-uploader.js';

vi.mock('../src/js/modules/file-uploader.js', () => ({
  uploadFileToStorage: vi.fn(),
}));

describe('SaveQuoteModal — Modal para Guardar Cotizaciones', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = `
      <div id="saveQuoteModalContainer"></div>
      <input type="number" id="stickerWidth" value="5">
      <input type="number" id="stickerHeight" value="5">
      <input type="number" id="stickerQty" value="50">
      <input type="checkbox" id="optCutting">
      <span id="resTotalPrice">Q140.00</span>
      <span id="resBillableMeters">1.00</span>
      <span id="resStickersPerRow">5</span>
      <span id="resRows">10</span>
    `;
    quotesStore.resetToDefaults();
    initSaveQuoteModal();
    fileUploader.uploadFileToStorage.mockResolvedValue({
      success: true,
      fileKey: 'quotes/mock-key.png',
      fileUrl: 'https://r2.kroma.gt/quotes/mock-key.png',
      provider: 'cloudflare-r2',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('inicializa el contenedor y estructura del modal', () => {
    const modal = document.getElementById('saveQuoteModal');
    expect(modal).not.toBeNull();
    expect(modal.getAttribute('role')).toBe('dialog');
    expect(modal.style.display).toBe('none');

    expect(document.getElementById('saveQuoteProjectName')).not.toBeNull();
    expect(document.getElementById('saveQuoteLeadName')).not.toBeNull();
    expect(document.getElementById('saveQuoteLeadPhone')).not.toBeNull();
    expect(document.getElementById('btnSubmitSaveQuote')).not.toBeNull();
  });

  it('abre el modal poblando el resumen con medidas y totales', () => {
    openSaveQuoteModal({
      widthCm: 8,
      heightCm: 5,
      qty: 100,
      linearMeters: 2.0,
      withCutting: true,
      cuttingPriceQ: 30.0,
      totalPriceQ: 290.0,
    });

    const modal = document.getElementById('saveQuoteModal');
    expect(modal.style.display).toBe('block');

    const specs = document.getElementById('saveQuoteSpecsSummary');
    expect(specs.textContent).toContain('8 × 5 cm');
    expect(specs.textContent).toContain('100 piezas');

    const total = document.getElementById('saveQuoteTotalSummary');
    expect(total.textContent).toBe('Q290.00');

    const cutting = document.getElementById('saveQuoteCuttingSummary');
    expect(cutting.textContent).toContain('Con despiece individual');
  });

  it('pre-llena automáticamente datos si el usuario está autenticado', () => {
    store.setUser({
      name: 'Miguel Dubois',
      phone: '+502 5406-6217',
      company: 'Arte Modelo Dubois',
      email: 'miguel@kromalab.gt',
      role: 'ADMIN',
    }, 'jwt-tok', ['ALL']);

    openSaveQuoteModal();

    expect(document.getElementById('saveQuoteLeadName').value).toBe('Miguel Dubois');
    expect(document.getElementById('saveQuoteLeadPhone').value).toBe('+502 5406-6217');
    expect(document.getElementById('saveQuoteCompanyName').value).toBe('Arte Modelo Dubois');
    expect(document.getElementById('saveQuoteLeadEmail').value).toBe('miguel@kromalab.gt');
  });

  it('cierra el modal al invocar closeSaveQuoteModal(), presionar Escape o pulsar botón de cerrar', () => {
    openSaveQuoteModal();
    const modal = document.getElementById('saveQuoteModal');
    expect(modal.style.display).toBe('block');

    closeSaveQuoteModal();
    expect(modal.style.display).toBe('none');

    openSaveQuoteModal();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(modal.style.display).toBe('none');

    openSaveQuoteModal();
    document.getElementById('btnCloseSaveQuoteModal').click();
    expect(modal.style.display).toBe('none');

    openSaveQuoteModal();
    document.getElementById('btnCancelSaveQuote').click();
    expect(modal.style.display).toBe('none');
  });

  it('cierra el modal al pulsar el backdrop fuera de la tarjeta', () => {
    openSaveQuoteModal();
    const modal = document.getElementById('saveQuoteModal');
    modal.click();
    expect(modal.style.display).toBe('none');
  });

  it('valida que el nombre de proyecto sea obligatorio', async () => {
    openSaveQuoteModal();
    document.getElementById('saveQuoteProjectName').value = '   ';

    const ok = await handleSaveQuoteSubmit({ preventDefault: vi.fn() });
    expect(ok).toBe(false);

    const feedback = document.getElementById('saveQuoteFeedbackMsg');
    expect(feedback.textContent).toContain('asigna un nombre o referencia');
  });

  it('valida que el nombre de contacto tenga al menos 2 caracteres', async () => {
    openSaveQuoteModal();
    document.getElementById('saveQuoteProjectName').value = 'Stickers Café';
    document.getElementById('saveQuoteLeadName').value = 'A';

    const ok = await handleSaveQuoteSubmit({ preventDefault: vi.fn() });
    expect(ok).toBe(false);

    const feedback = document.getElementById('saveQuoteFeedbackMsg');
    expect(feedback.textContent).toContain('al menos 2 caracteres');
  });

  it('valida que el teléfono tenga al menos 8 dígitos', async () => {
    openSaveQuoteModal();
    document.getElementById('saveQuoteProjectName').value = 'Stickers Café';
    document.getElementById('saveQuoteLeadName').value = 'Carlos Méndez';
    document.getElementById('saveQuoteLeadPhone').value = '123';

    const ok = await handleSaveQuoteSubmit({ preventDefault: vi.fn() });
    expect(ok).toBe(false);

    const feedback = document.getElementById('saveQuoteFeedbackMsg');
    expect(feedback.textContent).toContain('al menos 8 dígitos');
  });

  it('guarda la cotización exitosamente en quotesStore', async () => {
    vi.useFakeTimers();
    openSaveQuoteModal({
      widthCm: 5,
      heightCm: 5,
      qty: 50,
      linearMeters: 1.0,
      stickersPerRow: 5,
      rows: 10,
      unitRateQ: 140,
      materialPriceQ: 140,
      cuttingPriceQ: 0,
      totalPriceQ: 140,
      withCutting: false,
    });

    document.getElementById('saveQuoteProjectName').value = 'Logos Café San Cristóbal';
    document.getElementById('saveQuoteLeadName').value = 'Rodrigo Méndez';
    document.getElementById('saveQuoteLeadPhone').value = '+502 5555-1234';
    document.getElementById('saveQuoteCompanyName').value = 'Café San Cristóbal';
    document.getElementById('saveQuoteLeadEmail').value = 'rodrigo@promoguate.gt';

    const ok = await handleSaveQuoteSubmit({ preventDefault: vi.fn() });
    expect(ok).toBe(true);

    const feedback = document.getElementById('saveQuoteFeedbackMsg');
    expect(feedback.textContent).toContain('guardada exitosamente');

    // Verificar en quotesStore
    const quote = quotesStore.filterQuotes('Logos Café San Cristóbal')[0];
    expect(quote).toBeDefined();
    expect(quote.totalPriceQ).toBe(140);
    expect(quote.status).toBe('SAVED');

    vi.advanceTimersByTime(800);
    expect(window.location.hash).toBe('#/quotes');

    vi.useRealTimers();
  });

  it('sube el archivo a Cloudflare R2 con Lazy Upload al enviar el formulario', async () => {
    vi.useFakeTimers();
    const rawFile = new File(['dummy content'], 'sticker-logo.png', { type: 'image/png' });
    openSaveQuoteModal({
      widthCm: 6,
      heightCm: 6,
      qty: 60,
      linearMeters: 1.2,
      stickersPerRow: 4,
      rows: 15,
      unitRateQ: 140,
      materialPriceQ: 168,
      cuttingPriceQ: 0,
      totalPriceQ: 168,
      withCutting: false,
      rawFile,
      fileName: 'sticker-logo.png',
      fileSizeBytes: rawFile.size,
    });

    document.getElementById('saveQuoteProjectName').value = 'Proyecto Con Arte R2';
    document.getElementById('saveQuoteLeadName').value = 'Alejandro Gómez';
    document.getElementById('saveQuoteLeadPhone').value = '+502 4444-5555';

    const ok = await handleSaveQuoteSubmit({ preventDefault: vi.fn() });
    expect(ok).toBe(true);
    expect(fileUploader.uploadFileToStorage).toHaveBeenCalledWith(rawFile, { context: 'quotes' });

    const quote = quotesStore.filterQuotes('Proyecto Con Arte R2')[0];
    expect(quote).toBeDefined();
    expect(quote.fileUrl).toBe('https://r2.kroma.gt/quotes/mock-key.png');
    expect(quote.fileKey).toBe('quotes/mock-key.png');

    vi.advanceTimersByTime(800);
    vi.useRealTimers();
  });

  it('maneja fallo en la subida a R2 manteniendo el guardado local de la cotización', async () => {
    vi.useFakeTimers();
    fileUploader.uploadFileToStorage.mockRejectedValueOnce(new Error('Network upload failure'));

    const rawFile = new File(['offline'], 'offline-art.png', { type: 'image/png' });
    openSaveQuoteModal({
      widthCm: 5,
      heightCm: 5,
      qty: 50,
      linearMeters: 1.0,
      stickersPerRow: 5,
      rows: 10,
      unitRateQ: 140,
      materialPriceQ: 140,
      cuttingPriceQ: 0,
      totalPriceQ: 140,
      withCutting: false,
      rawFile,
      fileName: 'offline-art.png',
    });

    document.getElementById('saveQuoteProjectName').value = 'Proyecto Offline';
    document.getElementById('saveQuoteLeadName').value = 'María Ramos';
    document.getElementById('saveQuoteLeadPhone').value = '+502 1111-2222';

    const ok = await handleSaveQuoteSubmit({ preventDefault: vi.fn() });
    expect(ok).toBe(true);

    const quote = quotesStore.filterQuotes('Proyecto Offline')[0];
    expect(quote).toBeDefined();
    expect(quote.provider).toBe('local');

    vi.advanceTimersByTime(800);
    vi.useRealTimers();
  });

  it('muestra y oculta la vista previa del snapshot técnico de la bobina', () => {
    // Caso con snapshot presente
    openSaveQuoteModal({
      widthCm: 8,
      heightCm: 5,
      qty: 100,
      canvasSnapshot: 'data:image/png;base64,mockSnapshotData',
      rotationDeg: 90,
    });

    const wrap = document.getElementById('saveQuoteSnapshotWrap');
    const img = document.getElementById('saveQuoteSnapshotImg');
    expect(wrap.style.display).toBe('flex');
    expect(img.src).toContain('mockSnapshotData');

    // Caso sin snapshot
    openSaveQuoteModal({
      widthCm: 5,
      heightCm: 5,
      qty: 50,
      canvasSnapshot: null,
    });
    expect(wrap.style.display).toBe('none');
  });

  it('persiste canvasSnapshot y rotationDeg en quotesStore al guardar', async () => {
    vi.useFakeTimers();
    const fakeSnapshot = 'data:image/png;base64,mockCanvasBase64';
    openSaveQuoteModal({
      widthCm: 10,
      heightCm: 5,
      qty: 50,
      canvasSnapshot: fakeSnapshot,
      rotationDeg: 90,
    });

    document.getElementById('saveQuoteProjectName').value = 'Stickers Con Canvas';
    document.getElementById('saveQuoteLeadName').value = 'Roberto Castillo';
    document.getElementById('saveQuoteLeadPhone').value = '+502 5555-3333';

    const ok = await handleSaveQuoteSubmit({ preventDefault: vi.fn() });
    expect(ok).toBe(true);

    const quote = quotesStore.filterQuotes('Stickers Con Canvas')[0];
    expect(quote.canvasSnapshot).toBe(fakeSnapshot);
    expect(quote.rotationDeg).toBe(90);

    vi.advanceTimersByTime(800);
    vi.useRealTimers();
  });

  it('no vuelve a inicializar si el modal ya existe en el DOM', () => {
    const existingModal = document.getElementById('saveQuoteModal');
    expect(existingModal).not.toBeNull();
    initSaveQuoteModal();
    expect(document.querySelectorAll('#saveQuoteModal').length).toBe(1);
  });

  it('retorna valores por defecto seguros en getCurrentQuoterSpecs si los inputs no existen', () => {
    document.getElementById('stickerWidth').remove();
    document.getElementById('stickerHeight').remove();
    document.getElementById('stickerQty').remove();
    document.getElementById('optCutting').remove();

    const specs = getCurrentQuoterSpecs();
    expect(specs.widthCm).toBe(5);
    expect(specs.heightCm).toBe(5);
    expect(specs.qty).toBe(50);
    expect(specs.withCutting).toBe(false);
  });

  it('maneja con seguridad llamadas a open y close cuando el modal no existe', () => {
    const modal = document.getElementById('saveQuoteModal');
    modal.remove();

    expect(() => openSaveQuoteModal()).not.toThrow();
    expect(() => closeSaveQuoteModal()).not.toThrow();
  });
});
