import rateLimit from 'express-rate-limit';

function makeLimiter({ windowMs, limit, message }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: (req) => req.method === 'OPTIONS',
    handler: (_req, res) => {
      res.status(429).json({
        error: message,
      });
    },
  });
}

// General /api fallback limiter (generous for mobile carrier CGNAT shared IPs)
export const apiLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 1200,
  message: 'Too many requests, please try again shortly.',
});

// Telegram authentication limiter
export const authLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  message: 'Too many login attempts, please wait a few minutes.',
});

// Quiz creation / editing / deletion limiter
export const quizWriteLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  message: 'Quiz creation/edit rate limit reached. Please try again shortly.',
});

// High-frequency user actions (attempt, flag, like, follow)
export const actionLimiter = makeLimiter({
  windowMs: 5 * 60 * 1000,
  limit: 300,
  message: 'Action rate limit reached. Please slow down and try again shortly.',
});
