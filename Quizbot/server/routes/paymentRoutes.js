import { Router } from 'express';
import {
  getChaiSummary,
  createStarsInvoice,
  getStarsPaymentStatus,
} from '../controllers/paymentController.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/chai/summary', optionalAuth, getChaiSummary);
router.post('/stars/invoice', requireAuth, createStarsInvoice);
router.get('/stars/status/:payloadId', requireAuth, getStarsPaymentStatus);

export default router;
