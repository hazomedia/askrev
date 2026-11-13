'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  Gauge,
  BatteryCharging,
  Zap,
  Sparkles,
  Layers,
  Cpu,
  Compass,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BikeCard from '../components/BikeCard';
import BookingModal from '../components/BookingModal';
import { fetchApi, getStoredUser } from '../lib/api';
import {
  VERIFIED_ELECTRIC_BIKES,
  CONCEPT_ELECTRIC_CYCLES,
  CONCEPT_ELECTRIC_JEEPS,
  Vehicle,
} from '../lib/catalog';

export default function HomePage() {
  const [bikes, setBikes] = useState<Vehicle[]>(VERIFIED_ELECTRIC_BIKES);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedHeroIndex, setSelectedHeroIndex] = useState(0);
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [bookingVehicle, setBookingVehicle] = useState<any | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  useEffect(() => {
    setCurrentUser(getStoredUser());
    loadBikes();
  }, []);

  const loadBikes = async () => {
    try {
      const data = await fetchApi<any[]>('/ev-bikes');
      if (Array.isArray(data) && data.length > 0) {
        // Merge API data with verified specs
        const merged = VERIFIED_ELECTRIC_BIKES.map((base) => {
          const apiMatch = data.find(
            (d) => d.modelCode === base.modelCode || d.id === base.id
          );
          if (apiMatch) {
            return {
              ...base,
              ...apiMatch,
              exShowroomPriceINR: apiMatch.exShowroomPriceINR || base.exShowroomPriceINR,
              bookingAmountINR: apiMatch.bookingAmountINR || base.bookingAmountINR,
              voucherRedeemLimitINR: apiMatch.voucherRedeemLimitINR || base.voucherRedeemLimitINR,
            };
          }
          return base;
        });
        setBikes(merged);
      }
    } catch (err) {
      console.warn('Note: utilizing verified model defaults', err);
    }
  };

  const heroVehicle = bikes[selectedHeroIndex] || bikes[0];
  const activeColor =
    heroVehicle.colors && heroVehicle.colors[selectedColorIndex]
      ? heroVehicle.colors[selectedColorIndex]
      : { name: 'Sapphire Blue', hex: '#165DAD', description: 'Primary metallic finish' };

  const handleOpenBooking = (vehicle: any) => {
    setBookingVehicle(vehicle);
    setBookingModalOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#080A0D] text-white selection:bg-[#C9FF36] selection:text-[#080A0D]">
      <Navbar />

      {/* =========================================================================
          HERO SECTION — CINEMATIC AUTOMOTIVE COMPOSITION
          Benchmark: Tesla / Porsche / Ather / BMW Motorrad luxury editorial design
          Headline: "THE FUTURE MOVES ELECTRIC."
          Subheadline: "Discover a new generation of electric mobility."
          ========================================================================= */}
      <section className="relative min-h-[92vh] flex flex-col justify-between pt-10 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden bg-radial-gradient">
        {/* Subtle Ambient Radial Lighting */}
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] rounded-full pointer-events-none opacity-20 blur-3xl"
          style={{
            background: `radial-gradient(circle, ${activeColor.hex} 0%, rgba(201, 255, 54, 0.15) 50%, transparent 80%)`,
          }}
        />

        {/* Ambient Grid Lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] pointer-events-none" />

        {/* Hero Top Content */}
        <div className="relative z-10 max-w-7xl mx-auto w-full text-center pt-8 md:pt-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-[#A7ADB5] mb-6 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-[#C9FF36] animate-pulse" />
            <span className="tracking-widest uppercase font-semibold text-[11px] text-white">
              Official ASKR EV Mobility
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter uppercase text-white leading-none">
            The Future <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400">Moves</span>{' '}
            <span className="text-[#C9FF36]">Electric.</span>
          </h1>

          <p className="mt-5 text-base sm:text-lg md:text-xl text-[#A7ADB5] max-w-2xl mx-auto font-light tracking-wide leading-relaxed">
            Discover a new generation of electric mobility. Engineered for high-torque performance, zero-emission urban flow, and long-range intelligence.
          </p>

          {/* Primary & Secondary Call to Actions */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/bikes"
              className="px-8 py-4 rounded-full bg-white text-[#101318] hover:bg-[#C9FF36] text-xs sm:text-sm font-extrabold uppercase tracking-widest transition-all duration-300 shadow-xl hover:shadow-lime/25 flex items-center gap-2 group"
            >
              <span>Explore Vehicles</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>

            <a
              href="#technology"
              className="px-7 py-4 rounded-full bg-white/5 hover:bg-white/10 text-white text-xs sm:text-sm font-semibold tracking-wider uppercase transition-colors border border-white/10 backdrop-blur-sm"
            >
              Discover ASKR EV
            </a>
          </div>
        </div>

        {/* Hero Featured Vehicle Showcase */}
        <div className="relative z-10 max-w-6xl mx-auto w-full mt-8 md:mt-12 flex flex-col items-center">
          {/* Main Vehicle Image Presentation */}
          <div className="relative w-full max-w-4xl h-64 sm:h-80 md:h-96 flex items-center justify-center">
            {/* Ground Contact Shadow */}
            <div className="absolute bottom-6 w-3/4 h-8 bg-black/80 blur-xl rounded-full" />

            <img
              src={heroVehicle.imageUrl.replace('.webp', '.svg')}
              alt={heroVehicle.name}
              className="relative z-10 w-full h-full object-contain filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)] transition-all duration-700"
            />
          </div>

          {/* Vehicle Selector Tabs & Interactive Color Switcher */}
          <div className="w-full max-w-3xl mt-4 p-4 rounded-2xl bg-[#101318]/90 border border-white/10 backdrop-blur-xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Model Switcher */}
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {bikes.map((b, idx) => (
                <button
                  key={b.id}
                  onClick={() => {
                    setSelectedHeroIndex(idx);
                    setSelectedColorIndex(0);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition-all whitespace-nowrap ${
                    selectedHeroIndex === idx
                      ? 'bg-white text-[#101318] shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {b.name.replace('ASKR ', '')}
                </button>
              ))}
            </div>

            {/* Color Finish Picker */}
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Finish:
              </span>
              <div className="flex items-center gap-2">
                {heroVehicle.colors.map((c, cIdx) => (
                  <button
                    key={c.name}
                    onClick={() => setSelectedColorIndex(cIdx)}
                    className={`w-6 h-6 rounded-full transition-transform border ${
                      selectedColorIndex === cIdx
                        ? 'scale-125 border-white ring-2 ring-[#C9FF36]/50'
                        : 'border-white/30 hover:scale-110'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                    aria-label={`Select color ${c.name}`}
                  />
                ))}
              </div>
              <span className="text-xs text-white font-medium tracking-wide">
                {activeColor.name}
              </span>
            </div>
          </div>

          {/* Quick Specifications Strip */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 text-center w-full max-w-4xl border-t border-white/10 pt-6">
            <div>
              <span className="text-[11px] text-[#A7ADB5] uppercase tracking-wider block">Certified Range</span>
              <span className="text-2xl sm:text-3xl font-black text-white">{heroVehicle.rangeKm} <span className="text-sm font-normal text-slate-400">km</span></span>
            </div>
            <div>
              <span className="text-[11px] text-[#A7ADB5] uppercase tracking-wider block">Top Speed</span>
              <span className="text-2xl sm:text-3xl font-black text-white">{heroVehicle.topSpeedKmh} <span className="text-sm font-normal text-slate-400">km/h</span></span>
            </div>
            <div>
              <span className="text-[11px] text-[#A7ADB5] uppercase tracking-wider block">Battery Module</span>
              <span className="text-2xl sm:text-3xl font-black text-white">{heroVehicle.batteryCapacityKwh} <span className="text-sm font-normal text-slate-400">kWh</span></span>
            </div>
            <div>
              <span className="text-[11px] text-[#A7ADB5] uppercase tracking-wider block">Fast Charge</span>
              <span className="text-2xl sm:text-3xl font-black text-white">{heroVehicle.chargingTimeHours} <span className="text-sm font-normal text-slate-400">hrs</span></span>
            </div>
          </div>
        </div>

        {/* Refined Scroll Down Indicator */}
        <div className="relative z-10 w-full flex justify-center mt-10">
          <a
            href="#categories"
            className="flex flex-col items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors group"
            aria-label="Scroll to vehicle categories"
          >
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#A7ADB5] group-hover:text-[#C9FF36]">
              Scroll to Explore
            </span>
            <ChevronDown className="w-4 h-4 animate-bounce text-slate-400 group-hover:text-white" />
          </a>
        </div>
      </section>

      {/* =========================================================================
          THREE PREMIUM AUTOMOTIVE CATEGORIES
          1. Electric Bikes — "POWER MEETS PRECISION."
          2. Electric Cycles — "RIDE LIGHT. GO FURTHER."
          3. Electric Jeeps — "BUILT FOR THE EXTRAORDINARY."
          ========================================================================= */}
      <section id="categories" className="py-24 bg-[#080A0D] border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-32">

          {/* CATEGORY 1: ELECTRIC BIKES */}
          <div id="bikes" className="space-y-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#165DAD] mb-2">
                  <span className="w-2 h-2 rounded-full bg-[#165DAD]" />
                  <span>Category 01 • Production Fleet</span>
                </div>
                <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">
                  Power Meets <span className="text-[#165DAD]">Precision.</span>
                </h2>
                <p className="mt-2 text-base text-[#A7ADB5] max-w-xl font-light">
                  High-performance electric motorcycles with permanent magnet synchronous motors, intelligent CBS braking, and connected telemetry.
                </p>
              </div>

              <Link
                href="/bikes?category=bikes"
                className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-white hover:text-[#C9FF36] transition-colors"
              >
                <span>Explore All Electric Bikes</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Bikes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {bikes.map((b) => (
                <BikeCard key={b.id} vehicle={b} onBookClick={handleOpenBooking} />
              ))}
            </div>
          </div>

          {/* CATEGORY 2: ELECTRIC CYCLES */}
          <div id="cycles" className="relative p-8 sm:p-12 lg:p-16 rounded-3xl bg-[#101318] border border-white/10 overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#C9FF36]/5 rounded-full blur-3xl pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-6 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C9FF36]/10 border border-[#C9FF36]/30 text-xs font-bold uppercase tracking-widest text-[#C9FF36]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Category 02 • Prototype Series</span>
                </div>

                <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white leading-tight">
                  Ride Light. <br />
                  <span className="text-[#C9FF36]">Go Further.</span>
                </h2>

                <p className="text-base text-[#A7ADB5] leading-relaxed font-light">
                  Introducing the ASKR AeroTrek C1 Concept Series. Ultralight carbon-alloy frame, integrated 750Wh concealed battery pack, and Gates Carbon Drive belt for silent, frictionless urban freedom.
                </p>

                {/* Concept Highlights */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Assisted Range</span>
                    <span className="text-xl font-bold text-white">85 km</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Pedal Assist Mode</span>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Chassis Weight</span>
                    <span className="text-xl font-bold text-white">14.8 kg</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Aerospace Carbon Alloy</span>
                  </div>
                </div>

                <div className="pt-4 flex flex-wrap items-center gap-4">
                  <Link
                    href="/bikes/ASKR-AEROTREK-C1"
                    className="px-6 py-3 rounded-full bg-white text-[#101318] hover:bg-[#C9FF36] text-xs font-bold tracking-wider uppercase transition-colors"
                  >
                    Explore Electric Cycles
                  </Link>

                  <span className="text-xs text-slate-400 font-mono">
                    Model: ASKR-AEROTREK-C1 (Concept Phase)
                  </span>
                </div>
              </div>

              {/* Vehicle Art / Render */}
              <div className="lg:col-span-6 flex items-center justify-center">
                <div className="relative w-full max-w-lg h-72 sm:h-96">
                  <img
                    src="/images/vehicles/electric-cycle.svg"
                    alt="ASKR AeroTrek Electric Cycle"
                    className="w-full h-full object-contain filter drop-shadow-[0_15px_30px_rgba(0,0,0,0.7)]"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* CATEGORY 3: ELECTRIC JEEPS */}
          <div id="jeeps" className="relative p-8 sm:p-12 lg:p-16 rounded-3xl bg-[#101318] border border-white/10 overflow-hidden">
            {/* Ambient Glow */}
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#165DAD]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Vehicle Art / Render */}
              <div className="lg:col-span-6 order-2 lg:order-1 flex items-center justify-center">
                <div className="relative w-full max-w-lg h-72 sm:h-96">
                  <img
                    src="/images/vehicles/electric-jeep.svg"
                    alt="ASKR TerraMax 4x4 Electric Jeep"
                    className="w-full h-full object-contain filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)]"
                    loading="lazy"
                  />
                </div>
              </div>

              <div className="lg:col-span-6 order-1 lg:order-2 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-xs font-bold uppercase tracking-widest text-[#38BDF8]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Category 03 • Prototype Series</span>
                </div>

                <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white leading-tight">
                  Built for the <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400">Extraordinary.</span>
                </h2>

                <p className="text-base text-[#A7ADB5] leading-relaxed font-light">
                  Meet the ASKR TerraMax 4x4 Concept. Dual-motor all-wheel electric drive, 380 km expedition range, heavy-duty underbody skid armor, and instant all-terrain torque vectoring for untamed adventures.
                </p>

                {/* Specs */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Adventure Range</span>
                    <span className="text-xl font-bold text-white">380 km</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">48 kWh Armored Battery</span>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Drivetrain</span>
                    <span className="text-xl font-bold text-white">Dual AWD</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Independent Electronic Motors</span>
                  </div>
                </div>

                <div className="pt-4 flex flex-wrap items-center gap-4">
                  <Link
                    href="/bikes/ASKR-TERRAMAX-4X4"
                    className="px-6 py-3 rounded-full bg-white text-[#101318] hover:bg-[#C9FF36] text-xs font-bold tracking-wider uppercase transition-colors"
                  >
                    Explore Electric Jeeps
                  </Link>

                  <span className="text-xs text-slate-400 font-mono">
                    Model: ASKR-TERRAMAX-4X4 (Concept Phase)
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* =========================================================================
          TECHNOLOGY & ENGINEERING BENCHMARK
          PMSM, Lithium-Ion BMS, Cloud Telemetry, Dual CBS
          ========================================================================= */}
      <section id="technology" className="py-24 bg-[#080A0D] border-t border-white/10 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-[#C9FF36]">
              Architectural Refinement
            </span>
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">
              Engineering <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400">Pure Mobility.</span>
            </h2>
            <p className="text-base text-[#A7ADB5] font-light leading-relaxed">
              Every ASKR EV vehicle is designed with aerospace rigor, precision thermal management, and intelligent vehicle-to-cloud telemetry.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-[#101318] border border-white/10 hover:border-white/25 transition-all">
              <div className="w-12 h-12 rounded-xl bg-[#165DAD]/20 flex items-center justify-center text-[#165DAD] mb-6">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">PMSM Powertrain</h3>
              <p className="mt-2 text-xs text-[#A7ADB5] leading-relaxed">
                Permanent Magnet Synchronous Motors delivering up to 94% system efficiency and instant torque curve from 0 RPM.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#101318] border border-white/10 hover:border-white/25 transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6">
                <BatteryCharging className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Smart BMS Architecture</h3>
              <p className="mt-2 text-xs text-[#A7ADB5] leading-relaxed">
                Multi-cell thermal balancing, overcharge protection, IP67 waterproof encapsulation, and fast wallbox charging support.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#101318] border border-white/10 hover:border-white/25 transition-all">
              <div className="w-12 h-12 rounded-xl bg-[#C9FF36]/20 flex items-center justify-center text-[#C9FF36] mb-6">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Combined Braking (CBS)</h3>
              <p className="mt-2 text-xs text-[#A7ADB5] leading-relaxed">
                Regenerative electronic deceleration coupled with hydraulic disc rotors for dependable stopping distance in all weather.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#101318] border border-white/10 hover:border-white/25 transition-all">
              <div className="w-12 h-12 rounded-xl bg-sky-500/20 flex items-center justify-center text-sky-400 mb-6">
                <Compass className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Connected Telemetry</h3>
              <p className="mt-2 text-xs text-[#A7ADB5] leading-relaxed">
                Integrated GPS tracking, remote diagnostics, tamper alerts, and automatic over-the-air firmware upgrades.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          COMMUNITY & MEMBERSHIP BENEFITS SECTION
          Preserves the approved platform business model:
          - Free Membership
          - Basic Membership (₹3,000 fee)
          - Full Membership (₹33,000 with ₹30,000 shopping voucher)
          - Shopping voucher redemption towards EV reservations
          ========================================================================= */}
      <section id="membership" className="py-24 bg-[#101318] border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-[#165DAD]">
              Verified Ecosystem
            </span>
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">
              Join the <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400">ASKR EV Community.</span>
            </h2>
            <p className="text-base text-[#A7ADB5] font-light leading-relaxed">
              Transparent platform membership options with vehicle shopping voucher entitlements that can be redeemed towards electric vehicle booking tokens.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Plan 1: Free */}
            <div className="p-8 rounded-3xl bg-[#080A0D] border border-white/10 flex flex-col justify-between">
              <div className="space-y-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Tier 01
                </span>
                <h3 className="text-2xl font-black text-white">Free User</h3>
                <div className="text-3xl font-extrabold text-white">₹0</div>
                <p className="text-xs text-[#A7ADB5] leading-relaxed">
                  Basic access to view public fleet specifications and explore concept prototype vehicles.
                </p>
                <div className="border-t border-white/10 pt-4 space-y-2.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-slate-500" />
                    <span>Browse EV catalog & specifications</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-slate-500" />
                    <span>Access public vehicle showrooms</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <span>No sponsor commissions or voucher credits</span>
                  </div>
                </div>
              </div>

              <div className="pt-8">
                <Link
                  href="/auth/register"
                  className="w-full py-3 rounded-full bg-white/10 hover:bg-white/15 text-white text-center text-xs font-bold tracking-wider uppercase transition-colors block"
                >
                  Create Free Account
                </Link>
              </div>
            </div>

            {/* Plan 2: Basic */}
            <div className="p-8 rounded-3xl bg-[#080A0D] border border-white/10 flex flex-col justify-between">
              <div className="space-y-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#165DAD]">
                  Tier 02
                </span>
                <h3 className="text-2xl font-black text-white">Basic Membership</h3>
                <div className="text-3xl font-extrabold text-white">
                  ₹3,000 <span className="text-xs font-normal text-slate-400">platform fee</span>
                </div>
                <p className="text-xs text-[#A7ADB5] leading-relaxed">
                  Active membership qualifying for direct sponsor commissions on direct referrals.
                </p>
                <div className="border-t border-white/10 pt-4 space-y-2.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#165DAD]" />
                    <span>Eligible for direct referral commissions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#165DAD]" />
                    <span>Unique sponsor referral link</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#165DAD]" />
                    <span>Reserve EV bookings with cash deposit</span>
                  </div>
                </div>
              </div>

              <div className="pt-8">
                <Link
                  href="/auth/register"
                  className="w-full py-3 rounded-full bg-white/10 hover:bg-white/15 text-white text-center text-xs font-bold tracking-wider uppercase transition-colors block"
                >
                  Activate Basic
                </Link>
              </div>
            </div>

            {/* Plan 3: Full (Featured) */}
            <div className="relative p-8 rounded-3xl bg-gradient-to-b from-[#101318] to-[#080A0D] border-2 border-[#C9FF36]/60 flex flex-col justify-between shadow-2xl shadow-lime/5">
              <span className="absolute -top-3 right-6 text-[10px] font-black tracking-widest uppercase bg-[#C9FF36] text-[#080A0D] px-3 py-1 rounded-full shadow-md">
                Recommended
              </span>

              <div className="space-y-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#C9FF36]">
                  Tier 03 • Complete
                </span>
                <h3 className="text-2xl font-black text-white">Full Membership</h3>
                <div className="text-3xl font-extrabold text-white">
                  ₹33,000 <span className="text-xs font-normal text-slate-400">total</span>
                </div>
                <div className="p-3 rounded-xl bg-[#C9FF36]/10 border border-[#C9FF36]/30 text-xs font-bold text-[#C9FF36]">
                  Includes ₹30,000 Shopping Voucher Entitlement!
                </div>
                <p className="text-xs text-[#A7ADB5] leading-relaxed">
                  Full qualification granting ₹30,000 in non-expiring shopping vouchers, 1:1 binary matching reward eligibility, and maximum platform rewards.
                </p>
                <div className="border-t border-white/10 pt-4 space-y-2.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#C9FF36]" />
                    <span>₹30,000 Vehicle Shopping Voucher</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#C9FF36]" />
                    <span>Redeemable towards EV booking token deposits</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#C9FF36]" />
                    <span>1:1 Binary Matching Income eligibility</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#C9FF36]" />
                    <span>Full sponsor commissions & team rewards</span>
                  </div>
                </div>
              </div>

              <div className="pt-8">
                <Link
                  href="/auth/register"
                  className="w-full py-3.5 rounded-full bg-white text-[#101318] hover:bg-[#C9FF36] text-center text-xs font-black tracking-wider uppercase transition-colors shadow-lg block"
                >
                  Join as Full Member
                </Link>
              </div>
            </div>
          </div>

          {/* Compliance & Simulation Disclaimer */}
          <div className="p-6 rounded-2xl bg-[#080A0D] border border-white/5 text-center text-xs text-slate-400 max-w-2xl mx-auto space-y-1">
            <div className="flex items-center justify-center gap-2 text-slate-300 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Financial Compliance & Simulation Mode Notice</span>
            </div>
            <p>
              Operating in COMPLIANCE_MODE=SIMULATION_ONLY. No live financial payouts, wire settlements, or cash withdrawals are performed. All vehicle reservations and voucher redemptions represent developmental testing models.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          FINAL CINEMATIC CALL TO ACTION
          "Ready to Move Electric?"
          ========================================================================= */}
      <section className="py-24 bg-[#080A0D] border-t border-white/10 text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 relative z-10">
          <span className="text-xs font-bold uppercase tracking-widest text-[#C9FF36]">
            Start Your Journey
          </span>
          <h2 className="text-4xl sm:text-6xl font-black uppercase tracking-tight text-white leading-tight">
            Ready to Move <span className="text-[#C9FF36]">Electric?</span>
          </h2>
          <p className="text-base sm:text-lg text-[#A7ADB5] max-w-xl mx-auto font-light leading-relaxed">
            Reserve your electric vehicle today, join our growing community of clean mobility advocates, and experience pure electric momentum.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              href="/bikes"
              className="px-9 py-4 rounded-full bg-white text-[#101318] hover:bg-[#C9FF36] text-xs sm:text-sm font-black uppercase tracking-widest transition-all shadow-xl hover:shadow-lime/25"
            >
              Book Your Electric Vehicle
            </Link>

            <Link
              href="/auth/register"
              className="px-8 py-4 rounded-full bg-white/5 hover:bg-white/10 text-white text-xs sm:text-sm font-bold uppercase tracking-widest transition-colors border border-white/10"
            >
              Register Account
            </Link>
          </div>
        </div>
      </section>

      <Footer />

      {/* Booking Modal Integration for Instant Reservations */}
      {bookingVehicle && (
        <BookingModal
          bike={bookingVehicle}
          isOpen={bookingModalOpen}
          onClose={() => setBookingModalOpen(false)}
          user={currentUser}
          onSuccess={() => {
            setBookingModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
