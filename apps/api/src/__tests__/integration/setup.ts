import { vi } from 'vitest';
import jwt from 'jsonwebtoken';

const TEST_JWT_SECRET = 'test-secret-key-for-integration';

// Mock env before anything imports it
vi.mock('../../config/env', () => ({
  env: {
    JWT_SECRET: TEST_JWT_SECRET,
    JWT_EXPIRES_IN: '15m',
    CORS_ORIGIN: '*',
    NODE_ENV: 'test',
    API_PORT: 0,
    REDIS_URL: '',
    SMTP_HOST: '',
    STRIPE_SECRET_KEY: '',
    OPENAI_API_KEY: '',
  },
}));

// Mock the event bus to prevent side effects
vi.mock('../../events/event-bus', () => ({
  eventBus: {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    removeAllListeners: vi.fn(),
  },
}));

/**
 * Creates a mock prisma.auditLog.create that returns a thenable (Promise-like).
 * The audit middleware calls `.catch()` directly on the return value.
 */
export function mockAuditLogCreate() {
  return vi.fn().mockReturnValue(Promise.resolve({}));
}

export function generateTestToken(payload: {
  userId: string;
  tenantId: string;
  role: string;
}): string {
  return jwt.sign(payload, TEST_JWT_SECRET, { expiresIn: '15m' });
}

export const TEST_TENANT_ID = 'tenant-test-001';
export const TEST_USER_ID = 'user-test-001';

export const testUser = {
  userId: TEST_USER_ID,
  tenantId: TEST_TENANT_ID,
  role: 'ADMIN' as const,
};

export function authHeader(user = testUser) {
  return `Bearer ${generateTestToken(user)}`;
}
