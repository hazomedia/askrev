'use client';

import React, { useEffect, useState } from 'react';

// =============================================================================
// REALISTIC TOP-VIEW VEHICLE ASSETS (TRUE TOP-DOWN AUTOMOTIVE PERSPECTIVES)
// =============================================================================

/**
 * Realistic Top-View Electric Scooter
 * Proportions: ~26px width x 62px length
 */
export function TopViewScooter() {
  return (
    <svg
      width="28"
      height="66"
      viewBox="0 0 28 66"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.45)]"
      aria-hidden="true"
    >
      {/* Front Wheel / Tire */}
      <rect x="11.5" y="0" width="5" height="12" rx="2.5" fill="#1A1F26" />
      <rect x="12.5" y="1" width="3" height="10" rx="1.5" fill="#2D3748" />

      {/* Front Mudguard & Cowl */}
      <path
        d="M9 10C9 8 11 6 14 6C17 6 19 8 19 10L19.5 16H8.5L9 10Z"
        fill="#165DAD"
      />
      <path
        d="M10 10C10 8.5 11.5 7 14 7C16.5 7 18 8.5 18 10L18.5 14H9.5L10 10Z"
        fill="#2575C7"
      />

      {/* Handlebars with Grips and Mirrors */}
      <line x1="2" y1="17" x2="26" y2="17" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
      {/* Left Grip */}
      <rect x="2" y="15" width="4" height="4" rx="1" fill="#0F172A" />
      {/* Right Grip */}
      <rect x="22" y="15" width="4" height="4" rx="1" fill="#0F172A" />
      {/* Mirrors */}
      <rect x="0.5" y="11" width="4" height="3" rx="1" fill="#334155" stroke="#0F172A" strokeWidth="0.5" />
      <rect x="23.5" y="11" width="4" height="3" rx="1" fill="#334155" stroke="#0F172A" strokeWidth="0.5" />

      {/* Digital Dashboard / Head Unit */}
      <rect x="11" y="15" width="6" height="4.5" rx="1" fill="#090D14" stroke="#38BDF8" strokeWidth="0.5" />
      <rect x="12" y="16" width="4" height="2" rx="0.5" fill="#38BDF8" opacity="0.8" />

      {/* Center Spine / Footboard Deck */}
      <path
        d="M7 21C7 20 8 19 10 19H18C20 19 21 20 21 21L21.5 35C21.5 36 20.5 37 19 37H9C7.5 37 6.5 36 6.5 35L7 21Z"
        fill="#1E293B"
      />
      {/* Rubber Grip Strips on Floorboard */}
      <line x1="9" y1="24" x2="19" y2="24" stroke="#0F172A" strokeWidth="1" strokeLinecap="round" />
      <line x1="9" y1="27" x2="19" y2="27" stroke="#0F172A" strokeWidth="1" strokeLinecap="round" />
      <line x1="9" y1="30" x2="19" y2="30" stroke="#0F172A" strokeWidth="1" strokeLinecap="round" />

      {/* Main Body Shell / Seat Area */}
      <path
        d="M7.5 35C7.5 33.5 9 33 14 33C19 33 20.5 33.5 20.5 35L21.5 54C21.5 58 18 60 14 60C10 60 6.5 58 6.5 54L7.5 35Z"
        fill="#165DAD"
      />

      {/* Dual Contoured Leather Seat */}
      <path
        d="M9 36C9 34.5 10.5 34 14 34C17.5 34 19 34.5 19 36L19.5 53C19.5 56 17 57.5 14 57.5C11 57.5 8.5 56 8.5 53L9 36Z"
        fill="#0F172A"
      />
      {/* Seat Center Stitching */}
      <line x1="14" y1="36" x2="14" y2="55" stroke="#334155" strokeWidth="0.8" strokeDasharray="1.5 1.5" />

      {/* Rear Grab Rail */}
      <path
        d="M9 56C9 58 11 59.5 14 59.5C17 59.5 19 58 19 56"
        stroke="#94A3B8"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Rear Red LED Tail Light */}
      <path
        d="M11 59.5C12 60.5 13 61 14 61C15 61 16 60.5 17 59.5"
        stroke="#EF4444"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Rear Tire Peeking Under Mudguard */}
      <rect x="12" y="58" width="4" height="8" rx="2" fill="#0F172A" />
    </svg>
  );
}

