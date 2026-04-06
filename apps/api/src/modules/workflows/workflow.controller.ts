import { Request, Response } from 'express';
import { WorkflowService } from './workflow.service';

const workflowService = new WorkflowService();

export async function list(req: Request, res: Response): Promise<void> {
  const workflows = await workflowService.list(req.user!.tenantId);
  res.json(workflows);
}

export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const workflow = await workflowService.getById(req.user!.tenantId, req.params.id);
    res.json(workflow);
  } catch {
    res.status(404).json({ error: 'Workflow not found' });
  }
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const workflow = await workflowService.create(req.user!.tenantId, req.body);
    res.status(201).json(workflow);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Create failed';
    res.status(400).json({ error: message });
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  try {
    const workflow = await workflowService.update(req.user!.tenantId, req.params.id, req.body);
    res.json(workflow);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Update failed';
    res.status(400).json({ error: message });
  }
}

export async function remove(req: Request, res: Response): Promise<void> {
  try {
    await workflowService.delete(req.user!.tenantId, req.params.id);
    res.json({ success: true });
  } catch {
    res.status(404).json({ error: 'Workflow not found' });
  }
}

export async function toggle(req: Request, res: Response): Promise<void> {
  try {
    const workflow = await workflowService.toggle(req.user!.tenantId, req.params.id);
    res.json(workflow);
  } catch {
    res.status(404).json({ error: 'Workflow not found' });
  }
}

export async function execute(req: Request, res: Response): Promise<void> {
  try {
    const { entityType, entityId } = req.body;
    const execution = await workflowService.execute(
      req.user!.tenantId,
      req.params.id,
      entityType,
      entityId,
    );
    res.json(execution);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Execution failed';
    res.status(400).json({ error: message });
  }
}

export async function getExecutions(req: Request, res: Response): Promise<void> {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const result = await workflowService.getExecutions(
      req.user!.tenantId,
      req.params.id,
      page,
      limit,
    );
    res.json(result);
  } catch {
    res.status(404).json({ error: 'Workflow not found' });
  }
}
