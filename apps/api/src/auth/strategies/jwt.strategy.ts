import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
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
            return req.cookies['askrev_access_token'] || req.cookies['askrev_admin_session'] || null;
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
    payload: { sub: string; email?: string; role: string; scope?: string; clientId?: string; sessionVersion?: number }
  ) {
    if (payload.scope === 'mfa_enrollment') {
      throw new UnauthorizedException(
        'INSUFFICIENT_SCOPE: This token is restricted strictly to MFA enrollment and cannot access application resources.'
      );
    }

    // Extract raw token for revocation check
    let token = '';
    const authHeader = req.headers?.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    } else if (req.cookies) {
      token = req.cookies['askrev_access_token'] || req.cookies['askrev_admin_session'] || '';
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

    return user;
  }
}

