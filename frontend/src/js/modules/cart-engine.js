/**
 * Motor de Cálculo Consolidado para Carrito Multidiseño UV DTF
 * Calcula metros lineales agrupados sobre bobina de 28 cm y escalas de mayoreo.
 */

import { BUSINESS_CONFIG, PRICING_TIERS, CUTTING_TIERS } from '../../shared/business-config.js';

export function getTierForMeters(meters) {
  if (meters <= 1.0) return PRICING_TIERS[0];
  const tier = PRICING_TIERS.find(t => meters > t.minMeters && meters <= t.maxMeters);
  return tier || PRICING_TIERS[PRICING_TIERS.length - 1];
}

export function getCuttingUnitRate(qty) {
  const tier = CUTTING_TIERS.find(t => qty <= t.maxQty);
  return tier ? tier.ratePerUnitQ : 0.25;
}

export function calculateCartItemMetrics(item) {
  const w = Math.max(0.1, parseFloat(item.widthCm) || 5);
  const h = Math.max(0.1, parseFloat(item.heightCm) || 5);
  const q = Math.max(1, parseInt(item.qty, 10) || 1);
  const includeCutting = Boolean(item.includeCutting);

  const gap = BUSINESS_CONFIG.marginBetweenCm;
  const printableWidth = BUSINESS_CONFIG.printableWidthCm;

  const stickersPerRow = Math.max(1, Math.floor((printableWidth + gap) / (w + gap)));
  const rows = Math.ceil(q / stickersPerRow);
  const physicalLengthCm = Math.max(0, (rows * (h + gap)) - gap);
  const actualLinearMeters = physicalLengthCm / 100.0;

  const cuttingRateUnit = getCuttingUnitRate(q);
  const cuttingRawQ = includeCutting ? Math.round(q * cuttingRateUnit * 100) / 100 : 0;

  return {
    ...item,
    widthCm: w,
    heightCm: h,
    qty: q,
    includeCutting,
    stickersPerRow,
    rows,
    physicalLengthCm: Math.round(physicalLengthCm * 100) / 100,
    actualLinearMeters: Math.round(actualLinearMeters * 1000) / 1000,
    cuttingRateUnit,
    cuttingRawQ,
  };
}

export function calculateCartTotals(items = []) {
  if (!items || items.length === 0) {
    return {
      items: [],
      totalItemsCount: 0,
      totalStickers: 0,
      totalPhysicalLengthCm: 0,
      totalActualLinearMeters: 0,
      totalBillableMeters: 0,
      isUnderMin: false,
      tierRate: BUSINESS_CONFIG.minimumBasePriceQ,
      materialTotalQ: 0,
      hasCutting: false,
      cuttingTotalRawQ: 0,
      isCuttingMinApplied: false,
      cuttingTotalQ: 0,
      grandTotalQ: 0,
    };
  }

  const enrichedItems = items.map(calculateCartItemMetrics);

  const totalItemsCount = enrichedItems.length;
  const totalStickers = enrichedItems.reduce((acc, i) => acc + i.qty, 0);
  const totalPhysicalLengthCm = Math.round(enrichedItems.reduce((acc, i) => acc + i.physicalLengthCm, 0) * 100) / 100;
  const totalActualLinearMeters = Math.round((totalPhysicalLengthCm / 100.0) * 1000) / 1000;

  const isUnderMin = totalActualLinearMeters < BUSINESS_CONFIG.minimumBillableMeters;
  const totalBillableMeters = isUnderMin 
    ? BUSINESS_CONFIG.minimumBillableMeters 
    : Math.round(totalActualLinearMeters * 100) / 100;

  const tier = getTierForMeters(totalBillableMeters);
  const tierRate = tier.ratePerMeterQ;

  const materialTotalQ = Math.round(totalBillableMeters * tierRate * 100) / 100;

  const hasCutting = enrichedItems.some(i => i.includeCutting);
  const cuttingTotalRawQ = Math.round(enrichedItems.reduce((acc, i) => acc + i.cuttingRawQ, 0) * 100) / 100;

  let cuttingTotalQ = 0;
  let isCuttingMinApplied = false;

  if (hasCutting) {
    if (cuttingTotalRawQ < BUSINESS_CONFIG.cuttingMinimumQ) {
      cuttingTotalQ = BUSINESS_CONFIG.cuttingMinimumQ;
      isCuttingMinApplied = true;
    } else {
      cuttingTotalQ = cuttingTotalRawQ;
    }
  }

  const grandTotalQ = Math.round((materialTotalQ + cuttingTotalQ) * 100) / 100;

  return {
    items: enrichedItems,
    totalItemsCount,
    totalStickers,
    totalPhysicalLengthCm,
    totalActualLinearMeters,
    totalBillableMeters,
    isUnderMin,
    tierRate,
    materialTotalQ,
    hasCutting,
    cuttingTotalRawQ,
    isCuttingMinApplied,
    cuttingTotalQ,
    grandTotalQ,
  };
}

