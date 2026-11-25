import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForbiddenException, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { AdminService } from '../admin/admin.service';
import { UserRole } from '@askrev/shared';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

describe('Admin Support Mode Security Hardening Suite (10 Mandatory Requirements)', () => {
  let adminService: AdminService;
  let mockPrisma: any;
  let mockJwtService: any;

  const mockSuperAdmin = {
    id: 'admin-uuid-1',
    email: 'superadmin@askrevdrive.com',
    role: UserRole.SUPER_ADMIN,
    passwordHash: '', // set in beforeEach
    memberId: 'ASKR-SUPERADMIN',
    sessionVersion: 1,
  };

  const mockOpsAdmin = {
    id: 'ops-uuid-1',
    email: 'ops@askrevdrive.com',
    role: UserRole.ADMIN_OPERATIONS,
    memberId: 'ASKR-OPS01',
    sessionVersion: 1,
  };

  const mockTargetMember = {
    id: 'member-uuid-1',
    memberId: 'ASKR-100001',
    fullName: 'Test Member',
    email: 'member@askrevdrive.com',
    currentPackage: 'FULL',
    isFullQualified: true,
    sessionVersion: 5,
    sponsor: { memberId: 'ASKR-ROOT', fullName: 'Root Sponsor' },
  };

  beforeEach(async () => {
    mockSuperAdmin.passwordHash = await bcrypt.hash('CorrectAdminPass123!', 10);

    mockPrisma = {
      user: {
        findUnique: vi.fn(),
      },
      memberSupportConsent: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      adminSupportSession: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => cb(mockPrisma)),
    };

    mockJwtService = {
      signAsync: vi.fn().mockResolvedValue('mock-support-jwt-token'),
      verify: vi.fn(),
    };

    adminService = new AdminService(mockPrisma as any, mockJwtService as any);
  });

  // =========================================================================
  // REQUIREMENT 1: Restrict strictly to SUPER_ADMIN (No Operations Admin)
  // =========================================================================
  it('Req 1: Strictly forbids Operations Admin or non-Super Admin from initiating support session', async () => {
    await expect(
      adminService.initiateSupportSession(mockOpsAdmin, {
        targetMemberId: 'ASKR-100001',
        adminPassword: 'Password123!',
        consentCode: '948201',
        reason: 'Investigating billing discrepancy reported by member',
        consentReference: 'TICKET-101',
      }, '127.0.0.1')
    ).rejects.toThrow(ForbiddenException);
  });

  // =========================================================================
  // REQUIREMENT 2: Administrator Reauthentication & Verified Member Consent
  // =========================================================================
  it('Req 2a: Rejects session initiation when administrator password reauthentication fails', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(mockSuperAdmin);

    await expect(
      adminService.initiateSupportSession(mockSuperAdmin, {
        targetMemberId: 'ASKR-100001',
        adminPassword: 'WrongPassword!',
        consentCode: '948201',
        reason: 'Investigating billing discrepancy reported by member',
        consentReference: 'TICKET-101',
      }, '127.0.0.1')
    ).rejects.toThrow(UnauthorizedException);
  });

  it('Req 2b: Rejects session initiation when member consent code is invalid or missing', async () => {
    mockPrisma.user.findUnique
      .mockResolvedValueOnce(mockSuperAdmin)
      .mockResolvedValueOnce(mockTargetMember);

    mockPrisma.memberSupportConsent.findFirst.mockResolvedValue(null); // Unverified / invalid consent

    await expect(
      adminService.initiateSupportSession(mockSuperAdmin, {
        targetMemberId: 'ASKR-100001',
        adminPassword: 'CorrectAdminPass123!',
        consentCode: '000000', // Invalid code
        reason: 'Investigating billing discrepancy reported by member',
        consentReference: 'TICKET-101',
      }, '127.0.0.1')
    ).rejects.toThrow(ForbiddenException);
  });

  // =========================================================================
  // REQUIREMENT 3, 8 & 9: Server-side record, Single-use exchange & Mandatory audit log
  // =========================================================================
  it('Req 3, 8, 9: Creates server-side session record and returns single-use exchange code in atomic transaction', async () => {
    mockPrisma.user.findUnique
      .mockResolvedValueOnce(mockSuperAdmin)
      .mockResolvedValueOnce(mockTargetMember);

    mockPrisma.memberSupportConsent.findFirst.mockResolvedValue({
      id: 'consent-record-1',
      memberId: 'ASKR-100001',
      consentCode: '948201',
      expiresAt: new Date(Date.now() + 86400000),
      isConsumed: false,
    });

    const result = await adminService.initiateSupportSession(mockSuperAdmin, {
      targetMemberId: 'ASKR-100001',
      adminPassword: 'CorrectAdminPass123!',
      consentCode: '948201',
      reason: 'Investigating billing discrepancy reported by member',
      consentReference: 'TICKET-101',
    }, '127.0.0.1');

    expect(result.exchangeCode).toBeDefined();
    expect(result.exchangeCode.length).toBe(64); // 32-byte hex
    expect(result.expiresInSeconds).toBe(60);
    expect(mockPrisma.adminSupportSession.create).toHaveBeenCalled();
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'ADMIN_SUPPORT_ACCESS_INITIATED',
        }),
      })
    );
  });

  it('Req 8: Fails closed and aborts session creation if mandatory audit logging fails', async () => {
    mockPrisma.user.findUnique
      .mockResolvedValueOnce(mockSuperAdmin)
      .mockResolvedValueOnce(mockTargetMember);

    mockPrisma.memberSupportConsent.findFirst.mockResolvedValue({
      id: 'consent-record-1',
      memberId: 'ASKR-100001',
      consentCode: '948201',
      expiresAt: new Date(Date.now() + 86400000),
      isConsumed: false,
    });

    // Simulate audit log DB failure
    mockPrisma.auditLog.create.mockRejectedValueOnce(new Error('Audit DB disk full or constraint error'));

    await expect(
      adminService.initiateSupportSession(mockSuperAdmin, {
        targetMemberId: 'ASKR-100001',
        adminPassword: 'CorrectAdminPass123!',
        consentCode: '948201',
        reason: 'Investigating billing discrepancy reported by member',
        consentReference: 'TICKET-101',
      }, '127.0.0.1')
    ).rejects.toThrow(InternalServerErrorException);
  });

  // =========================================================================
  // REQUIREMENT 4 & 9: Exchange single-use code for dedicated read-only scope token
  // =========================================================================
  it('Req 4 & 9: Exchanges valid code, marks code consumed, and issues dedicated read-only scope token', async () => {
    const rawExchangeCode = 'a'.repeat(64);
    const hash = crypto.createHash('sha256').update(rawExchangeCode).digest('hex');

    mockPrisma.adminSupportSession.findUnique.mockResolvedValue({
      id: 'support-session-uuid-1',
      exchangeCodeHash: hash,
      exchangeConsumedAt: null,
      isRevoked: false,
      expiresAt: new Date(Date.now() + 900000),
      createdAt: new Date(),
      targetUserId: 'member-uuid-1',
      adminUserId: 'admin-uuid-1',
      adminEmail: 'superadmin@askrevdrive.com',
      reason: 'Support inquiry',
    });

    mockPrisma.user.findUnique.mockResolvedValue(mockTargetMember);

    const result = await adminService.exchangeSupportSession({ exchangeCode: rawExchangeCode });

    expect(result.supportToken).toBe('mock-support-jwt-token');
    expect(mockPrisma.adminSupportSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ exchangeConsumedAt: expect.any(Date) }),
      })
    );
    expect(mockJwtService.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: 'admin_support:read_only',
        role: 'ADMIN_SUPPORT',
        isSupportMode: true,
        supportSessionId: 'support-session-uuid-1',
      }),
      expect.any(Object)
    );
  });

  it('Req 9: Strictly rejects already consumed exchange code (replay prevention)', async () => {
    const rawExchangeCode = 'b'.repeat(64);
    const hash = crypto.createHash('sha256').update(rawExchangeCode).digest('hex');

    mockPrisma.adminSupportSession.findUnique.mockResolvedValue({
      id: 'support-session-uuid-1',
      exchangeCodeHash: hash,
      exchangeConsumedAt: new Date(Date.now() - 5000), // Already consumed!
      isRevoked: false,
      expiresAt: new Date(Date.now() + 900000),
      createdAt: new Date(),
    });

    await expect(
      adminService.exchangeSupportSession({ exchangeCode: rawExchangeCode })
    ).rejects.toThrow(UnauthorizedException);
  });

  // =========================================================================
  // REQUIREMENT 5: Server-side revocation on exit
  // =========================================================================
  it('Req 5: Immediately revokes support session server-side on exit', async () => {
    const result = await adminService.exitSupportSession(
      { id: 'member-uuid-1', supportSessionId: 'support-session-uuid-1', adminUserId: 'admin-uuid-1' },
      { supportSessionId: 'support-session-uuid-1' }
    );

    expect(result.success).toBe(true);
    expect(mockPrisma.adminSupportSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'support-session-uuid-1' },
        data: expect.objectContaining({
          isRevoked: true,
          revocationReason: 'USER_EXIT_SUPPORT_MODE',
        }),
      })
    );
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'ADMIN_SUPPORT_ACCESS_TERMINATED',
        }),
      })
    );
  });
});
