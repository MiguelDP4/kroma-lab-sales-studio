/**
 * Configuración maestra y constantes de negocio de Kroma Lab UV DTF.
 * Compartido entre frontend y backend para garantizar coherencia en cálculos.
 */

export const BUSINESS_CONFIG = {
  // Parámetros de bobina de impresora industrial Audley
  rollWidthCm: 30.0,
  printableWidthCm: 28.0,
  marginBetweenCm: 0.3, // 3 mm entre stickers

  // Tarifa mínima de impresión base
  minimumBillableMeters: 1.0,
  minimumBasePriceQ: 150.0,

  // Tarifa mínima de servicio de corte de precisión
  cuttingMinimumQ: 25.0,

  // Contacto comercial
  phoneWhatsApp: "50254066217", // Actualizable con el WhatsApp de Kroma Lab
  currencySymbol: "Q",
  currencyCode: "GTQ",

  // Políticas de entrega y flete en Guatemala (Valores de contingencia por defecto)
  freeShippingThresholds: {
    capital: 575.0,   // Q575 para Ciudad de Guatemala / Área Metropolitana (equivalente a 5 metros)
    interior: 1000.0, // Q1000 para Departamentos / Interior de la República (equivalente a 10 metros)
  },

  // Política estricta de pagos para trabajos personalizados UV DTF
  paymentPolicy: {
    advancePercentage: 50,      // 50% anticipo requerido para iniciar impresión
    balanceBeforeDelivery: 50,  // 50% restante requerido antes de entregar al courier
    allowFullPayment: true,     // Opción de pago 100% anticipado
    allowCOD: false,            // Cobro contra entrega estrictamente deshabilitado para evitar estafas
  },
};

/**
 * Tarifas por defecto (fallback) si la base de datos aún no tiene los rateTier configurados.
 */
export const DEFAULT_PRICING_TIER_RATES = {
  rateTier1: 150.0,
  rateTier2: 125.0,
  rateTier3: 115.0,
  rateTier4: 105.0,
  rateTier5: 95.0,
};

/**
 * Escala de precios de impresión UV DTF por metro lineal según volumen
 */
export const PRICING_TIERS = [
  { key: "rateTier1", minMeters: 0.0, maxMeters: 2.0, ratePerMeterQ: DEFAULT_PRICING_TIER_RATES.rateTier1, label: "1 a 2 metros" },
  { key: "rateTier2", minMeters: 2.0, maxMeters: 5.0, ratePerMeterQ: DEFAULT_PRICING_TIER_RATES.rateTier2, label: "2 a 5 metros" },
  { key: "rateTier3", minMeters: 5.0, maxMeters: 10.0, ratePerMeterQ: DEFAULT_PRICING_TIER_RATES.rateTier3, label: "5 a 10 metros" },
  { key: "rateTier4", minMeters: 10.0, maxMeters: 20.0, ratePerMeterQ: DEFAULT_PRICING_TIER_RATES.rateTier4, label: "10 a 20 metros" },
  { key: "rateTier5", minMeters: 20.0, maxMeters: Infinity, ratePerMeterQ: DEFAULT_PRICING_TIER_RATES.rateTier5, label: "20+ metros (Mayoreo)" },
];

/**
 * Aplica tarifas dinámicas recibidas desde SystemSetting conservando fallback si falta algún valor.
 * @param {Record<string, number|string>} [rates]
 */
export function applyDynamicPricingTiers(rates = {}) {
  const keys = ["rateTier1", "rateTier2", "rateTier3", "rateTier4", "rateTier5"];
  keys.forEach((tierKey, idx) => {
    const raw = rates ? rates[tierKey] : undefined;
    const parsed = Number(raw);
    const fallback = DEFAULT_PRICING_TIER_RATES[tierKey];
    PRICING_TIERS[idx].ratePerMeterQ = raw !== undefined && raw !== null && raw !== "" && !isNaN(parsed) && parsed > 0
      ? parsed
      : fallback;
  });

  BUSINESS_CONFIG.minimumBasePriceQ = PRICING_TIERS[0].ratePerMeterQ;
  return PRICING_TIERS;
}

/**
 * Escala de corte recto individual con máquina de precisión
 */
export const CUTTING_TIERS = [
  { maxQty: 50, ratePerUnitQ: 0.35 },
  { maxQty: 200, ratePerUnitQ: 0.30 },
  { maxQty: Infinity, ratePerUnitQ: 0.25 },
];

/**
 * Estados del ciclo de producción de órdenes
 */
export const ORDER_STATUS = {
  PENDING_REVIEW: "PENDING_REVIEW",      // Recibido, pendiente de revisión de arte
  IN_AUDLEY_QUEUE: "IN_AUDLEY_QUEUE",    // Archivo aprobado, en cola de impresión Audley
  PRINTING: "PRINTING",                  // En proceso de impresión UV
  LAMINATING_CUTTING: "LAMINATING_CUTTING", // En laminado y mesa de corte
  READY_FOR_DELIVERY: "READY_FOR_DELIVERY", // Empacado y listo para entrega/envío
  COMPLETED: "COMPLETED",                // Entregado al cliente
  CANCELLED: "CANCELLED",
};

/**
 * Roles del sistema
 */
export const USER_ROLES = {
  VISITOR: "VISITOR",
  CUSTOMER: "CUSTOMER",
  EMPLOYEE: "EMPLOYEE",
  ADMIN: "ADMIN",
};
