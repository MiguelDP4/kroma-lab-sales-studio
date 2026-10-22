import { Router } from 'express';
import {
  login,
  register,
  logout,
  getMe,
  updateProfile,
  listUsers,
  createUser,
  resetPassword,
  deleteUser,
} from '../controllers/auth.controller';
import { authenticate, requireRole } from '../middlewares/auth';

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);
router.get('/users', authenticate, requireRole('ADMIN'), listUsers);
router.post('/users', authenticate, requireRole('ADMIN'), createUser);
router.put('/users/:id/reset-password', authenticate, requireRole('ADMIN'), resetPassword);
router.delete('/users/:id', authenticate, requireRole('ADMIN'), deleteUser);

export default router;
