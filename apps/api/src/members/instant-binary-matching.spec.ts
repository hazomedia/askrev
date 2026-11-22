import { describe, it, expect, beforeEach } from 'vitest';
import { MembersService } from './members.service';
import { InstantBinaryMatchingService } from './instant-binary-matching.service';
import { UserRole, MembershipPackage, FINANCIAL_RULES, BinaryLeg } from '@askrev/shared';

export function createInstantMatchingMockPrisma() {
  const state = {
    users: new Map<string, any>(),
    placements: new Map<string, any>(),
    wallets: new Map<string, any>(),
    journals: [] as any[],
    matchEvents: [] as any[],
    auditLogs: [] as any[],
    outbox: new Map<string, any>(),
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

  let activeWorkerId = 'mock-worker';

  const tx: any = {
    $queryRaw: async (queryOrStrings: any, ...values: any[]) => {
      const rawText = Array.isArray(queryOrStrings) ? queryOrStrings.join(' ') : String(queryOrStrings);
      if (rawText.includes('BinaryMatchingOutbox') && rawText.includes('FOR UPDATE SKIP LOCKED')) {
        const claimable: any[] = [];
        const now = new Date();
        for (const item of state.outbox.values()) {
          const isPending = item.status === 'PENDING' && (!item.nextRetryAt || item.nextRetryAt <= now);
          const isExpiredProcessing = item.status === 'PROCESSING' && item.leaseExpiresAt && item.leaseExpiresAt <= now;
          if ((isPending || isExpiredProcessing) && (item.attempts || 0) < (item.maxAttempts || 5)) {
            item.status = 'PROCESSING';
            item.attempts = (item.attempts || 0) + 1;
            item.lockedBy = activeWorkerId;
            item.lockedAt = now;
            item.leaseExpiresAt = new Date(Date.now() + 120000);
            item.updatedAt = now;
            claimable.push({ ...item });
          }
        }
        return claimable;
      }
      return [];
    },
    $executeRaw: async (queryOrStrings: any, ...values: any[]) => {
      const rawText = typeof queryOrStrings === 'string'
        ? queryOrStrings
        : Array.isArray(queryOrStrings)
        ? queryOrStrings.join(' ')
        : (queryOrStrings?.text || queryOrStrings?.strings?.join(' ') || JSON.stringify(queryOrStrings));
      const now = new Date();
      if (rawText.includes('UPDATE "BinaryMatchingOutbox"')) {
        if (rawText.includes("SET status = 'COMPLETED'")) {
          for (const item of state.outbox.values()) {
            if (item.status === 'PROCESSING') {
              item.status = 'COMPLETED';
              item.processedAt = now;
              item.lastError = null;
              item.lockedBy = null;
              item.leaseExpiresAt = null;
              item.updatedAt = now;
              return 1;
            }
          }
          return 0;
        } else if (rawText.includes("SET status = 'DEAD_LETTER'")) {
          let count = 0;
          for (const item of state.outbox.values()) {
            if (item.status === 'PROCESSING' && item.attempts >= (item.maxAttempts || 5)) {
              item.status = 'DEAD_LETTER';
              item.deadLetteredAt = now;
              item.leaseExpiresAt = null;
              item.lockedBy = null;
              item.updatedAt = now;
              count++;
            }
          }
          return count;
        } else if (rawText.includes("SET status = 'PENDING'")) {
          let count = 0;
          for (const item of state.outbox.values()) {
            if (rawText.includes("WHERE status = 'DEAD_LETTER'")) {
              if (item.status === 'DEAD_LETTER') {
                item.status = 'PENDING';
                item.attempts = 0;
                item.nextRetryAt = null;
                item.deadLetteredAt = null;
                item.lastError = null;
                item.lockedBy = null;
                item.leaseExpiresAt = null;
                item.updatedAt = now;
                count++;
              }
            } else if (item.status === 'PROCESSING') {
              item.status = 'PENDING';
              item.leaseExpiresAt = null;
              item.lockedBy = null;
              item.updatedAt = now;
              count++;
            }
          }
          return count;
        }
      }
      return 0;
    },
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
    binaryMatchingOutbox: {
      create: async ({ data }: any) => {
        const item = {
          id: nextId('outbox'),
          userId: data.userId,
          triggerReason: data.triggerReason,
          triggerUserId: data.triggerUserId || null,
          status: data.status || 'PENDING',
          attempts: data.attempts || 0,
          maxAttempts: data.maxAttempts || 5,
          lockedBy: data.lockedBy || null,
          lockedAt: data.lockedAt || null,
          leaseExpiresAt: data.leaseExpiresAt || null,
          nextRetryAt: data.nextRetryAt || null,
          deadLetteredAt: data.deadLetteredAt || null,
          lastError: null,
          createdAt: new Date(),
          processedAt: null,
          updatedAt: new Date(),
        };
        state.outbox.set(item.id, item);
        return item;
      },
      findMany: async ({ where, orderBy, take }: any) => {
        let items = Array.from(state.outbox.values());
        if (where?.status) items = items.filter((i) => i.status === where.status);
        if (where?.userId?.in) items = items.filter((i) => where.userId.in.includes(i.userId));
        else if (where?.userId) items = items.filter((i) => i.userId === where.userId);
        if (take) items = items.slice(0, take);
        return items;
      },
      update: async ({ where, data }: any) => {
        const item = state.outbox.get(where.id);
        if (!item) throw new Error(`Outbox item ${where.id} not found`);
        applyInc(item, data);
        return item;
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const item of state.outbox.values()) {
          if (!where?.status || item.status === where.status) {
            applyInc(item, data);
            count++;
          }
        }
        return { count };
      },
      count: async ({ where }: any) => {
        let items = Array.from(state.outbox.values());
        if (where?.status) items = items.filter((i) => i.status === where.status);
        return items.length;
      },
    },
    auditLog: {
      create: async ({ data }: any) => {
        const log = { id: nextId('aud'), ...data };
        state.auditLogs.push(log);
        return log;
      },
    },
    $transaction: async (cb: (txClient: any) => Promise<any>) => {
      // In PostgreSQL, FOR UPDATE acquires row-level locks, serializing transactions on the beneficiary
      const prev = txLock;
      let release: () => void;
      txLock = new Promise<void>((res) => {
        release = res;
      });
      await prev;
      try {
        return await cb(tx);
      } finally {
        release!();
      }
    },
  };

  let txLock = Promise.resolve();

  return { prisma: tx, state, addUser, setActiveWorkerId: (id: string) => { activeWorkerId = id; } };
}

