const DAILY_SEEN_PREFIX = 'quiz_gram_daily_seen_';
const MAX_DAILY_HASHES = 400;

export function getLocalTodayKey(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function pruneOldDays(todayKey) {
  try {
    const activeKey = `${DAILY_SEEN_PREFIX}${todayKey}`;
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k && k.startsWith(DAILY_SEEN_PREFIX) && k !== activeKey) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // Ignore storage errors
  }
}

export function loadTodaySeenHashes() {
  const todayKey = getLocalTodayKey();
  pruneOldDays(todayKey);
  try {
    const raw = localStorage.getItem(`${DAILY_SEEN_PREFIX}${todayKey}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((h) => typeof h === 'string' && h.length > 0)
      : [];
  } catch {
    return [];
  }
}

export function recordTodaySeenHashes(newHashes = []) {
  const cleaned = (Array.isArray(newHashes) ? newHashes : [newHashes]).filter(
    (h) => typeof h === 'string' && h.trim().length > 0
  );
  if (cleaned.length === 0) return;

  const todayKey = getLocalTodayKey();
  pruneOldDays(todayKey);
  try {
    const existing = loadTodaySeenHashes();
    const merged = Array.from(new Set([...existing, ...cleaned])).slice(
      -MAX_DAILY_HASHES
    );
    localStorage.setItem(
      `${DAILY_SEEN_PREFIX}${todayKey}`,
      JSON.stringify(merged)
    );
  } catch {
    // Ignore quota errors
  }
}
