import Link from 'next/link';
import { Zap, ShieldCheck, ArrowRight, CheckCircle2, Bike, Award, TrendingUp, Cpu, Lock } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      {/* Background radial gradient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[550px] gradient-glow pointer-events-none" />

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-navy-800/90 border border-electric-500/30 text-electric-300 text-xs font-semibold mb-6 shadow-sm">
          <Zap className="w-3.5 h-3.5 text-electric-400 fill-electric-400" />
          <span>Next-Generation EV Commerce & FinTech Ledger</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-tight md:leading-tight">
          Powering Sustainable Transit with <span className="text-transparent bg-clip-text bg-gradient-to-r from-electric-400 via-emerald-400 to-electric-300">Verified Commerce</span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Book high-torque EV motorbikes, access exclusive shopping voucher liabilities, and experience a mathematical, double-entry financial simulation engine built for absolute regulatory compliance.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/auth/register"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-electric-600 via-electric-500 to-emerald-500 hover:from-electric-500 hover:to-emerald-400 shadow-lg shadow-electric-500/25 transition-all flex items-center justify-center gap-2"
          >
            <span>Register Free Account</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/simulator"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold text-slate-200 bg-navy-800 hover:bg-navy-700 border border-navy-600/60 transition-all flex items-center justify-center gap-2"
          >
            <Cpu className="w-4 h-4 text-emerald-400" />
            <span>Launch Commission Simulator</span>
          </Link>
        </div>

        {/* Quick Highlights */}
        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
          <div className="p-4 rounded-xl bg-navy-900/60 border border-navy-700/50 backdrop-blur-sm">
            <div className="text-2xl font-black text-white">₹0</div>
            <div className="text-xs text-slate-400 mt-1">Zero-barrier Free Registration</div>
          </div>
          <div className="p-4 rounded-xl bg-navy-900/60 border border-navy-700/50 backdrop-blur-sm">
            <div className="text-2xl font-black text-electric-400">₹30,000</div>
            <div className="text-xs text-slate-400 mt-1">Shopping Voucher Entitlement</div>
          </div>
          <div className="p-4 rounded-xl bg-navy-900/60 border border-navy-700/50 backdrop-blur-sm">
            <div className="text-2xl font-black text-emerald-400">100%</div>
            <div className="text-xs text-slate-400 mt-1">Double-Entry Balanced Ledgers</div>
          </div>
          <div className="p-4 rounded-xl bg-navy-900/60 border border-navy-700/50 backdrop-blur-sm">
            <div className="text-2xl font-black text-amber-400">Locked</div>
            <div className="text-xs text-slate-400 mt-1">Simulation Mode (No Live Payouts)</div>
          </div>
        </div>
      </section>

      {/* Membership Packages Section */}
      <section className="py-16 bg-navy-900/40 border-t border-b border-navy-800/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-extrabold text-white">Transparent Membership Tiers</h2>
            <p className="mt-2 text-sm text-slate-400">
              Clear participation levels aligned with genuine commerce, platform fees, and shopping entitlements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {/* Free Registration */}
            <div className="card-gradient rounded-2xl p-6 flex flex-col justify-between border-navy-700 hover:border-slate-500 transition-all">
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Starter</div>
                <h3 className="text-xl font-bold text-white mt-1">Free Registration</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-3xl font-black text-white">₹0</span>
                  <span className="ml-2 text-xs text-slate-400">No mandatory fees</span>
                </div>
                <p className="mt-3 text-xs text-slate-300 leading-relaxed">
                  Join the platform with zero risk. Generate a unique Member ID and explore our electric vehicle lineup.
                </p>

                <div className="mt-6 space-y-2.5">
                  <div className="flex items-center text-xs text-slate-300 gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Unique Member ID (ASKR-XXXXXX)</span>
                  </div>
                  <div className="flex items-center text-xs text-slate-300 gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Personal dashboard & referral link</span>
                  </div>
                  <div className="flex items-center text-xs text-slate-400 gap-2">
                    <CheckCircle2 className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>No income eligibility until activation</span>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  href="/auth/register"
                  className="w-full block text-center py-2.5 px-4 rounded-xl font-semibold text-xs text-white bg-navy-800 hover:bg-navy-700 border border-navy-600 transition-colors"
                >
                  Create Free Account
                </Link>
              </div>
            </div>

            {/* Basic Membership */}
            <div className="card-gradient rounded-2xl p-6 flex flex-col justify-between border-electric-500/40 relative hover:border-electric-400 transition-all">
              <div className="absolute -top-3 right-6 px-2.5 py-0.5 rounded-full bg-electric-500 text-[10px] font-black uppercase tracking-wider text-navy-950">
                Network Active
              </div>
              <div>
                <div className="text-xs font-bold text-electric-400 uppercase tracking-widest">Active Partner</div>
                <h3 className="text-xl font-bold text-white mt-1">Basic Membership</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-3xl font-black text-white">₹3,000</span>
                  <span className="ml-2 text-xs text-slate-400">one-time platform fee</span>
                </div>
                <p className="mt-3 text-xs text-slate-300 leading-relaxed">
                  Active participant in the sponsor network. Generates ₹1,000 basic direct sponsor commission.
                </p>

                <div className="mt-6 space-y-2.5">
                  <div className="flex items-center text-xs text-slate-300 gap-2">
                    <CheckCircle2 className="w-4 h-4 text-electric-400 shrink-0" />
                    <span>Eligible for Basic Sponsor Rewards</span>
                  </div>
                  <div className="flex items-center text-xs text-slate-300 gap-2">
                    <CheckCircle2 className="w-4 h-4 text-electric-400 shrink-0" />
                    <span>1x ₹1,000 hold reserve mechanism</span>
                  </div>
                  <div className="flex items-center text-xs text-slate-300 gap-2">
                    <CheckCircle2 className="w-4 h-4 text-electric-400 shrink-0" />
                    <span>Full upgrade path via fee or retail shopping</span>
                  </div>
                  <div className="flex items-center text-xs text-slate-400 gap-2">
                    <CheckCircle2 className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>No binary matching until Full Qualified</span>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  href="/auth/register"
                  className="w-full block text-center py-2.5 px-4 rounded-xl font-semibold text-xs text-white bg-electric-600 hover:bg-electric-500 shadow-md shadow-electric-600/20 transition-all"
                >
                  Join Basic Partner
                </Link>
              </div>
            </div>

            {/* Full Membership */}
            <div className="card-gradient rounded-2xl p-6 flex flex-col justify-between border-emerald-500/40 relative hover:border-emerald-400 transition-all">
              <div className="absolute -top-3 right-6 px-2.5 py-0.5 rounded-full bg-emerald-500 text-[10px] font-black uppercase tracking-wider text-navy-950">
                Full Qualified
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Complete Mobility</div>
                <h3 className="text-xl font-bold text-white mt-1">Full Membership</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-3xl font-black text-white">₹33,000</span>
                  <span className="ml-2 text-xs text-slate-400">all-inclusive</span>
                </div>
                <div className="mt-2 text-[11px] text-emerald-300 font-semibold bg-emerald-500/10 px-2 py-1 rounded inline-block">
                  Includes ₹30,000 Shopping Voucher
                </div>
                <p className="mt-3 text-xs text-slate-300 leading-relaxed">
                  Immediate Full Qualification status with direct sponsor eligibility and binary matching potential.
                </p>

                <div className="mt-6 space-y-2.5">
                  <div className="flex items-center text-xs text-slate-300 gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>₹30,000 Shopping Voucher issued instantly</span>
                  </div>
                  <div className="flex items-center text-xs text-slate-300 gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Immediate Full Qualification</span>
                  </div>
                  <div className="flex items-center text-xs text-slate-300 gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Binary Matching Income (₹3,000/match)</span>
                  </div>
                  <div className="flex items-center text-xs text-slate-300 gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>₹10,000 Full Direct sponsor reward tier</span>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  href="/auth/register"
                  className="w-full block text-center py-2.5 px-4 rounded-xl font-semibold text-xs text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-md shadow-emerald-600/20 transition-all"
                >
                  Select Full Package
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* EV Bikes Teaser Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="text-xs font-bold text-electric-400 uppercase tracking-widest">Fleet & Hardware</div>
            <h2 className="text-3xl font-extrabold text-white mt-1">Flagship EV Motorbike Models</h2>
            <p className="mt-1 text-sm text-slate-400">
              High-torque brushless PMSM powertrains with intelligent battery thermal management.
            </p>
          </div>
          <Link
            href="/bikes"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-electric-400 hover:text-electric-300 transition-colors"
          >
            <span>Explore All 3 Models</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card-gradient rounded-2xl p-6 border-navy-700">
            <div className="h-36 rounded-xl bg-gradient-to-br from-navy-800 to-navy-950 flex items-center justify-center border border-navy-700/60 mb-4">
              <Bike className="w-16 h-16 text-electric-400" />
            </div>
            <h3 className="text-lg font-bold text-white">ASKR Thunder Pro</h3>
            <p className="text-xs text-slate-400 mt-1">High-Torque Performance Urban Commuter</p>
            <div className="mt-4 pt-4 border-t border-navy-800 grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-[10px] text-slate-500 uppercase">Range</div>
                <div className="text-sm font-bold text-white">135 km</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase">Top Speed</div>
                <div className="text-sm font-bold text-white">95 km/h</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase">Charge</div>
                <div className="text-sm font-bold text-white">3.5 hrs</div>
              </div>
            </div>
          </div>

          <div className="card-gradient rounded-2xl p-6 border-navy-700">
            <div className="h-36 rounded-xl bg-gradient-to-br from-navy-800 to-navy-950 flex items-center justify-center border border-navy-700/60 mb-4">
              <Bike className="w-16 h-16 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-white">ASKR City Cruise</h3>
            <p className="text-xs text-slate-400 mt-1">Ultra-Efficient Daily City Rider</p>
            <div className="mt-4 pt-4 border-t border-navy-800 grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-[10px] text-slate-500 uppercase">Range</div>
                <div className="text-sm font-bold text-white">90 km</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase">Top Speed</div>
                <div className="text-sm font-bold text-white">70 km/h</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase">Charge</div>
                <div className="text-sm font-bold text-white">2.8 hrs</div>
              </div>
            </div>
          </div>

          <div className="card-gradient rounded-2xl p-6 border-navy-700">
            <div className="h-36 rounded-xl bg-gradient-to-br from-navy-800 to-navy-950 flex items-center justify-center border border-navy-700/60 mb-4">
              <Bike className="w-16 h-16 text-amber-400" />
            </div>
            <h3 className="text-lg font-bold text-white">ASKR Apex Sport</h3>
            <p className="text-xs text-slate-400 mt-1">Track-Inspired Speed & Smart Telemetry</p>
            <div className="mt-4 pt-4 border-t border-navy-800 grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-[10px] text-slate-500 uppercase">Range</div>
                <div className="text-sm font-bold text-white">175 km</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase">Top Speed</div>
                <div className="text-sm font-bold text-white">120 km/h</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase">Charge</div>
                <div className="text-sm font-bold text-white">4.0 hrs</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Compliance Callout */}
      <section className="py-12 bg-navy-900 border-t border-navy-800 px-4">
        <div className="max-w-4xl mx-auto rounded-2xl p-6 bg-navy-950/80 border border-emerald-500/30 flex flex-col md:flex-row items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-lg font-bold text-white">Strict Legal Safety & Direct Selling Guardrails</h3>
            <p className="mt-1 text-xs text-slate-300 leading-relaxed">
              In accordance with the Consumer Protection (Direct Selling) Rules, 2021, all MLM matching payouts and withdrawable earnings are kept in SIMULATION_ONLY mode pending statutory audit and formal legal sign-off.
            </p>
          </div>
          <Link
            href="/simulator"
            className="shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-navy-800 hover:bg-navy-700 border border-navy-600 transition-colors"
          >
            Audit Simulator
          </Link>
        </div>
      </section>
    </div>
  );
}
