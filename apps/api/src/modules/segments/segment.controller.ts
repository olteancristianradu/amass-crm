import { Request, Response } from 'express';
import * as segmentService from './segment.service';
import { createSegmentSchema, updateSegmentSchema } from './segment.schema';

export async function listSegments(req: Request, res: Response): Promise<void> {
  try {
    const segments = await segmentService.listSegments(req.user!.tenantId);
    res.json({ segments });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list segments';
    res.status(500).json({ error: message });
  }
}

export async function createSegment(req: Request, res: Response): Promise<void> {
  try {
    const parsed = createSegmentSchema.parse(req.body);
    const segment = await segmentService.createSegment(req.user!.tenantId, {
      ...parsed,
      createdBy: req.user!.userId,
    });
    res.status(201).json(segment);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create segment';
    res.status(400).json({ error: message });
  }
}

export async function getSegmentContacts(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const result = await segmentService.getSegmentContacts(req.params.id, page, limit);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get segment contacts';
    res.status(400).json({ error: message });
  }
}

export async function updateSegment(req: Request, res: Response): Promise<void> {
  try {
    const parsed = updateSegmentSchema.parse(req.body);
    const segment = await segmentService.updateSegment(req.params.id, req.user!.tenantId, parsed);
    res.json(segment);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update segment';
    res.status(400).json({ error: message });
  }
}

export async function deleteSegment(req: Request, res: Response): Promise<void> {
  try {
    await segmentService.deleteSegment(req.params.id, req.user!.tenantId);
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete segment';
    res.status(400).json({ error: message });
  }
}

export async function refreshCounts(req: Request, res: Response): Promise<void> {
  try {
    const updated = await segmentService.refreshSegmentCounts(req.user!.tenantId);
    res.json({ updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to refresh counts';
    res.status(500).json({ error: message });
  }
}
