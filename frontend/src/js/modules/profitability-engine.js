/**
 * Motor de Costos Industriales y Rentabilidad Unitaria UV DTF (Audley 28 cm útiles).
 * Desglosa insumos (Film A, Film B, Tintas CMYK/White/Varnish), energía, depreciación de cabezales,
 * mano de obra y corte para calcular margen bruto, utilidad neta por metro y ganancia unitaria por pieza.
 */

import { PRICING_TIERS, CUTTING_TIERS, ORDER_STATUS } from '../../shared/business-config.js';
import { calculateQuote } from './quoter-engine.js';

export const STORAGE_KEY_COSTS = 'kromalab_costs_config';

export const DEFAULT_COSTS_CONFIG = {
  // Bobina Film A Base (PET imprimible de alta adherencia)
  filmARoll100mQ: 600.0,       // Q600.00 por rollo de 100 metros
  filmAMarginFactor: 1.05,      // 5% de excedente por montaje y arrastre de tracción

  // Bobina Film B (Film transfer calandrado con adhesivo térmico)
  filmBRoll100mQ: 400.0,       // Q400.00 por rollo de 100 metros
  filmBMarginFactor: 1.02,      // 2% de excedente por calandrado

  // Tintas UV Industriales de Alta Densidad (Envase de 1 Litro / 1,000 ml)
  inkLiterCostQ: 550.0,        // Q550.00 por litro (Q0.55 por ml)
  cmykMlPerMeter: 4.0,         // Consumo promedio CMYK (ml/m)
  whiteMlPerMeter: 6.0,        // Consumo cama blanca fotográfica (ml/m)
  varnishMlPerMeter: 5.0,      // Consumo barniz táctil de relieve 3D (ml/m)

  // Gastos Operativos y de Maquinaria
  electricityCostPerMeterQ: 1.20, // Consumo energético lámparas UV LED + calandra + motor
  maintenanceCostPerMeterQ: 2.00, // Depreciación cabezales i3200 + wipers + dampers + capping
  operatorLaborPerMeterQ: 4.00,   // Costo operativo de impresión y rebobinado por metro
  cuttingCostPerStickerQ: 0.08,   // Desgaste de navajas y despiece individual por sticker

  // Meta Estratégica de Flujo Mensual
  monthlyTargetNetProfitQ: 20000.0, // Meta de ganancia neta mensual (Q19,000 - Q22,000)
};

/**
 * Obtiene la configuración de costos guardada o los valores predeterminados.
 * @returns {Object} Configuración activa
 */
export function getCostsConfig() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY_COSTS);
      if (saved) {
        return { ...DEFAULT_COSTS_CONFIG, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Error al leer configuración de costos de localStorage:', e);
    }
  }
  return { ...DEFAULT_COSTS_CONFIG };
}

/**
 * Guarda una nueva configuración de costos en localStorage.
 * @param {Object} newConfig Parámetros de costos actualizados
 * @returns {Object} Configuración guardada
 */
export function saveCostsConfig(newConfig) {
  const merged = { ...DEFAULT_COSTS_CONFIG, ...newConfig };
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY_COSTS, JSON.stringify(merged));
    } catch (e) {
      console.warn('Error al guardar configuración de costos en localStorage:', e);
    }
  }
  return merged;
}

/**
 * Restablece la configuración de costos a los valores predeterminados de fábrica.
 * @returns {Object} Configuración por defecto
 */
export function resetCostsConfig() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(STORAGE_KEY_COSTS);
    } catch (_) {}
  }
  return { ...DEFAULT_COSTS_CONFIG };
}

/**
 * Determina el precio de venta sugerido por metro lineal según escala de volumen.
 * @param {number} meters Metros lineales
 * @returns {number} Precio de venta por metro (Q)
 */
export function getSuggestedPricePerMeter(meters = 1.0) {
  const m = Math.max(0.1, parseFloat(meters) || 1.0);
  if (m < 2.0) return 150.0;
  const tier = PRICING_TIERS.find(t => m >= t.minMeters && m < t.maxMeters);
  return tier ? tier.ratePerMeterQ : 95.0;
}

