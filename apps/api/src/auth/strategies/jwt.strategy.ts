import { Injectable, Logger, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { getJwtAccessSecret } from '../jwt-secrets';
import { TokenRevocationService } from '../token-revocation.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenRevocationService: TokenRevocationService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: Request) => {
          if (req && req.cookies) {
            // 1. Support session cookie priority for support requests
            if (req.cookies['askrev_support_token']) {
              return req.cookies['askrev_support_token'];
            }
            // 2. Admin portal route isolation
            const urlPath = req.path || req.url || '';
            const origin = (req.headers?.origin || req.headers?.referer || '').toLowerCase();
            const isAdminRoute = urlPath.includes('/admin') || origin.includes('admin.');
            if (isAdminRoute && req.cookies['askrev_admin_access_token']) {
              return req.cookies['askrev_admin_access_token'];
            }
            // 3. General member cookie
            return (
              req.cookies['askrev_access_token'] ||
              req.cookies['askrev_admin_access_token'] ||
              req.cookies['askrev_admin_session'] ||
              null
            );
          }
          return null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: getJwtAccessSecret(),
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    payload: {
      sub: string;
      email?: string;
      role: string;
      scope?: string;
      clientId?: string;
      sessionVersion?: number;
      isSupportMode?: boolean;
      supportSessionId?: string;
      adminUserId?: string;
      adminEmail?: string;
      supportReason?: string;
      consentReference?: string;
    }
  ) {
    if (payload.scope === 'mfa_enrollment') {
      throw new UnauthorizedException(
        'INSUFFICIENT_SCOPE: This token is restricted strictly to MFA enrollment and cannot access application resources.'
      );
    }

    const isSupportSession = payload.isSupportMode === true || payload.scope === 'admin_support:read_only';

    // =========================================================================
    // SECURITY CORRECTIONS 3, 5, 6, 7 FOR ADMIN SUPPORT MODE:
    // =========================================================================
    if (isSupportSession) {
      // 3 & 5. Verify against server-side session record (revocation check)
      if (payload.supportSessionId) {
        const sessionRecord = await this.prisma.adminSupportSession.findUnique({
          where: { id: payload.supportSessionId },
        });

        if (!sessionRecord) {
          throw new UnauthorizedException('SUPPORT_SESSION_INVALID: Server-side support session record not found.');
        }

        if (sessionRecord.isRevoked) {
          throw new UnauthorizedException('SUPPORT_SESSION_TERMINATED: The administrative support session has been terminated.');
        }

        if (new Date() > sessionRecord.expiresAt) {
          throw new UnauthorizedException('SUPPORT_SESSION_EXPIRED: The administrative support session has expired.');
        }
      } else {
        throw new UnauthorizedException('SUPPORT_SESSION_INVALID: Missing support session identifier.');
      }

      // 6. Dedicated termination endpoint exemption & mutation lockdown
      const rawPath = (req.path || req.url || '').split('?')[0];
      const isExitEndpoint = rawPath.endsWith('/admin/support/exit-session') || rawPath.endsWith('/support/exit-session');
      const httpMethod = (req?.method || 'GET').toUpperCase();

      if (httpMethod !== 'GET' && !isExitEndpoint) {
        throw new ForbiddenException(
          'ADMIN_SUPPORT_READ_ONLY: Modifying member data during an administrative support session is strictly prohibited. All mutation operations (POST, PUT, PATCH, DELETE) are permanently blocked in support mode.'
        );
      }

      // 7. Enforce explicit allowlist of safe read-only endpoints
      const safeAllowlist = [
        '/auth/me',
        '/members/dashboard',
        '/members/direct-team',
        '/members/binary-tree',
        '/matrix/overview',
        '/matrix/my-placements',
        '/matrix/my-earnings',
        '/packages/catalog',
        '/packages/my-status',
        '/vouchers/my-vouchers',
        '/vouchers/my-balance',
        '/products',
        '/banners/active',
        '/banners/welcome-popup',
        '/admin/support/exit-session',
        '/support/exit-session',
      ];

      const isAllowed = safeAllowlist.some(endpoint => rawPath.endsWith(endpoint) || rawPath.includes(endpoint));
      if (!isAllowed) {
        throw new ForbiddenException(
          `ADMIN_SUPPORT_READ_ONLY_ACCESS_DENIED: Endpoint '${rawPath}' is not permitted in read-only Admin Support Mode.`
        );
      }
    }

    // Extract raw token for revocation check
    let token = '';
    const authHeader = req.headers?.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    } else if (req.cookies) {
      token =
        req.cookies['askrev_support_token'] ||
        req.cookies['askrev_access_token'] ||
        req.cookies['askrev_admin_access_token'] ||
        req.cookies['askrev_admin_session'] ||
        '';
    }

    if (token) {
      try {
        const isRevoked = await this.tokenRevocationService.isTokenRevoked(token);
        if (isRevoked) {
          throw new UnauthorizedException('Session has been logged out or revoked. Please sign in again.');
        }
      } catch (err: any) {
        if (err instanceof UnauthorizedException) {
          throw err;
        }
        this.logger.error(`Token revocation check failed unexpectedly: ${err.message}`);
        throw new UnauthorizedException('Authentication verification failed. Please sign in again.');
      }
    }

    // Dedicated Machine-to-Machine Service Token handling
    if (payload.role === 'SERVICE_CLIENT') {
      if (!payload.sub || !payload.sub.startsWith('service:')) {
        throw new UnauthorizedException('Invalid service token subject');
      }
      return {
        isServiceClient: true,
        clientId: payload.clientId || payload.sub.replace('service:', ''),
        role: 'SERVICE_CLIENT',
        scope: payload.scope || 'service:read',
        sub: payload.sub,
      };
    }

    // MANDATORY sessionVersion validation on all member/admin access JWTs
    if (payload.sessionVersion === undefined || payload.sessionVersion === null || typeof payload.sessionVersion !== 'number') {
      throw new UnauthorizedException('Session version is missing or invalid. Please sign in again.');
    }

    let user;
    try {
      user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          wallet: true,
        },
      });
    } catch (err: any) {
      this.logger.error(`User lookup failed during JWT validation: ${err.message}`);
      throw new UnauthorizedException('Authentication verification failed. Please sign in again.');
    }

    if (!user) {
      throw new UnauthorizedException('User account no longer exists or token invalid');
    }

    // Distributed session version check: if sessionVersion was bumped, revoke instantly
    if (user.sessionVersion !== payload.sessionVersion) {
      throw new UnauthorizedException('Session has been revoked. Please sign in again.');
    }

    if (isSupportSession) {
      (user as any).isSupportMode = true;
      (user as any).supportSessionId = payload.supportSessionId;
      (user as any).adminUserId = payload.adminUserId;
      (user as any).adminEmail = payload.adminEmail;
      (user as any).supportReason = payload.supportReason;
      (user as any).consentReference = payload.consentReference;
      (user as any).scope = 'admin_support:read_only';
    }

    return user;
  }
}
