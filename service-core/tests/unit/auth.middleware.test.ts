import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authenticate, authorize } from '../../src/middleware/auth.js';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

vi.mock('jsonwebtoken');

// Build minimal req/res/next fakes
const mockReq = (authHeader?: string) =>
  ({ headers: { authorization: authHeader } }) as unknown as Request;

const mockRes = () => {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const mockNext = () => vi.fn() as unknown as NextFunction;

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── authenticate ─────────────────────────────────────────────────────────────

describe('authenticate middleware', () => {
  it('sets req.user and calls next if token is valid', () => {
    const req = mockReq('Bearer validtoken');
    const res = mockRes();
    const next = mockNext();

    vi.mocked(jwt.verify).mockReturnValue({ id: 'uuid-123', email: 'test@test.com', role: 'admin' } as any);

    authenticate(req, res, next);

    expect(req.user).toEqual({ id: 'uuid-123', email: 'test@test.com', role: 'admin' });
    expect(next).toHaveBeenCalled();
  });

  it('returns 401 if authorization header has wrong prefix', () => {
    const req = mockReq('Basic token123');
    const res = mockRes();
    const next = mockNext();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 if authorization header is missing', () => {
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 if token is invalid', () => {
    const req = mockReq('Bearer invalidtoken');
    const res = mockRes();
    const next = mockNext();

    vi.mocked(jwt.verify).mockImplementation(() => { throw new Error(); });

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

// ─── authorize ────────────────────────────────────────────────────────────────

describe('authorize middleware', () => {
  it('calls next if user role is allowed', () => {
    const req = { user: { id: 'uuid-123', email: 'test@test.com', role: 'admin' } } as unknown as Request;
    const res = mockRes();
    const next = mockNext();

    authorize('admin')(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 403 if req.user is undefined', () => {
    const req = {} as unknown as Request;
    const res = mockRes();
    const next = mockNext();

    authorize('admin')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 if user role is not allowed', () => {
    const req = { user: { id: 'uuid-123', email: 'test@test.com', role: 'user' } } as unknown as Request;
    const res = mockRes();
    const next = mockNext();

    authorize('admin')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
