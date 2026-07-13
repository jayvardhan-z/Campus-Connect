import { Router } from 'express';
import { 
  getUpcomingEvents, 
  getMyRegistrations, 
  getEventStats, 
  getClubEvents 
} from '../controllers/dashboard.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/upcoming-events', getUpcomingEvents);
router.get('/my-registrations', requireRole('student'), getMyRegistrations);
router.get('/event-stats/:id', requireRole('admin'), getEventStats);
router.get('/club-events/:id', getClubEvents);

export default router;
