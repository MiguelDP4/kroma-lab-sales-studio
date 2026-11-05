import { describe, it, expect } from 'vitest';
import { 
  getTierRate, 
  getCuttingRate, 
  validateDimensions, 
  calculateQuote,
  checkFreeShippingEligibility,
  calculateMaxStickersInMeters,
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
  it('retorna Q150.00 para menos de 2 metros exactos (incluyendo 1.05m y 1.99m)', () => {
    expect(getTierRate(0.5)).toBe(150.0);
    expect(getTierRate(1.0)).toBe(150.0);
    expect(getTierRate(1.05)).toBe(150.0);
    expect(getTierRate(1.5)).toBe(150.0);
    expect(getTierRate(1.99)).toBe(150.0);
  });

  it('retorna Q125.00 a partir de 2.0 metros exactos hasta 4.99m', () => {
    expect(getTierRate(2.0)).toBe(125.0);
    expect(getTierRate(2.5)).toBe(125.0);
    expect(getTierRate(4.99)).toBe(125.0);
  });

  

  it('retorna Q115.00 para el rango de 5 a 10 metros', () => {
    expect(getTierRate(5.5)).toBe(115.0);
    expect(getTierRate(9.99)).toBe(115.0);
  });

  it('retorna Q105.00 para el rango de 10 a 20 metros', () => {
    expect(getTierRate(12.0)).toBe(105.0);
    expect(getTierRate(19.9)).toBe(105.0);
  });

  it('retorna Q95.00 para pedidos mayores a 20 metros (mayoreo)', () => {
    expect(getTierRate(20.1)).toBe(95.0);
    expect(getTierRate(100.0)).toBe(95.0);
  });

  it('retorna fallback cuando el valor es NaN o inválido', () => {
    expect(getTierRate(NaN)).toBe(95.0);
    expect(getCuttingRate(NaN)).toBe(0.25);
  });

  it('calcula la tarifa de corte según la escala de unidades', () => {
    expect(getCuttingRate(40)).toBe(0.35);
    expect(getCuttingRate(100)).toBe(0.30);
    expect(getCuttingRate(300)).toBe(0.25);
  });
});

