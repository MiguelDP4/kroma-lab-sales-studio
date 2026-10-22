/**
 * print-helper.js
 * Módulo especializado en gestión de impresión física y exportación a PDF para Kroma Lab.
 * Resuelve problemas de pantallas en blanco, clipping por transform/overflow y páginas fantasma
 * aislando el documento oficial en un contenedor directo de impresión.
 */

/**
 * Imprime un fragmento HTML oficial aislándolo del resto de la SPA.
 * @param {string} htmlContent - Marcado HTML del documento a imprimir.
 * @param {string} [documentTitle='Documento Kroma Lab'] - Título que aparecerá en el encabezado de impresión.
 */
export function printDocument(htmlContent, documentTitle = 'Documento Kroma Lab') {
  if (typeof document === 'undefined') return;

  // 1. Obtener o crear el contenedor exclusivo de impresión (hijo directo de <body>)
  let printContainer = document.getElementById('printContainer');
  if (!printContainer) {
    printContainer = document.createElement('div');
    printContainer.id = 'printContainer';
    printContainer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(printContainer);
  }

  // 2. Inyectar contenido del documento
  printContainer.innerHTML = htmlContent || '';

  // 3. Activar clase en <body> para que CSS oculte toda la SPA y muestre solo printContainer
  document.body.classList.add('printing-document');

  // 4. Configurar título temporal para el encabezado nativo del navegador o nombre del PDF
  const originalTitle = document.title;
  if (documentTitle) {
    document.title = documentTitle;
  }

  // 5. Manejador de limpieza tras la impresión
  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    document.body.classList.remove('printing-document');
    if (printContainer) {
      printContainer.innerHTML = '';
    }
    if (documentTitle && typeof document !== 'undefined') {
      document.title = originalTitle;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('afterprint', cleanup);
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('afterprint', cleanup);
  }

  // 6. Lanzar diálogo nativo de impresión
  if (typeof window !== 'undefined' && window.print) {
    window.print();
  }

  // 7. Fallback de limpieza por si afterprint no dispara en el entorno
  if (typeof setTimeout !== 'undefined') {
    setTimeout(cleanup, 1200);
  }
}

/**
 * Escucha global para atajos de teclado (Ctrl+P / Command+P)
 * para redirigir la impresión al documento activo si un modal está abierto.
 */
export function initPrintListeners() {
  if (typeof window === 'undefined') return;

  window.addEventListener('beforeprint', () => {
    // Si ya estamos imprimiendo mediante printDocument, no duplicar
    if (document.body.classList.contains('printing-document')) return;

    // Caso 1: Modal de Hoja de Despacho abierto
    const dispatchModal = document.getElementById('dispatchSheetModal');
    const dispatchContent = document.getElementById('dispatchSheetDocumentContainer');
    if (dispatchModal && dispatchModal.style.display !== 'none' && dispatchContent && dispatchContent.innerHTML.trim()) {
      preparePrintContainer(dispatchContent.innerHTML, 'Remisión de Despacho — Kroma Lab');
      return;
    }

    // Caso 2: Modal de Hoja de Taller Audley abierto
    const workshopModal = document.getElementById('workshopSheetModal');
    const workshopContent = document.getElementById('workshopSheetContainer');
    if (workshopModal && workshopModal.style.display !== 'none' && workshopContent && workshopContent.innerHTML.trim()) {
      preparePrintContainer(workshopContent.innerHTML, 'Hoja de Taller Audley UV DTF — Kroma Lab');
      return;
    }
  });

  window.addEventListener('afterprint', () => {
    cleanupPrintContainer();
  });
}

function preparePrintContainer(html, title) {
  let printContainer = document.getElementById('printContainer');
  if (!printContainer) {
    printContainer = document.createElement('div');
    printContainer.id = 'printContainer';
    printContainer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(printContainer);
  }
  printContainer.innerHTML = html;
  document.body.classList.add('printing-document');
  if (title && typeof document !== 'undefined') {
    document.title = title;
  }
}

function cleanupPrintContainer() {
  if (typeof document === 'undefined') return;
  document.body.classList.remove('printing-document');
  const printContainer = document.getElementById('printContainer');
  if (printContainer) {
    printContainer.innerHTML = '';
  }
}
