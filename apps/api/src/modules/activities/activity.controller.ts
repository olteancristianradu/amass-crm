import { Request, Response } from 'express';
import { ActivityService } from './activity.service';

const activityService = new ActivityService();

export async function list(req: Request, res: Response): Promise<void> {
  const filters = {
    contactId: req.query.contactId as string,
    dealId: req.query.dealId as string,
    companyId: req.query.companyId as string,
    type: req.query.type as string,
    dateFrom: req.query.dateFrom as string,
    dateTo: req.query.dateTo as string,
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
  };
  const result = await activityService.list(req.user!.tenantId, filters);
  res.json(result);
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const activity = await activityService.create(req.user!.tenantId, req.user!.userId, req.body);
    res.status(201).json(activity);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Create failed';
    res.status(400).json({ error: message });
  }
}

export async function getTimeline(req: Request, res: Response): Promise<void> {
  const entityType = req.query.entityType as string;
  const entityId = req.query.entityId as string;

  if (!entityType || !entityId) {
    res.status(400).json({ error: 'entityType and entityId query parameters are required' });
    return;
  }

  if (!['contact', 'deal', 'company'].includes(entityType)) {
    res.status(400).json({ error: 'entityType must be one of: contact, deal, company' });
    return;
  }

  const result = await activityService.getTimeline(req.user!.tenantId, entityType, entityId);
  res.json(result);
}

export async function getStats(req: Request, res: Response): Promise<void> {
  const filters = {
    userId: req.query.userId as string,
    dateFrom: req.query.dateFrom as string,
    dateTo: req.query.dateTo as string,
  };
  const result = await activityService.getStats(req.user!.tenantId, filters);
  res.json(result);
}
