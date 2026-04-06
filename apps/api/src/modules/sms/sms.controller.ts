import { Request, Response } from 'express';
import { SmsService } from './sms.service';

const smsService = new SmsService();

export async function list(req: Request, res: Response): Promise<void> {
  const filters = {
    contactId: req.query.contactId as string | undefined,
    dealId: req.query.dealId as string | undefined,
    direction: req.query.direction as 'inbound' | 'outbound' | undefined,
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
  };
  const result = await smsService.list(req.user!.tenantId, filters);
  res.json(result);
}

export async function send(req: Request, res: Response): Promise<void> {
  try {
    const sms = await smsService.send(req.user!.tenantId, req.user!.userId, req.body);
    res.status(201).json(sms);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Send failed';
    res.status(400).json({ error: message });
  }
}

export async function recordInbound(req: Request, res: Response): Promise<void> {
  try {
    const { tenantId, fromNumber, toNumber, body, externalId } = req.body;
    const sms = await smsService.recordInbound(tenantId, { fromNumber, toNumber, body, externalId });
    res.status(201).json(sms);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Record failed';
    res.status(400).json({ error: message });
  }
}

export async function getConversation(req: Request, res: Response): Promise<void> {
  try {
    const messages = await smsService.getConversation(req.user!.tenantId, req.params.contactId);
    res.json(messages);
  } catch (err) {
    if (err instanceof Error && err.message === 'Contact not found') {
      res.status(404).json({ error: err.message });
      return;
    }
    const message = err instanceof Error ? err.message : 'Failed to get conversation';
    res.status(400).json({ error: message });
  }
}

export async function getStats(req: Request, res: Response): Promise<void> {
  const dateFrom = req.query.dateFrom as string | undefined;
  const dateTo = req.query.dateTo as string | undefined;
  const stats = await smsService.getStats(req.user!.tenantId, dateFrom, dateTo);
  res.json(stats);
}
