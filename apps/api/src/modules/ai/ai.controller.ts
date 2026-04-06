import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { AiService } from './ai.service';

const aiService = new AiService();

export async function scoreContact(req: Request, res: Response): Promise<void> {
  try {
    const result = await aiService.scoreContact(req.user!.tenantId, req.body.contactId);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Scoring failed';
    res.status(400).json({ error: message });
  }
}

export async function scoreAllContacts(req: Request, res: Response): Promise<void> {
  try {
    const result = await aiService.scoreAllContacts(req.user!.tenantId);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Batch scoring failed';
    res.status(400).json({ error: message });
  }
}

export async function draftEmail(req: Request, res: Response): Promise<void> {
  try {
    const result = await aiService.draftEmail(req.user!.tenantId, req.body);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Draft generation failed';
    res.status(400).json({ error: message });
  }
}

export async function suggestNextAction(req: Request, res: Response): Promise<void> {
  try {
    const result = await aiService.suggestNextAction(req.user!.tenantId, req.body);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Suggestion failed';
    res.status(400).json({ error: message });
  }
}

export async function analyzeSentiment(req: Request, res: Response): Promise<void> {
  const result = aiService.analyzeSentiment(req.body.text);
  res.json(result);
}

export async function predictChurn(req: Request, res: Response): Promise<void> {
  try {
    const result = await aiService.predictChurn(req.user!.tenantId, req.body.dealId);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Prediction failed';
    res.status(400).json({ error: message });
  }
}

export async function transcribeCall(req: Request, res: Response): Promise<void> {
  try {
    const result = await aiService.transcribeCall(req.params.callId);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Transcription failed';
    res.status(400).json({ error: message });
  }
}

export async function summarizeCall(req: Request, res: Response): Promise<void> {
  try {
    const call = await prisma.call.findUnique({ where: { id: req.params.callId } });
    if (!call?.transcript) { res.status(400).json({ error: 'No transcript available. Transcribe first.' }); return; }
    const result = await aiService.summarizeTranscript(call.transcript);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Summarization failed';
    res.status(400).json({ error: message });
  }
}

export async function callInsights(req: Request, res: Response): Promise<void> {
  try {
    const call = await prisma.call.findUnique({ where: { id: req.params.callId } });
    if (!call?.transcript) { res.status(400).json({ error: 'No transcript' }); return; }
    const sentiment = aiService.analyzeCallSentiment(call.transcript);
    const summary = await aiService.summarizeTranscript(call.transcript);
    res.json({ ...summary, sentiment });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Insights failed';
    res.status(400).json({ error: message });
  }
}
