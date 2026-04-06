import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth';
import * as trackingService from './email-tracking.service';

const router = Router();

const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

// Tracking endpoints - no auth required (called from email clients)
router.get('/track/open/:emailId', async (req: Request, res: Response) => {
  await trackingService.recordOpen(
    req.params.emailId,
    req.ip,
    req.headers['user-agent'],
  );
  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-store');
  res.send(PIXEL);
});

router.get('/track/click/:emailId', async (req: Request, res: Response) => {
  const url = req.query.url as string;
  await trackingService.recordClick(req.params.emailId, url || '', req.ip);

  if (url) {
    res.redirect(302, url);
  } else {
    res.status(204).send();
  }
});

// Stats endpoint - requires authentication
router.get('/track/stats/:emailId', authenticate, async (req: Request, res: Response) => {
  try {
    const stats = await trackingService.getTrackingStats(req.params.emailId);
    res.json(stats);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get tracking stats';
    res.status(404).json({ error: message });
  }
});

export default router;
