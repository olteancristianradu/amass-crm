import { prisma } from '../../config/database';

export class NotificationService {
  /**
   * Create a notification for a user
   */
  async create(data: {
    tenantId: string;
    userId: string;
    type: string;
    title: string;
    message: string;
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
  }) {
    // We'll use the Activity model with type='notification' as a lightweight store
    // until a dedicated Notification model is added
    return prisma.activity.create({
      data: {
        tenantId: data.tenantId,
        userId: data.userId,
        type: 'notification',
        subject: data.title,
        body: data.message,
        contactId: data.entityType === 'contact' ? data.entityId : null,
        dealId: data.entityType === 'deal' ? data.entityId : null,
        companyId: data.entityType === 'company' ? data.entityId : null,
        metadata: {
          notificationType: data.type,
          entityType: data.entityType,
          entityId: data.entityId,
          read: false,
          ...(data.metadata || {}),
        },
      },
    });
  }

  /**
   * Get unread notifications for a user
   */
  async getUnread(tenantId: string, userId: string) {
    const notifications = await prisma.activity.findMany({
      where: {
        tenantId,
        userId,
        type: 'notification',
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Filter to unread ones
    return notifications.filter(n => {
      const meta = n.metadata as Record<string, unknown> | null;
      return meta && meta.read !== true;
    });
  }

  /**
   * Get all notifications for a user (paginated)
   */
  async list(tenantId: string, userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.activity.findMany({
        where: { tenantId, userId, type: 'notification' },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.activity.count({
        where: { tenantId, userId, type: 'notification' },
      }),
    ]);
    return { items, total, page, limit };
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(tenantId: string, userId: string, notificationId: string) {
    const notification = await prisma.activity.findFirst({
      where: { id: notificationId, tenantId, userId, type: 'notification' },
    });
    if (!notification) throw new Error('Notification not found');

    const meta = (notification.metadata as Record<string, unknown>) || {};
    return prisma.activity.update({
      where: { id: notificationId },
      data: { metadata: { ...meta, read: true, readAt: new Date().toISOString() } },
    });
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(tenantId: string, userId: string) {
    const unread = await this.getUnread(tenantId, userId);
    const updates = unread.map(n => {
      const meta = (n.metadata as Record<string, unknown>) || {};
      return prisma.activity.update({
        where: { id: n.id },
        data: { metadata: { ...meta, read: true, readAt: new Date().toISOString() } },
      });
    });
    await Promise.all(updates);
    return { marked: updates.length };
  }

  /**
   * Send SLA alert notification
   */
  async sendSlaAlert(data: {
    tenantId: string;
    userId: string;
    alertType: 'lead_untouched' | 'deal_stagnant' | 'task_overdue';
    entityType: string;
    entityId: string;
    details: string;
  }) {
    const titles: Record<string, string> = {
      lead_untouched: 'Lead untouched alert',
      deal_stagnant: 'Deal stagnant alert',
      task_overdue: 'Task overdue alert',
    };

    return this.create({
      tenantId: data.tenantId,
      userId: data.userId,
      type: `sla_${data.alertType}`,
      title: titles[data.alertType] || 'SLA Alert',
      message: data.details,
      entityType: data.entityType,
      entityId: data.entityId,
    });
  }
}
