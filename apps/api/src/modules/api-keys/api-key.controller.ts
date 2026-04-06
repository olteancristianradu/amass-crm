import { Request, Response } from 'express';
import { ApiKeyService } from './api-key.service';

const apiKeyService = new ApiKeyService();

export async function list(req: Request, res: Response): Promise<void> {
  const keys = await apiKeyService.list(req.user!.tenantId);
  res.json(keys);
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const result = await apiKeyService.create(req.user!.tenantId, req.user!.userId, req.body);
    res.status(201).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Create failed';
    res.status(400).json({ error: message });
  }
}

export async function revoke(req: Request, res: Response): Promise<void> {
  try {
    await apiKeyService.revoke(req.user!.tenantId, req.params.id);
    res.json({ success: true });
  } catch {
    res.status(404).json({ error: 'API Key not found' });
  }
}
