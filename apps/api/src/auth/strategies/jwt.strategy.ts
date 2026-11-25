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
            const urlPath = req.path || req.url || '';
            const origin = (req.headers?.origin || req.headers?.referer || '').toLowerCase();
            const isAdminRoute = urlPath.includes('/admin') || origin.includes('admin.');
            if (isAdminRoute && req.cookies['askrev_admin_access_token']) {
              return req.cookies['askrev_admin_access_token'];
            }
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

    // STRICT READ-ONLY LOCKDOWN FOR ADMIN SUPPORT SESSIONS:
    // Any mutation attempt (POST, PUT, PATCH, DELETE) made with a support token is forbidden.
    if (payload.isSupportMode) {
      const httpMethod = (req?.method || 'GET').toUpperCase();
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(httpMethod)) {
        throw new ForbiddenException(
          'ADMIN_SUPPORT_READ_ONLY: Modifying member data during an administrative support session is strictly prohibited. All mutation operations (POST, PUT, PATCH, DELETE) are permanently blocked in support mode.'
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
    // Tokens missing sessionVersion (such as legacy or forged tokens) must be strictly rejected.
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

    if (payload.isSupportMode) {
      (user as any).isSupportMode = true;
      (user as any).adminUserId = payload.adminUserId;
      (user as any).adminEmail = payload.adminEmail;
      (user as any).supportReason = payload.supportReason;
      (user as any).consentReference = payload.consentReference;
    }

    return user;
  }
}

