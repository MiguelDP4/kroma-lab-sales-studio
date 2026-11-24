/**
 * Generador de Recibo Consolidado / Estado de Cuenta por Cliente (Kroma Lab UV DTF).
 * Consolida todos los pedidos pendientes/parciales de un cliente en un único recibo
 * detallando cada imagen impresa, cantidad, metros lineales, tarifa por metro y saldo total.
 */

import {
  KROMA_PRINT_PALETTE,
  renderKromaDocumentHeader,
  renderKromaReceiptItemsAndSummary,
} from './print-helper.js';

/**
 * Construye los datos estructurados del Estado de Cuenta a partir de un cliente y sus pedidos.
 * @param {object} client
 * @param {Array<object>} orders
 * @returns {object}
 */
export function buildClientStatementData(client, orders = []) {
  const safeClient = client || {};
  const pendingOrders = (orders || []).filter(
    (o) => o && o.productionStatus !== 'CANCELLED' && o.status !== 'CANCELLED' && (o.paymentStatus === 'PENDING' || o.paymentStatus === 'PARTIAL')
  );

  const lineItems = [];
  let totalPieces = 0;
  let totalMeters = 0;
  let totalBilledQ = 0;
  let totalPaidQ = 0;
  let totalCuttingQ = 0;

  const orderSummaries = pendingOrders.map((o) => {
    const orderCode = o.code || o.id;
    const orderDate = o.createdAt || new Date().toISOString();
    const orderMeters = Number(o.metrics?.totalBillableMeters ?? o.linearMeters ?? 0);
    const unitRateQ = Number(o.metrics?.tierRate ?? o.unitRateQ ?? safeClient.customRatePerMeterQ ?? 115.0);
    const cuttingQ = Number(o.metrics?.cuttingTotalQ ?? o.cuttingPriceQ ?? 0);
    const orderTotalQ = Number(o.metrics?.grandTotalQ ?? o.totalAmountQ ?? 0);
    const orderPaidQ = Number(o.amountPaidQ ?? (o.paymentStatus === 'PARTIAL' ? Number((orderTotalQ * 0.5).toFixed(2)) : 0));
    const orderBalanceQ = Math.max(0, orderTotalQ - orderPaidQ);

    totalBilledQ += orderTotalQ;
    totalPaidQ += orderPaidQ;
    totalMeters += orderMeters;
    totalCuttingQ += cuttingQ;

    const rawItems = Array.isArray(o.items) && o.items.length > 0
      ? o.items
      : [{
          title: o.fileName || `Pedido #${orderCode}`,
          fileName: o.fileName || null,
          qty: o.qty || 1,
          actualLinearMeters: orderMeters,
          includeCutting: Boolean(o.metrics?.hasCutting || o.withCutting),
        }];

    rawItems.forEach((it) => {
      const itemQty = Number(it.qty || 0);
      const itemMeters = Number(it.actualLinearMeters || 0) > 0
        ? Number(it.actualLinearMeters)
        : (rawItems.length === 1 ? orderMeters : 0);
      const subtotalQ = Number((itemMeters * unitRateQ).toFixed(2));
      totalPieces += itemQty;

      lineItems.push({
        orderId: o.backendId || o.id,
        orderCode,
        orderDate,
        orderStatus: o.productionStatus || o.status || 'PENDING_REVIEW',
        paymentStatus: o.paymentStatus || 'PENDING',
        title: it.title || it.fileName || `Pedido #${orderCode}`,
        fileName: it.fileName || it.fileInfo?.name || null,
        qty: itemQty,
        linearMeters: Number(itemMeters.toFixed(2)),
        unitRateQ: Number(unitRateQ.toFixed(2)),
        subtotalQ,
        includeCutting: Boolean(it.includeCutting),
      });
    });

    return {
      id: o.backendId || o.id,
      localId: o.id,
      code: orderCode,
      createdAt: orderDate,
      status: o.productionStatus || o.status || 'PENDING_REVIEW',
      paymentStatus: o.paymentStatus || 'PENDING',
      linearMeters: Number(orderMeters.toFixed(2)),
      unitRateQ: Number(unitRateQ.toFixed(2)),
      cuttingPriceQ: Number(cuttingQ.toFixed(2)),
      totalAmountQ: Number(orderTotalQ.toFixed(2)),
      amountPaidQ: Number(orderPaidQ.toFixed(2)),
      balanceDueQ: Number(orderBalanceQ.toFixed(2)),
      itemsCount: rawItems.length,
    };
  });

  const balanceDueQ = Math.max(0, totalBilledQ - totalPaidQ);

  return {
    generatedAt: new Date().toISOString(),
    customer: {
      id: safeClient.id || '',
      companyName: safeClient.company || safeClient.companyName || safeClient.name || 'Cliente B2B',
      managerName: safeClient.name || safeClient.managerName || '',
      phone: safeClient.phone || '',
      email: safeClient.email || '',
      taxId: safeClient.nit || safeClient.taxId || 'CF',
      address: safeClient.address || '',
      customRatePerMeterQ: safeClient.customRatePerMeterQ ?? null,
      exemptFromMinimum: Boolean(safeClient.exemptFromMinimum),
      allowCredit: Boolean(safeClient.allowCredit),
    },
    ordersCount: orderSummaries.length,
    totalPieces,
    totalMeters: Number(totalMeters.toFixed(2)),
    totalCuttingQ: Number(totalCuttingQ.toFixed(2)),
    totalBilledQ: Number(totalBilledQ.toFixed(2)),
    totalPaidQ: Number(totalPaidQ.toFixed(2)),
    balanceDueQ: Number(balanceDueQ.toFixed(2)),
    items: lineItems,
    orders: orderSummaries,
  };
}

