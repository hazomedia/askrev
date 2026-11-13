'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, ShieldCheck, Sparkles, Send } from 'lucide-react';

interface BookingModalProps {
  bike: any | null;
  isOpen: boolean;
  onClose: () => void;
  user?: any | null;
  onSuccess?: () => void;
}

export default function BookingModal({
  bike,
  isOpen,
  onClose,
  user,
  onSuccess,
}: BookingModalProps) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [selectedVariant, setSelectedVariant] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSubmitted(false);
      setSubmitting(false);
      setFullName('');
      setPhone('');
      setCity('');
    } else if (bike?.variants && bike.variants.length > 0) {
      setSelectedVariant(bike.variants[0].name);
    }
  }, [isOpen, bike]);

  if (!isOpen || !bike) return null;

  const handleSubmitEnquiry = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // Record non-transactional showroom interest in local storage for the session
    try {
      const existing = JSON.parse(localStorage.getItem('askrev_showroom_enquiries') || '[]');
      existing.push({
        vehicleId: bike.id,
        vehicleName: bike.name,
        modelCode: bike.modelCode,
        fullName,
        phone,
        city,
        variant: selectedVariant || 'Standard',
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem('askrev_showroom_enquiries', JSON.stringify(existing));
    } catch {}

    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      if (onSuccess) onSuccess();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#101827] w-full max-w-lg rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col text-[#F7FAFF]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-[#0C121E]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-[#50D9FF] flex items-center justify-center border border-blue-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-[#F7FAFF] tracking-tight">
                {bike.name}
              </h2>
              <div className="text-xs text-[#AAB7C8]">
                Showroom Priority Allocation • Model: {bike.modelCode}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#AAB7C8] hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {submitted ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/30 shadow-[0_0_20px_rgba(52,211,153,0.3)]">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-2xl font-black text-[#F7FAFF]">
                  Priority Allocation Registered
                </h3>
                <p className="text-xs sm:text-sm text-[#AAB7C8] max-w-sm mx-auto leading-relaxed">
                  Thank you, <span className="text-[#F7FAFF] font-semibold">{fullName}</span>! Your showroom priority interest for the <span className="text-[#50D9FF] font-semibold">{bike.name}</span> has been logged.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#AAB7C8]">Requested Vehicle:</span>
                  <span className="font-bold text-[#F7FAFF]">{bike.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#AAB7C8]">Selected Variant:</span>
                  <span className="font-medium text-[#F7FAFF]">{selectedVariant || 'Standard'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#AAB7C8]">Contact Phone:</span>
                  <span className="font-medium text-[#F7FAFF]">{phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#AAB7C8]">City:</span>
                  <span className="font-medium text-[#F7FAFF]">{city}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-white/10 text-emerald-400 font-semibold">
                  <span>Booking Payment:</span>
                  <span>₹0 (Non-Transactional Enquiry)</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="w-full py-3.5 rounded-full bg-[#267DFF] hover:bg-[#1A6EEB] text-white text-xs sm:text-sm font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(38,125,255,0.4)]"
                >
                  Return to Showroom
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitEnquiry} className="space-y-4">
              {/* Notice Banner */}
              <div className="p-4 rounded-2xl bg-[#0B101D] border border-blue-500/25 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-[#50D9FF] uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Showroom Pre-Order & Test Drive Priority</span>
                </div>
                <p className="text-[11px] text-[#AAB7C8] leading-relaxed">
                  Transactional payments are disabled during showroom preview. Registering below reserves your place in the regional test drive and allocation queue with zero payment or financial commitment.
                </p>
              </div>

              {/* Vehicle Specifications Summary */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-white/5 border border-white/10 text-center text-xs">
                <div>
                  <span className="text-[10px] text-[#AAB7C8] block uppercase">Starting At</span>
                  <span className="font-bold text-[#F7FAFF]">
                    {bike.exShowroomPriceINR
                      ? `₹${bike.exShowroomPriceINR.toLocaleString('en-IN')}`
                      : 'Showcase'}
                  </span>
                </div>
                <div className="border-x border-white/10">
                  <span className="text-[10px] text-[#AAB7C8] block uppercase">Range</span>
                  <span className="font-bold text-[#F7FAFF]">{bike.rangeKm} km</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#AAB7C8] block uppercase">Top Speed</span>
                  <span className="font-bold text-[#F7FAFF]">{bike.topSpeedKmh} km/h</span>
                </div>
              </div>

              {/* Form Inputs */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-[#AAB7C8] block mb-1">
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#080B12] border border-white/15 focus:border-[#267DFF] focus:outline-none text-sm text-[#F7FAFF] placeholder-[#AAB7C8]/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#AAB7C8] block mb-1">
                    Mobile Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#080B12] border border-white/15 focus:border-[#267DFF] focus:outline-none text-sm text-[#F7FAFF] placeholder-[#AAB7C8]/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[#AAB7C8] block mb-1">
                      City / State *
                    </label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Hyderabad"
                      className="w-full px-4 py-2.5 rounded-xl bg-[#080B12] border border-white/15 focus:border-[#267DFF] focus:outline-none text-sm text-[#F7FAFF] placeholder-[#AAB7C8]/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#AAB7C8] block mb-1">
                      Preferred Variant
                    </label>
                    {bike.variants && bike.variants.length > 0 ? (
                      <select
                        value={selectedVariant}
                        onChange={(e) => setSelectedVariant(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#080B12] border border-white/15 focus:border-[#267DFF] focus:outline-none text-xs text-[#F7FAFF]"
                      >
                        {bike.variants.map((v: any) => (
                          <option key={v.name} value={v.name} className="bg-[#101827]">
                            {v.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        disabled
                        value="Standard Edition"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#080B12]/60 border border-white/10 text-xs text-[#AAB7C8]"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 rounded-full bg-[#267DFF] hover:bg-[#1A6EEB] text-white text-xs sm:text-sm font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(38,125,255,0.4)] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <span>Registering Priority Interest...</span>
                  ) : (
                    <>
                      <span>Register Priority Interest (₹0)</span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
                <p className="text-[10px] text-center text-[#AAB7C8]">
                  Zero financial obligation • Official ASKR EV Showroom Allocation
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
