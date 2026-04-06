import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

// Mock env
vi.mock('../config/env', () => ({
  env: {
    JWT_SECRET: 'test-secret-key',
  },
}));

import { authenticate, requireRole } from '../middleware/auth';
import type { Request, Response, NextFunction } from 'express';

function createMockReq(headers: Record<string, string> = {}): Request {
  return { headers, user: undefined } as unknown as Request;
}

function createMockRes(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

describe('authenticate middleware', () => {
  const next: NextFunction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 if Authorization header is missing', () => {
    const req = createMockReq();
    const res = createMockRes();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing authorization header' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 if Authorization header does not start with Bearer', () => {
    const req = createMockReq({ authorization: 'Basic abc123' });
    const res = createMockRes();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for invalid token', () => {
    const req = createMockReq({ authorization: 'Bearer invalid-token' });
    const res = createMockRes();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for expired token', () => {
    const token = jwt.sign(
      { userId: 'u1', tenantId: 't1', role: 'SELLER' },
      'test-secret-key',
      { expiresIn: '-1s' },
    );
    const req = createMockReq({ authorization: `Bearer ${token}` });
    const res = createMockRes();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('sets req.user and calls next for valid token', () => {
    const token = jwt.sign(
      { userId: 'u1', tenantId: 't1', role: 'ADMIN' },
      'test-secret-key',
      { expiresIn: '1h' },
    );
    const req = createMockReq({ authorization: `Bearer ${token}` });
    const res = createMockRes();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toBeDefined();
    expect(req.user!.userId).toBe('u1');
    expect(req.user!.tenantId).toBe('t1');
    expect(req.user!.role).toBe('ADMIN');
  });
});

describe('requireRole middleware', () => {
  const next: NextFunction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 if req.user is not set', () => {
    const req = createMockReq();
    const res = createMockRes();

    const middleware = requireRole('ADMIN');
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not authenticated' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 if user role is not in allowed roles', () => {
    const req = createMockReq();
    req.user = { userId: 'u1', tenantId: 't1', role: 'SELLER' };
    const res = createMockRes();

    const middleware = requireRole('ADMIN');
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next if user has an allowed role', () => {
    const req = createMockReq();
    req.user = { userId: 'u1', tenantId: 't1', role: 'ADMIN' };
    const res = createMockRes();

    const middleware = requireRole('ADMIN', 'SELLER');
    middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('allows matching any of multiple roles', () => {
    const req = createMockReq();
    req.user = { userId: 'u1', tenantId: 't1', role: 'SELLER' };
    const res = createMockRes();

    const middleware = requireRole('ADMIN', 'SELLER');
    middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });
});
