import { UserRole, MembershipPackage, QualificationMethod, JournalAccount, MembershipRequestType, MembershipRequestStatus, ProductCategory, ProductStatus, ProductAvailability, HeroSlideStatus } from './constants';

export interface MembershipRequestItem {
  id: string;
  userId: string;
  user?: UserProfile;
  requestType: MembershipRequestType;
  feeINR: number;
  paymentMode: string;
  paymentReference?: string | null;
  status: MembershipRequestStatus;
  adminNotes?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  isSimulated: boolean;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  memberId: string;
  email: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  currentPackage: MembershipPackage;
  isFullQualified: boolean;
  isEmailVerified?: boolean;
  emailVerifiedAt?: string | null;
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

export interface BinaryMatchEventItem {
  id: string;
  userId: string;
  matchDate: string;
  matchesEvaluated: number;
  matchesSettled: number;
  cappedOutMatches: number;
  leftUnitsUsed: number;
  rightUnitsUsed: number;
  previousCarryLeft: number;
  previousCarryRight: number;
  newCarryLeft: number;
  newCarryRight: number;
  rewardINR: number;
  isSimulated: boolean;
  createdAt: string;
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

export interface VoucherTransactionItem {
  id: string;
  voucherId: string;
  amountINR: number;
  transactionType: string;
  referenceId?: string | null;
  balanceAfterINR: number;
  narration: string;
  createdAt: string;
}

export interface ShoppingVoucherDetailItem {
  id: string;
  voucherCode: string;
  initialValueINR: number;
  remainingBalanceINR: number;
  usedAmountINR: number;
  issuedReason: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  transactions?: VoucherTransactionItem[];
}

export interface WalletOverviewItem {
  availableEarningsINR: number;
  heldCommissionsINR: number;
  pendingRecoveryINR: number;
  totalEarnedINR: number;
  shoppingVoucherINR: number;
  currency: string;
  complianceMode: string;
  withdrawalsEnabled: boolean;
}

export interface WalletTransactionItem {
  id: string;
  date: string;
  transactionType: string;
  description: string;
  creditINR: number;
  debitINR: number;
  status: string;
  referenceId: string;
  account: string;
}

export interface EvBookingDetailItem {
  id: string;
  bookingNumber: string;
  bikeName: string;
  modelCode: string;
  bookingAmountINR: number;
  voucherAppliedINR: number;
  netCashPaidINR: number;
  bookingStatus: string;
  voucherCode?: string | null;
  cancellationReason?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
}

export interface ProductColorItem {
  name: string;
  hex: string;
  accentHex?: string;
  description?: string;
  images?: ProductImageItem[];
  primaryImage?: string;
  sku?: string;
  isAvailable?: boolean;
}

export interface ProductSpecificationItem {
  label: string;
  value: string;
  sub?: string;
}

export interface ProductImageItem {
  url: string;
  publicId?: string;
  isPrimary: boolean;
  order: number;
  caption?: string;
}

export interface ProductItem {
  id: string;
  name: string;
  slug: string;
  category: ProductCategory;
  brand: string;
  tagline?: string | null;
  shortDescription?: string | null;
  fullDescription?: string | null;
  regularPriceINR?: number | null;
  sellingPriceINR?: number | null;
  bookingAmountINR?: number | null;
  voucherRedeemLimitINR?: number | null;
  regularPricePaise?: string | null;
  sellingPricePaise?: string | null;
  bookingAmountPaise?: string | null;
  voucherRedeemLimitPaise?: string | null;
  rangeKm?: number | null;
  topSpeedKmh?: number | null;
  batteryCapacityKwh?: number | null;
  chargingTimeHours?: number | null;
  motorPower?: string | null;
  acceleration?: string | null;
  warranty?: string | null;
  powertrain?: string | null;
  colors?: ProductColorItem[] | null;
  specifications?: ProductSpecificationItem[] | null;
  highlights?: string[] | null;
  images?: ProductImageItem[] | null;
  heroImage?: string | null;
  thumbnailImage?: string | null;
  isHero: boolean;
  heroMobileImage?: string | null;
  heroHeading?: string | null;
  heroDescription?: string | null;
  heroCtaText?: string | null;
  heroCtaLink?: string | null;
  heroSlideOrder?: number | null;
  oemManufacturer?: string | null;
  oemModelName?: string | null;
  oemReference?: string | null;
  internalNotes?: string | null;
  slugAliases?: string[];
  isRebranded?: boolean;
  rebrandingNotes?: string | null;
  isFeatured: boolean;
  status: ProductStatus;
  availability?: ProductAvailability | string | null;
  displayOrder: number;
  evBikeId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HomepageHeroSlideItem {
  id: string;
  internalName: string;
  heading: string;
  subheading?: string | null;
  description?: string | null;
  eyebrowText?: string | null;
  desktopImageUrl: string;
  mobileImageUrl?: string | null;
  desktopFocalX: number;
  desktopFocalY: number;
  mobileFocalX: number;
  mobileFocalY: number;
  desktopAltText?: string | null;
  mobileAltText?: string | null;
  primaryCtaLabel?: string | null;
  primaryCtaUrl?: string | null;
  primaryCtaStyle: 'PRIMARY' | 'SECONDARY' | 'OUTLINE';
  primaryCtaEnabled: boolean;
  secondaryCtaLabel?: string | null;
  secondaryCtaUrl?: string | null;
  secondaryCtaStyle: 'PRIMARY' | 'SECONDARY' | 'OUTLINE';
  secondaryCtaEnabled: boolean;
  linkedProductId?: string | null;
  linkedProduct?: ProductItem | null;
  showPrice: boolean;
  showRange: boolean;
  showTopSpeed: boolean;
  showBattery: boolean;
  showSpecifications: boolean;
  sortOrder: number;
  status: HeroSlideStatus;
  publishStartAt?: string | null;
  publishEndAt?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface BinarySimulationRunItem {
  id: string;
  runDate: string;
  status: string;
  nodesEvaluated: number;
  nodesSettled: number;
  pairsSettled: number;
  totalRewardINR: number;
  totalRewardPaise: string;
  executionMode: string;
  isDryRun: boolean;
  metadata?: any;
  startedAt: string;
  completedAt?: string | null;
  errorMessage?: string | null;
  triggeredBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaxSimulationRuleItem {
  id: string;
  ruleIdentifier: string;
  ruleName: string;
  incomeCategory: string;
  taxRatePercent: number;
  thresholdINR: number;
  thresholdPaise: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  deductionEvent: string;
  version: number;
  isActive: boolean;
  disclaimer: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaxSimulationRecordItem {
  id: string;
  userId: string;
  ruleId: string;
  referenceEventType: string;
  referenceEntityId?: string | null;
  taxableGrossINR: number;
  simulatedDeductionINR: number;
  simulatedNetINR: number;
  taxableGrossPaise: string;
  simulatedDeductionPaise: string;
  simulatedNetPaise: string;
  appliedRatePercent: number;
  isSimulated: boolean;
  createdAt: string;
}

export interface RetailQualificationConfigItem {
  id: string;
  configKey: string;
  qualificationThresholdINR: number;
  qualificationThresholdPaise: string;
  eligibleCategories: string[];
  includeVoucherRedemptions: boolean;
  evaluationPeriodDays?: number | null;
  allowRefundDeductions: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface RetailOrderRecordItem {
  id: string;
  orderNumber: string;
  userId: string;
  orderStatus: string;
  grossAmountINR: number;
  netCashPaidINR: number;
  voucherAppliedINR: number;
  productCategory: string;
  isEligibleForQualification: boolean;
  completedAt: string;
  refundedAt?: string | null;
  refundAmountINR: number;
  createdAt: string;
}

export interface RetailQualificationEventItem {
  id: string;
  userId: string;
  totalQualifyingSpendINR: number;
  thresholdAppliedINR: number;
  qualifyingOrderIds: string[];
  status: string;
  isSimulated: boolean;
  notes?: string | null;
  createdAt: string;
}



