'use client';

import React, { useEffect, useState } from 'react';

export default function MobileBackgroundRoad() {
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const handleVisibility = () => {
      setIsPaused(document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  return (
    <div
      aria-hidden="true"
      className="lg:hidden absolute inset-0 pointer-events-none overflow-hidden select-none z-0"
    >
      {/* 
        Subtle Cinematic Integrated Background Road Track
        Positioned along the right side of the mobile hero background.
        Low opacity (18-22%), gradient mask for seamless edge feathering,
        and dark asphalt surface with realistic moving vehicles.
      */}
      <div
        className="absolute top-0 bottom-0 right-2 sm:right-6 w-[86px] sm:w-[100px] flex justify-center opacity-[0.22]"
        style={{
          maskImage:
            'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
        }}
      >
        {/* Road Surface */}
        <div className="relative w-full h-full bg-gradient-to-l from-[#0D131F] via-[#111927] to-[#0A0E17] border-l border-r border-white/10 shadow-lg">
          {/* Outer Left Solid Shoulder Line */}
          <div className="absolute top-0 left-1.5 bottom-0 w-[1px] bg-white/30" />

          {/* Outer Right Solid Shoulder Line */}
          <div className="absolute top-0 right-1.5 bottom-0 w-[1px] bg-white/30" />

          {/* Center Dashed Lane Divider */}
          <div
            className={`absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-[200%] ${
              isPaused ? '' : 'animate-road-markings'
            }`}
            style={{
              backgroundImage:
                'linear-gradient(to bottom, #FFFFFF 0px, #FFFFFF 14px, transparent 14px, transparent 32px)',
              backgroundSize: '1px 32px',
              opacity: 0.7,
            }}
          />

          {/* Lane 1 (Left): Downward Vehicle (Scooter, Top to Bottom) */}
          <div className="absolute top-0 bottom-0 left-0 w-1/2 overflow-visible">
            <div
              className={`absolute left-1/2 -translate-x-1/2 -top-40 ${
                isPaused ? '' : 'animate-mobile-lane-down'
              }`}
            >
              <div className="relative w-[24px] rotate-180 filter drop-shadow-[0_6px_10px_rgba(0,0,0,0.8)] opacity-90">
                {/* Subtle Headlight Glow */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-cyan-400/30 blur-sm pointer-events-none" />
                <img
                  src="/images/road/top-scooter.png"
                  alt=""
                  className="w-full h-auto object-contain select-none"
                  loading="lazy"
                />
              </div>
            </div>
          </div>

          {/* Lane 2 (Right): Upward Vehicle (Motorcycle, Bottom to Top) */}
          <div className="absolute top-0 bottom-0 right-0 w-1/2 overflow-visible">
            <div
              className={`absolute left-1/2 -translate-x-1/2 -top-40 ${
                isPaused ? '' : 'animate-mobile-lane-up'
              }`}
            >
              <div className="relative w-[26px] rotate-0 filter drop-shadow-[0_6px_10px_rgba(0,0,0,0.8)] opacity-90">
                {/* Subtle Headlight Glow */}
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-cyan-400/30 blur-sm pointer-events-none" />
                <img
                  src="/images/road/top-motorcycle.png"
                  alt=""
                  className="w-full h-auto object-contain select-none"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
