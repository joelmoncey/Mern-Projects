import {
  init,
  miniApp,
  viewport,
  retrieveRawInitData,
  openTelegramLink,
  invoice,
} from '@telegram-apps/sdk-react';

/**
 * Initializes the Telegram Mini App SDK (ready + expand + crisp light theme header/bg sync).
 * Falls back gracefully when opened in a regular browser during local dev.
 */
export function initTelegramApp() {
  try {
    if (window?.Telegram?.WebApp) {
      try {
        window.Telegram.WebApp.ready?.();
        window.Telegram.WebApp.expand?.();
      } catch {
        // Ignore
      }
    }

    init();

    if (miniApp.mount.isAvailable()) {
      miniApp.mount();
      if (miniApp.setHeaderColor.isAvailable()) {
        miniApp.setHeaderColor('#ffffff');
      }
      if (miniApp.setBackgroundColor.isAvailable()) {
        miniApp.setBackgroundColor('#f8fafc');
      }
      if (miniApp.ready.isAvailable()) {
        miniApp.ready();
      }
    }

    if (viewport.mount.isAvailable()) {
      viewport
        .mount()
        .then(() => {
          if (viewport.expand.isAvailable()) {
            viewport.expand();
          }
        })
        .catch(() => {});
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Safely reads Telegram Mini App raw initData if available.
 */
export function getTelegramInitData() {
  try {
    const raw = retrieveRawInitData();
    if (raw && typeof raw === 'string' && raw.length > 0) {
      return raw;
    }
  } catch {
    // Fallback below
  }

  try {
    const webAppData = window?.Telegram?.WebApp?.initData;
    if (webAppData && typeof webAppData === 'string' && webAppData.length > 0) {
      return webAppData;
    }
  } catch {
    // Ignore
  }

  return null;
}

/**
 * Extracts a deep-linked quiz ID when the Mini App is opened from a shared
 * Telegram link (e.g. ?startapp=quiz_<id>, initDataUnsafe.start_param, or ?quiz=<id>).
 *
 * @returns {string | null}
 */
export function getDeepLinkedQuizId() {
  try {
    const searchParams = new URLSearchParams(window.location.search);

    const rawStartParam =
      window?.Telegram?.WebApp?.initDataUnsafe?.start_param ||
      searchParams.get('tgWebAppStartParam') ||
      searchParams.get('startapp') ||
      '';

    if (rawStartParam) {
      const cleaned = String(rawStartParam).trim();
      if (cleaned.startsWith('quiz_')) {
        const extracted = cleaned.slice(5).trim();
        if (extracted) return extracted;
      }
    }

    const directQuizId = searchParams.get('quiz');
    if (directQuizId && directQuizId.trim()) {
      return directQuizId.trim();
    }
  } catch {
    // Ignore
  }

  return null;
}

/**
 * Extracts a deep-linked mock test ID when the Mini App is opened from a shared
 * Telegram link (e.g. ?startapp=mock_<id>, initDataUnsafe.start_param, or ?mock=<id>).
 *
 * @returns {string | null}
 */
export function getDeepLinkedMockTestId() {
  try {
    const searchParams = new URLSearchParams(window.location.search);

    const rawStartParam =
      window?.Telegram?.WebApp?.initDataUnsafe?.start_param ||
      searchParams.get('tgWebAppStartParam') ||
      searchParams.get('startapp') ||
      '';

    if (rawStartParam) {
      const cleaned = String(rawStartParam).trim();
      if (cleaned.startsWith('mock_')) {
        const extracted = cleaned.slice(5).trim();
        if (extracted) return extracted;
      }
    }

    const directMockId = searchParams.get('mock');
    if (directMockId && directMockId.trim()) {
      return directMockId.trim();
    }
  } catch {
    // Ignore
  }

  return null;
}

/**
 * Builds the deep-link URL for sharing a specific timed Mock Test.
 * Uses https://t.me/<VITE_BOT_USERNAME>/<VITE_APP_SHORT_NAME>?startapp=mock_<id>
 * when configured, falling back to the web URL with ?mock=<id>.
 */
export function buildMockTestShareUrl(mockTestId) {
  const botUsername = (import.meta.env.VITE_BOT_USERNAME || '')
    .trim()
    .replace(/^@/, '');
  const appShortName = (import.meta.env.VITE_APP_SHORT_NAME || '').trim();

  if (botUsername && appShortName) {
    return `https://t.me/${botUsername}/${appShortName}?startapp=mock_${mockTestId}`;
  }
  if (botUsername) {
    return `https://t.me/${botUsername}?startapp=mock_${mockTestId}`;
  }
  return `${window.location.origin}/?mock=${mockTestId}`;
}

/**
 * Shares a timed Mock Test inside Telegram via the native share picker
 * (with Web Share API and clipboard fallback in browsers).
 */
export async function shareMockTestViaTelegram(mockTest, scoreSummary = null) {
  if (!mockTest?._id) return 'failed';
  const shareUrl = buildMockTestShareUrl(mockTest._id);
  const topicLine = [mockTest.examName, mockTest.subjectName]
    .filter(Boolean)
    .join(' › ');
  const metaLine = `${mockTest.questionCount || ''} Questions · ${mockTest.durationMinutes || 15} min`;
  const challengeLine = scoreSummary
    ? `I scored ${scoreSummary.score}/${scoreSummary.maxScore} (${scoreSummary.accuracyPercent}% accuracy)! Can you beat my score?`
    : 'Attempt this timed Mock Test on Quiz-Gram!';

  const shareText = `⏱ Timed Mock Test: ${mockTest.title}\n📚 ${topicLine} (${metaLine})\n\n${challengeLine}`;
  const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(
    shareUrl
  )}&text=${encodeURIComponent(shareText)}`;

  try {
    if (openTelegramLink.isAvailable()) {
      openTelegramLink(telegramShareUrl);
      return 'telegram';
    }
  } catch {
    // Fallback below
  }

  if (typeof window?.Telegram?.WebApp?.openTelegramLink === 'function') {
    try {
      window.Telegram.WebApp.openTelegramLink(telegramShareUrl);
      return 'telegram';
    } catch {
      // Fallback below
    }
  }

  if (navigator.share) {
    try {
      await navigator.share({
        title: `Mock Test: ${mockTest.title}`,
        text: shareText,
        url: shareUrl,
      });
      return 'native';
    } catch {
      // Cancelled
    }
  }

  try {
    await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
    return 'copied';
  } catch {
    window.open(telegramShareUrl, '_blank', 'noopener,noreferrer');
    return 'link';
  }
}

/**
 * Builds the deep-link URL for sharing a specific quiz card.
 * Uses https://t.me/<VITE_BOT_USERNAME>/<VITE_APP_SHORT_NAME>?startapp=quiz_<id>
 * when configured, falling back to the web URL with ?quiz=<id>.
 */
export function buildQuizShareUrl(quizId) {
  const botUsername = (import.meta.env.VITE_BOT_USERNAME || '')
    .trim()
    .replace(/^@/, '');
  const appShortName = (import.meta.env.VITE_APP_SHORT_NAME || '').trim();

  if (botUsername && appShortName) {
    return `https://t.me/${botUsername}/${appShortName}?startapp=quiz_${quizId}`;
  }
  if (botUsername) {
    return `https://t.me/${botUsername}?startapp=quiz_${quizId}`;
  }
  return `${window.location.origin}/?quiz=${quizId}`;
}

/**
 * Returns the configured Admin Contact Telegram Bot / Support link.
 * Set VITE_ADMIN_CONTACT_URL in client/.env (e.g. https://t.me/your_admin_bot).
 */
export function getAdminContactUrl() {
  const configured = (import.meta.env.VITE_ADMIN_CONTACT_URL || '').trim();
  if (configured) {
    if (configured.startsWith('http://') || configured.startsWith('https://')) {
      return configured;
    }
    return `https://t.me/${configured.replace(/^@/, '')}`;
  }

  const botUsername = (import.meta.env.VITE_BOT_USERNAME || '')
    .trim()
    .replace(/^@/, '');
  if (botUsername) {
    return `https://t.me/${botUsername}`;
  }

  return 'https://t.me/your_admin_contact_bot';
}

/**
 * Opens the Admin Contact Bot / Support link inside Telegram or in a new browser tab.
 */
export function openAdminContactLink() {
  const url = getAdminContactUrl();
  try {
    if (openTelegramLink.isAvailable() && url.startsWith('https://t.me/')) {
      openTelegramLink(url);
      return;
    }
  } catch {
    // Fallback to window.open
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Shares a quiz via Telegram share link when inside Telegram, or
 * falls back to Web Share API / clipboard copy in a regular browser.
 */
export async function shareQuizViaTelegram(quiz) {
  const tag =
    quiz.hashtag?.tag ||
    `${quiz.examName}_${quiz.subjectName}`.toUpperCase();
  const shareText = `Can you solve this #${tag} question on Quiz-Gram?\n\n${quiz.question}`;
  const shareUrl = buildQuizShareUrl(quiz._id);
  const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(
    shareUrl
  )}&text=${encodeURIComponent(shareText)}`;

  try {
    if (openTelegramLink.isAvailable()) {
      openTelegramLink(telegramShareUrl);
      return 'telegram';
    }
  } catch {
    // Fallback below
  }

  if (navigator.share) {
    try {
      await navigator.share({
        title: `Quiz-Gram #${tag}`,
        text: shareText,
        url: shareUrl,
      });
      return 'native';
    } catch {
      // Cancelled
    }
  }

  try {
    await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
    return 'copied';
  } catch {
    window.open(telegramShareUrl, '_blank', 'noopener,noreferrer');
    return 'link';
  }
}

