import { Request, Response } from 'express';
import { TagService } from './tag.service';

const tagService = new TagService();

export async function list(req: Request, res: Response): Promise<void> {
  const entityType = req.query.entityType as string | undefined;
  const tags = await tagService.list(req.user!.tenantId, entityType);
  res.json(tags);
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const tag = await tagService.create(req.user!.tenantId, req.body);
    res.status(201).json(tag);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Create failed';
    const status = (err as any)?.statusCode || 400;
    res.status(status).json({ error: message });
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  try {
    const tag = await tagService.update(req.user!.tenantId, req.params.id, req.body);
    res.json(tag);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Update failed';
    const status = (err as any)?.statusCode || 400;
    res.status(status).json({ error: message });
  }
}

export async function remove(req: Request, res: Response): Promise<void> {
  try {
    await tagService.delete(req.user!.tenantId, req.params.id);
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Delete failed';
    const status = (err as any)?.statusCode || 404;
    res.status(status).json({ error: message });
  }
}

export async function attach(req: Request, res: Response): Promise<void> {
  try {
    const { entityType, entityId, tagName } = req.body;
    await tagService.addToEntity(req.user!.tenantId, entityType, entityId, tagName);
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Attach failed';
    const status = (err as any)?.statusCode || 400;
    res.status(status).json({ error: message });
  }
}

export async function detach(req: Request, res: Response): Promise<void> {
  try {
    const { entityType, entityId, tagName } = req.body;
    await tagService.removeFromEntity(req.user!.tenantId, entityType, entityId, tagName);
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Detach failed';
    const status = (err as any)?.statusCode || 400;
    res.status(status).json({ error: message });
  }
}
