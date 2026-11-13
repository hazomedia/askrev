'use client';

import React from 'react';

export default function GroundMist() {
  return (
    <div
      aria-hidden="true"
      className="absolute bottom-0 left-0 right-0 h-24 sm:h-32 pointer-events-none select-none overflow-hidden z-15"
      style={{
        maskImage: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)',
      }}
    >
      {/* Primary Low-Lying Floor Mist (Atmospheric Ice-Blue Drifting Right) */}
      <div className="absolute inset-0 flex items-end justify-center opacity-30 animate-mist-drift-1">
        <svg
          viewBox="0 0 1200 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-[180%] max-w-none h-24 filter blur-md"
        >
          <path
            d="M0 120C150 90 250 110 400 95C550 80 650 115 800 100C950 85 1050 110 1200 120H0Z"
            fill="url(#mistGradient1)"
          />
          <defs>
            <linearGradient id="mistGradient1" x1="0" y1="90" x2="1200" y2="120" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#267DFF" stopOpacity="0.3" />
              <stop offset="40%" stopColor="#50D9FF" stopOpacity="0.45" />
              <stop offset="70%" stopColor="#101827" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#267DFF" stopOpacity="0.25" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Secondary Ambient Fog Wave (Drifting Left) */}
      <div className="hidden sm:block absolute inset-0 flex items-end justify-center opacity-25 animate-mist-drift-2">
        <svg
          viewBox="0 0 1200 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-[190%] max-w-none h-28 filter blur-lg"
        >
          <path
            d="M0 120C200 95 300 80 500 100C700 115 850 85 1050 95C1150 100 1200 120 1200 120H0Z"
            fill="url(#mistGradient2)"
          />
          <defs>
            <linearGradient id="mistGradient2" x1="0" y1="80" x2="1200" y2="120" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#080B12" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#267DFF" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#50D9FF" stopOpacity="0.2" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Tertiary Ground Contact Glow Haze */}
      <div
        className="absolute bottom-0 left-1/4 right-1/4 h-12 opacity-35 filter blur-xl pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 90%, rgba(80, 217, 255, 0.4) 0%, rgba(38, 125, 255, 0.2) 50%, transparent 80%)',
        }}
      />
    </div>
  );
}
