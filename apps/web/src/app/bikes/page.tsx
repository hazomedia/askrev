'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import BikeCard from '../../components/BikeCard';
import { fetchApi } from '../../lib/api';

export default function BikesPage() {
  const [bikes, setBikes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBikes();
  }, []);

  const loadBikes = async () => {
    setLoading(true);
    try {
      const data = await fetchApi<any[]>('/ev-bikes');
      setBikes(data);
    } catch (err) {
      console.error(err);
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
            Commercial Motorcycle Fleet
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#253247]">
            Electric Motorcycles
          </h1>
          <p className="mt-2 text-sm text-slate-500 max-w-2xl leading-relaxed">
            All models feature permanent magnet synchronous motors (PMSM), advanced lithium battery architectures, combined braking systems (CBS), and full turn-by-turn telemetry.
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
