const API_BASE = '/api';

const ACCESS_TOKEN_KEY = 'srms_token';
const REFRESH_TOKEN_KEY = 'srms_refresh_token';

export function getToken(): string {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || '';
}

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

async function doRefresh(): Promise<string> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) throw new Error('No refresh token');

  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    throw new Error('Refresh failed');
  }

  const data = await res.json();
  localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
  return data.accessToken;
}

export async function apiFetch(path: string, options: any = {}): Promise<any> {
  const makeRequest = async (token: string) => {
    return fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
  };

  let res = await makeRequest(getToken());

  if (res.status === 401) {
    if (isRefreshing) {
      const newToken = await new Promise<string | null>((resolve) => {
        refreshQueue.push(resolve);
      });
      if (!newToken) return null;
      res = await makeRequest(newToken);
    } else {
      isRefreshing = true;
      try {
        const newToken = await doRefresh();
        refreshQueue.forEach((cb) => cb(newToken));
        refreshQueue = [];
        res = await makeRequest(newToken);
      } catch {
        refreshQueue.forEach((cb) => cb(null));
        refreshQueue = [];
        isRefreshing = false;
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        return null;
      } finally {
        isRefreshing = false;
      }
    }
  }

  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.message || `Sunucu Hatası: ${res.status}`);
  }

  return data;
}

export async function logout(): Promise<void> {
  try {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });
    }
  } catch {
    // Token zaten geçersizse sessizce devam et
  } finally {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

export async function login(email: string, password: string): Promise<any> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Giriş başarısız');
  if (!['admin', 'review_personnel'].includes(data.user.role)) {
    throw new Error('Bu panele erişim yetkiniz yok.');
  }
  return data;
}

export async function fetchStaff() {
  return apiFetch('/users');
}

export async function createStaff(data: { name: string; email: string; password: string; role: string }) {
  return apiFetch('/users', { method: 'POST', body: JSON.stringify(data) });
}

export async function setStaffActive(id: string, isActive: boolean) {
  return apiFetch(`/users/${id}/active`, { method: 'PATCH', body: JSON.stringify({ isActive }) });
}

export async function deleteStaff(id: string) {
  return apiFetch(`/users/${id}`, { method: 'DELETE' });
}

export async function retryReportAnalysis(id: string): Promise<void> {
  await apiFetch(`/reports/${id}/retry`, { method: 'POST' });
}

export async function changeReportStatus(id: string, status: 'in_review' | 'in_progress' | 'resolved', note?: string): Promise<void> {
  await apiFetch(`/reports/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, ...(note ? { note } : {}) }),
  });
}
