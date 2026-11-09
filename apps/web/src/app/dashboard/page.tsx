'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Wallet,
  Zap,
  Users,
  Copy,
  Check,
  ArrowUpRight,
  ShieldAlert,
  Award,
  GitBranch,
  Bike,
  Sparkles,
  ArrowRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { fetchApi, getStoredUser } from '../../lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [directTeam, setDirectTeam] = useState<any>(null);
  const [binaryTree, setBinaryTree] = useState<any>(null);
  const [userBookings, setUserBookings] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'team' | 'binary' | 'bookings'>('overview');

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.push('/auth/login');
      return;
    }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [profileData, teamData, binaryData, bookingsData] = await Promise.all([
        fetchApi<any>('/auth/me'),
        fetchApi<any>('/members/direct-team'),
        fetchApi<any>('/members/binary-tree').catch(() => null),
        fetchApi<any>('/ev-bikes/my-bookings').catch(() => []),
      ]);

      setUser(profileData);
      setDirectTeam(teamData);
      setBinaryTree(binaryData);
      setUserBookings(bookingsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load member dashboard');
    }
  };

  const copyReferralLink = () => {
    if (!user) return;
    const link = `${window.location.origin}/auth/register?ref=${user.memberId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleUpgradePayment = async () => {
    setUpgrading(true);
    setUpgradeSuccess(null);
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

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-slate-400">
        <div className="animate-spin w-8 h-8 border-2 border-electric-500 border-t-transparent rounded-full mr-3"></div>
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Profile Banner */}
      <div className="card-gradient rounded-2xl p-6 border-navy-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider bg-electric-500/20 text-electric-300 border border-electric-500/30">
              {user.memberId}
            </span>
            {user.isFullQualified ? (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Full Qualified
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {user.currentPackage} Membership
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1.5">{user.fullName}</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Sponsor: {user.sponsorName ? `${user.sponsorName} (${user.sponsorMemberId})` : 'Direct Platform Enrollment'}
          </p>
        </div>

        {/* Referral Link Box */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-navy-950/80 p-2.5 rounded-xl border border-navy-700">
          <div className="text-xs text-slate-300 px-2 font-mono truncate max-w-xs">
            {typeof window !== 'undefined' ? `${window.location.origin}/auth/register?ref=${user.memberId}` : user.memberId}
          </div>
          <button
            onClick={copyReferralLink}
            className="px-3.5 py-1.5 rounded-lg bg-electric-600 hover:bg-electric-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Link'}</span>
          </button>
        </div>
      </div>

      {upgradeSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{upgradeSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* 4-Stat Wallet Grid (Integer Paise Derived) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Available Earnings */}
        <div className="card-gradient rounded-xl p-5 border-navy-700">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Withdrawable Earnings</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">
            ₹{user.wallet?.availableEarningsINR?.toLocaleString('en-IN') ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span className="text-emerald-400">●</span> Simulation Mode Locked
          </div>
        </div>

        {/* Hold Reserve */}
        <div className="card-gradient rounded-xl p-5 border-navy-700">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Held Commission Reserve</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-300 mt-2">
            ₹{user.wallet?.heldCommissionsINR?.toLocaleString('en-IN') ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Releases on 2nd Qualified Direct</div>
        </div>

        {/* Shopping Voucher Balance */}
        <div className="card-gradient rounded-xl p-5 border-navy-700">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Shopping Voucher Balance</span>
            <Zap className="w-4 h-4 text-electric-400" />
          </div>
          <div className="text-2xl font-black text-electric-300 mt-2">
            ₹{user.wallet?.shoppingVoucherINR?.toLocaleString('en-IN') ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Non-cash retail credit</div>
        </div>

        {/* Pending Recovery */}
        <div className="card-gradient rounded-xl p-5 border-navy-700">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Pending Recovery</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-300 mt-2">
            ₹{user.wallet?.pendingRecoveryINR?.toLocaleString('en-IN') ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Advances to reconcile</div>
        </div>
      </div>

      {/* Upgrade Banner for Basic / Free Members */}
      {!user.isFullQualified && (
        <div className="card-gradient rounded-2xl p-6 border-electric-500/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-electric-950/40 via-navy-900 to-navy-950">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-electric-400 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Full Qualification Available
            </div>
            <h3 className="text-lg font-bold text-white mt-1">
              Unlock ₹30,000 Shopping Voucher & Binary Matching Income
            </h3>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Upgrade to Full Qualified status by completing the ₹30,000 platform fee or fulfilling verified retail shopping criteria.
            </p>
          </div>
          <button
            onClick={handleUpgradePayment}
            disabled={upgrading}
            className="shrink-0 px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-electric-600 to-emerald-500 hover:from-electric-500 hover:to-emerald-400 shadow-md shadow-electric-600/20 transition-all disabled:opacity-50"
          >
            {upgrading ? 'Upgrading...' : 'Upgrade Now (₹30,000)'}
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-navy-800 space-x-4">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'overview'
              ? 'text-electric-400 border-b-2 border-electric-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Overview & Directs
        </button>
        <button
          onClick={() => setActiveTab('binary')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'binary'
              ? 'text-electric-400 border-b-2 border-electric-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Binary Matching
        </button>
        <button
          onClick={() => setActiveTab('bookings')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'bookings'
              ? 'text-electric-400 border-b-2 border-electric-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          EV Bookings ({userBookings.length})
        </button>
      </div>

      {/* Tab 1: Overview & Direct Sponsor Team */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Counters Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-navy-900/60 border border-navy-800">
              <div className="text-xs text-slate-400 font-semibold">Total Direct Referrals</div>
              <div className="text-2xl font-black text-white mt-1">
                {directTeam?.metrics?.totalDirects ?? 0}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-navy-900/60 border border-navy-800">
              <div className="text-xs text-electric-400 font-semibold">Total Activated Directs</div>
              <div className="text-2xl font-black text-electric-300 mt-1">
                {directTeam?.metrics?.totalActivatedDirects ?? 0}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-navy-900/60 border border-navy-800">
              <div className="text-xs text-emerald-400 font-semibold">Total Full Qualified Directs</div>
              <div className="text-2xl font-black text-emerald-300 mt-1">
                {directTeam?.metrics?.totalFullQualifiedDirects ?? 0}
              </div>
            </div>
          </div>

          {/* Direct Referrals Table */}
          <div className="card-gradient rounded-2xl border-navy-700 overflow-hidden">
            <div className="p-4 border-b border-navy-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-electric-400" />
                Direct Sponsor Team Members
              </h3>
              <span className="text-xs text-slate-400">
                {directTeam?.directs?.length ?? 0} registered downline
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-navy-950/60 text-slate-400 border-b border-navy-800 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Member ID</th>
                    <th className="py-3 px-4">Full Name</th>
                    <th className="py-3 px-4">Package</th>
                    <th className="py-3 px-4">Qualification</th>
                    <th className="py-3 px-4">Joined On</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-800/60 text-slate-300">
                  {directTeam?.directs && directTeam.directs.length > 0 ? (
                    directTeam.directs.map((d: any) => (
                      <tr key={d.id} className="hover:bg-navy-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-electric-400">{d.memberId}</td>
                        <td className="py-3 px-4 font-medium text-white">{d.fullName}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              d.currentPackage === 'FULL'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : d.currentPackage === 'BASIC'
                                ? 'bg-electric-500/20 text-electric-300 border border-electric-500/30'
                                : 'bg-slate-700/50 text-slate-400'
                            }`}
                          >
                            {d.currentPackage}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {d.isFullQualified ? (
                            <span className="text-emerald-400 font-semibold flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Full Qualified
                            </span>
                          ) : (
                            <span className="text-slate-500">Pending Upgrade</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {new Date(d.createdAt).toLocaleDateString('en-IN')}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        No direct referrals yet. Share your referral link above to start building your network.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Binary Matching */}
      {activeTab === 'binary' && (
        <div className="space-y-6">
          <div className="card-gradient rounded-2xl p-6 border-navy-700">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-electric-400" />
              Binary Tree Matching Ledger
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Configuration: 1:2 or 2:1 ratio • ₹3,000 match reward • Max 15 matches / ₹45,000 daily cap • Pending regulatory approval
            </p>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Leg */}
              <div className="p-4 rounded-xl bg-navy-950/80 border border-navy-800">
                <div className="text-xs font-bold text-electric-400 uppercase tracking-widest">Left Business Leg</div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase">Total Members</div>
                    <div className="text-xl font-bold text-white mt-1">
                      {binaryTree?.node?.leftCount ?? 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase">Carry Forward</div>
                    <div className="text-xl font-bold text-electric-300 mt-1">
                      ₹{binaryTree?.node?.carryLeftINR ?? 0}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Leg */}
              <div className="p-4 rounded-xl bg-navy-950/80 border border-navy-800">
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Right Business Leg</div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase">Total Members</div>
                    <div className="text-xl font-bold text-white mt-1">
                      {binaryTree?.node?.rightCount ?? 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase">Carry Forward</div>
                    <div className="text-xl font-bold text-emerald-300 mt-1">
                      ₹{binaryTree?.node?.carryRightINR ?? 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-xl bg-navy-900 border border-navy-800 flex items-center justify-between text-xs">
              <div className="text-slate-300">
                <span className="font-semibold text-white">Daily Capping Status:</span> 0 / 15 matches consumed today (₹0 / ₹45,000 max)
              </div>
              <span className="px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold text-[11px]">
                Simulation Mode
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: EV Bookings */}
      {activeTab === 'bookings' && (
        <div className="space-y-6">
          <div className="card-gradient rounded-2xl border-navy-700 overflow-hidden">
            <div className="p-4 border-b border-navy-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Bike className="w-4 h-4 text-electric-400" />
                My EV Bike Bookings
              </h3>
              <button
                onClick={() => router.push('/bikes')}
                className="px-3 py-1 rounded-lg bg-electric-600 hover:bg-electric-500 text-white font-semibold text-xs transition-colors"
              >
                Browse Catalog
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-navy-950/60 text-slate-400 border-b border-navy-800 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Booking #</th>
                    <th className="py-3 px-4">EV Model</th>
                    <th className="py-3 px-4">Deposit Amount</th>
                    <th className="py-3 px-4">Voucher Applied</th>
                    <th className="py-3 px-4">Net Cash Paid</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-800/60 text-slate-300">
                  {userBookings && userBookings.length > 0 ? (
                    userBookings.map((b: any) => (
                      <tr key={b.id} className="hover:bg-navy-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-electric-400">{b.bookingNumber}</td>
                        <td className="py-3 px-4 font-semibold text-white">{b.bikeName}</td>
                        <td className="py-3 px-4">₹{b.bookingAmountINR?.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 text-emerald-400 font-medium">₹{b.voucherAppliedINR?.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 font-bold text-white">₹{b.netCashPaidINR?.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {b.bookingStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No EV bookings found. Visit the EV Bikes catalog to place a demo booking.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
