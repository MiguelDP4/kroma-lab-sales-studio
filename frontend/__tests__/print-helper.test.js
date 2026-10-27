import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  printDocument,
  initPrintListeners,
  KROMA_PRINT_PALETTE,
  renderKromaLogoSvg,
  renderKromaDocumentHeader,
  renderKromaReceiptItemsAndSummary,
} from '../src/js/modules/print-helper.js';

describe('PrintHelper — Módulo de Impresión Física y Exportación a PDF', () => {
  let originalTitle;

  beforeEach(() => {
    originalTitle = document.title;
    document.body.innerHTML = `
      <div id="app">
        <header class="navbar">Navbar</header>
        <main>Contenido Principal</main>
        
        <!-- Modal Despacho -->
        <div id="dispatchSheetModal" style="display: none;">
          <div id="dispatchSheetDocumentContainer">
            <h1>Remisión REM-2026-001</h1>
            <p>Contenido oficial de entrega</p>
          </div>
        </div>

        <!-- Modal Taller -->
        <div id="workshopSheetModal" style="display: none;">
          <div id="workshopSheetContainer">
            <h1>Hoja de Taller Audley KL-00042</h1>
            <p>Especificaciones de bobina 28 cm</p>
          </div>
        </div>
      </div>
    `;
    document.body.className = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.title = originalTitle;
    document.body.innerHTML = '';
    document.body.className = '';
  });

  it('crea el contenedor #printContainer si no existe e inyecta el contenido a imprimir', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

    expect(document.getElementById('printContainer')).toBeNull();

    const sampleHtml = '<div><h2>Orden de Trabajo</h2><p>Impresión UV</p></div>';
    printDocument(sampleHtml, 'Hoja de Taller #KL-0001 — Kroma Lab');

    const printContainer = document.getElementById('printContainer');
    expect(printContainer).not.toBeNull();
    expect(printContainer.innerHTML).toBe(sampleHtml);
    expect(document.body.classList.contains('printing-document')).toBe(true);
    expect(document.title).toBe('Hoja de Taller #KL-0001 — Kroma Lab');
    expect(printSpy).toHaveBeenCalled();
  });

  it('reutiliza #printContainer si ya existe en el DOM', () => {
    vi.spyOn(window, 'print').mockImplementation(() => {});

    const existing = document.createElement('div');
    existing.id = 'printContainer';
    document.body.appendChild(existing);

    printDocument('<p>Documento Reutilizado</p>');

    expect(document.querySelectorAll('#printContainer').length).toBe(1);
    expect(existing.innerHTML).toBe('<p>Documento Reutilizado</p>');
  });

  it('limpia el contenedor y restaura el título en el evento afterprint', () => {
    vi.spyOn(window, 'print').mockImplementation(() => {});

    printDocument('<div>Contenido</div>', 'Título Temporal');
    expect(document.body.classList.contains('printing-document')).toBe(true);
    expect(document.title).toBe('Título Temporal');

    // Disparar afterprint
    window.dispatchEvent(new Event('afterprint'));

    expect(document.body.classList.contains('printing-document')).toBe(false);
    expect(document.getElementById('printContainer').innerHTML).toBe('');
    expect(document.title).toBe(originalTitle);
  });

  it('ejecuta la limpieza por timeout si afterprint no se dispara', () => {
    vi.useFakeTimers();
    vi.spyOn(window, 'print').mockImplementation(() => {});

    printDocument('<div>Contenido Timeout</div>', 'Título Timeout');
    expect(document.body.classList.contains('printing-document')).toBe(true);

    vi.advanceTimersByTime(1300);

    expect(document.body.classList.contains('printing-document')).toBe(false);
    expect(document.getElementById('printContainer').innerHTML).toBe('');
    expect(document.title).toBe(originalTitle);

    vi.useRealTimers();
  });

  it('no falla si el manejador cleanup se invoca múltiples veces (idempotente)', () => {
    vi.spyOn(window, 'print').mockImplementation(() => {});
    printDocument('<div>Test</div>', 'Test Multi');
    window.dispatchEvent(new Event('afterprint'));
    window.dispatchEvent(new Event('afterprint'));
    expect(document.body.classList.contains('printing-document')).toBe(false);
  });

  it('maneja contenido HTML nulo o vacío de manera segura', () => {
    vi.spyOn(window, 'print').mockImplementation(() => {});

    expect(() => printDocument(null)).not.toThrow();
    expect(document.getElementById('printContainer').innerHTML).toBe('');
  });

  it('captura el modal de despacho abierto en el evento beforeprint', () => {
    initPrintListeners();

    const dispatchModal = document.getElementById('dispatchSheetModal');
    dispatchModal.style.display = 'block';

    window.dispatchEvent(new Event('beforeprint'));

    expect(document.body.classList.contains('printing-document')).toBe(true);
    const container = document.getElementById('printContainer');
    expect(container).not.toBeNull();
    expect(container.innerHTML).toContain('Remisión REM-2026-001');

    // afterprint limpia
    window.dispatchEvent(new Event('afterprint'));
    expect(document.body.classList.contains('printing-document')).toBe(false);
    expect(container.innerHTML).toBe('');
  });

  it('captura el modal de taller abierto en el evento beforeprint', () => {
    initPrintListeners();

    const workshopModal = document.getElementById('workshopSheetModal');
    workshopModal.style.display = 'block';

    window.dispatchEvent(new Event('beforeprint'));

    expect(document.body.classList.contains('printing-document')).toBe(true);
    const container = document.getElementById('printContainer');
    expect(container).not.toBeNull();
    expect(container.innerHTML).toContain('Hoja de Taller Audley KL-00042');

    window.dispatchEvent(new Event('afterprint'));
    expect(document.body.classList.contains('printing-document')).toBe(false);
    expect(container.innerHTML).toBe('');
  });

  it('ignora beforeprint si ya se encuentra en modo printing-document o si ningún modal está abierto', () => {
    initPrintListeners();

    // Sin modales abiertos
    window.dispatchEvent(new Event('beforeprint'));
    expect(document.body.classList.contains('printing-document')).toBe(false);

    // Con clase ya activa
    document.body.classList.add('printing-document');
    const dispatchModal = document.getElementById('dispatchSheetModal');
    dispatchModal.style.display = 'block';

    window.dispatchEvent(new Event('beforeprint'));
    // No debe duplicar o sobreescribir
    expect(document.getElementById('printContainer')).toBeNull();
  });

  describe('Plantillas Unificadas de Recibo Kroma Lab (Logo, Encabezado, Tabla y Liquidación)', () => {
    it('exporta la paleta oficial KROMA_PRINT_PALETTE con los colores de marca', () => {
      expect(KROMA_PRINT_PALETTE.SPACE_INDIGO).toBe('#21295c');
      expect(KROMA_PRINT_PALETTE.REGAL_NAVY).toBe('#1b3b6f');
      expect(KROMA_PRINT_PALETTE.BALTIC_BLUE).toBe('#065a82');
      expect(KROMA_PRINT_PALETTE.CERULEAN).toBe('#1c7293');
      expect(KROMA_PRINT_PALETTE.POWDER_BLUE).toBe('#9eb3c2');
    });

    it('renderiza el logotipo vectorial SVG de Kroma Lab con idPrefix y dimensiones', () => {
      const svgDefault = renderKromaLogoSvg();
      expect(svgDefault).toContain('<svg');
      expect(svgDefault).toContain('kroma-print-logo-top-outer');

      const svgCustom = renderKromaLogoSvg('custom-id', 100);
      expect(svgCustom).toContain('custom-id-top-outer');
      expect(svgCustom).toContain('width="100"');
    });

    it('renderiza el encabezado corporativo renderKromaDocumentHeader con y sin filas de metadatos', () => {
      const headerWithMeta = renderKromaDocumentHeader({
        title: 'RECIBO DE SERVICIO DE IMPRESIÓN UV DTF',
        subtitle: 'KROMA LAB — IMPRESIÓN INDUSTRIAL UV DTF',
        folioBadge: 'Folio #001',
        logoIdPrefix: 'hdr-test',
        metaRows: [
          { label: 'Proveedor:', value: 'Kroma Lab — Miguel Dubois', highlight: true },
          { label: 'Cliente:', value: 'Arte Modelo Dubois', highlight: false },
        ],
      });

      expect(headerWithMeta).toContain('RECIBO DE SERVICIO DE IMPRESIÓN UV DTF');
      expect(headerWithMeta).toContain('Folio #001');
      expect(headerWithMeta).toContain('Kroma Lab — Miguel Dubois');
      expect(headerWithMeta).toContain('Arte Modelo Dubois');
      expect(headerWithMeta).toContain('kroma-print-meta-table');

      const headerMinimal = renderKromaDocumentHeader({
        title: 'RECIBO SIMPLE',
      });
      expect(headerMinimal).toContain('RECIBO SIMPLE');
      expect(headerMinimal).not.toContain('kroma-print-meta-table');
    });

    it('renderiza la tabla de artículos y cuadro Resumen de Liquidación con y sin leftSlotHtml', () => {
      const htmlWithSlot = renderKromaReceiptItemsAndSummary({
        items: [
          {
            qty: 622,
            descriptionHtml: '<strong>Vírgenes de Suyapa</strong>',
            measure: '14.5 cm',
            linearMeters: '37.32 m',
            ratePerMeter: 'Q30.00',
            unitCostRef: 'Q1.80',
            subtotal: 'Q1,119.60',
          },
          {
            qty: 500,
            descriptionHtml: '<strong>Vírgenes de Suyapa</strong>',
            measure: '7.25 cm',
            linearMeters: '7.73 m',
            ratePerMeter: 'Q30.00',
            unitCostRef: 'Q0.46',
            subtotal: 'Q231.90',
          },
        ],
        totals: {
          totalQty: '1,122',
          totalMeters: '45.05 m',
          rateLabel: 'Q30.00',
          grandTotal: 'Q1,351.50',
        },
        summaryLines: [
          { label: 'Total de piezas impresas:', value: '1,122 unidades' },
          { label: 'TOTAL A CANCELAR:', value: 'Q 1,351.50', isGrand: true },
        ],
        leftSlotHtml: '<div>Checklist de Taller</div>',
      });

      expect(htmlWithSlot).toContain('Vírgenes de Suyapa');
      expect(htmlWithSlot).toContain('37.32 m');
      expect(htmlWithSlot).toContain('TOTALES');
      expect(htmlWithSlot).toContain('RESUMEN DE LIQUIDACIÓN');
      expect(htmlWithSlot).toContain('Q 1,351.50');
      expect(htmlWithSlot).toContain('Checklist de Taller');

      const htmlDefaults = renderKromaReceiptItemsAndSummary({});
      expect(htmlDefaults).toContain('RESUMEN DE LIQUIDACIÓN');
    });
  });
});
