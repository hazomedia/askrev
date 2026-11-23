'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';

export interface DashboardTopBannerProps {
  banner?: {
    id?: string;
    title?: string | null;
    badgeText?: string | null;
    desktopImageUrl: string;
    mobileImageUrl?: string | null;
    linkUrl?: string | null;
    altText?: string | null;
    isEnabled?: boolean;
  } | null;
}

export default function DashboardTopBanner({ banner }: DashboardTopBannerProps) {
  // If explicitly disabled, don't render
  if (banner && banner.isEnabled === false) {
    return null;
  }

  // Authoritative approved fallback asset if banner is not yet populated
  const effectiveBanner = banner || {
    title: 'ASKR EV Urban Mobility Fleet',
    badgeText: 'ELECTRIC MOBILITY',
    desktopImageUrl:
      '/uploads/hero/desktop/urban-fleet-hero---harsil-leo-_1795105582720_1e863ffb12443fbf.webp',
    mobileImageUrl:
      '/uploads/hero/desktop/urban-fleet-hero---harsil-leo-_1795105582720_1e863ffb12443fbf.webp',
    linkUrl: '/dashboard',
    altText: 'ASKR EV Electric Mobility',
  };

  const desktopImg = effectiveBanner.desktopImageUrl;
  const mobileImg = effectiveBanner.mobileImageUrl || effectiveBanner.desktopImageUrl;
  const alt = effectiveBanner.altText || effectiveBanner.title || 'ASKR EV Banner';

  const content = (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-xs border border-slate-200/90 bg-[#0C2348] group transition-all duration-300">
      {/* Responsive Aspect Ratio Container */}
      <div className="relative w-full h-32 xs:h-36 sm:h-44 md:h-52 lg:h-56">
        <picture className="w-full h-full block">
          {mobileImg && <source media="(max-width: 640px)" srcSet={mobileImg} />}
          <img
            src={desktopImg}
            alt={alt}
            width={1920}
            height={640}
            loading="eager"
            decoding="async"
            className="w-full h-full object-cover object-center select-none transform group-hover:scale-[1.01] transition-transform duration-500 ease-out"
          />
        </picture>

        {/* Premium Vignette & Subtle Gradient Overlay for Text Readability */}
        {(effectiveBanner.title || effectiveBanner.badgeText) && (
          <div className="absolute inset-0 bg-gradient-to-t from-[#0C2348]/90 via-[#0C2348]/40 to-transparent sm:bg-gradient-to-r sm:from-[#0C2348]/90 sm:via-[#0C2348]/50 sm:to-transparent flex flex-col justify-end sm:justify-center p-4 sm:p-6 md:p-8">
            <div className="max-w-xl space-y-1 sm:space-y-2">
              {effectiveBanner.badgeText && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/30 border border-blue-400/40 text-blue-200 text-[10px] sm:text-xs font-bold tracking-wide uppercase backdrop-blur-xs shadow-2xs">
                  <Sparkles className="w-3 h-3 text-cyan-300" />
                  <span>{effectiveBanner.badgeText}</span>
                </div>
              )}

              {effectiveBanner.title && (
                <h2 className="text-sm xs:text-base sm:text-xl md:text-2xl font-black text-white tracking-tight drop-shadow-md leading-tight">
                  {effectiveBanner.title}
                </h2>
              )}

              {effectiveBanner.linkUrl && effectiveBanner.linkUrl !== '/dashboard' && (
                <div className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-cyan-300 group-hover:text-cyan-200 pt-1">
                  <span>Explore Now</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (effectiveBanner.linkUrl && effectiveBanner.linkUrl !== '/dashboard') {
    return (
      <Link href={effectiveBanner.linkUrl} className="block w-full focus:outline-hidden focus:ring-2 focus:ring-blue-500/50 rounded-2xl">
        {content}
      </Link>
    );
  }

  return content;
}

