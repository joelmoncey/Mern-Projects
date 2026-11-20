import 'dotenv/config';
import app from './app.js';
import { connectDB } from './config/db.js';

const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
  try {
    await connectDB();
  } catch (error) {
    console.warn(
      '[server] Starting API without active DB connection. Check MONGO_URI.'
    );
  }

  app.listen(PORT, () => {
    console.log(`[server] quiz-gram API listening on http://localhost:${PORT}`);
  });
}

startServer();
