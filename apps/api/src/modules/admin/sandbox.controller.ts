import { Request, Response } from 'express';
import * as sandboxService from './sandbox.service';

export async function createSandbox(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.user!.tenantId;
    const sandbox = await sandboxService.createSandbox(tenantId);
    res.status(201).json(sandbox);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create sandbox';
    res.status(400).json({ error: message });
  }
}

export async function resetSandbox(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await sandboxService.deleteSandbox(id);
    const sandbox = await sandboxService.createSandbox(req.user!.tenantId);
    res.json({ message: 'Sandbox reset successfully', sandbox });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to reset sandbox';
    res.status(400).json({ error: message });
  }
}

export async function deleteSandbox(req: Request, res: Response): Promise<void> {
  try {
    await sandboxService.deleteSandbox(req.params.id);
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete sandbox';
    res.status(400).json({ error: message });
  }
}

export async function listSandboxes(req: Request, res: Response): Promise<void> {
  try {
    const sandboxes = await sandboxService.listSandboxes(req.user!.tenantId);
    res.json({ sandboxes });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list sandboxes';
    res.status(500).json({ error: message });
  }
}

export async function seedDemoData(req: Request, res: Response): Promise<void> {
  try {
    const counts = await sandboxService.seedDemoData(req.params.id);
    res.json({ message: 'Demo data seeded successfully', counts });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to seed demo data';
    res.status(400).json({ error: message });
  }
}
