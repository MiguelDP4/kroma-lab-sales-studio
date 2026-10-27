/**
 * print-helper.js
 * Módulo especializado en gestión de impresión física, exportación a PDF y plantillas oficiales
 * de recibos / hojas de taller con la identidad visual de Kroma Lab.
 * Resuelve problemas de pantallas en blanco, clipping por transform/overflow y páginas fantasma
 * aislando el documento oficial en un contenedor directo de impresión.
 */

/**
 * Paleta oficial de marca Kroma Lab para documentos imprimibles y recibos (Modo Claro Corporativo)
 */
export const KROMA_PRINT_PALETTE = {
  SPACE_INDIGO: '#21295c',
  REGAL_NAVY: '#1b3b6f',
  BALTIC_BLUE: '#065a82',
  CERULEAN: '#1c7293',
  POWDER_BLUE: '#9eb3c2',
  BG_LIGHT: '#f4f7fb',
  BG_ELEVATED: '#eef3f8',
  BORDER_ROW: '#dde5ed',
  TEXT_MUTED: '#475569',
  WHITE: '#ffffff',
};

/**
 * Renderiza el logotipo vectorial oficial completo de Kroma Lab (Anillo Hexagonal 3D + Monograma KL + Wordmark KROMA LAB),
 * idéntico al encabezado del recibo corporativo .docx.
 * @param {string} [idPrefix='kroma-print-logo'] - Prefijo único para IDs de gradientes SVG.
 * @param {number} [widthPx=88] - Ancho en píxeles del logotipo.
 */
