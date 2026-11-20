import mongoose from 'mongoose';
import User from '../models/User.js';
import Quiz from '../models/Quiz.js';

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
      subjectName: q.subjectName,
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
      .populate('hashtag', 'examName subjectName tag syllabusScope')
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
      .populate('hashtag', 'examName subjectName tag syllabusScope')
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
