import { BadRequestException } from '@nestjs/common';
import { describe, it, expect, beforeEach } from 'vitest';
import { MembershipRequestStatus } from '@prisma/client';
import { MembershipPackage, MembershipRequestType } from '@askrev/shared';
import { PackagesService } from './packages.service';

interface MockState {
  users: Map<string, any>;
  wallets: Map<string, any>;
  requests: Map<string, any>;
  holds: any[];
  recoveries: any[];
  vouchers: any[];
  qualificationEvents: any[];
  journals: any[];
  auditLogs: any[];
}

function createStatefulMockPrisma() {
  const state: MockState = {
    users: new Map(),
    wallets: new Map(),
    requests: new Map(),
    holds: [],
    recoveries: [],
    vouchers: [],
    qualificationEvents: [],
    journals: [],
    auditLogs: [],
  };

  let seq = 1;
  const nextId = (prefix: string) => `${prefix}-${seq++}`;

  const addUser = (data: {
    id: string;
    memberId: string;
    fullName: string;
    sponsorId?: string | null;
    currentPackage?: string;
    isFullQualified?: boolean;
  }) => {
    const user = {
      id: data.id,
      memberId: data.memberId,
      fullName: data.fullName,
      sponsorId: data.sponsorId ?? null,
      currentPackage: data.currentPackage ?? MembershipPackage.FREE,
      isFullQualified: data.isFullQualified ?? false,
      qualificationMethod: null,
      qualificationDate: null,
      role: data.isFullQualified ? 'MEMBER' : 'FREE_USER',
    };
    state.users.set(user.id, user);
    state.wallets.set(user.id, {
      id: nextId('wal'),
      userId: user.id,
      availableEarningsPaise: 0n,
      heldCommissionsPaise: 0n,
      pendingRecoveryPaise: 0n,
      shoppingVoucherBalancePaise: 0n,
      totalEarnedPaise: 0n,
      totalWithdrawnPaise: 0n,
    });
    return user;
  };

  const applyDelta = (current: bigint, op: any) => {
    if (op && typeof op === 'object' && 'increment' in op) return current + BigInt(op.increment);
    if (op && typeof op === 'object' && 'decrement' in op) return current - BigInt(op.decrement);
    return current;
  };

  const txClient: any = {
    $queryRaw: async (strings: TemplateStringsArray, ...values: any[]) => {
      const sql = strings.join(' ');
      if (sql.includes('"MembershipRequest"')) {
        const req = state.requests.get(values[0]);
        return req ? [{ id: req.id, status: req.status }] : [];
      }
      if (sql.includes('"User"')) {
        const user = state.users.get(values[0]);
        return user ? [{ id: user.id }] : [];
      }
      return [];
    },
    user: {
      findUnique: async ({ where }: any) => {
        const u = state.users.get(where.id);
        return u ? { ...u, wallet: state.wallets.get(u.id) ?? null } : null;
      },
      update: async ({ where, data }: any) => {
        const u = state.users.get(where.id);
        Object.assign(u, data);
        return u;
      },
      count: async ({ where }: any) => {
        let c = 0;
        for (const u of state.users.values()) {
          if (where.sponsorId && u.sponsorId !== where.sponsorId) continue;
          if (where.isFullQualified !== undefined && u.isFullQualified !== where.isFullQualified) continue;
          if (where.id?.not && u.id === where.id.not) continue;
          c++;
        }
        return c;
      },
    },
    walletAccount: {
      findUnique: async ({ where }: any) => {
        const w = state.wallets.get(where.userId);
        return w ? { ...w } : null;
      },
      create: async ({ data }: any) => {
        const w = {
          id: nextId('wal'),
          userId: data.userId,
          availableEarningsPaise: 0n,
          heldCommissionsPaise: 0n,
          pendingRecoveryPaise: 0n,
          shoppingVoucherBalancePaise: 0n,
          totalEarnedPaise: 0n,
          totalWithdrawnPaise: 0n,
        };
        state.wallets.set(data.userId, w);
        return w;
      },
      update: async ({ where, data }: any) => {
        const w = state.wallets.get(where.userId);
        for (const field of [
          'availableEarningsPaise',
          'heldCommissionsPaise',
          'pendingRecoveryPaise',
          'shoppingVoucherBalancePaise',
          'totalEarnedPaise',
          'totalWithdrawnPaise',
        ]) {
          if (data[field] !== undefined) {
            w[field] = applyDelta(w[field], data[field]);
          }
        }
        return { ...w };
      },
    },
    membershipRequest: {
      findUnique: async ({ where }: any) => {
        const r = state.requests.get(where.id);
        if (!r) return null;
        const u = state.users.get(r.userId);
        const sponsor = u?.sponsorId ? state.users.get(u.sponsorId) : null;
        return {
          ...r,
          user: u
            ? {
                ...u,
                wallet: state.wallets.get(u.id) ?? null,
                sponsor: sponsor ? { ...sponsor, wallet: state.wallets.get(sponsor.id) ?? null } : null,
              }
            : null,
        };
      },
      findFirst: async ({ where }: any) => {
        for (const r of state.requests.values()) {
          if (where.userId && r.userId !== where.userId) continue;
          if (where.status && r.status !== where.status) continue;
          return { ...r };
        }
        return null;
      },
      findMany: async ({ where, distinct }: any) => {
        const matched: any[] = [];
        const seen = new Set<string>();
        for (const r of state.requests.values()) {
          if (where.requestType && r.requestType !== where.requestType) continue;
          if (where.status && r.status !== where.status) continue;
          if (where.id?.not && r.id === where.id.not) continue;
          if (where.userId?.not && r.userId === where.userId.not) continue;
          if (where.user?.sponsorId) {
            const u = state.users.get(r.userId);
            if (!u || u.sponsorId !== where.user.sponsorId) continue;
          }
          if (distinct?.includes('userId')) {
            if (seen.has(r.userId)) continue;
            seen.add(r.userId);
          }
          matched.push({ userId: r.userId });
        }
        return matched;
      },
      create: async ({ data }: any) => {
        const req = {
          id: nextId('req'),
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        state.requests.set(req.id, req);
        return req;
      },
      update: async ({ where, data }: any) => {
        const r = state.requests.get(where.id);
        Object.assign(r, data, { updatedAt: new Date() });
        return { ...r };
      },
    },
    commissionHold: {
      create: async ({ data }: any) => {
        const h = { id: nextId('hold'), createdAt: new Date(), ...data };
        state.holds.push(h);
        return h;
      },
      findFirst: async ({ where }: any) => {
        return state.holds.find((h) => h.sponsorId === where.sponsorId && h.status === where.status) ?? null;
      },
      update: async ({ where, data }: any) => {
        const h = state.holds.find((x) => x.id === where.id);
        Object.assign(h, data);
        return h;
      },
    },
    pendingRecovery: {
      create: async ({ data }: any) => {
        const rec = { id: nextId('rec'), recoveredPaise: 0n, createdAt: new Date(), ...data };
        state.recoveries.push(rec);
        return rec;
      },
    },
    shoppingVoucher: {
      create: async ({ data }: any) => {
        const v = { id: nextId('vchr'), createdAt: new Date(), ...data };
        state.vouchers.push(v);
        return v;
      },
    },
    qualificationEvent: {
      create: async ({ data }: any) => {
        const qe = { id: nextId('qe'), createdAt: new Date(), ...data };
        state.qualificationEvents.push(qe);
        return qe;
      },
    },
    journalEntry: {
      findFirst: async ({ where }: any) => {
        const refs: string[] = where.referenceId?.in ?? [];
        return state.journals.find((j) => refs.includes(j.referenceId)) ?? null;
      },
      create: async ({ data }: any) => {
        if (state.journals.some((j) => j.referenceId === data.referenceId)) {
          throw new Error(`Unique constraint failed on referenceId: ${data.referenceId}`);
        }
        const entry = {
          id: nextId('jnl'),
          referenceId: data.referenceId,
          eventType: data.eventType,
          narration: data.narration,
          lines: data.lines.create.map((l: any) => ({ ...l })),
        };
        state.journals.push(entry);
        return entry;
      },
    },
    binaryPlacement: {
      findUnique: async () => null,
    },
    auditLog: {
      create: async ({ data }: any) => {
        const log = { id: nextId('aud'), ...data };
        state.auditLogs.push(log);
        return log;
      },
    },
  };

  const prismaMock: any = {
    $transaction: async (fn: (tx: any) => Promise<any>) => fn(txClient),
  };

  return { prismaMock, state, addUser };
}

describe('PackagesService — Basic & Full Sponsor Commission Settlement', () => {
  let service: PackagesService;
  let mock: ReturnType<typeof createStatefulMockPrisma>;

  beforeEach(() => {
    mock = createStatefulMockPrisma();
    service = new PackagesService(mock.prismaMock);
  });

  async function submitAndApprove(userId: string, requestType: MembershipRequestType) {
    const { request } = await service.createMembershipRequest(userId, { requestType });
    return service.approveMembershipRequest(request.id, 'admin-1', { adminNotes: 'Approved' });
  }

  it('releases 1st Basic (₹1,000), holds 2nd Basic (₹1,000), and releases 3rd+ Basic (₹1,000) with balanced journals', async () => {
    mock.addUser({
      id: 'sponsor',
      memberId: 'ASKR-ADMIN-01',
      fullName: 'Root Sponsor',
      currentPackage: MembershipPackage.FULL,
      isFullQualified: true,
    });
    mock.addUser({ id: 'm1', memberId: 'ASKR-1', fullName: 'Basic One', sponsorId: 'sponsor' });
    mock.addUser({ id: 'm2', memberId: 'ASKR-2', fullName: 'Basic Two', sponsorId: 'sponsor' });
    mock.addUser({ id: 'm3', memberId: 'ASKR-3', fullName: 'Basic Three', sponsorId: 'sponsor' });

    const r1 = await submitAndApprove('m1', MembershipRequestType.BASIC_ACTIVATION);
    expect(r1.sponsorSettlement?.action).toBe('COMMISSION_RELEASED_TO_WALLET');
    expect(r1.sponsorSettlement?.amountINR).toBe(1000);
    let w = mock.state.wallets.get('sponsor');
    expect(w.availableEarningsPaise).toBe(100000n);
    expect(w.heldCommissionsPaise).toBe(0n);

    const r2 = await submitAndApprove('m2', MembershipRequestType.BASIC_ACTIVATION);
    expect(r2.sponsorSettlement?.action).toBe('COMMISSION_HELD');
    expect(r2.sponsorSettlement?.amountINR).toBe(1000);
    w = mock.state.wallets.get('sponsor');
    expect(w.availableEarningsPaise).toBe(100000n);
    expect(w.heldCommissionsPaise).toBe(100000n);

    const r3 = await submitAndApprove('m3', MembershipRequestType.BASIC_ACTIVATION);
    expect(r3.sponsorSettlement?.action).toBe('COMMISSION_RELEASED_TO_WALLET');
    w = mock.state.wallets.get('sponsor');
    expect(w.availableEarningsPaise).toBe(200000n);
    expect(w.heldCommissionsPaise).toBe(100000n);

    for (const j of mock.state.journals) {
      const dr = j.lines.reduce((s: bigint, l: any) => s + l.debitPaise, 0n);
      const cr = j.lines.reduce((s: bigint, l: any) => s + l.creditPaise, 0n);
      expect(dr).toBe(cr);
    }
  });

  it('preserves historical Basic activation order even after 1st Basic upgrades to Full prior to 2nd Basic joining', async () => {
    mock.addUser({
      id: 'sponsor',
      memberId: 'ASKR-ADMIN-01',
      fullName: 'Root Sponsor',
      currentPackage: MembershipPackage.FULL,
      isFullQualified: true,
    });
    mock.addUser({ id: 'm1', memberId: 'ASKR-1', fullName: 'Test 01', sponsorId: 'sponsor' });
    mock.addUser({ id: 'm2', memberId: 'ASKR-2', fullName: 'Test 02', sponsorId: 'sponsor' });
    mock.addUser({ id: 'm3', memberId: 'ASKR-3', fullName: 'Test 03', sponsorId: 'sponsor' });

    // 1st Basic -> ₹1,000 Released
    await submitAndApprove('m1', MembershipRequestType.BASIC_ACTIVATION);
    expect(mock.state.wallets.get('sponsor').availableEarningsPaise).toBe(100000n);

    // 1st Basic upgrades to Full -> 1st Full Qualified (+₹9,000 = ₹10,000 total entitlement)
    const upg1 = await submitAndApprove('m1', MembershipRequestType.BASIC_TO_FULL_UPGRADE);
    expect(upg1.sponsorSettlement?.netCreditedINR).toBe(9000);
    expect(mock.state.wallets.get('sponsor').availableEarningsPaise).toBe(1000000n);
    expect(mock.state.wallets.get('sponsor').heldCommissionsPaise).toBe(0n);

    // 2nd Basic joins AFTER m1 upgraded -> must still be treated as 2nd Basic direct (HELD)
    const r2 = await submitAndApprove('m2', MembershipRequestType.BASIC_ACTIVATION);
    expect(r2.sponsorSettlement?.action).toBe('COMMISSION_HELD');
    expect(mock.state.wallets.get('sponsor').heldCommissionsPaise).toBe(100000n);

    // 3rd Basic joins -> RELEASED
    const r3 = await submitAndApprove('m3', MembershipRequestType.BASIC_ACTIVATION);
    expect(r3.sponsorSettlement?.action).toBe('COMMISSION_RELEASED_TO_WALLET');
    expect(mock.state.wallets.get('sponsor').availableEarningsPaise).toBe(1100000n);

    // m3 upgrades as 2nd Full -> ₹30,000 voucher + m2 hold released + m3 Basic ₹1,000 recovered
    const upg2 = await submitAndApprove('m3', MembershipRequestType.BASIC_TO_FULL_UPGRADE);
    expect(upg2.sponsorSettlement?.action).toBe('SECOND_QUALIFIED_DIRECT_RECONCILIATION');
    expect(upg2.sponsorSettlement?.voucherIssuedINR).toBe(30000);
    expect(upg2.sponsorSettlement?.holdReleasedINR).toBe(1000);
    expect(upg2.sponsorSettlement?.recoveredINR).toBe(1000);

    const w = mock.state.wallets.get('sponsor');
    expect(w.availableEarningsPaise).toBe(1100000n); // ₹10,000 from m1 + ₹1,000 remaining from m2
    expect(w.heldCommissionsPaise).toBe(0n);
    expect(w.pendingRecoveryPaise).toBe(0n);
    expect(w.shoppingVoucherBalancePaise).toBe(3000000n);
  });

  it('blocks duplicate admin approval cleanly without duplicate commission', async () => {
    mock.addUser({
      id: 'sponsor',
      memberId: 'ASKR-ADMIN-01',
      fullName: 'Root Sponsor',
      currentPackage: MembershipPackage.FULL,
      isFullQualified: true,
    });
    mock.addUser({ id: 'm1', memberId: 'ASKR-1', fullName: 'Test 01', sponsorId: 'sponsor' });

    const { request } = await service.createMembershipRequest('m1', {
      requestType: MembershipRequestType.BASIC_ACTIVATION,
    });
    await service.approveMembershipRequest(request.id, 'admin-1', {});

    await expect(service.approveMembershipRequest(request.id, 'admin-1', {})).rejects.toThrow(
      BadRequestException
    );
    expect(mock.state.wallets.get('sponsor').availableEarningsPaise).toBe(100000n);
    expect(
      mock.state.requests.get(request.id).status === MembershipRequestStatus.APPROVED
    ).toBe(true);
  });
});
