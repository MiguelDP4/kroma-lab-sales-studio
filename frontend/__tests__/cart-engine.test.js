import { describe, it, expect } from 'vitest';
import {
  getTierForMeters,
  getCuttingUnitRate,
  calculateCartItemMetrics,
  calculateCartTotals,
  formatWhatsAppCartOrder,
} from '../src/js/modules/cart-engine.js';
import { BUSINESS_CONFIG } from '../src/shared/business-config.js';

describe('Cart Engine — Cálculos Consolidados de Carrito UV DTF', () => {
  describe('Escala de tarifas por metros lineales (getTierForMeters)', () => {
    it('mantiene tarifa base de Q140/m hasta alcanzar 2 metros exactos', () => {
      expect(getTierForMeters(0).ratePerMeterQ).toBe(140);
      expect(getTierForMeters(0.8).ratePerMeterQ).toBe(140);
      expect(getTierForMeters(1.0).ratePerMeterQ).toBe(140);
      expect(getTierForMeters(1.05).ratePerMeterQ).toBe(140);
      expect(getTierForMeters(1.5).ratePerMeterQ).toBe(140);
      expect(getTierForMeters(1.99).ratePerMeterQ).toBe(140);
    });

    it('asigna escalas por volumen de 2 a 20+ metros exactos', () => {
      expect(getTierForMeters(2.0).ratePerMeterQ).toBe(115);
      expect(getTierForMeters(3.5).ratePerMeterQ).toBe(115);
      expect(getTierForMeters(4.99).ratePerMeterQ).toBe(115);
      expect(getTierForMeters(5.0).ratePerMeterQ).toBe(105);
      expect(getTierForMeters(5.5).ratePerMeterQ).toBe(105);
      expect(getTierForMeters(10.0).ratePerMeterQ).toBe(95);
      expect(getTierForMeters(12.0).ratePerMeterQ).toBe(95);
      expect(getTierForMeters(20.0).ratePerMeterQ).toBe(85);
      expect(getTierForMeters(25.0).ratePerMeterQ).toBe(85);
    });
  });

  describe('Tarifas unitarias de corte (getCuttingUnitRate)', () => {
    it('retorna Q0.35 para tirajes <= 50', () => {
      expect(getCuttingUnitRate(50)).toBe(0.35);
    });

    it('retorna Q0.30 para tirajes entre 51 y 200', () => {
      expect(getCuttingUnitRate(100)).toBe(0.30);
    });

    it('retorna Q0.25 para tirajes > 200', () => {
      expect(getCuttingUnitRate(500)).toBe(0.25);
    });
  });

  describe('Métricas individuales de ítem (calculateCartItemMetrics)', () => {
    it('calcula stickers por fila y largo físico en la bobina de 28cm', () => {
      const item = { widthCm: 5, heightCm: 5, qty: 50, includeCutting: false };
      const metrics = calculateCartItemMetrics(item);

      // (28 + 0.3) / (5 + 0.3) = 28.3 / 5.3 = 5
      expect(metrics.stickersPerRow).toBe(5);
      expect(metrics.rows).toBe(10);
      expect(metrics.physicalLengthCm).toBe(52.7);
      expect(metrics.actualLinearMeters).toBe(0.527);
      expect(metrics.cuttingRawQ).toBe(0);
    });

    it('incluye costo de corte si includeCutting es true', () => {
      const item = { widthCm: 5, heightCm: 5, qty: 100, includeCutting: true };
      const metrics = calculateCartItemMetrics(item);

      // 100 * 0.30 = Q30.00
      expect(metrics.cuttingRateUnit).toBe(0.30);
      expect(metrics.cuttingRawQ).toBe(30.0);
    });

    it('maneja valores no válidos asignando valores por defecto seguros', () => {
      const metrics = calculateCartItemMetrics({});
      expect(metrics.widthCm).toBe(5);
      expect(metrics.heightCm).toBe(5);
      expect(metrics.qty).toBe(1);
    });
  });

  describe('Totales Consolidados del Carrito (calculateCartTotals)', () => {
    it('retorna ceros si el carrito está vacío o nulo', () => {
      const empty = calculateCartTotals([]);
      expect(empty.totalItemsCount).toBe(0);
      expect(empty.grandTotalQ).toBe(0);

      const nullCart = calculateCartTotals(null);
      expect(nullCart.totalItemsCount).toBe(0);
    });

    it('aplica tarifa mínima de 1 metro cuando el total acumulado es menor a 1m', () => {
      const items = [
        { widthCm: 5, heightCm: 5, qty: 25, includeCutting: false },
      ];
      const totals = calculateCartTotals(items);

      expect(totals.isUnderMin).toBe(true);
      expect(totals.totalBillableMeters).toBe(1.0);
      expect(totals.tierRate).toBe(140.0);
      expect(totals.materialTotalQ).toBe(140.0);
      expect(totals.grandTotalQ).toBe(140.0);
    });

    it('combina múltiples diseños y otorga escala de mayoreo al superar 5 metros', () => {
      // Ítem 1: 5x5 cm x 300 uds (~3.16m)
      // Ítem 2: 8x5 cm x 150 uds (~2.63m)
      // Total metros > 5.5m -> Tarifa Q105/m
      const items = [
        { widthCm: 5, heightCm: 5, qty: 300, includeCutting: false },
        { widthCm: 8, heightCm: 5, qty: 150, includeCutting: false },
      ];
      const totals = calculateCartTotals(items);

      expect(totals.totalItemsCount).toBe(2);
      expect(totals.totalStickers).toBe(450);
      expect(totals.totalBillableMeters).toBeGreaterThan(5.0);
      expect(totals.tierRate).toBe(105.0);
      expect(totals.grandTotalQ).toBe(totals.materialTotalQ);
    });

    it('aplica piso mínimo de corte de Q25 si la suma de cortes de los ítems es menor a Q25', () => {
      const items = [
        { widthCm: 5, heightCm: 5, qty: 20, includeCutting: true }, // 20 * 0.35 = 7.00
      ];
      const totals = calculateCartTotals(items);

      expect(totals.hasCutting).toBe(true);
      expect(totals.isCuttingMinApplied).toBe(true);
      expect(totals.cuttingTotalQ).toBe(BUSINESS_CONFIG.cuttingMinimumQ); // Q25.00
      expect(totals.grandTotalQ).toBe(totals.materialTotalQ + 25.0);
    });

    it('cobra la suma real de corte si supera el piso de Q25', () => {
      const items = [
        { widthCm: 5, heightCm: 5, qty: 150, includeCutting: true }, // 150 * 0.30 = 45.00
      ];
      const totals = calculateCartTotals(items);

      expect(totals.isCuttingMinApplied).toBe(false);
      expect(totals.cuttingTotalQ).toBe(45.0);
    });
  });

  describe('Formateo de Mensaje de WhatsApp (formatWhatsAppCartOrder)', () => {
    it('genera un mensaje estructurado con cliente, detalle de ítems y totales', () => {
      const items = [
        { title: 'Logo Café', widthCm: 5, heightCm: 5, qty: 100, includeCutting: true, fileInfo: { name: 'cafe.png' } },
        { title: 'Sticker Vaso', widthCm: 8, heightCm: 5, qty: 50, includeCutting: false },
      ];
      const totals = calculateCartTotals(items);
      const msg = formatWhatsAppCartOrder(totals, { name: 'Juan Pérez', nit: '12345-6' });

      expect(msg).toContain('Juan Pérez');
      expect(msg).toContain('12345-6');
      expect(msg).toContain('Logo Café');
      expect(msg).toContain('cafe.png');
      expect(msg).toContain('Sticker Vaso');
      expect(msg).toContain('TOTAL ESTIMADO');
      expect(msg).toContain('Q');
    });

    it('incluye enlaces HTTP/HTTPS de arte del cliente y de montaje en bobina si están disponibles', () => {
      const items = [
        {
          title: 'Sticker Premium',
          widthCm: 6,
          heightCm: 6,
          qty: 100,
          includeCutting: true,
          fileUrl: 'https://pub-r2.dev/assets/quotes/diseno_premium.png',
          canvasSnapshotUrl: 'https://pub-r2.dev/assets/orders/bobina_6x6cm.png',
        },
      ];
      const totals = calculateCartTotals(items);
      const msg = formatWhatsAppCartOrder(totals, { name: 'Empresa Demo', phone: '+502 5555-1234' });

      expect(msg).toContain('🖼️ *Arte del cliente:* https://pub-r2.dev/assets/quotes/diseno_premium.png');
      expect(msg).toContain('📐 *Montaje en bobina:* https://pub-r2.dev/assets/orders/bobina_6x6cm.png');
    });

    it('soporta fileInfo.fileUrl y canvasSnapshot directo cuando no empieza con data:', () => {
      const items = [
        {
          title: 'Sticker Café',
          widthCm: 5,
          heightCm: 5,
          qty: 50,
          includeCutting: false,
          fileInfo: { name: 'cafe.png', fileUrl: 'https://pub-r2.dev/cafe.png' },
          canvasSnapshot: 'https://pub-r2.dev/bobina_cafe.png',
        },
      ];
      const totals = calculateCartTotals(items);
      const msg = formatWhatsAppCartOrder(totals);

      expect(msg).toContain('🖼️ *Arte del cliente:* https://pub-r2.dev/cafe.png');
      expect(msg).toContain('📐 *Montaje en bobina:* https://pub-r2.dev/bobina_cafe.png');
    });

    it('omite enlaces base64 (data:image) del texto de WhatsApp para evitar sobrepasar límites de URL', () => {
      const items = [
        {
          title: 'Sticker Local',
          widthCm: 5,
          heightCm: 5,
          qty: 50,
          includeCutting: false,
          canvasSnapshot: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAE...',
        },
      ];
      const totals = calculateCartTotals(items);
      const msg = formatWhatsAppCartOrder(totals);

      expect(msg).not.toContain('data:image/png');
      expect(msg).not.toContain('• 📐 *Montaje en bobina:*');
    });
  });
});
