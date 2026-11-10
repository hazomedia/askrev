'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  ShieldCheck,
  BatteryCharging,
  Gauge,
  Headphones,
  ChevronRight,
  Bike,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BikeCard from '../components/BikeCard';
import { fetchApi } from '../lib/api';

const DEFAULT_VERIFIED_BIKES = [
  {
    id: 'e08078e1-47f8-4073-81f5-5b670f59198e',
    modelCode: 'ASKR-THUNDER-PRO',
    name: 'ASKR Thunder Pro',
    tagline: 'High-Torque Performance Urban Commuter',
    batteryCapacityKwh: 3.8,
    rangeKm: 135,
    topSpeedKmh: 95,
    chargingTimeHours: 3.5,
    exShowroomPriceINR: 125000,
    bookingAmountINR: 5000,
    voucherRedeemLimitINR: 15000,
    imageUrl: '/images/bikes/thunder-pro.svg',
    isAvailable: true,
  },
  {
    id: '2b290c86-749d-480e-8f82-6f7122936e97',
    modelCode: 'ASKR-CITY-CRUISE',
    name: 'ASKR City Cruise',
    tagline: 'Ultra-Efficient Daily City Rider',
    batteryCapacityKwh: 2.5,
    rangeKm: 90,
    topSpeedKmh: 70,
    chargingTimeHours: 2.8,
    exShowroomPriceINR: 89000,
    bookingAmountINR: 3000,
    voucherRedeemLimitINR: 10000,
    imageUrl: '/images/bikes/city-cruise.svg',
    isAvailable: true,
  },
  {
    id: '22c9999e-5f97-449f-bf26-e2169dd74d7f',
    modelCode: 'ASKR-APEX-SPORT',
    name: 'ASKR Apex Sport',
    tagline: 'Track-Inspired Speed & Smart Telemetry',
    batteryCapacityKwh: 5.2,
    rangeKm: 175,
    topSpeedKmh: 120,
    chargingTimeHours: 4.0,
    exShowroomPriceINR: 165000,
    bookingAmountINR: 10000,
    voucherRedeemLimitINR: 30000,
    imageUrl: '/images/bikes/apex-sport.svg',
    isAvailable: true,
  },
];

