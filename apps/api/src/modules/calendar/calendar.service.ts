import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { NotFoundError, ValidationError } from '../../utils/errors';

interface EventFilters {
  startFrom?: string;
  startTo?: string;
  userId?: string;
}

export class CalendarService {
  async list(tenantId: string, userId: string, filters: EventFilters) {
    const where: Prisma.CalendarEventWhereInput = { tenantId };

    if (filters.startFrom || filters.startTo) {
      where.startAt = {};
      if (filters.startFrom) where.startAt.gte = new Date(filters.startFrom);
      if (filters.startTo) where.startAt.lte = new Date(filters.startTo);
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    const events = await prisma.calendarEvent.findMany({
      where,
      orderBy: { startAt: 'asc' },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        user: { select: { id: true, name: true, avatar: true } },
      },
    });

    return events;
  }

  async getById(tenantId: string, id: string) {
    const event = await prisma.calendarEvent.findFirst({
      where: { id, tenantId },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        user: { select: { id: true, name: true, avatar: true } },
      },
    });
    if (!event) throw new NotFoundError('CalendarEvent');
    return event;
  }

  async create(tenantId: string, userId: string, data: Record<string, unknown>) {
    const startAt = new Date(data.startAt as string);
    const endAt = new Date(data.endAt as string);

    if (endAt <= startAt) {
      throw new ValidationError('endAt must be after startAt');
    }

    const event = await prisma.calendarEvent.create({
      data: {
        tenant: { connect: { id: tenantId } },
        user: { connect: { id: userId } },
        title: data.title as string,
        description: (data.description as string) || '',
        location: (data.location as string) || '',
        startAt,
        endAt,
        allDay: (data.allDay as boolean) || false,
        ...(data.contactId ? { contact: { connect: { id: data.contactId as string } } } : {}),
        ...(data.dealId ? { dealId: data.dealId as string } : {}),
      },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        user: { select: { id: true, name: true, avatar: true } },
      },
    });

    return event;
  }

  async update(tenantId: string, userId: string, id: string, data: Record<string, unknown>) {
    const existing = await prisma.calendarEvent.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError('CalendarEvent');

    const updateData: Prisma.CalendarEventUpdateInput = {};

    if (data.title !== undefined) updateData.title = data.title as string;
    if (data.description !== undefined) updateData.description = data.description as string;
    if (data.location !== undefined) updateData.location = data.location as string;
    if (data.startAt !== undefined) updateData.startAt = new Date(data.startAt as string);
    if (data.endAt !== undefined) updateData.endAt = new Date(data.endAt as string);
    if (data.allDay !== undefined) updateData.allDay = data.allDay as boolean;

    if (data.contactId !== undefined) {
      updateData.contact = data.contactId ? { connect: { id: data.contactId as string } } : { disconnect: true };
    }
    if (data.dealId !== undefined) {
      updateData.dealId = (data.dealId as string) || null;
    }

    // Validate endAt > startAt using final values
    const finalStartAt = data.startAt ? new Date(data.startAt as string) : existing.startAt;
    const finalEndAt = data.endAt ? new Date(data.endAt as string) : existing.endAt;
    if (finalEndAt <= finalStartAt) {
      throw new ValidationError('endAt must be after startAt');
    }

    const updated = await prisma.calendarEvent.update({
      where: { id },
      data: updateData,
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        user: { select: { id: true, name: true, avatar: true } },
      },
    });

    return updated;
  }

  async delete(tenantId: string, id: string) {
    const existing = await prisma.calendarEvent.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError('CalendarEvent');
    await prisma.calendarEvent.delete({ where: { id } });
  }

  async getAgenda(tenantId: string, userId: string, date: string) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const events = await prisma.calendarEvent.findMany({
      where: {
        tenantId,
        userId,
        startAt: { gte: dayStart, lte: dayEnd },
      },
      orderBy: { startAt: 'asc' },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return events;
  }
}
