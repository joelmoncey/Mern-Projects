import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import { checkAndEscalateOverdueQuizzes } from '../utils/escalation.js';

export async function getNotifications(req, res, next) {
  try {
    // Ensure any >24h unedited flagged quizzes are escalated before reading alerts
    await checkAndEscalateOverdueQuizzes().catch(() => {});

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ recipient: req.user._id })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate({
          path: 'quiz',
          select:
            'examName subjectName question flagCount needsCreatorEdit escalatedToAdmin isHidden editCount',
          populate: { path: 'hashtag', select: 'tag' },
        })
        .lean(),
      Notification.countDocuments({
        recipient: req.user._id,
        isRead: false,
      }),
    ]);

    return res.status(200).json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    return next(error);
  }
}

export async function markNotificationRead(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid notification id' });
    }

    const updated = await Notification.findOneAndUpdate(
      { _id: id, recipient: req.user._id },
      { $set: { isRead: true } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    return res.status(200).json({ notification: updated });
  } catch (error) {
    return next(error);
  }
}

export async function markAllNotificationsRead(req, res, next) {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );

    return res.status(200).json({ ok: true });
  } catch (error) {
    return next(error);
  }
}
