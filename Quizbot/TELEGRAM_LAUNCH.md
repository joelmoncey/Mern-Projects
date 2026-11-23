# Quiz-Gram: Production Deployment & Telegram Mini App Launch Guide

This step-by-step guide walks you through taking **Quiz-Gram** from your local machine to a live HTTPS Telegram Mini App (`https://t.me/<bot_username>/<app_short_name>`).

---

## 1. Push `quiz-gram` to GitHub

1. Verify that `.env` and `node_modules/` are ignored before committing:
   ```bash
   git status
   ```
   *(Only `.env.example` files should appear—never `server/.env` or `client/.env`.)*

2. Stage and commit the monorepo:
   ```bash
   git add .
   git commit -m "Initial production release of Quiz-Gram Telegram Mini App"
   ```

3. Create a new repository on [GitHub](https://github.com/new) (e.g., `quiz-gram`), then push your code:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<your-github-username>/quiz-gram.git
   git push -u origin main
   ```

---

## 2. Deploy the Node/Express Backend & Configure MongoDB Atlas

### A. MongoDB Atlas Production Settings
1. Open [MongoDB Atlas](https://cloud.mongodb.com/) and select your cluster.
2. **Network Access**:
   - Go to **Security → Network Access → Add IP Address**.
   - If deploying on Render Free/Starter or Railway without a static outbound IP, allow `0.0.0.0/0` (or add your cloud provider's static outbound IPs) and ensure your Database User uses a strong password.
3. **Database User & Connection String**:
   - Under **Database Access**, ensure your user has **Read and write to any database** (or scoped to `quiz-gram`).
   - Copy your connection string (`mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/quiz-gram?retryWrites=true&w=majority`).
4. **Indexes**:
   - Mongoose automatically builds the compound indexes defined in `User.js`, `Hashtag.js`, `Quiz.js`, `Notification.js`, and `Attempt.js` on startup.

### B. Deploy the Express API (Render or Railway)
You can deploy using the included [`render.yaml`](./render.yaml) Blueprint or manually:

1. In [Render](https://dashboard.render.com/) (or Railway), click **New → Web Service** and connect your `quiz-gram` GitHub repository.
2. Configure the service:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`
3. Add the following **Environment Variables**:
   | Variable | Example / Description |
   | --- | --- |
   | `NODE_ENV` | `production` |
   | `PORT` | `5000` |
   | `MONGO_URI` | Your MongoDB Atlas connection string |
   | `TELEGRAM_BOT_TOKEN` | Your bot token from `@BotFather` (used to verify `initData` HMAC-SHA256) |
   | `JWT_SECRET` | A long, random 64-character secret string |
   | `ADMIN_TELEGRAM_IDS` | Comma-separated numeric Telegram user IDs (e.g. `123456789`) |
   | `CLIENT_URL` | Your deployed frontend HTTPS URL (e.g. `https://quiz-gram.vercel.app`) |

4. Once deployed, open `https://<your-api-domain>/api/health` in your browser and confirm it returns:
   ```json
   {
     "status": "ok",
     "service": "quiz-gram-api",
     "database": "connected"
   }
   ```

---

## 3. Deploy the React/Vite Frontend on HTTPS

Telegram Mini Apps **require HTTPS**. You can deploy `client/` to **Vercel** (using the included [`client/vercel.json`](./client/vercel.json)) or **Render Static Sites** (using [`render.yaml`](./render.yaml)).

### Deploying on Vercel (Recommended)
1. Go to [Vercel](https://vercel.com/new) and import your `quiz-gram` GitHub repository.
2. Set **Root Directory** to `client`.
3. Set **Framework Preset** to `Vite` (`Build Command: npm run build`, `Output Directory: dist`).
4. Add the following **Environment Variables**:
   | Variable | Example / Description |
   | --- | --- |
   | `VITE_API_URL` | Your live backend HTTPS URL (no trailing slash, e.g. `https://quiz-gram-api.onrender.com`) |
   | `VITE_BOT_USERNAME` | Your Telegram bot's username without `@` (e.g. `QuizGramBot`) |
   | `VITE_APP_SHORT_NAME` | Your Mini App short name from `@BotFather` (e.g. `quizgram`) |
   | `VITE_ADMIN_CONTACT_URL` | Your Admin Contact Telegram bot or support link (e.g. `https://t.me/YourAdminContactBot`) |
5. Click **Deploy** and copy your live HTTPS URL (e.g. `https://quiz-gram.vercel.app`).
6. Go back to your Backend service (Render/Railway), set `CLIENT_URL=https://quiz-gram.vercel.app`, and redeploy/restart the backend so CORS permits your frontend origin.

---

## 4. Configure `@BotFather` & Test Inside Telegram

1. Open Telegram and message **[@BotFather](https://t.me/BotFather)**.
2. **Create or select your bot**:
   - Run `/newbot` if you haven't created one yet, and copy the **HTTP API Token** into your backend's `TELEGRAM_BOT_TOKEN` env var.
3. **Register the Direct Mini App (`/newapp`)** *(enables `https://t.me/<bot>/<short_name>?startapp=quiz_<id>` shared quiz deep links)*:
   - Send `/newapp` to `@BotFather` and select your bot.
   - Enter a title (`Quiz-Gram`), short description, a 640×360 photo, and an optional demo GIF.
   - When prompted for the **Web App URL**, enter your live frontend HTTPS URL:
     ```text
     https://quiz-gram.vercel.app
     ```
   - When prompted for a **short name**, enter the same value you used in `VITE_APP_SHORT_NAME` (e.g. `quizgram`).
   - `@BotFather` will confirm your direct Mini App link: `https://t.me/<your_bot_username>/quizgram`.
4. **Add the Persistent Chat Menu Button (`/setmenubutton`)**:
   - Send `/setmenubutton` to `@BotFather` and select your bot.
   - Send your live frontend HTTPS URL (`https://quiz-gram.vercel.app`).
   - Send the button title (e.g. `Open Quiz-Gram`).
5. **Find Your Telegram Numeric ID for Admin Access**:
   - Message `@userinfobot` on Telegram (or inspect the `User` collection in MongoDB Atlas after opening your Mini App once) to get your numeric `telegramId`.
   - Add that ID to `ADMIN_TELEGRAM_IDS` in your backend environment variables and restart the backend.
6. **End-to-End Test on Telegram Mobile & Desktop**:
   - Open your bot in Telegram, tap **Open Quiz-Gram** (or visit `https://t.me/<bot_username>/<app_short_name>`).
   - Verify the Mini App expands full-screen, logs you in automatically via Telegram `initData`, shows the **Admin Console** button in **Profile**, lets you create an exam hashtag (`#UPSC_HISTORY`), publish a quiz, solve it (`✓ RIGHT` / `✕ WRONG`), and share it to a Telegram chat via the **Share** button.

---

## 5. Post-Launch Checklist for Heavy Traffic

- **Swap In-Memory Cache to Redis / Upstash**:
  - [`server/utils/cache.js`](./server/utils/cache.js) already isolates all caching behind `getCache`, `setCache`, `invalidateHashtagsCache`, and `invalidateLeaderboardCache`.
  - When scaling to multiple backend instances, replace the internal `node-cache` instance in `server/utils/cache.js` with `ioredis` or `@upstash/redis` so all instances share a single distributed cache for `GET /api/hashtags` and `GET /api/leaderboard`.
- **Add a Media CDN for Diagram / Image Questions**:
  - If you extend `Quiz.js` with an optional `imageUrl` field for geometry/diagram questions, upload images directly to **Cloudflare R2** or **Cloudinary** and serve resized WebP/AVIF URLs rather than storing binary data in MongoDB.
- **Monitor Rate-Limit & Error Logs**:
  - `server/middleware/rateLimiter.js` enforces tiered limits (`authLimiter`, `quizWriteLimiter`, `actionLimiter`, `apiLimiter`) and `server/app.js` sets `app.set('trust proxy', 1)`.
  - Monitor HTTP `429` and `500` responses in your Render/Railway logs and upgrade your MongoDB Atlas tier (`M10+`) as concurrent exam-season traffic grows.
