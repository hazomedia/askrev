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
      className="lg:hidden fixed top-0 bottom-0 right-1 sm:right-4 w-[118px] sm:w-[136px] pointer-events-none select-none z-0 overflow-hidden"
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
            'linear-gradient(to bottom, transparent 0%, black 2%, black 98%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent 0%, black 2%, black 98%, transparent 100%)',
        }}
      >
        {/* Road Surface */}
        <div className="relative w-full h-full bg-gradient-to-l from-[#0B0F19]/92 via-[#111A2E]/96 to-[#090D18]/92 border-l border-r border-[#267DFF]/45 shadow-[-8px_0_35px_rgba(38,125,255,0.30)]">
          {/* Subtle Fine Asphalt Texture Grain */}
          <div
            className="absolute inset-0 opacity-25"
            style={{
              backgroundImage:
                'radial-gradient(rgba(255, 255, 255, 0.20) 1px, transparent 1px)',
              backgroundSize: '4px 4px',
            }}
          />

          {/* Left Solid Shoulder / Curb Marking */}
          <div className="absolute top-0 left-1.5 bottom-0 w-[1.5px] bg-white/60 shadow-[0_0_6px_rgba(80,217,255,0.4)]" />

          {/* Right Solid Shoulder / Curb Marking */}
          <div className="absolute top-0 right-1.5 bottom-0 w-[1.5px] bg-white/60 shadow-[0_0_6px_rgba(80,217,255,0.4)]" />

          {/* Center Dashed Lane Divider (Separates Mobile Lane 1 & 2) */}
          <div
            className={`absolute top-0 left-1/2 -translate-x-1/2 w-[1.5px] h-[200%] ${
              isPaused ? '' : 'animate-road-markings'
            }`}
            style={{
              backgroundImage:
                'linear-gradient(to bottom, #FFFFFF 0px, #FFFFFF 16px, transparent 16px, transparent 36px)',
              backgroundSize: '1.5px 36px',
              filter: 'drop-shadow(0 0 4px rgba(80, 217, 255, 0.8))',
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
                <div className="relative w-[40px] xs:w-[44px] rotate-180 filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.95)] drop-shadow-[0_0_6px_rgba(80,217,255,0.45)] brightness-130 contrast-120">
                  {/* Forward Dual Headlight Beams (Pointing Down) */}
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-cyan-400/50 blur-sm pointer-events-none" />
                  <div className="absolute -bottom-2 left-1.5 w-2 h-3 rounded-full bg-white/70 blur-[1px] pointer-events-none" />
                  <div className="absolute -bottom-2 right-1.5 w-2 h-3 rounded-full bg-white/70 blur-[1px] pointer-events-none" />
                  {/* Rear Red LED Taillight Strip (At top) */}
                  <div className="absolute top-0.5 left-1/2 -translate-x-1/2 w-6 h-1.5 rounded-full bg-red-500 blur-[0.5px] shadow-[0_0_8px_#EF4444] pointer-events-none" />
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
                <div className="relative w-[24px] xs:w-[26px] rotate-180 filter drop-shadow-[0_3px_8px_rgba(0,0,0,0.9)] drop-shadow-[0_0_5px_rgba(80,217,255,0.45)] brightness-140 contrast-125">
                  {/* Forward Handlebar LED Headlight (Pointing Down) */}
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-4 h-6 rounded-full bg-cyan-300/55 blur-sm pointer-events-none" />
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-2 rounded-full bg-white/80 blur-[0.5px] pointer-events-none" />
                  {/* Rear Seatpost Red LED (At top) */}
                  <div className="absolute top-0.5 left-1/2 -translate-x-1/2 w-3 h-1 rounded-full bg-red-500 blur-[0.5px] shadow-[0_0_6px_#EF4444] pointer-events-none" />
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
                <div className="relative w-[32px] xs:w-[35px] rotate-0 filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.95)] drop-shadow-[0_0_6px_rgba(80,217,255,0.45)] brightness-135 contrast-125">
                  {/* Forward Dual LED Projector Headlight Beams (Pointing Up) */}
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-6 h-8 rounded-full bg-cyan-400/50 blur-sm pointer-events-none" />
                  <div className="absolute -top-2 left-1.5 w-2 h-3 rounded-full bg-white/70 blur-[1px] pointer-events-none" />
                  <div className="absolute -top-2 right-1.5 w-2 h-3 rounded-full bg-white/70 blur-[1px] pointer-events-none" />
                  {/* Rear Red LED Taillight Wing (At bottom) */}
                  <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-5 h-1.5 rounded-full bg-red-500 blur-[0.5px] shadow-[0_0_8px_#EF4444] pointer-events-none" />
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
                <div className="relative w-[30px] xs:w-[33px] rotate-0 filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.95)] drop-shadow-[0_0_6px_rgba(80,217,255,0.45)] brightness-135 contrast-125">
                  {/* Forward Horizontal LED Lightbar Beam (Pointing Up) */}
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-6 h-7 rounded-full bg-cyan-400/50 blur-sm pointer-events-none" />
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-1.5 rounded-full bg-white/80 blur-[0.5px] pointer-events-none" />
                  {/* Rear LED Taillight Bar (At bottom) */}
                  <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4.5 h-1.5 rounded-full bg-red-500 blur-[0.5px] shadow-[0_0_8px_#EF4444] pointer-events-none" />
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
