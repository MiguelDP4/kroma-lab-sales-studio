import { Router } from 'express';
import {
  listCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
} from '../controllers/customers.controller';
import { authenticate, requireRole } from '../middlewares/auth';

const router = Router();

router.use(authenticate, requireRole('ADMIN', 'EMPLOYEE'));

router.get('/', listCustomers);
router.get('/:id', getCustomerById);
router.post('/', createCustomer);
router.put('/:id', updateCustomer);

export default router;
