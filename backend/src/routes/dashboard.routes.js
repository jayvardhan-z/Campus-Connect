import { Router } from 'express';
import { getEventStats } from '../controllers/dashboard.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/event-stats/:id', requireRole('admin'), getEventStats);

export default router;
