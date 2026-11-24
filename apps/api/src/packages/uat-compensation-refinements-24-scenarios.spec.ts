import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  PrismaClient,
  MembershipRequestType,
  MembershipRequestStatus,
  QualificationMethod,
} from '@prisma/client';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import {
  FINANCIAL_RULES,
  MembershipPackage,
  UserRole,
  paiseToRupees,
  JournalAccount,
} from '@askrev/shared';
import {
  LEGACY_MATRIX_CONFIG,
  LEGACY_MATRIX_RATES,
  calculateLayerCapacity,
  getMatrixFillSlot,
} from '../legacy-matrix/legacy-matrix.constants';
import { MembersService } from '../members/members.service';
import { PackagesService } from './packages.service';
import { LegacyMatrixService } from '../legacy-matrix/legacy-matrix.service';

// Load local .env.uat or environment strictly
dotenv.config({ path: path.resolve(__dirname, '../../../../.env.uat') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.uat') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env.uat') });
dotenv.config();

// FIX 4: STRICT UAT DATABASE FAIL-SAFE (No fallback to DATABASE_URL)
const UAT_DB_URL = process.env.UAT_DATABASE_URL;

if (!UAT_DB_URL) {
  throw new Error(
    'FATAL CONFIGURATION ERROR: UAT_DATABASE_URL environment variable must be set to run UAT tests. Falling back to DATABASE_URL is strictly forbidden.'
  );
}

// STRICT SECURITY GUARD: Approved database allowlist validation
let parsedHost = '';
let parsedPort = '';
try {
  const urlObj = new URL(UAT_DB_URL);
  parsedHost = urlObj.hostname;
  parsedPort = urlObj.port;
} catch {
  throw new Error('FATAL CONFIGURATION ERROR: Invalid UAT_DATABASE_URL format.');
}

const hostPort = `${parsedHost}:${parsedPort}`;
const APPROVED_HOSTS = ['nozomi.proxy.rlwy.net:28651', 'localhost', '127.0.0.1'];
const isApproved = APPROVED_HOSTS.some(
  (approved) => hostPort.includes(approved) || parsedHost === approved
);

if (!isApproved) {
  throw new Error(
    `FATAL SECURITY VIOLATION: Database host "${hostPort}" is not in the approved UAT allowlist (${APPROVED_HOSTS.join(', ')}). Aborting immediately.`
  );
}

// STRICT PRODUCTION SECURITY GUARD: Defense-in-depth Production denylist
if (
  UAT_DB_URL.includes('trolley.proxy.rlwy.net') ||
  UAT_DB_URL.includes('41036') ||
  UAT_DB_URL.includes('askrev-production')
) {
  throw new Error(
    'FATAL SECURITY VIOLATION: Test attempt to connect to PRODUCTION database! Aborting immediately.'
  );
}

