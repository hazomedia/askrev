import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionContext, ForbiddenException, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CsrfGuard } from './guards/csrf.guard';
import { AuthService } from './auth.service';
import { UserRole } from '@askrev/shared';
import { RateLimiterService, getClientIp } from '../common/rate-limiter.service';
import { JwtStrategy } from './strategies/jwt.strategy';

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

    it('should allow POST requests when CSRF cookie matches x-csrf-token header', () => {
      const validToken = '8f3a1b0c9d8e7f6a5b4c3d2e1f0a9b8c';
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'POST',
            headers: { 'x-csrf-token': validToken },
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
    let passwordHash: string;

    beforeEach(async () => {
      passwordHash = await bcrypt.hash('CorrectAdminPassword123!', 10);
      mockPrisma = {
        user: {
          findUnique: vi.fn(),
          update: vi.fn(),
        },
        auditLog: {
          create: vi.fn().mockResolvedValue({}),
        },
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

      authService = new AuthService(mockPrisma, mockJwt, mockTotp, mockEmail);
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
      const jwtStrategy = new JwtStrategy(mockPrisma);
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

    it('should successfully setup MFA enrollment with valid enrollment token', async () => {
      mockJwt.verifyAsync.mockResolvedValue({
        sub: 'admin-uuid',
        email: 'admin@askrevdrive.com',
        scope: 'mfa_enrollment',
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'admin-uuid',
        email: 'admin@askrevdrive.com',
        role: UserRole.SUPER_ADMIN,
      });

      const setup = await authService.setupMfaEnrollment({
        enrollmentToken: 'valid-enrollment-token',
      });

      expect(setup.secret).toBe('MOCK_BASE32_SECRET');
      expect(setup.qrCodeDataUrl).toBeDefined();
      expect(setup.instructions).toBeDefined();
    });

    it('should confirm MFA enrollment, store hashed recovery codes, and activate session', async () => {
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
      });
      mockTotp.verifyTokenWithReplayProtection.mockReturnValue(true);

      const confirmation = await authService.confirmMfaEnrollment({
        enrollmentToken: 'valid-enrollment-token',
        secret: 'MOCK_BASE32_SECRET',
        code: '123456',
      });

      expect(confirmation.success).toBe(true);
      expect(confirmation.recoveryCodes).toHaveLength(8);
      expect(confirmation.tokens).toBeDefined();
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'admin-uuid' },
          data: expect.objectContaining({
            twoFactorSecret: 'MOCK_BASE32_SECRET',
            twoFactorEnabled: true,
          }),
        })
      );
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

    it('should securely extract leftmost client IP from X-Forwarded-For header', () => {
      const mockReq = {
        headers: {
          'x-forwarded-for': '203.0.113.195, 198.51.100.1, 10.0.0.1',
        },
        socket: { remoteAddress: '10.0.0.1' },
      } as any;

      const clientIp = getClientIp(mockReq);
      expect(clientIp).toBe('203.0.113.195');
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
});
