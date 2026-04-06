import { Request, Response } from 'express';
import { EmailService } from './email.service';

const emailService = new EmailService();

const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

export async function listAccounts(req: Request, res: Response): Promise<void> {
  const accounts = await emailService.listAccounts(req.user!.tenantId, req.user!.userId);
  res.json(accounts);
}

export async function connectAccount(req: Request, res: Response): Promise<void> {
  try {
    const account = await emailService.connectAccount(req.user!.tenantId, req.user!.userId, req.body);
    res.status(201).json(account);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to connect account';
    res.status(400).json({ error: message });
  }
}

export async function disconnectAccount(req: Request, res: Response): Promise<void> {
  try {
    await emailService.disconnectAccount(req.user!.tenantId, req.params.id);
    res.json({ success: true });
  } catch {
    res.status(404).json({ error: 'Email account not found' });
  }
}

export async function listMessages(req: Request, res: Response): Promise<void> {
  const filters = {
    contactId: req.query.contactId as string,
    dealId: req.query.dealId as string,
    accountId: req.query.accountId as string,
    direction: req.query.direction as string,
    search: req.query.search as string,
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
  };
  const result = await emailService.listMessages(req.user!.tenantId, filters);
  res.json(result);
}

export async function getThread(req: Request, res: Response): Promise<void> {
  try {
    const messages = await emailService.getThread(req.user!.tenantId, req.params.threadId);
    res.json(messages);
  } catch {
    res.status(404).json({ error: 'Thread not found' });
  }
}

export async function sendEmail(req: Request, res: Response): Promise<void> {
  try {
    const message = await emailService.sendEmail(req.user!.tenantId, req.user!.userId, req.body);
    res.status(201).json(message);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Send failed';
    res.status(400).json({ error: message });
  }
}

export async function recordInbound(req: Request, res: Response): Promise<void> {
  try {
    const { accountId, ...data } = req.body;
    const message = await emailService.recordInbound(req.user!.tenantId, accountId, data);
    res.status(201).json(message);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Record failed';
    res.status(400).json({ error: message });
  }
}

export async function trackOpen(req: Request, res: Response): Promise<void> {
  await emailService.trackOpen(req.params.id);
  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-store');
  res.send(PIXEL);
}

export async function trackClick(req: Request, res: Response): Promise<void> {
  await emailService.trackClick(req.params.id);
  const redirectUrl = req.query.url as string;
  if (redirectUrl) {
    res.redirect(redirectUrl);
  } else {
    res.status(204).send();
  }
}

export async function getStats(req: Request, res: Response): Promise<void> {
  const stats = await emailService.getStats(
    req.user!.tenantId,
    req.query.userId as string,
    req.query.dateFrom as string,
    req.query.dateTo as string,
  );
  res.json(stats);
}

export async function getUnifiedInbox(req: Request, res: Response): Promise<void> {
  try {
    const messages = await emailService.getUnifiedInbox(req.user!.tenantId, req.params.contactId);
    res.json(messages);
  } catch {
    res.status(404).json({ error: 'Contact not found' });
  }
}
