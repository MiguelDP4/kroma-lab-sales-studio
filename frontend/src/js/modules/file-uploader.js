/**
 * Módulo de Validación y Manejo de Archivos Gráficos para UV DTF
 * Soporta formatos de alta calidad industrial (PNG transparente, TIFF, PDF, AI, PSD, SVG).
 * Integra subida directa a Cloudflare R2 con URLs pre-firmadas S3 y fallback local.
 */

import { apiClient as defaultApiClient } from './api-client.js';

export const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.tif', '.tiff', '.pdf', '.svg', '.ai', '.psd'];
export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100 Megabytes

export const ALLOWED_RECEIPT_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf'];
export const MAX_RECEIPT_SIZE_BYTES = 20 * 1024 * 1024; // 20 Megabytes

export function formatFileSize(bytes) {
  if (typeof bytes !== 'number' || bytes < 0) return '0 B';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getFileExtension(filename) {
  if (!filename || typeof filename !== 'string') return '';
  const idx = filename.lastIndexOf('.');
  return idx !== -1 ? filename.slice(idx).toLowerCase() : '';
}

export function validatePrintFile(file) {
  if (!file) {
    return { valid: false, error: 'No se seleccionó ningún archivo.' };
  }

  const name = file.name || 'archivo_desconocido';
  const size = file.size || 0;
  let ext = getFileExtension(name);
  if (!ext && file.type) {
    if (file.type === 'image/jpeg' || file.type === 'image/jpg') ext = '.jpg';
    else if (file.type === 'image/png') ext = '.png';
    else if (file.type === 'image/tiff') ext = '.tif';
    else if (file.type === 'application/pdf') ext = '.pdf';
  }

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Formato no soportado (${ext || 'desconocido'}). Usa archivos PNG, JPG, TIFF, PDF, SVG, AI o PSD.`,
    };
  }

  if (size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `El archivo supera el límite de 100 MB (tamaño: ${formatFileSize(size)}). Si es muy pesado, envíalo por enlace de Drive o WeTransfer.`,
    };
  }

  return {
    valid: true,
    fileData: {
      name,
      size,
      sizeFormatted: formatFileSize(size),
      extension: ext,
      type: file.type || 'application/octet-stream',
      lastModified: file.lastModified || Date.now(),
    },
  };
}

export function validateReceiptFile(file) {
  if (!file) {
    return { valid: false, error: 'No se seleccionó ningún archivo de comprobante.' };
  }

  const name = file.name || 'comprobante_desconocido';
  const size = file.size || 0;
  const ext = getFileExtension(name);

  if (!ALLOWED_RECEIPT_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Formato de comprobante no soportado (${ext || 'desconocido'}). Sube imágenes JPG, PNG o documentos PDF.`,
    };
  }

  if (size > MAX_RECEIPT_SIZE_BYTES) {
    return {
      valid: false,
      error: `El comprobante supera el límite de 20 MB (tamaño: ${formatFileSize(size)}). Comprime el archivo antes de subirlo.`,
    };
  }

  return {
    valid: true,
    fileData: {
      name,
      size,
      sizeFormatted: formatFileSize(size),
      extension: ext,
      type: file.type || 'application/octet-stream',
      lastModified: file.lastModified || Date.now(),
    },
  };
}

export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('Archivo no proporcionado'));
    // Solo generar preview visual para imágenes web estándar
    const ext = getFileExtension(file.name);
    if (!['.png', '.svg', '.jpg', '.jpeg', '.webp'].includes(ext)) {
      return resolve(null); // Para PDF/TIFF/AI no se requiere dataURL completo en cliente
    }

    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Error al leer el archivo en memoria'));
    reader.readAsDataURL(file);
  });
}

/**
 * Sube un archivo gráfico directamente a Cloudflare R2 usando Pre-signed URLs S3 (o fallback local)
 * con reporte continuo de progreso para la interfaz de usuario.
 *
 * @param {File|Blob} file - Archivo seleccionado por el usuario.
 * @param {Object} options - Parámetros de contexto y callbacks:
 *   - context: 'quotes' | 'orders' | 'general'
 *   - referenceCode: Correlativo de orden o cotización
 *   - quoteId: ID de cotización a vincular
 *   - orderId: ID de orden a vincular
 *   - onProgress: ({ loaded, total, percent }) => void
 *   - apiClient: Instancia personalizada del cliente HTTP (opcional)
 * @returns {Promise<Object>} Datos del archivo subido (fileKey, fileUrl, provider, confirmation)
 */
