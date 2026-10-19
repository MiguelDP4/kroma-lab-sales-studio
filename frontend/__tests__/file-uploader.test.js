import { describe, it, expect, vi } from 'vitest';
import {
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  formatFileSize,
  getFileExtension,
  validatePrintFile,
  readFileAsDataURL,
} from '../src/js/modules/file-uploader.js';

describe('File Uploader — Validación de Archivos Gráficos UV DTF', () => {
  describe('formatFileSize', () => {
    it('formatea correctamente tamaños en B, KB, MB', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(500)).toBe('500 B');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1024 * 1024 * 3.5)).toBe('3.5 MB');
      expect(formatFileSize(-10)).toBe('0 B');
      expect(formatFileSize(null)).toBe('0 B');
    });
  });

  describe('getFileExtension', () => {
    it('extrae la extensión en minúsculas', () => {
      expect(getFileExtension('logo.PNG')).toBe('.png');
      expect(getFileExtension('archivo.tar.gz')).toBe('.gz');
      expect(getFileExtension('sin_extension')).toBe('');
      expect(getFileExtension(null)).toBe('');
    });
  });

  describe('validatePrintFile', () => {
    it('rechaza si no se proporciona ningún archivo', () => {
      const res = validatePrintFile(null);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('No se seleccionó ningún archivo');
    });

    it('acepta formatos válidos de producción industrial (.png, .tif, .pdf, .svg, .ai, .psd)', () => {
      ALLOWED_EXTENSIONS.forEach(ext => {
        const mockFile = { name: `diseño${ext}`, size: 1024 * 100, type: 'image/png' };
        const res = validatePrintFile(mockFile);
        expect(res.valid).toBe(true);
        expect(res.fileData.extension).toBe(ext);
      });
    });

    it('rechaza extensiones no permitidas (.exe, .docx, .zip)', () => {
      const mockFile = { name: 'virus.exe', size: 1024, type: 'application/x-msdownload' };
      const res = validatePrintFile(mockFile);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Formato no soportado');
    });

    it('rechaza archivos mayores al límite de 50 MB', () => {
      const mockFile = { name: 'gigante.psd', size: MAX_FILE_SIZE_BYTES + 1024, type: 'image/vnd.adobe.photoshop' };
      const res = validatePrintFile(mockFile);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('supera el límite de 50 MB');
    });
  });

  describe('readFileAsDataURL', () => {
    it('genera preview en base64 para imágenes soportadas (.png)', async () => {
      const mockFile = new File(['fake-png-content'], 'logo.png', { type: 'image/png' });
      const preview = await readFileAsDataURL(mockFile);
      expect(preview).toBeDefined();
      expect(typeof preview).toBe('string');
    });

    it('retorna null para formatos no visuales directamente (como .tif, .pdf, .ai)', async () => {
      const mockFile = { name: 'arte.pdf' };
      const preview = await readFileAsDataURL(mockFile);
      expect(preview).toBeNull();
    });

    it('rechaza si no se entrega archivo', async () => {
      await expect(readFileAsDataURL(null)).rejects.toThrow('Archivo no proporcionado');
    });
  });
});
