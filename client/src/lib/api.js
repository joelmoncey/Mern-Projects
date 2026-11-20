const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000'
).replace(/\/+$/, '');

let authToken = null;

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

export async function apiRequest(path, options = {}) {
  const { method = 'GET', body, headers = {}, signal } = options;

  const finalHeaders = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (authToken) {
    finalHeaders.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

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
}
