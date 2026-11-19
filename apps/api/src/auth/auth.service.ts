import { Injectable, BadRequestException, UnauthorizedException, ConflictException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto, DisableMfaDto, ChangePasswordDto } from './dto/auth.dto';
import { UserRole, MembershipPackage, paiseToRupees } from '@askrev/shared';
import { getJwtAccessSecret, getJwtRefreshSecret, hashToken, revokeAccessToken } from './jwt-secrets';
import { TotpService } from './totp.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly totpService: TotpService
  ) {}

  /**
   * Generate an idempotent, unique Member ID (e.g. ASKR-829104)
   */
  private async generateUniqueMemberId(): Promise<string> {
    let attempts = 0;
    while (attempts < 10) {
      const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
      const candidate = `ASKR-${randomCode}`;
      const existing = await this.prisma.user.findUnique({
        where: { memberId: candidate },
      });
      if (!existing) {
        return candidate;
      }
      attempts++;
    }
    return `ASKR-${Date.now().toString().slice(-6)}`;
  }

  async register(dto: RegisterDto) {
    if (dto.initialPackage && dto.initialPackage !== MembershipPackage.FREE) {
      throw new ForbiddenException(
        'Direct paid package selection during public registration is disabled. Register as FREE and submit an activation request for admin approval.'
      );
    }

    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (existingEmail) {
      throw new ConflictException('An account with this email address already exists');
    }

    const cleanPhone = dto.phone?.trim() || null;
    if (cleanPhone) {
      const existingPhone = await this.prisma.user.findFirst({
        where: { phone: cleanPhone },
        select: { id: true },
      });
      if (existingPhone) {
        throw new ConflictException('An account with this phone number already exists');
      }
    }

    let sponsorId: string | null = null;
    if (dto.sponsorMemberId) {
      const sponsor = await this.prisma.user.findUnique({
        where: { memberId: dto.sponsorMemberId.trim() },
      });
      if (!sponsor) {
        throw new BadRequestException(`Sponsor with Member ID "${dto.sponsorMemberId}" does not exist`);
      }
      sponsorId = sponsor.id;
    }

    const memberId = await this.generateUniqueMemberId();
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        memberId,
        email: dto.email.toLowerCase().trim(),
        passwordHash,
        fullName: dto.fullName.trim(),
        phone: cleanPhone,
        role: UserRole.FREE_USER,
        currentPackage: MembershipPackage.FREE,
        isFullQualified: false,
        sponsorId,
        wallet: {
          create: {
            availableEarningsPaise: 0n,
            heldCommissionsPaise: 0n,
            pendingRecoveryPaise: 0n,
            shoppingVoucherBalancePaise: 0n,
          },
        },
        binaryPlacement: {
          create: {},
        },
      },
      include: {
        wallet: true,
        sponsor: {
          select: { memberId: true, fullName: true },
        },
      },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      message: 'Registration successful',
      tokens,
      user: this.formatUserProfile(user),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
      include: {
        wallet: true,
        sponsor: {
          select: { memberId: true, fullName: true },
        },
      },
    });

    if (!user) {
      try {
        await this.prisma.auditLog.create({
          data: {
            action: 'AUTH_LOGIN_FAILED',
            entityType: 'User',
            metadata: { email: dto.email.toLowerCase().trim(), reason: 'USER_NOT_FOUND' },
          },
        });
      } catch {}
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      try {
        await this.prisma.auditLog.create({
          data: {
            action: 'AUTH_LOGIN_FAILED',
            entityType: 'User',
            entityId: user.id,
            metadata: { email: dto.email.toLowerCase().trim(), reason: 'BAD_PASSWORD' },
          },
        });
      } catch {}
      throw new UnauthorizedException('Invalid email or password');
    }

    // Mandatory Two-Factor Authentication Check for MFA-enabled accounts
    if (user.twoFactorEnabled) {
      const mfaRateKey = `login-mfa:${user.id}`;
      const mfaRate = this.totpService.checkRateLimit(mfaRateKey, 5, 5 * 60 * 1000);
      if (!mfaRate.allowed) {
        throw new BadRequestException('Too many failed MFA verification attempts. Please wait 5 minutes before trying again.');
      }

      let mfaPassed = false;

      if (dto.totpCode) {
        mfaPassed = this.totpService.verifyTokenWithReplayProtection(user.id, user.twoFactorSecret || '', dto.totpCode, 1, 'login');
      } else if (dto.recoveryCode) {
        const recoveryResult = this.totpService.verifyAndConsumeRecoveryCode(
          dto.recoveryCode,
          user.twoFactorRecoveryCodes || []
        );
        if (recoveryResult.valid) {
          mfaPassed = true;
          await this.prisma.user.update({
            where: { id: user.id },
            data: { twoFactorRecoveryCodes: recoveryResult.remainingHashedCodes },
          });
        }
      }

      if (!mfaPassed) {
        this.totpService.recordFailedAttempt(mfaRateKey, 5 * 60 * 1000);
        try {
          await this.prisma.auditLog.create({
            data: {
              action: 'AUTH_MFA_CHALLENGE_FAILED',
              entityType: 'User',
              entityId: user.id,
              metadata: { email: user.email, hasTotp: Boolean(dto.totpCode), hasRecovery: Boolean(dto.recoveryCode) },
            },
          });
        } catch {}
        throw new UnauthorizedException('MFA_REQUIRED: Valid 6-digit TOTP code or backup recovery code is required for administrator access.');
      }

      this.totpService.resetRateLimit(mfaRateKey);
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    try {
      await this.prisma.auditLog.create({
        data: {
          action: 'AUTH_LOGIN_SUCCESS',
          entityType: 'User',
          entityId: user.id,
          actorId: user.id,
          metadata: {
            email: user.email,
            role: user.role,
            mfaUsed: user.twoFactorEnabled,
          },
        },
      });
    } catch {}

    return {
      message: 'Login successful',
      tokens,
      user: this.formatUserProfile(user),
    };
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string; email: string; role: string };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: getJwtRefreshSecret(),
      });
    } catch {
      throw new UnauthorizedException('Refresh token invalid or expired');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        wallet: true,
        sponsor: { select: { memberId: true, fullName: true } },
      },
    });

    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Session has expired or been logged out');
    }

    const hashedCandidate = hashToken(refreshToken);
    const matchesHashed = await bcrypt.compare(hashedCandidate, user.refreshTokenHash);
    const matchesLegacyRaw = !matchesHashed && (await bcrypt.compare(refreshToken, user.refreshTokenHash));
    if (!matchesHashed && !matchesLegacyRaw) {
      throw new UnauthorizedException('Refresh token revoked');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return {
      message: 'Session refreshed',
      tokens,
      user: this.formatUserProfile(user),
    };
  }

  async logout(userId: string, accessToken?: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });

    if (accessToken) {
      const decoded = this.jwtService.decode(accessToken) as { exp?: number } | null;
      revokeAccessToken(accessToken, decoded?.exp);
    }

    return {
      message: 'Logged out successfully',
      loggedOut: true,
    };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    return this.refresh(refreshToken);
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallet: true,
        sponsor: {
          select: { memberId: true, fullName: true },
        },
        _count: {
          select: {
            directReferrals: true,
            bookings: true,
            vouchers: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.formatUserProfile(user);
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role, jti: crypto.randomUUID() };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: getJwtAccessSecret(),
      expiresIn: (process.env.JWT_ACCESS_EXPIRY || '15m') as any,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: getJwtRefreshSecret(),
      expiresIn: (process.env.JWT_REFRESH_EXPIRY || '7d') as any,
    });

    const refreshTokenHash = await bcrypt.hash(hashToken(refreshToken), 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash },
    });

    return { accessToken, refreshToken };
  }

  async setupMfa(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    const { secret, otpauthUrl } = this.totpService.generateSecret(20, user.email);
    const qrCodeDataUrl = await this.totpService.generateQrCode(otpauthUrl);
    return {
      secret,
      otpauthUrl,
      qrCodeDataUrl,
      issuer: 'ASKR EV',
      accountName: user.email,
      instructions:
        'Scan this QR code with an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password) or enter the secret key manually, then verify with a 6-digit code.',
    };
  }

  async enableMfa(userId: string, code: string, secret?: string) {
    const rateLimitKey = `enable-mfa:${userId}`;
    const rateLimit = this.totpService.checkRateLimit(rateLimitKey, 5, 5 * 60 * 1000);
    if (!rateLimit.allowed) {
      throw new BadRequestException('Too many failed verification attempts. Please wait 5 minutes before trying again.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    const secretToUse = secret || user.twoFactorSecret;
    if (!secretToUse) throw new BadRequestException('MFA secret not provided');

    const isValid = this.totpService.verifyTokenWithReplayProtection(userId, secretToUse, code, 1, 'enable');
    if (!isValid) {
      this.totpService.recordFailedAttempt(rateLimitKey, 5 * 60 * 1000);
      throw new BadRequestException('Invalid 6-digit TOTP verification code');
    }

    this.totpService.resetRateLimit(rateLimitKey);

    const rawRecoveryCodes = this.totpService.generateRecoveryCodes(8);
    const hashedCodes = rawRecoveryCodes.map((c) => this.totpService.hashRecoveryCode(c));

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: secretToUse,
        twoFactorEnabled: true,
        twoFactorRecoveryCodes: hashedCodes,
      },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          action: 'AUTH_MFA_ENABLED',
          entityType: 'User',
          entityId: userId,
          actorId: userId,
          metadata: { email: user.email },
        },
      });
    } catch {}

    return {
      message: 'Two-Factor Authentication (TOTP) successfully enabled',
      recoveryCodes: rawRecoveryCodes,
    };
  }

  async disableMfa(userId: string, dto: DisableMfaDto) {
    const rateLimitKey = `disable-mfa:${userId}`;
    const rateLimit = this.totpService.checkRateLimit(rateLimitKey, 5, 5 * 60 * 1000);
    if (!rateLimit.allowed) {
      throw new BadRequestException('Too many failed attempts. Please wait 5 minutes before trying again.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      this.totpService.recordFailedAttempt(rateLimitKey, 5 * 60 * 1000);
      throw new UnauthorizedException('Invalid password');
    }
    if (!user.twoFactorSecret || !this.totpService.verifyTokenWithReplayProtection(userId, user.twoFactorSecret, dto.code, 1, 'disable')) {
      this.totpService.recordFailedAttempt(rateLimitKey, 5 * 60 * 1000);
      throw new BadRequestException('Invalid TOTP verification code');
    }

    this.totpService.resetRateLimit(rateLimitKey);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: null,
        twoFactorEnabled: false,
        twoFactorRecoveryCodes: [],
      },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          action: 'AUTH_MFA_DISABLED',
          entityType: 'User',
          entityId: userId,
          actorId: userId,
          metadata: { email: user.email },
        },
      });
    } catch {}

    return { message: 'Two-Factor Authentication disabled' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto, currentAccessToken?: string) {
    // 1. Rate limiting check (max 5 attempts per 15 minutes)
    const rateLimitKey = `pwd-change:${userId}`;
    const rateLimit = this.totpService.checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      throw new BadRequestException('Too many failed password change attempts. Please try again after 15 minutes.');
    }

    // 2. Validate passwords match
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('New password and confirmation password do not match');
    }

    // 3. Validate strong password requirements
    if (dto.newPassword.length < 12) {
      throw new BadRequestException('New password must be at least 12 characters long');
    }
    if (!/[A-Z]/.test(dto.newPassword)) {
      throw new BadRequestException('New password must contain at least one uppercase letter (A-Z)');
    }
    if (!/[a-z]/.test(dto.newPassword)) {
      throw new BadRequestException('New password must contain at least one lowercase letter (a-z)');
    }
    if (!/[0-9]/.test(dto.newPassword)) {
      throw new BadRequestException('New password must contain at least one digit (0-9)');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(dto.newPassword)) {
      throw new BadRequestException('New password must contain at least one special character (!@#$%^&* etc.)');
    }

    // 4. Fetch user
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    // 5. Verify current password
    const isCurrentValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      this.totpService.recordFailedAttempt(rateLimitKey, 15 * 60 * 1000);
      try {
        await this.prisma.auditLog.create({
          data: {
            action: 'AUTH_PASSWORD_CHANGE_FAILED',
            entityType: 'User',
            entityId: userId,
            actorId: userId,
            metadata: { email: user.email, reason: 'BAD_CURRENT_PASSWORD' },
          },
        });
      } catch {}
      throw new UnauthorizedException('Current password does not match');
    }

    // 6. Reject password reuse
    const isSameAsCurrent = await bcrypt.compare(dto.newPassword, user.passwordHash);
    if (isSameAsCurrent) {
      throw new BadRequestException('New password cannot be the same as your current password');
    }

    // 7. Verify MFA if enabled for the user
    if (user.twoFactorEnabled) {
      if (!dto.totpCode && !dto.recoveryCode) {
        throw new BadRequestException('MFA_REQUIRED: Two-Factor Authentication code is required to change password.');
      }

      let mfaPassed = false;
      if (dto.totpCode) {
        mfaPassed = this.totpService.verifyTokenWithReplayProtection(user.id, user.twoFactorSecret || '', dto.totpCode, 1, 'change-password');
      } else if (dto.recoveryCode) {
        const recoveryResult = this.totpService.verifyAndConsumeRecoveryCode(
          dto.recoveryCode,
          user.twoFactorRecoveryCodes || []
        );
        if (recoveryResult.valid) {
          mfaPassed = true;
          await this.prisma.user.update({
            where: { id: user.id },
            data: { twoFactorRecoveryCodes: recoveryResult.remainingHashedCodes },
          });
        }
      }

      if (!mfaPassed) {
        this.totpService.recordFailedAttempt(rateLimitKey, 15 * 60 * 1000);
        try {
          await this.prisma.auditLog.create({
            data: {
              action: 'AUTH_PASSWORD_CHANGE_FAILED',
              entityType: 'User',
              entityId: userId,
              actorId: userId,
              metadata: { email: user.email, reason: 'INVALID_MFA_CODE' },
            },
          });
        } catch {}
        throw new UnauthorizedException('Invalid Two-Factor Authentication code or backup recovery code');
      }
    }

    // Reset rate limit upon successful verification
    this.totpService.resetRateLimit(rateLimitKey);

    // 8. Hash new password with bcrypt 12 rounds
    const newPasswordHash = await bcrypt.hash(dto.newPassword, 12);

    // 9. Update password and revoke all refresh tokens in DB
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        refreshTokenHash: null,
      },
    });

    // 10. Revoke current access token if present
    if (currentAccessToken) {
      const decoded = this.jwtService.decode(currentAccessToken) as { exp?: number } | null;
      revokeAccessToken(currentAccessToken, decoded?.exp);
    }

    // 11. Security Audit Event (without sensitive passwords or secrets)
    try {
      await this.prisma.auditLog.create({
        data: {
          action: 'AUTH_PASSWORD_CHANGED',
          entityType: 'User',
          entityId: userId,
          actorId: userId,
          metadata: {
            email: user.email,
            role: user.role,
            mfaVerified: user.twoFactorEnabled,
          },
        },
      });
    } catch {}

    return {
      message: 'Password changed successfully. All active sessions have been revoked. Please sign in with your new password.',
      success: true,
    };
  }

  async revokeAllSessions(userId: string, currentAccessToken?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });

    if (currentAccessToken) {
      const decoded = this.jwtService.decode(currentAccessToken) as { exp?: number } | null;
      revokeAccessToken(currentAccessToken, decoded?.exp);
    }

    try {
      await this.prisma.auditLog.create({
        data: {
          action: 'AUTH_ALL_SESSIONS_REVOKED',
          entityType: 'User',
          entityId: userId,
          actorId: userId,
          metadata: { email: user.email },
        },
      });
    } catch {}

    return {
      message: 'All active sessions have been signed out successfully.',
      success: true,
    };
  }

  public formatUserProfile(user: any) {
    const isSuperAdmin = user.role === UserRole.SUPER_ADMIN;
    return {
      id: user.id,
      memberId: user.memberId,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role,
      currentPackage: user.currentPackage,
      isFullQualified: user.isFullQualified,
      qualificationMethod: user.qualificationMethod,
      twoFactorEnabled: user.twoFactorEnabled ?? false,
      mfaEnforced: isSuperAdmin,
      mfaSetupRequired: isSuperAdmin && !user.twoFactorEnabled,
      sponsorMemberId: user.sponsor?.memberId ?? null,
      sponsorName: user.sponsor?.fullName ?? null,
      wallet: user.wallet
        ? {
            availableEarningsINR: paiseToRupees(user.wallet.availableEarningsPaise),
            heldCommissionsINR: paiseToRupees(user.wallet.heldCommissionsPaise),
            pendingRecoveryINR: paiseToRupees(user.wallet.pendingRecoveryPaise),
            shoppingVoucherINR: paiseToRupees(user.wallet.shoppingVoucherBalancePaise),
          }
        : null,
      createdAt: user.createdAt,
    };
  }
}
