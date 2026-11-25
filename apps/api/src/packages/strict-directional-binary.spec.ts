import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { BinaryPlacementService } from '../members/binary-placement.service';
import { BinaryLeg } from '@prisma/client';

describe('Strict Directional Power Leg Binary Acceptance Suite', () => {
  let service: BinaryPlacementService;
  let mockPrisma: any;

  // In-memory simulated storage for directional binary testing
  let usersStore: Map<string, any>;
  let placementStore: Map<string, any>;

  beforeEach(() => {
    usersStore = new Map();
    placementStore = new Map();

    mockPrisma = {
      user: {
        findUnique: vi.fn().mockImplementation(({ where }) => {
          const user = usersStore.get(where.id);
          return Promise.resolve(user || null);
        }),
      },
      binaryPlacement: {
        findUnique: vi.fn().mockImplementation(({ where }) => {
          const p = placementStore.get(where.userId);
          return Promise.resolve(p ? { ...p } : null);
        }),
        findFirst: vi.fn().mockImplementation(({ where }) => {
          for (const p of placementStore.values()) {
            if (p.parentId === where.parentId && p.leg === where.leg) {
              return Promise.resolve({ ...p });
            }
          }
          return Promise.resolve(null);
        }),
        create: vi.fn().mockImplementation(({ data }) => {
          const created = {
            id: `p-${data.userId}`,
            userId: data.userId,
            parentId: data.parentId || null,
            leg: data.leg || null,
            leftCount: 0,
            rightCount: 0,
            leftVolumePaise: 0n,
            rightVolumePaise: 0n,
            carryLeftPaise: 0n,
            carryRightPaise: 0n,
          };
          placementStore.set(data.userId, created);
          return Promise.resolve({ ...created });
        }),
        update: vi.fn().mockImplementation(({ where, data }) => {
          const existing = placementStore.get(where.userId);
          if (!existing) throw new Error('Not found');
          if (data.parentId !== undefined) existing.parentId = data.parentId;
          if (data.leg !== undefined) existing.leg = data.leg;
          if (data.leftCount?.increment) existing.leftCount += data.leftCount.increment;
          if (data.rightCount?.increment) existing.rightCount += data.rightCount.increment;
          if (data.leftVolumePaise?.increment) existing.leftVolumePaise += data.leftVolumePaise.increment;
          if (data.carryLeftPaise?.increment) existing.carryLeftPaise += data.carryLeftPaise.increment;
          if (data.rightVolumePaise?.increment) existing.rightVolumePaise += data.rightVolumePaise.increment;
          if (data.carryRightPaise?.increment) existing.carryRightPaise += data.carryRightPaise.increment;
          placementStore.set(where.userId, existing);
          return Promise.resolve({ ...existing });
        }),
        upsert: vi.fn().mockImplementation(({ where, create, update }) => {
          const existing = placementStore.get(where.userId);
          if (existing) {
            if (update.parentId !== undefined) existing.parentId = update.parentId;
            if (update.leg !== undefined) existing.leg = update.leg;
            placementStore.set(where.userId, existing);
            return Promise.resolve({ ...existing });
          } else {
            const created = {
              id: `p-${create.userId}`,
              userId: create.userId,
              parentId: create.parentId || null,
              leg: create.leg || null,
              leftCount: 0,
              rightCount: 0,
              leftVolumePaise: 0n,
              rightVolumePaise: 0n,
              carryLeftPaise: 0n,
              carryRightPaise: 0n,
            };
            placementStore.set(create.userId, created);
            return Promise.resolve({ ...created });
          }
        }),
      },
      binaryMatchingOutbox: {
        create: vi.fn().mockResolvedValue({ id: 'outbox-1' }),
      },
      $executeRawUnsafe: vi.fn().mockResolvedValue(1),
    };

    service = new BinaryPlacementService(mockPrisma as any);

    // Seed Root Member A
    usersStore.set('user-A', { id: 'user-A', memberId: 'ASKR-ROOT-A', role: 'SUPER_ADMIN' });
    placementStore.set('user-A', {
      id: 'p-user-A',
      userId: 'user-A',
      parentId: null,
      leg: null,
      leftCount: 0,
      rightCount: 0,
      leftVolumePaise: 0n,
      rightVolumePaise: 0n,
      carryLeftPaise: 0n,
      carryRightPaise: 0n,
    });
  });

  describe('12 Core Placement Scenarios', () => {
    it('Scenario 1: Sponsor A, intended LEFT -> places at immediate LEFT of A', async () => {
      usersStore.set('user-B', { id: 'user-B', memberId: 'ASKR-B', sponsorId: 'user-A' });
      const res = await service.placeMemberOnRegistration(mockPrisma, 'user-B', 'user-A', BinaryLeg.LEFT);

      expect(res.parentId).toBe('user-A');
      expect(res.leg).toBe(BinaryLeg.LEFT);
      expect(placementStore.get('user-A').leftCount).toBe(1);
      expect(placementStore.get('user-A').rightCount).toBe(0);
    });

    it('Scenario 2: Sponsor A, intended LEFT when A(LEFT) is occupied by B -> places at B(LEFT)', async () => {
      usersStore.set('user-B', { id: 'user-B', memberId: 'ASKR-B', sponsorId: 'user-A' });
      await service.placeMemberOnRegistration(mockPrisma, 'user-B', 'user-A', BinaryLeg.LEFT);

      usersStore.set('user-C', { id: 'user-C', memberId: 'ASKR-C', sponsorId: 'user-A' });
      const res = await service.placeMemberOnRegistration(mockPrisma, 'user-C', 'user-A', BinaryLeg.LEFT);

      expect(res.parentId).toBe('user-B');
      expect(res.leg).toBe(BinaryLeg.LEFT);
      // Headcount propagation: B gets +1 left, A gets +1 left (total 2)
      expect(placementStore.get('user-B').leftCount).toBe(1);
      expect(placementStore.get('user-A').leftCount).toBe(2);
    });

    it('Scenario 3: Sponsor A, intended LEFT when B(LEFT) is occupied by C -> places at C(LEFT)', async () => {
      usersStore.set('user-B', { id: 'user-B', memberId: 'ASKR-B', sponsorId: 'user-A' });
      await service.placeMemberOnRegistration(mockPrisma, 'user-B', 'user-A', BinaryLeg.LEFT);

      usersStore.set('user-C', { id: 'user-C', memberId: 'ASKR-C', sponsorId: 'user-A' });
      await service.placeMemberOnRegistration(mockPrisma, 'user-C', 'user-A', BinaryLeg.LEFT);

      usersStore.set('user-D', { id: 'user-D', memberId: 'ASKR-D', sponsorId: 'user-A' });
      const res = await service.placeMemberOnRegistration(mockPrisma, 'user-D', 'user-A', BinaryLeg.LEFT);

      expect(res.parentId).toBe('user-C');
      expect(res.leg).toBe(BinaryLeg.LEFT);
      expect(placementStore.get('user-C').leftCount).toBe(1);
      expect(placementStore.get('user-B').leftCount).toBe(2);
      expect(placementStore.get('user-A').leftCount).toBe(3);
    });

    it('Scenario 4: Sponsor A, intended LEFT continues down strict left power leg to D(LEFT)', async () => {
      usersStore.set('user-B', { id: 'user-B', memberId: 'ASKR-B', sponsorId: 'user-A' });
      await service.placeMemberOnRegistration(mockPrisma, 'user-B', 'user-A', BinaryLeg.LEFT);
      usersStore.set('user-C', { id: 'user-C', memberId: 'ASKR-C', sponsorId: 'user-A' });
      await service.placeMemberOnRegistration(mockPrisma, 'user-C', 'user-A', BinaryLeg.LEFT);
      usersStore.set('user-D', { id: 'user-D', memberId: 'ASKR-D', sponsorId: 'user-A' });
      await service.placeMemberOnRegistration(mockPrisma, 'user-D', 'user-A', BinaryLeg.LEFT);

      usersStore.set('user-E', { id: 'user-E', memberId: 'ASKR-E', sponsorId: 'user-A' });
      const res = await service.placeMemberOnRegistration(mockPrisma, 'user-E', 'user-A', BinaryLeg.LEFT);

      expect(res.parentId).toBe('user-D');
      expect(res.leg).toBe(BinaryLeg.LEFT);
      expect(placementStore.get('user-A').leftCount).toBe(4);
    });

    it('Scenario 5: Sponsor A, intended RIGHT -> places at immediate RIGHT of A', async () => {
      usersStore.set('user-F', { id: 'user-F', memberId: 'ASKR-F', sponsorId: 'user-A' });
      const res = await service.placeMemberOnRegistration(mockPrisma, 'user-F', 'user-A', BinaryLeg.RIGHT);

      expect(res.parentId).toBe('user-A');
      expect(res.leg).toBe(BinaryLeg.RIGHT);
      expect(placementStore.get('user-A').rightCount).toBe(1);
      expect(placementStore.get('user-A').leftCount).toBe(0);
    });

    it('Scenario 6: Sponsor A, intended RIGHT when A(RIGHT) is occupied by F -> places at F(RIGHT)', async () => {
      usersStore.set('user-F', { id: 'user-F', memberId: 'ASKR-F', sponsorId: 'user-A' });
      await service.placeMemberOnRegistration(mockPrisma, 'user-F', 'user-A', BinaryLeg.RIGHT);

      usersStore.set('user-G', { id: 'user-G', memberId: 'ASKR-G', sponsorId: 'user-A' });
      const res = await service.placeMemberOnRegistration(mockPrisma, 'user-G', 'user-A', BinaryLeg.RIGHT);

      expect(res.parentId).toBe('user-F');
      expect(res.leg).toBe(BinaryLeg.RIGHT);
      expect(placementStore.get('user-F').rightCount).toBe(1);
      expect(placementStore.get('user-A').rightCount).toBe(2);
    });

    it('Scenario 7: Sponsor A, intended RIGHT continues to G(RIGHT)', async () => {
      usersStore.set('user-F', { id: 'user-F', memberId: 'ASKR-F', sponsorId: 'user-A' });
      await service.placeMemberOnRegistration(mockPrisma, 'user-F', 'user-A', BinaryLeg.RIGHT);
      usersStore.set('user-G', { id: 'user-G', memberId: 'ASKR-G', sponsorId: 'user-A' });
      await service.placeMemberOnRegistration(mockPrisma, 'user-G', 'user-A', BinaryLeg.RIGHT);

      usersStore.set('user-H', { id: 'user-H', memberId: 'ASKR-H', sponsorId: 'user-A' });
      const res = await service.placeMemberOnRegistration(mockPrisma, 'user-H', 'user-A', BinaryLeg.RIGHT);

      expect(res.parentId).toBe('user-G');
      expect(res.leg).toBe(BinaryLeg.RIGHT);
      expect(placementStore.get('user-A').rightCount).toBe(3);
    });

    it('Scenario 8: Sponsor A, intended RIGHT continues to H(RIGHT)', async () => {
      usersStore.set('user-F', { id: 'user-F', memberId: 'ASKR-F', sponsorId: 'user-A' });
      await service.placeMemberOnRegistration(mockPrisma, 'user-F', 'user-A', BinaryLeg.RIGHT);
      usersStore.set('user-G', { id: 'user-G', memberId: 'ASKR-G', sponsorId: 'user-A' });
      await service.placeMemberOnRegistration(mockPrisma, 'user-G', 'user-A', BinaryLeg.RIGHT);
      usersStore.set('user-H', { id: 'user-H', memberId: 'ASKR-H', sponsorId: 'user-A' });
      await service.placeMemberOnRegistration(mockPrisma, 'user-H', 'user-A', BinaryLeg.RIGHT);

      usersStore.set('user-I', { id: 'user-I', memberId: 'ASKR-I', sponsorId: 'user-A' });
      const res = await service.placeMemberOnRegistration(mockPrisma, 'user-I', 'user-A', BinaryLeg.RIGHT);

      expect(res.parentId).toBe('user-H');
      expect(res.leg).toBe(BinaryLeg.RIGHT);
      expect(placementStore.get('user-A').rightCount).toBe(4);
    });

    it('Scenario 9: Sponsor B (in A left leg) registers member with RIGHT link -> places at B(RIGHT)', async () => {
      usersStore.set('user-B', { id: 'user-B', memberId: 'ASKR-B', sponsorId: 'user-A' });
      await service.placeMemberOnRegistration(mockPrisma, 'user-B', 'user-A', BinaryLeg.LEFT);

      usersStore.set('user-X', { id: 'user-X', memberId: 'ASKR-X', sponsorId: 'user-B' });
      const res = await service.placeMemberOnRegistration(mockPrisma, 'user-X', 'user-B', BinaryLeg.RIGHT);

      expect(res.parentId).toBe('user-B');
      expect(res.leg).toBe(BinaryLeg.RIGHT);
      // B gets +1 rightCount, A gets +1 leftCount (because B is on A's left)
      expect(placementStore.get('user-B').rightCount).toBe(1);
      expect(placementStore.get('user-A').leftCount).toBe(2);
    });

    it('Scenario 10: Sponsor B registers second member with RIGHT link -> places at X(RIGHT)', async () => {
      usersStore.set('user-B', { id: 'user-B', memberId: 'ASKR-B', sponsorId: 'user-A' });
      await service.placeMemberOnRegistration(mockPrisma, 'user-B', 'user-A', BinaryLeg.LEFT);

      usersStore.set('user-X', { id: 'user-X', memberId: 'ASKR-X', sponsorId: 'user-B' });
      await service.placeMemberOnRegistration(mockPrisma, 'user-X', 'user-B', BinaryLeg.RIGHT);

      usersStore.set('user-Y', { id: 'user-Y', memberId: 'ASKR-Y', sponsorId: 'user-B' });
      const res = await service.placeMemberOnRegistration(mockPrisma, 'user-Y', 'user-B', BinaryLeg.RIGHT);

      expect(res.parentId).toBe('user-X');
      expect(res.leg).toBe(BinaryLeg.RIGHT);
      expect(placementStore.get('user-X').rightCount).toBe(1);
      expect(placementStore.get('user-B').rightCount).toBe(2);
      expect(placementStore.get('user-A').leftCount).toBe(3);
    });

    it('Scenario 11: Non-existent sponsor throws BadRequestException', async () => {
      await expect(
        service.placeMemberOnRegistration(mockPrisma, 'user-Z', 'non-existent', BinaryLeg.LEFT)
      ).rejects.toThrow(BadRequestException);
    });

    it('Scenario 12: Independent Sponsor vs Binary Parent: sponsor is S, parent is P', async () => {
      // Setup chain A -> B -> C on LEFT
      usersStore.set('user-B', { id: 'user-B', memberId: 'ASKR-B', sponsorId: 'user-A' });
      await service.placeMemberOnRegistration(mockPrisma, 'user-B', 'user-A', BinaryLeg.LEFT);

      usersStore.set('user-C', { id: 'user-C', memberId: 'ASKR-C', sponsorId: 'user-A' });
      await service.placeMemberOnRegistration(mockPrisma, 'user-C', 'user-A', BinaryLeg.LEFT);

      // A sponsors user-M on LEFT
      usersStore.set('user-M', { id: 'user-M', memberId: 'ASKR-M', sponsorId: 'user-A' });
      const res = await service.placeMemberOnRegistration(mockPrisma, 'user-M', 'user-A', BinaryLeg.LEFT);

      // Sponsor is user-A, but Binary Parent is user-C!
      expect(usersStore.get('user-M').sponsorId).toBe('user-A');
      expect(res.parentId).toBe('user-C');
      expect(res.leg).toBe(BinaryLeg.LEFT);
    });
  });

  describe('Lifecycle & Activation Preservation', () => {
    it('FREE member permanent placement is retained upon BASIC and FULL qualification', async () => {
      // 1. FREE registration places at A(LEFT)
      usersStore.set('user-FREE', {
        id: 'user-FREE',
        memberId: 'ASKR-FREE',
        sponsorId: 'user-A',
        currentPackage: 'FREE',
      });
      const regRes = await service.placeMemberOnRegistration(mockPrisma, 'user-FREE', 'user-A', BinaryLeg.LEFT);
      expect(regRes.parentId).toBe('user-A');
      expect(regRes.leg).toBe(BinaryLeg.LEFT);
      expect(placementStore.get('user-A').leftCount).toBe(1);
      expect(placementStore.get('user-A').leftVolumePaise).toBe(0n); // 0 volume for FREE

      // 2. Member qualifies for FULL: volume propagates, placement node UNCHANGED
      const ancestors = await service.propagateBinaryVolumeOnFullQualification(mockPrisma, 'user-FREE');
      expect(ancestors).toContain('user-A');

      const pAfter = placementStore.get('user-FREE');
      expect(pAfter.parentId).toBe('user-A'); // UNCHANGED
      expect(pAfter.leg).toBe(BinaryLeg.LEFT); // UNCHANGED

      // Ancestor A now has 1 volume on left
      expect(placementStore.get('user-A').leftVolumePaise).toBe(1n);
      expect(placementStore.get('user-A').carryLeftPaise).toBe(1n);
    });
  });
});
