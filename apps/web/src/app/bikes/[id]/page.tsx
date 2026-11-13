'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ChevronLeft,
  ArrowRight,
  ShieldCheck,
  BatteryCharging,
  Gauge,
  Zap,
  Sparkles,
  Layers,
  Cpu,
  Clock,
  Compass,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import Navbar from '../../../components/Navbar';
import Footer from '../../../components/Footer';
import BookingModal from '../../../components/BookingModal';
import BikeCard from '../../../components/BikeCard';
import { fetchApi, getStoredUser } from '../../../lib/api';
import {
  ALL_CATALOG_VEHICLES,
  getVehicleByCode,
  Vehicle,
} from '../../../lib/catalog';

export default function BikeDetailPage() {
  const params = useParams();
  const idOrCode = (params.id as string) || '';

  const [vehicle, setVehicle] = useState<Vehicle | any | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (idOrCode) {
      loadVehicleData(idOrCode);
      loadProfile();
    }
  }, [idOrCode]);

  const loadVehicleData = async (target: string) => {
    setLoading(true);
    setError(null);

    // First check catalog static definition
    const staticMatch = getVehicleByCode(target);

    try {
      // Attempt API fetch for live DB bikes
      const apiData = await fetchApi<any>(`/ev-bikes/${target}`);
      if (apiData && apiData.id) {
        setVehicle({
          ...(staticMatch || {}),
          ...apiData,
          category: staticMatch?.category || 'bikes',
          colors: staticMatch?.colors || [
            { name: 'Sapphire Blue', hex: '#165DAD', description: 'Primary metallic finish' },
            { name: 'Carbon Black', hex: '#0F172A', description: 'Matte stealth finish' },
          ],
          specs: staticMatch?.specs || [
            { label: 'Certified Range', value: `${apiData.rangeKm} km` },
            { label: 'Top Speed', value: `${apiData.topSpeedKmh} km/h` },
            { label: 'Battery Capacity', value: `${apiData.batteryCapacityKwh} kWh` },
            { label: 'Fast Charge', value: `${apiData.chargingTimeHours} hrs` },
          ],
          highlights: staticMatch?.highlights || [
            'Permanent Magnet Synchronous Motor (PMSM)',
            'Advanced Battery Management System with IP67 protection',
            'Full digital instrumentation and cloud telemetry',
          ],
        });
        return;
      }
    } catch (err) {
      // If API fails or vehicle is a concept series model, use static catalog entry
      if (staticMatch) {
        setVehicle(staticMatch);
        return;
      }
      setError('Requested vehicle specifications could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async () => {
    const stored = getStoredUser();
    if (!stored) return;
    try {
      const profile = await fetchApi<any>('/auth/me');
      setUserProfile(profile);
    } catch (err) {
      console.warn('Profile session lookup', err);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col bg-[#080A0D] text-white">
        <Navbar />
        <main className="flex-1 max-w-7xl mx-auto px-4 py-20 w-full animate-pulse">
          <div className="h-6 bg-white/5 rounded w-32 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-7 h-96 bg-white/5 rounded-2xl" />
            <div className="lg:col-span-5 space-y-4">
              <div className="h-10 bg-white/5 rounded w-3/4" />
              <div className="h-5 bg-white/5 rounded w-1/2" />
              <div className="h-32 bg-white/5 rounded-xl" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="flex-1 flex flex-col bg-[#080A0D] text-white">
        <Navbar />
        <main className="flex-1 max-w-xl mx-auto px-4 py-24 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 mx-auto flex items-center justify-center">
            <HelpCircle className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white">Vehicle Not Found</h2>
          <p className="text-xs text-slate-400">
            {error || 'The requested model could not be found in our fleet catalog.'}
          </p>
          <div className="pt-4">
            <Link
              href="/bikes"
              className="px-6 py-2.5 rounded-full bg-white text-[#101318] text-xs font-bold uppercase tracking-wider hover:bg-[#C9FF36] transition-colors"
            >
              Back to Fleet Catalog
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const isConcept = vehicle.isConcept || vehicle.category === 'cycles' || vehicle.category === 'jeeps';
  const imgSource = vehicle.imageUrl
    ? vehicle.imageUrl.replace('.webp', '.svg')
    : '/images/bikes/thunder-pro.svg';

  const currentColor =
    vehicle.colors && vehicle.colors[selectedColorIndex]
      ? vehicle.colors[selectedColorIndex]
      : { name: 'Sapphire Blue', hex: '#165DAD', description: 'Primary metallic finish' };

  // Related models
  const relatedVehicles = ALL_CATALOG_VEHICLES.filter(
    (v) => v.modelCode !== vehicle.modelCode
  ).slice(0, 3);

  return (
    <div className="flex-1 flex flex-col bg-[#080A0D] text-white selection:bg-[#C9FF36] selection:text-[#080A0D]">
      <Navbar />

      <main className="flex-1 w-full">
        {/* =========================================================================
            CINEMATIC VEHICLE HERO HEADER
            Full-width automotive showcase
            ========================================================================= */}
        <section className="relative pt-8 pb-16 px-4 sm:px-6 lg:px-8 border-b border-white/10 bg-radial-gradient overflow-hidden">
          {/* Ambient Lighting */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] rounded-full pointer-events-none opacity-20 blur-3xl"
            style={{
              background: `radial-gradient(circle, ${currentColor.hex} 0%, transparent 70%)`,
            }}
          />

          <div className="max-w-7xl mx-auto">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-8">
              <Link href="/bikes" className="hover:text-white transition-colors flex items-center gap-1">
                <ChevronLeft className="w-4 h-4" />
                <span>Showroom</span>
              </Link>
              <span>/</span>
              <span className="capitalize">{vehicle.categoryLabel || vehicle.category}</span>
              <span>/</span>
              <span className="text-white font-medium">{vehicle.name}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Column: Big Vehicle Imagery */}
              <div className="lg:col-span-7 flex flex-col items-center">
                <div className="relative w-full h-72 sm:h-96 md:h-[420px] flex items-center justify-center p-6 rounded-3xl bg-[#101318] border border-white/10 shadow-2xl">
                  {/* Status Tag */}
                  <div className="absolute top-5 left-5 z-20">
                    {isConcept ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-[#C9FF36] bg-[#C9FF36]/10 border border-[#C9FF36]/30">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Concept Prototype</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/30">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Production Model</span>
                      </span>
                    )}
                  </div>

                  {/* Ground Contact Shadow */}
                  <div className="absolute bottom-6 w-3/4 h-8 bg-black/90 blur-xl rounded-full" />

                  <img
                    src={imgSource}
                    alt={vehicle.name}
                    className="relative z-10 w-full h-full object-contain filter drop-shadow-[0_20px_35px_rgba(0,0,0,0.85)] transition-all duration-500"
                  />
                </div>

                {/* Color Variants Switcher */}
                {vehicle.colors && vehicle.colors.length > 0 && (
                  <div className="mt-6 p-3.5 rounded-2xl bg-[#101318] border border-white/10 flex items-center gap-4">
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                      Finish:
                    </span>
                    <div className="flex items-center gap-2.5">
                      {vehicle.colors.map((c: any, idx: number) => (
                        <button
                          key={c.name}
                          onClick={() => setSelectedColorIndex(idx)}
                          className={`w-7 h-7 rounded-full transition-transform border ${
                            selectedColorIndex === idx
                              ? 'scale-125 border-white ring-2 ring-[#C9FF36]/60 shadow-lg'
                              : 'border-white/30 hover:scale-110'
                          }`}
                          style={{ backgroundColor: c.hex }}
                          title={c.name}
                          aria-label={`Select ${c.name}`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-white font-semibold">
                      {currentColor.name}
                    </span>
                  </div>
                )}
              </div>

              {/* Right Column: Model Specs & Reservation Action */}
              <div className="lg:col-span-5 space-y-6">
                <div>
                  <div className="text-xs font-mono font-bold text-[#165DAD] uppercase tracking-wider mb-1">
                    {vehicle.modelCode}
                  </div>
                  <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
                    {vehicle.name}
                  </h1>
                  <p className="mt-2 text-sm sm:text-base text-[#A7ADB5] font-light leading-relaxed">
                    {vehicle.tagline}
                  </p>
                </div>

                {/* Quick Performance Strip */}
                <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-[#101318] border border-white/10">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">
                      {vehicle.category === 'cycles' ? 'Assisted Range' : 'Certified Range'}
                    </span>
                    <span className="text-2xl font-black text-white">
                      {vehicle.rangeKm} <span className="text-xs font-normal text-slate-400">km</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">
                      Top Speed
                    </span>
                    <span className="text-2xl font-black text-white">
                      {vehicle.topSpeedKmh} <span className="text-xs font-normal text-slate-400">km/h</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">
                      Battery Module
                    </span>
                    <span className="text-xl font-extrabold text-white">
                      {vehicle.batteryCapacityKwh} <span className="text-xs font-normal text-slate-400">kWh</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">
                      Fast Charge
                    </span>
                    <span className="text-xl font-extrabold text-white">
                      {vehicle.chargingTimeHours} <span className="text-xs font-normal text-slate-400">hrs</span>
                    </span>
                  </div>
                </div>

                {/* Pricing & Reservation Box */}
                <div className="p-6 rounded-2xl bg-gradient-to-b from-[#101318] to-[#080A0D] border border-white/10 space-y-4">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">
                        {isConcept ? 'Development Status' : 'Indicative Showroom Price'}
                      </span>
                      <div className="text-2xl sm:text-3xl font-black text-white">
                        {vehicle.exShowroomPriceINR
                          ? `₹${vehicle.exShowroomPriceINR.toLocaleString('en-IN')}`
                          : 'Concept Showcase'}
                      </div>
                    </div>

                    {!isConcept && vehicle.bookingAmountINR && (
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">
                          Token Deposit
                        </span>
                        <div className="text-lg font-bold text-[#C9FF36]">
                          ₹{vehicle.bookingAmountINR.toLocaleString('en-IN')}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Shopping Voucher Redemption Notice */}
                  {!isConcept && vehicle.voucherRedeemLimitINR && (
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-300 flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-[#C9FF36] shrink-0 mt-0.5" />
                      <span>
                        Full Members can redeem up to{' '}
                        <strong className="text-white">
                          ₹{vehicle.voucherRedeemLimitINR.toLocaleString('en-IN')}
                        </strong>{' '}
                        from their Shopping Voucher balance against this reservation!
                      </span>
                    </div>
                  )}

                  {/* Booking CTA Button */}
                  {!isConcept && vehicle.isAvailable ? (
                    <button
                      onClick={() => setModalOpen(true)}
                      className="w-full py-4 rounded-full bg-white text-[#101318] hover:bg-[#C9FF36] text-xs sm:text-sm font-black uppercase tracking-widest transition-all duration-300 shadow-xl hover:shadow-lime/20 flex items-center justify-center gap-2"
                    >
                      <span>Reserve {vehicle.name}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-white/5 text-center text-xs text-slate-400">
                      This model is part of our upcoming concept series. Production reservations will open in Phase 4.
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 pt-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Instant Simulated Confirmation • COMPLIANCE_MODE=SIMULATION_ONLY</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            DETAILED ARCHITECTURE & SPECIFICATIONS
            ========================================================================= */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Specifications Grid */}
            <div className="lg:col-span-7 space-y-6">
              <h2 className="text-2xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                <Gauge className="w-5 h-5 text-[#C9FF36]" />
                <span>Technical Specifications</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {vehicle.specs &&
                  vehicle.specs.map((s: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-[#101318] border border-white/10 space-y-1"
                    >
                      <span className="text-xs text-slate-400 uppercase tracking-wider block font-medium">
                        {s.label}
                      </span>
                      <div className="text-lg font-bold text-white">{s.value}</div>
                      {s.sub && (
                        <span className="text-[11px] text-slate-400 block">{s.sub}</span>
                      )}
                    </div>
                  ))}
              </div>

              {/* Powertrain Detail */}
              {vehicle.powertrain && (
                <div className="p-5 rounded-xl bg-[#101318] border border-white/10 space-y-1.5">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-medium block">
                    Powertrain Architecture
                  </span>
                  <div className="text-sm font-semibold text-white">
                    {vehicle.powertrain}
                  </div>
                </div>
              )}
            </div>

            {/* Design Highlights */}
            <div className="lg:col-span-5 space-y-6">
              <h2 className="text-2xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#165DAD]" />
                <span>Design Highlights</span>
              </h2>

              <div className="space-y-3">
                {vehicle.highlights &&
                  vehicle.highlights.map((h: string, idx: number) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-[#101318] border border-white/10 flex items-start gap-3"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#C9FF36] shrink-0 mt-0.5" />
                      <span className="text-xs text-slate-300 leading-relaxed">{h}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Frequently Asked Questions */}
          <div className="pt-12 border-t border-white/10 space-y-8">
            <h2 className="text-2xl font-black uppercase tracking-tight text-white">
              Frequently Asked Questions
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl bg-[#101318] border border-white/10 space-y-2">
                <h3 className="text-sm font-bold text-white">
                  How does the shopping voucher discount work on reservations?
                </h3>
                <p className="text-xs text-[#A7ADB5] leading-relaxed">
                  Full Members receive a ₹30,000 shopping voucher upon activation. When booking eligible models, you can apply your voucher balance up to the model's redemption limit to offset token deposits.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#101318] border border-white/10 space-y-2">
                <h3 className="text-sm font-bold text-white">
                  Are these vehicle booking payments live or simulated?
                </h3>
                <p className="text-xs text-[#A7ADB5] leading-relaxed">
                  The ASKR EV platform currently runs under COMPLIANCE_MODE=SIMULATION_ONLY. All bookings are developmental reservations created in your dashboard without live bank deductions.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#101318] border border-white/10 space-y-2">
                <h3 className="text-sm font-bold text-white">
                  Can I cancel my vehicle booking reservation?
                </h3>
                <p className="text-xs text-[#A7ADB5] leading-relaxed">
                  Yes, reservations can be managed and cancelled directly from your Member Dashboard under the EV Bookings tab. Applied shopping vouchers are automatically restored.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#101318] border border-white/10 space-y-2">
                <h3 className="text-sm font-bold text-white">
                  What is the difference between Production and Concept models?
                </h3>
                <p className="text-xs text-[#A7ADB5] leading-relaxed">
                  Production models (Electric Bikes) have verified technical data and active booking workflows. Concept models (Electric Cycles and Electric Jeeps) represent upcoming prototypes.
                </p>
              </div>
            </div>
          </div>

          {/* Related Models Showcase */}
          {relatedVehicles.length > 0 && (
            <div className="pt-12 border-t border-white/10 space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black uppercase tracking-tight text-white">
                  Explore More Vehicles
                </h2>
                <Link
                  href="/bikes"
                  className="text-xs font-bold uppercase tracking-wider text-[#C9FF36] hover:underline"
                >
                  View Full Fleet
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedVehicles.map((rel) => (
                  <BikeCard key={rel.id} vehicle={rel} />
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      <Footer />

      {/* Simulated Booking Modal */}
      {modalOpen && (
        <BookingModal
          bike={vehicle}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          user={userProfile}
          onSuccess={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
