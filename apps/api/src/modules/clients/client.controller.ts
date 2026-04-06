import { Request, Response } from 'express';
import type { Stage } from '@amass/shared';
import { ClientService } from './client.service';

const clientService = new ClientService();

export async function list(req: Request, res: Response): Promise<void> {
  const filters = {
    search: req.query.search as string,
    stage: req.query.stage as Stage | undefined,
    assignedToId: req.query.assignedTo as string,
    hasSolar: req.query.hasSolar === 'true' ? true : req.query.hasSolar === 'false' ? false : undefined,
    sort: req.query.sort as string,
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
  };
  const result = await clientService.list(req.user!.tenantId, filters);
  res.json(result);
}

export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const client = await clientService.getById(req.user!.tenantId, req.params.id);
    res.json(client);
  } catch {
    res.status(404).json({ error: 'Client not found' });
  }
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const client = await clientService.create(req.user!.tenantId, req.user!.userId, req.body);
    res.status(201).json(client);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Create failed';
    res.status(400).json({ error: message });
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  try {
    const client = await clientService.update(req.user!.tenantId, req.user!.userId, req.params.id, req.body);
    res.json(client);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Update failed';
    res.status(400).json({ error: message });
  }
}

export async function moveStage(req: Request, res: Response): Promise<void> {
  try {
    const { stage, lossReason, lossNote } = req.body;
    const client = await clientService.moveStage(req.user!.tenantId, req.user!.userId, req.params.id, stage, lossReason, lossNote);
    res.json(client);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Move failed';
    res.status(400).json({ error: message });
  }
}

export async function remove(req: Request, res: Response): Promise<void> {
  try {
    await clientService.delete(req.user!.tenantId, req.params.id);
    res.json({ success: true });
  } catch {
    res.status(404).json({ error: 'Client not found' });
  }
}

export async function importEmail(req: Request, res: Response): Promise<void> {
  try {
    const { rawText, assignTo } = req.body;
    const result = await clientService.importFromEmail(req.user!.tenantId, req.user!.userId, rawText, assignTo);
    res.status(201).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Import failed';
    res.status(400).json({ error: message });
  }
}

export async function importBatch(req: Request, res: Response): Promise<void> {
  try {
    const results = [];
    for (const item of req.body.emails) {
      const result = await clientService.importFromEmail(req.user!.tenantId, req.user!.userId, item.rawText, item.assignTo);
      results.push(result);
    }
    res.status(201).json({ imported: results.length, results });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Batch import failed';
    res.status(400).json({ error: message });
  }
}

export async function exportCsv(req: Request, res: Response): Promise<void> {
  const csv = await clientService.exportCsv(req.user!.tenantId);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=clients.csv');
  res.send('\uFEFF' + csv);
}

export async function checkDuplicate(req: Request, res: Response): Promise<void> {
  const phone = req.query.phone as string;
  const dup = await clientService.checkDuplicate(req.user!.tenantId, phone);
  res.json({ duplicate: dup });
}
