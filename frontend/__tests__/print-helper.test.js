import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { printDocument, initPrintListeners } from '../src/js/modules/print-helper.js';

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
});
