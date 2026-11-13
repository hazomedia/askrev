'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowUpRight } from 'lucide-react';
import AskrLogo from './AskrLogo';

export default function Footer() {
  return (
    <footer className="bg-[#080B12] border-t border-white/10 text-[#AAB7C8] text-sm mt-auto relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Info & Identity */}
          <div className="lg:col-span-2 space-y-4">
            <AskrLogo theme="dark" size="md" href="/" />
            <p className="text-xs text-[#AAB7C8] leading-relaxed max-w-sm">
              ASKR EV is an electric mobility company delivering high-efficiency electric scooters, performance motorcycles, urban electric cycles, and all-terrain electric utility vehicles.
            </p>
            <div className="pt-2 text-xs text-[#AAB7C8] space-y-1">
              <div>
                Official Website Address:{' '}
                <a
                  href="https://www.askrevdrive.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#50D9FF] font-semibold hover:underline"
                >
                  www.askrevdrive.com
                </a>
              </div>
              <div className="text-[11px] text-[#AAB7C8]/70">
                Brand Name: <span className="text-[#F7FAFF] font-medium">ASKR EV</span> (ASKR EV Mobility)
              </div>
            </div>
          </div>

          {/* Column 1: Electric Scooters */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#F7FAFF] uppercase tracking-wider">
              Electric Scooters
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/bikes/ASKR-S1-PRO" className="hover:text-[#50D9FF] transition-colors">
                  ASKR S1 Pro (195 km)
                </Link>
              </li>
              <li>
                <Link href="/bikes/ASKR-S1-AIR" className="hover:text-[#50D9FF] transition-colors">
                  ASKR S1 Air (151 km)
                </Link>
              </li>
              <li>
                <Link href="/scooters" className="text-[#267DFF] font-semibold hover:underline inline-flex items-center gap-1">
                  <span>Explore Scooters</span>
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Electric Motorcycles */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#F7FAFF] uppercase tracking-wider">
              Electric Bikes
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/bikes/ASKR-THUNDER-PRO" className="hover:text-[#50D9FF] transition-colors">
                  ASKR Thunder Pro (135 km)
                </Link>
              </li>
              <li>
                <Link href="/bikes/ASKR-CITY-CRUISE" className="hover:text-[#50D9FF] transition-colors">
                  ASKR City Cruise (90 km)
                </Link>
              </li>
              <li>
                <Link href="/bikes/ASKR-APEX-SPORT" className="hover:text-[#50D9FF] transition-colors">
                  ASKR Apex Sport (175 km)
                </Link>
              </li>
              <li>
                <Link href="/bikes" className="text-[#267DFF] font-semibold hover:underline inline-flex items-center gap-1">
                  <span>Explore Bikes</span>
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Cycles, Jeeps & Portal */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#F7FAFF] uppercase tracking-wider">
              Concepts & Portals
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/cycles" className="hover:text-[#50D9FF] transition-colors">
                  Electric Cycles (AeroTrek)
                </Link>
              </li>
              <li>
                <Link href="/jeeps" className="hover:text-[#50D9FF] transition-colors">
                  Electric Jeeps (TerraMax)
                </Link>
              </li>
              <li>
                <Link href="/auth/login" className="hover:text-[#50D9FF] transition-colors">
                  Sign In / Customer Portal
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-[#50D9FF] transition-colors">
                  Member Dashboard
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Compliance & Copyright Strip */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#AAB7C8]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>COMPLIANCE_MODE=SIMULATION_ONLY • No live banking or fiat settlement</span>
          </div>

          <div className="text-center sm:text-right">
            &copy; {new Date().getFullYear()} ASKR EV Mobility. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
