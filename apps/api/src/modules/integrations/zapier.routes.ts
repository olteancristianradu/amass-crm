import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth';
import * as zapierService from './zapier.service';

const router = Router();

// All Zapier routes require authentication (API key or JWT)
router.use(authenticate);

// Subscribe to a webhook event
router.post('/zapier/subscribe', async (req: Request, res: Response) => {
  try {
    const { hookUrl, event } = req.body;

    if (!hookUrl || !event) {
      res.status(400).json({ error: 'Missing hookUrl or event' });
      return;
    }

    const webhook = await zapierService.subscribe(req.user!.tenantId, hookUrl, event);
    res.status(201).json(webhook);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Subscribe failed';
    res.status(400).json({ error: message });
  }
});

// Unsubscribe from a webhook
router.delete('/zapier/subscribe/:id', async (req: Request, res: Response) => {
  try {
    const result = await zapierService.unsubscribe(req.params.id);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unsubscribe failed';
    res.status(400).json({ error: message });
  }
});

// Poll trigger - return recent items
router.get('/zapier/poll/:event', async (req: Request, res: Response) => {
  try {
    const since = req.query.since
      ? new Date(req.query.since as string)
      : new Date(Date.now() - 24 * 60 * 60 * 1000); // Default: last 24 hours

    const items = await zapierService.pollTrigger(req.user!.tenantId, req.params.event, since);
    res.json(items);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Poll failed';
    res.status(400).json({ error: message });
  }
});

// Test auth - verify API key / JWT is valid
router.get('/zapier/test', async (req: Request, res: Response) => {
  try {
    const tenant = await zapierService.testAuth(req.user!.tenantId);
    res.json(tenant);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Auth test failed';
    res.status(400).json({ error: message });
  }
});

export default router;
