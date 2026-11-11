import { Router } from 'express';
import {
  getPublicShippingSettings,
  getPublicQuoterSettings,
  getSettings,
  createSetting,
  updateSettings,
} from '../controllers/settings.controller';
import { authenticate, requireRole } from '../middlewares/auth';

const router = Router();

// Endpoints públicos para que el cotizador obtenga umbrales de envío y escalas de tarifa
router.get('/shipping', getPublicShippingSettings);
router.get('/quoter', getPublicQuoterSettings);

// Endpoints protegidos exclusivos para ADMINISTRADOR
router.get('/', authenticate, requireRole('ADMIN'), getSettings);
router.post('/', authenticate, requireRole('ADMIN'), createSetting);
router.put('/', authenticate, requireRole('ADMIN'), updateSettings);

export default router;
