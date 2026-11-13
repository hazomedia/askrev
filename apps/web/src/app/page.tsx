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
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<'all' | 'scooters' | 'bikes' | 'cycles' | 'jeeps'>('scooters');
  const [bookingVehicle, setBookingVehicle] = useState<any | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  // 4 Featured Hero Vehicles across categories (Scooter, Bike, Cycle, Jeep)
  const heroSlides = [
    {
      vehicle: ELECTRIC_SCOOTERS[0], // ASKR S1 Pro
      headline: 'The Revolution in Electric Mobility.',
      subline: 'Hyper-performance electric scooter with 195 km IDC range, 120 km/h top speed, and MoveOS telemetry.',
      primaryBadge: 'Flagship Electric Scooter',
    },
    {
      vehicle: ELECTRIC_MOTORCYCLES[0], // ASKR Thunder Pro
      headline: 'Pure Torque. Zero Compromise.',
      subline: 'High-torque urban electric streetfighter powered by permanent magnet synchronous motor with instant response.',
      primaryBadge: 'Bookings Open • Live Production Model',
    },
    {
      vehicle: ELECTRIC_CYCLES[0], // ASKR AeroTrek C1
      headline: 'Ride Light. Go Further.',
      subline: 'Ultralight hydroformed carbon e-bike with integrated downtube battery and silent Gates carbon belt drive.',
      primaryBadge: 'Urban E-Bike Prototype',
    },
    {
      vehicle: ELECTRIC_JEEPS[0], // ASKR TerraMax 4x4
      headline: 'Built for the Extraordinary.',
      subline: 'Dual-motor all-wheel electric drive SUV with 380 km expedition range and structural underbody steel armor.',
      primaryBadge: 'Overland 4x4 EV Concept',
    },
  ];

  useEffect(() => {
    setCurrentUser(getStoredUser());
  }, []);

  // Auto-advance hero slider every 6.5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % heroSlides.length);
    }, 6500);
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
    <div className="flex-1 flex flex-col bg-white text-neutral-900 selection:bg-neutral-900 selection:text-white">
      <Navbar />

      {/* =========================================================================
          HERO SECTION — OLA-STYLE FULL-WIDTH LIGHT SHOWROOM SHOWCASE
          Realistic vehicle photograph, model name, starting price, range, top speed,
          battery capacity, explore model, and book now.
          ========================================================================= */}
      <section className="relative bg-[#FAFAFA] border-b border-neutral-200 overflow-hidden pt-6 pb-16 md:pt-10 md:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-6 space-y-6 text-left z-10">
              {/* Category / Status Pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-200/70 text-neutral-800 text-xs font-semibold tracking-wide">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{activeSlide.primaryBadge}</span>
              </div>

              {/* Model Name & Main Headline */}
              <div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-[#165DAD] mb-1">
                  {activeVehicle.name}
                </h2>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-neutral-950 tracking-tight leading-[1.08]">
                  {activeSlide.headline}
                </h1>
                <p className="mt-3 text-base sm:text-lg text-neutral-600 font-normal leading-relaxed max-w-xl">
                  {activeSlide.subline}
                </p>
              </div>

              {/* Starting Price Display */}
              <div className="pt-1 flex items-baseline gap-2">
                <span className="text-xs text-neutral-500 uppercase tracking-wider font-medium">Starting at</span>
                <span className="text-3xl sm:text-4xl font-extrabold text-neutral-950 tracking-tight">
                  {activeVehicle.exShowroomPriceINR
                    ? `₹${activeVehicle.exShowroomPriceINR.toLocaleString('en-IN')}`
                    : 'Announcing Soon'}
                </span>
                <span className="text-xs text-neutral-400 font-medium">Ex-showroom</span>
              </div>

              {/* Key 4-Metric Grid (Ola Style) */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 py-3.5 px-4 rounded-2xl bg-white border border-neutral-200/80 shadow-xs max-w-lg">
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase tracking-wider block font-medium">
                    Certified Range
                  </span>
                  <span className="text-base sm:text-lg font-bold text-neutral-900">
                    {activeVehicle.rangeKm} <span className="text-xs font-normal text-neutral-500">km</span>
                  </span>
                </div>

                <div className="border-l border-neutral-200 pl-3">
                  <span className="text-[10px] text-neutral-400 uppercase tracking-wider block font-medium">
                    Top Speed
                  </span>
                  <span className="text-base sm:text-lg font-bold text-neutral-900">
                    {activeVehicle.topSpeedKmh} <span className="text-xs font-normal text-neutral-500">km/h</span>
                  </span>
                </div>

                <div className="border-l border-neutral-200 pl-3">
                  <span className="text-[10px] text-neutral-400 uppercase tracking-wider block font-medium">
                    Battery
                  </span>
                  <span className="text-base sm:text-lg font-bold text-neutral-900">
                    {activeVehicle.batteryCapacityKwh} <span className="text-xs font-normal text-neutral-500">kWh</span>
                  </span>
                </div>

                <div className="hidden sm:block border-l border-neutral-200 pl-3">
                  <span className="text-[10px] text-neutral-400 uppercase tracking-wider block font-medium">
                    0-40 km/h
                  </span>
                  <span className="text-base sm:text-lg font-bold text-neutral-900">
                    {activeVehicle.acceleration0to40 || '3.2s'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-3.5">
                <Link
                  href={`/bikes/${activeVehicle.modelCode || activeVehicle.slug}`}
                  className="px-7 py-3.5 rounded-full bg-black hover:bg-neutral-800 text-white text-xs sm:text-sm font-semibold tracking-wide transition-all shadow-sm flex items-center gap-2 group"
                >
                  <span>Explore {activeVehicle.name}</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>

                {activeVehicle.isBookable ? (
                  <button
                    onClick={() => handleOpenBooking(activeVehicle)}
                    className="px-7 py-3.5 rounded-full border border-neutral-300 hover:border-black text-neutral-900 text-xs sm:text-sm font-semibold tracking-wide transition-colors bg-white hover:bg-neutral-50"
                  >
                    Book Now
                  </button>
                ) : (
                  <Link
                    href={`/bikes/${activeVehicle.modelCode || activeVehicle.slug}`}
                    className="px-7 py-3.5 rounded-full border border-neutral-300 hover:border-black text-neutral-900 text-xs sm:text-sm font-semibold tracking-wide transition-colors bg-white hover:bg-neutral-50"
                  >
                    View Specifications
                  </Link>
                )}
              </div>
            </div>

            {/* Right Column: Giant Realistic Vehicle Photograph on White Background */}
            <div className="lg:col-span-6 flex flex-col items-center justify-center relative">
              <div className="relative w-full h-72 sm:h-96 md:h-[420px] flex items-center justify-center transition-all duration-500">
                <img
                  key={activeVehicle.imageUrl}
                  src={activeVehicle.imageUrl}
                  alt={activeVehicle.name}
                  className="w-full h-full object-contain filter drop-shadow-md select-none transition-all duration-500 animate-in fade-in zoom-in-95"
                />
              </div>

              {/* Slider Dots & Quick Navigation */}
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() =>
                    setCurrentSlideIndex((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)
                  }
                  className="p-2 rounded-full border border-neutral-200 hover:bg-neutral-100 text-neutral-600 transition-colors"
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
                          ? 'w-8 bg-black'
                          : 'w-2 bg-neutral-300 hover:bg-neutral-400'
                      }`}
                      aria-label={`Go to slide ${idx + 1}: ${slide.vehicle.name}`}
                    />
                  ))}
                </div>

                <button
                  onClick={() => setCurrentSlideIndex((prev) => (prev + 1) % heroSlides.length)}
                  className="p-2 rounded-full border border-neutral-200 hover:bg-neutral-100 text-neutral-600 transition-colors"
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
          EXPLORE THE EV LINEUP — CATEGORY TABS & PRODUCT CARDS
          Scooters, Motorcycles, Cycles, Jeeps
          ========================================================================= */}
      <section className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-neutral-200">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#165DAD] mb-2">
              Browse The Lineup
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-neutral-950 tracking-tight">
              Electric Vehicles for Every Journey.
            </h3>
            <p className="mt-2 text-sm sm:text-base text-neutral-600 max-w-xl">
              From zero-emission urban scooters to high-torque electric motorcycles and 4x4 adventure utility vehicles.
            </p>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2 bg-neutral-100 p-1 rounded-full">
            <button
              onClick={() => setSelectedCategoryTab('scooters')}
              className={`px-5 py-2 rounded-full text-xs font-semibold tracking-wide transition-all ${
                selectedCategoryTab === 'scooters'
                  ? 'bg-white text-black shadow-xs font-bold'
                  : 'text-neutral-600 hover:text-black'
              }`}
            >
              Scooters
            </button>

            <button
              onClick={() => setSelectedCategoryTab('bikes')}
              className={`px-5 py-2 rounded-full text-xs font-semibold tracking-wide transition-all ${
                selectedCategoryTab === 'bikes'
                  ? 'bg-white text-black shadow-xs font-bold'
                  : 'text-neutral-600 hover:text-black'
              }`}
            >
              Bikes
            </button>

            <button
              onClick={() => setSelectedCategoryTab('cycles')}
              className={`px-5 py-2 rounded-full text-xs font-semibold tracking-wide transition-all ${
                selectedCategoryTab === 'cycles'
                  ? 'bg-white text-black shadow-xs font-bold'
                  : 'text-neutral-600 hover:text-black'
              }`}
            >
              Cycles
            </button>

            <button
              onClick={() => setSelectedCategoryTab('jeeps')}
              className={`px-5 py-2 rounded-full text-xs font-semibold tracking-wide transition-all ${
                selectedCategoryTab === 'jeeps'
                  ? 'bg-white text-black shadow-xs font-bold'
                  : 'text-neutral-600 hover:text-black'
              }`}
            >
              Jeeps
            </button>
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {getFilteredVehicles().map((veh) => (
            <BikeCard key={veh.id} vehicle={veh} onBookClick={handleOpenBooking} />
          ))}
        </div>

        {/* View All In Category Link */}
        <div className="mt-12 text-center">
          <Link
            href={`/${selectedCategoryTab === 'all' ? 'bikes' : selectedCategoryTab}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#165DAD] hover:underline"
          >
            <span>View All {selectedCategoryTab.toUpperCase()}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* =========================================================================
          ENGINEERING & TECHNOLOGY (Ola Hyperdrive Benchmark)
          PMSM Motors, IP67 Lithium-Ion BMS, Smart MoveOS, Fast Wallbox
          ========================================================================= */}
      <section className="py-20 bg-[#F8F9FA] border-y border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-[#165DAD]">
              Engineering Excellence
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-950 tracking-tight">
              Designed For Real-World Performance.
            </h2>
            <p className="text-sm sm:text-base text-neutral-600">
              Built with precision thermal balancing, high-efficiency motors, and seamless connected telemetry.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-7 rounded-2xl bg-white border border-neutral-200 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#165DAD] flex items-center justify-center font-bold text-lg">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900">PMSM Powertrain</h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Permanent Magnet Synchronous Motors delivering up to 94% system efficiency and instant torque from zero RPM.
              </p>
            </div>

            <div className="p-7 rounded-2xl bg-white border border-neutral-200 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
                <BatteryCharging className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900">IP67 Battery Shield</h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Sealed aluminium battery enclosures with active thermal balancing, water immersion protection, and fire-retardant cells.
              </p>
            </div>

            <div className="p-7 rounded-2xl bg-white border border-neutral-200 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg">
                <Gauge className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900">MoveOS Telemetry</h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Integrated touch displays with real-time turn-by-turn navigation, proximity keyless phone unlock, and over-the-air updates.
              </p>
            </div>

            <div className="p-7 rounded-2xl bg-white border border-neutral-200 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900">Everyday Charging</h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Plug into any standard 15A home socket or fast-charging network for convenient, low-cost overnight recharges.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SHOWROOM ACTION BANNER
          ========================================================================= */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 sm:p-14 rounded-3xl bg-neutral-950 text-white flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-3 max-w-xl">
              <span className="text-xs font-bold uppercase tracking-widest text-[#165DAD]">
                The Electric Shift
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Ready to Experience ASKR EV?
              </h2>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Explore our full vehicle showroom, inspect certified specifications, and reserve your electric vehicle online today.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 shrink-0">
              <Link
                href="/bikes"
                className="px-8 py-3.5 rounded-full bg-white text-black hover:bg-neutral-100 text-xs sm:text-sm font-semibold tracking-wide transition-all shadow-md"
              >
                Explore Showroom
              </Link>
              <Link
                href="/auth/register"
                className="px-8 py-3.5 rounded-full border border-neutral-700 hover:border-white text-white text-xs sm:text-sm font-semibold tracking-wide transition-colors"
              >
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />

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
