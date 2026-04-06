import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma
vi.mock('../config/database', () => ({
  prisma: {
    client: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    activityLog: {
      create: vi.fn(),
    },
  },
}));

// Mock @amass/shared
vi.mock('@amass/shared', () => ({
  calcScore: vi.fn().mockReturnValue(42),
  parseEmail: vi.fn().mockReturnValue({
    name: 'Test',
    email: 'test@test.com',
    phone: '0712345678',
    area: '100',
    location: 'Bucuresti',
    hasSolarPanels: false,
    consumptionAmount: '',
    currentSystem: '',
    stage: '',
    formNotes: '',
    desiredSystem: '',
    monthlyPayment: '',
  }),
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

import { ClientService } from '../modules/clients/client.service';
import { prisma } from '../config/database';

const mockPrisma = vi.mocked(prisma);

describe('ClientService', () => {
  let service: ClientService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ClientService();
  });

  describe('list', () => {
    it('returns paginated clients with stage reverse-mapped', async () => {
      mockPrisma.client.findMany.mockResolvedValue([
        { id: 'c1', name: 'Test', stage: 'T1', assignedTo: null } as never,
        { id: 'c2', name: 'Test2', stage: 'CONTRACTED', assignedTo: null } as never,
      ]);
      mockPrisma.client.count.mockResolvedValue(2);

      const result = await service.list('t1', {});
      expect(result.clients).toHaveLength(2);
      expect(result.clients[0].stage).toBe('T1');
      expect(result.clients[1].stage).toBe('Contractat');
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });

    it('applies stage filter', async () => {
      mockPrisma.client.findMany.mockResolvedValue([]);
      mockPrisma.client.count.mockResolvedValue(0);

      await service.list('t1', { stage: 'T2' });
      const where = mockPrisma.client.findMany.mock.calls[0][0]!.where;
      expect(where).toHaveProperty('stage', 'T2');
    });

    it('applies search filter with OR conditions', async () => {
      mockPrisma.client.findMany.mockResolvedValue([]);
      mockPrisma.client.count.mockResolvedValue(0);

      await service.list('t1', { search: 'ion' });
      const where = mockPrisma.client.findMany.mock.calls[0][0]!.where;
      expect(where).toHaveProperty('OR');
      expect((where as Record<string, unknown>).OR).toHaveLength(4);
    });

    it('applies assignedToId filter', async () => {
      mockPrisma.client.findMany.mockResolvedValue([]);
      mockPrisma.client.count.mockResolvedValue(0);

      await service.list('t1', { assignedToId: 'seller-1' });
      const where = mockPrisma.client.findMany.mock.calls[0][0]!.where;
      expect(where).toHaveProperty('assignedToId', 'seller-1');
    });

    it('applies hasSolar filter', async () => {
      mockPrisma.client.findMany.mockResolvedValue([]);
      mockPrisma.client.count.mockResolvedValue(0);

      await service.list('t1', { hasSolar: true });
      const where = mockPrisma.client.findMany.mock.calls[0][0]!.where;
      expect(where).toHaveProperty('hasSolarPanels', true);
    });

    it('limits page size to 200', async () => {
      mockPrisma.client.findMany.mockResolvedValue([]);
      mockPrisma.client.count.mockResolvedValue(0);

      await service.list('t1', { limit: 500 });
      const take = mockPrisma.client.findMany.mock.calls[0][0]!.take;
      expect(take).toBe(200);
    });
  });

  describe('getById', () => {
    it('returns client with reverse-mapped stage', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({
        id: 'c1',
        name: 'Test',
        stage: 'LOST',
        assignedTo: null,
        calls: [],
        resistances: [],
      } as never);

      const result = await service.getById('t1', 'c1');
      expect(result.stage).toBe('Pierdut');
    });

    it('throws if client not found', async () => {
      mockPrisma.client.findFirst.mockResolvedValue(null);
      await expect(service.getById('t1', 'bad-id')).rejects.toThrow('Client not found');
    });
  });

  describe('create', () => {
    it('creates a client with default T1 stage and calculates score', async () => {
      mockPrisma.client.create.mockResolvedValue({
        id: 'c1',
        name: 'New Client',
        stage: 'T1',
        tenantId: 't1',
      } as never);
      mockPrisma.client.update.mockResolvedValue({
        id: 'c1',
        name: 'New Client',
        stage: 'T1',
        score: 42,
      } as never);
      mockPrisma.activityLog.create.mockResolvedValue({} as never);

      const result = await service.create('t1', 'u1', { name: 'New Client', phone: '123' });
      expect(result.stage).toBe('T1');
      expect(mockPrisma.activityLog.create).toHaveBeenCalledOnce();
    });
  });

  describe('moveStage', () => {
    it('throws if client not found', async () => {
      mockPrisma.client.findFirst.mockResolvedValue(null);
      await expect(service.moveStage('t1', 'u1', 'bad', 'T2')).rejects.toThrow('Client not found');
    });

    it('moves client to new stage and recalculates score', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({
        id: 'c1',
        stage: 'T1',
        tenantId: 't1',
      } as never);
      mockPrisma.client.update.mockResolvedValue({
        id: 'c1',
        stage: 'T2',
      } as never);
      mockPrisma.activityLog.create.mockResolvedValue({} as never);

      const result = await service.moveStage('t1', 'u1', 'c1', 'T2');
      expect(result.stage).toBe('T2');
      expect(mockPrisma.client.update).toHaveBeenCalled();
    });

    it('sets loss reason when moving to Pierdut', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({
        id: 'c1',
        stage: 'T2',
        tenantId: 't1',
      } as never);
      mockPrisma.client.update.mockResolvedValue({
        id: 'c1',
        stage: 'LOST',
      } as never);
      mockPrisma.activityLog.create.mockResolvedValue({} as never);

      await service.moveStage('t1', 'u1', 'c1', 'Pierdut', 'Pret prea mare', 'Note pierdere');
      const updateCall = mockPrisma.client.update.mock.calls[0][0];
      expect(updateCall.data).toHaveProperty('lossReason', 'Pret prea mare');
      expect(updateCall.data).toHaveProperty('lossNote', 'Note pierdere');
    });
  });

  describe('delete', () => {
    it('throws if client not found', async () => {
      mockPrisma.client.findFirst.mockResolvedValue(null);
      await expect(service.delete('t1', 'bad')).rejects.toThrow('Client not found');
    });

    it('deletes the client', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: 'c1', tenantId: 't1' } as never);
      mockPrisma.client.delete.mockResolvedValue({} as never);

      await service.delete('t1', 'c1');
      expect(mockPrisma.client.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
    });
  });
});
