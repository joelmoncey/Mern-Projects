import mongoose from 'mongoose';
import Quiz from '../models/Quiz.js';
import Hashtag from '../models/Hashtag.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import Attempt from '../models/Attempt.js';
import { computeQuestionHash } from '../utils/questionHash.js';
import { validateAndSanitizeVisual } from '../utils/quizVisuals.js';
import { buildFeed, getStartOfLocalDay } from '../utils/feedBuilder.js';
import {
  evaluateFlagEscalation,
  notifyAdminsOfEscalation,
  checkAndEscalateOverdueQuizzes,
  ESCALATION_HOURS,
} from '../utils/escalation.js';
import {
  invalidateHashtagsCache,
  invalidateLeaderboardCache,
} from '../utils/cache.js';

const DUPLICATE_QUIZ_MESSAGE =
  'You have already added this question to your profile.';

function parseSeenHashes(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .flatMap((entry) => String(entry).split(','))
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function getUtcDayStart(date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function validateQuizPayload({
  question,
  options,
  correctIndex,
  explanation,
  visualType = 'none',
  visualData = '',
}) {
  if (!question || typeof question !== 'string' || !question.trim()) {
    return { error: 'Question text is required' };
  }
  if (question.trim().length > 3000) {
    return { error: 'Question must be 3000 characters or fewer' };
  }

  if (
    !Array.isArray(options) ||
    options.length !== 4 ||
    options.some((opt) => typeof opt !== 'string' || !opt.trim())
  ) {
    return { error: 'Exactly 4 non-empty options are required' };
  }

  const parsedCorrectIndex = Number(correctIndex);
  if (
    !Number.isInteger(parsedCorrectIndex) ||
    parsedCorrectIndex < 0 ||
    parsedCorrectIndex > 3
  ) {
    return { error: 'correctIndex must be an integer between 0 and 3' };
  }

  const trimmedExplanation = String(explanation || '').trim();
  if (trimmedExplanation.length > 2000) {
    return { error: 'Explanation must be 2000 characters or fewer' };
  }

  const visual = validateAndSanitizeVisual({ visualType, visualData });
  if (visual.error) {
    return { error: visual.error };
  }

  const { normalizedQuestion, questionHash } = computeQuestionHash(
    question,
    visual.visualData
  );
  if (!normalizedQuestion) {
    return { error: 'Question text is invalid' };
  }

  return {
    question: question.trim(),
    visualType: visual.visualType,
    visualData: visual.visualData,
    normalizedQuestion,
    questionHash,
    options: options.map((opt) => opt.trim()),
    correctIndex: parsedCorrectIndex,
    explanation: trimmedExplanation,
  };
}

export async function createQuiz(req, res, next) {
  try {
    if (req.user.role !== 'admin' && !req.user.canCreateQuiz) {
      return res.status(403).json({
        error:
          'Only admin-approved creators can publish quizzes. Contact the admin to request creator access.',
      });
    }

    const {
      hashtagId,
      hashtag,
      language,
      question,
      options,
      correctIndex,
      explanation = '',
      visualType = 'none',
      visualData = '',
    } = req.body || {};

    const hashtagRef = hashtagId || hashtag;
    if (!hashtagRef) {
      return res
        .status(400)
        .json({ error: 'An active subject hashtag is required' });
    }

    let hashtagDoc = null;
    if (mongoose.isValidObjectId(hashtagRef)) {
      hashtagDoc = await Hashtag.findById(hashtagRef);
    } else if (typeof hashtagRef === 'string') {
      hashtagDoc = await Hashtag.findOne({
        tag: hashtagRef.trim().replace(/^#+/, '').toUpperCase(),
      });
    }

    if (!hashtagDoc || !hashtagDoc.isActive) {
      return res
        .status(400)
        .json({ error: 'Selected hashtag is invalid or inactive' });
    }

    const validated = validateQuizPayload({
      question,
      options,
      correctIndex,
      explanation,
      visualType,
      visualData,
    });
    if (validated.error) {
      return res.status(400).json({ error: validated.error });
    }

    const allowedLanguages =
      Array.isArray(hashtagDoc.languages) && hashtagDoc.languages.length > 0
        ? hashtagDoc.languages
        : ['English'];

    const requestedLang = String(language || '').trim();
    const matchedLang = requestedLang
      ? allowedLanguages.find(
          (l) => l.toLowerCase() === requestedLang.toLowerCase()
        )
      : allowedLanguages[0];

    if (!matchedLang) {
      return res.status(400).json({
        error: `Language "${requestedLang}" is not enabled for this exam topic. Allowed: ${allowedLanguages.join(', ')}`,
      });
    }

    const duplicate = await Quiz.exists({
      creator: req.user._id,
      examName: hashtagDoc.examName,
      language: matchedLang,
      questionHash: validated.questionHash,
    });
    if (duplicate) {
      return res.status(409).json({ error: DUPLICATE_QUIZ_MESSAGE });
    }

    const docSubExams =
      Array.isArray(hashtagDoc.subExams) && hashtagDoc.subExams.length > 0
        ? hashtagDoc.subExams
        : (hashtagDoc.subExamName || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);

    const quiz = await Quiz.create({
      creator: req.user._id,
      hashtag: hashtagDoc._id,
      examName: hashtagDoc.examName,
      subExams: docSubExams,
      subExamName: docSubExams.join(', '),
      language: matchedLang,
      subjectName: hashtagDoc.subjectName,
      subSubjectName: hashtagDoc.subSubjectName || '',
      subTopicName: hashtagDoc.subTopicName || '',
      question: validated.question,
      visualType: validated.visualType,
      visualData: validated.visualData,
      normalizedQuestion: validated.normalizedQuestion,
      questionHash: validated.questionHash,
      options: validated.options,
      correctIndex: validated.correctIndex,
      explanation: validated.explanation,
    });

    await Hashtag.updateOne(
      { _id: hashtagDoc._id },
      { $inc: { quizCount: 1 } }
    );

    invalidateHashtagsCache();
    invalidateLeaderboardCache();

    await quiz.populate([
      { path: 'creator', select: 'firstName username photoUrl' },
      {
        path: 'hashtag',
        select:
          'examName subExams subExamName languages subjectName subSubjectName subTopicName tag customTag syllabusScope isActive',
      },
    ]);

    return res.status(201).json({ quiz });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ error: DUPLICATE_QUIZ_MESSAGE });
    }
    return next(error);
  }
}

