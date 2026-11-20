import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateFlagEscalation } from './escalation.js';

test('notifies creator when flagCount reaches 3 and does not escalate yet', () => {
  const res = evaluateFlagEscalation({
    flagCount: 3,
    needsCreatorEdit: false,
    escalatedToAdmin: false,
  });

  assert.equal(res.shouldNotifyCreator, true);
  assert.equal(res.shouldEscalateToAdmin, false);
});

test('escalates to admin when flagCount reaches 6 while still unedited', () => {
  const notifiedAt = new Date('2026-11-20T08:00:00Z');
  const now = new Date('2026-11-20T10:00:00Z');

  const res = evaluateFlagEscalation(
    {
      flagCount: 6,
      needsCreatorEdit: true,
      creatorNotifiedAt: notifiedAt,
      escalatedToAdmin: false,
      lastEditedAt: null,
    },
    { now }
  );

  assert.equal(res.shouldNotifyCreator, false);
  assert.equal(res.shouldEscalateToAdmin, true);
});

test('escalates to admin when needsCreatorEdit exceeds 24 hours unedited', () => {
  const notifiedAt = new Date('2026-11-19T09:00:00Z');
  const now = new Date('2026-11-20T10:00:00Z'); // 25 hours later

  const res = evaluateFlagEscalation(
    {
      flagCount: 3,
      needsCreatorEdit: true,
      creatorNotifiedAt: notifiedAt,
      escalatedToAdmin: false,
      lastEditedAt: null,
    },
    { now }
  );

  assert.equal(res.shouldNotifyCreator, false);
  assert.equal(res.shouldEscalateToAdmin, true);
});

test('does not escalate if creator edited after notification', () => {
  const notifiedAt = new Date('2026-11-19T09:00:00Z');
  const editedAt = new Date('2026-11-19T12:00:00Z');
  const now = new Date('2026-11-20T10:00:00Z');

  const res = evaluateFlagEscalation(
    {
      flagCount: 6,
      needsCreatorEdit: true,
      creatorNotifiedAt: notifiedAt,
      escalatedToAdmin: false,
      lastEditedAt: editedAt,
    },
    { now }
  );

  assert.equal(res.shouldEscalateToAdmin, false);
});
