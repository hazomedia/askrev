'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowUpRight, Zap } from 'lucide-react';
import AskrLogo from './AskrLogo';

export default function Footer() {
  return (
    <footer className="bg-[#080A0D] border-t border-white/10 text-[#A7ADB5] text-sm mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Info & Identity */}
          <div className="lg:col-span-2 space-y-4">
            <AskrLogo theme="dark" size="lg" href="/" />
            <p className="text-sm text-[#A7ADB5] leading-relaxed max-w-sm">
              ASKR EV is an electric mobility platform pioneering high-performance electric motorcycles, lightweight urban cycles, and overland utility vehicles.
            </p>
            <div className="pt-2 text-xs text-slate-400 space-y-1">
              <div>
                Official Web Address:{' '}
                <a
                  href="https://www.askrevdrive.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:text-[#C9FF36] font-mono transition-colors"
                >
                  www.askrevdrive.com
                </a>
              </div>
              <div className="text-[11px] text-slate-400">
                Brand Name: <span className="text-slate-200 font-semibold">ASKR EV</span> (ASKR EV Mobility)
              </div>
            </div>
          </div>

          {/* EV Category: Electric Bikes */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>Electric Bikes</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Live
              </span>
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/bikes/ASKR-THUNDER-PRO" className="hover:text-white transition-colors">
                  ASKR Thunder Pro (135 km)
                </Link>
              </li>
              <li>
                <Link href="/bikes/ASKR-CITY-CRUISE" className="hover:text-white transition-colors">
                  ASKR City Cruise (90 km)
                </Link>
              </li>
              <li>
                <Link href="/bikes/ASKR-APEX-SPORT" className="hover:text-white transition-colors">
                  ASKR Apex Sport (175 km)
                </Link>
              </li>
              <li>
                <Link href="/bikes?category=bikes" className="text-[#38BDF8] hover:underline flex items-center gap-1">
                  <span>View All Bikes</span>
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
              </li>
            </ul>
          </div>

          {/* EV Category: Concept Series */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>Future Concepts</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-lime-500/10 text-[#C9FF36] border border-lime-500/20">
                Preview
              </span>
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/bikes?category=cycles" className="hover:text-white transition-colors">
                  Electric Cycles (AeroTrek Series)
                </Link>
              </li>
              <li>
                <Link href="/bikes?category=jeeps" className="hover:text-white transition-colors">
                  Electric Jeeps (TerraMax 4x4)
                </Link>
              </li>
              <li>
                <Link href="/bikes" className="hover:text-white transition-colors">
                  Vehicle Architecture & Specs
                </Link>
              </li>
              <li>
                <Link href="/simulator" className="hover:text-white transition-colors">
                  Mobility Commission Simulator
                </Link>
              </li>
            </ul>
          </div>

          {/* Membership Portal & Governance */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Platform & Community
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/dashboard" className="hover:text-[#C9FF36] transition-colors">
                  Member Portal
                </Link>
              </li>
              <li>
                <Link href="/auth/login" className="hover:text-white transition-colors">
                  Account Sign In
                </Link>
              </li>
              <li>
                <Link href="/auth/register" className="hover:text-white transition-colors">
                  Join Community
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-white transition-colors">
                  Admin Control Center
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Regulatory & Bottom Strip */}
        <div className="mt-14 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>
              ASKR EV &copy; {new Date().getFullYear()} ASKR EV Mobility. All rights reserved.
            </span>
          </div>

          <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-4">
            <span className="font-mono text-slate-400">
              Operating Mode: SIMULATION_ONLY
            </span>
            <span>•</span>
            <span>No Live Financial Settlements</span>
            <span>•</span>
            <a href="https://www.askrevdrive.com" className="text-slate-400 hover:text-white transition-colors">
              askrevdrive.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
