'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

export interface SlideItem {
  id?: string;
  title?: string | null;
  subtitle?: string | null;
  badgeText?: string | null;
  buttonText?: string | null;
  desktopImageUrl: string;
  mobileImageUrl?: string | null;
  linkUrl?: string | null;
  altText?: string | null;
  displayOrder?: number;
  status?: string;
  isEnabled?: boolean;
  autoplayInterval?: number;
}

export interface DashboardTopBannerProps {
  slides?: SlideItem[] | null;
  banner?: SlideItem | null;
  autoplayInterval?: number;
}

const DEFAULT_FALLBACK_SLIDE: SlideItem = {
  id: 'default-urban-fleet',
  title: 'ASKR EV Urban Mobility Fleet',
  subtitle: 'Smart • Connected • Sustainable Electric Mobility',
  badgeText: 'ELECTRIC MOBILITY',
  buttonText: 'EXPLORE FLEET',
  desktopImageUrl:
    '/uploads/hero/desktop/urban-fleet-hero---harsil-leo-_1795105582720_1e863ffb12443fbf.webp',
  mobileImageUrl:
    '/uploads/hero/desktop/urban-fleet-hero---harsil-leo-_1795105582720_1e863ffb12443fbf.webp',
  linkUrl: '/dashboard',
  altText: 'ASKR EV Electric Mobility',
  autoplayInterval: 5000,
};

export default function DashboardTopBanner({
  slides,
  banner,
  autoplayInterval = 5000,
}: DashboardTopBannerProps) {
  // Determine effective slide list
  const effectiveSlides: SlideItem[] = React.useMemo(() => {
    if (slides && slides.length > 0) {
      const enabled = slides.filter((s) => s.isEnabled !== false);
      if (enabled.length > 0) return enabled;
    }
    if (banner && banner.isEnabled !== false) {
      return [banner];
    }
    return [DEFAULT_FALLBACK_SLIDE];
  }, [slides, banner]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);

  const totalSlides = effectiveSlides.length;

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  const goToSlide = (idx: number) => {
    setCurrentIndex(idx);
  };

  // Safe index clamp if slides change dynamically
  useEffect(() => {
    if (currentIndex >= totalSlides) {
      setCurrentIndex(0);
    }
  }, [currentIndex, totalSlides]);

  // Autoplay effect
  useEffect(() => {
    if (totalSlides <= 1 || isPaused) {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
      return;
    }

    const currentSlide = effectiveSlides[currentIndex];
    const interval = currentSlide?.autoplayInterval || autoplayInterval || 5000;

    autoPlayTimerRef.current = setInterval(() => {
      goToNext();
    }, interval);

    return () => {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    };
  }, [totalSlides, isPaused, currentIndex, effectiveSlides, autoplayInterval, goToNext]);

  // Touch Swipe Handling
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    touchStartXRef.current = e.targetTouches[0].clientX;
    touchEndXRef.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
    if (!touchStartXRef.current || !touchEndXRef.current) return;
    const distance = touchStartXRef.current - touchEndXRef.current;
    const minSwipeDistance = 45;

    if (distance > minSwipeDistance) {
      // Swiped Left -> Next
      goToNext();
    } else if (distance < -minSwipeDistance) {
      // Swiped Right -> Prev
      goToPrev();
    }
    touchStartXRef.current = null;
    touchEndXRef.current = null;
  };

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden shadow-xs border border-slate-200/90 bg-[#0C2348] group transition-all duration-300"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      aria-roledescription="carousel"
      aria-label="Promotional Carousel"
    >
      {/* Fixed responsive aspect ratio height container prevents any cumulative layout shift (CLS) */}
      <div className="relative w-full h-[195px] xs:h-[215px] sm:h-[260px] md:h-[310px] lg:h-[340px] overflow-hidden">
        {effectiveSlides.map((slide, idx) => {
          const isActive = idx === currentIndex;
          const sDesktopImg = slide.desktopImageUrl;
          const sMobileImg = slide.mobileImageUrl || slide.desktopImageUrl;
          const sAlt = slide.altText || slide.title || 'ASKR EV Banner';
          const sHasLink = Boolean(slide.linkUrl && slide.linkUrl !== '/dashboard');

          return (
            <div
              key={slide.id || `slide-${idx}`}
              className={`absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out ${
                isActive ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
              }`}
              aria-hidden={!isActive}
            >
              <picture className="w-full h-full block">
                {sMobileImg && <source media="(max-width: 640px)" srcSet={sMobileImg} />}
                <img
                  src={sDesktopImg}
                  alt={sAlt}
                  width={1920}
                  height={600}
                  loading={idx === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  className="w-full h-full object-cover object-center select-none"
                />
              </picture>

              {/* Vignette Overlay & Slide Copy */}
              {(slide.title || slide.subtitle || slide.badgeText) && (
                <div className="absolute inset-0 bg-gradient-to-t from-[#0C2348]/95 via-[#0C2348]/50 to-transparent sm:bg-gradient-to-r sm:from-[#0C2348]/95 sm:via-[#0C2348]/60 sm:to-transparent flex flex-col justify-end sm:justify-center p-4 sm:p-7 md:p-10 z-20">
                  <div className="max-w-xl space-y-1.5 sm:space-y-2.5">
                    {slide.badgeText && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/30 border border-blue-400/40 text-blue-200 text-[10px] sm:text-xs font-bold tracking-wide uppercase backdrop-blur-xs shadow-2xs">
                        <Sparkles className="w-3 h-3 text-cyan-300" />
                        <span>{slide.badgeText}</span>
                      </div>
                    )}

                    {slide.title && (
                      <h2 className="text-base xs:text-lg sm:text-2xl md:text-3xl font-black text-white tracking-tight drop-shadow-md leading-tight">
                        {slide.title}
                      </h2>
                    )}

                    {slide.subtitle && (
                      <p className="text-xs sm:text-sm text-slate-200 font-normal leading-relaxed line-clamp-2 max-w-md drop-shadow-xs">
                        {slide.subtitle}
                      </p>
                    )}

                    {sHasLink && slide.linkUrl && (
                      <div className="pt-1.5">
                        <Link
                          href={slide.linkUrl}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-[#165DAD] to-[#1D4ED8] hover:from-[#12498a] hover:to-[#1742b6] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-95 group/btn"
                        >
                          <span>{slide.buttonText || 'EXPLORE NOW'}</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Desktop Prev / Next Navigation Arrows (Hidden if single slide) */}
        {totalSlides > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToPrev();
              }}
              className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-30 w-9 h-9 items-center justify-center rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-xs border border-white/20 transition-all opacity-70 hover:opacity-100 shadow-md"
              aria-label="Previous Slide"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-30 w-9 h-9 items-center justify-center rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-xs border border-white/20 transition-all opacity-70 hover:opacity-100 shadow-md"
              aria-label="Next Slide"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Pagination Dots (Hidden if single slide) */}
        {totalSlides > 1 && (
          <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5">
            {effectiveSlides.map((_, idx) => (
              <button
                key={`dot-${idx}`}
                onClick={(e) => {
                  e.stopPropagation();
                  goToSlide(idx);
                }}
                className={`transition-all duration-300 rounded-full ${
                  idx === currentIndex
                    ? 'w-6 h-2 bg-white shadow-xs'
                    : 'w-2 h-2 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
