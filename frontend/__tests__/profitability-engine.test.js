import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  STORAGE_KEY_COSTS,
  getCostsConfig,
  saveCostsConfig,
  resetCostsConfig,
  getSuggestedPricePerMeter,
  getSuggestedCuttingRate,
  calculatePrintRunCost,
  calculateOrderProfitability,
  calculateStickerProfitability,
  calculatePortfolioProfitability,
} from '../src/js/modules/profitability-engine.js';
import { ORDER_STATUS } from '../src/shared/business-config.js';

describe('Profitability Engine — Motor de Costos Industriales UV DTF', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Configuración y Persistencia (localStorage)', () => {
    it('retorna la configuración por defecto cuando no hay nada guardado', () => {
      const config = getCostsConfig();
      expect(config.filmARoll100mQ).toBe(600.0);
      expect(config.filmBRoll100mQ).toBe(400.0);
      expect(config.inkLiterCostQ).toBe(550.0);
      expect(config.electricityCostPerMeterQ).toBe(1.20);
      expect(config.maintenanceCostPerMeterQ).toBe(2.00);
      expect(config.operatorLaborPerMeterQ).toBe(4.00);
      expect(config.cuttingCostPerStickerQ).toBe(0.08);
      expect(config.monthlyTargetNetProfitQ).toBe(20000.0);
    });

    it('guarda y recupera parámetros modificados en localStorage', () => {
      saveCostsConfig({
        filmARoll100mQ: 650.0,
        monthlyTargetNetProfitQ: 25000.0,
      });

      const updated = getCostsConfig();
      expect(updated.filmARoll100mQ).toBe(650.0);
      expect(updated.monthlyTargetNetProfitQ).toBe(25000.0);
      // Los no modificados preservan sus valores por defecto
      expect(updated.filmBRoll100mQ).toBe(400.0);
    });

    it('maneja errores de parseo en localStorage retornando configuración por defecto', () => {
      localStorage.setItem(STORAGE_KEY_COSTS, 'invalid JSON {{{');
      const config = getCostsConfig();
      expect(config.filmARoll100mQ).toBe(600.0);
    });

    it('maneja excepciones al escribir en localStorage sin lanzar error', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
        throw new Error('QuotaExceeded');
      });
      const res = saveCostsConfig({ filmARoll100mQ: 700 });
      expect(res.filmARoll100mQ).toBe(700);
    });

    it('restablece la configuración a los valores de fábrica con resetCostsConfig', () => {
      saveCostsConfig({ filmARoll100mQ: 999.0 });
      expect(getCostsConfig().filmARoll100mQ).toBe(999.0);

      const reset = resetCostsConfig();
      expect(reset.filmARoll100mQ).toBe(600.0);
      expect(getCostsConfig().filmARoll100mQ).toBe(600.0);
    });
  });

  describe('Tarifas de Referencia Comercial', () => {
    it('determina correctamente el precio de venta sugerido por metro según escala', () => {
      expect(getSuggestedPricePerMeter(0.5)).toBe(150.0);
      expect(getSuggestedPricePerMeter(1.0)).toBe(150.0);
      expect(getSuggestedPricePerMeter(2.5)).toBe(125.0);
      expect(getSuggestedPricePerMeter(5.0)).toBe(115.0);
      expect(getSuggestedPricePerMeter(7.0)).toBe(115.0);
      expect(getSuggestedPricePerMeter(12.0)).toBe(105.0);
      expect(getSuggestedPricePerMeter(25.0)).toBe(95.0);
    });

    it('aplica valor de escala para metros altos o inválidos', () => {
      expect(getSuggestedPricePerMeter(0)).toBe(150.0);
      expect(getSuggestedPricePerMeter(-5)).toBe(150.0);
      expect(getSuggestedPricePerMeter(NaN)).toBe(150.0);
      expect(getSuggestedPricePerMeter(500)).toBe(95.0);
    });

    it('determina la tarifa de corte sugerida por pieza según volumen', () => {
      expect(getSuggestedCuttingRate(30)).toBe(0.35);
      expect(getSuggestedCuttingRate(50)).toBe(0.35);
      expect(getSuggestedCuttingRate(100)).toBe(0.30);
      expect(getSuggestedCuttingRate(200)).toBe(0.30);
      expect(getSuggestedCuttingRate(500)).toBe(0.25);
      expect(getSuggestedCuttingRate(0)).toBe(0.35);
      expect(getSuggestedCuttingRate(-10)).toBe(0.35);
    });
  });

  describe('calculatePrintRunCost — Cálculo de Tirajes UV DTF', () => {
    it('calcula los costos exactos por metro para un tiraje estándar de 1 metro con barniz 3D', () => {
      const run = calculatePrintRunCost({
        meters: 1.0,
        stickersCount: 50,
        hasCutting: false,
        finishType: 'Barniz con Relieve 3D',
      });

      // Film A: (600/100) * 1.05 = 6.30
      expect(run.costs.filmA).toBeCloseTo(6.30, 2);
      // Film B: (400/100) * 1.02 = 4.08
      expect(run.costs.filmB).toBeCloseTo(4.08, 2);
      // Tintas: (4ml CMYK + 6ml White + 5ml Varnish) = 15ml * Q0.55 = Q8.25
      expect(run.costs.inkCmyk).toBeCloseTo(2.20, 2);
      expect(run.costs.inkWhite).toBeCloseTo(3.30, 2);
      expect(run.costs.inkVarnish).toBeCloseTo(2.75, 2);
      expect(run.costs.totalInk).toBeCloseTo(8.25, 2);
      // Operativos: 1.20 electricidad + 2.00 depreciación + 4.00 mano obra = 7.20
      expect(run.costs.electricity).toBeCloseTo(1.20, 2);
      expect(run.costs.maintenance).toBeCloseTo(2.00, 2);
      expect(run.costs.labor).toBeCloseTo(4.00, 2);
      // Sin corte
      expect(run.costs.cutting).toBe(0);

      // Costo total base: 6.30 + 4.08 + 8.25 + 7.20 = Q25.83
      expect(run.costs.totalProductionCostQ).toBeCloseTo(25.83, 2);
      expect(run.costs.costPerMeterQ).toBeCloseTo(25.83, 2);
      expect(run.costs.costPerStickerQ).toBeCloseTo(25.83 / 50, 2);

      // Precio venta escala para 1m = Q140.00
      expect(run.pricing.sellingPriceTotalQ).toBe(150.0);
      // Margen neto: 140 - 25.83 = Q114.17 (~81.55%)
      expect(run.profitability.netProfitQ).toBeCloseTo(124.17, 2);
      expect(run.profitability.profitMarginPercent).toBeCloseTo(82.78, 1);
      expect(run.profitability.profitabilityTier).toBe('EXCELLENT');
    });

    it('omite el costo de barniz cuando el acabado es mate / sin barniz', () => {
      const run = calculatePrintRunCost({
        meters: 1.0,
        stickersCount: 50,
        finishType: 'Sin Barniz / Mate',
      });

      expect(run.hasVarnish).toBe(false);
      expect(run.costs.inkVarnish).toBe(0);
      // Total tinta: CMYK (2.20) + White (3.30) = 5.50
      expect(run.costs.totalInk).toBeCloseTo(5.50, 2);
      // Costo total reducido: 25.83 - 2.75 = 23.08
      expect(run.costs.totalProductionCostQ).toBeCloseTo(23.08, 2);
    });

    it('calcula el costo de corte adicional y respeta tarifa mínima de corte', () => {
      const run = calculatePrintRunCost({
        meters: 2.0,
        stickersCount: 100,
        hasCutting: true,
      });

      expect(run.hasCutting).toBe(true);
      // Costo corte técnico: 100 * Q0.08 = Q8.00
      expect(run.costs.cutting).toBe(8.0);
      // Precio venta corte: 100 * Q0.30 = Q30.00 (supera el mínimo de Q25)
      expect(run.pricing.cuttingSellingQ).toBe(30.0);
      // Material: 2m a Q115 = Q230. Total venta: 230 + 30 = Q260
      expect(run.pricing.sellingPriceTotalQ).toBe(280.0);
    });

    it('aplica la tarifa mínima de corte de Q25 cuando el despiece unitario es bajo', () => {
      const run = calculatePrintRunCost({
        meters: 1.0,
        stickersCount: 10,
        hasCutting: true,
      });

      // 10 piezas * Q0.35 = Q3.50 -> aplica mínimo de Q25.00
      expect(run.pricing.cuttingSellingQ).toBe(25.0);
      expect(run.pricing.sellingPriceTotalQ).toBe(150.0 + 25.0);
    });

    it('permite sobrescribir el precio de venta con un precio manual personalizado', () => {
      const run = calculatePrintRunCost({
        meters: 2.0,
        stickersCount: 50,
        customSellingPriceQ: 100.0,
      });

      expect(run.pricing.sellingPriceTotalQ).toBe(100.0);
      // Costo base 2m ~ Q51.66. Ganancia: 100 - 51.66 = Q48.34 (~48.34%)
      expect(run.profitability.profitMarginPercent).toBeLessThan(50);
      expect(run.profitability.profitabilityTier).toBe('LOW');
      expect(run.profitability.profitabilityBadge).toContain('Margen Ajustado');
    });

    it('categoriza como HEALTHY cuando el margen se ubica entre 50% y 70%', () => {
      const run = calculatePrintRunCost({
        meters: 2.0,
        stickersCount: 50,
        customSellingPriceQ: 120.0,
      });

      expect(run.profitability.profitMarginPercent).toBeGreaterThanOrEqual(50);
      expect(run.profitability.profitMarginPercent).toBeLessThan(70);
      expect(run.profitability.profitabilityTier).toBe('HEALTHY');
      expect(run.profitability.profitabilityBadge).toContain('Saludable');
    });

    it('permite pasar costos personalizados temporales customCosts', () => {
      const run = calculatePrintRunCost({
        meters: 1.0,
        customCosts: {
          filmARoll100mQ: 800.0,
          inkLiterCostQ: 700.0,
        },
      });

      // Film A: (800/100) * 1.05 = 8.40
      expect(run.costs.filmA).toBeCloseTo(8.40, 2);
      // Ink: 15ml * (700/1000) = 10.50
      expect(run.costs.totalInk).toBeCloseTo(10.50, 2);
    });

    it('maneja tirajes con valores cero o no numéricos de manera segura', () => {
      const run = calculatePrintRunCost({
        meters: 0,
        stickersCount: 0,
        customSellingPriceQ: 0,
      });

      expect(run.meters).toBe(1.0);
      expect(run.stickersCount).toBe(1);
      expect(run.pricing.sellingPriceTotalQ).toBe(0);
      expect(run.profitability.profitMarginPercent).toBe(0);
    });
  });

  describe('calculateOrderProfitability — Rentabilidad de Pedidos en Taller', () => {
    it('calcula la rentabilidad precisa a partir de una orden formal de ordersStore', () => {
      const mockOrder = {
        id: 'ORD-2026-001',
        customer: { name: 'Empresa Demo', company: 'Demo S.A.' },
        metrics: {
          totalBillableMeters: 3.5,
          grandTotalQ: 420.0,
          hasCutting: true,
        },
        items: [
          { title: 'Sticker 1', qty: 150, finishType: 'Barniz Brillante' },
          { title: 'Sticker 2', qty: 50, finishType: 'Barniz Brillante' },
        ],
      };

      const result = calculateOrderProfitability(mockOrder);
      expect(result.meters).toBe(3.5);
      expect(result.stickersCount).toBe(200);
      expect(result.hasCutting).toBe(true);
      expect(result.pricing.sellingPriceTotalQ).toBe(420.0);
      expect(result.profitability.netProfitQ).toBeGreaterThan(0);
    });

    it('provee valores por defecto seguros cuando el pedido es nulo o carece de métricas', () => {
      const resultNull = calculateOrderProfitability(null);
      expect(resultNull.meters).toBe(1.0);
      expect(resultNull.pricing.sellingPriceTotalQ).toBe(150.0);

      const resultEmpty = calculateOrderProfitability({});
      expect(resultEmpty.meters).toBe(1.0);
    });

    it('maneja órdenes con lista de ítems vacía usando valores predeterminados', () => {
      const mockOrderNoItems = {
        id: 'ORD-EMPTY',
        metrics: { totalBillableMeters: 2.0, grandTotalQ: 230.0, hasCutting: false },
        items: [],
      };
      const res = calculateOrderProfitability(mockOrderNoItems);
      expect(res.meters).toBe(2.0);
      expect(res.stickersCount).toBe(50);
    });
  });

  describe('calculateStickerProfitability — Simulación por Dimensiones de Sticker y Descuento', () => {
    it('calcula metros en bobina de 28cm y márgenes a precio de lista oficial', () => {
      const res = calculateStickerProfitability({
        widthCm: 5.0,
        heightCm: 5.0,
        qty: 100,
        finishType: 'Barniz con Relieve 3D',
        includeCutting: false,
      });

      expect(res.quote.actualLinearMeters).toBeCloseTo(1.06, 2);
      expect(res.quote.stickersPerRow).toBe(5);
      expect(res.quote.rows).toBe(20);
      expect(res.pricingComparison.listPriceTotalQ).toBe(158.55);
      expect(res.pricingComparison.isDiscountApplied).toBe(false);
      expect(res.pricingComparison.discountAmountQ).toBe(0);
      expect(res.pricingComparison.discountAdvice).toContain('Precio de lista oficial');
      expect(res.netProfitQ).toBeGreaterThan(100.0);
      expect(res.profitMarginPercent).toBeGreaterThan(70.0);
    });

    it('evalúa impacto de un descuento seguro (margen superior a 70%)', () => {
      const res = calculateStickerProfitability({
        widthCm: 5.0,
        heightCm: 5.0,
        qty: 100,
        includeCutting: true,
        customSellingPriceQ: 140.0,
      });

      expect(res.pricingComparison.isDiscountApplied).toBe(true);
      expect(res.pricingComparison.discountAmountQ).toBeCloseTo(48.55, 1);
      expect(res.pricingComparison.discountPercent).toBeCloseTo(25.7, 1);
      expect(res.profitMarginPercent).toBeGreaterThanOrEqual(70.0);
      expect(res.pricingComparison.discountAdvice).toContain('Descuento seguro');
    });

    it('evalúa descuento moderado con margen saludable (entre 50% y 70%)', () => {
      const res = calculateStickerProfitability({
        widthCm: 5.0,
        heightCm: 5.0,
        qty: 100,
        includeCutting: false,
        customSellingPriceQ: 75.0, // Costo base ~Q27.4. Utilidad ~Q47.6 (63.4%)
      });

      expect(res.pricingComparison.isDiscountApplied).toBe(true);
      expect(res.profitMarginPercent).toBeGreaterThanOrEqual(50.0);
      expect(res.profitMarginPercent).toBeLessThan(70.0);
      expect(res.pricingComparison.discountAdvice).toContain('Descuento aceptable');
    });

    it('emite alerta cuando el descuento reduce el margen a menos del 50%', () => {
      const res = calculateStickerProfitability({
        widthCm: 5.0,
        heightCm: 5.0,
        qty: 100,
        includeCutting: false,
        customSellingPriceQ: 40.0, // Costo base ~Q27.4. Utilidad ~Q12.6 (31.5%)
      });

      expect(res.pricingComparison.isDiscountApplied).toBe(true);
      expect(res.profitMarginPercent).toBeLessThan(50.0);
      expect(res.pricingComparison.discountAdvice).toContain('Alerta: este descuento reduce el margen a menos del 50%');
    });

    it('maneja ejecución con parámetros por defecto de manera segura', () => {
      const res = calculateStickerProfitability({});
      expect(res.quote.qty).toBe(100);
      expect(res.productionMeters).toBeGreaterThan(0);
      expect(res.pricingComparison.listPriceTotalQ).toBeGreaterThan(0);
    });
  });

  describe('calculatePortfolioProfitability — Monitoreo Global y Meta Mensual', () => {
    it('consolida la rentabilidad de la cartera excluyendo pedidos cancelados', () => {
      const orders = [
        {
          id: 'ORD-1',
          productionStatus: 'COMPLETED',
          metrics: { totalBillableMeters: 2.0, grandTotalQ: 250.0, hasCutting: false },
          items: [{ qty: 100 }],
        },
        {
          id: 'ORD-2',
          productionStatus: 'PRINTING',
          metrics: { totalBillableMeters: 4.0, grandTotalQ: 460.0, hasCutting: true },
          items: [{ qty: 200 }],
        },
        {
          id: 'ORD-3_CANCELLED',
          productionStatus: ORDER_STATUS.CANCELLED,
          metrics: { totalBillableMeters: 10.0, grandTotalQ: 1000.0, hasCutting: false },
          items: [{ qty: 500 }],
        },
      ];

      const portfolio = calculatePortfolioProfitability(orders);
      expect(portfolio.validOrdersCount).toBe(2);
      expect(portfolio.totalMeters).toBe(6.0);
      expect(portfolio.totalStickers).toBe(300);
      expect(portfolio.totalRevenueQ).toBe(710.0);
      expect(portfolio.totalNetProfitQ).toBeGreaterThan(500);
      expect(portfolio.globalProfitMarginPercent).toBeGreaterThan(70);
      expect(portfolio.ordersList.length).toBe(2);
    });

    it('proyecta el avance y metros faltantes para alcanzar la meta mensual de Q20,000 netos', () => {
      const orders = [
        {
          id: 'ORD-BIG',
          productionStatus: 'PRINTING',
          metrics: { totalBillableMeters: 50.0, grandTotalQ: 4500.0, hasCutting: false },
          items: [{ qty: 1000 }],
        },
      ];

      const portfolio = calculatePortfolioProfitability(orders);
      expect(portfolio.monthlyGoal.targetQ).toBe(20000.0);
      expect(portfolio.monthlyGoal.remainingProfitQ).toBeGreaterThan(0);
      expect(portfolio.monthlyGoal.remainingMetersNeeded).toBeGreaterThan(0);
      expect(portfolio.monthlyGoal.progressPercent).toBeGreaterThan(0);
    });

    it('maneja el caso de cartera vacía sin divisiones por cero', () => {
      const emptyPortfolio = calculatePortfolioProfitability([]);
      expect(emptyPortfolio.validOrdersCount).toBe(0);
      expect(emptyPortfolio.totalMeters).toBe(0);
      expect(emptyPortfolio.totalRevenueQ).toBe(0);
      expect(emptyPortfolio.totalProductionCostQ).toBe(0);
      expect(emptyPortfolio.totalNetProfitQ).toBe(0);
      expect(emptyPortfolio.globalProfitMarginPercent).toBe(0);
      expect(emptyPortfolio.averageProfitPerMeterQ).toBe(0);
      expect(emptyPortfolio.monthlyGoal.progressPercent).toBe(0);
      expect(emptyPortfolio.monthlyGoal.remainingProfitQ).toBe(20000.0);
      expect(emptyPortfolio.monthlyGoal.remainingMetersNeeded).toBe(0);
    });

    it('establece remainingProfitQ en 0 cuando se supera la meta mensual', () => {
      const orders = [
        {
          id: 'ORD-SUPER',
          productionStatus: 'COMPLETED',
          metrics: { totalBillableMeters: 300.0, grandTotalQ: 30000.0, hasCutting: false },
          items: [{ qty: 10000 }],
        },
      ];

      const portfolio = calculatePortfolioProfitability(orders);
      expect(portfolio.monthlyGoal.remainingProfitQ).toBe(0);
      expect(portfolio.monthlyGoal.remainingMetersNeeded).toBe(0);
      expect(portfolio.monthlyGoal.progressPercent).toBe(100);
    });
  });
});
