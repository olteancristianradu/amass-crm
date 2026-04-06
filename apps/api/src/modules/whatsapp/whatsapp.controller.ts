import { Request, Response } from 'express';
import * as whatsappService from './whatsapp.service';

export async function sendMessage(req: Request, res: Response): Promise<void> {
  try {
    const { to, body, contactId } = req.body;
    const record = await whatsappService.sendMessage(req.user!.tenantId, to, body, contactId);
    res.status(201).json(record);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Send failed';
    res.status(400).json({ error: message });
  }
}

export async function sendTemplate(req: Request, res: Response): Promise<void> {
  try {
    const { to, templateName, parameters } = req.body;
    const result = await whatsappService.sendTemplate(
      req.user!.tenantId,
      to,
      templateName,
      parameters || [],
    );
    res.status(201).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Template send failed';
    res.status(400).json({ error: message });
  }
}

export async function verifyWebhook(req: Request, res: Response): Promise<void> {
  try {
    const { challenge } = whatsappService.verifyWebhook(req);
    res.status(200).send(challenge);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Verification failed';
    res.status(403).json({ error: message });
  }
}

export async function handleWebhook(req: Request, res: Response): Promise<void> {
  try {
    const result = await whatsappService.handleWebhook(req);
    res.status(200).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook processing failed';
    res.status(400).json({ error: message });
  }
}
