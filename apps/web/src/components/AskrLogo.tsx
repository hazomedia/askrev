'use client';

import React from 'react';
import Link from 'next/link';

interface AskrLogoProps {
  theme?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  href?: string;
  className?: string;
}

export default function AskrLogo({
  theme = 'light',
  size = 'md',
  showSubtitle = true,
  href = '/',
  className = '',
}: AskrLogoProps) {
  const isDark = theme === 'dark';

  const sizeClasses = {
    sm: {
      badge: 'w-7 h-7 rounded-lg text-xs',
      title: 'text-sm sm:text-base',
      subtitle: 'text-[8px]',
      gap: 'gap-2',
    },
    md: {
      badge: 'w-9 h-9 rounded-xl text-sm',
      title: 'text-base sm:text-lg',
      subtitle: 'text-[9px]',
      gap: 'gap-2.5',
    },
    lg: {
      badge: 'w-11 h-11 rounded-2xl text-base',
      title: 'text-xl sm:text-2xl',
      subtitle: 'text-[10px]',
      gap: 'gap-3',
    },
  }[size];

  const content = (
    <div className={`flex items-center ${sizeClasses.gap} ${className}`}>
      {/* Official ASKR EV Monogram Emblem */}
      <div
        className={`${sizeClasses.badge} bg-gradient-to-br from-[#0C2348] to-[#165DAD] border border-blue-400/30 flex items-center justify-center text-white font-black shadow-xs shrink-0 select-none relative overflow-hidden`}
        aria-hidden="true"
      >
        <svg viewBox="0 0 40 40" className="w-5/6 h-5/6" fill="none">
          <path d="M20 7L9 33H14.5L16.8 26.5H23.2L25.5 33H31L20 7H20ZM20 15L22.2 21.8H17.8L20 15Z" fill="#FFFFFF" />
          <path d="M26 6L21 18H25L20 30L29 16H24.5L26 6Z" fill="#50D9FF" opacity="0.95" />
        </svg>
      </div>

      <div className="flex flex-col leading-none justify-center">
        <div
          className={`${sizeClasses.title} font-black tracking-tight select-none flex items-center gap-1 ${
            isDark ? 'text-white' : 'text-[#0C2348]'
          }`}
        >
          <span>ASKR</span>
          <span className="bg-gradient-to-r from-[#1D4ED8] to-[#0891D2] bg-clip-text text-transparent">EV</span>
        </div>
        {showSubtitle && (
          <span
            className={`${sizeClasses.subtitle} font-bold uppercase tracking-widest mt-0.5 select-none ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Electric Mobility
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center group transition-opacity hover:opacity-90" aria-label="ASKR EV">
        {content}
      </Link>
    );
  }

  return content;
}
