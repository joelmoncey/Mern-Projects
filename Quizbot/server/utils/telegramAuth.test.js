import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { validateTelegramInitData } from './telegramAuth.js';

function signInitData(fields, botToken) {
  const params = new URLSearchParams(fields);
  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  const hash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  params.set('hash', hash);
  return params.toString();
}

test('validates properly signed Telegram initData', () => {
  const botToken = '123456:TEST-BOT-TOKEN';
  const now = Math.floor(Date.now() / 1000);
  const initData = signInitData(
    {
      auth_date: String(now),
      query_id: 'AAHdF6IQAAAAAN0XohDhrOrc',
      user: JSON.stringify({
        id: 987654321,
        first_name: 'Aarav',
        username: 'aarav_upsc',
        photo_url: 'https://t.me/i/userpic/320/aarav.jpg',
      }),
    },
    botToken
  );

  const result = validateTelegramInitData(initData, botToken);
  assert.equal(result.telegramId, '987654321');
  assert.equal(result.firstName, 'Aarav');
  assert.equal(result.username, 'aarav_upsc');
  assert.equal(result.photoUrl, 'https://t.me/i/userpic/320/aarav.jpg');
});

test('rejects tampered Telegram initData signature', () => {
  const botToken = '123456:TEST-BOT-TOKEN';
  const now = Math.floor(Date.now() / 1000);
  const initData = signInitData(
    {
      auth_date: String(now),
      user: JSON.stringify({ id: 111, first_name: 'Real' }),
    },
    botToken
  );

  const tampered = initData.replace('Real', 'Fake');
  assert.throws(
    () => validateTelegramInitData(tampered, botToken),
    /Invalid Telegram initData signature/
  );
});

test('rejects initData signed with wrong bot token', () => {
  const now = Math.floor(Date.now() / 1000);
  const initData = signInitData(
    {
      auth_date: String(now),
      user: JSON.stringify({ id: 222, first_name: 'Maya' }),
    },
    'wrong-token'
  );

  assert.throws(
    () => validateTelegramInitData(initData, 'correct-token'),
    /Invalid Telegram initData signature/
  );
});
