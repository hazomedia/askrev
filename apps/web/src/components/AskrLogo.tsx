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
      badge: 'w-7 h-7 rounded-md text-sm',
      title: 'text-base',
      subtitle: 'text-[9px]',
      gap: 'gap-2',
    },
    md: {
      badge: 'w-9 h-9 rounded-lg text-lg',
      title: 'text-lg md:text-xl',
      subtitle: 'text-[10px]',
      gap: 'gap-2.5',
    },
    lg: {
      badge: 'w-11 h-11 rounded-xl text-2xl',
      title: 'text-2xl',
      subtitle: 'text-xs',
      gap: 'gap-3',
    },
  }[size];

  const content = (
    <div className={`flex items-center ${sizeClasses.gap} ${className}`}>
      {/* Official ASKR EV Badge: #165DAD Primary Brand Blue with White 'A' */}
      <div
        className={`${sizeClasses.badge} bg-[#165DAD] flex items-center justify-center text-white font-black shadow-sm shrink-0 select-none tracking-normal`}
        aria-hidden="true"
      >
        A
      </div>

      <div className="flex flex-col leading-none justify-center">
        <div
          className={`${sizeClasses.title} font-extrabold tracking-tight select-none ${
            isDark ? 'text-white' : 'text-[#253247]'
          }`}
        >
          ASKR <span className="text-[#165DAD]">EV</span>
        </div>
        {showSubtitle && (
          <span
            className={`${sizeClasses.subtitle} font-semibold uppercase tracking-widest mt-0.5 select-none ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Mobility
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center group transition-opacity hover:opacity-95" aria-label="ASKR EV Home">
        {content}
      </Link>
    );
  }

  return content;
}

