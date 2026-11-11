import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import * as express from 'express';
import type { Request, Response, NextFunction } from 'express';

// Ensure BigInts serialize automatically to JSON string
if (typeof BigInt !== 'undefined' && !(BigInt.prototype as any).toJSON) {
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };
}

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxRequests: number, windowMs: number): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const existing = rateLimitBuckets.get(key);
  if (!existing || existing.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
    if (rateLimitBuckets.size > 5000) {
      for (const [k, v] of rateLimitBuckets.entries()) {
        if (v.resetAt <= now) rateLimitBuckets.delete(k);
      }
    }
    return { allowed: true, retryAfter: 0 };
  }

  existing.count += 1;
  if (existing.count > maxRequests) {
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) };
  }
  return { allowed: true, retryAfter: 0 };
}

async function bootstrap() {
  const logger = new Logger('AskrEV_API');
  const app = await NestFactory.create(AppModule);

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.disable('x-powered-by');

  app.setGlobalPrefix('api');

  const configuredOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const devFallbackOrigins =
    process.env.NODE_ENV === 'production'
      ? []
      : ['http://localhost:3000', 'http://127.0.0.1:3000'];
  const allowedOrigins = new Set([...configuredOrigins, ...devFallbackOrigins]);

  app.enableCors({
    origin: (requestOrigin, callback) => {
      if (!requestOrigin) {
        return callback(null, true);
      }
      if (allowedOrigins.has(requestOrigin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
  });

  // Register global JSON/urlencoded body parsers so all controllers and middleware (including auth rate limiter) receive parsed bodies
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Security headers + lightweight auth brute-force rate limiter
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    const reqPath = (req.originalUrl || req.url || '').split('?')[0];
    if (req.method === 'POST' && reqPath.startsWith('/api/auth/')) {
      const clientIp = (req.ip || req.socket?.remoteAddress || 'unknown').toString();
      const windowMs = 60_000;

      if (reqPath === '/api/auth/login') {
        const emailKey = typeof req.body?.email === 'string' ? req.body.email.toLowerCase().trim() : '';
        const targetCheck = checkRateLimit(`login:${clientIp}:${emailKey}`, 25, windowMs);
        const ipCheck = checkRateLimit(`login-ip:${clientIp}`, 200, windowMs);
        if (!targetCheck.allowed || !ipCheck.allowed) {
          const retryAfter = Math.max(targetCheck.retryAfter, ipCheck.retryAfter);
          res.setHeader('Retry-After', String(retryAfter));
          return res.status(429).json({
            statusCode: 429,
            message: 'Too many login attempts. Please wait and try again.',
            retryAfterSeconds: retryAfter,
          });
        }
      } else if (reqPath === '/api/auth/register') {
        const regCheck = checkRateLimit(`register:${clientIp}`, 40, windowMs);
        if (!regCheck.allowed) {
          res.setHeader('Retry-After', String(regCheck.retryAfter));
          return res.status(429).json({
            statusCode: 429,
            message: 'Too many registration requests. Please try again shortly.',
            retryAfterSeconds: regCheck.retryAfter,
          });
        }
      } else if (reqPath === '/api/auth/refresh') {
        const refCheck = checkRateLimit(`refresh:${clientIp}`, 60, windowMs);
        if (!refCheck.allowed) {
          res.setHeader('Retry-After', String(refCheck.retryAfter));
          return res.status(429).json({
            statusCode: 429,
            message: 'Too many token refresh requests. Please try again shortly.',
            retryAfterSeconds: refCheck.retryAfter,
          });
        }
      }
    }

    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    })
  );

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`=================================================`);
  logger.log(`  🚀 ASKR EV API Backend Running on http://localhost:${port}/api`);
  logger.log(`  ⚡ Mode: ${process.env.COMPLIANCE_MODE || 'SIMULATION_ONLY'}`);
  logger.log(`  🔒 Live Payouts: ${process.env.ENABLE_LIVE_PAYOUTS === 'true' ? 'ENABLED' : 'DISABLED (SECURE)'}`);
  logger.log(`=================================================`);
}

bootstrap();