/**
 * Determina la tarifa de corte sugerida por pieza según escala.
 * @param {number} qty Cantidad de piezas
 * @returns {number} Tarifa unitaria de corte (Q/pieza)
 */
export function getSuggestedCuttingRate(qty = 50) {
  const q = Math.max(1, parseInt(qty, 10) || 50);
  const tier = CUTTING_TIERS.find(t => q <= t.maxQty);
  return tier ? tier.ratePerUnitQ : 0.30;
}

/**
 * Calcula el desglose detallado de costos y rentabilidad para un tiraje específico.
 * @param {Object} params
 * @param {number} [params.meters=1.0] Metros lineales facturables
 * @param {number} [params.stickersCount=50] Total de piezas producidas
 * @param {boolean} [params.hasCutting=false] Si incluye corte individual perimetral
 * @param {string} [params.finishType='Barniz con Relieve 3D'] Tipo de acabado
 * @param {number} [params.customSellingPriceQ] Precio de venta total personalizado (opcional)
 * @param {Object} [params.customCosts] Sobreescritura opcional de costos base
 * @returns {Object} Desglose financiero, costos unitarios y márgenes
 */
export function calculatePrintRunCost({
  meters = 1.0,
  stickersCount = 50,
  hasCutting = false,
  finishType = 'Barniz con Relieve 3D',
  customSellingPriceQ = null,
  customCosts = null,
} = {}) {
  const cfg = customCosts ? { ...getCostsConfig(), ...customCosts } : getCostsConfig();

  const m = Math.max(0.01, parseFloat(meters) || 1.0);
  const totalPieces = Math.max(1, parseInt(stickersCount, 10) || 1);

  // 1. Costo de Film A (Base PET)
  const filmACostPerMeter = (cfg.filmARoll100mQ / 100) * cfg.filmAMarginFactor;
  const filmACostTotalQ = filmACostPerMeter * m;

  // 2. Costo de Film B (Transferencia)
  const filmBCostPerMeter = (cfg.filmBRoll100mQ / 100) * cfg.filmBMarginFactor;
  const filmBCostTotalQ = filmBCostPerMeter * m;

  // 3. Costo de Tintas UV (CMYK, Blanco Fotográfico, Barniz 3D)
  const inkPricePerMl = cfg.inkLiterCostQ / 1000;
  const cmykMl = cfg.cmykMlPerMeter * m;
  const whiteMl = cfg.whiteMlPerMeter * m;

  const hasVarnish = !finishType || !finishType.toLowerCase().includes('sin barniz') && !finishType.toLowerCase().includes('mate');
  const varnishMl = hasVarnish ? cfg.varnishMlPerMeter * m : 0;

  const cmykCostQ = cmykMl * inkPricePerMl;
  const whiteCostQ = whiteMl * inkPricePerMl;
  const varnishCostQ = varnishMl * inkPricePerMl;
  const totalInkCostQ = cmykCostQ + whiteCostQ + varnishCostQ;

  // 4. Costos Operativos y de Maquinaria
  const electricityCostTotalQ = cfg.electricityCostPerMeterQ * m;
  const maintenanceCostTotalQ = cfg.maintenanceCostPerMeterQ * m;
  const operatorLaborTotalQ = cfg.operatorLaborPerMeterQ * m;

  // 5. Costo de Mano de Obra / Despiece de Corte (si aplica)
  const cuttingCostTotalQ = hasCutting ? cfg.cuttingCostPerStickerQ * totalPieces : 0;

  // 6. Costo Total de Producción
  const totalProductionCostQ =
    filmACostTotalQ +
    filmBCostTotalQ +
    totalInkCostQ +
    electricityCostTotalQ +
    maintenanceCostTotalQ +
    operatorLaborTotalQ +
    cuttingCostTotalQ;

  const costPerMeterQ = totalProductionCostQ / m;
  const costPerStickerQ = totalProductionCostQ / totalPieces;

  // 7. Precio de Venta y Margen Comercial
  let sellingPriceTotalQ;
  let materialSellingQ;
  let cuttingSellingQ = 0;

  if (customSellingPriceQ !== null && customSellingPriceQ !== undefined && !isNaN(customSellingPriceQ)) {
    sellingPriceTotalQ = Math.max(0, parseFloat(customSellingPriceQ));
    materialSellingQ = sellingPriceTotalQ;
  } else {
    const ratePerMeter = getSuggestedPricePerMeter(m);
    materialSellingQ = ratePerMeter * m;
    if (hasCutting) {
      const cuttingRate = getSuggestedCuttingRate(totalPieces);
      cuttingSellingQ = Math.max(25.0, cuttingRate * totalPieces); // Mínimo Q25 de corte
    }
    sellingPriceTotalQ = materialSellingQ + cuttingSellingQ;
  }

  const netProfitQ = sellingPriceTotalQ - totalProductionCostQ;
  const profitMarginPercent = sellingPriceTotalQ > 0 ? (netProfitQ / sellingPriceTotalQ) * 100 : 0;
  const profitPerMeterQ = netProfitQ / m;
  const profitPerStickerQ = netProfitQ / totalPieces;

  // Calificación del margen de rentabilidad
  let profitabilityTier = 'EXCELLENT'; // > 70%
  let profitabilityBadge = '🟢 Excelente (>70%)';
  let badgeColor = '#10b981';

  if (profitMarginPercent < 50) {
    profitabilityTier = 'LOW';
    profitabilityBadge = '🔴 Margen Ajustado (<50%)';
    badgeColor = '#ef4444';
  } else if (profitMarginPercent < 70) {
    profitabilityTier = 'HEALTHY';
    profitabilityBadge = '🟡 Saludable (50-70%)';
    badgeColor = '#f59e0b';
  }

  // Porcentaje de desglose de costo para gráficos o barras visuales
  const consumablesCostQ = filmACostTotalQ + filmBCostTotalQ + totalInkCostQ;
  const operationsCostQ = electricityCostTotalQ + maintenanceCostTotalQ + operatorLaborTotalQ + cuttingCostTotalQ;

  return {
    meters: m,
    stickersCount: totalPieces,
    hasCutting,
    finishType,
    hasVarnish,
    costs: {
      filmA: filmACostTotalQ,
      filmB: filmBCostTotalQ,
      inkCmyk: cmykCostQ,
      inkWhite: whiteCostQ,
      inkVarnish: varnishCostQ,
      totalInk: totalInkCostQ,
      electricity: electricityCostTotalQ,
      maintenance: maintenanceCostTotalQ,
      labor: operatorLaborTotalQ,
      cutting: cuttingCostTotalQ,
      totalProductionCostQ,
      consumablesCostQ,
      operationsCostQ,
      costPerMeterQ,
      costPerStickerQ,
    },
    pricing: {
      materialSellingQ,
      cuttingSellingQ,
      sellingPriceTotalQ,
    },
    profitability: {
      netProfitQ,
      profitMarginPercent,
      profitPerMeterQ,
      profitPerStickerQ,
      profitabilityTier,
      profitabilityBadge,
      badgeColor,
    },
    metricsSummary: {
      totalInkVarsMl: cmykMl + whiteMl + varnishMl,
      filmAMeters: m * cfg.filmAMarginFactor,
      filmBMeters: m * cfg.filmBMarginFactor,
    },
  };
}

