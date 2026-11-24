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
 * Returns the UTC Date representing 00:00:00 of the current day in the configured
 * timezone offset (defaults to IST +05:30 = 330 minutes).
 *
 * @param {Date} [now=new Date()]
 * @param {number} [tzOffsetMinutes=330]
 * @returns {Date}
 */
export function getStartOfLocalDay(
  now = new Date(),
  tzOffsetMinutes = Number(process.env.FEED_TIMEZONE_OFFSET_MINUTES ?? 330)
) {
  const offsetMs = (Number.isFinite(tzOffsetMinutes) ? tzOffsetMinutes : 330) * 60_000;
  const shifted = new Date(now.getTime() + offsetMs);
  const localMidnightUtcMs = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate()
  );
  return new Date(localMidnightUtcMs - offsetMs);
}

function getCreatedAtMs(quiz) {
  if (!quiz?.createdAt) return 0;
  const ms = new Date(quiz.createdAt).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * Builds a balanced, deduplicated quiz feed.
 *
 * When `prioritizeNewest: true` is passed (default for the live Feed API):
 *  1. Strictly excludes all hashes in `seenQuestionHashes` (zero repeats on the same day).
 *  2. Deduplicates identical `questionHash` across creators/mock tests (keeping newest).
 *  3. Serves brand-new unseen questions FIRST, strictly newest-first (`createdAt` desc).
 *  4. Once fresh unseen questions are exhausted, serves previous-day questions from
 *     `earlierRepeatHashes` (attempted yesterday or earlier, never today) for spaced revision.
 *
 * @param {object} params
 * @param {string|null} [params.examName] Optional exam filter (omit or pass 'ALL' for all active exams)
 * @param {Array<object>} [params.candidates] Candidate quiz documents/objects
 * @param {Iterable<string>} [params.seenQuestionHashes] Hashes already seen or answered TODAY
 * @param {Iterable<string>} [params.earlierRepeatHashes] Hashes answered on PREVIOUS days (eligible after fresh questions)
 * @param {boolean} [params.prioritizeNewest=false] When true, serves newest unseen questions first, then previous-day repeats
 * @param {number} [params.limit=20] Maximum number of quizzes to return
 * @returns {Array<object>}
 */
export function buildFeed({
  examName = null,
  candidates = [],
  seenQuestionHashes = [],
  earlierRepeatHashes = [],
  prioritizeNewest = false,
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

  if (prioritizeNewest) {
    const earlierSet = new Set(earlierRepeatHashes || []);
    const sortedCandidates = [...candidates].sort(
      (a, b) => getCreatedAtMs(b) - getCreatedAtMs(a)
    );

    const emittedHashes = new Set(excludedHashes);
    const freshTier = [];
    const repeatTier = [];

    for (const quiz of sortedCandidates) {
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
      if (emittedHashes.has(hash)) continue;
      emittedHashes.add(hash);

      if (earlierSet.has(hash)) {
        repeatTier.push(quiz);
      } else {
        freshTier.push(quiz);
      }
    }

    return [...freshTier, ...repeatTier].slice(0, maxItems);
  }

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
