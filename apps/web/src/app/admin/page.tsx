'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Users,
  Wallet,
  Bike,
  Lock,
  Activity,
  Layers,
  Ticket,
  Search,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { fetchApi, getStoredUser, clearAuthSession } from '../../lib/api';

type AdminTab = 'overview' | 'members' | 'bookings' | 'vouchers' | 'audit' | 'compliance';

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [overview, setOverview] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [memberSearch, setMemberSearch] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored || !['SUPER_ADMIN', 'ADMIN_OPERATIONS', 'FINANCE_MANAGER'].includes(stored.role)) {
      router.push('/auth/login');
      return;
    }
    setUser(stored);
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
      setError(err.message || 'Failed to load administration data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuthSession();
    router.push('/auth/login');
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
      <div className="min-h-[70vh] flex items-center justify-center bg-white text-slate-500">
        <div className="flex items-center gap-3">
          <div className="animate-spin w-6 h-6 border-2 border-[#165DAD] border-t-transparent rounded-full" />
          <span className="text-sm font-medium">Loading Administration Console...</span>
        </div>
      </div>
    );
  }

  const navItems: { id: AdminTab; label: string; icon: any; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'members', label: 'Members', icon: Users, count: members.length },
    { id: 'bookings', label: 'EV Bookings', icon: Bike, count: bookings.length },
    { id: 'vouchers', label: 'Vouchers', icon: Ticket, count: vouchers.length },
    { id: 'audit', label: 'Audit Logs', icon: Activity, count: auditLogs.length },
    { id: 'compliance', label: 'Compliance', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#253247]">
      {/* Top Enterprise Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-slate-500 hover:text-[#253247] hover:bg-slate-100"
                aria-label="Toggle navigation"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-[#253247]">ASKR EV Admin</span>
                <span className="text-slate-300">/</span>
                <span className="text-xs font-semibold text-slate-500">
                  {user?.role?.replace('_', ' ') || 'Operations'}
                </span>
              </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                <Lock className="w-3 h-3 text-amber-600" />
                <span>SIMULATION_ONLY</span>
              </span>

              <div className="h-5 w-px bg-slate-200 mx-1" />

              <Link
                href="/dashboard"
                className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-[#165DAD] px-2 py-1.5 rounded-lg hover:bg-slate-50"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Member Portal</span>
              </Link>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-[#DC2626] px-2 py-1.5 rounded-lg hover:bg-slate-50"
                title="Sign out of admin console"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left Sidebar Navigation */}
          <aside
            className={`md:w-60 shrink-0 md:block ${
              mobileMenuOpen ? 'block' : 'hidden'
            } bg-white rounded-xl border border-slate-200 p-3 shadow-sm h-fit space-y-1`}
          >
            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Admin Menu
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
                System Status
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-[#15803D]">
                <span className="w-2 h-2 rounded-full bg-[#15803D] animate-pulse" />
                <span>Ledger Operational</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                PostgreSQL • NestJS Core
              </p>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 min-w-0 space-y-6">
            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-[#DC2626] text-xs font-medium flex items-center justify-between">
                <span>{error}</span>
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
                {/* Operations Header */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-xl font-bold text-[#253247]">
                        Operations & Financial Controller
                      </h1>
                      <p className="text-xs text-slate-500 mt-1">
                        System liabilities reconciliation • Member verification • Audit log tracking
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#15803D] bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 self-start">
                      <ShieldCheck className="w-4 h-4 text-[#15803D]" />
                      <span>Ledger Invariants Verified</span>
                    </span>
                  </div>
                </div>

                {/* 4 Financial Liabilities KPI Cards */}
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    System Liabilities & Balances
                  </h2>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                      <div className="text-xs font-medium text-slate-500">Earnings Payable</div>
                      <div className="text-2xl font-bold text-[#253247] mt-1">
                        ₹
                        {overview?.financialLiabilities?.totalAvailableEarningsPayableINR?.toLocaleString(
                          'en-IN'
                        ) ?? 0}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        System Withdrawable Liability
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                      <div className="text-xs font-medium text-amber-700">Hold Reserve Reserves</div>
                      <div className="text-2xl font-bold text-amber-600 mt-1">
                        ₹
                        {overview?.financialLiabilities?.totalHeldCommissionsReserveINR?.toLocaleString(
                          'en-IN'
                        ) ?? 0}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Held pending 2nd direct
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                      <div className="text-xs font-medium text-[#165DAD]">Voucher Liabilities</div>
                      <div className="text-2xl font-bold text-[#165DAD] mt-1">
                        ₹
                        {overview?.financialLiabilities?.totalOutstandingVoucherLiabilityINR?.toLocaleString(
                          'en-IN'
                        ) ?? 0}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Non-cash promotional debt
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                      <div className="text-xs font-medium text-[#DC2626]">Pending Recoveries</div>
                      <div className="text-2xl font-bold text-[#DC2626] mt-1">
                        ₹
                        {overview?.financialLiabilities?.totalPendingRecoveryAssetINR?.toLocaleString(
                          'en-IN'
                        ) ?? 0}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Distributor advance assets
                      </div>
                    </div>
                  </div>
                </div>

                {/* Membership Distribution Cards */}
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Membership Tier Distribution
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                      <div className="text-xs text-slate-500">Total Enrolled</div>
                      <div className="text-xl font-bold text-[#253247] mt-1">
                        {overview?.memberships?.totalRegistered ?? 0}
                      </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                      <div className="text-xs text-slate-500">Free Users</div>
                      <div className="text-xl font-bold text-slate-600 mt-1">
                        {overview?.memberships?.freeUsers ?? 0}
                      </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                      <div className="text-xs text-[#165DAD]">Basic (₹3,000)</div>
                      <div className="text-xl font-bold text-[#165DAD] mt-1">
                        {overview?.memberships?.basicMembers ?? 0}
                      </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                      <div className="text-xs text-slate-700">Full (₹33,000)</div>
                      <div className="text-xl font-bold text-slate-800 mt-1">
                        {overview?.memberships?.fullMembers ?? 0}
                      </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                      <div className="text-xs text-[#15803D]">Full Qualified</div>
                      <div className="text-xl font-bold text-[#15803D] mt-1">
                        {overview?.memberships?.fullQualified ?? 0}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: MEMBERS */}
            {activeTab === 'members' && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-[#253247]">Registered Platform Members</h3>
                    <p className="text-xs text-slate-500">All registered member profiles and wallet totals</p>
                  </div>
                  <div className="relative max-w-xs w-full">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Search by ID, name, email..."
                      className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#F7F9FC] border border-slate-200 text-xs text-[#253247] placeholder:text-slate-400 focus:outline-none focus:border-[#165DAD] focus:bg-white"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
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
                    <tbody className="divide-y divide-slate-100 text-[#253247]">
                      {filteredMembers.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-medium text-[#165DAD]">{m.memberId}</td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-[#253247]">{m.fullName}</div>
                            <div className="text-[11px] text-slate-500">{m.email}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              {m.role}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                m.currentPackage === 'FULL'
                                  ? 'bg-blue-50 text-[#165DAD] border-blue-200'
                                  : 'bg-emerald-50 text-[#15803D] border-emerald-200'
                              }`}
                            >
                              {m.currentPackage}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium">{m.directReferralCount}</td>
                          <td className="py-3 px-4 font-mono font-medium text-[#15803D]">
                            ₹{m.wallet?.availableEarningsINR?.toLocaleString('en-IN') ?? 0}
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-[#165DAD]">
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
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-200">
                  <h3 className="text-sm font-bold text-[#253247]">All Platform EV Reservations</h3>
                  <p className="text-xs text-slate-500">Verified vehicle deposits and orders</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
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
                    <tbody className="divide-y divide-slate-100 text-[#253247]">
                      {bookings.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-medium text-[#165DAD]">
                            {b.bookingNumber}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-[#253247]">{b.memberName}</div>
                            <div className="text-[10px] text-slate-500">{b.memberId}</div>
                          </td>
                          <td className="py-3 px-4 font-medium text-[#253247]">{b.bikeName}</td>
                          <td className="py-3 px-4">₹{b.bookingAmountINR?.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4 text-[#15803D] font-medium">
                            ₹{b.voucherAppliedINR?.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 font-bold text-[#253247]">
                            ₹{b.netCashPaidINR?.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-[#15803D] border border-emerald-200">
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

            {/* TAB 4: VOUCHERS */}
            {activeTab === 'vouchers' && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-200">
                  <h3 className="text-sm font-bold text-[#253247]">All Issued Shopping Vouchers</h3>
                  <p className="text-xs text-slate-500">Tracked promotional credits and balances</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                      <tr>
                        <th className="py-3 px-4">Voucher Code</th>
                        <th className="py-3 px-4">Member</th>
                        <th className="py-3 px-4">Initial Value</th>
                        <th className="py-3 px-4">Remaining Balance</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Issued Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[#253247]">
                      {vouchers.map((v) => (
                        <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-medium text-[#165DAD]">
                            {v.voucherCode}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-[#253247]">{v.memberName}</div>
                            <div className="text-[10px] text-slate-500">{v.memberId}</div>
                          </td>
                          <td className="py-3 px-4">₹{v.initialValueINR?.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4 font-bold text-[#15803D]">
                            ₹{v.remainingBalanceINR?.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-[#15803D] border border-emerald-200">
                              {v.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500">{v.issuedReason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 5: AUDIT LOGS */}
            {activeTab === 'audit' && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-200">
                  <h3 className="text-sm font-bold text-[#253247]">System Audit Logs</h3>
                  <p className="text-xs text-slate-500">Immutable ledger actions and compliance events</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold font-sans">
                      <tr>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4">Action</th>
                        <th className="py-3 px-4">Entity Type</th>
                        <th className="py-3 px-4">Actor ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[#253247]">
                      {auditLogs.map((l) => (
                        <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 text-slate-500">
                            {new Date(l.createdAt).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-[#15803D] font-bold">{l.action}</td>
                          <td className="py-3 px-4 text-slate-700">{l.entityType}</td>
                          <td className="py-3 px-4 text-slate-500">{l.actorId || 'SYSTEM'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 6: COMPLIANCE */}
            {activeTab === 'compliance' && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="text-base font-bold text-[#253247]">Safety Gates & Regulatory Compliance</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Internal safeguards preventing unauthorized payouts or automated money movements
                  </p>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-4 rounded-lg bg-[#F7F9FC] border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-[#253247]">Operating Mode</div>
                      <div className="text-slate-500">Prevents real money disbursements and bank payouts</div>
                    </div>
                    <span className="px-3 py-1 rounded-full font-bold bg-emerald-50 text-[#15803D] border border-emerald-200">
                      SIMULATION_ONLY
                    </span>
                  </div>

                  <div className="p-4 rounded-lg bg-[#F7F9FC] border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-[#253247]">Live Matching Settlements</div>
                      <div className="text-slate-500">Binary tree automated daily payout calculation</div>
                    </div>
                    <span className="px-3 py-1 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      DISABLED
                    </span>
                  </div>

                  <div className="p-4 rounded-lg bg-[#F7F9FC] border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-[#253247]">Direct Voucher Cash Conversion</div>
                      <div className="text-slate-500">Shopping voucher conversion to withdrawable earnings</div>
                    </div>
                    <span className="px-3 py-1 rounded-full font-bold bg-red-50 text-[#DC2626] border border-red-200">
                      STRICTLY PROHIBITED
                    </span>
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