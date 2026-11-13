'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  BatteryCharging,
  Gauge,
  Sparkles,
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import BikeCard from '../../components/BikeCard';
import { ELECTRIC_CYCLES } from '../../lib/catalog';

export default function CyclesPage() {
  const [cycles] = useState(ELECTRIC_CYCLES);

  return (
    <div className="flex-1 flex flex-col bg-[#080B12] text-[#F7FAFF] min-h-screen">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 w-full">
        {/* Header Breadcrumbs & Title */}
        <div className="pb-8 border-b border-white/10">
          <div className="flex items-center gap-2 text-xs text-[#AAB7C8] mb-3">
            <Link href="/" className="hover:text-white">Home</Link>
            <span>/</span>
            <span className="text-[#50D9FF] font-semibold">Electric Cycles</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <div>
              <h1 className="text-3xl sm:text-5xl font-black text-[#F7FAFF] tracking-tight">
                Electric Cycles
              </h1>
              <p className="mt-2 text-base text-[#AAB7C8] max-w-2xl leading-relaxed">
                Hydroformed aerospace alloy frames, integrated downtube battery packs, and intelligent multi-mode pedal assistance for effortless daily commutes and weekend trail riding.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-[#50D9FF] bg-blue-500/15 border border-blue-500/30 self-start sm:self-auto">
              <span>Concept Series Previews</span>
            </span>
          </div>
        </div>

        {/* Featured Cycle Hero Banner (Modern City Night Plaza) */}
        <div className="mt-8 p-8 sm:p-12 rounded-3xl bg-[#101827] border border-white/10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center shadow-2xl relative overflow-hidden">
          <div className="lg:col-span-6 space-y-4 relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-[#50D9FF] bg-blue-500/15 border border-blue-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Flagship E-Bicycle</span>
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#F7FAFF] tracking-tight">
              ASKR AeroTrek C1
            </h2>
            <p className="text-sm text-[#AAB7C8] leading-relaxed">
              Featuring an ultra-lightweight hydroformed 6061 alloy frame, 750 Wh integrated downtube battery, Shimano 9-speed drivetrain, and 85 km pedal-assisted range on a single charge.
            </p>

            <div className="pt-2 flex items-baseline gap-2">
              <span className="text-xs text-[#AAB7C8] uppercase font-semibold">Starting at</span>
              <span className="text-2xl font-black text-[#F7FAFF]">₹42,000</span>
              <span className="text-xs text-[#AAB7C8]/70">Ex-showroom</span>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link
                href="/bikes/AEROTREK-C1"
                className="px-6 py-3 rounded-full bg-[#267DFF] hover:bg-[#1A6EEB] text-white text-xs font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(38,125,255,0.4)]"
              >
                Explore AeroTrek C1
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6 flex items-center justify-center">
            <img
              src="/images/vehicles/dark/hero-cycle-dark.jpg"
              alt="ASKR AeroTrek C1 Electric Cycle"
              className="w-full max-h-84 object-cover rounded-2xl filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.8)]"
            />
          </div>
        </div>

        {/* Fleet Grid Display */}
        <div className="mt-14">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-white/10 gap-2">
            <div>
              <h3 className="text-xl font-bold text-[#F7FAFF]">
                Electric Cycle Models ({cycles.length})
              </h3>
              <p className="text-xs text-[#AAB7C8] mt-1">
                Explore verified technical specifications and engineering prototypes
              </p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            {cycles.map((cycle) => (
              <BikeCard key={cycle.id} vehicle={cycle} />
            ))}
          </div>
        </div>

        {/* Engineering Highlights */}
        <div className="mt-20 pt-12 border-t border-white/10">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-[#50D9FF]">
              Intelligent Pedal Assist
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#F7FAFF] tracking-tight mt-1">
              Engineered For Effortless Riding
            </h2>
            <p className="text-xs sm:text-sm text-[#AAB7C8] mt-2">
              Combining precision torque-sensing pedal assistance with lightweight aerospace metallurgy.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-[#101827] border border-white/10 space-y-2">
              <Zap className="w-6 h-6 text-[#50D9FF] mb-2" />
              <h4 className="text-sm font-bold text-[#F7FAFF]">Torque Sensor PAS</h4>
              <p className="text-xs text-[#AAB7C8] leading-relaxed">
                Bi-directional torque sensors instantly match your pedaling cadence with smooth electric assist.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#101827] border border-white/10 space-y-2">
              <BatteryCharging className="w-6 h-6 text-emerald-400 mb-2" />
              <h4 className="text-sm font-bold text-[#F7FAFF]">Removable Pack</h4>
              <p className="text-xs text-[#AAB7C8] leading-relaxed">
                Key-locked downtube battery unlatches in seconds for convenient indoor charging anywhere.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#101827] border border-white/10 space-y-2">
              <Gauge className="w-6 h-6 text-[#267DFF] mb-2" />
              <h4 className="text-sm font-bold text-[#F7FAFF]">Shimano 9-Speed</h4>
              <p className="text-xs text-[#AAB7C8] leading-relaxed">
                Crisp mechanical gear ratios paired with multi-level electric motor assist for steep incline climbs.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#101827] border border-white/10 space-y-2">
              <ShieldCheck className="w-6 h-6 text-indigo-400 mb-2" />
              <h4 className="text-sm font-bold text-[#F7FAFF]">Hydraulic Discs</h4>
              <p className="text-xs text-[#AAB7C8] leading-relaxed">
                180 mm hydraulic disc brakes with motor-inhibitor cutoff switches for instantaneous stopping safety.
              </p>
            </div>
          </div>
        </div>

        {/* FAQs */}
        <div className="mt-20 pt-12 border-t border-white/10">
          <h2 className="text-2xl font-bold text-[#F7FAFF] tracking-tight mb-8">
            Frequently Asked Questions
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-[#101827] border border-white/10 space-y-2">
              <h3 className="text-sm font-bold text-[#F7FAFF]">
                Can I ride an ASKR EV cycle without pedaling?
              </h3>
              <p className="text-xs text-[#AAB7C8] leading-relaxed">
                Yes, our cycles feature both pure throttle mode (up to 25 km/h per ARAI regulations) and multi-level torque-assist pedaling that extends battery range up to 95 km.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#101827] border border-white/10 space-y-2">
              <h3 className="text-sm font-bold text-[#F7FAFF]">
                How do I charge the cycle battery?
              </h3>
              <p className="text-xs text-[#AAB7C8] leading-relaxed">
                The battery pack is integrated into the downtube and can be charged directly on the bicycle, or unlocked with the security key and charged inside your home or office.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#101827] border border-white/10 space-y-2">
              <h3 className="text-sm font-bold text-[#F7FAFF]">
                Are driving licenses required for electric cycles?
              </h3>
              <p className="text-xs text-[#AAB7C8] leading-relaxed">
                No driving license or vehicle registration is required for ARAI-compliant low-speed electric cycles with motor ratings up to 250W.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#101827] border border-white/10 space-y-2">
              <h3 className="text-sm font-bold text-[#F7FAFF]">
                When will production units be available?
              </h3>
              <p className="text-xs text-[#AAB7C8] leading-relaxed">
                The AeroTrek series is currently in pre-production engineering validation. Commercial delivery slots will open across select metro cities in Phase 4.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
