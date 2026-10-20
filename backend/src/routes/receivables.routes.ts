import { Router } from 'express';
import {
  listReceivables,
  recordPayment,
  listPayments,
  voidPayment,
} from '../controllers/receivables.controller';
import { authenticate, requireRole } from '../middlewares/auth';

const router = Router();

router.use(authenticate, requireRole('ADMIN', 'EMPLOYEE'));

router.get('/', listReceivables);
router.get('/payments', listPayments);
router.post('/payments', recordPayment);
router.delete('/payments/:id', voidPayment);

export default router;
