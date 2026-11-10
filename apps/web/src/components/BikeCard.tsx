'use client';

import React from 'react';
import Link from 'next/link';
import {
  Zap,
  Gauge,
  BatteryCharging,
  Timer,
  ArrowRight,
  ShieldCheck,
  Tag,
  CheckCircle,
} from 'lucide-react';

interface BikeCardProps {
  bike: {
    id: string;
    modelCode: string;
    name: string;
    tagline: string;
    batteryCapacityKwh: number;
    rangeKm: number;
    topSpeedKmh: number;
    chargingTimeHours: number;
    exShowroomPriceINR: number;
    bookingAmountINR: number;
    voucherRedeemLimitINR: number;
    imageUrl?: string;
  };
  onBook: (bike: any) => void;
  userVoucherINR?: number;
}

export default function BikeCard({ bike, onBook, userVoucherINR = 0 }: BikeCardProps) {
  // Use .svg or replace .webp with .svg if available
  const imgSource = bike.imageUrl ? bike.imageUrl.replace('.webp', '.svg') : '/images/bikes/thunder-pro.svg';
  const effectiveVoucherDiscount = Math.min(userVoucherINR, bike.voucherRedeemLimitINR, bike.bookingAmountINR);

  return (
    <div className="card-gradient rounded-3xl overflow-hidden border border-navy-700/80 hover:border-electric-500/50 transition-all duration-300 flex flex-col group shadow-xl hover:shadow-2xl hover:shadow-electric-500/10">
      {/* Top Media Showcase */}
      <div className="relative aspect-[16/10] bg-navy-900/80 overflow-hidden flex items-center justify-center p-4">
        {/* Neon Ambient Background */}
        <div className="absolute inset-0 bg-radial-gradient from-electric-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

        <img
          src={imgSource}
          alt={bike.name}
          className="w-full h-full object-contain transform group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            // Fallback to SVG if webp fails
            (e.target as HTMLImageElement).src = '/images/bikes/thunder-pro.svg';
          }}
        />

        {/* Voucher Badge */}
        <div className="absolute top-3.5 left-3.5 flex items-center gap-1.5 px-3 py-1 rounded-full bg-navy-950/90 border border-electric-500/40 text-electric-300 text-xs font-bold backdrop-blur-md shadow-md">
          <Tag className="w-3.5 h-3.5 text-electric-400" />
          <span>Voucher Up to ₹{bike.voucherRedeemLimitINR.toLocaleString('en-IN')}</span>
        </div>

        {/* Quick Top Speed Floating Badge */}
        <div className="absolute top-3.5 right-3.5 flex items-center gap-1 px-2.5 py-1 rounded-full bg-navy-950/90 border border-navy-700 text-slate-300 text-xs font-semibold backdrop-blur-md">
          <Gauge className="w-3.5 h-3.5 text-emerald-400" />
          <span>{bike.topSpeedKmh} km/h</span>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
        <div>
          {/* Model & Tagline */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-2xl font-black text-white group-hover:text-electric-400 transition-colors">
                {bike.name}
              </h3>
              <p className="text-xs text-slate-400 mt-1 line-clamp-1">{bike.tagline}</p>
            </div>
            <span className="text-[11px] font-mono font-bold text-slate-500 uppercase bg-navy-800/80 px-2 py-0.5 rounded border border-navy-700">
              {bike.modelCode}
            </span>
          </div>

          {/* Key Specifications Grid */}
          <div className="mt-5 grid grid-cols-3 gap-2.5 bg-navy-900/60 p-3 rounded-2xl border border-navy-800">
            <div className="text-center">
              <div className="flex items-center justify-center text-slate-400 mb-1">
                <BatteryCharging className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-sm font-black text-white">{bike.rangeKm} km</div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Max Range</div>
            </div>

            <div className="text-center border-x border-navy-700/60">
              <div className="flex items-center justify-center text-slate-400 mb-1">
                <Gauge className="w-4 h-4 text-electric-400" />
              </div>
              <div className="text-sm font-black text-white">{bike.topSpeedKmh} km/h</div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Velocity</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center text-slate-400 mb-1">
                <Timer className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-sm font-black text-white">{bike.chargingTimeHours} hrs</div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Fast Charge</div>
            </div>
          </div>

          {/* Pricing Row */}
          <div className="mt-5 flex items-baseline justify-between pt-1">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                Ex-Showroom Price
              </div>
              <div className="text-2xl font-black text-white">
                ₹{bike.exShowroomPriceINR.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                Booking Token
              </div>
              <div className="text-lg font-bold text-electric-400">
                ₹{bike.bookingAmountINR.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Live Voucher Savings Indicator if user has voucher */}
          {userVoucherINR > 0 && effectiveVoucherDiscount > 0 && (
            <div className="mt-3 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center justify-between">
              <span>Your Voucher Balance:</span>
              <span className="font-bold">
                Apply up to -₹{effectiveVoucherDiscount.toLocaleString('en-IN')}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Link
            href={`/bikes/${bike.modelCode}`}
            className="px-4 py-3 rounded-xl bg-navy-800 hover:bg-navy-700 border border-navy-600/80 text-slate-200 text-center font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <span>Full Specs</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={() => onBook(bike)}
            className="px-4 py-3 rounded-xl bg-gradient-to-r from-electric-600 to-electric-500 hover:from-electric-500 hover:to-electric-400 text-white font-bold text-xs shadow-lg shadow-electric-500/25 transition-all flex items-center justify-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5 fill-white" />
            <span>Book Ride</span>
          </button>
        </div>
      </div>
    </div>
  );
}
