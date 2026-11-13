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
    <div className="product-card rounded-2xl overflow-hidden flex flex-col justify-between bg-white border border-neutral-200 hover:border-neutral-300 transition-all duration-300">
      {/* Product Image Stage (Seamless Studio Soft Ice-Blue Gradient) */}
      <div
        className="relative p-6 pb-2 flex flex-col items-center justify-center min-h-[240px] border-b border-neutral-100 transition-colors"
        style={{
          background: 'linear-gradient(180deg, #FFFFFF 0%, #F7FAFD 50%, #EDF4FA 100%)',
        }}
      >
        {/* Subtle Ambient Backlight Glow on Card */}
        <div
          className="absolute inset-x-8 top-12 bottom-6 rounded-full filter blur-xl opacity-0 group-hover:opacity-40 pointer-events-none transition-opacity duration-300"
          style={{
            background: 'radial-gradient(circle, rgba(22, 93, 173, 0.25) 0%, transparent 70%)',
          }}
        />

        {/* Top Badges */}
        <div className="w-full flex items-center justify-between mb-2 relative z-10">
          <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
            {item.categoryLabel || 'Electric Vehicle'}
          </span>

          {isBookable ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Bookings Open</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-neutral-600 bg-neutral-200/60 px-2.5 py-0.5 rounded-full">
              <span>{item.statusBadge || 'Showcase'}</span>
            </span>
          )}
        </div>

        {/* Real Vehicle Photography */}
        <Link href={detailLink} className="w-full flex items-center justify-center my-3 group">
          <div className="relative w-full h-44 sm:h-48 flex items-center justify-center transition-transform duration-300 group-hover:scale-103">
            {/* Ground Contact Shadow */}
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-3/4 h-3 bg-neutral-900/20 rounded-full filter blur-xs pointer-events-none" />
            <img
              src={item.imageUrl}
              alt={item.name}
              className="relative z-10 w-full h-full object-contain filter drop-shadow-sm"
              loading="lazy"
            />
          </div>
        </Link>
      </div>

      {/* Product Details & Specs */}
      <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
        <div>
          <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
            {item.manufacturer || 'ASKR EV Mobility'}
          </div>
          <Link href={detailLink} className="hover:text-[#165DAD] transition-colors">
            <h3 className="text-xl font-bold text-neutral-900 tracking-tight mt-0.5">
              {item.name}
            </h3>
          </Link>
          <p className="text-xs text-neutral-500 mt-1 line-clamp-1">
            {item.tagline}
          </p>

          {/* Clean 3-Metric Specifications Grid (Ola Style) */}
          <div className="mt-4 grid grid-cols-3 gap-2 py-3 px-3.5 rounded-xl bg-neutral-50 border border-neutral-100 text-center">
            <div>
              <span className="text-[10px] text-neutral-400 uppercase tracking-wider block font-medium">
                Range
              </span>
              <span className="text-sm font-bold text-neutral-900">
                {item.rangeKm} <span className="text-[10px] font-normal text-neutral-500">km</span>
              </span>
            </div>

            <div className="border-x border-neutral-200">
              <span className="text-[10px] text-neutral-400 uppercase tracking-wider block font-medium">
                Top Speed
              </span>
              <span className="text-sm font-bold text-neutral-900">
                {item.topSpeedKmh} <span className="text-[10px] font-normal text-neutral-500">km/h</span>
              </span>
            </div>

            <div>
              <span className="text-[10px] text-neutral-400 uppercase tracking-wider block font-medium">
                Battery
              </span>
              <span className="text-sm font-bold text-neutral-900">
                {item.batteryCapacityKwh} <span className="text-[10px] font-normal text-neutral-500">kWh</span>
              </span>
            </div>
          </div>
        </div>

        {/* Pricing & Primary Action Buttons */}
        <div className="pt-3 border-t border-neutral-100">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-medium block">
                Starting Ex-Showroom
              </span>
              <div className="text-lg font-black text-neutral-900">
                {item.exShowroomPriceINR
                  ? `₹${item.exShowroomPriceINR.toLocaleString('en-IN')}`
                  : 'Announcing Soon'}
              </div>
            </div>

            {isBookable && item.bookingAmountINR && (
              <div className="text-right">
                <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-medium block">
                  Token Deposit
                </span>
                <span className="text-xs font-bold text-[#165DAD]">
                  ₹{item.bookingAmountINR.toLocaleString('en-IN')}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Link
              href={detailLink}
              className="w-full py-2.5 px-3 rounded-full border border-neutral-300 hover:border-black text-neutral-800 text-center text-xs font-semibold tracking-wide transition-colors flex items-center justify-center gap-1 hover:bg-neutral-50"
            >
              <span>View Details</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            {isBookable ? (
              <button
                onClick={() => (onBookClick ? onBookClick(item) : null)}
                className="w-full py-2.5 px-3 rounded-full bg-black hover:bg-neutral-800 text-white text-center text-xs font-semibold tracking-wide transition-colors flex items-center justify-center gap-1 shadow-xs"
              >
                <span>Book Now</span>
              </button>
            ) : (
              <Link
                href={detailLink}
                className="w-full py-2.5 px-3 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-center text-xs font-medium tracking-wide transition-colors flex items-center justify-center"
              >
                <span>Explore Specs</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
