import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listStaff, createStaff, setActive, deleteStaff } from '../../src/services/userService.js';

vi.mock('../../src/models/User.js', () => ({
  default: {
    findAll: vi.fn(),
    findOne: vi.fn(),
    findByPk: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('../../src/config/database.js', () => ({
  default: {},
}));

import User from '../../src/models/User.js';

const mockStaff = (role: string = 'admin') => ({
  id: 'uuid-123',
  email: 'staff@test.com',
  role,
  isActive: true,
  update: vi.fn().mockResolvedValue(undefined),
  destroy: vi.fn().mockResolvedValue(undefined),
  toSafeJSON: vi.fn().mockReturnValue({ id: 'uuid-123', email: 'staff@test.com', role }),
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── listStaff ────────────────────────────────────────────────────────────────

describe('userService.listStaff', () => {
  it('returns list of staff accounts', async () => {
    const staff = [mockStaff('admin'), mockStaff('review_personnel')];
    vi.mocked(User.findAll).mockResolvedValue(staff as any);

    const result = await listStaff();

    expect(User.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { role: ['admin', 'review_personnel'] },
    }));
    expect(result).toBe(staff);
  });
});

// ─── createStaff ──────────────────────────────────────────────────────────────

describe('userService.createStaff', () => {
  it('returns safe user on successful creation', async () => {
    vi.mocked(User.findOne).mockResolvedValue(null);
    vi.mocked(User.create).mockResolvedValue(mockStaff() as any);

    const result = await createStaff({ name: 'Test', email: 'new@test.com', password: '123', role: 'admin' });

    expect(result).toEqual({ id: 'uuid-123', email: 'staff@test.com', role: 'admin' });
  });

  it('throws 409 if email is already registered', async () => {
    vi.mocked(User.findOne).mockResolvedValue(mockStaff() as any);

    await expect(createStaff({ name: 'Test', email: 'staff@test.com', password: '123', role: 'admin' }))
      .rejects.toMatchObject({ statusCode: 409 });
  });
});

// ─── setActive ────────────────────────────────────────────────────────────────

describe('userService.setActive', () => {
  it('updates isActive for staff accounts', async () => {
    const staff = mockStaff('admin');
    vi.mocked(User.findByPk).mockResolvedValue(staff as any);

    await setActive('uuid-123', false);

    expect(staff.update).toHaveBeenCalledWith({ isActive: false });
  });

  it('throws 404 if user is not found', async () => {
    vi.mocked(User.findByPk).mockResolvedValue(null);

    await expect(setActive('nonexistent-id', false))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 400 if user is a citizen (role: user)', async () => {
    vi.mocked(User.findByPk).mockResolvedValue(mockStaff('user') as any);

    await expect(setActive('uuid-123', false))
      .rejects.toMatchObject({ statusCode: 400 });
  });
});

// ─── deleteStaff ──────────────────────────────────────────────────────────────

describe('userService.deleteStaff', () => {
  it('deletes staff account successfully', async () => {
    const staff = mockStaff('review_personnel');
    vi.mocked(User.findByPk).mockResolvedValue(staff as any);

    await deleteStaff('uuid-123');

    expect(staff.destroy).toHaveBeenCalled();
  });

  it('throws 404 if user is not found', async () => {
    vi.mocked(User.findByPk).mockResolvedValue(null);

    await expect(deleteStaff('nonexistent-id'))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 400 if user is a citizen (role: user)', async () => {
    vi.mocked(User.findByPk).mockResolvedValue(mockStaff('user') as any);

    await expect(deleteStaff('uuid-123'))
      .rejects.toMatchObject({ statusCode: 400 });
  });
});
