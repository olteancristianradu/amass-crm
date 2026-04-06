import Stripe from 'stripe';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { NotFoundError, ConflictError } from '../../utils/errors';

const stripe = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null;

interface CreateSubscriptionData {
  plan: 'free' | 'pro' | 'enterprise';
  seats: number;
}

interface UpdateSubscriptionData {
  plan?: 'free' | 'pro' | 'enterprise';
  seats?: number;
  cancelAtPeriodEnd?: boolean;
}

interface PlanLimits {
  users: number;
  contacts: number;
  pipelines: number;
}

const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: { users: 2, contacts: 500, pipelines: 1 },
  pro: { users: 10, contacts: 10000, pipelines: Infinity },
  enterprise: { users: Infinity, contacts: Infinity, pipelines: Infinity },
};

export class BillingService {
  async getSubscription(tenantId: string) {
    const subscription = await prisma.subscription.findFirst({
      where: { tenantId },
      include: {
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }

    return subscription;
  }

  async createSubscription(tenantId: string, data: CreateSubscriptionData) {
    const existing = await prisma.subscription.findFirst({ where: { tenantId } });
    if (existing) {
      throw new ConflictError('Subscription already exists for this tenant');
    }

    const currentPeriodEnd = new Date();
    currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30);

    const subscription = await prisma.subscription.create({
      data: {
        tenantId,
        plan: data.plan,
        seats: data.seats,
        status: 'active',
        currentPeriodEnd,
      },
    });

    return subscription;
  }

  async updateSubscription(tenantId: string, data: UpdateSubscriptionData) {
    const existing = await prisma.subscription.findFirst({ where: { tenantId } });
    if (!existing) {
      throw new NotFoundError('Subscription not found');
    }

    const updateData: Record<string, unknown> = {};
    if (data.plan !== undefined) updateData.plan = data.plan;
    if (data.seats !== undefined) updateData.seats = data.seats;
    if (data.cancelAtPeriodEnd !== undefined) updateData.cancelAtPeriodEnd = data.cancelAtPeriodEnd;

    const subscription = await prisma.subscription.update({
      where: { id: existing.id },
      data: updateData,
    });

    return subscription;
  }

  async cancelSubscription(tenantId: string) {
    const existing = await prisma.subscription.findFirst({ where: { tenantId } });
    if (!existing) {
      throw new NotFoundError('Subscription not found');
    }

    const subscription = await prisma.subscription.update({
      where: { id: existing.id },
      data: { cancelAtPeriodEnd: true },
    });

    return subscription;
  }

  async reactivateSubscription(tenantId: string) {
    const existing = await prisma.subscription.findFirst({ where: { tenantId } });
    if (!existing) {
      throw new NotFoundError('Subscription not found');
    }

    const subscription = await prisma.subscription.update({
      where: { id: existing.id },
      data: { cancelAtPeriodEnd: false },
    });

    return subscription;
  }

  async listInvoices(tenantId: string, page: number = 1, limit: number = 50) {
    const safeLimit = Math.min(limit, 200);

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * safeLimit,
        take: safeLimit,
      }),
      prisma.invoice.count({ where: { tenantId } }),
    ]);

    return {
      invoices,
      total,
      page,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  async getUsage(tenantId: string) {
    const [users, contacts, deals, pipelines] = await Promise.all([
      prisma.user.count({ where: { tenantId } }),
      prisma.contact.count({ where: { tenantId } }),
      prisma.deal.count({ where: { tenantId } }),
      prisma.pipeline.count({ where: { tenantId } }),
    ]);

    return { users, contacts, deals, pipelines };
  }

  async checkLimits(tenantId: string) {
    const [subscription, usage] = await Promise.all([
      prisma.subscription.findFirst({ where: { tenantId } }),
      this.getUsage(tenantId),
    ]);

    const plan = subscription?.plan || 'free';
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

    const withinLimits =
      usage.users <= limits.users &&
      usage.contacts <= limits.contacts &&
      usage.pipelines <= limits.pipelines;

    return {
      withinLimits,
      plan,
      limits: {
        users: limits.users === Infinity ? 'unlimited' : limits.users,
        contacts: limits.contacts === Infinity ? 'unlimited' : limits.contacts,
        pipelines: limits.pipelines === Infinity ? 'unlimited' : limits.pipelines,
      },
      usage: {
        users: usage.users,
        contacts: usage.contacts,
        pipelines: usage.pipelines,
      },
    };
  }

  async handleStripeWebhook(body: unknown, signature: string | undefined) {
    // Placeholder: log event type, return ok
    const event = body as Record<string, unknown>;
    console.log(`[Stripe Webhook] Received event: ${event.type || 'unknown'}`);
    return { received: true };
  }

  /** Create a Stripe customer for a tenant */
  async createStripeCustomer(tenantId: string, email: string, name: string) {
    if (!stripe) throw new Error('Stripe not configured');
    const customer = await stripe.customers.create({ email, name, metadata: { tenantId } });
    const sub = await prisma.subscription.findFirst({ where: { tenantId } });
    if (sub) {
      await prisma.subscription.update({ where: { id: sub.id }, data: { stripeCustomerId: customer.id } });
    }
    return customer;
  }

  /** Create a Stripe Checkout session for plan upgrade */
  async createCheckoutSession(tenantId: string, priceId: string) {
    if (!stripe) throw new Error('Stripe not configured');
    const sub = await prisma.subscription.findFirst({ where: { tenantId } });
    if (!sub?.stripeCustomerId) throw new Error('No Stripe customer. Call createStripeCustomer first.');
    const session = await stripe.checkout.sessions.create({
      customer: sub.stripeCustomerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${env.APP_URL}/settings?billing=success`,
      cancel_url: `${env.APP_URL}/settings?billing=cancel`,
      metadata: { tenantId },
    });
    return { url: session.url };
  }

  /** Create a Stripe Customer Portal session */
  async createPortalSession(tenantId: string) {
    if (!stripe) throw new Error('Stripe not configured');
    const sub = await prisma.subscription.findFirst({ where: { tenantId } });
    if (!sub?.stripeCustomerId) throw new Error('No Stripe customer');
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${env.APP_URL}/settings`,
    });
    return { url: session.url };
  }

  /** Handle verified Stripe webhook event */
  async handleStripeWebhookEvent(payload: Buffer, signature: string) {
    if (!stripe) throw new Error('Stripe not configured');
    const event = stripe.webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const tenantId = session.metadata?.tenantId;
        if (tenantId) {
          await prisma.subscription.updateMany({
            where: { tenantId },
            data: { status: 'active', plan: 'pro', stripeSubId: session.subscription as string },
          });
        }
        break;
      }
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.toString();
        if (customerId) {
          const sub = await prisma.subscription.findFirst({ where: { stripeCustomerId: customerId } });
          if (sub) {
            await prisma.invoice.create({
              data: {
                tenantId: sub.tenantId,
                amount: (invoice.amount_paid || 0) / 100,
                currency: invoice.currency?.toUpperCase() || 'EUR',
                status: 'paid',
                stripeInvoiceId: invoice.id,
              },
            });
          }
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.toString();
        if (customerId) {
          await prisma.subscription.updateMany({
            where: { stripeCustomerId: customerId },
            data: { status: 'canceled', plan: 'free' },
          });
        }
        break;
      }
    }

    return { received: true };
  }

  /** Get subscription status with Stripe details */
  async getSubscriptionStatus(tenantId: string) {
    const sub = await prisma.subscription.findFirst({ where: { tenantId } });
    if (!sub) throw new NotFoundError('Subscription not found');
    return {
      plan: sub.plan,
      status: sub.status,
      periodEnd: sub.currentPeriodEnd,
      seats: sub.seats,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    };
  }
}
