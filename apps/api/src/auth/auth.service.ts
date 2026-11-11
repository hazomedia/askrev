import { Injectable, BadRequestException, UnauthorizedException, ConflictException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { UserRole, MembershipPackage, paiseToRupees } from '@askrev/shared';
import { getJwtAccessSecret, getJwtRefreshSecret, hashToken, revokeAccessToken } from './jwt-secrets';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
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
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

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

  public formatUserProfile(user: any) {
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
