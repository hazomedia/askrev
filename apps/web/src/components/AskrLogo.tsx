'use client';

import React from 'react';
import Link from 'next/link';

export interface AskrLogoProps {
  theme?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'responsive' | 'full' | 'icon';
  href?: string;
  className?: string;
  priority?: boolean;
  alt?: string;
}

/**
 * Official ASKR EV Branding Component
 *
 * Utilizes the authoritative official assets:
 * - Full horizontal logo: /brand/askrev-full-logo.webp (2048x684, transparent)
 * - Square icon: /brand/askrev-icon.webp (1254x1254, transparent)
 *
 * Enforces native aspect ratios (never stretched, cropped, or distorted).
 * On responsive mode (default), renders the square icon on mobile (< sm)
 * and the full horizontal logo on desktop (sm: and above).
 */
export default function AskrLogo({
  theme = 'light',
  size = 'md',
  variant = 'responsive',
  href = '/',
  className = '',
  priority = true,
  alt = 'ASKR EV Mobility',
}: AskrLogoProps) {
  // Height configurations per size preset
  const sizeConfig = {
    sm: {
      fullHeightClass: 'h-7 sm:h-8',
      iconSizeClass: 'h-7 w-7',
      containerClass: 'gap-2',
    },
    md: {
      fullHeightClass: 'h-8 sm:h-9',
      iconSizeClass: 'h-8 w-8 sm:h-9 sm:w-9',
      containerClass: 'gap-2.5',
    },
    lg: {
      fullHeightClass: 'h-10 sm:h-11',
      iconSizeClass: 'h-9 w-9 sm:h-10 sm:w-10',
      containerClass: 'gap-3',
    },
    xl: {
      fullHeightClass: 'h-12 sm:h-14',
      iconSizeClass: 'h-12 w-12 sm:h-14 sm:w-14',
      containerClass: 'gap-3.5',
    },
  }[size];

  const fullLogoElement = (
    <picture className="inline-flex items-center shrink-0">
      <source srcSet="/brand/askrev-full-logo.webp" type="image/webp" />
      <source srcSet="/brand/askrev-full-logo.png" type="image/png" />
      <img
        src="/brand/askrev-full-logo.png"
        alt={alt}
        width={2048}
        height={684}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className={`${sizeConfig.fullHeightClass} w-auto max-w-[240px] sm:max-w-none object-contain select-none transition-opacity duration-200`}
        style={{
          aspectRatio: '2048 / 684',
        }}
      />
    </picture>
  );

  const iconElement = (
    <picture className="inline-flex items-center shrink-0">
      <source srcSet="/brand/askrev-icon.webp" type="image/webp" />
      <source srcSet="/brand/askrev-icon.png" type="image/png" />
      <img
        src="/brand/askrev-icon.png"
        alt="ASKR EV Icon"
        width={1254}
        height={1254}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className={`${sizeConfig.iconSizeClass} object-contain select-none transition-opacity duration-200`}
        style={{
          aspectRatio: '1 / 1',
        }}
      />
    </picture>
  );

  let renderContent: React.ReactNode;

  if (variant === 'full') {
    renderContent = fullLogoElement;
  } else if (variant === 'icon') {
    renderContent = iconElement;
  } else {
    // variant === 'responsive'
    // On small mobile screens (< sm), render square icon so it fits without distortion.
    // On sm screens and larger, render full horizontal logo.
    renderContent = (
      <>
        <div className="sm:hidden flex items-center shrink-0">
          {iconElement}
        </div>
        <div className="hidden sm:flex items-center shrink-0">
          {fullLogoElement}
        </div>
      </>
    );
  }

  const wrapperClass = `inline-flex items-center shrink-0 select-none ${className}`;

  if (href) {
    return (
      <Link
        href={href}
        className={`${wrapperClass} group transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg`}
        aria-label="ASKR EV Home"
      >
        {renderContent}
      </Link>
    );
  }

  return <div className={wrapperClass}>{renderContent}</div>;
}
