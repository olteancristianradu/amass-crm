import { Request, Response } from 'express';
import { PipelineService } from './pipeline.service';

const pipelineService = new PipelineService();

export async function list(req: Request, res: Response): Promise<void> {
  const pipelines = await pipelineService.list(req.user!.tenantId);
  res.json(pipelines);
}

export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const pipeline = await pipelineService.getById(req.user!.tenantId, req.params.id);
    res.json(pipeline);
  } catch {
    res.status(404).json({ error: 'Pipeline not found' });
  }
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const pipeline = await pipelineService.create(req.user!.tenantId, req.body);
    res.status(201).json(pipeline);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Create failed';
    res.status(400).json({ error: message });
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  try {
    const pipeline = await pipelineService.update(req.user!.tenantId, req.params.id, req.body);
    res.json(pipeline);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Update failed';
    res.status(400).json({ error: message });
  }
}

export async function remove(req: Request, res: Response): Promise<void> {
  try {
    await pipelineService.delete(req.user!.tenantId, req.params.id);
    res.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message.includes('Cannot delete')) {
      res.status(409).json({ error: err.message });
      return;
    }
    res.status(404).json({ error: 'Pipeline not found' });
  }
}

export async function reorderStages(req: Request, res: Response): Promise<void> {
  try {
    const pipeline = await pipelineService.reorderStages(req.user!.tenantId, req.params.id, req.body.stages);
    res.json(pipeline);
  } catch {
    res.status(404).json({ error: 'Pipeline not found' });
  }
}
