import { Router } from 'express';
import {
  createMockTest,
  listMockTests,
  getMockTestForAttempt,
  submitMockTest,
  deleteMockTest,
} from '../controllers/mockTestController.js';
import { optionalAuth, protect } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, listMockTests);
router.post('/', protect, createMockTest);
router.get('/:id', optionalAuth, getMockTestForAttempt);
router.post('/:id/submit', protect, submitMockTest);
router.delete('/:id', protect, deleteMockTest);

export default router;
