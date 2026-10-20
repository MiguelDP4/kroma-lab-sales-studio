import { Router } from 'express';
import {
  listInventory,
  recordRestock,
  adjustStock,
  listKardex,
} from '../controllers/inventory.controller';
import { authenticate, requireRole } from '../middlewares/auth';

const router = Router();

router.use(authenticate, requireRole('ADMIN', 'EMPLOYEE'));

router.get('/', listInventory);
router.get('/kardex', listKardex);
router.post('/restock', recordRestock);
router.post('/adjust', adjustStock);

export default router;
