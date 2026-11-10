'use client';

import React, { useState, useEffect } from 'react';
import {
  Bike,
  Zap,
  Filter,
  ShieldCheck,
  BatteryCharging,
  Gauge,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import BikeCard from '../../components/BikeCard';
import BookingModal from '../../components/BookingModal';
import { fetchApi, getStoredUser } from '../../lib/api';

export default function BikesPage() {
  const [bikes, setBikes] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [selectedBike, setSelectedBike] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filterProfile, setFilterProfile] = useState<'all' | 'commute' | 'sport'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bikesData, profileData] = await Promise.all([
        fetchApi<any[]>('/ev-bikes'),
        getStoredUser() ? fetchApi<any>('/auth/me').catch(() => null) : Promise.resolve(null),
      ]);
      setBikes(bikesData);
      setUserProfile(profileData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBook = (bike: any) => {
    setSelectedBike(bike);
    setModalOpen(true);
  };

  const filteredBikes = bikes.filter((b) => {
    if (filterProfile === 'commute') return b.rangeKm <= 100;
    if (filterProfile === 'sport') return b.topSpeedKmh > 90;
    return true;
  });

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 w-full">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-10 border-b border-navy-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-navy-900 border border-electric-500/30 text-electric-400 text-xs font-semibold mb-3">
            <Bike className="w-3.5 h-3.5" />
            <span>Official Fleet Catalog</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white">
            High-Torque EV Superbikes
          </h1>
          <p className="mt-2 text-sm text-slate-400 max-w-2xl leading-relaxed">
            Engineered with aerospace-grade frames, PMSM traction motors, and high-density lithium battery modules. Reserve with token deposits and redeem member shopping vouchers.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-navy-900 border border-navy-800 self-start md:self-auto">
          <button
            onClick={() => setFilterProfile('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              filterProfile === 'all'
                ? 'bg-electric-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Bikes ({bikes.length})
          </button>
          <button
            onClick={() => setFilterProfile('commute')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              filterProfile === 'commute'
                ? 'bg-electric-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            City Commuter
          </button>
          <button
            onClick={() => setFilterProfile('sport')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              filterProfile === 'sport'
                ? 'bg-electric-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Performance Sport
          </button>
        </div>
      </div>

      {/* Member Voucher Banner if logged in */}
      {userProfile?.wallet?.shoppingVoucherINR > 0 && (
        <div className="mt-8 p-5 rounded-3xl bg-gradient-to-r from-emerald-500/15 via-navy-900 to-navy-900 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <Zap className="w-5 h-5 fill-emerald-400" />
            </div>
            <div>
              <div className="text-xs text-emerald-300 font-bold uppercase tracking-wider">
                Voucher Benefit Available
              </div>
              <div className="text-sm font-semibold text-white">
                You have <strong className="text-emerald-400">₹{userProfile.wallet.shoppingVoucherINR.toLocaleString('en-IN')}</strong> in Shopping Vouchers to apply toward EV bike reservations.
              </div>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-300 bg-navy-950 px-3 py-1.5 rounded-xl border border-navy-800">
            Instant Deduction Applied
          </span>
        </div>
      )}

      {/* Main Bikes Grid */}
      <div className="mt-10">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card-gradient rounded-3xl h-96 animate-pulse p-6 space-y-4">
                <div className="h-44 bg-navy-800/60 rounded-2xl" />
                <div className="h-6 bg-navy-800/80 rounded-xl w-3/4" />
                <div className="h-4 bg-navy-800/50 rounded-lg w-1/2" />
                <div className="h-10 bg-navy-800 rounded-xl" />
              </div>
            ))}
          </div>
        ) : filteredBikes.length === 0 ? (
          <div className="text-center py-20 p-8 rounded-3xl bg-navy-900/40 border border-navy-800">
            <Bike className="w-12 h-12 text-slate-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white">No Models Found</h3>
            <p className="text-xs text-slate-400 mt-1">Try switching to the 'All Bikes' filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredBikes.map((bike) => (
              <BikeCard
                key={bike.id}
                bike={bike}
                onBook={handleBook}
                userVoucherINR={userProfile?.wallet?.shoppingVoucherINR || 0}
              />
            ))}
          </div>
        )}
      </div>

      {/* Booking Modal */}
      <BookingModal
        bike={selectedBike}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        user={userProfile}
        onSuccess={() => {
          loadData();
        }}
      />
    </div>
  );
}
