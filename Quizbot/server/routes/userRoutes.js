import { Router } from 'express';
import {
  getMyProfile,
  updateMyUsername,
  getUserProfile,
  listUsersForAdmin,
  updateCreatorAccess,
  approveCreatorByIdentifier,
  toggleFollowUser,
} from '../controllers/userController.js';
import { protect, optionalAuth, adminOnly } from '../middleware/auth.js';
import { actionLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.get('/me', protect, getMyProfile);
router.patch('/me/username', protect, actionLimiter, updateMyUsername);
router.get('/admin/list', protect, adminOnly, listUsersForAdmin);
router.post('/admin/approve-creator', protect, adminOnly, approveCreatorByIdentifier);
router.patch('/:id/creator-access', protect, adminOnly, updateCreatorAccess);
router.get('/:id/profile', optionalAuth, getUserProfile);
router.post('/:id/follow', protect, actionLimiter, toggleFollowUser);

export default router;