/**
 * Calcula la rentabilidad y simulación de descuentos a partir de dimensiones de sticker y piezas,
 * emulando el cotizador oficial de Kroma Lab para determinar metros lineales en bobina de 28cm.
 * @param {Object} params
 * @param {number} [params.widthCm=5.0] Ancho del sticker en cm
 * @param {number} [params.heightCm=5.0] Alto del sticker en cm
 * @param {number} [params.qty=100] Cantidad de stickers
 * @param {string} [params.finishType='Barniz con Relieve 3D'] Tipo de acabado
 * @param {boolean} [params.includeCutting=false] Si incluye servicio de corte perimetral
 * @param {number} [params.customSellingPriceQ=null] Precio de venta negociado/ofrecido (opcional)
 * @param {Object} [params.customCosts=null] Sobrescritura de costos base
 * @returns {Object} Desglose completo técnico, cotización base y análisis de descuento
 */
export function calculateStickerProfitability({
  widthCm = 5.0,
  heightCm = 5.0,
  qty = 100,
  finishType = 'Barniz con Relieve 3D',
  includeCutting = false,
  customSellingPriceQ = null,
  customCosts = null,
} = {}) {
  const quote = calculateQuote({ widthCm, heightCm, qty, includeCutting });
  const productionMeters = Math.max(0.01, quote.actualLinearMeters);
  const listPriceTotalQ = quote.totalPriceQ;

  const hasCustomPrice = customSellingPriceQ !== null &&
    customSellingPriceQ !== undefined &&
    customSellingPriceQ !== '' &&
    !isNaN(customSellingPriceQ);

  const effectiveSellingPriceQ = hasCustomPrice
    ? Math.max(0, parseFloat(customSellingPriceQ))
    : listPriceTotalQ;

  const runCost = calculatePrintRunCost({
    meters: productionMeters,
    stickersCount: quote.qty,
    hasCutting: includeCutting,
    finishType,
    customSellingPriceQ: effectiveSellingPriceQ,
    customCosts,
  });

  const discountAmountQ = Math.max(0, listPriceTotalQ - effectiveSellingPriceQ);
  const discountPercent = listPriceTotalQ > 0 ? (discountAmountQ / listPriceTotalQ) * 100 : 0;
  const isDiscountApplied = discountAmountQ > 0.05;

  const listCostQ = runCost.costs.totalProductionCostQ;
  const listNetProfitQ = listPriceTotalQ - listCostQ;
  const listMarginPercent = listPriceTotalQ > 0 ? (listNetProfitQ / listPriceTotalQ) * 100 : 0;

  let discountAdvice = '🟢 Precio de lista oficial (Margen óptimo)';
  let adviceColor = '#10b981';

  if (isDiscountApplied) {
    if (runCost.profitability.profitMarginPercent >= 70) {
      discountAdvice = '🟢 Descuento seguro: el margen se mantiene por encima del 70%';
      adviceColor = '#10b981';
    } else if (runCost.profitability.profitMarginPercent >= 50) {
      discountAdvice = '🟡 Descuento aceptable para cliente B2B recurrente (Margen 50-70%)';
      adviceColor = '#f59e0b';
    } else {
      discountAdvice = '🔴 Alerta: este descuento reduce el margen a menos del 50%';
      adviceColor = '#ef4444';
    }
  }

  return {
    quote,
    runCost,
    productionMeters,
    pricingComparison: {
      listPriceTotalQ,
      listNetProfitQ,
      listMarginPercent,
      offeredPriceTotalQ: effectiveSellingPriceQ,
      discountAmountQ,
      discountPercent,
      isDiscountApplied,
      discountAdvice,
      adviceColor,
    },
    costs: runCost.costs,
    profitability: runCost.profitability,
    netProfitQ: runCost.profitability.netProfitQ,
    profitMarginPercent: runCost.profitability.profitMarginPercent,
    profitPerStickerQ: runCost.profitability.profitPerStickerQ,
    costPerStickerQ: runCost.costs.costPerStickerQ,
  };
}

