'use client';

import React, { useState } from 'react';
import { LogOut } from 'lucide-react';
import { exitAdminSupportSessionApi } from '../lib/api';

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

  const handleExit = async () => {
    setIsExiting(true);
    try {
      await exitAdminSupportSessionApi();
    } catch {
    } finally {
      setIsExiting(false);
      if (onExit) {
        onExit();
      } else if (typeof window !== 'undefined') {
        if (window.opener) {
          window.close();
        } else {
          window.location.href = 'https://admin.askrevdrive.com/admin';
        }
      }
    }
  };

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
          <span>{isExiting ? 'Exiting...' : 'Exit View'}</span>
        </button>
      </div>
    </aside>
  );
}
