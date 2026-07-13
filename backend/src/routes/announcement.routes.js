import { Router } from 'express';
import { getAnnouncements, createAnnouncement, deleteAnnouncement } from '../controllers/announcement.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = Router();

router.get('/', getAnnouncements);

router.use(authenticate);
router.use(requireRole('admin'));

router.post('/', createAnnouncement);
router.delete('/:id', deleteAnnouncement);

export default router;
