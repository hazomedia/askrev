'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, ShieldCheck, BatteryCharging, Gauge, Wrench, ChevronRight } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BikeCard from '../components/BikeCard';
import { fetchApi } from '../lib/api';

export default function HomePage() {
  const [bikes, setBikes] = useState<any[]>([]);

  useEffect(() => {
    loadBikes();
  }, []);

  const loadBikes = async () => {
    try {
      const data = await fetchApi<any[]>('/ev-bikes');
      setBikes(data);
    } catch (err) {
      console.error('Failed to load bikes', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      <Navbar />

      {/* 1. Hero Section - Clean, Light, Professional */}
      <section className="bg-[#F7F9FC] border-b border-slate-200 py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-blue-50 border border-blue-200 text-[#165DAD] text-xs font-semibold">
                Electric Automobile Engineering
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#253247] leading-tight">
                High-Performance Electric Motorcycles for Modern India
              </h1>

              <p className="text-base text-slate-600 leading-relaxed max-w-xl">
                Experience zero-emission urban transit engineered with high-torque PMSM electric powertrains, long-range battery architectures, and verified customer membership benefits.
              </p>

              {/* One Primary CTA and One Secondary Link */}
              <div className="pt-2 flex flex-wrap items-center gap-5">
                <Link
                  href="/bikes"
                  className="px-6 py-3 rounded-lg bg-[#165DAD] hover:bg-[#124B8D] text-white text-sm font-semibold transition-colors shadow-sm inline-flex items-center gap-2"
                >
                  <span>Explore EV Bikes</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href="#why-askr"
                  className="text-sm font-semibold text-slate-700 hover:text-[#165DAD] transition-colors inline-flex items-center gap-1.5"
                >
                  <span>Learn More</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>
              </div>
            </div>

            {/* Right Hero Motorcycle Visual */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <img
                  src="/images/bikes/thunder-pro.svg"
                  alt="ASKR Thunder Pro Electric Motorcycle"
                  className="w-full h-auto object-contain"
                />
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold text-[#253247]">ASKR Thunder Pro</span>
                  <span>135 km Range • 95 km/h</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Featured EV Bikes Section */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#253247]">
                Featured EV Motorcycles
              </h2>
              <p className="text-sm text-slate-500 mt-1 max-w-lg">
                Explore our commercial lineup of electric two-wheelers designed for daily commuting and high-torque performance.
              </p>
            </div>
            <Link
              href="/bikes"
              className="text-sm font-semibold text-[#165DAD] hover:text-[#124B8D] flex items-center gap-1 self-start md:self-auto"
            >
              <span>View All Models</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {bikes.map((bike) => (
              <BikeCard key={bike.id} bike={bike} />
            ))}
          </div>
        </div>
      </section>

      {/* 3. Simple Membership Overview Section */}
      <section id="membership" className="py-16 md:py-20 bg-[#F7F9FC] border-t border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#253247]">
              Customer Membership Plans
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              Transparent platform participation options. Free registration allows you to browse models, while active membership provides verified community referral benefits.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Free Registration */}
            <div className="bg-white rounded-xl border border-slate-200 p-8 flex flex-col justify-between shadow-sm">
              <div className="space-y-4">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Registration
                </div>
                <h3 className="text-xl font-bold text-[#253247]">Free Account</h3>
                <div className="text-3xl font-bold text-[#253247]">₹0</div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Join the platform with zero enrollment fee. Generate your unique Member ID and explore the vehicle catalog.
                </p>

                <ul className="space-y-2.5 pt-2 text-xs text-slate-600 border-t border-slate-100">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#15803D] shrink-0" />
                    <span>Unique Member ID (ASKR-XXXXXX)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#15803D] shrink-0" />
                    <span>Personal dashboard & referral link</span>
                  </li>
                  <li className="flex items-center gap-2 text-slate-400">
                    <span className="w-4 text-center">•</span>
                    <span>No income eligibility until activation</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6">
                <Link
                  href="/auth/register"
                  className="w-full py-2.5 rounded-lg border border-slate-300 hover:border-slate-400 text-slate-700 text-center text-xs font-semibold transition-colors block"
                >
                  Register Free
                </Link>
              </div>
            </div>

            {/* Basic Membership */}
            <div className="bg-white rounded-xl border border-slate-200 p-8 flex flex-col justify-between shadow-sm">
              <div className="space-y-4">
                <div className="text-xs font-semibold text-[#165DAD] uppercase tracking-wider">
                  Network Active
                </div>
                <h3 className="text-xl font-bold text-[#253247]">Basic Membership</h3>
                <div className="text-3xl font-bold text-[#253247]">₹3,000</div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Platform activation fee. Qualify for basic direct sponsor commissions with upgrade flexibility.
                </p>

                <ul className="space-y-2.5 pt-2 text-xs text-slate-600 border-t border-slate-100">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#15803D] shrink-0" />
                    <span>Active sponsor network status</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#15803D] shrink-0" />
                    <span>Direct Sponsor Income eligibility</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#15803D] shrink-0" />
                    <span>Upgrade to Full Membership anytime</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6">
                <Link
                  href="/auth/register"
                  className="w-full py-2.5 rounded-lg border border-[#165DAD] text-[#165DAD] hover:bg-blue-50 text-center text-xs font-semibold transition-colors block"
                >
                  Join Basic
                </Link>
              </div>
            </div>

            {/* Full Membership */}
            <div className="bg-white rounded-xl border-2 border-[#165DAD] p-8 flex flex-col justify-between shadow-md relative">
              <div className="space-y-4">
                <div className="text-xs font-bold text-[#165DAD] uppercase tracking-wider">
                  Full Qualified
                </div>
                <h3 className="text-xl font-bold text-[#253247]">Full Membership</h3>
                <div className="text-3xl font-bold text-[#253247]">₹33,000</div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Includes ₹30,000 Shopping Voucher credit and ₹3,000 platform fee. Immediate full qualification for all rewards.
                </p>

                <ul className="space-y-2.5 pt-2 text-xs text-slate-700 border-t border-slate-100 font-medium">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#15803D] shrink-0" />
                    <span>₹30,000 Shopping Voucher included</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#15803D] shrink-0" />
                    <span>Immediate Full Qualification status</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#15803D] shrink-0" />
                    <span>Eligible for Binary Matching Income</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6">
                <Link
                  href="/auth/register"
                  className="w-full py-2.5 rounded-lg bg-[#165DAD] hover:bg-[#124B8D] text-white text-center text-xs font-semibold transition-colors block shadow-sm"
                >
                  Join Full Membership
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Why ASKR EV Section */}
      <section id="why-askr" className="py-16 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#253247]">
              Why Choose ASKR EV
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              Automobile engineering excellence backed by verified customer support and transparent governance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-6 rounded-xl bg-[#F7F9FC] border border-slate-200 space-y-3">
              <Gauge className="w-6 h-6 text-[#165DAD]" />
              <h3 className="text-base font-bold text-[#253247]">PMSM Powertrain</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Permanent Magnet Synchronous Motors deliver immediate torque response with high electrical efficiency.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-[#F7F9FC] border border-slate-200 space-y-3">
              <BatteryCharging className="w-6 h-6 text-[#165DAD]" />
              <h3 className="text-base font-bold text-[#253247]">Lithium Battery Packs</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                High-density NMC and LFP cell architectures with thermal protection and 3-year warranty coverage.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-[#F7F9FC] border border-slate-200 space-y-3">
              <ShieldCheck className="w-6 h-6 text-[#165DAD]" />
              <h3 className="text-base font-bold text-[#253247]">Direct Selling Compliance</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Strict adherence to Indian direct selling guidelines with zero compulsory purchase requirements.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-[#F7F9FC] border border-slate-200 space-y-3">
              <Wrench className="w-6 h-6 text-[#165DAD]" />
              <h3 className="text-base font-bold text-[#253247]">Service Network</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Nationwide parts availability, over-the-air firmware updates, and scheduled door-step maintenance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. How EV Booking Works */}
      <section className="py-16 md:py-20 bg-[#F7F9FC] border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#253247]">
              How EV Booking Works
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              Three straightforward steps from selecting your electric motorcycle to confirmed vehicle delivery.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-2">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-[#165DAD] font-bold text-sm flex items-center justify-center">
                1
              </div>
              <h3 className="text-base font-bold text-[#253247]">Select Your Motorcycle</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Browse our EV fleet, review full engineering specifications, and select the motorcycle suited to your daily commute.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-2">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-[#165DAD] font-bold text-sm flex items-center justify-center">
                2
              </div>
              <h3 className="text-base font-bold text-[#253247]">Reserve with Booking Token</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Pay the token reservation deposit. Active members can apply shopping vouchers towards eligible booking token deductions.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-2">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-[#165DAD] font-bold text-sm flex items-center justify-center">
                3
              </div>
              <h3 className="text-base font-bold text-[#253247]">Delivery & Registration</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Our operations team verifies your booking reference, coordinates regional RTO registration, and schedules dealership delivery.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
