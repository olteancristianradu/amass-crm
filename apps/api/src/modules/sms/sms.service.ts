import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { NotFoundError } from '../../utils/errors';

interface ListFilters {
  contactId?: string;
  dealId?: string;
  direction?: 'inbound' | 'outbound';
  page: number;
  limit: number;
}

interface SendData {
  contactId?: string;
  toNumber: string;
  body: string;
  dealId?: string;
}

interface InboundData {
  fromNumber: string;
  toNumber: string;
  body: string;
  externalId?: string;
}

export class SmsService {
  async list(tenantId: string, filters: ListFilters) {
    const where: Prisma.SmsMessageWhereInput = { tenantId };

    if (filters.contactId) {
      where.contactId = filters.contactId;
    }
    if (filters.dealId) {
      where.dealId = filters.dealId;
    }
    if (filters.direction) {
      where.direction = filters.direction;
    }

    const page = filters.page;
    const limit = Math.min(filters.limit, 200);

    const [messages, total] = await Promise.all([
      prisma.smsMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          contact: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      prisma.smsMessage.count({ where }),
    ]);

    return {
      messages,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async send(tenantId: string, userId: string, data: SendData) {
    let contactId = data.contactId || null;

    // Auto-link to contact by phone match if not provided
    if (!contactId) {
      const contact = await prisma.contact.findFirst({
        where: {
          tenantId,
          OR: [
            { phone: data.toNumber },
            { mobile: data.toNumber },
          ],
        },
        select: { id: true },
      });
      if (contact) {
        contactId = contact.id;
      }
    }

    const sms = await prisma.smsMessage.create({
      data: {
        tenantId,
        contactId,
        dealId: data.dealId || null,
        direction: 'outbound',
        fromNumber: '',
        toNumber: data.toNumber,
        body: data.body,
        status: 'sent',
      },
    });

    // Create Activity record
    await prisma.activity.create({
      data: {
        tenantId,
        userId,
        contactId,
        dealId: data.dealId || null,
        type: 'sms',
        subject: `SMS sent to ${data.toNumber}`,
        body: data.body,
      },
    });

    return sms;
  }

  async recordInbound(tenantId: string, data: InboundData) {
    // Auto-link to contact by phone match
    const contact = await prisma.contact.findFirst({
      where: {
        tenantId,
        OR: [
          { phone: data.fromNumber },
          { mobile: data.fromNumber },
        ],
      },
      select: { id: true },
    });

    const sms = await prisma.smsMessage.create({
      data: {
        tenantId,
        contactId: contact?.id || null,
        direction: 'inbound',
        fromNumber: data.fromNumber,
        toNumber: data.toNumber,
        body: data.body,
        status: 'received',
        externalId: data.externalId || null,
      },
    });

    return sms;
  }

  async getConversation(tenantId: string, contactId: string) {
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, tenantId },
      select: { id: true },
    });
    if (!contact) {
      throw new NotFoundError('Contact not found');
    }

    const messages = await prisma.smsMessage.findMany({
      where: { tenantId, contactId },
      orderBy: { createdAt: 'asc' },
    });

    return messages;
  }

  async getStats(tenantId: string, dateFrom?: string, dateTo?: string) {
    const where: Prisma.SmsMessageWhereInput = { tenantId };

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo);
      }
    }

    const [sent, received] = await Promise.all([
      prisma.smsMessage.count({ where: { ...where, direction: 'outbound' } }),
      prisma.smsMessage.count({ where: { ...where, direction: 'inbound' } }),
    ]);

    return { sent, received, total: sent + received };
  }
}
