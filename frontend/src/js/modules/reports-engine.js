/**
 * Motor de Reportes Comerciales, Consumo de Bobina Audley UV DTF y Analítica B2B
 * Genera métricas financieras de facturación, cálculo de insumos (Film A/B, tinta UV),
 * indicadores de fidelización y exportación de archivos en formato CSV compatible con Excel.
 */

import { ORDER_STATUS } from '../../shared/business-config.js';
import { PAYMENT_STATUS } from './orders-store.js';
import { CLIENT_CATEGORIES, CLIENT_TIERS } from './clients-store.js';

export const REPORT_PERIODS = {
  ALL: { id: 'ALL', label: 'Histórico Completo' },
  TODAY: { id: 'TODAY', label: 'Hoy' },
  THIS_WEEK: { id: 'THIS_WEEK', label: 'Últimos 7 Días' },
  THIS_MONTH: { id: 'THIS_MONTH', label: 'Este Mes' },
  LAST_30_DAYS: { id: 'LAST_30_DAYS', label: 'Últimos 30 Días' },
};

/**
 * Filtra un conjunto de órdenes según el período seleccionado.
 * @param {Array} orders Lista de pedidos
 * @param {string} period Clave del período (ALL, TODAY, THIS_WEEK, THIS_MONTH, LAST_30_DAYS)
 * @param {Date} [referenceDate=new Date()] Fecha de referencia (útil para pruebas)
 * @returns {Array} Órdenes filtradas
 */
export function filterOrdersByPeriod(orders = [], period = 'ALL', referenceDate = new Date()) {
  if (!Array.isArray(orders)) return [];
  if (period === 'ALL') return [...orders];

  const refTime = referenceDate.getTime();
  const startOfToday = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate()).getTime();
  const endOfToday = startOfToday + 86400000 - 1;

  return orders.filter(o => {
    if (!o || !o.createdAt) return false;
    const orderTime = new Date(o.createdAt).getTime();
    if (isNaN(orderTime)) return false;

    switch (period) {
      case 'TODAY':
        return orderTime >= startOfToday && orderTime <= endOfToday;

      case 'THIS_WEEK': {
        const sevenDaysAgo = refTime - (7 * 86400000);
        return orderTime >= sevenDaysAgo && orderTime <= refTime;
      }

      case 'THIS_MONTH': {
        const startOfMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1).getTime();
        return orderTime >= startOfMonth && orderTime <= refTime;
      }

      case 'LAST_30_DAYS': {
        const thirtyDaysAgo = refTime - (30 * 86400000);
        return orderTime >= thirtyDaysAgo && orderTime <= refTime;
      }

      default:
        return true;
    }
  });
}

/**
 * Calcula el reporte comercial integral consolidado.
 * @param {Array} orders Lista total de pedidos
 * @param {Array} clients Lista total de clientes B2B
 * @param {string} [period='ALL'] Período de tiempo
 * @param {Date} [referenceDate=new Date()] Fecha base
 * @returns {Object} Reporte analítico con métricas financieras, bobina y clientes
 */
