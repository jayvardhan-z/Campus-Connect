import { Router } from 'express';
import { 
  getMyRegistrations, 
  getEventParticipants, 
  createRegistration, 
  removeRegistration 
} from '../controllers/registration.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = Router();

router.use(authenticate);

// Student registration history and actions
router.get('/my', requireRole('student'), getMyRegistrations);
router.post('/:eventId', requireRole('student'), createRegistration);
router.delete('/:eventId', requireRole('student'), removeRegistration);

// Admin checking participants
router.get('/event/:eventId', requireRole('admin'), getEventParticipants);

export default router;
