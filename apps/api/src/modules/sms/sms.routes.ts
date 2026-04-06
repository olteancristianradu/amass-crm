import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { sendSmsSchema } from './sms.schema';
import * as ctrl from './sms.controller';
import * as twilioService from './twilio.service';

const router = Router();

// Inbound webhook - no auth required
router.post('/inbound', ctrl.recordInbound);

// Twilio inbound SMS webhook — no auth required (called by Twilio)
router.post('/webhook/inbound', async (req: Request, res: Response) => {
  try {
    await twilioService.handleInboundWebhook(req);
    res.set('Content-Type', 'text/xml');
    res.status(200).send('<Response></Response>');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook processing failed';
    res.status(400).json({ error: message });
  }
});

// Twilio status callback webhook — no auth required (called by Twilio)
router.post('/webhook/status', async (req: Request, res: Response) => {
  try {
    await twilioService.handleStatusCallback(req);
    res.status(200).json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Status callback failed';
    res.status(400).json({ error: message });
  }
});

// All other routes require authentication
router.use(authenticate);

router.get('/', ctrl.list);
router.post('/send', validate(sendSmsSchema), ctrl.send);
router.get('/conversation/:contactId', ctrl.getConversation);
router.get('/stats', ctrl.getStats);

export default router;