export function calculateCommercialReport(orders = [], clients = [], period = 'ALL', referenceDate = new Date()) {
  const filteredOrders = filterOrdersByPeriod(orders, period, referenceDate);
  const activeOrders = filteredOrders.filter(o => o.productionStatus !== ORDER_STATUS.CANCELLED);

  // 1. Métricas Financieras y de Cobranza
  let grossRevenueQ = 0;
  let paidRevenueQ = 0;
  let pendingDebtQ = 0;
  let cuttingRevenueQ = 0;
  let totalMeters = 0;
  let completedMeters = 0;
  let inQueueMeters = 0;
  let totalStickersCount = 0;

  const paymentBreakdown = {
    [PAYMENT_STATUS.PAID]: 0,
    [PAYMENT_STATUS.PARTIAL]: 0,
    [PAYMENT_STATUS.PENDING]: 0,
    [PAYMENT_STATUS.CANCELLED]: 0,
  };

  const productionBreakdown = {
    [ORDER_STATUS.IN_AUDLEY_QUEUE]: 0,
    [ORDER_STATUS.PRINTING]: 0,
    [ORDER_STATUS.LAMINATING_CUTTING]: 0,
    [ORDER_STATUS.READY_FOR_DELIVERY]: 0,
    [ORDER_STATUS.COMPLETED]: 0,
    [ORDER_STATUS.CANCELLED]: 0,
  };

  filteredOrders.forEach(o => {
    const isCancelled = o.productionStatus === ORDER_STATUS.CANCELLED || o.paymentStatus === PAYMENT_STATUS.CANCELLED;
    const totalQ = o.metrics?.grandTotalQ || 0;
    const meters = o.metrics?.totalBillableMeters || 0;
    const cuttingQ = o.metrics?.cuttingTotalQ || 0;

    // Contadores de estado
    if (paymentBreakdown[o.paymentStatus] !== undefined) {
      paymentBreakdown[o.paymentStatus]++;
    }
    if (productionBreakdown[o.productionStatus] !== undefined) {
      productionBreakdown[o.productionStatus]++;
    }

    if (!isCancelled) {
      grossRevenueQ += totalQ;
      cuttingRevenueQ += cuttingQ;
      totalMeters += meters;

      if (o.productionStatus === ORDER_STATUS.COMPLETED) {
        completedMeters += meters;
      } else {
        inQueueMeters += meters;
      }

      if (o.paymentStatus === PAYMENT_STATUS.PAID) {
        paidRevenueQ += totalQ;
      } else if (o.paymentStatus === PAYMENT_STATUS.PARTIAL) {
        paidRevenueQ += totalQ * 0.5;
        pendingDebtQ += totalQ * 0.5;
      } else if (o.paymentStatus === PAYMENT_STATUS.PENDING) {
        pendingDebtQ += totalQ;
      }

      if (Array.isArray(o.items)) {
        o.items.forEach(it => {
          totalStickersCount += it.qty || 0;
        });
      }
    }
  });

  const activeOrdersCount = activeOrders.length;
  const averageTicketQ = activeOrdersCount > 0 ? (grossRevenueQ / activeOrdersCount) : 0;
  const collectionRatePercent = grossRevenueQ > 0 ? Math.round((paidRevenueQ / grossRevenueQ) * 100) : 0;

  // 2. Consumo Industrial de Bobina Audley UV DTF (28 cm útiles)
  // Cada metro lineal utiliza 1.05m de film A base, 1.02m de film B de laminación, y ~15ml de tinta UV combinada
  const rollsEquivalent100m = totalMeters / 100;
  const estimatedFilmAMeters = totalMeters * 1.05;
  const estimatedFilmBMeters = totalMeters * 1.02;
  const estimatedInkLiters = totalMeters * 0.015;

  // 3. Fidelización y Ranking de Clientes B2B
  const clientStatsMap = new Map();
  clients.forEach(c => {
    clientStatsMap.set(c.id, {
      client: c,
      ordersCount: 0,
      totalMeters: 0,
      totalSpentQ: 0,
      pendingDebtQ: 0,
    });
  });

  filteredOrders.forEach(o => {
    if (o.productionStatus === ORDER_STATUS.CANCELLED) return;
    const clientId = o.customer?.clientId;
    let entry = clientId ? clientStatsMap.get(clientId) : null;

    if (!entry) {
      // Buscar cliente por nombre o compañía si no tiene clientId directo
      const cCompany = (o.customer?.company || '').toLowerCase().trim();
      const cName = (o.customer?.name || '').toLowerCase().trim();
      for (const [, st] of clientStatsMap) {
        const comp = (st.client.company || '').toLowerCase().trim();
        const nom = (st.client.name || '').toLowerCase().trim();
        if ((cCompany && comp === cCompany) || (cName && nom === cName)) {
          entry = st;
          break;
        }
      }
    }

    if (entry) {
      entry.ordersCount++;
      entry.totalMeters += (o.metrics?.totalBillableMeters || 0);
      entry.totalSpentQ += (o.metrics?.grandTotalQ || 0);
      if (o.paymentStatus === PAYMENT_STATUS.PENDING) {
        entry.pendingDebtQ += (o.metrics?.grandTotalQ || 0);
      } else if (o.paymentStatus === PAYMENT_STATUS.PARTIAL) {
        entry.pendingDebtQ += (o.metrics?.grandTotalQ || 0) * 0.5;
      }
    }
  });

  const topClientsRanking = Array.from(clientStatsMap.values())
    .filter(st => st.totalSpentQ > 0 || st.ordersCount > 0)
    .sort((a, b) => b.totalSpentQ - a.totalSpentQ)
    .slice(0, 10)
    .map((st, idx) => ({
      rank: idx + 1,
      id: st.client.id,
      company: st.client.company,
      name: st.client.name,
      tier: st.client.tier,
      tierBadge: CLIENT_TIERS[st.client.tier]?.badge || st.client.tier,
      ordersCount: st.ordersCount,
      totalMeters: st.totalMeters,
      totalSpentQ: st.totalSpentQ,
      pendingDebtQ: st.pendingDebtQ,
    }));

  // Avance hacia la meta de 20-30 clientes B2B (referencia: 25 clientes)
  const targetClients = 25;
  const activeRecurringClients = clients.filter(c => c.tier === 'VIP' || c.tier === 'RECURRENTE').length;
  const b2bGoalProgressPercent = Math.min(100, Math.round((activeRecurringClients / targetClients) * 100));

  // Desglose por sector
  const categoryBreakdown = {};
  Object.keys(CLIENT_CATEGORIES).forEach(catKey => {
    categoryBreakdown[catKey] = {
      ...CLIENT_CATEGORIES[catKey],
      clientsCount: 0,
    };
  });
  clients.forEach(c => {
    if (categoryBreakdown[c.category]) {
      categoryBreakdown[c.category].clientsCount++;
    }
  });

  return {
    period,
    periodLabel: REPORT_PERIODS[period]?.label || period,
    filteredOrdersCount: filteredOrders.length,
    financials: {
      grossRevenueQ,
      paidRevenueQ,
      pendingDebtQ,
      collectionRatePercent,
      averageTicketQ,
      cuttingRevenueQ,
    },
    audleyRoll: {
      totalMeters,
      completedMeters,
      inQueueMeters,
      rollsEquivalent100m,
      estimatedFilmAMeters,
      estimatedFilmBMeters,
      estimatedInkLiters,
      totalStickersCount,
    },
    ordersBreakdown: {
      total: filteredOrders.length,
      active: activeOrdersCount,
      payment: paymentBreakdown,
      production: productionBreakdown,
    },
    b2bPortfolio: {
      totalClients: clients.length,
      activeRecurringClients,
      targetClients,
      goalProgressPercent: b2bGoalProgressPercent,
      topClientsRanking,
      categoryBreakdown,
    },
  };
}

