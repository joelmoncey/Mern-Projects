import User from '../models/User.js';
import Quiz from '../models/Quiz.js';
import Attempt from '../models/Attempt.js';
import { CACHE_KEYS, getCache, setCache } from '../utils/cache.js';

const LEADERBOARD_TTL_SECONDS = 60; // 1 minute

export async function getLeaderboard(req, res, next) {
  try {
    const type = req.query.type === 'creators' ? 'creators' : 'solvers';
    const cacheKey = `${CACHE_KEYS.LEADERBOARD_PREFIX}${type}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    if (type === 'creators') {
      const creatorAgg = await Quiz.aggregate([
        {
          $match: {
            isHidden: false,
            createdAt: { $gte: sevenDaysAgo },
          },
        },
        {
          $project: {
            creator: 1,
            attemptsCount: { $ifNull: ['$attemptsCount', 0] },
            likesCount: { $size: { $ifNull: ['$likes', []] } },
          },
        },
        {
          $group: {
            _id: '$creator',
            quizzesCreated: { $sum: 1 },
            likesReceived: { $sum: '$likesCount' },
            attemptsReceived: { $sum: '$attemptsCount' },
          },
        },
        {
          $sort: {
            quizzesCreated: -1,
            likesReceived: -1,
            attemptsReceived: -1,
          },
        },
        { $limit: 25 },
      ]);

      const userIds = creatorAgg.map((row) => row._id).filter(Boolean);
      const users = await User.find({ _id: { $in: userIds } })
        .select('firstName username photoUrl streakCount followers isSupporter starsContributed')
        .lean();

      const userMap = new Map(users.map((u) => [String(u._id), u]));

      const entries = creatorAgg
        .map((row) => {
          const u = userMap.get(String(row._id));
          if (!u) return null;
          return {
            userId: u._id,
            firstName: u.firstName,
            username: u.username || '',
            photoUrl: u.photoUrl || '',
            isSupporter: Boolean(u.isSupporter),
            starsContributed: u.starsContributed || 0,
            quizzesCreated: row.quizzesCreated,
            likesReceived: row.likesReceived,
            attemptsReceived: row.attemptsReceived,
            followersCount: Array.isArray(u.followers) ? u.followers.length : 0,
          };
        })
        .filter(Boolean)
        .map((entry, idx) => ({ rank: idx + 1, ...entry }));

      const payload = {
        type: 'creators',
        periodDays: 7,
        entries,
      };
      await setCache(cacheKey, payload, LEADERBOARD_TTL_SECONDS);
      return res.status(200).json(payload);
    }

    // Default: Top Solvers over the past 7 days
    const attemptAgg = await Attempt.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: '$user',
          weeklySolved: { $sum: 1 },
          weeklyCorrect: {
            $sum: { $cond: ['$isCorrect', 1, 0] },
          },
        },
      },
      {
        $sort: {
          weeklyCorrect: -1,
          weeklySolved: -1,
        },
      },
      { $limit: 25 },
    ]);

    let solverRows = [];

    if (attemptAgg.length > 0) {
      const userIds = attemptAgg.map((r) => r._id).filter(Boolean);
      const users = await User.find({ _id: { $in: userIds } })
        .select('firstName username photoUrl streakCount totalSolved correctSolved isSupporter starsContributed')
        .lean();
      const userMap = new Map(users.map((u) => [String(u._id), u]));

      solverRows = attemptAgg
        .map((row) => {
          const u = userMap.get(String(row._id));
          if (!u) return null;
          const weeklySolved = row.weeklySolved || 0;
          const weeklyCorrect = row.weeklyCorrect || 0;
          const accuracy =
            weeklySolved > 0
              ? Math.round((weeklyCorrect / weeklySolved) * 100)
              : 0;
          return {
            userId: u._id,
            firstName: u.firstName,
            username: u.username || '',
            photoUrl: u.photoUrl || '',
            isSupporter: Boolean(u.isSupporter),
            starsContributed: u.starsContributed || 0,
            weeklySolved,
            weeklyCorrect,
            accuracy,
            streakCount: u.streakCount || 0,
          };
        })
        .filter(Boolean);
    } else {
      // Fallback to users active in the last 7 days (for attempts before Attempt collection)
      const fallbackUsers = await User.find({
        totalSolved: { $gt: 0 },
        $or: [
          { lastActiveDate: { $gte: sevenDaysAgo } },
          { updatedAt: { $gte: sevenDaysAgo } },
        ],
      })
        .sort({ correctSolved: -1, totalSolved: -1, streakCount: -1 })
        .limit(25)
        .select('firstName username photoUrl streakCount totalSolved correctSolved isSupporter starsContributed')
        .lean();

      solverRows = fallbackUsers.map((u) => {
        const weeklySolved = u.totalSolved || 0;
        const weeklyCorrect = u.correctSolved || 0;
        const accuracy =
          weeklySolved > 0
            ? Math.round((weeklyCorrect / weeklySolved) * 100)
            : 0;
        return {
          userId: u._id,
          firstName: u.firstName,
          username: u.username || '',
          photoUrl: u.photoUrl || '',
          isSupporter: Boolean(u.isSupporter),
          starsContributed: u.starsContributed || 0,
          weeklySolved,
          weeklyCorrect,
          accuracy,
          streakCount: u.streakCount || 0,
        };
      });
    }

    solverRows.sort(
      (a, b) =>
        b.weeklyCorrect - a.weeklyCorrect ||
        b.accuracy - a.accuracy ||
        b.weeklySolved - a.weeklySolved
    );

    const entries = solverRows.map((entry, idx) => ({
      rank: idx + 1,
      ...entry,
    }));

    const payload = {
      type: 'solvers',
      periodDays: 7,
      entries,
    };
    await setCache(cacheKey, payload, LEADERBOARD_TTL_SECONDS);
    return res.status(200).json(payload);
  } catch (error) {
    return next(error);
  }
}
