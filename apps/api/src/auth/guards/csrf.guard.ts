import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const method = req.method.toUpperCase();

    // Safe idempotent methods do not require CSRF token
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return true;
    }

    // Check if ambient browser session cookies are present
    const hasSessionCookie = Boolean(req.cookies?.['askrev_access_token'] || req.cookies?.['askrev_admin_session']);

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
}


