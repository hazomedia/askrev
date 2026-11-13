'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Gauge, BatteryCharging, Zap, Shield, Sparkles } from 'lucide-react';

interface BikeCardProps {
  bike?: any;
  vehicle?: any;
  onBookClick?: (vehicle: any) => void;
}

export default function BikeCard({ bike, vehicle, onBookClick }: BikeCardProps) {
  const item = vehicle || bike;
  if (!item) return null;

  const isConcept = item.isConcept || item.category === 'cycles' || item.category === 'jeeps';
  const imgSource = item.imageUrl
    ? item.imageUrl.replace('.webp', '.svg')
    : '/images/bikes/thunder-pro.svg';

  const categoryLabel =
    item.categoryLabel ||
    (item.category === 'cycles'
      ? 'Electric Cycle'
      : item.category === 'jeeps'
      ? 'Electric Jeep'
      : 'Electric Bike');

  return (
    <div className="group relative bg-[#101318] rounded-2xl border border-white/10 hover:border-white/25 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-black/60 flex flex-col justify-between">
      {/* Top Banner & Status */}
      <div className="relative bg-[#080A0D] p-6 pb-2 flex flex-col items-center justify-center border-b border-white/5 min-h-[240px] overflow-hidden">
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute inset-0 bg-radial-gradient from-white/5 to-transparent pointer-events-none" />

        <div className="w-full flex items-center justify-between z-10 mb-2">
          <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400 bg-white/5 px-2.5 py-1 rounded-md border border-white/10">
            {categoryLabel}
          </span>

          {isConcept ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase text-[#C9FF36] bg-[#C9FF36]/10 px-2.5 py-1 rounded-md border border-[#C9FF36]/30">
              <Sparkles className="w-3 h-3" />
              <span>Concept Series</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Production Ready</span>
            </span>
          )}
        </div>

        {/* Large Vehicle Artwork / Photography */}
        <div className="relative w-full h-48 flex items-center justify-center my-2 transition-transform duration-500 group-hover:scale-105">
          <img
            src={imgSource}
            alt={item.name}
            className="w-full h-full object-contain filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)]"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/images/bikes/thunder-pro.svg';
            }}
            loading="lazy"
          />
        </div>
      </div>

      {/* Vehicle Specification & Information */}
      <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
        <div>
          <div className="text-[11px] font-mono font-bold text-[#165DAD] tracking-wider uppercase">
            {item.modelCode}
          </div>
          <h3 className="text-xl font-extrabold text-white tracking-tight mt-1 group-hover:text-white transition-colors">
            {item.name}
          </h3>
          <p className="text-xs text-[#A7ADB5] mt-1.5 line-clamp-1 leading-relaxed">
            {item.tagline}
          </p>

          {/* Key Metric Grid */}
          <div className="mt-4 grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/5">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">
                {item.category === 'cycles' ? 'Assisted Range' : 'Certified Range'}
              </span>
              <span className="text-sm font-bold text-white tracking-tight">
                {item.rangeKm} km
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">
                Top Speed
              </span>
              <span className="text-sm font-bold text-white tracking-tight">
                {item.topSpeedKmh} km/h
              </span>
            </div>
          </div>
        </div>

        {/* Price & Action Button Area */}
        <div className="pt-3 border-t border-white/10">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                {isConcept ? 'Development Status' : 'Indicative Price'}
              </div>
              <div className="text-lg font-black text-white">
                {item.exShowroomPriceINR
                  ? `₹${item.exShowroomPriceINR.toLocaleString('en-IN')}`
                  : 'Prototype Phase'}
              </div>
            </div>

            {!isConcept && item.bookingAmountINR && (
              <div className="text-right">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                  Reservation Token
                </div>
                <div className="text-xs font-bold text-[#C9FF36]">
                  ₹{item.bookingAmountINR.toLocaleString('en-IN')}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Link
              href={`/bikes/${item.modelCode}`}
              className="w-full py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-center text-xs font-semibold tracking-wide transition-colors flex items-center justify-center gap-1 border border-white/10"
            >
              <span>View Specs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            {!isConcept && item.isAvailable ? (
              <button
                onClick={() => (onBookClick ? onBookClick(item) : null)}
                className="w-full py-2.5 px-3 rounded-xl bg-white text-[#101318] hover:bg-[#C9FF36] text-center text-xs font-bold tracking-wider uppercase transition-colors flex items-center justify-center gap-1 shadow-sm"
              >
                <span>Reserve</span>
              </button>
            ) : (
              <Link
                href={`/bikes/${item.modelCode}`}
                className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-center text-xs font-medium tracking-wide transition-colors flex items-center justify-center gap-1 border border-white/5"
              >
                <span>Preview</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
