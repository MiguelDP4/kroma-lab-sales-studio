import { Router } from 'express';
import {
  getPresignedUrl,
  confirmUpload,
  getDownloadUrl,
  deleteAsset,
  getStatus,
  handleLocalUpload,
  serveLocalFile,
} from '../controllers/storage.controller';
import { authenticate, optionalAuthenticate, requireRole } from '../middlewares/auth';

const router = Router();

// Consultar estado de almacenamiento y credenciales R2
router.get('/status', getStatus);

// Solicitar URL prefirmada para subida directa (S3 PutObject)
router.post('/presigned-url', optionalAuthenticate, getPresignedUrl);

// Confirmar y vincular archivo subido a una orden o cotización
router.post('/confirm-upload', optionalAuthenticate, confirmUpload);

// Obtener URL de descarga temporal segura (S3 GetObject)
router.get('/download-url', getDownloadUrl);
router.get('/download-url/:key', getDownloadUrl);

// Eliminar archivo de diseño (Solo Personal de Taller / Admin)
router.delete('/:key', authenticate, requireRole('ADMIN', 'EMPLOYEE'), deleteAsset);

// Endpoints de desarrollo/pruebas locales (fallback offline)
router.put('/local-upload/:key', handleLocalUpload);
router.get('/local-file/:key', serveLocalFile);

export default router;
