import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
const cookieParser = require('cookie-parser');

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
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.disable('x-powered-by');
  expressApp.set('trust proxy', 1);

  app.setGlobalPrefix('api');
  app.use(cookieParser());

  const configuredOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const prodOrigins = [
    'https://www.askrevdrive.com',
    'https://askrevdrive.com',
    'https://admin.askrevdrive.com',
  ];
  const devFallbackOrigins =
    process.env.NODE_ENV === 'production'
      ? prodOrigins
      : [
          'http://localhost:3000',
          'http://127.0.0.1:3000',
          'http://admin.localhost:3000',
          ...prodOrigins,
        ];
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
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-CSRF-Token', 'x-csrf-token'],
    exposedHeaders: ['Retry-After', 'X-CSRF-Token'],
  });

  // Register global JSON/urlencoded body parsers via @nestjs/platform-express (avoids pnpm phantom express import)
  app.useBodyParser('json', { limit: '1mb' });
  app.useBodyParser('urlencoded', { extended: true, limit: '1mb' });

  // Security headers + lightweight auth brute-force rate limiter
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    const reqPath = (req.originalUrl || req.url || '').split('?')[0];
    const clientIp = (req.ip || req.socket?.remoteAddress || 'unknown').toString();
    const windowMs = 60_000;

    // Rate limiting on simulation compute endpoints (prevent resource exhaustion)
    if (reqPath.startsWith('/api/simulation/')) {
      const simCheck = checkRateLimit(`sim:${clientIp}`, 60, windowMs);
      if (!simCheck.allowed) {
        res.setHeader('Retry-After', String(simCheck.retryAfter));
        return res.status(429).json({
          statusCode: 429,
          message: 'Too many simulation requests. Please slow down and try again.',
          retryAfterSeconds: simCheck.retryAfter,
        });
      }
    }

    // Rate limiting on sensitive financial / transaction mutation endpoints
    if (
      req.method === 'POST' &&
      (reqPath.startsWith('/api/vouchers/redeem') ||
        reqPath.startsWith('/api/packages/request') ||
        reqPath.startsWith('/api/wallet/request-withdrawal'))
    ) {
      const mutCheck = checkRateLimit(`financial-mut:${clientIp}`, 30, windowMs);
      if (!mutCheck.allowed) {
        res.setHeader('Retry-After', String(mutCheck.retryAfter));
        return res.status(429).json({
          statusCode: 429,
          message: 'Too many transaction requests. Please wait before submitting again.',
          retryAfterSeconds: mutCheck.retryAfter,
        });
      }
    }

    if (req.method === 'POST' && reqPath.startsWith('/api/auth/')) {
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
      } else if (reqPath === '/api/auth/forgot-password') {
        const emailKey = typeof req.body?.email === 'string' ? req.body.email.toLowerCase().trim() : '';
        const forgotCheck = checkRateLimit(`forgot:${clientIp}:${emailKey}`, 5, windowMs);
        const ipForgotCheck = checkRateLimit(`forgot-ip:${clientIp}`, 20, windowMs);
        if (!forgotCheck.allowed || !ipForgotCheck.allowed) {
          const retryAfter = Math.max(forgotCheck.retryAfter, ipForgotCheck.retryAfter);
          res.setHeader('Retry-After', String(retryAfter));
          return res.status(429).json({
            statusCode: 429,
            message: 'Too many password reset requests. Please wait before trying again.',
            retryAfterSeconds: retryAfter,
          });
        }
      } else if (reqPath === '/api/auth/reset-password') {
        const resetCheck = checkRateLimit(`reset:${clientIp}`, 10, windowMs);
        if (!resetCheck.allowed) {
          res.setHeader('Retry-After', String(resetCheck.retryAfter));
          return res.status(429).json({
            statusCode: 429,
            message: 'Too many reset attempts. Please wait before trying again.',
            retryAfterSeconds: resetCheck.retryAfter,
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
      forbidNonWhitelisted: true,
    })
  );

  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0');
  logger.log(`=================================================`);
  logger.log(`  🚀 ASKR EV API Backend Running on http://localhost:${port}/api`);
  logger.log(`  ⚡ Mode: ${process.env.COMPLIANCE_MODE || 'SIMULATION_ONLY'}`);
  logger.log(`  🔒 Live Payouts: ${process.env.ENABLE_LIVE_PAYOUTS === 'true' ? 'ENABLED' : 'DISABLED (SECURE)'}`);
  logger.log(`=================================================`);
}

bootstrap();
