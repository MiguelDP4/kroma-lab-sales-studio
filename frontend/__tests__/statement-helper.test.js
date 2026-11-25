import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildClientStatementData,
  formatStatementWhatsAppMessage,
  renderClientStatementSheetHtml,
} from '../src/js/modules/statement-helper.js';

describe('Statement Helper — Recibo Consolidado y Estado de Cuenta', () => {
  const sampleClient = {
    id: 'CLI-PAPA',
    company: 'Arte Modelo Dubois',
    name: 'Papá Dubois',
    phone: '+502 5555-7777',
    nit: '123456-7',
    address: 'Villa Nueva, Guatemala',
    customRatePerMeterQ: 75.0,
    exemptFromMinimum: true,
    allowCredit: true,
  };

  const sampleOrders = [
    {
      id: '0000000010',
      createdAt: '2026-11-20T10:00:00.000Z',
      productionStatus: 'COMPLETED',
      paymentStatus: 'PENDING',
      items: [
        { title: 'Logo_Tazas_Navidad.png', fileName: 'Logo_Tazas_Navidad.png', qty: 30, actualLinearMeters: 0.45, includeCutting: false },
        { title: 'Etiqueta_Cafe.png', fileName: 'Etiqueta_Cafe.png', qty: 50, actualLinearMeters: 0.55, includeCutting: false },
      ],
      metrics: {
        totalBillableMeters: 1.0,
        tierRate: 75.0,
        materialTotalQ: 75.0,
        cuttingTotalQ: 0.0,
        grandTotalQ: 75.0,
        hasCutting: false,
      },
    },
    {
      id: '0000000011',
      createdAt: '2026-11-21T15:00:00.000Z',
      productionStatus: 'COMPLETED',
      paymentStatus: 'PARTIAL',
      amountPaidQ: 50.0,
      items: [
        { title: 'Stickers_Termos_VIP.png', fileName: 'Stickers_Termos_VIP.png', qty: 100, actualLinearMeters: 2.0, includeCutting: true },
      ],
      metrics: {
        totalBillableMeters: 2.0,
        tierRate: 75.0,
        materialTotalQ: 150.0,
        cuttingTotalQ: 25.0,
        grandTotalQ: 175.0,
        hasCutting: true,
      },
    },
    {
      id: '0000000009',
      createdAt: '2026-11-15T10:00:00.000Z',
      productionStatus: 'COMPLETED',
      paymentStatus: 'PAID',
      items: [{ title: 'Pedido_Ya_Pagado.png', qty: 20, actualLinearMeters: 1.0 }],
      metrics: { totalBillableMeters: 1.0, tierRate: 75.0, materialTotalQ: 75.0, cuttingTotalQ: 0, grandTotalQ: 75.0 },
    },
    {
      id: '0000000008',
      createdAt: '2026-11-14T10:00:00.000Z',
      productionStatus: 'CANCELLED',
      paymentStatus: 'PENDING',
      items: [{ title: 'Pedido_Cancelado.png', qty: 10, actualLinearMeters: 0.5 }],
      metrics: { totalBillableMeters: 0.5, tierRate: 75.0, materialTotalQ: 37.5, cuttingTotalQ: 0, grandTotalQ: 37.5 },
    },
  ];

  it('consolida únicamente órdenes pendientes y parciales no canceladas con desglose por imagen', () => {
    const stmt = buildClientStatementData(sampleClient, sampleOrders);

    expect(stmt.ordersCount).toBe(2);
    expect(stmt.items.length).toBe(3);
    expect(stmt.totalPieces).toBe(180);
    expect(stmt.totalMeters).toBe(3.0);
    expect(stmt.totalCuttingQ).toBe(25.0);
    expect(stmt.totalBilledQ).toBe(250.0);
    expect(stmt.totalPaidQ).toBe(50.0);
    expect(stmt.balanceDueQ).toBe(200.0);

    expect(stmt.items[0].title).toBe('Logo_Tazas_Navidad.png');
    expect(stmt.items[0].linearMeters).toBe(0.45);
    expect(stmt.items[0].unitRateQ).toBe(75.0);
    expect(stmt.items[0].subtotalQ).toBe(33.75);
  });

  it('maneja órdenes sin array de items usando datos de respaldo de la orden', () => {
    const stmt = buildClientStatementData(sampleClient, [
      {
        id: '0000000099',
        createdAt: '2026-11-22T10:00:00.000Z',
        productionStatus: 'COMPLETED',
        paymentStatus: 'PENDING',
        fileName: 'arte_directo.png',
        qty: 25,
        linearMeters: 0.8,
        unitRateQ: 75.0,
        totalAmountQ: 60.0,
        items: [],
      },
    ]);

    expect(stmt.ordersCount).toBe(1);
    expect(stmt.items.length).toBe(1);
    expect(stmt.items[0].title).toBe('arte_directo.png');
    expect(stmt.balanceDueQ).toBe(60.0);
  });

  it('formatea el resumen de estado de cuenta listo para WhatsApp', () => {
    const stmt = buildClientStatementData(sampleClient, sampleOrders);
    const msg = formatStatementWhatsAppMessage(stmt);

    expect(msg).toContain('KROMA LAB — RECIBO / ESTADO DE CUENTA UV DTF');
    expect(msg).toContain('Arte Modelo Dubois');
    expect(msg).toContain('Logo_Tazas_Navidad.png');
    expect(msg).toContain('0.45 m × Q75.00/m = *Q33.75*');
    expect(msg).toContain('Servicio de corte:* Q25.00');
    expect(msg).toContain('Abonos previos:* -Q50.00');
    expect(msg).toContain('TOTAL A CANCELAR: Q200.00');

    expect(formatStatementWhatsAppMessage(null)).toBe('');
  });

  it('renderiza el HTML imprimible del Recibo Consolidado con la paleta oficial de Kroma Lab', () => {
    const stmt = buildClientStatementData(sampleClient, sampleOrders);
    const html = renderClientStatementSheetHtml(stmt);

    expect(html).toContain('RECIBO CONSOLIDADO — ESTADO DE CUENTA UV DTF');
    expect(html).toContain('Arte Modelo Dubois');
    expect(html).toContain('Logo_Tazas_Navidad.png');
    expect(html).toContain('Stickers_Termos_VIP.png');
    expect(html).toContain('Q 200.00');
    expect(html).toContain('Q75.00 / m');

    expect(renderClientStatementSheetHtml(null)).toBe('');
  });
});
