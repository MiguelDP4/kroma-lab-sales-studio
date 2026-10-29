import { Router } from 'express';
import {
  listCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '../controllers/customers.controller';
import { authenticate, requireRole } from '../middlewares/auth';

const router = Router();

router.use(authenticate, requireRole('ADMIN', 'EMPLOYEE'));

router.get('/', listCustomers);
router.get('/:id', getCustomerById);
router.post('/', createCustomer);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);

export default router;