/**
 * Calcula la rentabilidad de un pedido existente en ordersStore.
 * @param {Object} order Pedido
 * @param {Object} [customCosts=null]
 * @returns {Object} Desglose de rentabilidad de la orden
 */
export function calculateOrderProfitability(order, customCosts = null) {
  if (!order || !order.metrics) {
    return calculatePrintRunCost({ customCosts });
  }

  const meters = order.metrics.totalBillableMeters || 1.0;
  const grandTotalQ = order.metrics.grandTotalQ || 140.0;
  const hasCutting = Boolean(order.metrics.hasCutting);

  let stickersCount = 0;
  let finishType = 'Barniz con Relieve 3D';

  if (Array.isArray(order.items) && order.items.length > 0) {
    stickersCount = order.items.reduce((sum, it) => sum + (it.qty || 0), 0);
    finishType = order.items[0].finishType || finishType;
  }

  return calculatePrintRunCost({
    meters,
    stickersCount: stickersCount || 50,
    hasCutting,
    finishType,
    customSellingPriceQ: grandTotalQ,
    customCosts,
  });
}

/**
 * Analiza la rentabilidad acumulada de toda la cartera de pedidos activos.
 * @param {Array} orders Lista de pedidos
 * @param {Object} [customCosts=null]
 * @returns {Object} Resumen comercial global y avance hacia la meta mensual de Q20k netos
 */
