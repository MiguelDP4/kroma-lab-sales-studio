import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { StorageService, storageService } from '../src/services/storage.service';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';

const JWT_SECRET = process.env.JWT_SECRET || 'kroma-lab-sales-studio-jwt-secret-key-2026';

function generateToken(payload: { id: string; email: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

describe('Storage & Cloudflare R2 Presigned URLs API (/api/storage)', () => {
  const app = createApp();
  let adminToken: string;
  let employeeToken: string;
  let customerToken: string;

  beforeEach(async () => {
    adminToken = generateToken({ id: 'admin-1', email: 'miguel@kromalab.gt', role: 'ADMIN' });
    employeeToken = generateToken({ id: 'emp-1', email: 'taller@kromalab.gt', role: 'EMPLOYEE' });
    customerToken = generateToken({ id: 'cust-1', email: 'cliente@test.gt', role: 'CUSTOMER' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/storage/status', () => {
    it('retorna el estado operativo de almacenamiento y extensiones permitidas', async () => {
      const res = await request(app).get('/api/storage/status');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.storage).toBeDefined();
      expect(res.body.storage.maxSizeBytes).toBe(100 * 1024 * 1024);
      expect(res.body.storage.allowedExtensions).toContain('.png');
      expect(res.body.storage.allowedExtensions).toContain('.tiff');
      expect(res.body.storage.allowedExtensions).toContain('.ai');
    });
  });

  describe('POST /api/storage/presigned-url', () => {
    it('genera URL prefirmada para un archivo PNG válido en contexto de cotización', async () => {
      const res = await request(app)
        .post('/api/storage/presigned-url')
        .send({
          fileName: 'logotipo_termos.png',
          fileType: 'image/png',
          fileSizeBytes: 2048000,
          context: 'quotes',
          referenceCode: 'COT-2026-001',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.uploadUrl).toBeDefined();
      expect(res.body.fileKey).toContain('assets/quotes/COT-2026-001/');
      expect(res.body.fileKey).toContain('logotipo_termos.png');
      expect(res.body.publicUrl).toBeDefined();
      expect(res.body.expiresIn).toBe(3600);
    });

    it('genera URL prefirmada para un archivo TIFF industrial pesado en contexto de orden', async () => {
      const res = await request(app)
        .post('/api/storage/presigned-url')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          fileName: 'arte_impresion_300dpi.tiff',
          fileType: 'image/tiff',
          fileSizeBytes: 45 * 1024 * 1024,
          context: 'orders',
          referenceCode: 'KL-2026-042',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.fileKey).toContain('assets/orders/KL-2026-042/');
      expect(res.body.fileSizeBytes).toBe(45 * 1024 * 1024);
    });

    it('rechaza archivos con extensiones no permitidas (.exe, .bat, .php)', async () => {
      const res = await request(app)
        .post('/api/storage/presigned-url')
        .send({
          fileName: 'virus_malicioso.exe',
          fileType: 'application/octet-stream',
          fileSizeBytes: 1024,
        });

      expect(res.status).toBe(500); // errorHandler captures Error thrown by validateFile
    });

    it('rechaza archivos que exceden el límite de 100 MB', async () => {
      const res = await request(app)
        .post('/api/storage/presigned-url')
        .send({
          fileName: 'archivo_gigante.tiff',
          fileType: 'image/tiff',
          fileSizeBytes: 105 * 1024 * 1024,
        });

      expect(res.status).toBe(500);
    });

    it('rechaza peticiones con datos incompletos o inválidos con código 400 (Zod)', async () => {
      const res = await request(app)
        .post('/api/storage/presigned-url')
        .send({
          fileName: '',
          fileType: '',
          fileSizeBytes: -5,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Subida y Descarga Local Simulada (Dev/Test Fallback)', () => {
    it('permite subir un archivo binario al endpoint local y luego descargarlo', async () => {
      const testBuffer = Buffer.from('CONTENIDO_BINARIO_ARTE_UV_DTF_300DPI');
      const testKey = 'assets/general/test-asset-123.png';

      // 1. Subida local simulada (PUT)
      const uploadRes = await request(app)
        .put(`/api/storage/local-upload/${encodeURIComponent(testKey)}`)
        .set('Content-Type', 'image/png')
        .send(testBuffer);

      expect(uploadRes.status).toBe(200);
      expect(uploadRes.body.success).toBe(true);
      expect(uploadRes.body.bytesReceived).toBe(testBuffer.length);

      // 2. Descarga del archivo local
      const downloadRes = await request(app)
        .get(`/api/storage/local-file/${encodeURIComponent(testKey)}`);

      expect(downloadRes.status).toBe(200);
      expect(downloadRes.body.toString()).toBe('CONTENIDO_BINARIO_ARTE_UV_DTF_300DPI');

      // 3. Limpieza de prueba
      await storageService.deleteObject(testKey);
    });

    it('retorna 404 al intentar descargar un archivo local inexistente', async () => {
      const res = await request(app)
        .get(`/api/storage/local-file/${encodeURIComponent('assets/general/no-existe.png')}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/storage/confirm-upload', () => {
    it('confirma y vincula el archivo a una cotización existente', async () => {
      const code = `COT-2026-${Date.now()}`;
      const quote = await prisma.quote.create({
        data: {
          code,
          projectName: 'Proyecto con Arte Adjunto',
          leadName: 'Carlos Morales',
          widthCm: 10,
          heightCm: 10,
          qty: 100,
          linearMeters: 2.0,
          unitRateQ: 140,
          materialPriceQ: 280,
          totalPriceQ: 280,
        },
      });

      const res = await request(app)
        .post('/api/storage/confirm-upload')
        .send({
          fileKey: 'assets/quotes/123-diseno.png',
          fileUrl: 'https://pub-r2.dev/assets/quotes/123-diseno.png',
          fileName: 'diseno_termos.png',
          fileSizeBytes: 1048576,
          quoteId: quote.id,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.asset.quoteId).toBe(quote.id);

      // Verificar en base de datos
      const updatedQuote = await prisma.quote.findUnique({ where: { id: quote.id } });
      expect(updatedQuote?.fileUrl).toBe('https://pub-r2.dev/assets/quotes/123-diseno.png');
      expect(updatedQuote?.fileName).toBe('diseno_termos.png');
    });

    it('confirma y vincula el archivo a una orden de producción existente', async () => {
      const code = `KL-2026-${Date.now()}`;
      const order = await prisma.order.create({
        data: {
          code,
          customerName: 'Cliente R2',
          customerPhone: '+502 5555-0000',
          widthCm: 5,
          heightCm: 5,
          qty: 50,
          linearMeters: 1.0,
          materialPriceQ: 140,
          totalAmountQ: 140,
        },
      });

      const res = await request(app)
        .post('/api/storage/confirm-upload')
        .send({
          fileKey: 'assets/orders/456-arte.tiff',
          fileUrl: 'https://pub-r2.dev/assets/orders/456-arte.tiff',
          fileName: 'arte_audley.tiff',
          fileSizeBytes: 20971520,
          orderId: order.id,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const updatedOrder = await prisma.order.findUnique({ where: { id: order.id } });
      expect(updatedOrder?.fileUrl).toBe('https://pub-r2.dev/assets/orders/456-arte.tiff');
      expect(updatedOrder?.fileName).toBe('arte_audley.tiff');
    });
  });

  describe('GET /api/storage/download-url', () => {
    it('retorna la URL temporal de descarga para un fileKey', async () => {
      const res = await request(app)
        .get('/api/storage/download-url')
        .query({ fileKey: 'assets/orders/KL-0001/arte.png' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.downloadUrl).toBeDefined();
    });

    it('retorna error 400 si falta el parámetro fileKey', async () => {
      const res = await request(app).get('/api/storage/download-url');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/storage/:key', () => {
    it('rechaza eliminación a usuarios no autenticados (401)', async () => {
      const res = await request(app).delete('/api/storage/test-file.png');
      expect(res.status).toBe(401);
    });

    it('rechaza eliminación a clientes sin rol de taller (403)', async () => {
      const res = await request(app)
        .delete('/api/storage/test-file.png')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
    });

    it('permite a personal de taller (EMPLOYEE) o ADMIN eliminar un archivo', async () => {
      const res = await request(app)
        .delete('/api/storage/assets-general-dummy.png')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('permite eliminar pasando fileKey por query param (?fileKey=...)', async () => {
      const res = await request(app)
        .delete('/api/storage/delete-query')
        .query({ fileKey: 'assets-general-dummy.png' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('retorna mensaje de archivo no encontrado si deleteObject retorna false', async () => {
      vi.spyOn(storageService, 'deleteObject').mockResolvedValueOnce(false);

      const res = await request(app)
        .delete('/api/storage/nonexistent.png')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('El archivo no fue encontrado o ya fue eliminado.');
    });
  });

  describe('StorageService Métodos Unitarios y Casos Extremos', () => {
    it('maneja confirmUpload sin vincular a quoteId ni orderId', async () => {
      const res = await request(app)
        .post('/api/storage/confirm-upload')
        .send({
          fileKey: 'assets/general/standalone.png',
          fileUrl: 'https://pub-r2.dev/assets/general/standalone.png',
          fileName: 'standalone.png',
          fileSizeBytes: 1024,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.asset.orderId).toBeNull();
      expect(res.body.asset.quoteId).toBeNull();
    });

    it('maneja confirmUpload con quoteId inexistente sin fallar', async () => {
      const res = await request(app)
        .post('/api/storage/confirm-upload')
        .send({
          fileKey: 'assets/quotes/ghost.png',
          fileUrl: 'https://pub-r2.dev/assets/quotes/ghost.png',
          fileName: 'ghost.png',
          fileSizeBytes: 1024,
          quoteId: 'quote-inexistente-12345',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('maneja confirmUpload con orderId inexistente sin fallar', async () => {
      const res = await request(app)
        .post('/api/storage/confirm-upload')
        .send({
          fileKey: 'assets/orders/ghost.png',
          fileUrl: 'https://pub-r2.dev/assets/orders/ghost.png',
          fileName: 'ghost.png',
          fileSizeBytes: 1024,
          orderId: 'order-inexistente-12345',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('valida deleteObject cuando la clave es vacía', async () => {
      const result = await storageService.deleteObject('');
      expect(result).toBe(false);
    });

    it('retorna null en getLocalFilePath si el archivo no existe en disco', () => {
      const filePath = storageService.getLocalFilePath('archivo-inexistente-xyz.png');
      expect(filePath).toBeNull();
    });

    it('guarda archivo local creando directorios recursivamente', async () => {
      const uniqueSubdir = `sub_${Date.now()}`;
      const fileKey = `assets/deep/${uniqueSubdir}/test.txt`;
      const savedPath = storageService.saveLocalFile(fileKey, Buffer.from('TEST'));
      expect(fs.existsSync(savedPath)).toBe(true);
      expect(storageService.getLocalFilePath(fileKey)).toBe(savedPath);

      // Eliminar archivo creado
      const deleted = await storageService.deleteObject(fileKey);
      expect(deleted).toBe(true);
    });

    it('maneja excepción en unlinkSync al eliminar archivo local retornando false', async () => {
      const localService = new StorageService({});
      const testKey = `assets/unlink-fail-${Date.now()}.png`;
      localService.saveLocalFile(testKey, Buffer.from('DUMMY'));

      vi.spyOn(fs, 'unlinkSync').mockImplementationOnce(() => {
        throw new Error('EPERM: Permission denied');
      });

      const deleted = await localService.deleteObject(testKey);
      expect(deleted).toBe(false);

      // Limpieza real
      vi.restoreAllMocks();
      await localService.deleteObject(testKey);
    });

    it('valida fallback local en StorageService no configurado con R2', async () => {
      const localService = new StorageService({});
      expect(localService.isR2Configured()).toBe(false);

      const status = localService.getStatus();
      expect(status.provider).toBe('local-storage');
      expect(status.isConfigured).toBe(false);

      const presigned = await localService.generatePresignedUploadUrl({
        fileName: 'diseno_vector.ai',
        fileType: 'application/postscript',
        fileSizeBytes: 10000,
        context: 'quotes',
      });
      expect(presigned.provider).toBe('local-storage');
      expect(presigned.uploadUrl).toContain('/api/storage/local-upload/');

      const downloadUrl = await localService.generatePresignedDownloadUrl('assets/quotes/dummy.ai');
      expect(downloadUrl).toContain('/api/storage/local-file/');
    });
  });

  describe('StorageService con Cloudflare R2 Mockeado', () => {
    it('genera URLs firmadas reales cuando R2 está configurado con credenciales', async () => {
      const r2Service = new StorageService({
        accountId: 'test-cf-account-id',
        accessKeyId: 'test-r2-access-key',
        secretAccessKey: 'test-r2-secret-key',
        bucketName: 'kroma-lab-test-bucket',
        publicUrl: 'https://pub-test.r2.dev',
      });

      expect(r2Service.isR2Configured()).toBe(true);
      const status = r2Service.getStatus();
      expect(status.provider).toBe('cloudflare-r2');
      expect(status.isConfigured).toBe(true);

      const presigned = await r2Service.generatePresignedUploadUrl({
        fileName: 'diseno_300dpi.png',
        fileType: 'image/png',
        fileSizeBytes: 5000000,
        context: 'orders',
        referenceCode: 'KL-00042',
      });

      expect(presigned.provider).toBe('cloudflare-r2');
      expect(presigned.uploadUrl).toBeDefined();
      expect(presigned.publicUrl).toContain('https://pub-test.r2.dev/assets/orders/KL-00042/');
      expect(presigned.fileKey).toContain('diseno_300dpi.png');

      const downloadUrl = await r2Service.generatePresignedDownloadUrl(presigned.fileKey);
      expect(downloadUrl).toBeDefined();

      vi.spyOn(r2Service['s3Client']!, 'send').mockResolvedValue({} as any);
      const deleted = await r2Service.deleteObject(presigned.fileKey);
      expect(deleted).toBe(true);
    });
  });

  describe('Storage Controller Captura de Errores y Excepciones', () => {
    it('captura error interno en getDownloadUrl', async () => {
      vi.spyOn(storageService, 'generatePresignedDownloadUrl').mockRejectedValueOnce(new Error('R2 Error'));
      const res = await request(app)
        .get('/api/storage/download-url')
        .query({ fileKey: 'assets/orders/test.png' });
      expect(res.status).toBe(500);
    });

    it('captura error interno en confirmUpload', async () => {
      vi.spyOn(prisma.quote, 'findUnique').mockRejectedValueOnce(new Error('DB Error'));
      const res = await request(app)
        .post('/api/storage/confirm-upload')
        .send({
          fileKey: 'assets/quotes/1.png',
          fileUrl: 'https://pub-r2.dev/assets/quotes/1.png',
          fileName: '1.png',
          fileSizeBytes: 100,
          quoteId: 'quote-error',
        });
      expect(res.status).toBe(500);
    });

    it('captura error interno en deleteAsset', async () => {
      vi.spyOn(storageService, 'deleteObject').mockRejectedValueOnce(new Error('S3 Error'));
      const res = await request(app)
        .delete('/api/storage/error-file.png')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(500);
    });

    it('captura error interno en getPresignedUrl', async () => {
      vi.spyOn(storageService, 'generatePresignedUploadUrl').mockRejectedValueOnce(new Error('Service Failure'));
      const res = await request(app)
        .post('/api/storage/presigned-url')
        .send({
          fileName: 'error.png',
          fileType: 'image/png',
          fileSizeBytes: 1024,
        });
      expect(res.status).toBe(500);
    });
  });
});
