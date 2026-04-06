import { Prisma, Stage } from '@prisma/client';
import { prisma } from '../../config/database';
import { calcScore, parseEmail } from '@amass/shared';
import type { ClientFilters } from '@amass/shared';
import { NotFoundError } from '../../utils/errors';

const STAGE_MAP: Record<string, Stage> = {
  T1: 'T1',
  T2: 'T2',
  T3: 'T3',
  Contractat: 'CONTRACTED',
  Pierdut: 'LOST',
};

const STAGE_REVERSE: Record<Stage, string> = {
  T1: 'T1',
  T2: 'T2',
  T3: 'T3',
  CONTRACTED: 'Contractat',
  LOST: 'Pierdut',
};

function toDbStage(stage: string): Stage {
  return STAGE_MAP[stage] || 'T1';
}

export class ClientService {
  async list(tenantId: string, filters: ClientFilters) {
    const where: Prisma.ClientWhereInput = { tenantId };

    if (filters.stage) {
      where.stage = toDbStage(filters.stage);
    }
    if (filters.assignedToId) {
      where.assignedToId = filters.assignedToId;
    }
    if (filters.hasSolar !== undefined) {
      where.hasSolarPanels = filters.hasSolar;
    }
    if (filters.search) {
      const s = filters.search;
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s } },
        { email: { contains: s, mode: 'insensitive' } },
        { location: { contains: s, mode: 'insensitive' } },
      ];
    }

    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 200);

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          assignedTo: { select: { id: true, name: true, avatar: true } },
        },
      }),
      prisma.client.count({ where }),
    ]);

    return {
      clients: clients.map(c => ({
        ...c,
        stage: STAGE_REVERSE[c.stage],
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getById(tenantId: string, id: string) {
    const client = await prisma.client.findFirst({
      where: { id, tenantId },
      include: {
        assignedTo: { select: { id: true, name: true, avatar: true } },
        calls: { orderBy: { createdAt: 'desc' }, take: 20 },
        resistances: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!client) throw new Error('Client not found');
    return { ...client, stage: STAGE_REVERSE[client.stage] };
  }

  async create(tenantId: string, userId: string, data: Record<string, unknown>) {
    const clientData: Prisma.ClientCreateInput = {
      tenant: { connect: { id: tenantId } },
      name: (data.name as string) || '',
      phone: (data.phone as string) || '',
      email: (data.email as string) || '',
      location: (data.location as string) || '',
      source: (data.source as string) || '',
      area: (data.area as string) || '',
      stage: data.stage ? toDbStage(data.stage as string) : 'T1',
    };

    if (data.assignedToId) {
      clientData.assignedTo = { connect: { id: data.assignedToId as string } };
    }

    const client = await prisma.client.create({ data: clientData });

    // Calculate and cache score
    const score = calcScore({ ...client, stage: STAGE_REVERSE[client.stage] } as never);
    const updated = await prisma.client.update({
      where: { id: client.id },
      data: { score },
    });

    // Log activity
    await prisma.activityLog.create({
      data: { clientId: client.id, userId, message: `Client creat` },
    });

    return { ...updated, stage: STAGE_REVERSE[updated.stage] };
  }

  async update(tenantId: string, userId: string, id: string, data: Record<string, unknown>) {
    const existing = await prisma.client.findFirst({ where: { id, tenantId } });
    if (!existing) throw new Error('Client not found');

    // Remove stage from general update — use moveStage instead
    const { stage, ...updateData } = data;

    const updated = await prisma.client.update({
      where: { id },
      data: updateData as Prisma.ClientUpdateInput,
    });

    // Recalculate score
    const score = calcScore({ ...updated, stage: STAGE_REVERSE[updated.stage] } as never);
    const final = await prisma.client.update({
      where: { id },
      data: { score },
    });

    await prisma.activityLog.create({
      data: { clientId: id, userId, message: 'Client actualizat' },
    });

    return { ...final, stage: STAGE_REVERSE[final.stage] };
  }

  async moveStage(tenantId: string, userId: string, id: string, newStage: string, lossReason?: string, lossNote?: string) {
    const existing = await prisma.client.findFirst({ where: { id, tenantId } });
    if (!existing) throw new Error('Client not found');

    const oldStage = STAGE_REVERSE[existing.stage];
    const dbStage = toDbStage(newStage);

    const updateData: Prisma.ClientUpdateInput = { stage: dbStage };
    if (newStage === 'Pierdut') {
      updateData.lossReason = lossReason || '';
      updateData.lossNote = lossNote || '';
    }

    const updated = await prisma.client.update({ where: { id }, data: updateData });

    const score = calcScore({ ...updated, stage: newStage } as never);
    await prisma.client.update({ where: { id }, data: { score } });

    await prisma.activityLog.create({
      data: { clientId: id, userId, message: `Mutat din ${oldStage} in ${newStage}` },
    });

    return { ...updated, stage: newStage, score };
  }

  async delete(tenantId: string, id: string) {
    const existing = await prisma.client.findFirst({ where: { id, tenantId } });
    if (!existing) throw new Error('Client not found');
    await prisma.client.delete({ where: { id } });
  }

  async importFromEmail(tenantId: string, userId: string, rawText: string, assignTo?: string) {
    const parsed = parseEmail(rawText);

    // Check for duplicates by phone
    let duplicate = null;
    if (parsed.phone) {
      duplicate = await prisma.client.findFirst({
        where: { tenantId, phone: parsed.phone },
        select: { id: true, name: true, phone: true },
      });
    }

    const client = await this.create(tenantId, userId, {
      name: parsed.name,
      phone: parsed.phone,
      email: parsed.email,
      location: parsed.location,
      area: parsed.area,
      source: 'email-import',
      assignedToId: assignTo || null,
    });

    // Update additional parsed fields
    await prisma.client.update({
      where: { id: client.id },
      data: {
        hasSolarPanels: parsed.hasSolarPanels,
        consumptionAmount: parsed.consumptionAmount,
        formNotes: parsed.formNotes,
      },
    });

    return { client, duplicate, parsed };
  }

  async checkDuplicate(tenantId: string, phone: string) {
    if (!phone) return null;
    return prisma.client.findFirst({
      where: { tenantId, phone },
      select: { id: true, name: true, phone: true, stage: true },
    });
  }

  async exportCsv(tenantId: string): Promise<string> {
    const clients = await prisma.client.findMany({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' },
      include: { assignedTo: { select: { name: true } } },
    });

    const headers = ['Nume', 'Telefon', 'Email', 'Localitate', 'Etapa', 'Scor', 'Suprafata', 'Agent', 'Data creare'];
    const rows = clients.map(c => [
      c.name,
      c.phone,
      c.email,
      c.location,
      STAGE_REVERSE[c.stage],
      c.score.toString(),
      c.area,
      c.assignedTo?.name || '',
      c.createdAt.toISOString().split('T')[0],
    ]);

    const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const csv = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
    return csv;
  }
}
