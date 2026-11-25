'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, Lock, Clock, LogOut, ExternalLink } from 'lucide-react';
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
  adminEmail,
  reason,
  consentReference,
  expiresAt,
  onExit,
}: AdminSupportModeBannerProps) {
  const [timeLeft, setTimeLeft] = useState<string>('15:00');
  const [isExpired, setIsExpired] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (!expiresAt) return;

    const targetTime = new Date(expiresAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0) {
        setTimeLeft('00:00');
        setIsExpired(true);
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      setTimeLeft(
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

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
        // Close window if opened in new tab, or redirect to admin portal
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
      aria-label="Admin Support Mode Warning"
      className="sticky top-0 z-50 w-full bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white shadow-md border-b-2 border-amber-400"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
          {/* Status Badge & Viewing Target */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-950/40 border border-amber-300/40 font-black tracking-wider text-[11px] uppercase shadow-xs">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              ADMIN SUPPORT MODE — READ ONLY
            </span>

            <div className="flex items-center gap-2">
              <span className="text-amber-100 font-medium">Viewing Member:</span>
              <strong className="text-white font-bold bg-black/20 px-2 py-0.5 rounded">
                {member?.fullName || 'Member'} ({member?.memberId || 'N/A'})
              </strong>
            </div>

            {adminEmail && (
              <span className="hidden md:inline text-amber-200/80 text-[11px]">
                Audited as: <strong>{adminEmail}</strong>
              </span>
            )}
          </div>

          {/* Timer & Controls */}
          <div className="flex items-center gap-4 shrink-0">
            {consentReference && (
              <span className="hidden lg:inline text-amber-200/90 text-[11px] bg-black/20 px-2 py-0.5 rounded font-mono">
                Ref: {consentReference}
              </span>
            )}

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/30 border border-amber-300/30 font-mono font-bold text-amber-200 text-xs">
              <Clock className="w-3.5 h-3.5 text-amber-300" />
              <span>{isExpired ? 'EXPIRED' : `Expires in: ${timeLeft}`}</span>
            </div>

            <button
              type="button"
              onClick={handleExit}
              disabled={isExiting}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white hover:bg-amber-50 text-amber-950 font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <LogOut className="w-3.5 h-3.5 text-amber-900" />
              <span>{isExiting ? 'Exiting...' : 'Exit Support Mode'}</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
