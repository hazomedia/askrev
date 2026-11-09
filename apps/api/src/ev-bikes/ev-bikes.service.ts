import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paiseToRupees, safeBigIntMin } from '@askrev/shared';

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

  async createBooking(userId: string, bikeId: string, voucherAmountINR: number = 0) {
    const bike = await this.prisma.evBike.findUnique({
      where: { id: bikeId },
    });

    if (!bike) {
      throw new NotFoundException('EV Bike model not found');
    }

    const bookingAmountPaise = bike.bookingAmountPaise;
    const requestedVoucherPaise = BigInt(Math.max(0, Math.round(voucherAmountINR * 100)));

    // Maximum voucher allowed for this bike's booking
    const maxVoucherAllowed = safeBigIntMin(requestedVoucherPaise, bike.voucherRedeemLimitPaise);

    const bookingNumber = `BK-${Date.now().toString().slice(-8)}`;

    const booking = await this.prisma.$transaction(async (tx) => {
      let actualVoucherDeductedPaise = 0n;

      if (maxVoucherAllowed > 0n) {
        const wallet = await tx.walletAccount.findUnique({
          where: { userId },
        });

        if (wallet && wallet.shoppingVoucherBalancePaise > 0n) {
          actualVoucherDeductedPaise = safeBigIntMin(wallet.shoppingVoucherBalancePaise, maxVoucherAllowed);

          // Deduct from wallet voucher balance
          await tx.walletAccount.update({
            where: { userId },
            data: {
              shoppingVoucherBalancePaise: {
                decrement: actualVoucherDeductedPaise,
              },
            },
          });
        }
      }

      const netCashPaidPaise = bookingAmountPaise > actualVoucherDeductedPaise ? bookingAmountPaise - actualVoucherDeductedPaise : 0n;

      return tx.evBooking.create({
        data: {
          bookingNumber,
          userId,
          bikeId,
          bookingAmountPaise,
          voucherAppliedPaise: actualVoucherDeductedPaise,
          netCashPaidPaise,
          bookingStatus: 'PAYMENT_VERIFIED',
          paymentReference: `DEMO-PAY-${Date.now()}`,
        },
        include: {
          bike: true,
        },
      });
    });

    return {
      message: 'Booking created successfully',
      booking: {
        id: booking.id,
        bookingNumber: booking.bookingNumber,
        bikeName: booking.bike.name,
        bookingAmountINR: paiseToRupees(booking.bookingAmountPaise),
        voucherAppliedINR: paiseToRupees(booking.voucherAppliedPaise),
        netCashPaidINR: paiseToRupees(booking.netCashPaidPaise),
        bookingStatus: booking.bookingStatus,
        createdAt: booking.createdAt,
      },
    };
  }

  async getUserBookings(userId: string) {
    const bookings = await this.prisma.evBooking.findMany({
      where: { userId },
      include: { bike: true },
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
      bookingStatus: b.bookingStatus,
      createdAt: b.createdAt,
    }));
  }

  async getAllBookingsAdmin() {
    const bookings = await this.prisma.evBooking.findMany({
      include: {
        bike: true,
        user: { select: { memberId: true, fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return bookings.map((b) => ({
      id: b.id,
      bookingNumber: b.bookingNumber,
      memberName: b.user.fullName,
      memberId: b.user.memberId,
      bikeName: b.bike.name,
      bookingAmountINR: paiseToRupees(b.bookingAmountPaise),
      voucherAppliedINR: paiseToRupees(b.voucherAppliedPaise),
      netCashPaidINR: paiseToRupees(b.netCashPaidPaise),
      bookingStatus: b.bookingStatus,
      createdAt: b.createdAt,
    }));
  }
}
