import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RateLimiterService } from '../common/rate-limiter.service';
import { hashToken } from './jwt-secrets';

@Injectable()
export class TokenRevocationService {
  private readonly logger = new Logger(TokenRevocationService.name);
  private readonly localCache = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly rateLimiter: RateLimiterService
  ) {}

  clearLocalCache(): void {
    this.localCache.clear();
  }

  /**
   * Persistently and distributively revokes an individual token (e.g. enrollment token or access token)
   */
  async revokeToken(token: string, expSeconds?: number, reason: string = 'REVOKED'): Promise<void> {
    if (!token) return;
    const tokenHash = hashToken(token);
    const expiresAt = new Date(expSeconds ? expSeconds * 1000 : Date.now() + 24 * 60 * 60 * 1000);
    const expiresAtMs = expiresAt.getTime();

    // 1. Update hot local in-memory cache
    this.localCache.set(tokenHash, expiresAtMs);

    // 2. Update persistent database storage (PostgreSQL)
    try {
      await this.prisma.revokedToken.upsert({
        where: { tokenHash },
        create: {
          tokenHash,
          expiresAt,
          reason,
        },
        update: {},
      });
    } catch (err: any) {
      this.logger.error(`Failed to persist revoked token in database: ${err.message}`);
    }

    // 3. Update distributed Redis cache if client is available
    const redis = this.rateLimiter.getRedisClient();
    if (redis && this.rateLimiter.isRedisHealthy()) {
      try {
        const ttlSeconds = Math.max(1, Math.ceil((expiresAtMs - Date.now()) / 1000));
        await redis.setex(`revoked_token:${tokenHash}`, ttlSeconds, '1');
      } catch (err: any) {
        this.logger.warn(`Failed to set revoked token in Redis: ${err.message}`);
      }
    }

    // Clean up local cache if large
    if (this.localCache.size > 5000) {
      const now = Date.now();
      for (const [k, exp] of this.localCache.entries()) {
        if (exp <= now) this.localCache.delete(k);
      }
    }
  }

  /**
   * Distributed check if a token has been revoked.
   * CRITICAL SECURITY INVARIANT:
   * Verification must NEVER fail open when both Redis and PostgreSQL verification are unavailable.
   */
  async isTokenRevoked(token: string): Promise<boolean> {
    if (!token) return false;
    const tokenHash = hashToken(token);
    const now = Date.now();

    // 1. Check hot in-memory cache
    const cachedExp = this.localCache.get(tokenHash);
    if (cachedExp) {
      if (cachedExp > now) {
        return true;
      }
      this.localCache.delete(tokenHash);
    }

    let redisAvailable = false;

    // 2. Check distributed Redis
    const redis = this.rateLimiter.getRedisClient();
    if (redis && this.rateLimiter.isRedisHealthy()) {
      try {
        const exists = await redis.exists(`revoked_token:${tokenHash}`);
        redisAvailable = true;
        if (exists === 1) {
          this.localCache.set(tokenHash, now + 60000); // 1 minute local cache
          return true;
        }
      } catch (err: any) {
        this.logger.warn(`Redis error checking revoked token: ${err.message}`);
        redisAvailable = false;
      }
    }

    let dbAvailable = false;

    // 3. Check persistent database (PostgreSQL)
    try {
      const record = await this.prisma.revokedToken.findUnique({
        where: { tokenHash },
      });
      dbAvailable = true;
      if (record && record.expiresAt.getTime() > now) {
        this.localCache.set(tokenHash, record.expiresAt.getTime());
        return true;
      }
    } catch (err: any) {
      this.logger.error(`Database error checking revoked token: ${err.message}`);
      dbAvailable = false;
    }

    // FAIL-CLOSED SECURITY BOUNDARY:
    // When both distributed Redis and persistent PostgreSQL backends are unavailable,
    // the system cannot cryptographically verify revocation status.
    // Under no circumstances fail open — throw a safe UnauthorizedException.
    if (!redisAvailable && !dbAvailable) {
      this.logger.error(
        'CRITICAL: Token revocation verification backend unavailable (both Redis and PostgreSQL failed). Failing closed.'
      );
      throw new UnauthorizedException('Authentication verification failed. Please sign in again.');
    }

    return false;
  }
}