export function formatWhatsAppCartOrder(cartTotals, customer = {}) {
  const { items, totalBillableMeters, tierRate, grandTotalQ, hasCutting, cuttingTotalQ, isUnderMin } = cartTotals;

  let msg = `*KROMA LAB — Pedido de Impresión UV DTF*\n\n`;
  msg += `Deseo confirmar el siguiente pedido:\n\n`;

  if (customer.name || customer.company) {
    msg += `• *Cliente:* ${customer.name || customer.company}\n`;
    if (customer.nit) msg += `• *NIT:* ${customer.nit}\n`;
    if (customer.phone) msg += `• *Teléfono:* ${customer.phone}\n`;
    if (customer.address) msg += `• *Dirección:* ${customer.address}\n`;
    msg += `\n`;
  }

  msg += `*DETALLE DE DISEÑOS EN PEDIDO:*\n`;
  items.forEach((item, index) => {
    const cutText = item.includeCutting ? `Con corte individual (Q${item.cuttingRateUnit} c/u)` : `En rollo continuo`;
    const fileName = item.fileInfo?.name ? ` [Archivo: ${item.fileInfo.name}]` : ` [Sin archivo adjunto]`;
    msg += `${index + 1}. *${item.title || `Diseño #${index + 1}`}*:\n`;
    msg += `   • Medida: ${item.widthCm} × ${item.heightCm} cm\n`;
    msg += `   • Cantidad: ${item.qty} stickers\n`;
    msg += `   • Acabado: ${cutText}${fileName}\n`;
    msg += `   • Acomodo: ${item.stickersPerRow}/fila (${item.rows} filas, ${(item.actualLinearMeters).toFixed(2)}m)\n`;
    const clientArtUrl = item.fileInfo?.fileUrl || item.fileUrl;
    if (clientArtUrl) {
      msg += `   • 🖼️ *Arte del cliente:* ${clientArtUrl}\n`;
    }
    const snapUrl = item.canvasSnapshotUrl || (item.canvasSnapshot && !item.canvasSnapshot.startsWith('data:') ? item.canvasSnapshot : null);
    if (snapUrl) {
      msg += `   • 📐 *Montaje en bobina:* ${snapUrl}\n`;
    }
    msg += `\n`;
  });

  msg += `*CONSOLIDADO DE PRODUCCIÓN:*\n`;
  msg += `• *Metros Lineales Facturables:* ${totalBillableMeters.toFixed(2)} m ${isUnderMin ? '(Mínimo 1m)' : ''}\n`;
  msg += `• *Escala de Tarifa:* Q${tierRate.toFixed(2)} / metro\n`;
  if (hasCutting) {
    msg += `• *Servicio de Corte:* +Q${cuttingTotalQ.toFixed(2)}\n`;
  }
  msg += `• *TOTAL ESTIMADO:* Q${grandTotalQ.toFixed(2)}\n\n`;
  if (customer.notes) {
    msg += `• *Notas:* ${customer.notes}\n\n`;
  }
  if (customer.paymentReceiptUrl) {
    msg += `• 🧾 *Comprobante de Pago:* ${customer.paymentReceiptUrl}\n\n`;
  }
  if (customer.paymentReceiptUrl) {
    msg += `Adjunto mi comprobante para revisión y confirmación a producción. ¡Gracias!`;
  } else {
    msg += `¿Me confirman tiempos de entrega y métodos de pago (transferencia/depósito)? Gracias.`;
  }

  return msg;
}