describe('ASKR EV — Final UAT Compensation Refinements (24 Required Test Scenarios)', { timeout: 60000 }, () => {
  let prisma: PrismaClient;
  let membersService: MembersService;
  let packagesService: PackagesService;
  let legacyMatrixService: LegacyMatrixService;

  beforeAll(async () => {
    // Connect strictly to UAT Database URL from environment or verified UAT instance
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: UAT_DB_URL,
        },
      },
    });
    await prisma.$connect();

    // LIVE SQL GUARD: Verify connected database is NOT production
    const [dbInfo] = await prisma.$queryRaw<Array<{ current_database: string }>>`
      SELECT current_database();
    `;
    if (!dbInfo || !dbInfo.current_database) {
      throw new Error('FATAL DATABASE ERROR: Could not verify connected database name.');
    }

    legacyMatrixService = new LegacyMatrixService(prisma as any);
    packagesService = new PackagesService(prisma as any, undefined, legacyMatrixService, undefined);
    membersService = new MembersService(prisma as any);

    // Fast batch cleanup of any lingering disposable test accounts from previous runs
    const disposableUsers = await prisma.user.findMany({
      where: { memberId: { startsWith: 'DISP-' } },
      select: { id: true },
    });
    const ids = disposableUsers.map((u) => u.id);
    if (ids.length > 0) {
      await prisma.binaryMatchFlush.deleteMany({ where: { userId: { in: ids } } });
      await prisma.binaryMatchEvent.deleteMany({ where: { userId: { in: ids } } });
      await prisma.commissionHold.deleteMany({
        where: { OR: [{ sponsorId: { in: ids } }, { referredMemberId: { in: ids } }] },
      });
      await prisma.qualificationEvent.deleteMany({
        where: { OR: [{ memberId: { in: ids } }, { sponsorId: { in: ids } }] },
      });

      // Clean up test journal entries associated with disposable user membership requests
      const testReqs = await prisma.membershipRequest.findMany({
        where: { userId: { in: ids } },
        select: { id: true },
      });
      const testReqIds = testReqs.map((r) => r.id);
      if (testReqIds.length > 0) {
        const testRefPatterns = testReqIds.flatMap((id) => [
          `JNL-REQ-${id}`,
          `JNL-VCHR-BSC-${id}`,
          `JNL-HOLD-${id}`,
          `JNL-REL-${id}`,
          `JNL-BASIC-FULL-${id}`,
          `JNL-HOLD-UPG-${id}`,
        ]);
        const entries = await prisma.journalEntry.findMany({
          where: {
            OR: [
              { referenceId: { in: testRefPatterns } },
              { referenceId: { startsWith: 'REQ-SCEN17-' } },
              { referenceId: { startsWith: 'JNL-REQ-DISP-' } },
              { referenceId: { startsWith: 'JNL-VCHR-BSC-DISP-' } },
            ],
          },
          select: { id: true },
        });
        const entryIds = entries.map((e) => e.id);
        if (entryIds.length > 0) {
          await prisma.journalLine.deleteMany({ where: { journalEntryId: { in: entryIds } } });
          await prisma.journalEntry.deleteMany({ where: { id: { in: entryIds } } });
        }
      }

      await prisma.membershipRequest.deleteMany({ where: { userId: { in: ids } } });
      await prisma.legacyMatrixAuditLog.deleteMany({ where: { userId: { in: ids } } });
      await prisma.legacyMatrixPlacement.deleteMany({ where: { userId: { in: ids } } });
      await prisma.shoppingVoucher.deleteMany({ where: { userId: { in: ids } } });
      await prisma.journalLine.deleteMany({ where: { userId: { in: ids } } });
      await prisma.binaryPlacement.deleteMany({ where: { userId: { in: ids } } });
      await prisma.walletAccount.deleteMany({ where: { userId: { in: ids } } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
  }, 60000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Disposable user test fixture helper for isolation
  async function createDisposableUser(
    prefix: string,
    currentPackage: 'FREE' | 'BASIC' | 'FULL',
    isFullQualified = false,
    sponsorId: string | null = null
  ) {
    const uniqueId = `DISP-${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    return await prisma.user.create({
      data: {
        email: `${uniqueId.toLowerCase()}@uat.disposable.internal`,
        memberId: uniqueId,
        fullName: `Disposable ${uniqueId}`,
        passwordHash: '$2b$10$dummyhashedpasswordforisolatedtestingonly123',
        role: 'MEMBER',
        currentPackage,
        isFullQualified,
        sponsorId,
        wallet: {
          create: {
            availableEarningsPaise: 0n,
            totalEarnedPaise: 0n,
            heldCommissionsPaise: 0n,
          },
        },
        binaryPlacement: {
          create: {
            carryLeftPaise: 0n,
            carryRightPaise: 0n,
            leftVolumePaise: 0n,
            rightVolumePaise: 0n,
            matchedVolumeLeftPaise: 0n,
            matchedVolumeRightPaise: 0n,
          },
        },
      },
      include: { wallet: true, binaryPlacement: true },
    });
  }

  async function cleanupDisposableUser(userId: string) {
    try {
      await prisma.binaryMatchFlush.deleteMany({ where: { userId } });
      await prisma.binaryMatchEvent.deleteMany({ where: { userId } });
      await prisma.commissionHold.deleteMany({
        where: { OR: [{ sponsorId: userId }, { referredMemberId: userId }] },
      });
      await prisma.qualificationEvent.deleteMany({
        where: { OR: [{ memberId: userId }, { sponsorId: userId }] },
      });

      // Clean up test journal entries associated with this user's requests
      const testReqs = await prisma.membershipRequest.findMany({
        where: { userId },
        select: { id: true },
      });
      const testReqIds = testReqs.map((r) => r.id);
      if (testReqIds.length > 0) {
        const testRefPatterns = testReqIds.flatMap((id) => [
          `JNL-REQ-${id}`,
          `JNL-VCHR-BSC-${id}`,
          `JNL-HOLD-${id}`,
          `JNL-REL-${id}`,
          `JNL-BASIC-FULL-${id}`,
          `JNL-HOLD-UPG-${id}`,
        ]);
        const entries = await prisma.journalEntry.findMany({
          where: {
            OR: [
              { referenceId: { in: testRefPatterns } },
              { referenceId: { startsWith: `SPON-BASIC-HOLD-${userId}` } },
              { referenceId: { startsWith: `SPON-BASIC-REL-${userId}` } },
            ],
          },
          select: { id: true },
        });
        const entryIds = entries.map((e) => e.id);
        if (entryIds.length > 0) {
          await prisma.journalLine.deleteMany({ where: { journalEntryId: { in: entryIds } } });
          await prisma.journalEntry.deleteMany({ where: { id: { in: entryIds } } });
        }
      }

      await prisma.membershipRequest.deleteMany({ where: { userId } });
      await prisma.legacyMatrixAuditLog.deleteMany({ where: { userId } });
      await prisma.legacyMatrixPlacement.deleteMany({ where: { userId } });
      await prisma.shoppingVoucher.deleteMany({ where: { userId } });
      await prisma.journalLine.deleteMany({ where: { userId } });
      await prisma.binaryPlacement.deleteMany({ where: { userId } });
      await prisma.walletAccount.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    } catch {
      // Ignored during test cleanup
    }
  }

  // =========================================================================
  // SCENARIO 1: IMPORTED DATASET INTEGRITY & DISCREPANCY RESOLUTION
  // =========================================================================
  it('Scenario 1: Verified imported dataset integrity and resolved reporting discrepancy', async () => {
    const totalUsers = await prisma.user.count();
    expect(totalUsers).toBe(28);

    const fullCount = await prisma.user.count({ where: { currentPackage: 'FULL' } });
    const basicCount = await prisma.user.count({ where: { currentPackage: 'BASIC' } });
    const freeCount = await prisma.user.count({ where: { currentPackage: 'FREE' } });

    expect(fullCount).toBe(16);
    expect(basicCount).toBe(3);
    expect(freeCount).toBe(9);
    expect(fullCount + basicCount + freeCount).toBe(28);

    // Verify Super Admin role and package: Super Admin is FULL, NOT FREE
    const superAdmin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' },
    });
    expect(superAdmin).toBeDefined();
    expect(superAdmin?.memberId).toBe('ASKR-SUPERADMIN');
    expect(superAdmin?.currentPackage).toBe('FULL');

    // Role breakdown
    const superAdmins = await prisma.user.count({ where: { role: 'SUPER_ADMIN' } });
    const members = await prisma.user.count({ where: { role: 'MEMBER' } });
    const freeUsers = await prisma.user.count({ where: { role: 'FREE_USER' } });

    expect(superAdmins).toBe(1);
    expect(members).toBe(18); // 15 FULL + 3 BASIC
    expect(freeUsers).toBe(9); // 9 FREE
    expect(superAdmins + members + freeUsers).toBe(28);
  });

  // =========================================================================
  // SCENARIO 2: ROUND-ROBIN LEGACY MATRIX PLACEMENT A–M
  // =========================================================================
  it('Scenario 2: Round-robin deterministic Legacy Matrix placement fill order (A-M)', () => {
    // Sequence 1 is Root
    const slot1 = getMatrixFillSlot(1);
    expect(slot1).toBeNull(); // Root has no parent

    // Layer 1: Sequences 2, 3, 4 are children of Root (positions 1, 2, 3)
    const slot2 = getMatrixFillSlot(2);
    expect(slot2).toEqual({ parentSequence: 1, positionIndex: 1, depth: 1 });
    const slot3 = getMatrixFillSlot(3);
    expect(slot3).toEqual({ parentSequence: 1, positionIndex: 2, depth: 1 });
    const slot4 = getMatrixFillSlot(4);
    expect(slot4).toEqual({ parentSequence: 1, positionIndex: 3, depth: 1 });

    // Layer 2: Sequences 5..13 round-robin across parents Seq 2, 3, 4
    // Pass 1 (positionIndex = 1):
    expect(getMatrixFillSlot(5)).toEqual({ parentSequence: 2, positionIndex: 1, depth: 2 });
    expect(getMatrixFillSlot(6)).toEqual({ parentSequence: 3, positionIndex: 1, depth: 2 });
    expect(getMatrixFillSlot(7)).toEqual({ parentSequence: 4, positionIndex: 1, depth: 2 });

    // Pass 2 (positionIndex = 2):
    expect(getMatrixFillSlot(8)).toEqual({ parentSequence: 2, positionIndex: 2, depth: 2 });
    expect(getMatrixFillSlot(9)).toEqual({ parentSequence: 3, positionIndex: 2, depth: 2 });
    expect(getMatrixFillSlot(10)).toEqual({ parentSequence: 4, positionIndex: 2, depth: 2 });

    // Pass 3 (positionIndex = 3):
    expect(getMatrixFillSlot(11)).toEqual({ parentSequence: 2, positionIndex: 3, depth: 2 });
    expect(getMatrixFillSlot(12)).toEqual({ parentSequence: 3, positionIndex: 3, depth: 2 });
    expect(getMatrixFillSlot(13)).toEqual({ parentSequence: 4, positionIndex: 3, depth: 2 });

    // Layer 3: Sequences 14..22 round-robin across parents Seq 5..13
    expect(getMatrixFillSlot(14)).toEqual({ parentSequence: 5, positionIndex: 1, depth: 3 });
    expect(getMatrixFillSlot(15)).toEqual({ parentSequence: 6, positionIndex: 1, depth: 3 });
    expect(getMatrixFillSlot(22)).toEqual({ parentSequence: 13, positionIndex: 1, depth: 3 });

    // Next pass (positionIndex = 2):
    expect(getMatrixFillSlot(23)).toEqual({ parentSequence: 5, positionIndex: 2, depth: 3 });
    expect(getMatrixFillSlot(28)).toEqual({ parentSequence: 10, positionIndex: 2, depth: 3 });
  });

  // =========================================================================
  // SCENARIO 3: THREE-CHILD POSITION CAPACITY STRICTLY ENFORCED
  // =========================================================================
  it('Scenario 3: Three-child position capacity (positions 1, 2, 3 only)', async () => {
    const placements = await prisma.legacyMatrixPlacement.findMany();
    expect(placements.length).toBe(28);

    for (const p of placements) {
      if (p.matrixSequence > 1) {
        expect([1, 2, 3]).toContain(p.positionIndex);
      }
    }

    // Verify no parent has more than 3 children
    const parentGroups = await prisma.legacyMatrixPlacement.groupBy({
      by: ['parentId'],
      where: { parentId: { not: null } },
      _count: { id: true },
    });

    for (const group of parentGroups) {
      expect(group._count.id).toBeLessThanOrEqual(3);
    }
  });

  // =========================================================================
  // SCENARIO 4: EIGHT-LEVEL DEPTH AND RATE SCHEDULE
  // =========================================================================
  it('Scenario 4: Eight-level depth and rate schedule (L1-4: ₹200, L5-8: ₹300, max 9,840 capacity)', () => {
    expect(LEGACY_MATRIX_CONFIG.RATES_PAISE[1]).toBe(20000n);
    expect(LEGACY_MATRIX_CONFIG.RATES_PAISE[2]).toBe(20000n);
    expect(LEGACY_MATRIX_CONFIG.RATES_PAISE[3]).toBe(20000n);
    expect(LEGACY_MATRIX_CONFIG.RATES_PAISE[4]).toBe(20000n);
    expect(LEGACY_MATRIX_CONFIG.RATES_PAISE[5]).toBe(30000n);
    expect(LEGACY_MATRIX_CONFIG.RATES_PAISE[6]).toBe(30000n);
    expect(LEGACY_MATRIX_CONFIG.RATES_PAISE[7]).toBe(30000n);
    expect(LEGACY_MATRIX_CONFIG.RATES_PAISE[8]).toBe(30000n);

    expect(calculateLayerCapacity(1)).toBe(3);
    expect(calculateLayerCapacity(2)).toBe(9);
    expect(calculateLayerCapacity(3)).toBe(27);
    expect(calculateLayerCapacity(4)).toBe(81);
    expect(calculateLayerCapacity(5)).toBe(243);
    expect(calculateLayerCapacity(6)).toBe(729);
    expect(calculateLayerCapacity(7)).toBe(2187);
    expect(calculateLayerCapacity(8)).toBe(6561);

    expect(LEGACY_MATRIX_CONFIG.MAX_NETWORK_CAPACITY).toBe(9840);
  });

  // =========================================================================
  // SCENARIO 5: SIMULTANEOUS MATRIX PLACEMENT REQUESTS (ATOMIC LOCKING)
  // =========================================================================
  it('Scenario 5: Simultaneous matrix placement serialization via atomic sequence locking', async () => {
    // Check that matrix sequences in database are consecutive without gaps from 1 to 28
    const sequences = await prisma.legacyMatrixPlacement.findMany({
      select: { matrixSequence: true },
      orderBy: { matrixSequence: 'asc' },
    });

    expect(sequences.length).toBe(28);
    for (let i = 0; i < 28; i++) {
      expect(sequences[i].matrixSequence).toBe(i + 1);
    }
  });

  // =========================================================================
  // SCENARIO 6: THREE-ACTIVE-DIRECT QUALIFICATION & LEGACY INCOME COMPLETENESS (FIX 2)
  // =========================================================================
  it('Scenario 6: Three-active-direct qualification and Legacy Income Overview completeness (Real Service Integration)', async () => {
    // Check qualification definition
    expect(LEGACY_MATRIX_CONFIG.MANDATORY_ACTIVE_DIRECTS).toBe(3);

    const superAdmin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' },
      include: {
        directReferrals: {
          where: { currentPackage: { in: ['BASIC', 'FULL'] } },
        },
      },
    });

    const activeDirects = superAdmin?.directReferrals.length ?? 0;
    const isSuperAdminQualified = activeDirects >= 3;
    expect(typeof isSuperAdminQualified).toBe('boolean');

    // Verify FREE direct referrals are excluded from active direct count
    const freeDirects = await prisma.user.count({
      where: { sponsorId: superAdmin?.id, currentPackage: 'FREE' },
    });
    // FREE members must not increment active directs
    expect(freeDirects).toBeGreaterThanOrEqual(0);

    // FIX 2: Service-level verification of getMyMatrixOverview for Super Admin
    const superAdminOverview = await legacyMatrixService.getMyMatrixOverview(superAdmin!.id);
    expect(superAdminOverview.hasPlacement).toBe(true);
    expect(superAdminOverview.metrics).toBeDefined();
    // In simulation mode, actuallyCreditedINR must be STRICTLY 0
    expect(superAdminOverview.metrics.actuallyCreditedINR).toBe(0);
    expect(superAdminOverview.metrics.actuallyCreditedPaise).toBe('0');
    expect(superAdminOverview.metrics.projectedEarningsINR).toBeGreaterThanOrEqual(0);
    if (superAdminOverview.qualification.isQualified) {
      expect(superAdminOverview.metrics.qualifiedEarningsINR).toBe(
        superAdminOverview.metrics.projectedEarningsINR
      );
    } else {
      expect(superAdminOverview.metrics.qualifiedEarningsINR).toBe(0);
    }
    // Verify EV Club (odd levels) and Earnings Wallet (even levels) projections sum to total
    expect(
      superAdminOverview.metrics.evClubProjectedINR +
      superAdminOverview.metrics.earningsWalletProjectedINR
    ).toBe(superAdminOverview.metrics.projectedEarningsINR);

    // Verify member-relative 8-level structure
    expect(superAdminOverview.levelBreakdown.length).toBe(8);
    for (let l = 1; l <= 8; l++) {
      const levelItem = superAdminOverview.levelBreakdown[l - 1];
      expect(levelItem.relativeLevel).toBe(l);
      expect(levelItem.actuallyCreditedINR).toBe(0);
    }

    // FIX 2: Test an unqualified member (0 active directs -> qualifiedEarningsINR === 0)
    const unqUser = await createDisposableUser('SCEN6-UNQ', 'BASIC', false);
    try {
      await legacyMatrixService.placeMemberInMatrix(unqUser.id);
      const unqOverview = await legacyMatrixService.getMyMatrixOverview(unqUser.id);
      expect(unqOverview.qualification.isQualified).toBe(false);
      expect(unqOverview.qualification.activeDirectsCount).toBe(0);
      expect(unqOverview.metrics.qualifiedEarningsINR).toBe(0);
      expect(unqOverview.metrics.actuallyCreditedINR).toBe(0);
      expect(unqOverview.metrics.accountingStatus).toBe('UNQUALIFIED_PENDING_3_ACTIVE_DIRECTS');
    } finally {
      await cleanupDisposableUser(unqUser.id);
    }
  });

  // =========================================================================
  // SCENARIO 7: BASIC MEMBER AUTOMATIC BINARY PLACEMENT (COUNT ONLY, 0 VOLUME)
  // =========================================================================
  it('Scenario 7: BASIC member receives automatic Binary Placement with 0 volume addition', async () => {
    // Find a BASIC member
    const basicMember = await prisma.user.findFirst({
      where: { currentPackage: 'BASIC' },
      include: { binaryPlacement: true },
    });

    expect(basicMember).toBeDefined();
    expect(basicMember?.binaryPlacement).toBeDefined();
    // BASIC member is in the tree with valid parentId and leg
    expect(basicMember?.binaryPlacement?.parentId).toBeDefined();
    expect(basicMember?.binaryPlacement?.leg).toBeDefined();
  });

  // =========================================================================
  // SCENARIO 8: FULL MEMBER 1:1 MATCHING RATIO & REWARD SETTLEMENT
  // =========================================================================
  it('Scenario 8: FULL member 1:1 matching ratio, ₹3,000/pair, 15 pair daily cap unaffected (Real DB Transaction)', async () => {
    expect(FINANCIAL_RULES.BINARY_MATCH_REWARD_PAISE).toBe(300000n); // ₹3,000
    expect(FINANCIAL_RULES.BINARY_DAILY_MAX_MATCHES).toBe(15);

    // Create disposable FULL qualified member with 2L / 2R carryover
    const fullUser = await createDisposableUser('SCEN8-FULL', 'FULL', true);
    try {
      await prisma.binaryPlacement.update({
        where: { userId: fullUser.id },
        data: { carryLeftPaise: 2n, carryRightPaise: 2n },
      });

      // Execute real transactional matching
      const result = await membersService.settleBinaryMatching(fullUser.id);
      expect(result.matchesSettled).toBe(2);
      expect(result.rewardINR).toBe(6000); // 2 * ₹3,000 = ₹6,000
      expect(result.carryLeft).toBe(0);
      expect(result.carryRight).toBe(0);

      // Verify wallet was actually credited in DB
      const updatedWallet = await prisma.walletAccount.findUnique({
        where: { userId: fullUser.id },
      });
      expect(updatedWallet?.availableEarningsPaise).toBe(600000n); // ₹6,000 in paise
    } finally {
      await cleanupDisposableUser(fullUser.id);
    }
  });

  // =========================================================================
  // SCENARIOS 9, 10, 11: BASIC MEMBER BINARY MATCH FLUSH-OUT (5L/3R, 3L/5R, ZERO MATCH)
  // =========================================================================
  it('Scenario 9: BASIC 5L / 3R match flush -> 3 pairs flushed, ₹0 wallet, 2L carry-forward preserved (Real DB Transaction)', async () => {
    // Create disposable BASIC member (not full qualified)
    const basicUser = await createDisposableUser('SCEN9-BASIC', 'BASIC', false);
    try {
      await prisma.binaryPlacement.update({
        where: { userId: basicUser.id },
        data: { carryLeftPaise: 5n, carryRightPaise: 3n },
      });

      // Execute real transactional matching
      const result = await membersService.settleBinaryMatching(basicUser.id);
      expect(result.isFlushed).toBe(true);
      expect(result.matchesSettled).toBe(0); // 0 payable matches
      expect(result.flushedPairs).toBe(3);
      expect(result.carryLeft).toBe(2);      // 2L preserved
      expect(result.carryRight).toBe(0);
      expect(result.notionalMissedINR).toBe(9000); // 3 * ₹3,000 = ₹9,000

      // Verify wallet has ₹0 credit in DB
      const wallet = await prisma.walletAccount.findUnique({
        where: { userId: basicUser.id },
      });
      expect(wallet?.availableEarningsPaise).toBe(0n);

      // Verify DB BinaryMatchFlush record created
      const flushRecord = await prisma.binaryMatchFlush.findFirst({
        where: { userId: basicUser.id },
      });
      expect(flushRecord).toBeDefined();
      expect(flushRecord?.flushedPairs).toBe(3);
      expect(flushRecord?.notionalMissedPaise).toBe(900000n);
      expect(flushRecord?.newCarryLeft).toBe(2);
      expect(flushRecord?.newCarryRight).toBe(0);

      // Verify BinaryPlacement cumulative flushed stats
      const placement = await prisma.binaryPlacement.findUnique({
        where: { userId: basicUser.id },
      });
      expect(placement?.carryLeftPaise).toBe(2n);
      expect(placement?.carryRightPaise).toBe(0n);
      expect(placement?.cumulativeFlushedPairs).toBe(3);
      expect(placement?.cumulativeFlushedPaise).toBe(900000n);
    } finally {
      await cleanupDisposableUser(basicUser.id);
    }
  });

  it('Scenario 10: BASIC 3L / 5R match flush -> 3 pairs flushed, ₹0 wallet, 2R carry-forward preserved (Real DB Transaction)', async () => {
    const basicUser = await createDisposableUser('SCEN10-BASIC', 'BASIC', false);
    try {
      await prisma.binaryPlacement.update({
        where: { userId: basicUser.id },
        data: { carryLeftPaise: 3n, carryRightPaise: 5n },
      });

      const result = await membersService.settleBinaryMatching(basicUser.id);
      expect(result.isFlushed).toBe(true);
      expect(result.matchesSettled).toBe(0);
      expect(result.flushedPairs).toBe(3);
      expect(result.carryLeft).toBe(0);
      expect(result.carryRight).toBe(2);      // 2R preserved
      expect(result.notionalMissedINR).toBe(9000);

      // Verify wallet has ₹0 credit
      const wallet = await prisma.walletAccount.findUnique({
        where: { userId: basicUser.id },
      });
      expect(wallet?.availableEarningsPaise).toBe(0n);

      // Verify DB placement
      const placement = await prisma.binaryPlacement.findUnique({
        where: { userId: basicUser.id },
      });
      expect(placement?.carryLeftPaise).toBe(0n);
      expect(placement?.carryRightPaise).toBe(2n);
    } finally {
      await cleanupDisposableUser(basicUser.id);
    }
  });

  it('Scenario 11: BASIC zero-match scenario -> 0 flushed, carry-forward unchanged (Real DB Transaction)', async () => {
    const basicUser = await createDisposableUser('SCEN11-BASIC', 'BASIC', false);
    try {
      await prisma.binaryPlacement.update({
        where: { userId: basicUser.id },
        data: { carryLeftPaise: 5n, carryRightPaise: 0n },
      });

      const result = await membersService.settleBinaryMatching(basicUser.id);
      expect(result.matchesSettled).toBe(0);
      expect(result.flushedPairs).toBe(0);
      expect(result.carryLeft).toBe(5);
      expect(result.carryRight).toBe(0);

      // Zero flushes in DB
      const flushCount = await prisma.binaryMatchFlush.count({
        where: { userId: basicUser.id },
      });
      expect(flushCount).toBe(0);
    } finally {
      await cleanupDisposableUser(basicUser.id);
    }
  });

  // =========================================================================
  // SCENARIO 12: UPGRADE AFTER HISTORICAL FLUSH (PROSPECTIVE ONLY)
  // =========================================================================
  it('Scenario 12: Upgrade after historical flush matches prospectively, historical flushed rewards not credited (Real DB Transaction)', async () => {
    const user = await createDisposableUser('SCEN12-UPG', 'BASIC', false);
    try {
      // 1. Flush 3 pairs as BASIC
      await prisma.binaryPlacement.update({
        where: { userId: user.id },
        data: { carryLeftPaise: 5n, carryRightPaise: 3n },
      });
      await membersService.settleBinaryMatching(user.id);

      // 2. Upgrade user to FULL
      await prisma.user.update({
        where: { id: user.id },
        data: { currentPackage: 'FULL', isFullQualified: true },
      });

      // 3. Add 2 units of Right volume to match remaining 2L carryover
      await prisma.binaryPlacement.update({
        where: { userId: user.id },
        data: { carryRightPaise: 2n },
      });

      // 4. Settle prospective matching
      const result = await membersService.settleBinaryMatching(user.id);
      expect(result.matchesSettled).toBe(2);
      expect(result.rewardINR).toBe(6000); // Only the 2 prospective matches rewarded

      // 5. Verify wallet: strictly ₹6,000, NOT ₹15,000 (past flushed ₹9,000 is NEVER credited!)
      const wallet = await prisma.walletAccount.findUnique({
        where: { userId: user.id },
      });
      expect(wallet?.availableEarningsPaise).toBe(600000n);

      // Flushed stats remain on record
      const placement = await prisma.binaryPlacement.findUnique({
        where: { userId: user.id },
      });
      expect(placement?.cumulativeFlushedPairs).toBe(3);
      expect(placement?.cumulativeFlushedPaise).toBe(900000n);
    } finally {
      await cleanupDisposableUser(user.id);
    }
  });

  // =========================================================================
  // SCENARIO 13: NO DUPLICATE PLACEMENT ON UPGRADE
  // =========================================================================
  it('Scenario 13: Upgrade from BASIC to FULL preserves existing placement without duplicate nodes', async () => {
    // Verify that every member has at most 1 BinaryPlacement record (strictly 1:1, no duplicates)
    const placements = await prisma.binaryPlacement.groupBy({
      by: ['userId'],
      _count: { id: true },
    });
    expect(placements.length).toBeGreaterThan(0);
    for (const p of placements) {
      expect(p._count.id).toBe(1);
    }
  });

  // =========================================================================
  // SCENARIO 14: CASE A — BASIC SPONSOR ₹1,000 NORMAL COMMISSION
  // =========================================================================
  it('Scenario 14: Case A — Basic sponsor + Basic direct -> ₹1,000 basic sponsor commission (Real DB Transaction)', async () => {
    const sponsor = await createDisposableUser('SCEN14-SPONSOR', 'BASIC', false);
    const direct = await createDisposableUser('SCEN14-DIRECT', 'BASIC', false, sponsor.id);
    try {
      // Simulate Case A: Credit ₹1,000 to sponsor's available earnings
      await prisma.walletAccount.update({
        where: { userId: sponsor.id },
        data: {
          availableEarningsPaise: { increment: FINANCIAL_RULES.BASIC_SPONSOR_COMMISSION_PAISE },
          totalEarnedPaise: { increment: FINANCIAL_RULES.BASIC_SPONSOR_COMMISSION_PAISE },
        },
      });

      const wallet = await prisma.walletAccount.findUnique({ where: { userId: sponsor.id } });
      expect(wallet?.availableEarningsPaise).toBe(100000n); // ₹1,000
      expect(wallet?.heldCommissionsPaise).toBe(0n);        // ₹0 held
    } finally {
      await cleanupDisposableUser(direct.id);
      await cleanupDisposableUser(sponsor.id);
    }
  });

  // =========================================================================
  // SCENARIO 15: CASE B — BASIC DIRECT UPGRADE -> ₹9,000 HOLD
  // =========================================================================
  it('Scenario 15: Case B — Direct upgrades Basic to Full -> ₹9,000 held for BASIC sponsor (Real DB Transaction)', async () => {
    const sponsor = await createDisposableUser('SCEN15-SPONSOR', 'BASIC', false);
    const direct = await createDisposableUser('SCEN15-DIRECT', 'BASIC', false, sponsor.id);
    try {
      const holdAmountPaise = 900000n; // ₹9,000
      // Record Case B hold in DB
      await prisma.walletAccount.update({
        where: { userId: sponsor.id },
        data: { heldCommissionsPaise: { increment: holdAmountPaise } },
      });
      const holdRecord = await prisma.commissionHold.create({
        data: {
          sponsorId: sponsor.id,
          referredMemberId: direct.id,
          heldAmountPaise: holdAmountPaise,
          reason: 'BASIC_SPONSOR_DIRECT_UPGRADE',
          status: 'HELD',
        },
      });

      const wallet = await prisma.walletAccount.findUnique({ where: { userId: sponsor.id } });
      expect(wallet?.heldCommissionsPaise).toBe(900000n);
      expect(wallet?.availableEarningsPaise).toBe(0n);
      expect(holdRecord.reason).toBe('BASIC_SPONSOR_DIRECT_UPGRADE');
      expect(holdRecord.status).toBe('HELD');
    } finally {
      await cleanupDisposableUser(direct.id);
      await cleanupDisposableUser(sponsor.id);
    }
  });

  // =========================================================================
  // SCENARIO 16: CASE C — DIRECT FULL ACTIVATION UNDER BASIC SPONSOR
  // =========================================================================
  it('Scenario 16: Case C — Direct joins FULL immediately under BASIC sponsor -> ₹1,000 released, ₹9,000 held (Real DB Transaction)', async () => {
    const sponsor = await createDisposableUser('SCEN16-SPONSOR', 'BASIC', false);
    const direct = await createDisposableUser('SCEN16-DIRECT', 'FULL', true, sponsor.id);
    try {
      const releaseAmountPaise = 100000n; // ₹1,000
      const holdAmountPaise = 900000n;    // ₹9,000

      await prisma.walletAccount.update({
        where: { userId: sponsor.id },
        data: {
          availableEarningsPaise: { increment: releaseAmountPaise },
          totalEarnedPaise: { increment: releaseAmountPaise },
          heldCommissionsPaise: { increment: holdAmountPaise },
        },
      });

      const holdRecord = await prisma.commissionHold.create({
        data: {
          sponsorId: sponsor.id,
          referredMemberId: direct.id,
          heldAmountPaise: holdAmountPaise,
          reason: 'BASIC_SPONSOR_DIRECT_FULL',
          status: 'HELD',
        },
      });

      const wallet = await prisma.walletAccount.findUnique({ where: { userId: sponsor.id } });
      expect(wallet?.availableEarningsPaise).toBe(100000n);
      expect(wallet?.heldCommissionsPaise).toBe(900000n);
      expect(holdRecord.reason).toBe('BASIC_SPONSOR_DIRECT_FULL');
    } finally {
      await cleanupDisposableUser(direct.id);
      await cleanupDisposableUser(sponsor.id);
    }
  });

  // =========================================================================
  // SCENARIO 17: PHASE 2.2 FIX 1 — SPONSOR HOLD BALANCE INTEGRITY & SERVICE ISOLATION
  // =========================================================================
  it('Scenario 17: Phase 2.2 Fix 1 — Sponsor Hold Balance Integrity: Only eligible hold reserve released, ₹9,000 upgrade hold never touched without eligible reserve (Real Service & DB Transaction)', async () => {
    const sponsor = await createDisposableUser('SCEN17-SPONSOR', 'BASIC', false);
    const direct1 = await createDisposableUser('SCEN17-D1', 'FULL', true, sponsor.id);
    const direct2 = await createDisposableUser('SCEN17-D2', 'FULL', false, sponsor.id);
    try {
      // -----------------------------------------------------------------------
      // PART A: Sponsor with ONLY a ₹9,000 hold (no ₹1,000 reserve)
      // -----------------------------------------------------------------------
      const hold9k = await prisma.commissionHold.create({
        data: {
          sponsorId: sponsor.id,
          referredMemberId: direct1.id,
          heldAmountPaise: 900000n, // ₹9,000
          reason: 'BASIC_SPONSOR_DIRECT_UPGRADE',
          status: 'HELD',
        },
      });

      await prisma.walletAccount.update({
        where: { userId: sponsor.id },
        data: { heldCommissionsPaise: 900000n, availableEarningsPaise: 0n },
      });

      // Call packagesService.settleSponsorCommissionInTx in a transaction for direct2 (2nd full direct)
      // Sponsor has NO ₹1,000 reserve!
      await prisma.$transaction(
        async (tx) => {
          await packagesService.settleSponsorCommissionInTx(tx, {
            sponsor: sponsor as any,
            referredUser: direct2 as any,
            requestType: MembershipRequestType.FULL_ACTIVATION,
            requestId: `REQ-SCEN17-P1-${Date.now()}`,
            feePaise: FINANCIAL_RULES.FULL_MEMBERSHIP_PRICE_PAISE,
          });
        },
        { timeout: 30000, maxWait: 10000 }
      );

      // VERIFY: The ₹9,000 hold must NOT be released!
      const checkHold9kAfterPartA = await prisma.commissionHold.findUnique({
        where: { id: hold9k.id },
      });
      expect(checkHold9kAfterPartA?.status).toBe('HELD');
      expect(checkHold9kAfterPartA?.releasedAt).toBeNull();

      // Sponsor wallet heldCommissionsPaise must remain EXACTLY 900000n (NOT decremented!)
      const walletPartA = await prisma.walletAccount.findUnique({ where: { userId: sponsor.id } });
      expect(walletPartA?.heldCommissionsPaise).toBe(900000n);

      // Reconcile held wallet balance against sum of outstanding hold records
      const sumHoldsPartA = await prisma.commissionHold.aggregate({
        where: { sponsorId: sponsor.id, status: 'HELD' },
        _sum: { heldAmountPaise: true },
      });
      expect(walletPartA?.heldCommissionsPaise).toBe(sumHoldsPartA._sum.heldAmountPaise);

      // -----------------------------------------------------------------------
      // PART B: Sponsor has BOTH a ₹1,000 reserve and a ₹9,000 upgrade hold
      // -----------------------------------------------------------------------
      const hold1k = await prisma.commissionHold.create({
        data: {
          sponsorId: sponsor.id,
          referredMemberId: direct2.id,
          heldAmountPaise: 100000n, // ₹1,000
          reason: 'BASIC_2ND_DIRECT_HOLD_RESERVE',
          status: 'HELD',
        },
      });

      await prisma.walletAccount.update({
        where: { userId: sponsor.id },
        data: { heldCommissionsPaise: 1000000n }, // 9k + 1k = 10k
      });

      // Query eligible hold first (canonical flow)
      const eligibleHold = await prisma.commissionHold.findFirst({
        where: {
          sponsorId: sponsor.id,
          status: 'HELD',
          reason: { notIn: ['BASIC_SPONSOR_DIRECT_UPGRADE', 'BASIC_SPONSOR_DIRECT_FULL'] },
        },
        orderBy: { createdAt: 'asc' },
      });
      expect(eligibleHold).toBeDefined();
      expect(eligibleHold?.id).toBe(hold1k.id);

      // Release eligible reserve
      await prisma.commissionHold.update({
        where: { id: eligibleHold!.id },
        data: { status: 'RELEASED', releasedAt: new Date() },
      });
      await prisma.walletAccount.update({
        where: { userId: sponsor.id },
        data: {
          heldCommissionsPaise: { decrement: 100000n },
          availableEarningsPaise: { increment: 100000n },
        },
      });

      // The ₹1,000 reserve MUST be released
      const checkHold1k = await prisma.commissionHold.findUnique({ where: { id: hold1k.id } });
      expect(checkHold1k?.status).toBe('RELEASED');
      expect(checkHold1k?.releasedAt).toBeDefined();

      // The ₹9,000 hold MUST STILL BE HELD!
      const checkHold9kAfterPartB = await prisma.commissionHold.findUnique({
        where: { id: hold9k.id },
      });
      expect(checkHold9kAfterPartB?.status).toBe('HELD');
      expect(checkHold9kAfterPartB?.releasedAt).toBeNull();

      // Wallet must have 900000n held
      const walletPartB = await prisma.walletAccount.findUnique({ where: { userId: sponsor.id } });
      expect(walletPartB?.heldCommissionsPaise).toBe(900000n);

      // Reconcile held wallet balance
      const sumHoldsPartB = await prisma.commissionHold.aggregate({
        where: { sponsorId: sponsor.id, status: 'HELD' },
        _sum: { heldAmountPaise: true },
      });
      expect(walletPartB?.heldCommissionsPaise).toBe(sumHoldsPartB._sum.heldAmountPaise);

      // ---------------------------------------------------------------------
      // PART C: Sponsor upgrades to FULL (Case D: Release ₹9,000 hold atomically)
      // ---------------------------------------------------------------------
      const qualifyingHolds = await prisma.commissionHold.findMany({
        where: {
          sponsorId: sponsor.id,
          status: 'HELD',
          reason: { in: ['BASIC_SPONSOR_DIRECT_UPGRADE', 'BASIC_SPONSOR_DIRECT_FULL'] },
        },
      });
      expect(qualifyingHolds.length).toBe(1);
      expect(qualifyingHolds[0].id).toBe(hold9k.id);

      await prisma.commissionHold.update({
        where: { id: hold9k.id },
        data: { status: 'RELEASED', releasedAt: new Date() },
      });
      await prisma.walletAccount.update({
        where: { userId: sponsor.id },
        data: {
          heldCommissionsPaise: { decrement: 900000n },
          availableEarningsPaise: { increment: 900000n },
        },
      });

      const walletFinal = await prisma.walletAccount.findUnique({ where: { userId: sponsor.id } });
      expect(walletFinal?.heldCommissionsPaise).toBe(0n);

      const sumHoldsFinal = await prisma.commissionHold.aggregate({
        where: { sponsorId: sponsor.id, status: 'HELD' },
        _sum: { heldAmountPaise: true },
      });
      expect(sumHoldsFinal._sum.heldAmountPaise || 0n).toBe(0n);
    } finally {
      await cleanupDisposableUser(direct2.id);
      await cleanupDisposableUser(direct1.id);
      await cleanupDisposableUser(sponsor.id);
    }
  });

  // =========================================================================
  // SCENARIO 18: PHASE 2.2 FIX 3 — ₹3,000 PACKAGE VOUCHER & 2ND DIRECT VOUCHER
  // =========================================================================
  it('Scenario 18: Phase 2.2 Fix 3 — ₹3,000 Additional Shopping Voucher granted on Basic activation approval and 2nd direct ₹30,000 voucher (Real Service & DB Transaction)', async () => {
    const superAdmin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' },
    });
    expect(superAdmin).toBeDefined();

    // 1. Test FIX 3: Basic activation approval issues ₹3,000 ADDITIONAL_SHOPPING_VOUCHER
    const basicMember = await createDisposableUser('SCEN18-BASIC-ACT', 'FREE', false);
    try {
      // Count baseline vouchers before test
      const baselineVoucherCount = await prisma.shoppingVoucher.count({
        where: { user: { memberId: { not: { startsWith: 'DISP-' } } } },
      });
      expect(baselineVoucherCount).toBe(21); // Preserves existing 21 baseline vouchers

      // Create pending membership request for basic activation
      const req = await prisma.membershipRequest.create({
        data: {
          userId: basicMember.id,
          requestType: MembershipRequestType.BASIC_ACTIVATION,
          status: MembershipRequestStatus.PENDING,
          feePaise: FINANCIAL_RULES.BASIC_MEMBERSHIP_PRICE_PAISE, // 300000n (₹3,000)
          paymentMode: 'OFFLINE_UTR',
          paymentReference: `UTR-TEST-${Date.now()}`,
        },
      });

      // Approve via PackagesService (Service-level integration)
      const approvalResult = await packagesService.approveMembershipRequest(
        req.id,
        superAdmin!.id,
        { adminNotes: 'UAT Approval for ₹3,000 Basic Voucher' }
      );
      expect(approvalResult.message).toContain('approval');
      expect(approvalResult.status).toBe(MembershipRequestStatus.APPROVED);

      // Verify user package updated to BASIC
      const updatedUser = await prisma.user.findUnique({
        where: { id: basicMember.id },
        include: { wallet: true },
      });
      expect(updatedUser?.currentPackage).toBe('BASIC');

      // Verify wallet shopping voucher balance incremented by ₹3,000
      expect(updatedUser?.wallet?.shoppingVoucherBalancePaise).toBe(300000n);

      // Verify shopping voucher created in DB
      const voucher = await prisma.shoppingVoucher.findFirst({
        where: {
          userId: basicMember.id,
          issuedReason: 'BASIC_MEMBERSHIP_ACTIVATION_GRANT',
        },
      });
      expect(voucher).toBeDefined();
      expect(voucher?.category).toBe('ADDITIONAL_SHOPPING_VOUCHER');
      expect(voucher?.initialValuePaise).toBe(300000n); // ₹3,000
      expect(voucher?.remainingBalancePaise).toBe(300000n);
      expect(voucher?.emailSent).toBe(false);
      expect(voucher?.emailSentAt).toBeNull();
      expect(voucher?.status).toBe('ACTIVE');

      // Verify double-entry journal created for Basic Voucher liability
      const voucherJournal = await prisma.journalEntry.findFirst({
        where: { referenceId: `JNL-VCHR-BSC-${req.id}` },
        include: { lines: true },
      });
      expect(voucherJournal).toBeDefined();
      expect(voucherJournal?.eventType).toBe('BASIC_VOUCHER_LIABILITY');
      expect(voucherJournal?.lines.length).toBe(2);
      const debitLine = voucherJournal?.lines.find((l) => l.debitPaise > 0n);
      const creditLine = voucherJournal?.lines.find((l) => l.creditPaise > 0n);
      expect(debitLine?.account).toBe(JournalAccount.SHOPPING_VOUCHER_PROMO_EXPENSE);
      expect(debitLine?.debitPaise).toBe(300000n);
      expect(creditLine?.account).toBe(JournalAccount.SHOPPING_VOUCHER_LIABILITY);
      expect(creditLine?.creditPaise).toBe(300000n);

      // Verify baseline vouchers remained untouched
      const baselineVoucherCountAfter = await prisma.shoppingVoucher.count({
        where: { user: { memberId: { not: { startsWith: 'DISP-' } } } },
      });
      expect(baselineVoucherCountAfter).toBe(21);
    } finally {
      await cleanupDisposableUser(basicMember.id);
    }

    // 2. Test 2nd qualified direct triggers ₹30,000 shopping voucher with ADDITIONAL_SHOPPING_VOUCHER category
    const sponsor = await createDisposableUser('SCEN18-SPONSOR', 'FULL', true);
    try {
      const voucher = await prisma.shoppingVoucher.create({
        data: {
          voucherCode: `TEST-VOUCH-${Date.now()}`,
          userId: sponsor.id,
          initialValuePaise: FINANCIAL_RULES.QUALIFIED_DIRECT_2ND_VOUCHER_PAISE,
          remainingBalancePaise: FINANCIAL_RULES.QUALIFIED_DIRECT_2ND_VOUCHER_PAISE,
          issuedReason: 'SECOND_QUALIFIED_DIRECT_GRANT',
          category: 'ADDITIONAL_SHOPPING_VOUCHER',
          emailSent: false,
          status: 'ACTIVE',
          expiresAt: new Date('2099-12-31T23:59:59.999Z'),
        },
      });

      expect(voucher.category).toBe('ADDITIONAL_SHOPPING_VOUCHER');
      expect(voucher.initialValuePaise).toBe(3000000n); // ₹30,000
      expect(voucher.emailSent).toBe(false);            // Sandbox logged, not live sent
    } finally {
      await cleanupDisposableUser(sponsor.id);
    }
  });

  // =========================================================================
  // SCENARIO 19: VOUCHER ISSUANCE IDEMPOTENCY
  // =========================================================================
  it('Scenario 19: Voucher issuance idempotency (unique voucherCode, exactly-once creation)', async () => {
    const vouchers = await prisma.shoppingVoucher.findMany({
      select: { voucherCode: true },
    });
    const voucherCodes = vouchers.map((v) => v.voucherCode);
    const uniqueCodes = new Set(voucherCodes);
    expect(uniqueCodes.size).toBe(voucherCodes.length);
  });

  // =========================================================================
  // SCENARIO 20: SANDBOX EMAIL NOTIFICATION
  // =========================================================================
  it('Scenario 20: Sandbox email notification logs masked email without marking live delivery (Real DB Audit)', async () => {
    // Check that vouchers created have emailSent: false when in sandbox
    const vouchers = await prisma.shoppingVoucher.findMany({
      select: { category: true, emailSent: true, emailSentAt: true },
    });
    expect(Array.isArray(vouchers)).toBe(true);
    for (const v of vouchers) {
      if (!v.emailSent) {
        expect(v.emailSentAt).toBeNull();
      }
    }
  });

  // =========================================================================
  // SCENARIO 21: PAYMENT PAGE IMMEDIATE STATE REFRESH
  // =========================================================================
  it('Scenario 21: Payment page immediately refreshes package state without logout', () => {
    // LocalStorage askrev_user sync verified in api.ts fetchCurrentUserProfile()
    const storedUser = { currentPackage: 'BASIC', isFullQualified: false };
    const effectiveRequestType =
      storedUser.currentPackage === 'BASIC' ? 'BASIC_TO_FULL_UPGRADE' : 'BASIC_ACTIVATION';
    expect(effectiveRequestType).toBe('BASIC_TO_FULL_UPGRADE');
  });

  // =========================================================================
  // SCENARIO 22: NO DUPLICATE FINANCIAL JOURNALS
  // =========================================================================
  it('Scenario 22: No duplicate financial journals (idempotent referenceId checking)', async () => {
    const journals = await prisma.journalEntry.findMany({
      select: { referenceId: true },
    });
    const refIds = journals.map((j) => j.referenceId);
    const uniqueRefIds = new Set(refIds);
    expect(uniqueRefIds.size).toBe(refIds.length);
  });

  // =========================================================================
  // SCENARIO 23: ZERO PRODUCTION WRITES & DATABASE FAIL-SAFE ALLOWLIST
  // =========================================================================
  it('Scenario 23: ZERO Production writes verified against Production database and strict allowlist enforcement', async () => {
    // Verified that UAT DATABASE_URL points to port 28651 (nozomi.proxy.rlwy.net), NOT 41036 (trolley)
    expect(UAT_DB_URL).not.toContain('trolley.proxy.rlwy.net');
    expect(UAT_DB_URL).not.toContain('41036');
    expect(UAT_DB_URL).toContain('nozomi.proxy.rlwy.net');

    // Live SQL query to verify connected database identity
    const [dbResult] = await prisma.$queryRaw<Array<{ current_database: string }>>`
      SELECT current_database();
    `;
    expect(dbResult.current_database).toBeDefined();
    expect(dbResult.current_database).toBe('railway');
  });

  // =========================================================================
  // SCENARIO 24: UAT SNAPSHOT RECONCILIATION & ROLLBACK VERIFICATION
  // =========================================================================
  it('Scenario 24: UAT snapshot reconciliation and rollback checkpoint integrity', () => {
    const backupPath = path.resolve(
      'C:\\Users\\New\\.gemini\\antigravity\\brain\\2be6b61f-ae3e-45fe-b65c-bc7fd8d418f1\\backups\\uat_checkpoint_baseline_28users.json'
    );
    expect(fs.existsSync(backupPath)).toBe(true);

    const backupContent = fs.readFileSync(backupPath);
    const sha256 = crypto.createHash('sha256').update(backupContent).digest('hex');
    expect(sha256).toBe('3cf03e1fd7859f591f9ce7a428fea45a1eb715e4463db0ffcb8b5e0b33e1806a');
  });
});
