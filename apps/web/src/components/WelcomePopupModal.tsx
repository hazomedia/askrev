'use client';

import React, { useEffect, useRef } from 'react';
import { X, ArrowRight, Zap, Shield, Sparkles } from 'lucide-react';
import AskrLogo from './AskrLogo';

export interface PopupCampaign {
  id: string;
  name: string;
  heading: string;
  subheading?: string | null;
  message: string;
  buttonText?: string;
  buttonLink?: string;
  footerText?: string | null;
  imageUrl?: string | null;
  frequency?: 'ONCE_PER_CAMPAIGN' | 'ONCE_DAILY' | 'EVERY_VISIT';
}

export interface WelcomePopupModalProps {
  campaign: PopupCampaign | null;
  isOpen: boolean;
  onClose: () => void;
  onExplore?: (destination?: string) => void;
}

export default function WelcomePopupModal({
  campaign,
  isOpen,
  onClose,
  onExplore,
}: WelcomePopupModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const exploreButtonRef = useRef<HTMLButtonElement>(null);

  // Close on ESC key press & accessible focus management
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Prevent background scrolling while modal is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus explore button after slight mount delay
    const timer = setTimeout(() => {
      exploreButtonRef.current?.focus();
    }, 100);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      clearTimeout(timer);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !campaign) {
    return null;
  }

  const heading = campaign.heading || 'WELCOME TO ASKR EV';
  const subheading = campaign.subheading || 'DRIVE THE ELECTRIC FUTURE';
  const message =
    campaign.message ||
    'Welcome to ASKR EV — your electric mobility journey starts here! Explore our EV solutions, discover your membership benefits, manage your bookings, and stay connected with your team — all in one place.';
  const buttonText = campaign.buttonText || 'EXPLORE DASHBOARD';
  const buttonLink = campaign.buttonLink || '/dashboard';
  const footerText = campaign.footerText || 'SMART MOBILITY • CONNECTED FUTURE';
  const imageUrl =
    campaign.imageUrl ||
    '/uploads/hero/desktop/urban-fleet-hero---harsil-leo-_1795105582720_1e863ffb12443fbf.webp';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-popup-heading"
    >
      {/* Dimmed & Blurred Backdrop */}
      <div
        className="fixed inset-0 bg-[#0C2348]/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div
        ref={modalRef}
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-blue-100 overflow-hidden z-10 transform transition-all my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Decorative Color Bar */}
        <div className="h-2 w-full bg-gradient-to-r from-[#0C2348] via-[#165DAD] to-[#0891D2]" />

        {/* Close Button (X) */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full text-slate-400 hover:text-[#0C2348] hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors focus:outline-hidden focus:ring-2 focus:ring-[#165DAD]"
          aria-label="Close welcome popup"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-5 text-center">
          {/* Official Full Logo */}
          <div className="flex justify-center pt-1">
            <AskrLogo
              href="/dashboard"
              size="md"
              priority={true}
              imgClassName="h-8 sm:h-9 w-auto max-w-[210px] object-contain"
            />
          </div>

          {/* Subheading Pill */}
          {subheading && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-[#165DAD] text-[11px] font-bold tracking-widest uppercase shadow-2xs">
              <Zap className="w-3.5 h-3.5 text-[#0891D2] fill-[#0891D2]" />
              <span>{subheading}</span>
            </div>
          )}

          {/* Main Heading */}
          <h2
            id="welcome-popup-heading"
            className="text-xl sm:text-2xl font-black text-[#0C2348] tracking-tight leading-snug"
          >
            {heading}
          </h2>

          {/* Electric Mobility Visual Banner */}
          {imageUrl && (
            <div className="relative w-full h-32 sm:h-40 rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs bg-[#0C2348]">
              <img
                src={imageUrl}
                alt="ASKR EV Electric Mobility"
                className="w-full h-full object-cover object-center select-none"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0C2348]/60 via-transparent to-transparent" />
            </div>
          )}

          {/* Message Prose */}
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
            {message}
          </p>

          {/* Primary Action Button */}
          <div className="pt-2">
            <button
              ref={exploreButtonRef}
              onClick={() => (onExplore ? onExplore(buttonLink) : onClose())}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#0C2348] via-[#165DAD] to-[#0891D2] hover:opacity-95 text-white font-bold text-sm shadow-md hover:shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>{buttonText}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Footer Notice */}
          {footerText && (
            <div className="pt-1 text-[11px] font-semibold text-slate-400 tracking-wider uppercase border-t border-slate-100">
              {footerText}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
