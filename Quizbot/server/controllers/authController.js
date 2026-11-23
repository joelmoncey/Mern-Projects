import User from '../models/User.js';
import { validateTelegramInitData } from '../utils/telegramAuth.js';
import { signAuthToken } from '../middleware/auth.js';

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

    // Store Telegram's username in telegramUsername only; never overwrite the
    // creator's custom Quiz-Gram username with their Telegram username.
    const updateFields = {
      firstName: profile.firstName,
      telegramUsername: profile.username || '',
      photoUrl: profile.photoUrl,
      role,
      ...(isAdmin ? { canCreateQuiz: true } : {}),
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

    const token = signAuthToken(user);

    return res.status(200).json({
      token,
      user: serializeUser(user),
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
