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

  it('valida que el nombre de proyecto sea obligatorio', () => {
    openSaveQuoteModal();
    document.getElementById('saveQuoteProjectName').value = '   ';

    const ok = handleSaveQuoteSubmit({ preventDefault: vi.fn() });
    expect(ok).toBe(false);

    const feedback = document.getElementById('saveQuoteFeedbackMsg');
    expect(feedback.textContent).toContain('asigna un nombre o referencia');
  });

  it('valida que el nombre de contacto tenga al menos 2 caracteres', () => {
    openSaveQuoteModal();
    document.getElementById('saveQuoteProjectName').value = 'Stickers Café';
    document.getElementById('saveQuoteLeadName').value = 'A';

    const ok = handleSaveQuoteSubmit({ preventDefault: vi.fn() });
    expect(ok).toBe(false);

    const feedback = document.getElementById('saveQuoteFeedbackMsg');
    expect(feedback.textContent).toContain('al menos 2 caracteres');
  });

  it('valida que el teléfono tenga al menos 8 dígitos', () => {
    openSaveQuoteModal();
    document.getElementById('saveQuoteProjectName').value = 'Stickers Café';
    document.getElementById('saveQuoteLeadName').value = 'Carlos Méndez';
    document.getElementById('saveQuoteLeadPhone').value = '123';

    const ok = handleSaveQuoteSubmit({ preventDefault: vi.fn() });
    expect(ok).toBe(false);

    const feedback = document.getElementById('saveQuoteFeedbackMsg');
    expect(feedback.textContent).toContain('al menos 8 dígitos');
  });

  it('guarda la cotización exitosamente en quotesStore', () => {
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

    const ok = handleSaveQuoteSubmit({ preventDefault: vi.fn() });
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
