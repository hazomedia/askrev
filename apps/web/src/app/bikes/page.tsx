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
  SlidersHorizontal,
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import BikeCard from '../../components/BikeCard';
import BookingModal from '../../components/BookingModal';
import { fetchApi, getStoredUser } from '../../lib/api';
import {
  ELECTRIC_MOTORCYCLES,
  Vehicle,
} from '../../lib/catalog';

export default function BikesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(ELECTRIC_MOTORCYCLES);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [bookingVehicle, setBookingVehicle] = useState<any | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  useEffect(() => {
    setCurrentUser(getStoredUser());
    loadBikesFromApi();
  }, []);

  const loadBikesFromApi = async () => {
    try {
      const data = await fetchApi<any[]>('/ev-bikes');
      if (Array.isArray(data) && data.length > 0) {
        setVehicles((prev) =>
          prev.map((v) => {
            const apiMatch = data.find(
              (d) => d.modelCode === v.modelCode || d.id === v.id
            );
            if (apiMatch) {
              return {
                ...v,
                ...apiMatch,
                exShowroomPriceINR: apiMatch.exShowroomPriceINR || v.exShowroomPriceINR,
                bookingAmountINR: apiMatch.bookingAmountINR || v.bookingAmountINR,
                voucherRedeemLimitINR: apiMatch.voucherRedeemLimitINR || v.voucherRedeemLimitINR,
              };
            }
            return v;
          })
        );
      }
    } catch (err) {
      console.warn('Note: utilizing static catalog definitions', err);
    }
  };

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
            <span className="text-black font-semibold">Electric Motorcycles</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-neutral-950 tracking-tight">
            Electric Motorcycles
          </h1>
          <p className="mt-2 text-base text-neutral-600 max-w-2xl leading-relaxed">
            High-torque performance streetfighters and ultra-efficient daily commuters. Built on tubular steel frames with IP67-rated battery packs and cloud-connected telemetry.
          </p>
        </div>

        {/* Featured Motorcycle Hero Banner (Ola-style Showcase) */}
        <div className="mt-8 p-8 sm:p-12 rounded-3xl bg-[#F9FAFB] border border-neutral-200 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-[#165DAD] bg-blue-50 border border-blue-100">
              <span className="w-2 h-2 rounded-full bg-[#165DAD] animate-pulse" />
              <span>Flagship Streetfighter</span>
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-950 tracking-tight">
              ASKR Thunder Pro
            </h2>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Certified 135 km range, 95 km/h top speed, and 78 Nm instant wheel torque. Featuring permanent magnet synchronous mid-drive architecture, dual CBS disc brakes, and smart telemetry.
            </p>

            <div className="pt-2 flex items-baseline gap-2">
              <span className="text-xs text-neutral-500 uppercase font-medium">Starting at</span>
              <span className="text-2xl font-bold text-neutral-900">₹1,25,000</span>
              <span className="text-xs text-neutral-400">Ex-showroom</span>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={() => handleOpenBooking(vehicles[0])}
                className="px-6 py-3 rounded-full bg-black hover:bg-neutral-800 text-white text-xs font-semibold tracking-wide transition-all shadow-sm"
              >
                Book Thunder Pro
              </button>
              <Link
                href="/bikes/thunder-pro"
                className="px-6 py-3 rounded-full bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-300 text-xs font-semibold tracking-wide transition-all"
              >
                View Specifications
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6 flex items-center justify-center">
            <img
              src="/images/vehicles/thunder-pro.jpg"
              alt="ASKR Thunder Pro Electric Motorcycle"
              className="w-full max-h-80 object-contain filter drop-shadow-md"
            />
          </div>
        </div>

        {/* Fleet Grid Display */}
        <div className="mt-14">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-neutral-200 gap-2">
            <div>
              <h3 className="text-xl font-bold text-neutral-950">
                Motorcycle Lineup ({vehicles.length})
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                Verified commercial production models ready for booking
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>All models in active booking allocation</span>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {vehicles.map((bike) => (
              <BikeCard
                key={bike.id}
                vehicle={bike}
                onBookClick={handleOpenBooking}
              />
            ))}
          </div>
        </div>

        {/* Engineering Highlights */}
        <div className="mt-20 pt-12 border-t border-neutral-200">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-[#165DAD]">
              Engineering & Performance
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-neutral-950 tracking-tight mt-1">
              Built For The Real World
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 mt-2">
              Every ASKR EV motorcycle is precision-engineered to withstand diverse road conditions while maintaining class-leading efficiency.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-[#F9FAFB] border border-neutral-200">
              <Zap className="w-6 h-6 text-[#165DAD] mb-3" />
              <h4 className="text-sm font-bold text-neutral-900">PMSM Mid-Drive</h4>
              <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                Liquid-cooled permanent magnet motor delivering instantaneous wheel torque with 92% peak efficiency.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F9FAFB] border border-neutral-200">
              <ShieldCheck className="w-6 h-6 text-emerald-600 mb-3" />
              <h4 className="text-sm font-bold text-neutral-900">IP67 Battery Shield</h4>
              <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                Extruded aluminium battery casing with pressure release valves and thermal runaway mitigation sensors.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F9FAFB] border border-neutral-200">
              <BatteryCharging className="w-6 h-6 text-blue-600 mb-3" />
              <h4 className="text-sm font-bold text-neutral-900">15A Universal Socket</h4>
              <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                Charge at home or office using any standard 15A three-pin power outlet without requiring special wallboxes.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F9FAFB] border border-neutral-200">
              <Gauge className="w-6 h-6 text-indigo-600 mb-3" />
              <h4 className="text-sm font-bold text-neutral-900">5-Year Warranty</h4>
              <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                Comprehensive 5-year or 60,000 km manufacturer warranty covering the traction battery pack and electric motor.
              </p>
            </div>
          </div>
        </div>

        {/* Motorcycle FAQs */}
        <div className="mt-20 pt-12 border-t border-neutral-200">
          <h2 className="text-2xl font-bold text-neutral-950 tracking-tight mb-8">
            Frequently Asked Questions
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-[#F9FAFB] border border-neutral-200 space-y-2">
              <h3 className="text-sm font-bold text-neutral-900">
                How do I charge my ASKR EV motorcycle?
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                All models come with a portable home charging unit that plugs into any standard 15A three-pin household socket. Full charge takes between 2.8 and 4.0 hours depending on the battery size.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F9FAFB] border border-neutral-200 space-y-2">
              <h3 className="text-sm font-bold text-neutral-900">
                What is the difference between Ex-Showroom and On-Road price?
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                The ex-showroom price includes the vehicle and GST. Estimated on-road price adds state registration fees, mandatory road tax, and comprehensive 5-year third-party + 1-year own damage insurance.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F9FAFB] border border-neutral-200 space-y-2">
              <h3 className="text-sm font-bold text-neutral-900">
                What warranty is provided with the motorcycle?
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                ASKR EV motorcycles come with a 5-year or 60,000 km warranty on the battery pack and PMSM electric motor, along with 3 years of complimentary roadside assistance.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F9FAFB] border border-neutral-200 space-y-2">
              <h3 className="text-sm font-bold text-neutral-900">
                How does the simulated booking reservation work?
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
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
