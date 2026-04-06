import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const { auditCreate, activityCreate } = vi.hoisted(() => ({
  auditCreate: vi.fn().mockReturnValue(Promise.resolve({})),
  activityCreate: vi.fn().mockReturnValue(Promise.resolve({})),
}));

vi.mock('../../config/database', () => ({
  prisma: {
    user: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
    refreshToken: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    tenant: { findUnique: vi.fn(), update: vi.fn() },
    contact: {
      findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(),
      create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn(),
      createMany: vi.fn(),
    },
    company: { findFirst: vi.fn() },
    activity: { create: activityCreate, findMany: vi.fn() },
    auditLog: { create: auditCreate },
    $transaction: vi.fn((fn: any) => fn({
      contact: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
      activity: { create: vi.fn(), updateMany: vi.fn() },
      deal: { updateMany: vi.fn() },
    })),
  },
}));

vi.mock('../../events/event-bus', () => ({
  eventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn(), removeAllListeners: vi.fn() },
}));

import { TEST_TENANT_ID, authHeader, testUser } from './setup';
import app from '../../app';
import { prisma } from '../../config/database';

const mockPrisma = vi.mocked(prisma);

describe('Contacts API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/v1/contacts', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/v1/contacts');
      expect(res.status).toBe(401);
    });

    it('returns contacts list with auth', async () => {
      mockPrisma.contact.findMany.mockResolvedValue([]);
      mockPrisma.contact.count.mockResolvedValue(0);

      const res = await request(app)
        .get('/api/v1/contacts')
        .set('Authorization', authHeader());

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/v1/contacts', () => {
    it('returns 400 with invalid body', async () => {
      const res = await request(app)
        .post('/api/v1/contacts')
        .set('Authorization', authHeader())
        .send({});

      expect(res.status).toBe(400);
    });

    it('validates firstName is required', async () => {
      const res = await request(app)
        .post('/api/v1/contacts')
        .set('Authorization', authHeader())
        .send({ lastName: 'Doe' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('creates contact with valid data', async () => {
      const mockContact = {
        id: 'contact-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        tenantId: TEST_TENANT_ID,
      };
      mockPrisma.contact.create.mockResolvedValue(mockContact as never);
      activityCreate.mockResolvedValue({} as never);

      const res = await request(app)
        .post('/api/v1/contacts')
        .set('Authorization', authHeader())
        .send({ firstName: 'John', lastName: 'Doe', email: 'john@example.com' });

      expect(res.status).toBe(201);
      expect(res.body.firstName).toBe('John');
    });
  });

  describe('DELETE /api/v1/contacts/:id', () => {
    it('returns 403 for non-admin/manager', async () => {
      const sellerAuth = authHeader({
        userId: 'user-seller',
        tenantId: TEST_TENANT_ID,
        role: 'SELLER',
      });

      const res = await request(app)
        .delete('/api/v1/contacts/contact-1')
        .set('Authorization', sellerAuth);

      expect(res.status).toBe(403);
    });
  });
});
