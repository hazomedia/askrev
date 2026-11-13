'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronRight, Zap, ShieldCheck } from 'lucide-react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import BikeCard from '../../components/BikeCard';
import BookingModal from '../../components/BookingModal';
import { getStoredUser } from '../../lib/api';
import { ELECTRIC_SCOOTERS, Vehicle } from '../../lib/catalog';

export default function ScootersPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [bookingVehicle, setBookingVehicle] = useState<any | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  useEffect(() => {
    setCurrentUser(getStoredUser());
  }, []);

  const handleOpenBooking = (vehicle: any) => {
    setBookingVehicle(vehicle);
    setBookingModalOpen(true);
  };

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
        <div className="mt-8 p-8 sm:p-12 rounded-3xl bg-[#101827] border border-white/10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center shadow-2xl relative overflow-hidden">
          <div className="lg:col-span-6 space-y-4 relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-[#50D9FF] bg-blue-500/15 border border-blue-500/30">
              <span className="w-2 h-2 rounded-full bg-[#50D9FF] animate-pulse" />
              <span>Featured Model</span>
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#F7FAFF] tracking-tight">
              ASKR S1 Pro Gen 2
            </h2>
            <p className="text-sm text-[#AAB7C8] leading-relaxed">
              Certified 195 km IDC range, 120 km/h top speed, and 0-40 km/h in 2.6 seconds. Built with an all-aluminium sealed battery enclosure and intelligent MoveOS connectivity.
            </p>
            <div className="pt-2 flex items-baseline gap-2">
              <span className="text-xs text-[#AAB7C8] uppercase font-semibold">Starting at</span>
              <span className="text-2xl font-black text-[#F7FAFF]">₹1,29,999</span>
              <span className="text-xs text-[#AAB7C8]/70">Ex-showroom</span>
            </div>
            <div className="pt-2 flex items-center gap-3">
              <Link
                href="/bikes/ASKR-S1-PRO"
                className="px-6 py-3 rounded-full bg-[#267DFF] hover:bg-[#1A6EEB] text-white text-xs font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(38,125,255,0.4)]"
              >
                Explore S1 Pro
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6 flex items-center justify-center">
            <img
              src="/images/vehicles/dark/hero-scooter-dark.jpg"
              alt="ASKR S1 Pro Electric Scooter"
              className="w-full max-h-84 object-cover rounded-2xl filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.8)]"
            />
          </div>
        </div>

        {/* Scooter Fleet Grid */}
        <div className="mt-12">
          <h3 className="text-xl font-bold text-[#F7FAFF] mb-6">
            All Electric Scooter Models ({ELECTRIC_SCOOTERS.length})
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {ELECTRIC_SCOOTERS.map((scooter) => (
              <BikeCard key={scooter.id} vehicle={scooter} onBookClick={handleOpenBooking} />
            ))}
          </div>
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
