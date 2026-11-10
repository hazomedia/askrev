'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Zap,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Gauge,
  BatteryCharging,
  Cpu,
  Bike,
  Sparkles,
  Award,
  Layers,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import BikeCard from '../components/BikeCard';
import BookingModal from '../components/BookingModal';
import { fetchApi, getStoredUser } from '../lib/api';

export default function HomePage() {
  const [bikes, setBikes] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [selectedBike, setSelectedBike] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    loadBikes();
    loadProfile();
  }, []);

  const loadBikes = async () => {
    try {
      const data = await fetchApi<any[]>('/ev-bikes');
      setBikes(data);
    } catch (err) {
      console.error('Failed to load bikes', err);
    }
  };

  const loadProfile = async () => {
    const stored = getStoredUser();
    if (!stored) return;
    try {
      const profile = await fetchApi<any>('/auth/me');
      setUserProfile(profile);
    } catch (err) {
      console.error('Failed to load profile', err);
    }
  };

  const handleBook = (bike: any) => {
    setSelectedBike(bike);
    setModalOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      {/* Background radial gradient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[650px] gradient-glow pointer-events-none" />

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        {/* Quality Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-navy-900 border border-electric-500/30 text-electric-300 text-xs font-semibold mb-6 shadow-sm">
          <Zap className="w-4 h-4 text-electric-400 fill-electric-400" />
          <span>Next-Gen High-Torque Electric Mobility</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-5xl mx-auto leading-tight md:leading-tight">
          Pioneering the Future of <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-electric-400 via-emerald-400 to-electric-300">
            Electric Performance
          </span>
        </h1>

        {/* Subhead */}
        <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
          Experience hyper-responsive electric superbikes engineered for zero emissions, relentless torque, and integrated community commerce. Book your ride today and unlock verified member rewards.
        </p>

        {/* CTAs */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/bikes"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-electric-600 via-electric-500 to-emerald-500 hover:from-electric-500 hover:to-emerald-400 shadow-xl shadow-electric-500/25 transition-all flex items-center justify-center gap-2 group"
          >
            <Bike className="w-5 h-5" />
            <span>Explore EV Superbikes</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/auth/register"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-slate-200 bg-navy-900 hover:bg-navy-800 border border-navy-700 transition-all flex items-center justify-center gap-2"
          >
            <span>Register Free Account</span>
          </Link>
        </div>

        {/* Real-time Fleet Metrics Bar */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
          <div className="p-5 rounded-2xl bg-navy-900/70 border border-navy-700/60 backdrop-blur-md">
            <div className="text-3xl font-black text-white">175 <span className="text-base text-slate-400 font-semibold">km</span></div>
            <div className="text-xs text-slate-400 mt-1 font-medium">Max Range per Charge</div>
          </div>
          <div className="p-5 rounded-2xl bg-navy-900/70 border border-navy-700/60 backdrop-blur-md">
            <div className="text-3xl font-black text-electric-400">120 <span className="text-base text-slate-400 font-semibold">km/h</span></div>
            <div className="text-xs text-slate-400 mt-1 font-medium">Top Velocity Profile</div>
          </div>
          <div className="p-5 rounded-2xl bg-navy-900/70 border border-navy-700/60 backdrop-blur-md">
            <div className="text-3xl font-black text-emerald-400">₹30,000</div>
            <div className="text-xs text-slate-400 mt-1 font-medium">Shopping Voucher Benefit</div>
          </div>
          <div className="p-5 rounded-2xl bg-navy-900/70 border border-navy-700/60 backdrop-blur-md">
            <div className="text-3xl font-black text-purple-400">₹0 <span className="text-base text-slate-400 font-semibold">Fee</span></div>
            <div className="text-xs text-slate-400 mt-1 font-medium">Zero-Barrier Free Registration</div>
          </div>
        </div>
      </section>

      {/* Featured EV Fleet Showcase Section */}
      <section className="py-20 bg-navy-900/40 border-t border-navy-800/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <div className="text-xs font-bold text-electric-400 uppercase tracking-widest">
                Precision Engineering
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white mt-1">
                The ASKR EV Fleet
              </h2>
              <p className="text-sm text-slate-400 mt-2 max-w-xl">
                Aerodynamic chassis, high-capacity lithium battery architectures, PMSM powertrain motors, and seamless app telemetry.
              </p>
            </div>
            <Link
              href="/bikes"
              className="text-sm font-bold text-electric-400 hover:text-electric-300 flex items-center gap-1.5 transition-colors self-start md:self-auto"
            >
              <span>View All Specifications</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Bikes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {bikes.map((bike) => (
              <BikeCard
                key={bike.id}
                bike={bike}
                onBook={handleBook}
                userVoucherINR={userProfile?.wallet?.shoppingVoucherINR || 0}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Transparent Membership Packages Section */}
      <section id="membership" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
            Community & Direct Participation
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white mt-2">
            Transparent Membership Plans
          </h2>
          <p className="mt-3 text-sm text-slate-400 leading-relaxed">
            Choose your participation level. Start free with zero fee obligation, or activate full membership to access genuine retail shopping vouchers and referral network rewards.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Plan 1: Free Registration */}
          <div className="card-gradient rounded-3xl p-8 flex flex-col justify-between border-navy-700/80 hover:border-slate-500 transition-all">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Explorer
              </div>
              <h3 className="text-2xl font-black text-white mt-1">Free Registration</h3>
              <div className="mt-4 flex items-baseline">
                <span className="text-4xl font-black text-white">₹0</span>
                <span className="ml-2 text-xs text-slate-400">Zero mandatory fee</span>
              </div>
              <p className="mt-3 text-xs text-slate-300 leading-relaxed">
                Join the platform with zero risk. Generate a verified Member ID and explore our electric vehicle lineup and community.
              </p>

              <div className="mt-6 space-y-3">
                <div className="flex items-start text-xs text-slate-300 gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Unique Member ID (ASKR-XXXXXX)</span>
                </div>
                <div className="flex items-start text-xs text-slate-300 gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Personal dashboard & referral link</span>
                </div>
                <div className="flex items-start text-xs text-slate-300 gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Browse complete EV bike catalog</span>
                </div>
                <div className="flex items-start text-xs text-slate-400 gap-2.5 pt-1 border-t border-navy-800">
                  <span className="text-slate-500">•</span>
                  <span>No income eligibility until qualifying activation</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4">
              <Link
                href="/auth/register"
                className="w-full py-3.5 rounded-xl font-bold text-xs text-center text-slate-200 bg-navy-800 hover:bg-navy-700 border border-navy-600 transition-colors block"
              >
                Register Free
              </Link>
            </div>
          </div>

          {/* Plan 2: Basic Membership */}
          <div className="card-gradient rounded-3xl p-8 flex flex-col justify-between border-electric-500/30 hover:border-electric-500/60 transition-all">
            <div>
              <div className="text-xs font-bold text-electric-400 uppercase tracking-wider">
                Community Builder
              </div>
              <h3 className="text-2xl font-black text-white mt-1">Basic Membership</h3>
              <div className="mt-4 flex items-baseline">
                <span className="text-4xl font-black text-white">₹3,000</span>
                <span className="ml-2 text-xs text-slate-400">One-time platform fee</span>
              </div>
              <p className="mt-3 text-xs text-slate-300 leading-relaxed">
                Activate your membership in the sponsor network to begin qualifying for basic direct community commissions.
              </p>

              <div className="mt-6 space-y-3">
                <div className="flex items-start text-xs text-slate-300 gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Full activation in sponsor network</span>
                </div>
                <div className="flex items-start text-xs text-slate-300 gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Eligible for Basic Direct Sponsor Income</span>
                </div>
                <div className="flex items-start text-xs text-slate-300 gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Upgrade option available anytime</span>
                </div>
                <div className="flex items-start text-xs text-slate-400 gap-2.5 pt-1 border-t border-navy-800">
                  <span className="text-slate-500">•</span>
                  <span>No binary matching income until Full Qualified</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4">
              <Link
                href="/auth/register"
                className="w-full py-3.5 rounded-xl font-bold text-xs text-center text-white bg-navy-800 hover:bg-navy-700 border border-electric-500/40 transition-colors block"
              >
                Join as Basic Member
              </Link>
            </div>
          </div>

          {/* Plan 3: Full Membership (Featured) */}
          <div className="relative rounded-3xl p-8 flex flex-col justify-between bg-gradient-to-b from-navy-800 via-navy-900 to-navy-950 border-2 border-electric-400 shadow-2xl shadow-electric-500/10">
            {/* Value Badge */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-electric-500 to-emerald-400 text-navy-950 font-black text-[11px] uppercase tracking-wider shadow-md">
              Complete Package
            </div>

            <div>
              <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Executive Qualified
              </div>
              <h3 className="text-2xl font-black text-white mt-1">Full Membership</h3>
              <div className="mt-4 flex items-baseline">
                <span className="text-4xl font-black text-white">₹33,000</span>
                <span className="ml-2 text-xs text-slate-400">Total package</span>
              </div>
              <div className="text-[11px] text-emerald-400 font-bold mt-1">
                Includes ₹30,000 Shopping Voucher + ₹3,000 Platform Fee
              </div>
              <p className="mt-3 text-xs text-slate-300 leading-relaxed">
                Immediate Full Qualification status with ₹30,000 shopping voucher credit, direct sponsor eligibility, and binary matching income.
              </p>

              <div className="mt-6 space-y-3">
                <div className="flex items-start text-xs text-white gap-2.5 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>₹30,000 Shopping Voucher included</span>
                </div>
                <div className="flex items-start text-xs text-white gap-2.5 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Immediate Full Qualification status</span>
                </div>
                <div className="flex items-start text-xs text-white gap-2.5 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Eligible for ₹10,000 Full Sponsor Income</span>
                </div>
                <div className="flex items-start text-xs text-white gap-2.5 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Eligible for Binary Matching Income</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4">
              <Link
                href="/auth/register"
                className="w-full py-3.5 rounded-xl font-bold text-xs text-center text-white bg-gradient-to-r from-electric-600 via-electric-500 to-emerald-500 hover:from-electric-500 hover:to-emerald-400 shadow-lg shadow-electric-500/25 transition-all block"
              >
                Join as Full Member
              </Link>
            </div>
          </div>
        </div>

        {/* Regulatory & Ethical Compliance Note */}
        <div className="mt-12 p-6 rounded-2xl bg-navy-900/60 border border-navy-800 text-xs text-slate-400 flex flex-col sm:flex-row items-center gap-4">
          <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0" />
          <div className="leading-relaxed">
            <span className="font-bold text-slate-200">Consumer Protection Disclosure: </span>
            ASKR EV complies with Indian direct selling rules. Membership does not guarantee income. Rewards require legitimate qualifying sales of EV products and genuine consumer retail transactions. Shopping vouchers are promotional shopping credits and cannot be directly converted to cash.
          </div>
        </div>
      </section>

      {/* EV Mobility Ecosystem & Technology Highlights */}
      <section id="ecosystem" className="py-20 bg-navy-900/30 border-t border-navy-800/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="text-xs font-bold text-electric-400 uppercase tracking-widest">
              Integrated Innovation
            </div>
            <h2 className="text-3xl font-black text-white mt-1">
              Engineered for Modern Cities
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              Combining world-class hardware with real-time telemetry and seamless digital commerce.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-navy-900/60 border border-navy-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-electric-500/10 border border-electric-500/20 flex items-center justify-center text-electric-400">
                <BatteryCharging className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Smart Battery Management</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Multi-tier thermal regulation, high-density cell architecture, and 3-year warranty protection.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-navy-900/60 border border-navy-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Gauge className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Regenerative Braking</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Recovers kinetic energy during deceleration, providing smooth braking and extending urban commute range.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-navy-900/60 border border-navy-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">4G Cloud Telemetry</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Continuous diagnostics, GPS theft tracking, and over-the-air firmware updates straight to your bike.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-navy-900/60 border border-navy-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Verified Ledger</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                All booking receipts, voucher balances, and sponsor commissions recorded with double-entry precision.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Booking Modal */}
      <BookingModal
        bike={selectedBike}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        user={userProfile}
        onSuccess={() => {
          loadProfile();
        }}
      />
    </div>
  );
}
