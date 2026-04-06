import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth';
import { env } from '../../config/env';
import * as slackService from './slack.service';

const router = Router();

// Slack OAuth install - redirect to Slack
router.get('/slack/install', authenticate, async (req: Request, res: Response) => {
  try {
    const url = slackService.getInstallUrl(req.user!.tenantId);
    res.redirect(url);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate install URL';
    res.status(400).json({ error: message });
  }
});

// Slack OAuth callback - no auth (redirect from Slack)
router.get('/slack/callback', async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string;
    const tenantId = req.query.state as string;

    if (!code || !tenantId) {
      res.status(400).json({ error: 'Missing code or state parameter' });
      return;
    }

    const result = await slackService.handleOAuthCallback(code, tenantId);
    res.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OAuth callback failed';
    res.status(400).json({ error: message });
  }
});

// Slack slash commands - no JWT auth, verify Slack signature
router.post('/slack/commands', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-slack-signature'] as string;
    const timestamp = req.headers['x-slack-request-timestamp'] as string;

    if (!signature || !timestamp) {
      res.status(401).json({ error: 'Missing Slack signature headers' });
      return;
    }

    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const isValid = slackService.verifySlackSignature(signature, timestamp, rawBody, env.SLACK_SIGNING_SECRET);

    if (!isValid) {
      res.status(401).json({ error: 'Invalid Slack signature' });
      return;
    }

    const result = await slackService.handleSlashCommand(req.body);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Command processing failed';
    res.status(400).json({ error: message });
  }
});

// Slack events API webhook - no JWT auth
router.post('/slack/events', async (req: Request, res: Response) => {
  try {
    // Handle Slack URL verification challenge
    if (req.body.type === 'url_verification') {
      res.json({ challenge: req.body.challenge });
      return;
    }

    const signature = req.headers['x-slack-signature'] as string;
    const timestamp = req.headers['x-slack-request-timestamp'] as string;

    if (signature && timestamp) {
      const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const isValid = slackService.verifySlackSignature(signature, timestamp, rawBody, env.SLACK_SIGNING_SECRET);

      if (!isValid) {
        res.status(401).json({ error: 'Invalid Slack signature' });
        return;
      }
    }

    // Acknowledge receipt
    res.status(200).json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Event processing failed';
    res.status(400).json({ error: message });
  }
});

export default router;
