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
    <div className="flex-1 flex flex-col bg-white text-neutral-900">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 w-full">
        {/* Header Breadcrumbs & Title */}
        <div className="pb-8 border-b border-neutral-200">
          <div className="flex items-center gap-2 text-xs text-neutral-500 mb-3">
            <Link href="/" className="hover:text-black">Home</Link>
            <span>/</span>
            <span className="text-black font-semibold">Electric Cycles</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <div>
              <h1 className="text-3xl sm:text-5xl font-black text-neutral-950 tracking-tight">
                Electric Cycles
              </h1>
              <p className="mt-2 text-base text-neutral-600 max-w-2xl leading-relaxed">
                Hydroformed aerospace alloy frames, integrated downtube battery packs, and intelligent multi-mode pedal assistance for effortless daily commutes and weekend trail riding.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-neutral-700 bg-neutral-100 border border-neutral-200 self-start sm:self-auto">
              <span>Concept Series Previews</span>
            </span>
          </div>
        </div>

        {/* Featured Cycle Hero Banner */}
        <div className="mt-8 p-8 sm:p-12 rounded-3xl bg-[#F9FAFB] border border-neutral-200 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-[#165DAD] bg-blue-50 border border-blue-100">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Flagship E-Bicycle</span>
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-950 tracking-tight">
              ASKR AeroTrek C1
            </h2>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Featuring an ultra-lightweight hydroformed 6061 alloy frame, 750 Wh integrated downtube battery, Shimano 9-speed drivetrain, and 85 km pedal-assisted range on a single charge.
            </p>

            <div className="pt-2 flex items-baseline gap-2">
              <span className="text-xs text-neutral-500 uppercase font-medium">Starting at</span>
              <span className="text-2xl font-bold text-neutral-900">₹42,000</span>
              <span className="text-xs text-neutral-400">Ex-showroom</span>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link
                href="/bikes/AEROTREK-C1"
                className="px-6 py-3 rounded-full bg-black hover:bg-neutral-800 text-white text-xs font-semibold tracking-wide transition-all shadow-sm"
              >
                Explore AeroTrek C1
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6 flex items-center justify-center">
            <img
              src="/images/vehicles/cycle-hero.jpg"
              alt="ASKR AeroTrek C1 Electric Cycle"
              className="w-full max-h-80 object-contain filter drop-shadow-md"
            />
          </div>
        </div>

        {/* Fleet Grid Display */}
        <div className="mt-14">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-neutral-200 gap-2">
            <div>
              <h3 className="text-xl font-bold text-neutral-950">
                Electric Cycle Models ({cycles.length})
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
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
        <div className="mt-20 pt-12 border-t border-neutral-200">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-[#165DAD]">
              Intelligent Pedal Assist
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-neutral-950 tracking-tight mt-1">
              Engineered For Effortless Riding
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 mt-2">
              Combining precision torque-sensing pedal assistance with lightweight aerospace metallurgy.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-[#F9FAFB] border border-neutral-200">
              <Zap className="w-6 h-6 text-[#165DAD] mb-3" />
              <h4 className="text-sm font-bold text-neutral-900">Torque Sensor PAS</h4>
              <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                Bi-directional torque sensors instantly match your pedaling cadence with smooth electric assist.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F9FAFB] border border-neutral-200">
              <BatteryCharging className="w-6 h-6 text-emerald-600 mb-3" />
              <h4 className="text-sm font-bold text-neutral-900">Removable Pack</h4>
              <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                Key-locked downtube battery unlatches in seconds for convenient indoor charging anywhere.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F9FAFB] border border-neutral-200">
              <Gauge className="w-6 h-6 text-blue-600 mb-3" />
              <h4 className="text-sm font-bold text-neutral-900">Shimano 9-Speed</h4>
              <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                Crisp mechanical gear ratios paired with multi-level electric motor assist for steep incline climbs.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F9FAFB] border border-neutral-200">
              <ShieldCheck className="w-6 h-6 text-indigo-600 mb-3" />
              <h4 className="text-sm font-bold text-neutral-900">Hydraulic Discs</h4>
              <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                180 mm hydraulic disc brakes with motor-inhibitor cutoff switches for instantaneous stopping safety.
              </p>
            </div>
          </div>
        </div>

        {/* FAQs */}
        <div className="mt-20 pt-12 border-t border-neutral-200">
          <h2 className="text-2xl font-bold text-neutral-950 tracking-tight mb-8">
            Frequently Asked Questions
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-[#F9FAFB] border border-neutral-200 space-y-2">
              <h3 className="text-sm font-bold text-neutral-900">
                Can I ride an ASKR EV cycle without pedaling?
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Yes, our cycles feature both pure throttle mode (up to 25 km/h per ARAI regulations) and multi-level torque-assist pedaling that extends battery range up to 95 km.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F9FAFB] border border-neutral-200 space-y-2">
              <h3 className="text-sm font-bold text-neutral-900">
                How do I charge the cycle battery?
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                The battery pack is integrated into the downtube and can be charged directly on the bicycle, or unlocked with the security key and charged inside your home or office.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F9FAFB] border border-neutral-200 space-y-2">
              <h3 className="text-sm font-bold text-neutral-900">
                Are driving licenses required for electric cycles?
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                No driving license or vehicle registration is required for ARAI-compliant low-speed electric cycles with motor ratings up to 250W.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F9FAFB] border border-neutral-200 space-y-2">
              <h3 className="text-sm font-bold text-neutral-900">
                When will production units be available?
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
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

