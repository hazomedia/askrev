import { Injectable, Logger, BadRequestException, UnauthorizedException, ConflictException, ForbiddenException, NotFoundException, ServiceUnavailableException, Inject, forwardRef, Optional } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { BinaryLeg } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto, DisableMfaDto, ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto, VerifyEmailDto, UpdateProfileDto, MfaEnrollmentSetupDto, MfaEnrollmentConfirmDto, ServiceTokenRequestDto } from './dto/auth.dto';
import { UserRole, MembershipPackage, paiseToRupees } from '@askrev/shared';
import { getJwtAccessSecret, getJwtRefreshSecret, hashToken, revokeAccessToken, isAccessTokenRevoked } from './jwt-secrets';
import { TotpService } from './totp.service';
import { EmailService } from './email.service';
import { TokenRevocationService } from './token-revocation.service';
import { BinaryPlacementService } from '../members/binary-placement.service';
import { StorageService } from '../products/storage.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // In-memory refresh rotation grace cache to safely coordinate concurrent in-flight
  // requests or multi-tab refresh races within a 60-second window.
  private refreshGraceCache = new Map<
    string,
    {
      userId: string;
      tokens: { accessToken: string; refreshToken: string };
      user: any;
      expiresAt: number;
    }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly totpService: TotpService,
    private readonly emailService: EmailService,
    @Optional()
    private readonly tokenRevocationService?: TokenRevocationService,
    @Inject(forwardRef(() => BinaryPlacementService))
    @Optional()
    private readonly binaryPlacementService?: BinaryPlacementService,
    @Inject(forwardRef(() => StorageService))
    @Optional()
    private readonly storageService?: StorageService
  ) { }

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
    if (process.env.REGISTRATION_PAUSED === 'true') {
      throw new ServiceUnavailableException(
        "We're currently upgrading the ASKR EV experience. New member registrations will resume soon. Existing members can continue using their accounts normally."
      );
    }
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

    if (!dto.sponsorMemberId || !dto.sponsorMemberId.trim()) {
      throw new BadRequestException('Sponsor referral code is required for registration.');
    }

    const cleanSponsorCode = dto.sponsorMemberId.trim().toUpperCase();
    const sponsor = await this.prisma.user.findUnique({
      where: { memberId: cleanSponsorCode },
    });
    if (!sponsor) {
      throw new BadRequestException(`Sponsor with Member ID "${cleanSponsorCode}" does not exist.`);
    }

    if (sponsor.email.toLowerCase() === dto.email.toLowerCase().trim()) {
      throw new BadRequestException('Self-sponsoring is strictly prohibited.');
    }

    const sponsorId = sponsor.id;
    const rawSide = dto.side?.trim().toUpperCase();

    if (!rawSide || (rawSide !== 'LEFT' && rawSide !== 'RIGHT')) {
      throw new BadRequestException(
        'Placement leg is required and must be explicitly LEFT or RIGHT. No silent auto-balancing.'
      );
    }
    const intendedBinarySide = rawSide === 'LEFT' ? BinaryLeg.LEFT : BinaryLeg.RIGHT;

    const memberId = await this.generateUniqueMemberId();
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
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
          intendedBinarySide,
          wallet: {
            create: {
              availableEarningsPaise: 0n,
              heldCommissionsPaise: 0n,
              pendingRecoveryPaise: 0n,
              shoppingVoucherBalancePaise: 0n,
            },
          },
        },
        include: {
          wallet: true,
          sponsor: {
            select: { memberId: true, fullName: true },
          },
        },
      });

      // Immediate permanent directional binary placement upon registration
      if (this.binaryPlacementService) {
        await this.binaryPlacementService.placeMemberOnRegistration(
          tx,
          createdUser.id,
          sponsorId,
          intendedBinarySide
        );
      } else if (tx.binaryPlacement && typeof tx.binaryPlacement.create === 'function') {
        await tx.binaryPlacement.create({
          data: {
            userId: createdUser.id,
          },
        });
      }

      return createdUser;
    });

    // Automatically trigger welcome & 24-hr verification email immediately after registration
    let emailVerificationSent = false;
    try {
      await this.emailService.sendWelcomeRegistrationEmail(user.email, user.fullName, user.memberId);
      await this.sendEmailVerification(user.id);
      emailVerificationSent = true;
    } catch (err: any) {
      this.logger.warn(
        `Immediate registration/verification email delivery warning for member ${user.memberId}: ${err.message}`
      );
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      message: 'Registration successful',
      emailVerificationSent,
      tokens,
      user: this.formatUserProfile(user),
    };
  }

  /**
   * Determine whether Google Authenticator (TOTP) is mandatory for administrative accounts.
   * Secure server-side flag: ADMIN_TOTP_REQUIRED.
   * Defaults to TRUE (enabled) if missing, undefined, null, or invalid to prevent accidental security downgrades.
   * Only returns FALSE if explicitly configured to 'false', '0', 'off', or 'disabled'.
   */
  public isAdminTotpRequired(): boolean {
    const flag = process.env.ADMIN_TOTP_REQUIRED;
    if (flag === undefined || flag === null || flag === '') {
      return true;
    }
    const normalized = String(flag).trim().toLowerCase();
    if (normalized === 'false' || normalized === '0' || normalized === 'off' || normalized === 'disabled') {
      return false;
    }
    return true;
  }

  async login(dto: LoginDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();

    // Password-only security control: Enforce login rate limiting and lockout (max 5 failed attempts per 15m)
    const loginRateKey = `auth-login:${normalizedEmail}`;
    const loginRate = this.totpService.checkRateLimit(loginRateKey, 5, 15 * 60 * 1000);
    if (!loginRate.allowed) {
      try {
        await this.prisma.auditLog.create({
          data: {
            action: 'AUTH_LOGIN_LOCKED',
            entityType: 'User',
            metadata: { email: normalizedEmail, reason: 'RATE_LIMIT_EXCEEDED' },
          },
        });
      } catch { }
      throw new BadRequestException('Too many failed login attempts. Account temporarily locked. Please try again after 15 minutes.');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        wallet: true,
        sponsor: {
          select: { memberId: true, fullName: true },
        },
      },
    });

    if (!user) {
      this.totpService.recordFailedAttempt(loginRateKey, 15 * 60 * 1000);
      try {
        await this.prisma.auditLog.create({
          data: {
            action: 'AUTH_LOGIN_FAILED',
            entityType: 'User',
            metadata: { email: normalizedEmail, reason: 'USER_NOT_FOUND' },
          },
        });
      } catch { }
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      this.totpService.recordFailedAttempt(loginRateKey, 15 * 60 * 1000);
      try {
        await this.prisma.auditLog.create({
          data: {
            action: 'AUTH_LOGIN_FAILED',
            entityType: 'User',
            entityId: user.id,
            metadata: { email: normalizedEmail, reason: 'BAD_PASSWORD' },
          },
        });
      } catch { }
      throw new UnauthorizedException('Invalid email or password');
    }

    // Credentials verified successfully: reset failed login attempts
    this.totpService.resetRateLimit(loginRateKey);

    const isPrivilegedStaff = [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN_OPERATIONS,
      UserRole.FINANCE_MANAGER,
    ].includes(user.role as any);

    const adminTotpRequired = this.isAdminTotpRequired();

    if (isPrivilegedStaff && adminTotpRequired) {
      if (!user.twoFactorEnabled) {
        // Safe bootstrap process for existing administrators without MFA
        const enrollmentPayload = {
          sub: user.id,
          email: user.email,
          role: user.role,
          scope: 'mfa_enrollment',
          jti: crypto.randomUUID(),
        };
        const enrollmentToken = await this.jwtService.signAsync(enrollmentPayload, {
          secret: getJwtAccessSecret(),
          expiresIn: '10m',
        });

        try {
          await this.prisma.auditLog.create({
            data: {
              action: 'AUTH_MFA_ENROLLMENT_REQUIRED',
              entityType: 'User',
              entityId: user.id,
              metadata: { email: user.email, role: user.role, reason: 'ADMIN_MFA_BOOTSTRAP_TRIGGERED' },
            },
          });
        } catch { }

        return {
          mfaEnrollmentRequired: true,
          message:
            'MFA_ENROLLMENT_REQUIRED: Two-Factor Authentication is mandatory for administrative accounts. Please complete enrollment using the provided one-time enrollment token.',
          enrollmentToken,
          user: this.formatUserProfile(user),
        };
      }
    }

    // Two-Factor Authentication Check for MFA-enabled accounts:
    // When ADMIN_TOTP_REQUIRED=false, administrative accounts bypass the MFA challenge on login.
    // Non-admin members with twoFactorEnabled continue to have MFA strictly enforced.
    const requireMfaForUser = user.twoFactorEnabled && (!isPrivilegedStaff || adminTotpRequired);

    if (requireMfaForUser) {
      const mfaRateKey = `login-mfa:${user.id}`;
      const mfaRate = this.totpService.checkRateLimit(mfaRateKey, 5, 5 * 60 * 1000);
      if (!mfaRate.allowed) {
        throw new BadRequestException('Too many failed MFA verification attempts. Please wait 5 minutes before trying again.');
      }

      let mfaPassed = false;

      if (dto.totpCode) {
        mfaPassed = this.totpService.verifyTokenWithReplayProtection(user.id, user.twoFactorSecret || '', dto.totpCode, 1, 'login');
      } else if (dto.recoveryCode) {
        const candidateHash = this.totpService.hashRecoveryCode(dto.recoveryCode);
        const storedCodes = user.twoFactorRecoveryCodes || [];
        const index = storedCodes.findIndex((h) => crypto.timingSafeEqual(Buffer.from(h), Buffer.from(candidateHash)));
        if (index !== -1) {
          const remaining = [...storedCodes];
          remaining.splice(index, 1);
          // Atomic update strictly verifying candidateHash is still present in array
          const updateRes = await this.prisma.user.updateMany({
            where: {
              id: user.id,
              twoFactorRecoveryCodes: { has: candidateHash },
            },
            data: {
              twoFactorRecoveryCodes: remaining,
            },
          });
          if (updateRes.count > 0) {
            mfaPassed = true;
          }
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
        } catch { }
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
    } catch { }

    return {
      message: 'Login successful',
      tokens,
      user: this.formatUserProfile(user),
    };
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string; email: string; role: string; sessionVersion?: number };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: getJwtRefreshSecret(),
      });
    } catch {
      throw new UnauthorizedException('Refresh token invalid or expired');
    }

    // MANDATORY sessionVersion validation on refresh tokens
    if (payload.sessionVersion === undefined || payload.sessionVersion === null || typeof payload.sessionVersion !== 'number') {
      throw new UnauthorizedException('Session version is missing or invalid. Please sign in again.');
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

    if (user.sessionVersion !== payload.sessionVersion) {
      throw new UnauthorizedException('Session has been revoked. Please sign in again.');
    }

    const hashedCandidate = hashToken(refreshToken);

    // 1. Check Rotation Grace Cache (handles concurrent tabs / in-flight racing requests safely)
    const graceKey = `${payload.sub}:${hashedCandidate}`;
    const graceEntry = this.refreshGraceCache.get(graceKey);
    if (graceEntry && graceEntry.expiresAt > Date.now() && graceEntry.userId === user.id) {
      return {
        message: 'Session refreshed',
        tokens: graceEntry.tokens,
        user: graceEntry.user,
      };
    }

    const matchesHashed = await bcrypt.compare(hashedCandidate, user.refreshTokenHash);
    const matchesLegacyRaw = !matchesHashed && (await bcrypt.compare(refreshToken, user.refreshTokenHash));
    if (!matchesHashed && !matchesLegacyRaw) {
      throw new UnauthorizedException('Refresh token revoked');
    }

    const isPrivilegedStaff = [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN_OPERATIONS,
      UserRole.FINANCE_MANAGER,
    ].includes(user.role as any);

    if (isPrivilegedStaff && this.isAdminTotpRequired() && !user.twoFactorEnabled) {
      throw new UnauthorizedException(
        'MFA_REQUIRED: Two-Factor Authentication is mandatory for administrative accounts. Please re-authenticate.'
      );
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    const formattedProfile = this.formatUserProfile(user);

    // Store in grace cache for 60 seconds to allow concurrent requests with the prior token to succeed safely
    this.refreshGraceCache.set(graceKey, {
      userId: user.id,
      tokens,
      user: formattedProfile,
      expiresAt: Date.now() + 60 * 1000,
    });

    // Cleanup expired cache entries periodically
    if (this.refreshGraceCache.size > 1000) {
      const now = Date.now();
      for (const [key, entry] of this.refreshGraceCache.entries()) {
        if (entry.expiresAt <= now) {
          this.refreshGraceCache.delete(key);
        }
      }
    }

    return {
      message: 'Session refreshed',
      tokens,
      user: formattedProfile,
    };
  }

  async logout(userId: string, accessToken?: string) {
    // Invalidate active grace cache entries for this user immediately on explicit logout
    for (const [key, entry] of this.refreshGraceCache.entries()) {
      if (entry.userId === userId) {
        this.refreshGraceCache.delete(key);
      }
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshTokenHash: null,
        sessionVersion: { increment: 1 },
      },
    });

    if (accessToken) {
      const decoded = this.jwtService.decode(accessToken) as { exp?: number } | null;
      await this.tokenRevocationService.revokeToken(accessToken, decoded?.exp, 'USER_LOGOUT');
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
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { sessionVersion: true },
    });
    const sessionVersion = user?.sessionVersion || 1;
    const payload = { sub: userId, email, role, sessionVersion, jti: crypto.randomUUID() };

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
    } catch { }

    return {
      message: 'Two-Factor Authentication (TOTP) successfully enabled',
      recoveryCodes: rawRecoveryCodes,
    };
  }

  /**
   * Bootstraps MFA setup for existing administrators who do not yet have MFA enabled.
   * Requires a valid short-lived enrollment token.
   */
  async setupMfaEnrollment(dto: MfaEnrollmentSetupDto) {
    if ((await this.tokenRevocationService?.isTokenRevoked(dto.enrollmentToken)) || isAccessTokenRevoked(dto.enrollmentToken)) {
      throw new UnauthorizedException('MFA enrollment session has already been used or revoked. Please sign in again.');
    }

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(dto.enrollmentToken, {
        secret: getJwtAccessSecret(),
      });
    } catch {
      throw new UnauthorizedException('MFA enrollment session is invalid or expired. Please sign in again.');
    }

    if (payload.scope !== 'mfa_enrollment') {
      throw new UnauthorizedException('Invalid token scope for MFA enrollment.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('User not found');

    if (user.twoFactorEnabled) {
      throw new ConflictException('Two-Factor Authentication is already enabled for this account.');
    }

    const { secret, otpauthUrl } = this.totpService.generateSecret(20, user.email);
    const qrCodeDataUrl = await this.totpService.generateQrCode(otpauthUrl);

    // Securely bind the server-generated pending TOTP secret to the user's enrollment challenge
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        pendingTwoFactorSecret: secret,
        pendingTwoFactorCreatedAt: new Date(),
      },
    });

    return {
      secret,
      otpauthUrl,
      qrCodeDataUrl,
      issuer: 'ASKR EV',
      accountName: user.email,
      instructions:
        'Scan this QR code with your authenticator app (Google Authenticator, Microsoft Authenticator, 1Password) or enter the secret key manually, then verify with a 6-digit code.',
    };
  }

  /**
   * Confirms MFA enrollment for an administrator, marks twoFactorEnabled: true,
   * stores hashed recovery codes, and issues full session credentials.
   * Strictly verifies against the server-bound pending TOTP secret.
   */
  async confirmMfaEnrollment(dto: MfaEnrollmentConfirmDto) {
    if ((await this.tokenRevocationService?.isTokenRevoked(dto.enrollmentToken)) || isAccessTokenRevoked(dto.enrollmentToken)) {
      throw new UnauthorizedException('MFA enrollment session has already been used or revoked. Please sign in again.');
    }

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(dto.enrollmentToken, {
        secret: getJwtAccessSecret(),
      });
    } catch {
      throw new UnauthorizedException('MFA enrollment session is invalid or expired. Please sign in again.');
    }

    if (payload.scope !== 'mfa_enrollment') {
      throw new UnauthorizedException('Invalid token scope for MFA enrollment.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        wallet: true,
        sponsor: { select: { memberId: true, fullName: true } },
      },
    });
    if (!user) throw new UnauthorizedException('User not found');

    if (user.twoFactorEnabled) {
      throw new ConflictException('Two-Factor Authentication is already enabled for this account.');
    }

    if (!user.pendingTwoFactorSecret) {
      throw new BadRequestException('No pending MFA enrollment session found. Please run enrollment setup first.');
    }

    // Reject expired enrollment challenge (10 minutes)
    if (
      user.pendingTwoFactorCreatedAt &&
      Date.now() - user.pendingTwoFactorCreatedAt.getTime() > 10 * 60 * 1000
    ) {
      throw new UnauthorizedException('MFA enrollment challenge has expired. Please initiate setup again.');
    }

    // DO NOT trust client-supplied secret! Validate strictly against server-generated pending secret.
    const secretToVerify = user.pendingTwoFactorSecret;
    const isValid = this.totpService.verifyTokenWithReplayProtection(user.id, secretToVerify, dto.code, 1, 'enrollment');
    if (!isValid) {
      throw new BadRequestException('Invalid 6-digit TOTP verification code.');
    }

    const rawRecoveryCodes = this.totpService.generateRecoveryCodes(8);
    const hashedCodes = rawRecoveryCodes.map((c) => this.totpService.hashRecoveryCode(c));
    const tokenHash = hashToken(dto.enrollmentToken);

    try {
      await this.prisma.$transaction(async (tx) => {
        // Atomic single-use consumption: insert into RevokedToken
        await tx.revokedToken.create({
          data: {
            tokenHash,
            expiresAt: new Date(payload.exp ? payload.exp * 1000 : Date.now() + 10 * 60 * 1000),
            reason: 'MFA_ENROLLMENT_CONSUMED',
          },
        });

        const freshUser = await tx.user.findUnique({ where: { id: user.id } });
        if (freshUser?.twoFactorEnabled) {
          throw new ConflictException('Two-Factor Authentication is already enabled for this account.');
        }

        await tx.user.update({
          where: { id: user.id },
          data: {
            twoFactorSecret: secretToVerify,
            twoFactorEnabled: true,
            twoFactorRecoveryCodes: hashedCodes,
            pendingTwoFactorSecret: null,
            pendingTwoFactorCreatedAt: null,
            sessionVersion: { increment: 1 },
            refreshTokenHash: null,
          },
        });
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new ConflictException('MFA enrollment token has already been consumed.');
      }
      throw err;
    }

    // Update revocation cache and distributed storage
    await this.tokenRevocationService?.revokeToken(dto.enrollmentToken, payload.exp, 'MFA_ENROLLMENT_CONSUMED');

    try {
      await this.prisma.auditLog.create({
        data: {
          action: 'AUTH_MFA_BOOTSTRAP_ENROLLED',
          entityType: 'User',
          entityId: user.id,
          actorId: user.id,
          metadata: { email: user.email, role: user.role },
        },
      });
    } catch { }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      message: 'Two-Factor Authentication successfully enrolled. Administrative session initialized.',
      success: true,
      recoveryCodes: rawRecoveryCodes,
      tokens,
      user: this.formatUserProfile(user),
    };
  }

  /**
   * Dedicated machine-to-machine service token generation.
   * Requires strict pre-shared client credentials authentication and validated scope permissions.
   */
  async issueServiceToken(dto: ServiceTokenRequestDto, clientIp: string = 'unknown') {
    const configuredSecret =
      process.env.SERVICE_CLIENT_SECRET ||
      (process.env.NODE_ENV !== 'production' ? 'askrev-dev-service-client-secret-12345!' : undefined);
    const configuredId = process.env.SERVICE_CLIENT_ID || 'askrev-backend-service';

    if (!configuredSecret) {
      throw new ForbiddenException('Service-to-service authentication is not configured');
    }

    const ALLOWED_SERVICE_SCOPES = new Set([
      'service:reconciliation',
      'service:health',
      'service:batch',
      'service:read',
      'service:read_write',
    ]);

    const requestedScope = dto.scope || 'service:read';
    if (!ALLOWED_SERVICE_SCOPES.has(requestedScope)) {
      try {
        await this.prisma.auditLog.create({
          data: {
            action: 'AUTH_SERVICE_TOKEN_REJECTED',
            entityType: 'ServiceToken',
            entityId: dto.clientId,
            actorId: `service:${dto.clientId}`,
            metadata: { clientId: dto.clientId, scope: requestedScope, clientIp, reason: 'INVALID_SCOPE' },
          },
        });
      } catch { }
      throw new ForbiddenException(
        `Invalid service scope '${requestedScope}'. Allowed scopes: ${Array.from(ALLOWED_SERVICE_SCOPES).join(', ')}`
      );
    }

    const idBuffer = Buffer.from(dto.clientId);
    const expectedIdBuffer = Buffer.from(configuredId);
    const isIdValid =
      idBuffer.length === expectedIdBuffer.length &&
      crypto.timingSafeEqual(idBuffer, expectedIdBuffer);

    const secretBuffer = Buffer.from(dto.clientSecret);
    const expectedSecretBuffer = Buffer.from(configuredSecret);
    const isSecretValid =
      secretBuffer.length === expectedSecretBuffer.length &&
      crypto.timingSafeEqual(secretBuffer, expectedSecretBuffer);

    if (!isIdValid || !isSecretValid) {
      try {
        await this.prisma.auditLog.create({
          data: {
            action: 'AUTH_SERVICE_TOKEN_FAILED',
            entityType: 'ServiceToken',
            entityId: dto.clientId,
            actorId: `service:${dto.clientId}`,
            metadata: { clientId: dto.clientId, clientIp, reason: 'INVALID_CREDENTIALS' },
          },
        });
      } catch { }
      throw new UnauthorizedException('Invalid service client credentials');
    }

    const payload = {
      sub: `service:${dto.clientId}`,
      clientId: dto.clientId,
      role: 'SERVICE_CLIENT',
      scope: requestedScope,
      jti: crypto.randomUUID(),
    };

    const token = await this.jwtService.signAsync(payload, {
      secret: getJwtAccessSecret(),
      expiresIn: '1h',
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          action: 'AUTH_SERVICE_TOKEN_ISSUED',
          entityType: 'ServiceToken',
          entityId: dto.clientId,
          actorId: `service:${dto.clientId}`,
          metadata: { clientId: dto.clientId, scope: requestedScope, clientIp },
        },
      });
    } catch { }

    return {
      tokenType: 'Bearer',
      accessToken: token,
      expiresIn: 3600,
      scope: requestedScope,
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
    } catch { }

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
      } catch { }
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
        const candidateHash = this.totpService.hashRecoveryCode(dto.recoveryCode);
        const storedCodes = user.twoFactorRecoveryCodes || [];
        const index = storedCodes.findIndex((h) => crypto.timingSafeEqual(Buffer.from(h), Buffer.from(candidateHash)));
        if (index !== -1) {
          const remaining = [...storedCodes];
          remaining.splice(index, 1);
          // Atomic update strictly verifying candidateHash is still present in array
          const updateRes = await this.prisma.user.updateMany({
            where: {
              id: user.id,
              twoFactorRecoveryCodes: { has: candidateHash },
            },
            data: {
              twoFactorRecoveryCodes: remaining,
            },
          });
          if (updateRes.count > 0) {
            mfaPassed = true;
          }
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
        } catch { }
        throw new UnauthorizedException('Invalid Two-Factor Authentication code or backup recovery code');
      }
    }

    // Reset rate limit upon successful verification
    this.totpService.resetRateLimit(rateLimitKey);

    // 8. Hash new password with bcrypt 12 rounds
    const newPasswordHash = await bcrypt.hash(dto.newPassword, 12);

    // 9. Update password and revoke all sessions (increment sessionVersion and clear refreshTokenHash)
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        refreshTokenHash: null,
        sessionVersion: { increment: 1 },
      },
    });

    // 10. Revoke current access token if present
    if (currentAccessToken) {
      const decoded = this.jwtService.decode(currentAccessToken) as { exp?: number } | null;
      await this.tokenRevocationService?.revokeToken(currentAccessToken, decoded?.exp, 'PASSWORD_CHANGED');
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
    } catch { }

    return {
      message: 'Password changed successfully. All active sessions have been revoked. Please sign in with your new password.',
      success: true,
    };
  }

  async revokeAllSessions(userId: string, currentAccessToken?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    // Invalidate active grace cache entries for this user
    for (const [key, entry] of this.refreshGraceCache.entries()) {
      if (entry.userId === userId) {
        this.refreshGraceCache.delete(key);
      }
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshTokenHash: null,
        sessionVersion: { increment: 1 },
      },
    });

    if (currentAccessToken) {
      const decoded = this.jwtService.decode(currentAccessToken) as { exp?: number } | null;
      await this.tokenRevocationService?.revokeToken(currentAccessToken, decoded?.exp, 'REVOKE_ALL_SESSIONS');
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
    } catch { }

    return {
      message: 'All active sessions have been signed out successfully.',
      success: true,
    };
  }

  /**
   * Pre-flight public sponsor lookup endpoint to preview sponsor identity on frontend
   */
  async lookupSponsor(memberId: string) {
    if (!memberId || !memberId.trim()) {
      throw new BadRequestException('Sponsor code is required.');
    }
    const cleanCode = memberId.trim().toUpperCase();
    const sponsor = await this.prisma.user.findUnique({
      where: { memberId: cleanCode },
      select: {
        id: true,
        memberId: true,
        fullName: true,
        role: true,
        currentPackage: true,
      },
    });

    if (!sponsor) {
      throw new NotFoundException(`Sponsor referral code "${cleanCode}" was not found.`);
    }

    return {
      valid: true,
      memberId: sponsor.memberId,
      fullName: sponsor.fullName,
    };
  }

  /**
   * Initiates single-use, rate-limited password reset flow.
   * Protects against email enumeration by returning a uniform response.
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const cleanEmail = dto.email.toLowerCase().trim();
    const genericResponse = {
      message: 'If an account exists with this email address, a password reset link has been dispatched.',
      success: true,
    };

    const user = await this.prisma.user.findUnique({
      where: { email: cleanEmail },
      select: { id: true, email: true, fullName: true },
    });

    if (!user) {
      return genericResponse;
    }

    // Invalidate any existing unused reset tokens for this user
    await this.prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    // Generate secure 256-bit single-use token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15-minute expiry

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    await this.emailService.sendPasswordResetEmail(user.email, user.fullName, rawToken);

    try {
      await this.prisma.auditLog.create({
        data: {
          action: 'AUTH_PASSWORD_RESET_REQUESTED',
          entityType: 'User',
          entityId: user.id,
          metadata: { email: user.email },
        },
      });
    } catch { }

    return genericResponse;
  }

  /**
   * Completes single-use password reset, updates passwordHash, and revokes all active sessions.
   */
  async resetPassword(dto: ResetPasswordDto) {
    if (!dto.token || !dto.token.trim()) {
      throw new BadRequestException('Password reset token is required.');
    }
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('New password and confirm password do not match.');
    }

    const tokenHash = crypto.createHash('sha256').update(dto.token.trim()).digest('hex');
    const tokenRecord = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.usedAt || tokenRecord.expiresAt < new Date()) {
      throw new BadRequestException('Password reset link is invalid, expired, or has already been used.');
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);

    // Atomically mark token as used, update password, and revoke all active sessions
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: tokenRecord.userId },
        data: {
          passwordHash: newPasswordHash,
          refreshTokenHash: null, // Revokes all active refresh sessions
          sessionVersion: { increment: 1 },
        },
      }),
      this.prisma.auditLog.create({
        data: {
          action: 'AUTH_PASSWORD_RESET_COMPLETED',
          entityType: 'User',
          entityId: tokenRecord.userId,
          metadata: { email: tokenRecord.user.email },
        },
      }),
    ]);

    try {
      await this.emailService.sendPasswordChangedNotification(tokenRecord.user.email, tokenRecord.user.fullName);
    } catch (err: any) {
      this.logger.warn(`Password change confirmation email delivery warning: ${err.message}`);
    }

    return {
      message: 'Your password has been successfully reset. Please sign in with your new password.',
      success: true,
    };
  }

  /**
   * Updates allowed profile attributes for the authenticated member
   */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const cleanPhone = dto.phone?.trim() || null;
    if (cleanPhone && cleanPhone !== user.phone) {
      const existingPhone = await this.prisma.user.findFirst({
        where: { phone: cleanPhone, id: { not: userId } },
        select: { id: true },
      });
      if (existingPhone) {
        throw new ConflictException('This phone number is already registered to another account.');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: dto.fullName.trim(),
        phone: cleanPhone,
      },
      include: {
        wallet: true,
        sponsor: { select: { memberId: true, fullName: true } },
      },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          action: 'AUTH_PROFILE_UPDATED',
          entityType: 'User',
          entityId: userId,
          actorId: userId,
          metadata: { fullName: updatedUser.fullName, phone: updatedUser.phone },
        },
      });
    } catch { }

    return {
      message: 'Profile updated successfully',
      user: this.formatUserProfile(updatedUser),
    };
  }

  async uploadProfilePhoto(userId: string, file: Express.Multer.File) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, memberId: true, profilePhoto: true },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!this.storageService) {
      throw new BadRequestException('Storage service is currently unavailable');
    }

    const uploadResult = await this.storageService.uploadProfilePhoto(file, user.id);

    if (user.profilePhoto && user.profilePhoto !== uploadResult.url) {
      try {
        await this.storageService.safeDeleteImage(user.profilePhoto);
      } catch (err: any) {
        this.logger.warn(`Could not delete previous profile photo for ${user.memberId}: ${err.message}`);
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { profilePhoto: uploadResult.url },
      include: {
        wallet: true,
        sponsor: { select: { memberId: true, fullName: true } },
      },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          action: 'PROFILE_PHOTO_UPLOADED',
          entityType: 'User',
          entityId: userId,
          actorId: userId,
          metadata: { profilePhoto: uploadResult.url },
        },
      });
    } catch { }

    return {
      success: true,
      profilePhoto: uploadResult.url,
      user: this.formatUserProfile(updated),
      message: 'Profile photograph uploaded successfully.',
    };
  }

  async removeProfilePhoto(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, memberId: true, profilePhoto: true },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.profilePhoto && this.storageService) {
      try {
        await this.storageService.safeDeleteImage(user.profilePhoto);
      } catch (err: any) {
        this.logger.warn(`Could not delete profile photo for ${user.memberId}: ${err.message}`);
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { profilePhoto: null },
      include: {
        wallet: true,
        sponsor: { select: { memberId: true, fullName: true } },
      },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          action: 'PROFILE_PHOTO_REMOVED',
          entityType: 'User',
          entityId: userId,
          actorId: userId,
          metadata: {},
        },
      });
    } catch { }

    return {
      success: true,
      profilePhoto: null,
      user: this.formatUserProfile(updated),
      message: 'Profile photograph removed successfully.',
    };
  }

  /**
   * Dispatches email address verification token to the authenticated member
   */
  async sendEmailVerification(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    if (user.isEmailVerified) {
      return { message: 'Email address is already verified.', alreadyVerified: true };
    }

    await this.prisma.emailVerificationToken.deleteMany({
      where: { userId },
    });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    await this.emailService.sendEmailVerification(user.email, user.fullName, rawToken);

    return {
      message: 'Verification email has been dispatched.',
      success: true,
    };
  }

  /**
   * Verifies member email address via verification token
   */
  async verifyEmail(dto: VerifyEmailDto) {
    const tokenHash = crypto.createHash('sha256').update(dto.token.trim()).digest('hex');
    const tokenRecord = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.usedAt || tokenRecord.expiresAt < new Date()) {
      throw new BadRequestException('Verification link is invalid, expired, or has already been used.');
    }

    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: tokenRecord.userId },
        data: {
          isEmailVerified: true,
          emailVerifiedAt: new Date(),
        },
      }),
      this.prisma.auditLog.create({
        data: {
          action: 'AUTH_EMAIL_VERIFIED',
          entityType: 'User',
          entityId: tokenRecord.userId,
          metadata: { email: tokenRecord.user.email },
        },
      }),
    ]);

    return {
      message: 'Email address successfully verified.',
      success: true,
    };
  }

  public formatUserProfile(user: any) {
    const isSuperAdmin = user.role === UserRole.SUPER_ADMIN;
    const adminTotpRequired = this.isAdminTotpRequired();
    return {
      id: user.id,
      memberId: user.memberId,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      profilePhoto: user.profilePhoto ?? null,
      role: user.role,
      currentPackage: user.currentPackage,
      isFullQualified: user.isFullQualified,
      qualificationMethod: user.qualificationMethod,
      intendedBinarySide: user.intendedBinarySide ?? 'LEFT',
      isEmailVerified: user.isEmailVerified ?? false,
      emailVerifiedAt: user.emailVerifiedAt ?? null,
      twoFactorEnabled: user.twoFactorEnabled ?? false,
      mfaEnforced: isSuperAdmin && adminTotpRequired,
      mfaSetupRequired: isSuperAdmin && adminTotpRequired && !user.twoFactorEnabled,
      adminTotpRequired,
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
