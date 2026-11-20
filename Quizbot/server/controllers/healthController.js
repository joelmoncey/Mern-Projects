import { getDbStatus } from '../config/db.js';

export function getHealth(_req, res) {
  res.status(200).json({
    status: 'ok',
    service: 'quiz-gram-api',
    database: getDbStatus(),
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}
