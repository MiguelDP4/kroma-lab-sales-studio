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
  minimumBasePriceQ: 140.0,

  // Tarifa mínima de servicio de corte de precisión
  cuttingMinimumQ: 25.0,

  // Contacto comercial
  phoneWhatsApp: "50254066217", // Actualizable con el WhatsApp de Kroma Lab
  currencySymbol: "Q",
  currencyCode: "GTQ",
};

/**
 * Escala de precios de impresión UV DTF por metro lineal según volumen
 */
export const PRICING_TIERS = [
  { minMeters: 0.0, maxMeters: 1.0, ratePerMeterQ: 140.0, label: "Mínimo (1 metro)" },
  { minMeters: 1.0, maxMeters: 5.0, ratePerMeterQ: 115.0, label: "1 a 5 metros" },
  { minMeters: 5.0, maxMeters: 10.0, ratePerMeterQ: 105.0, label: "5 a 10 metros" },
  { minMeters: 10.0, maxMeters: 20.0, ratePerMeterQ: 95.0, label: "10 a 20 metros" },
  { minMeters: 20.0, maxMeters: Infinity, ratePerMeterQ: 85.0, label: "20+ metros (Mayoreo)" },
];

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