export function renderKromaLogoSvg(idPrefix = 'kroma-print-logo', widthPx = 88) {
  const heightPx = Math.round(widthPx * (875 / 810));
  return `
    <svg viewBox="95 85 810 875" width="${widthPx}" height="${heightPx}" xmlns="http://www.w3.org/2000/svg" style="display: block; flex-shrink: 0;">
      <defs>
        <linearGradient id="${idPrefix}-top-outer" x1="305" y1="97" x2="695" y2="97" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#E12526" />
          <stop offset="50%" stop-color="#EE6B24" />
          <stop offset="100%" stop-color="#F5CA28" />
        </linearGradient>
        <linearGradient id="${idPrefix}-top-inner" x1="372" y1="213" x2="695" y2="155" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#B92A25" />
          <stop offset="55%" stop-color="#C96B1D" />
          <stop offset="100%" stop-color="#D4941A" />
        </linearGradient>
        <linearGradient id="${idPrefix}-tr-outer" x1="695" y1="97" x2="890" y2="435" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#EDAE1F" />
          <stop offset="55%" stop-color="#A5C626" />
          <stop offset="100%" stop-color="#199B49" />
        </linearGradient>
        <linearGradient id="${idPrefix}-tr-inner" x1="628" y1="213" x2="890" y2="435" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#6B9832" />
          <stop offset="60%" stop-color="#228640" />
          <stop offset="100%" stop-color="#0B7B42" />
        </linearGradient>
        <linearGradient id="${idPrefix}-br-outer" x1="890" y1="435" x2="695" y2="773" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#0C9653" />
          <stop offset="50%" stop-color="#14A88B" />
          <stop offset="100%" stop-color="#208AD8" />
        </linearGradient>
        <linearGradient id="${idPrefix}-br-inner" x1="756" y1="435" x2="628" y2="657" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#1AB37C" />
          <stop offset="55%" stop-color="#2FC6C6" />
          <stop offset="100%" stop-color="#239FE0" />
        </linearGradient>
        <linearGradient id="${idPrefix}-bot-inner" x1="695" y1="773" x2="372" y2="657" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#1978CE" />
          <stop offset="60%" stop-color="#1746C4" />
          <stop offset="100%" stop-color="#2729B8" />
        </linearGradient>
        <linearGradient id="${idPrefix}-bot-outer" x1="695" y1="773" x2="305" y2="773" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#2994E2" />
          <stop offset="45%" stop-color="#1B32B8" />
          <stop offset="100%" stop-color="#5D27E1" />
        </linearGradient>
        <linearGradient id="${idPrefix}-bl-outer" x1="305" y1="773" x2="110" y2="435" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#3C16BA" />
          <stop offset="50%" stop-color="#8719D6" />
          <stop offset="100%" stop-color="#D721C8" />
        </linearGradient>
        <linearGradient id="${idPrefix}-bl-inner" x1="372" y1="657" x2="177" y2="435" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#5922DC" />
          <stop offset="50%" stop-color="#A624E8" />
          <stop offset="100%" stop-color="#EC2CE8" />
        </linearGradient>
        <linearGradient id="${idPrefix}-tl-outer" x1="110" y1="435" x2="305" y2="97" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#CA1F96" />
          <stop offset="55%" stop-color="#DF2758" />
          <stop offset="100%" stop-color="#E52726" />
        </linearGradient>
        <linearGradient id="${idPrefix}-tl-inner" x1="244" y1="435" x2="338" y2="155" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#9A1B64" />
          <stop offset="55%" stop-color="#BA1F38" />
          <stop offset="100%" stop-color="#C92123" />
        </linearGradient>
      </defs>
      <g stroke-linejoin="bevel">
        <polygon points="305,97.25 695,97.25 372,213.3" fill="url(#${idPrefix}-top-outer)" stroke="url(#${idPrefix}-top-outer)" stroke-width="1" />
        <polygon points="372,213.3 695,97.25 628,213.3" fill="url(#${idPrefix}-top-inner)" stroke="url(#${idPrefix}-top-inner)" stroke-width="1" />
        <polygon points="695,97.25 890,435 628,213.3" fill="url(#${idPrefix}-tr-outer)" stroke="url(#${idPrefix}-tr-outer)" stroke-width="1" />
        <polygon points="628,213.3 890,435 756,435" fill="url(#${idPrefix}-tr-inner)" stroke="url(#${idPrefix}-tr-inner)" stroke-width="1" />
        <polygon points="890,435 695,772.75 756,435" fill="url(#${idPrefix}-br-outer)" stroke="url(#${idPrefix}-br-outer)" stroke-width="1" />
        <polygon points="756,435 695,772.75 628,656.7" fill="url(#${idPrefix}-br-inner)" stroke="url(#${idPrefix}-br-inner)" stroke-width="1" />
        <polygon points="628,656.7 695,772.75 372,656.7" fill="url(#${idPrefix}-bot-inner)" stroke="url(#${idPrefix}-bot-inner)" stroke-width="1" />
        <polygon points="695,772.75 305,772.75 372,656.7" fill="url(#${idPrefix}-bot-outer)" stroke="url(#${idPrefix}-bot-outer)" stroke-width="1" />
        <polygon points="305,772.75 110,435 372,656.7" fill="url(#${idPrefix}-bl-outer)" stroke="url(#${idPrefix}-bl-outer)" stroke-width="1" />
        <polygon points="372,656.7 110,435 244,435" fill="url(#${idPrefix}-bl-inner)" stroke="url(#${idPrefix}-bl-inner)" stroke-width="1" />
        <polygon points="110,435 305,97.25 244,435" fill="url(#${idPrefix}-tl-outer)" stroke="url(#${idPrefix}-tl-outer)" stroke-width="1" />
        <polygon points="244,435 305,97.25 372,213.3" fill="url(#${idPrefix}-tl-inner)" stroke="url(#${idPrefix}-tl-inner)" stroke-width="1" />
      </g>
      <g fill="#111827">
        <path d="M 345 326 L 345 544 L 391 544 L 391 461 L 391.06055 461 L 391 460.98242 L 412.40234 418 L 391 418 L 391 326 L 345 326 z M 474 326 L 418.2832 417.5332 L 418.3457 417.57031 L 392.44336 461 L 418 461 L 475 544 L 528 544 L 452 438 L 525 326 L 474 326 z " />
        <path d="M 542,326 H 588 V 502 L 542,541 Z" />
        <path d="M 547,544 L 597,504 H 691 L 669,544 Z" />
      </g>
      <g fill="#111827" fill-rule="evenodd">
        <path d="M 138,856 H 160 V 891 H 174 L 200,856 H 225 L 192,898 L 227,942 H 201 L 174,907 H 160 V 942 H 138 Z" />
        <path d="M 244,856 H 302 L 315,869 V 895 L 302,907 H 297 L 317,942 H 293 L 275,908 H 266 V 942 H 244 Z M 266,873 V 891 H 290 L 294,887 V 877 L 290,873 Z" />
        <path d="M 349,856 H 394 L 410,872 V 926 L 394,942 H 349 L 333,926 V 872 Z M 355,874 V 924 H 388 V 874 Z" />
        <path d="M 430,856 H 454 L 475,910 L 496,856 H 520 V 942 H 499 V 890 L 480,937 H 470 L 451,890 V 942 H 430 Z" />
        <path d="M 564,856 H 588 L 617,942 H 594 L 588,923 H 563 L 557,942 H 535 Z M 568,906 H 583 L 575.5,881 Z" />
        <path d="M 657,856 H 676 V 925 H 717 V 942 H 657 Z" />
        <path d="M 753,856 H 773 L 802,942 H 782 L 775,921 H 750 L 743,942 H 724 Z M 755,905 H 770 L 762.5,879 Z" />
        <path d="M 818,856 H 872 L 885,869 V 890 L 876,898 L 887,908 V 929 L 873,942 H 818 Z M 836,872 V 891 H 864 L 868,887 V 876 L 864,872 Z M 836,906 V 926 H 866 L 870,922 V 910 L 866,906 Z" />
      </g>
    </svg>
  `;
}

