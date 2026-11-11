import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PrismaService } from '../prisma/prisma.service';
import { paiseToRupees, JournalAccount } from '@askrev/shared';
import { Prisma } from '@prisma/client';

export class RedeemVoucherDto {
  @IsString()
  @IsNotEmpty()
  voucherId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amountINR: number;

  @IsString()
  @IsOptional()
  bookingNumber?: string;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}

@Injectable()
export class VouchersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fetch all vouchers belonging to the authenticated member with detailed metrics
   */
  async getUserVouchers(userId: string) {
    const vouchers = await this.prisma.shoppingVoucher.findMany({
      where: { userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return vouchers.map((v) => {
      const usedPaise = v.initialValuePaise > v.remainingBalancePaise
        ? v.initialValuePaise - v.remainingBalancePaise
        : 0n;

      return {
        id: v.id,
        voucherCode: v.voucherCode,
        initialValueINR: paiseToRupees(v.initialValuePaise),
        remainingBalanceINR: paiseToRupees(v.remainingBalancePaise),
        usedAmountINR: paiseToRupees(usedPaise),
        issuedReason: v.issuedReason,
        status: v.status,
        expiresAt: v.expiresAt,
        createdAt: v.createdAt,
        isRedeemableForCash: false, // Strict rule: Vouchers cannot be converted to cash
        transactions: v.transactions.map((t) => ({
          id: t.id,
          amountINR: paiseToRupees(t.amountPaise),
          transactionType: t.transactionType,
          referenceId: t.referenceId,
          balanceAfterINR: paiseToRupees(t.balanceAfterPaise),
          narration: t.narration,
          createdAt: t.createdAt,
        })),
      };
    });
  }

  /**
   * Get all voucher transactions for a member
   */
  async getUserVoucherTransactions(userId: string) {
    const vouchers = await this.prisma.shoppingVoucher.findMany({
      where: { userId },
      select: { id: true },
    });

    const voucherIds = vouchers.map((v) => v.id);

    const transactions = await this.prisma.voucherTransaction.findMany({
      where: { voucherId: { in: voucherIds } },
      include: { voucher: { select: { voucherCode: true, issuedReason: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return transactions.map((t) => ({
      id: t.id,
      voucherId: t.voucherId,
      voucherCode: t.voucher.voucherCode,
      amountINR: paiseToRupees(t.amountPaise),
      transactionType: t.transactionType,
      referenceId: t.referenceId,
      balanceAfterINR: paiseToRupees(t.balanceAfterPaise),
      narration: t.narration,
      createdAt: t.createdAt,
    }));
  }

  /**
   * Standalone/API partial or full voucher redemption
   * Atomic, row-locked, balanced double-entry accounting
   *
   * AUTHORIZATION & SCOPE POLICY (Requirement 4):
   * Voucher redemption is authorized SOLELY for simulated EV booking deposits
   * (credited to 2300_EV_BOOKING_DEPOSITS).
   * Final EV vehicle invoice settlement, showroom purchases, and merchandise shopping
   * remain strictly pending business and executive policy approval.
   */
  async redeemVoucher(userId: string, dto: RedeemVoucherDto) {
    if (typeof dto.amountINR !== 'number' || !Number.isFinite(dto.amountINR) || dto.amountINR <= 0) {
      throw new BadRequestException('Redemption amount must be a positive finite number.');
    }
    const amountPaise = BigInt(Math.max(0, Math.round(dto.amountINR * 100)));
    if (amountPaise <= 0n) {
      throw new BadRequestException('Redemption amount must be greater than ₹0.');
    }

    return await this.prisma.$transaction(async (tx) => {
      // 1. Idempotency Check
      if (dto.idempotencyKey) {
        const existingTx = await tx.voucherTransaction.findUnique({
          where: { idempotencyKey: dto.idempotencyKey },
          include: { voucher: true },
        });

        if (existingTx) {
          if (existingTx.voucher.userId !== userId) {
            throw new ForbiddenException('Idempotency key belongs to another account.');
          }
          return {
            message: 'Idempotent replay: Voucher already redeemed.',
            voucher: {
              id: existingTx.voucher.id,
              voucherCode: existingTx.voucher.voucherCode,
              remainingBalanceINR: paiseToRupees(existingTx.voucher.remainingBalancePaise),
              status: existingTx.voucher.status,
            },
            redeemedAmountINR: paiseToRupees(existingTx.amountPaise),
            balanceAfterINR: paiseToRupees(existingTx.balanceAfterPaise),
            transactionId: existingTx.id,
          };
        }
      }

      // 2. Row-Level Lock on Voucher
      await tx.$queryRaw`
        SELECT id FROM "ShoppingVoucher" WHERE id = ${dto.voucherId} FOR UPDATE
      `;

      const voucher = await tx.shoppingVoucher.findUnique({
        where: { id: dto.voucherId },
      });

      if (!voucher) {
        throw new NotFoundException('Shopping voucher not found.');
      }

      // 3. Ownership Verification
      if (voucher.userId !== userId) {
        throw new ForbiddenException('You cannot redeem a voucher belonging to another member.');
      }

      // 4. Status Check
      if (voucher.status === 'FULLY_REDEEMED') {
        throw new BadRequestException('Voucher has already been fully redeemed.');
      }
      if (voucher.status === 'CANCELLED') {
        throw new BadRequestException('Voucher has been cancelled and cannot be redeemed.');
      }
      // CORRECTIVE AUDIT (Requirement 3): Automatic voucher expiration or forfeiture is strictly
      // disabled pending approved business policy. Vouchers remain valid and unexpired.

      // 5. Balance Check
      if (amountPaise > voucher.remainingBalancePaise) {
        throw new BadRequestException(
          `Redemption amount (₹${paiseToRupees(amountPaise)}) exceeds available voucher balance (₹${paiseToRupees(voucher.remainingBalancePaise)}).`
        );
      }

      // 6. Compute new balance and status
      const newBalancePaise = voucher.remainingBalancePaise - amountPaise;
      const newStatus = newBalancePaise === 0n ? 'FULLY_REDEEMED' : 'PARTIALLY_REDEEMED';
      const bookingRef = dto.bookingNumber || `RED-${Date.now().toString().slice(-8)}`;

      // 7. Double-Entry Accounting Entry
      const jnlSuffix = Math.floor(100 + Math.random() * 900);
      const jnlRef = `JNL-RED-${voucher.voucherCode}-${Date.now().toString().slice(-6)}-${jnlSuffix}`;
      const journal = await tx.journalEntry.create({
        data: {
          referenceId: jnlRef,
          eventType: 'VOUCHER_REDEMPTION',
          narration: `Simulated voucher redemption: ${voucher.voucherCode} applied for ₹${paiseToRupees(amountPaise)} against ${bookingRef}`,
          lines: {
            create: [
              {
                account: JournalAccount.SHOPPING_VOUCHER_LIABILITY,
                userId,
                debitPaise: amountPaise,
                creditPaise: 0n,
                description: `Voucher liability reduction on redemption of ${voucher.voucherCode}`,
              },
              {
                account: JournalAccount.EV_BOOKING_DEPOSITS,
                userId,
                debitPaise: 0n,
                creditPaise: amountPaise,
                description: `Booking deposit covered by voucher ${voucher.voucherCode}`,
              },
            ],
          },
        },
      });

      // 8. Update Voucher
      const updatedVoucher = await tx.shoppingVoucher.update({
        where: { id: voucher.id },
        data: {
          remainingBalancePaise: newBalancePaise,
          status: newStatus,
        },
      });

      // 9. Update Member Wallet
      await tx.walletAccount.update({
        where: { userId },
        data: {
          shoppingVoucherBalancePaise: {
            decrement: amountPaise,
          },
        },
      });

      // 10. Record VoucherTransaction
      const vtx = await tx.voucherTransaction.create({
        data: {
          voucherId: voucher.id,
          amountPaise,
          transactionType: 'REDEMPTION',
          referenceId: bookingRef,
          balanceAfterPaise: newBalancePaise,
          narration: `Redeemed ₹${paiseToRupees(amountPaise)} on ${bookingRef}`,
          journalEntryId: journal.id,
          idempotencyKey: dto.idempotencyKey || null,
        },
      });

      return {
        message: 'Voucher redeemed successfully.',
        voucher: {
          id: updatedVoucher.id,
          voucherCode: updatedVoucher.voucherCode,
          initialValueINR: paiseToRupees(updatedVoucher.initialValuePaise),
          remainingBalanceINR: paiseToRupees(updatedVoucher.remainingBalancePaise),
          status: updatedVoucher.status,
        },
        redeemedAmountINR: paiseToRupees(amountPaise),
        balanceAfterINR: paiseToRupees(newBalancePaise),
        transactionId: vtx.id,
        journalEntryId: journal.id,
      };
    });
  }

  /**
   * Explicit prohibition on converting vouchers to earnings wallet cash
   */
  async convertVoucherToEarnings() {
    throw new BadRequestException(
      'Shopping Vouchers are strictly non-convertible into cash, withdrawable earnings, or bank balances.'
    );
  }

  /**
   * Admin Listing of all vouchers with complete audit liability reconciliation
   */
  async getAllVouchersAdmin() {
    const vouchers = await this.prisma.shoppingVoucher.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { memberId: true, fullName: true, email: true },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    let totalIssuedPaise = 0n;
    let totalOutstandingPaise = 0n;
    let totalRedeemedPaise = 0n;

    const formattedVouchers = vouchers.map((v) => {
      const redeemed = v.initialValuePaise > v.remainingBalancePaise
        ? v.initialValuePaise - v.remainingBalancePaise
        : 0n;

      totalIssuedPaise += v.initialValuePaise;
      totalOutstandingPaise += v.remainingBalancePaise;
      totalRedeemedPaise += redeemed;

      return {
        id: v.id,
        voucherCode: v.voucherCode,
        memberId: v.user.memberId,
        memberName: v.user.fullName,
        memberEmail: v.user.email,
        initialValueINR: paiseToRupees(v.initialValuePaise),
        remainingBalanceINR: paiseToRupees(v.remainingBalancePaise),
        redeemedINR: paiseToRupees(redeemed),
        issuedReason: v.issuedReason,
        status: v.status,
        expiresAt: v.expiresAt,
        createdAt: v.createdAt,
        transactionCount: v.transactions.length,
      };
    });

    return {
      metrics: {
        totalVouchers: vouchers.length,
        totalIssuedINR: paiseToRupees(totalIssuedPaise),
        totalOutstandingINR: paiseToRupees(totalOutstandingPaise),
        totalRedeemedINR: paiseToRupees(totalRedeemedPaise),
      },
      vouchers: formattedVouchers,
    };
  }
}