/**
 * Escapa un valor individual para cumplir con el estándar CSV (RFC 4180).
 */
function escapeCSVValue(value) {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes(';')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Genera el archivo CSV detallado de Pedidos UV DTF.
 * @param {Array} orders Lista de pedidos
 * @returns {string} Contenido CSV con UTF-8 BOM
 */
export function generateOrdersCSV(orders = []) {
  const headers = [
    'No. Pedido',
    'Fecha',
    'Cliente / Contacto',
    'Empresa',
    'NIT SAT',
    'WhatsApp',
    'Direccion',
    'Metros Facturables (m)',
    'Tarifa Metro (Q)',
    'Total (Q)',
    'Estado de Pago',
    'Estado de Produccion',
    'Corte Perimetral',
    'Notas de Taller'
  ];

  const rows = orders.map(o => {
    const cust = o.customer || {};
    const metrics = o.metrics || {};
    const dateFormatted = o.createdAt ? new Date(o.createdAt).toLocaleDateString('es-GT') : '';

    return [
      o.id || '',
      dateFormatted,
      cust.name || '',
      cust.company || '',
      cust.nit || 'CF',
      cust.phone || '',
      cust.address || '',
      (metrics.totalBillableMeters || 0).toFixed(2),
      (metrics.tierRate || 0).toFixed(2),
      (metrics.grandTotalQ || 0).toFixed(2),
      o.paymentStatus || '',
      o.productionStatus || '',
      metrics.hasCutting ? 'SI' : 'NO',
      o.workshopNotes || ''
    ].map(escapeCSVValue).join(',');
  });

  // Prefijo \uFEFF para que Excel reconozca codificación UTF-8 automáticamente
  return '\uFEFF' + [headers.map(escapeCSVValue).join(','), ...rows].join('\r\n');
}

/**
 * Genera el archivo CSV de Cartera de Clientes B2B.
 * @param {Array} clients Lista de clientes
 * @param {Array} orders Lista de pedidos para correlacionar métricas
 * @returns {string} Contenido CSV con UTF-8 BOM
 */
export function generateClientsPortfolioCSV(clients = [], orders = []) {
  const headers = [
    'ID Cliente',
    'Empresa / Marca',
    'Contacto Principal',
    'WhatsApp',
    'NIT SAT',
    'Correo Electronico',
    'Categoria',
    'Nivel / Tier',
    'Direccion',
    'Pedidos Realizados',
    'Metros Acumulados (m)',
    'Total Facturado (Q)',
    'Saldo Pendiente (Q)'
  ];

  const rows = clients.map(c => {
    // Calcular métricas de cada cliente
    const clientOrders = orders.filter(o => {
      if (o.productionStatus === ORDER_STATUS.CANCELLED) return false;
      if (o.customer?.clientId === c.id) return true;
      const cComp = (c.company || '').toLowerCase().trim();
      const oComp = (o.customer?.company || '').toLowerCase().trim();
      return cComp && oComp && cComp === oComp;
    });

    const totalMeters = clientOrders.reduce((sum, o) => sum + (o.metrics?.totalBillableMeters || 0), 0);
    const totalSpentQ = clientOrders.reduce((sum, o) => sum + (o.metrics?.grandTotalQ || 0), 0);
    const pendingDebtQ = clientOrders.reduce((sum, o) => {
      if (o.paymentStatus === PAYMENT_STATUS.PENDING) return sum + (o.metrics?.grandTotalQ || 0);
      if (o.paymentStatus === PAYMENT_STATUS.PARTIAL) return sum + ((o.metrics?.grandTotalQ || 0) * 0.5);
      return sum;
    }, 0);

    const catLabel = CLIENT_CATEGORIES[c.category]?.label || c.category;
    const tierLabel = CLIENT_TIERS[c.tier]?.label || c.tier;

    return [
      c.id || '',
      c.company || '',
      c.name || '',
      c.phone || '',
      c.nit || 'CF',
      c.email || '',
      catLabel,
      tierLabel,
      c.address || '',
      clientOrders.length,
      totalMeters.toFixed(2),
      totalSpentQ.toFixed(2),
      pendingDebtQ.toFixed(2)
    ].map(escapeCSVValue).join(',');
  });

  return '\uFEFF' + [headers.map(escapeCSVValue).join(','), ...rows].join('\r\n');
}

/**
 * Genera el archivo CSV de Consumo Industrial de Bobina Audley UV DTF.
 * @param {Array} orders Lista de pedidos
 * @returns {string} Contenido CSV con UTF-8 BOM
 */
export function generateRollConsumptionCSV(orders = []) {
  const headers = [
    'No. Pedido',
    'Fecha',
    'Cliente',
    'Diseno Principal',
    'Piezas Totales',
    'Metros Bobina 28cm (m)',
    'Film A Estimado (m)',
    'Film B Estimado (m)',
    'Tinta UV Est. (ml)',
    'Acabado Taller',
    'Estado Produccion'
  ];

  const rows = orders.filter(o => o.productionStatus !== ORDER_STATUS.CANCELLED).map(o => {
    const cust = o.customer || {};
    const metrics = o.metrics || {};
    const dateFormatted = o.createdAt ? new Date(o.createdAt).toLocaleDateString('es-GT') : '';
    const mainItem = o.items?.[0] || {};
    const totalPieces = (o.items || []).reduce((sum, it) => sum + (it.qty || 0), 0);
    const meters = metrics.totalBillableMeters || 0;

    return [
      o.id || '',
      dateFormatted,
      cust.company || cust.name || '',
      mainItem.title || 'Stickers UV DTF',
      totalPieces,
      meters.toFixed(2),
      (meters * 1.05).toFixed(2),
      (meters * 1.02).toFixed(2),
      (meters * 15).toFixed(1),
      metrics.hasCutting ? 'Corte Perimetral' : 'Rollo Continuo',
      o.productionStatus || ''
    ].map(escapeCSVValue).join(',');
  });

  return '\uFEFF' + [headers.map(escapeCSVValue).join(','), ...rows].join('\r\n');
}

/**
 * Descarga en el navegador un archivo CSV con nombre y contenido especificados.
 * @param {string} filename Nombre del archivo .csv
 * @param {string} csvContent Cadena de texto CSV
 * @returns {boolean} Éxito de la operación
 */
export function downloadCSV(filename, csvContent) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }

  try {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = window.URL?.createObjectURL ? window.URL.createObjectURL(blob) : null;

    if (url) {
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.position = 'fixed';
      link.style.top = '-9999px';
      link.style.left = '-9999px';
      link.style.opacity = '0';
      link.style.pointerEvents = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      return true;
    }
  } catch (err) {
    console.error('Error al exportar archivo CSV:', err);
  }
  return false;
}
