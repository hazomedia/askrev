import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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
          if (where.id === mockUser.id || where.email === mockUser.email || where.memberId === mockUser.memberId) {
            return Promise.resolve({ ...mockUser });
          }
          return Promise.resolve(null);
        }),
        findFirst: vi.fn().mockImplementation(({ where }) => {
          if (where.phone && where.phone === mockUser.phone && where.id?.not !== mockUser.id) {
            return Promise.resolve({ ...mockUser });
          }
          return Promise.resolve(null);
        }),
        create: vi.fn().mockImplementation(({ data }) => {
          return Promise.resolve({
            id: 'new-user-1',
            memberId: 'ASKR-NEW-01',
            ...data,
            wallet: null,
            sponsor: null,
            createdAt: new Date(),
          });
        }),
        update: vi.fn().mockImplementation(({ where, data }) => {
          Object.assign(mockUser, data);
          return Promise.resolve({ ...mockUser });
        }),
        count: vi.fn().mockResolvedValue(1),
      },
      wallet: {
        create: vi.fn().mockResolvedValue({ id: 'wallet-1', userId: 'new-user-1' }),
      },
      passwordResetToken: {
        create: vi.fn().mockResolvedValue({ id: 'prt-1' }),
        findUnique: vi.fn().mockResolvedValue(null),
        findFirst: vi.fn(),
        update: vi.fn(),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      emailVerificationToken: {
        create: vi.fn().mockResolvedValue({ id: 'evt-1' }),
        findUnique: vi.fn().mockResolvedValue(null),
        findFirst: vi.fn(),
        update: vi.fn(),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: 'audit-log-1' }),
      },
      binaryPlacement: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      $transaction: vi.fn().mockImplementation((promises) =>
        Array.isArray(promises) ? Promise.all(promises) : promises(mockPrisma)
      ),
    };

    mockJwtService = {
      signAsync: vi.fn().mockResolvedValue('mock-token'),
      decode: vi.fn().mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 }),
    };

    const mockEmailService = {
      sendPasswordResetEmail: vi.fn().mockResolvedValue(true),
      sendEmailVerification: vi.fn().mockResolvedValue(true),
      sendWelcomeRegistrationEmail: vi.fn().mockResolvedValue(true),
      sendPasswordChangedNotification: vi.fn().mockResolvedValue(true),
    };

    const mockTokenRevocation = {
      revokeToken: vi.fn().mockResolvedValue(undefined),
      isTokenRevoked: vi.fn().mockResolvedValue(false),
    };

    authService = new AuthService(
      mockPrisma as any,
      mockJwtService as any,
      totpService,
      mockEmailService as any,
      mockTokenRevocation as any
    );
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
      const disableCode = totpService.generateTOTP(setup.secret);
      const disableResult = await authService.disableMfa(mockUser.id, {
        password: 'OldSecurePassword@2026',
        code: disableCode,
      });
      expect(disableResult.message).toContain('disabled');
      expect(mockUser.twoFactorEnabled).toBe(false);
      expect(mockUser.twoFactorSecret).toBeNull();
    });
  });

  describe('Phase 1: Member Registration & Mandatory Sponsor Validation', () => {
    it('should reject registration with 503 when REGISTRATION_PAUSED is true', async () => {
      const origEnv = process.env.REGISTRATION_PAUSED;
      try {
        process.env.REGISTRATION_PAUSED = 'true';
        await expect(
          authService.register({
            email: 'newuser@askrevdrive.com',
            password: 'SecurePassword@2026',
            fullName: 'New Member',
            phone: '+919876543210',
            sponsorMemberId: 'ASKR-SUPERADMIN',
            side: 'LEFT',
          })
        ).rejects.toThrow('New member registrations will resume soon');
      } finally {
        process.env.REGISTRATION_PAUSED = origEnv;
      }
    });

    it('should reject registration when sponsor referral code does not exist', async () => {
      mockPrisma.user.findUnique.mockImplementation(({ where }) => {
        if (where.memberId === 'NONEXISTENT') return Promise.resolve(null);
        return Promise.resolve(null);
      });

      await expect(
        authService.register({
          email: 'newuser@askrevdrive.com',
          password: 'SecurePassword@2026',
          fullName: 'New Member',
          phone: '+919876543210',
          sponsorMemberId: 'NONEXISTENT',
          side: 'LEFT',
        })
      ).rejects.toThrow('does not exist');
    });

    it('should reject self-sponsoring when applicant registers with sponsor own email', async () => {
      mockPrisma.user.findUnique.mockImplementation(({ where }) => {
        if (where.memberId === mockUser.memberId) return Promise.resolve(mockUser);
        return Promise.resolve(null);
      });

      await expect(
        authService.register({
          email: mockUser.email, // same email as sponsor
          password: 'SecurePassword@2026',
          fullName: 'Self Sponsor Attempt',
          phone: '+919876543210',
          sponsorMemberId: mockUser.memberId,
          side: 'LEFT',
        })
      ).rejects.toThrow('Self-sponsoring is strictly prohibited');
    });

    it('should successfully register a member with a valid sponsor referral code', async () => {
      mockPrisma.user.findUnique.mockImplementation(({ where }) => {
        if (where.memberId === mockUser.memberId) return Promise.resolve(mockUser);
        return Promise.resolve(null);
      });

      const result = await authService.register({
        email: 'applicant@askrevdrive.com',
        password: 'ValidMemberPassword@2026',
        fullName: 'Valid Member',
        phone: '+919123456789',
        sponsorMemberId: mockUser.memberId,
        side: 'LEFT',
      });

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sponsorId: mockUser.id,
            email: 'applicant@askrevdrive.com',
          }),
        })
      );
    });

    it('should persist explicit LEFT or RIGHT leg from referral registration', async () => {
      mockPrisma.user.findUnique.mockImplementation(({ where }) => {
        if (where.memberId === mockUser.memberId) return Promise.resolve(mockUser);
        return Promise.resolve(null);
      });

      // Explicit RIGHT leg
      await authService.register({
        email: 'applicant-right@askrevdrive.com',
        password: 'ValidMemberPassword@2026',
        fullName: 'Right Leg Member',
        sponsorMemberId: mockUser.memberId,
        side: 'RIGHT',
      });
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            intendedBinarySide: 'RIGHT',
          }),
        })
      );

      // Explicit LEFT leg
      await authService.register({
        email: 'applicant-left@askrevdrive.com',
        password: 'ValidMemberPassword@2026',
        fullName: 'Left Leg Member',
        sponsorMemberId: mockUser.memberId,
        side: 'LEFT',
      });
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            intendedBinarySide: 'LEFT',
          }),
        })
      );
    });

    it('should reject registration when placement leg is omitted or invalid (no silent auto-balancing)', async () => {
      mockPrisma.user.findUnique.mockImplementation(({ where }) => {
        if (where.memberId === mockUser.memberId) return Promise.resolve(mockUser);
        return Promise.resolve(null);
      });

      // Missing side rejected
      await expect(
        authService.register({
          email: 'applicant-missing-side@askrevdrive.com',
          password: 'ValidMemberPassword@2026',
          fullName: 'Missing Side Member',
          sponsorMemberId: mockUser.memberId,
        } as any)
      ).rejects.toThrow('Placement leg is required');

      // Invalid side rejected
      await expect(
        authService.register({
          email: 'applicant-invalid-side@askrevdrive.com',
          password: 'ValidMemberPassword@2026',
          fullName: 'Bad Side Member',
          sponsorMemberId: mockUser.memberId,
          side: 'MIDDLE' as any,
        })
      ).rejects.toThrow('Placement leg is required and must be explicitly LEFT or RIGHT');
    });

    it('should lookup valid sponsor and return identity preview', async () => {
      mockPrisma.user.findUnique.mockImplementation(({ where }) => {
        if (where.memberId === mockUser.memberId) return Promise.resolve(mockUser);
        return Promise.resolve(null);
      });

      const validLookup = await authService.lookupSponsor(mockUser.memberId);
      expect(validLookup.valid).toBe(true);
      expect(validLookup.fullName).toBe(mockUser.fullName);
      expect(validLookup.memberId).toBe(mockUser.memberId);

      await expect(authService.lookupSponsor('INVALID_CODE')).rejects.toThrow('was not found');
    });
  });

  describe('Phase 1: Forgot Password, Reset Flow & Anti-Enumeration', () => {
    it('should return identical success response regardless of email existence (anti-enumeration)', async () => {
      // Existing email
      const resExisting = await authService.forgotPassword({ email: mockUser.email });
      expect(resExisting.message).toContain('If an account exists with this email address');

      // Non-existing email
      const resNonExisting = await authService.forgotPassword({ email: 'unknown@askrevdrive.com' });
      expect(resNonExisting.message).toBe(resExisting.message);
    });

    it('should reject reset password with invalid or non-existent token', async () => {
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue(null);

      await expect(
        authService.resetPassword({
          token: 'invalid-or-fake-token',
          newPassword: 'BrandNewSecurePassword@2026',
          confirmPassword: 'BrandNewSecurePassword@2026',
        })
      ).rejects.toThrow('Password reset link is invalid, expired, or has already been used');
    });

    it('should reject reset password when token is already used or expired', async () => {
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'prt-expired',
        tokenHash: 'hashed-token',
        usedAt: new Date(), // already used
        expiresAt: new Date(Date.now() - 10000), // expired
        user: mockUser,
      });

      await expect(
        authService.resetPassword({
          token: 'expired-token',
          newPassword: 'BrandNewSecurePassword@2026',
          confirmPassword: 'BrandNewSecurePassword@2026',
        })
      ).rejects.toThrow('Password reset link is invalid, expired, or has already been used');
    });

    it('should successfully reset password, revoke all refresh sessions, and mark token used', async () => {
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'prt-valid',
        userId: mockUser.id,
        tokenHash: 'hashed-token',
        usedAt: null,
        expiresAt: new Date(Date.now() + 600000), // valid for 10 min
        user: mockUser,
      });

      const result = await authService.resetPassword({
        token: 'valid-reset-token-sample',
        newPassword: 'BrandNewSecurePassword@2026',
        confirmPassword: 'BrandNewSecurePassword@2026',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully reset');

      // User password updated and refresh tokens revoked
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUser.id },
          data: expect.objectContaining({ refreshTokenHash: null }),
        })
      );
    });
  });

  describe('Phase 1: Profile Update & Verification', () => {
    it('should successfully update full legal name and phone number', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null); // phone not duplicate

      const updated = await authService.updateProfile(mockUser.id, {
        fullName: 'Updated Legal Name',
        phone: '+919876543210',
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUser.id },
          data: expect.objectContaining({
            fullName: 'Updated Legal Name',
            phone: '+919876543210',
          }),
        })
      );
    });

    it('should reject phone update if phone number is already registered to another account', async () => {
      mockUser.phone = '+919999999999';
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'other-user', phone: '+919876543210' });

      await expect(
        authService.updateProfile(mockUser.id, {
          fullName: 'Security Test Admin',
          phone: '+919876543210',
        })
      ).rejects.toThrow('This phone number is already registered to another account');
    });

    it('should verify email with valid verification token', async () => {
      mockPrisma.emailVerificationToken.findUnique.mockResolvedValue({
        id: 'evt-valid',
        userId: mockUser.id,
        tokenHash: 'hashed-verification-token',
        usedAt: null,
        expiresAt: new Date(Date.now() + 86400000),
        user: mockUser,
      });

      const result = await authService.verifyEmail({ token: 'valid-email-token' });

      expect(result.success).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUser.id },
          data: expect.objectContaining({
            isEmailVerified: true,
            emailVerifiedAt: expect.any(Date),
          }),
        })
      );
    });
  });

  describe('Admin Password-Only Login & TOTP Toggle Security Controls', () => {
    const originalEnv = process.env.ADMIN_TOTP_REQUIRED;

    afterEach(() => {
      if (originalEnv !== undefined) {
        process.env.ADMIN_TOTP_REQUIRED = originalEnv;
      } else {
        delete process.env.ADMIN_TOTP_REQUIRED;
      }
    });

    describe('isAdminTotpRequired() Server-Side Flag Safety', () => {
      it('defaults to true when environment variable is undefined, empty, or invalid', () => {
        delete process.env.ADMIN_TOTP_REQUIRED;
        expect(authService.isAdminTotpRequired()).toBe(true);

        process.env.ADMIN_TOTP_REQUIRED = '';
        expect(authService.isAdminTotpRequired()).toBe(true);

        process.env.ADMIN_TOTP_REQUIRED = 'invalid_value';
        expect(authService.isAdminTotpRequired()).toBe(true);

        process.env.ADMIN_TOTP_REQUIRED = 'true';
        expect(authService.isAdminTotpRequired()).toBe(true);
      });

      it('returns false only when explicitly configured to false, 0, off, or disabled', () => {
        process.env.ADMIN_TOTP_REQUIRED = 'false';
        expect(authService.isAdminTotpRequired()).toBe(false);

        process.env.ADMIN_TOTP_REQUIRED = 'FALSE';
        expect(authService.isAdminTotpRequired()).toBe(false);

        process.env.ADMIN_TOTP_REQUIRED = '0';
        expect(authService.isAdminTotpRequired()).toBe(false);

        process.env.ADMIN_TOTP_REQUIRED = 'off';
        expect(authService.isAdminTotpRequired()).toBe(false);

        process.env.ADMIN_TOTP_REQUIRED = 'disabled';
        expect(authService.isAdminTotpRequired()).toBe(false);
      });
    });

    describe('Password-Only Admin Login Workflow (ADMIN_TOTP_REQUIRED=false)', () => {
      beforeEach(() => {
        process.env.ADMIN_TOTP_REQUIRED = 'false';
        totpService.resetRateLimit(`auth-login:${mockUser.email.toLowerCase().trim()}`);
      });

      it('allows Admin without MFA to login with password only without requiring MFA bootstrap', async () => {
        mockUser.twoFactorEnabled = false;
        mockUser.twoFactorSecret = null;

        const result = await authService.login({
          email: mockUser.email,
          password: 'OldSecurePassword@2026',
        });

        expect(result.tokens).toHaveProperty('accessToken');
        expect(result.tokens).toHaveProperty('refreshToken');
        expect(result.user).toBeDefined();
        expect((result as any).mfaEnrollmentRequired).toBeUndefined();
      });

      it('allows Admin with existing MFA configured to login with password only (bypassing TOTP challenge)', async () => {
        mockUser.twoFactorEnabled = true;
        mockUser.twoFactorSecret = 'ENC_TEST_SECRET';

        const result = await authService.login({
          email: mockUser.email,
          password: 'OldSecurePassword@2026',
        });

        // Even though twoFactorEnabled is true on the user record, ADMIN_TOTP_REQUIRED=false permits password-only entry
        expect(result.tokens).toHaveProperty('accessToken');
        expect(result.tokens).toHaveProperty('refreshToken');
        expect(result.user).toBeDefined();
      });

      it('enforces MFA for Members even when ADMIN_TOTP_REQUIRED=false', async () => {
        const memberUser = {
          ...mockUser,
          id: 'user-member-01',
          email: 'member@askrevdrive.com',
          role: UserRole.MEMBER,
          twoFactorEnabled: true,
          twoFactorSecret: 'ENC_MEMBER_SECRET',
        };

        mockPrisma.user.findUnique.mockImplementation(({ where }: any) => {
          if (where.email === memberUser.email) {
            return Promise.resolve({ ...memberUser });
          }
          return Promise.resolve(null);
        });

        totpService.resetRateLimit(`auth-login:${memberUser.email}`);

        // Members with 2FA enabled must still provide TOTP
        await expect(
          authService.login({
            email: memberUser.email,
            password: 'OldSecurePassword@2026',
          })
        ).rejects.toThrow('MFA_REQUIRED');
      });
    });

    describe('Enforced Admin MFA Workflow (ADMIN_TOTP_REQUIRED=true)', () => {
      beforeEach(() => {
        process.env.ADMIN_TOTP_REQUIRED = 'true';
        totpService.resetRateLimit(`auth-login:${mockUser.email.toLowerCase().trim()}`);
      });

      it('requires MFA bootstrap enrollment for Admin when 2FA is not enabled', async () => {
        mockUser.twoFactorEnabled = false;
        mockUser.twoFactorSecret = null;

        const result = await authService.login({
          email: mockUser.email,
          password: 'OldSecurePassword@2026',
        });

        expect((result as any).mfaEnrollmentRequired).toBe(true);
        expect((result as any).enrollmentToken).toBeDefined();
        expect((result as any).tokens).toBeUndefined();
      });

      it('requires TOTP verification challenge for Admin when 2FA is enabled', async () => {
        mockUser.twoFactorEnabled = true;
        mockUser.twoFactorSecret = 'ENC_TEST_SECRET';

        await expect(
          authService.login({
            email: mockUser.email,
            password: 'OldSecurePassword@2026',
          })
        ).rejects.toThrow('MFA_REQUIRED');
      });
    });

    describe('Password-Only Security Controls: Rate Limiting & Account Lockout', () => {
      beforeEach(() => {
        process.env.ADMIN_TOTP_REQUIRED = 'false';
        totpService.resetRateLimit(`auth-login:${mockUser.email.toLowerCase().trim()}`);
      });

      it('rejects wrong password with uniform 401 error and logs AUTH_LOGIN_FAILED', async () => {
        await expect(
          authService.login({
            email: mockUser.email,
            password: 'CompletelyWrongPassword!999',
          })
        ).rejects.toThrow('Invalid email or password');

        expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              action: 'AUTH_LOGIN_FAILED',
              metadata: expect.objectContaining({
                email: mockUser.email,
                reason: 'BAD_PASSWORD',
              }),
            }),
          })
        );
      });

      it('locks account after 5 consecutive failed login attempts and resets on success', async () => {
        const email = mockUser.email;

        // 5 consecutive failed attempts
        for (let i = 0; i < 5; i++) {
          await expect(
            authService.login({
              email,
              password: 'WrongPassword@123',
            })
          ).rejects.toThrow('Invalid email or password');
        }

        // 6th attempt is blocked by rate limiter lockout
        await expect(
          authService.login({
            email,
            password: 'OldSecurePassword@2026', // Even with correct password, account is locked
          })
        ).rejects.toThrow('Too many failed login attempts. Account temporarily locked');

        expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              action: 'AUTH_LOGIN_LOCKED',
              metadata: expect.objectContaining({
                email,
                reason: 'RATE_LIMIT_EXCEEDED',
              }),
            }),
          })
        );

        // Reset rate limit (simulating 15m expiration or admin reset)
        totpService.resetRateLimit(`auth-login:${email}`);

        // Login with correct password succeeds immediately
        const successResult = await authService.login({
          email,
          password: 'OldSecurePassword@2026',
        });

        expect(successResult.tokens).toHaveProperty('accessToken');
        expect(successResult.tokens).toHaveProperty('refreshToken');
      });
    });
  });
});
