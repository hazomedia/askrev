import { UserRole, MembershipPackage, QualificationMethod, JournalAccount } from './constants';

export interface UserProfile {
  id: string;
  memberId: string;
  email: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  currentPackage: MembershipPackage;
  isFullQualified: boolean;
  sponsorId?: string | null;
  sponsorMemberId?: string | null;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
}

export interface JournalLineItem {
  account: JournalAccount;
  debitPaise: bigint;
  creditPaise: bigint;
  description: string;
}

export interface JournalTransaction {
  id?: string;
  referenceId: string;
  eventType: string;
  narration: string;
  createdAt?: string;
  lines: JournalLineItem[];
}

export interface WalletState {
  availableEarningsPaise: bigint;
  heldCommissionsPaise: bigint;
  pendingRecoveryPaise: bigint;
  shoppingVoucherPaise: bigint;
}

export interface SponsorDirectMember {
  memberId: string;
  name: string;
  currentPackage: MembershipPackage;
  isFullQualified: boolean;
  qualificationMethod?: QualificationMethod;
  basicCommissionPaidPaise: bigint;
  qualifiedCommissionCreditedPaise: bigint;
  voucherIssuedPaise: bigint;
  joinOrder: number;
}

export interface SimulationEvent {
  step: number;
  eventType: 'BASIC_ACTIVATION' | 'FULL_ACTIVATION' | 'UPGRADE_TO_FULL' | 'REFUND';
  memberId: string;
  memberName: string;
  description: string;
  walletDeltaPaise: bigint;
  holdDeltaPaise: bigint;
  recoveryDeltaPaise: bigint;
  voucherDeltaPaise: bigint;
  resultingWalletState: {
    availableEarningsINR: number;
    heldCommissionsINR: number;
    pendingRecoveryINR: number;
    shoppingVoucherINR: number;
  };
  journalLines: {
    account: string;
    debitINR: number;
    creditINR: number;
    description: string;
  }[];
}

export interface SimulationResult {
  sponsorMemberId: string;
  totalDirects: number;
  totalActivatedDirects: number;
  totalFullQualifiedDirects: number;
  finalWalletState: {
    availableEarningsINR: number;
    heldCommissionsINR: number;
    pendingRecoveryINR: number;
    shoppingVoucherINR: number;
    availableEarningsPaise: string;
    heldCommissionsPaise: string;
    pendingRecoveryPaise: string;
    shoppingVoucherPaise: string;
  };
  events: SimulationEvent[];
  doubleEntryBalanced: boolean;
  complianceNotice: string;
}

export interface BinaryMatchInput {
  leftUnits: number;
  rightUnits: number;
  previousCarryLeft: number;
  previousCarryRight: number;
  isBeneficiaryQualified: boolean;
  todayMatchesAlreadySettled: number;
}

export interface BinaryMatchResult {
  matchesConsumed: number;
  leftUnitsUsed: number;
  rightUnitsUsed: number;
  newCarryLeft: number;
  newCarryRight: number;
  cappedOutMatches: number;
  proposedRewardPaise: bigint;
  proposedRewardINR: number;
  isQualified: boolean;
  rejectionReason?: string;
}

export interface EvBikeModel {
  id: string;
  name: string;
  modelCode: string;
  tagline: string;
  batteryCapacityKwh: number;
  rangeKm: number;
  topSpeedKmh: number;
  chargingTimeHours: number;
  exShowroomPriceINR: number;
  bookingAmountINR: number;
  voucherRedeemLimitINR: number;
  imageUrl: string;
  isAvailable: boolean;
}
