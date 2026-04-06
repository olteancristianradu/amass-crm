/**
 * OAuth2 authentication routes for Google and Microsoft login.
 *
 * Mounted at `/api/v1/auth/oauth` in app.ts.
 *
 * Available endpoints:
 *   GET /google                - Redirect to Google consent screen
 *   GET /google/callback       - Handle Google callback, set tokens, redirect to frontend
 *   GET /microsoft             - Redirect to Microsoft consent screen
 *   GET /microsoft/callback    - Handle Microsoft callback, set tokens, redirect to frontend
 *
 * All initiation routes require a `tenant` query parameter (the tenant slug)
 * so the callback can associate the authenticated user with the correct
 * organisation. The slug is round-tripped through the OAuth `state` parameter.
 */

import { Router, Request, Response } from 'express';
import { OAuthService } from './oauth.service';
import { env } from '../../config/env';

const router = Router();
const oauthService = new OAuthService();

// ─── Google OAuth2 ───

/**
 * GET /google
 * Redirects the user to Google's OAuth2 consent screen.
 * Requires `?tenant=<slug>` query parameter to resolve the organisation.
 */
router.get('/google', (req: Request, res: Response): void => {
  const tenantSlug = req.query.tenant as string;
  if (!tenantSlug) {
    res.status(400).json({ error: 'tenant query parameter is required' });
    return;
  }
  const url = oauthService.getGoogleAuthUrl(tenantSlug);
  res.redirect(url);
});

/**
 * GET /google/callback
 * Handles the callback from Google after the user grants consent.
 * Exchanges the authorization code for tokens, finds/creates the user,
 * and redirects to the frontend with the JWT tokens as URL fragment params.
 */
router.get('/google/callback', async (req: Request, res: Response): Promise<void> => {
  try {
    const code = req.query.code as string;
    const tenantSlug = req.query.state as string;

    if (!code || !tenantSlug) {
      res.status(400).json({ error: 'Missing code or state parameter' });
      return;
    }

    const tokens = await oauthService.handleGoogleCallback(code, tenantSlug);

    const frontendUrl = env.CORS_ORIGIN;
    res.redirect(
      `${frontendUrl}/oauth/callback#access_token=${tokens.accessToken}&refresh_token=${tokens.refreshToken}`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Google OAuth failed';
    res.status(401).json({ error: message });
  }
});

// ─── Microsoft OAuth2 ───

/**
 * GET /microsoft
 * Redirects the user to Microsoft's OAuth2 consent screen.
 * Requires `?tenant=<slug>` query parameter.
 */
router.get('/microsoft', (req: Request, res: Response): void => {
  const tenantSlug = req.query.tenant as string;
  if (!tenantSlug) {
    res.status(400).json({ error: 'tenant query parameter is required' });
    return;
  }
  const url = oauthService.getMicrosoftAuthUrl(tenantSlug);
  res.redirect(url);
});

/**
 * GET /microsoft/callback
 * Handles the callback from Microsoft after the user grants consent.
 * Exchanges the authorization code for tokens, finds/creates the user,
 * and redirects to the frontend with the JWT tokens as URL fragment params.
 */
router.get('/microsoft/callback', async (req: Request, res: Response): Promise<void> => {
  try {
    const code = req.query.code as string;
    const tenantSlug = req.query.state as string;

    if (!code || !tenantSlug) {
      res.status(400).json({ error: 'Missing code or state parameter' });
      return;
    }

    const tokens = await oauthService.handleMicrosoftCallback(code, tenantSlug);

    const frontendUrl = env.CORS_ORIGIN;
    res.redirect(
      `${frontendUrl}/oauth/callback#access_token=${tokens.accessToken}&refresh_token=${tokens.refreshToken}`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Microsoft OAuth failed';
    res.status(401).json({ error: message });
  }
});

export default router;
