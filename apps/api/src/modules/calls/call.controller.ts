import { Request, Response } from 'express';
import * as callService from './call.service';

/**
 * Handles the POST /initiate request to start a new outbound call.
 *
 * @param req - Express request containing tenantId, userId, to, and optional contactId.
 * @param res - Express response.
 */
export async function initiate(req: Request, res: Response): Promise<void> {
  try {
    const { to, contactId } = req.body;
    const call = await callService.initiateCall(
      req.user!.tenantId,
      req.user!.userId,
      to,
      contactId,
    );
    res.status(201).json(call);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Call initiation failed';
    res.status(400).json({ error: message });
  }
}

/**
 * Handles the POST /webhook/status callback from Twilio with call status updates.
 *
 * @param req - Express request containing CallSid, CallStatus, and optional CallDuration.
 * @param res - Express response.
 */
export async function webhookStatus(req: Request, res: Response): Promise<void> {
  try {
    const { CallSid, CallStatus, CallDuration } = req.body;
    await callService.handleStatusWebhook(
      CallSid,
      CallStatus,
      CallDuration ? parseInt(CallDuration, 10) : undefined,
    );
    res.status(200).json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook processing failed';
    res.status(400).json({ error: message });
  }
}

/**
 * Handles the POST /webhook/recording callback from Twilio when a recording is ready.
 *
 * @param req - Express request containing CallSid, RecordingUrl, and RecordingSid.
 * @param res - Express response.
 */
export async function webhookRecording(req: Request, res: Response): Promise<void> {
  try {
    const { CallSid, RecordingUrl, RecordingSid } = req.body;
    await callService.handleRecordingWebhook(CallSid, RecordingUrl, RecordingSid);
    res.status(200).json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Recording webhook failed';
    res.status(400).json({ error: message });
  }
}

/**
 * Handles the POST /twiml/:callId request, returning TwiML XML for Twilio.
 *
 * @param req - Express request with callId path parameter.
 * @param res - Express response returning TwiML XML.
 */
export async function twiml(req: Request, res: Response): Promise<void> {
  try {
    const xml = await callService.generateTwiML(req.params.callId);
    res.set('Content-Type', 'text/xml');
    res.status(200).send(xml);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'TwiML generation failed';
    res.status(400).json({ error: message });
  }
}

/**
 * Handles the GET / request to list calls with pagination and filters.
 *
 * @param req - Express request with optional query parameters for filtering.
 * @param res - Express response returning paginated call list.
 */
export async function list(req: Request, res: Response): Promise<void> {
  try {
    const result = await callService.getCallLog(req.user!.tenantId, {
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      status: req.query.status as string | undefined,
      userId: req.query.userId as string | undefined,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
    });
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch calls';
    res.status(400).json({ error: message });
  }
}

/**
 * Handles the GET /:id request to retrieve a single call by ID.
 *
 * @param req - Express request with id path parameter.
 * @param res - Express response returning the call record.
 */
export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const call = await callService.getCallById(req.params.id);
    res.json(call);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Call not found';
    res.status(404).json({ error: message });
  }
}
