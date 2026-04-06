import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiKeyService } from '../modules/api-keys/api-key.service';
import type { JwtPayload } from '@amass/shared';

const apiKeyService = new ApiKeyService();

/**
 * Middleware that supports both JWT Bearer token and X-API-Key authentication.
 * If X-API-Key header is present, authenticates via API key.
 * Otherwise, falls through to JWT Bearer token authentication.
 */
export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'] as string | undefined;

  if (apiKey) {
    // Authenticate via API key
    apiKeyService.authenticate(apiKey).then((result) => {
      if (!result) {
        res.status(401).json({ error: 'Invalid or expired API key' });
        return;
      }

      req.user = {
        userId: result.userId,
        tenantId: result.tenantId,
        role: 'READONLY', // API keys use the permissions array for fine-grained access; default to least privilege
      } as JwtPayload;

      // Attach permissions for fine-grained checks
      (req as unknown as Record<string, unknown>).apiKeyPermissions = result.permissions;

      next();
    }).catch(() => {
      res.status(401).json({ error: 'API key authentication failed' });
    });
    return;
  }

  // Fall through to JWT Bearer token authentication
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization header' });
    return;
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
