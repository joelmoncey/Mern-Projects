import { Router } from 'express';
import {
  getChaiSummary,
  createStarsInvoice,
  getStarsPaymentStatus,
} from '../controllers/paymentController.js';
import { optionalAuth, protect } from '../middleware/auth.js';

const router = Router();

router.get('/chai/summary', optionalAuth, getChaiSummary);
router.post('/stars/invoice', protect, createStarsInvoice);
router.get('/stars/status/:payloadId', protect, getStarsPaymentStatus);

export default router;