export async function uploadFileToStorage(file, options = {}) {
  const {
    context = 'quotes',
    referenceCode = null,
    quoteId = null,
    orderId = null,
    onProgress = null,
    apiClient = defaultApiClient,
  } = options;

  if (!apiClient || !apiClient.storage) {
    throw new Error('Cliente API de almacenamiento no disponible.');
  }

  const isPayment = context === 'payments' || Boolean(options.isReceipt);
  // 1. Validar archivo
  const validation = isPayment ? validateReceiptFile(file) : validatePrintFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // 2. Solicitar URL prefirmada al backend
  const presignedPayload = {
    fileName: file.name,
    fileType: file.type || 'application/octet-stream',
    fileSizeBytes: file.size,
    context,
  };
  if (referenceCode) {
    presignedPayload.referenceCode = referenceCode;
  }

  const presigned = await apiClient.storage.getPresignedUrl(presignedPayload);

  if (!presigned || !presigned.uploadUrl) {
    throw new Error('No se pudo obtener la URL de subida prefirmada.');
  }

  // 3. Subir archivo vía PUT con tracking de progreso
  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', presigned.uploadUrl, true);
    if (file.type) {
      xhr.setRequestHeader('Content-Type', file.type);
    }

    if (xhr.upload && typeof onProgress === 'function') {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress({ loaded: event.loaded, total: event.total, percent });
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        if (typeof onProgress === 'function') {
          onProgress({ loaded: file.size, total: file.size, percent: 100 });
        }
        resolve();
      } else {
        reject(new Error(`Error al subir archivo (${xhr.status}): ${xhr.statusText || 'Error del servidor'}`));
      }
    };

    xhr.onerror = () => reject(new Error('Error de conexión de red al subir el archivo'));
    xhr.ontimeout = () => reject(new Error('Tiempo de espera agotado al subir el archivo'));
    xhr.send(file);
  });

  // 4. Confirmar y vincular si corresponde en la base de datos
  let confirmation = null;
  if (presigned.fileKey && presigned.publicUrl) {
        try {
      const confirmPayload = {
        fileKey: presigned.fileKey,
        fileUrl: presigned.publicUrl,
        fileName: file.name,
        fileSizeBytes: file.size,
        quoteId: quoteId || null,
        orderId: orderId || null,
      };
      if (isPayment) {
        confirmPayload.isReceipt = true;
        confirmPayload.context = 'payments';
      }
      confirmation = await apiClient.storage.confirmUpload(confirmPayload);
    } catch (confirmErr) {
      console.warn('Advertencia al confirmar subida en base de datos:', confirmErr);
    }
  }

  return {
    success: true,
    fileKey: presigned.fileKey,
    fileUrl: presigned.publicUrl,
    fileName: file.name,
    fileSizeBytes: file.size,
    fileSizeFormatted: formatFileSize(file.size),
    provider: presigned.provider,
    confirmation,
  };
}

/**
 * Convierte un Data URL (base64) en un objeto File/Blob compatible con subidas multipart/PUT.
 * @param {string} dataUrl - Cadena en formato data:image/...;base64,...
 * @param {string} filename - Nombre del archivo de destino.
 * @returns {File|Blob|null}
 */
export function dataURLtoFile(dataUrl, filename = 'esquema_bobina.png') {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    return null;
  }
  try {
    const parts = dataUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    if (typeof File !== 'undefined') {
      return new File([u8arr], filename, { type: mime });
    }
    const blob = new Blob([u8arr], { type: mime });
    blob.name = filename;
    return blob;
  } catch (err) {
    console.warn('[Storage] Error al convertir dataURL a File:', err);
    return null;
  }
}

/**
 * Sube una instantánea del canvas (en base64) a Cloudflare R2 / Storage
 * y retorna la URL pública HTTP/HTTPS permanente.
 * @param {string} dataUrl - Cadena en base64 del canvas.
 * @param {string} filename - Nombre de archivo opcional.
 * @param {Object} options - Opciones de contexto para uploadFileToStorage.
 * @returns {Promise<string|null>} - URL pública permanente en R2 o null en caso de error.
 */
export async function uploadCanvasSnapshotToStorage(dataUrl, filename = 'esquema_bobina.png', options = {}) {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    return null;
  }
  const file = dataURLtoFile(dataUrl, filename);
  if (!file) return null;
  try {
    const res = await uploadFileToStorage(file, {
      context: options.context || 'orders',
      referenceCode: options.referenceCode || null,
      ...options,
    });
    return res?.fileUrl || null;
  } catch (err) {
    console.warn('[Storage] Error al subir snapshot a almacenamiento:', err);
    return null;
  }
}

/**
 * Sube una boleta o comprobante de pago bancario a Cloudflare R2 / Storage
 * con validación de formatos (JPG, PNG, PDF) y tamaño máximo de 20MB.
 */
export async function uploadPaymentReceiptToStorage(file, options = {}) {
  return uploadFileToStorage(file, {
    ...options,
    context: 'payments',
    isReceipt: true,
  });
}
