'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bike, Zap, BatteryCharging, Gauge, Timer, Check, ShieldCheck, AlertCircle } from 'lucide-react';
import { fetchApi, getStoredUser } from '../../lib/api';

export default function BikesPage() {
  const router = useRouter();
  const [bikes, setBikes] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [selectedBike, setSelectedBike] = useState<any>(null);
  const [voucherAmount, setVoucherAmount] = useState<number>(0);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBikes();
    loadProfile();
  }, []);

  const loadBikes = async () => {
    try {
      const data = await fetchApi<any[]>('/ev-bikes');
      setBikes(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  const loadProfile = async () => {
    const stored = getStoredUser();
    if (!stored) return;
    try {
      const profile = await fetchApi<any>('/auth/me');
      setUserProfile(profile);
    } catch (err) {
      console.error(err);
    }
  };

  const openBookingModal = (bike: any) => {
    if (!userProfile) {
      router.push('/auth/login');
      return;
    }
    setSelectedBike(bike);
    // Pre-fill with available voucher up to limit
    const availableVoucher = userProfile.wallet?.shoppingVoucherINR || 0;
    const maxAllowed = Math.min(availableVoucher, bike.voucherRedeemLimitINR, bike.bookingAmountINR);
    setVoucherAmount(maxAllowed);
    setBookingSuccess(null);
    setError(null);
  };

  const handleConfirmBooking = async () => {
    if (!selectedBike) return;
    setBookingLoading(true);
    setError(null);
    try {
      const res: any = await fetchApi('/ev-bikes/book', {
        method: 'POST',
        body: JSON.stringify({
          bikeId: selectedBike.id,
          voucherAmountINR: Number(voucherAmount),
        }),
      });

      setBookingSuccess(`Booking #${res.booking.bookingNumber} confirmed! Net cash paid: ₹${res.booking.netCashPaidINR}`);
      await loadProfile();
      setTimeout(() => {
        setSelectedBike(null);
        router.push('/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Booking submission failed');
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-electric-500/10 border border-electric-500/20 text-electric-400 text-xs font-semibold">
          <Bike className="w-3.5 h-3.5" />
          <span>Demo Prototype Fleet</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white mt-2">
          High-Performance Electric Motorbikes
        </h1>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl">
          Zero-emission urban powertrains engineered for speed, range, and connected telematics. Use your verified Shopping Vouchers to discount booking deposits.
        </p>
      </div>

      {/* Grid of Bikes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {bikes.map((bike) => (
          <div key={bike.id} className="card-gradient rounded-2xl p-6 border-navy-700 flex flex-col justify-between hover:border-slate-500 transition-all">
            <div>
              {/* Image Placeholder Banner */}
              <div className="h-44 rounded-xl bg-gradient-to-br from-navy-800 to-navy-950 flex flex-col items-center justify-center border border-navy-700/60 mb-5 relative overflow-hidden group">
                <Bike className="w-20 h-20 text-electric-400 group-hover:scale-110 transition-transform" />
                <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold bg-navy-950/80 text-slate-400 border border-navy-700">
                  {bike.modelCode}
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <h3 className="text-xl font-bold text-white">{bike.name}</h3>
                <span className="text-xs font-semibold text-emerald-400">In Stock</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">{bike.tagline}</p>

              {/* Specs Pills */}
              <div className="mt-4 grid grid-cols-3 gap-2 py-3 border-y border-navy-800/80 text-center">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase flex items-center justify-center gap-1">
                    <Gauge className="w-3 h-3 text-electric-400" /> Range
                  </div>
                  <div className="text-sm font-bold text-white mt-0.5">{bike.rangeKm} km</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase flex items-center justify-center gap-1">
                    <Zap className="w-3 h-3 text-amber-400" /> Speed
                  </div>
                  <div className="text-sm font-bold text-white mt-0.5">{bike.topSpeedKmh} km/h</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase flex items-center justify-center gap-1">
                    <Timer className="w-3 h-3 text-emerald-400" /> Charge
                  </div>
                  <div className="text-sm font-bold text-white mt-0.5">{bike.chargingTimeHours} h</div>
                </div>
              </div>

              {/* Price Details */}
              <div className="mt-4 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Ex-Showroom Price:</span>
                  <span className="font-bold text-white">₹{bike.exShowroomPriceINR.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Booking Deposit:</span>
                  <span className="font-bold text-electric-400">₹{bike.bookingAmountINR.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-[11px] text-emerald-400">
                  <span>Max Voucher Discount:</span>
                  <span>Up to ₹{bike.voucherRedeemLimitINR.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-navy-800">
              <button
                onClick={() => openBookingModal(bike)}
                className="w-full py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-electric-600 to-electric-500 hover:from-electric-500 hover:to-electric-400 shadow-md shadow-electric-600/20 transition-all"
              >
                Book This EV
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Booking Modal */}
      {selectedBike && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card-gradient rounded-2xl max-w-md w-full p-6 border-navy-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-navy-800 pb-3">
              <h3 className="text-base font-bold text-white">Reserve {selectedBike.name}</h3>
              <button
                onClick={() => setSelectedBike(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {bookingSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold text-center">
                {bookingSuccess}
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {error && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-medium">
                    {error}
                  </div>
                )}

                <div className="p-3 rounded-xl bg-navy-950 border border-navy-800 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Required Deposit:</span>
                    <span className="font-bold text-white">₹{selectedBike.bookingAmountINR.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-electric-400">
                    <span>Your Shopping Voucher Balance:</span>
                    <span className="font-bold">₹{userProfile?.wallet?.shoppingVoucherINR?.toLocaleString('en-IN') ?? 0}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Apply Shopping Voucher Amount (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={Math.min(
                      userProfile?.wallet?.shoppingVoucherINR || 0,
                      selectedBike.voucherRedeemLimitINR,
                      selectedBike.bookingAmountINR
                    )}
                    value={voucherAmount}
                    onChange={(e) => setVoucherAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-navy-700 text-white font-mono"
                  />
                  <div className="text-[10px] text-slate-500 mt-1">
                    Max allowed for this bike: ₹{selectedBike.voucherRedeemLimitINR.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-navy-950/80 border border-navy-800 flex justify-between items-center text-sm font-bold">
                  <span className="text-slate-300">Net Cash Payable:</span>
                  <span className="text-emerald-400">
                    ₹{Math.max(0, selectedBike.bookingAmountINR - Number(voucherAmount)).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedBike(null)}
                    className="w-1/3 py-2.5 rounded-xl bg-navy-800 text-slate-300 hover:bg-navy-700 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmBooking}
                    disabled={bookingLoading}
                    className="w-2/3 py-2.5 rounded-xl bg-gradient-to-r from-electric-600 to-electric-500 text-white font-bold disabled:opacity-50"
                  >
                    {bookingLoading ? 'Processing...' : 'Confirm Demo Booking'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
