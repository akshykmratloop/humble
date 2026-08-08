const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

/**
 * Thin fetch wrapper for the Humble API (docs/08-api-contracts.md). Always
 * sends credentials so the session cookie round-trips across the web (3000)
 * / api (4000) localhost ports — the server-side session, not this client
 * code, is the actual security boundary (docs/05-hld.md §6).
 */
async function apiRequest(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    const error = new Error(data?.detail || `Request failed with status ${res.status}`);
    error.status = res.status;
    error.body = data;
    throw error;
  }
  return data;
}

export const api = {
  register: (payload) => apiRequest('/v1/auth/register', { method: 'POST', body: payload }),
  verifyEmail: (token) => apiRequest('/v1/auth/verify-email', { method: 'POST', body: { token } }),
  login: (payload) => apiRequest('/v1/auth/login', { method: 'POST', body: payload }),
  session: () => apiRequest('/v1/auth/session'),
  getOwnProfile: () => apiRequest('/v1/profiles/me'),
  updateOwnProfile: (payload) => apiRequest('/v1/profiles/me', { method: 'PATCH', body: payload }),
  getCandidates: (cursor) =>
    apiRequest(`/v1/discovery/candidates${cursor ? `?cursor=${cursor}` : ''}`),
  submitDecision: (targetId, decision) =>
    apiRequest('/v1/discovery/decisions', { method: 'POST', body: { targetId, decision } }),
  getMatches: () => apiRequest('/v1/matches'),
  requestPhotoUploadUrl: () => apiRequest('/v1/profiles/me/photos/upload-url', { method: 'POST' }),
  confirmPhotoUpload: (photoId) =>
    apiRequest(`/v1/profiles/me/photos/${photoId}/confirm`, { method: 'POST' }),
};

/** Raw-body PUT for the two-step photo upload — bypasses apiRequest's JSON encoding. */
export async function uploadPhotoBytes(uploadUrl, file) {
  const res = await fetch(`${API_BASE_URL}${uploadUrl}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });
  if (!res.ok) {
    throw new Error(`Photo upload failed with status ${res.status}`);
  }
}
