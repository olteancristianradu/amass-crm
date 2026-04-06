import { Request, Response } from 'express';
import { DealService } from './deal.service';

const dealService = new DealService();

export async function list(req: Request, res: Response): Promise<void> {
  const filters = {
    pipelineId: req.query.pipelineId as string,
    stageId: req.query.stageId as string,
    assignedToId: req.query.assignedToId as string,
    search: req.query.search as string,
    minValue: req.query.minValue ? parseFloat(req.query.minValue as string) : undefined,
    maxValue: req.query.maxValue ? parseFloat(req.query.maxValue as string) : undefined,
    expectedCloseFrom: req.query.expectedCloseFrom as string,
    expectedCloseTo: req.query.expectedCloseTo as string,
    status: req.query.status as 'open' | 'won' | 'lost' | undefined,
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
    sort: req.query.sort as string,
  };
  const result = await dealService.list(req.user!.tenantId, filters);
  res.json(result);
}

export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const deal = await dealService.getById(req.user!.tenantId, req.params.id);
    res.json(deal);
  } catch {
    res.status(404).json({ error: 'Deal not found' });
  }
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const deal = await dealService.create(req.user!.tenantId, req.user!.userId, req.body);
    res.status(201).json(deal);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Create failed';
    res.status(400).json({ error: message });
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  try {
    const deal = await dealService.update(req.user!.tenantId, req.user!.userId, req.params.id, req.body);
    res.json(deal);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Update failed';
    res.status(400).json({ error: message });
  }
}

export async function moveStage(req: Request, res: Response): Promise<void> {
  try {
    const { stageId, lossReason, lossNote } = req.body;
    const deal = await dealService.moveStage(req.user!.tenantId, req.user!.userId, req.params.id, stageId, lossReason, lossNote);
    res.json(deal);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Move failed';
    res.status(400).json({ error: message });
  }
}

export async function remove(req: Request, res: Response): Promise<void> {
  try {
    await dealService.delete(req.user!.tenantId, req.params.id);
    res.json({ success: true });
  } catch {
    res.status(404).json({ error: 'Deal not found' });
  }
}

export async function getKanban(req: Request, res: Response): Promise<void> {
  try {
    const result = await dealService.getKanban(req.user!.tenantId, req.params.pipelineId);
    res.json(result);
  } catch {
    res.status(404).json({ error: 'Pipeline not found' });
  }
}

export async function getForecast(req: Request, res: Response): Promise<void> {
  const filters = {
    pipelineId: req.query.pipelineId as string,
  };
  const result = await dealService.getForecast(req.user!.tenantId, filters);
  res.json(result);
}

export async function getWinLossAnalysis(req: Request, res: Response): Promise<void> {
  const dateFrom = req.query.dateFrom as string | undefined;
  const dateTo = req.query.dateTo as string | undefined;
  const result = await dealService.getWinLossAnalysis(req.user!.tenantId, dateFrom, dateTo);
  res.json(result);
}

export async function assignRoundRobin(req: Request, res: Response): Promise<void> {
  try {
    const deal = await dealService.assignRoundRobin(req.user!.tenantId, req.body.pipelineId || '', req.params.id);
    res.json(deal);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Assignment failed';
    res.status(400).json({ error: message });
  }
}
