import { computeQuestionHash } from './questionHash.js';

function extractId(value, fallback = 'unknown') {
  if (value == null) return fallback;
  if (typeof value === 'object' && value._id != null) {
    return String(value._id);
  }
  return String(value);
}

function getQuizHash(quiz) {
  if (quiz.questionHash) {
    return String(quiz.questionHash);
  }
  return computeQuestionHash(quiz.question || '').questionHash;
}

/**
 * Rotates quizzes within a single subject bucket across distinct creator IDs
 * in round-robin order so no single creator dominates consecutive slots.
 *
 * @param {Array<object>} quizzes
 * @returns {Array<object>}
 */
function rotateByCreator(quizzes) {
  const creatorBuckets = new Map();

  for (const quiz of quizzes) {
    const creatorKey = extractId(quiz.creator, 'anonymous');
    if (!creatorBuckets.has(creatorKey)) {
      creatorBuckets.set(creatorKey, []);
    }
    creatorBuckets.get(creatorKey).push(quiz);
  }

  const queues = Array.from(creatorBuckets.values()).map((items) => ({
    items,
    cursor: 0,
  }));

  const rotated = [];
  let remaining = quizzes.length;

  while (remaining > 0) {
    let progressed = false;
    for (const queue of queues) {
      if (queue.cursor < queue.items.length) {
        rotated.push(queue.items[queue.cursor]);
        queue.cursor += 1;
        remaining -= 1;
        progressed = true;
      }
    }
    if (!progressed) break;
  }

  return rotated;
}

/**
 * Builds a balanced, deduplicated, creator-rotated quiz feed.
 *
 * @param {object} params
 * @param {string|null} [params.examName] Optional exam filter (omit or pass 'ALL' for all active exams)
 * @param {Array<object>} [params.candidates] Candidate quiz documents/objects
 * @param {Iterable<string>} [params.seenQuestionHashes] Hashes already seen or answered by the user
 * @param {number} [params.limit=20] Maximum number of quizzes to return
 * @returns {Array<object>}
 */
export function buildFeed({
  examName = null,
  candidates = [],
  seenQuestionHashes = [],
  limit = 20,
} = {}) {
  const maxItems = Math.max(0, Number(limit) || 0);
  if (maxItems === 0 || !Array.isArray(candidates) || candidates.length === 0) {
    return [];
  }

  const normalizedExamFilter =
    typeof examName === 'string' &&
    examName.trim() !== '' &&
    examName.trim().toUpperCase() !== 'ALL'
      ? examName.trim().toLowerCase()
      : null;

  const excludedHashes = new Set(seenQuestionHashes || []);

  // 1. Filter eligible candidates and group by subject hashtag
  const subjectBuckets = new Map();

  for (const quiz of candidates) {
    if (!quiz || quiz.isHidden) continue;

    if (
      quiz.hashtag &&
      typeof quiz.hashtag === 'object' &&
      quiz.hashtag.isActive === false
    ) {
      continue;
    }

    if (normalizedExamFilter) {
      const quizExam = String(quiz.examName || '').trim().toLowerCase();
      if (quizExam !== normalizedExamFilter) continue;
    }

    const hash = getQuizHash(quiz);
    if (excludedHashes.has(hash)) continue;

    const subjectKey = extractId(
      quiz.hashtag,
      String(quiz.subjectName || 'general').trim().toLowerCase()
    );

    if (!subjectBuckets.has(subjectKey)) {
      subjectBuckets.set(subjectKey, []);
    }
    subjectBuckets.get(subjectKey).push(quiz);
  }

  if (subjectBuckets.size === 0) {
    return [];
  }

  // 2. Rotate across distinct creators inside each subject bucket
  const subjectQueues = Array.from(subjectBuckets.values()).map((quizzes) => ({
    items: rotateByCreator(quizzes),
    cursor: 0,
  }));

  // 3. Interleave across subjects (1 per subject per cycle) + global questionHash deduplication
  const feed = [];
  const emittedHashes = new Set(excludedHashes);

  while (feed.length < maxItems) {
    let addedInCycle = false;

    for (const queue of subjectQueues) {
      if (feed.length >= maxItems) break;

      while (queue.cursor < queue.items.length) {
        const candidate = queue.items[queue.cursor];
        queue.cursor += 1;

        const hash = getQuizHash(candidate);
        if (emittedHashes.has(hash)) {
          continue;
        }

        emittedHashes.add(hash);
        feed.push(candidate);
        addedInCycle = true;
        break;
      }
    }

    if (!addedInCycle) {
      break;
    }
  }

  return feed;
}

export default buildFeed;
