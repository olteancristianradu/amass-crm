import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const { auditCreate } = vi.hoisted(() => ({
  auditCreate: vi.fn().mockReturnValue(Promise.resolve({})),
}));

// Mock prisma before importing app
vi.mock('../../config/database', () => ({
  prisma: {
    user: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    refreshToken: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    tenant: { create: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    session: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    client: { count: vi.fn(), groupBy: vi.fn(), findMany: vi.fn() },
    deal: { findMany: vi.fn() },
    target: { findMany: vi.fn() },
    activity: { findMany: vi.fn() },
    auditLog: { create: auditCreate },
  },
}));

vi.mock('../../utils/password', () => ({
  validatePasswordPolicy: vi.fn().mockReturnValue({ valid: true, errors: [] }),
}));

import { TEST_TENANT_ID, TEST_USER_ID, authHeader } from './setup';
import app from '../../app';
import { prisma } from '../../config/database';
import bcrypt from 'bcryptjs';

const mockPrisma = vi.mocked(prisma);

describe('Auth API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/v1/auth/login', () => {
    it('returns 400 when userId is missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({});

      expect(res.status).toBe(400);
    });

    it('returns 401 when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ userId: 'nonexistent' });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Invalid credentials');
    });

    it('returns tokens on valid login without PIN', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: 'ADMIN',
        isActive: true,
        pinHash: null,
        passwordHash: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
        tenant: { id: TEST_TENANT_ID, name: 'Test' },
      } as never);
      mockPrisma.refreshToken.create.mockResolvedValue({} as never);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ userId: TEST_USER_ID });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
    });

    it('returns tokens on valid login with correct PIN', async () => {
      const pinHash = await bcrypt.hash('1234', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: 'SELLER',
        isActive: true,
        pinHash,
        passwordHash: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
        tenant: { id: TEST_TENANT_ID, name: 'Test' },
      } as never);
      mockPrisma.refreshToken.create.mockResolvedValue({} as never);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ userId: TEST_USER_ID, pin: '1234' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
    });

    it('returns 401 on incorrect PIN', async () => {
      const pinHash = await bcrypt.hash('1234', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: 'SELLER',
        isActive: true,
        pinHash,
        passwordHash: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
        tenant: { id: TEST_TENANT_ID, name: 'Test' },
      } as never);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ userId: TEST_USER_ID, pin: '9999' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('returns 400 when refreshToken is missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({});

      expect(res.status).toBe(400);
    });

    it('returns 401 on invalid refresh token', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('returns 401 without auth header', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .send({ refreshToken: 'some-token' });

      expect(res.status).toBe(401);
    });

    it('returns 200 with valid auth', async () => {
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 } as never);

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', authHeader())
        .send({ refreshToken: 'some-token' });

      expect(res.status).toBe(200);
    });
  });
});

describe('Health Check', () => {
  it('GET /api/health returns status and checks', async () => {
    const res = await request(app).get('/api/health');
    // In test env with mocked DB, may return 503 (degraded) or 200
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('checks');
  });
});
