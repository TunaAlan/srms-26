const API_BASE = '/api';

export function getToken(): string {
  return localStorage.getItem('srms_token') || '';
}

export async function apiFetch(path: string, options: any = {}): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (res.status === 204) {
    return null; // No Content
  }

  if (res.status === 401) {
    localStorage.removeItem('srms_token');
    return null;
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.message || `Sunucu Hatası: ${res.status}`);
  }

  return data;
}

export async function logout(): Promise<void> {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } catch {
    // If the token is already invalid, just proceed silently.
  } finally {
    localStorage.removeItem('srms_token');
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
  if (!['super_admin', 'review', 'emergency'].includes(data.user.role)) {
    throw new Error('Bu panele erişim yetkiniz yok.');
  }
  return data;
}
