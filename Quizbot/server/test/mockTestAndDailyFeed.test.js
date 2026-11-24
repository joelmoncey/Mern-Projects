import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFeed, getStartOfLocalDay } from '../utils/feedBuilder.js';
import { computeQuestionHash } from '../utils/questionHash.js';
import {
  scoreMockSubmission,
  validateMockQuestionItem,
} from '../controllers/mockTestController.js';

function makeDatedQuiz({ id, question, createdAt, examName = 'SSC' }) {
  const { normalizedQuestion, questionHash } = computeQuestionHash(question);
  return {
    _id: id,
    creator: 'creator1',
    hashtag: 'SSC_TAG',
    examName,
    subjectName: 'Quantitative Aptitude',
    question,
    normalizedQuestion,
    questionHash,
    isHidden: false,
    createdAt: new Date(createdAt),
  };
}

test('prioritizeNewest loads newest unseen questions first, blocks today repeats, and appends previous-day repeats after fresh questions', () => {
  const qOldYesterday = makeDatedQuiz({
    id: 'q1',
    question: 'Old question attempted yesterday?',
    createdAt: '2026-11-20T10:00:00Z',
  });
  const qSeenToday = makeDatedQuiz({
    id: 'q2',
    question: 'Question already scrolled today?',
    createdAt: '2026-11-24T09:00:00Z',
  });
  const qFreshOlder = makeDatedQuiz({
    id: 'q3',
    question: 'Fresh unseen question from 2 days ago?',
    createdAt: '2026-11-22T10:00:00Z',
  });
  const qFreshNewest = makeDatedQuiz({
    id: 'q4',
    question: 'Brand new mock test question added 5 mins ago?',
    createdAt: '2026-11-24T12:00:00Z',
  });
  const qFreshNewestDup = makeDatedQuiz({
    id: 'q4_dup',
    question: '  brand new mock test question added 5 mins ago?! ',
    createdAt: '2026-11-24T11:55:00Z',
  });

  const feed = buildFeed({
    examName: 'SSC',
    candidates: [
      qOldYesterday,
      qSeenToday,
      qFreshOlder,
      qFreshNewest,
      qFreshNewestDup,
    ],
    seenQuestionHashes: [qSeenToday.questionHash], // seen TODAY -> strictly blocked
    earlierRepeatHashes: [qOldYesterday.questionHash], // attempted YESTERDAY -> eligible after fresh
    prioritizeNewest: true,
    limit: 10,
  });

  // Expected exact order:
  // 1. qFreshNewest (newest unseen)
  // 2. qFreshOlder (next newest unseen)
  // 3. qOldYesterday (previous-day repeat shown AFTER all fresh questions)
  // Excluded: qSeenToday (same-day no-repeat) and qFreshNewestDup (duplicate hash)
  assert.deepEqual(
    feed.map((q) => q._id),
    ['q4', 'q3', 'q1']
  );
});

test('getStartOfLocalDay computes IST (+05:30) midnight boundary accurately', () => {
  // 2026-11-24 02:00 IST is 2026-11-23 20:30 UTC -> IST midnight is 2026-11-23 18:30:00 UTC
  const sampleNow = new Date('2026-11-23T20:30:00Z');
  const startOfDay = getStartOfLocalDay(sampleNow, 330);
  assert.equal(startOfDay.toISOString(), '2026-11-23T18:30:00.000Z');
});

test('scoreMockSubmission computes correct, wrong, skipped, accuracy, and negative marking accurately', () => {
  const orderedQuizzes = [
    {
      _id: 'm1',
      question: 'Q1?',
      options: ['A', 'B', 'C', 'D'],
      correctIndex: 1,
      explanation: 'B is right',
      questionHash: 'h1',
    },
    {
      _id: 'm2',
      question: 'Q2?',
      options: ['A', 'B', 'C', 'D'],
      correctIndex: 2,
      explanation: 'C is right',
      questionHash: 'h2',
    },
    {
      _id: 'm3',
      question: 'Q3?',
      options: ['A', 'B', 'C', 'D'],
      correctIndex: 0,
      explanation: 'A is right',
      questionHash: 'h3',
    },
    {
      _id: 'm4',
      question: 'Q4?',
      options: ['A', 'B', 'C', 'D'],
      correctIndex: 3,
      explanation: 'D is right',
      questionHash: 'h4',
    },
  ];

  const graded = scoreMockSubmission({
    orderedQuizzes,
    submittedAnswers: [
      { quizId: 'm1', selectedIndex: 1 }, // right (+1)
      { quizId: 'm2', selectedIndex: 2 }, // right (+1)
      { quizId: 'm3', selectedIndex: 1 }, // wrong (-0.25)
      // m4 skipped (0)
    ],
    negativeMarking: 0.25,
  });

  assert.equal(graded.totalQuestions, 4);
  assert.equal(graded.correctCount, 2);
  assert.equal(graded.wrongCount, 1);
  assert.equal(graded.skippedCount, 1);
  assert.equal(graded.score, 1.75);
  assert.equal(graded.accuracyPercent, 67); // 2/3 attempted
  assert.equal(graded.review.length, 4);
  assert.equal(graded.review[3].isSkipped, true);
});

test('validateMockQuestionItem accepts rich Maths + BOX questions', () => {
  const valid = validateMockQuestionItem({
    question: 'Find the missing value $x$ in the box:',
    visualType: 'box',
    visualData: '4 | 9 | 2\n3 | 5 | 7\n8 | 1 | ?',
    options: ['6', '9', '4', '5'],
    correctIndex: 0,
    explanation: 'Row sum is $15$.',
  });
  assert.equal(valid.error, undefined);
  assert.equal(valid.visualType, 'box');
  assert.ok(valid.questionHash);
});
