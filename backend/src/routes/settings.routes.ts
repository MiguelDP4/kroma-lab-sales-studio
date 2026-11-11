import { Router } from 'express';
import {
  getPublicShippingSettings,
  getSettings,
  createSetting,
  updateSettings,
} from '../controllers/settings.controller';
import { authenticate, requireRole } from '../middlewares/auth';

const router = Router();

// Endpoint público para que el cotizador obtenga los umbrales de envío gratis actualizados
router.get('/shipping', getPublicShippingSettings);

// Endpoints protegidos exclusivos para ADMINISTRADOR
router.get('/', authenticate, requireRole('ADMIN'), getSettings);
router.post('/', authenticate, requireRole('ADMIN'), createSetting);
router.put('/', authenticate, requireRole('ADMIN'), updateSettings);

export default router;
