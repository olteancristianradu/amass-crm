import { Request, Response } from 'express';
import { CustomFieldService } from './custom-field.service';

const customFieldService = new CustomFieldService();

export async function listDefinitions(req: Request, res: Response): Promise<void> {
  const entityType = req.query.entityType as string | undefined;
  const definitions = await customFieldService.listDefinitions(req.user!.tenantId, entityType);
  res.json(definitions);
}

export async function createDefinition(req: Request, res: Response): Promise<void> {
  try {
    const definition = await customFieldService.createDefinition(req.user!.tenantId, req.body);
    res.status(201).json(definition);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Create failed';
    const status = (err as any)?.statusCode || 400;
    res.status(status).json({ error: message });
  }
}

export async function updateDefinition(req: Request, res: Response): Promise<void> {
  try {
    const definition = await customFieldService.updateDefinition(req.user!.tenantId, req.params.id, req.body);
    res.json(definition);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Update failed';
    const status = (err as any)?.statusCode || 400;
    res.status(status).json({ error: message });
  }
}

export async function deleteDefinition(req: Request, res: Response): Promise<void> {
  try {
    await customFieldService.deleteDefinition(req.user!.tenantId, req.params.id);
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Delete failed';
    const status = (err as any)?.statusCode || 404;
    res.status(status).json({ error: message });
  }
}

export async function getValues(req: Request, res: Response): Promise<void> {
  const entityType = req.query.entityType as string;
  const entityId = req.query.entityId as string;
  if (!entityType || !entityId) {
    res.status(400).json({ error: 'entityType and entityId query parameters are required' });
    return;
  }
  const values = await customFieldService.getValues(req.user!.tenantId, entityType, entityId);
  res.json(values);
}

export async function setValues(req: Request, res: Response): Promise<void> {
  try {
    const { entityType, entityId, values } = req.body;
    const results = await customFieldService.setValues(req.user!.tenantId, entityType, entityId, values);
    res.json(results);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Set values failed';
    const status = (err as any)?.statusCode || 400;
    res.status(status).json({ error: message });
  }
}

export async function deleteValue(req: Request, res: Response): Promise<void> {
  try {
    const entityType = req.query.entityType as string;
    const entityId = req.query.entityId as string;
    if (!entityType || !entityId) {
      res.status(400).json({ error: 'entityType and entityId query parameters are required' });
      return;
    }
    await customFieldService.deleteValue(req.user!.tenantId, entityType, entityId, req.params.defId);
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Delete failed';
    const status = (err as any)?.statusCode || 404;
    res.status(status).json({ error: message });
  }
}
