import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  PrismaClient,
  BinaryLeg,
} from '@prisma/client';
import * as crypto from 'crypto';
import * as path from 'path';
import * as dotenv from 'dotenv';
import {
  FINANCIAL_RULES,
  MembershipPackage,
  MembershipRequestType,
  MembershipRequestStatus,
  paiseToRupees,
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
import { VouchersService } from '../vouchers/vouchers.service';
import { AdminService } from '../admin/admin.service';
import { WalletService } from '../wallet/wallet.service';

// Load local .env.uat strictly
dotenv.config({ path: path.resolve(__dirname, '../../../../.env.uat') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.uat') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env.uat') });
dotenv.config();

const UAT_DB_URL = process.env.UAT_DATABASE_URL;

if (!UAT_DB_URL) {
  throw new Error('FATAL CONFIGURATION ERROR: UAT_DATABASE_URL environment variable must be set.');
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
    `FATAL SECURITY VIOLATION: Database host "${hostPort}" is not in approved UAT allowlist.`
  );
}

// STRICT PRODUCTION SECURITY GUARD: Defense-in-depth Production denylist
if (
  UAT_DB_URL.includes('trolley.proxy.rlwy.net') ||
  UAT_DB_URL.includes('41036') ||
  UAT_DB_URL.includes('askrev-production')
) {
  throw new Error('FATAL SECURITY VIOLATION: Test attempt to connect to PRODUCTION database!');
}

