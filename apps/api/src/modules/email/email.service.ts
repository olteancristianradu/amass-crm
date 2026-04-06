import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { NotFoundError } from '../../utils/errors';

export class EmailService {
  async listAccounts(tenantId: string, userId: string) {
    return prisma.emailAccount.findMany({
      where: { tenantId, userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async connectAccount(tenantId: string, userId: string, data: {
    provider: string;
    email: string;
    accessToken?: string;
    refreshToken?: string;
    settings?: Record<string, unknown>;
  }) {
    return prisma.emailAccount.create({
      data: {
        tenantId,
        userId,
        provider: data.provider,
        email: data.email,
        accessToken: data.accessToken || null,
        refreshToken: data.refreshToken || null,
        settings: (data.settings || {}) as Record<string, string>,
        isActive: true,
      },
    });
  }

  async disconnectAccount(tenantId: string, id: string) {
    const account = await prisma.emailAccount.findFirst({
      where: { id, tenantId },
    });
    if (!account) throw new NotFoundError('EmailAccount');

    await prisma.emailAccount.delete({ where: { id } });
  }

  async listMessages(tenantId: string, filters: {
    contactId?: string;
    dealId?: string;
    accountId?: string;
    direction?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const where: Prisma.EmailMessageWhereInput = { tenantId };

    if (filters.contactId) where.contactId = filters.contactId;
    if (filters.dealId) where.dealId = filters.dealId;
    if (filters.accountId) where.accountId = filters.accountId;
    if (filters.direction) where.direction = filters.direction;
    if (filters.search) {
      const s = filters.search;
      where.OR = [
        { subject: { contains: s, mode: 'insensitive' } },
        { fromEmail: { contains: s, mode: 'insensitive' } },
        { bodyText: { contains: s, mode: 'insensitive' } },
      ];
    }

    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 200);

    const [messages, total] = await Promise.all([
      prisma.emailMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      prisma.emailMessage.count({ where }),
    ]);

    return {
      messages,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getThread(tenantId: string, threadId: string) {
    const messages = await prisma.emailMessage.findMany({
      where: { tenantId, threadId },
      orderBy: { createdAt: 'asc' },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (messages.length === 0) throw new NotFoundError('Thread');

    return messages;
  }

  async sendEmail(tenantId: string, userId: string, data: {
    accountId: string;
    contactId?: string;
    dealId?: string;
    toEmails: string[];
    ccEmails?: string[];
    subject: string;
    bodyHtml: string;
    bodyText?: string;
  }) {
    // Verify account belongs to tenant
    const account = await prisma.emailAccount.findFirst({
      where: { id: data.accountId, tenantId },
    });
    if (!account) throw new NotFoundError('EmailAccount');

    // Auto-link to contact by matching toEmail if contactId not provided
    let contactId = data.contactId || null;
    if (!contactId && data.toEmails.length > 0) {
      const contact = await prisma.contact.findFirst({
        where: {
          tenantId,
          email: { in: data.toEmails, mode: 'insensitive' },
        },
        select: { id: true },
      });
      if (contact) contactId = contact.id;
    }

    const message = await prisma.emailMessage.create({
      data: {
        tenantId,
        accountId: data.accountId,
        contactId,
        dealId: data.dealId || null,
        direction: 'outbound',
        fromEmail: account.email,
        toEmails: data.toEmails,
        ccEmails: data.ccEmails || [],
        subject: data.subject,
        bodyHtml: data.bodyHtml,
        bodyText: data.bodyText || null,
        status: 'sent',
        sentAt: new Date(),
      },
    });

    // Create activity log
    if (contactId) {
      await prisma.activity.create({
        data: {
          tenantId,
          userId,
          contactId,
          dealId: data.dealId || null,
          type: 'email_sent',
          subject: data.subject,
          body: `Email sent to ${data.toEmails.join(', ')}`,
          metadata: { emailMessageId: message.id },
        },
      });
    }

    return message;
  }

  async recordInbound(tenantId: string, accountId: string, data: {
    fromEmail: string;
    toEmails: string[];
    ccEmails?: string[];
    subject: string;
    bodyHtml?: string;
    bodyText?: string;
    externalId?: string;
    threadId?: string;
    receivedAt?: string;
  }) {
    // Verify account belongs to tenant
    const account = await prisma.emailAccount.findFirst({
      where: { id: accountId, tenantId },
    });
    if (!account) throw new NotFoundError('EmailAccount');

    // Auto-link to contact by matching fromEmail
    const contact = await prisma.contact.findFirst({
      where: {
        tenantId,
        email: { equals: data.fromEmail, mode: 'insensitive' },
      },
      select: { id: true },
    });

    const message = await prisma.emailMessage.create({
      data: {
        tenantId,
        accountId,
        contactId: contact?.id || null,
        direction: 'inbound',
        fromEmail: data.fromEmail,
        toEmails: data.toEmails,
        ccEmails: data.ccEmails || [],
        subject: data.subject,
        bodyHtml: data.bodyHtml || null,
        bodyText: data.bodyText || null,
        externalId: data.externalId || null,
        threadId: data.threadId || null,
        status: 'received',
        receivedAt: data.receivedAt ? new Date(data.receivedAt) : new Date(),
      },
    });

    return message;
  }

  async trackOpen(messageId: string) {
    const message = await prisma.emailMessage.findUnique({
      where: { id: messageId },
      select: { id: true, openedAt: true },
    });
    if (!message) return;

    if (!message.openedAt) {
      await prisma.emailMessage.update({
        where: { id: messageId },
        data: { openedAt: new Date() },
      });
    }
  }

  async trackClick(messageId: string) {
    const message = await prisma.emailMessage.findUnique({
      where: { id: messageId },
      select: { id: true, clickedAt: true },
    });
    if (!message) return;

    if (!message.clickedAt) {
      await prisma.emailMessage.update({
        where: { id: messageId },
        data: { clickedAt: new Date() },
      });
    }
  }

  async getStats(tenantId: string, userId?: string, dateFrom?: string, dateTo?: string) {
    const where: Prisma.EmailMessageWhereInput = {
      tenantId,
      direction: 'outbound',
    };

    if (userId) {
      where.account = { userId };
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [totalSent, totalOpened, totalClicked] = await Promise.all([
      prisma.emailMessage.count({ where }),
      prisma.emailMessage.count({ where: { ...where, openedAt: { not: null } } }),
      prisma.emailMessage.count({ where: { ...where, clickedAt: { not: null } } }),
    ]);

    const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
    const clickRate = totalSent > 0 ? (totalClicked / totalSent) * 100 : 0;

    // Daily breakdown
    const messages = await prisma.emailMessage.findMany({
      where,
      select: { createdAt: true, openedAt: true, clickedAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const byDay: Record<string, { sent: number; opened: number; clicked: number }> = {};
    for (const msg of messages) {
      const day = msg.createdAt.toISOString().split('T')[0];
      if (!byDay[day]) byDay[day] = { sent: 0, opened: 0, clicked: 0 };
      byDay[day].sent++;
      if (msg.openedAt) byDay[day].opened++;
      if (msg.clickedAt) byDay[day].clicked++;
    }

    return {
      totalSent,
      totalOpened,
      totalClicked,
      openRate: Math.round(openRate * 100) / 100,
      clickRate: Math.round(clickRate * 100) / 100,
      byDay,
    };
  }

  async getUnifiedInbox(tenantId: string, contactId: string) {
    // Verify contact exists
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, tenantId },
      select: { id: true },
    });
    if (!contact) throw new NotFoundError('Contact');

    const [emails, smsMessages] = await Promise.all([
      prisma.emailMessage.findMany({
        where: { tenantId, contactId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          direction: true,
          fromEmail: true,
          toEmails: true,
          subject: true,
          bodyText: true,
          status: true,
          openedAt: true,
          sentAt: true,
          receivedAt: true,
          createdAt: true,
        },
      }),
      prisma.smsMessage.findMany({
        where: { tenantId, contactId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          direction: true,
          fromNumber: true,
          toNumber: true,
          body: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    const unified = [
      ...emails.map(e => ({
        ...e,
        channel: 'email' as const,
        date: e.sentAt || e.receivedAt || e.createdAt,
      })),
      ...smsMessages.map(s => ({
        ...s,
        channel: 'sms' as const,
        date: s.createdAt,
      })),
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    return unified;
  }
}
