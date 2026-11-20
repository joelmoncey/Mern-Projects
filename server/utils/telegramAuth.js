import crypto from 'node:crypto';

/**
 * Validates Telegram Mini App initData using HMAC-SHA256 with the
 * WebAppData secret key derived from TELEGRAM_BOT_TOKEN.
 *
 * @param {string} initData Raw Telegram.WebApp.initData query string
 * @param {string} botToken Telegram bot token
 * @param {object} [options]
 * @param {number} [options.maxAgeSeconds=86400] Max age of auth_date in seconds (0 disables check)
 * @returns {{ telegramId: string, firstName: string, username: string, photoUrl: string, authDate: number | null }}
 */
export function validateTelegramInitData(
  initData,
  botToken,
  { maxAgeSeconds = 86400 } = {}
) {
  if (!initData || typeof initData !== 'string') {
    throw new Error('Missing Telegram initData');
  }
  if (!botToken || typeof botToken !== 'string') {
    throw new Error('TELEGRAM_BOT_TOKEN is not configured on the server');
  }

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash || !/^[a-f0-9]{64}$/i.test(hash)) {
    throw new Error('Invalid or missing Telegram initData hash');
  }

  const dataCheckString = Array.from(params.entries())
    .filter(([key]) => key !== 'hash')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  const computedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  const receivedBuf = Buffer.from(hash.toLowerCase(), 'hex');
  const computedBuf = Buffer.from(computedHash, 'hex');

  if (
    receivedBuf.length !== computedBuf.length ||
    !crypto.timingSafeEqual(receivedBuf, computedBuf)
  ) {
    throw new Error('Invalid Telegram initData signature');
  }

  const authDateRaw = params.get('auth_date');
  const authDate = authDateRaw ? Number(authDateRaw) : null;
  if (maxAgeSeconds > 0 && authDate) {
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (nowSeconds - authDate > maxAgeSeconds) {
      throw new Error('Telegram initData has expired');
    }
  }

  const userRaw = params.get('user');
  if (!userRaw) {
    throw new Error('Telegram initData does not contain user info');
  }

  let parsedUser;
  try {
    parsedUser = JSON.parse(userRaw);
  } catch {
    throw new Error('Malformed user JSON in Telegram initData');
  }

  if (!parsedUser?.id) {
    throw new Error('Telegram user payload is missing id');
  }

  return {
    telegramId: String(parsedUser.id),
    firstName: String(parsedUser.first_name || parsedUser.username || 'Aspirant').trim(),
    username: parsedUser.username ? String(parsedUser.username).trim() : '',
    photoUrl: parsedUser.photo_url ? String(parsedUser.photo_url).trim() : '',
    authDate,
  };
}
