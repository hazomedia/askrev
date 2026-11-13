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
      className="hidden lg:block fixed top-0 right-0 h-screen w-[140px] xl:w-[154px] 2xl:w-[168px] pointer-events-none select-none z-30 overflow-hidden"
    >
      {/* Soft Vignette Mask for Seamless Entry/Exit Blend into Midnight Background */}
      <div
        className="relative w-full h-full flex justify-center"
        style={{
          maskImage:
            'linear-gradient(to bottom, transparent 0%, black 5%, black 95%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent 0%, black 5%, black 95%, transparent 100%)',
        }}
      >
        {/* =====================================================================
            DARK ASPHALT ROAD SURFACE — 2-WAY DUAL LANE
            Lane 1 (Left): Downward traffic (Top to Bottom)
            Lane 2 (Right): Upward traffic (Bottom to Top)
            ===================================================================== */}
        <div className="relative w-full h-full bg-gradient-to-l from-[#0B0F17] via-[#131A26] to-[#090D14] shadow-2xl border-l-2 border-[#267DFF]/40 shadow-[-6px_0_30px_rgba(38,125,255,0.22)]">
          {/* Subtle Fine Asphalt Texture Grain */}
          <div
            className="absolute inset-0 opacity-25"
            style={{
              backgroundImage:
                'radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px)',
              backgroundSize: '4px 4px',
            }}
          />

          {/* Micro Telemetry Header */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#080B12]/85 border border-white/10 backdrop-blur-sm whitespace-nowrap shadow-md">
            <span className="w-1.5 h-1.5 rounded-full bg-[#50D9FF] shadow-[0_0_6px_#50D9FF] animate-pulse" />
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#50D9FF]">
              Test Track • 2-Way
            </span>
          </div>

          {/* Outer Left Solid Shoulder / Curb Marking */}
          <div className="absolute top-0 left-2.5 bottom-0 w-[2px] bg-white/40 shadow-[0_0_6px_rgba(255,255,255,0.20)]" />

          {/* Outer Right Solid Shoulder / Curb Marking */}
          <div className="absolute top-0 right-2.5 bottom-0 w-[2px] bg-white/40 shadow-[0_0_6px_rgba(255,255,255,0.20)]" />

          {/* Center Dashed Lane Divider (Separates Lane 1 and Lane 2) */}
          <div
            className={`absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-[200%] ${
              isPaused ? '' : 'animate-road-markings'
            }`}
            style={{
              backgroundImage:
                'linear-gradient(to bottom, #FFFFFF 0px, #FFFFFF 18px, transparent 18px, transparent 40px)',
              backgroundSize: '2px 40px',
              filter: 'drop-shadow(0 0 4px rgba(80, 217, 255, 0.70))',
            }}
          />

          {/* Directional Chevrons in Asphalt Surface */}
          <div className="absolute top-16 left-0 w-1/2 flex justify-center text-[11px] text-white/20 font-mono select-none">
            ↓
          </div>
          <div className="absolute top-16 right-0 w-1/2 flex justify-center text-[11px] text-white/20 font-mono select-none">
            ↑
          </div>
          <div className="absolute bottom-16 left-0 w-1/2 flex justify-center text-[11px] text-white/20 font-mono select-none">
            ↓
          </div>
          <div className="absolute bottom-16 right-0 w-1/2 flex justify-center text-[11px] text-white/20 font-mono select-none">
            ↑
          </div>

          {/* Road Edge Lighting Vignettes */}
          <div className="absolute top-0 bottom-0 left-0 w-4 bg-gradient-to-r from-black/70 to-transparent pointer-events-none" />
          <div className="absolute top-0 bottom-0 right-0 w-4 bg-gradient-to-l from-black/70 to-transparent pointer-events-none" />

          {/* =====================================================================
              LANE 1 (LEFT): DOWNWARD VEHICLES (TOP TO BOTTOM)
              Oriented with front pointing down (rotate-180) to travel headlights-first.
              Vehicle 1: ASKR TerraMax 4x4 (Jeep) — Delay 0s
              Vehicle 2: ASKR AeroTrek (Cycle) — Delay -7s (50% phase separation)
              Zero overlap guarantee: both vehicles share identical 14s duration.
              ===================================================================== */}
          <div className="absolute top-0 bottom-0 left-0 w-1/2 overflow-visible">
            {/* 1. ASKR TerraMax 4x4 (Jeep) */}
            <div
              className={`absolute left-1/2 -translate-x-1/2 -top-60 ${
                isPaused ? '' : 'animate-lane-down-1'
              }`}
            >
              <div className="relative w-[48px] xl:w-[52px] 2xl:w-[56px] rotate-180 filter drop-shadow-[0_12px_16px_rgba(0,0,0,0.95)]">
                {/* Forward Headlight Glow Beam */}
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-cyan-400/20 blur-md pointer-events-none" />
                {/* Rear Taillight Glow */}
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-6 h-1.5 rounded-full bg-red-500/40 blur-[2px] pointer-events-none" />
                <img
                  src="/images/road/top-jeep.png"
                  alt="ASKR TerraMax 4x4 Top View"
                  className="w-full h-auto object-contain select-none"
                  loading="eager"
                />
              </div>
            </div>

            {/* 2. ASKR AeroTrek (Electric Cycle) */}
            <div
              className={`absolute left-1/2 -translate-x-1/2 -top-60 ${
                isPaused ? '' : 'animate-lane-down-2'
              }`}
            >
              <div className="relative w-[24px] xl:w-[26px] 2xl:w-[28px] rotate-180 filter drop-shadow-[0_8px_12px_rgba(0,0,0,0.85)]">
                {/* Forward Headlight Beam */}
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-5 h-6 rounded-full bg-cyan-400/25 blur-sm pointer-events-none" />
                {/* Rear Taillight */}
                <div className="absolute top-0.5 left-1/2 -translate-x-1/2 w-3 h-1 rounded-full bg-red-500/40 blur-[1px] pointer-events-none" />
                <img
                  src="/images/road/top-cycle.png"
                  alt="ASKR AeroTrek Cycle Top View"
                  className="w-full h-auto object-contain select-none"
                  loading="eager"
                />
              </div>
            </div>
          </div>

          {/* =====================================================================
              LANE 2 (RIGHT): UPWARD VEHICLES (BOTTOM TO TOP)
              Oriented with front pointing up (rotate-0) to travel headlights-first.
              Vehicle 3: ASKR Thunder Pro (Motorcycle) — Delay -3.5s
              Vehicle 4: ASKR S1 Pro (Scooter) — Delay -10.5s (50% phase separation)
              Zero overlap guarantee: both vehicles share identical 14s duration.
              ===================================================================== */}
          <div className="absolute top-0 bottom-0 right-0 w-1/2 overflow-visible">
            {/* 3. ASKR Thunder Pro (Electric Motorcycle) */}
            <div
              className={`absolute left-1/2 -translate-x-1/2 -top-60 ${
                isPaused ? '' : 'animate-lane-up-1'
              }`}
            >
              <div className="relative w-[32px] xl:w-[35px] 2xl:w-[38px] rotate-0 filter drop-shadow-[0_10px_14px_rgba(0,0,0,0.90)]">
                {/* Forward Headlight Beam (Pointing UP) */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-6 h-7 rounded-full bg-cyan-400/25 blur-sm pointer-events-none" />
                {/* Rear Taillight Glow (At bottom) */}
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-1.5 rounded-full bg-red-500/40 blur-[2px] pointer-events-none" />
                <img
                  src="/images/road/top-motorcycle.png"
                  alt="ASKR Thunder Pro Top View"
                  className="w-full h-auto object-contain select-none"
                  loading="eager"
                />
              </div>
            </div>

            {/* 4. ASKR S1 Pro (Electric Scooter) */}
            <div
              className={`absolute left-1/2 -translate-x-1/2 -top-60 ${
                isPaused ? '' : 'animate-lane-up-2'
              }`}
            >
              <div className="relative w-[30px] xl:w-[33px] 2xl:w-[35px] rotate-0 filter drop-shadow-[0_8px_12px_rgba(0,0,0,0.85)]">
                {/* Forward Headlight Beam (Pointing UP) */}
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-cyan-400/25 blur-sm pointer-events-none" />
                {/* Rear Taillight Glow (At bottom) */}
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-1.5 rounded-full bg-red-500/40 blur-[2px] pointer-events-none" />
                <img
                  src="/images/road/top-scooter.png"
                  alt="ASKR S1 Pro Top View"
                  className="w-full h-auto object-contain select-none"
                  loading="eager"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
