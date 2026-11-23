import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly allowedOrigins = new Set<string>([
    'https://www.askrevdrive.com',
    'https://askrevdrive.com',
    'https://admin.askrevdrive.com',
  ]);

  constructor() {
    if (process.env.NODE_ENV !== 'production') {
      this.allowedOrigins.add('http://localhost:3000');
      this.allowedOrigins.add('http://127.0.0.1:3000');
      this.allowedOrigins.add('http://admin.localhost:3000');
    }
    const envOrigins = (process.env.CORS_ORIGIN || '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
    envOrigins.forEach((o) => this.allowedOrigins.add(o));
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const method = req.method.toUpperCase();

    // 1. Safe idempotent methods do not require CSRF token
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return true;
    }

    // 2. Request Origin / Referer Validation (OWASP Recommended)
    const hasSessionCookie = Boolean(req.cookies?.['askrev_access_token'] || req.cookies?.['askrev_admin_session']);
    const origin = req.headers['origin'] as string | undefined;
    const referer = req.headers['referer'] as string | undefined;

    if (origin) {
      const cleanOrigin = origin.trim().toLowerCase();
      if (!this.isOriginAllowed(cleanOrigin)) {
        throw new ForbiddenException(`CSRF validation failed: Unauthorized request origin (${origin})`);
      }
    } else if (referer) {
      try {
        const parsedReferer = new URL(referer).origin.toLowerCase();
        if (!this.isOriginAllowed(parsedReferer)) {
          throw new ForbiddenException(`CSRF validation failed: Unauthorized request referer (${referer})`);
        }
      } catch (err: any) {
        if (err instanceof ForbiddenException) throw err;
        throw new ForbiddenException(`CSRF validation failed: Malformed request referer (${referer})`);
      }
    } else if (hasSessionCookie) {
      throw new ForbiddenException('CSRF validation failed: Missing Origin and Referer on cookie-authenticated request');
    }

    // 3. Ambient Browser Session Cookie Check
    // CRITICAL SECURITY ENFORCEMENT:
    // If a session cookie is present, CSRF validation is strictly mandatory.
    // Explicit Bearer headers CANNOT bypass CSRF protection for cookie-authenticated browser sessions.
    if (hasSessionCookie) {
      const csrfCookie = req.cookies?.['askrev_csrf_token'];
      const csrfHeader = (req.headers['x-csrf-token'] || req.headers['x-xsrf-token']) as string;

      if (!csrfCookie || !csrfHeader) {
        throw new ForbiddenException('CSRF validation failed: Missing CSRF token or cookie');
      }

      if (csrfCookie.length !== csrfHeader.length || !crypto.timingSafeEqual(Buffer.from(csrfCookie), Buffer.from(csrfHeader))) {
        throw new ForbiddenException('CSRF validation failed: Token mismatch');
      }
    }

    return true;
  }

  private isOriginAllowed(origin: string): boolean {
    if (this.allowedOrigins.has(origin)) return true;
    if (
      origin.endsWith('.vercel.app') &&
      (process.env.RAILWAY_ENVIRONMENT === 'staging' ||
        process.env.NODE_ENV !== 'production' ||
        process.env.COMPLIANCE_MODE === 'SIMULATION_ONLY')
    ) {
      return true;
    }
    return false;
  }
}



