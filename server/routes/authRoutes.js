import { Router } from 'express';
import { telegramLogin, getMe } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/telegram', authLimiter, telegramLogin);
router.get('/me', protect, getMe);

export default router;