/**
 * Realistic Top-View Electric Motorcycle
 * Proportions: ~30px width x 74px length
 */
export function TopViewMotorcycle() {
  return (
    <svg
      width="32"
      height="78"
      viewBox="0 0 32 78"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="filter drop-shadow-[0_5px_8px_rgba(0,0,0,0.5)]"
      aria-hidden="true"
    >
      {/* Front Wheel / Tire */}
      <rect x="13.5" y="0" width="5" height="15" rx="2.5" fill="#111827" />
      <rect x="14.5" y="1" width="3" height="13" rx="1.5" fill="#1F2937" />

      {/* Front Mudguard & Forks */}
      <path
        d="M12 9C12 7.5 13.5 6 16 6C18.5 6 20 7.5 20 9L20.5 16H11.5L12 9Z"
        fill="#165DAD"
      />
      {/* Inverted Front Suspension Stanchions (Gold/Titanium) */}
      <rect x="10.5" y="11" width="2" height="7" rx="0.5" fill="#D97706" />
      <rect x="19.5" y="11" width="2" height="7" rx="0.5" fill="#D97706" />

      {/* Clip-on Sport Handlebars & Levers */}
      <line x1="3" y1="18" x2="29" y2="18" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" />
      {/* Bar Grips */}
      <rect x="3" y="16" width="5" height="4" rx="1" fill="#0A0E17" />
      <rect x="24" y="16" width="5" height="4" rx="1" fill="#0A0E17" />
      {/* Brake / Clutch Levers */}
      <line x1="2" y1="15" x2="7" y2="16" stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="30" y1="15" x2="25" y2="16" stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round" />
      {/* Bar-end Mirrors */}
      <ellipse cx="1" cy="18" rx="1.5" ry="3" fill="#1E293B" stroke="#0F172A" strokeWidth="0.5" />
      <ellipse cx="31" cy="18" rx="1.5" ry="3" fill="#1E293B" stroke="#0F172A" strokeWidth="0.5" />

      {/* Headlight Crown & TFT Cluster */}
      <path d="M12 15L16 13L20 15L19 19L13 19L12 15Z" fill="#0F172A" />
      <rect x="13.5" y="16.5" width="5" height="3" rx="0.5" fill="#0284C7" opacity="0.9" />

      {/* Sculpted Battery & Electronics "Tank" Area */}
      <path
        d="M10 20C10 19 12 18 16 18C20 18 22 19 22 20L23.5 35C23.5 37 22 39 19 40H13C10 39 8.5 37 8.5 35L10 20Z"
        fill="#165DAD"
      />
      {/* Tank Kneepads & Carbon Inset */}
      <path
        d="M11 22C11 21 12.5 20 16 20C19.5 20 21 21 21 22L22 33C22 34 21 35 18.5 36H13.5C11 35 10 34 10 33L11 22Z"
        fill="#0F172A"
      />
      {/* ASKR Corporate Stripe */}
      <line x1="16" y1="21" x2="16" y2="34" stroke="#38BDF8" strokeWidth="1" strokeLinecap="round" />

      {/* Exposed Steel Trellis Frame (Visible on sides) */}
      <path d="M7.5 28L9.5 38M24.5 28L22.5 38" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />

      {/* Rider Saddle (Contoured Ergo) */}
      <path
        d="M11.5 39C11.5 37.5 13 37 16 37C19 37 20.5 37.5 20.5 39L21.5 50C21.5 51.5 19.5 53 16 53C12.5 53 10.5 51.5 10.5 50L11.5 39Z"
        fill="#18181B"
      />
      <line x1="16" y1="39" x2="16" y2="51" stroke="#27272A" strokeWidth="0.8" />

      {/* Pillion Seat / Tapered Aerodynamic Tail */}
      <path
        d="M12.5 52C12.5 51 14 50.5 16 50.5C18 50.5 19.5 51 19.5 52L18.5 64C18.5 66 17 67 16 67C15 67 13.5 66 13.5 64L12.5 52Z"
        fill="#165DAD"
      />
      <path
        d="M13.5 52.5C13.5 51.8 14.5 51.5 16 51.5C17.5 51.5 18.5 51.8 18.5 52.5L18 60C18 61 17 61.5 16 61.5C15 61.5 14 61 14 60L13.5 52.5Z"
        fill="#0F172A"
      />

      {/* Tail Light Strip (Vibrant Red) */}
      <path d="M14 66C15 66.8 17 66.8 18 66" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />

      {/* Rear Wheel (Wide Sport Radial Tire) */}
      <rect x="12.5" y="62" width="7" height="16" rx="3.5" fill="#0A0E17" />
      <rect x="14" y="63" width="4" height="14" rx="2" fill="#1F2937" />
    </svg>
  );
}

