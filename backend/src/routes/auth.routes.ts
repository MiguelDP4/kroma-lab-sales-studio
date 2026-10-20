import { Router } from 'express';
import { login, logout, getMe, updateProfile, listUsers } from '../controllers/auth.controller';
import { authenticate, requireRole } from '../middlewares/auth';

const router = Router();

router.post('/login', login);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);
router.get('/users', authenticate, requireRole('ADMIN'), listUsers);

export default router;
