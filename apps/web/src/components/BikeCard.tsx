'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Zap, CheckCircle2 } from 'lucide-react';
import { Vehicle } from '../lib/catalog';

interface BikeCardProps {
  bike?: any;
  vehicle?: any;
  onBookClick?: (vehicle: any) => void;
}

export default function BikeCard({ bike, vehicle, onBookClick }: BikeCardProps) {
  const item: Vehicle = vehicle || bike;
  if (!item) return null;

  const isBookable = item.isBookable;
  const detailLink = `/bikes/${item.modelCode || item.slug}`;

  return (
    <div className="product-card rounded-2xl overflow-hidden flex flex-col justify-between bg-gradient-to-b from-[#131B2C] to-[#0A0E18] border border-white/12 hover:border-[#267DFF]/60 hover:shadow-[0_20px_45px_-10px_rgba(0,0,0,0.8),0_0_35px_-5px_rgba(38,125,255,0.3)] transition-all duration-300 group">
      {/* Product Image Stage (Enhanced Contrast Dark Automotive Studio Stage) */}
      <div
        className="relative p-5 pb-3 flex flex-col items-center justify-center min-h-[290px] sm:min-h-[320px] border-b border-white/10 overflow-hidden"
        style={{
          background: 'radial-gradient(ellipse at 50% 40%, #1B263C 0%, #131A29 60%, #0A0F1A 100%)',
        }}
      >
        {/* Directional Electric Blue Ambient Spotlight Behind Silhouette */}
        <div
          className="absolute inset-x-6 top-8 bottom-6 rounded-full filter blur-3xl opacity-40 group-hover:opacity-75 pointer-events-none transition-opacity duration-500"
          style={{
            background: 'radial-gradient(circle, rgba(38, 125, 255, 0.5) 0%, rgba(80, 217, 255, 0.2) 50%, transparent 75%)',
          }}
        />

        {/* Top Badges */}
        <div className="w-full flex items-center justify-between mb-2 relative z-10">
          <span className="text-[11px] font-bold text-[#50D9FF] uppercase tracking-wider">
            {item.categoryLabel || 'Electric Vehicle'}
          </span>

          {isBookable ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Bookings Open</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#AAB7C8] bg-white/10 px-2.5 py-0.5 rounded-full border border-white/10">
              <span>{item.statusBadge || 'Showcase'}</span>
            </span>
          )}
        </div>

        {/* Real Vehicle Photography — Prominent Stance, High-Contrast Silhouette */}
        <Link href={detailLink} className="w-full flex items-center justify-center my-2 relative z-10">
          <div className="relative w-full h-56 sm:h-64 flex items-center justify-center transition-transform duration-500 group-hover:scale-105">
            {/* Realistic Contact Shadow on Dark Floor */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-4/5 h-5 bg-black/85 rounded-full filter blur-md pointer-events-none" />
            <img
              src={item.imageUrl}
              alt={item.name}
              className="relative z-10 w-full h-full object-contain filter drop-shadow-[0_14px_24px_rgba(0,0,0,0.85)] drop-shadow-[0_0_16px_rgba(38,125,255,0.18)] select-none"
              loading="lazy"
            />
          </div>
        </Link>

        {/* Bottom Horizon Accent Line */}
        <div className="absolute bottom-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-[#50D9FF]/25 to-transparent pointer-events-none" />
      </div>

      {/* Product Details & Specs */}
      <div className="p-6 flex-1 flex flex-col justify-between space-y-5 bg-[#0C121E]/60">
        <div>
          <div className="text-[11px] font-semibold text-[#AAB7C8] uppercase tracking-wider">
            {item.manufacturer || 'ASKR EV Mobility'}
          </div>
          <Link href={detailLink} className="hover:text-[#50D9FF] transition-colors">
            <h3 className="text-xl font-extrabold text-[#F7FAFF] tracking-tight mt-0.5">
              {item.name}
            </h3>
          </Link>
          <p className="text-xs text-[#AAB7C8] mt-1 line-clamp-1">
            {item.tagline}
          </p>

          {/* Clean 3-Metric Specifications Grid in Midnight Pill */}
          <div className="mt-4 grid grid-cols-3 gap-2 py-3 px-3.5 rounded-xl bg-white/5 border border-white/10 text-center">
            <div>
              <span className="text-[10px] text-[#AAB7C8] uppercase tracking-wider block font-medium">
                Range
              </span>
              <span className="text-sm font-bold text-[#F7FAFF]">
                {item.rangeKm} <span className="text-[10px] font-normal text-[#AAB7C8]">km</span>
              </span>
            </div>

            <div className="border-x border-white/10">
              <span className="text-[10px] text-[#AAB7C8] uppercase tracking-wider block font-medium">
                Top Speed
              </span>
              <span className="text-sm font-bold text-[#F7FAFF]">
                {item.topSpeedKmh} <span className="text-[10px] font-normal text-[#AAB7C8]">km/h</span>
              </span>
            </div>

            <div>
              <span className="text-[10px] text-[#AAB7C8] uppercase tracking-wider block font-medium">
                Battery
              </span>
              <span className="text-sm font-bold text-[#F7FAFF]">
                {item.batteryCapacityKwh} <span className="text-[10px] font-normal text-[#AAB7C8]">kWh</span>
              </span>
            </div>
          </div>
        </div>

        {/* Pricing & Booking Action */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-[#AAB7C8] uppercase tracking-wider block font-medium">
              Ex-Showroom
            </span>
            <div className="text-lg font-black text-[#F7FAFF]">
              {item.exShowroomPriceINR
                ? `₹${item.exShowroomPriceINR.toLocaleString('en-IN')}`
                : 'Showcase Preview'}
            </div>
            {item.estimatedOnRoadINR && (
              <span className="text-[10px] text-[#AAB7C8] block">
                Est. On-Road ₹{item.estimatedOnRoadINR.toLocaleString('en-IN')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={detailLink}
              className="px-3.5 py-2 rounded-full border border-white/20 hover:border-white text-xs font-semibold text-[#F7FAFF] hover:bg-white/10 transition-colors"
            >
              Specs
            </Link>

            {isBookable && onBookClick ? (
              <button
                onClick={() => onBookClick(item)}
                className="px-4 py-2 rounded-full bg-[#267DFF] hover:bg-[#1A6EEB] text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(38,125,255,0.4)] hover:shadow-[0_0_20px_rgba(38,125,255,0.6)] flex items-center gap-1"
              >
                <span>Book</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            ) : (
              <Link
                href={detailLink}
                className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-[#50D9FF] text-xs font-bold transition-colors flex items-center gap-1 border border-white/10"
              >
                <span>Explore</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
