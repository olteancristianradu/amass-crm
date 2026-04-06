import { Request, Response } from 'express';
import * as whitelabelService from './whitelabel.service';

export async function getConfig(req: Request, res: Response): Promise<void> {
  try {
    const config = await whitelabelService.getConfig(req.user!.tenantId);
    res.json({ config });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get config';
    res.status(500).json({ error: message });
  }
}

export async function updateConfig(req: Request, res: Response): Promise<void> {
  try {
    const config = await whitelabelService.updateConfig(req.user!.tenantId, req.body);
    res.json({ config });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update config';
    res.status(400).json({ error: message });
  }
}

export async function getPublicBranding(req: Request, res: Response): Promise<void> {
  try {
    const branding = await whitelabelService.getPublicBranding(req.params.slug);
    res.json({ branding });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Branding not found';
    res.status(404).json({ error: message });
  }
}