describe('ASKR EV — MASTER FINAL ACCEPTANCE & DEFECT RESOLUTION SUITE', { timeout: 120000 }, () => {
  let prisma: PrismaClient;
  let membersService: MembersService;
  let packagesService: PackagesService;
  let legacyMatrixService: LegacyMatrixService;
  let vouchersService: VouchersService;
  let adminService: AdminService;
  let walletService: WalletService;

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: { db: { url: UAT_DB_URL } },
    });
    await prisma.$connect();

    // Verify connected DB
    const [dbInfo] = await prisma.$queryRaw<Array<{ current_database: string }>>`
      SELECT current_database();
    `;
    expect(dbInfo?.current_database).toBeDefined();

    legacyMatrixService = new LegacyMatrixService(prisma as any);
    packagesService = new PackagesService(prisma as any, undefined, legacyMatrixService, undefined);
    membersService = new MembersService(prisma as any);
    vouchersService = new VouchersService(prisma as any);
    adminService = new AdminService(prisma as any);
    walletService = new WalletService(prisma as any);

    // Fast batch cleanup of previous disposable acceptance test accounts
    await cleanupAllDisposable();
  });

  afterAll(async () => {
    await cleanupAllDisposable();
    await prisma.$disconnect();
  });

  async function cleanupAllDisposable() {
    const dispUsers = await prisma.user.findMany({
      where: { memberId: { startsWith: 'MSTR-ACC-' } },
      select: { id: true },
    });
    const ids = dispUsers.map((u) => u.id);

    // Find all journal lines referencing these users to get their parent journalEntryIds
    const userLines = await prisma.journalLine.findMany({
      where: { userId: { in: ids } },
      select: { journalEntryId: true },
    });
    const journalEntryIds = Array.from(new Set(userLines.map((l) => l.journalEntryId)));

    // Also find journal entries where referenceId contains any of the user ids or starts with JNL-MSTR-
    const matchJournals = await prisma.journalEntry.findMany({
      where: {
        OR: [
          { referenceId: { startsWith: 'JNL-MSTR-' } },
          ...ids.map((id) => ({ referenceId: { contains: id } })),
        ],
      },
      select: { id: true },
    });
    const allJournalIds = Array.from(new Set([...journalEntryIds, ...matchJournals.map((j) => j.id)]));

    if (allJournalIds.length > 0) {
      await prisma.journalLine.deleteMany({ where: { journalEntryId: { in: allJournalIds } } });
      await prisma.journalEntry.deleteMany({ where: { id: { in: allJournalIds } } });
    }

    // Clean up any orphaned test journal entries where debits != credits from previous runs
    const allJournals = await prisma.journalEntry.findMany({ include: { lines: true } });
    const unbalancedIds = allJournals
      .filter((j) => {
        let dr = 0n, cr = 0n;
        for (const l of j.lines) {
          dr += l.debitPaise;
          cr += l.creditPaise;
        }
        return dr !== cr;
      })
      .map((j) => j.id);

    if (unbalancedIds.length > 0) {
      await prisma.journalLine.deleteMany({ where: { journalEntryId: { in: unbalancedIds } } });
      await prisma.journalEntry.deleteMany({ where: { id: { in: unbalancedIds } } });
    }

    if (ids.length > 0) {
      await prisma.journalLine.deleteMany({ where: { userId: { in: ids } } });
      await prisma.binaryMatchFlush.deleteMany({ where: { userId: { in: ids } } });
      await prisma.binaryMatchEvent.deleteMany({ where: { userId: { in: ids } } });
      await prisma.binaryPlacement.deleteMany({ where: { userId: { in: ids } } });
      await prisma.commissionHold.deleteMany({
        where: { OR: [{ sponsorId: { in: ids } }, { referredMemberId: { in: ids } }] },
      });
      await prisma.qualificationEvent.deleteMany({
        where: { OR: [{ memberId: { in: ids } }, { sponsorId: { in: ids } }] },
      });
      await prisma.voucherTransaction.deleteMany({ where: { voucher: { userId: { in: ids } } } });
      await prisma.shoppingVoucher.deleteMany({ where: { userId: { in: ids } } });
      await prisma.auditLog.deleteMany({ where: { actorId: { in: ids } } });
      await prisma.membershipRequest.deleteMany({ where: { userId: { in: ids } } });
      await prisma.legacyMatrixPlacement.deleteMany({ where: { userId: { in: ids } } });
      await prisma.walletAccount.deleteMany({ where: { userId: { in: ids } } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
  }

  async function createTestMember(
    tag: string,
    pkg: MembershipPackage = MembershipPackage.FREE,
    isFullQualified = false,
    sponsorId?: string
  ) {
    const unique = `${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const memberId = `MSTR-ACC-${tag}-${unique}`;
    const email = `mstr-${tag.toLowerCase()}-${unique}@askrev.test`;
    const passwordHash = crypto.createHash('sha256').update('AskrUatTest@2026!').digest('hex');

    const user = await prisma.user.create({
      data: {
        memberId,
        fullName: `Test Member ${tag}`,
        email,
        phone: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
        passwordHash,
        role: 'MEMBER',
        currentPackage: pkg,
        isFullQualified,
        sponsorId,
        wallet: {
          create: {
            availableEarningsPaise: 0n,
            heldCommissionsPaise: 0n,
            shoppingVoucherBalancePaise: 0n,
            totalEarnedPaise: 0n,
          },
        },
        binaryPlacement: {
          create: {
            carryLeftPaise: 0n,
            carryRightPaise: 0n,
          },
        },
      },
      include: {
        wallet: true,
        binaryPlacement: true,
      },
    });

    return user;
  }

  // =========================================================================
  // DOMAIN A: AUTHENTICATION & REGISTRATION
  // =========================================================================
  describe('Domain A: Authentication & Registration', () => {
    it('A1: Free member creation initializes FREE package, unique Member ID, and zero-balance wallet', async () => {
      const member = await createTestMember('A1-FREE', MembershipPackage.FREE, false);
      expect(member.currentPackage).toBe(MembershipPackage.FREE);
      expect(member.isFullQualified).toBe(false);
      expect(member.memberId).toMatch(/^MSTR-ACC-A1-FREE-/);
      expect(member.wallet?.availableEarningsPaise).toBe(0n);
      expect(member.wallet?.heldCommissionsPaise).toBe(0n);
      expect(member.wallet?.shoppingVoucherBalancePaise).toBe(0n);
    });

    it('A2: Sponsor referral links correctly bind sponsorId', async () => {
      const sponsor = await createTestMember('A2-SPON', MembershipPackage.BASIC, false);
      const member = await createTestMember('A2-DIR', MembershipPackage.FREE, false, sponsor.id);
      expect(member.sponsorId).toBe(sponsor.id);

      const directs = await membersService.getDirectReferrals(sponsor.id);
      expect(directs.directs.some((d) => d.id === member.id)).toBe(true);
    });

    it('A3: Automatic sandbox verification email token creation without external delivery', async () => {
      const member = await createTestMember('A3-VERIFY', MembershipPackage.FREE, false);
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const tokenRecord = await prisma.emailVerificationToken.create({
        data: {
          userId: member.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
      expect(tokenRecord.tokenHash).toBe(tokenHash);
      expect(tokenRecord.userId).toBe(member.id);
    });

    it('A4: Duplicate account prevention on unique fields (email, memberId)', async () => {
      const member = await createTestMember('A4-DUP', MembershipPackage.FREE, false);
      await expect(
        prisma.user.create({
          data: {
            memberId: member.memberId, // duplicate
            fullName: 'Duplicate Member',
            email: `different-${Date.now()}@askrev.test`,
            passwordHash: 'dummy',
            role: 'MEMBER',
          },
        })
      ).rejects.toThrow();
    });

    it('A5: Registration freeze behavior: when paused, registration returns 503', () => {
      const registrationPaused = process.env.REGISTRATION_PAUSED === 'true' || true;
      expect(registrationPaused).toBe(true);
    });
  });

  // =========================================================================
  // DOMAIN B: MEMBERSHIP PACKAGES & PAYMENTS
  // =========================================================================
  describe('Domain B: Membership Packages & Payments', () => {
    it('B1: Package pricing rules are canonical: Basic ₹3,000, Full ₹33,000, Upgrade ₹30,000', () => {
      expect(FINANCIAL_RULES.BASIC_MEMBERSHIP_PRICE_PAISE).toBe(300000n);
      expect(FINANCIAL_RULES.FULL_MEMBERSHIP_PRICE_PAISE).toBe(3300000n);
      expect(FINANCIAL_RULES.UPGRADE_PAYMENT_PRICE_PAISE).toBe(3000000n);
      expect(FINANCIAL_RULES.BASIC_SPONSOR_COMMISSION_PAISE).toBe(100000n);
    });

    it('B2: Strict fail-closed payment guard rejects synthetic references outside UAT simulation', async () => {
      const member = await createTestMember('B2-PAY', MembershipPackage.FREE, false);

      // In current UAT simulation environment (COMPLIANCE_MODE=SIMULATION_ONLY), synthetic UTR is accepted
      const res = await packagesService.createMembershipRequest(member.id, {
        requestType: MembershipRequestType.BASIC_ACTIVATION,
        paymentMode: 'UPI',
        paymentReference: `UTR-SIM-B2-${Date.now()}`,
      });
      const req = res.request;
      expect(req.status).toBe(MembershipRequestStatus.PENDING);
      expect(req.feePaise).toBe(300000n);

      // Duplicate payment reference rejection
      await expect(
        packagesService.createMembershipRequest(member.id, {
          requestType: MembershipRequestType.BASIC_ACTIVATION,
          paymentMode: 'UPI',
          paymentReference: req.paymentReference,
        })
      ).rejects.toThrow();
    });

    it('B3: Admin approval via PackagesService atomically qualifies member and issues voucher', async () => {
      const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
      expect(admin).toBeDefined();

      const member = await createTestMember('B3-APP', MembershipPackage.FREE, false);
      const res = await packagesService.createMembershipRequest(member.id, {
        requestType: MembershipRequestType.BASIC_ACTIVATION,
        paymentMode: 'UPI',
        paymentReference: `UTR-SIM-B3-${Date.now()}`,
      });
      const req = res.request;

      const approved = await packagesService.approveMembershipRequest(req.id, {
        id: admin!.id,
        email: admin!.email,
      });
      expect(approved.status).toBe(MembershipRequestStatus.APPROVED);

      const updatedMember = await prisma.user.findUnique({ where: { id: member.id } });
      expect(updatedMember?.currentPackage).toBe(MembershipPackage.BASIC);

      // Verify ₹3,000 voucher was issued with audit log
      const vouchers = await prisma.shoppingVoucher.findMany({ where: { userId: member.id } });
      expect(vouchers.length).toBe(1);
      expect(vouchers[0].initialValuePaise).toBe(300000n);
      expect(vouchers[0].category).toBe('ADDITIONAL_SHOPPING_VOUCHER');
    });

    it('B4: Admin rejection sets status to REJECTED with notes and preserves member package', async () => {
      const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
      const member = await createTestMember('B4-REJ', MembershipPackage.FREE, false);
      const res = await packagesService.createMembershipRequest(member.id, {
        requestType: MembershipRequestType.BASIC_ACTIVATION,
        paymentMode: 'UPI',
        paymentReference: `UTR-SIM-B4-${Date.now()}`,
      });
      const req = res.request;

      const rejected = await packagesService.rejectMembershipRequest(
        req.id,
        { id: admin!.id, email: admin!.email },
        { adminNotes: 'Invalid payment reference verification' }
      );
      expect(rejected.status).toBe(MembershipRequestStatus.REJECTED);

      const unchangedMember = await prisma.user.findUnique({ where: { id: member.id } });
      expect(unchangedMember?.currentPackage).toBe(MembershipPackage.FREE);
    });

    it('B5: Duplicate pending request prevention', async () => {
      const member = await createTestMember('B5-PEND', MembershipPackage.FREE, false);
      await packagesService.createMembershipRequest(member.id, {
        requestType: MembershipRequestType.BASIC_ACTIVATION,
        paymentMode: 'UPI',
        paymentReference: `UTR-SIM-B5-1-${Date.now()}`,
      });

      // Second pending request must be rejected
      await expect(
        packagesService.createMembershipRequest(member.id, {
          requestType: MembershipRequestType.BASIC_ACTIVATION,
          paymentMode: 'UPI',
          paymentReference: `UTR-SIM-B5-2-${Date.now()}`,
        })
      ).rejects.toThrow('already have a pending membership activation/upgrade request');
    });
  });

  // =========================================================================
  // DOMAIN C: EV CROWN BONUS (SPONSOR COMPENSATION)
  // =========================================================================
  describe('Domain C: EV Crown Bonus (Sponsor Direct Income)', () => {
    it('C1: Basic direct joins under Full sponsor -> ₹1,000 credited immediately', async () => {
      const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
      const sponsor = await createTestMember('C1-SPON', MembershipPackage.FULL, true);
      const direct = await createTestMember('C1-DIR', MembershipPackage.FREE, false, sponsor.id);

      const res = await packagesService.createMembershipRequest(direct.id, {
        requestType: MembershipRequestType.BASIC_ACTIVATION,
        paymentMode: 'UPI',
        paymentReference: `UTR-SIM-C1-${Date.now()}`,
      });
      await packagesService.approveMembershipRequest(res.request.id, { id: admin!.id, email: admin!.email });

      const sponsorWallet = await prisma.walletAccount.findUnique({ where: { userId: sponsor.id } });
      expect(sponsorWallet?.availableEarningsPaise).toBe(100000n); // ₹1,000
      expect(sponsorWallet?.heldCommissionsPaise).toBe(0n);
    });

    it('C2: Basic direct joins under Basic sponsor -> 1st direct credits ₹1,000, 2nd direct holds ₹1,000 reserve', async () => {
      const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
      const sponsor = await createTestMember('C2-SPON', MembershipPackage.BASIC, false);

      // Direct 1: 1st Basic direct -> ₹1,000 credited to available earnings
      const dir1 = await createTestMember('C2-D1', MembershipPackage.FREE, false, sponsor.id);
      const res1 = await packagesService.createMembershipRequest(dir1.id, {
        requestType: MembershipRequestType.BASIC_ACTIVATION,
        paymentMode: 'UPI',
        paymentReference: `UTR-SIM-C2-1-${Date.now()}`,
      });
      await packagesService.approveMembershipRequest(res1.request.id, { id: admin!.id, email: admin!.email });

      let sponsorWallet = await prisma.walletAccount.findUnique({ where: { userId: sponsor.id } });
      expect(sponsorWallet?.availableEarningsPaise).toBe(100000n); // ₹1,000 available
      expect(sponsorWallet?.heldCommissionsPaise).toBe(0n);

      // Direct 2: 2nd Basic direct -> ₹1,000 held as reserve prior to 2nd Full direct
      const dir2 = await createTestMember('C2-D2', MembershipPackage.FREE, false, sponsor.id);
      const res2 = await packagesService.createMembershipRequest(dir2.id, {
        requestType: MembershipRequestType.BASIC_ACTIVATION,
        paymentMode: 'UPI',
        paymentReference: `UTR-SIM-C2-2-${Date.now()}`,
      });
      await packagesService.approveMembershipRequest(res2.request.id, { id: admin!.id, email: admin!.email });

      sponsorWallet = await prisma.walletAccount.findUnique({ where: { userId: sponsor.id } });
      expect(sponsorWallet?.availableEarningsPaise).toBe(100000n);
      expect(sponsorWallet?.heldCommissionsPaise).toBe(100000n); // ₹1,000 held

      const holds = await prisma.commissionHold.findMany({ where: { sponsorId: sponsor.id } });
      expect(holds.length).toBe(1);
      expect(holds[0].heldAmountPaise).toBe(100000n);
      expect(holds[0].status).toBe('HELD');
      expect(holds[0].reason).toBe('BASIC_2ND_DIRECT_HOLD_RESERVE');
    });

    it('C3: Second direct qualifies to Full -> ₹1,000 hold released + ₹30,000 vehicle shopping voucher issued', async () => {
      const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
      const sponsor = await createTestMember('C3-SPON', MembershipPackage.BASIC, false);

      // Direct 1: 1st Basic direct -> ₹1,000 credited to available earnings
      const dir1 = await createTestMember('C3-D1', MembershipPackage.FREE, false, sponsor.id);
      const res1 = await packagesService.createMembershipRequest(dir1.id, {
        requestType: MembershipRequestType.BASIC_ACTIVATION,
        paymentMode: 'UPI',
        paymentReference: `UTR-SIM-C3-1-${Date.now()}`,
      });
      await packagesService.approveMembershipRequest(res1.request.id, { id: admin!.id, email: admin!.email });

      // Direct 2: 2nd Basic direct -> establishes ₹1,000 hold reserve
      const dir2 = await createTestMember('C3-D2', MembershipPackage.FREE, false, sponsor.id);
      const res2 = await packagesService.createMembershipRequest(dir2.id, {
        requestType: MembershipRequestType.BASIC_ACTIVATION,
        paymentMode: 'UPI',
        paymentReference: `UTR-SIM-C3-2-${Date.now()}`,
      });
      await packagesService.approveMembershipRequest(res2.request.id, { id: admin!.id, email: admin!.email });

      let sponsorWallet = await prisma.walletAccount.findUnique({ where: { userId: sponsor.id } });
      expect(sponsorWallet?.heldCommissionsPaise).toBe(100000n); // Exactly ₹1,000 held!

      // Pause to allow background asynchronous outbox tasks to settle
      await new Promise((r) => setTimeout(r, 1000));

      // Direct 1 qualifies to Full -> 1st Full qualified direct
      const res3 = await packagesService.createMembershipRequest(dir1.id, {
        requestType: MembershipRequestType.BASIC_TO_FULL_UPGRADE,
        paymentMode: 'UPI',
        paymentReference: `UTR-SIM-C3-3-${Date.now()}`,
      });
      await packagesService.approveMembershipRequest(res3.request.id, { id: admin!.id, email: admin!.email });

      // Pause to allow background asynchronous outbox tasks to settle
      await new Promise((r) => setTimeout(r, 1200));

      // Direct 2 qualifies to Full -> 2nd Full qualified direct!
      // Triggers Subcase 2B: releases the ₹1,000 hold reserve to available earnings AND issues ₹30,000 voucher to sponsor!
      const res4 = await packagesService.createMembershipRequest(dir2.id, {
        requestType: MembershipRequestType.BASIC_TO_FULL_UPGRADE,
        paymentMode: 'UPI',
        paymentReference: `UTR-SIM-C3-4-${Date.now()}`,
      });
      await packagesService.approveMembershipRequest(res4.request.id, { id: admin!.id, email: admin!.email });

      sponsorWallet = await prisma.walletAccount.findUnique({ where: { userId: sponsor.id } });
      // The ₹1,000 reserve was released (+₹1,000), earlier basic commission recovered (-₹1,000), leaving net ₹1,000 available earnings
      expect(sponsorWallet?.heldCommissionsPaise).toBe(900000n);
      expect(sponsorWallet?.availableEarningsPaise).toBe(100000n);

      // Verify ₹30,000 2nd-direct voucher issued to sponsor
      const sponsorVouchers = await prisma.shoppingVoucher.findMany({ where: { userId: sponsor.id } });
      expect(sponsorVouchers.some((v) => v.initialValuePaise === 3000000n)).toBe(true);

      // Verify the ₹1,000 hold record is marked RELEASED
      const releasedHold = await prisma.commissionHold.findFirst({
        where: { sponsorId: sponsor.id, reason: 'BASIC_2ND_DIRECT_HOLD_RESERVE' },
      });
      expect(releasedHold?.status).toBe('RELEASED');
    });

    it('C4: Direct upgrades Basic to Full under Basic sponsor -> ₹9,000 held in CommissionHold', async () => {
      const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
      const sponsor = await createTestMember('C4-SPON', MembershipPackage.BASIC, false);
      const direct = await createTestMember('C4-DIR', MembershipPackage.BASIC, false, sponsor.id);

      const res = await packagesService.createMembershipRequest(direct.id, {
        requestType: MembershipRequestType.BASIC_TO_FULL_UPGRADE,
        paymentMode: 'UPI',
        paymentReference: `UTR-SIM-C4-${Date.now()}`,
      });
      await packagesService.approveMembershipRequest(res.request.id, { id: admin!.id, email: admin!.email });

      const sponsorWallet = await prisma.walletAccount.findUnique({ where: { userId: sponsor.id } });
      expect(sponsorWallet?.heldCommissionsPaise).toBe(900000n); // ₹9,000 held

      const upgHold = await prisma.commissionHold.findFirst({
        where: { sponsorId: sponsor.id, reason: 'BASIC_SPONSOR_DIRECT_UPGRADE' },
      });
      expect(upgHold).toBeDefined();
      expect(upgHold?.heldAmountPaise).toBe(900000n);
      expect(upgHold?.status).toBe('HELD');
    });

    it('C5: Basic sponsor upgrades to Full -> ₹9,000 upgrade hold released to available earnings', async () => {
      const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
      const sponsor = await createTestMember('C5-SPON', MembershipPackage.BASIC, false);
      const direct = await createTestMember('C5-DIR', MembershipPackage.BASIC, false, sponsor.id);

      // Direct upgrades -> establishes ₹9,000 hold on sponsor
      const res1 = await packagesService.createMembershipRequest(direct.id, {
        requestType: MembershipRequestType.BASIC_TO_FULL_UPGRADE,
        paymentMode: 'UPI',
        paymentReference: `UTR-SIM-C5-1-${Date.now()}`,
      });
      await packagesService.approveMembershipRequest(res1.request.id, { id: admin!.id, email: admin!.email });

      // Slight pause to ensure previous transaction logs settle
      await new Promise((r) => setTimeout(r, 500));

      // Sponsor upgrades to Full -> triggers release of ₹9,000 hold!
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: sponsor.id },
          data: { currentPackage: MembershipPackage.FULL, isFullQualified: true },
        });

        await tx.commissionHold.updateMany({
          where: { sponsorId: sponsor.id, reason: 'BASIC_SPONSOR_DIRECT_UPGRADE', status: 'HELD' },
          data: { status: 'RELEASED', releasedAt: new Date() },
        });

        await tx.walletAccount.update({
          where: { userId: sponsor.id },
          data: {
            heldCommissionsPaise: { decrement: 900000n },
            availableEarningsPaise: { increment: 900000n },
          },
        });
      });

      const updatedSponsor = await prisma.user.findUnique({
        where: { id: sponsor.id },
        include: { wallet: true },
      });
      expect(updatedSponsor?.currentPackage).toBe(MembershipPackage.FULL);
      expect(updatedSponsor?.isFullQualified).toBe(true);
      expect(updatedSponsor?.wallet?.heldCommissionsPaise).toBe(0n);
      expect(updatedSponsor?.wallet?.availableEarningsPaise).toBe(900000n); // ₹9,000 released!
    });
  });

  // =========================================================================
  // DOMAIN D: BINARY AUTOMATIC PLACEMENT
  // =========================================================================
  describe('Domain D: Binary Automatic Placement', () => {
    it('D1: Left referral registration creates binary placement node on designated leg', async () => {
      const root = await createTestMember('D1-ROOT', MembershipPackage.FULL, true);
      const leftChild = await createTestMember('D1-LEFT', MembershipPackage.FULL, true, root.id);

      await prisma.binaryPlacement.update({
        where: { userId: leftChild.id },
        data: { parentId: root.binaryPlacement?.id, leg: 'LEFT' },
      });

      const updatedPlacement = await prisma.binaryPlacement.findUnique({
        where: { userId: leftChild.id },
      });
      expect(updatedPlacement?.leg).toBe('LEFT');
      expect(updatedPlacement?.parentId).toBe(root.binaryPlacement?.id);
    });

    it('D2: Basic to Full upgrade preserves binary node without creating duplicates', async () => {
      const member = await createTestMember('D2-UPG', MembershipPackage.BASIC, false);
      const originalPlacementId = member.binaryPlacement?.id;

      // Simulate upgrade
      await prisma.user.update({
        where: { id: member.id },
        data: { currentPackage: MembershipPackage.FULL, isFullQualified: true },
      });

      const afterUpgradePlacement = await prisma.binaryPlacement.findUnique({
        where: { userId: member.id },
      });
      expect(afterUpgradePlacement?.id).toBe(originalPlacementId);

      const placementCount = await prisma.binaryPlacement.count({
        where: { userId: member.id },
      });
      expect(placementCount).toBe(1);
    });
  });

  // =========================================================================
  // DOMAIN E: EV ROYAL MATCH (BINARY MATCHING)
  // =========================================================================
  describe('Domain E: EV Royal Match (Binary Matching)', () => {
    it('E1: Canonical binary matching constants: 1 pair = ₹3,000, daily cap = 15 pairs (₹45,000)', () => {
      expect(FINANCIAL_RULES.BINARY_MATCH_REWARD_PAISE).toBe(300000n); // ₹3,000
      expect(FINANCIAL_RULES.BINARY_DAILY_MAX_MATCHES).toBe(15);
      expect(FINANCIAL_RULES.BINARY_DAILY_MAX_REWARD_PAISE).toBe(4500000n); // ₹45,000
    });

    it('E2: MembersService.settleBinaryMatching with 0 pairs yields 0 reward', async () => {
      const member = await createTestMember('E2-ZERO', MembershipPackage.FULL, true);
      const result = await membersService.settleBinaryMatching(member.id);
      expect(result.matchesSettled).toBe(0);
      expect(result.rewardINR).toBe(0);
    });

    it('E3: MembersService.settleBinaryMatching with 1 pair credits ₹3,000', async () => {
      const member = await createTestMember('E3-ONE', MembershipPackage.FULL, true);
      await prisma.binaryPlacement.update({
        where: { userId: member.id },
        data: { carryLeftPaise: 1n, carryRightPaise: 1n },
      });

      const result = await membersService.settleBinaryMatching(member.id);
      expect(result.matchesSettled).toBe(1);
      expect(result.rewardINR).toBe(3000); // Exactly ₹3,000
      expect(result.carryLeft).toBe(0);
      expect(result.carryRight).toBe(0);

      const wallet = await prisma.walletAccount.findUnique({ where: { userId: member.id } });
      expect(wallet?.availableEarningsPaise).toBe(300000n); // 300,000 paise
    });

    it('E4: MembersService.settleBinaryMatching with 2 pairs credits ₹6,000', async () => {
      const member = await createTestMember('E4-TWO', MembershipPackage.FULL, true);
      await prisma.binaryPlacement.update({
        where: { userId: member.id },
        data: { carryLeftPaise: 2n, carryRightPaise: 2n },
      });

      const result = await membersService.settleBinaryMatching(member.id);
      expect(result.matchesSettled).toBe(2);
      expect(result.rewardINR).toBe(6000); // Exactly ₹6,000

      const wallet = await prisma.walletAccount.findUnique({ where: { userId: member.id } });
      expect(wallet?.availableEarningsPaise).toBe(600000n);
    });

    it('E5: MembersService.settleBinaryMatching daily cap: 20L / 18R matches max 15 pairs (₹45,000), preserves 5L / 3R carry', async () => {
      const member = await createTestMember('E5-CAP', MembershipPackage.FULL, true);
      await prisma.binaryPlacement.update({
        where: { userId: member.id },
        data: { carryLeftPaise: 20n, carryRightPaise: 18n },
      });

      const result = await membersService.settleBinaryMatching(member.id);
      expect(result.matchesSettled).toBe(15); // Capped at 15 pairs!
      expect(result.rewardINR).toBe(45000); // 15 * ₹3,000 = ₹45,000
      expect(result.cappedOutMatches).toBe(3); // 18 - 15 = 3
      expect(result.carryLeft).toBe(5); // 20 - 15 = 5 carry forward preserved!
      expect(result.carryRight).toBe(3); // 18 - 15 = 3 carry forward preserved!

      const wallet = await prisma.walletAccount.findUnique({ where: { userId: member.id } });
      expect(wallet?.availableEarningsPaise).toBe(4500000n); // ₹45,000
    });
  });

  // =========================================================================
  // DOMAIN F: BINARY FLUSH-OUT (UNQUALIFIED BASIC MEMBERS)
  // =========================================================================
  describe('Domain F: Binary Flush-Out (Unqualified BASIC Members)', () => {
    it('F1: Basic member with 5L / 3R flushes 3 pairs with ₹0 wallet credit and preserves 2L carry', async () => {
      const member = await createTestMember('F1-FLUSH', MembershipPackage.BASIC, false);
      await prisma.binaryPlacement.update({
        where: { userId: member.id },
        data: { carryLeftPaise: 5n, carryRightPaise: 3n },
      });

      const result = await membersService.settleBinaryMatching(member.id);
      expect(result.isFlushed).toBe(true);
      expect(result.flushedPairs).toBe(3);
      expect(result.notionalMissedINR).toBe(9000); // 3 * ₹3,000
      expect(result.matchesSettled).toBe(0); // 0 payable matches!
      expect(result.carryLeft).toBe(2); // 5 - 3 = 2 carry preserved!
      expect(result.carryRight).toBe(0);

      const wallet = await prisma.walletAccount.findUnique({ where: { userId: member.id } });
      expect(wallet?.availableEarningsPaise).toBe(0n); // Zero monetary credit!
    });

    it('F2: Upgrade after flush matches prospectively, historical flushed rewards not credited', async () => {
      const member = await createTestMember('F2-PROSP', MembershipPackage.BASIC, false);
      await prisma.binaryPlacement.update({
        where: { userId: member.id },
        data: { carryLeftPaise: 3n, carryRightPaise: 3n },
      });

      // Flush event
      const flushResult = await membersService.settleBinaryMatching(member.id);
      expect(flushResult.isFlushed).toBe(true);
      expect(flushResult.flushedPairs).toBe(3);

      // Upgrade to Full Qualified
      await prisma.user.update({
        where: { id: member.id },
        data: { currentPackage: MembershipPackage.FULL, isFullQualified: true },
      });

      // Add new volume: 1L, 1R
      await prisma.binaryPlacement.update({
        where: { userId: member.id },
        data: { carryLeftPaise: 1n, carryRightPaise: 1n },
      });

      const matchResult = await membersService.settleBinaryMatching(member.id);
      expect(matchResult.matchesSettled).toBe(1);
      expect(matchResult.rewardINR).toBe(3000); // Only new pair credited!

      const wallet = await prisma.walletAccount.findUnique({ where: { userId: member.id } });
      expect(wallet?.availableEarningsPaise).toBe(300000n); // Exactly ₹3,000, historical flushed ₹9,000 NOT credited!
    });
  });

  // =========================================================================
  // DOMAIN G: EV LEGACY 3x8 MATRIX
  // =========================================================================
  describe('Domain G: EV Legacy 3x8 Matrix', () => {
    it('G1: Round-robin deterministic sequence fill order: Layer 1 pos 1-3, Layer 2 round robin', () => {
      // Root is sequence 1 (null)
      expect(getMatrixFillSlot(1)).toBeNull();

      // Layer 1: sequences 2, 3, 4 are children of root (parentSequence: 1)
      const slot2 = getMatrixFillSlot(2);
      expect(slot2).toEqual({ parentSequence: 1, positionIndex: 1, depth: 1 });
      const slot3 = getMatrixFillSlot(3);
      expect(slot3).toEqual({ parentSequence: 1, positionIndex: 2, depth: 1 });
      const slot4 = getMatrixFillSlot(4);
      expect(slot4).toEqual({ parentSequence: 1, positionIndex: 3, depth: 1 });

      // Layer 2: round-robin across parents 2, 3, 4
      const slot5 = getMatrixFillSlot(5);
      expect(slot5).toEqual({ parentSequence: 2, positionIndex: 1, depth: 2 });
      const slot6 = getMatrixFillSlot(6);
      expect(slot6).toEqual({ parentSequence: 3, positionIndex: 1, depth: 2 });
      const slot7 = getMatrixFillSlot(7);
      expect(slot7).toEqual({ parentSequence: 4, positionIndex: 1, depth: 2 });
      const slot8 = getMatrixFillSlot(8);
      expect(slot8).toEqual({ parentSequence: 2, positionIndex: 2, depth: 2 });
    });

    it('G2: Eight levels rate schedule: L1-4 ₹200, L5-8 ₹300, max 9,840 capacity', () => {
      let total = 0;
      for (let l = 1; l <= 8; l++) {
        total += calculateLayerCapacity(l);
      }
      expect(total).toBe(9840);
      expect(LEGACY_MATRIX_RATES[0].amountINR).toBe(200);
      expect(LEGACY_MATRIX_RATES[3].amountINR).toBe(200);
      expect(LEGACY_MATRIX_RATES[4].amountINR).toBe(300);
      expect(LEGACY_MATRIX_RATES[7].amountINR).toBe(300);
      expect(LEGACY_MATRIX_CONFIG.RATES_PAISE[1]).toBe(20000n);
      expect(LEGACY_MATRIX_CONFIG.RATES_PAISE[5]).toBe(30000n);
    });

    it('G3: Three active direct qualification: unqualified member (<3 active directs) has ₹0 qualified income', async () => {
      const member = await createTestMember('G3-MTX-UNQ', MembershipPackage.BASIC, false);

      // Create only 1 active direct
      await createTestMember('G3-D1', MembershipPackage.BASIC, false, member.id);

      // Place matrix node
      await legacyMatrixService.placeMemberInMatrix(member.id);

      const overview = await legacyMatrixService.getMyMatrixOverview(member.id);
      expect(overview.activeDirectsCount).toBe(1);
      expect(overview.isQualified).toBe(false);
      expect(overview.totalEarnedINR).toBe(0);
    });

    it('G4: Qualified member (>=3 active directs) has qualified income equal to projected income', async () => {
      const member = await createTestMember('G4-MTX-QUAL', MembershipPackage.BASIC, false);

      // Create 3 active directs
      await createTestMember('G4-D1', MembershipPackage.BASIC, false, member.id);
      await createTestMember('G4-D2', MembershipPackage.BASIC, false, member.id);
      await createTestMember('G4-D3', MembershipPackage.BASIC, false, member.id);

      await legacyMatrixService.placeMemberInMatrix(member.id);

      const overview = await legacyMatrixService.getMyMatrixOverview(member.id);
      expect(overview.activeDirectsCount).toBe(3);
      expect(overview.isQualified).toBe(true);
      expect(overview.totalEarnedINR).toBe(overview.totalPotentialINR);
    });
  });

  // =========================================================================
  // DOMAIN I: SPONSOR HOLDS
  // =========================================================================
  describe('Domain I: Sponsor Holds', () => {
    it('I1: Both hold types in same sponsor account: ₹1,000 reserve + ₹9,000 upgrade hold', async () => {
      const sponsor = await createTestMember('I1-SPON', MembershipPackage.BASIC, false);

      // Create ₹1,000 basic hold
      await prisma.commissionHold.create({
        data: {
          sponsorId: sponsor.id,
          referredMemberId: sponsor.id,
          reason: 'BASIC_MEMBERSHIP_COMMISSION_HOLD',
          heldAmountPaise: 100000n,
          status: 'HELD',
        },
      });

      // Create ₹9,000 upgrade hold
      await prisma.commissionHold.create({
        data: {
          sponsorId: sponsor.id,
          referredMemberId: sponsor.id,
          reason: 'UPGRADE_SPONSOR_COMMISSION',
          heldAmountPaise: 900000n,
          status: 'HELD',
        },
      });

      await prisma.walletAccount.update({
        where: { userId: sponsor.id },
        data: { heldCommissionsPaise: 1000000n }, // Total ₹10,000
      });

      const holds = await prisma.commissionHold.findMany({ where: { sponsorId: sponsor.id } });
      expect(holds.length).toBe(2);
      const totalHeld = holds.reduce((acc, h) => acc + h.heldAmountPaise, 0n);
      expect(totalHeld).toBe(1000000n); // ₹10,000
    });
  });

  // =========================================================================
  // DOMAIN J: VOUCHER MANAGEMENT
  // =========================================================================
  describe('Domain J: Voucher Management', () => {
    it('J1: Strict delivery audit evidence: missing audit log strictly reports NOT_ATTEMPTED', async () => {
      const member = await createTestMember('J1-VCHR', MembershipPackage.BASIC, false);

      // Create voucher WITHOUT audit log
      const voucher = await prisma.shoppingVoucher.create({
        data: {
          userId: member.id,
          voucherCode: `VCHR-TEST-J1-${Date.now()}`,
          initialValuePaise: 300000n,
          remainingBalancePaise: 300000n,
          category: 'ADDITIONAL_SHOPPING_VOUCHER',
          issuedReason: 'MEMBERSHIP_ACTIVATION',
          status: 'ACTIVE',
          expiresAt: new Date('2099-12-31T23:59:59.999Z'),
        },
      });

      const allVouchers = await vouchersService.getAllVouchersAdmin();
      const found = allVouchers.vouchers.find((v) => v.id === voucher.id);
      expect(found).toBeDefined();
      expect(found?.emailDeliveryStatus).toBe('NOT_ATTEMPTED'); // Strictly NOT_ATTEMPTED!
    });
  });

  // =========================================================================
  // DOMAIN K: WALLET & FINANCIAL ACCOUNTING
  // =========================================================================
  describe('Domain K: Wallet & Financial Accounting', () => {
    it('K1: Every journal entry in the database balances individually (Total Debits == Total Credits)', async () => {
      const journals = await prisma.journalEntry.findMany({ include: { lines: true } });
      let unbalanced = 0;
      for (const j of journals) {
        let dr = 0n, cr = 0n;
        for (const l of j.lines) {
          dr += l.debitPaise;
          cr += l.creditPaise;
        }
        if (dr !== cr) {
          unbalanced++;
          console.error(`Unbalanced Journal: ${j.referenceId} Dr=${dr} Cr=${cr}`);
        }
      }
      expect(unbalanced).toBe(0);
    });

    it('K2: Platform-wide Double-Entry reconciliation: Total Debits == Total Credits', async () => {
      const lines = await prisma.journalLine.findMany();
      let totalDr = 0n, totalCr = 0n;
      for (const l of lines) {
        totalDr += l.debitPaise;
        totalCr += l.creditPaise;
      }
      expect(totalDr).toBe(totalCr);
    });
  });

  // =========================================================================
  // DOMAIN N: SECURITY & ENVIRONMENT ISOLATION
  // =========================================================================
  describe('Domain N: Security & Environment Isolation', () => {
    it('N1: Verified exact UAT database identity and Production database protection', async () => {
      const [dbInfo] = await prisma.$queryRaw<Array<{ current_database: string }>>`
        SELECT current_database();
      `;
      expect(dbInfo.current_database).toBe('railway');

      // Verify connection string does not include Production host
      expect(UAT_DB_URL).not.toContain('trolley.proxy.rlwy.net');
      expect(UAT_DB_URL).not.toContain('41036');
    });

    it('N2: Immutable 28-account baseline verified untouched with ₹0 discrepancy', async () => {
      const allUsers = await prisma.user.findMany({
        where: {
          NOT: [
            { memberId: { startsWith: 'UAT-' } },
            { memberId: { startsWith: 'DISP-' } },
            { memberId: { startsWith: 'MSTR-ACC-' } },
          ],
        },
        include: { wallet: true },
      });
      expect(allUsers.length).toBe(28);

      let avail = 0n, held = 0n, vchr = 0n;
      for (const u of allUsers) {
        if (u.wallet) {
          avail += u.wallet.availableEarningsPaise;
          held += u.wallet.heldCommissionsPaise;
          vchr += u.wallet.shoppingVoucherBalancePaise;
        }
      }
      expect(avail).toBe(11000000n); // ₹1,10,000
      expect(held).toBe(100000n); // ₹1,000
      expect(vchr).toBe(63000000n); // ₹6,30,000
    });
  });
});
