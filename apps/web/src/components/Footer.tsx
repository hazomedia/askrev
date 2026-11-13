'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowUpRight } from 'lucide-react';
import AskrLogo from './AskrLogo';

export default function Footer() {
  return (
    <footer className="bg-[#F8F9FA] border-t border-neutral-200 text-neutral-600 text-sm mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Info & Identity */}
          <div className="lg:col-span-2 space-y-4">
            <AskrLogo theme="light" size="md" href="/" />
            <p className="text-xs text-neutral-500 leading-relaxed max-w-sm">
              ASKR EV is an electric mobility company delivering high-efficiency electric scooters, performance motorcycles, urban electric cycles, and all-terrain electric utility vehicles.
            </p>
            <div className="pt-2 text-xs text-neutral-500 space-y-1">
              <div>
                Official Website Address:{' '}
                <a
                  href="https://www.askrevdrive.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-900 font-semibold hover:underline"
                >
                  www.askrevdrive.com
                </a>
              </div>
              <div className="text-[11px] text-neutral-400">
                Brand Name: <span className="text-neutral-700 font-medium">ASKR EV</span> (ASKR EV Mobility)
              </div>
            </div>
          </div>

          {/* Column 1: Electric Scooters */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
              Electric Scooters
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/bikes/ASKR-S1-PRO" className="hover:text-black transition-colors">
                  ASKR S1 Pro (195 km)
                </Link>
              </li>
              <li>
                <Link href="/bikes/ASKR-S1-AIR" className="hover:text-black transition-colors">
                  ASKR S1 Air (151 km)
                </Link>
              </li>
              <li>
                <Link href="/scooters" className="text-[#165DAD] font-semibold hover:underline inline-flex items-center gap-1">
                  <span>Explore Scooters</span>
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Electric Motorcycles */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
              Electric Bikes
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/bikes/ASKR-THUNDER-PRO" className="hover:text-black transition-colors">
                  ASKR Thunder Pro (135 km)
                </Link>
              </li>
              <li>
                <Link href="/bikes/ASKR-CITY-CRUISE" className="hover:text-black transition-colors">
                  ASKR City Cruise (90 km)
                </Link>
              </li>
              <li>
                <Link href="/bikes/ASKR-APEX-SPORT" className="hover:text-black transition-colors">
                  ASKR Apex Sport (175 km)
                </Link>
              </li>
              <li>
                <Link href="/bikes" className="text-[#165DAD] font-semibold hover:underline inline-flex items-center gap-1">
                  <span>Explore Bikes</span>
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Cycles, Jeeps & Portal */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
              Concepts & Portals
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/cycles" className="hover:text-black transition-colors">
                  Electric Cycles (AeroTrek)
                </Link>
              </li>
              <li>
                <Link href="/jeeps" className="hover:text-black transition-colors">
                  Electric Jeeps (TerraMax 4x4)
                </Link>
              </li>
              <li>
                <Link href="/auth/login" className="hover:text-black transition-colors">
                  Account Sign In
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-black transition-colors">
                  Customer Dashboard
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Regulatory & Bottom Strip */}
        <div className="mt-12 pt-6 border-t border-neutral-200 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              &copy; {new Date().getFullYear()} ASKR EV Mobility. All rights reserved.
            </span>
          </div>

          <div className="text-[11px] text-neutral-400 flex flex-wrap items-center gap-3">
            <span>Operating Mode: SIMULATION_ONLY</span>
            <span>•</span>
            <span>No Real Financial Transfers</span>
            <span>•</span>
            <a href="https://www.askrevdrive.com" className="text-neutral-600 hover:text-black font-mono">
              askrevdrive.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
