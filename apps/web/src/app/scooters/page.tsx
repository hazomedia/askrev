'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronRight, Zap, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import BikeCard from '../../components/BikeCard';
import BookingModal from '../../components/BookingModal';
import { fetchPublishedCatalog, getStoredUser } from '../../lib/api';

export default function ScootersPage() {
  const [scooters, setScooters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [bookingVehicle, setBookingVehicle] = useState<any | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  const loadScooters = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPublishedCatalog({ category: 'SCOOTER' });
      setScooters(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.warn('Scooters catalog load notice:', err.message);
      setError('Live scooter showroom is currently unavailable. Please retry connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentUser(getStoredUser());
    loadScooters();
  }, []);

  const handleOpenBooking = (vehicle: any) => {
    setBookingVehicle(vehicle);
    setBookingModalOpen(true);
  };

  const featured = scooters.find((s) => s.isFeatured) || scooters[0];

  return (
    <div className="flex-1 flex flex-col bg-[#080B12] text-[#F7FAFF] min-h-screen">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 w-full">
        {/* Header Breadcrumbs & Title */}
        <div className="pb-8 border-b border-white/10">
          <div className="flex items-center gap-2 text-xs text-[#AAB7C8] mb-3">
            <Link href="/" className="hover:text-white">Home</Link>
            <span>/</span>
            <span className="text-[#50D9FF] font-semibold">Electric Scooters</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-[#F7FAFF] tracking-tight">
            Electric Scooters
          </h1>
          <p className="mt-2 text-base text-[#AAB7C8] max-w-2xl leading-relaxed">
            The next generation of high-efficiency personal electric scooters. Featuring industry-leading range, 7-inch connected touchscreens, and rapid home charging.
          </p>
        </div>

        {/* Featured Scooter Hero Banner (Urban Night Showroom) */}
        {featured && (
          <div className="mt-8 p-8 sm:p-12 rounded-3xl bg-[#101827] border border-white/10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center shadow-2xl relative overflow-hidden">
            <div className="lg:col-span-6 space-y-4 relative z-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-[#50D9FF] bg-blue-500/15 border border-blue-500/30">
                <span className="w-2 h-2 rounded-full bg-[#50D9FF] animate-pulse" />
                <span>Featured Model</span>
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#F7FAFF] tracking-tight">
                {featured.name}
              </h2>
              <p className="text-sm text-[#AAB7C8] leading-relaxed">
                {featured.tagline || featured.shortDescription || 'Certified high-performance electric scooter built with intelligent telemetry and fast charging.'}
              </p>
              <div className="pt-2 flex items-baseline gap-2">
                <span className="text-xs text-[#AAB7C8] uppercase font-semibold">Starting at</span>
                <span className="text-2xl font-black text-[#F7FAFF]">
                  {featured.sellingPriceINR ? `₹${featured.sellingPriceINR.toLocaleString('en-IN')}` : (featured.formattedSellingPrice || 'Showcase Preview')}
                </span>
                <span className="text-xs text-[#AAB7C8]/70">Ex-showroom</span>
              </div>
              <div className="pt-2 flex items-center gap-3">
                <Link
                  href={`/bikes/${featured.modelCode || featured.slug}`}
                  className="px-6 py-3 rounded-full bg-[#267DFF] hover:bg-[#1A6EEB] text-white text-xs font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(38,125,255,0.4)]"
                >
                  Explore {featured.name}
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6 flex items-center justify-center">
              <img
                src={featured.heroImage || featured.imageUrl || '/images/vehicles/dark/hero-scooter-dark.jpg'}
                alt={featured.name}
                className="w-full max-h-84 object-cover rounded-2xl filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.8)]"
              />
            </div>
          </div>
        )}

        {/* Scooter Fleet Grid */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-[#F7FAFF]">
              All Electric Scooter Models ({scooters.length})
            </h3>
            <button
              onClick={loadScooters}
              disabled={loading}
              className="inline-flex items-center gap-1.5 text-xs text-[#AAB7C8] hover:text-white transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#50D9FF]' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 text-[#50D9FF] animate-spin" />
              <span className="text-xs text-[#AAB7C8]">Loading scooter models from database...</span>
            </div>
          ) : error ? (
            <div className="py-12 px-6 rounded-2xl bg-white/5 border border-white/10 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
              <div className="text-sm font-bold text-white">Scooter Catalog Unavailable</div>
              <p className="text-xs text-[#AAB7C8] max-w-md mx-auto">{error}</p>
              <button
                onClick={loadScooters}
                className="px-5 py-2 rounded-full bg-[#267DFF] text-white text-xs font-bold hover:bg-[#1A6EEB]"
              >
                Retry Connection
              </button>
            </div>
          ) : scooters.length === 0 ? (
            <div className="py-16 text-center text-[#AAB7C8] text-xs">
              No electric scooters currently published in the catalog.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {scooters.map((scooter) => (
                <BikeCard key={scooter.id} vehicle={scooter} onBookClick={handleOpenBooking} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />

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
