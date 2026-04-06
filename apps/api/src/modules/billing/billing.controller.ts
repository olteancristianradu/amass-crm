import { Request, Response } from 'express';
import { BillingService } from './billing.service';

const billingService = new BillingService();

export async function getSubscription(req: Request, res: Response): Promise<void> {
  try {
    const subscription = await billingService.getSubscription(req.user!.tenantId);
    res.json(subscription);
  } catch {
    res.status(404).json({ error: 'Subscription not found' });
  }
}

export async function createSubscription(req: Request, res: Response): Promise<void> {
  try {
    const subscription = await billingService.createSubscription(req.user!.tenantId, req.body);
    res.status(201).json(subscription);
  } catch (err) {
    if (err instanceof Error && err.message.includes('already exists')) {
      res.status(409).json({ error: err.message });
      return;
    }
    const message = err instanceof Error ? err.message : 'Create failed';
    res.status(400).json({ error: message });
  }
}

export async function updateSubscription(req: Request, res: Response): Promise<void> {
  try {
    const subscription = await billingService.updateSubscription(req.user!.tenantId, req.body);
    res.json(subscription);
  } catch (err) {
    if (err instanceof Error && err.message === 'Subscription not found') {
      res.status(404).json({ error: err.message });
      return;
    }
    const message = err instanceof Error ? err.message : 'Update failed';
    res.status(400).json({ error: message });
  }
}

export async function cancelSubscription(req: Request, res: Response): Promise<void> {
  try {
    const subscription = await billingService.cancelSubscription(req.user!.tenantId);
    res.json(subscription);
  } catch {
    res.status(404).json({ error: 'Subscription not found' });
  }
}

export async function reactivateSubscription(req: Request, res: Response): Promise<void> {
  try {
    const subscription = await billingService.reactivateSubscription(req.user!.tenantId);
    res.json(subscription);
  } catch {
    res.status(404).json({ error: 'Subscription not found' });
  }
}

export async function listInvoices(req: Request, res: Response): Promise<void> {
  const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const result = await billingService.listInvoices(req.user!.tenantId, page, limit);
  res.json(result);
}

export async function getUsage(req: Request, res: Response): Promise<void> {
  const usage = await billingService.getUsage(req.user!.tenantId);
  res.json(usage);
}

export async function checkLimits(req: Request, res: Response): Promise<void> {
  const result = await billingService.checkLimits(req.user!.tenantId);
  res.json(result);
}

export async function handleStripeWebhook(req: Request, res: Response): Promise<void> {
  try {
    const signature = req.headers['stripe-signature'] as string | undefined;
    const result = await billingService.handleStripeWebhook(req.body, signature);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook processing failed';
    res.status(400).json({ error: message });
  }
}

export async function createCheckoutSession(req: Request, res: Response): Promise<void> {
  try {
    const result = await billingService.createCheckoutSession(req.user!.tenantId, req.body.priceId);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Checkout failed';
    res.status(400).json({ error: message });
  }
}

export async function createPortalSession(req: Request, res: Response): Promise<void> {
  try {
    const result = await billingService.createPortalSession(req.user!.tenantId);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Portal session failed';
    res.status(400).json({ error: message });
  }
}

export async function handleStripeWebhookEvent(req: Request, res: Response): Promise<void> {
  try {
    const signature = req.headers['stripe-signature'] as string;
    const result = await billingService.handleStripeWebhookEvent(req.body, signature);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook failed';
    res.status(400).json({ error: message });
  }
}

export async function getSubscriptionStatus(req: Request, res: Response): Promise<void> {
  try {
    const result = await billingService.getSubscriptionStatus(req.user!.tenantId);
    res.json(result);
  } catch {
    res.status(404).json({ error: 'Subscription not found' });
  }
}
