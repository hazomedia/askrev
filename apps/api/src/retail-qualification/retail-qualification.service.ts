import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paiseToRupees, rupeesToPaise } from '@askrev/shared';

export interface CreateRetailOrderDto {
  userId: string;
  orderNumber: string;
  grossAmountINR: number;
  netCashPaidINR: number;
  voucherAppliedINR?: number;
  productCategory: string; // 'SCOOTER' | 'BIKE' | 'CYCLE' | 'JEEP' | 'UTILITY'
  isEligibleForQualification?: boolean;
}

export interface RefundRetailOrderDto {
  orderNumber: string;
  refundAmountINR: number;
  refundReason?: string;
}

export interface UpdateRetailConfigDto {
  qualificationThresholdINR?: number;
  eligibleCategories?: string[];
  includeVoucherRedemptions?: boolean;
  evaluationPeriodDays?: number | null;
  allowRefundDeductions?: boolean;
  status?: string;
}

@Injectable()
export class RetailQualificationService {
  private readonly logger = new Logger(RetailQualificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fetch current configuration for ₹60,000 Shopping Qualification
   */
  async getConfig() {
    let config = await this.prisma.retailQualificationConfig.findUnique({
      where: { configKey: 'DEFAULT_RETAIL_QUALIFICATION' },
    });

    if (!config) {
      config = await this.prisma.retailQualificationConfig.create({
        data: {
          configKey: 'DEFAULT_RETAIL_QUALIFICATION',
          qualificationThresholdPaise: 6000000n, // ₹60,000
          eligibleCategories: ['SCOOTER', 'BIKE', 'CYCLE', 'JEEP', 'UTILITY'],
          includeVoucherRedemptions: false,
          allowRefundDeductions: true,
          status: 'PENDING_BUSINESS_APPROVAL',
        },
      });
    }

    return {
      ...config,
      qualificationThresholdINR: paiseToRupees(config.qualificationThresholdPaise),
      disclaimer:
        'COMMERCIAL STATUS: The ₹60,000 retail shopping qualification rules, voucher eligibility, and unlocked benefits remain pending corporate and legal approval. Simulation previews only.',
    };
  }

  /**
   * Update configuration parameters (Admin)
   */
  async updateConfig(dto: UpdateRetailConfigDto) {
    const data: any = {};
    if (dto.qualificationThresholdINR !== undefined) {
      data.qualificationThresholdPaise = rupeesToPaise(dto.qualificationThresholdINR);
    }
    if (dto.eligibleCategories !== undefined) {
      data.eligibleCategories = dto.eligibleCategories;
    }
    if (dto.includeVoucherRedemptions !== undefined) {
      data.includeVoucherRedemptions = dto.includeVoucherRedemptions;
    }
    if (dto.evaluationPeriodDays !== undefined) {
      data.evaluationPeriodDays = dto.evaluationPeriodDays;
    }
    if (dto.allowRefundDeductions !== undefined) {
      data.allowRefundDeductions = dto.allowRefundDeductions;
    }
    if (dto.status !== undefined) {
      data.status = dto.status;
    }

    const updated = await this.prisma.retailQualificationConfig.upsert({
      where: { configKey: 'DEFAULT_RETAIL_QUALIFICATION' },
      create: {
        configKey: 'DEFAULT_RETAIL_QUALIFICATION',
        qualificationThresholdPaise: 6000000n,
        ...data,
      },
      update: data,
    });

    return {
      message: 'Retail qualification configuration updated',
      config: {
        ...updated,
        qualificationThresholdINR: paiseToRupees(updated.qualificationThresholdPaise),
      },
    };
  }

  /**
   * Record a completed retail purchase order
   */
  async recordRetailOrder(dto: CreateRetailOrderDto) {
    const grossPaise = rupeesToPaise(dto.grossAmountINR);
    const netCashPaise = rupeesToPaise(dto.netCashPaidINR);
    const voucherPaise = dto.voucherAppliedINR ? rupeesToPaise(dto.voucherAppliedINR) : 0n;

    const order = await this.prisma.retailOrderRecord.create({
      data: {
        orderNumber: dto.orderNumber.trim().toUpperCase(),
        userId: dto.userId,
        orderStatus: 'COMPLETED',
        grossAmountPaise: grossPaise,
        netCashPaidPaise: netCashPaise,
        voucherAppliedPaise: voucherPaise,
        productCategory: dto.productCategory.trim().toUpperCase(),
        isEligibleForQualification: dto.isEligibleForQualification ?? true,
      },
    });

    return {
      message: 'Retail order recorded for qualification tracking',
      order: {
        ...order,
        grossAmountINR: paiseToRupees(order.grossAmountPaise),
        netCashPaidINR: paiseToRupees(order.netCashPaidPaise),
        voucherAppliedINR: paiseToRupees(order.voucherAppliedPaise),
      },
    };
  }

  /**
   * Record a refund or cancellation adjustment against a retail order
   */
  async recordOrderRefund(dto: RefundRetailOrderDto) {
    const order = await this.prisma.retailOrderRecord.findUnique({
      where: { orderNumber: dto.orderNumber.trim().toUpperCase() },
    });

    if (!order) {
      throw new NotFoundException(`Order ${dto.orderNumber} was not found.`);
    }

    const refundPaise = rupeesToPaise(dto.refundAmountINR);
    const updated = await this.prisma.retailOrderRecord.update({
      where: { id: order.id },
      data: {
        orderStatus: 'REFUNDED',
        refundedAt: new Date(),
        refundAmountPaise: refundPaise,
      },
    });

    return {
      message: 'Order refund recorded successfully',
      order: {
        ...updated,
        refundAmountINR: paiseToRupees(updated.refundAmountPaise),
      },
    };
  }

  /**
   * Evaluates member's retail qualification progress under simulation.
   * Produces an auditable preview and does NOT grant live rewards.
   */
  async evaluateMemberQualification(userId: string) {
    const config = await this.getConfig();

    // Fetch user orders
    const orders = await this.prisma.retailOrderRecord.findMany({
      where: { userId },
      orderBy: { completedAt: 'asc' },
    });

    let totalGrossPaise = 0n;
    let totalNetCashPaise = 0n;
    let totalVouchersPaise = 0n;
    let totalRefundsPaise = 0n;
    let qualifyingSpendPaise = 0n;
    const qualifyingOrderIds: string[] = [];

    const now = new Date();
    const windowStart = config.evaluationPeriodDays
      ? new Date(now.getTime() - config.evaluationPeriodDays * 24 * 60 * 60 * 1000)
      : null;

    for (const ord of orders) {
      totalGrossPaise += ord.grossAmountPaise;
      totalNetCashPaise += ord.netCashPaidPaise;
      totalVouchersPaise += ord.voucherAppliedPaise;
      totalRefundsPaise += ord.refundAmountPaise;

      // Filter by evaluation window
      if (windowStart && ord.completedAt < windowStart) continue;

      // Check category eligibility
      if (
        config.eligibleCategories.length > 0 &&
        !config.eligibleCategories.includes(ord.productCategory)
      ) {
        continue;
      }

      if (!ord.isEligibleForQualification) continue;

      // Calculate order qualifying amount
      let orderQualifying = config.includeVoucherRedemptions
        ? ord.grossAmountPaise
        : ord.netCashPaidPaise;

      if (config.allowRefundDeductions && ord.refundAmountPaise > 0n) {
        orderQualifying =
          orderQualifying > ord.refundAmountPaise
            ? orderQualifying - ord.refundAmountPaise
            : 0n;
      }

      qualifyingSpendPaise += orderQualifying;
      qualifyingOrderIds.push(ord.orderNumber);
    }

    const thresholdPaise = config.qualificationThresholdPaise;
    const isThresholdMet = qualifyingSpendPaise >= thresholdPaise;
    const progressPercent = Math.min(
      100,
      Number((qualifyingSpendPaise * 10000n) / thresholdPaise) / 100
    );

    return {
      userId,
      thresholdINR: paiseToRupees(thresholdPaise),
      qualifyingSpendINR: paiseToRupees(qualifyingSpendPaise),
      progressPercent,
      isThresholdMet,
      totalOrdersCount: orders.length,
      qualifyingOrdersCount: qualifyingOrderIds.length,
      qualifyingOrderNumbers: qualifyingOrderIds,
      totalGrossPurchasesINR: paiseToRupees(totalGrossPaise),
      totalNetCashPaidINR: paiseToRupees(totalNetCashPaise),
      totalVoucherRedeemedINR: paiseToRupees(totalVouchersPaise),
      totalRefundsDeductedINR: paiseToRupees(totalRefundsPaise),
      approvalStatus: config.status,
      benefitsUnlocked: isThresholdMet
        ? 'PREVIEW_ONLY: Unlocking benefits requires separate corporate and legal approval.'
        : 'NONE',
      disclaimer: config.disclaimer,
    };
  }

  /**
   * Member order history
   */
  async getMemberOrders(userId: string) {
    const orders = await this.prisma.retailOrderRecord.findMany({
      where: { userId },
      orderBy: { completedAt: 'desc' },
    });

    return orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      orderStatus: o.orderStatus,
      productCategory: o.productCategory,
      grossAmountINR: paiseToRupees(o.grossAmountPaise),
      netCashPaidINR: paiseToRupees(o.netCashPaidPaise),
      voucherAppliedINR: paiseToRupees(o.voucherAppliedPaise),
      refundAmountINR: paiseToRupees(o.refundAmountPaise),
      completedAt: o.completedAt,
    }));
  }
}
