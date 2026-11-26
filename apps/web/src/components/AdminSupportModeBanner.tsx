'use client';

import React, { useState } from 'react';
import { LogOut, CheckCircle2 } from 'lucide-react';
import { exitAdminSupportSessionApi, clearSupportSession } from '../lib/api';

interface AdminSupportModeBannerProps {
  member: {
    fullName?: string;
    memberId?: string;
    email?: string;
  } | null;
  adminEmail?: string;
  reason?: string;
  consentReference?: string;
  expiresAt?: string;
  onExit?: () => void;
}

export default function AdminSupportModeBanner({
  member,
  onExit,
}: AdminSupportModeBannerProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [exitError, setExitError] = useState<string | null>(null);
  const [isTerminated, setIsTerminated] = useState(false);

  const handleExit = async () => {
    setIsExiting(true);
    setExitError(null);
    try {
      await exitAdminSupportSessionApi();
      clearSupportSession();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('askrev_user');
      }
      setIsTerminated(true);
      if (onExit) {
        onExit();
      }
      if (typeof window !== 'undefined') {
        window.close();
      }
    } catch (err: any) {
      setExitError(err?.message || 'Failed to revoke support session on server.');
      clearSupportSession();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('askrev_user');
      }
      setIsTerminated(true);
    } finally {
      setIsExiting(false);
    }
  };

  if (isTerminated) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Admin View Session Closed</h2>
        <p className="text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
          The administrative support session has been revoked and all cached data cleared.
          {exitError ? <span className="block text-amber-400 text-xs mt-2">{exitError}</span> : null}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') window.close();
            }}
            className="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
          >
            Close This Tab
          </button>
          <a
            href="https://admin.askrevdrive.com/admin"
            className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors shadow-xs"
          >
            Return to Admin Portal
          </a>
        </div>
      </div>
    );
  }

  return (
    <aside
      role="alert"
      aria-label="Admin View"
      className="sticky top-0 z-50 w-full bg-slate-900 text-white shadow-xs border-b border-amber-500/40 px-4 py-2"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
          <span className="font-semibold text-amber-300">
            Admin View — {member?.fullName || 'Member'} ({member?.memberId || 'N/A'})
          </span>
        </div>

        <button
          type="button"
          onClick={handleExit}
          disabled={isExiting}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{isExiting ? 'Closing View...' : 'Exit View'}</span>
        </button>
      </div>
    </aside>
  );
}
