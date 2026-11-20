import jwt from 'jsonwebtoken';
import User from '../models/User.js';

function getJwtSecret() {
  return process.env.JWT_SECRET || 'dev-quiz-gram-secret-change-me';
}

function extractBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7).trim() || null;
}

export function signAuthToken(user) {
  return jwt.sign(
    {
      userId: String(user._id),
      telegramId: user.telegramId,
      role: user.role,
    },
    getJwtSecret(),
    { expiresIn: '7d' }
  );
}

export async function protect(req, res, next) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, getJwtSecret());
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired auth token' });
  }
}

export async function optionalAuth(req, _res, next) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, getJwtSecret());
    const user = await User.findById(decoded.userId);
    req.user = user || null;
    return next();
  } catch {
    req.user = null;
    return next();
  }
}

export function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  return next();
}
