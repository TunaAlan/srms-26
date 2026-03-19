// Test utilities for API testing with example requests

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    ME: '/auth/me',
  },
  REPORTS: {
    LIST: '/reports',
    CREATE: '/reports',
    GET: (id: string) => `/reports/${id}`,
    UPDATE: (id: string) => `/reports/${id}`,
  },
};

// Example users for testing
export const TEST_USERS = {
  ADMIN: {
    email: 'admin@infrareport.com',
    password: 'admin123456',
    name: 'Admin User',
    role: 'admin' as const,
  },
  DEPARTMENT: {
    email: 'dept@infrareport.com',
    password: 'dept123456',
    name: 'Department User',
    role: 'department' as const,
  },
  REGULAR: {
    email: 'user@infrareport.com',
    password: 'user123456',
    name: 'Regular User',
    role: 'user' as const,
  },
};

// Example reports for testing
export const TEST_REPORTS = [
  {
    image: 'https://via.placeholder.com/300x300?text=Road+Damage',
    description: 'Kaldırımda ciddi kırılmalar var',
    category: 'yol',
    categoryLabel: 'Yol / Kaldırım',
    latitude: 39.9255,
    longitude: 32.8662,
    address: 'Kızılay, Ankara',
  },
  {
    image: 'https://via.placeholder.com/300x300?text=Water+Issue',
    description: 'Su borusu sızıntısı yapıyor',
    category: 'su',
    categoryLabel: 'Su / Kanalizasyon',
    latitude: 39.9412,
    longitude: 32.8543,
    address: 'Çankaya, Ankara',
  },
];

// Helper to format API response for testing
export interface ApiTestResponse<T> {
  status: number;
  data: T;
  headers: Record<string, string>;
}

// Mock responses for testing
export const MOCK_RESPONSES = {
  LOGIN_SUCCESS: {
    user: {
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
      role: 'user',
    },
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  },
  REGISTER_SUCCESS: {
    user: {
      id: 'new-user-id',
      name: 'New User',
      email: 'newuser@example.com',
      role: 'user',
    },
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  },
  GET_PROFILE: {
    id: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com',
    role: 'user',
  },
  ERROR_UNAUTHORIZED: {
    message: 'Yetkilendirme gerekli',
  },
  ERROR_INVALID_CREDENTIALS: {
    message: 'E-posta veya şifre hatalı',
  },
};
