import { Router } from 'express';
import { getProfile, updateProfile } from '../controllers/student.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('student'));

router.get('/', getProfile);
router.get('/profile', getProfile);
router.put('/', updateProfile);
router.put('/profile', updateProfile);

export default router;
