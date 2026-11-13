'use client';

import React, { useEffect, useState } from 'react';

export default function VerticalRoad() {
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const handleVisibility = () => {
      setIsPaused(document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  return (
    <aside
      aria-hidden="true"
      className="hidden xl:block fixed top-0 right-0 h-screen w-[104px] 2xl:w-[120px] pointer-events-none select-none z-20 overflow-hidden"
    >
      {/* Soft Vignette Mask for Seamless Entry/Exit Blend into Midnight Background */}
      <div
        className="relative w-full h-full flex justify-center"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)',
        }}
      >
        {/* =====================================================================
            DARK ASPHALT ROAD SURFACE
            Realistic asphalt texture, subtle lane edges, and moving center markings
            ===================================================================== */}
        <div className="relative w-full h-full bg-[#0B0F17] shadow-2xl border-l border-white/10">
          {/* Subtle Fine Asphalt Texture Noise */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px)',
              backgroundSize: '4px 4px',
            }}
          />

          {/* Left Solid Curb / Shoulder Marking (Subtle Metallic Muted Line) */}
          <div className="absolute top-0 left-2.5 bottom-0 w-[1.5px] bg-white/30" />

          {/* Right Solid Curb / Shoulder Marking (Subtle Metallic Muted Line) */}
          <div className="absolute top-0 right-2.5 bottom-0 w-[1.5px] bg-white/30" />

          {/* Center Dashed Lane Divider (Subtle Animated Downward Flow) */}
          <div
            className={`absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-[200%] ${
              isPaused ? '' : 'animate-road-markings'
            }`}
            style={{
              backgroundImage:
                'linear-gradient(to bottom, rgba(255,255,255,0.75) 0px, rgba(255,255,255,0.75) 14px, transparent 14px, transparent 36px)',
              backgroundSize: '2px 36px',
            }}
          />

          {/* Road Edge Soft Lighting Vignette */}
          <div className="absolute top-0 bottom-0 left-0 w-3 bg-gradient-to-r from-black/50 to-transparent pointer-events-none" />
          <div className="absolute top-0 bottom-0 right-0 w-3 bg-gradient-to-l from-black/50 to-transparent pointer-events-none" />

          {/* =====================================================================
              PHOTOREALISTIC TOP-VIEW EV VEHICLES (TOP TO BOTTOM TRAVEL)
              Realistic 3D CAD automotive renders with natural shadows & proportions
              ===================================================================== */}

          {/* 1. Electric Jeep 4x4 (Down center/left lane, commanding presence) */}
          <div
            className={`absolute left-[8px] 2xl:left-[12px] -top-36 ${
              isPaused ? '' : 'animate-vehicle-jeep'
            }`}
          >
            <div className="relative w-[48px] 2xl:w-[54px] filter drop-shadow-[0_12px_16px_rgba(0,0,0,0.85)]">
              <img
                src="/images/road/top-jeep.png"
                alt=""
                className="w-full h-auto object-contain select-none"
                loading="eager"
              />
            </div>
          </div>

          {/* 2. Electric Motorcycle (Down right lane, high-speed performance) */}
          <div
            className={`absolute right-[12px] 2xl:right-[18px] -top-36 ${
              isPaused ? '' : 'animate-vehicle-motorcycle'
            }`}
          >
            <div className="relative w-[34px] 2xl:w-[38px] filter drop-shadow-[0_8px_12px_rgba(0,0,0,0.8)]">
              <img
                src="/images/road/top-motorcycle.png"
                alt=""
                className="w-full h-auto object-contain select-none"
                loading="eager"
              />
            </div>
          </div>

          {/* 3. Electric Scooter (Down center-left lane, smooth urban commute) */}
          <div
            className={`absolute left-[14px] 2xl:left-[18px] -top-36 ${
              isPaused ? '' : 'animate-vehicle-scooter'
            }`}
          >
            <div className="relative w-[30px] 2xl:w-[34px] filter drop-shadow-[0_6px_10px_rgba(0,0,0,0.75)]">
              <img
                src="/images/road/top-scooter.png"
                alt=""
                className="w-full h-auto object-contain select-none"
                loading="eager"
              />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
