import mongoose from 'mongoose';
import User from '../models/User.js';
import Quiz from '../models/Quiz.js';
import { invalidateLeaderboardCache } from '../utils/cache.js';

function buildProfileResponse({ targetUser, viewerUser, quizzes }) {
  const viewerId = viewerUser ? String(viewerUser._id) : null;
  const targetId = String(targetUser._id);
  const isOwnProfile = Boolean(viewerId && viewerId === targetId);
  const isAdminViewer = viewerUser?.role === 'admin';
  const canManageQuizzes = isOwnProfile || isAdminViewer;

  const followers = Array.isArray(targetUser.followers)
    ? targetUser.followers
    : [];
  const following = Array.isArray(targetUser.following)
    ? targetUser.following
    : [];

  const totalSolved = targetUser.totalSolved || 0;
  const correctSolved = targetUser.correctSolved || 0;
  const accuracy =
    totalSolved > 0 ? Math.round((correctSolved / totalSolved) * 100) : 0;

  const isFollowing = viewerId
    ? followers.some((fid) => String(fid) === viewerId)
    : false;

  const serializedQuizzes = quizzes.map((q) => {
    const likes = Array.isArray(q.likes) ? q.likes : [];
    const flags = Array.isArray(q.flags) ? q.flags : [];

    return {
      _id: q._id,
      creator: {
        _id: targetUser._id,
        firstName: targetUser.firstName,
        username: targetUser.username,
        photoUrl: targetUser.photoUrl,
      },
      hashtag: q.hashtag,
      examName: q.examName,
      subExamName: q.subExamName || q.hashtag?.subExamName || '',
      language: q.language || 'English',
      subjectName: q.subjectName,
      subSubjectName: q.subSubjectName || q.hashtag?.subSubjectName || '',
      subTopicName: q.subTopicName || q.hashtag?.subTopicName || '',
      question: q.question,
      options: q.options,
      likesCount: likes.length,
      isLiked: viewerId ? likes.some((uid) => String(uid) === viewerId) : false,
      attemptsCount: q.attemptsCount || 0,
      correctCount: q.correctCount || 0,
      flagCount: q.flagCount || flags.length || 0,
      needsCreatorEdit: Boolean(q.needsCreatorEdit),
      escalatedToAdmin: Boolean(q.escalatedToAdmin),
      editCount: q.editCount || 0,
      isHidden: Boolean(q.isHidden),
      createdAt: q.createdAt,
      ...(canManageQuizzes
        ? {
            correctIndex: q.correctIndex,
            explanation: q.explanation,
            flags,
          }
        : {}),
    };
  });

  return {
    profile: {
      _id: targetUser._id,
      telegramId: targetUser.telegramId,
      username: targetUser.username || '',
      firstName: targetUser.firstName,
      photoUrl: targetUser.photoUrl || '',
      role: targetUser.role,
      canCreateQuiz:
        targetUser.role === 'admin' || Boolean(targetUser.canCreateQuiz),
      totalSolved,
      correctSolved,
      accuracy,
      streakCount: targetUser.streakCount || 0,
      followersCount: followers.length,
      followingCount: following.length,
      isFollowing,
      isOwnProfile,
      canManageQuizzes,
      quizzesCount: serializedQuizzes.length,
    },
    quizzes: serializedQuizzes,
  };
}

export async function getMyProfile(req, res, next) {
  try {
    const quizzes = await Quiz.find({ creator: req.user._id })
      .sort({ needsCreatorEdit: -1, createdAt: -1 })
      .populate(
        'hashtag',
        'examName subExamName subjectName subSubjectName subTopicName tag syllabusScope'
      )
      .lean();

    return res.status(200).json(
      buildProfileResponse({
        targetUser: req.user,
        viewerUser: req.user,
        quizzes,
      })
    );
  } catch (error) {
    return next(error);
  }
}

