import { Router } from 'express';
import {
  getMyProfile,
  getUserProfile,
  toggleFollowUser,
} from '../controllers/userController.js';
import { protect, optionalAuth } from '../middleware/auth.js';
import { actionLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.get('/me', protect, getMyProfile);
router.get('/:id/profile', optionalAuth, getUserProfile);
router.post('/:id/follow', protect, actionLimiter, toggleFollowUser);

export default router;
