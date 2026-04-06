import { Request, Response } from 'express';
import { NotificationService } from './notification.service';

const notificationService = new NotificationService();

export async function list(req: Request, res: Response): Promise<void> {
  const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  const result = await notificationService.list(req.user!.tenantId, req.user!.userId, page, limit);
  res.json(result);
}

export async function getUnread(req: Request, res: Response): Promise<void> {
  const notifications = await notificationService.getUnread(req.user!.tenantId, req.user!.userId);
  res.json({ count: notifications.length, items: notifications });
}

export async function markAsRead(req: Request, res: Response): Promise<void> {
  try {
    const result = await notificationService.markAsRead(req.user!.tenantId, req.user!.userId, req.params.id);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    res.status(400).json({ error: message });
  }
}

export async function markAllAsRead(req: Request, res: Response): Promise<void> {
  const result = await notificationService.markAllAsRead(req.user!.tenantId, req.user!.userId);
  res.json(result);
}
