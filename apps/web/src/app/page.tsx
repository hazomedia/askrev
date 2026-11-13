'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  BatteryCharging,
  Gauge,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BikeCard from '../components/BikeCard';
import BookingModal from '../components/BookingModal';
import VerticalRoad from '../components/VerticalRoad';
import MobileBackgroundRoad from '../components/MobileBackgroundRoad';
import GroundMist from '../components/GroundMist';
import { fetchApi, getStoredUser } from '../lib/api';
import {
  ELECTRIC_SCOOTERS,
  ELECTRIC_MOTORCYCLES,
  ELECTRIC_CYCLES,
  ELECTRIC_JEEPS,
  ALL_CATALOG_VEHICLES,
  Vehicle,
} from '../lib/catalog';

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<'all' | 'scooters' | 'bikes' | 'cycles' | 'jeeps'>('bikes');
  const [bookingVehicle, setBookingVehicle] = useState<any | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  // 4 Featured Hero Vehicles across categories (Motorcycle, Scooter, Cycle, Jeep)
  const heroSlides = [
    {
      vehicle: ELECTRIC_MOTORCYCLES[0], // ASKR Thunder Pro
      headline: 'Pure Torque. Zero Compromise.',
      subline: 'High-torque urban electric streetfighter powered by permanent magnet synchronous mid-drive motor with instant 78 Nm wheel torque.',
      primaryBadge: 'Flagship Electric Streetfighter • Bookings Open',
      image: '/images/vehicles/dark/hero-motorcycle-dark.jpg',
      ambientGlow: 'rgba(38, 125, 255, 0.35)',
      ambientCyan: 'rgba(80, 217, 255, 0.18)',
    },
    {
      vehicle: ELECTRIC_SCOOTERS[0], // ASKR S1 Pro
      headline: 'The Revolution in Electric Mobility.',
      subline: 'Hyper-performance connected electric scooter with 195 km IDC range, 120 km/h top speed, and MoveOS intelligent telemetry.',
      primaryBadge: 'Flagship Connected Scooter • Showroom Showcase',
      image: '/images/vehicles/dark/hero-scooter-dark.jpg',
      ambientGlow: 'rgba(38, 125, 255, 0.30)',
      ambientCyan: 'rgba(80, 217, 255, 0.15)',
    },
    {
      vehicle: ELECTRIC_CYCLES[0], // ASKR AeroTrek C1
      headline: 'Ride Light. Go Further.',
      subline: 'Ultralight hydroformed carbon e-bike with integrated downtube battery module and silent high-efficiency torque-assist motor.',
      primaryBadge: 'Urban E-Bike Prototype • 85 km Assisted Range',
      image: '/images/vehicles/dark/hero-cycle-dark.jpg',
      ambientGlow: 'rgba(13, 148, 136, 0.28)',
      ambientCyan: 'rgba(94, 234, 212, 0.14)',
    },
    {
      vehicle: ELECTRIC_JEEPS[0], // ASKR TerraMax 4x4
      headline: 'Built for the Extraordinary.',
      subline: 'Dual-motor all-wheel electric drive adventure vehicle with 380 km expedition range and structural titanium underbody armor.',
      primaryBadge: 'Overland 4x4 EV Concept • 450 Nm Dual AWD',
      image: '/images/vehicles/dark/hero-jeep-dark.jpg',
      ambientGlow: 'rgba(37, 99, 235, 0.35)',
      ambientCyan: 'rgba(99, 102, 241, 0.18)',
    },
  ];

  useEffect(() => {
    setCurrentUser(getStoredUser());
  }, []);

  // Auto-advance hero slider every 7.5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % heroSlides.length);
    }, 7500);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  const activeSlide = heroSlides[currentSlideIndex];
  const activeVehicle = activeSlide.vehicle;

  const handleOpenBooking = (vehicle: any) => {
    setBookingVehicle(vehicle);
    setBookingModalOpen(true);
  };

  const getFilteredVehicles = () => {
    switch (selectedCategoryTab) {
      case 'scooters':
        return ELECTRIC_SCOOTERS;
      case 'bikes':
        return ELECTRIC_MOTORCYCLES;
      case 'cycles':
        return ELECTRIC_CYCLES;
      case 'jeeps':
        return ELECTRIC_JEEPS;
      default:
        return ALL_CATALOG_VEHICLES;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#080B12] text-[#F7FAFF] selection:bg-[#267DFF] selection:text-white relative overflow-x-hidden min-h-screen">
      {/* =========================================================================
          DESKTOP PERSISTENT 2-WAY VERTICAL ROAD (RIGHT RAIL)
          ========================================================================= */}
      <VerticalRoad />

      {/* =========================================================================
          MOBILE PERSISTENT 2-WAY BACKGROUND ROAD (FULL-PAGE SCROLL)
          ========================================================================= */}
      <MobileBackgroundRoad />

      {/* Main Content Wrapper (Leaves reserved track space on desktop for Vertical Road) */}
      <div className="relative z-10 w-full lg:pr-[144px] xl:pr-[156px] 2xl:pr-[168px] transition-all">
        <Navbar />

        {/* =========================================================================
            HERO SECTION — MIDNIGHT ELECTRIC SHOWROOM ADVERTISEMENT
            Deep Navy / Midnight Black Studio, Directional Rim Lighting,
            Photorealistic Large Vehicle, Physical Floor Contact, Atmospheric Mist
            ========================================================================= */}
        <section
          className="relative border-b border-white/10 overflow-hidden pt-4 pb-12 sm:pt-6 sm:pb-16 md:pt-14 md:pb-24"
          style={{
            background: 'radial-gradient(ellipse at 75% 35%, rgba(20, 33, 56, 0.88) 0%, rgba(12, 19, 34, 0.92) 45%, rgba(8, 11, 18, 0.94) 100%)',
          }}
        >
          {/* Directional Automotive Studio Ambient Backlight Glow */}
          <div
            className="absolute top-1/4 right-1/6 w-[700px] h-[500px] pointer-events-none rounded-full filter blur-3xl opacity-80 transition-all duration-1000 animate-glow-pulse"
            style={{
              background: `radial-gradient(ellipse 65% 55% at 50% 50%, ${activeSlide.ambientGlow} 0%, ${activeSlide.ambientCyan} 50%, transparent 75%)`,
            }}
          />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            {/* =====================================================================
                MOBILE HERO LAYOUT (IMAGE-FIRST HIERARCHY)
                Visible only on screens < lg breakpoint
                1. Compact ASKR EV header & badge
                2. Large premium vehicle image (prominently in initial viewport)
                3. Short headline
                4. One-line or two-line description
                5. Compact vehicle specifications
                6. Primary CTA and secondary CTA
                ===================================================================== */}
            <div className="block lg:hidden space-y-4">
              {/* 1. Compact ASKR EV Header & Category Badge */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#101827] border border-blue-500/30 text-[#50D9FF] text-[10px] font-bold tracking-wide shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#50D9FF] animate-pulse" />
                  <span className="truncate max-w-[200px] xs:max-w-none">{activeSlide.primaryBadge}</span>
                </div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#50D9FF] bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20 whitespace-nowrap">
                  {activeVehicle.name}
                </span>
              </div>

              {/* 2. Large Premium Vehicle Image Stage (Prominent in initial mobile viewport) */}
              <div className="relative w-full h-[220px] xs:h-[250px] sm:h-[300px] flex items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#0A0F1A]/90 shadow-2xl">
                {/* Studio Backdrop Glow */}
                <div
                  className="absolute inset-0 opacity-40 pointer-events-none"
                  style={{
                    background: 'radial-gradient(ellipse 80% 50% at 50% 65%, rgba(38, 125, 255, 0.25) 0%, transparent 75%)',
                  }}
                />

                {/* Primary Vehicle Image */}
                <div className="relative z-10 w-full h-full flex items-center justify-center p-3">
                  <img
                    key={`mobile-${activeSlide.image}`}
                    src={activeSlide.image}
                    alt={activeVehicle.name}
                    className="w-full h-full object-cover select-none transition-all duration-700 animate-in fade-in rounded-xl"
                  />
                </div>

                {/* Automotive Ground Contact Shadow */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-4/5 h-4 pointer-events-none z-12 animate-shadow-scale">
                  <div className="absolute inset-x-6 top-0.5 bottom-0.5 bg-black/95 rounded-full filter blur-sm" />
                </div>

                {/* Ground Mist */}
                <GroundMist />

                {/* Mobile Slider Chevrons */}
                <button
                  onClick={() =>
                    setCurrentSlideIndex((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)
                  }
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 text-[#F7FAFF] transition-colors backdrop-blur-sm"
                  aria-label="Previous Slide"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setCurrentSlideIndex((prev) => (prev + 1) % heroSlides.length)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 text-[#F7FAFF] transition-colors backdrop-blur-sm"
                  aria-label="Next Slide"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                {/* Mobile Slider Indicator Dots */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/50 border border-white/10 backdrop-blur-sm">
                  {heroSlides.map((slide, idx) => (
                    <button
                      key={`mob-dot-${slide.vehicle.id}`}
                      onClick={() => setCurrentSlideIndex(idx)}
                      className={`h-1.5 rounded-full transition-all ${
                        currentSlideIndex === idx
                          ? 'w-5 bg-[#267DFF] shadow-[0_0_8px_rgba(38,125,255,0.8)]'
                          : 'w-1.5 bg-white/30'
                      }`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>

              {/* 3. Short Headline */}
              <div className="pt-0.5">
                <h1 className="text-2xl xs:text-3xl font-black text-[#F7FAFF] tracking-tight leading-tight">
                  {activeSlide.headline}
                </h1>
                {/* 4. One-Line or Two-Line Description */}
                <p className="mt-1.5 text-xs xs:text-sm text-[#AAB7C8] font-normal leading-relaxed line-clamp-2">
                  {activeSlide.subline}
                </p>
              </div>

              {/* 5. Compact Vehicle Specifications & Starting Price */}
              <div className="space-y-2">
                <div className="flex items-baseline justify-between px-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[10px] text-[#AAB7C8] uppercase tracking-wider font-semibold">Starting at</span>
                    <span className="text-xl xs:text-2xl font-black text-[#F7FAFF] tracking-tight">
                      {activeVehicle.exShowroomPriceINR
                        ? `₹${activeVehicle.exShowroomPriceINR.toLocaleString('en-IN')}`
                        : 'Showcase Preview'}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#AAB7C8]/70 font-medium">Ex-showroom</span>
                </div>

                {/* Compact 4-Metric Grid */}
                <div className="grid grid-cols-4 gap-1.5 py-2 px-2.5 rounded-xl bg-[#101827]/90 border border-white/10 shadow-md backdrop-blur-md">
                  <div className="text-center">
                    <span className="text-[9px] text-[#AAB7C8] uppercase tracking-wider block font-semibold truncate">
                      Range
                    </span>
                    <span className="text-xs xs:text-sm font-bold text-[#F7FAFF] whitespace-nowrap">
                      {activeVehicle.rangeKm} <span className="text-[10px] font-normal text-[#50D9FF]">km</span>
                    </span>
                  </div>

                  <div className="text-center border-l border-white/10 pl-1">
                    <span className="text-[9px] text-[#AAB7C8] uppercase tracking-wider block font-semibold truncate">
                      Speed
                    </span>
                    <span className="text-xs xs:text-sm font-bold text-[#F7FAFF] whitespace-nowrap">
                      {activeVehicle.topSpeedKmh} <span className="text-[10px] font-normal text-[#50D9FF]">km/h</span>
                    </span>
                  </div>

                  <div className="text-center border-l border-white/10 pl-1">
                    <span className="text-[9px] text-[#AAB7C8] uppercase tracking-wider block font-semibold truncate">
                      Battery
                    </span>
                    <span className="text-xs xs:text-sm font-bold text-[#F7FAFF] whitespace-nowrap">
                      {activeVehicle.batteryCapacityKwh} <span className="text-[10px] font-normal text-[#50D9FF]">kWh</span>
                    </span>
                  </div>

                  <div className="text-center border-l border-white/10 pl-1">
                    <span className="text-[9px] text-[#AAB7C8] uppercase tracking-wider block font-semibold truncate">
                      0-40 km/h
                    </span>
                    <span className="text-xs xs:text-sm font-bold text-[#F7FAFF] whitespace-nowrap">
                      {activeVehicle.acceleration0to40 || '3.2 sec'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 6. Primary CTA and Secondary CTA */}
              <div className="pt-1 flex flex-col xs:flex-row items-center gap-2.5 w-full">
                <Link
                  href={`/bikes/${activeVehicle.modelCode || activeVehicle.slug}`}
                  className="w-full py-3 px-5 rounded-full bg-[#267DFF] hover:bg-[#1A6EEB] text-white text-xs font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(38,125,255,0.35)] flex items-center justify-center gap-1.5"
                >
                  <span>Explore {activeVehicle.name}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                {activeVehicle.isBookable ? (
                  <button
                    onClick={() => handleOpenBooking(activeVehicle)}
                    className="w-full py-3 px-5 rounded-full border border-white/20 hover:border-white text-[#F7FAFF] text-xs font-semibold tracking-wide transition-colors bg-white/5 hover:bg-white/10 flex items-center justify-center"
                  >
                    Book Now
                  </button>
                ) : (
                  <Link
                    href={`/bikes/${activeVehicle.modelCode || activeVehicle.slug}`}
                    className="w-full py-3 px-5 rounded-full border border-white/20 hover:border-white text-[#F7FAFF] text-xs font-semibold tracking-wide transition-colors bg-white/5 hover:bg-white/10 flex items-center justify-center"
                  >
                    View Specifications
                  </Link>
                )}
              </div>
            </div>

            {/* =====================================================================
                DESKTOP HERO LAYOUT (PRESERVED HIGH-END 12-COLUMN SHOWROOM STAGE)
                Visible only on lg+ breakpoints
                ===================================================================== */}
            <div className="hidden lg:grid lg:grid-cols-12 gap-8 lg:gap-10 items-center">
              {/* Left Content Column */}
              <div className="lg:col-span-5 space-y-6 text-left z-10">
                {/* Category / Status Pill */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#101827] border border-blue-500/30 text-[#50D9FF] text-xs font-bold tracking-wide shadow-[0_0_15px_rgba(38,125,255,0.15)]">
                  <span className="w-2 h-2 rounded-full bg-[#50D9FF] animate-pulse" />
                  <span>{activeSlide.primaryBadge}</span>
                </div>

                {/* Model Name & Main Headline */}
                <div className="transition-all duration-500">
                  <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-widest text-[#50D9FF] mb-1.5">
                    {activeVehicle.name}
                  </h2>
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#F7FAFF] tracking-tight leading-[1.06]">
                    {activeSlide.headline}
                  </h1>
                  <p className="mt-3.5 text-base sm:text-lg text-[#AAB7C8] font-normal leading-relaxed max-w-xl">
                    {activeSlide.subline}
                  </p>
                </div>

                {/* Starting Price Display */}
                <div className="pt-1 flex items-baseline gap-2.5">
                  <span className="text-xs text-[#AAB7C8] uppercase tracking-wider font-semibold">Starting at</span>
                  <span className="text-3xl sm:text-4xl font-black text-[#F7FAFF] tracking-tight">
                    {activeVehicle.exShowroomPriceINR
                      ? `₹${activeVehicle.exShowroomPriceINR.toLocaleString('en-IN')}`
                      : 'Showcase Preview'}
                  </span>
                  <span className="text-xs text-[#AAB7C8]/70 font-medium">Ex-showroom</span>
                </div>

                {/* Key 4-Metric Grid in Midnight Glassmorphic Pill */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3.5 px-4 rounded-2xl bg-[#101827]/90 border border-white/10 shadow-lg w-full max-w-xl backdrop-blur-md">
                  <div>
                    <span className="text-[10px] text-[#AAB7C8] uppercase tracking-wider block font-semibold whitespace-nowrap">
                      Range
                    </span>
                    <span className="text-base sm:text-lg font-bold text-[#F7FAFF] whitespace-nowrap">
                      {activeVehicle.rangeKm} <span className="text-xs font-normal text-[#50D9FF]">km</span>
                    </span>
                  </div>

                  <div className="border-l border-white/10 pl-3">
                    <span className="text-[10px] text-[#AAB7C8] uppercase tracking-wider block font-semibold whitespace-nowrap">
                      Top Speed
                    </span>
                    <span className="text-base sm:text-lg font-bold text-[#F7FAFF] whitespace-nowrap">
                      {activeVehicle.topSpeedKmh} <span className="text-xs font-normal text-[#50D9FF]">km/h</span>
                    </span>
                  </div>

                  <div className="border-l sm:border-l border-white/10 pl-3">
                    <span className="text-[10px] text-[#AAB7C8] uppercase tracking-wider block font-semibold whitespace-nowrap">
                      Battery
                    </span>
                    <span className="text-base sm:text-lg font-bold text-[#F7FAFF] whitespace-nowrap">
                      {activeVehicle.batteryCapacityKwh} <span className="text-xs font-normal text-[#50D9FF]">kWh</span>
                    </span>
                  </div>

                  <div className="border-l border-white/10 pl-3">
                    <span className="text-[10px] text-[#AAB7C8] uppercase tracking-wider block font-semibold whitespace-nowrap">
                      {activeVehicle.category === 'cycles' ? '0-25 km/h' : '0-40 km/h'}
                    </span>
                    <span className="text-base sm:text-lg font-bold text-[#F7FAFF] whitespace-nowrap">
                      {activeVehicle.acceleration0to40 || '3.2 sec'}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex flex-wrap items-center gap-3.5">
                  <Link
                    href={`/bikes/${activeVehicle.modelCode || activeVehicle.slug}`}
                    className="px-7 py-3.5 rounded-full bg-[#267DFF] hover:bg-[#1A6EEB] text-white text-xs sm:text-sm font-bold tracking-wide transition-all shadow-[0_0_25px_rgba(38,125,255,0.4)] hover:shadow-[0_0_35px_rgba(38,125,255,0.6)] flex items-center gap-2 group"
                  >
                    <span>Explore {activeVehicle.name}</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Link>

                  {activeVehicle.isBookable ? (
                    <button
                      onClick={() => handleOpenBooking(activeVehicle)}
                      className="px-7 py-3.5 rounded-full border border-white/20 hover:border-white text-[#F7FAFF] text-xs sm:text-sm font-semibold tracking-wide transition-colors bg-white/5 hover:bg-white/10"
                    >
                      Book Now
                    </button>
                  ) : (
                    <Link
                      href={`/bikes/${activeVehicle.modelCode || activeVehicle.slug}`}
                      className="px-7 py-3.5 rounded-full border border-white/20 hover:border-white text-[#F7FAFF] text-xs sm:text-sm font-semibold tracking-wide transition-colors bg-white/5 hover:bg-white/10"
                    >
                      View Specifications
                    </Link>
                  )}
                </div>
              </div>

              {/* Right Column: Large Physically-Grounded Vehicle Stage (Occupies ~60% Visual Area) */}
              <div className="lg:col-span-7 flex flex-col items-center justify-center relative">
                <div className="relative w-full h-88 sm:h-104 md:h-[460px] flex items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-[#0A0F1A]/80 shadow-2xl">
                  {/* Subtle Studio Backdrop Horizon Light */}
                  <div
                    className="absolute inset-0 opacity-40 pointer-events-none"
                    style={{
                      background: 'radial-gradient(ellipse 80% 50% at 50% 65%, rgba(38, 125, 255, 0.25) 0%, transparent 75%)',
                    }}
                  />

                  {/* Primary Large Vehicle Image (Physically Grounded on Studio Floor) */}
                  <div className="relative z-10 w-full h-full flex items-center justify-center p-4">
                    <img
                      key={activeSlide.image}
                      src={activeSlide.image}
                      alt={activeVehicle.name}
                      className="w-full h-full object-cover select-none transition-all duration-700 animate-in fade-in"
                    />
                  </div>

                  {/* Realistic Automotive Ground Contact Shadow (Layered Ellipses) */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-4/5 h-6 pointer-events-none z-12 animate-shadow-scale">
                    <div className="absolute inset-x-8 top-1 bottom-1 bg-black/90 rounded-full filter blur-md" />
                  </div>

                  {/* Atmospheric Cool Ground Mist Rolling Across Lower Floor */}
                  <GroundMist />
                </div>

                {/* Slider Navigation Dots & Controls */}
                <div className="mt-5 flex items-center gap-3 z-10">
                  <button
                    onClick={() =>
                      setCurrentSlideIndex((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)
                    }
                    className="p-2 rounded-full border border-white/15 hover:border-white/40 bg-[#101827]/80 text-[#F7FAFF] transition-colors"
                    aria-label="Previous Vehicle"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-2">
                    {heroSlides.map((slide, idx) => (
                      <button
                        key={slide.vehicle.id}
                        onClick={() => setCurrentSlideIndex(idx)}
                        className={`h-2 rounded-full transition-all ${
                          currentSlideIndex === idx
                            ? 'w-8 bg-[#267DFF] shadow-[0_0_10px_rgba(38,125,255,0.6)]'
                            : 'w-2 bg-white/20 hover:bg-white/40'
                        }`}
                        aria-label={`Go to slide ${idx + 1}: ${slide.vehicle.name}`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentSlideIndex((prev) => (prev + 1) % heroSlides.length)}
                    className="p-2 rounded-full border border-white/15 hover:border-white/40 bg-[#101827]/80 text-[#F7FAFF] transition-colors"
                    aria-label="Next Vehicle"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            EXPLORE THE EV LINEUP — CATEGORY TABS & DARK PRODUCT CARDS
            Deep Navy / Midnight Black Gradient Stage
            ========================================================================= */}
        <section
          className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full"
          style={{
            background: 'linear-gradient(180deg, rgba(13, 20, 36, 0.82) 0%, rgba(8, 11, 18, 0.88) 30%, rgba(10, 16, 29, 0.85) 100%)',
          }}
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-white/10">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#50D9FF] mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#267DFF] shadow-[0_0_8px_#267DFF]" />
                <span>Browse The Lineup</span>
              </h2>
              <h3 className="text-3xl sm:text-4xl font-extrabold text-[#F7FAFF] tracking-tight">
                Electric Vehicles for Every Journey.
              </h3>
              <p className="mt-2 text-sm sm:text-base text-[#AAB7C8] max-w-xl">
                From zero-emission urban scooters to high-torque electric motorcycles, lightweight commuter cycles, and 4x4 adventure utility vehicles.
              </p>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2 bg-[#101827] p-1.5 rounded-full border border-white/10">
              <button
                onClick={() => setSelectedCategoryTab('scooters')}
                className={`px-5 py-2 rounded-full text-xs font-semibold tracking-wide transition-all ${
                  selectedCategoryTab === 'scooters'
                    ? 'bg-[#267DFF] text-white shadow-[0_0_15px_rgba(38,125,255,0.4)] font-bold'
                    : 'text-[#AAB7C8] hover:text-white'
                }`}
              >
                Scooters
              </button>

              <button
                onClick={() => setSelectedCategoryTab('bikes')}
                className={`px-5 py-2 rounded-full text-xs font-semibold tracking-wide transition-all ${
                  selectedCategoryTab === 'bikes'
                    ? 'bg-[#267DFF] text-white shadow-[0_0_15px_rgba(38,125,255,0.4)] font-bold'
                    : 'text-[#AAB7C8] hover:text-white'
                }`}
              >
                Bikes
              </button>

              <button
                onClick={() => setSelectedCategoryTab('cycles')}
                className={`px-5 py-2 rounded-full text-xs font-semibold tracking-wide transition-all ${
                  selectedCategoryTab === 'cycles'
                    ? 'bg-[#267DFF] text-white shadow-[0_0_15px_rgba(38,125,255,0.4)] font-bold'
                    : 'text-[#AAB7C8] hover:text-white'
                }`}
              >
                Cycles
              </button>

              <button
                onClick={() => setSelectedCategoryTab('jeeps')}
                className={`px-5 py-2 rounded-full text-xs font-semibold tracking-wide transition-all ${
                  selectedCategoryTab === 'jeeps'
                    ? 'bg-[#267DFF] text-white shadow-[0_0_15px_rgba(38,125,255,0.4)] font-bold'
                    : 'text-[#AAB7C8] hover:text-white'
                }`}
              >
                Jeeps
              </button>
            </div>
          </div>

          {/* Product Cards Grid with Dark Graphite Stage & Subtle Electric Glow */}
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {getFilteredVehicles().map((veh) => (
              <BikeCard key={veh.id} vehicle={veh} onBookClick={handleOpenBooking} />
            ))}
          </div>

          {/* View All In Category Link */}
          <div className="mt-12 text-center">
            <Link
              href={`/${selectedCategoryTab === 'all' ? 'bikes' : selectedCategoryTab}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#50D9FF] hover:underline"
            >
              <span>View All {selectedCategoryTab.toUpperCase()}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* =========================================================================
            ENGINEERING & TECHNOLOGY (Midnight Dark Showcase)
            PMSM Motors, IP67 Lithium-Ion BMS, Smart MoveOS, Fast Wallbox
            ========================================================================= */}
        <section
          className="py-20 border-y border-white/10"
          style={{
            background: 'linear-gradient(180deg, rgba(10, 16, 29, 0.85) 0%, rgba(8, 11, 18, 0.88) 50%, rgba(16, 24, 39, 0.85) 100%)',
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
              <span className="text-xs font-bold uppercase tracking-widest text-[#50D9FF]">
                Engineering Excellence
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#F7FAFF] tracking-tight">
                Designed For Real-World Performance.
              </h2>
              <p className="text-sm sm:text-base text-[#AAB7C8]">
                Built with precision thermal balancing, high-efficiency motors, and seamless connected telemetry.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-7 rounded-2xl bg-[#101827]/85 border border-white/10 space-y-3 hover:border-[#267DFF]/50 transition-all hover:shadow-[0_0_20px_rgba(38,125,255,0.2)]">
                <div className="w-12 h-12 rounded-xl bg-blue-500/15 text-[#50D9FF] flex items-center justify-center font-bold text-lg border border-blue-500/20">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#F7FAFF]">PMSM Powertrain</h3>
                <p className="text-xs text-[#AAB7C8] leading-relaxed">
                  Permanent Magnet Synchronous Motors delivering up to 94% system efficiency and instant torque from zero RPM.
                </p>
              </div>

              <div className="p-7 rounded-2xl bg-[#101827]/85 border border-white/10 space-y-3 hover:border-emerald-400/50 transition-all hover:shadow-[0_0_20px_rgba(52,211,153,0.2)]">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold text-lg border border-emerald-500/20">
                  <BatteryCharging className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#F7FAFF]">IP67 Battery Shield</h3>
                <p className="text-xs text-[#AAB7C8] leading-relaxed">
                  Sealed aluminium battery enclosures with active thermal balancing, water immersion protection, and fire-retardant cells.
                </p>
              </div>

              <div className="p-7 rounded-2xl bg-[#101827]/85 border border-white/10 space-y-3 hover:border-purple-400/50 transition-all hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                <div className="w-12 h-12 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center font-bold text-lg border border-purple-500/20">
                  <Gauge className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#F7FAFF]">MoveOS Telemetry</h3>
                <p className="text-xs text-[#AAB7C8] leading-relaxed">
                  Integrated touch displays with real-time turn-by-turn navigation, proximity keyless phone unlock, and over-the-air updates.
                </p>
              </div>

              <div className="p-7 rounded-2xl bg-[#101827]/85 border border-white/10 space-y-3 hover:border-amber-400/50 transition-all hover:shadow-[0_0_20px_rgba(251,191,36,0.2)]">
                <div className="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center font-bold text-lg border border-amber-500/20">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#F7FAFF]">Everyday Charging</h3>
                <p className="text-xs text-[#AAB7C8] leading-relaxed">
                  Plug into any standard 15A home socket or fast-charging network for convenient, low-cost overnight recharges.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SHOWROOM ACTION BANNER
            Midnight Blue Gradient with Electric Spotlight
            ========================================================================= */}
        <section
          className="py-20"
          style={{
            background: 'linear-gradient(180deg, rgba(16, 24, 39, 0.85) 0%, rgba(8, 11, 18, 0.90) 100%)',
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div
              className="relative p-8 sm:p-14 rounded-3xl text-white flex flex-col md:flex-row items-center justify-between gap-8 overflow-hidden shadow-2xl border border-white/10"
              style={{
                background: 'linear-gradient(135deg, #101827 0%, #1A2436 50%, #080B12 100%)',
              }}
            >
              {/* Electric Blue Spotlight In Corner */}
              <div
                className="absolute top-0 right-0 w-96 h-96 pointer-events-none rounded-full filter blur-3xl opacity-50"
                style={{
                  background: 'radial-gradient(circle, rgba(38, 125, 255, 0.6) 0%, transparent 70%)',
                }}
              />

              <div className="space-y-3 max-w-xl relative z-10">
                <span className="text-xs font-bold uppercase tracking-widest text-[#50D9FF]">
                  The Electric Shift
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#F7FAFF]">
                  Ready to Experience ASKR EV?
                </h2>
                <p className="text-sm text-[#AAB7C8] leading-relaxed">
                  Explore our full vehicle showroom, inspect certified specifications, and reserve your electric vehicle online today.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 shrink-0 relative z-10">
                <Link
                  href="/bikes"
                  className="px-8 py-3.5 rounded-full bg-[#267DFF] hover:bg-[#1A6EEB] text-white text-xs sm:text-sm font-bold tracking-wide transition-all shadow-[0_0_25px_rgba(38,125,255,0.4)]"
                >
                  Explore Showroom
                </Link>
                <Link
                  href="/auth/register"
                  className="px-8 py-3.5 rounded-full border border-white/20 hover:border-white text-[#F7FAFF] hover:bg-white/10 text-xs sm:text-sm font-semibold tracking-wide transition-colors"
                >
                  Create Account
                </Link>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </div>

      {/* Simulated Booking Modal */}
      {bookingVehicle && (
        <BookingModal
          bike={bookingVehicle}
          isOpen={bookingModalOpen}
          onClose={() => setBookingModalOpen(false)}
          user={currentUser}
          onSuccess={() => setBookingModalOpen(false)}
        />
      )}
    </div>
  );
}
