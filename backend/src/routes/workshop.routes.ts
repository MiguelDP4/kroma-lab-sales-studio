import { Router } from 'express';
import { getWorkshopConfig, updateWorkshopConfig } from '../controllers/workshop.controller';
import { authenticate, requireRole } from '../middlewares/auth';

const router = Router();

// Lectura pública o autenticada (para inicializar el cotizador y checkout con tarifas vigentes)
router.get('/', getWorkshopConfig);
// Actualización exclusiva para ADMIN
router.put('/', authenticate, requireRole('ADMIN'), updateWorkshopConfig);

export default router;