export function calculatePortfolioProfitability(orders = [], customCosts = null) {
  const cfg = customCosts ? { ...getCostsConfig(), ...customCosts } : getCostsConfig();

  const validOrders = orders.filter(o => o && o.productionStatus !== ORDER_STATUS.CANCELLED);

  let totalMeters = 0;
  let totalStickers = 0;
  let totalRevenueQ = 0;
  let totalProductionCostQ = 0;
  let totalFilmCostQ = 0;
  let totalInkCostQ = 0;
  let totalOperationsCostQ = 0;

  const ordersProfitabilityList = validOrders.map(o => {
    const p = calculateOrderProfitability(o, cfg);

    totalMeters += p.meters;
    totalStickers += p.stickersCount;
    totalRevenueQ += p.pricing.sellingPriceTotalQ;
    totalProductionCostQ += p.costs.totalProductionCostQ;
    totalFilmCostQ += (p.costs.filmA + p.costs.filmB);
    totalInkCostQ += p.costs.totalInk;
    totalOperationsCostQ += (p.costs.electricity + p.costs.maintenance + p.costs.labor + p.costs.cutting);

    return {
      orderId: o.id,
      createdAt: o.createdAt,
      customer: o.customer,
      profitability: p,
    };
  });

  const totalNetProfitQ = totalRevenueQ - totalProductionCostQ;
  const globalProfitMarginPercent = totalRevenueQ > 0 ? (totalNetProfitQ / totalRevenueQ) * 100 : 0;
  const averageProfitPerMeterQ = totalMeters > 0 ? totalNetProfitQ / totalMeters : 0;

  // Avance hacia la meta mensual de Q20,000 netos
  const targetMonthlyQ = cfg.monthlyTargetNetProfitQ || 20000.0;
  const goalProgressPercent = Math.min(100, Math.round((totalNetProfitQ / targetMonthlyQ) * 100));

  // Metros restantes para alcanzar la meta de Q20,000 al margen promedio
  const remainingProfitQ = Math.max(0, targetMonthlyQ - totalNetProfitQ);
  const remainingMetersNeeded = averageProfitPerMeterQ > 0 ? (remainingProfitQ / averageProfitPerMeterQ) : 0;

  return {
    validOrdersCount: validOrders.length,
    totalMeters,
    totalStickers,
    totalRevenueQ,
    totalProductionCostQ,
    totalNetProfitQ,
    globalProfitMarginPercent,
    averageProfitPerMeterQ,
    costBreakdown: {
      filmCostQ: totalFilmCostQ,
      inkCostQ: totalInkCostQ,
      operationsCostQ: totalOperationsCostQ,
    },
    monthlyGoal: {
      targetQ: targetMonthlyQ,
      progressPercent: goalProgressPercent,
      remainingProfitQ,
      remainingMetersNeeded,
    },
    ordersList: ordersProfitabilityList,
  };
}