export async function updateMyUsername(req, res, next) {
  try {
    const rawUsername = String(req.body?.username || '')
      .trim()
      .replace(/^@+/, '');

    if (!rawUsername) {
      return res.status(400).json({ error: 'Please enter a creator username' });
    }

    if (!/^[a-zA-Z0-9_.]{3,24}$/.test(rawUsername)) {
      return res.status(400).json({
        error:
          'Username must be 3–24 characters using letters, numbers, underscores (_), or dots (.)',
      });
    }

    const escaped = rawUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existing = await User.findOne({
      _id: { $ne: req.user._id },
      username: new RegExp(`^${escaped}$`, 'i'),
    })
      .select('_id')
      .lean();

    if (existing) {
      return res.status(409).json({
        error: `Username @${rawUsername} is already taken. Please choose another.`,
      });
    }

    req.user.username = rawUsername;
    await req.user.save();

    invalidateLeaderboardCache();

    return res.status(200).json({
      username: req.user.username,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getUserProfile(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    const targetUser = await User.findById(id).lean();
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isOwnerOrAdmin =
      req.user &&
      (String(req.user._id) === String(targetUser._id) ||
        req.user.role === 'admin');

    const quizFilter = isOwnerOrAdmin
      ? { creator: targetUser._id }
      : { creator: targetUser._id, isHidden: false };

    const quizzes = await Quiz.find(quizFilter)
      .sort({ createdAt: -1 })
      .populate(
        'hashtag',
        'examName subExamName subjectName subSubjectName subTopicName tag syllabusScope'
      )
      .lean();

    return res.status(200).json(
      buildProfileResponse({
        targetUser,
        viewerUser: req.user,
        quizzes,
      })
    );
  } catch (error) {
    return next(error);
  }
}

export async function listUsersForAdmin(req, res, next) {
  try {
    const q = String(req.query.q || '').trim();
    const filter = {};

    if (q) {
      const cleanQ = q.replace(/^@/, '');
      const escaped = cleanQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [
        { username: regex },
        { telegramUsername: regex },
        { firstName: regex },
        { telegramId: regex },
      ];
    }

    const users = await User.find(filter)
      .sort({ role: 1, canCreateQuiz: -1, createdAt: -1 })
      .limit(60)
      .select(
        'telegramId username telegramUsername firstName photoUrl role canCreateQuiz totalSolved correctSolved streakCount createdAt'
      )
      .lean();

    return res.status(200).json({
      users: users.map((u) => ({
        ...u,
        canCreateQuiz: u.role === 'admin' || Boolean(u.canCreateQuiz),
      })),
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateCreatorAccess(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.role === 'admin') {
      return res.status(400).json({
        error: 'Admin users always have quiz creation permission',
      });
    }

    targetUser.canCreateQuiz =
      typeof req.body?.canCreateQuiz === 'boolean'
        ? req.body.canCreateQuiz
        : !targetUser.canCreateQuiz;

    await targetUser.save();

    return res.status(200).json({
      user: {
        _id: targetUser._id,
        telegramId: targetUser.telegramId,
        username: targetUser.username,
        firstName: targetUser.firstName,
        role: targetUser.role,
        canCreateQuiz: targetUser.canCreateQuiz,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function approveCreatorByIdentifier(req, res, next) {
  try {
    const rawIdentifier = String(req.body?.identifier || '').trim();
    if (!rawIdentifier) {
      return res
        .status(400)
        .json({ error: 'Provide a Telegram @username or numeric Telegram ID' });
    }

    const cleaned = rawIdentifier.replace(/^@/, '');
    const escaped = cleaned.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const targetUser = await User.findOne({
      $or: [
        { telegramId: cleaned },
        { username: new RegExp(`^${escaped}$`, 'i') },
        { telegramUsername: new RegExp(`^${escaped}$`, 'i') },
      ],
    });

    if (!targetUser) {
      return res.status(404).json({
        error: `No registered user found with "${rawIdentifier}". Ask them to open Quiz-Gram once first.`,
      });
    }

    targetUser.canCreateQuiz = true;
    await targetUser.save();

    return res.status(200).json({
      user: {
        _id: targetUser._id,
        telegramId: targetUser.telegramId,
        username: targetUser.username,
        firstName: targetUser.firstName,
        role: targetUser.role,
        canCreateQuiz: true,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function toggleFollowUser(req, res, next) {
  try {
    const { id: targetUserId } = req.params;
    if (!mongoose.isValidObjectId(targetUserId)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    const currentUserId = String(req.user._id);
    if (currentUserId === String(targetUserId)) {
      return res.status(400).json({ error: 'You cannot follow yourself' });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const alreadyFollowing = (req.user.following || []).some(
      (followedId) => String(followedId) === String(targetUserId)
    );

    if (alreadyFollowing) {
      await Promise.all([
        User.updateOne(
          { _id: req.user._id },
          { $pull: { following: targetUser._id } }
        ),
        User.updateOne(
          { _id: targetUser._id },
          { $pull: { followers: req.user._id } }
        ),
      ]);

      const updatedTarget = await User.findById(targetUser._id).select(
        'followers'
      );

      return res.status(200).json({
        following: false,
        followersCount: updatedTarget?.followers?.length || 0,
      });
    }

    await Promise.all([
      User.updateOne(
        { _id: req.user._id },
        { $addToSet: { following: targetUser._id } }
      ),
      User.updateOne(
        { _id: targetUser._id },
        { $addToSet: { followers: req.user._id } }
      ),
    ]);

    const updatedTarget = await User.findById(targetUser._id).select(
      'followers'
    );

    return res.status(200).json({
      following: true,
      followersCount: updatedTarget?.followers?.length || 0,
    });
  } catch (error) {
    return next(error);
  }
}
