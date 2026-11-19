'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldCheck, Eye, EyeOff, Sparkles, ExternalLink, RefreshCw } from 'lucide-react';
import { isAdminUser, isAdminPreviewActive, setAdminPreviewActive } from '../lib/api';

interface AdminPreviewBannerProps {
  onToggle?: (active: boolean) => void;
}

export default function AdminPreviewBanner({ onToggle }: AdminPreviewBannerProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [hasAuthSession, setHasAuthSession] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const admin = isAdminUser();
    const active = isAdminPreviewActive();
    setHasAuthSession(admin);
    setIsAdmin(admin || window.location.search.includes('preview=true'));
    setIsActive(active);

    const handlePreviewChange = () => {
      setHasAuthSession(isAdminUser());
      setIsActive(isAdminPreviewActive());
    };

    window.addEventListener('askrev_preview_change', handlePreviewChange);
    return () => window.removeEventListener('askrev_preview_change', handlePreviewChange);
  }, []);

  if (!mounted || !isAdmin) {
    return null;
  }

  const handleToggle = () => {
    const nextState = !isActive;
    setIsActive(nextState);
    setAdminPreviewActive(nextState);
    if (onToggle) {
      onToggle(nextState);
    }
  };

  return (
    <div className="relative z-50 bg-[#071329] border-b border-blue-500/30 text-white px-4 py-2 text-xs shadow-lg backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
        {/* Left Side: Status & Mode Indicator */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-[#50D9FF] font-bold text-[11px] border border-blue-500/40">
            <ShieldCheck className="w-3.5 h-3.5 text-[#50D9FF]" />
            <span>Admin Review Mode</span>
          </span>

          <div className="flex items-center gap-1.5 text-slate-300 text-[11px]">
            <span
              className={`w-2 h-2 rounded-full ${
                isActive && hasAuthSession ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="font-semibold text-[#F7FAFF]">
              {!hasAuthSession ? (
                'Unauthenticated: Sign in to authorize Real Fleet Preview'
              ) : isActive ? (
                'Real Fleet Active — 12 Real Models Displayed (Legacy Demos Excluded)'
              ) : (
                'Showing Public Showroom Only (Drafts Hidden)'
              )}
            </span>
          </div>
        </div>

        {/* Right Side: Toggle Switch or Login Link and Admin Catalog Link */}
        <div className="flex items-center gap-3">
          {!hasAuthSession ? (
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-[#267DFF] text-white hover:bg-blue-600 transition-all shadow-sm"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Log In as Admin</span>
            </Link>
          ) : (
            <button
              onClick={handleToggle}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-sm ${
                isActive
                  ? 'bg-[#267DFF] text-white hover:bg-blue-600 ring-1 ring-blue-400'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600'
              }`}
            >
              {isActive ? (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview: ON</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Preview: OFF</span>
                </>
              )}
            </button>
          )}

          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#50D9FF] hover:text-white transition-colors"
          >
            <span>Admin Catalog</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
