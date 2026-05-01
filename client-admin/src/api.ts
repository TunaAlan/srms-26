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