/**
 * Realistic Top-View Electric Cycle (E-Bike)
 * Proportions: ~24px width x 64px length
 */
export function TopViewCycle() {
  return (
    <svg
      width="26"
      height="68"
      viewBox="0 0 26 68"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="filter drop-shadow-[0_3px_5px_rgba(0,0,0,0.4)]"
      aria-hidden="true"
    >
      {/* Front Tire / Rim */}
      <rect x="11.5" y="0" width="3" height="16" rx="1.5" fill="#0F172A" />
      <line x1="13" y1="2" x2="13" y2="14" stroke="#64748B" strokeWidth="0.8" />

      {/* Front Fork Crown */}
      <line x1="10" y1="13" x2="16" y2="13" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" />

      {/* Flat Commuter Handlebar */}
      <line x1="2" y1="15" x2="24" y2="15" stroke="#1E293B" strokeWidth="2.2" strokeLinecap="round" />
      {/* Grips */}
      <rect x="2" y="13.5" width="4.5" height="3" rx="1" fill="#475569" />
      <rect x="19.5" y="13.5" width="4.5" height="3" rx="1" fill="#475569" />
      {/* Compact Cycle Computer Display */}
      <rect x="11.5" y="14" width="3" height="3" rx="0.5" fill="#0284C7" />

      {/* Hydroformed Frame with Integrated Downtube Battery */}
      <rect x="11.5" y="15" width="3" height="19" rx="1.5" fill="#165DAD" />
      {/* Battery Module Highlight */}
      <rect x="12" y="18" width="2" height="13" rx="1" fill="#38BDF8" opacity="0.8" />

      {/* Bottom Bracket & Cranks with Pedals */}
      <circle cx="13" cy="35" r="2" fill="#0F172A" />
      {/* Left Crank & Pedal */}
      <line x1="13" y1="35" x2="6" y2="35" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="4" y="33" width="3" height="4" rx="0.5" fill="#0F172A" />
      {/* Right Crank & Pedal */}
      <line x1="13" y1="35" x2="20" y2="35" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="19" y="33" width="3" height="4" rx="0.5" fill="#0F172A" />

      {/* Top Tube & Seat Post */}
      <rect x="12" y="35" width="2" height="8" fill="#165DAD" />

      {/* Ergonomic Bicycle Saddle */}
      <path
        d="M12 40L9 48C9 50 11 51 13 51C15 51 17 50 17 48L14 40C13.5 39 12.5 39 12 40Z"
        fill="#111827"
      />
      <circle cx="13" cy="45" r="0.8" fill="#475569" />

      {/* Rear Chainstays */}
      <line x1="13" y1="35" x2="11.5" y2="52" stroke="#165DAD" strokeWidth="1.5" />
      <line x1="13" y1="35" x2="14.5" y2="52" stroke="#165DAD" strokeWidth="1.5" />

      {/* Rear Wheel with Hub Motor */}
      <rect x="11.5" y="48" width="3" height="20" rx="1.5" fill="#0F172A" />
      <line x1="13" y1="50" x2="13" y2="66" stroke="#64748B" strokeWidth="0.8" />
      {/* Rear Reflector / LED */}
      <rect x="12" y="52" width="2" height="2" rx="0.5" fill="#EF4444" />
    </svg>
  );
}

