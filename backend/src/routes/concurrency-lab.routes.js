import { Router } from 'express';
import { simulateConcurrency, simulateIsolationDemo } from '../controllers/concurrency-lab.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('admin'));

router.post('/simulate', simulateConcurrency);
router.get('/isolation-demo', simulateIsolationDemo);

export default router;
