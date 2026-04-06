import { prisma } from '../../config/database';

export async function subscribe(tenantId: string, hookUrl: string, event: string) {
  const webhook = await prisma.webhook.create({
    data: {
      tenantId,
      url: hookUrl,
      events: [event],
      secret: '',
      isActive: true,
    },
  });

  return webhook;
}

export async function unsubscribe(webhookId: string) {
  await prisma.webhook.delete({
    where: { id: webhookId },
  });

  return { success: true };
}

export async function pollTrigger(tenantId: string, event: string, since: Date) {
  switch (event) {
    case 'contact.created': {
      const contacts = await prisma.contact.findMany({
        where: { tenantId, createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return contacts;
    }

    case 'deal.created': {
      const deals = await prisma.deal.findMany({
        where: { tenantId, createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return deals;
    }

    case 'deal.updated': {
      const updatedDeals = await prisma.deal.findMany({
        where: { tenantId, updatedAt: { gte: since } },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      });
      return updatedDeals;
    }

    case 'activity.created': {
      const activities = await prisma.activity.findMany({
        where: { tenantId, createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return activities;
    }

    default:
      return [];
  }
}

export async function notifySubscribers(tenantId: string, event: string, data: any) {
  const webhooks = await prisma.webhook.findMany({
    where: {
      tenantId,
      isActive: true,
      events: { has: event },
    },
  });

  const results = await Promise.allSettled(
    webhooks.map(async (webhook) => {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, data, timestamp: new Date().toISOString() }),
      });

      await prisma.webhook.update({
        where: { id: webhook.id },
        data: {
          lastDeliveryAt: new Date(),
          failCount: response.ok ? 0 : webhook.failCount + 1,
        },
      });

      await prisma.webhookDelivery.create({
        data: {
          webhookId: webhook.id,
          event,
          payload: { event, data },
          statusCode: response.status,
          response: await response.text(),
        },
      });

      return { webhookId: webhook.id, status: response.status };
    }),
  );

  return results;
}

export async function testAuth(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true, slug: true, plan: true },
  });

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  return tenant;
}
