import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { validateTelegramInitData } from '../utils/telegramAuth.js';
import { signAuthToken } from '../middleware/auth.js';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Pure helper to determine whether to trigger the Welcome / 7-Day Refresher Guide:
 * - New user (!existingUser) -> 'new_user'
 * - Existing user inactive from quizzes for >= 7 days (and guide not already shown in last 7 days) -> 'weekly_comeback'
 */
export function evaluateGuideTrigger(existingUser, now = new Date()) {
  if (!existingUser) {
    return { shouldShowGuide: true, reason: 'new_user' };
  }

  const nowMs = now.getTime();
  const lastQuizMs = existingUser.lastActiveDate
    ? new Date(existingUser.lastActiveDate).getTime()
    : existingUser.createdAt
      ? new Date(existingUser.createdAt).getTime()
      : nowMs;

  const lastGuideMs = existingUser.lastGuideShownAt
    ? new Date(existingUser.lastGuideShownAt).getTime()
    : 0;

  const inactiveForOneWeek = nowMs - lastQuizMs >= SEVEN_DAYS_MS;
  const guideCooldownElapsed = !lastGuideMs || nowMs - lastGuideMs >= SEVEN_DAYS_MS;

  if (inactiveForOneWeek && guideCooldownElapsed) {
    return { shouldShowGuide: true, reason: 'weekly_comeback' };
  }

  return { shouldShowGuide: false, reason: null };
}

function getAdminTelegramIdSet() {
  const raw = process.env.ADMIN_TELEGRAM_IDS || '';
  return new Set(
    raw
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
  );
}

function serializeUser(user) {
  const isAdmin = user.role === 'admin';
  return {
    _id: user._id,
    telegramId: user.telegramId,
    username: user.username || '',
    telegramUsername: user.telegramUsername || '',
    firstName: user.firstName,
    photoUrl: user.photoUrl,
    role: user.role,
    canCreateQuiz: isAdmin || Boolean(user.canCreateQuiz),
    followersCount: Array.isArray(user.followers) ? user.followers.length : 0,
    followingCount: Array.isArray(user.following) ? user.following.length : 0,
    following: (user.following || []).map((id) => String(id)),
    streakCount: user.streakCount,
    lastActiveDate: user.lastActiveDate,
    totalSolved: user.totalSolved,
    correctSolved: user.correctSolved,
    isSupporter: Boolean(user.isSupporter),
    starsContributed: user.starsContributed || 0,
  };
}

export async function telegramLogin(req, res, next) {
  try {
    const { initData, devUser } = req.body || {};
    const isProduction = process.env.NODE_ENV === 'production';

    let profile;

    if (initData) {
      try {
        profile = validateTelegramInitData(
          initData,
          process.env.TELEGRAM_BOT_TOKEN
        );
      } catch (validationError) {
        return res.status(401).json({ error: validationError.message });
      }
    } else if (!isProduction && devUser && devUser.telegramId) {
      profile = {
        telegramId: String(devUser.telegramId).trim(),
        firstName: String(devUser.firstName || 'Dev User').trim(),
        username: devUser.username ? String(devUser.username).trim() : '',
        photoUrl: devUser.photoUrl ? String(devUser.photoUrl).trim() : '',
      };
    } else {
      return res.status(400).json({
        error: isProduction
          ? 'Telegram initData is required'
          : 'Provide Telegram initData or devUser in development mode',
      });
    }

    const adminIds = getAdminTelegramIdSet();
    const isAdmin = adminIds.has(profile.telegramId);
    const role = isAdmin ? 'admin' : 'user';

    const existingUser = await User.findOne({
      telegramId: profile.telegramId,
    })
      .select('lastActiveDate lastGuideShownAt createdAt')
      .lean();

    const now = new Date();
    const { shouldShowGuide, reason: welcomeGuideReason } =
      evaluateGuideTrigger(existingUser, now);

    // Store Telegram's username in telegramUsername only; never overwrite the
    // creator's custom Quiz-Gram username with their Telegram username.
    const updateFields = {
      firstName: profile.firstName,
      telegramUsername: profile.username || '',
      photoUrl: profile.photoUrl,
      role,
      ...(isAdmin ? { canCreateQuiz: true } : {}),
      ...(shouldShowGuide ? { lastGuideShownAt: now } : {}),
    };

    const user = await User.findOneAndUpdate(
      { telegramId: profile.telegramId },
      {
        $set: updateFields,
        $setOnInsert: {
          telegramId: profile.telegramId,
          username: '',
          ...(isAdmin ? {} : { canCreateQuiz: false }),
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    if (shouldShowGuide && user?._id) {
      const notifType =
        welcomeGuideReason === 'weekly_comeback'
          ? 'weekly_comeback'
          : 'welcome_guide';
      const notifMessage =
        welcomeGuideReason === 'weekly_comeback'
          ? 'Welcome back! It has been over a week since your last quiz. Tap Filter to adjust your Exam & Language, try a Timed Mock Test, or Contact Admin to request new exams!'
          : 'Welcome to Quiz-Gram! Use Filter to pick your Exam & Language, practice Timed Mock Tests in the Mocks tab, and Contact Admin to add new exams or request Creator access.';

      await Notification.create({
        recipient: user._id,
        type: notifType,
        quiz: null,
        message: notifMessage,
        isRead: false,
      }).catch(() => {});
    }

    const token = signAuthToken(user);

    return res.status(200).json({
      token,
      user: serializeUser(user),
      showWelcomeGuide: shouldShowGuide,
      welcomeGuideReason,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getMe(req, res) {
  return res.status(200).json({
    user: serializeUser(req.user),
  });
}
