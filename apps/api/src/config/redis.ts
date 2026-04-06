import Redis from 'ioredis';
import { env } from './env';

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    if (!env.REDIS_URL) {
      throw new Error('REDIS_URL not configured');
    }
    redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    redis.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message);
    });
  }
  return redis;
}

export async function connectRedis(): Promise<void> {
  if (!env.REDIS_URL) {
    console.warn('[Redis] REDIS_URL not set, skipping Redis connection');
    return;
  }
  const client = getRedis();
  await client.connect();
  console.log('[Redis] Connected');
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
