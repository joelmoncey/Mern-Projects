import crypto from 'node:crypto';

/**
 * Normalizes a quiz question string for deterministic deduplication:
 * trims surrounding whitespace, lowercases, strips punctuation, and
 * collapses internal whitespace into single spaces.
 *
 * @param {string} question
 * @returns {string}
 */
export function normalizeQuestion(question) {
  if (typeof question !== 'string') {
    return '';
  }

  return question
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Computes the SHA-256 hex digest of a normalized question string.
 * When visualData (box/table/svg/image) is attached, includes a normalized
 * visual fingerprint so distinct puzzles sharing the same prompt text
 * (e.g. "Find the missing number (?)") do not collide as duplicates.
 *
 * @param {string} question
 * @param {string} [visualData='']
 * @returns {{ normalizedQuestion: string, questionHash: string }}
 */
export function computeQuestionHash(question, visualData = '') {
  const normalizedQuestion = normalizeQuestion(question);
  const normalizedVisual =
    typeof visualData === 'string'
      ? visualData.trim().replace(/\s+/g, ' ')
      : '';
  const hashInput = normalizedVisual
    ? `${normalizedQuestion}::${normalizedVisual}`
    : normalizedQuestion;
  const questionHash = crypto
    .createHash('sha256')
    .update(hashInput, 'utf8')
    .digest('hex');

  return { normalizedQuestion, questionHash };
}
