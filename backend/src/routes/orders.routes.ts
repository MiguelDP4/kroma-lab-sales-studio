import { Router } from 'express';
import {
  listOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  updateOrderPayment,
  getOrderStats,
} from '../controllers/orders.controller';
import { authenticate, requireRole } from '../middlewares/auth';

const router = Router();

router.get('/stats', authenticate, requireRole('ADMIN', 'EMPLOYEE'), getOrderStats);
router.get('/', authenticate, listOrders);
router.get('/:id', authenticate, getOrderById);
router.post('/', createOrder); // Público desde el checkout o autenticado
router.put('/:id/status', authenticate, requireRole('ADMIN', 'EMPLOYEE'), updateOrderStatus);
router.put('/:id/payment', authenticate, requireRole('ADMIN', 'EMPLOYEE'), updateOrderPayment);

export default router;
