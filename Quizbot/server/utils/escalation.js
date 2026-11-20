import Quiz from '../models/Quiz.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';

export const FLAG_CREATOR_THRESHOLD = Math.max(
  1,
  Number(process.env.FLAG_CREATOR_THRESHOLD) || 3
);
export const FLAG_ADMIN_THRESHOLD = Math.max(
  FLAG_CREATOR_THRESHOLD + 1,
  Number(process.env.FLAG_ADMIN_THRESHOLD) || 6
);
export const ESCALATION_HOURS = Math.max(
  1,
  Number(process.env.ESCALATION_HOURS) || 24
);

/**
 * Pure helper evaluating whether a quiz should trigger creator notification
 * or admin escalation given its current flag/edit state.
 */
export function evaluateFlagEscalation(
  quizState,
  {
    now = new Date(),
    creatorThreshold = FLAG_CREATOR_THRESHOLD,
    adminThreshold = FLAG_ADMIN_THRESHOLD,
    escalationHours = ESCALATION_HOURS,
  } = {}
) {
  const flagCount = Number(quizState.flagCount) || 0;
  const needsCreatorEdit = Boolean(quizState.needsCreatorEdit);
  const escalatedToAdmin = Boolean(quizState.escalatedToAdmin);
  const creatorNotifiedAt = quizState.creatorNotifiedAt
    ? new Date(quizState.creatorNotifiedAt)
    : null;
  const lastEditedAt = quizState.lastEditedAt
    ? new Date(quizState.lastEditedAt)
    : null;

  const shouldNotifyCreator =
    !needsCreatorEdit && flagCount >= creatorThreshold;

  const effectiveNeedsEdit = needsCreatorEdit || shouldNotifyCreator;
  const effectiveNotifiedAt =
    creatorNotifiedAt || (shouldNotifyCreator ? now : null);

  const uneditedSinceNotification =
    !lastEditedAt ||
    !effectiveNotifiedAt ||
    lastEditedAt.getTime() < effectiveNotifiedAt.getTime();

  const hoursSinceNotification = effectiveNotifiedAt
    ? (now.getTime() - effectiveNotifiedAt.getTime()) / (1000 * 60 * 60)
    : 0;

  const shouldEscalateToAdmin =
    effectiveNeedsEdit &&
    !escalatedToAdmin &&
    uneditedSinceNotification &&
    (hoursSinceNotification >= escalationHours || flagCount >= adminThreshold);

  return {
    shouldNotifyCreator,
    shouldEscalateToAdmin,
  };
}

export async function notifyAdminsOfEscalation(quiz, reasonLabel) {
  const admins = await User.find({ role: 'admin' }).select('_id').lean();
  if (admins.length === 0) return;

  const snippet = String(quiz.question || '').slice(0, 90);
  const message = `Escalated quiz (${quiz.examName} · ${quiz.flagCount} flags, ${reasonLabel}): "${snippet}${
    quiz.question?.length > 90 ? '…' : ''
  }"`;

  await Notification.insertMany(
    admins.map((admin) => ({
      recipient: admin._id,
      type: 'admin_escalation',
      quiz: quiz._id,
      message,
      isRead: false,
      createdAt: new Date(),
    }))
  );
}

/**
 * Checks for quizzes where needsCreatorEdit has been active for > ESCALATION_HOURS
 * without being edited, escalates them to admin, and notifies all admins.
 */
export async function checkAndEscalateOverdueQuizzes(now = new Date()) {
  const cutoff = new Date(now.getTime() - ESCALATION_HOURS * 60 * 60 * 1000);

  const overdueQuizzes = await Quiz.find({
    needsCreatorEdit: true,
    escalatedToAdmin: false,
    creatorNotifiedAt: { $ne: null, $lte: cutoff },
  });

  let escalatedCount = 0;

  for (const quiz of overdueQuizzes) {
    const editedAfterNotice =
      quiz.lastEditedAt &&
      quiz.creatorNotifiedAt &&
      quiz.lastEditedAt.getTime() >= quiz.creatorNotifiedAt.getTime();

    if (editedAfterNotice) continue;

    quiz.escalatedToAdmin = true;
    quiz.escalatedAt = now;
    await quiz.save();

    await notifyAdminsOfEscalation(quiz, `unedited > ${ESCALATION_HOURS}h`);
    escalatedCount += 1;
  }

  return escalatedCount;
}
