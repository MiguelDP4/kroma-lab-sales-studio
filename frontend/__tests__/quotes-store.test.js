import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { quotesStore, INITIAL_SEED_QUOTES } from '../src/js/modules/quotes-store.js';
import { ordersStore } from '../src/js/modules/orders-store.js';
import { apiClient } from '../src/js/modules/api-client.js';

describe('QuotesStore — Almacén Reactivo de Cotizaciones Guardadas', () => {
  beforeEach(() => {
    localStorage.clear();
    quotesStore.resetToDefaults();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('inicializa con las cotizaciones semilla de Kroma Lab', () => {
    const quotes = quotesStore.getQuotes();
    expect(quotes.length).toBe(INITIAL_SEED_QUOTES.length);
    expect(quotes[0].projectName).toBe('Stickers Termos Stanley 8x5cm');
  });

  it('obtiene cotización por ID y por código correlativo', () => {
    const q1 = quotesStore.getQuoteById('qt_001');
    expect(q1).not.toBeNull();
    expect(q1.code).toBe('COT-2026-001');

    const qByCode = quotesStore.getQuoteById('COT-2026-001');
    expect(qByCode.id).toBe('qt_001');

    expect(quotesStore.getQuoteById('inexistente')).toBeNull();
    expect(quotesStore.getQuoteById('')).toBeNull();
  });

  it('crea una nueva cotización guardada y la persiste en localStorage', () => {
    const newQuote = quotesStore.createQuote({
      projectName: 'Etiquetas Frascos Miel 6x4cm',
      leadName: 'María Morales',
      leadPhone: '+502 5555-4321',
      leadEmail: 'maria@mielgt.com',
      companyName: 'Miel Pura San José',
      widthCm: 6.0,
      heightCm: 4.0,
      qty: 200,
      linearMeters: 2.0,
      stickersPerRow: 4,
      rows: 50,
      unitRateQ: 130.0,
      materialPriceQ: 260.0,
      cuttingPriceQ: 50.0,
      totalPriceQ: 310.0,
      withCutting: true,
      notes: 'Acabado brillante con relieve',
    });

    expect(newQuote).toBeDefined();
    expect(newQuote.status).toBe('SAVED');
    expect(newQuote.projectName).toBe('Etiquetas Frascos Miel 6x4cm');
    expect(newQuote.code).toMatch(/^COT-2026-\d{3}$/);

    const quotes = quotesStore.getQuotes();
    expect(quotes.length).toBe(INITIAL_SEED_QUOTES.length + 1);
    expect(quotesStore.getQuoteById(newQuote.id)).toBeDefined();
  });

  it('crea una nueva cotización con canvasSnapshot y rotationDeg y la preserva', () => {
    const fakeSnapshot = 'data:image/png;base64,mockCanvasSnapshot123';
    const newQuote = quotesStore.createQuote({
      projectName: 'Stickers Rotados 90deg',
      leadName: 'Juan Pérez',
      leadPhone: '+502 5555-8888',
      widthCm: 8,
      heightCm: 5,
      qty: 100,
      linearMeters: 1.5,
      canvasSnapshot: fakeSnapshot,
      rotationDeg: 90,
    });

    expect(newQuote.canvasSnapshot).toBe(fakeSnapshot);
    expect(newQuote.rotationDeg).toBe(90);

    const fetched = quotesStore.getQuoteById(newQuote.id);
    expect(fetched.canvasSnapshot).toBe(fakeSnapshot);
    expect(fetched.rotationDeg).toBe(90);
  });

  it('despacha la creación a apiClient.quotes.create y asigna backendId', async () => {
    const createSpy = vi.spyOn(apiClient.quotes, 'create').mockResolvedValueOnce({
      success: true,
      quote: { id: 'backend-qt-999', code: 'COT-2026-999' },
    });

    const newQuote = quotesStore.createQuote({
      projectName: 'Stickers Laptop',
      leadName: 'Test Backend',
      leadPhone: '+502 5555-9999',
      widthCm: 10,
      heightCm: 10,
      qty: 20,
      linearMeters: 1.0,
      totalPriceQ: 140,
    });

    expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({
      projectName: 'Stickers Laptop',
      leadName: 'Test Backend',
    }));

    await vi.waitFor(() => {
      expect(newQuote.backendId).toBe('backend-qt-999');
      expect(newQuote.code).toBe('COT-2026-999');
    });
  });

  it('actualiza datos de una cotización existente', () => {
    const updated = quotesStore.updateQuote('qt_001', {
      projectName: 'Stickers Termos Stanley 8x5cm (Revisado)',
      notes: 'Cambio a barniz mate en bordes',
      companyName: 'Café San Cristóbal Premium',
    });

    expect(updated.projectName).toBe('Stickers Termos Stanley 8x5cm (Revisado)');
    expect(updated.notes).toBe('Cambio a barniz mate en bordes');
    expect(updated.companyName).toBe('Café San Cristóbal Premium');

    const inStore = quotesStore.getQuoteById('qt_001');
    expect(inStore.projectName).toBe('Stickers Termos Stanley 8x5cm (Revisado)');
  });

  it('despacha actualización a apiClient.quotes.update', () => {
    const updateSpy = vi.spyOn(apiClient.quotes, 'update').mockResolvedValueOnce({ success: true });

    quotesStore.updateQuote('qt_001', { projectName: 'Nuevo Proyecto' });
    expect(updateSpy).toHaveBeenCalledWith('qt_001', expect.objectContaining({ projectName: 'Nuevo Proyecto' }));
  });

  it('lanza error al intentar actualizar una cotización inexistente', () => {
    expect(() => {
      quotesStore.updateQuote('no-existe', { projectName: 'X' });
    }).toThrow('Cotización no encontrada');
  });

  it('elimina una cotización existente y despacha a la API', () => {
    const deleteSpy = vi.spyOn(apiClient.quotes, 'delete').mockResolvedValueOnce({ success: true });

    const ok = quotesStore.deleteQuote('qt_003');
    expect(ok).toBe(true);
    expect(quotesStore.getQuoteById('qt_003')).toBeNull();
    expect(deleteSpy).toHaveBeenCalledWith('qt_003');
  });

  it('lanza error al intentar eliminar una cotización inexistente', () => {
    expect(() => {
      quotesStore.deleteQuote('inexistente');
    }).toThrow('Cotización no encontrada');
  });

  it('convierte cotización en orden de producción en 1 clic (conversión oficial API)', async () => {
    const mockOrder = {
      id: 'ord-backend-conv-1',
      code: 'KL-2026-077',
      totalAmountQ: 296.0,
      status: 'PENDING_REVIEW',
    };

    const convertSpy = vi.spyOn(apiClient.quotes, 'convertToOrder').mockResolvedValueOnce({
      success: true,
      order: mockOrder,
    });

    const res = await quotesStore.convertToOrder('qt_001');
    expect(res.success).toBe(true);
    expect(convertSpy).toHaveBeenCalledWith('qt_001');

    const q = quotesStore.getQuoteById('qt_001');
    expect(q.status).toBe('CONVERTED');
    expect(q.convertedOrderId).toBe('ord-backend-conv-1');
    expect(q.convertedOrderCode).toBe('KL-2026-077');
  });

  it('convierte cotización a orden mediante fallback local si la API falla o está offline', async () => {
    vi.spyOn(apiClient.quotes, 'convertToOrder').mockRejectedValueOnce(new Error('Offline'));

    const res = await quotesStore.convertToOrder('qt_001');
    expect(res.success).toBe(true);
    expect(res.order).toBeDefined();

    const q = quotesStore.getQuoteById('qt_001');
    expect(q.status).toBe('CONVERTED');
    expect(q.convertedOrderId).toBeDefined();
    expect(q.convertedOrderCode).toBeDefined();

    // Comprobar que la orden existe en ordersStore y transfiere el snapshot técnico
    const orderInStore = ordersStore.getOrderById(q.convertedOrderId);
    expect(orderInStore).not.toBeNull();
    expect(orderInStore.customer.name).toBe('Rodrigo Méndez');
  });

  it('transfiere canvasSnapshot, rotationDeg y fileUrl a la orden generada al convertir una cotización', async () => {
    vi.spyOn(apiClient.quotes, 'convertToOrder').mockRejectedValueOnce(new Error('Offline'));
    const quoteWithSnapshot = quotesStore.createQuote({
      projectName: 'Proyecto Técnico',
      leadName: 'Juan Técnico',
      canvasSnapshot: 'data:image/png;base64,snapshotTechnical123',
      rotationDeg: 90,
      fileUrl: 'https://r2.dev/arte_cliente.png',
      fileName: 'arte_cliente.png',
      widthCm: 8,
      heightCm: 5,
      qty: 60,
    });

    const res = await quotesStore.convertToOrder(quoteWithSnapshot.id);
    expect(res.success).toBe(true);

    const convertedOrder = ordersStore.getOrderById(res.quote.convertedOrderId);
    expect(convertedOrder).not.toBeNull();
    expect(convertedOrder.canvasSnapshot).toBe('data:image/png;base64,snapshotTechnical123');
    expect(convertedOrder.items[0].canvasSnapshot).toBe('data:image/png;base64,snapshotTechnical123');
    expect(convertedOrder.items[0].rotationDeg).toBe(90);
    expect(convertedOrder.items[0].fileUrl).toBe('https://r2.dev/arte_cliente.png');
    expect(convertedOrder.items[0].fileName).toBe('arte_cliente.png');
  });

  it('lanza error al convertir cotización inexistente', async () => {
    await expect(quotesStore.convertToOrder('no-existe')).rejects.toThrow('Cotización no encontrada');
  });

  it('calcula métricas comerciales y tasa de conversión correctamente', () => {
    const m = quotesStore.getMetrics();
    expect(m.totalQuotes).toBe(3);
    expect(m.savedCount).toBe(2);
    expect(m.convertedCount).toBe(1);
    expect(m.conversionRate).toBe('33.3');
    expect(m.totalQuotedQ).toBe(296.0 + 300.0 + 249.0);
  });

  it('filtra cotizaciones por estado y por texto de búsqueda', () => {
    const saved = quotesStore.filterQuotes('', 'SAVED');
    expect(saved.length).toBe(2);

    const converted = quotesStore.filterQuotes('', 'CONVERTED');
    expect(converted.length).toBe(1);

    const byProject = quotesStore.filterQuotes('stanley');
    expect(byProject.length).toBe(1);
    expect(byProject[0].code).toBe('COT-2026-001');

    const byPhone = quotesStore.filterQuotes('5555-0202');
    expect(byPhone.length).toBe(1);

    const byCompany = quotesStore.filterQuotes('Dubois');
    expect(byCompany.length).toBe(1);
  });

  it('notifica a suscriptores ante cualquier mutación', () => {
    const listener = vi.fn();
    const unsub = quotesStore.subscribe(listener);

    quotesStore.createQuote({
      projectName: 'Test Notify',
      leadName: 'Juan',
      leadPhone: '+502 5555-0000',
      totalPriceQ: 140,
    });

    expect(listener).toHaveBeenCalled();
    unsub();
  });

  it('crea una cotización con valores por defecto cuando no se proporcionan datos', () => {
    const q = quotesStore.createQuote();
    expect(q.leadName).toBe('Cliente Cotización');
    expect(q.widthCm).toBe(5);
    expect(q.heightCm).toBe(5);
    expect(q.qty).toBe(50);
    expect(q.unitRateQ).toBe(140);
    expect(q.notes).toBe('');
    expect(q.status).toBe('SAVED');
  });

  it('maneja respuestas vacías o errores en syncWithApi de manera resiliente', async () => {
    vi.spyOn(apiClient.quotes, 'list').mockResolvedValueOnce({ success: true, quotes: [] });
    const quotes1 = await quotesStore.syncWithApi();
    expect(quotes1.length).toBeGreaterThan(0);

    vi.spyOn(apiClient.quotes, 'list').mockRejectedValueOnce(new Error('Network error'));
    const quotes2 = await quotesStore.syncWithApi();
    expect(quotes2.length).toBeGreaterThan(0);
  });

  it('maneja datos corruptos en localStorage restaurando semillas por defecto', () => {
    localStorage.setItem('kromalab_quotes', 'invalid json {{{');
    quotesStore.loadFromStorage();
    expect(quotesStore.getQuotes().length).toBe(3);
  });
});
