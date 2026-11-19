'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  BatteryCharging,
  Gauge,
  Truck,
  Sparkles,
  RefreshCw,
  AlertCircle,
  PackageCheck,
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import BikeCard from '../../components/BikeCard';
import AdminPreviewBanner from '../../components/AdminPreviewBanner';
import { fetchPublishedCatalog, isAdminPreviewActive } from '../../lib/api';
import { ELECTRIC_UTILITY } from '../../lib/catalog';

export default function UtilityPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUtilityVehicles = async () => {
    setLoading(true);
    setError(null);
    try {
      const isPreview = isAdminPreviewActive();
      const data = await fetchPublishedCatalog({ category: 'UTILITY', preview: isPreview });
      if (Array.isArray(data) && data.length > 0) {
        setVehicles(data);
      } else if (process.env.NODE_ENV !== 'production') {
        // Fallback for local development when database hasn't published utility yet
        setVehicles(ELECTRIC_UTILITY);
      } else {
        setVehicles([]);
      }
    } catch (err: any) {
      console.warn('Utility catalog fetch notice:', err.message);
      if (process.env.NODE_ENV !== 'production') {
        setVehicles(ELECTRIC_UTILITY);
      } else {
        setError('Live electric utility fleet is momentarily offline. Please retry connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUtilityVehicles();

    const handlePreviewChange = () => {
      loadUtilityVehicles();
    };

    window.addEventListener('askrev_preview_change', handlePreviewChange);
    return () => window.removeEventListener('askrev_preview_change', handlePreviewChange);
  }, []);

  const featured = vehicles.find((v) => v.isFeatured) || vehicles[0];

  return (
    <div className="flex-1 flex flex-col bg-[#080B12] text-[#F7FAFF] min-h-screen">
      <AdminPreviewBanner onToggle={() => loadUtilityVehicles()} />
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 w-full">
        {/* Header Breadcrumbs & Title */}
        <div className="pb-8 border-b border-white/10">
          <div className="flex items-center gap-2 text-xs text-[#AAB7C8] mb-3">
            <Link href="/" className="hover:text-white">Home</Link>
            <span>/</span>
            <span className="text-[#50D9FF] font-semibold">Electric Utility Vehicles</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <div>
              <h1 className="text-3xl sm:text-5xl font-black text-[#F7FAFF] tracking-tight">
                Electric Utility & Cargo
              </h1>
              <p className="mt-2 text-base text-[#AAB7C8] max-w-2xl leading-relaxed">
                Commercial electric vehicles engineered for high payload capacity, zero tailpipe emissions, and unbeatable cost efficiency in logistics and delivery.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-[#50D9FF] bg-blue-500/15 border border-blue-500/30 self-start sm:self-auto">
              <PackageCheck className="w-3.5 h-3.5" />
              <span>Commercial Fleet Solutions</span>
            </span>
          </div>
        </div>

        {/* Featured Utility Hero Banner */}
        {featured && (
          <div className="mt-8 p-8 sm:p-12 rounded-3xl bg-[#101827] border border-white/10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center shadow-2xl relative overflow-hidden">
            {/* Ambient Radial Spotlight */}
            <div
              className="absolute inset-0 opacity-30 pointer-events-none"
              style={{
                background: 'radial-gradient(circle at 75% 50%, rgba(38, 125, 255, 0.4) 0%, transparent 65%)',
              }}
            />

            <div className="lg:col-span-6 space-y-4 relative z-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-[#50D9FF] bg-blue-500/15 border border-blue-500/30">
                <Truck className="w-3.5 h-3.5" />
                <span>Heavy-Duty Commercial Workhorse</span>
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#F7FAFF] tracking-tight">
                {featured.name}
              </h2>
              <p className="text-sm text-[#AAB7C8] leading-relaxed">
                {featured.tagline || featured.shortDescription || 'High-capacity electric commercial vehicle engineered for daily business delivery and logistics.'}
              </p>

              <div className="pt-2 flex items-baseline gap-2">
                <span className="text-xs text-[#AAB7C8] uppercase font-semibold">Base Price</span>
                <span className="text-2xl font-black text-[#F7FAFF]">
                  {featured.sellingPriceINR ? `₹${featured.sellingPriceINR.toLocaleString('en-IN')}` : (featured.formattedSellingPrice || 'Contact for Price')}
                </span>
                {featured.sellingPriceINR && <span className="text-xs text-[#AAB7C8]/70">Ex-showroom</span>}
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Link
                  href={`/bikes/${featured.modelCode || featured.slug}`}
                  className="px-6 py-3 rounded-full bg-[#267DFF] hover:bg-[#1A6EEB] text-white text-xs font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(38,125,255,0.4)]"
                >
                  Explore {featured.name}
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6 flex items-center justify-center relative z-10">
              <img
                src={featured.heroImage || featured.imageUrl || '/images/real/branded/askr-u01-commercial-loader.jpg'}
                alt={featured.name}
                className="w-full max-h-84 object-cover rounded-2xl filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.8)]"
              />
            </div>
          </div>
        )}

        {/* Fleet Grid Display */}
        <div className="mt-14">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-white/10 gap-2">
            <div>
              <h3 className="text-xl font-bold text-[#F7FAFF]">
                Commercial Fleet ({vehicles.length})
              </h3>
              <p className="text-xs text-[#AAB7C8] mt-1">
                Flatbed loaders, courier delivery scooters, and specialized commercial electric carriers
              </p>
            </div>
            <button
              onClick={loadUtilityVehicles}
              disabled={loading}
              className="inline-flex items-center gap-1.5 text-xs text-[#AAB7C8] hover:text-white transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#50D9FF]' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 text-[#50D9FF] animate-spin" />
              <span className="text-xs text-[#AAB7C8]">Loading commercial models...</span>
            </div>
          ) : error ? (
            <div className="py-12 px-6 rounded-2xl bg-white/5 border border-white/10 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
              <div className="text-sm font-bold text-white">Utility Catalog Offline</div>
              <p className="text-xs text-[#AAB7C8] max-w-md mx-auto">{error}</p>
              <button
                onClick={loadUtilityVehicles}
                className="px-5 py-2 rounded-full bg-[#267DFF] text-white text-xs font-bold hover:bg-[#1A6EEB]"
              >
                Retry Connection
              </button>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="py-16 text-center text-[#AAB7C8] text-xs">
              No electric utility models currently published.
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              {vehicles.map((v) => (
                <BikeCard key={v.id} vehicle={v} />
              ))}
            </div>
          )}
        </div>

        {/* Commercial Fleet Value Proposition */}
        <div className="mt-20 pt-12 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-[#101827] border border-white/10 space-y-3">
            <span className="p-3 rounded-xl bg-blue-500/10 text-[#50D9FF] inline-block">
              <Truck className="w-6 h-6" />
            </span>
            <h3 className="text-base font-bold text-[#F7FAFF]">Up to 500 kg Payload</h3>
            <p className="text-xs text-[#AAB7C8] leading-relaxed">
              Reinforced tubular steel chassis and heavy differential axles built for continuous industrial hauling.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#101827] border border-white/10 space-y-3">
            <span className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 inline-block">
              <Zap className="w-6 h-6" />
            </span>
            <h3 className="text-base font-bold text-[#F7FAFF]">Ultra-Low Operating Cost</h3>
            <p className="text-xs text-[#AAB7C8] leading-relaxed">
              Run at approximately ₹0.15 per kilometer, cutting commercial delivery operational expenses by up to 80%.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#101827] border border-white/10 space-y-3">
            <span className="p-3 rounded-xl bg-purple-500/10 text-purple-400 inline-block">
              <ShieldCheck className="w-6 h-6" />
            </span>
            <h3 className="text-base font-bold text-[#F7FAFF]">Commercial Fleet Warranty</h3>
            <p className="text-xs text-[#AAB7C8] leading-relaxed">
              Backed by ASKR EV dedicated service network, doorstep fleet maintenance, and genuine replacement parts.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
