import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paiseToRupees } from '@askrev/shared';

@Injectable()
export class VouchersService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserVouchers(userId: string) {
    const vouchers = await this.prisma.shoppingVoucher.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return vouchers.map((v) => ({
      id: v.id,
      voucherCode: v.voucherCode,
      initialValueINR: paiseToRupees(v.initialValuePaise),
      remainingBalanceINR: paiseToRupees(v.remainingBalancePaise),
      issuedReason: v.issuedReason,
      status: v.status,
      expiresAt: v.expiresAt,
      createdAt: v.createdAt,
      isRedeemableForCash: false, // Strict compliance rule: Never redeemable for cash
    }));
  }

  async getAllVouchersAdmin() {
    const vouchers = await this.prisma.shoppingVoucher.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { memberId: true, fullName: true, email: true },
        },
      },
    });

    return vouchers.map((v) => ({
      id: v.id,
      voucherCode: v.voucherCode,
      memberId: v.user.memberId,
      memberName: v.user.fullName,
      initialValueINR: paiseToRupees(v.initialValuePaise),
      remainingBalanceINR: paiseToRupees(v.remainingBalancePaise),
      issuedReason: v.issuedReason,
      status: v.status,
      expiresAt: v.expiresAt,
      createdAt: v.createdAt,
    }));
  }
}
