import { Request, Response } from 'express';
import { CalendarService } from './calendar.service';

const calendarService = new CalendarService();

export async function list(req: Request, res: Response): Promise<void> {
  const filters = {
    startFrom: req.query.startFrom as string,
    startTo: req.query.startTo as string,
    userId: req.query.userId as string,
  };
  const result = await calendarService.list(req.user!.tenantId, req.user!.userId, filters);
  res.json(result);
}

export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const event = await calendarService.getById(req.user!.tenantId, req.params.id);
    res.json(event);
  } catch {
    res.status(404).json({ error: 'Event not found' });
  }
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const event = await calendarService.create(req.user!.tenantId, req.user!.userId, req.body);
    res.status(201).json(event);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Create failed';
    res.status(400).json({ error: message });
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  try {
    const event = await calendarService.update(req.user!.tenantId, req.user!.userId, req.params.id, req.body);
    res.json(event);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Update failed';
    res.status(400).json({ error: message });
  }
}

export async function remove(req: Request, res: Response): Promise<void> {
  try {
    await calendarService.delete(req.user!.tenantId, req.params.id);
    res.json({ success: true });
  } catch {
    res.status(404).json({ error: 'Event not found' });
  }
}

export async function getAgenda(req: Request, res: Response): Promise<void> {
  const date = req.query.date as string;
  if (!date) {
    res.status(400).json({ error: 'date query parameter is required' });
    return;
  }
  const result = await calendarService.getAgenda(req.user!.tenantId, req.user!.userId, date);
  res.json(result);
}
