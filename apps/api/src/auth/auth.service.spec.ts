import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { TotpService } from './totp.service';
import { UserRole, MembershipPackage } from '@askrev/shared';

describe('AuthService & TotpService Security Enhancements', () => {
  let authService: AuthService;
  let totpService: TotpService;
  let mockPrisma: any;
  let mockJwtService: any;

  const mockUser = {
    id: 'user-sec-test-01',
    memberId: 'ASKR-SEC-01',
    email: 'sec-admin@askrevdrive.com',
    fullName: 'Security Test Admin',
    phone: '+919999999999',
    role: UserRole.SUPER_ADMIN,
    currentPackage: MembershipPackage.FULL,
    isFullQualified: true,
    twoFactorSecret: null as string | null,
    twoFactorEnabled: false,
    twoFactorRecoveryCodes: [] as string[],
    passwordHash: '',
    refreshTokenHash: 'mock-refresh-token-hash',
    wallet: null,
    sponsor: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    totpService = new TotpService();

    mockUser.passwordHash = await bcrypt.hash('OldSecurePassword@2026', 10);
    mockUser.twoFactorSecret = null;
    mockUser.twoFactorEnabled = false;
    mockUser.twoFactorRecoveryCodes = [];
    mockUser.refreshTokenHash = 'mock-refresh-token-hash';

    mockPrisma = {
      user: {
        findUnique: vi.fn().mockImplementation(({ where }) => {
          if (where.id === mockUser.id || where.email === mockUser.email) {
            return Promise.resolve({ ...mockUser });
          }
          return Promise.resolve(null);
        }),
        update: vi.fn().mockImplementation(({ where, data }) => {
          Object.assign(mockUser, data);
          return Promise.resolve({ ...mockUser });
        }),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: 'audit-log-1' }),
      },
    };

    mockJwtService = {
      signAsync: vi.fn().mockResolvedValue('mock-token'),
      decode: vi.fn().mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 }),
    };

    authService = new AuthService(mockPrisma as any, mockJwtService as any, totpService);
  });

  describe('TotpService Features', () => {
    it('should generate valid Base32 secret and QR code data URL', async () => {
      const { secret, otpauthUrl } = totpService.generateSecret(20, 'test@askrevdrive.com');
      expect(secret).toBeDefined();
      expect(secret.length).toBeGreaterThanOrEqual(16);
      expect(otpauthUrl).toContain('otpauth://totp/');

      const qrCode = await totpService.generateQrCode(otpauthUrl);
      expect(qrCode).toMatch(/^data:image\/png;base64,/);
    });

    it('should verify generated TOTP code correctly', () => {
      const { secret } = totpService.generateSecret();
      const code = totpService.generateTOTP(secret);
      expect(totpService.verifyToken(secret, code)).toBe(true);
      expect(totpService.verifyToken(secret, '000000')).toBe(false);
    });

    it('should enforce replay protection by rejecting already consumed code', () => {
      const { secret } = totpService.generateSecret();
      const code = totpService.generateTOTP(secret);

      // First verification succeeds
      const firstUse = totpService.verifyTokenWithReplayProtection('user-1', secret, code);
      expect(firstUse).toBe(true);

      // Second verification of the exact same code is rejected (replay attack prevention)
      const secondUse = totpService.verifyTokenWithReplayProtection('user-1', secret, code);
      expect(secondUse).toBe(false);
    });

    it('should enforce rate limiting on repeated failed MFA attempts', () => {
      const key = 'test-mfa-rate-limit';
      for (let i = 0; i < 5; i++) {
        expect(totpService.checkRateLimit(key, 5, 60000).allowed).toBe(true);
        totpService.recordFailedAttempt(key, 60000);
      }
      // 6th attempt is blocked
      expect(totpService.checkRateLimit(key, 5, 60000).allowed).toBe(false);

      // Reset allows attempts again
      totpService.resetRateLimit(key);
      expect(totpService.checkRateLimit(key, 5, 60000).allowed).toBe(true);
    });

    it('should generate, hash and consume one-time backup recovery codes', () => {
      const rawCodes = totpService.generateRecoveryCodes(8);
      expect(rawCodes.length).toBe(8);

      const hashedCodes = rawCodes.map((c) => totpService.hashRecoveryCode(c));
      const codeToUse = rawCodes[2];

      const result = totpService.verifyAndConsumeRecoveryCode(codeToUse, hashedCodes);
      expect(result.valid).toBe(true);
      expect(result.remainingHashedCodes.length).toBe(7);

      // Re-using the consumed recovery code must fail
      const reuseResult = totpService.verifyAndConsumeRecoveryCode(codeToUse, result.remainingHashedCodes);
      expect(reuseResult.valid).toBe(false);
      expect(reuseResult.remainingHashedCodes.length).toBe(7);
    });
  });

  describe('Change Password Functionality', () => {
    it('should reject password change when new and confirm passwords do not match', async () => {
      await expect(
        authService.changePassword(mockUser.id, {
          currentPassword: 'OldSecurePassword@2026',
          newPassword: 'BrandNewSecurePassword@2026',
          confirmPassword: 'MismatchPassword@2026',
        })
      ).rejects.toThrow('New password and confirmation password do not match');
    });

    it('should reject weak new passwords (<12 chars, missing special chars, etc.)', async () => {
      await expect(
        authService.changePassword(mockUser.id, {
          currentPassword: 'OldSecurePassword@2026',
          newPassword: 'short',
          confirmPassword: 'short',
        })
      ).rejects.toThrow('at least 12 characters');

      await expect(
        authService.changePassword(mockUser.id, {
          currentPassword: 'OldSecurePassword@2026',
          newPassword: 'alllowercasenonumberspecial',
          confirmPassword: 'alllowercasenonumberspecial',
        })
      ).rejects.toThrow('uppercase');
    });

    it('should reject incorrect current password', async () => {
      await expect(
        authService.changePassword(mockUser.id, {
          currentPassword: 'WrongPassword@123',
          newPassword: 'ValidNewPassword@2026#',
          confirmPassword: 'ValidNewPassword@2026#',
        })
      ).rejects.toThrow('Current password does not match');
    });

    it('should reject password reuse (same as current password)', async () => {
      await expect(
        authService.changePassword(mockUser.id, {
          currentPassword: 'OldSecurePassword@2026',
          newPassword: 'OldSecurePassword@2026',
          confirmPassword: 'OldSecurePassword@2026',
        })
      ).rejects.toThrow('cannot be the same as your current password');
    });

    it('should require MFA code when Two-Factor Authentication is enabled', async () => {
      const { secret } = totpService.generateSecret();
      mockUser.twoFactorSecret = secret;
      mockUser.twoFactorEnabled = true;

      // Missing MFA code
      await expect(
        authService.changePassword(mockUser.id, {
          currentPassword: 'OldSecurePassword@2026',
          newPassword: 'BrandNewPassword@2026#',
          confirmPassword: 'BrandNewPassword@2026#',
        })
      ).rejects.toThrow('MFA_REQUIRED');

      // Invalid MFA code
      await expect(
        authService.changePassword(mockUser.id, {
          currentPassword: 'OldSecurePassword@2026',
          newPassword: 'BrandNewPassword@2026#',
          confirmPassword: 'BrandNewPassword@2026#',
          totpCode: '000000',
        })
      ).rejects.toThrow('Invalid Two-Factor Authentication code');
    });

    it('should successfully change password, revoke all refresh sessions, and record audit log', async () => {
      const result = await authService.changePassword(
        mockUser.id,
        {
          currentPassword: 'OldSecurePassword@2026',
          newPassword: 'BrandNewPassword@2026#',
          confirmPassword: 'BrandNewPassword@2026#',
        },
        'mock-current-access-token'
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Password changed successfully');

      // User password hash updated
      expect(mockUser.passwordHash).not.toBe('');
      const matchesNew = await bcrypt.compare('BrandNewPassword@2026#', mockUser.passwordHash);
      expect(matchesNew).toBe(true);

      // Refresh tokens revoked
      expect(mockUser.refreshTokenHash).toBeNull();

      // Audit log created
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'AUTH_PASSWORD_CHANGED',
            entityId: mockUser.id,
          }),
        })
      );
    });
  });

  describe('Session Revocation & MFA Lifecycle', () => {
    it('should revoke all active sessions on demand', async () => {
      const result = await authService.revokeAllSessions(mockUser.id, 'mock-access-token');
      expect(result.success).toBe(true);
      expect(mockUser.refreshTokenHash).toBeNull();
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'AUTH_ALL_SESSIONS_REVOKED',
          }),
        })
      );
    });

    it('should successfully enable and disable MFA with password protection', async () => {
      const setup = await authService.setupMfa(mockUser.id);
      expect(setup.secret).toBeDefined();
      expect(setup.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);

      const validCode = totpService.generateTOTP(setup.secret);
      const enableResult = await authService.enableMfa(mockUser.id, validCode, setup.secret);
      expect(enableResult.recoveryCodes.length).toBe(8);
      expect(mockUser.twoFactorEnabled).toBe(true);

      // Disabling MFA with wrong password fails (using next time step)
      const nextStepCode = totpService.generateTOTP(setup.secret, Date.now() + 35000);
      await expect(
        authService.disableMfa(mockUser.id, {
          password: 'WrongPassword@123',
          code: nextStepCode,
        })
      ).rejects.toThrow('Invalid password');

      // Disabling MFA with correct password and a fresh time-step code succeeds
      const disableCode = totpService.generateTOTP(setup.secret, Date.now() + 35000);
      const disableResult = await authService.disableMfa(mockUser.id, {
        password: 'OldSecurePassword@2026',
        code: disableCode,
      });
      expect(disableResult.message).toContain('disabled');
      expect(mockUser.twoFactorEnabled).toBe(false);
      expect(mockUser.twoFactorSecret).toBeNull();
    });
  });
});
