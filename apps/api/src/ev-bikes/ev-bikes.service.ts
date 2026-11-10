import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paiseToRupees, safeBigIntMin, JournalAccount, UserRole } from '@askrev/shared';

export interface CreateBookingDto {
  bikeId: string;
  voucherId?: string;
  voucherAmountINR?: number;
  idempotencyKey?: string;
}

@Injectable()
export class EvBikesService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllBikes() {
    const bikes = await this.prisma.evBike.findMany({
      where: { isAvailable: true },
      orderBy: { exShowroomPricePaise: 'asc' },
    });

    return bikes.map((b) => ({
      id: b.id,
      modelCode: b.modelCode,
      name: b.name,
      tagline: b.tagline,
      batteryCapacityKwh: b.batteryCapacityKwh,
      rangeKm: b.rangeKm,
      topSpeedKmh: b.topSpeedKmh,
      chargingTimeHours: b.chargingTimeHours,
      exShowroomPriceINR: paiseToRupees(b.exShowroomPricePaise),
      bookingAmountINR: paiseToRupees(b.bookingAmountPaise),
      voucherRedeemLimitINR: paiseToRupees(b.voucherRedeemLimitPaise),
      imageUrl: b.imageUrl,
      isAvailable: b.isAvailable,
      demoNotice: 'Demo specification model for ASKR EV platform prototype',
    }));
  }

  async getBikeById(idOrCode: string) {
    const bike = await this.prisma.evBike.findFirst({
      where: {
        OR: [{ id: idOrCode }, { modelCode: idOrCode }],
      },
    });

    if (!bike) {
      throw new NotFoundException(`EV Bike model '${idOrCode}' not found`);
    }

    return {
      id: bike.id,
      modelCode: bike.modelCode,
      name: bike.name,
      tagline: bike.tagline,
      batteryCapacityKwh: bike.batteryCapacityKwh,
      rangeKm: bike.rangeKm,
      topSpeedKmh: bike.topSpeedKmh,
      chargingTimeHours: bike.chargingTimeHours,
      exShowroomPriceINR: paiseToRupees(bike.exShowroomPricePaise),
      bookingAmountINR: paiseToRupees(bike.bookingAmountPaise),
      voucherRedeemLimitINR: paiseToRupees(bike.voucherRedeemLimitPaise),
      imageUrl: bike.imageUrl,
      isAvailable: bike.isAvailable,
      specs: {
        motorType: 'Permanent Magnet Synchronous Motor (PMSM)',
        peakPowerKw: bike.topSpeedKmh > 100 ? 12.5 : bike.topSpeedKmh > 80 ? 8.5 : 6.0,
        peakTorqueNm: bike.topSpeedKmh > 100 ? 78 : bike.topSpeedKmh > 80 ? 52 : 36,
        acceleration0to40: bike.topSpeedKmh > 100 ? '2.8 sec' : bike.topSpeedKmh > 80 ? '3.5 sec' : '4.2 sec',
        brakes: 'Dual Disc with CBS & Regenerative Braking',
        display: '7-inch High-Brightness Touch TFT with Telemetry & Navigation',
        connectivity: '4G eSIM with Real-time GPS & OTA Updates',
        ridingModes: ['Eco', 'Ride', 'Sport', 'Reverse Assist'],
        warranty: '3 Years / 50,000 km Comprehensive Warranty',
      },
      demoNotice: 'Demo specification model for ASKR EV platform prototype',
    };
  }

  /**
   * Create an EV Bike Booking with atomic Shopping Voucher redemption and balanced ledger accounting
   *
   * AUTHORIZATION & SCOPE POLICY (Requirement 4):
   * Voucher redemption is authorized SOLELY for simulated EV booking deposits
   * (credited to 2300_EV_BOOKING_DEPOSITS).
   * Final EV vehicle invoice settlement, showroom purchases, and merchandise shopping
   * remain strictly pending business and executive policy approval.
   */
  async createBooking(userId: string, dto: CreateBookingDto) {
    const bike = await this.prisma.evBike.findUnique({
      where: { id: dto.bikeId },
    });

    if (!bike) {
      throw new NotFoundException('EV Bike model not found.');
    }

    const bookingAmountPaise = bike.bookingAmountPaise;
    const requestedVoucherPaise = dto.voucherAmountINR
      ? BigInt(Math.max(0, Math.round(dto.voucherAmountINR * 100)))
      : 0n;

    const bookingNumber = `BK-${Date.now().toString().slice(-8)}`;

    return await this.prisma.$transaction(async (tx) => {
      let appliedVoucherId: string | null = null;
      let actualVoucherDeductedPaise = 0n;

      if (requestedVoucherPaise > 0n) {
        // Resolve voucher
        let voucher = null;
        if (dto.voucherId) {
          await tx.$queryRaw`
            SELECT id FROM "ShoppingVoucher" WHERE id = ${dto.voucherId} FOR UPDATE
          `;
          voucher = await tx.shoppingVoucher.findUnique({
            where: { id: dto.voucherId },
          });

          if (!voucher) {
            throw new NotFoundException('Specified shopping voucher not found.');
          }
          if (voucher.userId !== userId) {
            throw new ForbiddenException('You cannot redeem a voucher belonging to another member.');
          }
        } else {
          // Find earliest active voucher with positive balance
          voucher = await tx.shoppingVoucher.findFirst({
            where: {
              userId,
              remainingBalancePaise: { gt: 0n },
              status: { in: ['ACTIVE', 'PARTIALLY_REDEEMED'] },
            },
            orderBy: { createdAt: 'asc' },
          });

          if (voucher) {
            await tx.$queryRaw`
              SELECT id FROM "ShoppingVoucher" WHERE id = ${voucher.id} FOR UPDATE
            `;
            voucher = await tx.shoppingVoucher.findUnique({
              where: { id: voucher.id },
            });
          }
        }

        if (!voucher) {
          throw new BadRequestException('No eligible active shopping voucher found with available balance.');
        }

        if (voucher.status === 'FULLY_REDEEMED' || voucher.status === 'CANCELLED') {
          throw new BadRequestException(`Voucher ${voucher.voucherCode} is ${voucher.status} and cannot be redeemed.`);
        }

        if (requestedVoucherPaise > voucher.remainingBalancePaise) {
          throw new BadRequestException(
            `Requested voucher amount (₹${paiseToRupees(requestedVoucherPaise)}) exceeds available balance (₹${paiseToRupees(voucher.remainingBalancePaise)}).`
          );
        }

        // Cap deduction to remaining balance, requested amount, and bike booking limit
        const cap1 = safeBigIntMin(requestedVoucherPaise, voucher.remainingBalancePaise);
        const cap2 = safeBigIntMin(cap1, bike.voucherRedeemLimitPaise);
        actualVoucherDeductedPaise = safeBigIntMin(cap2, bookingAmountPaise);

        if (actualVoucherDeductedPaise > 0n) {
          appliedVoucherId = voucher.id;
          const newVoucherBalance = voucher.remainingBalancePaise - actualVoucherDeductedPaise;
          const newStatus = newVoucherBalance === 0n ? 'FULLY_REDEEMED' : 'PARTIALLY_REDEEMED';

          // Update Voucher
          await tx.shoppingVoucher.update({
            where: { id: voucher.id },
            data: {
              remainingBalancePaise: newVoucherBalance,
              status: newStatus,
            },
          });

          // Update Wallet
          await tx.walletAccount.update({
            where: { userId },
            data: {
              shoppingVoucherBalancePaise: {
                decrement: actualVoucherDeductedPaise,
              },
            },
          });

          // Record VoucherTransaction
          await tx.voucherTransaction.create({
            data: {
              voucherId: voucher.id,
              amountPaise: actualVoucherDeductedPaise,
              transactionType: 'REDEMPTION',
              referenceId: bookingNumber,
              balanceAfterPaise: newVoucherBalance,
              narration: `Applied to EV booking ${bookingNumber} (${bike.name})`,
              idempotencyKey: dto.idempotencyKey || null,
            },
          });
        }
      }

      const netCashPaidPaise = bookingAmountPaise > actualVoucherDeductedPaise
        ? bookingAmountPaise - actualVoucherDeductedPaise
        : 0n;

      // Balanced Double-Entry Journal Entry
      const jnlRef = `JNL-BK-${bookingNumber}`;
      const journalLines: any[] = [];

      if (actualVoucherDeductedPaise > 0n) {
        journalLines.push(
          {
            account: JournalAccount.SHOPPING_VOUCHER_LIABILITY,
            userId,
            debitPaise: actualVoucherDeductedPaise,
            creditPaise: 0n,
            description: `Voucher liability redeemed for booking ${bookingNumber}`,
          },
          {
            account: JournalAccount.EV_BOOKING_DEPOSITS,
            userId,
            debitPaise: 0n,
            creditPaise: actualVoucherDeductedPaise,
            description: `Voucher applied to booking deposit ${bookingNumber}`,
          }
        );
      }

      if (netCashPaidPaise > 0n) {
        journalLines.push(
          {
            account: JournalAccount.CASH_AND_BANK,
            userId,
            debitPaise: netCashPaidPaise,
            creditPaise: 0n,
            description: `Simulated cash received for booking deposit ${bookingNumber}`,
          },
          {
            account: JournalAccount.EV_BOOKING_DEPOSITS,
            userId,
            debitPaise: 0n,
            creditPaise: netCashPaidPaise,
            description: `Cash portion of booking deposit ${bookingNumber}`,
          }
        );
      }

      const journal = await tx.journalEntry.create({
        data: {
          referenceId: jnlRef,
          eventType: 'EV_BOOKING_RESERVATION',
          narration: `Simulated EV reservation for ${bike.name} (${bookingNumber})`,
          lines: {
            create: journalLines,
          },
        },
      });

      // Create Booking Record
      const booking = await tx.evBooking.create({
        data: {
          bookingNumber,
          userId,
          bikeId: bike.id,
          voucherId: appliedVoucherId,
          bookingAmountPaise,
          voucherAppliedPaise: actualVoucherDeductedPaise,
          netCashPaidPaise,
          bookingStatus: 'PAYMENT_VERIFIED',
          paymentReference: `DEMO-PAY-${Date.now()}`,
          journalEntryId: journal.id,
        },
        include: {
          bike: true,
          voucher: true,
        },
      });

      // Administrative Audit Log
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'EV_BOOKING_CREATED',
          entityType: 'EV_BOOKING',
          entityId: booking.id,
          metadata: {
            bookingNumber,
            bikeName: bike.name,
            bookingAmountINR: paiseToRupees(bookingAmountPaise),
            voucherAppliedINR: paiseToRupees(actualVoucherDeductedPaise),
            netCashPaidINR: paiseToRupees(netCashPaidPaise),
            complianceMode: 'SIMULATION_ONLY',
          },
        },
      });

      return {
        message: 'Booking created successfully.',
        booking: {
          id: booking.id,
          bookingNumber: booking.bookingNumber,
          bikeName: booking.bike.name,
          modelCode: booking.bike.modelCode,
          bookingAmountINR: paiseToRupees(booking.bookingAmountPaise),
          voucherAppliedINR: paiseToRupees(booking.voucherAppliedPaise),
          netCashPaidINR: paiseToRupees(booking.netCashPaidPaise),
          voucherCode: booking.voucher?.voucherCode || null,
          bookingStatus: booking.bookingStatus,
          journalEntryId: journal.id,
          createdAt: booking.createdAt,
        },
      };
    });
  }

  /**
   * Cancel an EV Booking and reverse voucher redemption atomically
   */
  async cancelBooking(userId: string, bookingIdOrNumber: string, cancellationReason?: string) {
    return await this.prisma.$transaction(async (tx) => {
      // Find booking
      const booking = await tx.evBooking.findFirst({
        where: {
          OR: [{ id: bookingIdOrNumber }, { bookingNumber: bookingIdOrNumber }],
        },
        include: {
          bike: true,
          voucher: true,
        },
      });

      if (!booking) {
        throw new NotFoundException('Booking reservation not found.');
      }

      // Authorization: Caller must be owner or admin
      const actor = await tx.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      const isAdmin =
        actor?.role === UserRole.SUPER_ADMIN ||
        actor?.role === UserRole.ADMIN_OPERATIONS ||
        actor?.role === UserRole.FINANCE_MANAGER;

      if (!isAdmin && booking.userId !== userId) {
        throw new ForbiddenException('You cannot cancel another member\'s booking reservation.');
      }

      // Check if already cancelled
      if (booking.bookingStatus === 'CANCELLED') {
        throw new BadRequestException('Booking is already cancelled. Repeated cancellation is not permitted.');
      }

      // Row-Level Lock on Booking
      await tx.$queryRaw`
        SELECT id FROM "EvBooking" WHERE id = ${booking.id} FOR UPDATE
      `;

      let restoredVoucherBalanceINR = 0;

      // Reverse Voucher Redemption if applied
      if (booking.voucherId && booking.voucherAppliedPaise > 0n) {
        await tx.$queryRaw`
          SELECT id FROM "ShoppingVoucher" WHERE id = ${booking.voucherId} FOR UPDATE
        `;

        const voucher = await tx.shoppingVoucher.findUnique({
          where: { id: booking.voucherId },
        });

        if (voucher) {
          const restoredBalancePaise = voucher.remainingBalancePaise + booking.voucherAppliedPaise;
          const restoredStatus = restoredBalancePaise === voucher.initialValuePaise
            ? 'ACTIVE'
            : 'PARTIALLY_REDEEMED';

          // Restore Voucher
          await tx.shoppingVoucher.update({
            where: { id: voucher.id },
            data: {
              remainingBalancePaise: restoredBalancePaise,
              status: restoredStatus,
            },
          });

          // Restore Member Wallet
          await tx.walletAccount.update({
            where: { userId: booking.userId },
            data: {
              shoppingVoucherBalancePaise: {
                increment: booking.voucherAppliedPaise,
              },
            },
          });

          // Record Reversal Transaction
          await tx.voucherTransaction.create({
            data: {
              voucherId: voucher.id,
              amountPaise: booking.voucherAppliedPaise,
              transactionType: 'REVERSAL',
              referenceId: booking.bookingNumber,
              balanceAfterPaise: restoredBalancePaise,
              narration: `Voucher value restored due to cancellation of booking ${booking.bookingNumber}`,
            },
          });

          restoredVoucherBalanceINR = paiseToRupees(restoredBalancePaise);
        }
      }

      // Compensating Double-Entry Journal Entry
      const compJnlRef = `JNL-CAN-${booking.bookingNumber}-${Date.now().toString().slice(-6)}`;
      const compLines: any[] = [];

      if (booking.voucherAppliedPaise > 0n) {
        compLines.push(
          {
            account: JournalAccount.EV_BOOKING_DEPOSITS,
            userId: booking.userId,
            debitPaise: booking.voucherAppliedPaise,
            creditPaise: 0n,
            description: `Reversal of voucher deposit for cancelled booking ${booking.bookingNumber}`,
          },
          {
            account: JournalAccount.SHOPPING_VOUCHER_LIABILITY,
            userId: booking.userId,
            debitPaise: 0n,
            creditPaise: booking.voucherAppliedPaise,
            description: `Restoration of shopping voucher liability for ${booking.bookingNumber}`,
          }
        );
      }

      if (booking.netCashPaidPaise > 0n) {
        compLines.push(
          {
            account: JournalAccount.EV_BOOKING_DEPOSITS,
            userId: booking.userId,
            debitPaise: booking.netCashPaidPaise,
            creditPaise: 0n,
            description: `Reversal of cash deposit for cancelled booking ${booking.bookingNumber}`,
          },
          {
            account: JournalAccount.CASH_AND_BANK,
            userId: booking.userId,
            debitPaise: 0n,
            creditPaise: booking.netCashPaidPaise,
            description: `Simulated refund of cash for cancelled booking ${booking.bookingNumber}`,
          }
        );
      }

      let compJournalId = null;
      if (compLines.length > 0) {
        const compJournal = await tx.journalEntry.create({
          data: {
            referenceId: compJnlRef,
            eventType: 'EV_BOOKING_CANCELLATION',
            narration: `Simulated cancellation reversal for ${booking.bike.name} (${booking.bookingNumber})`,
            lines: {
              create: compLines,
            },
          },
        });
        compJournalId = compJournal.id;
      }

      // Update Booking Record
      const updatedBooking = await tx.evBooking.update({
        where: { id: booking.id },
        data: {
          bookingStatus: 'CANCELLED',
          cancellationReason: cancellationReason || 'Simulated member cancellation',
          cancelledAt: new Date(),
          journalEntryId: compJournalId || booking.journalEntryId,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'EV_BOOKING_CANCELLED',
          entityType: 'EV_BOOKING',
          entityId: booking.id,
          metadata: {
            bookingNumber: booking.bookingNumber,
            voucherRestoredINR: paiseToRupees(booking.voucherAppliedPaise),
            cashRefundedINR: paiseToRupees(booking.netCashPaidPaise),
            reason: cancellationReason,
            complianceMode: 'SIMULATION_ONLY',
          },
        },
      });

      return {
        message: 'Booking cancelled successfully and voucher value restored.',
        bookingNumber: updatedBooking.bookingNumber,
        bookingStatus: updatedBooking.bookingStatus,
        cancellationReason: updatedBooking.cancellationReason,
        voucherRestoredINR: paiseToRupees(booking.voucherAppliedPaise),
        cashRefundedINR: paiseToRupees(booking.netCashPaidPaise),
        voucherNewBalanceINR: restoredVoucherBalanceINR,
      };
    });
  }

  async getUserBookings(userId: string) {
    const bookings = await this.prisma.evBooking.findMany({
      where: { userId },
      include: {
        bike: true,
        voucher: { select: { voucherCode: true, remainingBalancePaise: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return bookings.map((b) => ({
      id: b.id,
      bookingNumber: b.bookingNumber,
      bikeName: b.bike.name,
      modelCode: b.bike.modelCode,
      bookingAmountINR: paiseToRupees(b.bookingAmountPaise),
      voucherAppliedINR: paiseToRupees(b.voucherAppliedPaise),
      netCashPaidINR: paiseToRupees(b.netCashPaidPaise),
      voucherCode: b.voucher?.voucherCode || null,
      bookingStatus: b.bookingStatus,
      cancellationReason: b.cancellationReason,
      cancelledAt: b.cancelledAt,
      createdAt: b.createdAt,
    }));
  }

  async getAllBookingsAdmin() {
    const bookings = await this.prisma.evBooking.findMany({
      include: {
        bike: true,
        user: { select: { memberId: true, fullName: true, email: true } },
        voucher: { select: { voucherCode: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    let totalBookingDepositsPaise = 0n;
    let totalVouchersAppliedPaise = 0n;
    let totalNetCashPaise = 0n;

    for (const b of bookings) {
      if (b.bookingStatus !== 'CANCELLED') {
        totalBookingDepositsPaise += b.bookingAmountPaise;
        totalVouchersAppliedPaise += b.voucherAppliedPaise;
        totalNetCashPaise += b.netCashPaidPaise;
      }
    }

    return {
      metrics: {
        totalBookings: bookings.length,
        totalBookingDepositsINR: paiseToRupees(totalBookingDepositsPaise),
        totalVouchersAppliedINR: paiseToRupees(totalVouchersAppliedPaise),
        totalNetCashINR: paiseToRupees(totalNetCashPaise),
      },
      bookings: bookings.map((b) => ({
        id: b.id,
        bookingNumber: b.bookingNumber,
        memberName: b.user.fullName,
        memberId: b.user.memberId,
        memberEmail: b.user.email,
        bikeName: b.bike.name,
        bookingAmountINR: paiseToRupees(b.bookingAmountPaise),
        voucherAppliedINR: paiseToRupees(b.voucherAppliedPaise),
        netCashPaidINR: paiseToRupees(b.netCashPaidPaise),
        voucherCode: b.voucher?.voucherCode || null,
        bookingStatus: b.bookingStatus,
        cancellationReason: b.cancellationReason,
        cancelledAt: b.cancelledAt,
        createdAt: b.createdAt,
      })),
    };
  }
}
