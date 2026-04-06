import crypto from 'crypto';
import { prisma } from '../../config/database';
import { NotFoundError } from '../../utils/errors';

interface CreateWebhookData {
  url: string;
  events: string[];
  secret?: string;
  isActive?: boolean;
}

interface UpdateWebhookData {
  url?: string;
  events?: string[];
  secret?: string;
  isActive?: boolean;
}

export class WebhookService {
  async list(tenantId: string) {
    const webhooks = await prisma.webhook.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { deliveries: true } },
      },
    });

    return webhooks;
  }

  async getById(tenantId: string, id: string) {
    const webhook = await prisma.webhook.findFirst({
      where: { id, tenantId },
      include: {
        deliveries: {
          orderBy: { deliveredAt: 'desc' },
          take: 20,
        },
      },
    });
    if (!webhook) {
      throw new NotFoundError('Webhook not found');
    }
    return webhook;
  }

  async create(tenantId: string, data: CreateWebhookData) {
    const secret = data.secret || crypto.randomBytes(32).toString('hex');

    const webhook = await prisma.webhook.create({
      data: {
        tenantId,
        url: data.url,
        events: data.events,
        secret,
        isActive: data.isActive ?? true,
      },
    });

    return webhook;
  }

  async update(tenantId: string, id: string, data: UpdateWebhookData) {
    const existing = await prisma.webhook.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new NotFoundError('Webhook not found');
    }

    const webhook = await prisma.webhook.update({
      where: { id },
      data,
    });

    return webhook;
  }

  async delete(tenantId: string, id: string) {
    const existing = await prisma.webhook.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new NotFoundError('Webhook not found');
    }

    await prisma.webhook.delete({ where: { id } });
  }

  /**
   * Deliver an event to all active webhooks that subscribe to it.
   * Called by the event bus listener.
   */
  async deliverEvent(tenantId: string, eventName: string, payload: unknown): Promise<void> {
    const webhooks = await prisma.webhook.findMany({
      where: {
        tenantId,
        isActive: true,
        events: { has: eventName },
      },
    });

    for (const webhook of webhooks) {
      this.deliverToWebhook(webhook, eventName, payload).catch(err => {
        console.error(`Webhook delivery failed for ${webhook.id}:`, err);
      });
    }
  }

  /**
   * Deliver a payload to a specific webhook URL with HMAC-SHA256 signing and retry.
   */
  private async deliverToWebhook(
    webhook: { id: string; url: string; secret: string },
    eventName: string,
    payload: unknown,
    attempt: number = 1
  ): Promise<void> {
    const body = JSON.stringify({ event: eventName, data: payload, timestamp: new Date().toISOString() });

    // HMAC-SHA256 signature
    const signature = crypto
      .createHmac('sha256', webhook.secret)
      .update(body)
      .digest('hex');

    let statusCode: number | null = null;
    let responseBody: string | null = null;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': `sha256=${signature}`,
          'X-Webhook-Event': eventName,
          'X-Webhook-Delivery': crypto.randomUUID(),
        },
        body,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      statusCode = response.status;
      responseBody = await response.text().catch(() => null);

      // Record successful delivery
      await prisma.webhookDelivery.create({
        data: {
          webhookId: webhook.id,
          event: eventName,
          payload: payload as any,
          statusCode,
          response: responseBody?.slice(0, 1000) || null,
          deliveredAt: new Date(),
        },
      });

      // Reset fail count on success
      if (statusCode >= 200 && statusCode < 300) {
        await prisma.webhook.update({
          where: { id: webhook.id },
          data: { failCount: 0, lastDeliveryAt: new Date() },
        });
      } else {
        throw new Error(`HTTP ${statusCode}`);
      }
    } catch (err) {
      // Record failed delivery
      await prisma.webhookDelivery.create({
        data: {
          webhookId: webhook.id,
          event: eventName,
          payload: payload as any,
          statusCode,
          response: err instanceof Error ? err.message : 'Unknown error',
          deliveredAt: new Date(),
        },
      }).catch(() => {}); // Don't fail on logging failure

      // Increment fail count
      const updated = await prisma.webhook.update({
        where: { id: webhook.id },
        data: { failCount: { increment: 1 } },
      });

      // Disable webhook after 10 consecutive failures
      if (updated.failCount >= 10) {
        await prisma.webhook.update({
          where: { id: webhook.id },
          data: { isActive: false },
        });
        console.warn(`Webhook ${webhook.id} disabled after ${updated.failCount} failures`);
        return;
      }

      // Retry with exponential backoff (max 3 attempts)
      if (attempt < 3) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s
        setTimeout(() => {
          this.deliverToWebhook(webhook, eventName, payload, attempt + 1);
        }, delay);
      }
    }
  }

  async test(tenantId: string, id: string) {
    const webhook = await prisma.webhook.findFirst({ where: { id, tenantId } });
    if (!webhook) {
      throw new NotFoundError('Webhook not found');
    }

    const testPayload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      data: { message: 'This is a test webhook delivery' },
    };

    const body = JSON.stringify(testPayload);
    const signature = crypto
      .createHmac('sha256', webhook.secret)
      .update(body)
      .digest('hex');

    let statusCode: number | null = null;
    let response: string | null = null;

    try {
      const res = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': 'webhook.test',
        },
        body,
        signal: AbortSignal.timeout(10000),
      });

      statusCode = res.status;
      response = await res.text().catch(() => null);
    } catch (err) {
      response = err instanceof Error ? err.message : 'Connection failed';
    }

    // Record delivery
    await prisma.webhookDelivery.create({
      data: {
        webhookId: id,
        event: 'webhook.test',
        payload: testPayload,
        statusCode,
        response: response?.substring(0, 2000) || null,
      },
    });

    return { statusCode, response, success: statusCode !== null && statusCode >= 200 && statusCode < 300 };
  }

  async getDeliveries(tenantId: string, webhookId: string, page: number = 1, limit: number = 50) {
    const webhook = await prisma.webhook.findFirst({ where: { id: webhookId, tenantId } });
    if (!webhook) {
      throw new NotFoundError('Webhook not found');
    }

    const safeLimit = Math.min(limit, 200);

    const [deliveries, total] = await Promise.all([
      prisma.webhookDelivery.findMany({
        where: { webhookId },
        orderBy: { deliveredAt: 'desc' },
        skip: (page - 1) * safeLimit,
        take: safeLimit,
      }),
      prisma.webhookDelivery.count({ where: { webhookId } }),
    ]);

    return {
      deliveries,
      total,
      page,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  async resetFailCount(tenantId: string, id: string) {
    const existing = await prisma.webhook.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new NotFoundError('Webhook not found');
    }

    const webhook = await prisma.webhook.update({
      where: { id },
      data: { failCount: 0, isActive: true },
    });

    return webhook;
  }
}
