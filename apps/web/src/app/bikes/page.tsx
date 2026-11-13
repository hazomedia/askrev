'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Filter,
  Sparkles,
  Zap,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  Search,
  Check,
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import BikeCard from '../../components/BikeCard';
import BookingModal from '../../components/BookingModal';
import { fetchApi, getStoredUser } from '../../lib/api';
import {
  ALL_CATALOG_VEHICLES,
  VERIFIED_ELECTRIC_BIKES,
  Vehicle,
} from '../../lib/catalog';

function BikesContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category');

  const [vehicles, setVehicles] = useState<Vehicle[]>(ALL_CATALOG_VEHICLES);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [minRange, setMinRange] = useState<number>(0);
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Booking Modal
  const [bookingVehicle, setBookingVehicle] = useState<any | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  useEffect(() => {
    setCurrentUser(getStoredUser());
    loadBikesFromApi();
  }, []);

  useEffect(() => {
    if (categoryParam) {
      if (['bikes', 'cycles', 'jeeps'].includes(categoryParam.toLowerCase())) {
        setSelectedCategory(categoryParam.toLowerCase());
      }
    }
  }, [categoryParam]);

  const loadBikesFromApi = async () => {
    try {
      const data = await fetchApi<any[]>('/ev-bikes');
      if (Array.isArray(data) && data.length > 0) {
        // Merge API data for the bikes category with verified concept items
        setVehicles((prev) =>
          prev.map((v) => {
            if (v.category === 'bikes') {
              const apiMatch = data.find(
                (d) => d.modelCode === v.modelCode || d.id === v.id
              );
              if (apiMatch) {
                return {
                  ...v,
                  ...apiMatch,
                  exShowroomPriceINR: apiMatch.exShowroomPriceINR || v.exShowroomPriceINR,
                  bookingAmountINR: apiMatch.bookingAmountINR || v.bookingAmountINR,
                  voucherRedeemLimitINR: apiMatch.voucherRedeemLimitINR || v.voucherRedeemLimitINR,
                };
              }
            }
            return v;
          })
        );
      }
    } catch (err) {
      console.warn('Note: utilizing static catalog definitions', err);
    }
  };

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      // Category filter
      if (selectedCategory !== 'all' && v.category !== selectedCategory) {
        return false;
      }
      // Range filter
      if (minRange > 0 && v.rangeKm < minRange) {
        return false;
      }
      // Availability filter
      if (availabilityFilter === 'production' && v.isConcept) {
        return false;
      }
      if (availabilityFilter === 'concept' && !v.isConcept) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = v.name.toLowerCase().includes(q);
        const matchesCode = v.modelCode.toLowerCase().includes(q);
        const matchesTag = v.tagline.toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesTag) return false;
      }
      return true;
    });
  }, [vehicles, selectedCategory, minRange, availabilityFilter, searchQuery]);

  const handleOpenBooking = (vehicle: any) => {
    setBookingVehicle(vehicle);
    setBookingModalOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#080A0D] text-white">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 w-full">
        {/* Header Breadcrumbs & Title */}
        <div className="pb-8 border-b border-white/10">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#165DAD] mb-3">
            <span className="w-2 h-2 rounded-full bg-[#165DAD]" />
            <span>Showroom Fleet & Prototype Gallery</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">
            Electric Vehicles
          </h1>
          <p className="mt-3 text-base text-[#A7ADB5] max-w-2xl font-light leading-relaxed">
            Explore the ASKR EV mobility lineup: production-ready electric motorcycles, lightweight urban cycles, and high-torque all-terrain electric adventure vehicles.
          </p>
        </div>

        {/* Filter Navigation & Controls */}
        <div className="mt-8 space-y-6">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-5 py-2.5 rounded-full text-xs font-bold tracking-wider uppercase transition-all ${
                selectedCategory === 'all'
                  ? 'bg-white text-[#101318] shadow-md'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              All Vehicles ({vehicles.length})
            </button>

            <button
              onClick={() => setSelectedCategory('bikes')}
              className={`px-5 py-2.5 rounded-full text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-2 ${
                selectedCategory === 'bikes'
                  ? 'bg-white text-[#101318] shadow-md'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>Electric Bikes</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400">
                Production
              </span>
            </button>

            <button
              onClick={() => setSelectedCategory('cycles')}
              className={`px-5 py-2.5 rounded-full text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-2 ${
                selectedCategory === 'cycles'
                  ? 'bg-white text-[#101318] shadow-md'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>Electric Cycles</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#C9FF36]/20 text-[#C9FF36]">
                Concept
              </span>
            </button>

            <button
              onClick={() => setSelectedCategory('jeeps')}
              className={`px-5 py-2.5 rounded-full text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-2 ${
                selectedCategory === 'jeeps'
                  ? 'bg-white text-[#101318] shadow-md'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>Electric Jeeps</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-400">
                Concept
              </span>
            </button>
          </div>

          {/* Secondary Filters Bar */}
          <div className="p-4 rounded-2xl bg-[#101318] border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Search Box */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search model or specs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#080A0D] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#C9FF36]"
              />
            </div>

            {/* Quick Filter Controls */}
            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
              {/* Availability Filter */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 text-[11px] uppercase tracking-wider font-medium">Status:</span>
                <select
                  value={availabilityFilter}
                  onChange={(e) => setAvailabilityFilter(e.target.value)}
                  className="bg-[#080A0D] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#C9FF36]"
                >
                  <option value="all">All Models</option>
                  <option value="production">Production Ready Only</option>
                  <option value="concept">Concept Series Only</option>
                </select>
              </div>

              {/* Minimum Range Slider */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 text-[11px] uppercase tracking-wider font-medium">
                  Min Range: {minRange > 0 ? `${minRange} km` : 'Any'}
                </span>
                <input
                  type="range"
                  min="0"
                  max="350"
                  step="25"
                  value={minRange}
                  onChange={(e) => setMinRange(Number(e.target.value))}
                  className="w-24 accent-[#C9FF36]"
                />
              </div>

              {(selectedCategory !== 'all' || minRange > 0 || availabilityFilter !== 'all' || searchQuery) && (
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setMinRange(0);
                    setAvailabilityFilter('all');
                    setSearchQuery('');
                  }}
                  className="text-xs text-[#C9FF36] hover:underline"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Fleet Grid Display */}
        <div className="mt-10">
          {filteredVehicles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredVehicles.map((vehicle) => (
                <BikeCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  onBookClick={handleOpenBooking}
                />
              ))}
            </div>
          ) : (
            <div className="p-16 rounded-3xl bg-[#101318] border border-white/10 text-center space-y-4">
              <h3 className="text-xl font-bold text-white">No vehicles match your selected filters</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Try resetting your filters or adjusting your minimum range criteria to view our available fleet models.
              </p>
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setMinRange(0);
                  setAvailabilityFilter('all');
                  setSearchQuery('');
                }}
                className="px-6 py-2.5 rounded-full bg-white text-[#101318] text-xs font-bold uppercase tracking-wider hover:bg-[#C9FF36] transition-colors"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* Simulated Booking Modal */}
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

export default function BikesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#080A0D]" />}>
      <BikesContent />
    </Suspense>
  );
}
