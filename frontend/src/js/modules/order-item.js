/**
/**
 * Módulo de Normalización y Estructura Canónica de OrderItem
 * Fuente única de verdad para Pedidos, Cotizaciones y Carrito de Compras en Kroma Lab.
 * Garantiza homogeneidad de datos entre cliente y base de datos relacional Neon/Prisma.
 */

/**
 * Normaliza un ítem de orden, cotización o carrito a la estructura unificada de OrderItem.
 * @param {Object} raw - Datos crudos del backend o interfaz
 * @returns {Object} Objeto OrderItem normalizado
 */
export function mapOrderItem(raw = {}) {
  const fileUrl = raw.fileUrl || raw.fileInfo?.fileUrl || null;
  const fileName = raw.fileName || raw.fileInfo?.name || null;
  const fileSizeBytes = raw.fileSizeBytes ? Number(raw.fileSizeBytes) : (raw.fileInfo?.size ? Number(raw.fileInfo.size) : null);

  const widthCm = parseFloat(raw.widthCm) || 5;
  const heightCm = parseFloat(raw.heightCm) || 5;
  const qty = parseInt(raw.qty, 10) || 1;
  const linearMeters = parseFloat(raw.actualLinearMeters || raw.linearMeters) || 0;

  const canvasSnapshot = raw.canvasSnapshot || null;
  const canvasSnapshotUrl = raw.canvasSnapshotUrl || (canvasSnapshot && !canvasSnapshot.startsWith('data:') ? canvasSnapshot : null) || null;

  return {
    id: raw.id || `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    orderId: raw.orderId || null,
    quoteId: raw.quoteId || null,
    cartId: raw.cartId || null,
    title: raw.title || `Stickers ${widthCm} × ${heightCm} cm`,
    widthCm,
    heightCm,
    qty,
    rotationDeg: parseInt(raw.rotationDeg, 10) || 0,
    rows: parseInt(raw.rows, 10) || 1,
    stickersPerRow: parseInt(raw.stickersPerRow, 10) || 1,
    includeCutting: Boolean(raw.includeCutting ?? raw.withCutting),
    actualLinearMeters: linearMeters,
    fileUrl,
    fileName,
    fileSizeBytes,
    fileInfo: raw.fileInfo || (fileUrl || fileName ? {
      name: fileName || 'diseño.png',
      fileUrl,
      size: fileSizeBytes || 0,
      sizeFormatted: fileSizeBytes ? `${(fileSizeBytes / (1024 * 1024)).toFixed(2)} MB` : '300 DPI',
    } : null),
    previewUrl: raw.previewUrl || fileUrl || null,
    canvasSnapshot,
    canvasSnapshotUrl,
    rawFile: raw.rawFile || null,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
  };
}

/**
 * Prepara un OrderItem para ser enviado a la API REST (Node.js/Prisma).
 * Elimina blobs pesados en memoria (base64) y asegura tipos estrictos.
 * @param {Object} item - Objeto OrderItem
 * @returns {Object} Payload listo para Zod/Prisma
 */
export function cleanOrderItemForApi(item = {}) {
  const normalized = mapOrderItem(item);
  return {
    id: normalized.id.startsWith('item_') ? undefined : normalized.id,
    title: normalized.title,
    widthCm: normalized.widthCm,
    heightCm: normalized.heightCm,
    qty: normalized.qty,
    rotationDeg: normalized.rotationDeg,
    rows: normalized.rows,
    stickersPerRow: normalized.stickersPerRow,
    includeCutting: normalized.includeCutting,
    actualLinearMeters: normalized.actualLinearMeters,
    fileUrl: normalized.fileUrl || null,
    fileName: normalized.fileName || null,
    fileInfo: normalized.fileInfo ? {
      name: normalized.fileName || normalized.fileInfo.name || 'diseño.png',
      fileUrl: normalized.fileUrl || normalized.fileInfo.fileUrl || null,
      size: normalized.fileSizeBytes || normalized.fileInfo.size || 0,
    } : null,
    previewUrl: (normalized.previewUrl && !normalized.previewUrl.startsWith('data:')) ? normalized.previewUrl : (normalized.fileUrl || null),
    canvasSnapshotUrl: normalized.canvasSnapshotUrl || null,
  };
}