describe('Instant Binary Matching Engine Specification & Invariants', () => {
  let mock: ReturnType<typeof createInstantMatchingMockPrisma>;
  let membersService: MembersService;
  let instantMatchingService: InstantBinaryMatchingService;
  let rootUser: any;
  let memberA: any;
  let memberB: any;
  let memberC: any;

  beforeEach(() => {
    process.env.COMPLIANCE_MODE = 'SIMULATION_ONLY';
    process.env.ENABLE_LIVE_PAYOUTS = 'false';

    mock = createInstantMatchingMockPrisma();
    membersService = new MembersService(mock.prisma);
    instantMatchingService = new InstantBinaryMatchingService(mock.prisma, membersService);
    // Wire mutual dependency
    (membersService as any).instantBinaryMatchingService = instantMatchingService;
    mock.setActiveWorkerId(instantMatchingService.workerId);

    rootUser = mock.addUser({
      id: 'usr-root',
      memberId: 'ASKR-ROOT',
      fullName: 'Company Root',
      role: UserRole.SUPER_ADMIN,
      currentPackage: MembershipPackage.FULL,
      isFullQualified: true,
    });

    memberA = mock.addUser({
      id: 'usr-a',
      memberId: 'ASKR-MEMBER-A',
      fullName: 'Alice Member',
      currentPackage: MembershipPackage.FULL,
      isFullQualified: true,
      sponsorId: rootUser.id,
    });

    memberB = mock.addUser({
      id: 'usr-b',
      memberId: 'ASKR-MEMBER-B',
      fullName: 'Bob Member',
      currentPackage: MembershipPackage.FULL,
      isFullQualified: true,
      sponsorId: rootUser.id,
    });

    memberC = mock.addUser({
      id: 'usr-c',
      memberId: 'ASKR-MEMBER-C',
      fullName: 'Charlie Member',
      currentPackage: MembershipPackage.BASIC,
      isFullQualified: false,
      sponsorId: rootUser.id,
    });
  });

  it('Scenario 1 (1L : 1R): settles exactly 1 pair (₹3,000) with 0 carry forward', async () => {
    const bp = mock.state.placements.get(memberA.id);
    bp.carryLeftPaise = 1n;
    bp.carryRightPaise = 1n;

    const res = await membersService.settleBinaryMatching(memberA.id, 'match-1-1');

    expect(res.success).toBe(true);
    expect(res.matchesEvaluated).toBe(1);
    expect(res.matchesSettled).toBe(1);
    expect(res.rewardINR).toBe(3000);
    expect(res.carryLeft).toBe(0);
    expect(res.carryRight).toBe(0);

    // Verify wallet updated
    const wallet = mock.state.wallets.get(memberA.id);
    expect(wallet.availableEarningsPaise).toBe(300000n);
    expect(wallet.totalEarnedPaise).toBe(300000n);

    // Verify double-entry journal created
    expect(mock.state.journals.length).toBe(1);
    expect(mock.state.journals[0].lines).toEqual([
      expect.objectContaining({ account: '5200_BINARY_MATCHING_EXPENSE', debitPaise: 300000n }),
      expect.objectContaining({ account: '2000_MEMBER_EARNINGS_PAYABLE', creditPaise: 300000n }),
    ]);
  });

  it('Scenario 2 (5L : 3R): settles 3 pairs (₹9,000) and carries forward 2L : 0R without volume loss', async () => {
    const bp = mock.state.placements.get(memberA.id);
    bp.carryLeftPaise = 5n;
    bp.carryRightPaise = 3n;

    const res = await membersService.settleBinaryMatching(memberA.id, 'match-5-3');

    expect(res.success).toBe(true);
    expect(res.matchesEvaluated).toBe(3);
    expect(res.matchesSettled).toBe(3);
    expect(res.rewardINR).toBe(9000);
    expect(res.carryLeft).toBe(2);
    expect(res.carryRight).toBe(0);

    const bpAfter = mock.state.placements.get(memberA.id);
    expect(bpAfter.carryLeftPaise).toBe(2n);
    expect(bpAfter.carryRightPaise).toBe(0n);
    expect(bpAfter.totalMatchesConsumed).toBe(3);
  });

  it('Scenario 3 (20L : 18R): enforces 15-pair daily cap (₹45,000) and carries forward remaining 5L : 3R', async () => {
    const bp = mock.state.placements.get(memberA.id);
    bp.carryLeftPaise = 20n;
    bp.carryRightPaise = 18n;

    const res = await membersService.settleBinaryMatching(memberA.id, 'match-20-18');

    expect(res.success).toBe(true);
    expect(res.matchesEvaluated).toBe(18);
    expect(res.matchesSettled).toBe(15);
    expect(res.cappedOutMatches).toBe(3);
    expect(res.rewardINR).toBe(45000);
    expect(res.dailyCapRemaining).toBe(0);

    // Carried forward: 20 - 15 = 5L; 18 - 15 = 3R
    expect(res.carryLeft).toBe(5);
    expect(res.carryRight).toBe(3);

    const bpAfter = mock.state.placements.get(memberA.id);
    expect(bpAfter.carryLeftPaise).toBe(5n);
    expect(bpAfter.carryRightPaise).toBe(3n);
    expect(bpAfter.dailyMatchesCount).toBe(15);

    // Immediate second settlement on the same IST day settles 0 pairs and preserves 5L : 3R
    const resSameDay = await membersService.settleBinaryMatching(memberA.id, 'match-same-day-retry');
    expect(resSameDay.matchesSettled).toBe(0);
    expect(resSameDay.carryLeft).toBe(5);
    expect(resSameDay.carryRight).toBe(3);
    expect(resSameDay.dailyCapRemaining).toBe(0);
  });

  it('Scenario 4 (Non-Qualified Beneficiary): preserves volume with 0 payout until FULL qualification', async () => {
    const bp = mock.state.placements.get(memberC.id);
    bp.carryLeftPaise = 4n;
    bp.carryRightPaise = 4n;

    // memberC is BASIC (isFullQualified = false)
    const res = await membersService.settleBinaryMatching(memberC.id);
    expect(res.isQualified).toBe(false);
    expect(res.matchesSettled).toBe(0);
    expect(res.rewardINR).toBe(0);
    expect(res.carryLeft).toBe(4);
    expect(res.carryRight).toBe(4);

    // Wallet untouched
    expect(mock.state.wallets.get(memberC.id).availableEarningsPaise).toBe(0n);

    // Member upgrades to FULL
    mock.state.users.get(memberC.id).isFullQualified = true;
    mock.state.users.get(memberC.id).currentPackage = MembershipPackage.FULL;

    // After qualification, matches are unlocked instantly!
    const resAfter = await membersService.settleBinaryMatching(memberC.id);
    expect(resAfter.isQualified).toBe(true);
    expect(resAfter.matchesSettled).toBe(4);
    expect(resAfter.rewardINR).toBe(12000);
    expect(resAfter.carryLeft).toBe(0);
    expect(resAfter.carryRight).toBe(0);
  });

  it('Scenario 5 (Transactional Outbox Queue & Immediate Settlement): volume event creates outbox and evaluates', async () => {
    // Give memberA a right-side unit first, so when memberB is placed on LEFT, a match is ready!
    const bpA = mock.state.placements.get(memberA.id);
    bpA.carryRightPaise = 1n;

    // Member B placed under Member A LEFT
    await membersService.placeBinaryNode(rootUser.id, {
      userId: memberB.id,
      parentId: memberA.id,
      leg: BinaryLeg.LEFT,
    });

    // Check that an outbox record was created for memberA and processed post-commit
    const outboxTasks = Array.from(mock.state.outbox.values());
    expect(outboxTasks.length).toBeGreaterThan(0);
    const aTask = outboxTasks.find((t) => t.userId === memberA.id);
    expect(aTask).toBeDefined();
    expect(aTask.triggerReason).toBe('PLACEMENT');
    expect(aTask.status).toBe('COMPLETED');

    // Verify memberA settled the 1:1 match immediately
    expect(mock.state.wallets.get(memberA.id).availableEarningsPaise).toBe(300000n);
  });

  it('Scenario 6 (High Concurrency Protection): 100 simultaneous settlements strictly enforce 15-pair cap and zero double-credits', async () => {
    const bp = mock.state.placements.get(memberA.id);
    bp.carryLeftPaise = 25n;
    bp.carryRightPaise = 25n;

    // Fire 100 concurrent matching evaluation requests
    const promises = Array.from({ length: 100 }, (_, idx) =>
      membersService.settleBinaryMatching(memberA.id, `concurrent-match-${idx}`)
    );

    const results = await Promise.all(promises);

    // Total settled pairs across all 100 requests must be EXACTLY 15
    const totalSettled = results.reduce((acc, r) => acc + (r.matchesSettled || 0), 0);
    expect(totalSettled).toBe(15);

    // Wallet balance must be EXACTLY ₹45,000 (4,500,000 paise)
    const wallet = mock.state.wallets.get(memberA.id);
    expect(wallet.availableEarningsPaise).toBe(4500000n);
    expect(wallet.totalEarnedPaise).toBe(4500000n);

    // Carry forward must be EXACTLY 25 - 15 = 10L : 10R
    const finalBp = mock.state.placements.get(memberA.id);
    expect(finalBp.carryLeftPaise).toBe(10n);
    expect(finalBp.carryRightPaise).toBe(10n);
    expect(finalBp.totalMatchesConsumed).toBe(15);
  });

  it('Scenario 7 (Self-Healing Outbox Recovery): retries pending or failed tasks on startup / sweep', async () => {
    // Insert an interrupted task in PENDING status
    await mock.prisma.binaryMatchingOutbox.create({
      data: {
        userId: memberA.id,
        triggerReason: 'SCHEDULER_RECOVERY',
        status: 'PENDING',
      },
    });

    const bp = mock.state.placements.get(memberA.id);
    bp.carryLeftPaise = 2n;
    bp.carryRightPaise = 2n;

    // Simulate startup sweep
    await instantMatchingService.onApplicationBootstrap();

    // Verify task is completed
    const tasks = Array.from(mock.state.outbox.values());
    const recoveredTask = tasks.find((t) => t.triggerReason === 'SCHEDULER_RECOVERY');
    expect(recoveredTask?.status).toBe('COMPLETED');
    expect(recoveredTask?.processedAt).toBeDefined();

    // Verify member earned ₹6,000 for the 2 pairs
    expect(mock.state.wallets.get(memberA.id).availableEarningsPaise).toBe(600000n);
  });

  it('Scenario 8 (Strict Compliance & Live Payouts Guard): rejects live payouts when ENABLE_LIVE_PAYOUTS=true', async () => {
    process.env.ENABLE_LIVE_PAYOUTS = 'true';

    await expect(membersService.settleBinaryMatching(memberA.id)).rejects.toThrow(
      'Live binary payouts are strictly disabled. Matching calculations are restricted to SIMULATION_ONLY mode.'
    );

    await expect(instantMatchingService.processBeneficiaryMatching(memberA.id)).rejects.toThrow(
      'Live binary payouts are strictly disabled. Restricted to SIMULATION_ONLY mode.'
    );

    // Reset environment
    process.env.ENABLE_LIVE_PAYOUTS = 'false';
  });

  it('Scenario 9 (Dead-Letter Requeuing): requeues DEAD_LETTER tasks back to PENDING with attempts reset', async () => {
    const task = await mock.prisma.binaryMatchingOutbox.create({
      data: {
        userId: memberA.id,
        triggerReason: 'DEAD_LETTER_TEST',
        status: 'DEAD_LETTER',
        attempts: 5,
        deadLetteredAt: new Date(),
      },
    });

    const res = await instantMatchingService.requeueDeadLetterTasks([task.id]);
    expect(res.requeuedCount).toBe(1);

    // Allow background processing to settle
    await new Promise((r) => setTimeout(r, 20));

    const updatedTask = mock.state.outbox.get(task.id);
    expect(['PENDING', 'PROCESSING', 'COMPLETED']).toContain(updatedTask.status);
    expect(updatedTask.deadLetteredAt).toBeNull();
  });
});
