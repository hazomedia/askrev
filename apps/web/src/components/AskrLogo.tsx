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
 * - Full horizontal glossy eco logo: /brand/askrev-glossy-eco-logo.webp (2123x673, transparent)
 * - Square icon: /brand/askrev-icon.webp (1254x1254, transparent)
 *
 * Enforces native aspect ratios (never stretched, cropped, or distorted).
 * The full horizontal logo is rendered on BOTH desktop and mobile headers.
 * On mobile, it scales cleanly between 160px–240px wide with object-contain.
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
      fullHeightClass: 'h-7 sm:h-8 md:h-9',
      fullWidthClass: 'max-w-[150px] xs:max-w-[170px] sm:max-w-[190px] md:max-w-[220px]',
      iconSizeClass: 'h-7 w-7',
      containerClass: 'gap-2',
    },
    md: {
      fullHeightClass: 'h-8 sm:h-9 md:h-10',
      fullWidthClass: 'max-w-[180px] xs:max-w-[200px] sm:max-w-[230px] md:max-w-[260px]',
      iconSizeClass: 'h-8 w-8 sm:h-9 sm:w-9',
      containerClass: 'gap-2.5',
    },
    lg: {
      fullHeightClass: 'h-10 sm:h-11 md:h-12',
      fullWidthClass: 'max-w-[210px] xs:max-w-[240px] sm:max-w-[270px] md:max-w-[320px]',
      iconSizeClass: 'h-9 w-9 sm:h-10 sm:w-10',
      containerClass: 'gap-3',
    },
    xl: {
      fullHeightClass: 'h-12 sm:h-14 md:h-16',
      fullWidthClass: 'max-w-[260px] xs:max-w-[300px] sm:max-w-[350px] md:max-w-[420px]',
      iconSizeClass: 'h-12 w-12 sm:h-14 sm:w-14',
      containerClass: 'gap-3.5',
    },
  }[size];

  const isDark = theme === 'dark';
  const logoSrcWebp = isDark
    ? '/brand/askrev-white-gold-logo.webp'
    : '/brand/askrev-glossy-eco-logo.webp';
  const logoSrcPng = isDark
    ? '/brand/askrev-white-gold-logo.png'
    : '/brand/askrev-glossy-eco-logo.png';
  const logoWidth = isDark ? 1636 : 2123;
  const logoHeight = isDark ? 485 : 673;
  const logoAspectRatio = isDark ? '1636 / 485' : '2123 / 673';

  const fullLogoElement = (
    <picture className="inline-flex items-center shrink-0">
      <source srcSet={logoSrcWebp} type="image/webp" />
      <source srcSet={logoSrcPng} type="image/png" />
      <img
        src={logoSrcWebp}
        alt={alt}
        width={logoWidth}
        height={logoHeight}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className={`${imgClassName || `${sizeConfig.fullHeightClass} ${sizeConfig.fullWidthClass}`} w-auto object-contain select-none transition-opacity duration-200`}
        style={{
          aspectRatio: logoAspectRatio,
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