/**
 * Realistic Top-View Electric Jeep 4x4
 * Proportions: ~44px width x 86px length
 */
export function TopViewJeep() {
  return (
    <svg
      width="46"
      height="90"
      viewBox="0 0 46 90"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="filter drop-shadow-[0_8px_14px_rgba(0,0,0,0.55)]"
      aria-hidden="true"
    >
      {/* Front Rugged Bumper & Tow Hooks */}
      <rect x="5" y="4" width="36" height="6" rx="2" fill="#0F172A" />
      <rect x="10" y="3" width="3" height="3" rx="0.5" fill="#EF4444" />
      <rect x="33" y="3" width="3" height="3" rx="0.5" fill="#EF4444" />
      {/* Front Skid Plate */}
      <rect x="16" y="2" width="14" height="4" rx="1" fill="#475569" />

      {/* Front Off-Road Tires (Treaded) */}
      <rect x="0" y="10" width="7" height="18" rx="2.5" fill="#090D14" stroke="#1F2937" strokeWidth="0.5" />
      <rect x="39" y="10" width="7" height="18" rx="2.5" fill="#090D14" stroke="#1F2937" strokeWidth="0.5" />
      {/* Front Tire Treads */}
      <line x1="1" y1="13" x2="6" y2="13" stroke="#374151" strokeWidth="1" />
      <line x1="1" y1="17" x2="6" y2="17" stroke="#374151" strokeWidth="1" />
      <line x1="1" y1="21" x2="6" y2="21" stroke="#374151" strokeWidth="1" />
      <line x1="1" y1="25" x2="6" y2="25" stroke="#374151" strokeWidth="1" />
      <line x1="40" y1="13" x2="45" y2="13" stroke="#374151" strokeWidth="1" />
      <line x1="40" y1="17" x2="45" y2="17" stroke="#374151" strokeWidth="1" />
      <line x1="40" y1="21" x2="45" y2="21" stroke="#374151" strokeWidth="1" />
      <line x1="40" y1="25" x2="45" y2="25" stroke="#374151" strokeWidth="1" />

      {/* Rear Off-Road Tires (Treaded) */}
      <rect x="0" y="58" width="7" height="18" rx="2.5" fill="#090D14" stroke="#1F2937" strokeWidth="0.5" />
      <rect x="39" y="58" width="7" height="18" rx="2.5" fill="#090D14" stroke="#1F2937" strokeWidth="0.5" />
      {/* Rear Tire Treads */}
      <line x1="1" y1="61" x2="6" y2="61" stroke="#374151" strokeWidth="1" />
      <line x1="1" y1="65" x2="6" y2="65" stroke="#374151" strokeWidth="1" />
      <line x1="1" y1="69" x2="6" y2="69" stroke="#374151" strokeWidth="1" />
      <line x1="1" y1="73" x2="6" y2="73" stroke="#374151" strokeWidth="1" />
      <line x1="40" y1="61" x2="45" y2="61" stroke="#374151" strokeWidth="1" />
      <line x1="40" y1="65" x2="45" y2="65" stroke="#374151" strokeWidth="1" />
      <line x1="40" y1="69" x2="45" y2="69" stroke="#374151" strokeWidth="1" />
      <line x1="40" y1="73" x2="45" y2="73" stroke="#374151" strokeWidth="1" />

      {/* Main Vehicle Body Frame (Metallic Slate / Armor Blue) */}
      <path
        d="M6 9C6 7 8 6 11 6H35C38 6 40 7 40 9L41 78C41 81 38 83 35 83H11C8 83 6 81 6 78L6 9Z"
        fill="#1E293B"
      />
      {/* Wheel Arch Flairs (Charcoal Matte) */}
      <path d="M5 9L7 9L7 29L5 29Z" fill="#0F172A" />
      <path d="M39 9L41 9L41 29L39 29Z" fill="#0F172A" />
      <path d="M5 57L7 57L7 77L5 77Z" fill="#0F172A" />
      <path d="M39 57L41 57L41 77L39 77Z" fill="#0F172A" />

      {/* Sculpted Hood with Power Bulges */}
      <path
        d="M8 8C8 7.5 9 7 11 7H35C37 7 38 7.5 38 8L37.5 28H8.5L8 8Z"
        fill="#2563EB"
      />
      <rect x="14" y="11" width="18" height="13" rx="1.5" fill="#1D4ED8" />
      {/* Hood Vents */}
      <line x1="16" y1="14" x2="30" y2="14" stroke="#0F172A" strokeWidth="1" strokeLinecap="round" />
      <line x1="16" y1="17" x2="30" y2="17" stroke="#0F172A" strokeWidth="1" strokeLinecap="round" />
      <line x1="16" y1="20" x2="30" y2="20" stroke="#0F172A" strokeWidth="1" strokeLinecap="round" />

      {/* Side Mirrors */}
      <rect x="3" y="27" width="3" height="5" rx="1" fill="#0F172A" stroke="#334155" strokeWidth="0.5" />
      <rect x="40" y="27" width="3" height="5" rx="1" fill="#0F172A" stroke="#334155" strokeWidth="0.5" />

      {/* Raked Windshield (Tinted Glass) */}
      <path
        d="M8.5 29C8.5 28.5 9.5 28 11.5 28H34.5C36.5 28 37.5 28.5 37.5 29L36.5 37H9.5L8.5 29Z"
        fill="#0284C7"
        opacity="0.85"
      />
      {/* Windshield Wipers */}
      <line x1="12" y1="36" x2="22" y2="33" stroke="#0F172A" strokeWidth="1" />
      <line x1="24" y1="36" x2="34" y2="33" stroke="#0F172A" strokeWidth="1" />

      {/* Panoramic Glass Roof & Tubular Adventure Roof Rack */}
      <rect x="9.5" y="38" width="27" height="34" rx="2" fill="#0369A1" opacity="0.75" />
      {/* Roof Rails (Left & Right) */}
      <rect x="8" y="37" width="2" height="37" rx="1" fill="#0F172A" />
      <rect x="36" y="37" width="2" height="37" rx="1" fill="#0F172A" />
      {/* Crossbars */}
      <line x1="9" y1="44" x2="37" y2="44" stroke="#334155" strokeWidth="1.5" />
      <line x1="9" y1="54" x2="37" y2="54" stroke="#334155" strokeWidth="1.5" />
      <line x1="9" y1="64" x2="37" y2="64" stroke="#334155" strokeWidth="1.5" />

      {/* Rear Glass Hatch */}
      <path
        d="M9.5 72H36.5L36 78C36 79 35 80 34 80H12C11 80 10 79 10 78L9.5 72Z"
        fill="#0284C7"
        opacity="0.8"
      />

      {/* Rear LED Tail Light Bars */}
      <rect x="7" y="78" width="4" height="2" rx="0.5" fill="#EF4444" />
      <rect x="35" y="78" width="4" height="2" rx="0.5" fill="#EF4444" />

      {/* Rear Mounted Full-Size Spare Wheel */}
      <circle cx="23" cy="83" r="6" fill="#090D14" stroke="#1F2937" strokeWidth="0.8" />
      <circle cx="23" cy="83" r="3.5" fill="#2563EB" />
      <circle cx="23" cy="83" r="1.5" fill="#0F172A" />
    </svg>
  );
}

