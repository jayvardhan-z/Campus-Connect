import { Router } from 'express';
import { getStudentSummary, getAdminSummary } from '../controllers/reports.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/student-summary', requireRole('student'), getStudentSummary);
router.get('/admin-summary', requireRole('admin'), getAdminSummary);

export default router;
