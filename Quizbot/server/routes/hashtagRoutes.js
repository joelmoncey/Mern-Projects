import { Router } from 'express';
import {
  getHashtags,
  createHashtag,
  updateHashtag,
} from '../controllers/hashtagController.js';
import { protect, optionalAuth, adminOnly } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, getHashtags);
router.post('/', protect, adminOnly, createHashtag);
router.patch('/:id', protect, adminOnly, updateHashtag);

export default router;
