import { Router } from 'express';
import {
  getHashtags,
  createHashtag,
  bulkImportHashtags,
  updateHashtag,
  updateExamLanguages,
  deleteHashtag,
} from '../controllers/hashtagController.js';
import { protect, optionalAuth, adminOnly } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, getHashtags);
router.post('/', protect, adminOnly, createHashtag);
router.post('/bulk-import', protect, adminOnly, bulkImportHashtags);
router.patch('/exam-languages', protect, adminOnly, updateExamLanguages);
router.patch('/:id', protect, adminOnly, updateHashtag);
router.delete('/:id', protect, adminOnly, deleteHashtag);

export default router;
