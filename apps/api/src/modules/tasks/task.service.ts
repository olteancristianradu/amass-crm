import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { NotFoundError } from '../../utils/errors';
import { eventBus } from '../../events/event-bus';

interface TaskFilters {
  status?: string;
  priority?: string;
  type?: string;
  userId?: string;
  contactId?: string;
  dealId?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  overdue?: boolean;
  page?: number;
  limit?: number;
  sort?: string;
}

/**
 * Parse a recurrence rule string (e.g. "FREQ=WEEKLY;INTERVAL=2") and calculate
 * the next due date from the given base date.
 */
function calculateNextDueDate(baseDate: Date, recurrenceRule: string): Date {
  const parts: Record<string, string> = {};
  for (const segment of recurrenceRule.split(';')) {
    const [key, value] = segment.split('=');
    if (key && value) parts[key.trim()] = value.trim();
  }

  const freq = parts['FREQ'] || 'WEEKLY';
  const interval = parseInt(parts['INTERVAL'] || '1', 10);
  const next = new Date(baseDate);

  switch (freq.toUpperCase()) {
    case 'DAILY':
      next.setDate(next.getDate() + interval);
      break;
    case 'WEEKLY':
      next.setDate(next.getDate() + 7 * interval);
      break;
    case 'MONTHLY':
      next.setMonth(next.getMonth() + interval);
      break;
    case 'YEARLY':
      next.setFullYear(next.getFullYear() + interval);
      break;
    default:
      next.setDate(next.getDate() + 7 * interval);
  }

  return next;
}

export class TaskService {
  async list(tenantId: string, userId: string, filters: TaskFilters) {
    const where: Prisma.TaskWhereInput = { tenantId };

    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.type) where.type = filters.type;
    if (filters.userId) where.userId = filters.userId;
    if (filters.contactId) where.contactId = filters.contactId;
    if (filters.dealId) where.dealId = filters.dealId;

    if (filters.dueDateFrom || filters.dueDateTo) {
      where.dueDate = {};
      if (filters.dueDateFrom) where.dueDate.gte = new Date(filters.dueDateFrom);
      if (filters.dueDateTo) where.dueDate.lte = new Date(filters.dueDateTo);
    }

