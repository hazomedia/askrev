// apps/web/src/lib/server-catalog.ts
import { paiseToRupees } from '@askrev/shared';

export interface FormattedHeroSlide {
  id: string;
  vehicle: {
    id: string;
    name: string;
    modelCode: string;
    category: string;
    categoryLabel: string;
    brand: string;
    sellingPriceINR: number | null;
    exShowroomPriceINR: number | null;
    rangeKm: number | null;
    topSpeedKmh: number | null;
    batteryCapacityKwh: number | null;
    payloadCapacityKg: number | null;
    acceleration0to40?: string;
  };
  headline: string;
  subline: string;
  primaryBadge: string;
  image: string;
  mobileImage: string;
  desktopFocalX?: number;
  desktopFocalY?: number;
  mobileFocalX?: number;
  mobileFocalY?: number;
  ambientGlow?: string;
  ambientCyan?: string;
  ctaText?: string;
  ctaLink?: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  primaryCtaEnabled?: boolean;
  secondaryCtaEnabled?: boolean;
  slideOrder?: number;
}

export function getBaselineHeroSlides(): FormattedHeroSlide[] {
  return [
    {
      id: 'baseline-slide-1',
      vehicle: {
        id: 'askr-ev-s01',
        name: 'ASKR EV S01 (Jatayu Series)',
        modelCode: 'ASKR-EV-S01',
        category: 'SCOOTER',
        categoryLabel: 'Electric Scooter',
        brand: 'ASKR EV',
        sellingPriceINR: 52000,
        exShowroomPriceINR: 52000,
        rangeKm: 85,
        topSpeedKmh: 55,
        batteryCapacityKwh: 2.1,
        payloadCapacityKg: 150,
        acceleration0to40: '3.2 sec',
      },
      headline: 'DRIVE THE FUTURE. DRIVE ELECTRIC.',
      subline:
        "Experience the next generation of urban electric mobility. High-efficiency motor, aerodynamic styling, and smart regenerative braking.",
      primaryBadge: 'ASKR EV Fleet • Premium High-Efficiency Commuter',
      image: '/images/real/branded/askr-s01-jatayu-orange-hero.webp',
      mobileImage: '/images/real/branded/askr-s01-jatayu-orange-mobile.webp',
      desktopFocalX: 50,
      desktopFocalY: 50,
      mobileFocalX: 50,
      mobileFocalY: 50,
      ambientGlow: 'rgba(255, 107, 0, 0.35)',
      ambientCyan: 'rgba(38, 125, 255, 0.20)',
      ctaText: 'Explore ASKR EV S01',
      ctaLink: '/bikes/askr-ev-s01',
      secondaryCtaText: 'Book Test Ride',
      secondaryCtaLink: '/auth/register',
      primaryCtaEnabled: true,
      secondaryCtaEnabled: true,
      slideOrder: 1,
    },
    {
      id: 'baseline-slide-2',
      vehicle: {
        id: 'askr-ev-b01',
        name: 'ASKR EV B01 Sport',
        modelCode: 'ASKR-EV-B01',
        category: 'BIKE',
        categoryLabel: 'Electric Motorcycle',
        brand: 'ASKR EV',
        sellingPriceINR: 98000,
        exShowroomPriceINR: 98000,
        rangeKm: 140,
        topSpeedKmh: 95,
        batteryCapacityKwh: 4.0,
        payloadCapacityKg: 180,
        acceleration0to40: '2.8 sec',
      },
      headline: 'ENGINEERED FOR URBAN PRECISION',
      subline:
        'High-torque electric motorcycle engineered for highway touring and agile urban agility with zero tailpipe emissions.',
      primaryBadge: 'ASKR EV Performance Series • High-Torque Powertrain',
      image: '/images/real/branded/askr-b01-racing-front.jpg',
      mobileImage: '/images/real/branded/askr-b01-racing-front.jpg',
      desktopFocalX: 50,
      desktopFocalY: 50,
      ambientGlow: 'rgba(38, 125, 255, 0.35)',
      ambientCyan: 'rgba(80, 217, 255, 0.18)',
      ctaText: 'Explore ASKR EV B01',
      ctaLink: '/bikes/askr-ev-b01',
      secondaryCtaText: 'View Specs',
      secondaryCtaLink: '/bikes/askr-ev-b01',
      primaryCtaEnabled: true,
      secondaryCtaEnabled: true,
      slideOrder: 2,
    },
    {
      id: 'baseline-slide-3',
      vehicle: {
        id: 'askr-ev-j01',
        name: 'ASKR EV J01 4x4 Monster',
        modelCode: 'ASKR-EV-J01',
        category: 'JEEP',
        categoryLabel: 'Electric 4x4 Jeep',
        brand: 'ASKR EV',
        sellingPriceINR: null,
        exShowroomPriceINR: null,
        rangeKm: 120,
        topSpeedKmh: 65,
        batteryCapacityKwh: 7.2,
        payloadCapacityKg: 450,
        acceleration0to40: '4.1 sec',
      },
      headline: 'CONQUER EVERY TERRAIN. EMISSION FREE.',
      subline:
        'All-terrain all-electric adventure vehicle featuring reinforced steel safety cage, high-traction axles, and dual-zone power.',
      primaryBadge: 'ASKR EV Off-Road • Adventure Grade 4x4',
      image: '/images/real/branded/askr-j01-monster-front.jpg',
      mobileImage: '/images/real/branded/askr-j01-monster-front.jpg',
      desktopFocalX: 50,
      desktopFocalY: 50,
      ambientGlow: 'rgba(37, 99, 235, 0.35)',
      ambientCyan: 'rgba(99, 102, 241, 0.18)',
      ctaText: 'Explore ASKR EV J01',
      ctaLink: '/bikes/askr-ev-j01',
      secondaryCtaText: 'Showroom Fleet',
      secondaryCtaLink: '/jeeps',
      primaryCtaEnabled: true,
      secondaryCtaEnabled: true,
      slideOrder: 3,
    },
  ];
}

