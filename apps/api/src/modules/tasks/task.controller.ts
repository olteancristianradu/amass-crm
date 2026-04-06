import { Request, Response } from 'express';
import { TaskService } from './task.service';

const taskService = new TaskService();

export async function list(req: Request, res: Response): Promise<void> {
  const filters = {
    status: req.query.status as string,
    priority: req.query.priority as string,
    type: req.query.type as string,
    userId: req.query.userId as string,
    contactId: req.query.contactId as string,
    dealId: req.query.dealId as string,
    dueDateFrom: req.query.dueDateFrom as string,
    dueDateTo: req.query.dueDateTo as string,
    overdue: req.query.overdue === 'true',
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
    sort: req.query.sort as string,
  };
  const result = await taskService.list(req.user!.tenantId, req.user!.userId, filters);
  res.json(result);
}

export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const task = await taskService.getById(req.user!.tenantId, req.params.id);
    res.json(task);
  } catch {
    res.status(404).json({ error: 'Task not found' });
  }
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const task = await taskService.create(req.user!.tenantId, req.user!.userId, req.body);
    res.status(201).json(task);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Create failed';
    res.status(400).json({ error: message });
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  try {
    const task = await taskService.update(req.user!.tenantId, req.user!.userId, req.params.id, req.body);
    res.json(task);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Update failed';
    res.status(400).json({ error: message });
  }
}

export async function remove(req: Request, res: Response): Promise<void> {
  try {
    await taskService.delete(req.user!.tenantId, req.params.id);
    res.json({ success: true });
  } catch {
    res.status(404).json({ error: 'Task not found' });
  }
}

export async function getOverdue(req: Request, res: Response): Promise<void> {
  const result = await taskService.getOverdue(req.user!.tenantId);
  res.json(result);
}

export async function getUpcoming(req: Request, res: Response): Promise<void> {
  const days = req.query.days ? parseInt(req.query.days as string, 10) : 7;
  const result = await taskService.getUpcoming(req.user!.tenantId, req.user!.userId, days);
  res.json(result);
}
