import { Router } from 'express';
import { register, login, verifyEmail, refreshToken, logout } from '../controllers/auth.controller.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/verify-email', verifyEmail);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);

export default router;
