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
    deal: {
      findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(),
      create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn(),
      groupBy: vi.fn(),
    },
    pipeline: { findFirst: vi.fn(), findMany: vi.fn() },
    pipelineStage: { findFirst: vi.fn(), findMany: vi.fn() },
    dealLineItem: { createMany: vi.fn(), deleteMany: vi.fn() },
    activity: { create: activityCreate, findMany: vi.fn() },
    tag: { findMany: vi.fn(), connectOrCreate: vi.fn() },
    auditLog: { create: auditCreate },
    exchangeRate: { findFirst: vi.fn() },
    $transaction: vi.fn((fn: any) => fn({
      deal: { create: vi.fn(), update: vi.fn() },
      dealLineItem: { createMany: vi.fn(), deleteMany: vi.fn() },
      activity: { create: vi.fn() },
    })),
  },
}));

vi.mock('../../events/event-bus', () => ({
  eventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn(), removeAllListeners: vi.fn() },
}));

import { TEST_TENANT_ID, TEST_USER_ID, authHeader } from './setup';
import app from '../../app';
import { prisma } from '../../config/database';

const mockPrisma = vi.mocked(prisma);

describe('Deals API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/v1/deals', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/v1/deals');
      expect(res.status).toBe(401);
    });

    it('returns deals list with auth', async () => {
      mockPrisma.deal.findMany.mockResolvedValue([]);
      mockPrisma.deal.count.mockResolvedValue(0);

      const res = await request(app)
        .get('/api/v1/deals')
        .set('Authorization', authHeader());

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('deals');
      expect(res.body).toHaveProperty('total');
    });
  });

  describe('POST /api/v1/deals', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app)
        .post('/api/v1/deals')
        .send({ title: 'Test Deal' });

      expect(res.status).toBe(401);
    });

    it('returns 400 with invalid body (missing title)', async () => {
      const res = await request(app)
        .post('/api/v1/deals')
        .set('Authorization', authHeader())
        .send({});

      expect(res.status).toBe(400);
    });

    it('validates deal creation schema', async () => {
      const res = await request(app)
        .post('/api/v1/deals')
        .set('Authorization', authHeader())
        .send({ title: '', value: -100 });

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/v1/deals/:id/stage', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app)
        .patch('/api/v1/deals/deal-1/stage')
        .send({ stageId: 'stage-2' });

      expect(res.status).toBe(401);
    });

    it('returns 400 without stageId', async () => {
      const res = await request(app)
        .patch('/api/v1/deals/deal-1/stage')
        .set('Authorization', authHeader())
        .send({});

      expect(res.status).toBe(400);
    });
  });
});
