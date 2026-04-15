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
  if (res.status === 401) {
    localStorage.removeItem('srms_token');
    return null;
  }
  return res.json();
}

export async function login(email: string, password: string): Promise<any> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Giriş başarısız');
  if (data.user.role !== 'admin' && data.user.role !== 'department') {
    throw new Error('Bu panele erişim yetkiniz yok.');
  }
  return data;
}
