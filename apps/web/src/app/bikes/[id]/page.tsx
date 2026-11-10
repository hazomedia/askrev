'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Bike,
  Zap,
  BatteryCharging,
  Gauge,
  Timer,
  ShieldCheck,
  ChevronLeft,
  Tag,
  CheckCircle2,
  Cpu,
  Layers,
  ArrowRight,
} from 'lucide-react';
import BookingModal from '../../../components/BookingModal';
import { fetchApi, getStoredUser } from '../../../lib/api';

export default function BikeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [bike, setBike] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadBike(params.id as string);
      loadProfile();
    }
  }, [params.id]);

  const loadBike = async (idOrCode: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApi<any>(`/ev-bikes/${idOrCode}`);
      setBike(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load EV bike specifications');
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="flex-1 max-w-7xl mx-auto px-4 py-20 w-full animate-pulse">
        <div className="h-8 bg-navy-800 rounded-xl w-48 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="h-96 bg-navy-800 rounded-3xl" />
          <div className="space-y-4">
            <div className="h-10 bg-navy-800 rounded-xl w-3/4" />
            <div className="h-6 bg-navy-800 rounded-lg w-1/2" />
            <div className="h-32 bg-navy-800 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !bike) {
    return (
      <div className="flex-1 max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="p-8 rounded-3xl bg-navy-900 border border-navy-800 space-y-4">
          <Bike className="w-12 h-12 text-slate-500 mx-auto" />
          <h2 className="text-2xl font-bold text-white">Model Not Found</h2>
          <p className="text-xs text-slate-400">{error || 'Requested bike model does not exist.'}</p>
          <Link
            href="/bikes"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-electric-500 text-white font-bold text-xs"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to EV Fleet</span>
          </Link>
        </div>
      </div>
    );
  }

  const imgSource = bike.imageUrl
    ? bike.imageUrl.replace('.webp', '.svg')
    : '/images/bikes/thunder-pro.svg';

  const userVoucherINR = userProfile?.wallet?.shoppingVoucherINR || 0;
  const maxVoucherEligible = Math.min(
    userVoucherINR,
    bike.voucherRedeemLimitINR,
    bike.bookingAmountINR
  );

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 w-full">
      {/* Back Link */}
      <Link
        href="/bikes"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors mb-8"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Back to EV Fleet</span>
      </Link>

      {/* Main Two-Column Product Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left Column: Visual Showcase */}
        <div className="lg:col-span-7 space-y-6">
          <div className="card-gradient rounded-3xl p-6 sm:p-8 border border-navy-700/80 shadow-2xl relative overflow-hidden">
            <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-navy-950/90 border border-electric-500/40 text-electric-300 text-xs font-bold backdrop-blur-md">
              <Tag className="w-3.5 h-3.5 text-electric-400" />
              <span>Voucher Up to ₹{bike.voucherRedeemLimitINR.toLocaleString('en-IN')}</span>
            </div>

            <img
              src={imgSource}
              alt={bike.name}
              className="w-full aspect-[16/10] object-contain drop-shadow-2xl"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/images/bikes/thunder-pro.svg';
              }}
            />
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-navy-900 border border-navy-800 text-center">
              <BatteryCharging className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
              <div className="text-xl font-black text-white">{bike.rangeKm} km</div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Max Range</div>
            </div>
            <div className="p-4 rounded-2xl bg-navy-900 border border-navy-800 text-center">
              <Gauge className="w-5 h-5 text-electric-400 mx-auto mb-1.5" />
              <div className="text-xl font-black text-white">{bike.topSpeedKmh} km/h</div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Top Speed</div>
            </div>
            <div className="p-4 rounded-2xl bg-navy-900 border border-navy-800 text-center">
              <Timer className="w-5 h-5 text-amber-400 mx-auto mb-1.5" />
              <div className="text-xl font-black text-white">{bike.chargingTimeHours} hrs</div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">0-100% Charge</div>
            </div>
          </div>
        </div>

        {/* Right Column: Pricing & Booking Action */}
        <div className="lg:col-span-5 space-y-6">
          <div className="card-gradient rounded-3xl p-6 sm:p-8 border border-navy-700/80 shadow-2xl space-y-6">
            <div>
              <span className="text-xs font-mono font-bold text-electric-400 uppercase tracking-widest bg-navy-800 px-2.5 py-1 rounded-md border border-navy-700">
                {bike.modelCode}
              </span>
              <h1 className="text-3xl sm:text-4xl font-black text-white mt-3">
                {bike.name}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                {bike.tagline}
              </p>
            </div>

            {/* Price Box */}
            <div className="p-5 rounded-2xl bg-navy-900/90 border border-navy-800 space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-slate-400 uppercase font-bold">Ex-Showroom Price</span>
                <span className="text-2xl font-black text-white">
                  ₹{bike.exShowroomPriceINR.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="pt-2 border-t border-navy-800/80 flex items-baseline justify-between text-xs">
                <span className="text-slate-400 font-semibold">Booking Token Deposit:</span>
                <span className="text-base font-bold text-electric-400">
                  ₹{bike.bookingAmountINR.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-slate-400 font-semibold">Max Voucher Eligible:</span>
                <span className="text-emerald-400 font-bold">
                  Up to ₹{bike.voucherRedeemLimitINR.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* User voucher status badge */}
            {userProfile?.wallet?.shoppingVoucherINR > 0 ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Voucher Balance Detected</span>
                </div>
                <div>
                  You can apply up to <strong className="text-white">₹{maxVoucherEligible.toLocaleString('en-IN')}</strong> from your shopping vouchers on this reservation.
                </div>
              </div>
            ) : null}

            {/* Book Now Action */}
            <button
              onClick={() => setModalOpen(true)}
              className="w-full py-4 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-electric-600 via-electric-500 to-emerald-500 hover:from-electric-500 hover:to-emerald-400 shadow-xl shadow-electric-500/25 transition-all flex items-center justify-center gap-2 group"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>Reserve with Token Deposit</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="flex items-center gap-2 text-[11px] text-slate-400 justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Full compliance with verified booking receipts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Engineering Specifications Sheet */}
      <div className="mt-16 card-gradient rounded-3xl p-6 sm:p-10 border border-navy-700/80">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-electric-500/20 border border-electric-500/40 flex items-center justify-center text-electric-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Engineering Specifications</h2>
            <p className="text-xs text-slate-400">Technical telemetry and powertrain data for {bike.name}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-navy-900 border border-navy-800 flex justify-between items-center">
            <span className="text-slate-400">Battery Architecture:</span>
            <span className="text-white font-bold">{bike.batteryCapacityKwh} kWh High-Density Pack</span>
          </div>
          <div className="p-4 rounded-2xl bg-navy-900 border border-navy-800 flex justify-between items-center">
            <span className="text-slate-400">Motor Type:</span>
            <span className="text-white font-bold">{bike.specs?.motorType || 'PMSM Electric Drive'}</span>
          </div>
          <div className="p-4 rounded-2xl bg-navy-900 border border-navy-800 flex justify-between items-center">
            <span className="text-slate-400">Peak Motor Power:</span>
            <span className="text-white font-bold">{bike.specs?.peakPowerKw || 8.5} kW</span>
          </div>
          <div className="p-4 rounded-2xl bg-navy-900 border border-navy-800 flex justify-between items-center">
            <span className="text-slate-400">Peak Torque:</span>
            <span className="text-white font-bold">{bike.specs?.peakTorqueNm || 52} Nm</span>
          </div>
          <div className="p-4 rounded-2xl bg-navy-900 border border-navy-800 flex justify-between items-center">
            <span className="text-slate-400">Acceleration (0-40 km/h):</span>
            <span className="text-electric-400 font-bold">{bike.specs?.acceleration0to40 || '3.2 sec'}</span>
          </div>
          <div className="p-4 rounded-2xl bg-navy-900 border border-navy-800 flex justify-between items-center">
            <span className="text-slate-400">Braking System:</span>
            <span className="text-white font-bold">{bike.specs?.brakes || 'Dual Disc with CBS & Regenerative'}</span>
          </div>
          <div className="p-4 rounded-2xl bg-navy-900 border border-navy-800 flex justify-between items-center">
            <span className="text-slate-400">Instrument Display:</span>
            <span className="text-white font-bold">{bike.specs?.display || '7-inch High-Brightness Touch TFT'}</span>
          </div>
          <div className="p-4 rounded-2xl bg-navy-900 border border-navy-800 flex justify-between items-center">
            <span className="text-slate-400">Warranty Coverage:</span>
            <span className="text-emerald-400 font-bold">{bike.specs?.warranty || '3 Years Comprehensive'}</span>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      <BookingModal
        bike={bike}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        user={userProfile}
        onSuccess={() => {
          loadProfile();
        }}
      />
    </div>
  );
}
