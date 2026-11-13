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
      className="hidden lg:block fixed top-0 right-0 h-screen w-[116px] xl:w-[130px] 2xl:w-[144px] pointer-events-none select-none z-30 overflow-hidden"
    >
      {/* Soft Vignette Mask for Seamless Entry/Exit Blend into Midnight Background */}
      <div
        className="relative w-full h-full flex justify-center"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 6%, black 94%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 6%, black 94%, transparent 100%)',
        }}
      >
        {/* =====================================================================
            DARK ASPHALT ROAD SURFACE
            High contrast, realistic asphalt texture, illuminated lane edges,
            and continuously animated center lane divider
            ===================================================================== */}
        <div className="relative w-full h-full bg-gradient-to-l from-[#0B0F17] via-[#131A26] to-[#090D14] shadow-2xl border-l-2 border-[#267DFF]/45 shadow-[-6px_0_25px_rgba(38,125,255,0.22)]">
          {/* Subtle Fine Asphalt Texture Grain */}
          <div
            className="absolute inset-0 opacity-25"
            style={{
              backgroundImage:
                'radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px)',
              backgroundSize: '4px 4px',
            }}
          />

          {/* Micro Telemetry Pill Header */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#080B12]/80 border border-white/10 backdrop-blur-sm whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-[#50D9FF] shadow-[0_0_6px_#50D9FF] animate-pulse" />
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#50D9FF]">
              Test Track
            </span>
          </div>

          {/* Left Solid Curb / Shoulder Marking (Bright Metallic Line) */}
          <div className="absolute top-0 left-3 bottom-0 w-[2px] bg-white/45 shadow-[0_0_8px_rgba(255,255,255,0.25)]" />

          {/* Right Solid Curb / Shoulder Marking (Bright Metallic Line) */}
          <div className="absolute top-0 right-3 bottom-0 w-[2px] bg-white/45 shadow-[0_0_8px_rgba(255,255,255,0.25)]" />

          {/* Center Dashed Lane Divider (Animated Downward Flow with Cyan/White Glow) */}
          <div
            className={`absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-[200%] ${
              isPaused ? '' : 'animate-road-markings'
            }`}
            style={{
              backgroundImage:
                'linear-gradient(to bottom, #FFFFFF 0px, #FFFFFF 16px, transparent 16px, transparent 38px)',
              backgroundSize: '2px 38px',
              filter: 'drop-shadow(0 0 4px rgba(80, 217, 255, 0.75))',
            }}
          />

          {/* Road Edge Lighting Vignettes */}
          <div className="absolute top-0 bottom-0 left-0 w-3.5 bg-gradient-to-r from-black/60 to-transparent pointer-events-none" />
          <div className="absolute top-0 bottom-0 right-0 w-3.5 bg-gradient-to-l from-black/60 to-transparent pointer-events-none" />

          {/* =====================================================================
              PHOTOREALISTIC TOP-VIEW EV VEHICLES (TOP TO BOTTOM TRAVEL)
              All 4 vehicle classes: Jeep 4x4, Motorcycle, Scooter, Electric Cycle.
              Oriented with front pointing down (rotate-180) to travel headlights-first.
              ===================================================================== */}

          {/* 1. Electric Jeep 4x4 (Down left/center lane, commanding presence) */}
          <div
            className={`absolute left-[10px] xl:left-[14px] 2xl:left-[18px] -top-44 ${
              isPaused ? '' : 'animate-vehicle-jeep'
            }`}
          >
            <div className="relative w-[50px] xl:w-[56px] 2xl:w-[62px] rotate-180 filter drop-shadow-[0_14px_18px_rgba(0,0,0,0.92)]">
              <img
                src="/images/road/top-jeep.png"
                alt="ASKR TerraMax 4x4 Top View"
                className="w-full h-auto object-contain select-none"
                loading="eager"
              />
            </div>
          </div>

          {/* 2. Electric Motorcycle (Down right lane, high-speed performance) */}
          <div
            className={`absolute right-[14px] xl:right-[18px] 2xl:right-[22px] -top-44 ${
              isPaused ? '' : 'animate-vehicle-motorcycle'
            }`}
          >
            <div className="relative w-[34px] xl:w-[38px] 2xl:w-[42px] rotate-180 filter drop-shadow-[0_10px_14px_rgba(0,0,0,0.85)]">
              <img
                src="/images/road/top-motorcycle.png"
                alt="ASKR Thunder Pro Top View"
                className="w-full h-auto object-contain select-none"
                loading="eager"
              />
            </div>
          </div>

          {/* 3. Electric Scooter (Down center-left lane, smooth urban commute) */}
          <div
            className={`absolute left-[16px] xl:left-[22px] 2xl:left-[26px] -top-44 ${
              isPaused ? '' : 'animate-vehicle-scooter'
            }`}
          >
            <div className="relative w-[32px] xl:w-[35px] 2xl:w-[38px] rotate-180 filter drop-shadow-[0_8px_12px_rgba(0,0,0,0.8)]">
              <img
                src="/images/road/top-scooter.png"
                alt="ASKR S1 Pro Top View"
                className="w-full h-auto object-contain select-none"
                loading="eager"
              />
            </div>
          </div>

          {/* 4. Electric Cycle (Down center-right lane, lightweight commuter) */}
          <div
            className={`absolute right-[20px] xl:right-[26px] 2xl:right-[30px] -top-44 ${
              isPaused ? '' : 'animate-vehicle-cycle'
            }`}
          >
            <div className="relative w-[28px] xl:w-[32px] 2xl:w-[35px] rotate-180 filter drop-shadow-[0_6px_10px_rgba(0,0,0,0.75)]">
              <img
                src="/images/road/top-cycle.png"
                alt="ASKR AeroTrek Cycle Top View"
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