    if (filters.overdue) {
      where.dueDate = { lt: new Date() };
      where.status = { notIn: ['completed', 'cancelled'] };
    }

    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 200);

    const orderBy: Prisma.TaskOrderByWithRelationInput =
      filters.sort === 'priority' ? { priority: 'asc' } :
      filters.sort === 'createdAt' ? { createdAt: 'desc' } :
      { dueDate: 'asc' };

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          contact: { select: { id: true, firstName: true, lastName: true } },
          deal: { select: { id: true, title: true } },
          user: { select: { id: true, name: true, avatar: true } },
        },
      }),
      prisma.task.count({ where }),
    ]);

    return { tasks, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getById(tenantId: string, id: string) {
    const task = await prisma.task.findFirst({
      where: { id, tenantId },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        deal: { select: { id: true, title: true } },
        user: { select: { id: true, name: true, avatar: true } },
        createdBy: { select: { id: true, name: true, avatar: true } },
      },
    });
    if (!task) throw new NotFoundError('Task');
    return task;
  }

  async create(tenantId: string, createdById: string, data: Record<string, unknown>) {
    const assigneeId = (data.userId as string) || createdById;

    const task = await prisma.task.create({
      data: {
        tenant: { connect: { id: tenantId } },
        user: { connect: { id: assigneeId } },
        createdBy: { connect: { id: createdById } },
        title: data.title as string,
        description: (data.description as string) || '',
        type: (data.type as string) || 'todo',
        priority: (data.priority as string) || 'medium',
        dueDate: data.dueDate ? new Date(data.dueDate as string) : null,
        isRecurring: (data.isRecurring as boolean) || false,
        recurrenceRule: (data.recurrenceRule as string) || null,
        reminderAt: data.reminderAt ? new Date(data.reminderAt as string) : null,
        ...(data.contactId ? { contact: { connect: { id: data.contactId as string } } } : {}),
        ...(data.dealId ? { deal: { connect: { id: data.dealId as string } } } : {}),
      },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        deal: { select: { id: true, title: true } },
        user: { select: { id: true, name: true, avatar: true } },
      },
    });

    // Log activity on linked contact/deal
    if (data.contactId || data.dealId) {
      await prisma.activity.create({
        data: {
          tenant: { connect: { id: tenantId } },
          user: { connect: { id: createdById } },
          type: 'task',
          subject: `Task created: ${data.title}`,
          ...(data.contactId ? { contact: { connect: { id: data.contactId as string } } } : {}),
          ...(data.dealId ? { deal: { connect: { id: data.dealId as string } } } : {}),
        },
      });
    }

    eventBus.emit('task.created', { tenantId, taskId: task.id, userId: createdById, assignedToId: assigneeId });

    return task;
  }

  async update(tenantId: string, userId: string, id: string, data: Record<string, unknown>) {
    const existing = await prisma.task.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError('Task');

    const updateData: Prisma.TaskUpdateInput = {};

    if (data.title !== undefined) updateData.title = data.title as string;
    if (data.description !== undefined) updateData.description = data.description as string;
    if (data.type !== undefined) updateData.type = data.type as string;
    if (data.priority !== undefined) updateData.priority = data.priority as string;
    if (data.status !== undefined) updateData.status = data.status as string;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate as string) : null;
    if (data.isRecurring !== undefined) updateData.isRecurring = data.isRecurring as boolean;
    if (data.recurrenceRule !== undefined) updateData.recurrenceRule = (data.recurrenceRule as string) || null;
    if (data.reminderAt !== undefined) updateData.reminderAt = data.reminderAt ? new Date(data.reminderAt as string) : null;

    if (data.userId !== undefined) {
      updateData.user = { connect: { id: data.userId as string } };
    }
    if (data.contactId !== undefined) {
      updateData.contact = data.contactId ? { connect: { id: data.contactId as string } } : { disconnect: true };
    }
    if (data.dealId !== undefined) {
      updateData.deal = data.dealId ? { connect: { id: data.dealId as string } } : { disconnect: true };
    }

    // If status changes to 'completed', set completedAt
    if (data.status === 'completed' && existing.status !== 'completed') {
      updateData.completedAt = new Date();
    }

    const updated = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        deal: { select: { id: true, title: true } },
        user: { select: { id: true, name: true, avatar: true } },
      },
    });

    // If recurring task completed, auto-create next occurrence
    if (
      data.status === 'completed' &&
      existing.status !== 'completed' &&
      existing.isRecurring &&
      existing.recurrenceRule &&
      existing.dueDate
    ) {
      const nextDueDate = calculateNextDueDate(existing.dueDate, existing.recurrenceRule);

      await prisma.task.create({
        data: {
          tenant: { connect: { id: tenantId } },
          user: { connect: { id: existing.userId } },
          createdBy: { connect: { id: existing.createdById } },
          title: existing.title,
          description: existing.description,
          type: existing.type,
          priority: existing.priority,
          status: 'open',
          dueDate: nextDueDate,
          isRecurring: true,
          recurrenceRule: existing.recurrenceRule,
          reminderAt: existing.reminderAt
            ? calculateNextDueDate(existing.reminderAt, existing.recurrenceRule)
            : null,
          ...(existing.contactId ? { contact: { connect: { id: existing.contactId } } } : {}),
          ...(existing.dealId ? { deal: { connect: { id: existing.dealId } } } : {}),
        },
      });
    }

    if (data.status === 'completed' && existing.status !== 'completed') {
      eventBus.emit('task.completed', { tenantId, taskId: id, userId });
    }

    return updated;
  }

  async delete(tenantId: string, id: string) {
    const existing = await prisma.task.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError('Task');
    await prisma.task.delete({ where: { id } });
  }

  async getOverdue(tenantId: string) {
    const tasks = await prisma.task.findMany({
      where: {
        tenantId,
        dueDate: { lt: new Date() },
        status: { notIn: ['completed', 'cancelled'] },
      },
      orderBy: { dueDate: 'asc' },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        deal: { select: { id: true, title: true } },
        user: { select: { id: true, name: true, avatar: true } },
      },
    });

    // Group by userId
    const grouped: Record<string, typeof tasks> = {};
    for (const task of tasks) {
      if (!grouped[task.userId]) grouped[task.userId] = [];
      grouped[task.userId].push(task);
    }

    return grouped;
  }

  async getUpcoming(tenantId: string, userId: string, days: number = 7) {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);

    const tasks = await prisma.task.findMany({
      where: {
        tenantId,
        userId,
        dueDate: { gte: now, lte: future },
        status: { notIn: ['completed', 'cancelled'] },
      },
      orderBy: { dueDate: 'asc' },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        deal: { select: { id: true, title: true } },
      },
    });

    return tasks;
  }
}
