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
  Compass,
  CheckCircle2,
  HelpCircle,
  PhoneCall,
  CalendarCheck,
  RotateCcw,
} from 'lucide-react';
import Navbar from '../../../components/Navbar';
import Footer from '../../../components/Footer';
import BookingModal from '../../../components/BookingModal';
import BikeCard from '../../../components/BikeCard';
import { fetchApi, getStoredUser } from '../../../lib/api';
import {
  ALL_CATALOG_VEHICLES,
  getVehicleBySlugOrCode,
  Vehicle,
} from '../../../lib/catalog';

export default function BikeDetailPage() {
  const params = useParams();
  const idOrCode = (params?.id as string) || (params?.slug as string) || '';

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [enquirySuccess, setEnquirySuccess] = useState(false);

  useEffect(() => {
    if (idOrCode) {
      loadVehicleData(idOrCode);
      loadProfile();
    }
  }, [idOrCode]);

  const loadVehicleData = async (target: string) => {
    setLoading(true);
    setError(null);

    // Look up static catalog definition
    const staticMatch = getVehicleBySlugOrCode(target);

    try {
      // Attempt API lookup for live database models
      const apiData = await fetchApi<any>(`/ev-bikes/${target}`);
      if (apiData && apiData.id) {
        setVehicle({
          ...(staticMatch || ({} as any)),
          ...apiData,
          category: staticMatch?.category || 'bikes',
          categoryLabel: staticMatch?.categoryLabel || 'Electric Motorcycle',
          isBookable: true,
          statusBadge: 'Bookings Open',
          imageUrl: staticMatch?.imageUrl || '/images/vehicles/thunder-pro.jpg',
          galleryImages: staticMatch?.galleryImages || ['/images/vehicles/thunder-pro.jpg'],
          colors: staticMatch?.colors || [
            { name: 'Sapphire Blue', hex: '#165DAD', description: 'Primary metallic finish' },
            { name: 'Carbon Black', hex: '#111827', description: 'Matte stealth finish' },
          ],
          specs: staticMatch?.specs || [
            { label: 'Certified Range', value: `${apiData.rangeKm} km`, sub: 'IDC Test Cycle' },
            { label: 'Top Speed', value: `${apiData.topSpeedKmh} km/h`, sub: 'Peak Speed' },
            { label: 'Battery Capacity', value: `${apiData.batteryCapacityKwh} kWh`, sub: 'IP67 Pack' },
            { label: 'Fast Charge', value: `${apiData.chargingTimeHours} hrs`, sub: '0-80% Time' },
          ],
          highlights: staticMatch?.highlights || [
            'Permanent Magnet Synchronous Motor (PMSM) with liquid-cooled controller',
            'Advanced Battery Management System with IP67 protection',
            'Full digital instrumentation and cloud telemetry',
          ],
        });
        return;
      }
    } catch (err) {
      // Fallback to static catalog entry
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
      <div className="flex-1 flex flex-col bg-white text-neutral-900">
        <Navbar />
        <main className="flex-1 max-w-7xl mx-auto px-4 py-20 w-full animate-pulse">
          <div className="h-6 bg-neutral-100 rounded w-32 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-7 h-96 bg-neutral-100 rounded-3xl" />
            <div className="lg:col-span-5 space-y-4">
              <div className="h-10 bg-neutral-100 rounded w-3/4" />
              <div className="h-5 bg-neutral-100 rounded w-1/2" />
              <div className="h-40 bg-neutral-100 rounded-2xl" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="flex-1 flex flex-col bg-white text-neutral-900">
        <Navbar />
        <main className="flex-1 max-w-xl mx-auto px-4 py-24 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 mx-auto flex items-center justify-center">
            <HelpCircle className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-900">Vehicle Not Found</h2>
          <p className="text-xs text-neutral-600">
            {error || 'The requested model could not be found in our fleet catalog.'}
          </p>
          <div className="pt-4">
            <Link
              href="/bikes"
              className="px-6 py-2.5 rounded-full bg-black text-white text-xs font-semibold tracking-wider hover:bg-neutral-800 transition-colors"
            >
              Back to Showroom
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const currentColor =
    vehicle.colors && vehicle.colors[selectedColorIndex]
      ? vehicle.colors[selectedColorIndex]
      : { name: 'Sapphire Blue', hex: '#165DAD', description: 'Primary metallic finish' };

  // Category breadcrumb link
  const categoryHref =
    vehicle.category === 'scooters'
      ? '/scooters'
      : vehicle.category === 'cycles'
      ? '/cycles'
      : vehicle.category === 'jeeps'
      ? '/jeeps'
      : '/bikes';

  // Related models
  const relatedVehicles = ALL_CATALOG_VEHICLES.filter(
    (v) => v.id !== vehicle.id && v.modelCode !== vehicle.modelCode
  ).slice(0, 3);

  return (
    <div className="flex-1 flex flex-col bg-white text-neutral-900">
      <Navbar />

      <main className="flex-1 w-full">
        {/* =========================================================================
            CLEAN WHITE AUTOMOTIVE SHOWCASE (OLA-INSPIRED)
            ========================================================================= */}
        <section className="pt-6 pb-16 px-4 sm:px-6 lg:px-8 border-b border-neutral-200">
          <div className="max-w-7xl mx-auto">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 text-xs text-neutral-500 mb-6">
              <Link href="/" className="hover:text-black">Home</Link>
              <span>/</span>
              <Link href={categoryHref} className="hover:text-black capitalize">
                {vehicle.categoryLabel || vehicle.category}
              </Link>
              <span>/</span>
              <span className="text-neutral-900 font-semibold">{vehicle.name}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
              {/* Left Column: Vehicle Photographic Showcase */}
              <div className="lg:col-span-7 flex flex-col items-center">
                <div className="relative w-full h-80 sm:h-96 md:h-[440px] flex items-center justify-center p-8 rounded-3xl bg-[#F9FAFB] border border-neutral-200 shadow-sm overflow-hidden">
                  {/* Status Badge */}
                  <div className="absolute top-5 left-5 z-10">
                    {vehicle.isBookable ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Bookings Open</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-[#165DAD] bg-blue-50 border border-blue-200">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Showroom Showcase</span>
                      </span>
                    )}
                  </div>

                  {/* Soft Realistic Contact Shadow */}
                  <div className="absolute bottom-6 w-3/4 h-8 bg-neutral-900/10 blur-xl rounded-full" />

                  <img
                    src={vehicle.imageUrl || '/images/vehicles/thunder-pro.jpg'}
                    alt={vehicle.name}
                    className="relative z-10 w-full h-full object-contain filter drop-shadow-md transition-all duration-300"
                  />
                </div>

                {/* Color Variants Switcher */}
                {vehicle.colors && vehicle.colors.length > 0 && (
                  <div className="mt-6 p-4 rounded-2xl bg-[#F9FAFB] border border-neutral-200 w-full flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">
                        Finish:
                      </span>
                      <div className="flex items-center gap-2">
                        {vehicle.colors.map((c: any, idx: number) => (
                          <button
                            key={c.name}
                            onClick={() => setSelectedColorIndex(idx)}
                            className={`w-7 h-7 rounded-full transition-transform border ${
                              selectedColorIndex === idx
                                ? 'scale-125 border-neutral-950 ring-2 ring-neutral-400 shadow-sm'
                                : 'border-neutral-300 hover:scale-110'
                            }`}
                            style={{ backgroundColor: c.hex }}
                            title={c.name}
                            aria-label={`Select ${c.name}`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="text-xs text-right">
                      <span className="font-bold text-neutral-900">{currentColor.name}</span>
                      <span className="text-neutral-500 block text-[11px]">{currentColor.description}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Pricing, Specs & Booking Action */}
              <div className="lg:col-span-5 space-y-6">
                <div>
                  <div className="text-xs font-bold text-[#165DAD] uppercase tracking-wider mb-1">
                    {vehicle.manufacturer || 'ASKR EV Mobility'} • {vehicle.modelCode}
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-950 tracking-tight">
                    {vehicle.name}
                  </h1>
                  <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
                    {vehicle.tagline}
                  </p>
                </div>

                {/* Key Metrics Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-[#F9FAFB] border border-neutral-200 text-center">
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-medium">
                      Range
                    </span>
                    <span className="text-xl font-black text-neutral-900">
                      {vehicle.rangeKm} <span className="text-xs font-normal text-neutral-500">km</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-medium">
                      Top Speed
                    </span>
                    <span className="text-xl font-black text-neutral-900">
                      {vehicle.topSpeedKmh} <span className="text-xs font-normal text-neutral-500">km/h</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-medium">
                      Battery
                    </span>
                    <span className="text-xl font-black text-neutral-900">
                      {vehicle.batteryCapacityKwh} <span className="text-xs font-normal text-neutral-500">kWh</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-medium">
                      Fast Charge
                    </span>
                    <span className="text-xl font-black text-neutral-900">
                      {vehicle.chargingTimeHours} <span className="text-xs font-normal text-neutral-500">hrs</span>
                    </span>
                  </div>
                </div>

                {/* Pricing & Booking Container */}
                <div className="p-6 rounded-2xl bg-[#F9FAFB] border border-neutral-200 space-y-5">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-[11px] text-neutral-500 uppercase tracking-wider block font-medium">
                        Ex-Showroom Price
                      </span>
                      <div className="text-3xl font-black text-neutral-950">
                        {vehicle.exShowroomPriceINR
                          ? `₹${vehicle.exShowroomPriceINR.toLocaleString('en-IN')}`
                          : 'Showroom Showcase'}
                      </div>
                    </div>

                    {vehicle.estimatedOnRoadINR && (
                      <div className="text-right">
                        <span className="text-[11px] text-neutral-500 uppercase tracking-wider block font-medium">
                          Est. On-Road
                        </span>
                        <div className="text-base font-bold text-neutral-700">
                          ₹{vehicle.estimatedOnRoadINR.toLocaleString('en-IN')}
                        </div>
                      </div>
                    )}
                  </div>

                  {vehicle.isBookable && vehicle.bookingAmountINR && (
                    <div className="pt-2 pb-1 border-t border-neutral-200 flex items-center justify-between text-xs">
                      <span className="text-neutral-600">Simulated Booking Token:</span>
                      <span className="font-bold text-neutral-900">
                        ₹{vehicle.bookingAmountINR.toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}

                  {/* Booking CTA or Concept Callback */}
                  {vehicle.isBookable ? (
                    <div className="space-y-3">
                      <button
                        onClick={() => setModalOpen(true)}
                        className="w-full py-4 rounded-full bg-black hover:bg-neutral-800 text-white text-xs sm:text-sm font-bold uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2"
                      >
                        <span>Book {vehicle.name}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>

                      <div className="flex items-center justify-center gap-2 text-[11px] text-neutral-500">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Instant Simulated Allocation • COMPLIANCE_MODE=SIMULATION_ONLY</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {enquirySuccess ? (
                        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center text-xs text-emerald-800 font-medium">
                          Thank you! Your interest has been recorded in our test queue.
                        </div>
                      ) : (
                        <button
                          onClick={() => setEnquirySuccess(true)}
                          className="w-full py-3.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold uppercase tracking-wider transition-all"
                        >
                          Register Interest For Priority Access
                        </button>
                      )}
                      <p className="text-[11px] text-neutral-500 text-center">
                        This model is part of our upcoming showcase fleet. Specifications are based on certified prototype data.
                      </p>
                    </div>
                  )}
                </div>

                {/* Warranty & Delivery Assurance */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-xl border border-neutral-200 flex items-center gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-[#165DAD] shrink-0" />
                    <div className="text-xs">
                      <span className="font-bold block text-neutral-900">Warranty</span>
                      <span className="text-neutral-500 text-[11px]">{vehicle.warranty || '5-Year / 60,000 km'}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-neutral-200 flex items-center gap-2.5">
                    <RotateCcw className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div className="text-xs">
                      <span className="font-bold block text-neutral-900">Cancellation</span>
                      <span className="text-neutral-500 text-[11px]">100% Refundable</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            TECHNICAL SPECIFICATIONS & HIGHLIGHTS
            ========================================================================= */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Technical Specifications */}
            <div className="lg:col-span-7 space-y-6">
              <h2 className="text-2xl font-bold text-neutral-950 tracking-tight flex items-center gap-2">
                <Gauge className="w-5 h-5 text-[#165DAD]" />
                <span>Technical Specifications</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {vehicle.specs &&
                  vehicle.specs.map((s: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-[#F9FAFB] border border-neutral-200 space-y-1"
                    >
                      <span className="text-xs text-neutral-500 uppercase tracking-wider block font-medium">
                        {s.label}
                      </span>
                      <div className="text-lg font-bold text-neutral-950">{s.value}</div>
                      {s.sub && (
                        <span className="text-[11px] text-neutral-500 block">{s.sub}</span>
                      )}
                    </div>
                  ))}
              </div>

              {/* Powertrain Architecture */}
              {vehicle.powertrain && (
                <div className="p-5 rounded-2xl bg-[#F9FAFB] border border-neutral-200 space-y-1.5">
                  <span className="text-xs text-neutral-500 uppercase tracking-wider font-semibold block">
                    Powertrain Architecture
                  </span>
                  <div className="text-sm font-medium text-neutral-800">
                    {vehicle.powertrain}
                  </div>
                </div>
              )}
            </div>

            {/* Design & Engineering Highlights */}
            <div className="lg:col-span-5 space-y-6">
              <h2 className="text-2xl font-bold text-neutral-950 tracking-tight flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-neutral-800" />
                <span>Engineering Highlights</span>
              </h2>

              <div className="space-y-3">
                {vehicle.highlights &&
                  vehicle.highlights.map((h: string, idx: number) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-[#F9FAFB] border border-neutral-200 flex items-start gap-3"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="text-xs text-neutral-700 leading-relaxed">{h}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Automotive FAQ Section */}
          <div className="pt-12 border-t border-neutral-200 space-y-8">
            <h2 className="text-2xl font-bold text-neutral-950 tracking-tight">
              Frequently Asked Questions
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl bg-[#F9FAFB] border border-neutral-200 space-y-2">
                <h3 className="text-sm font-bold text-neutral-900">
                  How does home charging work?
                </h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Every vehicle includes a portable home charging cable compatible with standard 15A household sockets. Full charging completes in 2.8 to 6.5 hours depending on battery size.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#F9FAFB] border border-neutral-200 space-y-2">
                <h3 className="text-sm font-bold text-neutral-900">
                  What warranty coverage is included?
                </h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  The electric motor and high-voltage lithium battery pack are protected by our comprehensive manufacturer warranty against manufacturing defects and capacity degradation.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#F9FAFB] border border-neutral-200 space-y-2">
                <h3 className="text-sm font-bold text-neutral-900">
                  Can I cancel my booking reservation?
                </h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Yes, bookings can be cancelled at any time prior to vehicle dispatch from your account dashboard with full refund of the reservation token.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#F9FAFB] border border-neutral-200 space-y-2">
                <h3 className="text-sm font-bold text-neutral-900">
                  What safety tests have been performed?
                </h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Battery enclosures are tested to AIS-156 Amendment 3 automotive standards for immersion, drop impact, thermal runaway containment, and vibration durability.
                </p>
              </div>
            </div>
          </div>

          {/* Related Models */}
          {relatedVehicles.length > 0 && (
            <div className="pt-12 border-t border-neutral-200 space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-neutral-950 tracking-tight">
                  Explore More Models
                </h2>
                <Link
                  href="/bikes"
                  className="text-xs font-semibold text-[#165DAD] hover:underline"
                >
                  View Full Showroom
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

      {/* Booking Modal */}
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
