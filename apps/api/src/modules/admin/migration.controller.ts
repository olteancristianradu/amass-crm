import { Request, Response } from 'express';
import * as migrationService from './migration.service';

export async function importCsv(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.user!.tenantId;
    const { csvContent, mapping } = req.body;

    if (!csvContent || !mapping) {
      res.status(400).json({ error: 'csvContent and mapping are required' });
      return;
    }

    const result = await migrationService.importContactsCsv(tenantId, csvContent, mapping);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'CSV import failed';
    res.status(400).json({ error: message });
  }
}

export async function importJson(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.user!.tenantId;
    const { contacts } = req.body;

    if (!Array.isArray(contacts)) {
      res.status(400).json({ error: 'contacts array is required' });
      return;
    }

    const result = await migrationService.importContactsJson(tenantId, contacts);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'JSON import failed';
    res.status(400).json({ error: message });
  }
}

export async function exportAll(req: Request, res: Response): Promise<void> {
  try {
    const data = await migrationService.exportAllData(req.user!.tenantId);
    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Export failed';
    res.status(500).json({ error: message });
  }
}

export async function importHubspot(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.user!.tenantId;
    const { apiKey } = req.body;

    if (!apiKey) {
      res.status(400).json({ error: 'apiKey is required' });
      return;
    }

    const result = await migrationService.importFromHubspot(tenantId, apiKey);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'HubSpot import failed';
    res.status(400).json({ error: message });
  }
}

export async function importPipedrive(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.user!.tenantId;
    const { apiToken } = req.body;

    if (!apiToken) {
      res.status(400).json({ error: 'apiToken is required' });
      return;
    }

    const result = await migrationService.importFromPipedrive(tenantId, apiToken);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Pipedrive import failed';
    res.status(400).json({ error: message });
  }
}
