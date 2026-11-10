'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import BikeCard from '../../components/BikeCard';
import { fetchApi } from '../../lib/api';

const DEFAULT_VERIFIED_BIKES = [
  {
    id: 'e08078e1-47f8-4073-81f5-5b670f59198e',
    modelCode: 'ASKR-THUNDER-PRO',
    name: 'ASKR Thunder Pro',
    tagline: 'High-Torque Performance Urban Commuter',
    batteryCapacityKwh: 3.8,
    rangeKm: 135,
    topSpeedKmh: 95,
    chargingTimeHours: 3.5,
    exShowroomPriceINR: 125000,
    bookingAmountINR: 5000,
    voucherRedeemLimitINR: 15000,
    imageUrl: '/images/bikes/thunder-pro.svg',
    isAvailable: true,
  },
  {
    id: '2b290c86-749d-480e-8f82-6f7122936e97',
    modelCode: 'ASKR-CITY-CRUISE',
    name: 'ASKR City Cruise',
    tagline: 'Ultra-Efficient Daily City Rider',
    batteryCapacityKwh: 2.5,
    rangeKm: 90,
    topSpeedKmh: 70,
    chargingTimeHours: 2.8,
    exShowroomPriceINR: 89000,
    bookingAmountINR: 3000,
    voucherRedeemLimitINR: 10000,
    imageUrl: '/images/bikes/city-cruise.svg',
    isAvailable: true,
  },
  {
    id: '22c9999e-5f97-449f-bf26-e2169dd74d7f',
    modelCode: 'ASKR-APEX-SPORT',
    name: 'ASKR Apex Sport',
    tagline: 'Track-Inspired Speed & Smart Telemetry',
    batteryCapacityKwh: 5.2,
    rangeKm: 175,
    topSpeedKmh: 120,
    chargingTimeHours: 4.0,
    exShowroomPriceINR: 165000,
    bookingAmountINR: 10000,
    voucherRedeemLimitINR: 30000,
    imageUrl: '/images/bikes/apex-sport.svg',
    isAvailable: true,
  },
];

export default function BikesPage() {
  const [bikes, setBikes] = useState<any[]>(DEFAULT_VERIFIED_BIKES);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBikes();
  }, []);

  const loadBikes = async () => {
    try {
      const data = await fetchApi<any[]>('/ev-bikes');
      if (Array.isArray(data) && data.length > 0) {
        setBikes(data);
      }
    } catch (err) {
      console.warn('Note: loaded default verified product models', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 w-full">
        {/* Header */}
        <div className="pb-8 border-b border-slate-200">
          <div className="text-xs font-semibold text-[#165DAD] uppercase tracking-wider mb-2">
            Electric Mobility Showroom
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#253247]">
            Electric Motorcycles
          </h1>
          <p className="mt-2 text-base text-slate-500 max-w-2xl leading-relaxed">
            All models feature permanent magnet synchronous motors (PMSM), advanced lithium battery architectures, combined braking systems (CBS), and full digital telemetry.
          </p>
        </div>

        {/* Fleet Grid */}
        <div className="mt-10">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 h-96 p-6 animate-pulse space-y-4">
                  <div className="h-44 bg-slate-100 rounded-lg" />
                  <div className="h-5 bg-slate-100 rounded w-2/3" />
                  <div className="h-4 bg-slate-100 rounded w-1/2" />
                  <div className="h-9 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {bikes.map((bike) => (
                <BikeCard key={bike.id} bike={bike} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
