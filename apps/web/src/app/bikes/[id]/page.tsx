'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import Navbar from '../../../components/Navbar';
import Footer from '../../../components/Footer';
import BookingModal from '../../../components/BookingModal';
import { fetchApi, getStoredUser } from '../../../lib/api';

export default function BikeDetailPage() {
  const params = useParams();
  const [bike, setBike] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadBike(params.id as string);
      loadProfile();
    }
  }, [params.id]);

  const loadBike = async (idOrCode: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApi<any>(`/ev-bikes/${idOrCode}`);
      setBike(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load EV bike specifications');
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
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col bg-white">
        <Navbar />
        <main className="flex-1 max-w-7xl mx-auto px-4 py-16 w-full animate-pulse">
          <div className="h-6 bg-slate-100 rounded w-32 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-7 h-96 bg-slate-100 rounded-xl" />
            <div className="lg:col-span-5 space-y-4">
              <div className="h-8 bg-slate-100 rounded w-2/3" />
              <div className="h-4 bg-slate-100 rounded w-1/2" />
              <div className="h-24 bg-slate-100 rounded" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !bike) {
    return (
      <div className="flex-1 flex flex-col bg-white">
        <Navbar />
        <main className="flex-1 max-w-2xl mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl font-bold text-[#253247]">Model Not Found</h2>
          <p className="text-xs text-slate-500 mt-2">{error || 'Requested motorcycle does not exist.'}</p>
          <div className="mt-6">
            <Link
              href="/bikes"
              className="px-5 py-2.5 rounded-lg bg-[#165DAD] text-white text-xs font-medium hover:bg-[#124B8D]"
            >
              Back to Fleet Catalog
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const imgSource = bike.imageUrl
    ? bike.imageUrl.replace('.webp', '.svg')
    : '/images/bikes/thunder-pro.svg';

  return (
    <div className="flex-1 flex flex-col bg-white">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 w-full">
        {/* Back navigation link */}
        <Link
          href="/bikes"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-[#165DAD] transition-colors mb-8"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to EV Bikes</span>
        </Link>

        {/* 2-Column Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left: Product Image */}
          <div className="lg:col-span-7 bg-[#F7F9FC] rounded-xl border border-slate-200 p-8 flex flex-col items-center justify-center relative">
            <span className="absolute top-4 right-4 text-xs font-semibold tracking-wider uppercase text-slate-500 bg-white px-2.5 py-1 rounded border border-slate-200 shadow-2xs">
              Concept Prototype
            </span>
            <img
              src={imgSource}
              alt={bike.name}
              className="w-full max-h-96 object-contain py-4"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/images/bikes/thunder-pro.svg';
              }}
            />
          </div>

          {/* Right: Pricing, Summary & Single Primary Action */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
            <div>
              <span className="text-xs font-semibold text-[#165DAD] uppercase tracking-wider">
                {bike.modelCode}
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#253247] mt-1.5">
                {bike.name}
              </h1>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                {bike.tagline}
              </p>
            </div>

            {/* Price Box */}
            <div className="p-4 rounded-lg bg-[#F7F9FC] border border-slate-200 space-y-2.5 text-sm">
              <div className="flex justify-between items-baseline">
                <span className="text-slate-500">Indicative Price:</span>
                <span className="text-xl font-bold text-[#253247]">
                  ₹{bike.exShowroomPriceINR.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                <span className="text-slate-500">Booking Token Deposit:</span>
                <span className="text-base font-bold text-[#165DAD]">
                  ₹{bike.bookingAmountINR.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between items-baseline text-slate-500">
                <span>Voucher Redemption Limit:</span>
                <span className="text-green-700 font-semibold">
                  Up to ₹{bike.voucherRedeemLimitINR.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* One Clear Book Now Action */}
            <button
              onClick={() => setModalOpen(true)}
              className="w-full min-h-[48px] py-3.5 rounded-lg bg-[#165DAD] hover:bg-[#124B8D] text-white text-base font-semibold transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <span>Book Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-xs text-slate-500 text-center flex items-center justify-center gap-1.5 leading-relaxed">
              <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Full compliance with verified booking receipts</span>
            </div>
          </div>
        </div>

        {/* Clean Engineering Specifications Table */}
        <div className="mt-16 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 bg-[#F7F9FC] border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-[#253247]">Indicative Concept Specifications</h2>
              <p className="text-xs text-slate-500">Preliminary technical design parameters for {bike.name}</p>
            </div>
            <span className="text-xs text-slate-500 bg-white px-2.5 py-1 rounded border border-slate-200 self-start sm:self-auto">
              Pre-Production
            </span>
          </div>

          <div className="divide-y divide-slate-100 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 p-4">
              <span className="text-slate-500 font-medium">Battery Pack Architecture</span>
              <span className="text-[#253247] font-semibold">{bike.batteryCapacityKwh} kWh Lithium Battery</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 p-4">
              <span className="text-slate-500 font-medium">Estimated Riding Range</span>
              <span className="text-[#253247] font-semibold">{bike.rangeKm} km per charge</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 p-4">
              <span className="text-slate-500 font-medium">Top Velocity</span>
              <span className="text-[#253247] font-semibold">{bike.topSpeedKmh} km/h</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 p-4">
              <span className="text-slate-500 font-medium">Estimated Charging Duration</span>
              <span className="text-[#253247] font-semibold">{bike.chargingTimeHours} hours</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 p-4">
              <span className="text-slate-500 font-medium">Powertrain Motor</span>
              <span className="text-[#253247] font-semibold">{bike.specs?.motorType || 'PMSM Electric Drive'}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 p-4">
              <span className="text-slate-500 font-medium">Peak Power Output</span>
              <span className="text-[#253247] font-semibold">{bike.specs?.peakPowerKw || 8.5} kW</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 p-4">
              <span className="text-slate-500 font-medium">Peak Torque</span>
              <span className="text-[#253247] font-semibold">{bike.specs?.peakTorqueNm || 52} Nm</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 p-4">
              <span className="text-slate-500 font-medium">Braking Architecture</span>
              <span className="text-[#253247] font-semibold">{bike.specs?.brakes || 'Dual Disc with CBS & Regenerative'}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 p-4">
              <span className="text-slate-500 font-medium">Instrument Display</span>
              <span className="text-[#253247] font-semibold">{bike.specs?.display || 'Digital TFT Telemetry Display'}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 p-4">
              <span className="text-slate-500 font-medium">Status</span>
              <span className="text-[#165DAD] font-semibold">Pre-Production Concept Design</span>
            </div>
          </div>
        </div>

        {/* Booking Dialog Modal */}
        <BookingModal
          bike={bike}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          user={userProfile}
          onSuccess={() => {
            loadProfile();
          }}
        />
      </main>

      <Footer />
    </div>
  );
}
