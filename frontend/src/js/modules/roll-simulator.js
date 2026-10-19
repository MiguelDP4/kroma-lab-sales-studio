/**
 * Simulador gráfico en Canvas de la bobina de impresión industrial Audley (28 cm útiles).
 */

import { BUSINESS_CONFIG } from '../../shared/business-config.js';

/**
 * Dibuja un rectángulo con esquinas redondeadas en el contexto 2D.
 */
export function roundRect(ctx, x, y, width, height, radius, fill = true, stroke = true) {
  let r = radius;
  if (width < 2 * r) r = width / 2;
  if (height < 2 * r) r = height / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

/**
 * Renderiza los stickers en el Canvas respetando proporciones reales.
 * @param {HTMLCanvasElement} canvas
 * @param {object} quote Resultado de calculateQuote
 * @param {boolean} [isDark=true]
 */
export function drawRollCanvas(canvas, quote, isDark = true) {
  if (!canvas || !quote) return;
  const ctx = canvas.getContext ? canvas.getContext('2d') : null;
  if (!ctx) return;

  const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
  const rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { width: 580, height: 200 };
  const width = rect.width || 580;
  const height = 200;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  // Limpiar
  ctx.clearRect(0, 0, width, height);

  // Fondo de bobina
  ctx.fillStyle = isDark ? '#090e1c' : '#e2e8f0';
  ctx.fillRect(0, 0, width, height);

  // Escala: 28 cm útiles en el ancho del canvas con margen visual
  const paddingX = 20;
  const availableWidthPx = width - (paddingX * 2);
  const scale = availableWidthPx / BUSINESS_CONFIG.printableWidthCm;

  const stickerWidthPx = quote.widthCm * scale;
  const stickerHeightPx = quote.heightCm * scale;
  const gapPx = BUSINESS_CONFIG.marginBetweenCm * scale;

  // Borde de área útil imprimible (28 cm)
  ctx.strokeStyle = isDark ? 'rgba(158, 179, 194, 0.25)' : 'rgba(27, 59, 111, 0.2)';
  ctx.lineWidth = 1;
  if (ctx.setLineDash) ctx.setLineDash([4, 4]);
  ctx.strokeRect(paddingX, 10, availableWidthPx, height - 20);
  if (ctx.setLineDash) ctx.setLineDash([]);

  // Dibujar stickers
  const itemsPerRow = quote.stickersPerRow;
  let drawnCount = 0;
  const maxDrawRows = Math.ceil(height / (stickerHeightPx + gapPx)) + 1;

  // Centrado horizontal en el ancho útil de la bobina (28 cm)
  const totalRowWidthPx = itemsPerRow > 0
    ? (itemsPerRow * stickerWidthPx) + (Math.max(0, itemsPerRow - 1) * gapPx)
    : 0;
  const centerOffsetX = Math.max(0, (availableWidthPx - totalRowWidthPx) / 2);
  const startX = paddingX + centerOffsetX;

  ctx.fillStyle = isDark ? 'rgba(28, 114, 147, 0.45)' : 'rgba(6, 90, 130, 0.35)';
  ctx.strokeStyle = isDark ? '#1c7293' : '#065a82';
  ctx.lineWidth = 1.5;

  for (let r = 0; r < quote.rows && r < maxDrawRows; r++) {
    for (let c = 0; c < itemsPerRow; c++) {
      if (drawnCount >= quote.qty) break;

      const x = startX + (c * (stickerWidthPx + gapPx));
      const y = 15 + (r * (stickerHeightPx + gapPx));

      roundRect(ctx, x, y, stickerWidthPx, stickerHeightPx, 4, true, true);

      // Simulación de brillo de barniz UV
      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.fillRect(x + 2, y + 2, Math.max(2, stickerWidthPx * 0.4), 3);
      ctx.fillStyle = isDark ? 'rgba(28, 114, 147, 0.45)' : 'rgba(6, 90, 130, 0.35)';

      drawnCount++;
    }
  }

  // Regla métrica inferior
  ctx.fillStyle = isDark ? '#6b7c96' : '#64748b';
  ctx.font = '10px monospace';
  ctx.fillText('0 cm', paddingX, height - 4);
  ctx.fillText('28 cm útiles', width - paddingX - 65, height - 4);
}
