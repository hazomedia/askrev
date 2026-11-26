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
            const isSupportRequested =
              req.headers['x-support-mode'] === 'true' ||
              req.headers['x-admin-support-mode'] === 'true' ||
              (typeof req.query?.is_support === 'string' && req.query.is_support === 'true');

            // 1. Explicit support request priority when support mode is active
            if (isSupportRequested && req.cookies['askrev_support_token']) {
              return req.cookies['askrev_support_token'];
            }

            // 2. Admin portal route isolation
            const urlPath = req.path || req.url || '';
            const origin = (req.headers?.origin || req.headers?.referer || '').toLowerCase();
            const isAdminRoute = urlPath.includes('/admin') || origin.includes('admin.');
            if (isAdminRoute && req.cookies['askrev_admin_access_token']) {
              return req.cookies['askrev_admin_access_token'];
            }

            // 3. Normal member access token priority (normal login never overridden by stale support token)
            if (req.cookies['askrev_access_token']) {
              return req.cookies['askrev_access_token'];
            }

            // 4. Standalone support session token if present without normal member session
            if (req.cookies['askrev_support_token']) {
              return req.cookies['askrev_support_token'];
            }

            // 5. Fallback admin cookies
            return (
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
        // Auth & Identity
        '/auth/me',
        '/auth/profile',
        // Members & Binary
        '/members/dashboard',
        '/members/direct-team',
        '/members/binary-tree',
        '/members/binary/history',
        '/members/binary/carry-forward',
        '/members/binary/flush-history',
        '/members/support-consent/active',
        // Legacy Matrix
        '/legacy-matrix/my-matrix',
        '/legacy-matrix/qualification',
        '/legacy-matrix/settlement-preview',
        '/legacy-matrix/overview',
        '/matrix/overview',
        '/matrix/my-placements',
        '/matrix/my-earnings',
        // Packages & Holds
        '/packages',
        '/packages/catalog',
        '/packages/upgrade-options',
        '/packages/my-status',
        '/packages/my-requests',
        '/packages/my-holds',
        '/packages/payment-config',
        // Vouchers
        '/vouchers/my-vouchers',
        '/vouchers/my-balance',
        '/vouchers/transactions',
        // Wallets & Commissions
        '/wallet/my-wallet',
        '/wallet/transactions',
        '/wallet/sponsor-commissions',
        '/wallet/eligibility',
        '/wallet/my-withdrawals',
        '/wallet/club-fund',
        // Vehicles & Bookings
        '/ev-bikes',
        '/ev-bikes/my-bookings',
        '/products',
        '/banners/active',
        '/banners/welcome-popup',
        '/payments/methods',
        // Retail Qualification
        '/retail-qualification/my-progress',
        '/retail-qualification/my-orders',
        '/retail-qualification/config',
        // Dedicated Termination
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
