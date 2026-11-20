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
 *
 * @param {string} question
 * @returns {{ normalizedQuestion: string, questionHash: string }}
 */
export function computeQuestionHash(question) {
  const normalizedQuestion = normalizeQuestion(question);
  const questionHash = crypto
    .createHash('sha256')
    .update(normalizedQuestion, 'utf8')
    .digest('hex');

  return { normalizedQuestion, questionHash };
}
