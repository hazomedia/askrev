'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  X,
  Zap,
  CheckCircle2,
  Ticket,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  Receipt,
  Bike,
} from 'lucide-react';
import { fetchApi } from '../lib/api';

interface BookingModalProps {
  bike: any | null;
  isOpen: boolean;
  onClose: () => void;
  user: any | null;
  onSuccess?: () => void;
}

export default function BookingModal({
  bike,
  isOpen,
  onClose,
  user,
  onSuccess,
}: BookingModalProps) {
  const router = useRouter();
  const [voucherAmount, setVoucherAmount] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingResult, setBookingResult] = useState<any | null>(null);

  useEffect(() => {
    if (bike && user) {
      const availableVoucher = user.wallet?.shoppingVoucherINR || 0;
      const maxAllowed = Math.min(
        availableVoucher,
        bike.voucherRedeemLimitINR,
        bike.bookingAmountINR
      );
      setVoucherAmount(maxAllowed);
      setBookingResult(null);
      setError(null);
    }
  }, [bike, user, isOpen]);

  if (!isOpen || !bike) return null;

  const availableVoucherINR = user?.wallet?.shoppingVoucherINR || 0;
  const maxVoucherLimit = Math.min(
    availableVoucherINR,
    bike.voucherRedeemLimitINR,
    bike.bookingAmountINR
  );
  const netCashPaid = Math.max(0, bike.bookingAmountINR - voucherAmount);

  const handleBookingSubmit = async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetchApi<any>('/ev-bikes/book', {
        method: 'POST',
        body: JSON.stringify({
          bikeId: bike.id,
          voucherAmountINR: voucherAmount,
        }),
      });

      setBookingResult(response.booking);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to complete booking reservation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md animate-fadeIn">
      <div className="card-gradient w-full max-w-lg rounded-3xl border border-navy-700/90 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-navy-800 bg-navy-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-electric-500/20 border border-electric-500/40 flex items-center justify-center text-electric-400">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Reserve {bike.name}</h2>
              <div className="text-xs text-slate-400">Model: {bike.modelCode}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-navy-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto max-h-[80vh]">
          {/* Unauthenticated Guard */}
          {!user ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-electric-500/10 border border-electric-500/30 flex items-center justify-center mx-auto text-electric-400">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Member Login Required</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  To reserve your EV bike and apply shopping voucher discounts, sign in or register your free member ID.
                </p>
              </div>
              <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/auth/login"
                  className="px-6 py-2.5 rounded-xl bg-navy-800 hover:bg-navy-700 border border-navy-600 text-slate-200 text-xs font-bold text-center"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-electric-600 to-electric-500 text-white text-xs font-bold shadow-md text-center"
                >
                  Register Free
                </Link>
              </div>
            </div>
          ) : bookingResult ? (
            /* Successful Booking State */
            <div className="py-4 space-y-5 text-center">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                  Booking Verified
                </span>
                <h3 className="text-2xl font-black text-white mt-1">Reservation Confirmed!</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Your booking request for {bookingResult.bikeName} has been processed.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-navy-900 border border-navy-800 text-left space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Booking Reference:</span>
                  <span className="font-mono font-bold text-electric-400 text-sm">
                    {bookingResult.bookingNumber}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Token Amount:</span>
                  <span className="text-slate-200 font-bold">
                    ₹{bookingResult.bookingAmountINR.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Voucher Applied:</span>
                  <span className="text-emerald-400 font-bold">
                    -₹{bookingResult.voucherAppliedINR.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="pt-2 border-t border-navy-800 flex justify-between items-center text-sm">
                  <span className="font-bold text-white">Net Paid:</span>
                  <span className="font-black text-electric-400">
                    ₹{bookingResult.netCashPaidINR.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="pt-3 flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/dashboard"
                  onClick={onClose}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-electric-600 to-electric-500 text-white font-bold text-xs shadow-md text-center flex items-center justify-center gap-1.5"
                >
                  <Receipt className="w-4 h-4" />
                  <span>View in Member Portal</span>
                </Link>
                <button
                  onClick={onClose}
                  className="px-6 py-3 rounded-xl bg-navy-800 hover:bg-navy-700 text-slate-300 font-bold text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            /* Active Booking Form */
            <div className="space-y-5">
              {/* Bike Summary Box */}
              <div className="p-4 rounded-2xl bg-navy-900/80 border border-navy-800 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-white">{bike.name}</div>
                  <div className="text-xs text-slate-400">Ex-Showroom: ₹{bike.exShowroomPriceINR.toLocaleString('en-IN')}</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-slate-400 uppercase font-bold">Booking Deposit</div>
                  <div className="text-lg font-black text-electric-400">
                    ₹{bike.bookingAmountINR.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Shopping Voucher Redemption Slider / Input */}
              <div className="p-4 rounded-2xl bg-navy-900/60 border border-navy-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">Apply Shopping Voucher</span>
                  </div>
                  <span className="text-xs text-slate-400">
                    Available: <strong className="text-emerald-400">₹{availableVoucherINR.toLocaleString('en-IN')}</strong>
                  </span>
                </div>

                {maxVoucherLimit > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Redeem Amount:</span>
                      <span className="font-mono font-bold text-emerald-400 text-sm">
                        ₹{voucherAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={maxVoucherLimit}
                      step="500"
                      value={voucherAmount}
                      onChange={(e) => setVoucherAmount(Number(e.target.value))}
                      className="w-full h-2 bg-navy-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>₹0</span>
                      <span>Max eligible: ₹{maxVoucherLimit.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 bg-navy-950 p-2.5 rounded-xl border border-navy-800">
                    {availableVoucherINR === 0 ? (
                      <span>No active shopping voucher found. Upgrade to Full Membership to receive ₹30,000 vouchers.</span>
                    ) : (
                      <span>This bike model does not permit voucher discounts on booking token.</span>
                    )}
                  </div>
                )}
              </div>

              {/* Price Breakdown Calculation */}
              <div className="p-4 rounded-2xl bg-navy-900 border border-navy-800 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Standard Booking Token:</span>
                  <span className="text-slate-200">₹{bike.bookingAmountINR.toLocaleString('en-IN')}</span>
                </div>
                {voucherAmount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Voucher Discount:</span>
                    <span>-₹{voucherAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-navy-800 flex justify-between items-center text-sm font-bold">
                  <span className="text-white">Net Cash Payable Today:</span>
                  <span className="text-xl font-black text-electric-400">
                    ₹{netCashPaid.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Terms Notice */}
              <div className="text-[11px] text-slate-400 leading-relaxed">
                By clicking Confirm, your booking token will be reserved. In simulation mode, test payment references are automatically recorded.
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-navy-800 hover:bg-navy-700 text-slate-300 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBookingSubmit}
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-electric-600 to-electric-500 hover:from-electric-500 hover:to-electric-400 text-white font-bold text-xs shadow-lg shadow-electric-500/25 flex items-center gap-2 disabled:opacity-60"
                >
                  <Zap className="w-4 h-4 fill-white" />
                  <span>{submitting ? 'Reserving...' : 'Confirm Reservation'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
