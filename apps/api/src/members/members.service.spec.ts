import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { describe, it, expect, beforeEach } from 'vitest';
import { BinaryLeg, MembershipPackage, UserRole } from '@askrev/shared';
import { MembersService } from './members.service';

interface MemberMockState {
  users: Map<string, any>;
  placements: Map<string, any>;
  wallets: Map<string, any>;
  journals: any[];
  matchEvents: any[];
  auditLogs: any[];
}

function createMembersMockPrisma() {
  const state: MemberMockState = {
    users: new Map(),
    placements: new Map(),
    wallets: new Map(),
    journals: [],
    matchEvents: [],
    auditLogs: [],
  };

  let seq = 1;
  const nextId = (prefix: string) => `${prefix}-${seq++}`;

  const addUser = (data: {
    id: string;
    memberId: string;
    fullName: string;
    role?: string;
    currentPackage?: string;
    isFullQualified?: boolean;
    sponsorId?: string | null;
  }) => {
    const user = {
      id: data.id,
      memberId: data.memberId,
      fullName: data.fullName,
      email: `${data.memberId.toLowerCase()}@test.local`,
      phone: '9999999999',
      role: data.role ?? UserRole.MEMBER,
      currentPackage: data.currentPackage ?? MembershipPackage.FREE,
      isFullQualified: data.isFullQualified ?? false,
      sponsorId: data.sponsorId ?? null,
      qualificationDate: data.isFullQualified ? new Date() : null,
      createdAt: new Date(),
    };
    state.users.set(user.id, user);
    state.placements.set(user.id, {
      id: `bp-${user.id}`,
      userId: user.id,
      parentId: null,
      leg: null,
      leftCount: 0,
      rightCount: 0,
      leftVolumePaise: 0n,
      rightVolumePaise: 0n,
      carryLeftPaise: 0n,
      carryRightPaise: 0n,
      matchedVolumeLeftPaise: 0n,
      matchedVolumeRightPaise: 0n,
      totalMatchesConsumed: 0,
      totalRewardEarnedPaise: 0n,
      lastMatchDate: null,
      dailyMatchesCount: 0,
    });
    state.wallets.set(user.id, {
      userId: user.id,
      availableEarningsPaise: 0n,
      heldCommissionsPaise: 0n,
      pendingRecoveryPaise: 0n,
      shoppingVoucherBalancePaise: 0n,
      totalEarnedPaise: 0n,
    });
    return user;
  };

  const applyInc = (obj: any, data: Record<string, any>) => {
    for (const [k, v] of Object.entries(data)) {
      if (v && typeof v === 'object' && 'increment' in v) {
        obj[k] = typeof obj[k] === 'bigint' ? obj[k] + BigInt(v.increment) : obj[k] + Number(v.increment);
      } else if (v !== undefined) {
        obj[k] = v;
      }
    }
  };

  const pickFields = (obj: any, select?: any) => {
    if (!obj || !select) return obj;
    const out: any = {};
    for (const [k, v] of Object.entries(select)) {
      if (v === true) out[k] = obj[k];
      else if (k === 'sponsor' && typeof v === 'object' && v !== null) {
        const sp = obj.sponsorId ? state.users.get(obj.sponsorId) : null;
        out.sponsor = sp ? pickFields(sp, (v as any).select) : null;
      } else if (k === 'binaryPlacement' && typeof v === 'object' && v !== null) {
        const bp = state.placements.get(obj.id) || null;
        out.binaryPlacement = bp ? pickFields(bp, (v as any).select) : null;
      }
    }
    return out;
  };

  const tx: any = {
    $queryRaw: async () => [],
    user: {
      findUnique: async ({ where, include, select }: any) => {
        const u = state.users.get(where.id);
        if (!u) return null;
        if (select) return pickFields(u, select);
        const res: any = { ...u };
        if (include?.binaryPlacement) res.binaryPlacement = state.placements.get(u.id) || null;
        if (include?.wallet) res.wallet = state.wallets.get(u.id) || null;
        return res;
      },
      findFirst: async ({ where, select }: any) => {
        for (const u of state.users.values()) {
          if (where?.memberId?.equals && u.memberId.toLowerCase() === where.memberId.equals.toLowerCase()) {
            return select ? pickFields(u, select) : { ...u };
          }
        }
        return null;
      },
      findMany: async ({ where, select }: any) => {
        const rows = Array.from(state.users.values()).filter((u) => {
          if (!where) return true;
          if (where.OR) {
            return where.OR.some((cond: any) => {
              if (cond.role) return u.role === cond.role;
              if (cond.currentPackage?.in) return cond.currentPackage.in.includes(u.currentPackage);
              return true;
            });
          }
          return true;
        });
        return rows.map((u) => (select ? pickFields(u, select) : { ...u }));
      },
    },
    binaryPlacement: {
      findUnique: async ({ where, include, select }: any) => {
        const bp = state.placements.get(where.userId);
        if (!bp) return null;
        if (select) return pickFields(bp, select);
        const res: any = { ...bp };
        if (include?.user) {
          const u = state.users.get(bp.userId);
          res.user = include.user.select ? pickFields(u, include.user.select) : u;
        }
        return res;
      },
      findFirst: async ({ where, include }: any) => {
        for (const bp of state.placements.values()) {
          if (where.parentId !== undefined && bp.parentId !== where.parentId) continue;
          if (where.leg !== undefined && bp.leg !== where.leg) continue;
          const res: any = { ...bp };
          if (include?.user) {
            const u = state.users.get(bp.userId);
            res.user = include.user.select ? pickFields(u, include.user.select) : u;
          }
          return res;
        }
        return null;
      },
      findMany: async ({ where, include, select }: any) => {
        const items: any[] = [];
        for (const bp of state.placements.values()) {
          if (where?.parentId !== undefined) {
            if (typeof where.parentId === 'string' && bp.parentId !== where.parentId) continue;
            if (where.parentId?.in && !where.parentId.in.includes(bp.parentId)) continue;
            if (where.parentId?.not === null && bp.parentId === null) continue;
          }
          if (where?.leg?.not === null && bp.leg === null) continue;
          let row: any = select ? pickFields(bp, select) : { ...bp };
          if (select?.user?.select) {
            row.user = pickFields(state.users.get(bp.userId), select.user.select);
          } else if (include?.user) {
            const u = state.users.get(bp.userId);
            row.user = include.user.select ? pickFields(u, include.user.select) : u;
          }
          items.push(row);
        }
        return items;
      },
      upsert: async ({ where, create, update }: any) => {
        const existing = state.placements.get(where.userId);
        if (existing) {
          applyInc(existing, update);
          return existing;
        }
        const created = { id: nextId('bp'), ...create };
        state.placements.set(where.userId, created);
        return created;
      },
      update: async ({ where, data }: any) => {
        const bp = state.placements.get(where.userId);
        if (!bp) throw new Error(`BinaryPlacement not found for ${where.userId}`);
        applyInc(bp, data);
        return bp;
      },
      create: async ({ data }: any) => {
        const created = {
          id: nextId('bp'),
          parentId: null,
          leg: null,
          leftCount: 0,
          rightCount: 0,
          leftVolumePaise: 0n,
          rightVolumePaise: 0n,
          carryLeftPaise: 0n,
          carryRightPaise: 0n,
          matchedVolumeLeftPaise: 0n,
          matchedVolumeRightPaise: 0n,
          totalMatchesConsumed: 0,
          totalRewardEarnedPaise: 0n,
          lastMatchDate: null,
          dailyMatchesCount: 0,
          ...data,
        };
        state.placements.set(data.userId, created);
        return created;
      },
    },
    walletAccount: {
      create: async ({ data }: any) => {
        const w = {
          userId: data.userId,
          availableEarningsPaise: 0n,
          heldCommissionsPaise: 0n,
          pendingRecoveryPaise: 0n,
          shoppingVoucherBalancePaise: 0n,
          totalEarnedPaise: 0n,
        };
        state.wallets.set(data.userId, w);
        return w;
      },
      update: async ({ where, data }: any) => {
        const w = state.wallets.get(where.userId);
        applyInc(w, data);
        return w;
      },
    },
    journalEntry: {
      create: async ({ data }: any) => {
        const j = {
          id: nextId('jnl'),
          referenceId: data.referenceId,
          eventType: data.eventType,
          narration: data.narration,
          lines: data.lines.create,
        };
        state.journals.push(j);
        return j;
      },
    },
    binaryMatchEvent: {
      findUnique: async ({ where }: any) =>
        state.matchEvents.find((e) => e.idempotencyKey === where.idempotencyKey) || null,
      create: async ({ data }: any) => {
        const ev = { id: nextId('bme'), ...data, createdAt: new Date() };
        state.matchEvents.push(ev);
        return ev;
      },
    },
    auditLog: {
      create: async ({ data }: any) => {
        const log = { id: nextId('aud'), ...data };
        state.auditLogs.push(log);
        return log;
      },
    },
    $transaction: async (cb: (txClient: any) => Promise<any>) => cb(tx),
  };

  return { prisma: tx, state, addUser };
}