export default function HomePage() {
  const [bikes, setBikes] = useState<any[]>(DEFAULT_VERIFIED_BIKES);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBikes();
  }, []);

  const loadBikes = async () => {
    try {
      const data = await fetchApi<any[]>('/ev-bikes');
      if (Array.isArray(data) && data.length > 0) {
        setBikes(data);
      }
    } catch (err) {
      console.warn('Note: loaded default verified product models', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      <Navbar />

      {/* =========================================================================
          TASK 1 — HERO SECTION
          Approved Classic Corporate Light Theme
          Headline: "Ride Electric. Drive the Future."
          ========================================================================= */}
      <section className="bg-[#F7F9FC] border-b border-slate-200 py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#253247] leading-tight">
                Ride Electric. Drive the Future.
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                Discover smart electric motorcycles designed for everyday journeys. Explore our EV collection and enjoy a simpler way to ride.
              </p>

              {/* Action Buttons: Primary + Secondary */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                <Link
                  href="/bikes"
                  className="min-h-[48px] px-7 py-3 rounded-lg bg-[#165DAD] hover:bg-[#124B8D] text-white text-base font-semibold transition-colors shadow-sm inline-flex items-center justify-center gap-2"
                >
                  <span>Explore EV Bikes</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href="#membership"
                  className="min-h-[48px] text-base font-semibold text-slate-700 hover:text-[#165DAD] transition-colors inline-flex items-center justify-center gap-1.5"
                >
                  <span>Learn More</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>
              </div>
            </div>

            {/* Right Hero Motorcycle Visual */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-7 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-xs font-bold text-[#165DAD] uppercase tracking-wider">
                    Featured Concept Model
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase bg-[#F7F9FC] px-2 py-0.5 rounded border border-slate-200">
                    Pre-Production
                  </span>
                </div>
                <div className="py-4">
                  <img
                    src="/images/bikes/thunder-pro.svg"
                    alt="ASKR Thunder Pro Electric Motorcycle Concept"
                    className="w-full h-auto max-h-[260px] object-contain"
                  />
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold text-sm text-[#253247]">ASKR Thunder Pro</span>
                  <span className="text-xs font-medium">135 km Range • 95 km/h Top Speed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          TASK 3 — FEATURED EV MOTORCYCLES
          Clean product cards + fallback / coming soon state
          ========================================================================= */}
      <section className="py-16 md:py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#253247]">
                Featured EV Motorcycles
              </h2>
              <p className="text-base text-slate-500 mt-2 max-w-lg leading-relaxed">
                Explore our collection of electric motorcycles designed for daily commuting and high-efficiency performance.
              </p>
            </div>
            <Link
              href="/bikes"
              className="text-sm font-semibold text-[#165DAD] hover:text-[#124B8D] flex items-center gap-1 self-start md:self-auto min-h-[44px]"
            >
              <span>View All Models</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 h-96 p-6 animate-pulse space-y-4">
                  <div className="h-44 bg-slate-100 rounded-lg" />
                  <div className="h-5 bg-slate-100 rounded w-2/3" />
                  <div className="h-4 bg-slate-100 rounded w-1/2" />
                  <div className="h-9 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          ) : bikes && bikes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {bikes.map((bike) => (
                <BikeCard key={bike.id} bike={bike} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 px-4 bg-[#F7F9FC] rounded-xl border border-slate-200">
              <Bike className="w-12 h-12 text-[#165DAD] mx-auto mb-3" />
              <h3 className="text-xl font-bold text-[#253247]">Models Coming Soon</h3>
              <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
                Our engineering team is finalizing production specifications for new electric motorcycle models. Check back soon.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* =========================================================================
          TASK 5 — MEMBERSHIP CARDS
          Three clear plans: Free (₹0), Basic (₹3,000), Full (₹33,000 with ₹30,000 voucher)
          Simple descriptions and benefits, no exaggerated financial claims.
          ========================================================================= */}
      <section id="membership" className="py-16 md:py-20 bg-[#F7F9FC] border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#253247]">
              Customer Membership Plans
            </h2>
            <p className="text-base text-slate-500 mt-2 leading-relaxed">
              Transparent platform participation options. Free registration allows you to explore models, while active membership provides verified community referral benefits.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* 1. Free Account */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 flex flex-col justify-between shadow-sm">
              <div className="space-y-4">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Registration
                </div>
                <h3 className="text-2xl font-bold text-[#253247]">Free Account</h3>
                <div className="text-3xl sm:text-4xl font-bold text-[#253247]">₹0</div>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Join the platform with zero enrollment fee. Generate your unique Member ID and explore the vehicle catalog.
                </p>

                <ul className="space-y-3 pt-3 text-sm text-slate-600 border-t border-slate-100">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-[#15803D] shrink-0" />
                    <span>Unique ASKR Member ID</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-[#15803D] shrink-0" />
                    <span>Personal dashboard access</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-[#15803D] shrink-0" />
                    <span>Explore vehicle collection & specs</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6">
                <Link
                  href="/auth/register"
                  className="w-full min-h-[46px] py-3 rounded-lg border border-slate-300 hover:border-slate-400 text-slate-700 text-center text-sm font-semibold transition-colors flex items-center justify-center"
                >
                  Register Free
                </Link>
              </div>
            </div>

            {/* 2. Basic Membership */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 flex flex-col justify-between shadow-sm">
              <div className="space-y-4">
                <div className="text-xs font-semibold text-[#165DAD] uppercase tracking-wider">
                  Community Active
                </div>
                <h3 className="text-2xl font-bold text-[#253247]">Basic Membership</h3>
                <div className="text-3xl sm:text-4xl font-bold text-[#253247]">₹3,000</div>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Platform membership activation for community members participating in direct referral sponsorship.
                </p>

                <ul className="space-y-3 pt-3 text-sm text-slate-600 border-t border-slate-100">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-[#15803D] shrink-0" />
                    <span>Active community membership status</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-[#15803D] shrink-0" />
                    <span>Direct referral commission eligibility</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-[#15803D] shrink-0" />
                    <span>Upgrade to Full Membership anytime</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6">
                <Link
                  href="/auth/register"
                  className="w-full min-h-[46px] py-3 rounded-lg border border-[#165DAD] text-[#165DAD] hover:bg-blue-50 text-center text-sm font-semibold transition-colors flex items-center justify-center"
                >
                  Join Basic
                </Link>
              </div>
            </div>

            {/* 3. Full Membership */}
            <div className="bg-white rounded-xl border-2 border-[#165DAD] p-6 sm:p-8 flex flex-col justify-between shadow-md relative">
              <div className="space-y-4">
                <div className="text-xs font-bold text-[#165DAD] uppercase tracking-wider">
                  Full Qualified
                </div>
                <h3 className="text-2xl font-bold text-[#253247]">Full Membership</h3>
                <div className="text-3xl sm:text-4xl font-bold text-[#253247]">₹33,000</div>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Complete membership tier providing a ₹30,000 vehicle shopping voucher credit alongside full platform benefits.
                </p>

                <ul className="space-y-3 pt-3 text-sm text-slate-700 border-t border-slate-100 font-medium">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-[#15803D] shrink-0" />
                    <span>₹30,000 Shopping Voucher credit included</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-[#15803D] shrink-0" />
                    <span>Immediate Full Qualified status</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-[#15803D] shrink-0" />
                    <span>Eligible for binary matching rewards</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6">
                <Link
                  href="/auth/register"
                  className="w-full min-h-[46px] py-3 rounded-lg bg-[#165DAD] hover:bg-[#124B8D] text-white text-center text-sm font-semibold transition-colors flex items-center justify-center shadow-sm"
                >
                  Join Full Membership
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          TASK 6 — WHY ASKR EV (AUDITED HONEST CLAIMS)
          Removed unverified warranty/network claims.
          Focused on verified engineering highlights and compliance.
          ========================================================================= */}
      <section id="why-askr" className="py-16 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#253247]">
              Why Choose ASKR EV
            </h2>
            <p className="text-base text-slate-500 mt-2 leading-relaxed">
              Thoughtful electric motorcycle engineering backed by transparent platform standards.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-6 rounded-xl bg-[#F7F9FC] border border-slate-200 space-y-3">
              <Gauge className="w-6 h-6 text-[#165DAD]" />
              <h3 className="text-lg font-bold text-[#253247]">PMSM Powertrain</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Permanent Magnet Synchronous Motors deliver immediate torque response with high electrical efficiency.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-[#F7F9FC] border border-slate-200 space-y-3">
              <BatteryCharging className="w-6 h-6 text-[#165DAD]" />
              <h3 className="text-lg font-bold text-[#253247]">Lithium Battery Architecture</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                High-density cell engineering paired with an intelligent battery management system (BMS) for safety and thermal monitoring.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-[#F7F9FC] border border-slate-200 space-y-3">
              <ShieldCheck className="w-6 h-6 text-[#165DAD]" />
              <h3 className="text-lg font-bold text-[#253247]">Regulatory Compliance</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Strict adherence to Indian direct selling guidelines with zero compulsory vehicle purchase requirements.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-[#F7F9FC] border border-slate-200 space-y-3">
              <Headphones className="w-6 h-6 text-[#165DAD]" />
              <h3 className="text-lg font-bold text-[#253247]">Platform Support</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Dedicated digital customer service for vehicle reservations, voucher balance inquiries, and membership assistance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. HOW EV BOOKING WORKS
          ========================================================================= */}
      <section className="py-16 md:py-20 bg-[#F7F9FC] border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#253247]">
              How EV Booking Works
            </h2>
            <p className="text-base text-slate-500 mt-2 leading-relaxed">
              Three straightforward steps from selecting your electric motorcycle to confirmed vehicle order.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 sm:p-7 rounded-xl border border-slate-200 space-y-2.5">
              <div className="w-9 h-9 rounded-full bg-blue-50 text-[#165DAD] font-bold text-base flex items-center justify-center">
                1
              </div>
              <h3 className="text-lg font-bold text-[#253247]">Select Your Motorcycle</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Browse our EV fleet, review full engineering specifications, and select the motorcycle suited to your daily commute.
              </p>
            </div>

            <div className="bg-white p-6 sm:p-7 rounded-xl border border-slate-200 space-y-2.5">
              <div className="w-9 h-9 rounded-full bg-blue-50 text-[#165DAD] font-bold text-base flex items-center justify-center">
                2
              </div>
              <h3 className="text-lg font-bold text-[#253247]">Reserve with Booking Token</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Pay the token reservation deposit. Active members can apply shopping vouchers towards eligible booking token deductions.
              </p>
            </div>

            <div className="bg-white p-6 sm:p-7 rounded-xl border border-slate-200 space-y-2.5">
              <div className="w-9 h-9 rounded-full bg-blue-50 text-[#165DAD] font-bold text-base flex items-center justify-center">
                3
              </div>
              <h3 className="text-lg font-bold text-[#253247]">Verification & Order Confirmation</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Our operations team verifies your booking reference and issues a formal confirmation receipt for vehicle delivery coordination.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