// =============================================================================
// ANIMATED VERTICAL ROAD COMPONENT
// =============================================================================

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
      className="hidden xl:block fixed top-0 right-0 h-screen w-[100px] 2xl:w-[114px] pointer-events-none select-none z-20 overflow-hidden"
    >
      {/* Soft Vignette Mask at Top and Bottom for Seamless Entry/Exit */}
      <div
        className="relative w-full h-full flex justify-center"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 6%, black 94%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 6%, black 94%, transparent 100%)',
        }}
      >
        {/* =====================================================================
            ASPHALT ROAD SURFACE
            ===================================================================== */}
        <div className="relative w-full h-full bg-[#181D26] shadow-2xl border-l border-neutral-300/40">
          {/* Subtle Asphalt Texture Noise Overlay */}
          <div
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage:
                'radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px)',
              backgroundSize: '4px 4px',
            }}
          />

          {/* Left Solid Curb Marking (Clean White / Off-White) */}
          <div className="absolute top-0 left-2 bottom-0 w-[2px] bg-white/70 shadow-[0_0_4px_rgba(255,255,255,0.4)]" />

          {/* Right Solid Curb Marking (Clean White / Off-White) */}
          <div className="absolute top-0 right-2 bottom-0 w-[2px] bg-white/70 shadow-[0_0_4px_rgba(255,255,255,0.4)]" />

          {/* Center Dashed Lane Divider (Subtle Animated Downward Movement) */}
          <div
            className={`absolute top-0 left-1/2 -translate-x-1/2 w-[2.5px] h-[200%] ${
              isPaused ? '' : 'animate-road-markings'
            }`}
            style={{
              backgroundImage:
                'linear-gradient(to bottom, #FFFFFF 0px, #FFFFFF 16px, transparent 16px, transparent 34px)',
              backgroundSize: '2.5px 34px',
            }}
          />

          {/* Lane Ambient Glow Strips (Subtle Electric Blue) */}
          <div className="absolute top-0 bottom-0 left-3 w-[1px] bg-sky-400/20" />
          <div className="absolute top-0 bottom-0 right-3 w-[1px] bg-sky-400/20" />

          {/* =====================================================================
              CONTINUOUS ANIMATED EV VEHICLES (TOP TO BOTTOM)
              Staggered speed, lane offset, and collision-free travel loops
              ===================================================================== */}

          {/* 1. Electric Jeep 4x4 (Traveling down the center/left lane) */}
          <div
            className={`absolute left-[12px] 2xl:left-[16px] -top-28 ${
              isPaused ? '' : 'animate-vehicle-jeep'
            }`}
          >
            <TopViewJeep />
          </div>

          {/* 2. Electric Motorcycle (Traveling down the right lane, high speed) */}
          <div
            className={`absolute right-[16px] 2xl:right-[22px] -top-28 ${
              isPaused ? '' : 'animate-vehicle-motorcycle'
            }`}
          >
            <TopViewMotorcycle />
          </div>

          {/* 3. Electric Scooter (Traveling down the center-left lane, steady commute) */}
          <div
            className={`absolute left-[20px] 2xl:left-[26px] -top-28 ${
              isPaused ? '' : 'animate-vehicle-scooter'
            }`}
          >
            <TopViewScooter />
          </div>

          {/* 4. Electric Cycle (Traveling down the left shoulder lane, relaxed cadence) */}
          <div
            className={`absolute left-[8px] 2xl:left-[10px] -top-28 ${
              isPaused ? '' : 'animate-vehicle-cycle'
            }`}
          >
            <TopViewCycle />
          </div>
        </div>
      </div>
    </aside>
  );
}
