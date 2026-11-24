import { getDbStatus } from '../config/db.js';
import { getRedisStatus } from '../config/redis.js';

export function getHealth(_req, res) {
  res.status(200).json({
    status: 'ok',
    service: 'quiz-gram-api',
    database: getDbStatus(),
    cache: getRedisStatus(),
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}
