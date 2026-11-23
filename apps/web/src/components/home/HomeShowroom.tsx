'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  BatteryCharging,
  Gauge,
  Zap,
  Clock,
  Sparkles,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import Navbar from '../Navbar';
import Footer from '../Footer';
import BikeCard from '../BikeCard';
import BookingModal from '../BookingModal';
import VerticalRoad from '../VerticalRoad';
import MobileBackgroundRoad from '../MobileBackgroundRoad';
import GroundMist from '../GroundMist';
import AdminPreviewBanner from '../AdminPreviewBanner';
import {
  fetchPublishedCatalog,
  fetchHeroSliderSlides,
  getStoredUser,
  isAdminUser,
  isAdminPreviewActive,
} from '../../lib/api';
import { ALL_CATALOG_VEHICLES } from '../../lib/catalog';

const LEGACY_DEMO_SLUGS = new Set([
  'thunder-pro',
  'scooter-s1-air',
  'terramax-4x4',
  'apex-sport',
  'terramax-urban',
  'scooter-s1-pro',
  'city-cruise',
  'aerotrek-c1',
  'aerotrek-trail',
]);

const FALLBACK_HERO_SLIDES = [
  {
    id: 'baseline-slide-1',
    vehicle: {
      id: 'askr-ev-s01',
      name: 'ASKR EV S01 (Jatayu Series)',
      modelCode: 'ASKR-EV-S01',
      category: 'SCOOTER',
      categoryLabel: 'Electric Scooter',
      brand: 'ASKR EV',
      manufacturer: 'ASKR EV Mobility',
      tagline: 'High-Efficiency Commuter Fleet',
      heroImage: '/images/real/branded/askr-s01-jatayu-orange-hero.webp',
      imageUrl: '/images/real/branded/askr-s01-jatayu-orange-hero.webp',
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
      "Discover ASKR EV's range of electric scooters, motorcycles, utility vehicles, and 4x4 off-roaders.",
    primaryBadge: 'ASKR EV Fleet • Premium High-Efficiency Commuter',
    image: '/images/real/branded/askr-s01-jatayu-orange-hero.webp',
    mobileImage: '/images/real/branded/askr-s01-jatayu-orange-mobile.webp',
    desktopFocalX: 50,
    desktopFocalY: 50,
    mobileFocalX: 50,
    mobileFocalY: 50,
    desktopAltText: 'ASKR EV S01 Jatayu Electric Scooter',
    mobileAltText: 'ASKR EV S01 Jatayu Electric Scooter',
    ctaText: 'Explore ASKR EV S01',
    ctaLink: '/bikes/askr-ev-s01',
    ctaStyle: 'PRIMARY',
    primaryCtaEnabled: true,
    secondaryCtaEnabled: true,
    secondaryCtaLabel: 'Book Test Ride',
    secondaryCtaUrl: '/auth/register',
    secondaryCtaStyle: 'SECONDARY',
    showPrice: true,
    showRange: true,
    showTopSpeed: true,
    showBattery: true,
    showSpecifications: true,
    ambientGlow: 'rgba(255, 107, 0, 0.35)',
    ambientCyan: 'rgba(38, 125, 255, 0.20)',
  },
  {
    id: 'baseline-slide-2',
    vehicle: {
      id: 'askr-ev-b01',
      name: 'ASKR EV B01',
      modelCode: 'ASKR-EV-B01',
      category: 'BIKE',
      categoryLabel: 'Electric Motorcycle',
      brand: 'ASKR EV',
      manufacturer: 'ASKR EV Mobility',
      tagline: 'High-Performance Electric Sports Motorcycle',
      heroImage: '/images/real/branded/askr-b01-racing-front.jpg',
      imageUrl: '/images/real/branded/askr-b01-racing-front.jpg',
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
      'Track-grade trellis chassis, inverted front telescopic forks, and instant high-torque electric powertrain.',
    primaryBadge: 'ASKR EV Real Fleet • Electric Motorcycle',
    image: '/images/real/branded/askr-b01-racing-front.jpg',
    mobileImage: '/images/real/branded/askr-b01-racing-front.jpg',
    desktopFocalX: 50,
    desktopFocalY: 50,
    mobileFocalX: 50,
    mobileFocalY: 50,
    desktopAltText: 'ASKR EV B01 Electric Motorcycle',
    mobileAltText: 'ASKR EV B01 Electric Motorcycle',
    ctaText: 'Explore ASKR EV B01',
    ctaLink: '/bikes/askr-ev-b01',
    ctaStyle: 'PRIMARY',
    primaryCtaEnabled: true,
    secondaryCtaEnabled: true,
    secondaryCtaLabel: 'View Specs',
    secondaryCtaUrl: '/bikes/askr-ev-b01',
    secondaryCtaStyle: 'SECONDARY',
    showPrice: true,
    showRange: true,
    showTopSpeed: true,
    showBattery: true,
    showSpecifications: true,
    ambientGlow: 'rgba(38, 125, 255, 0.35)',
    ambientCyan: 'rgba(80, 217, 255, 0.18)',
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
      manufacturer: 'ASKR EV Mobility',
      tagline: 'All-Terrain 4x4 Electric Off-Road Jeep',
      heroImage: '/images/real/branded/askr-j01-monster-front.jpg',
      imageUrl: '/images/real/branded/askr-j01-monster-front.jpg',
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
      'All-terrain all-electric adventure vehicle with full steel roll cage and high-traction off-road capability.',
    primaryBadge: 'ASKR EV Real Fleet • 4x4 Off-Road Adventure',
    image: '/images/real/branded/askr-j01-monster-front.jpg',
    mobileImage: '/images/real/branded/askr-j01-monster-front.jpg',
    desktopFocalX: 50,
    desktopFocalY: 50,
    mobileFocalX: 50,
    mobileFocalY: 50,
    desktopAltText: 'ASKR EV J01 4x4 Monster Jeep',
    mobileAltText: 'ASKR EV J01 4x4 Monster Jeep',
    ctaText: 'Explore ASKR EV J01',
    ctaLink: '/bikes/askr-ev-j01',
    ctaStyle: 'PRIMARY',
    primaryCtaEnabled: true,
    secondaryCtaEnabled: true,
    secondaryCtaLabel: 'Showroom Fleet',
    secondaryCtaUrl: '/jeeps',
    secondaryCtaStyle: 'SECONDARY',
    showPrice: false,
    showRange: true,
    showTopSpeed: true,
    showBattery: true,
    showSpecifications: true,
    ambientGlow: 'rgba(37, 99, 235, 0.35)',
    ambientCyan: 'rgba(99, 102, 241, 0.18)',
  },
];

interface HomeShowroomProps {
  initialHeroSlides?: any[];
  initialProducts?: any[];
}

export default function HomeShowroom({
  initialHeroSlides,
  initialProducts,
}: HomeShowroomProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<
    'all' | 'scooters' | 'bikes' | 'cycles' | 'jeeps' | 'utility'
  >('scooters');
  const [bookingVehicle, setBookingVehicle] = useState<any | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  // Initialize with SSR data to eliminate image flashing completely
  const [heroSlides, setHeroSlides] = useState<any[]>(
    initialHeroSlides && initialHeroSlides.length > 0
      ? initialHeroSlides
      : FALLBACK_HERO_SLIDES
  );
  const [products, setProducts] = useState<any[]>(
    initialProducts && initialProducts.length > 0
      ? initialProducts
      : ALL_CATALOG_VEHICLES
  );
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const loadCatalog = async () => {
    setLoadingProducts(true);
    setCatalogError(null);
    try {
      const isPreview = isAdminPreviewActive();
      const isAdmin = isAdminUser();
      const [catalogRes, heroSliderRes] = await Promise.allSettled([
        fetchPublishedCatalog({ preview: isPreview }),
        fetchHeroSliderSlides(isPreview),
      ]);

      const rawData =
        catalogRes.status === 'fulfilled' && Array.isArray(catalogRes.value)
          ? catalogRes.value
          : [];
      if (catalogRes.status === 'rejected') {
        throw catalogRes.reason;
      }
      if (rawData.length > 0) {
        const hasRealFleet = rawData.some(
          (p: any) => p.slug && p.slug.startsWith('askr-ev-')
        );
        const shouldFilterLegacy = isPreview && (isAdmin || hasRealFleet);
        const data = shouldFilterLegacy
          ? rawData.filter((p: any) => !LEGACY_DEMO_SLUGS.has(p.slug))
          : rawData;
        setProducts(data);
      }

      const rawHeroSlider =
        heroSliderRes.status === 'fulfilled' &&
        Array.isArray(heroSliderRes.value) &&
        heroSliderRes.value.length > 0
          ? heroSliderRes.value
          : [];

      if (rawHeroSlider.length > 0) {
        const formattedSlides = rawHeroSlider.map((s: any) => {
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

          const defaultLink = linked.slug
            ? `/bikes/${linked.slug}${isPreview ? '?preview=true' : ''}`
            : '/scooters';

          return {
            id: s.id,
            vehicle: {
              id: linked.id || s.id,
              name: linked.name || s.internalName || 'ASKR EV Fleet',
              modelCode:
                linked.modelCode ||
                (linked.slug ? linked.slug.toUpperCase() : 'ASKR-EV'),
              category: linked.category || 'SCOOTER',
              categoryLabel:
                linked.categoryLabel || linked.category || 'Electric Vehicle',
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
            subline:
              s.subheading ||
              s.description ||
              "Discover ASKR EV's range of electric scooters, motorcycles and utility vehicles.",
            primaryBadge:
              s.eyebrowText ||
              (linked.name
                ? `${linked.name} • ${linked.category || 'EV'}`
                : 'ASKR EV Real Fleet'),
            image: s.desktopImageUrl,
            mobileImage: s.mobileImageUrl || s.desktopImageUrl,
            desktopFocalX: s.desktopFocalX ?? 50,
            desktopFocalY: s.desktopFocalY ?? 50,
            mobileFocalX: s.mobileFocalX ?? 50,
            mobileFocalY: s.mobileFocalY ?? 50,
            desktopAltText: s.desktopAltText || s.heading,
            mobileAltText: s.mobileAltText || s.heading,
            ctaText: s.primaryCtaLabel || 'Explore Vehicles',
            ctaLink: s.primaryCtaUrl
              ? `${s.primaryCtaUrl}${
                  isPreview
                    ? s.primaryCtaUrl.includes('?')
                      ? '&preview=true'
                      : '?preview=true'
                    : ''
                }`
              : defaultLink,
            ctaStyle: s.primaryCtaStyle || 'PRIMARY',
            primaryCtaEnabled: s.primaryCtaEnabled !== false,
            secondaryCtaEnabled: Boolean(
              s.secondaryCtaEnabled && s.secondaryCtaLabel
            ),
            secondaryCtaLabel: s.secondaryCtaLabel || 'Book Test Drive',
            secondaryCtaUrl: s.secondaryCtaUrl
              ? `${s.secondaryCtaUrl}${
                  isPreview
                    ? s.secondaryCtaUrl.includes('?')
                      ? '&preview=true'
                      : '?preview=true'
                    : ''
                }`
              : '/test-ride',
            secondaryCtaStyle: s.secondaryCtaStyle || 'SECONDARY',
            showPrice: Boolean(s.showPrice),
            showRange: Boolean(s.showRange),
            showTopSpeed: Boolean(s.showTopSpeed),
            showBattery: Boolean(s.showBattery),
            showSpecifications: Boolean(s.showSpecifications),
            ambientGlow,
            ambientCyan,
          };
        });
        setHeroSlides(formattedSlides);
      }
    } catch (err: any) {
      console.warn('Live catalog fetch notice:', err.message);
      setProducts((prev) => (prev.length > 0 ? prev : ALL_CATALOG_VEHICLES));
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    setCurrentUser(getStoredUser());

    // Only force client re-fetch if preview mode is active or initial data was missing
    if (isAdminPreviewActive() || !initialHeroSlides?.length) {
      loadCatalog();
    }

    const handlePreviewChange = () => {
      loadCatalog();
    };

    window.addEventListener('askrev_preview_change', handlePreviewChange);
    return () =>
      window.removeEventListener('askrev_preview_change', handlePreviewChange);
  }, []);

  // Auto-advance hero slider every 7.5 seconds
  useEffect(() => {
    if (!heroSlides.length) return;
    const timer = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % heroSlides.length);
    }, 7500);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  const activeSlide =
    heroSlides[currentSlideIndex] || heroSlides[0] || FALLBACK_HERO_SLIDES[0];
  const activeVehicle =
    activeSlide?.vehicle || FALLBACK_HERO_SLIDES[0].vehicle;

  const getHeroMetrics = (isMobile: boolean = false) => {
    const list: Array<{ id: string; label: string; value: React.ReactNode }> =
      [];

    if (
      activeSlide?.showRange !== false &&
      activeVehicle?.rangeKm &&
      Number(activeVehicle.rangeKm) > 0
    ) {
      list.push({
        id: 'range',
        label: 'Range',
        value: (
          <>
            {activeVehicle.rangeKm}{' '}
            <span
              className={
                isMobile
                  ? 'text-[9px] font-normal text-[#50D9FF]'
                  : 'text-[10px] font-normal text-[#50D9FF]'
              }
            >
              km
            </span>
          </>
        ),
      });
    }

    if (
      activeSlide?.showTopSpeed !== false &&
      activeVehicle?.topSpeedKmh &&
      Number(activeVehicle.topSpeedKmh) > 0
    ) {
      list.push({
        id: 'speed',
        label: isMobile ? 'Speed' : 'Top Speed',
        value: (
          <>
            {activeVehicle.topSpeedKmh}{' '}
            <span
              className={
                isMobile
                  ? 'text-[9px] font-normal text-[#50D9FF]'
                  : 'text-[10px] font-normal text-[#50D9FF]'
              }
            >
              km/h
            </span>
          </>
        ),
      });
    }

    if (
      activeSlide?.showBattery !== false &&
      activeVehicle?.batteryCapacityKwh &&
      Number(activeVehicle.batteryCapacityKwh) > 0
    ) {
      list.push({
        id: 'battery',
        label: 'Battery',
        value: (
          <>
            {activeVehicle.batteryCapacityKwh}{' '}
            <span
              className={
                isMobile
                  ? 'text-[9px] font-normal text-[#50D9FF]'
                  : 'text-[10px] font-normal text-[#50D9FF]'
              }
            >
              kWh
            </span>
          </>
        ),
      });
    }

    if (activeSlide?.showSpecifications !== false) {
      const isUtility =
        (activeVehicle?.category || '').toLowerCase() === 'utility';
      if (
        isUtility &&
        activeVehicle?.payloadCapacityKg &&
        Number(activeVehicle.payloadCapacityKg) > 0
      ) {
        list.push({
          id: 'payload',
          label: 'Payload',
          value: `${activeVehicle.payloadCapacityKg} kg`,
        });
      } else if (
        !isUtility &&
        activeVehicle?.acceleration0to40 &&
        typeof activeVehicle.acceleration0to40 === 'string' &&
        !activeVehicle.acceleration0to40.includes('TBA') &&
        activeVehicle.acceleration0to40.trim() !== ''
      ) {
        list.push({
          id: 'spec',
          label:
            (activeVehicle?.category || '').toLowerCase() === 'cycles'
              ? '0-25 km/h'
              : '0-40 km/h',
          value: activeVehicle.acceleration0to40,
        });
      }
    }

    return list;
  };

  const handleOpenBooking = (vehicle: any) => {
    const user = getStoredUser();
    if (!user) {
      const redirectTarget = vehicle?.slug ? `/book?product=${encodeURIComponent(vehicle.slug)}` : '/book';
      router.push(`/auth/login?redirect=${encodeURIComponent(redirectTarget)}`);
      return;
    }
    setBookingVehicle(vehicle);
    setBookingModalOpen(true);
  };

  const getFilteredVehicles = () => {
    if (!products || products.length === 0) return [];
    const isPreview = isAdminPreviewActive();
    const isAdmin = isAdminUser();
    const hasRealFleet = products.some(
      (p: any) => p.slug && p.slug.startsWith('askr-ev-')
    );
    const shouldFilterLegacy = isPreview && (isAdmin || hasRealFleet);
    const baseList = shouldFilterLegacy
      ? products.filter((p) => !LEGACY_DEMO_SLUGS.has(p.slug))
      : products;

    switch (selectedCategoryTab) {
      case 'scooters':
        return baseList.filter(
          (p) => (p.category || '').toUpperCase() === 'SCOOTER'
        );
      case 'bikes':
        return baseList.filter(
          (p) => (p.category || '').toUpperCase() === 'BIKE'
        );
      case 'cycles':
        return baseList.filter(
          (p) => (p.category || '').toUpperCase() === 'CYCLE'
        );
      case 'jeeps':
        return baseList.filter(
          (p) => (p.category || '').toUpperCase() === 'JEEP'
        );
      case 'utility':
        return baseList.filter(
          (p) => (p.category || '').toUpperCase() === 'UTILITY'
        );
      default:
        return baseList;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#080B12] text-[#F7FAFF] selection:bg-[#267DFF] selection:text-white relative overflow-x-hidden min-h-screen">
      <VerticalRoad />
      <MobileBackgroundRoad />

      <div className="relative z-10 w-full lg:pr-[144px] xl:pr-[156px] 2xl:pr-[168px] transition-all">
        <AdminPreviewBanner onToggle={() => loadCatalog()} />
        <Navbar />

        {/* HERO SECTION */}
        <section className="hero-section-bg relative border-b border-white/10 overflow-hidden pt-2 pb-10 sm:pt-4 sm:pb-12 md:pt-8 md:pb-16">
          <div
            className="absolute top-1/4 right-1/6 w-[700px] h-[500px] pointer-events-none rounded-full filter blur-3xl opacity-80 transition-all duration-1000 animate-glow-pulse"
            style={{
              background: `radial-gradient(ellipse 65% 55% at 50% 50%, ${activeSlide.ambientGlow} 0%, ${activeSlide.ambientCyan} 50%, transparent 75%)`,
            }}
          />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            {/* MOBILE HERO LAYOUT */}
            <div className="block lg:hidden space-y-3.5">
              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#101827] border border-blue-500/30 text-[#50D9FF] text-[10px] font-bold tracking-wide shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#50D9FF] animate-pulse" />
                  <span className="truncate max-w-[200px] xs:max-w-none">
                    {activeSlide.primaryBadge}
                  </span>
                </div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#50D9FF] bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20 whitespace-nowrap">
                  {activeVehicle.name}
                </span>
              </div>

              {/* Mobile Image Stage with Responsive Picture */}
              <div className="relative w-full h-[220px] xs:h-[250px] sm:h-[280px] flex items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#0A0F1A]/90 shadow-2xl">
                <div
                  className="absolute inset-0 opacity-40 pointer-events-none"
                  style={{
                    background:
                      'radial-gradient(ellipse 80% 50% at 50% 65%, rgba(38, 125, 255, 0.25) 0%, transparent 75%)',
                  }}
                />

                <div className="relative z-10 w-full h-full flex items-center justify-center p-2.5">
                  <picture className="w-full h-full flex items-center justify-center">
                    {activeSlide.mobileImage && (
                      <source
                        media="(max-width: 640px)"
                        srcSet={activeSlide.mobileImage}
                      />
                    )}
                    <img
                      key={`mobile-${activeSlide.mobileImage || activeSlide.image}`}
                      src={activeSlide.mobileImage || activeSlide.image}
                      alt={activeSlide.mobileAltText || activeVehicle.name}
                      loading="eager"
                      fetchPriority="high"
                      className="max-h-full max-w-full object-contain select-none transition-all duration-700 animate-in fade-in"
                      style={{
                        objectPosition: `${activeSlide.mobileFocalX ?? 50}% ${
                          activeSlide.mobileFocalY ?? 50
                        }%`,
                      }}
                    />
                  </picture>
                </div>

                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-3/4 h-3 pointer-events-none z-12 animate-shadow-scale">
                  <div className="absolute inset-x-4 top-0.5 bottom-0.5 bg-black/90 rounded-full filter blur-sm" />
                </div>
                <GroundMist />
              </div>

              {/* Mobile Heading & Typography */}
              <div className="space-y-1.5 pt-0.5 text-left">
                <h1 className="text-[26px] xs:text-[28px] sm:text-[30px] font-black tracking-tight text-[#F7FAFF] leading-tight">
                  {activeSlide.headline}
                </h1>
                <p className="text-[13px] xs:text-[14px] text-[#AAB7C8] leading-snug line-clamp-3">
                  {activeSlide.subline}
                </p>
              </div>

              {/* Mobile Price & Specs */}
              <div className="space-y-1.5">
                {activeSlide.showPrice !== false &&
                  activeVehicle.exShowroomPriceINR && (
                    <div className="flex items-baseline justify-between px-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[10px] text-[#AAB7C8] uppercase tracking-wider font-semibold">
                          Starting at
                        </span>
                        <span className="text-xl xs:text-[22px] font-black text-[#F7FAFF] tracking-tight">
                          ₹{activeVehicle.exShowroomPriceINR.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <span className="text-[9px] text-[#AAB7C8]/70 font-medium">
                        Ex-showroom
                      </span>
                    </div>
                  )}

                {(() => {
                  const metrics = getHeroMetrics(true);
                  if (metrics.length === 0) return null;
                  const gridColsClass =
                    metrics.length === 1
                      ? 'grid-cols-1'
                      : metrics.length === 2
                      ? 'grid-cols-2'
                      : metrics.length === 3
                      ? 'grid-cols-3'
                      : 'grid-cols-4';
                  return (
                    <div
                      className={`grid ${gridColsClass} gap-1.5 py-2 px-2.5 rounded-xl bg-[#101827]/90 border border-white/10 shadow-md backdrop-blur-md`}
                    >
                      {metrics.map((m, idx) => (
                        <div
                          key={m.id}
                          className={`text-center ${
                            idx > 0 ? 'border-l border-white/10 pl-1' : ''
                          }`}
                        >
                          <span className="text-[9px] text-[#AAB7C8] uppercase tracking-wider block font-semibold truncate">
                            {m.label}
                          </span>
                          <span className="text-[11px] xs:text-[12px] font-bold text-[#F7FAFF] whitespace-nowrap">
                            {m.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Mobile CTA Buttons */}
              <div className="pt-1 flex flex-col xs:flex-row items-center gap-2.5 w-full">
                {activeSlide.primaryCtaEnabled !== false && (
                  <Link
                    href={activeSlide.ctaLink || '/bikes'}
                    className={`w-full py-2.5 px-4 rounded-full text-[12px] font-bold tracking-wide transition-all flex items-center justify-center gap-1.5 ${
                      activeSlide.ctaStyle === 'SECONDARY'
                        ? 'bg-white hover:bg-slate-100 text-slate-900 shadow-md'
                        : activeSlide.ctaStyle === 'OUTLINE'
                        ? 'border border-white/20 hover:border-white text-[#F7FAFF] bg-white/5'
                        : 'bg-[#267DFF] hover:bg-[#1A6EEB] text-white shadow-[0_0_20px_rgba(38,125,255,0.35)]'
                    }`}
                  >
                    <span>{activeSlide.ctaText || 'Explore Vehicles'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}

                {activeSlide.secondaryCtaEnabled && (
                  <Link
                    href={activeSlide.secondaryCtaUrl || '/test-ride'}
                    className={`w-full py-2.5 px-4 rounded-full text-[12px] font-semibold tracking-wide transition-colors flex items-center justify-center ${
                      activeSlide.secondaryCtaStyle === 'PRIMARY'
                        ? 'bg-[#267DFF] hover:bg-[#1A6EEB] text-white shadow-[0_0_20px_rgba(38,125,255,0.3)]'
                        : activeSlide.secondaryCtaStyle === 'SECONDARY'
                        ? 'bg-white/10 hover:bg-white/20 text-[#F7FAFF] border border-white/20'
                        : 'border border-white/20 hover:border-white text-[#F7FAFF] bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <span>{activeSlide.secondaryCtaLabel || 'Book Test Drive'}</span>
                  </Link>
                )}
              </div>
            </div>

            {/* DESKTOP HERO LAYOUT */}
            <div className="hidden lg:grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              <div className="lg:col-span-5 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#101827] border border-blue-500/30 text-[#50D9FF] text-[10px] sm:text-[11px] font-bold tracking-wide shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#50D9FF] animate-pulse" />
                  <span>{activeSlide.primaryBadge}</span>
                </div>

                <div className="space-y-2">
                  <h1 className="text-[34px] xl:text-[40px] font-black tracking-tight text-[#F7FAFF] leading-[1.12]">
                    {activeSlide.headline}
                  </h1>
                  <p className="text-[14px] xl:text-[15px] text-[#AAB7C8] leading-relaxed max-w-lg">
                    {activeSlide.subline}
                  </p>
                </div>

                {activeSlide.showPrice !== false &&
                  activeVehicle.exShowroomPriceINR && (
                    <div className="flex items-baseline gap-2 pt-0.5">
                      <span className="text-[10px] text-[#AAB7C8] uppercase tracking-wider font-semibold">
                        Starting at
                      </span>
                      <span className="text-2xl sm:text-[26px] font-black text-[#F7FAFF] tracking-tight">
                        ₹{activeVehicle.exShowroomPriceINR.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] text-[#AAB7C8]/70 font-medium">
                        Ex-showroom
                      </span>
                    </div>
                  )}

                {(() => {
                  const metrics = getHeroMetrics(false);
                  if (metrics.length === 0) return null;
                  const gridColsClass =
                    metrics.length === 1
                      ? 'grid-cols-1'
                      : metrics.length === 2
                      ? 'grid-cols-2'
                      : metrics.length === 3
                      ? 'grid-cols-3 sm:grid-cols-3'
                      : 'grid-cols-2 sm:grid-cols-4';
                  return (
                    <div
                      className={`grid ${gridColsClass} gap-2.5 py-2.5 px-3.5 rounded-xl bg-[#101827]/90 border border-white/10 shadow-lg w-full max-w-xl backdrop-blur-md`}
                    >
                      {metrics.map((m, idx) => (
                        <div
                          key={m.id}
                          className={
                            idx > 0 ? 'border-l border-white/10 pl-2.5' : ''
                          }
                        >
                          <span className="text-[10px] text-[#AAB7C8] uppercase tracking-wider block font-semibold whitespace-nowrap">
                            {m.label}
                          </span>
                          <span className="text-[12px] sm:text-[13px] font-bold text-[#F7FAFF] whitespace-nowrap">
                            {m.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                <div className="pt-1 flex flex-wrap items-center gap-3">
                  {activeSlide.primaryCtaEnabled !== false && (
                    <Link
                      href={activeSlide.ctaLink || '/bikes'}
                      className={`px-6 py-2.5 rounded-full text-[12px] sm:text-[13px] font-bold tracking-wide transition-all flex items-center gap-1.5 group ${
                        activeSlide.ctaStyle === 'SECONDARY'
                          ? 'bg-white hover:bg-slate-100 text-slate-900 shadow-md'
                          : activeSlide.ctaStyle === 'OUTLINE'
                          ? 'border border-white/20 hover:border-white text-[#F7FAFF] bg-white/5'
                          : 'bg-[#267DFF] hover:bg-[#1A6EEB] text-white shadow-[0_0_20px_rgba(38,125,255,0.4)] hover:shadow-[0_0_30px_rgba(38,125,255,0.6)]'
                      }`}
                    >
                      <span>{activeSlide.ctaText || 'Explore Vehicles'}</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                    </Link>
                  )}

                  {activeSlide.secondaryCtaEnabled && (
                    <Link
                      href={activeSlide.secondaryCtaUrl || '/test-ride'}
                      className={`px-6 py-2.5 rounded-full text-[12px] sm:text-[13px] font-semibold tracking-wide transition-colors ${
                        activeSlide.secondaryCtaStyle === 'PRIMARY'
                          ? 'bg-[#267DFF] hover:bg-[#1A6EEB] text-white shadow-[0_0_20px_rgba(38,125,255,0.3)]'
                          : activeSlide.secondaryCtaStyle === 'SECONDARY'
                          ? 'bg-white/10 hover:bg-white/20 text-[#F7FAFF] border border-white/20'
                          : 'border border-white/20 hover:border-white text-[#F7FAFF] bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <span>
                        {activeSlide.secondaryCtaLabel || 'Enquire Now'}
                      </span>
                    </Link>
                  )}
                </div>
              </div>

              {/* Desktop Vehicle Stage with Responsive Picture */}
              <div className="lg:col-span-7 flex flex-col items-center justify-center relative">
                <div className="relative w-full h-80 sm:h-96 md:h-[400px] lg:h-[440px] flex items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-[#0A0F1A]/80 shadow-2xl">
                  <div
                    className="absolute inset-0 opacity-40 pointer-events-none"
                    style={{
                      background:
                        'radial-gradient(ellipse 80% 50% at 50% 65%, rgba(38, 125, 255, 0.25) 0%, transparent 75%)',
                    }}
                  />

                  <div className="relative z-10 w-full h-full flex items-center justify-center p-3 sm:p-4">
                    <picture className="w-full h-full flex items-center justify-center">
                      {activeSlide.mobileImage && (
                        <source
                          media="(max-width: 768px)"
                          srcSet={activeSlide.mobileImage}
                        />
                      )}
                      <img
                        key={activeSlide.image}
                        src={activeSlide.image}
                        alt={activeSlide.desktopAltText || activeVehicle.name}
                        loading="eager"
                        fetchPriority="high"
                        className="max-h-full max-w-full object-contain select-none transition-all duration-700 animate-in fade-in"
                        style={{
                          objectPosition: `${activeSlide.desktopFocalX ?? 50}% ${
                            activeSlide.desktopFocalY ?? 50
                          }%`,
                        }}
                      />
                    </picture>
                  </div>

                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-4/5 h-5 pointer-events-none z-12 animate-shadow-scale">
                    <div className="absolute inset-x-8 top-1 bottom-1 bg-black/90 rounded-full filter blur-md" />
                  </div>

                  <GroundMist />
                </div>

                {/* Slider Navigation Dots */}
                <div className="mt-4 flex items-center gap-3 z-10">
                  <button
                    onClick={() =>
                      setCurrentSlideIndex(
                        (prev) =>
                          (prev - 1 + heroSlides.length) % heroSlides.length
                      )
                    }
                    className="p-1.5 rounded-full border border-white/15 hover:border-white/40 bg-[#101827]/80 text-[#F7FAFF] transition-colors"
                    aria-label="Previous Vehicle"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-1.5">
                    {heroSlides.map((slide, idx) => (
                      <button
                        key={slide.id || slide.vehicle?.id || idx}
                        onClick={() => setCurrentSlideIndex(idx)}
                        className={`h-1.5 rounded-full transition-all ${
                          currentSlideIndex === idx
                            ? 'w-7 bg-[#267DFF] shadow-[0_0_10px_rgba(38,125,255,0.6)]'
                            : 'w-1.5 bg-white/20 hover:bg-white/40'
                        }`}
                        aria-label={`Go to slide ${idx + 1}`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={() =>
                      setCurrentSlideIndex(
                        (prev) => (prev + 1) % heroSlides.length
                      )
                    }
                    className="p-1.5 rounded-full border border-white/15 hover:border-white/40 bg-[#101827]/80 text-[#F7FAFF] transition-colors"
                    aria-label="Next Vehicle"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CATALOG / SHOWROOM SECTION */}
        <section className="catalog-section-bg py-12 md:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full rounded-2xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 pb-6 border-b border-white/10">
            <div>
              <h2 className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-[#50D9FF] mb-1.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#267DFF] shadow-[0_0_8px_#267DFF]" />
                <span>Browse The Lineup</span>
              </h2>
              <h3 className="text-[21px] xs:text-[22px] sm:text-[24px] lg:text-[27px] font-extrabold text-[#F7FAFF] tracking-tight leading-tight">
                Electric Vehicles for Every Journey.
              </h3>
              <p className="mt-1.5 text-xs sm:text-[13px] text-[#AAB7C8] max-w-xl leading-relaxed">
                From zero-emission urban scooters to high-torque electric
                motorcycles, lightweight commuter cycles, and 4x4 adventure
                utility vehicles.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 bg-[#101827] p-1 rounded-full border border-white/10">
              {(['scooters', 'bikes', 'cycles', 'jeeps', 'utility', 'all'] as const).map(
                (tab) => (
                  <button
                    key={tab}
                    onClick={() => setSelectedCategoryTab(tab)}
                    className={`px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold tracking-wide transition-all ${
                      selectedCategoryTab === tab
                        ? 'bg-[#267DFF] text-white shadow-[0_0_15px_rgba(38,125,255,0.4)] font-bold'
                        : 'text-[#AAB7C8] hover:text-white'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loadingProducts ? (
              <div className="col-span-full py-16 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-8 h-8 text-[#50D9FF] animate-spin" />
                <span className="text-xs text-[#AAB7C8]">
                  Loading showroom lineup from live database...
                </span>
              </div>
            ) : catalogError ? (
              <div className="col-span-full py-12 px-6 rounded-2xl bg-white/5 border border-white/10 text-center space-y-3">
                <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                <div className="text-sm font-bold text-white">
                  Live Showroom Catalog Offline
                </div>
                <p className="text-xs text-[#AAB7C8] max-w-md mx-auto">
                  {catalogError}
                </p>
                <button
                  onClick={loadCatalog}
                  className="px-5 py-2.5 rounded-full bg-[#267DFF] text-white text-xs font-bold hover:bg-[#1A6EEB] transition-colors"
                >
                  Retry Connection
                </button>
              </div>
            ) : getFilteredVehicles().length === 0 ? (
              <div className="col-span-full py-16 px-6 text-center rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <div className="text-sm font-bold text-white">
                  No {selectedCategoryTab.toUpperCase()} models in current real
                  fleet review
                </div>
                <p className="text-xs text-[#AAB7C8] max-w-md mx-auto">
                  {selectedCategoryTab === 'cycles'
                    ? 'No electric cycle models are currently registered in the active ASKR EV imported real fleet. Explore our electric scooters, motorcycles, utility vehicles, and 4x4 jeeps.'
                    : `No vehicles currently available under the ${selectedCategoryTab} category.`}
                </p>
              </div>
            ) : (
              getFilteredVehicles().map((veh) => (
                <BikeCard
                  key={veh.id}
                  vehicle={veh}
                  onBookClick={handleOpenBooking}
                />
              ))
            )}
          </div>

          <div className="mt-12 text-center">
            <Link
              href={`/${
                selectedCategoryTab === 'all' ? 'bikes' : selectedCategoryTab
              }`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#50D9FF] hover:underline"
            >
              <span>View All {selectedCategoryTab.toUpperCase()}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* ENGINEERING & TECHNOLOGY SECTION */}
        <section className="engineering-section-bg py-20 border-y border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-[#50D9FF]">
                Engineering Excellence
              </span>
              <h2 className="text-[21px] xs:text-[22px] sm:text-[24px] lg:text-[27px] font-extrabold text-[#F7FAFF] tracking-tight leading-tight">
                Designed For Real-World Performance.
              </h2>
              <p className="text-xs sm:text-[13px] text-[#AAB7C8] leading-relaxed max-w-xl mx-auto">
                Built with precision thermal balancing, high-efficiency motors,
                and seamless connected telemetry.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-7 rounded-2xl bg-[#101827]/85 border border-white/10 space-y-3 hover:border-[#267DFF]/50 transition-all hover:shadow-[0_0_20px_rgba(38,125,255,0.2)]">
                <div className="w-12 h-12 rounded-xl bg-blue-500/15 text-[#50D9FF] flex items-center justify-center font-bold text-lg border border-blue-500/20">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-[15px] sm:text-[16px] font-bold text-[#F7FAFF]">
                  High-Efficiency Electric Drive
                </h3>
                <p className="text-[12px] text-[#AAB7C8] leading-relaxed">
                  Precision-engineered electric motor architecture delivering
                  smooth, zero-emission torque with minimal maintenance
                  requirements.
                </p>
              </div>

              <div className="p-7 rounded-2xl bg-[#101827]/85 border border-white/10 space-y-3 hover:border-emerald-400/50 transition-all hover:shadow-[0_0_20px_rgba(52,211,153,0.2)]">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold text-lg border border-emerald-500/20">
                  <BatteryCharging className="w-6 h-6" />
                </div>
                <h3 className="text-[15px] sm:text-[16px] font-bold text-[#F7FAFF]">
                  Advanced Battery Protection
                </h3>
                <p className="text-[12px] text-[#AAB7C8] leading-relaxed">
                  Robust lithium and graphene battery pack configurations
                  equipped with intelligent battery monitoring and thermal
                  safeguards.
                </p>
              </div>

              <div className="p-7 rounded-2xl bg-[#101827]/85 border border-white/10 space-y-3 hover:border-purple-400/50 transition-all hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                <div className="w-12 h-12 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center font-bold text-lg border border-purple-500/20">
                  <Gauge className="w-6 h-6" />
                </div>
                <h3 className="text-[15px] sm:text-[16px] font-bold text-[#F7FAFF]">
                  Digital Driver Console
                </h3>
                <p className="text-[12px] text-[#AAB7C8] leading-relaxed">
                  Illuminated digital instrumentation providing real-time speed,
                  trip tracking, and battery health at a glance.
                </p>
              </div>

              <div className="p-7 rounded-2xl bg-[#101827]/85 border border-white/10 space-y-3 hover:border-amber-400/50 transition-all hover:shadow-[0_0_20px_rgba(251,191,36,0.2)]">
                <div className="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center font-bold text-lg border border-amber-500/20">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="text-[15px] sm:text-[16px] font-bold text-[#F7FAFF]">
                  Everyday 15A Recharging
                </h3>
                <p className="text-[12px] text-[#AAB7C8] leading-relaxed">
                  Plug into any standard 15A home socket or fast-charging network
                  for convenient, low-cost overnight recharges.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ACTION BANNER */}
        <section className="action-banner-bg py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div
              className="relative p-8 sm:p-14 rounded-3xl text-white flex flex-col md:flex-row items-center justify-between gap-8 overflow-hidden shadow-2xl border border-white/10"
              style={{
                background:
                  'linear-gradient(135deg, #101827 0%, #1A2436 50%, #080B12 100%)',
              }}
            >
              <div
                className="absolute top-0 right-0 w-96 h-96 pointer-events-none rounded-full filter blur-3xl opacity-50"
                style={{
                  background:
                    'radial-gradient(circle, rgba(38, 125, 255, 0.6) 0%, transparent 70%)',
                }}
              />

              <div className="space-y-3 max-w-xl relative z-10">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-[#50D9FF]">
                  The Electric Shift
                </span>
                <h2 className="text-[21px] xs:text-[22px] sm:text-[24px] lg:text-[27px] font-extrabold tracking-tight text-[#F7FAFF] leading-tight">
                  Ready to Experience ASKR EV?
                </h2>
                <p className="text-xs sm:text-[13px] text-[#AAB7C8] leading-relaxed">
                  Explore our full vehicle showroom, inspect certified
                  specifications, and reserve your electric vehicle online today.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 shrink-0 relative z-10">
                <Link
                  href="/bikes"
                  className="px-6 py-2.5 rounded-full bg-[#267DFF] hover:bg-[#1A6EEB] text-white text-[12px] sm:text-[13px] font-bold tracking-wide transition-all shadow-[0_0_25px_rgba(38,125,255,0.4)]"
                >
                  Explore Showroom
                </Link>
                <Link
                  href="/auth/register"
                  className="px-6 py-2.5 rounded-full border border-white/20 hover:border-white text-[#F7FAFF] hover:bg-white/10 text-[12px] sm:text-[13px] font-semibold tracking-wide transition-colors"
                >
                  Create Account
                </Link>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </div>

      {bookingVehicle && (
        <BookingModal
          bike={bookingVehicle}
          isOpen={bookingModalOpen}
          onClose={() => setBookingModalOpen(false)}
          user={currentUser}
          onSuccess={() => setBookingModalOpen(false)}
        />
      )}
    </div>
  );
}
