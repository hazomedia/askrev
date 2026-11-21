import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import type { Request } from 'express';

export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number;
  currentCount: number;
}

/**
 * Safely extracts client IP taking into account reverse proxy configurations
 */
export function getClientIp(req: Request): string {
  // When Express 'trust proxy' is configured, req.ip resolves to the trusted client IP.
  const expressIp = req.ip;
  if (expressIp) {
    return expressIp.replace(/^::ffff:/, '').trim();
  }

  // Fallback to x-forwarded-for handling (take the leftmost client IP)
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    const ips = forwarded.split(',').map((ip) => ip.trim());
    const clientIp = ips[0].replace(/^::ffff:/, '').trim();
    if (clientIp) return clientIp;
  } else if (Array.isArray(forwarded) && forwarded.length > 0) {
    const clientIp = forwarded[0].replace(/^::ffff:/, '').trim();
    if (clientIp) return clientIp;
  }

  const socketIp = req.socket?.remoteAddress || '';
  return socketIp.replace(/^::ffff:/, '').trim() || 'unknown';
}

@Injectable()
export class RateLimiterService implements OnModuleDestroy {
  private readonly logger = new Logger(RateLimiterService.name);
  private redisClient: Redis | null = null;
  private memoryBuckets = new Map<string, { count: number; resetAt: number }>();
  private isRedisAvailable = false;
  private readonly isStrictProduction: boolean =
    process.env.NODE_ENV === 'production' || process.env.RATE_LIMIT_STRICT === 'true';

  constructor() {
    const redisUrl = process.env.REDIS_URL || process.env.REDIS_TLS_URL;
    if (redisUrl) {
      try {
        this.redisClient = new Redis(redisUrl, {
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
          connectTimeout: 2000,
          lazyConnect: true,
        });

        this.redisClient
          .connect()
          .then(() => {
            this.isRedisAvailable = true;
            this.logger.log('🚀 Distributed Redis Rate Limiter connected successfully.');
          })
          .catch((err) => {
            this.logger.warn(`Redis connection failed (${err.message}). Strict security status: ${this.isStrictProduction ? 'FAIL-CLOSED (SECURE)' : 'MEMORY-FALLBACK'}`);
            this.isRedisAvailable = false;
          });

        this.redisClient.on('error', (err) => {
          this.logger.warn(`Redis connection error: ${err.message}. Strict security status: ${this.isStrictProduction ? 'FAIL-CLOSED (SECURE)' : 'MEMORY-FALLBACK'}`);
          this.isRedisAvailable = false;
        });

        this.redisClient.on('connect', () => {
          this.isRedisAvailable = true;
        });
      } catch (err: any) {
        this.logger.warn(`Failed to initialize Redis client (${err.message}).`);
      }
    } else {
      this.logger.log(`ℹ️ REDIS_URL not configured. Status: ${this.isStrictProduction ? 'FAIL-CLOSED ON SENSITIVE OPS' : 'LOCAL-DEV MEMORY STORE'}`);
    }
  }

  /**
   * Evaluates rate limit for a specified key using atomic Redis Lua script or fallback.
   * If isSensitive is true in strict production and the shared Redis backend is unavailable,
   * fails closed (denies requests) to prevent distributed brute-force attacks across cluster nodes.
   */
  async checkLimit(
    key: string,
    maxRequests: number,
    windowMs: number,
    isSensitive: boolean = false
  ): Promise<RateLimitResult> {
    if (this.isRedisAvailable && this.redisClient) {
      try {
        const fullKey = `ratelimit:${key}`;
        // Atomic Lua script: INCR + PEXPIRE upon creation + PTTL
        const luaScript = `
          local current = redis.call('INCR', KEYS[1])
          if current == 1 then
            redis.call('PEXPIRE', KEYS[1], ARGV[1])
          end
          local ttl = redis.call('PTTL', KEYS[1])
          return { current, ttl }
        `;
        const result: any = await this.redisClient.eval(luaScript, 1, fullKey, windowMs);

        if (Array.isArray(result) && result.length >= 2) {
          const count = Number(result[0]);
          let ttlMs = Number(result[1]);
          if (ttlMs <= 0) ttlMs = windowMs;

          if (count > maxRequests) {
            const retryAfter = Math.max(1, Math.ceil(ttlMs / 1000));
            return { allowed: false, retryAfter, currentCount: count };
          }

          return { allowed: true, retryAfter: 0, currentCount: count };
        }
      } catch (err: any) {
        this.logger.warn(`Redis checkLimit failed (${err.message}).`);
      }
    }

    // Fail-closed security rule for production sensitive operations when shared Redis is unavailable
    if (isSensitive && this.isStrictProduction && !this.isRedisAvailable) {
      this.logger.error(
        `CRITICAL: Shared rate-limit backend unavailable for sensitive operation '${key}'. Failing closed to protect accounts.`
      );
      return {
        allowed: false,
        retryAfter: 60,
        currentCount: maxRequests + 1,
      };
    }

    // Non-production or non-sensitive local memory bucket fallback
    const now = Date.now();
    const existing = this.memoryBuckets.get(key);
    if (!existing || existing.resetAt <= now) {
      this.memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
      if (this.memoryBuckets.size > 10000) {
        for (const [k, v] of this.memoryBuckets.entries()) {
          if (v.resetAt <= now) this.memoryBuckets.delete(k);
        }
      }
      return { allowed: true, retryAfter: 0, currentCount: 1 };
    }

    existing.count += 1;
    if (existing.count > maxRequests) {
      const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      return { allowed: false, retryAfter, currentCount: existing.count };
    }

    return { allowed: true, retryAfter: 0, currentCount: existing.count };
  }

  /**
   * Resets limit for a key (e.g. upon successful authentication or MFA completion)
   */
  async resetLimit(key: string): Promise<void> {
    if (this.isRedisAvailable && this.redisClient) {
      try {
        await this.redisClient.del(`ratelimit:${key}`);
      } catch {}
    }
    this.memoryBuckets.delete(key);
  }

  onModuleDestroy() {
    if (this.redisClient) {
      try {
        this.redisClient.disconnect();
      } catch {}
    }
  }
}
