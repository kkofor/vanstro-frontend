import type { Context } from "hono";

type RedisRateLimitClient = {
  incr(key: string): Promise<number>;
  pexpire(key: string, ttlMs: number): Promise<void>;
};

let redisClient: RedisRateLimitClient | undefined;

export function configureRedisRateLimit(client: RedisRateLimitClient | undefined) {
  redisClient = client;
}

export async function incrementDistributedBucket(key: string, windowMs: number) {
  if (!redisClient) return undefined;
  const count = await redisClient.incr(key);
  if (count === 1) await redisClient.pexpire(key, windowMs);
  return count;
}

export function redisRateLimitConfigured() {
  return Boolean(redisClient);
}

export function maybeAttachRateLimitHeaders(context: Context, limit: number, remaining: number) {
  context.header("X-RateLimit-Limit", String(limit));
  context.header("X-RateLimit-Remaining", String(Math.max(0, remaining)));
}
