import React from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#F7F9FC] border-t border-[#E2E8F0] text-slate-600 text-sm mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#165DAD] flex items-center justify-center text-white font-black text-base">
                A
              </div>
              <span className="text-lg font-bold text-[#253247]">
                ASKR <span className="text-[#165DAD]">EV</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              ASKR EV Mobility Private Limited is an Indian electric automobile company developing sustainable electric motorcycles and verified consumer membership commerce.
            </p>
          </div>

          {/* EV Models */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#253247] uppercase tracking-wider">
              EV Models
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/bikes" className="hover:text-[#165DAD] transition-colors">
                  ASKR Thunder Pro
                </Link>
              </li>
              <li>
                <Link href="/bikes" className="hover:text-[#165DAD] transition-colors">
                  ASKR City Cruise
                </Link>
              </li>
              <li>
                <Link href="/bikes" className="hover:text-[#165DAD] transition-colors">
                  ASKR Apex Sport
                </Link>
              </li>
            </ul>
          </div>

          {/* Membership Portal */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#253247] uppercase tracking-wider">
              Membership Portal
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/#membership" className="hover:text-[#165DAD] transition-colors">
                  Membership Plans
                </Link>
              </li>
              <li>
                <Link href="/auth/register" className="hover:text-[#165DAD] transition-colors">
                  Free Registration
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-[#165DAD] transition-colors">
                  Customer Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Corporate Compliance */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#253247] uppercase tracking-wider">
              Governance & Compliance
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-500 leading-relaxed">
              <li>Direct selling guidelines compliant.</li>
              <li>Currency: INR (₹) • Timezone: Asia/Kolkata.</li>
              <li>Shopping vouchers are non-cash retail credits.</li>
              <li className="pt-2">
                <Link
                  href="/simulator"
                  className="text-[11px] text-slate-400 hover:text-slate-600 underline inline-flex items-center gap-1"
                >
                  <span>Internal Developer QA Tools</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-8 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            &copy; 2026 <strong className="text-slate-700">ASKR EV Mobility Private Limited</strong>. All rights reserved.
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span>Corporate CIN: U34100DL2026PTC123456</span>
            <span>•</span>
            <span>Made in India</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
