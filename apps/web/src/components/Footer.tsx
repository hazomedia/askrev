import React from 'react';
import Link from 'next/link';
import { Zap, ShieldCheck, Phone, Mail, MapPin, ExternalLink, Award, FileText } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-navy-950 border-t border-navy-800 text-slate-400 text-sm mt-auto">
      {/* Upper Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-electric-600 to-electric-400 flex items-center justify-center text-white shadow-md shadow-electric-500/20">
                <Zap className="w-5 h-5 fill-white text-white" />
              </div>
              <span className="text-xl font-black tracking-wider text-white">
                ASKR <span className="text-electric-400">EV</span>
              </span>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
              Engineering India's next-generation electric mobility ecosystem. High-torque zero-emission motorbikes, transparent direct community rewards, and verified shopping voucher commerce.
            </p>
            <div className="pt-2 flex items-center gap-3 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-navy-900 border border-navy-700 text-emerald-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" /> Direct Selling Compliant
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-navy-900 border border-navy-700 text-electric-400 font-medium">
                ISO 9001:2015 Spec
              </span>
            </div>
          </div>

          {/* EV Fleet Links */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-white uppercase tracking-wider">EV Superbikes</div>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/bikes" className="hover:text-electric-400 transition-colors">
                  ASKR Thunder Pro
                </Link>
              </li>
              <li>
                <Link href="/bikes" className="hover:text-electric-400 transition-colors">
                  ASKR City Cruise
                </Link>
              </li>
              <li>
                <Link href="/bikes" className="hover:text-electric-400 transition-colors">
                  ASKR Apex Sport
                </Link>
              </li>
              <li>
                <Link href="/bikes" className="hover:text-electric-400 transition-colors">
                  Compare Specifications
                </Link>
              </li>
            </ul>
          </div>

          {/* Membership & Network */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-white uppercase tracking-wider">Membership & Portal</div>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/#membership" className="hover:text-electric-400 transition-colors">
                  Membership Plans
                </Link>
              </li>
              <li>
                <Link href="/auth/register" className="hover:text-electric-400 transition-colors">
                  Free Member Registration
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-electric-400 transition-colors">
                  Member Portal
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-electric-400 transition-colors">
                  Referral Program
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-electric-400 transition-colors">
                  Shopping Vouchers
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Governance */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-white uppercase tracking-wider">Compliance & Trust</div>
            <ul className="space-y-2 text-xs text-slate-400 leading-relaxed">
              <li className="flex items-start gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Zero compulsory enrollment purchases required for registration.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Vouchers are non-cash liabilities redeemable against genuine commerce.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Strict double-entry financial ledger accounting.</span>
              </li>
              <li className="pt-2">
                <Link href="/simulator" className="text-[11px] text-slate-500 hover:text-slate-300 underline flex items-center gap-1">
                  <span>Internal Testing & QA Simulator</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-navy-800/80 bg-navy-950/80 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            &copy; 2026 <span className="font-bold text-slate-300">ASKR EV Mobility Private Limited</span>. All rights reserved.
          </div>
          <div className="flex flex-wrap items-center gap-4 text-slate-400">
            <span>Currency: INR (₹)</span>
            <span>•</span>
            <span>Timezone: Asia/Kolkata</span>
            <span>•</span>
            <span className="text-emerald-400">Direct Selling Guidelines Compliant</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
