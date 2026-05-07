import { describe, it, expect, vi, beforeEach } from 'vitest';
import { login, register, refresh, logout, getProfile } from '../../src/services/authService.js';

// Mock Sequelize models — no DB connection during unit tests
vi.mock('../../src/models/User.js', () => ({
  default: {
    findOne: vi.fn(),
    findByPk: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('../../src/models/RefreshToken.js', () => ({
  default: {
    findOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../../src/config/database.js', () => ({
  default: {},
}));

import User from '../../src/models/User.js';
import RefreshToken from '../../src/models/RefreshToken.js';

// Reusable mock user object
const mockUser = {
  id: 'uuid-123',
  email: 'test@test.com',
  password: 'hashed',
  role: 'user',
  isActive: true,
  comparePassword: vi.fn(),
  toSafeJSON: vi.fn().mockReturnValue({ id: 'uuid-123', email: 'test@test.com', role: 'user' }),
};

const mockTokenRecord = (overrides = {}) => ({
  userId: 'uuid-123',
  token: 'valid-refresh-token',
  revoked: false,
  expiresAt: new Date(Date.now() + 86400000),
  update: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── register ─────────────────────────────────────────────────────────────────

describe('authService.register', () => {
  it('returns user and tokens on successful registration', async () => {
    vi.mocked(User.findOne).mockResolvedValue(null);
    vi.mocked(User.create).mockResolvedValue(mockUser as any);
    vi.mocked(RefreshToken.create).mockResolvedValue({} as any);

    const result = await register({ name: 'Test', email: 'new@test.com', password: '123' });

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.user).toBeDefined();
  });

  it('throws 409 if email is already registered', async () => {
    vi.mocked(User.findOne).mockResolvedValue(mockUser as any);

    await expect(register({ name: 'Test', email: 'test@test.com', password: '123' }))
      .rejects.toMatchObject({ statusCode: 409 });
  });
});

// ─── login ────────────────────────────────────────────────────────────────────

describe('authService.login', () => {
  it('returns accessToken and refreshToken on successful login', async () => {
    vi.mocked(User.findOne).mockResolvedValue(mockUser as any);
    mockUser.comparePassword.mockResolvedValue(true);
    vi.mocked(RefreshToken.create).mockResolvedValue({} as any);

    const result = await login({ email: 'test@test.com', password: 'correct' });

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.user).toEqual({ id: 'uuid-123', email: 'test@test.com', role: 'user' });
  });

  it('throws 401 if user is not found', async () => {
    vi.mocked(User.findOne).mockResolvedValue(null);

    await expect(login({ email: 'not@test.com', password: '123' }))
      .rejects.toMatchObject({ statusCode: 401 });
  });

  it('throws 401 if password is incorrect', async () => {
    vi.mocked(User.findOne).mockResolvedValue(mockUser as any);
    mockUser.comparePassword.mockResolvedValue(false);

    await expect(login({ email: 'test@test.com', password: 'incorrect' }))
      .rejects.toMatchObject({ statusCode: 401 });
  });

  it('throws 403 if account is inactive', async () => {
    const passiveUser = { ...mockUser, isActive: false, comparePassword: vi.fn().mockResolvedValue(true) };
    vi.mocked(User.findOne).mockResolvedValue(passiveUser as any);

    await expect(login({ email: 'test@test.com', password: 'correct' }))
      .rejects.toMatchObject({ statusCode: 403 });
  });
});

// ─── refresh ──────────────────────────────────────────────────────────────────

describe('authService.refresh', () => {
  it('returns new tokens on successful refresh', async () => {
    vi.mocked(RefreshToken.findOne).mockResolvedValue(mockTokenRecord() as any);
    vi.mocked(User.findByPk).mockResolvedValue(mockUser as any);
    vi.mocked(RefreshToken.create).mockResolvedValue({} as any);

    const result = await refresh('valid-token');

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
  });

  it('throws 401 if token record is not found', async () => {
    vi.mocked(RefreshToken.findOne).mockResolvedValue(null);

    await expect(refresh('nonexistent-token'))
      .rejects.toMatchObject({ statusCode: 401 });
  });

  it('throws 401 if token is revoked', async () => {
    vi.mocked(RefreshToken.findOne).mockResolvedValue(mockTokenRecord({ revoked: true }) as any);

    await expect(refresh('revoked-token'))
      .rejects.toMatchObject({ statusCode: 401 });
  });

  it('throws 401 if token is expired', async () => {
    vi.mocked(RefreshToken.findOne).mockResolvedValue(
      mockTokenRecord({ expiresAt: new Date(Date.now() - 1000) }) as any
    );

    await expect(refresh('expired-token'))
      .rejects.toMatchObject({ statusCode: 401 });
  });

  it('throws 403 if user is not found in db', async () => {
    vi.mocked(RefreshToken.findOne).mockResolvedValue(mockTokenRecord() as any);
    vi.mocked(User.findByPk).mockResolvedValue(null);

    await expect(refresh('valid-token'))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws 403 if user is inactive', async () => {
    vi.mocked(RefreshToken.findOne).mockResolvedValue(mockTokenRecord() as any);
    vi.mocked(User.findByPk).mockResolvedValue({ ...mockUser, isActive: false } as any);

    await expect(refresh('valid-token'))
      .rejects.toMatchObject({ statusCode: 403 });
  });
});

// ─── logout ───────────────────────────────────────────────────────────────────

describe('authService.logout', () => {
  it('revokes the refresh token', async () => {
    vi.mocked(RefreshToken.update).mockResolvedValue([1] as any);

    await logout('valid-refresh-token');

    expect(RefreshToken.update).toHaveBeenCalledWith(
      { revoked: true },
      { where: { token: 'valid-refresh-token' } }
    );
  });
});

// ─── getProfile ───────────────────────────────────────────────────────────────

describe('authService.getProfile', () => {
  it('returns safe user data if found', async () => {
    vi.mocked(User.findByPk).mockResolvedValue(mockUser as any);

    const result = await getProfile('uuid-123');

    expect(result).toEqual({ id: 'uuid-123', email: 'test@test.com', role: 'user' });
  });

  it('throws 404 if user is not found', async () => {
    vi.mocked(User.findByPk).mockResolvedValue(null);

    await expect(getProfile('nonexistent-id'))
      .rejects.toMatchObject({ statusCode: 404 });
  });
});
