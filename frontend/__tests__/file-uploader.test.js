import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  formatFileSize,
  getFileExtension,
  validatePrintFile,
  readFileAsDataURL,
  uploadFileToStorage,
} from '../src/js/modules/file-uploader.js';

describe('File Uploader — Validación y Subida de Archivos Gráficos UV DTF', () => {
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

    it('rechaza archivos mayores al límite de 100 MB', () => {
      const mockFile = { name: 'gigante.psd', size: MAX_FILE_SIZE_BYTES + 1024, type: 'image/vnd.adobe.photoshop' };
      const res = validatePrintFile(mockFile);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('supera el límite de 100 MB');
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

  describe('uploadFileToStorage (Cloudflare R2 Presigned URLs & Progress)', () => {
    let mockApiClient;
    let mockXHR;

    beforeEach(() => {
      mockApiClient = {
        storage: {
          getPresignedUrl: vi.fn().mockResolvedValue({
            uploadUrl: 'https://r2.cloudflarestorage.com/kroma/test.png?X-Amz-Signature=123',
            publicUrl: 'https://pub-r2.dev/assets/quotes/test.png',
            fileKey: 'assets/quotes/COT-001/test.png',
            provider: 'cloudflare-r2',
          }),
          confirmUpload: vi.fn().mockResolvedValue({
            success: true,
            asset: { fileKey: 'assets/quotes/COT-001/test.png' },
          }),
        },
      };

      // Mock de XMLHttpRequest para subida binaria
      mockXHR = {
        open: vi.fn(),
        setRequestHeader: vi.fn(),
        send: vi.fn(function () {
          if (this.upload && this.upload.onprogress) {
            this.upload.onprogress({ lengthComputable: true, loaded: 50, total: 100 });
          }
          this.status = 200;
          this.onload();
        }),
        upload: {},
      };

      global.XMLHttpRequest = vi.fn(() => mockXHR);
    });

    it('lanza error si apiClient o apiClient.storage no están disponibles', async () => {
      const file = new File(['test'], 'arte.png', { type: 'image/png' });
      await expect(uploadFileToStorage(file, { apiClient: null })).rejects.toThrow('Cliente API de almacenamiento no disponible.');
    });

    it('lanza error si el archivo falla la validación local', async () => {
      const file = new File(['bad'], 'script.exe', { type: 'application/octet-stream' });
      await expect(uploadFileToStorage(file, { apiClient: mockApiClient })).rejects.toThrow('Formato no soportado');
    });

    it('lanza error si getPresignedUrl no retorna una URL válida', async () => {
      mockApiClient.storage.getPresignedUrl.mockResolvedValueOnce(null);
      const file = new File(['test'], 'arte.png', { type: 'image/png' });
      await expect(uploadFileToStorage(file, { apiClient: mockApiClient })).rejects.toThrow('No se pudo obtener la URL de subida prefirmada.');
    });

    it('sube exitosamente el archivo reportando progreso y confirmando en BD', async () => {
      const file = new File(['test-bytes'], 'diseno_300dpi.png', { type: 'image/png' });
      const onProgress = vi.fn();

      const result = await uploadFileToStorage(file, {
        context: 'quotes',
        referenceCode: 'COT-001',
        quoteId: 'quote-123',
        onProgress,
        apiClient: mockApiClient,
      });

      expect(mockApiClient.storage.getPresignedUrl).toHaveBeenCalledWith({
        fileName: 'diseno_300dpi.png',
        fileType: 'image/png',
        fileSizeBytes: file.size,
        context: 'quotes',
        referenceCode: 'COT-001',
      });

      expect(mockXHR.open).toHaveBeenCalledWith('PUT', expect.stringContaining('r2.cloudflarestorage.com'), true);
      expect(mockXHR.setRequestHeader).toHaveBeenCalledWith('Content-Type', 'image/png');
      expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({ percent: expect.any(Number) }));
      expect(mockApiClient.storage.confirmUpload).toHaveBeenCalledWith({
        fileKey: 'assets/quotes/COT-001/test.png',
        fileUrl: 'https://pub-r2.dev/assets/quotes/test.png',
        fileName: 'diseno_300dpi.png',
        fileSizeBytes: file.size,
        quoteId: 'quote-123',
        orderId: null,
      });

      expect(result.success).toBe(true);
      expect(result.fileKey).toBe('assets/quotes/COT-001/test.png');
      expect(result.fileUrl).toBe('https://pub-r2.dev/assets/quotes/test.png');
      expect(result.provider).toBe('cloudflare-r2');
    });

    it('maneja error HTTP del servidor en XHR durante la subida', async () => {
      mockXHR.send = vi.fn(function () {
        this.status = 500;
        this.statusText = 'Internal Server Error';
        this.onload();
      });

      const file = new File(['test'], 'arte.png', { type: 'image/png' });
      await expect(uploadFileToStorage(file, { apiClient: mockApiClient })).rejects.toThrow('Error al subir archivo (500)');
    });

    it('maneja error de conexión de red (onerror) durante la subida', async () => {
      mockXHR.send = vi.fn(function () {
        this.onerror();
      });

      const file = new File(['test'], 'arte.png', { type: 'image/png' });
      await expect(uploadFileToStorage(file, { apiClient: mockApiClient })).rejects.toThrow('Error de conexión de red');
    });

    it('maneja timeout (ontimeout) durante la subida', async () => {
      mockXHR.send = vi.fn(function () {
        this.ontimeout();
      });

      const file = new File(['test'], 'arte.png', { type: 'image/png' });
      await expect(uploadFileToStorage(file, { apiClient: mockApiClient })).rejects.toThrow('Tiempo de espera agotado');
    });

    it('tolera advertencia en confirmUpload sin abortar el resultado', async () => {
      mockApiClient.storage.confirmUpload.mockRejectedValueOnce(new Error('DB Warning'));
      const file = new File(['test'], 'arte.png', { type: 'image/png' });

      const result = await uploadFileToStorage(file, { apiClient: mockApiClient });
      expect(result.success).toBe(true);
      expect(result.confirmation).toBeNull();
    });
  });
});