/**
 * Formatea el estado de cuenta consolidado como texto limpio listo para enviar por WhatsApp.
 * @param {object} statement
 * @returns {string}
 */
export function formatStatementWhatsAppMessage(statement) {
  if (!statement || !statement.customer) return '';

  const dateStr = new Date(statement.generatedAt || Date.now()).toLocaleDateString('es-GT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const lines = [
    `*KROMA LAB — RECIBO / ESTADO DE CUENTA UV DTF*`,
    `🏢 *Cliente:* ${statement.customer.companyName}`,
    `📅 *Fecha de corte:* ${dateStr}`,
    `────────────────────────`,
  ];

  (statement.items || []).forEach((it, idx) => {
    const itemDate = new Date(it.orderDate).toLocaleDateString('es-GT', { day: '2-digit', month: 'short' });
    lines.push(
      `${idx + 1}. *${it.title}* (${itemDate})`,
      `   • Cant: ${it.qty} pzs | ${Number(it.linearMeters).toFixed(2)} m × Q${Number(it.unitRateQ).toFixed(2)}/m = *Q${Number(it.subtotalQ).toFixed(2)}*`
    );
  });

  lines.push(`────────────────────────`);
  lines.push(`📏 *Metros totales:* ${Number(statement.totalMeters).toFixed(2)} m (${statement.totalPieces} piezas)`);

  if (Number(statement.totalCuttingQ || 0) > 0) {
    lines.push(`✂️ *Servicio de corte:* Q${Number(statement.totalCuttingQ).toFixed(2)}`);
  }
  if (Number(statement.totalPaidQ || 0) > 0) {
    lines.push(`💳 *Abonos previos:* -Q${Number(statement.totalPaidQ).toFixed(2)}`);
  }

  lines.push(`💰 *TOTAL A CANCELAR: Q${Number(statement.balanceDueQ).toFixed(2)}*`);

  return lines.join('\n');
}

/**
 * Renderiza el HTML imprimible / PDF del Recibo Consolidado / Estado de Cuenta de un cliente.
 * @param {object} statement
 * @returns {string}
 */