/**
 * Opens a Telegram Stars invoice URL natively inside the Telegram Mini App
 * using `window.Telegram.WebApp.openInvoice` or `@telegram-apps/sdk-react`'s `invoice.open`.
 *
 * @param {string} invoiceUrl
 * @returns {Promise<'paid' | 'cancelled' | 'failed' | 'pending' | 'external'>}
 */
export async function openTelegramStarsInvoice(invoiceUrl) {
  if (!invoiceUrl) return 'failed';

  // 1. Native Telegram WebApp openInvoice (preferred inside Telegram Mini App)
  if (typeof window?.Telegram?.WebApp?.openInvoice === 'function') {
    return new Promise((resolve) => {
      try {
        window.Telegram.WebApp.openInvoice(invoiceUrl, (status) => {
          resolve(status || 'cancelled');
        });
      } catch {
        resolve('failed');
      }
    });
  }

  // 2. @telegram-apps/sdk-react v2 invoice helper
  try {
    if (invoice?.open?.isAvailable?.()) {
      const status = await invoice.open(invoiceUrl, 'url');
      return status || 'cancelled';
    }
  } catch {
    // Fall through to link open
  }

  // 3. Fallback when opened outside Telegram (opens t.me invoice link)
  try {
    if (openTelegramLink.isAvailable()) {
      openTelegramLink(invoiceUrl);
      return 'external';
    }
  } catch {
    // Fall through
  }

  window.open(invoiceUrl, '_blank', 'noopener,noreferrer');
  return 'external';
}
