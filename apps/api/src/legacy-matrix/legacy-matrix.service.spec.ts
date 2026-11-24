import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LegacyMatrixService } from './legacy-matrix.service';
import { LEGACY_MATRIX_RATES, LEGACY_MATRIX_CONFIG } from './legacy-matrix.constants';

describe('LegacyMatrixService - Algorithm & Qualification', () => {
  let service: LegacyMatrixService;
  let mockPrisma: any;
  let placementsDb: any[];
  let usersDb: any[];
  let auditLogsDb: any[];

  beforeEach(() => {
    placementsDb = [];
    usersDb = [];
    auditLogsDb = [];

    mockPrisma = {
      $executeRaw: vi.fn().mockResolvedValue(1),
      $transaction: vi.fn(async (callback: any) => callback(mockPrisma)),
      user: {
        findUnique: vi.fn(({ where }: any) => {
          return usersDb.find((u) => u.id === where.id) || null;
        }),
        findMany: vi.fn(({ where }: any) => {
          return usersDb.filter((u) => {
            if (where.sponsorId && u.sponsorId !== where.sponsorId) return false;
            if (where.currentPackage?.in && !where.currentPackage.in.includes(u.currentPackage))
              return false;
            return true;
          });
        }),
        findFirst: vi.fn(({ where }: any) => {
          return usersDb.find((u) => (where.role ? u.role === where.role : true)) || null;
        }),
      },
      legacyMatrixPlacement: {
        count: vi.fn(async () => placementsDb.length),
        findUnique: vi.fn(async ({ where }: any) => {
          if (where.userId) {
            const p = placementsDb.find((x) => x.userId === where.userId);
            if (!p) return null;
            const parent = placementsDb.find((x) => x.id === p.parentId);
            const children = placementsDb.filter((x) => x.parentId === p.id);
            return {
              ...p,
              parent: parent ? { ...parent, user: usersDb.find((u) => u.id === parent.userId) } : null,
              children: children.map((c) => ({
                ...c,
                user: usersDb.find((u) => u.id === c.userId),
              })),
            };
          }
          if (where.id) {
            const p = placementsDb.find((x) => x.id === where.id);
            if (!p) return null;
            const children = placementsDb.filter((x) => x.parentId === p.id);
            return {
              ...p,
              user: usersDb.find((u) => u.id === p.userId),
              children,
            };
          }
          return null;
        }),
        findFirst: vi.fn(async ({ where, orderBy }: any) => {
          let list = [...placementsDb];
          if (where?.matrixSequence !== undefined) {
            list = list.filter((p) => p.matrixSequence === where.matrixSequence);
          }
          if (orderBy?.matrixSequence === 'desc') {
            list.sort((a, b) => b.matrixSequence - a.matrixSequence);
          }
          const item = list[0];
          if (!item) return null;
          return {
            ...item,
            user: usersDb.find((u) => u.id === item.userId),
          };
        }),
        findMany: vi.fn(async ({ where, orderBy }: any) => {
          let list = [...placementsDb];
          if (where?.depth !== undefined) {
            list = list.filter((p) => p.depth === where.depth);
          }
          if (where?.parentId?.in) {
            list = list.filter((p) => where.parentId.in.includes(p.parentId));
          }
          if (orderBy?.matrixSequence === 'asc') {
            list.sort((a, b) => a.matrixSequence - b.matrixSequence);
          }
          return list.map((p) => ({
            ...p,
            user: usersDb.find((u) => u.id === p.userId),
          }));
        }),
        create: vi.fn(async ({ data }: any) => {
          const rec = {
            id: `p-${placementsDb.length + 1}`,
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          placementsDb.push(rec);
          const parent = placementsDb.find((x) => x.id === rec.parentId);
          return {
            ...rec,
            parent: parent ? { ...parent, user: usersDb.find((u) => u.id === parent.userId) } : null,
          };
        }),
      },
      legacyMatrixAuditLog: {
        create: vi.fn(async ({ data }: any) => {
          auditLogsDb.push({ id: `audit-${auditLogsDb.length + 1}`, ...data });
          return data;
        }),
      },
    };

    service = new LegacyMatrixService(mockPrisma);
  });

  it('correctly fills the exact approved order: A -> B, C, D -> E, F, G, H, I, J, K, L, M', async () => {
    // Setup users A through M
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
    for (let i = 0; i < letters.length; i++) {
      usersDb.push({
        id: `u-${letters[i]}`,
        memberId: `ASKR-${letters[i]}`,
        fullName: `Member ${letters[i]}`,
        currentPackage: 'FULL',
        role: i === 0 ? 'SUPER_ADMIN' : 'MEMBER',
      });
    }

    // Sequentially place members A through M
    for (const l of letters) {
      await service.placeMemberInMatrix(`u-${l}`);
    }

    expect(placementsDb.length).toBe(13);

    // Verify Root (A)
    const nodeA = placementsDb.find((p) => p.userId === 'u-A');
    expect(nodeA.matrixSequence).toBe(1);
    expect(nodeA.depth).toBe(0);
    expect(nodeA.parentId).toBeNull();

    // Verify Directs of A: B (pos 1), C (pos 2), D (pos 3)
    const nodeB = placementsDb.find((p) => p.userId === 'u-B');
    const nodeC = placementsDb.find((p) => p.userId === 'u-C');
    const nodeD = placementsDb.find((p) => p.userId === 'u-D');

    expect(nodeB.parentId).toBe(nodeA.id);
    expect(nodeB.positionIndex).toBe(1);
    expect(nodeB.matrixSequence).toBe(2);
    expect(nodeB.depth).toBe(1);

    expect(nodeC.parentId).toBe(nodeA.id);
    expect(nodeC.positionIndex).toBe(2);
    expect(nodeC.matrixSequence).toBe(3);
    expect(nodeC.depth).toBe(1);

    expect(nodeD.parentId).toBe(nodeA.id);
    expect(nodeD.positionIndex).toBe(3);
    expect(nodeD.matrixSequence).toBe(4);
    expect(nodeD.depth).toBe(1);

    // Verify Layer 2 Round 1: B pos 1 (E), C pos 1 (F), D pos 1 (G)
    const nodeE = placementsDb.find((p) => p.userId === 'u-E');
    const nodeF = placementsDb.find((p) => p.userId === 'u-F');
    const nodeG = placementsDb.find((p) => p.userId === 'u-G');

    expect(nodeE.parentId).toBe(nodeB.id);
    expect(nodeE.positionIndex).toBe(1);
    expect(nodeE.matrixSequence).toBe(5);

    expect(nodeF.parentId).toBe(nodeC.id);
    expect(nodeF.positionIndex).toBe(1);
    expect(nodeF.matrixSequence).toBe(6);

    expect(nodeG.parentId).toBe(nodeD.id);
    expect(nodeG.positionIndex).toBe(1);
    expect(nodeG.matrixSequence).toBe(7);

    // Verify Layer 2 Round 2: B pos 2 (H), C pos 2 (I), D pos 2 (J)
    const nodeH = placementsDb.find((p) => p.userId === 'u-H');
    const nodeI = placementsDb.find((p) => p.userId === 'u-I');
    const nodeJ = placementsDb.find((p) => p.userId === 'u-J');

    expect(nodeH.parentId).toBe(nodeB.id);
    expect(nodeH.positionIndex).toBe(2);
    expect(nodeH.matrixSequence).toBe(8);

    expect(nodeI.parentId).toBe(nodeC.id);
    expect(nodeI.positionIndex).toBe(2);
    expect(nodeI.matrixSequence).toBe(9);

    expect(nodeJ.parentId).toBe(nodeD.id);
    expect(nodeJ.positionIndex).toBe(2);
    expect(nodeJ.matrixSequence).toBe(10);

    // Verify Layer 2 Round 3: B pos 3 (K), C pos 3 (L), D pos 3 (M)
    const nodeK = placementsDb.find((p) => p.userId === 'u-K');
    const nodeL = placementsDb.find((p) => p.userId === 'u-L');
    const nodeM = placementsDb.find((p) => p.userId === 'u-M');

    expect(nodeK.parentId).toBe(nodeB.id);
    expect(nodeK.positionIndex).toBe(3);
    expect(nodeK.matrixSequence).toBe(11);

    expect(nodeL.parentId).toBe(nodeC.id);
    expect(nodeL.positionIndex).toBe(3);
    expect(nodeL.matrixSequence).toBe(12);

    expect(nodeM.parentId).toBe(nodeD.id);
    expect(nodeM.positionIndex).toBe(3);
    expect(nodeM.matrixSequence).toBe(13);
  });

  it('enforces idempotency - re-placing member returns existing placement', async () => {
    usersDb.push({ id: 'u-1', memberId: 'ASKR-1', fullName: 'User One', currentPackage: 'FULL' });
    const res1 = await service.placeMemberInMatrix('u-1');
    expect(res1.isNew).toBe(true);

    const res2 = await service.placeMemberInMatrix('u-1');
    expect(res2.isNew).toBe(false);
    expect(placementsDb.length).toBe(1);
  });

  it('correctly calculates 3 Active Directs qualification', async () => {
    usersDb.push({ id: 'u-sponsor', memberId: 'ASKR-SPON', fullName: 'Sponsor', currentPackage: 'FULL' });

    // 0 directs
    let overview = await service.getMyMatrixOverview('u-sponsor');
    expect(overview.qualification.activeDirectsCount).toBe(0);
    expect(overview.qualification.isQualified).toBe(false);

    // Add 1 BASIC direct and 1 FREE direct
    usersDb.push({ id: 'u-d1', memberId: 'ASKR-D1', sponsorId: 'u-sponsor', currentPackage: 'BASIC' });
    usersDb.push({ id: 'u-d2', memberId: 'ASKR-D2', sponsorId: 'u-sponsor', currentPackage: 'FREE' }); // FREE doesn't count

    overview = await service.getMyMatrixOverview('u-sponsor');
    expect(overview.qualification.activeDirectsCount).toBe(1);
    expect(overview.qualification.isQualified).toBe(false);

    // Add 2nd active direct (FULL)
    usersDb.push({ id: 'u-d3', memberId: 'ASKR-D3', sponsorId: 'u-sponsor', currentPackage: 'FULL' });
    overview = await service.getMyMatrixOverview('u-sponsor');
    expect(overview.qualification.activeDirectsCount).toBe(2);
    expect(overview.qualification.isQualified).toBe(false);

    // Add 3rd active direct (BASIC)
    usersDb.push({ id: 'u-d4', memberId: 'ASKR-D4', sponsorId: 'u-sponsor', currentPackage: 'BASIC' });
    overview = await service.getMyMatrixOverview('u-sponsor');
    expect(overview.qualification.activeDirectsCount).toBe(3);
    expect(overview.qualification.isQualified).toBe(true);
    expect(overview.qualification.statusText).toBe('3 / 3 — Qualified');
  });
});
