import { Router } from 'express';
import {
  createMockTest,
  listMockTests,
  getMockTestForAttempt,
  submitMockTest,
  deleteMockTest,
} from '../controllers/mockTestController.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, listMockTests);
router.post('/', requireAuth, createMockTest);
router.get('/:id', optionalAuth, getMockTestForAttempt);
router.post('/:id/submit', requireAuth, submitMockTest);
router.delete('/:id', requireAuth, deleteMockTest);

export default router;
