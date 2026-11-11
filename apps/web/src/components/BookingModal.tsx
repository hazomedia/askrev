'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';
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
  const [activeVouchers, setActiveVouchers] = useState<any[]>([]);
  const [selectedVoucherId, setSelectedVoucherId] = useState<string>('');
  const [loadingVouchers, setLoadingVouchers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingResult, setBookingResult] = useState<any | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setBookingResult(null);
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (bike && user && isOpen && !bookingResult) {
      setLoadingVouchers(true);
      fetchApi<any[]>('/vouchers/my-vouchers')
        .then((vouchers) => {
          const active = (vouchers || []).filter(
            (v) => (v.status === 'ACTIVE' || v.status === 'PARTIALLY_REDEEMED') && v.remainingBalanceINR > 0
          );
          setActiveVouchers(active);
          const totalAvail = active.reduce((acc, v) => acc + v.remainingBalanceINR, 0);
          const maxAllowed = Math.min(
            totalAvail,
            bike.voucherRedeemLimitINR,
            bike.bookingAmountINR
          );
          setVoucherAmount(maxAllowed);
          if (active.length > 0) {
            setSelectedVoucherId(active[0].id);
          } else {
            setSelectedVoucherId('');
          }
        })
        .catch(() => {
          const fallbackAvail = user.wallet?.shoppingVoucherINR || 0;
          setVoucherAmount(Math.min(fallbackAvail, bike.voucherRedeemLimitINR, bike.bookingAmountINR));
        })
        .finally(() => setLoadingVouchers(false));
    }
  }, [bike?.id, user?.id, isOpen]);

  if (!isOpen || !bike) return null;

  const totalAvailableVoucherINR = activeVouchers.length > 0
    ? activeVouchers.reduce((acc, v) => acc + v.remainingBalanceINR, 0)
    : user?.wallet?.shoppingVoucherINR || 0;

  const maxVoucherLimit = Math.min(
    totalAvailableVoucherINR,
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
          voucherId: selectedVoucherId || undefined,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-xl border border-slate-200 shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-[#253247]">Reserve {bike.name}</h2>
            <div className="text-xs text-slate-500">Model: {bike.modelCode}</div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {!user ? (
            <div className="text-center py-4 space-y-3">
              <h3 className="text-base font-bold text-[#253247]">Sign In Required</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Please sign in to your member account to complete your EV booking reservation.
              </p>
              <div className="pt-2 flex justify-center gap-3">
                <Link
                  href="/auth/login"
                  className="px-5 py-2 rounded-lg bg-[#165DAD] text-white text-xs font-medium hover:bg-[#124B8D]"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  className="px-5 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50"
                >
                  Register Free
                </Link>
              </div>
            </div>
          ) : bookingResult ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 rounded-full bg-green-50 border border-green-200 text-green-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#253247]">Reservation Confirmed</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Your simulated EV reservation for {bookingResult.bikeName} has been recorded (Simulation Mode — no real funds charged).
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Booking Reference:</span>
                  <span className="font-mono font-semibold text-[#165DAD]">
                    {bookingResult.bookingNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Simulated Booking Token:</span>
                  <span className="text-slate-700 font-medium">
                    ₹{bookingResult.bookingAmountINR.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Voucher Applied:</span>
                  <span className="text-green-700 font-medium">
                    -₹{bookingResult.voucherAppliedINR.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm">
                  <span className="text-[#253247]">Simulated Cash Paid:</span>
                  <span className="text-[#165DAD]">
                    ₹{bookingResult.netCashPaidINR.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-center gap-3">
                <Link
                  href="/dashboard"
                  onClick={onClose}
                  className="px-5 py-2 rounded-lg bg-[#165DAD] text-white text-xs font-medium hover:bg-[#124B8D]"
                >
                  View in Dashboard
                </Link>
                <button
                  onClick={onClose}
                  className="px-5 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Bike details summary */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex justify-between items-center text-xs">
                <div>
                  <div className="font-semibold text-[#253247]">{bike.name}</div>
                  <div className="text-slate-500 text-[11px]">
                    Ex-Showroom: ₹{bike.exShowroomPriceINR.toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">Booking Token</span>
                  <span className="font-bold text-[#165DAD] text-sm">
                    ₹{bike.bookingAmountINR.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Voucher deduction */}
              {totalAvailableVoucherINR > 0 && maxVoucherLimit > 0 ? (
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-[#253247]">Apply Shopping Voucher</span>
                    <span className="text-slate-500">
                      Balance: <strong>₹{totalAvailableVoucherINR.toLocaleString('en-IN')}</strong>
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Redeem:</span>
                    <span className="font-bold text-green-700">
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
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#165DAD]"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>₹0</span>
                    <span>Max: ₹{maxVoucherLimit.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ) : null}

              {/* Price summary table */}
              <div className="p-3.5 rounded-lg border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Simulated Booking Token:</span>
                  <span>₹{bike.bookingAmountINR.toLocaleString('en-IN')}</span>
                </div>
                {voucherAmount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Shopping Voucher Discount:</span>
                    <span>-₹{voucherAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm">
                  <span className="text-[#253247]">Simulated Cash Payable:</span>
                  <span className="text-[#165DAD]">₹{netCashPaid.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBookingSubmit}
                  disabled={submitting || loadingVouchers}
                  className="px-5 py-2 rounded-lg bg-[#165DAD] text-white text-xs font-medium hover:bg-[#124B8D] disabled:opacity-50"
                >
                  {submitting ? 'Processing...' : loadingVouchers ? 'Loading Vouchers...' : 'Confirm Reservation'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
