import { Router } from 'express';
import { getClubs, getClubById, createClub } from '../controllers/club.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = Router();

router.get('/', getClubs);
router.get('/:id', getClubById);
router.post('/', authenticate, requireRole('admin'), createClub);

export default router;
