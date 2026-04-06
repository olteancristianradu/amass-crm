import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth';
import { CalendarSyncService } from './calendar-sync.service';

const router = Router();
const syncService = new CalendarSyncService();

// ─── Google OAuth2 for Calendar ───

router.get('/google/auth', authenticate, (req: Request, res: Response): void => {
  const url = syncService.getGoogleAuthUrl(req.user!.userId, req.user!.tenantId);
  res.json({ url });
});

router.get('/google/callback', async (req: Request, res: Response): Promise<void> => {
  try {
    const code = req.query.code as string;
    const stateRaw = req.query.state as string;

    if (!code || !stateRaw) {
      res.status(400).json({ error: 'Missing code or state parameter' });
      return;
    }

    const state = JSON.parse(stateRaw) as { userId: string; tenantId: string };
    const connection = await syncService.connectGoogle(state.userId, state.tenantId, code);

    res.json({ success: true, connectionId: connection.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Google calendar connect failed';
    res.status(400).json({ error: message });
  }
});

// ─── Outlook OAuth2 for Calendar ───

router.get('/outlook/auth', authenticate, (req: Request, res: Response): void => {
  const url = syncService.getOutlookAuthUrl(req.user!.userId, req.user!.tenantId);
  res.json({ url });
});

router.get('/outlook/callback', async (req: Request, res: Response): Promise<void> => {
  try {
    const code = req.query.code as string;
    const stateRaw = req.query.state as string;

    if (!code || !stateRaw) {
      res.status(400).json({ error: 'Missing code or state parameter' });
      return;
    }

    const state = JSON.parse(stateRaw) as { userId: string; tenantId: string };
    const connection = await syncService.connectOutlook(state.userId, state.tenantId, code);

    res.json({ success: true, connectionId: connection.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Outlook calendar connect failed';
    res.status(400).json({ error: message });
  }
});

// ─── Sync & Disconnect ───

router.post('/:connectionId', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await syncService.syncFromProvider(req.params.connectionId);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed';
    res.status(400).json({ error: message });
  }
});

router.delete('/:connectionId', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    await syncService.disconnect(req.params.connectionId);
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Disconnect failed';
    res.status(400).json({ error: message });
  }
});

export default router;