export function formatHeroSlideFromApi(s: any, isPreview = false): FormattedHeroSlide {
  const linked = s.linkedProduct || {};
  const cat = (linked.category || '').toUpperCase();
  const ambientGlow =
    cat === 'CYCLE'
      ? 'rgba(13, 148, 136, 0.28)'
      : cat === 'JEEP'
      ? 'rgba(37, 99, 235, 0.35)'
      : cat === 'UTILITY'
      ? 'rgba(234, 179, 8, 0.28)'
      : 'rgba(38, 125, 255, 0.35)';

  const ambientCyan =
    cat === 'CYCLE'
      ? 'rgba(94, 234, 212, 0.14)'
      : cat === 'JEEP'
      ? 'rgba(99, 102, 241, 0.18)'
      : cat === 'UTILITY'
      ? 'rgba(59, 130, 246, 0.20)'
      : 'rgba(80, 217, 255, 0.18)';

  const defaultLink = linked.slug ? `/bikes/${linked.slug}${isPreview ? '?preview=true' : ''}` : '/scooters';

  return {
    id: s.id,
    vehicle: {
      id: linked.id || s.id,
      name: linked.name || s.internalName || 'ASKR EV Fleet',
      modelCode: linked.modelCode || (linked.slug ? linked.slug.toUpperCase() : 'ASKR-EV'),
      category: linked.category || 'SCOOTER',
      categoryLabel: linked.categoryLabel || linked.category || 'Electric Vehicle',
      brand: linked.brand || 'ASKR EV',
      sellingPriceINR: linked.sellingPriceINR || null,
      exShowroomPriceINR: linked.sellingPriceINR || null,
      rangeKm: linked.rangeKm || null,
      topSpeedKmh: linked.topSpeedKmh || null,
      batteryCapacityKwh: linked.batteryCapacityKwh || null,
      payloadCapacityKg: linked.payloadCapacityKg || null,
      acceleration0to40: '3.2 sec',
    },
    headline: s.heading,
    subline: s.subheading || s.description || "Discover ASKR EV's range of electric scooters, motorcycles and utility vehicles.",
    primaryBadge: s.eyebrowText || (linked.name ? `${linked.name} • ${linked.category || 'EV'}` : 'ASKR EV Real Fleet'),
    image: s.desktopImageUrl,
    mobileImage: s.mobileImageUrl || s.desktopImageUrl,
    desktopFocalX: s.desktopFocalX ?? 50,
    desktopFocalY: s.desktopFocalY ?? 50,
    mobileFocalX: s.mobileFocalX ?? 50,
    mobileFocalY: s.mobileFocalY ?? 50,
    ambientGlow: s.ambientGlow || ambientGlow,
    ambientCyan: s.ambientCyan || ambientCyan,
    ctaText: s.primaryCtaText || 'Explore Vehicle',
    ctaLink: s.primaryCtaLink || defaultLink,
    secondaryCtaText: s.secondaryCtaText || (cat === 'UTILITY' ? 'Enquire Now' : 'Experience EV'),
    secondaryCtaLink: s.secondaryCtaLink || '/auth/register',
    primaryCtaEnabled: s.primaryCtaEnabled !== false,
    secondaryCtaEnabled: s.secondaryCtaEnabled !== false,
    slideOrder: s.slideOrder || 0,
  };
}

export async function getPublishedHeroSlidesServer(preview = false): Promise<FormattedHeroSlide[]> {
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');
  try {
    const endpoint = `${apiBase}/public/homepage/hero-slides`;
    const res = await fetch(endpoint, {
      next: { revalidate: preview ? 0 : 30 },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((s) => formatHeroSlideFromApi(s, preview));
      }
    }
  } catch (err: any) {
    console.warn('[SSR Hero] Live slides fetch skipped, using baseline:', err.message);
  }
  return getBaselineHeroSlides();
}

export async function getPublishedCatalogServer(preview = false): Promise<any[]> {
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');
  try {
    const endpoint = preview ? `${apiBase}/catalog?preview=true` : `${apiBase}/catalog`;
    const res = await fetch(endpoint, {
      next: { revalidate: preview ? 0 : 30 },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data;
      }
    }
  } catch (err: any) {
    console.warn('[SSR Catalog] Live catalog fetch skipped:', err.message);
  }
  return [];
}
