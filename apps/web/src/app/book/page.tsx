'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Send,
  ArrowRight,
  ChevronRight,
  RotateCcw,
  Gauge,
  Filter,
  Wallet,
  ShoppingBag,
  Ticket,
  AlertCircle,
  Receipt,
  Info,
  RefreshCw,
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import AdminPreviewBanner from '../../components/AdminPreviewBanner';
import {
  fetchProductBySlug,
  fetchPublishedCatalog,
  getStoredUser,
  isAdminPreviewActive,
  fetchApi,
  bookEvBikeWithCombinedCheckoutApi,
} from '../../lib/api';

function BookingFlowContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const queryProduct = searchParams.get('product') || '';
  const queryVariant = searchParams.get('variant') || '';

  const [catalog, setCatalog] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Member Combined Checkout States
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [memberVouchers, setMemberVouchers] = useState<any[]>([]);
  const [vouchersLoading, setVouchersLoading] = useState<boolean>(false);
  const [vouchersError, setVouchersError] = useState<string | null>(null);

  const [memberShoppingWallet, setMemberShoppingWallet] = useState<any | null>(null);
  const [shoppingWalletLoading, setShoppingWalletLoading] = useState<boolean>(false);
  const [shoppingWalletError, setShoppingWalletError] = useState<string | null>(null);

  const [selectedVoucherId, setSelectedVoucherId] = useState<string>('');
  const [shoppingWalletAmount, setShoppingWalletAmount] = useState<number>(0);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingResult, setBookingResult] = useState<any | null>(null);

  // Authoritative Member Balances Loader (Tasks 1 & 2)
  const loadMemberBalances = async () => {
    const user = getStoredUser();
    if (!user) return;

    setCurrentUser(user);
    if (user.fullName) setFullName((prev) => prev || user.fullName);
    if (user.phone) setPhone((prev) => prev || user.phone);

    // Fetch member's active vouchers using authoritative remainingBalanceINR (Task 1)
    setVouchersLoading(true);
    setVouchersError(null);
    try {
      const res = await fetchApi<any>('/vouchers/my-vouchers');
      const list = Array.isArray(res) ? res : res?.vouchers || [];
      const active = list.filter((v: any) => {
        const remaining = Number(v.remainingBalanceINR ?? v.currentBalanceINR ?? v.balanceINR ?? 0);
        const isNotExpired = !v.expiresAt || new Date(v.expiresAt) > new Date();
        const isActiveStatus = v.status === 'ACTIVE' || v.status === 'PARTIALLY_REDEEMED';
        return isActiveStatus && remaining > 0 && isNotExpired;
      });
      setMemberVouchers(active);
      if (active.length > 0) {
        setSelectedVoucherId((prev) => (prev && active.some((av: any) => av.id === prev) ? prev : active[0].id));
      } else {
        setSelectedVoucherId('');
      }
    } catch (err: any) {
      setVouchersError('Failed to load shopping vouchers.');
    } finally {
      setVouchersLoading(false);
    }

    // Fetch member's authoritative Shopping Wallet available balance (Task 2)
    setShoppingWalletLoading(true);
    setShoppingWalletError(null);
    try {
      const sw = await fetchApi<any>('/wallet/shopping-wallet');
      setMemberShoppingWallet(sw);
    } catch (err: any) {
      setShoppingWalletError('Failed to load Shopping Wallet balance.');
    } finally {
      setShoppingWalletLoading(false);
    }
  };

  useEffect(() => {
    loadMemberBalances();
  }, []);

  useEffect(() => {
    loadCatalogAndSelection();

    const handlePreview = () => loadCatalogAndSelection();
    window.addEventListener('askrev_preview_change', handlePreview);
    return () => window.removeEventListener('askrev_preview_change', handlePreview);
  }, [queryProduct, queryVariant]);

  const loadCatalogAndSelection = async () => {
    setLoading(true);
    try {
      const isPreview = isAdminPreviewActive();
      const all = await fetchPublishedCatalog({ preview: isPreview });
      const validCatalog = Array.isArray(all) ? all : [];
      setCatalog(validCatalog);

      // If a product param was specified, select it
      if (queryProduct) {
        let matched = validCatalog.find(
          (v: any) =>
            v.slug?.toLowerCase() === queryProduct.toLowerCase() ||
            v.id === queryProduct ||
            v.modelCode?.toLowerCase() === queryProduct.toLowerCase()
        );

        if (!matched) {
          try {
            matched = await fetchProductBySlug(queryProduct, isPreview);
          } catch {}
        }

        if (matched) {
          setSelectedVehicle(matched);
          initVariant(matched, queryVariant);
        } else if (validCatalog.length > 0) {
          setSelectedVehicle(validCatalog[0]);
          initVariant(validCatalog[0], queryVariant);
        }
      } else if (validCatalog.length > 0) {
        // Default to first bookable vehicle or first in catalog
        const bookable = validCatalog.find((v: any) => v.availability === 'BOOKING_AVAILABLE' || v.isBookable) || validCatalog[0];
        setSelectedVehicle(bookable);
        initVariant(bookable, queryVariant);
      }
    } catch (e) {
      console.warn('Booking catalog load notice:', e);
    } finally {
      setLoading(false);
    }
  };

  const initVariant = (vehicle: any, preferredName?: string) => {
    const colors = vehicle?.colors || [];
    if (colors.length > 0) {
      if (preferredName) {
        const found = colors.find((c: any) => c.name?.toLowerCase() === preferredName.toLowerCase());
        if (found) {
          setSelectedVariant(found.name);
          return;
        }
      }
      const def = colors.find((c: any) => c.isDefault && c.isAvailable !== false) || colors[0];
      setSelectedVariant(def.name);
    } else {
      setSelectedVariant('Standard Edition');
    }
  };

  const handleSelectVehicle = (vehicle: any) => {
    setSelectedVehicle(vehicle);
    initVariant(vehicle);
    setSubmitted(false);
    setBookingResult(null);
    setBookingError(null);
    // Update URL query safely without full page reload
    router.replace(`/book?product=${encodeURIComponent(vehicle.slug || vehicle.id)}`);
  };

  const vehiclePriceINR = Number(selectedVehicle?.sellingPriceINR || selectedVehicle?.exShowroomPriceINR || 40000);

  const activeVoucher = memberVouchers.find((v: any) => v.id === selectedVoucherId);
  const voucherBalanceINR = activeVoucher
    ? Number(activeVoucher.remainingBalanceINR ?? activeVoucher.currentBalanceINR ?? activeVoucher.balanceINR ?? 0)
    : 0;
  const appliedVoucherDiscount = selectedVoucherId ? Math.min(voucherBalanceINR, vehiclePriceINR) : 0;

  const availableShoppingBalance = Number(memberShoppingWallet?.availableShoppingWalletINR || 0);
  const maxShoppingAllowed = Math.min(
    availableShoppingBalance,
    Math.max(0, vehiclePriceINR - appliedVoucherDiscount)
  );

  const appliedShoppingCredit = Math.min(Math.max(0, Number(shoppingWalletAmount) || 0), maxShoppingAllowed);
  const totalCombinedDiscount = appliedVoucherDiscount + appliedShoppingCredit;
  const finalNetPayable = Math.max(0, vehiclePriceINR - totalCombinedDiscount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;
    setBookingError(null);

    // Front-end validations (Task 4)
    if (shoppingWalletAmount > availableShoppingBalance) {
      setBookingError(`Shopping Wallet deduction (₹${shoppingWalletAmount.toLocaleString('en-IN')}) cannot exceed available balance of ₹${availableShoppingBalance.toLocaleString('en-IN')}.`);
      return;
    }
    if (totalCombinedDiscount > vehiclePriceINR) {
      setBookingError('Total discounts cannot exceed eligible vehicle price.');
      return;
    }

    setSubmitting(true);
    try {
      if (currentUser) {
        // Authenticated member combined checkout
        const res = await bookEvBikeWithCombinedCheckoutApi({
          bikeId: selectedVehicle.id,
          voucherId: selectedVoucherId || undefined,
          voucherAmountINR: appliedVoucherDiscount || undefined,
          shoppingWalletAmountINR: appliedShoppingCredit || undefined,
          deliveryAddress: city,
          notes: `Variant: ${selectedVariant}. Breakdown: Price ₹${vehiclePriceINR}, Voucher ₹${appliedVoucherDiscount}, Shopping Wallet ₹${appliedShoppingCredit}, Net ₹${finalNetPayable}`,
        });
        setBookingResult(res);
        setSubmitted(true);
      } else {
        // Guest showroom inquiry
        const existing = JSON.parse(localStorage.getItem('askrev_showroom_enquiries') || '[]');
        existing.push({
          vehicleId: selectedVehicle.id,
          vehicleName: selectedVehicle.name,
          modelCode: selectedVehicle.modelCode,
          variant: selectedVariant || 'Standard',
          fullName,
          phone,
          city,
          timestamp: new Date().toISOString(),
        });
        localStorage.setItem('askrev_showroom_enquiries', JSON.stringify(existing));
        setSubmitted(true);
      }
    } catch (err: any) {
      setBookingError(err.message || 'Failed to complete vehicle reservation.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCatalog = React.useMemo(() => {
    if (selectedCategory === 'ALL') return catalog;
    return catalog.filter((v: any) => (v.category || '').toUpperCase() === selectedCategory.toUpperCase());
  }, [catalog, selectedCategory]);

  const currentColor = React.useMemo(() => {
    if (!selectedVehicle?.colors) return null;
    return selectedVehicle.colors.find((c: any) => c.name === selectedVariant) || selectedVehicle.colors[0];
  }, [selectedVehicle, selectedVariant]);

  const activeImage =
    currentColor?.primaryImage ||
    selectedVehicle?.images?.find((img: any) => img.isPrimary)?.url ||
    selectedVehicle?.heroImage ||
    selectedVehicle?.imageUrl ||
    '/images/vehicles/dark/thunder-pro.jpg';

  return (
    <div className="flex-1 flex flex-col bg-[#080B12] text-[#F7FAFF] min-h-screen">
      <AdminPreviewBanner onToggle={loadCatalogAndSelection} />
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-10">
        {/* Breadcrumb & Header */}
        <div>
          <div className="flex items-center gap-2 text-xs text-[#AAB7C8] mb-3">
            <Link href="/" className="hover:text-white">Home</Link>
            <span>/</span>
            <span className="text-[#50D9FF] font-semibold">Vehicle Reservation & Booking</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#50D9FF]">
                Official Showroom Reservation Desk
              </span>
              <h1 className="text-3xl sm:text-4xl font-black text-[#F7FAFF] tracking-tight mt-1">
                Book Your ASKR EV
              </h1>
            </div>
            <p className="text-xs text-[#AAB7C8] max-w-md">
              Secure priority showroom allocation and dispatch scheduling with zero financial processing under simulation mode.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-24 text-center space-y-4">
            <div className="w-10 h-10 border-2 border-[#267DFF] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-[#AAB7C8]">Loading verified showroom fleet catalog...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* Left: Vehicle Selector & Fleet Browser */}
            <div className="lg:col-span-5 space-y-6">
              <div className="p-5 rounded-2xl bg-[#101827] border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[#F7FAFF] flex items-center gap-2">
                    <Filter className="w-4 h-4 text-[#50D9FF]" />
                    <span>Select Vehicle Model</span>
                  </h2>
                  <span className="text-[11px] text-[#AAB7C8]">
                    {catalog.length} model(s) available
                  </span>
                </div>

                {/* Category Pills */}
                <div className="flex flex-wrap gap-1.5 pb-2 border-b border-white/10">
                  {['ALL', 'SCOOTER', 'BIKE', 'CYCLE', 'JEEP', 'UTILITY'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
                        selectedCategory === cat
                          ? 'bg-[#267DFF] text-white'
                          : 'bg-white/5 text-[#AAB7C8] hover:bg-white/10'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Scrollable Model List */}
                <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                  {filteredCatalog.map((v: any) => {
                    const isSelected = selectedVehicle?.id === v.id;
                    const img =
                      v.images?.find((i: any) => i.isPrimary)?.url ||
                      v.heroImage ||
                      v.imageUrl;
                    return (
                      <button
                        key={v.id}
                        onClick={() => handleSelectVehicle(v)}
                        className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                          isSelected
                            ? 'bg-blue-500/15 border-[#267DFF] shadow-lg ring-1 ring-[#267DFF]/50'
                            : 'bg-white/5 border-white/5 hover:border-white/15 hover:bg-white/10'
                        }`}
                      >
                        <div className="w-16 h-16 rounded-lg bg-[#080B12] aspect-square flex items-center justify-center p-1.5 shrink-0 overflow-hidden border border-white/10">
                          {img ? (
                            <img src={img} alt={v.name} className="w-full h-full object-contain object-center" />
                          ) : (
                            <Sparkles className="w-5 h-5 text-slate-500" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-[#F7FAFF] truncate">{v.name}</span>
                            <span className="font-mono text-[10px] text-[#50D9FF] bg-blue-500/10 px-1 rounded">
                              {v.modelCode || v.slug}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#AAB7C8] truncate">
                            {v.tagline || v.shortDescription || `${v.category} Model`}
                          </div>
                          <div className="text-xs font-bold text-[#F7FAFF] mt-1">
                            {v.sellingPriceINR ? `₹${v.sellingPriceINR.toLocaleString('en-IN')}` : 'Contact for Price'}
                          </div>
                        </div>

                        {isSelected && <ChevronRight className="w-4 h-4 text-[#50D9FF] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Booking Form & Selected Vehicle Confirmation */}
            <div className="lg:col-span-7">
              {selectedVehicle ? (
                <div className="p-6 sm:p-8 rounded-3xl bg-[#101827] border border-white/10 shadow-2xl space-y-6">
                  {/* Selected Vehicle Card Preview */}
                  <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-[#080B12] border border-white/10">
                    <div className="w-32 h-32 aspect-square rounded-xl bg-[#101827] border border-white/10 p-2 flex items-center justify-center shrink-0">
                      <img
                        src={activeImage}
                        alt={selectedVehicle.name}
                        className="w-full h-full object-contain object-center filter drop-shadow-md"
                      />
                    </div>

                    <div className="flex-1 text-center sm:text-left space-y-1">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#50D9FF] bg-blue-500/10 px-2 py-0.5 rounded">
                          {selectedVehicle.category}
                        </span>
                        <span className="font-mono text-[10px] text-[#AAB7C8]">
                          {selectedVehicle.modelCode || selectedVehicle.slug}
                        </span>
                      </div>
                      <h2 className="text-2xl font-black text-[#F7FAFF]">
                        {selectedVehicle.name}
                      </h2>
                      <div className="text-xs text-[#AAB7C8]">
                        {selectedVehicle.tagline || selectedVehicle.shortDescription}
                      </div>
                      <div className="text-lg font-extrabold text-[#50D9FF] pt-1">
                        {selectedVehicle.sellingPriceINR
                          ? `₹${selectedVehicle.sellingPriceINR.toLocaleString('en-IN')}`
                          : 'Showroom Allocation'}
                      </div>
                    </div>
                  </div>

                  {submitted ? (
                    <div className="text-center py-8 space-y-5">
                      <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/30 shadow-[0_0_20px_rgba(52,211,153,0.3)]">
                        <CheckCircle2 className="w-10 h-10" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-2xl font-black text-[#F7FAFF]">
                          Vehicle Reservation Confirmed!
                        </h3>
                        <p className="text-xs sm:text-sm text-[#AAB7C8] max-w-md mx-auto">
                          Thank you, <span className="text-white font-bold">{fullName}</span>. Your combined reservation for the <span className="text-[#50D9FF] font-semibold">{selectedVehicle.name}</span> ({selectedVariant}) has been logged.
                        </p>
                      </div>

                      {/* Authoritative Settlement & Booking Receipt */}
                      <div className="p-5 rounded-2xl bg-[#080B12] border border-white/10 text-xs text-left max-w-md mx-auto space-y-3">
                        <div className="flex items-center justify-between border-b border-white/10 pb-2">
                          <span className="font-bold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                            <Receipt className="w-4 h-4 text-[#50D9FF]" />
                            <span>Combined Checkout Receipt</span>
                          </span>
                          <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            {bookingResult?.bookingId || bookingResult?.id ? `Ref #${(bookingResult.bookingId || bookingResult.id).slice(0, 10)}` : 'SIMULATION LOGGED'}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-slate-300">
                          <div className="flex justify-between">
                            <span className="text-[#AAB7C8]">Vehicle Model:</span>
                            <span className="font-bold text-white">{selectedVehicle.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#AAB7C8]">Selected Variant:</span>
                            <span className="text-[#50D9FF] font-medium">{selectedVariant}</span>
                          </div>
                          <div className="flex justify-between border-t border-white/5 pt-1.5">
                            <span className="text-[#AAB7C8]">Vehicle Price:</span>
                            <span className="font-bold text-white">₹{vehiclePriceINR.toLocaleString('en-IN')}</span>
                          </div>
                          {appliedVoucherDiscount > 0 && (
                            <div className="flex justify-between text-emerald-400">
                              <span>Applied Shopping Voucher:</span>
                              <span className="font-bold">-₹{appliedVoucherDiscount.toLocaleString('en-IN')}</span>
                            </div>
                          )}
                          {appliedShoppingCredit > 0 && (
                            <div className="flex justify-between text-blue-400">
                              <span>Applied Shopping Wallet Credit:</span>
                              <span className="font-bold">-₹{appliedShoppingCredit.toLocaleString('en-IN')}</span>
                            </div>
                          )}
                          <div className="flex justify-between border-t border-white/10 pt-2 text-sm font-black text-white">
                            <span>Remaining Payable:</span>
                            <span className="text-[#50D9FF]">₹{finalNetPayable.toLocaleString('en-IN')}</span>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-[11px] text-[#AAB7C8] space-y-1">
                          <div className="font-semibold text-white">Double-Entry Accounting Notice:</div>
                          <p>
                            Simulated EV Booking deposit recorded under SIMULATION_ONLY mode (GL 2300 EV_BOOKING_DEPOSITS).
                            Vouchers (GL 2100) and Shopping Wallet (GL 2150) balances debited.
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 flex justify-center gap-3">
                        <button
                          onClick={() => {
                            setSubmitted(false);
                            setBookingResult(null);
                          }}
                          className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-colors"
                        >
                          Book Another Model
                        </button>
                        <Link
                          href="/dashboard"
                          className="px-5 py-2.5 rounded-full bg-[#267DFF] hover:bg-[#1A6EEB] text-xs font-bold text-white transition-colors"
                        >
                          View Member Dashboard
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Color Variant Selector */}
                      {selectedVehicle.colors && selectedVehicle.colors.length > 0 && (
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-[#AAB7C8] block uppercase tracking-wider">
                            Choose Finish Variant
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {selectedVehicle.colors.map((c: any, i: number) => {
                              const isSel = selectedVariant === c.name;
                              return (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => setSelectedVariant(c.name)}
                                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs transition-all ${
                                    isSel
                                      ? 'border-[#267DFF] bg-blue-500/15 text-[#50D9FF] ring-1 ring-[#267DFF]'
                                      : 'border-white/10 bg-white/5 text-[#AAB7C8] hover:bg-white/10'
                                  }`}
                                >
                                  <span
                                    className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                                    style={{ backgroundColor: c.hex }}
                                  />
                                  <span className="font-medium">{c.name}</span>
                                  {c.isDefault && (
                                    <span className="text-[9px] text-emerald-400 font-semibold bg-emerald-500/10 px-1 rounded">
                                      Default
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* TASK 4: COMBINED SHOPPING CHECKOUT PANEL (VOUCHER + SHOPPING WALLET + PAYABLE) */}
                      {currentUser ? (
                        <div className="p-5 rounded-2xl bg-[#080B12] border border-blue-500/30 space-y-4 shadow-lg">
                          <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <div className="flex items-center gap-2">
                              <ShoppingBag className="w-4 h-4 text-[#50D9FF]" />
                              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                                Combined Shopping Checkout
                              </h3>
                            </div>
                            <span className="text-[10px] font-bold text-[#50D9FF] bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                              3-Way Split Checkout
                            </span>
                          </div>

                          {/* Balances Quick Summary */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-0.5">
                              <span className="text-[10px] text-[#AAB7C8] uppercase font-semibold flex items-center justify-between">
                                <span className="flex items-center gap-1">
                                  <Ticket className="w-3 h-3 text-emerald-400" />
                                  <span>Shopping Voucher</span>
                                </span>
                                {vouchersLoading && <RefreshCw className="w-2.5 h-2.5 text-slate-400 animate-spin" />}
                              </span>
                              <div className="text-base font-black text-emerald-400">
                                {vouchersLoading ? (
                                  <span className="text-xs text-slate-400">Loading...</span>
                                ) : vouchersError ? (
                                  <span className="text-xs text-red-400">Unavailable</span>
                                ) : (
                                  `₹${voucherBalanceINR.toLocaleString('en-IN')}`
                                )}
                              </div>
                            </div>

                            <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-0.5">
                              <span className="text-[10px] text-[#AAB7C8] uppercase font-semibold flex items-center justify-between">
                                <span className="flex items-center gap-1">
                                  <Wallet className="w-3 h-3 text-[#50D9FF]" />
                                  <span>Shopping Wallet</span>
                                </span>
                                {shoppingWalletLoading && <RefreshCw className="w-2.5 h-2.5 text-slate-400 animate-spin" />}
                              </span>
                              <div className="text-base font-black text-[#50D9FF]">
                                {shoppingWalletLoading ? (
                                  <span className="text-xs text-slate-400">Loading...</span>
                                ) : shoppingWalletError ? (
                                  <span className="text-xs text-red-400">Unavailable</span>
                                ) : (
                                  `₹${availableShoppingBalance.toLocaleString('en-IN')}`
                                )}
                              </div>
                            </div>
                          </div>

                          {/* 1. Shopping Voucher Selector */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-[#AAB7C8] flex items-center justify-between">
                              <span>1. Apply Shopping Voucher</span>
                              {appliedVoucherDiscount > 0 && (
                                <span className="text-emerald-400 font-bold">-₹{appliedVoucherDiscount.toLocaleString('en-IN')} applied</span>
                              )}
                            </label>
                            {vouchersLoading ? (
                              <div className="text-xs text-slate-400 py-2 flex items-center gap-1.5">
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Loading available vouchers...</span>
                              </div>
                            ) : vouchersError ? (
                              <div className="flex items-center justify-between text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl">
                                <span>{vouchersError}</span>
                                <button
                                  type="button"
                                  onClick={loadMemberBalances}
                                  className="text-[10px] text-white bg-red-600/60 px-2 py-0.5 rounded font-bold hover:bg-red-600"
                                >
                                  Retry
                                </button>
                              </div>
                            ) : memberVouchers.length > 0 ? (
                              <div className="space-y-2">
                                <select
                                  value={selectedVoucherId}
                                  onChange={(e) => setSelectedVoucherId(e.target.value)}
                                  className="w-full px-3 py-2 rounded-xl bg-[#101827] border border-white/15 text-xs text-white outline-none focus:border-[#267DFF]"
                                >
                                  <option value="">Do not apply Shopping Voucher</option>
                                  {memberVouchers.map((v: any) => {
                                    const bal = Number(v.remainingBalanceINR ?? v.currentBalanceINR ?? v.balanceINR ?? 0);
                                    return (
                                      <option key={v.id} value={v.id}>
                                        {v.voucherCode || v.code} — Balance: ₹{bal.toLocaleString('en-IN')} ({v.categoryLabel || v.category || v.voucherType || 'Shopping Voucher'})
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>
                            ) : (
                              <div className="text-[11px] text-[#AAB7C8] bg-white/5 p-2.5 rounded-xl border border-white/5">
                                No active Shopping Vouchers on your account. (Upgrade to EV ULTRA to receive ₹30,000 voucher credit).
                              </div>
                            )}
                          </div>

                          {/* 2. Shopping Wallet Credit Input */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <label className="font-medium text-[#AAB7C8]">2. Apply Shopping Wallet Credit</label>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-[#AAB7C8]">Max eligible: ₹{maxShoppingAllowed.toLocaleString('en-IN')}</span>
                                {maxShoppingAllowed > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setShoppingWalletAmount(maxShoppingAllowed)}
                                    className="text-[10px] text-[#50D9FF] hover:underline font-bold"
                                  >
                                    Apply Max
                                  </button>
                                )}
                              </div>
                            </div>
                            {shoppingWalletLoading ? (
                              <div className="text-xs text-slate-400 py-2 flex items-center gap-1.5">
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Loading Shopping Wallet balance...</span>
                              </div>
                            ) : shoppingWalletError ? (
                              <div className="flex items-center justify-between text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl">
                                <span>{shoppingWalletError}</span>
                                <button
                                  type="button"
                                  onClick={loadMemberBalances}
                                  className="text-[10px] text-white bg-red-600/60 px-2 py-0.5 rounded font-bold hover:bg-red-600"
                                >
                                  Retry
                                </button>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-400 px-3 py-2 bg-white/5 rounded-xl border border-white/10">₹</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max={maxShoppingAllowed}
                                    value={shoppingWalletAmount || ''}
                                    onChange={(e) => {
                                      const val = Number(e.target.value);
                                      setShoppingWalletAmount(val < 0 ? 0 : val);
                                    }}
                                    placeholder="0"
                                    className="flex-1 px-3 py-2 rounded-xl bg-[#101827] border border-white/15 text-xs text-white outline-none focus:border-[#267DFF]"
                                  />
                                </div>
                                {shoppingWalletAmount > availableShoppingBalance && (
                                  <p className="text-[11px] text-red-400 font-medium">
                                    Amount exceeds your available Shopping Wallet balance of ₹{availableShoppingBalance.toLocaleString('en-IN')}.
                                  </p>
                                )}
                                {Number(memberShoppingWallet?.pendingEvClubFundINR || 0) > 0 && availableShoppingBalance === 0 && (
                                  <p className="text-[10px] text-amber-300/80 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-lg">
                                    Note: Pending EV Club Fund (₹{Number(memberShoppingWallet.pendingEvClubFundINR).toLocaleString('en-IN')}) is awaiting scheduled settlement and cannot be spent until settled into available balance.
                                  </p>
                                )}
                              </>
                            )}
                          </div>

                          {/* 3. Authoritative Cost Breakdown Summary */}
                          <div className="p-3.5 rounded-xl bg-[#101827] border border-white/10 space-y-2 text-xs">
                            <div className="flex justify-between text-slate-400">
                              <span>Product Price:</span>
                              <span className="text-white font-semibold">₹{vehiclePriceINR.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between text-emerald-400">
                              <span>Shopping Voucher Discount:</span>
                              <span className="font-semibold">-₹{appliedVoucherDiscount.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between text-blue-400">
                              <span>Shopping Wallet Credit:</span>
                              <span className="font-semibold">-₹{appliedShoppingCredit.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="border-t border-white/10 pt-2 flex justify-between font-bold text-sm text-white">
                              <span>Remaining Net Payable:</span>
                              <span className="text-[#50D9FF]">₹{finalNetPayable.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 text-center pt-1 border-t border-white/5 font-mono">
                              Product: ₹{vehiclePriceINR.toLocaleString('en-IN')} = Voucher: ₹{appliedVoucherDiscount.toLocaleString('en-IN')} + Wallet: ₹{appliedShoppingCredit.toLocaleString('en-IN')} + Net Cash: ₹{finalNetPayable.toLocaleString('en-IN')}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-[#AAB7C8] flex items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <span className="text-white font-bold block">Are you an ASKR EV Member?</span>
                            <span>Sign in to apply your Shopping Vouchers & EV Club Shopping Wallet to this booking.</span>
                          </div>
                          <Link
                            href={`/auth/login?redirect=/book?product=${encodeURIComponent(selectedVehicle.slug || selectedVehicle.id)}`}
                            className="px-3.5 py-1.5 rounded-lg bg-[#267DFF] text-white font-bold text-xs shrink-0 hover:bg-[#1A6EEB]"
                          >
                            Sign In
                          </Link>
                        </div>
                      )}

                      {/* Contact Fields */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-[#AAB7C8]">Full Name</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Rahul Sharma"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-[#080B12] border border-white/15 focus:border-[#267DFF] text-xs text-white outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-medium text-[#AAB7C8]">Mobile Number</label>
                          <input
                            type="tel"
                            required
                            placeholder="e.g. +91 98765 43210"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-[#080B12] border border-white/15 focus:border-[#267DFF] text-xs text-white outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-[#AAB7C8]">City / State for Showroom Dispatch</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Bengaluru, Karnataka"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-[#080B12] border border-white/15 focus:border-[#267DFF] text-xs text-white outline-none"
                        />
                      </div>

                      {/* Error Banner */}
                      {bookingError && (
                        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{bookingError}</span>
                        </div>
                      )}

                      {/* Submit Button */}
                      <div className="pt-2 space-y-2.5">
                        <button
                          type="submit"
                          disabled={submitting || (shoppingWalletAmount > availableShoppingBalance) || (totalCombinedDiscount > vehiclePriceINR)}
                          className="w-full py-4 rounded-full bg-[#267DFF] hover:bg-[#1A6EEB] text-white text-xs sm:text-sm font-bold uppercase tracking-wider transition-all shadow-[0_0_25px_rgba(38,125,255,0.4)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {submitting ? (
                            <span>Processing Combined Booking...</span>
                          ) : (
                            <>
                              <span>Confirm Vehicle Booking (Pay ₹{finalNetPayable.toLocaleString('en-IN')})</span>
                              <Send className="w-4 h-4" />
                            </>
                          )}
                        </button>
                        <div className="flex items-center justify-center gap-2 text-[11px] text-[#AAB7C8]">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Simulation Mode • Atomic Balanced Accounting • Priority Dispatch Queue</span>
                        </div>
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                <div className="p-12 text-center rounded-3xl bg-[#101827] border border-white/10 space-y-3">
                  <Sparkles className="w-8 h-8 text-[#50D9FF] mx-auto" />
                  <h3 className="text-lg font-bold text-white">No Vehicle Selected</h3>
                  <p className="text-xs text-[#AAB7C8]">
                    Please select a vehicle model from the fleet list on the left to begin your booking.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#080B12] flex items-center justify-center text-[#50D9FF]">
          <div className="w-8 h-8 border-2 border-[#267DFF] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <BookingFlowContent />
    </Suspense>
  );
}
