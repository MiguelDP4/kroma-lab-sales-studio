/**
 * Motor puro de cálculo matemático para cotización de impresión UV DTF.
 * Sin dependencias de DOM ni librerías externas para permitir testing unitario al 100%.
 */

import { BUSINESS_CONFIG, PRICING_TIERS, CUTTING_TIERS } from '../../shared/business-config.js';

/**
 * Obtiene la tarifa por metro lineal según la cantidad de metros calculados.
 * @param {number} meters 
 * @returns {number} Tarifa en Quetzales por metro
 */
export function getTierRate(meters) {
  if (meters < 2.0) return 150.0;
  for (const tier of PRICING_TIERS) {
    if (meters >= tier.minMeters && meters < tier.maxMeters) {
      return tier.ratePerMeterQ;
    }
  }
  return 95.0; // Fallback mayoreo 20+ m
}

/**
 * Obtiene el costo unitario de corte por pieza según el volumen de unidades.
 * @param {number} qty 
 * @returns {number} Costo por pieza en Quetzales
 */
export function getCuttingRate(qty) {
  for (const tier of CUTTING_TIERS) {
    if (qty <= tier.maxQty) {
      return tier.ratePerUnitQ;
    }
  }
  return 0.25;
}

/**
 * Valida y normaliza las dimensiones solicitadas.
 * @param {number} widthCm 
 * @param {number} heightCm 
 * @param {number} qty 
 * @returns {{ width: number, height: number, qty: number }}
 */
export function validateDimensions(widthCm, heightCm, qty) {
  let w = parseFloat(widthCm) || 5.0;
  let h = parseFloat(heightCm) || 5.0;
  let q = parseInt(qty, 10) || 50;

  if (w > BUSINESS_CONFIG.printableWidthCm) {
    w = BUSINESS_CONFIG.printableWidthCm;
  }
  if (w < 0.5) w = 0.5;
  if (h < 0.5) h = 0.5;
  if (q < 1) q = 1;

  return { width: w, height: h, qty: q };
}

/**
 * Realiza el cálculo integral de cotización de impresión UV DTF.
 * @param {object} params
 * @param {number} params.widthCm Ancho del sticker en cm
 * @param {number} params.heightCm Alto del sticker en cm
 * @param {number} params.qty Cantidad de stickers
 * @param {boolean} [params.includeCutting=false] Si incluye despiece/corte de precisión
 * @returns {object} Detalle financiero y técnico de la cotización
 */
export function calculateQuote({ widthCm, heightCm, qty, includeCutting = false }) {
  const valid = validateDimensions(widthCm, heightCm, qty);
  const w = valid.width;
  const h = valid.height;
  const q = valid.qty;

  const rollWidth = BUSINESS_CONFIG.printableWidthCm;
  const gap = BUSINESS_CONFIG.marginBetweenCm;

  // Cantidad de piezas por fila a lo ancho de los 28 cm útiles
  const stickersPerRow = Math.max(1, Math.floor((rollWidth + gap) / (w + gap)));
  const rows = Math.ceil(q / stickersPerRow);
  const maxInCurrentRows = rows * stickersPerRow;
  const isRowIncomplete = stickersPerRow > 1 && q < maxInCurrentRows;
  const unusedInLastRow = isRowIncomplete ? (maxInCurrentRows - q) : 0;
  const optimalQty = maxInCurrentRows;

  // Largo físico en centímetros
  const physicalLengthCm = Math.max(0, (rows * (h + gap)) - gap);
  const actualLinearMeters = physicalLengthCm / 100.0;

  // Cantidad máxima de stickers que caben en 1 metro exacto de esa medida
  const rowsInOneMeter = Math.max(1, Math.floor((100.0 + gap) / (h + gap)));
  const maxInOneMeter = rowsInOneMeter * stickersPerRow;

  // Metros facturables (piso mínimo de 1.0 m)
  const isUnderMin = actualLinearMeters < BUSINESS_CONFIG.minimumBillableMeters;
  const billableMeters = Math.max(BUSINESS_CONFIG.minimumBillableMeters, actualLinearMeters);

  // Tarifa por metro
  const tierRate = getTierRate(actualLinearMeters);

  // Costo de impresión base
  let materialPrice = actualLinearMeters <= 1.0 
    ? BUSINESS_CONFIG.minimumBasePriceQ 
    : actualLinearMeters * tierRate;

  if (materialPrice < BUSINESS_CONFIG.minimumBasePriceQ) {
    materialPrice = BUSINESS_CONFIG.minimumBasePriceQ;
  }

  // Costo opcional de corte de precisión
  const cuttingRateUnit = getCuttingRate(q);
  const rawCuttingCost = q * cuttingRateUnit;
  const isCuttingMinApplied = includeCutting && rawCuttingCost < BUSINESS_CONFIG.cuttingMinimumQ;
  const effectiveCuttingCost = Math.max(BUSINESS_CONFIG.cuttingMinimumQ, rawCuttingCost);
  const cuttingTotal = includeCutting ? effectiveCuttingCost : 0.0;

  // Totales
  const totalPriceQ = materialPrice + cuttingTotal;
  const unitPriceQ = totalPriceQ / q;

  return {
    widthCm: w,
    heightCm: h,
    qty: q,
    stickersPerRow,
    rows,
    physicalLengthCm,
    actualLinearMeters,
    billableMeters,
    isUnderMin,
    maxInOneMeter,
    tierRate,
    materialPriceQ: Number(materialPrice.toFixed(2)),
    includeCutting,
    cuttingRateUnit,
    cuttingTotalQ: Number(cuttingTotal.toFixed(2)),
    isCuttingMinApplied,
    totalPriceQ: Number(totalPriceQ.toFixed(2)),
    unitPriceQ: Number(unitPriceQ.toFixed(2)),
    maxInCurrentRows,
    isRowIncomplete,
    unusedInLastRow,
    optimalQty,
  };
}
