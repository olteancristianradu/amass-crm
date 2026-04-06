import { Request, Response } from 'express';
import { SequenceService } from './sequence.service';

const sequenceService = new SequenceService();

export async function list(req: Request, res: Response): Promise<void> {
  const result = await sequenceService.listSequences(req.user!.tenantId);
  res.json(result);
}

export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const sequence = await sequenceService.getSequence(req.params.id);
    res.json(sequence);
  } catch {
    res.status(404).json({ error: 'Sequence not found' });
  }
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const sequence = await sequenceService.createSequence(req.user!.tenantId, req.user!.userId, req.body);
    res.status(201).json(sequence);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Create failed';
    res.status(400).json({ error: message });
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  try {
    const sequence = await sequenceService.updateSequence(req.params.id, req.body);
    res.json(sequence);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Update failed';
    res.status(400).json({ error: message });
  }
}

export async function remove(req: Request, res: Response): Promise<void> {
  try {
    await sequenceService.deleteSequence(req.params.id);
    res.json({ success: true });
  } catch {
    res.status(404).json({ error: 'Sequence not found' });
  }
}

export async function enroll(req: Request, res: Response): Promise<void> {
  try {
    const enrollment = await sequenceService.enrollContact(req.params.id, req.body.contactId, req.user!.tenantId);
    res.status(201).json(enrollment);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Enroll failed';
    res.status(400).json({ error: message });
  }
}

export async function unenroll(req: Request, res: Response): Promise<void> {
  try {
    const enrollment = await sequenceService.unenrollContact(req.params.enrollmentId);
    res.json(enrollment);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unenroll failed';
    res.status(400).json({ error: message });
  }
}

export async function stats(req: Request, res: Response): Promise<void> {
  try {
    const result = await sequenceService.getSequenceStats(req.params.id);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stats failed';
    res.status(400).json({ error: message });
  }
}
