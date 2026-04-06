import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';

interface ActivityFilters {
  contactId?: string;
  dealId?: string;
  companyId?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

interface StatsFilters {
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export class ActivityService {
  async list(tenantId: string, filters: ActivityFilters) {
    const where: Prisma.ActivityWhereInput = { tenantId };

    if (filters.contactId) where.contactId = filters.contactId;
    if (filters.dealId) where.dealId = filters.dealId;
    if (filters.companyId) where.companyId = filters.companyId;
    if (filters.type) where.type = filters.type;

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }

    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 200);

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, name: true, avatar: true } },
        },
      }),
      prisma.activity.count({ where }),
    ]);

    return { activities, total, page, totalPages: Math.ceil(total / limit) };
  }

  async create(tenantId: string, userId: string, data: Record<string, unknown>) {
    const activity = await prisma.activity.create({
      data: {
        tenant: { connect: { id: tenantId } },
        user: { connect: { id: userId } },
        type: data.type as string,
        subject: (data.subject as string) || '',
        body: (data.body as string) || '',
        metadata: (data.metadata as Prisma.JsonObject) || {},
        ...(data.contactId ? { contact: { connect: { id: data.contactId as string } } } : {}),
        ...(data.dealId ? { deal: { connect: { id: data.dealId as string } } } : {}),
        ...(data.companyId ? { companyId: data.companyId as string } : {}),
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    });

    // Update contact.lastContactedAt for interaction types
    const interactionTypes = ['call', 'email', 'meeting'];
    if (data.contactId && interactionTypes.includes(data.type as string)) {
      await prisma.contact.update({
        where: { id: data.contactId as string },
        data: { lastContactedAt: new Date() },
      });
    }

    return activity;
  }

  async getTimeline(tenantId: string, entityType: string, entityId: string) {
    const entityFilter: Prisma.ActivityWhereInput = { tenantId };

    if (entityType === 'contact') entityFilter.contactId = entityId;
    else if (entityType === 'deal') entityFilter.dealId = entityId;
    else if (entityType === 'company') entityFilter.companyId = entityId;

    // Fetch activities
    const activities = await prisma.activity.findMany({
      where: entityFilter,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    });

    // Fetch completed tasks related to this entity
    const taskFilter: Prisma.TaskWhereInput = { tenantId, status: 'completed' };
    if (entityType === 'contact') taskFilter.contactId = entityId;
    else if (entityType === 'deal') taskFilter.dealId = entityId;

    const completedTasks = entityType !== 'company'
      ? await prisma.task.findMany({
          where: taskFilter,
          orderBy: { completedAt: 'desc' },
          include: {
            user: { select: { id: true, name: true, avatar: true } },
          },
        })
      : [];

    // Fetch email messages if contact
    const emails = entityType === 'contact'
      ? await prisma.emailMessage.findMany({
          where: { tenantId, contactId: entityId },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            subject: true,
            direction: true,
            fromEmail: true,
            status: true,
            sentAt: true,
            receivedAt: true,
            createdAt: true,
          },
        })
      : [];

    // Fetch SMS messages if contact
    const smsMessages = entityType === 'contact'
      ? await prisma.smsMessage.findMany({
          where: { tenantId, contactId: entityId },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            direction: true,
            body: true,
            status: true,
            createdAt: true,
          },
        })
      : [];

    // Combine into unified timeline
    type TimelineItem = {
      id: string;
      type: string;
      subject: string;
      body?: string;
      metadata?: unknown;
      user?: { id: string; name: string; avatar: string | null };
      createdAt: Date;
    };

    const timeline: TimelineItem[] = [];

    for (const a of activities) {
      timeline.push({
        id: a.id,
        type: a.type,
        subject: a.subject,
        body: a.body,
        metadata: a.metadata,
        user: a.user,
        createdAt: a.createdAt,
      });
    }

    for (const t of completedTasks) {
      timeline.push({
        id: t.id,
        type: 'task_completed',
        subject: t.title,
        body: t.description,
        user: t.user,
        createdAt: t.completedAt || t.updatedAt,
      });
    }

    for (const e of emails) {
      timeline.push({
        id: e.id,
        type: 'email_message',
        subject: e.subject,
        metadata: { direction: e.direction, fromEmail: e.fromEmail, status: e.status },
        createdAt: e.sentAt || e.receivedAt || e.createdAt,
      });
    }

    for (const s of smsMessages) {
      timeline.push({
        id: s.id,
        type: 'sms_message',
        subject: s.body.substring(0, 100),
        metadata: { direction: s.direction, status: s.status },
        createdAt: s.createdAt,
      });
    }

    // Sort combined timeline by date descending
    timeline.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return timeline;
  }

  async getStats(tenantId: string, filters: StatsFilters = {}) {
    const where: Prisma.ActivityWhereInput = { tenantId };

    if (filters.userId) where.userId = filters.userId;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }

    // Counts by type
    const byType = await prisma.activity.groupBy({
      by: ['type'],
      where,
      _count: { id: true },
    });

    // Counts by day
    const activities = await prisma.activity.findMany({
      where,
      select: { type: true, userId: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const byDay: Record<string, Record<string, number>> = {};
    const byUserType: Record<string, Record<string, number>> = {};

    for (const a of activities) {
      const day = a.createdAt.toISOString().split('T')[0];

      if (!byDay[day]) byDay[day] = {};
      byDay[day][a.type] = (byDay[day][a.type] || 0) + 1;

      // Leaderboard: per agent per type
      const userKey = a.userId;
      if (!byUserType[userKey]) byUserType[userKey] = {};
      byUserType[userKey][a.type] = (byUserType[userKey][a.type] || 0) + 1;
    }

    return {
      byType: byType.map(item => ({ type: item.type, count: item._count.id })),
      byDay,
      leaderboard: byUserType,
    };
  }
}
