'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  BatteryCharging,
  Gauge,
  CheckCircle2,
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import BikeCard from '../../components/BikeCard';
import BookingModal from '../../components/BookingModal';
import AdminPreviewBanner from '../../components/AdminPreviewBanner';
import { fetchPublishedCatalog, getStoredUser, isAdminPreviewActive } from '../../lib/api';
import { RefreshCw, AlertCircle } from 'lucide-react';

export default function BikesPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [bookingVehicle, setBookingVehicle] = useState<any | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  useEffect(() => {
    setCurrentUser(getStoredUser());
    loadBikes();

    const handlePreviewChange = () => {
      loadBikes();
    };

    window.addEventListener('askrev_preview_change', handlePreviewChange);
    return () => window.removeEventListener('askrev_preview_change', handlePreviewChange);
  }, []);

  const loadBikes = async () => {
    setLoading(true);
    setError(null);
    try {
      const isPreview = isAdminPreviewActive();
      const data = await fetchPublishedCatalog({ category: 'BIKE', preview: isPreview });
      setVehicles(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.warn('Motorcycles catalog fetch notice:', err.message);
      setError('Live motorcycle catalog is momentarily unavailable. Please retry connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBooking = (vehicle: any) => {
    setBookingVehicle(vehicle);
    setBookingModalOpen(true);
  };

  const featured = vehicles.find((v) => v.isFeatured) || vehicles[0];

  return (
    <div className="flex-1 flex flex-col bg-[#080B12] text-[#F7FAFF] min-h-screen">
      <AdminPreviewBanner onToggle={() => loadBikes()} />
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 w-full">
        {/* Header Breadcrumbs & Title */}
        <div className="pb-8 border-b border-white/10">
          <div className="flex items-center gap-2 text-xs text-[#AAB7C8] mb-3">
            <Link href="/" className="hover:text-white">Home</Link>
            <span>/</span>
            <span className="text-[#50D9FF] font-semibold">Electric Motorcycles</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-[#F7FAFF] tracking-tight">
            Electric Motorcycles
          </h1>
          <p className="mt-2 text-base text-[#AAB7C8] max-w-2xl leading-relaxed">
            High-torque performance streetfighters and ultra-efficient daily commuters. Built on tubular steel trellis frames with IP67-rated battery packs and cloud-connected telemetry.
          </p>
        </div>

        {/* Featured Motorcycle Hero Banner (Midnight Studio Showcase) */}
        {featured && (
          <div className="mt-8 p-8 sm:p-12 rounded-3xl bg-[#101827] border border-white/10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center shadow-2xl relative overflow-hidden">
            <div className="lg:col-span-6 space-y-4 relative z-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-[#50D9FF] bg-blue-500/15 border border-blue-500/30">
                <span className="w-2 h-2 rounded-full bg-[#50D9FF] animate-pulse" />
                <span>Flagship Streetfighter</span>
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#F7FAFF] tracking-tight">
                {featured.name}
              </h2>
              <p className="text-sm text-[#AAB7C8] leading-relaxed">
                {featured.tagline || featured.shortDescription || 'High-performance connected electric streetfighter with instant wheel torque and smart telemetry.'}
              </p>

              <div className="pt-2 flex items-baseline gap-2">
                <span className="text-xs text-[#AAB7C8] uppercase font-semibold">Starting at</span>
                <span className="text-2xl font-black text-[#F7FAFF]">
                  {featured.sellingPriceINR ? `₹${featured.sellingPriceINR.toLocaleString('en-IN')}` : (featured.formattedSellingPrice || 'Showcase Preview')}
                </span>
                <span className="text-xs text-[#AAB7C8]/70">Ex-showroom</span>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                {featured.isBookable && (
                  <button
                    onClick={() => handleOpenBooking(featured)}
                    className="px-6 py-3 rounded-full bg-[#267DFF] hover:bg-[#1A6EEB] text-white text-xs font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(38,125,255,0.4)]"
                  >
                    Book {featured.name}
                  </button>
                )}
                <Link
                  href={`/bikes/${featured.modelCode || featured.slug}`}
                  className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/15 text-[#F7FAFF] border border-white/20 text-xs font-semibold tracking-wide transition-all"
                >
                  View Specifications
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6 flex items-center justify-center relative">
              <img
                src={featured.heroImage || featured.imageUrl || '/images/vehicles/dark/hero-motorcycle-dark.jpg'}
                alt={featured.name}
                className="w-full max-h-84 object-cover rounded-2xl filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.8)]"
              />
            </div>
          </div>
        )}

        {/* Fleet Grid Display */}
        <div className="mt-14">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-white/10 gap-2">
            <div>
              <h3 className="text-xl font-bold text-[#F7FAFF]">
                Motorcycle Lineup ({vehicles.length})
              </h3>
              <p className="text-xs text-[#AAB7C8] mt-1">
                Verified commercial production models ready for booking
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={loadBikes}
                disabled={loading}
                className="inline-flex items-center gap-1.5 text-xs text-[#AAB7C8] hover:text-white transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#50D9FF]' : ''}`} />
                <span>Refresh</span>
              </button>
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Live Database Catalog</span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 text-[#50D9FF] animate-spin" />
              <span className="text-xs text-[#AAB7C8]">Loading motorcycle models from database...</span>
            </div>
          ) : error ? (
            <div className="py-12 px-6 rounded-2xl bg-white/5 border border-white/10 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
              <div className="text-sm font-bold text-white">Motorcycle Catalog Unavailable</div>
              <p className="text-xs text-[#AAB7C8] max-w-md mx-auto">{error}</p>
              <button
                onClick={loadBikes}
                className="px-5 py-2 rounded-full bg-[#267DFF] text-white text-xs font-bold hover:bg-[#1A6EEB]"
              >
                Retry Connection
              </button>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="py-16 text-center text-[#AAB7C8] text-xs">
              No electric motorcycles currently published in the catalog.
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {vehicles.map((bike) => (
                <BikeCard
                  key={bike.id}
                  vehicle={bike}
                  onBookClick={handleOpenBooking}
                />
              ))}
            </div>
          )}
        </div>

        {/* Engineering Highlights */}
        <div className="mt-20 pt-12 border-t border-white/10">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-[#50D9FF]">
              Engineering & Performance
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#F7FAFF] tracking-tight mt-1">
              Built For The Real World
            </h2>
            <p className="text-xs sm:text-sm text-[#AAB7C8] mt-2">
              Every ASKR EV motorcycle is precision-engineered to withstand diverse road conditions while maintaining class-leading efficiency.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-[#101827] border border-white/10 space-y-2">
              <Zap className="w-6 h-6 text-[#50D9FF] mb-2" />
              <h4 className="text-sm font-bold text-[#F7FAFF]">PMSM Mid-Drive</h4>
              <p className="text-xs text-[#AAB7C8] leading-relaxed">
                Liquid-cooled permanent magnet motor delivering instantaneous wheel torque with 92% peak efficiency.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#101827] border border-white/10 space-y-2">
              <ShieldCheck className="w-6 h-6 text-emerald-400 mb-2" />
              <h4 className="text-sm font-bold text-[#F7FAFF]">IP67 Battery Shield</h4>
              <p className="text-xs text-[#AAB7C8] leading-relaxed">
                Extruded aluminium battery casing with pressure release valves and thermal runaway mitigation sensors.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#101827] border border-white/10 space-y-2">
              <BatteryCharging className="w-6 h-6 text-[#267DFF] mb-2" />
              <h4 className="text-sm font-bold text-[#F7FAFF]">15A Universal Socket</h4>
              <p className="text-xs text-[#AAB7C8] leading-relaxed">
                Charge at home or office using any standard 15A three-pin power outlet without requiring special wallboxes.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#101827] border border-white/10 space-y-2">
              <Gauge className="w-6 h-6 text-purple-400 mb-2" />
              <h4 className="text-sm font-bold text-[#F7FAFF]">5-Year Warranty</h4>
              <p className="text-xs text-[#AAB7C8] leading-relaxed">
                Comprehensive 5-year or 60,000 km manufacturer warranty covering the traction battery pack and electric motor.
              </p>
            </div>
          </div>
        </div>

        {/* Motorcycle FAQs */}
        <div className="mt-20 pt-12 border-t border-white/10">
          <h2 className="text-2xl font-bold text-[#F7FAFF] tracking-tight mb-8">
            Frequently Asked Questions
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-[#101827] border border-white/10 space-y-2">
              <h3 className="text-sm font-bold text-[#F7FAFF]">
                How do I charge my ASKR EV motorcycle?
              </h3>
              <p className="text-xs text-[#AAB7C8] leading-relaxed">
                All models come with a portable home charging unit that plugs into any standard 15A three-pin household socket. Full charge takes between 2.8 and 4.0 hours depending on battery capacity.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#101827] border border-white/10 space-y-2">
              <h3 className="text-sm font-bold text-[#F7FAFF]">
                What is the difference between Ex-Showroom and On-Road price?
              </h3>
              <p className="text-xs text-[#AAB7C8] leading-relaxed">
                The ex-showroom price includes the vehicle and GST. Estimated on-road price adds state registration fees, road tax, and comprehensive 5-year third-party + 1-year own damage insurance.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#101827] border border-white/10 space-y-2">
              <h3 className="text-sm font-bold text-[#F7FAFF]">
                What warranty is provided with the motorcycle?
              </h3>
              <p className="text-xs text-[#AAB7C8] leading-relaxed">
                ASKR EV motorcycles come with a 5-year or 60,000 km warranty on the battery pack and PMSM electric motor, along with 3 years of complimentary roadside assistance.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#101827] border border-white/10 space-y-2">
              <h3 className="text-sm font-bold text-[#F7FAFF]">
                How does the simulated booking reservation work?
              </h3>
              <p className="text-xs text-[#AAB7C8] leading-relaxed">
                Under COMPLIANCE_MODE=SIMULATION_ONLY, clicking Book Now generates a verified developmental booking order tied to your member account for delivery queue verification without processing live banking transactions.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Booking Modal */}
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