export function renderClientStatementSheetHtml(statement) {
  if (!statement || !statement.customer) return '';
  const P = KROMA_PRINT_PALETTE;
  const cust = statement.customer;

  const formattedDate = new Date(statement.generatedAt || Date.now()).toLocaleDateString('es-GT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const uniqueRates = Array.from(new Set((statement.items || []).map((i) => Number(i.unitRateQ).toFixed(2))));
  const rateSummaryLabel = uniqueRates.length === 1
    ? `Q${uniqueRates[0]} / m`
    : (cust.customRatePerMeterQ ? `Q${Number(cust.customRatePerMeterQ).toFixed(2)} / m` : 'Mixta');

  const headerHtml = renderKromaDocumentHeader({
    title: 'RECIBO CONSOLIDADO — ESTADO DE CUENTA UV DTF',
    subtitle: 'KROMA LAB — IMPRESIÓN INDUSTRIAL UV DTF',
    folioBadge: `Corte ${statement.ordersCount} ${statement.ordersCount === 1 ? 'Pedido' : 'Pedidos'}`,
    logoIdPrefix: `stmt-logo-${(cust.id || 'client').replace(/[^a-zA-Z0-9]/g, '')}`,
    metaRows: [
      {
        label: 'Proveedor:',
        value: 'Kroma Lab — Miguel Dubois',
        highlight: true,
      },
      {
        label: 'Cliente:',
        value: `${cust.companyName}${cust.managerName && cust.managerName !== cust.companyName ? ` (${cust.managerName})` : ''} • ${cust.phone || 'Sin teléfono'} • NIT: ${cust.taxId || 'CF'}`,
        highlight: true,
      },
      {
        label: 'Fecha de Corte:',
        value: `${formattedDate}   |   ${statement.ordersCount} ${statement.ordersCount === 1 ? 'orden pendiente' : 'órdenes pendientes'}`,
      },
      {
        label: 'Tarifa Aplicada:',
        value: `${rateSummaryLabel} (${Number(statement.totalMeters).toFixed(2)} metros lineales acumulados)`,
        highlight: true,
      },
    ],
  });

  const receiptItems = (statement.items || []).map((it) => {
    const itemDate = new Date(it.orderDate).toLocaleDateString('es-GT', { day: '2-digit', month: 'short' });
    const qty = Number(it.qty || 1);
    const meters = Number(it.linearMeters || 0);
    const rate = Number(it.unitRateQ || 0);
    const subQ = Number(it.subtotalQ || 0);
    const unitRef = qty > 0 ? subQ / qty : 0;

    return {
      qty,
      descriptionHtml: `<strong>${it.title}</strong><div style="font-size: 0.72rem; color: ${P.TEXT_MUTED}; margin-top: 2px;">Orden #${it.orderCode} • ${itemDate}${it.includeCutting ? ' • ✂️ Corte' : ''}</div>`,
      measure: it.fileName ? it.fileName : 'Bobina UV DTF',
      linearMeters: `${meters.toFixed(2)} m`,
      ratePerMeter: `Q${rate.toFixed(2)}`,
      unitCostRef: `Q${unitRef.toFixed(2)}`,
      subtotal: `Q${subQ.toFixed(2)}`,
    };
  });

  const summaryLines = [
    {
      label: 'Total de piezas impresas:',
      value: `${Number(statement.totalPieces || 0).toLocaleString('es-GT')} unidades`,
    },
    {
      label: 'Total de metros lineales:',
      value: `${Number(statement.totalMeters || 0).toFixed(2)} m`,
    },
  ];

  if (Number(statement.totalCuttingQ || 0) > 0) {
    summaryLines.push({
      label: 'Servicio de corte acumulado:',
      value: `Q ${Number(statement.totalCuttingQ).toFixed(2)}`,
    });
  }

  if (Number(statement.totalPaidQ || 0) > 0) {
    summaryLines.push({
      label: 'Abonos previos aplicados:',
      value: `- Q ${Number(statement.totalPaidQ).toFixed(2)}`,
    });
  }

  summaryLines.push({
    label: 'SALDO TOTAL A CANCELAR:',
    value: `Q ${Number(statement.balanceDueQ || 0).toFixed(2)}`,
    isGrand: true,
  });

  const leftNoteHtml = `
    <div style="border: 1px solid ${P.POWDER_BLUE}; background: ${P.BG_LIGHT}; padding: 0.75rem 0.9rem; border-radius: 4px; border-left: 4px solid ${P.REGAL_NAVY}; height: 100%;">
      <strong style="font-size: 0.78rem; text-transform: uppercase; color: ${P.REGAL_NAVY}; display: block; margin-bottom: 0.35rem;">
        Detalle de Órdenes Incluidas en este Corte:
      </strong>
      <div style="font-size: 0.76rem; color: ${P.SPACE_INDIGO}; display: flex; flex-direction: column; gap: 0.25rem;">
        ${(statement.orders || []).map((o) => `
          <div>• <strong>#${o.code}</strong> (${new Date(o.createdAt).toLocaleDateString('es-GT', { day: '2-digit', month: 'short' })}) — ${Number(o.linearMeters).toFixed(2)} m — <strong>Q${Number(o.balanceDueQ).toFixed(2)}</strong></div>
        `).join('')}
      </div>
    </div>
  `;

  const tableAndSummaryHtml = renderKromaReceiptItemsAndSummary({
    items: receiptItems,
    totals: {
      totalQty: `${Number(statement.totalPieces || 0).toLocaleString('es-GT')}`,
      totalMeters: `${Number(statement.totalMeters || 0).toFixed(2)} m`,
      rateLabel: rateSummaryLabel,
      grandTotal: `Q${Number(statement.balanceDueQ || 0).toFixed(2)}`,
    },
    summaryLines,
    leftSlotHtml: leftNoteHtml,
  });

  return `
    <div class="workshop-sheet-card kroma-print-sheet">
      ${headerHtml}
      ${tableAndSummaryHtml}
    </div>
  `;
}
