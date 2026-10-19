/**
 * Módulo de Validación y Manejo de Archivos Gráficos para UV DTF
 * Soporta formatos de alta calidad industrial (PNG transparente, TIFF, PDF, AI, PSD, SVG).
 */

export const ALLOWED_EXTENSIONS = ['.png', '.tif', '.tiff', '.pdf', '.svg', '.ai', '.psd'];
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 Megabytes

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
      error: `El archivo supera el límite de 50 MB (tamaño: ${formatFileSize(size)}). Si es muy pesado, envíalo por enlace de Drive o WeTransfer.`,
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
