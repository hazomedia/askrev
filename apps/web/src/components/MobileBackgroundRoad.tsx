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
      className="lg:hidden fixed top-0 bottom-0 right-1 sm:right-4 w-[116px] sm:w-[136px] pointer-events-none select-none z-0 overflow-hidden"
    >
      {/* 
        Subtle Cinematic Integrated Background Road Track
        Fixed across the entire mobile screen height for continuous scrolling visibility.
        Features distinct opposing traffic lanes, illuminated vehicles, and clear road boundaries.
      */}
      <div
        className="relative w-full h-full flex justify-center"
        style={{
          maskImage:
            'linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)',
        }}
      >
        {/* Road Surface */}
        <div className="relative w-full h-full bg-gradient-to-l from-[#0B0F19]/85 via-[#111A2E]/92 to-[#090D18]/85 border-l border-r border-[#267DFF]/35 shadow-[-6px_0_30px_rgba(38,125,255,0.22)]">
          {/* Subtle Fine Asphalt Texture Grain */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px)',
              backgroundSize: '4px 4px',
            }}
          />

          {/* Left Solid Shoulder / Curb Marking */}
          <div className="absolute top-0 left-1.5 bottom-0 w-[1.5px] bg-white/45 shadow-[0_0_6px_rgba(255,255,255,0.2)]" />

          {/* Right Solid Shoulder / Curb Marking */}
          <div className="absolute top-0 right-1.5 bottom-0 w-[1.5px] bg-white/45 shadow-[0_0_6px_rgba(255,255,255,0.2)]" />

          {/* Center Dashed Lane Divider (Separates Mobile Lane 1 & 2) */}
          <div
            className={`absolute top-0 left-1/2 -translate-x-1/2 w-[1.5px] h-[200%] ${
              isPaused ? '' : 'animate-road-markings'
            }`}
            style={{
              backgroundImage:
                'linear-gradient(to bottom, #FFFFFF 0px, #FFFFFF 16px, transparent 16px, transparent 36px)',
              backgroundSize: '1.5px 36px',
              filter: 'drop-shadow(0 0 3px rgba(80, 217, 255, 0.6))',
            }}
          />

          {/* =====================================================================
              MOBILE LANE 1 (LEFT 50%): DOWNWARD VEHICLES (TOP TO BOTTOM)
              Oriented with front pointing down (rotate-180).
              Vehicle 1: ASKR TerraMax 4x4 (Jeep) — Delay 0s
              Vehicle 2: ASKR AeroTrek (Cycle) — Delay -8s (50% phase separation)
              ===================================================================== */}
          <div className="absolute top-0 bottom-0 left-0 w-1/2 pointer-events-none">
            {/* 1. ASKR TerraMax 4x4 (Jeep) */}
            <div
              className={`absolute top-0 left-0 w-full ${
                isPaused ? '' : 'animate-mobile-lane-down-1'
              }`}
            >
              <div className="flex justify-center items-center w-full">
                <div className="relative w-[36px] sm:w-[40px] rotate-180 filter drop-shadow-[0_8px_14px_rgba(0,0,0,0.95)] brightness-125 contrast-115">
                  {/* Forward Headlight Glow Beam */}
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-6 h-8 rounded-full bg-cyan-400/40 blur-sm pointer-events-none" />
                  {/* Rear Red Taillight Strip */}
                  <div className="absolute top-0.5 left-1/2 -translate-x-1/2 w-4 h-1.5 rounded-full bg-red-500/90 blur-[1px] shadow-[0_0_8px_#EF4444] pointer-events-none" />
                  <img
                    src="/images/road/top-jeep.png"
                    alt="ASKR TerraMax 4x4"
                    className="w-full h-auto object-contain select-none"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>

            {/* 2. ASKR AeroTrek (Electric Cycle) */}
            <div
              className={`absolute top-0 left-0 w-full ${
                isPaused ? '' : 'animate-mobile-lane-down-2'
              }`}
            >
              <div className="flex justify-center items-center w-full">
                <div className="relative w-[20px] sm:w-[22px] rotate-180 filter drop-shadow-[0_6px_10px_rgba(0,0,0,0.85)] brightness-125 contrast-115">
                  {/* Forward Headlight Beam */}
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-4 h-6 rounded-full bg-cyan-400/40 blur-sm pointer-events-none" />
                  {/* Rear Red Taillight */}
                  <div className="absolute top-0.5 left-1/2 -translate-x-1/2 w-3 h-1 rounded-full bg-red-500/90 blur-[1px] shadow-[0_0_6px_#EF4444] pointer-events-none" />
                  <img
                    src="/images/road/top-cycle.png"
                    alt="ASKR AeroTrek Cycle"
                    className="w-full h-auto object-contain select-none"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* =====================================================================
              MOBILE LANE 2 (RIGHT 50%): UPWARD VEHICLES (BOTTOM TO TOP)
              Oriented with front pointing up (rotate-0).
              Vehicle 3: ASKR Thunder Pro (Motorcycle) — Delay -4s
              Vehicle 4: ASKR S1 Pro (Scooter) — Delay -12s (50% phase separation)
              ===================================================================== */}
          <div className="absolute top-0 bottom-0 right-0 w-1/2 pointer-events-none">
            {/* 3. ASKR Thunder Pro (Electric Motorcycle) */}
            <div
              className={`absolute top-0 left-0 w-full ${
                isPaused ? '' : 'animate-mobile-lane-up-1'
              }`}
            >
              <div className="flex justify-center items-center w-full">
                <div className="relative w-[28px] sm:w-[30px] rotate-0 filter drop-shadow-[0_8px_12px_rgba(0,0,0,0.90)] brightness-125 contrast-115">
                  {/* Forward Headlight Beam (Pointing Up) */}
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-5 h-8 rounded-full bg-cyan-400/40 blur-sm pointer-events-none" />
                  {/* Rear Red Taillight Glow (At bottom) */}
                  <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-1.5 rounded-full bg-red-500/90 blur-[1px] shadow-[0_0_8px_#EF4444] pointer-events-none" />
                  <img
                    src="/images/road/top-motorcycle.png"
                    alt="ASKR Thunder Pro"
                    className="w-full h-auto object-contain select-none"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>

            {/* 4. ASKR S1 Pro (Electric Scooter) */}
            <div
              className={`absolute top-0 left-0 w-full ${
                isPaused ? '' : 'animate-mobile-lane-up-2'
              }`}
            >
              <div className="flex justify-center items-center w-full">
                <div className="relative w-[26px] sm:w-[28px] rotate-0 filter drop-shadow-[0_6px_10px_rgba(0,0,0,0.85)] brightness-125 contrast-115">
                  {/* Forward Headlight Beam (Pointing Up) */}
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-5 h-7 rounded-full bg-cyan-400/40 blur-sm pointer-events-none" />
                  {/* Rear Red Taillight Glow (At bottom) */}
                  <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-1.5 rounded-full bg-red-500/90 blur-[1px] shadow-[0_0_8px_#EF4444] pointer-events-none" />
                  <img
                    src="/images/road/top-scooter.png"
                    alt="ASKR S1 Pro"
                    className="w-full h-auto object-contain select-none"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
