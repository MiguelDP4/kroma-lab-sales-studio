/**
 * Módulo de Validación y Manejo de Archivos Gráficos para UV DTF
 * Soporta formatos de alta calidad industrial (PNG transparente, TIFF, PDF, AI, PSD, SVG).
 * Integra subida directa a Cloudflare R2 con URLs pre-firmadas S3 y fallback local.
 */

import { apiClient as defaultApiClient } from './api-client.js';

export const ALLOWED_EXTENSIONS = ['.png', '.tif', '.tiff', '.pdf', '.svg', '.ai', '.psd'];
export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100 Megabytes

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
  const ext = getFileExtension(name);

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Formato no soportado (${ext || 'desconocido'}). Usa archivos PNG (fondo transparente), TIFF, PDF, SVG, AI o PSD.`,
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

  // 1. Validar archivo
  const validation = validatePrintFile(file);
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
      confirmation = await apiClient.storage.confirmUpload({
        fileKey: presigned.fileKey,
        fileUrl: presigned.publicUrl,
        fileName: file.name,
        fileSizeBytes: file.size,
        quoteId: quoteId || null,
        orderId: orderId || null,
      });
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