export async function createBulkQuizzes(req, res, next) {
  try {
    if (req.user.role !== 'admin' && !req.user.canCreateQuiz) {
      return res.status(403).json({
        error:
          'Only admin-approved creators can publish quizzes. Contact the admin to request creator access.',
      });
    }

    const { hashtagId, hashtag, language, quizzes } = req.body || {};

    const hashtagRef = hashtagId || hashtag;
    if (!hashtagRef) {
      return res
        .status(400)
        .json({ error: 'An active subject hashtag is required' });
    }

    if (!Array.isArray(quizzes) || quizzes.length === 0) {
      return res
        .status(400)
        .json({ error: 'Provide at least 1 quiz in the bulk payload' });
    }

    if (quizzes.length > 100) {
      return res.status(400).json({
        error: 'Bulk upload supports up to 100 quizzes per batch',
      });
    }

    let hashtagDoc = null;
    if (mongoose.isValidObjectId(hashtagRef)) {
      hashtagDoc = await Hashtag.findById(hashtagRef);
    } else if (typeof hashtagRef === 'string') {
      hashtagDoc = await Hashtag.findOne({
        tag: hashtagRef.trim().replace(/^#+/, '').toUpperCase(),
      });
    }

    if (!hashtagDoc || !hashtagDoc.isActive) {
      return res
        .status(400)
        .json({ error: 'Selected hashtag is invalid or inactive' });
    }

    const allowedLanguages =
      Array.isArray(hashtagDoc.languages) && hashtagDoc.languages.length > 0
        ? hashtagDoc.languages
        : ['English'];

    const requestedLang = String(language || '').trim();
    const matchedLang = requestedLang
      ? allowedLanguages.find(
          (l) => l.toLowerCase() === requestedLang.toLowerCase()
        )
      : allowedLanguages[0];

    if (!matchedLang) {
      return res.status(400).json({
        error: `Language "${requestedLang}" is not enabled for this exam topic. Allowed: ${allowedLanguages.join(', ')}`,
      });
    }

    const validCandidates = [];
    const validationErrors = [];
    const seenBatchHashes = new Set();
    let skippedBatchDuplicates = 0;

    quizzes.forEach((rawItem, idx) => {
      const validated = validateQuizPayload(rawItem || {});
      if (validated.error) {
        validationErrors.push(`Quiz #${idx + 1}: ${validated.error}`);
        return;
      }
      if (seenBatchHashes.has(validated.questionHash)) {
        skippedBatchDuplicates += 1;
        return;
      }
      seenBatchHashes.add(validated.questionHash);
      validCandidates.push({
        ...validated,
        index: idx + 1,
      });
    });

    if (validCandidates.length === 0) {
      return res.status(400).json({
        error:
          validationErrors[0] ||
          'No valid quizzes found in the bulk submission.',
        validationErrors,
      });
    }

    // Check which questionHashes already exist for this creator + exam + language
    const existingDocs = await Quiz.find({
      creator: req.user._id,
      examName: hashtagDoc.examName,
      language: matchedLang,
      questionHash: { $in: validCandidates.map((c) => c.questionHash) },
    })
      .select('questionHash')
      .lean();

    const existingHashSet = new Set(
      existingDocs.map((doc) => doc.questionHash)
    );

    const docsToInsert = [];
    let skippedExistingDuplicates = 0;

    const docSubExams =
      Array.isArray(hashtagDoc.subExams) && hashtagDoc.subExams.length > 0
        ? hashtagDoc.subExams
        : (hashtagDoc.subExamName || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);

    for (const candidate of validCandidates) {
      if (existingHashSet.has(candidate.questionHash)) {
        skippedExistingDuplicates += 1;
        continue;
      }
      docsToInsert.push({
        creator: req.user._id,
        hashtag: hashtagDoc._id,
        examName: hashtagDoc.examName,
        subExams: docSubExams,
        subExamName: docSubExams.join(', '),
        language: matchedLang,
        subjectName: hashtagDoc.subjectName,
        subSubjectName: hashtagDoc.subSubjectName || '',
        subTopicName: hashtagDoc.subTopicName || '',
        question: candidate.question,
        visualType: candidate.visualType,
        visualData: candidate.visualData,
        normalizedQuestion: candidate.normalizedQuestion,
        questionHash: candidate.questionHash,
        options: candidate.options,
        correctIndex: candidate.correctIndex,
        explanation: candidate.explanation,
      });
    }

    let insertedDocs = [];
    if (docsToInsert.length > 0) {
      insertedDocs = await Quiz.insertMany(docsToInsert, { ordered: false });
      await Hashtag.updateOne(
        { _id: hashtagDoc._id },
        { $inc: { quizCount: insertedDocs.length } }
      );
      invalidateHashtagsCache();
      invalidateLeaderboardCache();
    }

    return res.status(201).json({
      createdCount: insertedDocs.length,
      skippedDuplicatesCount:
        skippedBatchDuplicates + skippedExistingDuplicates,
      skippedInvalidCount: validationErrors.length,
      validationErrors,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getQuizFeed(req, res, next) {
  try {
    const {
      examName,
      subExamName,
      subExams,
      language,
      subjectName,
      subSubjectName,
      subTopicName,
      hashtag,
      tab = 'forYou',
      seenHashes,
      prioritizeQuizId,
      limit = '12',
    } = req.query;

    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 12, 1), 30);
    const seenList = parseSeenHashes(seenHashes);

    let pinnedQuiz = null;
    if (
      typeof prioritizeQuizId === 'string' &&
      mongoose.isValidObjectId(prioritizeQuizId.trim())
    ) {
      pinnedQuiz = await Quiz.findOne({
        _id: prioritizeQuizId.trim(),
        isHidden: false,
      })
        .populate('creator', 'firstName username photoUrl')
        .populate(
          'hashtag',
          'examName subExamName subjectName subSubjectName subTopicName tag syllabusScope isActive'
        )
        .lean();
    }

    // Resolve user's today attempts (blocked for rest of today) vs earlier-day attempts (allowed after newest unseen)
    const todayAttemptedHashes = new Set();
    const earlierAttemptedHashes = new Set();

    if (req.user?._id) {
      const todayStart = getStartOfLocalDay();
      const userAttempts = await Attempt.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .limit(1000)
        .select('quiz createdAt')
        .lean();

      if (userAttempts.length > 0) {
        const quizIds = Array.from(
          new Set(userAttempts.map((a) => String(a.quiz)).filter(Boolean))
        );
        const attemptedQuizzes = await Quiz.find({ _id: { $in: quizIds } })
          .select('_id questionHash')
          .lean();
        const hashByQuizId = new Map(
          attemptedQuizzes.map((q) => [String(q._id), q.questionHash])
        );

        for (const att of userAttempts) {
          const hash = hashByQuizId.get(String(att.quiz));
          if (!hash) continue;
          if (new Date(att.createdAt) >= todayStart) {
            todayAttemptedHashes.add(hash);
          } else {
            earlierAttemptedHashes.add(hash);
          }
        }
      }
    }

    const effectiveSeenList = Array.from(
      new Set([
        ...seenList,
        ...todayAttemptedHashes,
        ...(pinnedQuiz?.questionHash ? [pinnedQuiz.questionHash] : []),
      ])
    );

    const query = { isHidden: false };

    if (effectiveSeenList.length > 0) {
      query.questionHash = { $nin: effectiveSeenList };
    }

    if (
      typeof examName === 'string' &&
      examName.trim() !== '' &&
      examName.trim().toUpperCase() !== 'ALL'
    ) {
      query.examName = examName.trim();
    }

    const rawSubExamParam = subExams || subExamName;
    if (
      typeof rawSubExamParam === 'string' &&
      rawSubExamParam.trim() !== '' &&
      rawSubExamParam.trim().toUpperCase() !== 'ALL'
    ) {
      const selectedSubExamList = rawSubExamParam
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s && s.toUpperCase() !== 'ALL');

      if (selectedSubExamList.length > 0) {
        const regexList = selectedSubExamList.map((se) => {
          const escaped = se.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          return new RegExp(`(?:^|,)\\s*${escaped}\\s*(?:,|$)`, 'i');
        });

        // Match topics whose subExams array contains the chosen sub-exam (or global topics with empty subExams)
        const matchingTags = await Hashtag.find({
          ...(query.examName ? { examName: query.examName } : {}),
          $or: [
            { subExams: { $in: selectedSubExamList } },
            { subExams: { $size: 0 } },
            { subExamName: { $in: regexList } },
            { subExamName: '' },
          ],
        })
          .select('_id')
          .lean();

        const matchingTagIds = matchingTags.map((t) => t._id);

        query.$and = [
          ...(query.$and || []),
          {
            $or: [
              { hashtag: { $in: matchingTagIds } },
              { subExams: { $in: selectedSubExamList } },
              { subExamName: { $in: regexList } },
            ],
          },
        ];
      }
    }

    if (
      typeof language === 'string' &&
      language.trim() !== '' &&
      language.trim().toUpperCase() !== 'ALL'
    ) {
      const langList = language
        .split(',')
        .map((l) => l.trim())
        .filter((l) => l && l.toUpperCase() !== 'ALL');

      if (langList.length > 0) {
        const regexList = langList.map((l) => {
          const escaped = l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          return new RegExp(`^${escaped}$`, 'i');
        });
        const includesEnglish = langList.some(
          (l) => l.toLowerCase() === 'english'
        );

        if (includesEnglish) {
          query.$and = [
            ...(query.$and || []),
            {
              $or: [
                { language: { $in: regexList } },
                { language: { $exists: false } },
                { language: '' },
              ],
            },
          ];
        } else {
          query.language = { $in: regexList };
        }
      }
    }

    if (
      typeof subjectName === 'string' &&
      subjectName.trim() !== '' &&
      subjectName.trim().toUpperCase() !== 'ALL'
    ) {
      query.subjectName = subjectName.trim();
    }

    if (
      typeof subSubjectName === 'string' &&
      subSubjectName.trim() !== '' &&
      subSubjectName.trim().toUpperCase() !== 'ALL'
    ) {
      query.subSubjectName = subSubjectName.trim();
    }

    if (
      typeof subTopicName === 'string' &&
      subTopicName.trim() !== '' &&
      subTopicName.trim().toUpperCase() !== 'ALL'
    ) {
      query.subTopicName = subTopicName.trim();
    }

    if (typeof hashtag === 'string' && hashtag.trim() !== '') {
      if (mongoose.isValidObjectId(hashtag.trim())) {
        query.hashtag = hashtag.trim();
      } else {
        const tagDoc = await Hashtag.findOne({
          tag: hashtag.trim().replace(/^#+/, '').toUpperCase(),
        }).select('_id');
        if (!tagDoc) {
          return res.status(200).json({
            quizzes: [],
            nextSeenHashes: seenList,
            hasMore: false,
          });
        }
        query.hashtag = tagDoc._id;
      }
    }

    if (tab === 'following') {
      const followingIds = req.user?.following || [];
      if (!req.user || followingIds.length === 0) {
        return res.status(200).json({
          quizzes: [],
          nextSeenHashes: seenList,
          hasMore: false,
        });
      }
      query.creator = { $in: followingIds };
    }

    const candidateLimit = Math.min(Math.max(parsedLimit * 5, 60), 250);

    const candidates = await Quiz.find(query)
      .sort({ createdAt: -1 })
      .limit(candidateLimit)
      .populate('creator', 'firstName username photoUrl')
      .populate(
        'hashtag',
        'examName subExams subExamName languages subjectName subSubjectName subTopicName tag customTag syllabusScope isActive'
      )
      .lean();

    const remainingSlots = pinnedQuiz ? Math.max(0, parsedLimit - 1) : parsedLimit;

    const balanced = buildFeed({
      examName: query.examName || null,
      candidates,
      seenQuestionHashes: effectiveSeenList,
      earlierRepeatHashes: earlierAttemptedHashes,
      prioritizeNewest: true,
      limit: remainingSlots + 1,
    });

    const hasMore = balanced.length > remainingSlots;
    const page = pinnedQuiz
      ? [pinnedQuiz, ...balanced.slice(0, remainingSlots)]
      : balanced.slice(0, remainingSlots);

    const currentUserId = req.user ? String(req.user._id) : null;
    const isAdminViewer = req.user?.role === 'admin';
    const followingSet = new Set(
      (req.user?.following || []).map((id) => String(id))
    );

    const quizzes = page.map((q) => {
      const likes = Array.isArray(q.likes) ? q.likes : [];
      const flags = Array.isArray(q.flags) ? q.flags : [];
      const creatorId = q.creator?._id ? String(q.creator._id) : String(q.creator);
      const isOwnQuiz = currentUserId ? creatorId === currentUserId : false;

      return {
        _id: q._id,
        creator: q.creator,
        hashtag: q.hashtag,
        examName: q.examName,
        subExams:
          Array.isArray(q.subExams) && q.subExams.length > 0
            ? q.subExams
            : Array.isArray(q.hashtag?.subExams) && q.hashtag.subExams.length > 0
              ? q.hashtag.subExams
              : (q.subExamName || q.hashtag?.subExamName || '')
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
        subExamName: q.subExamName || q.hashtag?.subExamName || '',
        language: q.language || 'English',
        subjectName: q.subjectName,
        subSubjectName: q.subSubjectName || q.hashtag?.subSubjectName || '',
        subTopicName: q.subTopicName || q.hashtag?.subTopicName || '',
        question: q.question,
        visualType: q.visualType || 'none',
        visualData: q.visualData || '',
        questionHash: q.questionHash,
        isRevisionRepeat: earlierAttemptedHashes.has(q.questionHash),
        options: q.options,
        likesCount: likes.length,
        isLiked: currentUserId
          ? likes.some((uid) => String(uid) === currentUserId)
          : false,
        isFlaggedByMe: currentUserId
          ? flags.some((f) => String(f.userId) === currentUserId)
          : false,
        flagCount: q.flagCount || flags.length || 0,
        needsCreatorEdit: Boolean(q.needsCreatorEdit),
        editCount: q.editCount || 0,
        lastEditedAt: q.lastEditedAt || null,
        isFollowingCreator: currentUserId ? followingSet.has(creatorId) : false,
        isOwnQuiz,
        canManage: isAdminViewer || isOwnQuiz,
        ...(isAdminViewer || isOwnQuiz
          ? {
              correctIndex: q.correctIndex,
              explanation: q.explanation,
            }
          : {}),
        attemptsCount: q.attemptsCount || 0,
        correctCount: q.correctCount || 0,
        createdAt: q.createdAt,
      };
    });

    const nextSeenHashes = Array.from(
      new Set([...seenList, ...page.map((q) => q.questionHash)])
    );

    return res.status(200).json({
      quizzes,
      nextSeenHashes,
      hasMore,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getMyQuizzes(req, res, next) {
  try {
    const quizzes = await Quiz.find({ creator: req.user._id })
      .sort({ needsCreatorEdit: -1, flagCount: -1, createdAt: -1 })
      .populate('hashtag', 'examName subjectName tag syllabusScope')
      .lean();

    return res.status(200).json({ quizzes });
  } catch (error) {
    return next(error);
  }
}

export async function getQuizById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid quiz id' });
    }

    const quiz = await Quiz.findById(id)
      .populate('creator', 'firstName username photoUrl')
      .populate('hashtag', 'examName subjectName tag syllabusScope')
      .lean();

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const isCreator = String(quiz.creator?._id || quiz.creator) === String(req.user._id);
    const isAdmin = req.user.role === 'admin';
    if (!isCreator && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to inspect this quiz' });
    }

    return res.status(200).json({ quiz });
  } catch (error) {
    return next(error);
  }
}

export async function getEscalatedQuizzes(req, res, next) {
  try {
    await checkAndEscalateOverdueQuizzes().catch(() => {});

    const quizzes = await Quiz.find({
      $or: [{ escalatedToAdmin: true }, { needsCreatorEdit: true }],
    })
      .sort({ escalatedToAdmin: -1, escalatedAt: -1, flagCount: -1 })
      .populate('creator', 'firstName username photoUrl')
      .populate(
        'hashtag',
        'examName subExamName subjectName subSubjectName subTopicName tag syllabusScope'
      )
      .lean();

    return res.status(200).json({ quizzes });
  } catch (error) {
    return next(error);
  }
}

export async function getAllQuizzesForAdmin(req, res, next) {
  try {
    const q = String(req.query.q || '').trim();
    const filter = {};
    if (q) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [
        { question: regex },
        { examName: regex },
        { subExamName: regex },
        { subjectName: regex },
        { subSubjectName: regex },
        { subTopicName: regex },
      ];
    }

    const quizzes = await Quiz.find(filter)
      .sort({ createdAt: -1 })
      .limit(80)
      .populate('creator', 'firstName username photoUrl telegramId')
      .populate(
        'hashtag',
        'examName subExamName subjectName subSubjectName subTopicName tag syllabusScope'
      )
      .lean();

    return res.status(200).json({ quizzes });
  } catch (error) {
    return next(error);
  }
}

export async function flagQuiz(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid quiz id' });
    }

    const quiz = await Quiz.findById(id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const userIdStr = String(req.user._id);
    const alreadyFlagged = (quiz.flags || []).some(
      (entry) => String(entry.userId) === userIdStr
    );
    if (alreadyFlagged) {
      return res
        .status(409)
        .json({ error: 'You have already flagged this quiz.' });
    }

    const now = new Date();
    const reason = String(req.body?.reason || '').trim().slice(0, 200);

    quiz.flags.push({
      userId: req.user._id,
      reason,
      createdAt: now,
    });
    quiz.flagCount = quiz.flags.length;

    const { shouldNotifyCreator, shouldEscalateToAdmin } =
      evaluateFlagEscalation(quiz, { now });

    if (shouldNotifyCreator) {
      quiz.needsCreatorEdit = true;
      quiz.creatorNotifiedAt = now;
    }

    if (shouldEscalateToAdmin) {
      quiz.escalatedToAdmin = true;
      quiz.escalatedAt = now;
    }

    await quiz.save();

    if (shouldNotifyCreator) {
      const snippet = quiz.question.slice(0, 90);
      await Notification.create({
        recipient: quiz.creator,
        type: 'flag_edit_request',
        quiz: quiz._id,
        message: `Your ${quiz.examName} quiz was flagged ${quiz.flagCount} times as potentially mistaken: "${snippet}${
          quiz.question.length > 90 ? '…' : ''
        }". Please review and edit it.`,
        isRead: false,
        createdAt: now,
      });
    }

    if (shouldEscalateToAdmin) {
      const reasonLabel =
        quiz.flagCount >= 6
          ? `${quiz.flagCount} flags while unedited`
          : `unedited > ${ESCALATION_HOURS}h`;
      await notifyAdminsOfEscalation(quiz, reasonLabel);
    }

    return res.status(200).json({
      flagCount: quiz.flagCount,
      needsCreatorEdit: quiz.needsCreatorEdit,
      escalatedToAdmin: quiz.escalatedToAdmin,
      isFlaggedByMe: true,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateQuiz(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid quiz id' });
    }

    const quiz = await Quiz.findById(id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const isCreator = String(quiz.creator) === String(req.user._id);
    const isAdmin = req.user.role === 'admin';
    if (!isCreator && !isAdmin) {
      return res
        .status(403)
        .json({ error: 'Only the quiz creator or an admin can edit this quiz' });
    }

    const validated = validateQuizPayload({
      question: req.body?.question ?? quiz.question,
      options: req.body?.options ?? quiz.options,
      correctIndex:
        req.body?.correctIndex !== undefined
          ? req.body.correctIndex
          : quiz.correctIndex,
      explanation:
        req.body?.explanation !== undefined
          ? req.body.explanation
          : quiz.explanation,
      visualType:
        req.body?.visualType !== undefined
          ? req.body.visualType
          : quiz.visualType,
      visualData:
        req.body?.visualData !== undefined
          ? req.body.visualData
          : quiz.visualData,
    });

    if (validated.error) {
      return res.status(400).json({ error: validated.error });
    }

    const duplicate = await Quiz.exists({
      _id: { $ne: quiz._id },
      creator: quiz.creator,
      examName: quiz.examName,
      questionHash: validated.questionHash,
    });
    if (duplicate) {
      return res.status(409).json({ error: DUPLICATE_QUIZ_MESSAGE });
    }

    const now = new Date();
    quiz.question = validated.question;
    quiz.visualType = validated.visualType;
    quiz.visualData = validated.visualData;
    quiz.normalizedQuestion = validated.normalizedQuestion;
    quiz.questionHash = validated.questionHash;
    quiz.options = validated.options;
    quiz.correctIndex = validated.correctIndex;
    quiz.explanation = validated.explanation;
    quiz.editCount = (quiz.editCount || 0) + 1;
    quiz.lastEditedAt = now;

    // Reset moderation/flag state so the fixed quiz can be reviewed fresh
    quiz.needsCreatorEdit = false;
    quiz.creatorNotifiedAt = null;
    quiz.escalatedToAdmin = false;
    quiz.escalatedAt = null;
    quiz.isHidden = false;
    quiz.flags = [];
    quiz.flagCount = 0;

    await quiz.save();

    // Clear old unresolved notifications for this quiz
    await Notification.deleteMany({ quiz: quiz._id });

    invalidateLeaderboardCache();

    await quiz.populate([
      { path: 'creator', select: 'firstName username photoUrl' },
      { path: 'hashtag', select: 'examName subjectName tag syllabusScope' },
    ]);

    return res.status(200).json({ quiz });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ error: DUPLICATE_QUIZ_MESSAGE });
    }
    return next(error);
  }
}

export async function deleteQuiz(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid quiz id' });
    }

    const quiz = await Quiz.findById(id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const isCreator = String(quiz.creator) === String(req.user._id);
    const isAdmin = req.user.role === 'admin';
    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        error: 'Only the quiz creator or an admin can delete this quiz',
      });
    }

    await Promise.all([
      Quiz.deleteOne({ _id: quiz._id }),
      Hashtag.updateOne(
        { _id: quiz.hashtag, quizCount: { $gt: 0 } },
        { $inc: { quizCount: -1 } }
      ),
      Notification.deleteMany({ quiz: quiz._id }),
    ]);

    invalidateHashtagsCache();
    invalidateLeaderboardCache();

    return res.status(200).json({
      deleted: true,
      _id: quiz._id,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateQuizVisibility(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid quiz id' });
    }

    const quiz = await Quiz.findById(id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    quiz.isHidden =
      typeof req.body?.isHidden === 'boolean'
        ? req.body.isHidden
        : !quiz.isHidden;
    await quiz.save();

    invalidateLeaderboardCache();

    return res.status(200).json({
      _id: quiz._id,
      isHidden: quiz.isHidden,
    });
  } catch (error) {
    return next(error);
  }
}

export async function attemptQuiz(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid quiz id' });
    }

    const selectedIndex = Number(req.body?.selectedIndex);
    if (
      !Number.isInteger(selectedIndex) ||
      selectedIndex < 0 ||
      selectedIndex > 3
    ) {
      return res
        .status(400)
        .json({ error: 'selectedIndex must be an integer between 0 and 3' });
    }

    const quiz = await Quiz.findById(id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const isCorrect = quiz.correctIndex === selectedIndex;

    // Compute daily streak update in UTC
    const now = new Date();
    const todayStart = getUtcDayStart(now);
    const lastActive = req.user.lastActiveDate
      ? new Date(req.user.lastActiveDate)
      : null;

    let nextStreak = req.user.streakCount || 0;
    if (!lastActive) {
      nextStreak = 1;
    } else {
      const dayDiff = Math.round(
        (todayStart - getUtcDayStart(lastActive)) / (24 * 60 * 60 * 1000)
      );
      if (dayDiff === 0) {
        nextStreak = Math.max(nextStreak, 1);
      } else if (dayDiff === 1) {
        nextStreak += 1;
      } else {
        nextStreak = 1;
      }
    }

    const [updatedQuiz, updatedUser] = await Promise.all([
      Quiz.findByIdAndUpdate(
        quiz._id,
        {
          $inc: {
            attemptsCount: 1,
            correctCount: isCorrect ? 1 : 0,
          },
        },
        { new: true }
      ),
      User.findByIdAndUpdate(
        req.user._id,
        {
          $inc: {
            totalSolved: 1,
            correctSolved: isCorrect ? 1 : 0,
          },
          $set: {
            streakCount: nextStreak,
            lastActiveDate: now,
          },
        },
        { new: true }
      ),
      Attempt.create({
        user: req.user._id,
        quiz: quiz._id,
        isCorrect,
        createdAt: now,
      }),
    ]);

    invalidateLeaderboardCache();

    return res.status(200).json({
      isCorrect,
      correctIndex: quiz.correctIndex,
      explanation: quiz.explanation,
      attemptsCount: updatedQuiz.attemptsCount,
      correctCount: updatedQuiz.correctCount,
      userStats: {
        streakCount: updatedUser.streakCount,
        totalSolved: updatedUser.totalSolved,
        correctSolved: updatedUser.correctSolved,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function toggleLikeQuiz(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid quiz id' });
    }

    const quiz = await Quiz.findById(id).select('likes');
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const userIdStr = String(req.user._id);
    const alreadyLiked = quiz.likes.some((uid) => String(uid) === userIdStr);

    const updated = await Quiz.findByIdAndUpdate(
      id,
      alreadyLiked
        ? { $pull: { likes: req.user._id } }
        : { $addToSet: { likes: req.user._id } },
      { new: true }
    ).select('likes');

    invalidateLeaderboardCache();

    return res.status(200).json({
      liked: !alreadyLiked,
      likesCount: updated.likes.length,
    });
  } catch (error) {
    return next(error);
  }
}

export async function reportQuiz(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid quiz id' });
    }

    const quiz = await Quiz.findByIdAndUpdate(
      id,
      { $inc: { reportsCount: 1 } },
      { new: true }
    );

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    if (quiz.reportsCount >= 5 && !quiz.isHidden) {
      quiz.isHidden = true;
      await quiz.save();
      invalidateLeaderboardCache();
    }

    return res.status(200).json({
      reportsCount: quiz.reportsCount,
      isHidden: quiz.isHidden,
    });
  } catch (error) {
    return next(error);
  }
}
