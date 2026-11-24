import { Router } from 'express';
import {
  createQuiz,
  createBulkQuizzes,
  getQuizFeed,
  getMyQuizzes,
  getQuizById,
  getEscalatedQuizzes,
  getAllQuizzesForAdmin,
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
router.post('/feed', optionalAuth, getQuizFeed);
router.get('/mine', protect, getMyQuizzes);
router.get('/escalations', protect, adminOnly, getEscalatedQuizzes);
router.get('/admin/all', protect, adminOnly, getAllQuizzesForAdmin);
router.get('/:id', protect, getQuizById);
router.post('/', protect, quizWriteLimiter, createQuiz);
router.post('/bulk', protect, quizWriteLimiter, createBulkQuizzes);
router.patch('/:id', protect, quizWriteLimiter, updateQuiz);
router.delete('/:id', protect, quizWriteLimiter, deleteQuiz);
router.patch('/:id/visibility', protect, adminOnly, updateQuizVisibility);
router.post('/:id/flag', protect, actionLimiter, flagQuiz);
router.post('/:id/attempt', protect, actionLimiter, attemptQuiz);
router.post('/:id/like', protect, actionLimiter, toggleLikeQuiz);
router.post('/:id/report', protect, actionLimiter, reportQuiz);

export default router;
