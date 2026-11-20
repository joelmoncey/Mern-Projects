import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFeed } from './feedBuilder.js';
import { computeQuestionHash } from './questionHash.js';

function makeQuiz({
  id,
  creator,
  hashtag,
  examName = 'UPSC',
  subjectName,
  question,
  isHidden = false,
}) {
  const { normalizedQuestion, questionHash } = computeQuestionHash(question);
  return {
    _id: id,
    creator,
    hashtag,
    examName,
    subjectName,
    question,
    normalizedQuestion,
    questionHash,
    isHidden,
  };
}

test('interleaves subjects in round-robin order and rotates creators within each subject', () => {
  const candidates = [
    makeQuiz({ id: 'h1', creator: 'c1', hashtag: 'UPSC_HISTORY', subjectName: 'History', question: 'History Q1?' }),
    makeQuiz({ id: 'h2', creator: 'c1', hashtag: 'UPSC_HISTORY', subjectName: 'History', question: 'History Q2?' }),
    makeQuiz({ id: 'h3', creator: 'c2', hashtag: 'UPSC_HISTORY', subjectName: 'History', question: 'History Q3?' }),
    makeQuiz({ id: 'p1', creator: 'c3', hashtag: 'UPSC_POLITY', subjectName: 'Polity', question: 'Polity Q1?' }),
    makeQuiz({ id: 'p2', creator: 'c3', hashtag: 'UPSC_POLITY', subjectName: 'Polity', question: 'Polity Q2?' }),
    makeQuiz({ id: 'p3', creator: 'c4', hashtag: 'UPSC_POLITY', subjectName: 'Polity', question: 'Polity Q3?' }),
  ];

  const feed = buildFeed({
    examName: 'UPSC',
    candidates,
    seenQuestionHashes: [],
    limit: 6,
  });

  assert.equal(feed.length, 6);
  // Equal subject interleaving: History, Polity, History, Polity, History, Polity
  assert.deepEqual(
    feed.map((q) => q.hashtag),
    [
      'UPSC_HISTORY',
      'UPSC_POLITY',
      'UPSC_HISTORY',
      'UPSC_POLITY',
      'UPSC_HISTORY',
      'UPSC_POLITY',
    ]
  );
  // Creator rotation inside History: c1 -> c2 -> c1
  const historyCreators = feed
    .filter((q) => q.hashtag === 'UPSC_HISTORY')
    .map((q) => q.creator);
  assert.deepEqual(historyCreators, ['c1', 'c2', 'c1']);
});

test('deduplicates identical questionHash across different creators and skips seen hashes', () => {
  const qDupA = makeQuiz({
    id: 'q1',
    creator: 'c1',
    hashtag: 'UPSC_HISTORY',
    subjectName: 'History',
    question: 'Who founded the Maurya Empire?',
  });
  const qDupB = makeQuiz({
    id: 'q2',
    creator: 'c2',
    hashtag: 'UPSC_HISTORY',
    subjectName: 'History',
    question: '  who founded the maurya empire?! ',
  });
  const qSeen = makeQuiz({
    id: 'q3',
    creator: 'c3',
    hashtag: 'UPSC_POLITY',
    subjectName: 'Polity',
    question: 'Which article abolishes untouchability?',
  });
  const qHidden = makeQuiz({
    id: 'q4',
    creator: 'c4',
    hashtag: 'UPSC_POLITY',
    subjectName: 'Polity',
    question: 'Hidden question',
    isHidden: true,
  });
  const qOtherExam = makeQuiz({
    id: 'q5',
    creator: 'c5',
    hashtag: 'GATE_CS',
    examName: 'GATE',
    subjectName: 'CS',
    question: 'What is the time complexity of binary search?',
  });

  assert.equal(qDupA.questionHash, qDupB.questionHash);

  const feed = buildFeed({
    examName: 'UPSC',
    candidates: [qDupA, qDupB, qSeen, qHidden, qOtherExam],
    seenQuestionHashes: new Set([qSeen.questionHash]),
    limit: 10,
  });

  assert.equal(feed.length, 1);
  assert.equal(feed[0]._id, 'q1');
});
