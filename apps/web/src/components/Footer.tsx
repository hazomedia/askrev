'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowUpRight } from 'lucide-react';
import AskrLogo from './AskrLogo';
import { isAdminPreviewActive, isAdminUser } from '../lib/api';

export default function Footer() {
  const [isRealFleetPreview, setIsRealFleetPreview] = useState(false);

  useEffect(() => {
    const checkPreview = () => {
      setIsRealFleetPreview(isAdminPreviewActive() && isAdminUser());
    };
    checkPreview();
    window.addEventListener('askrev_preview_change', checkPreview);
    return () => window.removeEventListener('askrev_preview_change', checkPreview);
  }, []);

  return (
    <footer className="bg-gradient-to-r from-[#080B12] via-[#080B12]/95 to-[#080B12]/40 lg:bg-[#080B12]/90 backdrop-blur-md border-t border-white/10 text-[#AAB7C8] text-sm mt-auto relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Info & Identity */}
          <div className="lg:col-span-2 space-y-4">
            <AskrLogo theme="dark" size="md" variant="full" href="/" />
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
              {isRealFleetPreview ? (
                <>
                  <li>
                    <Link href="/bikes/askr-ev-s01?preview=true" className="hover:text-[#50D9FF] transition-colors">
                      ASKR EV S01 (Urban)
                    </Link>
                  </li>
                  <li>
                    <Link href="/bikes/askr-ev-s02?preview=true" className="hover:text-[#50D9FF] transition-colors">
                      ASKR EV S02 (Commuter)
                    </Link>
                  </li>
                  <li>
                    <Link href="/bikes/askr-ev-s03?preview=true" className="hover:text-[#50D9FF] transition-colors">
                      ASKR EV S03 (Performance)
                    </Link>
                  </li>
                  <li>
                    <Link href="/scooters?preview=true" className="text-[#267DFF] font-semibold hover:underline inline-flex items-center gap-1">
                      <span>All Scooters (6 Models)</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link href="/scooters" className="hover:text-[#50D9FF] transition-colors">
                      Urban Electric Scooters
                    </Link>
                  </li>
                  <li>
                    <Link href="/scooters" className="hover:text-[#50D9FF] transition-colors">
                      Long-Range Commuters
                    </Link>
                  </li>
                  <li>
                    <Link href="/scooters" className="text-[#267DFF] font-semibold hover:underline inline-flex items-center gap-1">
                      <span>Explore Scooters</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Column 2: Electric Motorcycles & Utility */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#F7FAFF] uppercase tracking-wider">
              {isRealFleetPreview ? 'Bikes & Utility' : 'Electric Bikes'}
            </h4>
            <ul className="space-y-2 text-xs">
              {isRealFleetPreview ? (
                <>
                  <li>
                    <Link href="/bikes/askr-ev-b01?preview=true" className="hover:text-[#50D9FF] transition-colors">
                      ASKR EV B01 (Sport Motorcycle)
                    </Link>
                  </li>
                  <li>
                    <Link href="/bikes/askr-ev-u01?preview=true" className="hover:text-[#50D9FF] transition-colors">
                      ASKR EV U01 (Heavy Utility)
                    </Link>
                  </li>
                  <li>
                    <Link href="/bikes/askr-ev-u02?preview=true" className="hover:text-[#50D9FF] transition-colors">
                      ASKR EV U02 (Delivery Carrier)
                    </Link>
                  </li>
                  <li>
                    <Link href="/bikes?preview=true" className="text-[#267DFF] font-semibold hover:underline inline-flex items-center gap-1">
                      <span>Explore Lineup</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link href="/bikes" className="hover:text-[#50D9FF] transition-colors">
                      Electric Motorcycles
                    </Link>
                  </li>
                  <li>
                    <Link href="/utility" className="hover:text-[#50D9FF] transition-colors">
                      Electric Utility Vehicles
                    </Link>
                  </li>
                  <li>
                    <Link href="/bikes" className="text-[#267DFF] font-semibold hover:underline inline-flex items-center gap-1">
                      <span>Explore Bikes</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Column 3: All-Terrain & Account Portal */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#F7FAFF] uppercase tracking-wider">
              {isRealFleetPreview ? 'Jeeps & Portal' : 'Showroom & Portal'}
            </h4>
            <ul className="space-y-2 text-xs">
              {isRealFleetPreview ? (
                <>
                  <li>
                    <Link href="/bikes/askr-ev-j01?preview=true" className="hover:text-[#50D9FF] transition-colors">
                      ASKR EV J01 (4x4 Off-Road)
                    </Link>
                  </li>
                  <li>
                    <Link href="/bikes/askr-ev-j02?preview=true" className="hover:text-[#50D9FF] transition-colors">
                      ASKR EV J02 (Safari 4x4)
                    </Link>
                  </li>
                  <li>
                    <Link href="/bikes/askr-ev-j03?preview=true" className="hover:text-[#50D9FF] transition-colors">
                      ASKR EV J03 (Monster Edition)
                    </Link>
                  </li>
                  <li>
                    <a
                      href={
                        typeof window !== 'undefined' &&
                        (window.location.hostname === 'askrevdrive.com' || window.location.hostname.endsWith('.askrevdrive.com')) &&
                        !window.location.hostname.startsWith('admin.')
                          ? 'https://admin.askrevdrive.com/admin'
                          : '/admin'
                      }
                      className="hover:text-[#50D9FF] transition-colors"
                    >
                      Admin Portal
                    </a>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link href="/jeeps" className="hover:text-[#50D9FF] transition-colors">
                      All-Terrain 4x4 Electric Jeeps
                    </Link>
                  </li>
                  <li>
                    <Link href="/cycles" className="hover:text-[#50D9FF] transition-colors">
                      Electric Commuter Cycles
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
                </>
              )}
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
