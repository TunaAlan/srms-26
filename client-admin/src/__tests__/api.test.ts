// =============================================================================
// api.test.ts
// Unit tests for api.ts — the module that owns all HTTP communication and
// token lifecycle in the admin panel.
//
// Strategy:
//   - `fetch` is mocked globally via vi.stubGlobal so no real network calls
//     are made. Each test configures exactly the responses it expects.
//   - localStorage is available in jsdom and is cleared before each test to
//     prevent token state from leaking between cases.
//   - The module-level `isRefreshing` flag resets automatically because every
//     refresh flow ends with a `finally { isRefreshing = false }` block, so
//     tests that exercise the 401 path remain isolated.
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getToken, apiFetch, logout, login } from '../api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Builds a minimal Response-like object that satisfies the subset of the
// Fetch API that api.ts actually uses (.ok, .status, .json()).
// Typed as `any` to avoid friction with mockResolvedValueOnce strict generics.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeFetchResponse(body: unknown, status = 200): any {
  const ok = status >= 200 && status < 300;
  return { ok, status, json: () => Promise.resolve(body) };
}

// Shorthand for a 204 No Content response (used by DELETE endpoints).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeNoContentResponse(): any {
  return { ok: true, status: 204, json: () => Promise.resolve(null) };
}

// ---------------------------------------------------------------------------
// Test setup / teardown
// ---------------------------------------------------------------------------

// Vitest 4 accepts a single function-type argument; older two-argument form
// (Parameters, ReturnType) was removed. `Promise<any>` avoids strict inference
// that would type mockResolvedValueOnce as accepting `never`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFetch = vi.fn<() => Promise<any>>();

