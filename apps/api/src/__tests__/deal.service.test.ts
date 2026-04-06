import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma
vi.mock('../config/database', () => ({
  prisma: {
    deal: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    pipeline: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    pipelineStage: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    activity: {
      create: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
    dealContact: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    dealLineItem: {
      deleteMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock event bus
vi.mock('../events/event-bus', () => ({
  eventBus: {
    emit: vi.fn(),
  },
}));

// Mock errors
vi.mock('../utils/errors', () => ({
  NotFoundError: class extends Error {
    statusCode = 404;
    constructor(entity: string) {
      super(`${entity} not found`);
    }
  },
}));

import { DealService } from '../modules/deals/deal.service';
import { prisma } from '../config/database';
import { eventBus } from '../events/event-bus';

const mockPrisma = vi.mocked(prisma);

describe('DealService', () => {
  let service: DealService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DealService();
  });

  describe('list', () => {
    it('returns paginated deals', async () => {
      mockPrisma.deal.findMany.mockResolvedValue([
        { id: 'd1', title: 'Deal 1', value: 1000 } as never,
      ]);
      mockPrisma.deal.count.mockResolvedValue(1);

      const result = await service.list('t1', {});
      expect(result.deals).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it('applies pipeline filter', async () => {
      mockPrisma.deal.findMany.mockResolvedValue([]);
      mockPrisma.deal.count.mockResolvedValue(0);

      await service.list('t1', { pipelineId: 'p1' });
      const where = mockPrisma.deal.findMany.mock.calls[0][0]!.where;
      expect(where).toHaveProperty('pipelineId', 'p1');
    });

    it('applies search filter', async () => {
      mockPrisma.deal.findMany.mockResolvedValue([]);
      mockPrisma.deal.count.mockResolvedValue(0);

      await service.list('t1', { search: 'test' });
      const where = mockPrisma.deal.findMany.mock.calls[0][0]!.where;
      expect(where).toHaveProperty('OR');
    });

    it('applies value range filter', async () => {
      mockPrisma.deal.findMany.mockResolvedValue([]);
      mockPrisma.deal.count.mockResolvedValue(0);

      await service.list('t1', { minValue: 100, maxValue: 500 });
      const where = mockPrisma.deal.findMany.mock.calls[0][0]!.where as Record<string, unknown>;
      expect(where.value).toEqual({ gte: 100, lte: 500 });
    });

    it('applies status filter for open deals', async () => {
      mockPrisma.deal.findMany.mockResolvedValue([]);
      mockPrisma.deal.count.mockResolvedValue(0);

      await service.list('t1', { status: 'open' });
      const where = mockPrisma.deal.findMany.mock.calls[0][0]!.where as Record<string, unknown>;
      expect(where.wonAt).toBeNull();
      expect(where.lostAt).toBeNull();
    });

    it('applies status filter for won deals', async () => {
      mockPrisma.deal.findMany.mockResolvedValue([]);
      mockPrisma.deal.count.mockResolvedValue(0);

      await service.list('t1', { status: 'won' });
      const where = mockPrisma.deal.findMany.mock.calls[0][0]!.where as Record<string, unknown>;
      expect(where.wonAt).toEqual({ not: null });
    });

    it('limits page size to max 200', async () => {
      mockPrisma.deal.findMany.mockResolvedValue([]);
      mockPrisma.deal.count.mockResolvedValue(0);

      await service.list('t1', { limit: 500 });
      const take = mockPrisma.deal.findMany.mock.calls[0][0]!.take;
      expect(take).toBe(200);
    });

    it('uses descending sort by default', async () => {
      mockPrisma.deal.findMany.mockResolvedValue([]);
      mockPrisma.deal.count.mockResolvedValue(0);

      await service.list('t1', {});
      const orderBy = mockPrisma.deal.findMany.mock.calls[0][0]!.orderBy;
      expect(orderBy).toEqual({ createdAt: 'desc' });
    });

    it('handles custom sort field with direction', async () => {
      mockPrisma.deal.findMany.mockResolvedValue([]);
      mockPrisma.deal.count.mockResolvedValue(0);

      await service.list('t1', { sort: '-value' });
      const orderBy = mockPrisma.deal.findMany.mock.calls[0][0]!.orderBy;
      expect(orderBy).toEqual({ value: 'desc' });
    });

    it('handles ascending sort', async () => {
      mockPrisma.deal.findMany.mockResolvedValue([]);
      mockPrisma.deal.count.mockResolvedValue(0);

      await service.list('t1', { sort: 'title' });
      const orderBy = mockPrisma.deal.findMany.mock.calls[0][0]!.orderBy;
      expect(orderBy).toEqual({ title: 'asc' });
    });
  });

  describe('getById', () => {
    it('returns deal if found', async () => {
      mockPrisma.deal.findFirst.mockResolvedValue({
        id: 'd1',
        title: 'Test Deal',
        stage: {},
        pipeline: {},
      } as never);

      const result = await service.getById('t1', 'd1');
      expect(result.id).toBe('d1');
    });

    it('throws NotFoundError if deal not found', async () => {
      mockPrisma.deal.findFirst.mockResolvedValue(null);
      await expect(service.getById('t1', 'bad')).rejects.toThrow('Deal not found');
    });
  });

  describe('moveStage', () => {
    it('throws if deal not found', async () => {
      mockPrisma.deal.findFirst.mockResolvedValue(null);
      await expect(service.moveStage('t1', 'u1', 'bad', 's1')).rejects.toThrow('Deal not found');
    });

    it('throws if new stage not found', async () => {
      mockPrisma.deal.findFirst.mockResolvedValue({
        id: 'd1',
        tenantId: 't1',
        stageId: 'old-s',
        pipelineId: 'p1',
        stage: { name: 'Qualification' },
      } as never);
      mockPrisma.pipelineStage.findUnique.mockResolvedValue(null);

      await expect(service.moveStage('t1', 'u1', 'd1', 'bad-stage')).rejects.toThrow('Stage not found');
    });

    it('sets wonAt when moving to won stage', async () => {
      mockPrisma.deal.findFirst.mockResolvedValue({
        id: 'd1',
        tenantId: 't1',
        stageId: 'old-s',
        pipelineId: 'p1',
        stage: { name: 'Negotiation' },
      } as never);
      mockPrisma.pipelineStage.findUnique.mockResolvedValue({
        id: 'won-s',
        name: 'Won',
        probability: 100,
        isWon: true,
        isLost: false,
      } as never);
      mockPrisma.deal.update.mockResolvedValue({
        id: 'd1',
        stage: { name: 'Won' },
        value: 1000,
      } as never);
      mockPrisma.activity.create.mockResolvedValue({} as never);

      await service.moveStage('t1', 'u1', 'd1', 'won-s');

      const updateData = mockPrisma.deal.update.mock.calls[0][0].data as Record<string, unknown>;
      expect(updateData.wonAt).toBeInstanceOf(Date);
      expect(updateData.closedAt).toBeInstanceOf(Date);
      expect(updateData.lostAt).toBeNull();
    });

    it('sets lostAt and lossReason when moving to lost stage', async () => {
      mockPrisma.deal.findFirst.mockResolvedValue({
        id: 'd1',
        tenantId: 't1',
        stageId: 'old-s',
        pipelineId: 'p1',
        stage: { name: 'Negotiation' },
      } as never);
      mockPrisma.pipelineStage.findUnique.mockResolvedValue({
        id: 'lost-s',
        name: 'Lost',
        probability: 0,
        isWon: false,
        isLost: true,
      } as never);
      mockPrisma.deal.update.mockResolvedValue({
        id: 'd1',
        stage: { name: 'Lost' },
      } as never);
      mockPrisma.activity.create.mockResolvedValue({} as never);

      await service.moveStage('t1', 'u1', 'd1', 'lost-s', 'Price too high', 'Could not negotiate');

      const updateData = mockPrisma.deal.update.mock.calls[0][0].data as Record<string, unknown>;
      expect(updateData.lostAt).toBeInstanceOf(Date);
      expect(updateData.closedAt).toBeInstanceOf(Date);
      expect(updateData.wonAt).toBeNull();
      expect(updateData.lossReason).toBe('Price too high');
      expect(updateData.lossNote).toBe('Could not negotiate');
    });

    it('clears won/lost timestamps when moving to regular stage', async () => {
      mockPrisma.deal.findFirst.mockResolvedValue({
        id: 'd1',
        tenantId: 't1',
        stageId: 'old-s',
        pipelineId: 'p1',
        stage: { name: 'Won' },
      } as never);
      mockPrisma.pipelineStage.findUnique.mockResolvedValue({
        id: 'reg-s',
        name: 'Proposal',
        probability: 50,
        isWon: false,
        isLost: false,
      } as never);
      mockPrisma.deal.update.mockResolvedValue({
        id: 'd1',
        stage: { name: 'Proposal' },
      } as never);
      mockPrisma.activity.create.mockResolvedValue({} as never);

      await service.moveStage('t1', 'u1', 'd1', 'reg-s');

      const updateData = mockPrisma.deal.update.mock.calls[0][0].data as Record<string, unknown>;
      expect(updateData.wonAt).toBeNull();
      expect(updateData.lostAt).toBeNull();
      expect(updateData.closedAt).toBeNull();
    });

    it('emits deal.won event for won stage', async () => {
      mockPrisma.deal.findFirst.mockResolvedValue({
        id: 'd1',
        tenantId: 't1',
        stageId: 'old-s',
        pipelineId: 'p1',
        stage: { name: 'Negotiation' },
      } as never);
      mockPrisma.pipelineStage.findUnique.mockResolvedValue({
        id: 'won-s',
        name: 'Won',
        probability: 100,
        isWon: true,
        isLost: false,
      } as never);
      mockPrisma.deal.update.mockResolvedValue({
        id: 'd1',
        stage: { name: 'Won' },
        value: 5000,
      } as never);
      mockPrisma.activity.create.mockResolvedValue({} as never);

      await service.moveStage('t1', 'u1', 'd1', 'won-s');

      expect(vi.mocked(eventBus.emit)).toHaveBeenCalledWith(
        'deal.won',
        expect.objectContaining({ dealId: 'd1', value: 5000 }),
      );
    });
  });

  describe('delete', () => {
    it('throws if deal not found', async () => {
      mockPrisma.deal.findFirst.mockResolvedValue(null);
      await expect(service.delete('t1', 'bad')).rejects.toThrow('Deal not found');
    });

    it('deletes the deal and emits event', async () => {
      mockPrisma.deal.findFirst.mockResolvedValue({ id: 'd1', tenantId: 't1' } as never);
      mockPrisma.deal.delete.mockResolvedValue({} as never);

      await service.delete('t1', 'd1');
      expect(mockPrisma.deal.delete).toHaveBeenCalledWith({ where: { id: 'd1' } });
      expect(vi.mocked(eventBus.emit)).toHaveBeenCalledWith(
        'deal.deleted',
        expect.objectContaining({ dealId: 'd1' }),
      );
    });
  });
});
