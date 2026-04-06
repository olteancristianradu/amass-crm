import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis, RateLimiterMemory, RateLimiterAbstract } from 'rate-limiter-flexible';
import { env } from '../config/env';

let standardLimiter: RateLimiterAbstract = null!;
let strictLimiter: RateLimiterAbstract = null!;

function initLimiters() {
  if (env.REDIS_URL) {
    const Redis = require('ioredis');
    const redisClient = new Redis(env.REDIS_URL);
    standardLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'rl_standard',
      points: 100,
      duration: 60,
    });
    strictLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'rl_strict',
      points: 10,
      duration: 60,
    });
  } else {
    standardLimiter = new RateLimiterMemory({ points: 100, duration: 60 });
    strictLimiter = new RateLimiterMemory({ points: 10, duration: 60 });
  }
}

initLimiters();

function createMiddleware(limiter: RateLimiterAbstract) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ip = req.ip || 'unknown';
      const userId = (req as unknown as Record<string, unknown>).user
        ? ((req as unknown as Record<string, { userId?: string }>).user?.userId || '')
        : '';
      const key = userId ? `${ip}_${userId}` : ip;
      await limiter.consume(key);
      next();
    } catch {
      res.status(429).json({ error: 'Too many requests' });
    }
  };
}

export const rateLimitStandard = createMiddleware(standardLimiter);
export const rateLimitStrict = createMiddleware(strictLimiter);
