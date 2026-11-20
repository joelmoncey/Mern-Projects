import { Router } from 'express';
import {
  createQuiz,
  getQuizFeed,
  getMyQuizzes,
  getQuizById,
  getEscalatedQuizzes,
  flagQuiz,
  updateQuiz,
  deleteQuiz,
  updateQuizVisibility,
  attemptQuiz,
  toggleLikeQuiz,
  reportQuiz,
} from '../controllers/quizController.js';
import { protect, optionalAuth, adminOnly } from '../middleware/auth.js';
import { quizWriteLimiter, actionLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.get('/feed', optionalAuth, getQuizFeed);
router.get('/mine', protect, getMyQuizzes);
router.get('/escalations', protect, adminOnly, getEscalatedQuizzes);
router.get('/:id', protect, getQuizById);
router.post('/', protect, quizWriteLimiter, createQuiz);
router.patch('/:id', protect, quizWriteLimiter, updateQuiz);
router.delete('/:id', protect, quizWriteLimiter, deleteQuiz);
router.patch('/:id/visibility', protect, adminOnly, updateQuizVisibility);
router.post('/:id/flag', protect, actionLimiter, flagQuiz);
router.post('/:id/attempt', protect, actionLimiter, attemptQuiz);
router.post('/:id/like', protect, actionLimiter, toggleLikeQuiz);
router.post('/:id/report', protect, actionLimiter, reportQuiz);

export default router;
