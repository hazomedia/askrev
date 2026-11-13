'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  BatteryCharging,
  Gauge,
  Compass,
  Sparkles,
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import BikeCard from '../../components/BikeCard';
import { ELECTRIC_JEEPS } from '../../lib/catalog';

export default function JeepsPage() {
  const [jeeps] = useState(ELECTRIC_JEEPS);

  return (
    <div className="flex-1 flex flex-col bg-white text-neutral-900">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 w-full">
        {/* Header Breadcrumbs & Title */}
        <div className="pb-8 border-b border-neutral-200">
          <div className="flex items-center gap-2 text-xs text-neutral-500 mb-3">
            <Link href="/" className="hover:text-black">Home</Link>
            <span>/</span>
            <span className="text-black font-semibold">Electric Jeeps</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <div>
              <h1 className="text-3xl sm:text-5xl font-black text-neutral-950 tracking-tight">
                Electric Jeeps & 4x4
              </h1>
              <p className="mt-2 text-base text-neutral-600 max-w-2xl leading-relaxed">
                Zero-emission all-terrain electric adventure vehicles. Featuring dual-motor all-wheel drive, high-capacity structural battery enclosures, and 230 mm ground clearance.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-neutral-700 bg-neutral-100 border border-neutral-200 self-start sm:self-auto">
              <span>Concept Fleet Showcase</span>
            </span>
          </div>
        </div>

        {/* Featured Jeep Hero Banner */}
        <div className="mt-8 p-8 sm:p-12 rounded-3xl bg-[#F9FAFB] border border-neutral-200 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-[#165DAD] bg-blue-50 border border-blue-100">
              <Compass className="w-3.5 h-3.5" />
              <span>Flagship Adventure 4x4</span>
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-950 tracking-tight">
              ASKR TerraMax 4x4
            </h2>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Certified 380 km range, Dual PMSM All-Wheel Drive delivering 450 Nm combined torque, 230 mm ground clearance with water-wading capability up to 550 mm depth.
            </p>

            <div className="pt-2 flex items-baseline gap-2">
              <span className="text-xs text-neutral-500 uppercase font-medium">Estimated Showroom</span>
              <span className="text-2xl font-bold text-neutral-900">₹18,50,000</span>
              <span className="text-xs text-neutral-400">Ex-showroom</span>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link
                href="/bikes/TERRAMAX-4X4"
                className="px-6 py-3 rounded-full bg-black hover:bg-neutral-800 text-white text-xs font-semibold tracking-wide transition-all shadow-sm"
              >
                Explore TerraMax 4x4
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6 flex items-center justify-center">
            <img
              src="/images/vehicles/jeep-hero.jpg"
              alt="ASKR TerraMax 4x4 Electric Adventure Vehicle"
              className="w-full max-h-80 object-contain filter drop-shadow-md"
            />
          </div>
        </div>

        {/* Fleet Grid Display */}
        <div className="mt-14">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-neutral-200 gap-2">
            <div>
              <h3 className="text-xl font-bold text-neutral-950">
                Electric Jeep Models ({jeeps.length})
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                Explore technical specifications, torque ratings, and off-road geometry
              </p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            {jeeps.map((jeep) => (
              <BikeCard key={jeep.id} vehicle={jeep} />
            ))}
          </div>
        </div>

        {/* Engineering Highlights */}
        <div className="mt-20 pt-12 border-t border-neutral-200">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-[#165DAD]">
              All-Terrain Architecture
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-neutral-950 tracking-tight mt-1">
              Pure Torque. Unstoppable Capability.
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 mt-2">
              Engineered to conquer rugged trails, steep gradients, and deep water without compromise.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-[#F9FAFB] border border-neutral-200">
              <Compass className="w-6 h-6 text-[#165DAD] mb-3" />
              <h4 className="text-sm font-bold text-neutral-900">Dual-Motor AWD</h4>
              <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                Independent front and rear motors providing instantaneous millisecond torque vectoring across wheels.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F9FAFB] border border-neutral-200">
              <ShieldCheck className="w-6 h-6 text-emerald-600 mb-3" />
              <h4 className="text-sm font-bold text-neutral-900">Armor Shielding</h4>
              <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                Heavy-duty reinforced titanium underbody skid plates guarding the 48 kWh structural battery pack.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F9FAFB] border border-neutral-200">
              <Zap className="w-6 h-6 text-blue-600 mb-3" />
              <h4 className="text-sm font-bold text-neutral-900">CCS2 Fast Charge</h4>
              <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                High-voltage DC fast charging replenishing 10% to 80% state-of-charge in just 50 minutes.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F9FAFB] border border-neutral-200">
              <Gauge className="w-6 h-6 text-indigo-600 mb-3" />
              <h4 className="text-sm font-bold text-neutral-900">450 Nm Torque</h4>
              <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                Massive low-end instant torque capable of pulling through loose sand, deep mud, and rocky inclines.
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
                Can the ASKR TerraMax wade through deep water?
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Yes, with sealed IP68 waterproof motor enclosures and battery casing, the TerraMax 4x4 offers water-wading capability up to 550 mm depth without risk of electrical short circuits.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F9FAFB] border border-neutral-200 space-y-2">
              <h3 className="text-sm font-bold text-neutral-900">
                What charging standards are supported?
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                The TerraMax supports dual charging interfaces: Type 2 AC charging (7.4 kW home wallbox) and universal CCS2 DC Fast Charging at public highway charging stations.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F9FAFB] border border-neutral-200 space-y-2">
              <h3 className="text-sm font-bold text-neutral-900">
                What is the estimated battery warranty?
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                The high-capacity 48 kWh lithium iron phosphate (LFP) pack is engineered for an 8-year or 1,60,000 km warranty with active liquid thermal conditioning.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F9FAFB] border border-neutral-200 space-y-2">
              <h3 className="text-sm font-bold text-neutral-900">
                How do I register interest for early allocation?
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                The TerraMax series represents ASKR EV's upcoming electric adventure platform. Detailed pre-order allocation schedules will be published prior to homologation.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

