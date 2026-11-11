'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Wallet,
  Users,
  Copy,
  Check,
  Share2,
  Bike,
  Sparkles,
  AlertCircle,
  Ticket,
  ShieldCheck,
  User,
  GitBranch,
  ChevronRight,
  LogOut,
  LayoutDashboard,
  Menu,
  X,
  ExternalLink,
  RotateCcw,
  History,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';
import { fetchApi, getStoredUser, logoutSession } from '../../lib/api';

type TabType = 'overview' | 'membership' | 'team' | 'wallets' | 'vouchers' | 'bookings' | 'profile';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [directTeam, setDirectTeam] = useState<any>(null);
  const [binaryTree, setBinaryTree] = useState<any>(null);
  const [userBookings, setUserBookings] = useState<any[]>([]);
  const [userVouchers, setUserVouchers] = useState<any[]>([]);
  const [walletOverview, setWalletOverview] = useState<any>(null);
  const [walletTransactions, setWalletTransactions] = useState<any[]>([]);
  const [voucherTransactions, setVoucherTransactions] = useState<any[]>([]);
  const [membershipRequests, setMembershipRequests] = useState<any[]>([]);
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [copied, setCopied] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.push('/auth/login');
      return;
    }
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [
        profileData,
        teamData,
        binaryData,
        bookingsData,
        vouchersData,
        walletData,
        walletTxData,
        voucherTxData,
        requestsData,
      ] = await Promise.all([
        fetchApi<any>('/auth/me'),
        fetchApi<any>('/members/direct-team').catch(() => null),
        fetchApi<any>('/members/binary-tree').catch(() => null),
        fetchApi<any>('/ev-bikes/my-bookings').catch(() => []),
        fetchApi<any>('/vouchers/my-vouchers').catch(() => []),
        fetchApi<any>('/wallet/my-wallet').catch(() => null),
        fetchApi<any>('/wallet/transactions').catch(() => []),
        fetchApi<any>('/vouchers/transactions').catch(() => []),
        fetchApi<any>('/packages/my-requests').catch(() => []),
      ]);

      setUser(profileData);
      setDirectTeam(teamData);
      setBinaryTree(binaryData);
      setUserBookings(bookingsData);
      setUserVouchers(vouchersData);
      setWalletOverview(walletData);
      setWalletTransactions(walletTxData);
      setVoucherTransactions(voucherTxData);
      setMembershipRequests(Array.isArray(requestsData) ? requestsData : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load member dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (
      !confirm(
        'Are you sure you want to cancel this simulated EV booking? Any redeemed shopping voucher value will be restored to your account.'
      )
    ) {
      return;
    }
    setCancellingBookingId(bookingId);
    try {
      await fetchApi(`/ev-bikes/bookings/${bookingId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ cancellationReason: 'Member requested simulated cancellation' }),
      });
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel booking');
    } finally {
      setCancellingBookingId(null);
    }
  };

  const getReferralLink = () => {
    if (!user || !user.memberId) return '';
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/auth/register?ref=${user.memberId}`;
  };

  const handleCopyLink = () => {
    const link = getReferralLink();
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const getWhatsAppShareUrl = () => {
    const link = getReferralLink();
    if (!link || !user) return '#';
    const text = `Join ASKR EV Mobility platform. Register using my sponsor referral code ${user.memberId}: ${link}`;
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  };

  const handleShareLink = async () => {
    const link = getReferralLink();
    if (!link || !user) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join ASKR EV Mobility',
          text: `Use my sponsor referral code ${user.memberId} to register with ASKR EV electric mobility platform:`,
          url: link,
        });
      } catch (err) {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleMembershipRequest = async (
    requestType: 'BASIC_ACTIVATION' | 'FULL_ACTIVATION' | 'BASIC_TO_FULL_UPGRADE'
  ) => {
    setUpgrading(true);
    setUpgradeSuccess(null);
    setError(null);
    try {
      const res: any = await fetchApi('/packages/request', {
        method: 'POST',
        body: JSON.stringify({
          requestType,
          paymentMode: 'SIMULATED_PORTAL',
          metadata: { compliance: 'SIMULATION_ONLY', source: 'member_dashboard' },
        }),
      });
      setUpgradeSuccess(res.message || 'Membership request submitted for administrative approval.');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Membership request submission failed');
    } finally {
      setUpgrading(false);
    }
  };

  const handleLogout = async () => {
    await logoutSession();
    router.push('/auth/login');
  };

  if (loading && !user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-white text-slate-500">
        <div className="flex items-center gap-3">
          <div className="animate-spin w-6 h-6 border-2 border-[#165DAD] border-t-transparent rounded-full" />
          <span className="text-sm font-medium">Loading Member Portal...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const getPackageBadge = (pkg?: string) => {
    switch (pkg) {
      case 'FULL':
        return 'bg-blue-50 text-[#165DAD] border-blue-200';
      case 'BASIC':
        return 'bg-emerald-50 text-[#15803D] border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const navItems: { id: TabType; label: string; icon: any; count?: number }[] = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'membership', label: 'My Membership', icon: Sparkles },
    { id: 'team', label: 'My Team', icon: Users, count: directTeam?.directs?.length },
    { id: 'wallets', label: 'Earnings Wallet', icon: Wallet },
    { id: 'vouchers', label: 'Shopping Vouchers', icon: Ticket, count: userVouchers.length },
    { id: 'bookings', label: 'My Bookings', icon: Bike, count: userBookings.length },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#253247]">
      {/* =========================================================================
          TASK 1 — TOP HEADER
          Features ASKR EV logo, Member ID, membership badge, and Logout
          ========================================================================= */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Mobile trigger & ASKR EV Logo + Title */}
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-slate-500 hover:text-[#253247] hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Toggle navigation"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <Link href="/" className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#165DAD] flex items-center justify-center text-white font-black text-sm shadow-xs">
                  A
                </div>
                <span className="text-base font-bold tracking-tight text-[#253247] hidden sm:inline">
                  ASKR <span className="text-[#165DAD]">EV</span>
                </span>
              </Link>

              <span className="text-slate-300 hidden sm:inline">/</span>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs sm:text-sm text-[#253247]">Member Portal</span>
                <span className="text-slate-300">/</span>
                <span className="font-mono text-xs font-bold text-[#165DAD] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                  {user.memberId}
                </span>
              </div>
            </div>

            {/* Right: Status badge & Logout */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getPackageBadge(
                  user.currentPackage
                )}`}
              >
                {user.currentPackage} Plan
              </span>

              {user.isFullQualified && (
                <span className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-[#15803D] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <Check className="w-3.5 h-3.5" />
                  <span>Qualified</span>
                </span>
              )}

              <div className="h-5 w-px bg-slate-200 mx-1" />

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-[#DC2626] transition-colors px-2.5 py-1.5 rounded-lg hover:bg-slate-50 min-h-[36px]"
                title="Sign out of portal"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container with Sidebar + Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Desktop Left Sidebar Navigation */}
          <aside
            className={`md:w-60 shrink-0 md:block ${
              mobileMenuOpen ? 'block' : 'hidden'
            } bg-white rounded-xl border border-slate-200 p-3 shadow-sm h-fit space-y-1`}
          >
            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Portal Menu
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-[#165DAD] font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-[#253247]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#165DAD]' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && item.count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        isActive
                          ? 'bg-[#165DAD] text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}

            <div className="pt-4 mt-4 border-t border-slate-100 px-3">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Support
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Mon - Sat: 9 AM - 6 PM IST
              </p>
              <a
                href="mailto:support@askrev.com"
                className="text-xs text-[#165DAD] hover:underline block mt-1 font-medium"
              >
                support@askrev.com
              </a>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 min-w-0 space-y-6">
            {/* System Notifications / Alerts */}
            {upgradeSuccess && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-[#15803D] text-xs font-medium flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0 text-[#15803D]" />
                  <span>{upgradeSuccess}</span>
                </div>
                <button
                  onClick={() => setUpgradeSuccess(null)}
                  className="text-xs text-slate-500 hover:text-slate-700 font-semibold"
                >
                  Dismiss
                </button>
              </div>
            )}

            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-[#DC2626] text-xs font-medium flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626]" />
                  <span>{error}</span>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-xs text-slate-500 hover:text-slate-700 font-semibold"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* =========================================================================
                    TASK 1 & 2 — COMPACT WELCOME CARD & REFERRAL LINK SHARING
                    Includes Member Name, Member ID, Sponsor, Copy Link & WhatsApp Share
                    ========================================================================= */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-sm">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                    {/* Welcome Details */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>Welcome back,</span>
                        <span className="font-semibold text-[#253247] text-sm">{user.fullName}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        <h1 className="text-lg sm:text-xl font-bold text-[#253247]">
                          Member Dashboard
                        </h1>
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          ID: {user.memberId}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Sponsor:{' '}
                        <span className="font-medium text-[#253247]">
                          {user.sponsorName
                            ? `${user.sponsorName} (${user.sponsorMemberId})`
                            : 'Direct Platform Enrollment'}
                        </span>
                      </p>
                    </div>

                    {/* Referral Link Box - Compact & Multi-Share */}
                    <div className="bg-[#F7F9FC] border border-slate-200 rounded-lg p-3 sm:p-3.5 max-w-lg w-full space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#253247] flex items-center gap-1.5">
                          <Share2 className="w-3.5 h-3.5 text-[#165DAD]" />
                          <span>Personal Referral Link</span>
                        </span>
                        <span className="text-[11px] text-[#15803D] font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Active
                        </span>
                      </div>

                      <div className="flex flex-wrap xl:flex-nowrap items-center gap-2">
                        <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-600 truncate flex-1 min-w-0 w-full xl:w-auto select-all">
                          {getReferralLink()}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Copy Button */}
                          <button
                            onClick={handleCopyLink}
                            className="px-3 py-1.5 rounded-lg bg-[#165DAD] hover:bg-[#12498a] text-white font-medium text-xs transition-colors flex items-center gap-1.5 min-h-[36px]"
                            title="Copy referral link to clipboard"
                          >
                            {copied ? (
                              <Check className="w-3.5 h-3.5 text-white" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            <span>{copied ? 'Copied' : 'Copy'}</span>
                          </button>

                          {/* WhatsApp Share Button */}
                          <a
                            href={getWhatsAppShareUrl()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-medium transition-colors flex items-center gap-1.5 min-h-[36px]"
                            title="Share referral link via WhatsApp"
                          >
                            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                            </svg>
                            <span className="hidden sm:inline">WhatsApp</span>
                          </a>

                          {/* Native Device Share */}
                          <button
                            onClick={handleShareLink}
                            className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs transition-colors min-h-[36px]"
                            title="Share link via device options"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Share this link to invite new members into your direct referral team.
                      </p>
                    </div>
                  </div>
                </div>

                {/* =========================================================================
                    TASK 3 & 6 — FOUR PRIMARY SUMMARY CARDS WITH ACCURATE TERMINOLOGY
                    Values from authenticated API responses; no false withdrawable claims.
                    ========================================================================= */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* 1. Earnings Wallet */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                      <span>Earnings Wallet</span>
                      <Wallet className="w-4 h-4 text-[#15803D]" />
                    </div>
                    <div className="text-2xl font-bold text-[#253247] mt-2">
                      ₹{user.wallet?.availableEarningsINR?.toLocaleString('en-IN') ?? 0}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      <span>Available Balance (Simulation Mode)</span>
                    </div>
                  </div>

                  {/* 2. Shopping Vouchers */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                      <span>Shopping Vouchers</span>
                      <Ticket className="w-4 h-4 text-[#165DAD]" />
                    </div>
                    <div className="text-2xl font-bold text-[#165DAD] mt-2">
                      ₹{user.wallet?.shoppingVoucherINR?.toLocaleString('en-IN') ?? 0}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Redeemable on EV bookings
                    </div>
                  </div>

                  {/* 3. Direct Referrals */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                      <span>Direct Referrals</span>
                      <Users className="w-4 h-4 text-slate-600" />
                    </div>
                    <div className="text-2xl font-bold text-[#253247] mt-2">
                      {directTeam?.metrics?.totalDirects ?? 0}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {directTeam?.metrics?.totalActivatedDirects ?? 0} activated members
                    </div>
                  </div>

                  {/* 4. Active EV Bookings */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                      <span>EV Bookings</span>
                      <Bike className="w-4 h-4 text-[#165DAD]" />
                    </div>
                    <div className="text-2xl font-bold text-[#253247] mt-2">
                      {userBookings.length}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Verified reservations
                    </div>
                  </div>
                </div>

                {/* =========================================================================
                    TASK 5 — COMPACT MEMBERSHIP UPGRADE BANNER
                    - For BASIC: ₹30,000 upgrade includes ₹30,000 voucher entitlement
                    - For FREE: Membership activation options notice
                    - For FULL: Hidden completely
                    ========================================================================= */}
                {user.currentPackage === 'BASIC' && !user.isFullQualified && (
                  <div className="bg-blue-50/70 rounded-xl border border-blue-200 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#165DAD]">
                        <Sparkles className="w-3.5 h-3.5 text-[#165DAD]" />
                        <span>Full Membership Upgrade</span>
                      </div>
                      <h3 className="text-base font-bold text-[#253247]">
                        Upgrade to Full Membership (₹30,000)
                      </h3>
                      <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                        Full Membership total package value is ₹33,000. Having already completed the ₹3,000 basic platform fee, upgrading for ₹30,000 entitles you to a <strong>₹30,000 vehicle shopping voucher credit</strong> (subject to approved terms) and full eligibility for binary matching rewards.
                      </p>
                    </div>
                    <button
                      onClick={() => handleMembershipRequest('BASIC_TO_FULL_UPGRADE')}
                      disabled={upgrading || membershipRequests.some((r) => r.status === 'PENDING')}
                      className="shrink-0 px-5 py-2.5 rounded-lg font-semibold text-xs text-white bg-[#165DAD] hover:bg-[#12498a] transition-colors disabled:opacity-50 min-h-[44px] flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>
                        {membershipRequests.some((r) => r.status === 'PENDING')
                          ? 'Upgrade Pending Admin Review'
                          : upgrading
                          ? 'Submitting...'
                          : 'Request Upgrade (₹30,000)'}
                      </span>
                    </button>
                  </div>
                )}

                {user.currentPackage === 'FREE' && (
                  <div className="bg-amber-50/70 rounded-xl border border-amber-200 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                        <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                        <span>Membership Activation Available</span>
                      </div>
                      <h3 className="text-base font-bold text-[#253247]">
                        Activate Your ASKR EV Membership
                      </h3>
                      <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                        Free accounts can activate Basic Membership (₹3,000 platform fee) to qualify for direct referral rewards, or Full Membership (₹33,000 with a ₹30,000 vehicle shopping voucher entitlement).
                      </p>
                      <p className="text-[11px] text-amber-700 font-medium">
                        * Membership activation requires verified payment and authorized supervisory clearance.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('membership')}
                      className="shrink-0 px-5 py-2.5 rounded-lg font-semibold text-xs text-white bg-[#165DAD] hover:bg-[#12498a] transition-colors min-h-[44px] flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <span>Review Membership Plans</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* =========================================================================
                    TASK 7 — RECENT DIRECT REFERRALS TABLE
                    Includes Member ID, Name, Membership Status, Joining Date & View All
                    ========================================================================= */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[#253247]">Recent Direct Referrals</h3>
                      <p className="text-xs text-slate-500">Latest members enrolled with your sponsor code</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('team')}
                      className="text-xs font-semibold text-[#165DAD] hover:underline flex items-center gap-1 min-h-[36px]"
                    >
                      <span>View All (My Team)</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                        <tr>
                          <th className="py-3 px-4">Member ID</th>
                          <th className="py-3 px-4">Name</th>
                          <th className="py-3 px-4">Membership Status</th>
                          <th className="py-3 px-4">Joining Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[#253247]">
                        {directTeam?.directs && directTeam.directs.length > 0 ? (
                          directTeam.directs.slice(0, 5).map((d: any) => (
                            <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4 font-mono font-medium text-[#165DAD]">
                                {d.memberId}
                              </td>
                              <td className="py-3 px-4 font-medium">{d.fullName}</td>
                              <td className="py-3 px-4">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getPackageBadge(
                                    d.currentPackage
                                  )}`}
                                >
                                  {d.currentPackage}
                                </span>
                                {d.isFullQualified && (
                                  <span className="ml-1.5 text-[10px] text-[#15803D] font-medium inline-flex items-center gap-0.5">
                                    <Check className="w-2.5 h-2.5" /> Qualified
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-slate-500">
                                {new Date(d.createdAt).toLocaleDateString('en-IN')}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-slate-400">
                              No direct team members registered yet. Share your referral link above to invite members.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: MY MEMBERSHIP */}
            {activeTab === 'membership' && (
              <div className="space-y-6">
                {/* Current Package Overview */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Current Membership Plan
                      </span>
                      <h3 className="text-xl font-bold text-[#253247] mt-1">
                        {user.currentPackage} Membership
                      </h3>
                    </div>
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full border self-start ${getPackageBadge(
                        user.currentPackage
                      )}`}
                    >
                      Status: {user.isFullQualified ? 'Full Qualified' : 'Active'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-xs">
                    <div className="p-4 rounded-lg bg-[#F7F9FC] border border-slate-200">
                      <span className="text-slate-500">Direct Sponsor Income:</span>
                      <div className="text-sm font-bold text-[#253247] mt-1">
                        {user.currentPackage === 'FREE' ? 'Not Eligible' : 'Eligible'}
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-[#F7F9FC] border border-slate-200">
                      <span className="text-slate-500">Binary Matching Income:</span>
                      <div className="text-sm font-bold text-[#253247] mt-1">
                        {user.isFullQualified ? 'Eligible (1:2 / 2:1)' : 'Requires Full Qualification'}
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-[#F7F9FC] border border-slate-200">
                      <span className="text-slate-500">Shopping Voucher Credit:</span>
                      <div className="text-sm font-bold text-[#15803D] mt-1">
                        ₹{user.wallet?.shoppingVoucherINR?.toLocaleString('en-IN') ?? 0}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Activation / Upgrade Actions & Request History */}
                {membershipRequests.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
                    <h3 className="text-sm font-bold text-[#253247]">Recent Membership Request Status</h3>
                    <div className="space-y-2">
                      {membershipRequests.slice(0, 3).map((req: any) => (
                        <div
                          key={req.id}
                          className="p-3 rounded-lg bg-[#F7F9FC] border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                        >
                          <div>
                            <span className="font-bold text-[#253247]">
                              {req.requestType.replace(/_/g, ' ')}
                            </span>
                            <span className="text-slate-500 ml-2 font-mono">
                              (₹{(req.feeINR ?? 0).toLocaleString('en-IN')})
                            </span>
                            {req.adminNotes && (
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                Admin Note: {req.adminNotes}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                req.status === 'APPROVED'
                                  ? 'bg-emerald-50 text-[#15803D] border-emerald-200'
                                  : req.status === 'REJECTED'
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}
                            >
                              {req.status}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(req.createdAt).toLocaleDateString('en-IN')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {user.currentPackage === 'FREE' ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-base font-bold text-[#253247]">
                        Submit Simulated Membership Activation Request
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Select a plan below to submit an activation request for administrative clearance.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Basic Activation */}
                      <div className="bg-white rounded-xl border border-emerald-200 p-6 shadow-sm flex flex-col justify-between space-y-4">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#15803D] uppercase tracking-wide">
                              Option 1 • Starter Paid
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                              Admin Review Required
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-[#253247] mt-1">Basic Membership</h4>
                          <div className="text-2xl font-bold text-[#253247] mt-2">₹3,000</div>
                          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                            Enables Direct Sponsor commission eligibility (₹1,000 per Basic direct; ₹10,000 after Full Qualification). Upgradeable later for the ₹30,000 difference.
                          </p>
                        </div>

                        <button
                          onClick={() => handleMembershipRequest('BASIC_ACTIVATION')}
                          disabled={upgrading || membershipRequests.some((r) => r.status === 'PENDING')}
                          className="w-full min-h-[44px] py-2.5 rounded-lg font-medium text-xs text-white bg-[#15803D] hover:bg-emerald-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>
                            {membershipRequests.some((r) => r.status === 'PENDING')
                              ? 'Request Pending Admin Review'
                              : upgrading
                              ? 'Submitting Request...'
                              : 'Request Basic Activation (₹3,000)'}
                          </span>
                        </button>
                      </div>

                      {/* Full Activation */}
                      <div className="bg-white rounded-xl border border-blue-200 p-6 shadow-sm flex flex-col justify-between space-y-4">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#165DAD] uppercase tracking-wide">
                              Option 2 • Full Qualified
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-[#165DAD] border border-blue-200">
                              Admin Review Required
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-[#253247] mt-1">Full Membership</h4>
                          <div className="text-2xl font-bold text-[#253247] mt-2">₹33,000</div>
                          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                            Includes ₹3,000 platform fee + <strong>₹30,000 EV Shopping Voucher</strong> liability and unlocks full Binary Matching (1:2 / 2:1, ₹3,000/match) upon approval.
                          </p>
                        </div>

                        <button
                          onClick={() => handleMembershipRequest('FULL_ACTIVATION')}
                          disabled={upgrading || membershipRequests.some((r) => r.status === 'PENDING')}
                          className="w-full min-h-[44px] py-2.5 rounded-lg font-medium text-xs text-white bg-[#165DAD] hover:bg-[#12498a] disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>
                            {membershipRequests.some((r) => r.status === 'PENDING')
                              ? 'Request Pending Admin Review'
                              : upgrading
                              ? 'Submitting Request...'
                              : 'Request Full Activation (₹33,000)'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-base font-bold text-[#253247]">Full Qualification Methods</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Choose between a direct upgrade request (subject to admin approval) or qualifying retail shopping.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Method 1: Direct Upgrade */}
                      <div className="bg-white rounded-xl border border-blue-200 p-6 shadow-sm flex flex-col justify-between space-y-4">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#165DAD] uppercase tracking-wide">
                              Method 1
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-[#165DAD] border border-blue-200">
                              {user.isFullQualified ? 'Completed' : 'Admin Review Required'}
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-[#253247] mt-1">Direct Upgrade to Full Plan</h4>
                          <div className="text-2xl font-bold text-[#253247] mt-2">₹30,000</div>
                          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                            Submit a ₹30,000 upgrade request to receive a <strong>₹30,000 Shopping Voucher credit</strong> and full commission qualification upon admin approval.
                          </p>
                        </div>

                        <button
                          onClick={() => handleMembershipRequest('BASIC_TO_FULL_UPGRADE')}
                          disabled={
                            upgrading ||
                            user.isFullQualified ||
                            membershipRequests.some((r) => r.status === 'PENDING')
                          }
                          className="w-full min-h-[44px] py-2.5 rounded-lg font-medium text-xs text-white bg-[#165DAD] hover:bg-[#12498a] disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>
                            {user.isFullQualified
                              ? 'Already Full Qualified'
                              : membershipRequests.some((r) => r.status === 'PENDING')
                              ? 'Upgrade Pending Admin Review'
                              : upgrading
                              ? 'Submitting Request...'
                              : 'Request Upgrade with ₹30,000'}
                          </span>
                        </button>
                      </div>

                      {/* Method 2: Shopping Upgrade */}
                      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between space-y-4">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                              Method 2
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                              Pending Approval
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-[#253247] mt-1">
                            Retail Shopping Qualification
                          </h4>
                          <div className="text-2xl font-bold text-slate-500 mt-2">₹60,000</div>
                          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                            Achieve ₹60,000 of verified qualifying retail shopping on ASKR EV bikes and approved merchant merchandise.
                          </p>
                          <div className="mt-3 p-3 rounded-lg bg-[#F7F9FC] border border-slate-200 text-[11px] text-slate-500 leading-relaxed">
                            The ₹60,000 shopping qualification rules, voucher entitlement, and terms remain marked pending business approval.
                          </div>
                        </div>

                        <button
                          disabled
                          className="w-full min-h-[44px] py-2.5 rounded-lg font-medium text-xs text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed"
                        >
                          Pending Business Approval
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: MY TEAM */}
            {activeTab === 'team' && (
              <div className="space-y-6">
                {/* Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <div className="text-xs text-slate-500 font-medium">Total Direct Referrals</div>
                    <div className="text-2xl font-bold text-[#253247] mt-1">
                      {directTeam?.metrics?.totalDirects ?? 0}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <div className="text-xs text-[#165DAD] font-medium">Activated Directs (₹3k+)</div>
                    <div className="text-2xl font-bold text-[#165DAD] mt-1">
                      {directTeam?.metrics?.totalActivatedDirects ?? 0}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <div className="text-xs text-[#15803D] font-medium">Full Qualified Directs</div>
                    <div className="text-2xl font-bold text-[#15803D] mt-1">
                      {directTeam?.metrics?.totalFullQualifiedDirects ?? 0}
                    </div>
                  </div>
                </div>

                {/* Direct Team Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[#253247]">Direct Sponsor Lineage</h3>
                      <p className="text-xs text-slate-500">Members registered using your referral code</p>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">
                      {directTeam?.directs?.length ?? 0} Members
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                        <tr>
                          <th className="py-3 px-4">Member ID</th>
                          <th className="py-3 px-4">Full Name</th>
                          <th className="py-3 px-4">Package</th>
                          <th className="py-3 px-4">Full Qualification</th>
                          <th className="py-3 px-4">Joined Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[#253247]">
                        {directTeam?.directs && directTeam.directs.length > 0 ? (
                          directTeam.directs.map((d: any) => (
                            <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4 font-mono font-medium text-[#165DAD]">
                                {d.memberId}
                              </td>
                              <td className="py-3 px-4 font-medium">{d.fullName}</td>
                              <td className="py-3 px-4">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getPackageBadge(
                                    d.currentPackage
                                  )}`}
                                >
                                  {d.currentPackage}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                {d.isFullQualified ? (
                                  <span className="text-[#15803D] font-medium flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Qualified
                                  </span>
                                ) : (
                                  <span className="text-slate-500">Pending Upgrade</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-slate-500">
                                {new Date(d.createdAt).toLocaleDateString('en-IN')}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-400">
                              No direct referrals found. Use your referral link above to invite members.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Binary Placement Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-[#253247] flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-[#165DAD]" />
                      <span>Binary Placement & Business Volume</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Ratio: 1:2 or 2:1 • Reward: ₹3,000 per match • Daily Capping: 15 matches (₹45,000/day max)
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-[#F7F9FC] border border-slate-200">
                      <div className="text-xs font-bold text-[#165DAD] uppercase tracking-wider">
                        Left Leg Team
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase font-semibold">Members</div>
                          <div className="text-xl font-bold text-[#253247] mt-0.5">
                            {binaryTree?.node?.leftCount ?? 0}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase font-semibold">Carry Units</div>
                          <div className="text-xl font-bold text-[#165DAD] mt-0.5">
                            {binaryTree?.node?.carryLeftUnits ?? 0} Units
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-[#F7F9FC] border border-slate-200">
                      <div className="text-xs font-bold text-[#15803D] uppercase tracking-wider">
                        Right Leg Team
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase font-semibold">Members</div>
                          <div className="text-xl font-bold text-[#253247] mt-0.5">
                            {binaryTree?.node?.rightCount ?? 0}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase font-semibold">Carry Units</div>
                          <div className="text-xl font-bold text-[#15803D] mt-0.5">
                            {binaryTree?.node?.carryRightUnits ?? 0} Units
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: EARNINGS WALLET */}
            {activeTab === 'wallets' && (
              <div className="space-y-6">
                {/* 4 Balances: Available, Held, Recovery, Total Earned */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <span className="text-xs font-semibold uppercase text-slate-400">
                      Available Balance
                    </span>
                    <div className="text-2xl font-bold text-[#15803D] mt-2">
                      ₹{(walletOverview?.availableEarningsINR ?? user.wallet?.availableEarningsINR ?? 0).toLocaleString('en-IN')}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Simulated earnings ledger balance (withdrawals disabled in SIMULATION_ONLY mode).
                    </p>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <span className="text-xs font-semibold uppercase text-slate-400">
                      Pending / On Hold
                    </span>
                    <div className="text-2xl font-bold text-amber-600 mt-2">
                      ₹{(walletOverview?.heldCommissionsINR ?? user.wallet?.heldCommissionsINR ?? 0).toLocaleString('en-IN')}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Commission hold reserve of ₹1,000 released upon 2nd qualified direct.
                    </p>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <span className="text-xs font-semibold uppercase text-slate-400">
                      Pending Recovery
                    </span>
                    <div className="text-2xl font-bold text-[#DC2626] mt-2">
                      ₹{(walletOverview?.pendingRecoveryINR ?? user.wallet?.pendingRecoveryINR ?? 0).toLocaleString('en-IN')}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Prior Basic commission recovery. Wallets never go negative.
                    </p>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <span className="text-xs font-semibold uppercase text-slate-400">
                      Total Earnings
                    </span>
                    <div className="text-2xl font-bold text-[#165DAD] mt-2">
                      ₹{(walletOverview?.totalEarnedINR ?? user.wallet?.totalEarnedINR ?? 0).toLocaleString('en-IN')}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Cumulative lifetime matching & direct sponsor commissions.
                    </p>
                  </div>
                </div>

                {/* Authoritative Wallet Ledger Transactions Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[#253247]">Authoritative Wallet Transactions</h3>
                      <p className="text-xs text-slate-500">Double-entry accounting journal entries associated with your wallet</p>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">{walletTransactions.length} Total</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                        <tr>
                          <th className="py-3 px-4">Transaction ID / Ref</th>
                          <th className="py-3 px-4">Date & Time</th>
                          <th className="py-3 px-4">Type</th>
                          <th className="py-3 px-4">Description</th>
                          <th className="py-3 px-4">Amount</th>
                          <th className="py-3 px-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[#253247]">
                        {walletTransactions.length > 0 ? (
                          walletTransactions.map((tx: any) => (
                            <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4 font-mono font-medium text-[#165DAD]">
                                {tx.referenceId}
                              </td>
                              <td className="py-3 px-4 text-slate-500">
                                {new Date(tx.date).toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                                {tx.transactionType}
                              </td>
                              <td className="py-3 px-4 text-slate-700 max-w-xs truncate">
                                {tx.description}
                              </td>
                              <td className="py-3 px-4 font-bold">
                                {tx.isCredit ? (
                                  <span className="text-[#15803D]">
                                    +₹{tx.amountINR.toLocaleString('en-IN')}
                                  </span>
                                ) : (
                                  <span className="text-[#DC2626]">
                                    -₹{tx.amountINR.toLocaleString('en-IN')}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-[#15803D] border border-emerald-200">
                                  SIMULATED_LEDGER
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400">
                              No wallet transactions found. Refer members or complete binary matches to earn commissions.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Withdrawal Request Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-[#253247]">Withdrawal Request</h3>
                      <p className="text-xs text-slate-500">Payout processing status</p>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-semibold self-start">
                      Simulation Mode — Withdrawals Unavailable
                    </span>
                  </div>

                  <div className="p-4 rounded-lg bg-[#F7F9FC] border border-slate-200 text-xs text-slate-600 space-y-1">
                    <div>
                      <strong>Compliance Notice:</strong> In compliance simulation mode, payouts are simulated and live bank debits or wire transfers are strictly disabled until supervisory admin clearance.
                    </div>
                    <div>Minimum withdrawal threshold: ₹1,000. Maximum processing window: 24-48 business hours.</div>
                  </div>

                  <button
                    disabled
                    className="px-5 py-2.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-400 font-medium text-xs cursor-not-allowed min-h-[44px]"
                  >
                    Withdrawals Unavailable (Simulation Only Mode)
                  </button>
                </div>
              </div>
            )}

            {/* TAB 5: SHOPPING VOUCHERS */}
            {activeTab === 'vouchers' && (
              <div className="space-y-6">
                {/* 3 Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <span className="text-xs font-semibold uppercase text-slate-400">
                      Total Issued Value
                    </span>
                    <div className="text-2xl font-bold text-[#165DAD] mt-2">
                      ₹{userVouchers.reduce((acc: number, v: any) => acc + (v.initialValueINR || 0), 0).toLocaleString('en-IN')}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Lifetime value of all shopping vouchers granted.
                    </p>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <span className="text-xs font-semibold uppercase text-slate-400">
                      Available Voucher Balance
                    </span>
                    <div className="text-2xl font-bold text-[#15803D] mt-2">
                      ₹{(walletOverview?.shoppingVoucherINR ?? user.wallet?.shoppingVoucherINR ?? 0).toLocaleString('en-IN')}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Active balance redeemable against EV bike booking deposits.
                    </p>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <span className="text-xs font-semibold uppercase text-slate-400">
                      Used / Redeemed Value
                    </span>
                    <div className="text-2xl font-bold text-slate-700 mt-2">
                      ₹{userVouchers.reduce((acc: number, v: any) => acc + (v.usedAmountINR || 0), 0).toLocaleString('en-IN')}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Voucher credits utilized across confirmed EV bookings.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-[#253247]">EV Bike Booking Redemption</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Shopping Vouchers are non-convertible to cash and can be redeemed exclusively against genuine EV bike reservations.
                    </p>
                  </div>
                  <Link
                    href="/bikes"
                    className="px-5 py-2.5 rounded-lg bg-[#165DAD] hover:bg-[#12498a] text-white font-medium text-xs transition-colors flex items-center gap-1.5 self-start md:self-auto min-h-[44px]"
                  >
                    <Bike className="w-4 h-4" />
                    <span>Browse & Redeem on EV Bikes</span>
                  </Link>
                </div>

                {/* Vouchers Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#253247]">Issued Shopping Vouchers</h3>
                    <span className="text-xs text-slate-500 font-mono">{userVouchers.length} Total</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                        <tr>
                          <th className="py-3 px-4">Voucher Code</th>
                          <th className="py-3 px-4">Initial Value</th>
                          <th className="py-3 px-4">Used Amount</th>
                          <th className="py-3 px-4">Remaining Balance</th>
                          <th className="py-3 px-4">Grant Reason</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Expires</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[#253247]">
                        {userVouchers.length > 0 ? (
                          userVouchers.map((v: any) => (
                            <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4 font-mono font-medium text-[#165DAD]">
                                {v.voucherCode}
                              </td>
                              <td className="py-3 px-4 font-medium">₹{v.initialValueINR.toLocaleString('en-IN')}</td>
                              <td className="py-3 px-4 text-slate-500">
                                ₹{(v.usedAmountINR || 0).toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4 font-bold text-[#15803D]">
                                ₹{v.remainingBalanceINR.toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">{v.issuedReason}</td>
                              <td className="py-3 px-4">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                    v.status === 'ACTIVE'
                                      ? 'bg-emerald-50 text-[#15803D] border-emerald-200'
                                      : v.status === 'PARTIALLY_REDEEMED'
                                      ? 'bg-blue-50 text-[#165DAD] border-blue-200'
                                      : 'bg-slate-100 text-slate-500 border-slate-200'
                                  }`}
                                >
                                  {v.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-500">
                                {new Date(v.expiresAt).getFullYear() > 2090
                                  ? 'Lifetime (Policy Pending)'
                                  : new Date(v.expiresAt).toLocaleDateString('en-IN')}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-400">
                              No shopping vouchers found. Upgrade to Full Membership or qualify directs to receive ₹30,000 vouchers.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Voucher Transaction History Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[#253247]">Voucher Transaction History</h3>
                      <p className="text-xs text-slate-500">Audit trail of redemptions, booking applications and reversals</p>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">{voucherTransactions.length} Total</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                        <tr>
                          <th className="py-3 px-4">Voucher Code</th>
                          <th className="py-3 px-4">Action</th>
                          <th className="py-3 px-4">Amount</th>
                          <th className="py-3 px-4">Remaining Balance</th>
                          <th className="py-3 px-4">Reference / Booking</th>
                          <th className="py-3 px-4">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[#253247]">
                        {voucherTransactions.length > 0 ? (
                          voucherTransactions.map((vt: any) => (
                            <tr key={vt.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4 font-mono font-medium text-[#165DAD]">
                                {vt.voucherCode}
                              </td>
                              <td className="py-3 px-4 font-semibold">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                    vt.transactionType === 'REDEMPTION'
                                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                                      : vt.transactionType === 'REVERSAL'
                                      ? 'bg-emerald-50 text-[#15803D] border-emerald-200'
                                      : 'bg-blue-50 text-[#165DAD] border-blue-200'
                                  }`}
                                >
                                  {vt.transactionType}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-bold">
                                {vt.transactionType === 'REDEMPTION' ? (
                                  <span className="text-amber-700">
                                    -₹{vt.amountINR.toLocaleString('en-IN')}
                                  </span>
                                ) : (
                                  <span className="text-[#15803D]">
                                    +₹{vt.amountINR.toLocaleString('en-IN')}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 font-bold text-slate-700">
                                ₹{vt.balanceAfterINR.toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4 font-mono text-slate-600">
                                {vt.referenceId || 'N/A'}
                              </td>
                              <td className="py-3 px-4 text-slate-500">
                                {new Date(vt.createdAt).toLocaleString('en-IN')}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400">
                              No voucher transactions recorded yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: MY EV BOOKINGS */}
            {activeTab === 'bookings' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[#253247]">My EV Bike Reservations</h3>
                      <p className="text-xs text-slate-500">Simulated booking deposits, vehicle orders and cancellation management (SIMULATION_ONLY)</p>
                    </div>
                    <Link
                      href="/bikes"
                      className="px-4 py-2 rounded-lg bg-[#165DAD] hover:bg-[#12498a] text-white font-medium text-xs transition-colors min-h-[40px] flex items-center"
                    >
                      Browse Fleet
                    </Link>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                        <tr>
                          <th className="py-3 px-4">Booking Number</th>
                          <th className="py-3 px-4">EV Model</th>
                          <th className="py-3 px-4">Booking Deposit</th>
                          <th className="py-3 px-4">Voucher Applied</th>
                          <th className="py-3 px-4">Simulated Cash Paid</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Booking Date</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[#253247]">
                        {userBookings.length > 0 ? (
                          userBookings.map((b: any) => {
                            const isCancelled = b.bookingStatus === 'CANCELLED';
                            return (
                              <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3 px-4 font-mono font-medium text-[#165DAD]">
                                  {b.bookingNumber}
                                </td>
                                <td className="py-3 px-4 font-medium">{b.bikeName}</td>
                                <td className="py-3 px-4">₹{b.bookingAmountINR.toLocaleString('en-IN')}</td>
                                <td className="py-3 px-4 text-[#15803D] font-medium">
                                  {b.voucherAppliedINR > 0 ? `-₹${b.voucherAppliedINR.toLocaleString('en-IN')}` : '₹0'}
                                </td>
                                <td className="py-3 px-4 font-bold text-[#253247]">
                                  ₹{b.netCashPaidINR.toLocaleString('en-IN')}
                                </td>
                                <td className="py-3 px-4">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                      isCancelled
                                        ? 'bg-red-50 text-[#DC2626] border-red-200'
                                        : 'bg-emerald-50 text-[#15803D] border-emerald-200'
                                    }`}
                                  >
                                    {b.bookingStatus}
                                  </span>
                                  {isCancelled && b.cancellationReason && (
                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                      {b.cancellationReason}
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-slate-500">
                                  {new Date(b.createdAt).toLocaleDateString('en-IN')}
                                </td>
                                <td className="py-3 px-4 text-right">
                                  {!isCancelled ? (
                                    <button
                                      disabled={cancellingBookingId === b.id}
                                      onClick={() => handleCancelBooking(b.id)}
                                      className="px-3 py-1.5 rounded-lg border border-red-200 text-[#DC2626] hover:bg-red-50 text-[11px] font-medium transition-colors"
                                    >
                                      {cancellingBookingId === b.id ? 'Cancelling...' : 'Cancel Booking'}
                                    </button>
                                  ) : (
                                    <span className="text-[11px] text-slate-400 italic">
                                      Restored
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-slate-400">
                              No EV reservations found. Visit the EV bikes catalog to reserve a ride.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 7: PROFILE & SETTINGS */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-[#253247]">Member Profile & Credentials</h3>
                    <p className="text-xs text-slate-500">Personal membership details and verification status</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-lg bg-[#F7F9FC] border border-slate-200 space-y-1">
                      <span className="text-slate-500">Unique Member ID</span>
                      <div className="text-sm font-mono font-bold text-[#165DAD]">{user.memberId}</div>
                    </div>

                    <div className="p-4 rounded-lg bg-[#F7F9FC] border border-slate-200 space-y-1">
                      <span className="text-slate-500">Full Legal Name</span>
                      <div className="text-sm font-bold text-[#253247]">{user.fullName}</div>
                    </div>

                    <div className="p-4 rounded-lg bg-[#F7F9FC] border border-slate-200 space-y-1">
                      <span className="text-slate-500">Registered Email</span>
                      <div className="text-sm font-medium text-[#253247]">{user.email}</div>
                    </div>

                    <div className="p-4 rounded-lg bg-[#F7F9FC] border border-slate-200 space-y-1">
                      <span className="text-slate-500">Mobile Number</span>
                      <div className="text-sm font-medium text-[#253247]">{user.phone || 'Not Provided'}</div>
                    </div>

                    <div className="p-4 rounded-lg bg-[#F7F9FC] border border-slate-200 space-y-1">
                      <span className="text-slate-500">Assigned Sponsor</span>
                      <div className="text-sm font-medium text-[#253247]">
                        {user.sponsorName ? `${user.sponsorName} (${user.sponsorMemberId})` : 'Direct Root Enrollment'}
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-[#F7F9FC] border border-slate-200 space-y-1">
                      <span className="text-slate-500">Account Verification Tier</span>
                      <div className="text-sm font-bold text-[#15803D] flex items-center gap-1.5 mt-0.5">
                        <ShieldCheck className="w-4 h-4" />
                        <span>
                          {user.isFullQualified
                            ? 'Full Qualified (Simulated)'
                            : user.currentPackage === 'BASIC'
                            ? 'Basic Activated (Simulated)'
                            : 'Free Starter Account'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
