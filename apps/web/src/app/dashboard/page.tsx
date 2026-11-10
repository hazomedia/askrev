'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Wallet,
  Zap,
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
  CreditCard,
  History,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react';
import { fetchApi, getStoredUser, clearAuthSession } from '../../lib/api';

type TabType = 'overview' | 'membership' | 'team' | 'wallets' | 'vouchers' | 'bookings' | 'profile';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [directTeam, setDirectTeam] = useState<any>(null);
  const [binaryTree, setBinaryTree] = useState<any>(null);
  const [userBookings, setUserBookings] = useState<any[]>([]);
  const [userVouchers, setUserVouchers] = useState<any[]>([]);
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
      const [profileData, teamData, binaryData, bookingsData, vouchersData] =
        await Promise.all([
          fetchApi<any>('/auth/me'),
          fetchApi<any>('/members/direct-team').catch(() => null),
          fetchApi<any>('/members/binary-tree').catch(() => null),
          fetchApi<any>('/ev-bikes/my-bookings').catch(() => []),
          fetchApi<any>('/vouchers/my-vouchers').catch(() => []),
        ]);

      setUser(profileData);
      setDirectTeam(teamData);
      setBinaryTree(binaryData);
      setUserBookings(bookingsData);
      setUserVouchers(vouchersData);
    } catch (err: any) {
      setError(err.message || 'Failed to load member dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getReferralLink = () => {
    if (!user) return '';
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

  const handleShareLink = async () => {
    const link = getReferralLink();
    if (!link) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join ASKR EV Mobility',
          text: `Use my sponsor referral code ${user.memberId} to register with ASKR EV electric mobility platform.`,
          url: link,
        });
      } catch (err) {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleUpgradePayment = async () => {
    setUpgrading(true);
    setUpgradeSuccess(null);
    setError(null);
    try {
      const res: any = await fetchApi('/packages/upgrade', {
        method: 'POST',
        body: JSON.stringify({ method: 'UPGRADE_PAYMENT' }),
      });
      setUpgradeSuccess(res.message);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Upgrade failed');
    } finally {
      setUpgrading(false);
    }
  };

  const handleLogout = () => {
    clearAuthSession();
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
      {/* Top Corporate Portal Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Mobile trigger & Title */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-slate-500 hover:text-[#253247] hover:bg-slate-100"
                aria-label="Toggle navigation"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-[#253247]">Member Portal</span>
                <span className="text-slate-300">/</span>
                <span className="font-mono text-xs font-bold text-[#165DAD] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                  {user.memberId}
                </span>
              </div>
            </div>

            {/* Right: Status badge & Logout */}
            <div className="flex items-center gap-3">
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
                className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-[#DC2626] transition-colors px-2 py-1.5 rounded-lg hover:bg-slate-50"
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
                {/* Welcome Card & Referral Link */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>Welcome back,</span>
                        <span className="font-semibold text-[#253247]">{user.fullName}</span>
                      </div>
                      <h1 className="text-xl sm:text-2xl font-bold text-[#253247] mt-1">
                        Member Dashboard
                      </h1>
                      <p className="text-xs text-slate-500 mt-1">
                        Sponsor:{' '}
                        <span className="font-medium text-[#253247]">
                          {user.sponsorName
                            ? `${user.sponsorName} (${user.sponsorMemberId})`
                            : 'Direct Platform Enrollment'}
                        </span>
                      </p>
                    </div>

                    {/* Referral Link Box */}
                    <div className="bg-[#F7F9FC] border border-slate-200 rounded-lg p-3.5 max-w-md w-full space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#253247] flex items-center gap-1.5">
                          <Share2 className="w-3.5 h-3.5 text-[#165DAD]" />
                          <span>Personal Referral Link</span>
                        </span>
                        <span className="text-[11px] text-[#15803D] font-medium">Active</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-600 truncate flex-1 select-all">
                          {getReferralLink()}
                        </div>
                        <button
                          onClick={handleCopyLink}
                          className="px-3 py-1.5 rounded-lg bg-[#165DAD] hover:bg-[#12498a] text-white font-medium text-xs transition-colors flex items-center gap-1.5 shrink-0"
                          title="Copy referral link"
                        >
                          {copied ? (
                            <Check className="w-3.5 h-3.5 text-white" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>{copied ? 'Copied' : 'Copy'}</span>
                        </button>
                        <button
                          onClick={handleShareLink}
                          className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs transition-colors shrink-0"
                          title="Share link"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Share this link to invite new members into your direct lineage.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4 Clean Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Earnings Wallet */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                      <span>Earnings Wallet</span>
                      <Wallet className="w-4 h-4 text-[#15803D]" />
                    </div>
                    <div className="text-2xl font-bold text-[#253247] mt-2">
                      ₹{user.wallet?.availableEarningsINR?.toLocaleString('en-IN') ?? 0}
                    </div>
                    <div className="text-[11px] text-[#15803D] mt-1 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]" />
                      <span>Withdrawable balance</span>
                    </div>
                  </div>

                  {/* Shopping Vouchers */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
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

                  {/* Direct Referrals */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
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

                  {/* Active EV Bookings */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
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

                {/* Upgrade Callout (if not full qualified) */}
                {!user.isFullQualified && (
                  <div className="bg-blue-50/60 rounded-xl border border-blue-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#165DAD]">
                        <Sparkles className="w-4 h-4 text-[#165DAD]" />
                        <span>Full Qualification Upgrade Available</span>
                      </div>
                      <h3 className="text-base font-bold text-[#253247]">
                        Unlock ₹30,000 Shopping Vouchers & Binary Commission Rights
                      </h3>
                      <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                        Complete your ₹30,000 platform fee to receive a ₹30,000 shopping voucher credit and full eligibility for direct sponsor and binary matching rewards.
                      </p>
                    </div>
                    <button
                      onClick={handleUpgradePayment}
                      disabled={upgrading}
                      className="shrink-0 px-5 py-2.5 rounded-lg font-medium text-xs text-white bg-[#165DAD] hover:bg-[#12498a] transition-colors disabled:opacity-50"
                    >
                      {upgrading ? 'Upgrading...' : 'Upgrade Now (₹30,000)'}
                    </button>
                  </div>
                )}

                {/* Quick Action Links */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-2">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#165DAD] flex items-center justify-center">
                      <Bike className="w-4 h-4" />
                    </div>
                    <h4 className="text-sm font-bold text-[#253247]">Book an EV Bike</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Explore our electric mobility lineup and apply your shopping vouchers towards booking deposits.
                    </p>
                    <Link
                      href="/bikes"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#165DAD] hover:underline pt-1"
                    >
                      <span>Explore Showroom</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-2">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                    <h4 className="text-sm font-bold text-[#253247]">View Direct Team</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Review registered members, track activations, and inspect binary carry volumes.
                    </p>
                    <button
                      onClick={() => setActiveTab('team')}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#165DAD] hover:underline pt-1"
                    >
                      <span>Open Team Lineage</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-2">
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 text-[#15803D] flex items-center justify-center">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <h4 className="text-sm font-bold text-[#253247]">Earnings & Vouchers</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Inspect your withdrawable balance, commission hold reserve, and voucher certificates.
                    </p>
                    <button
                      onClick={() => setActiveTab('wallets')}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#165DAD] hover:underline pt-1"
                    >
                      <span>View Wallet Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Recent Direct Team Preview Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[#253247]">Recent Direct Referrals</h3>
                      <p className="text-xs text-slate-500">Latest members enrolled with your sponsor code</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('team')}
                      className="text-xs font-semibold text-[#165DAD] hover:underline"
                    >
                      View All Directs
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                        <tr>
                          <th className="py-3 px-4">Member ID</th>
                          <th className="py-3 px-4">Name</th>
                          <th className="py-3 px-4">Package</th>
                          <th className="py-3 px-4">Qualification</th>
                          <th className="py-3 px-4">Join Date</th>
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
                              </td>
                              <td className="py-3 px-4">
                                {d.isFullQualified ? (
                                  <span className="text-[#15803D] font-medium flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Full Qualified
                                  </span>
                                ) : (
                                  <span className="text-slate-500">Basic / Free</span>
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
                              No direct team members yet. Share your referral link to build your team.
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

                {/* Qualification Methods */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-[#253247]">Full Qualification Methods</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Choose between a direct platform fee upgrade or qualifying retail shopping.
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
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-[#15803D] border border-emerald-200">
                            Instant Qualification
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-[#253247] mt-1">Direct Fee Upgrade</h4>
                        <div className="text-2xl font-bold text-[#253247] mt-2">₹30,000</div>
                        <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                          Pay the platform fee difference of ₹30,000. You immediately receive a <strong>₹30,000 Shopping Voucher</strong> credited to your account and full commission entitlements.
                        </p>
                      </div>

                      <button
                        onClick={handleUpgradePayment}
                        disabled={upgrading || user.isFullQualified}
                        className="w-full py-2.5 rounded-lg font-medium text-xs text-white bg-[#165DAD] hover:bg-[#12498a] disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>
                          {user.isFullQualified
                            ? 'Already Full Qualified'
                            : upgrading
                            ? 'Processing Upgrade...'
                            : 'Upgrade with ₹30,000'}
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
                        className="w-full py-2.5 rounded-lg font-medium text-xs text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed"
                      >
                        Pending Business Approval
                      </button>
                    </div>
                  </div>
                </div>
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
                          <div className="text-[10px] text-slate-500 uppercase font-semibold">Carry Volume</div>
                          <div className="text-xl font-bold text-[#165DAD] mt-0.5">
                            ₹{binaryTree?.node?.carryLeftINR ?? 0}
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
                          <div className="text-[10px] text-slate-500 uppercase font-semibold">Carry Volume</div>
                          <div className="text-xl font-bold text-[#15803D] mt-0.5">
                            ₹{binaryTree?.node?.carryRightINR ?? 0}
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
                {/* 3 Clear Balances */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <span className="text-xs font-semibold uppercase text-slate-400">
                      Withdrawable Earnings
                    </span>
                    <div className="text-2xl font-bold text-[#15803D] mt-2">
                      ₹{user.wallet?.availableEarningsINR?.toLocaleString('en-IN') ?? 0}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Available for withdrawal under platform compliance guidelines.
                    </p>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <span className="text-xs font-semibold uppercase text-slate-400">
                      Commission Hold Reserve
                    </span>
                    <div className="text-2xl font-bold text-amber-600 mt-2">
                      ₹{user.wallet?.heldCommissionsINR?.toLocaleString('en-IN') ?? 0}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Target reserve of ₹1,000 maintained prior to your 2nd Full Qualified Direct. Released automatically upon qualification.
                    </p>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <span className="text-xs font-semibold uppercase text-slate-400">
                      Pending Recovery
                    </span>
                    <div className="text-2xl font-bold text-[#DC2626] mt-2">
                      ₹{user.wallet?.pendingRecoveryINR?.toLocaleString('en-IN') ?? 0}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Advances and ledger reconciliations. Wallets are never allowed to fall below ₹0.
                    </p>
                  </div>
                </div>

                {/* Withdrawal Request Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-[#253247]">Withdrawal Request</h3>
                      <p className="text-xs text-slate-500">Request payout of verified withdrawable earnings</p>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-semibold self-start">
                      Simulation Mode
                    </span>
                  </div>

                  <div className="p-4 rounded-lg bg-[#F7F9FC] border border-slate-200 text-xs text-slate-600 space-y-1">
                    <div>
                      <strong>Compliance Notice:</strong> In simulation mode, payouts are simulated and no live bank debits or wire transfers will be executed without supervisory admin clearance.
                    </div>
                    <div>Minimum withdrawal threshold: ₹1,000. Maximum processing window: 24-48 business hours.</div>
                  </div>

                  <button
                    disabled
                    className="px-5 py-2.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-400 font-medium text-xs cursor-not-allowed"
                  >
                    Request Withdrawal (Disabled in Simulation Mode)
                  </button>
                </div>
              </div>
            )}

            {/* TAB 5: SHOPPING VOUCHERS */}
            {activeTab === 'vouchers' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-semibold uppercase text-slate-400">
                      Total Shopping Voucher Balance
                    </span>
                    <div className="text-2xl font-bold text-[#165DAD] mt-1">
                      ₹{user.wallet?.shoppingVoucherINR?.toLocaleString('en-IN') ?? 0}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Redeem against genuine EV motorbike bookings and authorized retail merchandise.
                    </p>
                  </div>
                  <Link
                    href="/bikes"
                    className="px-5 py-2.5 rounded-lg bg-[#165DAD] hover:bg-[#12498a] text-white font-medium text-xs transition-colors flex items-center gap-1.5 self-start md:self-auto"
                  >
                    <Bike className="w-4 h-4" />
                    <span>Redeem on EV Superbike</span>
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
                          <th className="py-3 px-4">Remaining Balance</th>
                          <th className="py-3 px-4">Reason</th>
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
                              <td className="py-3 px-4">₹{v.initialValueINR.toLocaleString('en-IN')}</td>
                              <td className="py-3 px-4 font-bold text-[#15803D]">
                                ₹{v.remainingBalanceINR.toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4 text-slate-500">{v.issuedReason}</td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-[#15803D] border border-emerald-200">
                                  {v.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-500">
                                {new Date(v.expiresAt).toLocaleDateString('en-IN')}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400">
                              No shopping vouchers found. Upgrade to Full Membership to receive ₹30,000 vouchers.
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
                      <p className="text-xs text-slate-500">Verified booking deposits and vehicle orders</p>
                    </div>
                    <Link
                      href="/bikes"
                      className="px-4 py-2 rounded-lg bg-[#165DAD] hover:bg-[#12498a] text-white font-medium text-xs transition-colors"
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
                          <th className="py-3 px-4">Net Cash Paid</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Booking Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[#253247]">
                        {userBookings.length > 0 ? (
                          userBookings.map((b: any) => (
                            <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4 font-mono font-medium text-[#165DAD]">
                                {b.bookingNumber}
                              </td>
                              <td className="py-3 px-4 font-medium">{b.bikeName}</td>
                              <td className="py-3 px-4">₹{b.bookingAmountINR.toLocaleString('en-IN')}</td>
                              <td className="py-3 px-4 text-[#15803D] font-medium">
                                -₹{b.voucherAppliedINR.toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4 font-bold text-[#253247]">
                                ₹{b.netCashPaidINR.toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-[#15803D] border border-emerald-200">
                                  {b.bookingStatus}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-500">
                                {new Date(b.createdAt).toLocaleDateString('en-IN')}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-400">
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
                      <span className="text-slate-500">KYC Compliance Status</span>
                      <div className="text-sm font-bold text-[#15803D] flex items-center gap-1.5 mt-0.5">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Level 1 Basic Verified</span>
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