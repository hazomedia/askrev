'use client';

import React from 'react';
import Link from 'next/link';

export interface AskrLogoProps {
  theme?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'responsive' | 'full' | 'icon';
  href?: string;
  className?: string;
  imgClassName?: string;
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
 * In accordance with Requirement 17:
 * The full horizontal logo is rendered on BOTH desktop and mobile headers.
 * On mobile, it scales cleanly between 150px–180px wide with object-contain.
 * The square icon is reserved strictly for favicon, app icons, and explicit variant="icon".
 */
export default function AskrLogo({
  theme = 'light',
  size = 'md',
  variant = 'full',
  href = '/',
  className = '',
  imgClassName = '',
  priority = true,
  alt = 'ASKR EV Mobility',
}: AskrLogoProps) {
  // Height configurations per size preset
  const sizeConfig = {
    sm: {
      fullHeightClass: 'h-6 sm:h-7 md:h-8',
      fullWidthClass: 'max-w-[140px] xs:max-w-[160px] sm:max-w-[180px] md:max-w-[210px]',
      iconSizeClass: 'h-7 w-7',
      containerClass: 'gap-2',
    },
    md: {
      fullHeightClass: 'h-7 sm:h-8 md:h-9',
      fullWidthClass: 'max-w-[155px] xs:max-w-[175px] sm:max-w-[200px] md:max-w-[240px]',
      iconSizeClass: 'h-8 w-8 sm:h-9 sm:w-9',
      containerClass: 'gap-2.5',
    },
    lg: {
      fullHeightClass: 'h-8 sm:h-10 md:h-11',
      fullWidthClass: 'max-w-[180px] xs:max-w-[210px] sm:max-w-[240px] md:max-w-[280px]',
      iconSizeClass: 'h-9 w-9 sm:h-10 sm:w-10',
      containerClass: 'gap-3',
    },
    xl: {
      fullHeightClass: 'h-10 sm:h-12 md:h-14',
      fullWidthClass: 'max-w-[220px] xs:max-w-[260px] sm:max-w-[300px] md:max-w-[360px]',
      iconSizeClass: 'h-12 w-12 sm:h-14 sm:w-14',
      containerClass: 'gap-3.5',
    },
  }[size];

  const fullLogoElement = (
    <picture className="inline-flex items-center shrink-0">
      <source srcSet="/brand/askrev-full-logo.webp" type="image/webp" />
      <source srcSet="/brand/askrev-full-logo.png" type="image/png" />
      <img
        src="/brand/askrev-full-logo.webp"
        alt={alt}
        width={2048}
        height={684}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className={`${imgClassName || `${sizeConfig.fullHeightClass} ${sizeConfig.fullWidthClass}`} w-auto object-contain select-none transition-opacity duration-200`}
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
        src="/brand/askrev-icon.webp"
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

  if (variant === 'icon') {
    renderContent = iconElement;
  } else {
    // Both 'full' and 'responsive' render the official full horizontal logo on desktop & mobile
    renderContent = fullLogoElement;
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
