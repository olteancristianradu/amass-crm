import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock prisma
vi.mock('../config/database', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    tenant: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    session: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

// Mock env
vi.mock('../config/env', () => ({
  env: {
    JWT_SECRET: 'test-secret-key',
    JWT_EXPIRES_IN: '15m',
  },
}));

// Mock password utility
vi.mock('../utils/password', () => ({
  validatePasswordPolicy: vi.fn().mockReturnValue({ valid: true, errors: [] }),
}));

import { AuthService } from '../modules/auth/auth.service';
import { prisma } from '../config/database';

const mockPrisma = vi.mocked(prisma);

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    authService = new AuthService();
  });

  describe('hashPin', () => {
    it('hashes a PIN with bcrypt', async () => {
      const hash = await AuthService.hashPin('1234');
      expect(hash).toBeTruthy();
      expect(hash).not.toBe('1234');
      const valid = await bcrypt.compare('1234', hash);
      expect(valid).toBe(true);
    });

    it('different PINs produce different hashes', async () => {
      const hash1 = await AuthService.hashPin('1234');
      const hash2 = await AuthService.hashPin('5678');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('login', () => {
    it('throws if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(authService.login('user-1')).rejects.toThrow('Invalid credentials');
    });

    it('throws if user is inactive', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        isActive: false,
        tenantId: 't1',
        role: 'SELLER',
        tenant: {},
      } as never);
      await expect(authService.login('user-1')).rejects.toThrow('Invalid credentials');
    });

    it('throws if PIN is required but not provided', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        isActive: true,
        pinHash: 'some-hash',
        tenantId: 't1',
        role: 'SELLER',
        tenant: {},
      } as never);
      await expect(authService.login('user-1')).rejects.toThrow('PIN required');
    });

    it('throws if PIN is invalid', async () => {
      const pinHash = await bcrypt.hash('1234', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        isActive: true,
        pinHash,
        tenantId: 't1',
        role: 'SELLER',
        tenant: {},
      } as never);
      await expect(authService.login('user-1', 'wrong')).rejects.toThrow('Invalid PIN');
    });

    it('returns tokens on successful login without PIN', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        isActive: true,
        pinHash: null,
        tenantId: 't1',
        role: 'SELLER',
        tenant: {},
      } as never);
      mockPrisma.refreshToken.create.mockResolvedValue({} as never);

      const result = await authService.login('user-1');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(typeof result.accessToken).toBe('string');
      expect(typeof result.refreshToken).toBe('string');

      // Verify the JWT contains the right payload
      const payload = jwt.verify(result.accessToken, 'test-secret-key') as Record<string, unknown>;
      expect(payload.userId).toBe('user-1');
      expect(payload.tenantId).toBe('t1');
      expect(payload.role).toBe('SELLER');
    });

    it('returns tokens on successful login with valid PIN', async () => {
      const pinHash = await bcrypt.hash('1234', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        isActive: true,
        pinHash,
        tenantId: 't1',
        role: 'ADMIN',
        tenant: {},
      } as never);
      mockPrisma.refreshToken.create.mockResolvedValue({} as never);

      const result = await authService.login('user-1', '1234');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('saves refresh token to database', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        isActive: true,
        pinHash: null,
        tenantId: 't1',
        role: 'SELLER',
        tenant: {},
      } as never);
      mockPrisma.refreshToken.create.mockResolvedValue({} as never);

      await authService.login('user-1');
      expect(mockPrisma.refreshToken.create).toHaveBeenCalledOnce();
      const createCall = mockPrisma.refreshToken.create.mock.calls[0][0];
      expect(createCall.data.userId).toBe('user-1');
      expect(createCall.data.token).toBeTruthy();
      expect(createCall.data.expiresAt).toBeInstanceOf(Date);
    });
  });

  describe('refresh', () => {
    it('throws if refresh token not found', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);
      await expect(authService.refresh('bad-token')).rejects.toThrow('Invalid or expired refresh token');
    });

    it('throws and deletes if refresh token expired', async () => {
      const expired = new Date();
      expired.setDate(expired.getDate() - 1);
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        token: 'old-token',
        expiresAt: expired,
        user: { id: 'user-1', tenantId: 't1', role: 'SELLER' },
      } as never);
      mockPrisma.refreshToken.delete.mockResolvedValue({} as never);

      await expect(authService.refresh('old-token')).rejects.toThrow('Invalid or expired refresh token');
      expect(mockPrisma.refreshToken.delete).toHaveBeenCalledWith({ where: { id: 'rt-1' } });
    });

    it('rotates refresh token and returns new tokens', async () => {
      const future = new Date();
      future.setDate(future.getDate() + 5);
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        token: 'valid-token',
        expiresAt: future,
        user: { id: 'user-1', tenantId: 't1', role: 'SELLER' },
      } as never);
      mockPrisma.refreshToken.delete.mockResolvedValue({} as never);
      mockPrisma.refreshToken.create.mockResolvedValue({} as never);

      const result = await authService.refresh('valid-token');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      // Old token should be deleted
      expect(mockPrisma.refreshToken.delete).toHaveBeenCalledWith({ where: { id: 'rt-1' } });
      // New token should be created
      expect(mockPrisma.refreshToken.create).toHaveBeenCalledOnce();
    });
  });

  describe('logout', () => {
    it('deletes refresh tokens matching the given token', async () => {
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 } as never);
      await authService.logout('some-token');
      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { token: 'some-token' },
      });
    });
  });

  describe('loginWithPassword', () => {
    it('throws if user not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      await expect(authService.loginWithPassword('bad@test.com', 'pass')).rejects.toThrow('Invalid email or password');
    });

    it('throws if account is locked', async () => {
      const lockUntil = new Date();
      lockUntil.setMinutes(lockUntil.getMinutes() + 15);
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'u1',
        isActive: true,
        lockedUntil: lockUntil,
        passwordHash: 'hash',
        tenantId: 't1',
        role: 'SELLER',
        failedLoginAttempts: 5,
        tenant: {},
      } as never);
      await expect(authService.loginWithPassword('u@t.com', 'pass')).rejects.toThrow('Account is locked');
    });

    it('increments failed attempts on wrong password', async () => {
      const hash = await bcrypt.hash('correct', 10);
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'u1',
        isActive: true,
        lockedUntil: null,
        passwordHash: hash,
        tenantId: 't1',
        role: 'SELLER',
        failedLoginAttempts: 0,
        tenant: {},
      } as never);
      mockPrisma.user.update.mockResolvedValue({} as never);

      await expect(authService.loginWithPassword('u@t.com', 'wrong')).rejects.toThrow('Invalid email or password');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u1' },
          data: expect.objectContaining({ failedLoginAttempts: 1 }),
        }),
      );
    });

    it('returns tokens on valid password', async () => {
      const hash = await bcrypt.hash('correct', 10);
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'u1',
        isActive: true,
        lockedUntil: null,
        passwordHash: hash,
        tenantId: 't1',
        role: 'ADMIN',
        failedLoginAttempts: 0,
        tenant: {},
      } as never);
      mockPrisma.user.update.mockResolvedValue({} as never);
      mockPrisma.refreshToken.create.mockResolvedValue({} as never);

      const result = await authService.loginWithPassword('u@t.com', 'correct');
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
    });
  });
});
