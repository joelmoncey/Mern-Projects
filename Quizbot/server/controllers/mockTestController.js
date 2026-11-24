import mongoose from 'mongoose';
import MockTest from '../models/MockTest.js';
import MockAttempt from '../models/MockAttempt.js';
import Quiz from '../models/Quiz.js';
import Hashtag from '../models/Hashtag.js';
import Attempt from '../models/Attempt.js';
import { computeQuestionHash } from '../utils/questionHash.js';
import { validateAndSanitizeVisual } from '../utils/quizVisuals.js';
import {
  invalidateHashtagsCache,
  invalidateLeaderboardCache,
} from '../utils/cache.js';

function getUtcDayStart(date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/**
 * Pure validator for an individual question item inside a Mock Test upload.
 */
export function validateMockQuestionItem(rawItem = {}) {
  const {
    question,
    options,
    correctIndex,
    explanation = '',
    visualType = 'none',
    visualData = '',
  } = rawItem;

  if (!question || typeof question !== 'string' || !question.trim()) {
    return { error: 'Question text is required' };
  }
  if (question.trim().length > 600) {
    return { error: 'Question must be 600 characters or fewer' };
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
  if (trimmedExplanation.length > 800) {
    return { error: 'Explanation must be 800 characters or fewer' };
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

/**
 * Pure scorer for a submitted mock test attempt.
 */
export function scoreMockSubmission({
  orderedQuizzes,
  submittedAnswers = [],
  negativeMarking = 0,
}) {
  const answerMap = new Map();
  for (const entry of Array.isArray(submittedAnswers) ? submittedAnswers : []) {
    if (!entry || !entry.quizId) continue;
    const idx = Number(entry.selectedIndex);
    if (Number.isInteger(idx) && idx >= 0 && idx <= 3) {
      answerMap.set(String(entry.quizId), idx);
    }
  }

  const neg = Math.max(0, Math.min(1, Number(negativeMarking) || 0));
  let correctCount = 0;
  let wrongCount = 0;
  let skippedCount = 0;

  const gradedAnswers = [];
  const review = [];

  for (const quiz of orderedQuizzes) {
    const qId = String(quiz._id);
    const hasAnswer = answerMap.has(qId);
    const selectedIndex = hasAnswer ? answerMap.get(qId) : -1;
    const isCorrect = hasAnswer && selectedIndex === quiz.correctIndex;

    if (!hasAnswer) {
      skippedCount += 1;
    } else if (isCorrect) {
      correctCount += 1;
    } else {
      wrongCount += 1;
    }

    gradedAnswers.push({
      quiz: quiz._id,
      selectedIndex,
      isCorrect,
    });

    review.push({
      _id: quiz._id,
      question: quiz.question,
      visualType: quiz.visualType || 'none',
      visualData: quiz.visualData || '',
      options: quiz.options,
      selectedIndex,
      correctIndex: quiz.correctIndex,
      isCorrect,
      isSkipped: !hasAnswer,
      explanation: quiz.explanation || '',
      questionHash: quiz.questionHash,
    });
  }

  const totalQuestions = orderedQuizzes.length;
  const attemptedCount = correctCount + wrongCount;
  const rawScore = correctCount - wrongCount * neg;
  const score = Math.round(rawScore * 100) / 100;
  const maxScore = totalQuestions;
  const accuracyPercent =
    attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0;
  const scorePercent =
    maxScore > 0 ? Math.round((Math.max(0, score) / maxScore) * 100) : 0;

  return {
    gradedAnswers,
    review,
    totalQuestions,
    correctCount,
    wrongCount,
    skippedCount,
    score,
    maxScore,
    accuracyPercent,
    scorePercent,
  };
}

/**
 * POST /api/mock-tests
 * Creates a timed Mock Test under an official Exam Tag from a bulk .txt upload.
 * - Multiple mock tests are allowed under the same Exam Tag.
 * - The same creator CAN include the same question across different Mock Tests:
 *   existing Quiz documents matching (creator + examName + language + questionHash)
 *   are reused automatically, while brand-new questions are inserted into `Quiz`
 *   so every Mock Test question also flows into the main Quiz Feed without duplicates!
 */
export async function createMockTest(req, res, next) {
  try {
    if (req.user.role !== 'admin' && !req.user.canCreateQuiz) {
      return res.status(403).json({
        error:
          'Only admin-approved creators can publish mock tests. Contact the admin for creator access.',
      });
    }

    const {
      hashtagId,
      hashtag,
      language,
      title,
      description = '',
      durationMinutes = 15,
      negativeMarking = 0,
      quizzes,
    } = req.body || {};

    const cleanTitle = String(title || '').trim();
    if (!cleanTitle || cleanTitle.length < 3) {
      return res.status(400).json({
        error: 'Mock test title is required (at least 3 characters)',
      });
    }
    if (cleanTitle.length > 120) {
      return res
        .status(400)
        .json({ error: 'Mock test title must be 120 characters or fewer' });
    }

    const parsedDuration = Number(durationMinutes);
    if (
      !Number.isInteger(parsedDuration) ||
      parsedDuration < 1 ||
      parsedDuration > 240
    ) {
      return res.status(400).json({
        error: 'Timer duration must be a whole number between 1 and 240 minutes',
      });
    }

    const parsedNegative = Number(negativeMarking) || 0;
    if (Number.isNaN(parsedNegative) || parsedNegative < 0 || parsedNegative > 1) {
      return res
        .status(400)
        .json({ error: 'Negative marking must be between 0 and 1' });
    }

    const hashtagRef = hashtagId || hashtag;
    if (!hashtagRef) {
      return res
        .status(400)
        .json({ error: 'An active exam topic tag is required' });
    }

    if (!Array.isArray(quizzes) || quizzes.length === 0) {
      return res
        .status(400)
        .json({ error: 'Upload or paste at least 1 valid question for the mock test' });
    }
    if (quizzes.length > 200) {
      return res
        .status(400)
        .json({ error: 'Each mock test supports up to 200 questions' });
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
        .json({ error: 'Selected exam tag is invalid or inactive' });
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

    // Validate all questions and deduplicate identical questions *within this single mock test*
    const validCandidates = [];
    const validationErrors = [];
    const seenInThisMock = new Set();

    quizzes.forEach((rawItem, idx) => {
      const validated = validateMockQuestionItem(rawItem || {});
      if (validated.error) {
        validationErrors.push(`Question #${idx + 1}: ${validated.error}`);
        return;
      }
      if (seenInThisMock.has(validated.questionHash)) {
        return;
      }
      seenInThisMock.add(validated.questionHash);
      validCandidates.push(validated);
    });

    if (validCandidates.length === 0) {
      return res.status(400).json({
        error:
          validationErrors[0] || 'No valid questions found in the mock test file',
        validationErrors,
      });
    }

    const docSubExams =
      Array.isArray(hashtagDoc.subExams) && hashtagDoc.subExams.length > 0
        ? hashtagDoc.subExams
        : (hashtagDoc.subExamName || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);

    // Find which questionHashes already exist in `Quiz` for this creator + exam + language
    const existingQuizzes = await Quiz.find({
      creator: req.user._id,
      examName: hashtagDoc.examName,
      language: matchedLang,
      questionHash: { $in: validCandidates.map((c) => c.questionHash) },
    })
      .select('_id questionHash')
      .lean();

    const existingByHash = new Map(
      existingQuizzes.map((q) => [q.questionHash, q._id])
    );

    const newQuizDocs = [];
    for (const c of validCandidates) {
      if (!existingByHash.has(c.questionHash)) {
        newQuizDocs.push({
          creator: req.user._id,
          hashtag: hashtagDoc._id,
          examName: hashtagDoc.examName,
          subExams: docSubExams,
          subExamName: docSubExams.join(', '),
          language: matchedLang,
          subjectName: hashtagDoc.subjectName,
          subSubjectName: hashtagDoc.subSubjectName || '',
          subTopicName: hashtagDoc.subTopicName || '',
          question: c.question,
          visualType: c.visualType,
          visualData: c.visualData,
          normalizedQuestion: c.normalizedQuestion,
          questionHash: c.questionHash,
          options: c.options,
          correctIndex: c.correctIndex,
          explanation: c.explanation,
        });
      }
    }

    let createdQuizCount = 0;
    if (newQuizDocs.length > 0) {
      const inserted = await Quiz.insertMany(newQuizDocs, { ordered: false });
      createdQuizCount = inserted.length;
      for (const doc of inserted) {
        existingByHash.set(doc.questionHash, doc._id);
      }

      await Hashtag.updateOne(
        { _id: hashtagDoc._id },
        { $inc: { quizCount: createdQuizCount } }
      );
      invalidateHashtagsCache();
      invalidateLeaderboardCache();
    }

    const orderedRefs = validCandidates
      .map((c) => {
        const qId = existingByHash.get(c.questionHash);
        return qId ? { quiz: qId, questionHash: c.questionHash } : null;
      })
      .filter(Boolean);

    const reusedQuizCount = orderedRefs.length - createdQuizCount;

    const mockTest = await MockTest.create({
      creator: req.user._id,
      hashtag: hashtagDoc._id,
      examName: hashtagDoc.examName,
      subExams: docSubExams,
      subExamName: docSubExams.join(', '),
      language: matchedLang,
      subjectName: hashtagDoc.subjectName,
      subSubjectName: hashtagDoc.subSubjectName || '',
      subTopicName: hashtagDoc.subTopicName || '',
      title: cleanTitle,
      description: String(description || '').trim().slice(0, 300),
      durationMinutes: parsedDuration,
      negativeMarking: parsedNegative,
      questions: orderedRefs,
      questionCount: orderedRefs.length,
      isActive: true,
    });

    await mockTest.populate([
      { path: 'creator', select: 'firstName username photoUrl isSupporter' },
      {
        path: 'hashtag',
        select:
          'examName subExams subExamName languages subjectName subSubjectName subTopicName tag customTag',
      },
    ]);

    return res.status(201).json({
      mockTest,
      questionCount: orderedRefs.length,
      newFeedQuizzesCount: createdQuizCount,
      reusedQuestionsCount: reusedQuizCount,
      validationErrors,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/mock-tests
 * Lists active Mock Tests filtered by Exam, Sub-Exams, Language, Subject, Sub-Subject, Sub-Topic, Hashtag, or Creator.
 */
export async function listMockTests(req, res, next) {
  try {
    const {
      examName,
      subExams,
      subExamName,
      language,
      subjectName,
      subSubjectName,
      subTopicName,
      hashtag,
      creatorId,
    } = req.query;

    const query = { isActive: true };

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
        query.$and = [
          ...(query.$and || []),
          {
            $or: [
              { subExams: { $in: selectedSubExamList } },
              { subExams: { $size: 0 } },
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
        query.language = {
          $in: langList.map(
            (l) =>
              new RegExp(`^${l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
          ),
        };
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
    if (typeof hashtag === 'string' && mongoose.isValidObjectId(hashtag.trim())) {
      query.hashtag = hashtag.trim();
    }
    if (typeof creatorId === 'string' && mongoose.isValidObjectId(creatorId.trim())) {
      query.creator = creatorId.trim();
    }

    const tests = await MockTest.find(query)
      .sort({ createdAt: -1 })
      .limit(60)
      .select('-questions')
      .populate('creator', 'firstName username photoUrl isSupporter')
      .populate(
        'hashtag',
        'examName subExams subExamName languages subjectName subSubjectName subTopicName tag'
      )
      .lean();

    // Annotate with the current user's best & latest attempt for each mock test
    const userBestByMockId = new Map();
    if (req.user && tests.length > 0) {
      const myAttempts = await MockAttempt.find({
        user: req.user._id,
        mockTest: { $in: tests.map((t) => t._id) },
      })
        .sort({ submittedAt: -1 })
        .select('mockTest score maxScore scorePercent accuracyPercent submittedAt')
        .lean();

      for (const att of myAttempts) {
        const key = String(att.mockTest);
        const existing = userBestByMockId.get(key);
        if (!existing || att.score > existing.bestScore) {
          userBestByMockId.set(key, {
            bestScore: att.score,
            maxScore: att.maxScore,
            bestScorePercent: att.scorePercent,
            lastSubmittedAt: existing?.lastSubmittedAt || att.submittedAt,
            attemptsByMe: (existing?.attemptsByMe || 0) + 1,
          });
        } else {
          existing.attemptsByMe += 1;
        }
      }
    }

    const currentUserId = req.user ? String(req.user._id) : null;
    const isAdmin = req.user?.role === 'admin';

    const serialized = tests.map((t) => {
      const avgScorePercent =
        t.attemptsCount > 0
          ? Math.round((t.totalScorePercentSum || 0) / t.attemptsCount)
          : null;
      const cid = t.creator?._id ? String(t.creator._id) : String(t.creator);
      return {
        ...t,
        avgScorePercent,
        myStats: userBestByMockId.get(String(t._id)) || null,
        canManage: Boolean(isAdmin || (currentUserId && cid === currentUserId)),
      };
    });

    return res.status(200).json({ mockTests: serialized });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/mock-tests/:id
 * Returns a Mock Test with ordered questions (WITHOUT correctIndex/explanation)
 * so the user can attend it cleanly with a countdown timer.
 */
export async function getMockTestForAttempt(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid mock test id' });
    }

    const mockTest = await MockTest.findOne({ _id: id, isActive: true })
      .populate('creator', 'firstName username photoUrl isSupporter')
      .populate(
        'hashtag',
        'examName subExams subExamName languages subjectName subSubjectName subTopicName tag'
      )
      .lean();

    if (!mockTest) {
      return res.status(404).json({ error: 'Mock test not found' });
    }

    const quizIds = (mockTest.questions || []).map((q) => q.quiz);
    const quizDocs = await Quiz.find({ _id: { $in: quizIds } })
      .select('_id question visualType visualData options questionHash')
      .lean();

    const quizMap = new Map(quizDocs.map((q) => [String(q._id), q]));

    const orderedQuestions = (mockTest.questions || [])
      .map((ref) => quizMap.get(String(ref.quiz)))
      .filter(Boolean)
      .map((q, index) => ({
        index: index + 1,
        _id: q._id,
        question: q.question,
        visualType: q.visualType || 'none',
        visualData: q.visualData || '',
        options: q.options,
        questionHash: q.questionHash,
      }));

    return res.status(200).json({
      mockTest: {
        _id: mockTest._id,
        title: mockTest.title,
        description: mockTest.description,
        examName: mockTest.examName,
        subExams: mockTest.subExams || [],
        language: mockTest.language,
        subjectName: mockTest.subjectName,
        subSubjectName: mockTest.subSubjectName,
        subTopicName: mockTest.subTopicName,
        durationMinutes: mockTest.durationMinutes,
        negativeMarking: mockTest.negativeMarking || 0,
        questionCount: orderedQuestions.length,
        attemptsCount: mockTest.attemptsCount || 0,
        creator: mockTest.creator,
        hashtag: mockTest.hashtag,
        createdAt: mockTest.createdAt,
      },
      questions: orderedQuestions,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/mock-tests/:id/submit
 * Grades a timed mock test submission, records MockAttempt + individual Attempts
 * (keeping streak, leaderboard, and same-day feed anti-repeat synced), and returns
 * the full Scorecard + Solution Review.
 */
export async function submitMockTest(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid mock test id' });
    }

    const { answers = [], timeSpentSeconds = 0 } = req.body || {};

    const mockTest = await MockTest.findOne({ _id: id, isActive: true });
    if (!mockTest) {
      return res.status(404).json({ error: 'Mock test not found' });
    }

    const quizIds = (mockTest.questions || []).map((q) => q.quiz);
    const quizDocs = await Quiz.find({ _id: { $in: quizIds } }).lean();
    const quizMap = new Map(quizDocs.map((q) => [String(q._id), q]));

    const orderedQuizzes = (mockTest.questions || [])
      .map((ref) => quizMap.get(String(ref.quiz)))
      .filter(Boolean);

    if (orderedQuizzes.length === 0) {
      return res
        .status(400)
        .json({ error: 'This mock test currently has no available questions' });
    }

    const graded = scoreMockSubmission({
      orderedQuizzes,
      submittedAnswers: answers,
      negativeMarking: mockTest.negativeMarking || 0,
    });

    const maxAllowedSeconds = (mockTest.durationMinutes || 15) * 60 + 60;
    const cleanTimeSpent = Math.max(
      0,
      Math.min(maxAllowedSeconds, Math.round(Number(timeSpentSeconds) || 0))
    );

    const mockAttempt = await MockAttempt.create({
      mockTest: mockTest._id,
      user: req.user._id,
      answers: graded.gradedAnswers,
      totalQuestions: graded.totalQuestions,
      correctCount: graded.correctCount,
      wrongCount: graded.wrongCount,
      skippedCount: graded.skippedCount,
      score: graded.score,
      maxScore: graded.maxScore,
      accuracyPercent: graded.accuracyPercent,
      scorePercent: graded.scorePercent,
      timeSpentSeconds: cleanTimeSpent,
      submittedAt: new Date(),
    });

    // Update MockTest aggregate stats
    mockTest.attemptsCount = (mockTest.attemptsCount || 0) + 1;
    mockTest.totalScorePercentSum =
      (mockTest.totalScorePercentSum || 0) + graded.scorePercent;
    await mockTest.save();

    // Sync individual answered questions to Attempt, Quiz counts, and User stats/streak
    const answeredEntries = graded.gradedAnswers.filter(
      (a) => a.selectedIndex >= 0
    );

    if (answeredEntries.length > 0) {
      const now = new Date();
      const attemptDocs = answeredEntries.map((a) => ({
        user: req.user._id,
        quiz: a.quiz,
        isCorrect: a.isCorrect,
        createdAt: now,
      }));

      const quizBulkOps = answeredEntries.map((a) => ({
        updateOne: {
          filter: { _id: a.quiz },
          update: {
            $inc: {
              attemptsCount: 1,
              correctCount: a.isCorrect ? 1 : 0,
            },
          },
        },
      }));

      // Update user daily streak
      const todayStart = getUtcDayStart(now);
      const lastActive = req.user.lastActiveDate
        ? new Date(req.user.lastActiveDate)
        : null;
      let nextStreak = req.user.streakCount || 0;
      if (!lastActive) {
        nextStreak = 1;
      } else {
        const diffDays = Math.round(
          (todayStart - getUtcDayStart(lastActive)) / 86_400_000
        );
        if (diffDays === 1) nextStreak += 1;
        else if (diffDays > 1) nextStreak = 1;
        else if (nextStreak === 0) nextStreak = 1;
      }

      req.user.totalSolved = (req.user.totalSolved || 0) + answeredEntries.length;
      req.user.correctSolved = (req.user.correctSolved || 0) + graded.correctCount;
      req.user.streakCount = nextStreak;
      req.user.lastActiveDate = now;

      await Promise.all([
        Attempt.insertMany(attemptDocs, { ordered: false }).catch(() => {}),
        Quiz.bulkWrite(quizBulkOps, { ordered: false }).catch(() => {}),
        req.user.save(),
      ]);

      invalidateLeaderboardCache();
    }

    return res.status(200).json({
      attemptId: mockAttempt._id,
      summary: {
        totalQuestions: graded.totalQuestions,
        correctCount: graded.correctCount,
        wrongCount: graded.wrongCount,
        skippedCount: graded.skippedCount,
        score: graded.score,
        maxScore: graded.maxScore,
        negativeMarking: mockTest.negativeMarking || 0,
        accuracyPercent: graded.accuracyPercent,
        scorePercent: graded.scorePercent,
        timeSpentSeconds: cleanTimeSpent,
      },
      review: graded.review,
      seenQuestionHashes: orderedQuizzes.map((q) => q.questionHash),
      userStats: {
        totalSolved: req.user.totalSolved,
        correctSolved: req.user.correctSolved,
        streakCount: req.user.streakCount,
      },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * DELETE /api/mock-tests/:id
 * Deletes a Mock Test (creator or admin). Shared Quiz feed questions remain intact.
 */
export async function deleteMockTest(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid mock test id' });
    }

    const mockTest = await MockTest.findById(id);
    if (!mockTest) {
      return res.status(404).json({ error: 'Mock test not found' });
    }

    const isCreator = String(mockTest.creator) === String(req.user._id);
    const isAdmin = req.user.role === 'admin';
    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        error: 'Only the mock test creator or an admin can delete this mock test',
      });
    }

    await Promise.all([
      MockTest.deleteOne({ _id: mockTest._id }),
      MockAttempt.deleteMany({ mockTest: mockTest._id }),
    ]);

    return res.status(200).json({ deleted: true, _id: mockTest._id });
  } catch (error) {
    return next(error);
  }
}
