import { Router } from 'express';
import { explainQuery } from '../controllers/query-optimizer.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('admin'));

router.get('/explain', explainQuery);

export default router;