/**
 * Renderiza el encabezado corporativo unificado de Kroma Lab (Logo a la izquierda, título a la derecha con línea Cerulean,
 * seguido del bloque apilado de metadatos con borde izquierdo en Baltic Blue y filas alternadas).
 * @param {Object} config
 * @param {string} config.title - Título principal del documento (ej. "RECIBO DE SERVICIO DE IMPRESIÓN UV DTF").
 * @param {string} [config.subtitle='KROMA LAB — IMPRESIÓN INDUSTRIAL UV DTF'] - Subtítulo corporativo en Cerulean.
 * @param {string} [config.folioBadge=''] - Folio o código opcional destacado a la derecha.
 * @param {Array<{label: string, value: string, highlight?: boolean}>} [config.metaRows=[]] - Filas de datos del encabezado.
 * @param {string} [config.logoIdPrefix='kroma-doc'] - Prefijo para los gradientes del SVG.
 */
export function renderKromaDocumentHeader({
  title,
  subtitle = 'KROMA LAB UV DTF — IMPRESIÓN INDUSTRIAL UV DTF',
  folioBadge = '',
  metaRows = [],
  logoIdPrefix = 'kroma-doc',
}) {
  const P = KROMA_PRINT_PALETTE;

  const rowsHtml = metaRows
    .map((row, idx) => {
      const bg = idx % 2 === 0 ? P.BG_ELEVATED : P.BG_LIGHT;
      const valColor = row.highlight ? P.SPACE_INDIGO : P.TEXT_MUTED;
      const valWeight = row.highlight ? '700' : '500';
      const borderBottom = idx < metaRows.length - 1 ? `1px solid ${P.BORDER_ROW}` : 'none';

      return `
        <tr style="background: ${bg}; border-bottom: ${borderBottom};">
          <td style="padding: 0.45rem 0.9rem; font-size: 0.88rem; line-height: 1.35;">
            <strong style="color: ${P.REGAL_NAVY}; font-weight: 700;">${row.label}</strong>
            <span style="color: ${valColor}; font-weight: ${valWeight}; margin-left: 0.3rem;">${row.value}</span>
          </td>
        </tr>
      `;
    })
    .join('');

  return `
    <!-- 1. ENCABEZADO CON LOGO DE KROMA LAB Y TÍTULO -->
    <div class="workshop-sheet-header kroma-print-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid ${P.CERULEAN}; padding-bottom: 0.9rem; margin-bottom: 1rem; gap: 1rem; flex-wrap: wrap;">
      <div style="display: flex; align-items: center;">
        ${renderKromaLogoSvg(logoIdPrefix, 86)}
      </div>

      <div style="text-align: right; flex: 1; min-width: 240px;">
        <h1 style="font-size: 1.3rem; font-weight: 800; margin: 0 0 0.25rem; color: ${P.SPACE_INDIGO}; letter-spacing: 0.01em; text-transform: uppercase;">
          ${title}
        </h1>
        <div style="font-size: 0.82rem; font-weight: 800; color: ${P.CERULEAN}; text-transform: uppercase; letter-spacing: 0.04em;">
          ${subtitle}
        </div>
        ${folioBadge ? `
          <div style="margin-top: 0.25rem; font-family: monospace; font-size: 0.95rem; font-weight: 800; color: ${P.REGAL_NAVY};">
            ${folioBadge}
          </div>
        ` : ''}
      </div>
    </div>

    <!-- 2. BLOQUE DE DATOS DEL ENCABEZADO (Proveedor, Cliente, Fecha, Modalidad, Tarifa) -->
    ${metaRows.length > 0 ? `
      <table class="kroma-print-meta-table" style="width: 100%; border-collapse: collapse; margin-bottom: 1.15rem; border: 1px solid ${P.POWDER_BLUE}; border-left: 5px solid ${P.BALTIC_BLUE};">
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    ` : ''}
  `;
}

