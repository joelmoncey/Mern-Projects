import 'dotenv/config';
import app from './app.js';
import { connectDB } from './config/db.js';
import { connectRedis, disconnectRedis } from './config/redis.js';

const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
  await Promise.all([
    connectDB().catch(() => {
      console.warn(
        '[server] Starting API without active DB connection. Check MONGO_URI.'
      );
    }),
    connectRedis(),
  ]);

  const server = app.listen(PORT, () => {
    console.log(`[server] quiz-gram API listening on http://localhost:${PORT}`);
  });

  const shutdown = async () => {
    await disconnectRedis();
    server.close(() => process.exit(0));
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

startServer();
