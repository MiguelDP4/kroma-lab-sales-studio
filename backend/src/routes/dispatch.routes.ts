import { Router } from 'express';
import {
  listDispatchNotes,
  getDispatchNoteById,
  createDispatchNote,
  updateDispatchStatus,
} from '../controllers/dispatch.controller';
import { authenticate, requireRole } from '../middlewares/auth';

const router = Router();

router.use(authenticate, requireRole('ADMIN', 'EMPLOYEE'));

router.get('/', listDispatchNotes);
router.get('/:id', getDispatchNoteById);
router.post('/', createDispatchNote);
router.put('/:id/status', updateDispatchStatus);

export default router;
