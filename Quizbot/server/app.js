import express from 'express';
import cors from 'cors';
import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import hashtagRoutes from './routes/hashtagRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import userRoutes from './routes/userRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import leaderboardRoutes from './routes/leaderboardRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import mockTestRoutes from './routes/mockTestRoutes.js';
import { handleTelegramWebhook } from './controllers/paymentController.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

const app = express();

// Required behind reverse proxies (Render, Railway, Nginx) so express-rate-limit uses real client IP
app.set('trust proxy', 1);

function getAllowedOrigins() {
  const raw = [process.env.CLIENT_URL, process.env.CORS_ORIGIN]
    .filter(Boolean)
    .join(',');

  if (!raw.trim()) {
    return '*';
  }

  const origins = raw
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  return origins.length > 0 ? origins : '*';
}

const allowedOrigins = getAllowedOrigins();

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins === '*') {
        return callback(null, true);
      }
      const normalized = origin.replace(/\/+$/, '');
      const isAllowed = allowedOrigins.some((allowed) => {
        if (!allowed.includes('*')) return allowed === normalized;
        // Wildcard support, e.g. https://*.vercel.app
        const pattern = allowed
          .split('*')
          .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
          .join('[a-z0-9-]+(?:\\.[a-z0-9-]+)*');
        return new RegExp(`^${pattern}$`, 'i').test(normalized);
      });
      if (isAllowed) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));

// Telegram Bot Webhook for Stars payments (mounted before rate limiter)
app.post('/api/telegram/webhook', handleTelegramWebhook);

app.use('/api', apiLimiter);

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/hashtags', hashtagRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/mock-tests', mockTestRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
