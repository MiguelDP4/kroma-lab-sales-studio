import { Router } from 'express';
import { optionalAuthenticate } from '../middlewares/auth';
import {
  getCart,
  addCartItem,
  syncCart,
  removeCartItem,
  clearCart,
} from '../controllers/cart.controller';

const router = Router();

router.use(optionalAuthenticate);

router.get('/', getCart);
router.post('/items', addCartItem);
router.put('/sync', syncCart);
router.delete('/items/:id', removeCartItem);
router.delete('/', clearCart);

export default router;
