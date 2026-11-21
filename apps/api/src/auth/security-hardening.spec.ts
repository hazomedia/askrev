import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionContext, ForbiddenException, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CsrfGuard } from './guards/csrf.guard';
import { AuthService } from './auth.service';
import { UserRole } from '@askrev/shared';

describe('Pre-Production Security Hardening Suite', () => {
  describe('CsrfGuard', () => {
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

    it('should allow POST requests with Authorization Bearer header without CSRF cookie', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'POST',
            headers: { authorization: 'Bearer mock-jwt-token' },
            cookies: {},
          }),
        }),
      } as unknown as ExecutionContext;

      expect(guard.canActivate(mockContext)).toBe(true);
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

  describe('Privileged Admin MFA Enforcement', () => {
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
        signAsync: vi.fn().mockResolvedValue('mock-token'),
        decode: vi.fn(),
      };
      mockTotp = {
        checkRateLimit: vi.fn().mockReturnValue({ allowed: true }),
        verifyTokenWithReplayProtection: vi.fn(),
        verifyAndConsumeRecoveryCode: vi.fn(),
        resetRateLimit: vi.fn(),
        recordFailedAttempt: vi.fn(),
      };
      mockEmail = {
        sendEmailVerification: vi.fn(),
      };

      authService = new AuthService(mockPrisma, mockJwt, mockTotp, mockEmail);
    });

    it('should reject login for SUPER_ADMIN when MFA is not enabled in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'admin-uuid',
        email: 'admin@askrevdrive.com',
        role: UserRole.SUPER_ADMIN,
        passwordHash,
        twoFactorEnabled: false,
      });

      await expect(
        authService.login({
          email: 'admin@askrevdrive.com',
          password: 'CorrectAdminPassword123!',
        })
      ).rejects.toThrow(UnauthorizedException);

      process.env.NODE_ENV = originalEnv;
    });

    it('should require valid TOTP code for MFA-enabled accounts', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'admin-uuid',
        email: 'admin@askrevdrive.com',
        role: UserRole.SUPER_ADMIN,
        passwordHash,
        twoFactorEnabled: true,
        twoFactorSecret: 'MFA_SECRET_BASE32',
      });

      mockTotp.verifyTokenWithReplayProtection.mockReturnValue(false);

      await expect(
        authService.login({
          email: 'admin@askrevdrive.com',
          password: 'CorrectAdminPassword123!',
          totpCode: '000000',
        })
      ).rejects.toThrow(UnauthorizedException);
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

