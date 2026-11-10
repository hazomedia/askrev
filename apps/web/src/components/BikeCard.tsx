'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Gauge, BatteryCharging } from 'lucide-react';

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
}

export default function BikeCard({ bike }: BikeCardProps) {
  const imgSource = bike.imageUrl
    ? bike.imageUrl.replace('.webp', '.svg')
    : '/images/bikes/thunder-pro.svg';

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
      {/* Product Image on Clean Studio Background with Concept Label */}
      <div className="bg-[#F8FAFC] p-6 flex flex-col items-center justify-center border-b border-slate-100 relative min-h-[220px]">
        <span className="absolute top-3 right-3 text-[10px] font-semibold tracking-wider uppercase text-slate-500 bg-white/90 px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
          Concept Prototype
        </span>
        <img
          src={imgSource}
          alt={bike.name}
          className="w-full h-44 object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/images/bikes/thunder-pro.svg';
          }}
        />
      </div>

      {/* Product Details */}
      <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <div className="text-xs font-semibold text-[#165DAD] uppercase tracking-wider">
            {bike.modelCode}
          </div>
          <h3 className="text-xl font-bold text-[#253247] mt-1">{bike.name}</h3>
          <p className="text-sm text-slate-500 mt-1 line-clamp-1">{bike.tagline}</p>

          {/* Key Specs: Range & Top Speed */}
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600 bg-[#F8FAFC] p-3.5 rounded-lg border border-slate-100">
            <div>
              <span className="text-xs text-slate-400 block font-medium">Certified Range</span>
              <span className="text-base font-bold text-[#253247]">{bike.rangeKm} km</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">Top Speed</span>
              <span className="text-base font-bold text-[#253247]">{bike.topSpeedKmh} km/h</span>
            </div>
          </div>
        </div>

        {/* Pricing & Single Primary Action Button */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <div className="text-xs text-slate-400 uppercase font-medium">Indicative Price</div>
              <div className="text-xl font-bold text-[#253247]">
                ₹{bike.exShowroomPriceINR.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400 uppercase font-medium">Reservation Token</div>
              <div className="text-sm font-semibold text-[#165DAD]">
                ₹{bike.bookingAmountINR.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <Link
            href={`/bikes/${bike.modelCode}`}
            className="w-full min-h-[46px] py-3 rounded-lg bg-[#165DAD] hover:bg-[#124B8D] text-white text-center text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <span>View Details</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