/**
 * Renderiza la tabla de artículos impresos y el cuadro de Resumen de Liquidación con el diseño exacto del recibo Kroma Lab.
 * @param {Object} config
 * @param {Array<{qty: number|string, descriptionHtml: string, measure: string, linearMeters: string, ratePerMeter: string, unitCostRef: string, subtotal: string}>} config.items
 * @param {Object} config.totals - Valores para la fila de TOTALES ({ totalQty, totalMeters, rateLabel, grandTotal }).
 * @param {Array<{label: string, value: string, isGrand?: boolean}>} [config.summaryLines=[]] - Líneas del bloque Resumen de Liquidación.
 * @param {string} [config.leftSlotHtml=''] - Contenido opcional a la izquierda del Resumen de Liquidación.
 */
export function renderKromaReceiptItemsAndSummary({
  items = [],
  totals = { totalQty: '0', totalMeters: '0.00 m', rateLabel: 'Q30.00', grandTotal: 'Q0.00' },
  summaryLines = [],
  leftSlotHtml = '',
}) {
  const P = KROMA_PRINT_PALETTE;

  const bodyRowsHtml = items
    .map((it, idx) => {
      const bg = idx % 2 === 0 ? P.WHITE : P.BG_LIGHT;
      return `
        <tr style="background: ${bg}; border-bottom: 1px solid ${P.POWDER_BLUE};">
          <td style="padding: 0.55rem 0.6rem; text-align: center; font-weight: 700; color: ${P.REGAL_NAVY}; font-size: 0.85rem;">
            ${it.qty}
          </td>
          <td style="padding: 0.55rem 0.65rem; text-align: left; color: ${P.SPACE_INDIGO}; font-size: 0.85rem;">
            ${it.descriptionHtml}
          </td>
          <td style="padding: 0.55rem 0.6rem; text-align: center; color: ${P.TEXT_MUTED}; font-size: 0.84rem; font-family: monospace;">
            ${it.measure}
          </td>
          <td style="padding: 0.55rem 0.6rem; text-align: center; font-weight: 700; color: ${P.CERULEAN}; font-size: 0.85rem; font-family: monospace;">
            ${it.linearMeters}
          </td>
          <td style="padding: 0.55rem 0.6rem; text-align: center; color: ${P.TEXT_MUTED}; font-size: 0.84rem;">
            ${it.ratePerMeter}
          </td>
          <td style="padding: 0.55rem 0.6rem; text-align: center; color: ${P.TEXT_MUTED}; font-size: 0.84rem;">
            ${it.unitCostRef}
          </td>
          <td style="padding: 0.55rem 0.65rem; text-align: right; font-weight: 700; color: ${P.SPACE_INDIGO}; font-size: 0.86rem;">
            ${it.subtotal}
          </td>
        </tr>
      `;
    })
    .join('');

  const summaryRowsHtml = summaryLines
    .map((line) => {
      const lblStyle = line.isGrand
        ? `font-weight: 700; font-size: 0.96rem; color: ${P.SPACE_INDIGO};`
        : `font-weight: 500; font-size: 0.84rem; color: ${P.TEXT_MUTED};`;
      const valStyle = line.isGrand
        ? `font-weight: 800; font-size: 1.08rem; color: ${P.BALTIC_BLUE};`
        : `font-weight: 700; font-size: 0.86rem; color: ${P.SPACE_INDIGO};`;

      return `
        <div style="text-align: right; margin-top: ${line.isGrand ? '0.35rem' : '0.15rem'};">
          <span style="${lblStyle}">${line.label} </span>
          <span style="${valStyle}">${line.value}</span>
        </div>
      `;
    })
    .join('');

  return `
    <!-- 3. TABLA DE ARTÍCULOS IMPRESOS -->
    <table class="workshop-table kroma-receipt-table" style="width: 100%; border-collapse: collapse; margin-bottom: 1.15rem; border-top: 2px solid ${P.SPACE_INDIGO}; border-bottom: 2px solid ${P.SPACE_INDIGO}; border-left: none; border-right: none;">
      <thead>
        <tr style="background: ${P.SPACE_INDIGO}; color: ${P.WHITE};">
          <th style="padding: 0.6rem 0.55rem; text-align: center; font-weight: 700; font-size: 0.82rem; border: none; background: ${P.SPACE_INDIGO}; color: ${P.WHITE};">Cant.</th>
          <th style="padding: 0.6rem 0.65rem; text-align: left; font-weight: 700; font-size: 0.82rem; border: none; background: ${P.SPACE_INDIGO}; color: ${P.WHITE};">Descripción del Artículo</th>
          <th style="padding: 0.6rem 0.55rem; text-align: center; font-weight: 700; font-size: 0.82rem; border: none; background: ${P.SPACE_INDIGO}; color: ${P.WHITE};">Medida</th>
          <th style="padding: 0.6rem 0.55rem; text-align: center; font-weight: 700; font-size: 0.82rem; border: none; background: ${P.SPACE_INDIGO}; color: ${P.WHITE};">Metros Lineales</th>
          <th style="padding: 0.6rem 0.55rem; text-align: center; font-weight: 700; font-size: 0.82rem; border: none; background: ${P.SPACE_INDIGO}; color: ${P.WHITE};">Tarifa / m</th>
          <th style="padding: 0.6rem 0.55rem; text-align: center; font-weight: 700; font-size: 0.82rem; border: none; background: ${P.SPACE_INDIGO}; color: ${P.WHITE};">Costo Unit. Ref.</th>
          <th style="padding: 0.6rem 0.65rem; text-align: right; font-weight: 700; font-size: 0.82rem; border: none; background: ${P.SPACE_INDIGO}; color: ${P.WHITE};">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${bodyRowsHtml}
      </tbody>
      <tfoot>
        <tr style="background: ${P.REGAL_NAVY}; color: ${P.WHITE}; font-weight: 700;">
          <td style="padding: 0.65rem 0.55rem; text-align: center; font-weight: 800; font-size: 0.88rem; border: none; color: ${P.WHITE};">${totals.totalQty}</td>
          <td style="padding: 0.65rem 0.65rem; text-align: left; font-weight: 800; font-size: 0.88rem; border: none; color: ${P.WHITE};">TOTALES</td>
          <td style="padding: 0.65rem 0.55rem; text-align: center; font-weight: 700; font-size: 0.88rem; border: none; color: ${P.WHITE};">—</td>
          <td style="padding: 0.65rem 0.55rem; text-align: center; font-weight: 800; font-size: 0.88rem; font-family: monospace; border: none; color: ${P.WHITE};">${totals.totalMeters}</td>
          <td style="padding: 0.65rem 0.55rem; text-align: center; font-weight: 700; font-size: 0.88rem; border: none; color: ${P.WHITE};">${totals.rateLabel}</td>
          <td style="padding: 0.65rem 0.55rem; text-align: center; font-weight: 700; font-size: 0.88rem; border: none; color: ${P.WHITE};">—</td>
          <td style="padding: 0.65rem 0.65rem; text-align: right; font-weight: 800; font-size: 0.94rem; border: none; color: ${P.WHITE};">${totals.grandTotal}</td>
        </tr>
      </tfoot>
    </table>

    <!-- 4. RESUMEN DE LIQUIDACIÓN Y BLOQUE COMPLEMENTARIO -->
    <div style="display: grid; grid-template-columns: ${leftSlotHtml ? '1.25fr 1fr' : '1fr'}; gap: 1rem; align-items: stretch; margin-bottom: 1rem;">
      ${leftSlotHtml ? `<div>${leftSlotHtml}</div>` : ''}
      <div style="background: ${P.BG_ELEVATED}; border: 1px solid ${P.POWDER_BLUE}; border-left: 4px solid ${P.CERULEAN}; padding: 0.85rem 1.15rem; display: flex; flex-direction: column; justify-content: center; margin-left: ${leftSlotHtml ? '0' : 'auto'}; min-width: min(320px, 100%);">
        <div style="text-align: right; font-weight: 800; font-size: 0.88rem; color: ${P.BALTIC_BLUE}; text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 0.25rem;">
          RESUMEN DE LIQUIDACIÓN
        </div>
        ${summaryRowsHtml}
      </div>
    </div>
  `;
}

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

    // Caso 2: Modal de Hoja de Taller Audley / Recibo de Pedido abierto
    const workshopModal = document.getElementById('workshopSheetModal');
    const workshopContent = document.getElementById('workshopSheetContainer');
    if (workshopModal && workshopModal.style.display !== 'none' && workshopContent && workshopContent.innerHTML.trim()) {
      preparePrintContainer(workshopContent.innerHTML, 'Recibo de Servicio y Orden de Taller UV DTF — Kroma Lab');
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
