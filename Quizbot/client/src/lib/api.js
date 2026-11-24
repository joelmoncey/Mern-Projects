const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000'
).replace(/\/+$/, '');

let authToken = null;

const DEFAULT_TIMEOUT_MS = 18000;
const RETRY_DELAYS_MS = [500, 1300];
const TRANSIENT_HTTP_STATUSES = new Set([502, 503, 504]);

export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export function setAuthToken(token) {
  authToken = token || null;
}

export function getAuthToken() {
  return authToken;
}

function isRetryableRequest(method, path) {
  const upper = String(method || 'GET').toUpperCase();
  if (upper === 'GET' || upper === 'HEAD') return true;
  if (
    upper === 'POST' &&
    (path.startsWith('/api/auth/') || path.startsWith('/api/quizzes/feed'))
  ) {
    return true;
  }
  return false;
}

function isNetworkFailure(err) {
  if (!err) return false;
  if (err.name === 'AbortError') return true;
  if (err instanceof TypeError) return true;
  return /failed to fetch|load failed|networkerror|network request failed/i.test(
    String(err.message || '')
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function apiRequest(path, options = {}) {
  const {
    method = 'GET',
    body,
    headers = {},
    signal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;

  const finalHeaders = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (authToken) {
    finalHeaders.Authorization = `Bearer ${authToken}`;
  }

  const canRetry = isRetryableRequest(method, path);
  const maxAttempts = canRetry ? 1 + RETRY_DELAYS_MS.length : 1;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const onExternalAbort = () => controller.abort();
    if (signal) {
      if (signal.aborted) {
        clearTimeout(timer);
        throw new ApiError('Request cancelled', 0);
      }
      signal.addEventListener('abort', onExternalAbort, { once: true });
    }

    try {
      const response = await fetch(`${API_URL}${path}`, {
        method,
        headers: finalHeaders,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', onExternalAbort);

      if (
        canRetry &&
        TRANSIENT_HTTP_STATUSES.has(response.status) &&
        attempt < maxAttempts - 1
      ) {
        await sleep(RETRY_DELAYS_MS[attempt]);
        continue;
      }

      let data = null;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await response.json().catch(() => null);
      }

      if (!response.ok) {
        throw new ApiError(
          data?.error || `Request failed with status ${response.status}`,
          response.status,
          data
        );
      }

      return data;
    } catch (err) {
      clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', onExternalAbort);

      if (err instanceof ApiError) {
        throw err;
      }

      if (signal?.aborted) {
        throw new ApiError('Request cancelled', 0);
      }

      if (canRetry && isNetworkFailure(err) && attempt < maxAttempts - 1) {
        await sleep(RETRY_DELAYS_MS[attempt]);
        continue;
      }

      if (err?.name === 'AbortError') {
        throw new ApiError(
          'Server took too long to respond. Please check your internet and try again.',
          0
        );
      }

      if (isNetworkFailure(err)) {
        throw new ApiError(
          'Unable to reach server right now. Please check your internet connection and retry.',
          0
        );
      }

      throw new ApiError(err?.message || 'Network request failed', 0);
    }
  }

  throw new ApiError(
    'Unable to reach server right now. Please try again.',
    0
  );
}