describe('Quoter Engine — Cálculo Integral de Pedido', () => {
  it('aplica el piso mínimo de 1 metro (Q150.00) cuando el trabajo ocupa menos de 1m', () => {
    // 5x5 cm, 10 piezas caben en menos de 20 cm
    const quote = calculateQuote({ widthCm: 5, heightCm: 5, qty: 10, includeCutting: false });

    expect(quote.isUnderMin).toBe(true);
    expect(quote.billableMeters).toBe(1.0);
    expect(quote.materialPriceQ).toBe(150.0);
    expect(quote.cuttingTotalQ).toBe(0.0);
    expect(quote.totalPriceQ).toBe(150.0);
    expect(quote.stickersPerRow).toBe(5); // (28 + 0.3) / (5 + 0.3) = 5
  });

  it('calcula el precio proporcional por metro cuando supera 1 metro', () => {
    // Generar un pedido que ocupe aprox 3 metros
    // 10x10 cm, caben 2 por fila. 60 piezas = 30 filas * 10.3cm = ~309cm = 3.09m
    const quote = calculateQuote({ widthCm: 10, heightCm: 10, qty: 60, includeCutting: false });

    expect(quote.actualLinearMeters).toBeGreaterThan(3.0);
    expect(quote.tierRate).toBe(125.0);
    expect(quote.isUnderMin).toBe(false);
    expect(quote.totalPriceQ).toBe(quote.materialPriceQ);
  });

  it('aplica tarifa de Q150/m entre 1.0 y 1.99 metros y respeta piso mínimo de Q150 si es menor a 1.0m', () => {
    // 0.5 metros -> piso mínimo de Q150.00
    const quoteMin = calculateQuote({ widthCm: 5, heightCm: 5, qty: 10, includeCutting: false });
    expect(quoteMin.actualLinearMeters).toBeLessThan(1.0);
    expect(quoteMin.materialPriceQ).toBe(150.0);

    // 1.13m (6x6 cm, 72 piezas) -> 1.13m * 150 = Q169.5
    const quote = calculateQuote({ widthCm: 6, heightCm: 6, qty: 72, includeCutting: false });
    expect(quote.actualLinearMeters).toBeGreaterThan(1.0);
    expect(quote.actualLinearMeters).toBeLessThan(2.0);
    expect(quote.tierRate).toBe(150.0);
    expect(quote.materialPriceQ).toBe(169.65);
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

  describe('Políticas de Envío Gratis (checkFreeShippingEligibility)', () => {
    it('evalúa envío gratis en Capital a partir de Q400', () => {
      const under = checkFreeShippingEligibility(350, 'capital');
      expect(under.isEligible).toBe(false);
      expect(under.threshold).toBe(400);
      expect(under.missingQ).toBe(50);

      const exact = checkFreeShippingEligibility(400, 'capital');
      expect(exact.isEligible).toBe(true);
      expect(exact.missingQ).toBe(0);

      const over = checkFreeShippingEligibility(550, 'capital');
      expect(over.isEligible).toBe(true);
      expect(over.missingQ).toBe(0);
    });

    it('evalúa envío gratis a Departamentos/Interior a partir de Q600', () => {
      const under = checkFreeShippingEligibility(550, 'interior');
      expect(under.isEligible).toBe(false);
      expect(under.threshold).toBe(600);
      expect(under.missingQ).toBe(50);

      const exact = checkFreeShippingEligibility(600, 'interior');
      expect(exact.isEligible).toBe(true);
      expect(exact.missingQ).toBe(0);
    });
  });

  describe('calculateMaxStickersInMeters — Cálculo de Capacidad Máxima por Metro', () => {
    it('calcula la cantidad exacta para 5x5 cm en 1 metro sin sobrepasarse', () => {
      // Bobina 28cm útiles, gap 0.3cm: (28 + 0.3) / (5 + 0.3) = 5 por fila
      // 100cm largo, gap 0.3cm: (100 + 0.3) / (5 + 0.3) = floor(100.3 / 5.3) = 18 filas
      // 18 filas * 5 por fila = 90 stickers
      const maxStickers = calculateMaxStickersInMeters(5, 5, 1);
      expect(maxStickers).toBe(90);

      // Verificar que el largo físico no sobrepasa 100 cm (1 metro)
      const physicalLengthCm = (18 * 5.3) - 0.3;
      expect(physicalLengthCm).toBeLessThanOrEqual(100.0);
    });

    it('calcula la cantidad exacta para 10x10 cm en 1 metro sin sobrepasarse', () => {
      // (28 + 0.3) / (10 + 0.3) = 2 por fila
      // (100 + 0.3) / (10 + 0.3) = floor(100.3 / 10.3) = 9 filas
      // 9 filas * 2 por fila = 18 stickers
      const maxStickers = calculateMaxStickersInMeters(10, 10, 1);
      expect(maxStickers).toBe(18);

      const physicalLengthCm = (9 * 10.3) - 0.3;
      expect(physicalLengthCm).toBeLessThanOrEqual(100.0);
    });

    it('calcula la cantidad para múltiples metros (ej. 2 metros)', () => {
      // 5x5 cm en 2 metros (200 cm)
      // (200 + 0.3) / (5 + 0.3) = floor(200.3 / 5.3) = 37 filas
      // 37 filas * 5 = 185 stickers
      const maxStickers = calculateMaxStickersInMeters(5, 5, 2);
      expect(maxStickers).toBe(185);

      const physicalLengthCm = (37 * 5.3) - 0.3;
      expect(physicalLengthCm).toBeLessThanOrEqual(200.0);
    });

    it('retorna 0 si la altura del diseño sobrepasa el largo total de los metros solicitados', () => {
      // 120 cm de alto en 1 metro (100 cm)
      const maxStickers = calculateMaxStickersInMeters(5, 120, 1);
      expect(maxStickers).toBe(0);
    });

    it('maneja valores por defecto y límites de bobina ante entradas nulas o atípicas', () => {
      const defaultStickers = calculateMaxStickersInMeters(null, null, null);
      // w=5, h=5, m=1 -> 90 stickers
      expect(defaultStickers).toBe(90);

      // Ancho mayor a 28 cm se acota a 28 cm
      const clampedStickers = calculateMaxStickersInMeters(50, 5, 1);
      expect(clampedStickers).toBe(18); // 1 por fila * 18 filas
    });
  });
});
