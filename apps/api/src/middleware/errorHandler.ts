import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import { AppError } from '../utils/errors';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    // Only report 5xx-level AppErrors to Sentry
    if (err.statusCode >= 500) {
      Sentry.captureException(err);
    }
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      ...('details' in err ? { details: (err as any).details } : {}),
    });
    return;
  }

  // Capture unhandled errors in Sentry
  Sentry.captureException(err);

  console.error('[ERROR]', err.message, err.stack);

  res.status(500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
}
