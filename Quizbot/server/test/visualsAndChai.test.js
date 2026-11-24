import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeSvg,
  validateAndSanitizeVisual,
} from '../utils/quizVisuals.js';
import { computeQuestionHash } from '../utils/questionHash.js';
import { buildChaiInvoiceSpec } from '../controllers/paymentController.js';
import {
  BULK_QUIZ_TEMPLATE,
  parseBulkQuizzesText,
} from '../../client/src/lib/bulkQuizParser.js';

test('sanitizes dangerous script and event attributes out of inline SVG drawings', () => {
  const dirty =
    '<svg viewBox="0 0 100 100" onload="alert(1)"><script>evil()</script><circle cx="50" cy="50" r="30" onclick="hack()" fill="none"/></svg>';
  const clean = sanitizeSvg(dirty);
  assert.ok(clean.startsWith('<svg'));
  assert.ok(clean.endsWith('</svg>'));
  assert.equal(clean.includes('<script'), false);
  assert.equal(clean.includes('onload'), false);
  assert.equal(clean.includes('onclick'), false);
  assert.ok(clean.includes('<circle'));
});

test('validates BOX, TABLE, SVG, and HTTPS image visuals and rejects javascript: URLs', () => {
  const box = validateAndSanitizeVisual({
    visualType: 'box',
    visualData: '4 | 9 | 2\n3 | 5 | 7\n8 | 1 | ?',
  });
  assert.equal(box.error, undefined);
  assert.equal(box.visualType, 'box');

  const badImg = validateAndSanitizeVisual({
    visualType: 'image',
    visualData: 'javascript:alert(1)',
  });
  assert.ok(badImg.error);
});

test('computes distinct questionHash when identical prompts have different BOX puzzles', () => {
  const h1 = computeQuestionHash(
    'Find the missing number (?) in the box below:',
    '4 | 9 | 2\n3 | 5 | 7\n8 | 1 | ?'
  );
  const h2 = computeQuestionHash(
    'Find the missing number (?) in the box below:',
    '2 | 4 | 6\n1 | 3 | 5\n7 | 9 | ?'
  );
  assert.notEqual(h1.questionHash, h2.questionHash);
});

test('parses BULK_QUIZ_TEMPLATE (.txt) containing LaTeX Maths, BOX, SVG drawing, and TABLE cleanly', () => {
  const result = parseBulkQuizzesText(BULK_QUIZ_TEMPLATE);
  assert.equal(result.errors.length, 0);
  assert.equal(result.quizzes.length, 4);

  // 1. LaTeX Maths quiz
  assert.equal(result.quizzes[0].visualType, 'none');
  assert.ok(result.quizzes[0].question.includes('\\frac{1}{x}'));
  assert.equal(result.quizzes[0].correctIndex, 0);

  // 2. Missing-number BOX quiz
  assert.equal(result.quizzes[1].visualType, 'box');
  assert.ok(result.quizzes[1].visualData.includes('8 | 1 | ?'));

  // 3. Inline SVG Geometry Drawing quiz
  assert.equal(result.quizzes[2].visualType, 'svg');
  assert.ok(result.quizzes[2].visualData.startsWith('<svg'));
  assert.equal(result.quizzes[2].correctIndex, 1);

  // 4. Match-the-Following TABLE quiz
  assert.equal(result.quizzes[3].visualType, 'table');
  assert.ok(result.quizzes[3].visualData.includes('List-I (Site) | List-II (River)'));
});

test('calculates Buy Me a Chai invoice specs with 1 Star = ₹2 conversion', () => {
  const preset = buildChaiInvoiceSpec({ tierId: 'masala_chai' });
  assert.equal(preset.error, undefined);
  assert.equal(preset.stars, 25);
  assert.equal(preset.approxInr, 50);

  const custom = buildChaiInvoiceSpec({
    stars: 15,
    note: 'Love the SSC quizzes!',
  });
  assert.equal(custom.error, undefined);
  assert.equal(custom.stars, 15);
  assert.equal(custom.approxInr, 30);
  assert.equal(custom.note, 'Love the SSC quizzes!');

  const invalid = buildChaiInvoiceSpec({ stars: 0 });
  assert.ok(invalid.error);
});
