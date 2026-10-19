import { describe, it, expect } from 'vitest';
import { 
  getTierRate, 
  getCuttingRate, 
  validateDimensions, 
  calculateQuote 
} from '../src/js/modules/quoter-engine.js';
import { BUSINESS_CONFIG } from '../src/shared/business-config.js';

describe('Quoter Engine — Dimensiones y Validación', () => {
  it('aplica dimensiones por defecto ante valores inválidos o nulos', () => {
    const res = validateDimensions(null, undefined, 0);
    expect(res.width).toBe(5.0);
    expect(res.height).toBe(5.0);
    expect(res.qty).toBe(50);
  });

  it('limita el ancho al máximo imprimible de la bobina (28 cm)', () => {
    const res = validateDimensions(35, 10, 20);
    expect(res.width).toBe(BUSINESS_CONFIG.printableWidthCm);
  });

  it('no permite dimensiones menores a 0.5 cm ni cantidades menores a 1', () => {
    const res = validateDimensions(0.1, -2, -10);
    expect(res.width).toBe(0.5);
    expect(res.height).toBe(0.5);
    expect(res.qty).toBe(1);
  });
});

describe('Quoter Engine — Tarifas por Escala', () => {
  it('retorna Q140.00 para 1 metro o menos', () => {
    expect(getTierRate(0.5)).toBe(140.0);
    expect(getTierRate(1.0)).toBe(140.0);
  });

  it('retorna Q115.00 para el rango de 1 a 5 metros', () => {
    expect(getTierRate(2.5)).toBe(115.0);
    expect(getTierRate(4.99)).toBe(115.0);
  });

  it('retorna Q105.00 para el rango de 5 a 10 metros', () => {
    expect(getTierRate(5.5)).toBe(105.0);
    expect(getTierRate(9.99)).toBe(105.0);
  });

  it('retorna Q95.00 para el rango de 10 a 20 metros', () => {
    expect(getTierRate(12.0)).toBe(95.0);
    expect(getTierRate(19.9)).toBe(95.0);
  });

  it('retorna Q85.00 para pedidos mayores a 20 metros (mayoreo)', () => {
    expect(getTierRate(20.1)).toBe(85.0);
    expect(getTierRate(100.0)).toBe(85.0);
  });

  it('calcula la tarifa de corte según la escala de unidades', () => {
    expect(getCuttingRate(40)).toBe(0.35);
    expect(getCuttingRate(100)).toBe(0.30);
    expect(getCuttingRate(300)).toBe(0.25);
  });
});

describe('Quoter Engine — Cálculo Integral de Pedido', () => {
  it('aplica el piso mínimo de 1 metro (Q140.00) cuando el trabajo ocupa menos de 1m', () => {
    // 5x5 cm, 10 piezas caben en menos de 20 cm
    const quote = calculateQuote({ widthCm: 5, heightCm: 5, qty: 10, includeCutting: false });

    expect(quote.isUnderMin).toBe(true);
    expect(quote.billableMeters).toBe(1.0);
    expect(quote.materialPriceQ).toBe(140.0);
    expect(quote.cuttingTotalQ).toBe(0.0);
    expect(quote.totalPriceQ).toBe(140.0);
    expect(quote.stickersPerRow).toBe(5); // (28 + 0.3) / (5 + 0.3) = 5
  });

  it('calcula el precio proporcional por metro cuando supera 1 metro', () => {
    // Generar un pedido que ocupe aprox 3 metros
    // 10x10 cm, caben 2 por fila. 60 piezas = 30 filas * 10.3cm = ~309cm = 3.09m
    const quote = calculateQuote({ widthCm: 10, heightCm: 10, qty: 60, includeCutting: false });

    expect(quote.actualLinearMeters).toBeGreaterThan(3.0);
    expect(quote.tierRate).toBe(115.0);
    expect(quote.isUnderMin).toBe(false);
    expect(quote.totalPriceQ).toBe(quote.materialPriceQ);
  });

  it('asegura que materialPrice nunca sea menor al mínimo de Q140 si está entre 1.0 y 1.21 metros', () => {
    // 6x6 cm, 4 por fila. 18 filas * 6.3cm = ~113.4cm = 1.13m -> 1.134 * 115 = Q130.41 (< 140)
    const quote = calculateQuote({ widthCm: 6, heightCm: 6, qty: 72, includeCutting: false });
    expect(quote.actualLinearMeters).toBeGreaterThan(1.0);
    expect(quote.materialPriceQ).toBe(140.0);
  });


  it('aplica la tarifa mínima de corte (Q25.00) si el costo unitario no la alcanza', () => {
    // 20 piezas * Q0.35 = Q7.00 -> debe aplicar piso mínimo de Q25.00
    const quote = calculateQuote({ widthCm: 5, heightCm: 5, qty: 20, includeCutting: true });

    expect(quote.includeCutting).toBe(true);
    expect(quote.isCuttingMinApplied).toBe(true);
    expect(quote.cuttingTotalQ).toBe(25.0);
    expect(quote.totalPriceQ).toBe(quote.materialPriceQ + 25.0);
  });

  it('calcula el corte real por pieza cuando supera el mínimo de Q25.00', () => {
    // 300 piezas * Q0.25 = Q75.00 (> Q25)
    const quote = calculateQuote({ widthCm: 5, heightCm: 5, qty: 300, includeCutting: true });

    expect(quote.isCuttingMinApplied).toBe(false);
    expect(quote.cuttingTotalQ).toBe(75.0);
    expect(quote.totalPriceQ).toBe(quote.materialPriceQ + 75.0);
  });
});
