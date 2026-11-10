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
  Sparkles,
  Ticket,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { fetchApi, getStoredUser } from '../../lib/api';

export default function AdminPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'members' | 'bookings' | 'vouchers' | 'audit' | 'compliance'
  >('overview');
  const [memberSearch, setMemberSearch] = useState('');
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
      const [overviewData, membersData, bookingsData, vouchersData, logsData] =
        await Promise.all([
          fetchApi<any>('/admin/overview'),
          fetchApi<any[]>('/members/admin/list'),
          fetchApi<any[]>('/ev-bikes/admin/bookings').catch(() => []),
          fetchApi<any[]>('/vouchers/admin/all').catch(() => []),
          fetchApi<any[]>('/admin/audit-logs').catch(() => []),
        ]);

      setOverview(overviewData);
      setMembers(membersData);
      setBookings(bookingsData);
      setVouchers(vouchersData);
      setAuditLogs(logsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load admin controls');
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter((m) => {
    if (!memberSearch) return true;
    const term = memberSearch.toLowerCase();
    return (
      m.memberId?.toLowerCase().includes(term) ||
      m.fullName?.toLowerCase().includes(term) ||
      m.email?.toLowerCase().includes(term)
    );
  });

  if (loading && !overview) {
    return (
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-20 flex items-center justify-center text-slate-400">
        <div className="animate-spin w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full mr-3" />
        <span>Loading Admin Operations Console...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
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
          <span className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            <span>Mode: SIMULATION_ONLY</span>
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* 4 Financial Liabilities KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-gradient rounded-3xl p-5 border border-navy-700/80">
          <div className="text-xs font-semibold text-slate-400">Earnings Payable</div>
          <div className="text-2xl font-black text-white mt-1">
            ₹
            {overview?.financialLiabilities?.totalAvailableEarningsPayableINR?.toLocaleString(
              'en-IN'
            ) ?? 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">System Withdrawable Liability</div>
        </div>

        <div className="card-gradient rounded-3xl p-5 border border-navy-700/80">
          <div className="text-xs font-semibold text-amber-400">Hold Reserve Reserves</div>
          <div className="text-2xl font-black text-amber-300 mt-1">
            ₹
            {overview?.financialLiabilities?.totalHeldCommissionsReserveINR?.toLocaleString(
              'en-IN'
            ) ?? 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Held pending 2nd direct</div>
        </div>

        <div className="card-gradient rounded-3xl p-5 border border-navy-700/80">
          <div className="text-xs font-semibold text-electric-400">Voucher Liabilities</div>
          <div className="text-2xl font-black text-electric-300 mt-1">
            ₹
            {overview?.financialLiabilities?.totalOutstandingVoucherLiabilityINR?.toLocaleString(
              'en-IN'
            ) ?? 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Non-cash promotional debt</div>
        </div>

        <div className="card-gradient rounded-3xl p-5 border border-navy-700/80">
          <div className="text-xs font-semibold text-rose-400">Pending Recoveries</div>
          <div className="text-2xl font-black text-rose-300 mt-1">
            ₹
            {overview?.financialLiabilities?.totalPendingRecoveryAssetINR?.toLocaleString(
              'en-IN'
            ) ?? 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Distributor advance assets</div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex overflow-x-auto border-b border-navy-800 space-x-2 pb-px scrollbar-none">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-t-xl transition-colors shrink-0 flex items-center gap-1.5 ${
            activeTab === 'overview'
              ? 'text-amber-400 border-b-2 border-amber-400 bg-navy-900/60'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Membership Distribution</span>
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-t-xl transition-colors shrink-0 flex items-center gap-1.5 ${
            activeTab === 'members'
              ? 'text-amber-400 border-b-2 border-amber-400 bg-navy-900/60'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>All Members ({members.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('bookings')}
          className={`px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-t-xl transition-colors shrink-0 flex items-center gap-1.5 ${
            activeTab === 'bookings'
              ? 'text-amber-400 border-b-2 border-amber-400 bg-navy-900/60'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Bike className="w-3.5 h-3.5" />
          <span>EV Bookings ({bookings.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('vouchers')}
          className={`px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-t-xl transition-colors shrink-0 flex items-center gap-1.5 ${
            activeTab === 'vouchers'
              ? 'text-amber-400 border-b-2 border-amber-400 bg-navy-900/60'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Ticket className="w-3.5 h-3.5" />
          <span>Vouchers Issued ({vouchers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-t-xl transition-colors shrink-0 flex items-center gap-1.5 ${
            activeTab === 'audit'
              ? 'text-amber-400 border-b-2 border-amber-400 bg-navy-900/60'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Audit Logs ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('compliance')}
          className={`px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-t-xl transition-colors shrink-0 flex items-center gap-1.5 ${
            activeTab === 'compliance'
              ? 'text-amber-400 border-b-2 border-amber-400 bg-navy-900/60'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Compliance Guardrails</span>
        </button>
      </div>

      {/* TAB 1: MEMBERSHIP DISTRIBUTION */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-5 rounded-2xl bg-navy-900 border border-navy-800">
              <div className="text-xs text-slate-400">Total Enrolled</div>
              <div className="text-3xl font-black text-white mt-1">
                {overview?.memberships?.totalRegistered ?? 0}
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-navy-900 border border-navy-800">
              <div className="text-xs text-slate-400">Free Users</div>
              <div className="text-3xl font-black text-slate-300 mt-1">
                {overview?.memberships?.freeUsers ?? 0}
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-navy-900 border border-navy-800">
              <div className="text-xs text-electric-400">Basic (₹3k)</div>
              <div className="text-3xl font-black text-electric-300 mt-1">
                {overview?.memberships?.basicMembers ?? 0}
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-navy-900 border border-navy-800">
              <div className="text-xs text-purple-400">Full (₹33k)</div>
              <div className="text-3xl font-black text-purple-300 mt-1">
                {overview?.memberships?.fullMembers ?? 0}
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-navy-900 border border-navy-800">
              <div className="text-xs text-emerald-400">Full Qualified</div>
              <div className="text-3xl font-black text-emerald-300 mt-1">
                {overview?.memberships?.fullQualified ?? 0}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MEMBERS MANAGEMENT */}
      {activeTab === 'members' && (
        <div className="card-gradient rounded-3xl border border-navy-700/80 overflow-hidden space-y-4 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-lg font-bold text-white">Registered Platform Members</h3>
            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search by ID, name, email..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-navy-950 border border-navy-700 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-navy-950/70 text-slate-400 border-b border-navy-800 uppercase font-semibold">
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
                {filteredMembers.map((m) => (
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
                            ? 'bg-purple-500/20 text-purple-300'
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

      {/* TAB 3: EV BOOKINGS */}
      {activeTab === 'bookings' && (
        <div className="card-gradient rounded-3xl border border-navy-700/80 overflow-hidden">
          <div className="p-6 border-b border-navy-800">
            <h3 className="text-lg font-bold text-white">All Platform EV Reservations</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-navy-950/70 text-slate-400 border-b border-navy-800 uppercase font-semibold">
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
                    <td className="py-3 px-4 font-mono font-bold text-electric-400">
                      {b.bookingNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{b.memberName}</div>
                      <div className="text-[10px] text-slate-400">{b.memberId}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">{b.bikeName}</td>
                    <td className="py-3 px-4">₹{b.bookingAmountINR?.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-emerald-400">
                      ₹{b.voucherAppliedINR?.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 font-bold text-white">
                      ₹{b.netCashPaidINR?.toLocaleString('en-IN')}
                    </td>
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

      {/* TAB 4: SHOPPING VOUCHERS ISSUED */}
      {activeTab === 'vouchers' && (
        <div className="card-gradient rounded-3xl border border-navy-700/80 overflow-hidden">
          <div className="p-6 border-b border-navy-800">
            <h3 className="text-lg font-bold text-white">All Issued Shopping Vouchers</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-navy-950/70 text-slate-400 border-b border-navy-800 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Voucher Code</th>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Initial Value</th>
                  <th className="py-3 px-4">Remaining Balance</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Issued Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800/60 text-slate-300">
                {vouchers.map((v) => (
                  <tr key={v.id} className="hover:bg-navy-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-electric-400">
                      {v.voucherCode}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{v.memberName}</div>
                      <div className="text-[10px] text-slate-400">{v.memberId}</div>
                    </td>
                    <td className="py-3 px-4">₹{v.initialValueINR?.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 font-bold text-emerald-400">
                      ₹{v.remainingBalanceINR?.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                        {v.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{v.issuedReason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="card-gradient rounded-3xl border border-navy-700/80 overflow-hidden">
          <div className="p-6 border-b border-navy-800">
            <h3 className="text-lg font-bold text-white">System Audit & Ledger Logs</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-navy-950/70 text-slate-400 border-b border-navy-800 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity Type</th>
                  <th className="py-3 px-4">Actor ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800/60 text-slate-300 font-mono">
                {auditLogs.map((l) => (
                  <tr key={l.id} className="hover:bg-navy-800/40 transition-colors">
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(l.createdAt).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-emerald-400 font-bold">{l.action}</td>
                    <td className="py-3 px-4 text-slate-300">{l.entityType}</td>
                    <td className="py-3 px-4 text-slate-400">{l.actorId || 'SYSTEM'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: COMPLIANCE CONTROLS */}
      {activeTab === 'compliance' && (
        <div className="card-gradient rounded-3xl p-6 sm:p-8 border border-navy-700/80 space-y-6">
          <h3 className="text-lg font-bold text-white">Safety Gates & Regulatory Compliance</h3>
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-navy-950 border border-navy-800 flex items-center justify-between">
              <div>
                <div className="font-bold text-white">Operating Mode</div>
                <div className="text-slate-400">Prevents real money disbursements and bank payouts</div>
              </div>
              <span className="px-3 py-1 rounded-full font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                SIMULATION_ONLY
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-navy-950 border border-navy-800 flex items-center justify-between">
              <div>
                <div className="font-bold text-white">Live Matching Settlements</div>
                <div className="text-slate-400">Binary tree automated daily payout calculation</div>
              </div>
              <span className="px-3 py-1 rounded-full font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                DISABLED
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-navy-950 border border-navy-800 flex items-center justify-between">
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
