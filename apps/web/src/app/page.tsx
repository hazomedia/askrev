import React from 'react';
import type { Metadata } from 'next';
import HomeShowroom from '../components/home/HomeShowroom';
import {
  getPublishedHeroSlidesServer,
  getPublishedCatalogServer,
} from '../lib/server-catalog';

export const metadata: Metadata = {
  title: 'ASKR EV — High-Performance Electric Vehicles & Sustainable Mobility',
  description:
    'Experience the next generation of electric mobility. Explore certified ASKR EV electric scooters, motorcycles, utility loaders, and 4x4 all-terrain jeeps.',
};

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [heroSlides, products] = await Promise.all([
    getPublishedHeroSlidesServer(false),
    getPublishedCatalogServer(false),
  ]);

  const primaryPreloadImage = heroSlides?.[0]?.image || '/images/real/branded/askr-s01-jatayu-orange-hero.webp';
  const primaryMobilePreloadImage = heroSlides?.[0]?.mobileImage || primaryPreloadImage;

  return (
    <>
      {/* High-priority preloading for instant zero-flash LCP paint */}
      {primaryPreloadImage && (
        <link
          rel="preload"
          as="image"
          href={primaryPreloadImage}
          fetchPriority="high"
        />
      )}
      {primaryMobilePreloadImage && primaryMobilePreloadImage !== primaryPreloadImage && (
        <link
          rel="preload"
          as="image"
          href={primaryMobilePreloadImage}
          media="(max-width: 640px)"
          fetchPriority="high"
        />
      )}

      <HomeShowroom initialHeroSlides={heroSlides} initialProducts={products} />
    </>
  );
}
