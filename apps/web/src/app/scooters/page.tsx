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
    <div className="flex-1 flex flex-col bg-white text-neutral-900">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 w-full">
        {/* Header Breadcrumbs & Title */}
        <div className="pb-8 border-b border-neutral-200">
          <div className="flex items-center gap-2 text-xs text-neutral-500 mb-3">
            <Link href="/" className="hover:text-black">Home</Link>
            <span>/</span>
            <span className="text-black font-semibold">Electric Scooters</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-neutral-950 tracking-tight">
            Electric Scooters
          </h1>
          <p className="mt-2 text-base text-neutral-600 max-w-2xl leading-relaxed">
            The next generation of high-efficiency personal electric scooters. Featuring industry-leading range, 7-inch connected touchscreens, and rapid home charging.
          </p>
        </div>

        {/* Featured Scooter Hero Banner */}
        <div className="mt-8 p-8 sm:p-12 rounded-3xl bg-[#F9FAFB] border border-neutral-200 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-[#165DAD]">
              Featured Model
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-950 tracking-tight">
              ASKR S1 Pro Gen 2
            </h2>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Certified 195 km IDC range, 120 km/h top speed, and 0-40 km/h in 2.6 seconds. Built with an all-aluminium sealed battery enclosure and intelligent MoveOS connectivity.
            </p>
            <div className="pt-2 flex items-baseline gap-2">
              <span className="text-xs text-neutral-500 uppercase font-medium">Starting at</span>
              <span className="text-2xl font-bold text-neutral-900">₹1,29,999</span>
              <span className="text-xs text-neutral-400">Ex-showroom</span>
            </div>
            <div className="pt-2 flex items-center gap-3">
              <Link
                href="/bikes/ASKR-S1-PRO"
                className="px-6 py-3 rounded-full bg-black hover:bg-neutral-800 text-white text-xs font-semibold tracking-wide transition-all"
              >
                Explore S1 Pro
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6 flex items-center justify-center">
            <img
              src="/images/vehicles/scooter-hero.jpg"
              alt="ASKR S1 Pro Electric Scooter"
              className="w-full max-h-80 object-contain filter drop-shadow-md"
            />
          </div>
        </div>

        {/* Scooter Fleet Grid */}
        <div className="mt-12">
          <h3 className="text-xl font-bold text-neutral-900 mb-6">
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
