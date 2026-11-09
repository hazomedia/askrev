import { describe, it, expect, beforeEach } from 'vitest';
import { CommissionSimulatorService } from './commission-simulator.service';
import { MembershipPackage, QualificationMethod } from '@askrev/shared';

describe('CommissionSimulatorService', () => {
  let service: CommissionSimulatorService;

  beforeEach(() => {
    service = new CommissionSimulatorService();
  });

  describe('Prompt Section 5 Canonical Scenario: A sponsors B, C, D, E', () => {
    it('should execute exact upgrade order and match expected wallet, hold, voucher & recovery balances', () => {
      const result = service.runPresetScenarioAtoE();

      expect(result.sponsorMemberId).toBe('ASKR-100001');
      expect(result.totalDirects).toBe(4);
      expect(result.totalActivatedDirects).toBe(4);
      expect(result.totalFullQualifiedDirects).toBe(2);

      // Final wallet state verification:
      // Available earnings: ₹12,000 (₹3,000 initial released + ₹9,000 from D's upgrade + net ₹0 from E's upgrade)
      expect(result.finalWalletState.availableEarningsINR).toBe(12000);
      // Hold reserve: ₹0 (Released on 2nd qualified direct)
      expect(result.finalWalletState.heldCommissionsINR).toBe(0);
      // Pending recovery: ₹0 (Fully funded and reconciled)
      expect(result.finalWalletState.pendingRecoveryINR).toBe(0);
      // Shopping voucher: ₹30,000 (Issued on 2nd qualified direct)
      expect(result.finalWalletState.shoppingVoucherINR).toBe(30000);

      // Verify that every single journal transaction was strictly balanced
      expect(result.doubleEntryBalanced).toBe(true);

      // Verify that no step produced negative available earnings
      for (const event of result.events) {
        expect(event.resultingWalletState.availableEarningsINR).toBeGreaterThanOrEqual(0);
      }
    });

    it('should grant 3rd+ Full Qualified Direct ₹10,000 total entitlement (₹9,000 additional wallet credit)', () => {
      const result = service.simulateSponsorChain({
        sponsorMemberId: 'ASKR-100001',
        directReferrals: [
          { memberId: 'ASKR-100002', name: 'Member B', initialPackage: MembershipPackage.BASIC, upgradesToFull: true, upgradeOrder: 3 },
          { memberId: 'ASKR-100003', name: 'Member C', initialPackage: MembershipPackage.BASIC },
          { memberId: 'ASKR-100004', name: 'Member D', initialPackage: MembershipPackage.BASIC, upgradesToFull: true, upgradeOrder: 1 },
          { memberId: 'ASKR-100005', name: 'Member E', initialPackage: MembershipPackage.BASIC, upgradesToFull: true, upgradeOrder: 2 },
        ],
      });

      expect(result.totalFullQualifiedDirects).toBe(3);
      // Previous ₹12,000 + ₹9,000 from 3rd direct (Member B) = ₹21,000
      expect(result.finalWalletState.availableEarningsINR).toBe(21000);
      expect(result.finalWalletState.shoppingVoucherINR).toBe(30000);
      expect(result.doubleEntryBalanced).toBe(true);
    });

    it('should correctly handle direct Full Membership joining without prior basic commission to recover', () => {
      const result = service.simulateSponsorChain({
        sponsorMemberId: 'ASKR-100001',
        directReferrals: [
          { memberId: 'ASKR-200001', name: 'Direct Full 1', initialPackage: MembershipPackage.FULL },
          { memberId: 'ASKR-200002', name: 'Direct Full 2', initialPackage: MembershipPackage.FULL },
        ],
      });

      expect(result.totalFullQualifiedDirects).toBe(2);
      // 1st direct: ₹10,000 wallet credit
      // 2nd direct: ₹30,000 voucher (no prior ₹1,000 basic commission to recover, no hold release needed)
      expect(result.finalWalletState.availableEarningsINR).toBe(10000);
      expect(result.finalWalletState.shoppingVoucherINR).toBe(30000);
      expect(result.doubleEntryBalanced).toBe(true);
    });
  });

  describe('Binary Matching Module', () => {
    it('should reject matching reward if beneficiary is not Full Qualified', () => {
      const match = service.simulateBinaryMatching({
        leftUnits: 10,
        rightUnits: 10,
        previousCarryLeft: 0,
        previousCarryRight: 0,
        isBeneficiaryQualified: false,
        todayMatchesAlreadySettled: 0,
      });

      expect(match.isQualified).toBe(false);
      expect(match.proposedRewardINR).toBe(0);
      expect(match.matchesConsumed).toBe(0);
      expect(match.rejectionReason).toContain('Beneficiary member is not Full Qualified');
    });

    it('should calculate 1:2 and 2:1 matching, consume units and enforce daily cap of 15 matches (₹45,000)', () => {
      // 20 Left units, 40 Right units (Ratio 1:2 -> 20 potential matches)
      const match = service.simulateBinaryMatching({
        leftUnits: 20,
        rightUnits: 40,
        previousCarryLeft: 0,
        previousCarryRight: 0,
        isBeneficiaryQualified: true,
        todayMatchesAlreadySettled: 0,
      });

      expect(match.isQualified).toBe(true);
      // Max matches per day is 15
      expect(match.matchesConsumed).toBe(15);
      expect(match.cappedOutMatches).toBe(5);
      // 15 matches * ₹3,000 = ₹45,000
      expect(match.proposedRewardINR).toBe(45000);
    });
  });
});