describe('MembersService Binary Placement, 1:1 Matching & Subtree Auth', () => {
  let mock: ReturnType<typeof createMembersMockPrisma>;
  let service: MembersService;
  let admin: any;
  let mFull1: any;
  let mFull2: any;
  let mBasic1: any;
  let mBasic2: any;
  let mFree: any;

  beforeEach(() => {
    mock = createMembersMockPrisma();
    service = new MembersService(mock.prisma);
    admin = mock.addUser({
      id: 'u-admin',
      memberId: 'ASKR-ADMIN-01',
      fullName: 'Super Admin',
      role: UserRole.SUPER_ADMIN,
      currentPackage: MembershipPackage.FULL,
      isFullQualified: true,
    });
    mFull1 = mock.addUser({
      id: 'u-f1',
      memberId: 'ASKR-F1',
      fullName: 'Full One',
      currentPackage: MembershipPackage.FULL,
      isFullQualified: true,
      sponsorId: admin.id,
    });
    mFull2 = mock.addUser({
      id: 'u-f2',
      memberId: 'ASKR-F2',
      fullName: 'Full Two',
      currentPackage: MembershipPackage.FULL,
      isFullQualified: true,
      sponsorId: admin.id,
    });
    mBasic1 = mock.addUser({
      id: 'u-b1',
      memberId: 'ASKR-B1',
      fullName: 'Basic One',
      currentPackage: MembershipPackage.BASIC,
      isFullQualified: false,
      sponsorId: admin.id,
    });
    mBasic2 = mock.addUser({
      id: 'u-b2',
      memberId: 'ASKR-B2',
      fullName: 'Basic Two',
      currentPackage: MembershipPackage.BASIC,
      isFullQualified: false,
      sponsorId: admin.id,
    });
    mFree = mock.addUser({
      id: 'u-free',
      memberId: 'ASKR-FREE',
      fullName: 'Free User',
      role: UserRole.FREE_USER,
      currentPackage: MembershipPackage.FREE,
      isFullQualified: false,
      sponsorId: admin.id,
    });
  });

  it('places BASIC and FULL members under separate parent/leg without changing sponsor or wallet, and rejects FREE/duplicate/occupied/cycle', async () => {
    await expect(
      service.placeBinaryNode(admin.id, { userId: mFree.id, parentId: admin.id, leg: BinaryLeg.LEFT })
    ).rejects.toThrow(BadRequestException);

    // Place BASIC under Admin.LEFT -> increments leftCount only, 0 qualified volume
    await service.placeBinaryNode(admin.id, { userId: mBasic1.id, parentId: admin.id, leg: BinaryLeg.LEFT });
    const adminBpAfterBasic = mock.state.placements.get(admin.id);
    expect(adminBpAfterBasic.leftCount).toBe(1);
    expect(adminBpAfterBasic.leftVolumePaise).toBe(0n);

    // Place FULL under mBasic1.LEFT (ancestor chain: mBasic1 -> Admin LEFT)
    await service.placeBinaryNode(admin.id, { userId: mFull1.id, parentId: mBasic1.id, leg: BinaryLeg.LEFT });
    expect(adminBpAfterBasic.leftCount).toBe(2);
    expect(adminBpAfterBasic.leftVolumePaise).toBe(1n);
    expect(mock.state.placements.get(mBasic1.id).leftCount).toBe(1);
    expect(mock.state.placements.get(mBasic1.id).leftVolumePaise).toBe(1n);

    // Sponsor remains admin even when binary parent is mBasic1
    expect(mock.state.users.get(mFull1.id).sponsorId).toBe(admin.id);

    // Occupied leg blocked
    await expect(
      service.placeBinaryNode(admin.id, { userId: mFull2.id, parentId: admin.id, leg: BinaryLeg.LEFT })
    ).rejects.toThrow(/already has a child/);

    // Duplicate placement blocked
    await expect(
      service.placeBinaryNode(admin.id, { userId: mFull1.id, parentId: admin.id, leg: BinaryLeg.RIGHT })
    ).rejects.toThrow(/Duplicate placement/);

    // Cycle blocked (placing Admin under descendant mFull1)
    await expect(
      service.placeBinaryNode(admin.id, { userId: admin.id, parentId: mFull1.id, leg: BinaryLeg.RIGHT })
    ).rejects.toThrow(/Cyclic tree relationship/);

    // Non-admin unrelated subtree placement blocked
    await expect(
      service.placeBinaryNode(mFull2.id, { userId: mBasic2.id, parentId: mBasic1.id, leg: BinaryLeg.RIGHT })
    ).rejects.toThrow(ForbiddenException);

    // Candidate listing reflects remaining unplaced BASIC/FULL members and parent vacancies
    const candidates = await service.getBinaryPlacementCandidates();
    expect(candidates.unplacedMembers.map((m) => m.memberId)).toEqual(['ASKR-F2', 'ASKR-B2']);
    const adminParent = candidates.availableParents.find((p) => p.memberId === 'ASKR-ADMIN-01');
    expect(adminParent?.leftVacant).toBe(false);
    expect(adminParent?.rightVacant).toBe(true);
  });

  it('settles strictly at 1:1 ratio, enforces daily cap 15 (₹45,000), preserves capped carry-forward, and balances journal', async () => {
    // Place 2 FULL on LEFT, 1 FULL on RIGHT of admin -> 2L : 1R -> 1:1 yields 1 match (₹3,000), 1L carried
    await service.placeBinaryNode(admin.id, { userId: mFull1.id, parentId: admin.id, leg: BinaryLeg.LEFT });
    const f3 = mock.addUser({
      id: 'u-f3',
      memberId: 'ASKR-F3',
      fullName: 'Full Three',
      currentPackage: MembershipPackage.FULL,
      isFullQualified: true,
    });
    await service.placeBinaryNode(admin.id, { userId: f3.id, parentId: mFull1.id, leg: BinaryLeg.LEFT });
    await service.placeBinaryNode(admin.id, { userId: mFull2.id, parentId: admin.id, leg: BinaryLeg.RIGHT });

    const res1 = await service.settleBinaryMatching(admin.id, 'idem-11-a');
    expect(res1.matchesEvaluated).toBe(1);
    expect(res1.matchesSettled).toBe(1);
    expect(res1.rewardINR).toBe(3000);
    expect(res1.carryLeft).toBe(1);
    expect(res1.carryRight).toBe(0);
    expect(mock.state.wallets.get(admin.id).availableEarningsPaise).toBe(300000n);
    expect(mock.state.journals[0].lines).toEqual([
      expect.objectContaining({ account: '5200_BINARY_MATCHING_EXPENSE', debitPaise: 300000n, creditPaise: 0n }),
      expect.objectContaining({ account: '2000_MEMBER_EARNINGS_PAYABLE', debitPaise: 0n, creditPaise: 300000n }),
    ]);

    // Daily cap check: set 20L : 25R (fresh date) -> 15 settled, 5 capped out -> carryLeft = 5, carryRight = 10
    const capBp = mock.state.placements.get(mFull1.id);
    capBp.carryLeftPaise = 20n;
    capBp.carryRightPaise = 25n;
    const capRes = await service.settleBinaryMatching(mFull1.id, 'idem-cap-1');
    expect(capRes.matchesEvaluated).toBe(20);
    expect(capRes.matchesSettled).toBe(15);
    expect(capRes.cappedOutMatches).toBe(5);
    expect(capRes.rewardINR).toBe(45000);
    expect(capRes.carryLeft).toBe(5);
    expect(capRes.carryRight).toBe(10);
    expect(capRes.dailyCapRemaining).toBe(0);

    // Same-day second run settles 0 and preserves carry 5L:10R
    const capRes2 = await service.settleBinaryMatching(mFull1.id, 'idem-cap-2');
    expect(capRes2.matchesSettled).toBe(0);
    expect(capRes2.carryLeft).toBe(5);
    expect(capRes2.carryRight).toBe(10);

    // Unqualified member cannot earn matching payouts
    const unqRes = await service.settleBinaryMatching(mBasic1.id);
    expect(unqRes.isQualified).toBe(false);
    expect(unqRes.matchesSettled).toBe(0);
  });

  it('enforces binary subtree ownership checks and strips private fields in getBinaryTree', async () => {
    await service.placeBinaryNode(admin.id, { userId: mFull1.id, parentId: admin.id, leg: BinaryLeg.LEFT });
    await service.placeBinaryNode(admin.id, { userId: mFull2.id, parentId: admin.id, leg: BinaryLeg.RIGHT });
    await service.placeBinaryNode(admin.id, { userId: mBasic1.id, parentId: mFull1.id, leg: BinaryLeg.LEFT });

    expect(await service.isUserInBinarySubtree(admin.id, mBasic1.id)).toBe(true);
    expect(await service.isUserInBinarySubtree(mFull1.id, mBasic1.id)).toBe(true);
    expect(await service.isUserInBinarySubtree(mFull2.id, mBasic1.id)).toBe(false);
    expect(await service.isUserInBinarySubtree(mBasic1.id, admin.id)).toBe(false);

    const tree = await service.getBinaryTree(admin.id);
    expect(tree.matchingStatus.ratio).toBe('1:1');
    expect(tree.leftChild?.memberId).toBe('ASKR-F1');
    expect(tree.leftChild?.leftChild?.memberId).toBe('ASKR-B1');
    expect(tree.leftChild?.rightChild).toBeNull();
    expect((tree.node.user as any).email).toBeUndefined();
    expect((tree.node.user as any).phone).toBeUndefined();
  });
});
