import { Router } from 'express';
import {
  createMockTest,
  listMockTests,
  getMockTestForAttempt,
  getMockTestForEdit,
  updateMockTest,
  submitMockTest,
  deleteMockTest,
} from '../controllers/mockTestController.js';
import { optionalAuth, protect } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, listMockTests);
router.post('/', protect, createMockTest);
router.get('/:id/manage', protect, getMockTestForEdit);
router.get('/:id', optionalAuth, getMockTestForAttempt);
router.patch('/:id', protect, updateMockTest);
router.post('/:id/submit', protect, submitMockTest);
router.delete('/:id', protect, deleteMockTest);

export default router;
