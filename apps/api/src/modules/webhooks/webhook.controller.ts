import { Request, Response } from 'express';
import { WebhookService } from './webhook.service';

const webhookService = new WebhookService();

export async function list(req: Request, res: Response): Promise<void> {
  const webhooks = await webhookService.list(req.user!.tenantId);
  res.json(webhooks);
}

export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const webhook = await webhookService.getById(req.user!.tenantId, req.params.id);
    res.json(webhook);
  } catch {
    res.status(404).json({ error: 'Webhook not found' });
  }
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const webhook = await webhookService.create(req.user!.tenantId, req.body);
    res.status(201).json(webhook);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Create failed';
    res.status(400).json({ error: message });
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  try {
    const webhook = await webhookService.update(req.user!.tenantId, req.params.id, req.body);
    res.json(webhook);
  } catch (err) {
    if (err instanceof Error && err.message === 'Webhook not found') {
      res.status(404).json({ error: err.message });
      return;
    }
    const message = err instanceof Error ? err.message : 'Update failed';
    res.status(400).json({ error: message });
  }
}

export async function remove(req: Request, res: Response): Promise<void> {
  try {
    await webhookService.delete(req.user!.tenantId, req.params.id);
    res.json({ success: true });
  } catch {
    res.status(404).json({ error: 'Webhook not found' });
  }
}

export async function test(req: Request, res: Response): Promise<void> {
  try {
    const result = await webhookService.test(req.user!.tenantId, req.params.id);
    res.json(result);
  } catch {
    res.status(404).json({ error: 'Webhook not found' });
  }
}

export async function getDeliveries(req: Request, res: Response): Promise<void> {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const result = await webhookService.getDeliveries(req.user!.tenantId, req.params.id, page, limit);
    res.json(result);
  } catch {
    res.status(404).json({ error: 'Webhook not found' });
  }
}

export async function resetFailCount(req: Request, res: Response): Promise<void> {
  try {
    const webhook = await webhookService.resetFailCount(req.user!.tenantId, req.params.id);
    res.json(webhook);
  } catch {
    res.status(404).json({ error: 'Webhook not found' });
  }
}