beforeEach(() => {
  // Replace the global fetch with a controllable mock before every test.
  vi.stubGlobal('fetch', mockFetch);
  // Clear stored tokens so each test starts with a clean slate.
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

// =============================================================================
// getToken
// Reads the access token from localStorage. Returns an empty string (not null
// or undefined) when no token is stored, so callers can always do string ops.
// =============================================================================
describe('getToken', () => {
  it('returns an empty string when no access token is stored', () => {
    expect(getToken()).toBe('');
  });

  it('returns the stored access token string', () => {
    localStorage.setItem('srms_token', 'my.jwt.token');
    expect(getToken()).toBe('my.jwt.token');
  });
});

// =============================================================================
// logout
// Sends the refresh token to the server and then unconditionally clears both
// tokens from localStorage — even if the server request fails.
// =============================================================================
describe('logout', () => {
  it('calls POST /api/auth/logout and then removes both tokens', async () => {
    localStorage.setItem('srms_token', 'access-tok');
    localStorage.setItem('srms_refresh_token', 'refresh-tok');

    mockFetch.mockResolvedValueOnce(makeFetchResponse(null, 200));

    await logout();

    // The server should have been called exactly once with the right endpoint.
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/auth/logout');
    expect(options.method).toBe('POST');

    // Both tokens must be cleared regardless of the server response.
    expect(localStorage.getItem('srms_token')).toBeNull();
    expect(localStorage.getItem('srms_refresh_token')).toBeNull();
  });

  it('skips the network call when no refresh token is stored', async () => {
    // Only the access token is present — there is nothing to revoke on the
    // server, so we should not make a pointless authenticated request.
    localStorage.setItem('srms_token', 'access-tok');

    await logout();

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('still clears localStorage even when the server request throws', async () => {
    // Network failures (e.g. server down) must not leave stale tokens behind.
    localStorage.setItem('srms_token', 'access-tok');
    localStorage.setItem('srms_refresh_token', 'refresh-tok');

    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    await logout(); // should not throw

    expect(localStorage.getItem('srms_token')).toBeNull();
    expect(localStorage.getItem('srms_refresh_token')).toBeNull();
  });
});

// =============================================================================
// login
// Authenticates with the backend and enforces the role allowlist.
// Only 'admin' and 'review_personnel' accounts may access the admin panel;
// citizen accounts ('user') must be rejected on the client side even if the
// server returns 200 with valid credentials.
// =============================================================================
describe('login', () => {
  it('resolves with server data for an admin account', async () => {
    const serverData = {
      user: { id: '1', email: 'admin@test.com', role: 'admin' },
      accessToken: 'acc',
      refreshToken: 'ref',
    };
    mockFetch.mockResolvedValueOnce(makeFetchResponse(serverData, 200));

    const result = await login('admin@test.com', 'pass');
    expect(result).toEqual(serverData);
  });

  it('resolves with server data for a review_personnel account', async () => {
    const serverData = {
      user: { id: '2', email: 'reviewer@test.com', role: 'review_personnel' },
      accessToken: 'acc2',
      refreshToken: 'ref2',
    };
    mockFetch.mockResolvedValueOnce(makeFetchResponse(serverData, 200));

    const result = await login('reviewer@test.com', 'pass');
    expect(result).toEqual(serverData);
  });

  it('throws an access-denied error for a citizen (user) account', async () => {
    // The server returns 200 — credentials are valid — but the role is not
    // permitted in the admin panel.
    const serverData = {
      user: { id: '3', email: 'citizen@test.com', role: 'user' },
      accessToken: 'acc3',
      refreshToken: 'ref3',
    };
    mockFetch.mockResolvedValueOnce(makeFetchResponse(serverData, 200));

    await expect(login('citizen@test.com', 'pass')).rejects.toThrow(
      'Bu panele erişim yetkiniz yok.',
    );
  });

  it('throws the server error message when credentials are invalid', async () => {
    mockFetch.mockResolvedValueOnce(
      makeFetchResponse({ message: 'E-posta veya şifre hatalı' }, 401),
    );

    await expect(login('admin@test.com', 'wrong')).rejects.toThrow(
      'E-posta veya şifre hatalı',
    );
  });
});

// =============================================================================
// apiFetch
// The central fetch wrapper: injects the Authorization header, handles 204,
// surfaces server errors as exceptions, and transparently refreshes the access
// token on 401 before retrying the original request.
// =============================================================================
describe('apiFetch', () => {
  it('makes an authenticated GET request and returns parsed JSON', async () => {
    localStorage.setItem('srms_token', 'valid-token');
    const responseBody = { data: [{ id: '1' }], total: 1 };

    mockFetch.mockResolvedValueOnce(makeFetchResponse(responseBody, 200));

    const result = await apiFetch('/reports');

    // The Authorization header must carry the stored token.
    const [url, options] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/reports');
    expect((options.headers as Record<string, string>)['Authorization']).toBe(
      'Bearer valid-token',
    );
    expect(result).toEqual(responseBody);
  });

  it('returns null for a 204 No Content response', async () => {
    // DELETE /reports returns 204 — apiFetch must not call .json() on an
    // empty body (which would throw a parse error).
    localStorage.setItem('srms_token', 'valid-token');
    mockFetch.mockResolvedValueOnce(makeNoContentResponse());

    const result = await apiFetch('/reports', { method: 'DELETE' });
    expect(result).toBeNull();
  });

  it('throws an error with the server message when the response is not ok', async () => {
    localStorage.setItem('srms_token', 'valid-token');
    mockFetch.mockResolvedValueOnce(
      makeFetchResponse({ message: 'Rapor bulunamadı' }, 404),
    );

    await expect(apiFetch('/reports/nonexistent')).rejects.toThrow('Rapor bulunamadı');
  });

  it('falls back to a generic error message when the server returns no message', async () => {
    localStorage.setItem('srms_token', 'valid-token');
    // Some error responses (e.g. proxies, WAFs) may return non-JSON or an
    // object without a 'message' field.
    mockFetch.mockResolvedValueOnce(makeFetchResponse({}, 500));

    await expect(apiFetch('/reports')).rejects.toThrow('Sunucu Hatası: 500');
  });

  it('refreshes the access token on 401 and retries the original request', async () => {
    localStorage.setItem('srms_token', 'expired-token');
    localStorage.setItem('srms_refresh_token', 'valid-refresh-token');

    const refreshedTokens = { accessToken: 'new-access-token', refreshToken: 'new-refresh-token' };
    const originalResponse = { id: '1', status: 'pending' };

    // Call 1: original request fails with 401 (token expired).
    mockFetch.mockResolvedValueOnce(makeFetchResponse(null, 401));
    // Call 2: POST /auth/refresh succeeds and returns new token pair.
    mockFetch.mockResolvedValueOnce(makeFetchResponse(refreshedTokens, 200));
    // Call 3: retry of the original request with the new token succeeds.
    mockFetch.mockResolvedValueOnce(makeFetchResponse(originalResponse, 200));

    const result = await apiFetch('/reports/1');

    // The final result should be the data from the retried request.
    expect(result).toEqual(originalResponse);

    // The new tokens must be persisted so subsequent requests use them.
    expect(localStorage.getItem('srms_token')).toBe('new-access-token');
    expect(localStorage.getItem('srms_refresh_token')).toBe('new-refresh-token');

    // Exactly three fetch calls: original → refresh → retry.
    expect(mockFetch).toHaveBeenCalledTimes(3);

    // The third call (retry) must use the new access token.
    const [, retryOptions] = mockFetch.mock.calls[2] as unknown as [string, RequestInit];
    expect((retryOptions.headers as Record<string, string>)['Authorization']).toBe(
      'Bearer new-access-token',
    );
  });

  it('clears both tokens and returns null when the refresh request fails', async () => {
    // If the refresh token itself is expired or revoked, the user's session
    // is invalid. Both tokens are cleared so the UI can redirect to login.
    localStorage.setItem('srms_token', 'expired-token');
    localStorage.setItem('srms_refresh_token', 'expired-refresh-token');

    // Call 1: original request returns 401.
    mockFetch.mockResolvedValueOnce(makeFetchResponse(null, 401));
    // Call 2: refresh attempt also fails (e.g. refresh token expired).
    mockFetch.mockResolvedValueOnce(makeFetchResponse({ message: 'Token expired' }, 401));

    const result = await apiFetch('/reports');

    expect(result).toBeNull();
    expect(localStorage.getItem('srms_token')).toBeNull();
    expect(localStorage.getItem('srms_refresh_token')).toBeNull();
  });
});
