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
  Award,
  GitBranch,
  Bike,
  Sparkles,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Ticket,
  ShieldCheck,
  ShieldAlert,
  User,
  Clock,
  ExternalLink,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { fetchApi, getStoredUser } from '../../lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [directTeam, setDirectTeam] = useState<any>(null);
  const [binaryTree, setBinaryTree] = useState<any>(null);
  const [userBookings, setUserBookings] = useState<any[]>([]);
  const [userVouchers, setUserVouchers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'team' | 'membership' | 'wallets' | 'vouchers' | 'bookings' | 'profile'
  >('overview');

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
        // Fallback to copy if cancelled or unsupported
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

  if (loading && !user) {
    return (
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-20 flex items-center justify-center text-slate-400">
        <div className="animate-spin w-8 h-8 border-2 border-electric-500 border-t-transparent rounded-full mr-3" />
        <span>Loading Member Portal...</span>
      </div>
    );
  }

  if (!user) return null;

  const getPackageBadgeColor = (pkg?: string) => {
    switch (pkg) {
      case 'FULL':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'BASIC':
        return 'bg-electric-500/20 text-electric-300 border-electric-500/40';
      default:
        return 'bg-slate-700/50 text-slate-300 border-slate-600/50';
    }
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8">
      {/* Header Profile & Referral Card */}
      <div className="card-gradient rounded-3xl p-6 sm:p-8 border border-navy-700/80 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-xs font-black px-3 py-1 rounded-xl bg-electric-500/20 text-electric-300 border border-electric-500/40">
              {user.memberId}
            </span>
            <span
              className={`text-xs font-bold px-3 py-1 rounded-xl border uppercase ${getPackageBadgeColor(
                user.currentPackage
              )}`}
            >
              {user.currentPackage} Membership
            </span>
            {user.isFullQualified ? (
              <span className="text-xs font-bold px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Full Qualified
              </span>
            ) : (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-slate-800 text-slate-400 border border-slate-700">
                Upgrade Available
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white">{user.fullName}</h1>
          <p className="text-xs text-slate-400">
            Sponsor: {user.sponsorName ? `${user.sponsorName} (${user.sponsorMemberId})` : 'Direct Platform Enrollment'}
          </p>
        </div>

        {/* Referral Link Card with 1-click Copy & Native Share */}
        <div className="bg-navy-950/80 p-4 rounded-2xl border border-navy-700/80 space-y-2.5 max-w-md w-full">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5 text-electric-400" />
              <span>Personal Referral Link</span>
            </span>
            <span className="text-[10px] text-emerald-400 font-bold uppercase">Ready to Share</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-navy-900 px-3 py-2 rounded-xl text-xs font-mono text-slate-300 truncate flex-1 border border-navy-800">
              {getReferralLink()}
            </div>
            <button
              onClick={handleCopyLink}
              className="px-3.5 py-2 rounded-xl bg-electric-600 hover:bg-electric-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shrink-0 shadow-md"
              title="Copy referral link to clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={handleShareLink}
              className="px-3 py-2 rounded-xl bg-navy-800 hover:bg-navy-700 text-slate-200 font-bold text-xs transition-colors shrink-0 border border-navy-600"
              title="Share via device options"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {upgradeSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{upgradeSuccess}</span>
          </div>
          <button
            onClick={() => setUpgradeSuccess(null)}
            className="text-xs text-slate-400 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-xs text-slate-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* 4 Primary Financial & Commerce KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Available Earnings */}
        <div className="card-gradient rounded-3xl p-5 border border-navy-700/80">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>Earnings Wallet</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white mt-2">
            ₹{user.wallet?.availableEarningsINR?.toLocaleString('en-IN') ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Withdrawable balance</span>
          </div>
        </div>

        {/* Shopping Voucher Wallet */}
        <div className="card-gradient rounded-3xl p-5 border border-navy-700/80">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>Shopping Vouchers</span>
            <Ticket className="w-4 h-4 text-electric-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-electric-300 mt-2">
            ₹{user.wallet?.shoppingVoucherINR?.toLocaleString('en-IN') ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Redeemable on EV bookings
          </div>
        </div>

        {/* Direct Referrals Count */}
        <div className="card-gradient rounded-3xl p-5 border border-navy-700/80">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>Direct Team</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-300 mt-2">
            {directTeam?.metrics?.totalDirects ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {directTeam?.metrics?.totalActivatedDirects ?? 0} activated members
          </div>
        </div>

        {/* Active EV Bookings */}
        <div className="card-gradient rounded-3xl p-5 border border-navy-700/80">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>EV Reservations</span>
            <Bike className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white mt-2">
            {userBookings.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Verified platform bookings
          </div>
        </div>
      </div>

      {/* Upgrade Banner for Non-Full Qualified Members */}
      {!user.isFullQualified && (
        <div className="card-gradient rounded-3xl p-6 sm:p-8 border border-electric-500/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-gradient-to-r from-electric-950/40 via-navy-900 to-navy-950">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-electric-400 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Full Qualification Available
            </div>
            <h3 className="text-xl font-bold text-white">
              Unlock ₹30,000 Shopping Voucher & Binary Matching Rewards
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Upgrade to Full Qualified status by completing the ₹30,000 platform fee. You will immediately receive a ₹30,000 shopping voucher credit and full eligibility for direct sponsor and binary matching commissions.
            </p>
          </div>
          <button
            onClick={handleUpgradePayment}
            disabled={upgrading}
            className="shrink-0 px-7 py-3 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-electric-600 to-emerald-500 hover:from-electric-500 hover:to-emerald-400 shadow-lg shadow-electric-600/25 transition-all disabled:opacity-50"
          >
            {upgrading ? 'Upgrading...' : 'Upgrade Now (₹30,000)'}
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex overflow-x-auto border-b border-navy-800 space-x-2 pb-px scrollbar-none">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-t-xl transition-colors shrink-0 flex items-center gap-1.5 ${
            activeTab === 'overview'
              ? 'text-electric-400 border-b-2 border-electric-400 bg-navy-900/60'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('team')}
          className={`px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-t-xl transition-colors shrink-0 flex items-center gap-1.5 ${
            activeTab === 'team'
              ? 'text-electric-400 border-b-2 border-electric-400 bg-navy-900/60'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Direct Team ({directTeam?.directs?.length ?? 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('membership')}
          className={`px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-t-xl transition-colors shrink-0 flex items-center gap-1.5 ${
            activeTab === 'membership'
              ? 'text-electric-400 border-b-2 border-electric-400 bg-navy-900/60'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Membership & Upgrade</span>
        </button>

        <button
          onClick={() => setActiveTab('wallets')}
          className={`px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-t-xl transition-colors shrink-0 flex items-center gap-1.5 ${
            activeTab === 'wallets'
              ? 'text-electric-400 border-b-2 border-electric-400 bg-navy-900/60'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>Earnings & Ledger</span>
        </button>

        <button
          onClick={() => setActiveTab('vouchers')}
          className={`px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-t-xl transition-colors shrink-0 flex items-center gap-1.5 ${
            activeTab === 'vouchers'
              ? 'text-electric-400 border-b-2 border-electric-400 bg-navy-900/60'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Ticket className="w-3.5 h-3.5" />
          <span>Shopping Vouchers ({userVouchers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('bookings')}
          className={`px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-t-xl transition-colors shrink-0 flex items-center gap-1.5 ${
            activeTab === 'bookings'
              ? 'text-electric-400 border-b-2 border-electric-400 bg-navy-900/60'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Bike className="w-3.5 h-3.5" />
          <span>My EV Bookings ({userBookings.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-t-xl transition-colors shrink-0 flex items-center gap-1.5 ${
            activeTab === 'profile'
              ? 'text-electric-400 border-b-2 border-electric-400 bg-navy-900/60'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Profile & Settings</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Quick Actions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-navy-900/70 border border-navy-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-electric-500/20 text-electric-400 flex items-center justify-center">
                <Bike className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white">Book an EV Superbike</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Browse our high-performance models and redeem your shopping voucher balance towards booking tokens.
              </p>
              <Link
                href="/bikes"
                className="inline-flex items-center gap-1 text-xs font-bold text-electric-400 hover:text-electric-300 pt-1"
              >
                <span>Browse Fleet Catalog</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="p-6 rounded-3xl bg-navy-900/70 border border-navy-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <Share2 className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white">Grow Your Team</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Invite friends and mobility enthusiasts with your unique referral link to qualify for direct commissions.
              </p>
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1 text-xs font-bold text-purple-400 hover:text-purple-300 pt-1"
              >
                <span>{copied ? 'Link Copied!' : 'Copy Referral Link'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 rounded-3xl bg-navy-900/70 border border-navy-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white">Wallet & Earnings</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Track your withdrawable balance, sponsor reserves, and pending recoveries in real time.
              </p>
              <button
                onClick={() => setActiveTab('wallets')}
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 pt-1"
              >
                <span>View Full Ledger</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Recent Direct Team Preview */}
          <div className="card-gradient rounded-3xl border border-navy-700/80 overflow-hidden">
            <div className="p-6 border-b border-navy-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Recent Direct Team Referrals</h3>
                <p className="text-xs text-slate-400">Recently registered members in your direct sponsor lineage</p>
              </div>
              <button
                onClick={() => setActiveTab('team')}
                className="text-xs font-bold text-electric-400 hover:text-electric-300"
              >
                View All Directs
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-navy-950/70 text-slate-400 border-b border-navy-800 uppercase font-semibold">
                  <tr>
                    <th className="py-3.5 px-6">Member ID</th>
                    <th className="py-3.5 px-6">Name</th>
                    <th className="py-3.5 px-6">Package</th>
                    <th className="py-3.5 px-6">Qualification</th>
                    <th className="py-3.5 px-6">Join Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-800/60 text-slate-300">
                  {directTeam?.directs && directTeam.directs.length > 0 ? (
                    directTeam.directs.slice(0, 5).map((d: any) => (
                      <tr key={d.id} className="hover:bg-navy-800/40 transition-colors">
                        <td className="py-3.5 px-6 font-mono font-bold text-electric-400">
                          {d.memberId}
                        </td>
                        <td className="py-3.5 px-6 font-semibold text-white">{d.fullName}</td>
                        <td className="py-3.5 px-6">
                          <span
                            className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold ${getPackageBadgeColor(
                              d.currentPackage
                            )}`}
                          >
                            {d.currentPackage}
                          </span>
                        </td>
                        <td className="py-3.5 px-6">
                          {d.isFullQualified ? (
                            <span className="text-emerald-400 font-semibold flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Full Qualified
                            </span>
                          ) : (
                            <span className="text-slate-400">Basic / Free</span>
                          )}
                        </td>
                        <td className="py-3.5 px-6 text-slate-400">
                          {new Date(d.createdAt).toLocaleDateString('en-IN')}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
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

      {/* TAB 2: DIRECT TEAM & BINARY */}
      {activeTab === 'team' && (
        <div className="space-y-8">
          {/* Team Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-navy-900 border border-navy-800">
              <div className="text-xs text-slate-400 font-semibold">Total Direct Referrals</div>
              <div className="text-3xl font-black text-white mt-1">
                {directTeam?.metrics?.totalDirects ?? 0}
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-navy-900 border border-navy-800">
              <div className="text-xs text-electric-400 font-semibold">Activated Directs (₹3k+)</div>
              <div className="text-3xl font-black text-electric-300 mt-1">
                {directTeam?.metrics?.totalActivatedDirects ?? 0}
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-navy-900 border border-navy-800">
              <div className="text-xs text-emerald-400 font-semibold">Full Qualified Directs</div>
              <div className="text-3xl font-black text-emerald-300 mt-1">
                {directTeam?.metrics?.totalFullQualifiedDirects ?? 0}
              </div>
            </div>
          </div>

          {/* Direct Team Table */}
          <div className="card-gradient rounded-3xl border border-navy-700/80 overflow-hidden">
            <div className="p-6 border-b border-navy-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Direct Sponsor Lineage</h3>
                <p className="text-xs text-slate-400">Members registered using your referral code</p>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {directTeam?.directs?.length ?? 0} Registered
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-navy-950/70 text-slate-400 border-b border-navy-800 uppercase font-semibold">
                  <tr>
                    <th className="py-3.5 px-6">Member ID</th>
                    <th className="py-3.5 px-6">Full Name</th>
                    <th className="py-3.5 px-6">Package</th>
                    <th className="py-3.5 px-6">Full Qualification</th>
                    <th className="py-3.5 px-6">Joined Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-800/60 text-slate-300">
                  {directTeam?.directs && directTeam.directs.length > 0 ? (
                    directTeam.directs.map((d: any) => (
                      <tr key={d.id} className="hover:bg-navy-800/40 transition-colors">
                        <td className="py-3.5 px-6 font-mono font-bold text-electric-400">
                          {d.memberId}
                        </td>
                        <td className="py-3.5 px-6 font-semibold text-white">{d.fullName}</td>
                        <td className="py-3.5 px-6">
                          <span
                            className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold ${getPackageBadgeColor(
                              d.currentPackage
                            )}`}
                          >
                            {d.currentPackage}
                          </span>
                        </td>
                        <td className="py-3.5 px-6">
                          {d.isFullQualified ? (
                            <span className="text-emerald-400 font-bold flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Full Qualified
                            </span>
                          ) : (
                            <span className="text-slate-400">Pending Upgrade</span>
                          )}
                        </td>
                        <td className="py-3.5 px-6 text-slate-400">
                          {new Date(d.createdAt).toLocaleDateString('en-IN')}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-500">
                        No direct referrals found. Use your referral link above to invite members.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Binary Tree Structure */}
          <div className="card-gradient rounded-3xl p-6 sm:p-8 border border-navy-700/80 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-electric-400" />
                <span>Binary Placement & Business Volume</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Ratio: 1:2 or 2:1 • Reward: ₹3,000 per match • Daily Capping: 15 matches (₹45,000/day max)
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 rounded-2xl bg-navy-950 border border-navy-800">
                <div className="text-xs font-bold text-electric-400 uppercase tracking-widest">
                  Left Leg Team
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Members</div>
                    <div className="text-2xl font-black text-white mt-1">
                      {binaryTree?.node?.leftCount ?? 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Carry Volume</div>
                    <div className="text-2xl font-black text-electric-300 mt-1">
                      ₹{binaryTree?.node?.carryLeftINR ?? 0}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-navy-950 border border-navy-800">
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                  Right Leg Team
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Members</div>
                    <div className="text-2xl font-black text-white mt-1">
                      {binaryTree?.node?.rightCount ?? 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Carry Volume</div>
                    <div className="text-2xl font-black text-emerald-300 mt-1">
                      ₹{binaryTree?.node?.carryRightINR ?? 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MEMBERSHIP & UPGRADE */}
      {activeTab === 'membership' && (
        <div className="space-y-8">
          {/* Current Package Overview */}
          <div className="card-gradient rounded-3xl p-6 sm:p-8 border border-navy-700/80 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Active Subscription Tier
                </span>
                <h3 className="text-2xl font-black text-white mt-1">
                  {user.currentPackage} Membership
                </h3>
              </div>
              <span
                className={`text-xs font-bold px-3 py-1.5 rounded-xl border uppercase ${getPackageBadgeColor(
                  user.currentPackage
                )}`}
              >
                Status: {user.isFullQualified ? 'Full Qualified' : 'Active'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-navy-800 text-xs">
              <div className="p-4 rounded-2xl bg-navy-900 border border-navy-800">
                <span className="text-slate-400">Direct Sponsor Income:</span>
                <div className="text-sm font-bold text-white mt-1">
                  {user.currentPackage === 'FREE' ? 'Not Eligible' : 'Eligible'}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-navy-900 border border-navy-800">
                <span className="text-slate-400">Binary Matching Income:</span>
                <div className="text-sm font-bold text-white mt-1">
                  {user.isFullQualified ? 'Eligible (1:2 / 2:1)' : 'Requires Full Qualification'}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-navy-900 border border-navy-800">
                <span className="text-slate-400">Shopping Voucher Credit:</span>
                <div className="text-sm font-bold text-emerald-400 mt-1">
                  ₹{user.wallet?.shoppingVoucherINR?.toLocaleString('en-IN') ?? 0}
                </div>
              </div>
            </div>
          </div>

          {/* Upgrade Methods Grid */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Full Qualification Methods</h3>
            <p className="text-xs text-slate-400">
              A member can become Full Qualified through direct platform fee upgrade or verified qualifying retail shopping.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Method 1: Payment Upgrade */}
              <div className="card-gradient rounded-3xl p-6 border border-electric-500/40 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-electric-400 uppercase">Method 1</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                      Instant Activation
                    </span>
                  </div>
                  <h4 className="text-xl font-black text-white mt-1">Direct Fee Upgrade</h4>
                  <div className="text-3xl font-black text-white mt-2">₹30,000</div>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    Pay the platform fee difference of ₹30,000. You receive an immediate <strong>₹30,000 Shopping Voucher</strong> credited to your account and full commission entitlements.
                  </p>
                </div>

                <button
                  onClick={handleUpgradePayment}
                  disabled={upgrading || user.isFullQualified}
                  className="w-full py-3.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-electric-600 to-electric-500 hover:from-electric-500 hover:to-electric-400 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Sparkles className="w-4 h-4" />
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
              <div className="card-gradient rounded-3xl p-6 border border-navy-700 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase">Method 2</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                      Pending Approval
                    </span>
                  </div>
                  <h4 className="text-xl font-black text-white mt-1">Retail Shopping Qualification</h4>
                  <div className="text-3xl font-black text-slate-300 mt-2">₹60,000</div>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Achieve ₹60,000 of verified qualifying retail shopping on ASKR EV bikes and approved merchant merchandise.
                  </p>
                  <div className="mt-3 p-3 rounded-xl bg-navy-950 border border-navy-800 text-[11px] text-slate-400 leading-relaxed">
                    The ₹60,000 shopping qualification rules, voucher entitlement, refund treatment, and tax implications remain configurable and marked pending business approval.
                  </div>
                </div>

                <button
                  disabled
                  className="w-full py-3.5 rounded-xl font-bold text-xs text-slate-500 bg-navy-900 border border-navy-800 cursor-not-allowed"
                >
                  Pending Business Approval
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: WALLETS & EARNINGS */}
      {activeTab === 'wallets' && (
        <div className="space-y-8">
          {/* Wallet Balances Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card-gradient rounded-3xl p-6 border border-navy-700/80">
              <span className="text-xs text-slate-400 font-bold uppercase">Withdrawable Earnings</span>
              <div className="text-3xl font-black text-emerald-400 mt-2">
                ₹{user.wallet?.availableEarningsINR?.toLocaleString('en-IN') ?? 0}
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Available for withdrawal requests under platform compliance guidelines.
              </p>
            </div>

            <div className="card-gradient rounded-3xl p-6 border border-navy-700/80">
              <span className="text-xs text-slate-400 font-bold uppercase">Commission Hold Reserve</span>
              <div className="text-3xl font-black text-amber-300 mt-2">
                ₹{user.wallet?.heldCommissionsINR?.toLocaleString('en-IN') ?? 0}
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Target hold of ₹1,000 maintained prior to your 2nd Full Qualified Direct. Released automatically upon 2nd qualification.
              </p>
            </div>

            <div className="card-gradient rounded-3xl p-6 border border-navy-700/80">
              <span className="text-xs text-slate-400 font-bold uppercase">Pending Recovery</span>
              <div className="text-3xl font-black text-rose-300 mt-2">
                ₹{user.wallet?.pendingRecoveryINR?.toLocaleString('en-IN') ?? 0}
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Tracked advances and reconciliations. Wallets are never allowed to fall below ₹0.
              </p>
            </div>
          </div>

          {/* Withdrawal Request Card */}
          <div className="card-gradient rounded-3xl p-6 sm:p-8 border border-navy-700/80 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Withdrawal Request</h3>
                <p className="text-xs text-slate-400">Request payout of verified withdrawable earnings</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold">
                Simulation Only Mode
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-navy-950 border border-navy-800 text-xs text-slate-400 leading-relaxed space-y-1">
              <div>
                <strong>Compliance Safeguard:</strong> In compliance mode, payouts are simulated and no live bank debits or wire transfers will be executed without supervisory admin clearance.
              </div>
              <div>Minimum withdrawal threshold: ₹1,000. Maximum processing window: 24-48 business hours.</div>
            </div>

            <button
              disabled
              className="px-6 py-3 rounded-xl bg-navy-800 border border-navy-700 text-slate-400 font-bold text-xs cursor-not-allowed"
            >
              Request Withdrawal (Disabled in Simulation Mode)
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: SHOPPING VOUCHERS */}
      {activeTab === 'vouchers' && (
        <div className="space-y-8">
          <div className="card-gradient rounded-3xl p-6 sm:p-8 border border-navy-700/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <span className="text-xs font-bold text-electric-400 uppercase tracking-widest">
                Shopping Voucher Wallet
              </span>
              <div className="text-3xl font-black text-white mt-1">
                ₹{user.wallet?.shoppingVoucherINR?.toLocaleString('en-IN') ?? 0}
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                Redeem against genuine EV motorbike bookings and authorized retail merchandise.
              </p>
            </div>
            <Link
              href="/bikes"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-electric-600 to-electric-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5"
            >
              <Bike className="w-4 h-4" />
              <span>Redeem on EV Superbike</span>
            </Link>
          </div>

          {/* Vouchers Table */}
          <div className="card-gradient rounded-3xl border border-navy-700/80 overflow-hidden">
            <div className="p-6 border-b border-navy-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Issued Shopping Vouchers</h3>
              <span className="text-xs text-slate-400">{userVouchers.length} Total</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-navy-950/70 text-slate-400 border-b border-navy-800 uppercase font-semibold">
                  <tr>
                    <th className="py-3.5 px-6">Voucher Code</th>
                    <th className="py-3.5 px-6">Initial Value</th>
                    <th className="py-3.5 px-6">Remaining Balance</th>
                    <th className="py-3.5 px-6">Reason</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6">Expires</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-800/60 text-slate-300">
                  {userVouchers.length > 0 ? (
                    userVouchers.map((v: any) => (
                      <tr key={v.id} className="hover:bg-navy-800/40 transition-colors">
                        <td className="py-3.5 px-6 font-mono font-bold text-electric-400">
                          {v.voucherCode}
                        </td>
                        <td className="py-3.5 px-6">₹{v.initialValueINR.toLocaleString('en-IN')}</td>
                        <td className="py-3.5 px-6 font-bold text-emerald-400">
                          ₹{v.remainingBalanceINR.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-6 text-slate-400">{v.issuedReason}</td>
                        <td className="py-3.5 px-6">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {v.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-slate-400">
                          {new Date(v.expiresAt).toLocaleDateString('en-IN')}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-500">
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
        <div className="space-y-8">
          <div className="card-gradient rounded-3xl border border-navy-700/80 overflow-hidden">
            <div className="p-6 border-b border-navy-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">My EV Bike Reservations</h3>
                <p className="text-xs text-slate-400">Verified booking deposits and vehicle orders</p>
              </div>
              <Link
                href="/bikes"
                className="px-4 py-2 rounded-xl bg-electric-600 hover:bg-electric-500 text-white font-bold text-xs transition-colors"
              >
                Browse Fleet
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-navy-950/70 text-slate-400 border-b border-navy-800 uppercase font-semibold">
                  <tr>
                    <th className="py-3.5 px-6">Booking Number</th>
                    <th className="py-3.5 px-6">EV Model</th>
                    <th className="py-3.5 px-6">Booking Deposit</th>
                    <th className="py-3.5 px-6">Voucher Applied</th>
                    <th className="py-3.5 px-6">Net Cash Paid</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6">Booking Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-800/60 text-slate-300">
                  {userBookings.length > 0 ? (
                    userBookings.map((b: any) => (
                      <tr key={b.id} className="hover:bg-navy-800/40 transition-colors">
                        <td className="py-3.5 px-6 font-mono font-bold text-electric-400">
                          {b.bookingNumber}
                        </td>
                        <td className="py-3.5 px-6 font-bold text-white">{b.bikeName}</td>
                        <td className="py-3.5 px-6">₹{b.bookingAmountINR.toLocaleString('en-IN')}</td>
                        <td className="py-3.5 px-6 text-emerald-400 font-medium">
                          -₹{b.voucherAppliedINR.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-6 font-black text-white">
                          ₹{b.netCashPaidINR.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-6">
                          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {b.bookingStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-slate-400">
                          {new Date(b.createdAt).toLocaleDateString('en-IN')}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-500">
                        No EV reservations found. Visit the EV Superbikes catalog to reserve a ride.
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
        <div className="space-y-8">
          <div className="card-gradient rounded-3xl p-6 sm:p-8 border border-navy-700/80 space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white">Member Profile & Credentials</h3>
              <p className="text-xs text-slate-400">Personal membership details and verification status</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="p-4 rounded-2xl bg-navy-950 border border-navy-800 space-y-1">
                <span className="text-slate-400">Unique Member ID</span>
                <div className="text-base font-mono font-black text-electric-400">{user.memberId}</div>
              </div>

              <div className="p-4 rounded-2xl bg-navy-950 border border-navy-800 space-y-1">
                <span className="text-slate-400">Full Legal Name</span>
                <div className="text-base font-bold text-white">{user.fullName}</div>
              </div>

              <div className="p-4 rounded-2xl bg-navy-950 border border-navy-800 space-y-1">
                <span className="text-slate-400">Registered Email</span>
                <div className="text-base font-medium text-slate-200">{user.email}</div>
              </div>

              <div className="p-4 rounded-2xl bg-navy-950 border border-navy-800 space-y-1">
                <span className="text-slate-400">Mobile Number</span>
                <div className="text-base font-medium text-slate-200">{user.phone || 'Not Provided'}</div>
              </div>

              <div className="p-4 rounded-2xl bg-navy-950 border border-navy-800 space-y-1">
                <span className="text-slate-400">Assigned Sponsor</span>
                <div className="text-base font-medium text-slate-200">
                  {user.sponsorName ? `${user.sponsorName} (${user.sponsorMemberId})` : 'None (Direct Root Enrollment)'}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-navy-950 border border-navy-800 space-y-1">
                <span className="text-slate-400">KYC Compliance Status</span>
                <div className="text-base font-bold text-emerald-400 flex items-center gap-1.5 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Level 1 Basic Verified</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
