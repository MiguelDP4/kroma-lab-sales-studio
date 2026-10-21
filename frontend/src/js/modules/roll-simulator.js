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
 * Si se proporciona imageElement cargado, dibuja el arte del usuario en cada sticker.
 * Permite rotar el diseño 90°, 180° o 270° sobre el eje del sticker.
 * @param {HTMLCanvasElement} canvas
 * @param {object} quote Resultado de calculateQuote
 * @param {boolean} [isDark=true]
 * @param {HTMLImageElement|ImageBitmap|HTMLCanvasElement|null} [imageElement=null]
 * @param {number} [rotationDeg=0] Rotación en grados (0, 90, 180, 270)
 */
export function drawRollCanvas(canvas, quote, isDark = true, imageElement = null, rotationDeg = 0) {
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

  // Validar si la imagen está lista para dibujarse
  const hasImage = Boolean(
    imageElement &&
    (imageElement.complete === undefined || imageElement.complete) &&
    (imageElement.naturalWidth === undefined || imageElement.naturalWidth > 0 || imageElement.width > 0)
  );

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

      if (hasImage) {
        // Recorte redondeado del sticker para la imagen del cliente
        if (ctx.save) ctx.save();
        roundRect(ctx, x, y, stickerWidthPx, stickerHeightPx, 4, false, false);
        if (ctx.clip) ctx.clip();
        try {
          if (ctx.drawImage) {
            const rot = Number(rotationDeg) || 0;
            if (rot % 360 !== 0) {
              const centerX = x + (stickerWidthPx / 2);
              const centerY = y + (stickerHeightPx / 2);
              if (ctx.translate) ctx.translate(centerX, centerY);
              if (ctx.rotate) ctx.rotate((rot * Math.PI) / 180);
              const isSwapped = (rot % 180 !== 0);
              const drawW = isSwapped ? stickerHeightPx : stickerWidthPx;
              const drawH = isSwapped ? stickerWidthPx : stickerHeightPx;
              ctx.drawImage(imageElement, -drawW / 2, -drawH / 2, drawW, drawH);
            } else {
              ctx.drawImage(imageElement, x, y, stickerWidthPx, stickerHeightPx);
            }
          }
        } catch (_) {
          ctx.fillStyle = isDark ? 'rgba(28, 114, 147, 0.45)' : 'rgba(6, 90, 130, 0.35)';
          ctx.fillRect(x, y, stickerWidthPx, stickerHeightPx);
        }
        if (ctx.restore) ctx.restore();

        // Contorno exterior fino (guía visual de troquelado/corte)
        ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.6)' : 'rgba(2, 132, 199, 0.7)';
        ctx.lineWidth = 1;
        roundRect(ctx, x, y, stickerWidthPx, stickerHeightPx, 4, false, true);

        // Simulación de relieve y brillo de barniz UV DTF
        ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.fillRect(x + 2, y + 2, Math.max(2, stickerWidthPx * 0.4), 3);
      } else {
        roundRect(ctx, x, y, stickerWidthPx, stickerHeightPx, 4, true, true);

        // Simulación de brillo de barniz UV
        ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.fillRect(x + 2, y + 2, Math.max(2, stickerWidthPx * 0.4), 3);
        ctx.fillStyle = isDark ? 'rgba(28, 114, 147, 0.45)' : 'rgba(6, 90, 130, 0.35)';
      }

      drawnCount++;
    }
  }

  // Regla métrica inferior
  ctx.fillStyle = isDark ? '#6b7c96' : '#64748b';
  ctx.font = '10px monospace';
  ctx.fillText('0 cm', paddingX, height - 4);
  ctx.fillText('28 cm útiles', width - paddingX - 65, height - 4);
}

/**
 * Genera una imagen snapshot (data URL) del canvas de la bobina con cabecera técnica
 * que detalla ancho, alto, cantidad y disposición actual para el operador de taller.
 * @param {HTMLCanvasElement} sourceCanvas
 * @param {object} quote
 * @returns {string|null} Data URL en formato image/png
 */
export function generateCanvasSnapshot(sourceCanvas, quote) {
  if (!sourceCanvas || !quote) return null;

  try {
    const width = sourceCanvas.width || 580;
    const height = sourceCanvas.height || 200;
    const bannerHeight = 64;

    const offscreen = typeof document !== 'undefined' && document.createElement
      ? document.createElement('canvas')
      : null;

    if (!offscreen) {
      return typeof sourceCanvas.toDataURL === 'function' ? sourceCanvas.toDataURL('image/png') : null;
    }

    offscreen.width = width;
    offscreen.height = height + bannerHeight;

    const ctx = offscreen.getContext ? offscreen.getContext('2d') : null;
    if (!ctx) {
      return typeof sourceCanvas.toDataURL === 'function' ? sourceCanvas.toDataURL('image/png') : null;
    }

    // Fondo del encabezado técnico
    ctx.fillStyle = '#090e1c';
    ctx.fillRect(0, 0, width, bannerHeight);

    // Borde inferior del encabezado
    ctx.fillStyle = '#1c7293';
    ctx.fillRect(0, bannerHeight - 2, width, 2);

    // Título / Marca
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
    ctx.fillText('KROMA LAB — DISPOSICIÓN EN BOBINA AUDLEY (28 CM)', 14, 22);

    // Medidas y tiraje
    ctx.fillStyle = '#f8fafc';
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    const meters = Number(quote.billableMeters || quote.linearMeters || 1.0).toFixed(2);
    const specsText = `${quote.widthCm} × ${quote.heightCm} cm  |  ${quote.qty} copias  |  ${quote.stickersPerRow} por fila  |  ${meters} m`;
    ctx.fillText(specsText, 14, 44);

    // Fecha / Tag
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    const dateStr = new Date().toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    ctx.fillText(`FECHA: ${dateStr}`, Math.max(14, width - 120), 44);

    // Dibujar el canvas original debajo
    if (ctx.drawImage) {
      ctx.drawImage(sourceCanvas, 0, bannerHeight);
    }

    return typeof offscreen.toDataURL === 'function' ? offscreen.toDataURL('image/png') : null;
  } catch (_) {
    return null;
  }
}
