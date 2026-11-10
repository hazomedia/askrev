'use client';

import React from 'react';
import Link from 'next/link';

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
      {/* Product Image */}
      <div className="bg-slate-50 p-6 flex items-center justify-center border-b border-slate-100">
        <img
          src={imgSource}
          alt={bike.name}
          className="w-full h-48 object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/images/bikes/thunder-pro.svg';
          }}
        />
      </div>

      {/* Product Details */}
      <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="text-xs font-semibold text-[#165DAD] uppercase tracking-wider">
            {bike.modelCode}
          </div>
          <h3 className="text-xl font-bold text-[#253247] mt-1">{bike.name}</h3>
          <p className="text-xs text-slate-500 mt-1 line-clamp-1">{bike.tagline}</p>

          {/* Simple Specs Summary */}
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
            <div>
              <span className="text-slate-400 block text-[11px]">Range</span>
              <span className="font-semibold text-[#253247]">{bike.rangeKm} km</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Top Speed</span>
              <span className="font-semibold text-[#253247]">{bike.topSpeedKmh} km/h</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Battery</span>
              <span className="font-semibold text-[#253247]">{bike.batteryCapacityKwh} kWh</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Charging</span>
              <span className="font-semibold text-[#253247]">{bike.chargingTimeHours} hrs</span>
            </div>
          </div>
        </div>

        {/* Pricing & Single Primary Action */}
        <div className="pt-2">
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-medium">Ex-Showroom</div>
              <div className="text-lg font-bold text-[#253247]">
                ₹{bike.exShowroomPriceINR.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-slate-400 uppercase font-medium">Booking Token</div>
              <div className="text-sm font-semibold text-[#165DAD]">
                ₹{bike.bookingAmountINR.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <Link
            href={`/bikes/${bike.modelCode}`}
            className="w-full py-2.5 rounded-lg bg-[#165DAD] hover:bg-[#124B8D] text-white text-center text-sm font-medium transition-colors block"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
}
