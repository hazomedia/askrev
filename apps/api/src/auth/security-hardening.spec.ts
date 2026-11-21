import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionContext, ForbiddenException, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { CsrfGuard } from './guards/csrf.guard';
import { AuthService } from './auth.service';
import { UserRole } from '@askrev/shared';
import { RateLimiterService, getClientIp } from '../common/rate-limiter.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TokenRevocationService } from './token-revocation.service';
import { hashToken } from './jwt-secrets';

describe('Pre-Production Security Hardening & Session Suite', () => {
  describe('Priority 1 — CsrfGuard & Cookie Hardening', () => {
    let guard: CsrfGuard;

    beforeEach(() => {
      guard = new CsrfGuard();
    });

    it('should allow GET, HEAD, and OPTIONS requests without CSRF token', () => {
      for (const method of ['GET', 'HEAD', 'OPTIONS']) {
        const mockContext = {
          switchToHttp: () => ({
            getRequest: () => ({
              method,
              headers: {},
              cookies: {},
            }),
          }),
        } as unknown as ExecutionContext;

        expect(guard.canActivate(mockContext)).toBe(true);
      }
    });

    it('should allow service-to-service POST requests with Authorization Bearer and NO session cookies', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'POST',
            headers: { authorization: 'Bearer mock-service-jwt' },
            cookies: {},
          }),
        }),
      } as unknown as ExecutionContext;

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it('should REJECT POST requests when session cookie exists even if Authorization Bearer is also present (Cannot bypass CSRF)', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'POST',
            headers: { authorization: 'Bearer attacker-spoofed-or-valid-token' },
            cookies: { askrev_access_token: 'valid-session-jwt' },
          }),
        }),
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it('should reject POST requests when session cookie exists but CSRF token/header is missing', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'POST',
            headers: {},
            cookies: { askrev_access_token: 'session-jwt' },
          }),
        }),
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it('should reject POST requests when CSRF cookie does not match CSRF header', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'POST',
            headers: { 'x-csrf-token': 'token-value-a' },
            cookies: {
              askrev_access_token: 'session-jwt',
              askrev_csrf_token: 'token-value-b',
            },
          }),
        }),
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it('should allow POST requests when CSRF cookie matches x-csrf-token header with valid origin', () => {
      const validToken = '8f3a1b0c9d8e7f6a5b4c3d2e1f0a9b8c';
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'POST',
            headers: {
              'x-csrf-token': validToken,
              origin: 'https://admin.askrevdrive.com',
            },
            cookies: {
              askrev_access_token: 'session-jwt',
              askrev_csrf_token: validToken,
            },
          }),
        }),
      } as unknown as ExecutionContext;

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it('should REJECT POST requests with untrusted Origin header', () => {
      const validToken = '8f3a1b0c9d8e7f6a5b4c3d2e1f0a9b8c';
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'POST',
            headers: {
              'x-csrf-token': validToken,
              origin: 'https://evil-phishing-attacker.com',
            },
            cookies: {
              askrev_access_token: 'session-jwt',
              askrev_csrf_token: validToken,
            },
          }),
        }),
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it('should REJECT wildcard or unauthorized subdomains (exact trusted origins only)', () => {
      const validToken = '8f3a1b0c9d8e7f6a5b4c3d2e1f0a9b8c';
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'POST',
            headers: {
              'x-csrf-token': validToken,
              origin: 'https://unauthorized-subdomain.askrevdrive.com',
            },
            cookies: {
              askrev_access_token: 'session-jwt',
              askrev_csrf_token: validToken,
            },
          }),
        }),
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it('should REJECT cookie-authenticated mutations missing BOTH Origin and Referer', () => {
      const validToken = '8f3a1b0c9d8e7f6a5b4c3d2e1f0a9b8c';
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'POST',
            headers: {
              'x-csrf-token': validToken,
            },
            cookies: {
              askrev_access_token: 'session-jwt',
              askrev_csrf_token: validToken,
            },
          }),
        }),
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it('should REJECT malformed Referer URL without swallowing error', () => {
      const validToken = '8f3a1b0c9d8e7f6a5b4c3d2e1f0a9b8c';
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'POST',
            headers: {
              'x-csrf-token': validToken,
              referer: 'not-a-valid-url-///%%%',
            },
            cookies: {
              askrev_access_token: 'session-jwt',
              askrev_csrf_token: validToken,
            },
          }),
        }),
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it('should ACCEPT POST requests with valid AskREV domain Origin header', () => {
      const validToken = '8f3a1b0c9d8e7f6a5b4c3d2e1f0a9b8c';
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'POST',
            headers: {
              'x-csrf-token': validToken,
              origin: 'https://admin.askrevdrive.com',
            },
            cookies: {
              askrev_access_token: 'session-jwt',
              askrev_csrf_token: validToken,
            },
          }),
        }),
      } as unknown as ExecutionContext;

      expect(guard.canActivate(mockContext)).toBe(true);
    });
  });

  describe('Priority 2 — Privileged Admin MFA Enrollment & Bootstrap', () => {
    let authService: AuthService;
    let mockPrisma: any;
    let mockJwt: any;
    let mockTotp: any;
    let mockEmail: any;
    let mockTokenRevocation: any;
    let passwordHash: string;

    beforeEach(async () => {
      passwordHash = await bcrypt.hash('CorrectAdminPassword123!', 10);
      mockPrisma = {
        user: {
          findUnique: vi.fn(),
          update: vi.fn().mockResolvedValue({}),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        revokedToken: {
          create: vi.fn().mockResolvedValue({}),
          findUnique: vi.fn().mockResolvedValue(null),
          upsert: vi.fn().mockResolvedValue({}),
        },
        auditLog: {
          create: vi.fn().mockResolvedValue({}),
        },
        $transaction: vi.fn().mockImplementation(async (cb) => cb(mockPrisma)),
      };
      mockJwt = {
        signAsync: vi.fn().mockImplementation((payload) => Promise.resolve(`jwt-token-${payload.scope || 'access'}`)),
        verifyAsync: vi.fn(),
        decode: vi.fn(),
      };
      mockTotp = {
        checkRateLimit: vi.fn().mockReturnValue({ allowed: true }),
        generateSecret: vi.fn().mockReturnValue({ secret: 'MOCK_BASE32_SECRET', otpauthUrl: 'otpauth://...' }),
        generateQrCode: vi.fn().mockResolvedValue('data:image/png;base64,mockqr'),
        verifyTokenWithReplayProtection: vi.fn(),
        generateRecoveryCodes: vi.fn().mockReturnValue(['code-1', 'code-2', 'code-3', 'code-4', 'code-5', 'code-6', 'code-7', 'code-8']),
        hashRecoveryCode: vi.fn().mockImplementation((c) => `hash-${c}`),
        verifyAndConsumeRecoveryCode: vi.fn(),
        resetRateLimit: vi.fn(),
        recordFailedAttempt: vi.fn(),
      };
      mockEmail = {
        sendEmailVerification: vi.fn(),
      };
      mockTokenRevocation = {
        revokeToken: vi.fn().mockResolvedValue(undefined),
        isTokenRevoked: vi.fn().mockResolvedValue(false),
      };

      authService = new AuthService(mockPrisma, mockJwt, mockTotp, mockEmail, mockTokenRevocation as any);
    });

    it('should trigger safe MFA bootstrap enrollment for SUPER_ADMIN when MFA is not yet enabled', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'admin-uuid',
        email: 'admin@askrevdrive.com',
        role: UserRole.SUPER_ADMIN,
        passwordHash,
        twoFactorEnabled: false,
      });

      const result = await authService.login({
        email: 'admin@askrevdrive.com',
        password: 'CorrectAdminPassword123!',
      });

      expect(result.mfaEnrollmentRequired).toBe(true);
      expect(result.enrollmentToken).toBeDefined();
      expect(result.message).toContain('MFA_ENROLLMENT_REQUIRED');
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'AUTH_MFA_ENROLLMENT_REQUIRED' }),
        })
      );
    });

    it('should prevent enrollment token from accessing application endpoints via JwtStrategy', async () => {
      const jwtStrategy = new JwtStrategy(mockPrisma, mockTokenRevocation as any);
      const mockReq: any = { headers: {}, cookies: {} };

      await expect(
        jwtStrategy.validate(mockReq, {
          sub: 'admin-uuid',
          email: 'admin@askrevdrive.com',
          role: UserRole.SUPER_ADMIN,
          scope: 'mfa_enrollment',
        })
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject access token in JwtStrategy when user sessionVersion has changed', async () => {
      const jwtStrategy = new JwtStrategy(mockPrisma, mockTokenRevocation as any);
      const mockReq: any = { headers: {}, cookies: {} };

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'admin-uuid',
        sessionVersion: 2, // User was bumped
      });

      await expect(
        jwtStrategy.validate(mockReq, {
          sub: 'admin-uuid',
          role: UserRole.SUPER_ADMIN,
          sessionVersion: 1, // Token has old sessionVersion
        })
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject access token in JwtStrategy when token has been explicitly revoked', async () => {
      mockTokenRevocation.isTokenRevoked.mockResolvedValue(true);
      const jwtStrategy = new JwtStrategy(mockPrisma, mockTokenRevocation as any);
      const mockReq: any = { headers: { authorization: 'Bearer revoked-token' }, cookies: {} };

      await expect(
        jwtStrategy.validate(mockReq, {
          sub: 'admin-uuid',
          role: UserRole.SUPER_ADMIN,
          sessionVersion: 1,
        })
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should validate SERVICE_CLIENT token in JwtStrategy without returning a User entity', async () => {
      const jwtStrategy = new JwtStrategy(mockPrisma, mockTokenRevocation as any);
      const mockReq: any = { headers: { authorization: 'Bearer service-token' }, cookies: {} };

      const principal = await jwtStrategy.validate(mockReq, {
        sub: 'service:askrev-backend-service',
        clientId: 'askrev-backend-service',
        role: 'SERVICE_CLIENT',
        scope: 'service:reconciliation',
      });

      expect((principal as any).isServiceClient).toBe(true);
      expect(principal.role).toBe('SERVICE_CLIENT');
      expect((principal as any).passwordHash).toBeUndefined();
      expect((principal as any).wallet).toBeUndefined();
    });

    it('should successfully setup MFA enrollment and securely store pending secret on user', async () => {
      mockJwt.verifyAsync.mockResolvedValue({
        sub: 'admin-uuid',
        email: 'admin@askrevdrive.com',
        scope: 'mfa_enrollment',
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'admin-uuid',
        email: 'admin@askrevdrive.com',
        role: UserRole.SUPER_ADMIN,
        twoFactorEnabled: false,
      });

      const setup = await authService.setupMfaEnrollment({
        enrollmentToken: 'valid-enrollment-token',
      });

      expect(setup.secret).toBe('MOCK_BASE32_SECRET');
      expect(setup.qrCodeDataUrl).toBeDefined();
      expect(setup.instructions).toBeDefined();
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'admin-uuid' },
          data: expect.objectContaining({
            pendingTwoFactorSecret: 'MOCK_BASE32_SECRET',
          }),
        })
      );
    });

    it('should confirm MFA enrollment strictly using server-stored pending secret, ignoring arbitrary client secrets', async () => {
      mockJwt.verifyAsync.mockResolvedValue({
        sub: 'admin-uuid',
        email: 'admin@askrevdrive.com',
        role: UserRole.SUPER_ADMIN,
        scope: 'mfa_enrollment',
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'admin-uuid',
        email: 'admin@askrevdrive.com',
        role: UserRole.SUPER_ADMIN,
        twoFactorEnabled: false,
        pendingTwoFactorSecret: 'SERVER_BOUND_SECRET',
        pendingTwoFactorCreatedAt: new Date(),
      });
      mockTotp.verifyTokenWithReplayProtection.mockReturnValue(true);

      const confirmation = await authService.confirmMfaEnrollment({
        enrollmentToken: 'valid-enrollment-token',
        secret: 'ATTACKER_CLIENT_SUPPLIED_SECRET', // Client passes different secret
        code: '123456',
      });

      expect(confirmation.success).toBe(true);
      expect(confirmation.recoveryCodes).toHaveLength(8);
      expect(confirmation.tokens).toBeDefined();

      // Verification MUST have checked against SERVER_BOUND_SECRET, NOT attacker's secret
      expect(mockTotp.verifyTokenWithReplayProtection).toHaveBeenCalledWith(
        'admin-uuid',
        'SERVER_BOUND_SECRET',
        '123456',
        1,
        'enrollment'
      );

      // User must be updated with the server-bound secret and have pending secret cleared
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'admin-uuid' },
          data: expect.objectContaining({
            twoFactorSecret: 'SERVER_BOUND_SECRET',
            pendingTwoFactorSecret: null,
            twoFactorEnabled: true,
          }),
        })
      );
    });

    it('should reject confirmMfaEnrollment when pending secret has expired (>10m)', async () => {
      mockJwt.verifyAsync.mockResolvedValue({
        sub: 'admin-uuid',
        email: 'admin@askrevdrive.com',
        role: UserRole.SUPER_ADMIN,
        scope: 'mfa_enrollment',
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'admin-uuid',
        email: 'admin@askrevdrive.com',
        role: UserRole.SUPER_ADMIN,
        twoFactorEnabled: false,
        pendingTwoFactorSecret: 'SERVER_BOUND_SECRET',
        pendingTwoFactorCreatedAt: new Date(Date.now() - 11 * 60 * 1000), // 11 mins ago
      });

      await expect(
        authService.confirmMfaEnrollment({
          enrollmentToken: 'valid-enrollment-token',
          code: '123456',
        })
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject setup and confirm when MFA is already enabled', async () => {
      mockJwt.verifyAsync.mockResolvedValue({
        sub: 'admin-uuid',
        email: 'admin@askrevdrive.com',
        role: UserRole.SUPER_ADMIN,
        scope: 'mfa_enrollment',
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'admin-uuid',
        email: 'admin@askrevdrive.com',
        role: UserRole.SUPER_ADMIN,
        twoFactorEnabled: true, // Already enabled
      });

      await expect(
        authService.setupMfaEnrollment({ enrollmentToken: 'valid-enrollment-token' })
      ).rejects.toThrow();

      await expect(
        authService.confirmMfaEnrollment({ enrollmentToken: 'valid-enrollment-token', code: '123456' })
      ).rejects.toThrow();
    });

    it('should reject refresh tokens for privileged admins when MFA is not enabled', async () => {
      mockJwt.verifyAsync.mockResolvedValue({ sub: 'admin-uuid', email: 'admin@askrev.com', role: UserRole.SUPER_ADMIN });
      const rawRefreshToken = 'valid-refresh-token-string';
      const hash = await bcrypt.hash(rawRefreshToken, 10);

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'admin-uuid',
        email: 'admin@askrev.com',
        role: UserRole.SUPER_ADMIN,
        twoFactorEnabled: false, // Not enabled
        refreshTokenHash: hash,
      });

      await expect(authService.refresh(rawRefreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should issue service tokens for authenticated service clients and reject invalid credentials or unapproved scopes', async () => {
      process.env.SERVICE_CLIENT_ID = 'askrev-backend-service';
      process.env.SERVICE_CLIENT_SECRET = 'super-secret-service-key-32chars!';

      const serviceRes = await authService.issueServiceToken({
        clientId: 'askrev-backend-service',
        clientSecret: 'super-secret-service-key-32chars!',
        scope: 'service:reconciliation',
      });

      expect(serviceRes.tokenType).toBe('Bearer');
      expect(serviceRes.accessToken).toBeDefined();
      expect(serviceRes.expiresIn).toBe(3600);
      expect(serviceRes.scope).toBe('service:reconciliation');

      // Invalid secret must be rejected with UnauthorizedException
      await expect(
        authService.issueServiceToken({
          clientId: 'askrev-backend-service',
          clientSecret: 'wrong-secret',
        })
      ).rejects.toThrow(UnauthorizedException);

      // Unapproved scope must be rejected with ForbiddenException
      await expect(
        authService.issueServiceToken({
          clientId: 'askrev-backend-service',
          clientSecret: 'super-secret-service-key-32chars!',
          scope: 'admin:super_powers',
        })
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Priority 3 — Distributed Rate Limiting & Proxy IP Handling', () => {
    let rateLimiter: RateLimiterService;

    beforeEach(() => {
      rateLimiter = new RateLimiterService();
    });

    it('should allow requests within limit and throttle when exceeded', async () => {
      const key = 'test-client-ip-action';
      const limit = 3;
      const windowMs = 5000;

      for (let i = 0; i < limit; i++) {
        const res = await rateLimiter.checkLimit(key, limit, windowMs);
        expect(res.allowed).toBe(true);
      }

      const blocked = await rateLimiter.checkLimit(key, limit, windowMs);
      expect(blocked.allowed).toBe(false);
      expect(blocked.retryAfter).toBeGreaterThan(0);

      await rateLimiter.resetLimit(key);
      const afterReset = await rateLimiter.checkLimit(key, limit, windowMs);
      expect(afterReset.allowed).toBe(true);
    });

    it('should securely extract trusted proxy-appended client IP and reject spoofed leftmost headers', () => {
      const mockReq = {
        headers: {
          // Attacker spoofed 203.0.113.195 and 198.51.100.1, reverse proxy appended actual remote IP 10.0.0.1
          'x-forwarded-for': '203.0.113.195, 198.51.100.1, 10.0.0.1',
        },
        socket: { remoteAddress: '10.0.0.1' },
      } as any;

      const clientIp = getClientIp(mockReq);
      expect(clientIp).toBe('10.0.0.1');
    });

    it('should fail closed for sensitive operations when shared Redis is unavailable in strict mode', async () => {
      process.env.RATE_LIMIT_STRICT = 'true';
      const strictLimiter = new RateLimiterService();

      // Check sensitive operation when Redis is not available
      const sensitiveResult = await strictLimiter.checkLimit('auth-login:127.0.0.1', 10, 60000, true);
      expect(sensitiveResult.allowed).toBe(false);
      expect(sensitiveResult.retryAfter).toBe(60);

      // Non-sensitive operation should still function in local fallback mode
      const nonSensitiveResult = await strictLimiter.checkLimit('public-catalog:127.0.0.1', 10, 60000, false);
      expect(nonSensitiveResult.allowed).toBe(true);

      delete process.env.RATE_LIMIT_STRICT;
    });

    it('should fail closed when Redis eval throws a command failure or timeout during sensitive checks', async () => {
      process.env.RATE_LIMIT_STRICT = 'true';
      const limiter = new RateLimiterService();
      // Mock an active Redis client whose eval throws an error
      (limiter as any).isRedisAvailable = true;
      (limiter as any).redisClient = {
        eval: vi.fn().mockRejectedValue(new Error('READONLY You cant write against a read only replica / ETIMEDOUT')),
      };

      const failResult = await limiter.checkLimit('sensitive-op:127.0.0.1', 10, 60000, true);
      expect(failResult.allowed).toBe(false);
      expect(failResult.retryAfter).toBe(60);
      expect(limiter.isRedisHealthy()).toBe(false);

      delete process.env.RATE_LIMIT_STRICT;
    });
  });

  describe('ValidationPipe forbidNonWhitelisted Enforcement', () => {
    it('should reject payloads with unexpected properties', async () => {
      const pipe = new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      });

      const { RedeemVoucherDto } = await import('../vouchers/vouchers.service');

      const invalidPayload = {
        voucherId: 'v-123',
        amountINR: 500,
        maliciousInjectedField: 'ATTACK_VECTOR',
      };

      await expect(
        pipe.transform(invalidPayload, {
          type: 'body',
          metatype: RedeemVoucherDto,
        })
      ).rejects.toThrow();
    });
  });

  describe('Release Blockers — Fail-Closed Revocation & Mandatory SessionVersion Validation', () => {
    describe('TokenRevocationService Backend Failure & Fail-Closed Defense', () => {
      it('should NEVER fail open and MUST throw UnauthorizedException when both Redis and PostgreSQL fail', async () => {
        const mockPrismaDb: any = {
          revokedToken: {
            findUnique: vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:5432')),
            upsert: vi.fn().mockResolvedValue({}),
          },
        };
        const mockRateLimiterService: any = {
          getRedisClient: vi.fn().mockReturnValue({
            exists: vi.fn().mockRejectedValue(new Error('ETIMEDOUT: Redis cluster unreachable on 10.0.0.1:6379')),
          }),
          isRedisHealthy: vi.fn().mockReturnValue(true),
        };

        const service = new TokenRevocationService(mockPrismaDb, mockRateLimiterService);
        service.clearLocalCache();

        let caughtError: any;
        try {
          await service.isTokenRevoked('any-unverified-access-token');
        } catch (err) {
          caughtError = err;
        }

        // Must throw UnauthorizedException (fails closed)
        expect(caughtError).toBeInstanceOf(UnauthorizedException);
        expect(caughtError.message).toBe('Authentication verification failed. Please sign in again.');
        // Must NOT leak internal infrastructure details (hostnames, ports, SQL/connection errors)
        expect(caughtError.message).not.toContain('5432');
        expect(caughtError.message).not.toContain('ECONNREFUSED');
        expect(caughtError.message).not.toContain('6379');
        expect(caughtError.message).not.toContain('ETIMEDOUT');
      });

      it('should NEVER fail open when Redis client is null and PostgreSQL fails', async () => {
        const mockPrismaDb: any = {
          revokedToken: {
            findUnique: vi.fn().mockRejectedValue(new Error('FATAL: pool exhausted')),
          },
        };
        const mockRateLimiterService: any = {
          getRedisClient: vi.fn().mockReturnValue(null),
          isRedisHealthy: vi.fn().mockReturnValue(false),
        };

        const service = new TokenRevocationService(mockPrismaDb, mockRateLimiterService);
        service.clearLocalCache();

        await expect(service.isTokenRevoked('unverified-token')).rejects.toThrow(UnauthorizedException);
      });

      it('should proceed and return false when Redis fails but PostgreSQL is available and token is not revoked', async () => {
        const mockPrismaDb: any = {
          revokedToken: {
            findUnique: vi.fn().mockResolvedValue(null), // Token not in DB
          },
        };
        const mockRateLimiterService: any = {
          getRedisClient: vi.fn().mockReturnValue({
            exists: vi.fn().mockRejectedValue(new Error('Redis timeout')),
          }),
          isRedisHealthy: vi.fn().mockReturnValue(true),
        };

        const service = new TokenRevocationService(mockPrismaDb, mockRateLimiterService);
        service.clearLocalCache();

        const result = await service.isTokenRevoked('clean-unrevoked-token');
        expect(result).toBe(false);
      });

      it('should return true when Redis fails but PostgreSQL confirms the token is revoked', async () => {
        const mockPrismaDb: any = {
          revokedToken: {
            findUnique: vi.fn().mockResolvedValue({
              tokenHash: 'hashed',
              expiresAt: new Date(Date.now() + 60000),
            }),
          },
        };
        const mockRateLimiterService: any = {
          getRedisClient: vi.fn().mockReturnValue(null),
          isRedisHealthy: vi.fn().mockReturnValue(false),
        };

        const service = new TokenRevocationService(mockPrismaDb, mockRateLimiterService);
        service.clearLocalCache();

        const result = await service.isTokenRevoked('revoked-in-db-token');
        expect(result).toBe(true);
      });
    });

    describe('JwtStrategy Error Concealment & Safe Authentication Rejection', () => {
      it('should safely catch backend revocation failure and throw UnauthorizedException without disclosing internal details', async () => {
        const mockPrismaDb: any = {
          user: { findUnique: vi.fn() },
        };
        const mockRevocationService: any = {
          isTokenRevoked: vi.fn().mockRejectedValue(
            new Error('Internal network error: PostgreSQL host master-db.private.askrev:5432 down')
          ),
        };

        const jwtStrategy = new JwtStrategy(mockPrismaDb, mockRevocationService);
        const mockReq: any = { headers: { authorization: 'Bearer some-access-token' }, cookies: {} };

        let caughtError: any;
        try {
          await jwtStrategy.validate(mockReq, {
            sub: 'user-uuid',
            role: UserRole.FREE_USER,
            sessionVersion: 1,
          });
        } catch (err) {
          caughtError = err;
        }

        expect(caughtError).toBeInstanceOf(UnauthorizedException);
        expect(caughtError.message).toBe('Authentication verification failed. Please sign in again.');
        expect(caughtError.message).not.toContain('master-db.private.askrev');
        expect(caughtError.message).not.toContain('5432');
      });

      it('should safely catch unexpected database errors during user lookup and throw UnauthorizedException without leaking internals', async () => {
        const mockPrismaDb: any = {
          user: {
            findUnique: vi.fn().mockRejectedValue(new Error('PrismaClientKnownRequestError: relation "User" does not exist')),
          },
        };
        const mockRevocationService: any = {
          isTokenRevoked: vi.fn().mockResolvedValue(false),
        };

        const jwtStrategy = new JwtStrategy(mockPrismaDb, mockRevocationService);
        const mockReq: any = { headers: { authorization: 'Bearer valid-token' }, cookies: {} };

        let caughtError: any;
        try {
          await jwtStrategy.validate(mockReq, {
            sub: 'user-uuid',
            role: UserRole.FREE_USER,
            sessionVersion: 1,
          });
        } catch (err) {
          caughtError = err;
        }

        expect(caughtError).toBeInstanceOf(UnauthorizedException);
        expect(caughtError.message).toBe('Authentication verification failed. Please sign in again.');
        expect(caughtError.message).not.toContain('relation');
        expect(caughtError.message).not.toContain('PrismaClientKnownRequestError');
      });
    });

    describe('Mandatory sessionVersion Validation on All Member & Admin Access JWTs', () => {
      it('should strictly reject legacy access tokens missing sessionVersion (undefined)', async () => {
        const mockPrismaDb: any = {
          user: { findUnique: vi.fn() },
        };
        const mockRevocationService: any = {
          isTokenRevoked: vi.fn().mockResolvedValue(false),
        };

        const jwtStrategy = new JwtStrategy(mockPrismaDb, mockRevocationService);
        const mockReq: any = { headers: { authorization: 'Bearer legacy-token' }, cookies: {} };

        // Legacy token payload completely missing sessionVersion
        const legacyPayload = {
          sub: 'user-uuid',
          email: 'legacy@askrevdrive.com',
          role: UserRole.FREE_USER,
        } as any;

        await expect(jwtStrategy.validate(mockReq, legacyPayload)).rejects.toThrow(UnauthorizedException);
        await expect(jwtStrategy.validate(mockReq, legacyPayload)).rejects.toThrow(
          'Session version is missing or invalid. Please sign in again.'
        );
      });

      it('should strictly reject access tokens with null or non-number sessionVersion', async () => {
        const mockPrismaDb: any = { user: { findUnique: vi.fn() } };
        const mockRevocationService: any = { isTokenRevoked: vi.fn().mockResolvedValue(false) };
        const jwtStrategy = new JwtStrategy(mockPrismaDb, mockRevocationService);
        const mockReq: any = { headers: {}, cookies: {} };

        await expect(
          jwtStrategy.validate(mockReq, {
            sub: 'user-uuid',
            role: UserRole.FREE_USER,
            sessionVersion: null as any,
          })
        ).rejects.toThrow(UnauthorizedException);

        await expect(
          jwtStrategy.validate(mockReq, {
            sub: 'user-uuid',
            role: UserRole.FREE_USER,
            sessionVersion: '1' as any,
          })
        ).rejects.toThrow(UnauthorizedException);
      });

      it('should strictly reject stale sessions where sessionVersion does not match current user version', async () => {
        const mockPrismaDb: any = {
          user: {
            findUnique: vi.fn().mockResolvedValue({
              id: 'user-uuid',
              role: UserRole.FREE_USER,
              sessionVersion: 5, // Bumped to version 5
            }),
          },
        };
        const mockRevocationService: any = { isTokenRevoked: vi.fn().mockResolvedValue(false) };
        const jwtStrategy = new JwtStrategy(mockPrismaDb, mockRevocationService);
        const mockReq: any = { headers: {}, cookies: {} };

        await expect(
          jwtStrategy.validate(mockReq, {
            sub: 'user-uuid',
            role: UserRole.FREE_USER,
            sessionVersion: 4, // Stale version 4
          })
        ).rejects.toThrow('Session has been revoked. Please sign in again.');
      });

      it('should accept access tokens when sessionVersion strictly matches the current database version', async () => {
        const mockPrismaDb: any = {
          user: {
            findUnique: vi.fn().mockResolvedValue({
              id: 'user-uuid',
              role: UserRole.FREE_USER,
              sessionVersion: 3,
              wallet: {},
            }),
          },
        };
        const mockRevocationService: any = { isTokenRevoked: vi.fn().mockResolvedValue(false) };
        const jwtStrategy = new JwtStrategy(mockPrismaDb, mockRevocationService);
        const mockReq: any = { headers: {}, cookies: {} };

        const result = await jwtStrategy.validate(mockReq, {
          sub: 'user-uuid',
          role: UserRole.FREE_USER,
          sessionVersion: 3, // Matches DB version
        });

        expect(result.id).toBe('user-uuid');
        expect(result.sessionVersion).toBe(3);
      });

      it('should simulate multi-instance revocation: Node A bumps sessionVersion, Node B immediately rejects old tokens', async () => {
        // Shared database state
        let databaseSessionVersion = 1;

        const sharedDb: any = {
          user: {
            findUnique: vi.fn().mockImplementation(async () => ({
              id: 'member-101',
              role: UserRole.FREE_USER,
              sessionVersion: databaseSessionVersion,
              wallet: {},
            })),
            update: vi.fn().mockImplementation(async ({ data }) => {
              if (data?.sessionVersion?.increment) {
                databaseSessionVersion += data.sessionVersion.increment;
              }
              return { id: 'member-101', sessionVersion: databaseSessionVersion };
            }),
          },
        };

        const mockRevocation: any = { isTokenRevoked: vi.fn().mockResolvedValue(false) };
        const nodeBJwtStrategy = new JwtStrategy(sharedDb, mockRevocation);
        const mockReq: any = { headers: {}, cookies: {} };

        // Before revocation on Node A: Node B accepts token issued at version 1
        const initialResult = await nodeBJwtStrategy.validate(mockReq, {
          sub: 'member-101',
          role: UserRole.FREE_USER,
          sessionVersion: 1,
        });
        expect(initialResult.sessionVersion).toBe(1);

        // Node A executes logout or password change: bumps sessionVersion in shared DB
        await sharedDb.user.update({
          where: { id: 'member-101' },
          data: { sessionVersion: { increment: 1 } },
        });
        expect(databaseSessionVersion).toBe(2);

        // Node B receives subsequent request with the previous token (sessionVersion 1) -> MUST REJECT INSTANTLY
        await expect(
          nodeBJwtStrategy.validate(mockReq, {
            sub: 'member-101',
            role: UserRole.FREE_USER,
            sessionVersion: 1,
          })
        ).rejects.toThrow(UnauthorizedException);
      });
    });

    describe('Consistent Session Version Behavior across Refresh, Password Reset & Logout', () => {
      it('should reject refresh tokens missing sessionVersion in payload (legacy refresh tokens)', async () => {
        const mockJwtService: any = {
          verifyAsync: vi.fn().mockResolvedValue({
            sub: 'user-uuid',
            email: 'user@askrev.com',
            role: UserRole.FREE_USER,
            // sessionVersion is missing
          }),
        };
        const mockPrismaDb: any = { user: { findUnique: vi.fn() } };
        const authService = new AuthService(mockPrismaDb, mockJwtService, {} as any, {} as any, {} as any);

        await expect(authService.refresh('legacy-refresh-token-without-version')).rejects.toThrow(
          'Session version is missing or invalid. Please sign in again.'
        );
      });

      it('should reject refresh tokens with stale sessionVersion', async () => {
        const rawToken = 'stale-refresh-token';
        const hash = await bcrypt.hash(hashToken(rawToken), 10);

        const mockJwtService: any = {
          verifyAsync: vi.fn().mockResolvedValue({
            sub: 'user-uuid',
            email: 'user@askrev.com',
            role: UserRole.FREE_USER,
            sessionVersion: 2, // Token has version 2
          }),
        };
        const mockPrismaDb: any = {
          user: {
            findUnique: vi.fn().mockResolvedValue({
              id: 'user-uuid',
              email: 'user@askrev.com',
              role: UserRole.FREE_USER,
              refreshTokenHash: hash,
              sessionVersion: 3, // Database has version 3
            }),
          },
        };
        const authService = new AuthService(mockPrismaDb, mockJwtService, {} as any, {} as any, {} as any);

        await expect(authService.refresh(rawToken)).rejects.toThrow(
          'Session has been revoked. Please sign in again.'
        );
      });

      it('should verify resetPassword increments sessionVersion to revoke all active sessions', async () => {
        const tokenHash = crypto.createHash('sha256').update('reset-tok-xyz').digest('hex');
        const mockPrismaDb: any = {
          passwordResetToken: {
            findUnique: vi.fn().mockResolvedValue({
              id: 'prt-1',
              userId: 'user-uuid',
              tokenHash,
              expiresAt: new Date(Date.now() + 600000),
              usedAt: null,
              user: { email: 'user@askrev.com' },
            }),
            update: vi.fn().mockResolvedValue({}),
          },
          user: {
            update: vi.fn().mockResolvedValue({}),
          },
          auditLog: {
            create: vi.fn().mockResolvedValue({}),
          },
          $transaction: vi.fn().mockImplementation(async (ops) => Promise.all(ops)),
        };

        const authService = new AuthService(mockPrismaDb, {} as any, {} as any, {} as any, {} as any);

        const res = await authService.resetPassword({
          token: 'reset-tok-xyz',
          newPassword: 'BrandNewSecurePassword123!',
          confirmPassword: 'BrandNewSecurePassword123!',
        });

        expect(res.success).toBe(true);
        expect(mockPrismaDb.user.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'user-uuid' },
            data: expect.objectContaining({
              sessionVersion: { increment: 1 },
              refreshTokenHash: null,
            }),
          })
        );
      });
    });
  });
});
