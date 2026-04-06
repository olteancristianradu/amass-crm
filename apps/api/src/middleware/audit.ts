import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';

/**
 * Extract entity type and entity ID from the request URL.
 * E.g., /api/v1/contacts/abc-123 → { entityType: 'contact', entityId: 'abc-123' }
 */
function parseRoute(path: string): { entityType: string | null; entityId: string | null } {
  // Match /api/v1/{resource}/{id} or /api/v1/{resource}
  const match = path.match(/\/api\/v1\/([a-z-]+)(?:\/([a-f0-9-]+))?/);
  if (!match) return { entityType: null, entityId: null };

  // Singularize: "contacts" → "contact", "companies" → "company", "api-keys" → "api_key"
  let entityType = match[1].replace(/-/g, '_');
  if (entityType.endsWith('ies')) {
    entityType = entityType.slice(0, -3) + 'y';
  } else if (entityType.endsWith('s') && !entityType.endsWith('ss')) {
    entityType = entityType.slice(0, -1);
  }

  return { entityType, entityId: match[2] || null };
}

/**
 * Map HTTP method to audit action
 */
function getAction(method: string, path: string): string {
  const lowerPath = path.toLowerCase();

  // Special actions based on path patterns
  if (lowerPath.includes('/merge')) return 'merge';
  if (lowerPath.includes('/import')) return 'import';
  if (lowerPath.includes('/export')) return 'export';
  if (lowerPath.includes('/move')) return 'stage_change';
  if (lowerPath.includes('/won')) return 'deal_won';
  if (lowerPath.includes('/lost')) return 'deal_lost';
  if (lowerPath.includes('/login')) return 'login';
  if (lowerPath.includes('/logout')) return 'logout';
  if (lowerPath.includes('/assign')) return 'assign';
  if (lowerPath.includes('/execute')) return 'execute';

  // Generic CRUD actions
  switch (method) {
    case 'POST': return 'create';
    case 'PUT':
    case 'PATCH': return 'update';
    case 'DELETE': return 'delete';
    default: return method.toLowerCase();
  }
}

/**
 * Middleware that automatically logs all mutation requests (POST, PUT, PATCH, DELETE)
 * to the AuditLog table. Must be placed AFTER the authenticate middleware.
 */
export function auditMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Only audit mutations
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    next();
    return;
  }

  // Skip health checks and auth refresh (too noisy)
  if (req.path.includes('/health') || req.path.includes('/refresh')) {
    next();
    return;
  }

  // Capture the original res.json to log after response
  const originalJson = res.json.bind(res);

  res.json = function(body: unknown) {
    // Log asynchronously — don't block the response
    const user = req.user;
    if (user) {
      const { entityType, entityId } = parseRoute(req.originalUrl || req.path);
      const action = getAction(req.method, req.originalUrl || req.path);

      // Sanitize body — remove sensitive fields
      const sanitizedBody = { ...req.body };
      delete sanitizedBody.pin;
      delete sanitizedBody.password;
      delete sanitizedBody.passwordHash;
      delete sanitizedBody.currentPassword;
      delete sanitizedBody.newPassword;
      delete sanitizedBody.accessToken;
      delete sanitizedBody.refreshToken;
      delete sanitizedBody.totpSecret;

      prisma.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.userId,
          action,
          entityType,
          entityId,
          metadata: {
            method: req.method,
            path: req.originalUrl || req.path,
            statusCode: res.statusCode,
            requestBody: Object.keys(sanitizedBody).length > 0 ? sanitizedBody : undefined,
          },
          ipAddress: (req.ip || req.socket.remoteAddress || null) as string | null,
          userAgent: (req.headers['user-agent'] || null) as string | null,
        },
      }).catch((err) => {
        console.error('Audit log write failed:', err);
      });
    }

    return originalJson(body);
  } as typeof res.json;

  next();
}
