import { Request, Response } from 'express';
import { UserService } from './user.service';

const userService = new UserService();

export async function list(req: Request, res: Response): Promise<void> {
  const users = await userService.list(req.user!.tenantId);
  res.json(users);
}

export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const user = await userService.getById(req.user!.tenantId, req.params.id);
    res.json(user);
  } catch {
    res.status(404).json({ error: 'User not found' });
  }
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const user = await userService.create(req.user!.tenantId, req.body);
    res.status(201).json(user);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Create failed';
    res.status(400).json({ error: message });
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  try {
    const user = await userService.update(req.user!.tenantId, req.params.id, req.body);
    res.json(user);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Update failed';
    res.status(400).json({ error: message });
  }
}

export async function remove(req: Request, res: Response): Promise<void> {
  try {
    await userService.delete(req.user!.tenantId, req.params.id);
    res.json({ success: true });
  } catch {
    res.status(404).json({ error: 'User not found' });
  }
}
