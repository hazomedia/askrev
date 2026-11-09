'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Users,
  Wallet,
  Receipt,
  Bike,
  Lock,
  AlertTriangle,
  FileText,
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';
import { fetchApi, getStoredUser } from '../../lib/api';

export default function AdminPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'bookings' | 'compliance'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const user = getStoredUser();
    if (!user || !['SUPER_ADMIN', 'ADMIN_OPERATIONS', 'FINANCE_MANAGER'].includes(user.role)) {
      router.push('/auth/login');
      return;
    }
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [overviewData, membersData, bookingsData, logsData] = await Promise.all([
        fetchApi<any>('/admin/overview'),
        fetchApi<any[]>('/members/admin/list'),
        fetchApi<any[]>('/ev-bikes/admin/bookings').catch(() => []),
        fetchApi<any[]>('/admin/audit-logs').catch(() => []),
      ]);

      setOverview(overviewData);
      setMembers(membersData);
      setBookings(bookingsData);
      setAuditLogs(logsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load admin controls');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-slate-400">
        <div className="animate-spin w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full mr-3"></div>
        Loading Admin Operations Console...
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Master Administration & Financial Compliance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-2">
            Operations & Financial Controller Panel
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            System liabilities reconciliation • Member verification • Audit log tracking
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            Live Payouts: Strictly Locked
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* 4 Financial Liabilities Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-gradient rounded-xl p-5 border-navy-700">
          <div className="text-xs font-semibold text-slate-400">Earnings Payable</div>
          <div className="text-2xl font-black text-white mt-1">
            ₹{overview?.financialLiabilities?.totalAvailableEarningsPayableINR?.toLocaleString('en-IN') ?? 0}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">System Withdrawable Liability</div>
        </div>

        <div className="card-gradient rounded-xl p-5 border-navy-700">
          <div className="text-xs font-semibold text-amber-400">Hold Reserve Reserves</div>
          <div className="text-2xl font-black text-amber-300 mt-1">
            ₹{overview?.financialLiabilities?.totalHeldCommissionsReserveINR?.toLocaleString('en-IN') ?? 0}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Held pending 2nd direct</div>
        </div>

        <div className="card-gradient rounded-xl p-5 border-navy-700">
          <div className="text-xs font-semibold text-electric-400">Shopping Voucher Liability</div>
          <div className="text-2xl font-black text-electric-300 mt-1">
            ₹{overview?.financialLiabilities?.totalOutstandingVoucherLiabilityINR?.toLocaleString('en-IN') ?? 0}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Non-cash promotional debt</div>
        </div>

        <div className="card-gradient rounded-xl p-5 border-navy-700">
          <div className="text-xs font-semibold text-rose-400">Pending Recoveries</div>
          <div className="text-2xl font-black text-rose-300 mt-1">
            ₹{overview?.financialLiabilities?.totalPendingRecoveryAssetINR?.toLocaleString('en-IN') ?? 0}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Distributor advance assets</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-navy-800 space-x-4">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'overview'
              ? 'text-amber-400 border-b-2 border-amber-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Membership Distribution
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'members'
              ? 'text-amber-400 border-b-2 border-amber-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          All Members ({members.length})
        </button>
        <button
          onClick={() => setActiveTab('bookings')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'bookings'
              ? 'text-amber-400 border-b-2 border-amber-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          EV Bookings ({bookings.length})
        </button>
        <button
          onClick={() => setActiveTab('compliance')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'compliance'
              ? 'text-amber-400 border-b-2 border-amber-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Compliance Controls
        </button>
      </div>

      {/* Tab 1: Membership Distribution */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="p-4 rounded-xl bg-navy-900 border border-navy-800">
            <div className="text-xs text-slate-400">Total Enrolled</div>
            <div className="text-2xl font-black text-white mt-1">
              {overview?.memberships?.totalRegistered ?? 0}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-navy-900 border border-navy-800">
            <div className="text-xs text-slate-400">Free Users</div>
            <div className="text-2xl font-black text-slate-300 mt-1">
              {overview?.memberships?.freeUsers ?? 0}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-navy-900 border border-navy-800">
            <div className="text-xs text-electric-400">Basic (₹3k)</div>
            <div className="text-2xl font-black text-electric-300 mt-1">
              {overview?.memberships?.basicMembers ?? 0}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-navy-900 border border-navy-800">
            <div className="text-xs text-emerald-400">Full (₹33k)</div>
            <div className="text-2xl font-black text-emerald-300 mt-1">
              {overview?.memberships?.fullMembers ?? 0}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-navy-900 border border-navy-800">
            <div className="text-xs text-amber-400">Full Qualified</div>
            <div className="text-2xl font-black text-amber-300 mt-1">
              {overview?.memberships?.fullQualified ?? 0}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Members Management Table */}
      {activeTab === 'members' && (
        <div className="card-gradient rounded-2xl border-navy-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-navy-950/60 text-slate-400 border-b border-navy-800 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Member ID</th>
                  <th className="py-3 px-4">Name & Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Package</th>
                  <th className="py-3 px-4">Directs</th>
                  <th className="py-3 px-4">Wallet (₹)</th>
                  <th className="py-3 px-4">Voucher (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800/60 text-slate-300">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-navy-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-electric-400">{m.memberId}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{m.fullName}</div>
                      <div className="text-[11px] text-slate-400">{m.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-navy-950 text-slate-300 border border-navy-700">
                        {m.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          m.currentPackage === 'FULL'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-electric-500/20 text-electric-300'
                        }`}
                      >
                        {m.currentPackage}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold">{m.directReferralCount}</td>
                    <td className="py-3 px-4 font-mono text-emerald-400">
                      ₹{m.wallet?.availableEarningsINR?.toLocaleString('en-IN') ?? 0}
                    </td>
                    <td className="py-3 px-4 font-mono text-electric-400">
                      ₹{m.wallet?.shoppingVoucherINR?.toLocaleString('en-IN') ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: EV Bookings Audit */}
      {activeTab === 'bookings' && (
        <div className="card-gradient rounded-2xl border-navy-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-navy-950/60 text-slate-400 border-b border-navy-800 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Booking #</th>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Bike Model</th>
                  <th className="py-3 px-4">Deposit</th>
                  <th className="py-3 px-4">Voucher Used</th>
                  <th className="py-3 px-4">Net Cash</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800/60 text-slate-300">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-navy-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-electric-400">{b.bookingNumber}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{b.memberName}</div>
                      <div className="text-[10px] text-slate-500">{b.memberId}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">{b.bikeName}</td>
                    <td className="py-3 px-4">₹{b.bookingAmountINR?.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-emerald-400">₹{b.voucherAppliedINR?.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 font-bold text-white">₹{b.netCashPaidINR?.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                        {b.bookingStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Compliance Controls */}
      {activeTab === 'compliance' && (
        <div className="card-gradient rounded-2xl p-6 border-navy-700 space-y-6">
          <h3 className="text-base font-bold text-white">System Safety Gates & Compliance Guardrails</h3>
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 flex items-center justify-between">
              <div>
                <div className="font-bold text-white">Operating Mode</div>
                <div className="text-slate-400">Prevents real money disbursements and bank payouts</div>
              </div>
              <span className="px-3 py-1 rounded-full font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                SIMULATION_ONLY
              </span>
            </div>

            <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 flex items-center justify-between">
              <div>
                <div className="font-bold text-white">Live Matching Settlements</div>
                <div className="text-slate-400">Binary tree automated daily payout calculation</div>
              </div>
              <span className="px-3 py-1 rounded-full font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                DISABLED
              </span>
            </div>

            <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 flex items-center justify-between">
              <div>
                <div className="font-bold text-white">Direct Voucher Cash Conversion</div>
                <div className="text-slate-400">Shopping voucher conversion to withdrawable earnings</div>
              </div>
              <span className="px-3 py-1 rounded-full font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                STRICTLY PROHIBITED
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
