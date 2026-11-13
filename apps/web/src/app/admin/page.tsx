'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  CheckCircle2,
  GitBranch,
  Wallet,
  Ticket,
  Bike,
  Scale,
  ShieldCheck,
  Activity,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  X,
  ChevronRight,
  ChevronLeft,
  Eye,
  ArrowUpRight,
  Lock,
  LogOut,
  Menu,
  ArrowLeft,
  Check,
  FileText,
  Clock,
  Play,
  XCircle,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { fetchApi, getStoredUser, logoutSession } from '../../lib/api';

type AdminTab =
  | 'overview'
  | 'members'
  | 'approvals'
  | 'binary'
  | 'finance'
  | 'vouchers'
  | 'bookings'
  | 'reconciliation'
  | 'audit';

export default function AdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Tab Data States
  const [overview, setOverview] = useState<any>(null);

  // Members Tab State
  const [members, setMembers] = useState<any[]>([]);
  const [membersTotal, setMembersTotal] = useState(0);
  const [membersPage, setMembersPage] = useState(1);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberPackageFilter, setMemberPackageFilter] = useState('');
  const [memberQualFilter, setMemberQualFilter] = useState('');
  const [selectedMemberDetails, setSelectedMemberDetails] = useState<any | null>(null);
  const [loadingMemberDetails, setLoadingMemberDetails] = useState(false);

  // Approvals Tab State
  const [membershipRequests, setMembershipRequests] = useState<any[]>([]);
  const [requestStatusFilter, setRequestStatusFilter] = useState('ALL');
  const [requestTypeFilter, setRequestTypeFilter] = useState('ALL');
  const [selectedRequestToReview, setSelectedRequestToReview] = useState<any | null>(null);
  const [reviewMode, setReviewMode] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Binary Tab State
  const [binaryTreeMemberId, setBinaryTreeMemberId] = useState('ASKR-ADMIN-01');
  const [binaryTreeData, setBinaryTreeData] = useState<any | null>(null);
  const [binaryReport, setBinaryReport] = useState<any | null>(null);
  const [binaryHistory, setBinaryHistory] = useState<any[]>([]);
  const [placementCandidates, setPlacementCandidates] = useState<any | null>(null);
  const [placeTargetUserId, setPlaceTargetUserId] = useState('');
  const [placeParentUserId, setPlaceParentUserId] = useState('');
  const [placeLeg, setPlaceLeg] = useState<'LEFT' | 'RIGHT'>('LEFT');
  const [isPlacingBinary, setIsPlacingBinary] = useState(false);
  const [loadingBinary, setLoadingBinary] = useState(false);
  const [settleTargetUserId, setSettleTargetUserId] = useState('');
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [isSettlingBinary, setIsSettlingBinary] = useState(false);
  const [settleResult, setSettleResult] = useState<any | null>(null);

  // Finance Tab State
  const [wallets, setWallets] = useState<any[]>([]);
  const [walletsTotal, setWalletsTotal] = useState(0);
  const [walletSearch, setWalletSearch] = useState('');
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerFilterType, setLedgerFilterType] = useState('');
  const [financeSubTab, setFinanceSubTab] = useState<'wallets' | 'ledger'>('wallets');

  // Vouchers Tab State
  const [vouchersData, setVouchersData] = useState<any | null>(null);
  const [voucherTransactions, setVoucherTransactions] = useState<any[]>([]);
  const [voucherSearch, setVoucherSearch] = useState('');
  const [voucherStatusFilter, setVoucherStatusFilter] = useState('ALL');
  const [voucherSubTab, setVoucherSubTab] = useState<'vouchers' | 'transactions'>('vouchers');

  // Bookings Tab State
  const [bookingsData, setBookingsData] = useState<any | null>(null);
  const [bookingStatusFilter, setBookingStatusFilter] = useState('ALL');
  const [bookingSearch, setBookingSearch] = useState('');
  const [selectedBookingToCancel, setSelectedBookingToCancel] = useState<any | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState('');
  const [isCancellingBooking, setIsCancellingBooking] = useState(false);

  // Reconciliation Tab State
  const [reconciliation, setReconciliation] = useState<any | null>(null);
  const [reconciliationSearch, setReconciliationSearch] = useState('');
  const [loadingReconciliation, setLoadingReconciliation] = useState(false);

  // Audit Tab State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [auditSearch, setAuditSearch] = useState('');
  const [suspiciousActivity, setSuspiciousActivity] = useState<any | null>(null);

  // 1. Initial Authentication & Verification
  useEffect(() => {
    const stored = getStoredUser();
    if (
      !stored ||
      !['SUPER_ADMIN', 'ADMIN_OPERATIONS', 'FINANCE_MANAGER'].includes(stored.role)
    ) {
      router.push('/auth/login');
      return;
    }
    setCurrentUser(stored);
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.allSettled([
        fetchOverview(),
        fetchMembers(1),
        fetchMembershipRequests(),
        fetchBinaryData('ASKR-ADMIN-01'),
        fetchWallets(),
        fetchLedger(),
        fetchVouchers(),
        fetchBookings(),
        fetchReconciliation(),
        fetchAuditLogs(),
      ]);
    } catch (err: any) {
      console.warn('Initial data load notice:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshCurrentTab = async () => {
    setRefreshing(true);
    try {
      if (activeTab === 'overview') await fetchOverview();
      else if (activeTab === 'members') await fetchMembers(membersPage);
      else if (activeTab === 'approvals') await fetchMembershipRequests();
      else if (activeTab === 'binary') await fetchBinaryData(binaryTreeMemberId);
      else if (activeTab === 'finance') {
        await Promise.allSettled([fetchWallets(), fetchLedger()]);
      } else if (activeTab === 'vouchers') await fetchVouchers();
      else if (activeTab === 'bookings') await fetchBookings();
      else if (activeTab === 'reconciliation') await fetchReconciliation();
      else if (activeTab === 'audit') await fetchAuditLogs();
      setActionSuccess('Data refreshed successfully.');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Refresh failed.');
    } finally {
      setRefreshing(false);
    }
  };

  // API Fetchers
  const fetchOverview = async () => {
    try {
      const data = await fetchApi<any>('/admin/overview');
      setOverview(data);
    } catch (err: any) {
      console.error('Failed to fetch overview metrics:', err);
    }
  };

  const fetchMembers = async (page = 1) => {
    try {
      let url = `/members/admin/list?page=${page}&limit=25`;
      if (memberSearch) url += `&search=${encodeURIComponent(memberSearch)}`;
      if (memberPackageFilter) url += `&package=${encodeURIComponent(memberPackageFilter)}`;
      if (memberQualFilter) url += `&isFullQualified=${encodeURIComponent(memberQualFilter)}`;
      const data = await fetchApi<any>(url);
      if (data?.members) {
        setMembers(data.members);
        setMembersTotal(data.total);
        setMembersPage(data.page);
      } else if (Array.isArray(data)) {
        setMembers(data);
        setMembersTotal(data.length);
      }
    } catch (err: any) {
      console.error('Failed to fetch members list:', err);
    }
  };

  const fetchMembershipRequests = async () => {
    try {
      let url = '/packages/admin/requests';
      const params: string[] = [];
      if (requestStatusFilter !== 'ALL') params.push(`status=${requestStatusFilter}`);
      if (requestTypeFilter !== 'ALL') params.push(`requestType=${requestTypeFilter}`);
      if (params.length > 0) url += `?${params.join('&')}`;
      const data = await fetchApi<any[]>(url);
      setMembershipRequests(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to fetch membership requests:', err);
    }
  };

  const fetchBinaryData = async (targetMemberId: string) => {
    setLoadingBinary(true);
    try {
      const normalizedMemberId = (targetMemberId || 'ASKR-ADMIN-01').trim();
      const [tree, report, candidates] = await Promise.all([
        fetchApi<any>(`/members/binary-tree?memberId=${encodeURIComponent(normalizedMemberId)}`).catch(() => null),
        fetchApi<any>('/members/admin/binary-report').catch(() => null),
        fetchApi<any>('/members/admin/binary-placement-candidates').catch(() => null),
      ]);
      const history = tree?.node?.userId
        ? await fetchApi<any[]>(`/members/binary/history?userId=${encodeURIComponent(tree.node.userId)}`).catch(() => [])
        : [];
      setBinaryTreeData(tree);
      setBinaryReport(report);
      setPlacementCandidates(candidates);
      setBinaryHistory(Array.isArray(history) ? history : []);

      if (candidates?.unplacedMembers?.length > 0 && !candidates.unplacedMembers.some((m: any) => m.id === placeTargetUserId)) {
        setPlaceTargetUserId(candidates.unplacedMembers[0].id);
      } else if (!candidates?.unplacedMembers?.length) {
        setPlaceTargetUserId('');
      }

      if (candidates?.availableParents?.length > 0) {
        const vacantParents = candidates.availableParents.filter((p: any) => p.hasVacantLeg);
        const preferredParent =
          vacantParents.find((p: any) => p.id === placeParentUserId) ||
          vacantParents[0] ||
          candidates.availableParents[0];
        if (preferredParent) {
          setPlaceParentUserId(preferredParent.id);
          if (!preferredParent.leftVacant && preferredParent.rightVacant) {
            setPlaceLeg('RIGHT');
          } else if (preferredParent.leftVacant && !preferredParent.rightVacant) {
            setPlaceLeg('LEFT');
          }
        }
      }
    } finally {
      setLoadingBinary(false);
    }
  };

  const fetchWallets = async () => {
    try {
      let url = '/admin/wallets?limit=50';
      if (walletSearch) url += `&search=${encodeURIComponent(walletSearch)}`;
      const data = await fetchApi<any>(url);
      if (data?.wallets) {
        setWallets(data.wallets);
        setWalletsTotal(data.total);
      }
    } catch (err: any) {
      console.error('Failed to fetch wallets:', err);
    }
  };

  const fetchLedger = async () => {
    try {
      let url = '/admin/ledger?limit=50';
      if (ledgerSearch) url += `&search=${encodeURIComponent(ledgerSearch)}`;
      if (ledgerFilterType) url += `&eventType=${encodeURIComponent(ledgerFilterType)}`;
      const data = await fetchApi<any>(url);
      if (data?.entries) {
        setLedgerEntries(data.entries);
        setLedgerTotal(data.total);
      }
    } catch (err: any) {
      console.error('Failed to fetch ledger:', err);
    }
  };

  const fetchVouchers = async () => {
    try {
      const [vouchers, txs] = await Promise.all([
        fetchApi<any>('/vouchers/admin/all').catch(() => null),
        fetchApi<any[]>('/admin/voucher-transactions').catch(() => []),
      ]);
      setVouchersData(vouchers);
      setVoucherTransactions(Array.isArray(txs) ? txs : []);
    } catch (err: any) {
      console.error('Failed to fetch vouchers:', err);
    }
  };

  const fetchBookings = async () => {
    try {
      const data = await fetchApi<any>('/ev-bikes/admin/bookings');
      setBookingsData(data);
    } catch (err: any) {
      console.error('Failed to fetch bookings:', err);
    }
  };

  const fetchReconciliation = async () => {
    setLoadingReconciliation(true);
    try {
      const data = await fetchApi<any>('/admin/financial-reconciliation');
      setReconciliation(data);
    } finally {
      setLoadingReconciliation(false);
    }
  };

  const fetchAuditLogs = async () => {
    let url = '/admin/audit-logs?limit=50';
    if (auditActionFilter) url += `&action=${encodeURIComponent(auditActionFilter)}`;
    if (auditSearch) url += `&search=${encodeURIComponent(auditSearch)}`;
    const [logsData, suspData] = await Promise.all([
      fetchApi<any>(url).catch(() => ({ logs: [], total: 0 })),
      fetchApi<any>('/admin/suspicious-activity').catch(() => null),
    ]);
    setAuditLogs(logsData.logs || (Array.isArray(logsData) ? logsData : []));
    setAuditTotal(logsData.total || 0);
    setSuspiciousActivity(suspData);
  };

  const handleOpenMemberDetails = async (memberId: string) => {
    setLoadingMemberDetails(true);
    setSelectedMemberDetails(null);
    try {
      const data = await fetchApi<any>(`/members/admin/details/${memberId}`);
      setSelectedMemberDetails(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load member profile details.');
    } finally {
      setLoadingMemberDetails(false);
    }
  };

  // Membership Review Actions
  const handleReviewMembershipRequest = async () => {
    if (!selectedRequestToReview || !reviewMode) return;
    setIsSubmittingReview(true);
    setError(null);
    try {
      const endpoint =
        reviewMode === 'APPROVE'
          ? `/packages/admin/requests/${selectedRequestToReview.id}/approve`
          : `/packages/admin/requests/${selectedRequestToReview.id}/reject`;

      await fetchApi<any>(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          adminNotes:
            reviewMode === 'APPROVE'
              ? 'Approved via Admin Operations Console (Simulation Mode)'
              : rejectNotes || 'Rejected by Admin review',
        }),
      });

      setActionSuccess(
        `Membership Request ${selectedRequestToReview.id.slice(0, 8)} successfully ${
          reviewMode === 'APPROVE' ? 'APPROVED' : 'REJECTED'
        }!`
      );
      setSelectedRequestToReview(null);
      setReviewMode(null);
      setRejectNotes('');
      await Promise.all([fetchMembershipRequests(), fetchOverview(), fetchReconciliation()]);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Review action failed.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Binary Placement Action (Structure & Volume only; never triggers matching payout)
  const handlePlaceBinaryNode = async () => {
    if (!placeTargetUserId || !placeParentUserId || !placeLeg) return;
    setIsPlacingBinary(true);
    setError(null);
    try {
      const res = await fetchApi<any>('/members/binary/place', {
        method: 'POST',
        body: JSON.stringify({
          userId: placeTargetUserId,
          parentId: placeParentUserId,
          leg: placeLeg,
        }),
      });
      setActionSuccess(res.message || 'Member placed in binary tree cleanly.');
      await Promise.all([
        fetchBinaryData(binaryTreeMemberId),
        fetchOverview(),
        fetchMembers(membersPage),
      ]);
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Binary placement failed.');
    } finally {
      setIsPlacingBinary(false);
    }
  };

  // Binary Settlement Action
  const handleExecuteBinaryMatching = async () => {
    if (!settleTargetUserId) return;
    setIsSettlingBinary(true);
    setSettleResult(null);
    setError(null);
    try {
      const res = await fetchApi<any>('/members/binary/run-matching', {
        method: 'POST',
        body: JSON.stringify({
          userId: settleTargetUserId,
          idempotencyKey: `IDEM-ADMIN-BIN-${Date.now()}`,
        }),
      });
      setSettleResult(res);
      setActionSuccess(`Binary matching executed! Settled ${res.matchesSettled} matches (₹${res.rewardINR}).`);
      await Promise.all([
        fetchBinaryData(binaryTreeMemberId),
        fetchOverview(),
        fetchWallets(),
        fetchReconciliation(),
      ]);
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Binary settlement failed.');
    } finally {
      setIsSettlingBinary(false);
    }
  };

  // EV Booking Cancellation Action
  const handleCancelBooking = async () => {
    if (!selectedBookingToCancel) return;
    setIsCancellingBooking(true);
    setError(null);
    try {
      const res = await fetchApi<any>(`/ev-bikes/bookings/${selectedBookingToCancel.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({
          cancellationReason: cancelReasonInput || 'Cancelled by Admin Operations',
        }),
      });
      setActionSuccess(
        `Booking #${selectedBookingToCancel.bookingNumber} successfully cancelled! Restored ₹${res.voucherRestoredINR} to member voucher.`
      );
      setSelectedBookingToCancel(null);
      setCancelReasonInput('');
      await Promise.all([fetchBookings(), fetchVouchers(), fetchReconciliation(), fetchOverview()]);
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Booking cancellation failed.');
    } finally {
      setIsCancellingBooking(false);
    }
  };

  const handleLogout = async () => {
    await logoutSession();
    router.push('/auth/login');
  };

  // Filtered Vouchers
  const filteredVouchers = useMemo(() => {
    if (!vouchersData?.vouchers) return [];
    return vouchersData.vouchers.filter((v: any) => {
      const matchesSearch =
        !voucherSearch ||
        v.voucherCode.toLowerCase().includes(voucherSearch.toLowerCase()) ||
        v.memberId.toLowerCase().includes(voucherSearch.toLowerCase()) ||
        v.memberName.toLowerCase().includes(voucherSearch.toLowerCase());
      const matchesStatus =
        voucherStatusFilter === 'ALL' || v.status === voucherStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [vouchersData, voucherSearch, voucherStatusFilter]);

  // Filtered Bookings
  const filteredBookings = useMemo(() => {
    if (!bookingsData?.bookings) return [];
    return bookingsData.bookings.filter((b: any) => {
      const matchesSearch =
        !bookingSearch ||
        b.bookingNumber.toLowerCase().includes(bookingSearch.toLowerCase()) ||
        b.memberId.toLowerCase().includes(bookingSearch.toLowerCase()) ||
        b.memberName.toLowerCase().includes(bookingSearch.toLowerCase()) ||
        b.bikeName.toLowerCase().includes(bookingSearch.toLowerCase());
      const matchesStatus =
        bookingStatusFilter === 'ALL' ||
        (bookingStatusFilter === 'CONFIRMED'
          ? b.bookingStatus === 'CONFIRMED' || b.bookingStatus === 'PAYMENT_VERIFIED'
          : b.bookingStatus === bookingStatusFilter);
      return matchesSearch && matchesStatus;
    });
  }, [bookingsData, bookingSearch, bookingStatusFilter]);

  // Filtered Member Reconciliation Table
  const filteredMemberReconciliation = useMemo(() => {
    if (!reconciliation?.perMember?.memberDetails) return [];
    return reconciliation.perMember.memberDetails.filter((m: any) => {
      if (!reconciliationSearch) return true;
      const term = reconciliationSearch.toLowerCase();
      return (
        m.memberId.toLowerCase().includes(term) ||
        m.fullName.toLowerCase().includes(term)
      );
    });
  }, [reconciliation, reconciliationSearch]);

  const navItems: { id: AdminTab; label: string; icon: any; count?: number; badgeColor?: string }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'members', label: 'Members', icon: Users, count: membersTotal },
    {
      id: 'approvals',
      label: 'Membership Requests',
      icon: CheckCircle2,
      count: overview?.requests?.pending || 0,
      badgeColor: 'bg-amber-500 text-white',
    },
    { id: 'binary', label: 'Binary Network', icon: GitBranch },
    { id: 'finance', label: 'Financial Ledger', icon: Wallet },
    { id: 'vouchers', label: 'Shopping Vouchers', icon: Ticket, count: vouchersData?.metrics?.totalVouchers },
    { id: 'bookings', label: 'EV Bookings', icon: Bike, count: bookingsData?.metrics?.totalBookings },
    {
      id: 'reconciliation',
      label: 'Reconciliation',
      icon: Scale,
      count: reconciliation?.status === 'RECONCILED' ? undefined : 1,
      badgeColor: 'bg-red-500 text-white',
    },
    { id: 'audit', label: 'Audit & Security', icon: ShieldCheck, count: auditTotal },
  ];

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center font-sans">
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center max-w-sm w-full space-y-4">
          <div className="w-10 h-10 rounded-lg bg-[#165DAD] text-white flex items-center justify-center font-bold text-sm mx-auto shadow-sm animate-pulse">
            AE
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-[#253247]">ASKR EV Operations Center</h2>
            <p className="text-xs text-slate-500">Verifying administrative security session...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#253247] flex flex-col font-sans">
      {/* 1. TOP STICKY ENTERPRISE HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-2 h-16 min-w-0">
            {/* Left: Branding & Mobile Menu Toggle */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden shrink-0 p-2 rounded-lg text-slate-500 hover:text-[#253247] hover:bg-slate-100"
                aria-label="Toggle navigation"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 shrink-0 rounded-lg bg-[#165DAD] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  AE
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs sm:text-sm text-[#253247] tracking-tight truncate">
                    ASKR EV Operations Center
                  </div>
                  <div className="hidden sm:block text-[10px] text-slate-500 font-medium truncate">
                    Corporate Admin Platform
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Role, Compliance Badge, Portal Link & Logout */}
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              <span className="inline-flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                <Lock className="w-3 h-3 shrink-0 text-amber-600" />
                <span className="hidden sm:inline">SIMULATION_ONLY</span>
                <span className="sm:hidden">SIM</span>
              </span>

              <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-semibold text-slate-700">{currentUser?.fullName}</span>
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  ({currentUser?.role?.replace('_', ' ')})
                </span>
              </div>

              <div className="hidden sm:block h-5 w-px bg-slate-200" />

              <button
                onClick={handleRefreshCurrentTab}
                disabled={refreshing}
                className="p-2 rounded-lg text-slate-500 hover:text-[#165DAD] hover:bg-slate-50 transition-colors"
                title="Refresh current data"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#165DAD]' : ''}`} />
              </button>

              <Link
                href="/dashboard"
                className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-[#165DAD] px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                title="Member Portal"
              >
                <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden lg:inline">Member Portal</span>
              </Link>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-red-600 px-2 sm:px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                title="Sign out of console"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 2. NOTIFICATIONS & ALERTS */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 w-full">
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center justify-between mb-4 shadow-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-xs font-bold text-red-500 hover:text-red-800"
            >
              Dismiss
            </button>
          </div>
        )}

        {actionSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between mb-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button
              onClick={() => setActionSuccess(null)}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-900"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* 3. MAIN DASHBOARD CONTENT WITH PERSISTENT SIDEBAR */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex-1 w-full">
        <div className="flex flex-col md:flex-row gap-6">
          {/* LEFT SIDEBAR NAVIGATION */}
          <aside
            className={`md:w-64 shrink-0 md:block ${
              mobileMenuOpen ? 'block' : 'hidden'
            } bg-white rounded-xl border border-slate-200 p-3 shadow-sm h-fit space-y-1`}
          >
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Operations Center
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
                      ? 'bg-blue-50 text-[#165DAD] font-bold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-[#253247]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#165DAD]' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && item.count > 0 && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        item.badgeColor
                          ? item.badgeColor
                          : isActive
                          ? 'bg-[#165DAD] text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Sidebar Footer Info */}
            <div className="pt-4 mt-4 border-t border-slate-100 px-3">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Ledger Engine
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Simulated Mode Active</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                PostgreSQL • Double-Entry Balanced
              </p>
            </div>
          </aside>

          {/* RIGHT ACTIVE TAB CONTENT AREA */}
          <main className="flex-1 min-w-0 space-y-6">
            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Header Welcome Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-xl font-bold text-[#253247] tracking-tight">
                        Executive Operations & Financial Controller
                      </h1>
                      <p className="text-xs text-slate-500 mt-1">
                        High-integrity administration dashboard backed by live PostgreSQL double-entry financial ledger.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Check className="w-3.5 h-3.5" />
                        <span>Ledger Equilibrium 100%</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* 1. Members Breakdown Grid */}
                <div>
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Membership Packages & Qualification Counts
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <div className="text-[11px] font-semibold text-slate-500">Total Accounts</div>
                      <div className="text-2xl font-bold text-[#253247] mt-1">
                        {overview?.memberships?.totalRegistered ?? '...'}
                      </div>
                      <div className="text-[10px] text-emerald-600 font-semibold mt-1">
                        +{overview?.memberships?.newRegistrationsLast7Days ?? 0} in last 7 days
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <div className="text-[11px] font-semibold text-slate-500">Free Package</div>
                      <div className="text-2xl font-bold text-slate-600 mt-1">
                        {overview?.memberships?.freePackageMembers ?? overview?.memberships?.freeUsers ?? '...'}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">Package Tier: FREE</div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <div className="text-[11px] font-semibold text-slate-500">Basic Package</div>
                      <div className="text-2xl font-bold text-[#165DAD] mt-1">
                        {overview?.memberships?.basicMembers ?? '...'}
                      </div>
                      <div className="text-[10px] text-blue-600 mt-1">₹3,000 Platform Fee</div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <div className="text-[11px] font-semibold text-slate-500">Full Package</div>
                      <div className="text-2xl font-bold text-emerald-700 mt-1">
                        {overview?.memberships?.fullMembers ?? '...'}
                      </div>
                      <div className="text-[10px] text-emerald-600 mt-1">₹33,000 Total Package</div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <div className="text-[11px] font-semibold text-slate-500">Full Qualified</div>
                      <div className="text-2xl font-bold text-purple-700 mt-1">
                        {overview?.memberships?.fullQualified ?? '...'}
                      </div>
                      <div className="text-[10px] text-purple-600 font-semibold mt-1">Matching Eligible</div>
                    </div>
                  </div>
                  {overview?.roles && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                      <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                        System Role Breakdown:
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-white border border-slate-200">
                        FREE_USER Role: <strong>{overview.roles.freeUserRole}</strong>
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-white border border-slate-200">
                        MEMBER Role: <strong>{overview.roles.memberRole}</strong>
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-white border border-slate-200">
                        Admin / Ops / Finance Roles: <strong>{overview.roles.staffAdminRoles}</strong>
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. Financial Liabilities & Simulated Reserves */}
                <div>
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Simulated Financial Ledger Liabilities
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                        <span>Available Earnings Liability</span>
                        <Wallet className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="text-xl font-bold text-emerald-700 mt-1">
                        ₹{overview?.financialLiabilities?.totalAvailableEarningsPayableINR?.toLocaleString('en-IN') ?? '0'}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        General Ledger Account 2000
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                        <span>Voucher Liability Outstanding</span>
                        <Ticket className="w-4 h-4 text-[#165DAD]" />
                      </div>
                      <div className="text-xl font-bold text-[#165DAD] mt-1">
                        ₹{overview?.financialLiabilities?.totalOutstandingVoucherLiabilityINR?.toLocaleString('en-IN') ?? '0'}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        General Ledger Account 2100
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                        <span>Vouchers Redeemed</span>
                        <Scale className="w-4 h-4 text-slate-500" />
                      </div>
                      <div className="text-xl font-bold text-slate-700 mt-1">
                        ₹{overview?.financialLiabilities?.totalVouchersRedeemedINR?.toLocaleString('en-IN') ?? '0'}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        Applied to EV Booking Deposits
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                        <span>Binary Matching Disbursed</span>
                        <GitBranch className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="text-xl font-bold text-purple-700 mt-1">
                        ₹{overview?.financialLiabilities?.totalBinaryRewardsINR?.toLocaleString('en-IN') ?? '0'}
                      </div>
                      <div className="text-[10px] text-purple-600 font-semibold mt-1">
                        {overview?.financialLiabilities?.totalBinaryMatchesSettled ?? 0} matches @ ₹3,000
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. EV Bookings & Quick System Health */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* EV Bookings Summary Card */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-bold text-sm text-[#253247] flex items-center gap-2">
                        <Bike className="w-4 h-4 text-[#165DAD]" />
                        <span>EV Bookings Summary</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        Simulation Orders
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2">
                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-center">
                        <div className="text-lg font-bold text-[#253247]">
                          {overview?.commerce?.totalBookings ?? 0}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">Total Bookings</div>
                      </div>
                      <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-center">
                        <div className="text-lg font-bold text-emerald-700">
                          {overview?.commerce?.confirmedBookings ?? 0}
                        </div>
                        <div className="text-[10px] text-emerald-600 font-medium">Confirmed</div>
                      </div>
                      <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-center">
                        <div className="text-lg font-bold text-red-700">
                          {overview?.commerce?.cancelledBookings ?? 0}
                        </div>
                        <div className="text-[10px] text-red-600 font-medium">Cancelled</div>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-100">
                      <span className="text-slate-500 font-medium">Vouchers Applied:</span>
                      <span className="font-bold text-[#165DAD]">
                        ₹{overview?.commerce?.totalVoucherAppliedINR?.toLocaleString('en-IN') ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Simulated Cash Paid:</span>
                      <span className="font-bold text-slate-700">
                        ₹{overview?.commerce?.totalNetCashPaidINR?.toLocaleString('en-IN') ?? 0}
                      </span>
                    </div>
                  </div>

                  {/* System Audit & Health */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-bold text-sm text-[#253247] flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>System Health & Compliance</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {overview?.system?.reconciliationStatus ?? 'RECONCILED'}
                      </span>
                    </div>

                    <div className="space-y-2.5 pt-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Unbalanced Journal Entries:</span>
                        <span className="font-bold text-emerald-600">
                          {overview?.system?.unbalancedJournalCount ?? 0} (Strict 0)
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Pending Review Requests:</span>
                        <span className="font-bold text-amber-600">
                          {overview?.requests?.pending ?? 0} awaiting review
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Suspicious Reference Alerts:</span>
                        <span className="font-bold text-slate-700">
                          {overview?.system?.suspiciousAlertsCount ?? 0} detected
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Live External Payouts:</span>
                        <span className="font-bold text-red-600">
                          DISABLED (Simulation Mode Locked)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Admin Actions */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-sm text-[#253247] flex items-center gap-2">
                      <Activity className="w-4 h-4 text-slate-500" />
                      <span>Recent Administrative Actions</span>
                    </h3>
                    <button
                      onClick={() => setActiveTab('audit')}
                      className="text-xs font-semibold text-[#165DAD] hover:underline"
                    >
                      View All Audit Logs →
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {overview?.recentActions?.map((act: any) => (
                      <div key={act.id} className="py-2.5 flex items-center justify-between gap-2 text-xs min-w-0">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 truncate max-w-[160px] sm:max-w-none">
                            {act.action}
                          </span>
                          <span className="text-slate-600 truncate min-w-0">
                            {act.entityType} ({act.entityId?.slice(0, 8)})
                          </span>
                        </div>
                        <span className="shrink-0 text-[11px] text-slate-400">
                          {new Date(act.createdAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: MEMBERS */}
            {activeTab === 'members' && (
              <div className="space-y-4">
                {/* Search & Filter Bar */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search Member ID, name, email, phone..."
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchMembers(1)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-[#165DAD]"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <select
                      value={memberPackageFilter}
                      onChange={(e) => {
                        setMemberPackageFilter(e.target.value);
                      }}
                      className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-[#165DAD]"
                    >
                      <option value="">All Packages</option>
                      <option value="FREE">Free</option>
                      <option value="BASIC">Basic (₹3k)</option>
                      <option value="FULL">Full (₹33k)</option>
                    </select>

                    <select
                      value={memberQualFilter}
                      onChange={(e) => {
                        setMemberQualFilter(e.target.value);
                      }}
                      className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-[#165DAD]"
                    >
                      <option value="">All Qualifications</option>
                      <option value="true">Full Qualified</option>
                      <option value="false">Unqualified</option>
                    </select>

                    <button
                      onClick={() => fetchMembers(1)}
                      className="px-3.5 py-2 rounded-lg bg-[#165DAD] text-white text-xs font-semibold hover:bg-[#124b8c] transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                </div>

                {/* Members Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F7F9FC] text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Member ID</th>
                          <th className="py-3 px-4">Full Name</th>
                          <th className="py-3 px-4">Package</th>
                          <th className="py-3 px-4">Qualification</th>
                          <th className="py-3 px-4">Sponsor</th>
                          <th className="py-3 px-4 text-right">Available Earnings</th>
                          <th className="py-3 px-4 text-right">Voucher Balance</th>
                          <th className="py-3 px-4 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {members.length > 0 ? (
                          members.map((m) => (
                            <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4 font-mono font-bold text-[#165DAD]">
                                {m.memberId}
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-bold text-[#253247]">{m.fullName}</div>
                                <div className="text-[10px] text-slate-400">
                                  {m.email} • Role: <span className="font-mono font-semibold text-slate-600">{m.role}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                    m.currentPackage === 'FULL'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : m.currentPackage === 'BASIC'
                                      ? 'bg-blue-50 text-[#165DAD] border-blue-200'
                                      : 'bg-slate-100 text-slate-600 border-slate-200'
                                  }`}
                                >
                                  {m.currentPackage}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                {m.isFullQualified ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                    <Check className="w-3 h-3" /> Full Qualified
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-semibold text-slate-400">
                                    Unqualified
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                {m.sponsorMemberId ? (
                                  <div>
                                    <span className="font-mono font-semibold text-slate-700">
                                      {m.sponsorMemberId}
                                    </span>
                                    <div className="text-[10px] text-slate-400">{m.sponsorName}</div>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic">None (Root)</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-emerald-700">
                                ₹{m.wallet?.availableEarningsINR?.toLocaleString('en-IN') ?? 0}
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-[#165DAD]">
                                ₹{m.wallet?.shoppingVoucherINR?.toLocaleString('en-IN') ?? 0}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <button
                                  onClick={() => handleOpenMemberDetails(m.id)}
                                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-[#165DAD] hover:text-white text-slate-700 text-[11px] font-semibold transition-colors"
                                >
                                  Details
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-slate-400">
                              No members found matching your search.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  <div className="p-3 bg-[#F7F9FC] border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      Total {membersTotal} registered members (Page {membersPage})
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => fetchMembers(membersPage - 1)}
                        disabled={membersPage <= 1}
                        className="px-2.5 py-1 rounded border border-slate-200 bg-white disabled:opacity-50 font-semibold"
                      >
                        Prev
                      </button>
                      <button
                        onClick={() => fetchMembers(membersPage + 1)}
                        disabled={members.length < 25}
                        className="px-2.5 py-1 rounded border border-slate-200 bg-white disabled:opacity-50 font-semibold"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: MEMBERSHIP APPROVALS */}
            {activeTab === 'approvals' && (
              <div className="space-y-4">
                {/* Status Tabs */}
                <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2">
                    {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
                      <button
                        key={st}
                        onClick={() => {
                          setRequestStatusFilter(st);
                          fetchMembershipRequests();
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          requestStatusFilter === st
                            ? 'bg-[#165DAD] text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>

                  <select
                    value={requestTypeFilter}
                    onChange={(e) => {
                      setRequestTypeFilter(e.target.value);
                      fetchMembershipRequests();
                    }}
                    className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700"
                  >
                    <option value="ALL">All Request Types</option>
                    <option value="BASIC_ACTIVATION">Basic Activation (₹3k)</option>
                    <option value="FULL_ACTIVATION">Full Activation (₹33k)</option>
                    <option value="BASIC_TO_FULL_UPGRADE">Upgrade to Full (₹30k)</option>
                  </select>
                </div>

                {/* Membership Requests Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F7F9FC] text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Request ID</th>
                          <th className="py-3 px-4">Member</th>
                          <th className="py-3 px-4">Request Type</th>
                          <th className="py-3 px-4">Fee (Simulated)</th>
                          <th className="py-3 px-4">Submitted At</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {membershipRequests.length > 0 ? (
                          membershipRequests.map((req) => (
                            <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4 font-mono font-bold text-slate-600">
                                {req.id.slice(0, 8)}...
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-bold text-[#253247]">{req.user?.fullName}</div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {req.user?.memberId} • Sponsor: {req.user?.sponsor?.memberId || 'None'}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span className="font-semibold text-slate-700">
                                  {req.requestType.replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-bold text-[#165DAD]">
                                ₹{req.feeINR?.toLocaleString('en-IN') ?? 0}
                              </td>
                              <td className="py-3 px-4 text-slate-500">
                                {new Date(req.createdAt).toLocaleDateString('en-IN')}
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                    req.status === 'APPROVED'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : req.status === 'PENDING'
                                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                                      : 'bg-red-50 text-red-700 border-red-200'
                                  }`}
                                >
                                  {req.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                {req.status === 'PENDING' ? (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      onClick={() => {
                                        setSelectedRequestToReview(req);
                                        setReviewMode('APPROVE');
                                      }}
                                      className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-colors"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSelectedRequestToReview(req);
                                        setReviewMode('REJECT');
                                      }}
                                      className="px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[11px] font-bold transition-colors"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-slate-400 italic">
                                    Reviewed ({req.status})
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-400">
                              No membership requests found for this filter.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: BINARY NETWORK */}
            {activeTab === 'binary' && (
              <div className="space-y-4">
                {/* Rule & Coverage Summary Strip */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Matching Ratio
                    </div>
                    <div className="text-base font-bold text-[#165DAD] mt-1">
                      {binaryReport?.matchingRules?.ratio || '1:1'} (1 Left : 1 Right)
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      ₹3,000/pair • 15 matches/day max
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Unplaced Activated
                    </div>
                    <div className="text-base font-bold text-amber-700 mt-1">
                      {placementCandidates?.summary?.unplacedCount ?? 0} Members
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      BASIC & FULL ready for placement
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Placed in Tree
                    </div>
                    <div className="text-base font-bold text-emerald-700 mt-1">
                      {placementCandidates?.summary?.placedCount ?? 0} Members
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Of {placementCandidates?.summary?.totalEligibleMembers ?? 0} activated accounts
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Today Settled ({binaryReport?.todayActivity?.matchDate || 'IST'})
                    </div>
                    <div className="text-base font-bold text-[#253247] mt-1">
                      {binaryReport?.todayActivity?.matchesSettledToday ?? 0} Matches
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      ₹{(binaryReport?.todayActivity?.rewardTodayINR ?? 0).toLocaleString('en-IN')} simulated
                    </div>
                  </div>
                </div>

                {/* Admin Manual Binary Placement Workflow */}
                {(() => {
                  const selectedParentObj = placementCandidates?.availableParents?.find(
                    (p: any) => p.id === placeParentUserId
                  );
                  const unplacedList = placementCandidates?.unplacedMembers || [];
                  const parentsList = (placementCandidates?.availableParents || []).filter(
                    (p: any) => p.id !== placeTargetUserId
                  );

                  return (
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <h3 className="font-bold text-sm text-[#253247] flex items-center gap-2">
                            <GitBranch className="w-4 h-4 text-[#165DAD]" />
                            <span>Manual Binary Placement Console</span>
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Assign activated BASIC or FULL members to a vacant LEFT or RIGHT leg. Sponsor relationship remains separate and settlement is never auto-triggered on placement.
                          </p>
                        </div>
                        <span className="self-start text-[11px] font-semibold px-2.5 py-1 rounded bg-blue-50 text-[#165DAD] border border-blue-200">
                          Atomic Row-Locked Placement
                        </span>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                        {/* Left Column: Unplaced Activated Members Queue */}
                        <div className="lg:col-span-6 space-y-2">
                          <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                            <span>Unplaced Activated Members ({unplacedList.length})</span>
                            {unplacedList.length > 0 && (
                              <span className="text-[11px] font-medium text-amber-700">
                                Click Select to place
                              </span>
                            )}
                          </div>
                          {unplacedList.length === 0 ? (
                            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                              All activated BASIC and FULL members currently have binary tree placements.
                            </div>
                          ) : (
                            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-64 overflow-y-auto">
                              {unplacedList.map((m: any) => {
                                const isSelected = placeTargetUserId === m.id;
                                return (
                                  <div
                                    key={m.id}
                                    className={`p-3 flex items-center justify-between gap-3 text-xs ${
                                      isSelected ? 'bg-blue-50/80' : 'bg-white hover:bg-slate-50'
                                    }`}
                                  >
                                    <div className="min-w-0">
                                      <div className="font-bold text-[#253247] truncate">
                                        {m.fullName}{' '}
                                        <span className="font-mono text-[#165DAD]">({m.memberId})</span>
                                      </div>
                                      <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5">
                                        <span
                                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                            m.currentPackage === 'FULL'
                                              ? 'bg-blue-50 text-[#165DAD] border-blue-200'
                                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                          }`}
                                        >
                                          {m.currentPackage}
                                        </span>
                                        <span>•</span>
                                        <span>
                                          {m.isFullQualified ? 'Full Qualified (+1 Vol)' : 'Basic (+1 Count, 0 Vol)'}
                                        </span>
                                        <span>•</span>
                                        <span>Sponsor: {m.sponsorMemberId || 'None'}</span>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setPlaceTargetUserId(m.id)}
                                      className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                                        isSelected
                                          ? 'bg-[#165DAD] text-white border-[#165DAD]'
                                          : 'bg-white text-[#165DAD] border-blue-200 hover:bg-blue-50'
                                      }`}
                                    >
                                      {isSelected ? 'Selected' : 'Select'}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Right Column: Target, Parent & Leg Selector */}
                        <div className="lg:col-span-6 bg-[#F7F9FC] rounded-xl border border-slate-200 p-4 space-y-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              1. Member to Place
                            </label>
                            <select
                              value={placeTargetUserId}
                              onChange={(e) => setPlaceTargetUserId(e.target.value)}
                              disabled={unplacedList.length === 0}
                              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#165DAD]"
                            >
                              {unplacedList.length === 0 ? (
                                <option value="">No unplaced activated members</option>
                              ) : (
                                unplacedList.map((m: any) => (
                                  <option key={m.id} value={m.id}>
                                    {m.memberId} — {m.fullName} ({m.currentPackage} • {m.isFullQualified ? 'Qualified' : 'Unqualified'})
                                  </option>
                                ))
                              )}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              2. Binary Parent Node
                            </label>
                            <select
                              value={placeParentUserId}
                              onChange={(e) => {
                                const pid = e.target.value;
                                setPlaceParentUserId(pid);
                                const p = parentsList.find((x: any) => x.id === pid);
                                if (p) {
                                  if (!p.leftVacant && p.rightVacant) setPlaceLeg('RIGHT');
                                  else if (p.leftVacant && !p.rightVacant) setPlaceLeg('LEFT');
                                }
                              }}
                              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#165DAD]"
                            >
                              {parentsList.map((p: any) => (
                                <option key={p.id} value={p.id} disabled={!p.hasVacantLeg}>
                                  {p.memberId} — {p.fullName} [L:{p.leftVacant ? 'Vacant' : p.leftChild?.memberId} | R:{p.rightVacant ? 'Vacant' : p.rightChild?.memberId}]
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              3. Target Leg under Parent
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              {(['LEFT', 'RIGHT'] as const).map((legOption) => {
                                const isVacant =
                                  legOption === 'LEFT'
                                    ? selectedParentObj?.leftVacant ?? true
                                    : selectedParentObj?.rightVacant ?? true;
                                const occupant =
                                  legOption === 'LEFT'
                                    ? selectedParentObj?.leftChild
                                    : selectedParentObj?.rightChild;
                                const isChosen = placeLeg === legOption;
                                return (
                                  <button
                                    key={legOption}
                                    type="button"
                                    disabled={!isVacant}
                                    onClick={() => setPlaceLeg(legOption)}
                                    className={`p-2.5 rounded-lg border text-left text-xs transition-colors ${
                                      !isVacant
                                        ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                        : isChosen
                                        ? 'bg-blue-50 border-[#165DAD] text-[#165DAD] font-bold'
                                        : 'bg-white border-slate-200 text-slate-700 hover:border-[#165DAD]'
                                    }`}
                                  >
                                    <div className="font-bold">{legOption} LEG</div>
                                    <div className="text-[10px] mt-0.5 truncate">
                                      {isVacant
                                        ? 'Vacant slot available'
                                        : `Occupied by ${occupant?.memberId || 'Member'}`}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handlePlaceBinaryNode}
                            disabled={
                              isPlacingBinary ||
                              !placeTargetUserId ||
                              !placeParentUserId ||
                              !selectedParentObj ||
                              (placeLeg === 'LEFT' && !selectedParentObj.leftVacant) ||
                              (placeLeg === 'RIGHT' && !selectedParentObj.rightVacant)
                            }
                            className="w-full py-2.5 px-4 rounded-lg bg-[#165DAD] hover:bg-[#124b8c] text-white text-xs font-bold disabled:opacity-50 transition-colors"
                          >
                            {isPlacingBinary ? 'Placing Member...' : `Place Member on ${placeLeg} Leg`}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Binary Explorer Control Bar */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <span className="text-xs font-bold text-slate-600">Inspect Node:</span>
                    <input
                      type="text"
                      value={binaryTreeMemberId}
                      onChange={(e) => setBinaryTreeMemberId(e.target.value)}
                      placeholder="e.g. ASKR-ADMIN-01"
                      className="px-3 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-200 focus:outline-none focus:border-[#165DAD] w-40"
                    />
                    <button
                      onClick={() => fetchBinaryData(binaryTreeMemberId)}
                      disabled={loadingBinary}
                      className="px-3.5 py-1.5 rounded-lg bg-[#165DAD] text-white text-xs font-semibold hover:bg-[#124b8c]"
                    >
                      Explore
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBinaryTreeMemberId('ASKR-ADMIN-01');
                        fetchBinaryData('ASKR-ADMIN-01');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"
                    >
                      Root (ASKR-ADMIN-01)
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setSettleTargetUserId(binaryTreeData?.node?.userId || '');
                      setSettleModalOpen(true);
                    }}
                    className="w-full sm:w-auto px-4 py-2 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Trigger Binary Matching Settlement</span>
                  </button>
                </div>

                {/* Binary Network Interactive Tree Visualizer */}
                {binaryTreeData?.node ? (
                  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="font-bold text-sm text-[#253247]">
                          Binary Placement Tree for {binaryTreeData.node.user.fullName} ({binaryTreeData.node.user.memberId})
                        </h3>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Direct Sponsor: {binaryTreeData.node.sponsor?.memberId || 'Root'} • Parent: {binaryTreeData.node.parent ? `${binaryTreeData.node.parent.memberId} (${binaryTreeData.node.parent.leg})` : 'Root / Unplaced'}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded bg-blue-50 text-[#165DAD] border border-blue-200">
                          Ratio: 1:1 (₹3,000/match)
                        </span>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded bg-purple-50 text-purple-700 border border-purple-200">
                          Today: {binaryTreeData.node.todayMatchesSettled ?? 0} / 15 Cap
                        </span>
                      </div>
                    </div>

                    {/* ROOT NODE CARD */}
                    <div className="flex justify-center">
                      <div className="w-full max-w-xs bg-blue-50 border-2 border-[#165DAD] rounded-xl p-4 shadow-sm text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#165DAD] text-white uppercase">
                          {binaryTreeData.node.parent ? `Node (${binaryTreeData.node.parent.leg})` : 'Root / Unplaced'}
                        </span>
                        <div className="font-bold text-sm text-[#253247] mt-1.5">
                          {binaryTreeData.node.user.fullName}
                        </div>
                        <div className="text-xs font-mono font-bold text-[#165DAD]">
                          {binaryTreeData.node.user.memberId}
                        </div>
                        <div className="text-[10px] text-slate-600 mt-1">
                          {binaryTreeData.node.user.currentPackage} • {binaryTreeData.node.user.isFullQualified ? 'Full Qualified' : 'Not Full Qualified'}
                        </div>

                        <div className="mt-2.5 pt-2.5 border-t border-blue-200/60 grid grid-cols-2 text-[11px]">
                          <div className="border-r border-blue-200 pr-2">
                            <div className="text-slate-500">Left Count / Vol</div>
                            <div className="font-bold text-slate-800">
                              {binaryTreeData.node.leftCount} / {binaryTreeData.node.leftVolumeUnits ?? 0}u
                            </div>
                            <div className="text-[10px] text-emerald-700 font-bold">
                              Carry: {binaryTreeData.node.carryLeftUnits ?? 0} Units
                            </div>
                          </div>
                          <div className="pl-2">
                            <div className="text-slate-500">Right Count / Vol</div>
                            <div className="font-bold text-slate-800">
                              {binaryTreeData.node.rightCount} / {binaryTreeData.node.rightVolumeUnits ?? 0}u
                            </div>
                            <div className="text-[10px] text-emerald-700 font-bold">
                              Carry: {binaryTreeData.node.carryRightUnits ?? 0} Units
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* LEFT & RIGHT BRANCHES (2 LEVELS) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      {[
                        { label: 'LEFT LEG', child: binaryTreeData.leftChild, accent: 'text-[#165DAD]' },
                        { label: 'RIGHT LEG', child: binaryTreeData.rightChild, accent: 'text-purple-700' },
                      ].map(({ label, child, accent }) => (
                        <div key={label} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold ${accent}`}>{label}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Subtree</span>
                          </div>
                          {child ? (
                            <div className="space-y-3">
                              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="font-bold text-xs text-[#253247]">{child.fullName}</div>
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                                    {child.currentPackage}
                                  </span>
                                </div>
                                <div className={`text-[11px] font-mono ${accent}`}>{child.memberId}</div>
                                <div className="text-[10px] text-slate-500">
                                  {child.isFullQualified ? 'Full Qualified' : 'Unqualified (BASIC)'} • Vol: {child.leftVolumeUnits}L / {child.rightVolumeUnits}R
                                </div>
                                <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                                  <span>Left: {child.leftCount}</span>
                                  <span>Right: {child.rightCount}</span>
                                  <button
                                    onClick={() => {
                                      setBinaryTreeMemberId(child.memberId);
                                      fetchBinaryData(child.memberId);
                                    }}
                                    className={`${accent} font-bold hover:underline`}
                                  >
                                    Drill Down →
                                  </button>
                                </div>
                              </div>

                              {/* Level-2 Descendants */}
                              <div className="grid grid-cols-2 gap-2">
                                {[
                                  { subLabel: 'LEFT', subChild: child.leftChild },
                                  { subLabel: 'RIGHT', subChild: child.rightChild },
                                ].map(({ subLabel, subChild }) =>
                                  subChild ? (
                                    <button
                                      key={subLabel}
                                      type="button"
                                      onClick={() => {
                                        setBinaryTreeMemberId(subChild.memberId);
                                        fetchBinaryData(subChild.memberId);
                                      }}
                                      className="p-2.5 rounded-lg bg-white border border-slate-200 hover:border-[#165DAD] text-left transition-colors"
                                    >
                                      <div className="text-[9px] font-bold uppercase text-slate-400">{subLabel}</div>
                                      <div className="font-bold text-[11px] text-[#253247] truncate">{subChild.fullName}</div>
                                      <div className="text-[10px] font-mono text-[#165DAD]">{subChild.memberId}</div>
                                      <div className="text-[9px] text-slate-500 mt-0.5">
                                        {subChild.currentPackage} • {subChild.isFullQualified ? 'Qual' : 'Basic'}
                                      </div>
                                    </button>
                                  ) : (
                                    <div
                                      key={subLabel}
                                      className="p-2.5 rounded-lg bg-white/70 border border-dashed border-slate-200 text-center text-[10px] text-slate-400 flex items-center justify-center"
                                    >
                                      Vacant {subLabel}
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="p-4 rounded-lg bg-white border border-dashed border-slate-200 text-center text-xs text-slate-400">
                              {label === 'LEFT LEG' ? 'Left leg node vacant' : 'Right leg node vacant'}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Settlement History for Inspected Node */}
                    <div className="pt-4 border-t border-slate-100 space-y-2">
                      <h4 className="text-xs font-bold text-[#253247]">
                        Match Settlement History ({binaryTreeData.node.user.memberId})
                      </h4>
                      {binaryHistory.length === 0 ? (
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500">
                          No binary matching settlements recorded for this member.
                        </div>
                      ) : (
                        <div className="overflow-x-auto border border-slate-200 rounded-lg">
                          <table className="w-full text-left text-xs whitespace-nowrap">
                            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                              <tr>
                                <th className="p-2.5">Date (IST)</th>
                                <th className="p-2.5">Evaluated</th>
                                <th className="p-2.5">Settled</th>
                                <th className="p-2.5">Capped</th>
                                <th className="p-2.5">Used (L:R)</th>
                                <th className="p-2.5">New Carry (L:R)</th>
                                <th className="p-2.5 text-right">Reward (₹)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {binaryHistory.map((ev: any) => (
                                <tr key={ev.id}>
                                  <td className="p-2.5 font-mono">{ev.matchDate}</td>
                                  <td className="p-2.5">{ev.matchesEvaluated}</td>
                                  <td className="p-2.5 font-bold text-[#15803D]">{ev.matchesSettled}</td>
                                  <td className="p-2.5 text-amber-700">{ev.cappedOutMatches}</td>
                                  <td className="p-2.5">{ev.leftUnitsUsed} : {ev.rightUnitsUsed}</td>
                                  <td className="p-2.5">{ev.newCarryLeft} : {ev.newCarryRight}</td>
                                  <td className="p-2.5 text-right font-bold">₹{(ev.rewardINR ?? 0).toLocaleString('en-IN')}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-500">
                    {loadingBinary ? 'Loading binary tree...' : `No binary tree node found for "${binaryTreeMemberId}". Click "Root (ASKR-ADMIN-01)" to inspect the root node.`}
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: FINANCIAL LEDGER & WALLETS */}
            {activeTab === 'finance' && (
              <div className="space-y-4">
                {/* Sub Tab Switcher */}
                <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setFinanceSubTab('wallets')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        financeSubTab === 'wallets'
                          ? 'bg-[#165DAD] text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Member Wallets ({walletsTotal})
                    </button>
                    <button
                      onClick={() => setFinanceSubTab('ledger')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        financeSubTab === 'ledger'
                          ? 'bg-[#165DAD] text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Double-Entry Journal Inspector ({ledgerTotal})
                    </button>
                  </div>
                </div>

                {/* Sub-view 1: Wallets */}
                {financeSubTab === 'wallets' && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-3 border-b border-slate-100 flex items-center gap-2">
                      <Search className="w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search wallet by Member ID, Name, Email..."
                        value={walletSearch}
                        onChange={(e) => setWalletSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchWallets()}
                        className="text-xs w-full sm:w-80 border-none focus:outline-none"
                      />
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#F7F9FC] text-slate-600 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="py-3 px-4">Member ID</th>
                            <th className="py-3 px-4">Name</th>
                            <th className="py-3 px-4 text-right">Available Earnings</th>
                            <th className="py-3 px-4 text-right">Held Reserve</th>
                            <th className="py-3 px-4 text-right">Pending Recovery</th>
                            <th className="py-3 px-4 text-right">Shopping Voucher</th>
                            <th className="py-3 px-4 text-right">Total Earned</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {wallets.map((w) => (
                            <tr key={w.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4 font-mono font-bold text-[#165DAD]">
                                {w.memberId}
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-bold text-[#253247]">{w.fullName}</div>
                                <div className="text-[10px] text-slate-400">{w.email}</div>
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-emerald-700">
                                ₹{w.availableEarningsINR?.toLocaleString('en-IN') ?? 0}
                              </td>
                              <td className="py-3 px-4 text-right font-medium text-amber-700">
                                ₹{w.heldCommissionsINR?.toLocaleString('en-IN') ?? 0}
                              </td>
                              <td className="py-3 px-4 text-right font-medium text-red-600">
                                ₹{w.pendingRecoveryINR?.toLocaleString('en-IN') ?? 0}
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-[#165DAD]">
                                ₹{w.shoppingVoucherINR?.toLocaleString('en-IN') ?? 0}
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-slate-800">
                                ₹{w.totalEarnedINR?.toLocaleString('en-IN') ?? 0}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Sub-view 2: General Ledger Inspector */}
                {financeSubTab === 'ledger' && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-2">
                    <div className="p-3 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Search className="w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search Reference ID or narration..."
                          value={ledgerSearch}
                          onChange={(e) => setLedgerSearch(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && fetchLedger()}
                          className="text-xs w-full sm:w-72 border-none focus:outline-none"
                        />
                      </div>
                      <select
                        value={ledgerFilterType}
                        onChange={(e) => {
                          setLedgerFilterType(e.target.value);
                          fetchLedger();
                        }}
                        className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                      >
                        <option value="">All Event Types</option>
                        <option value="MEMBERSHIP_BASIC_ACTIVATION">Basic Activation</option>
                        <option value="MEMBERSHIP_FULL_ACTIVATION">Full Activation</option>
                        <option value="MEMBERSHIP_UPGRADE_PAYMENT">Upgrade Payment</option>
                        <option value="QUALIFIED_DIRECT_COMMISSION">Qualified Direct</option>
                        <option value="BINARY_MATCHING_REWARD">Binary Matching</option>
                        <option value="EV_BOOKING_DEPOSIT">EV Booking Deposit</option>
                        <option value="EV_BOOKING_CANCELLATION">Booking Cancellation</option>
                      </select>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#F7F9FC] text-slate-600 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="py-3 px-4">Journal Reference</th>
                            <th className="py-3 px-4">Event Type</th>
                            <th className="py-3 px-4">Narration</th>
                            <th className="py-3 px-4 text-right">Debit (INR)</th>
                            <th className="py-3 px-4 text-right">Credit (INR)</th>
                            <th className="py-3 px-4 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {ledgerEntries.map((j) => (
                            <tr key={j.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4 font-mono font-bold text-[#165DAD]">
                                {j.referenceId}
                              </td>
                              <td className="py-3 px-4 font-semibold text-slate-700">
                                {j.eventType}
                              </td>
                              <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                                {j.narration}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                                ₹{j.totalDebitINR?.toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                                ₹{j.totalCreditINR?.toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4 text-center">
                                {j.isBalanced ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    BALANCED
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                                    UNBALANCED
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 6: SHOPPING VOUCHERS */}
            {activeTab === 'vouchers' && (
              <div className="space-y-4">
                {/* Vouchers Metrics Header */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-[11px] text-slate-500">Total Vouchers Issued</div>
                    <div className="text-xl font-bold text-[#253247] mt-1">
                      {vouchersData?.metrics?.totalVouchers ?? 0}
                    </div>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-[11px] text-slate-500">Total Issued Liability</div>
                    <div className="text-xl font-bold text-[#165DAD] mt-1">
                      ₹{vouchersData?.metrics?.totalIssuedINR?.toLocaleString('en-IN') ?? 0}
                    </div>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-[11px] text-slate-500">Outstanding Available</div>
                    <div className="text-xl font-bold text-emerald-700 mt-1">
                      ₹{vouchersData?.metrics?.totalOutstandingINR?.toLocaleString('en-IN') ?? 0}
                    </div>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-[11px] text-slate-500">Total Redeemed</div>
                    <div className="text-xl font-bold text-slate-700 mt-1">
                      ₹{vouchersData?.metrics?.totalRedeemedINR?.toLocaleString('en-IN') ?? 0}
                    </div>
                  </div>
                </div>

                {/* Sub Tab Switcher */}
                <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setVoucherSubTab('vouchers')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        voucherSubTab === 'vouchers'
                          ? 'bg-[#165DAD] text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Active & Redeemed Vouchers ({filteredVouchers.length})
                    </button>
                    <button
                      onClick={() => setVoucherSubTab('transactions')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        voucherSubTab === 'transactions'
                          ? 'bg-[#165DAD] text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Voucher Transaction Log ({voucherTransactions.length})
                    </button>
                  </div>

                  {voucherSubTab === 'vouchers' && (
                    <div className="flex items-center gap-2">
                      <select
                        value={voucherStatusFilter}
                        onChange={(e) => setVoucherStatusFilter(e.target.value)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                      >
                        <option value="ALL">All Statuses</option>
                        <option value="ACTIVE">Active</option>
                        <option value="PARTIALLY_REDEEMED">Partially Redeemed</option>
                        <option value="FULLY_REDEEMED">Fully Redeemed</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Vouchers Table */}
                {voucherSubTab === 'vouchers' ? (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#F7F9FC] text-slate-600 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="py-3 px-4">Voucher Code</th>
                            <th className="py-3 px-4">Owner Member</th>
                            <th className="py-3 px-4">Issuance Source</th>
                            <th className="py-3 px-4 text-right">Initial (INR)</th>
                            <th className="py-3 px-4 text-right">Redeemed</th>
                            <th className="py-3 px-4 text-right">Available Balance</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4">Expiration Policy</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredVouchers.map((v: any) => (
                            <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4 font-mono font-bold text-[#165DAD]">
                                {v.voucherCode}
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-bold text-[#253247]">{v.memberName}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{v.memberId}</div>
                              </td>
                              <td className="py-3 px-4 text-slate-600 text-[11px]">
                                {v.issuedReason?.replace(/_/g, ' ')}
                              </td>
                              <td className="py-3 px-4 text-right font-medium">
                                ₹{v.initialValueINR?.toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4 text-right font-medium text-slate-500">
                                ₹{v.redeemedINR?.toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-emerald-700">
                                ₹{v.remainingBalanceINR?.toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                    v.status === 'ACTIVE'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : v.status === 'PARTIALLY_REDEEMED'
                                      ? 'bg-blue-50 text-[#165DAD] border-blue-200'
                                      : 'bg-slate-100 text-slate-600 border-slate-200'
                                  }`}
                                >
                                  {v.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-500 text-[10px]">
                                Lifetime (Policy Pending)
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#F7F9FC] text-slate-600 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="py-3 px-4">Transaction Code</th>
                            <th className="py-3 px-4">Member</th>
                            <th className="py-3 px-4">Type</th>
                            <th className="py-3 px-4 text-right">Amount</th>
                            <th className="py-3 px-4 text-right">Balance After</th>
                            <th className="py-3 px-4">Narration</th>
                            <th className="py-3 px-4">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {voucherTransactions.map((t: any) => (
                            <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4 font-mono font-bold text-[#165DAD]">
                                {t.voucherCode}
                              </td>
                              <td className="py-3 px-4 font-semibold text-[#253247]">
                                {t.memberName} ({t.memberId})
                              </td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                  {t.transactionType}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-slate-800">
                                ₹{t.amountINR?.toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-emerald-700">
                                ₹{t.balanceAfterINR?.toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                                {t.narration}
                              </td>
                              <td className="py-3 px-4 text-slate-500 text-[11px]">
                                {new Date(t.createdAt).toLocaleDateString('en-IN')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 7: EV BOOKINGS */}
            {activeTab === 'bookings' && (
              <div className="space-y-4">
                {/* Search & Filter Bar */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search Booking #, Member, EV Model..."
                      value={bookingSearch}
                      onChange={(e) => setBookingSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-[#165DAD]"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <select
                      value={bookingStatusFilter}
                      onChange={(e) => setBookingStatusFilter(e.target.value)}
                      className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="CONFIRMED">Active / Verified</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>
                </div>

                {/* Bookings Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F7F9FC] text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Booking #</th>
                          <th className="py-3 px-4">Member</th>
                          <th className="py-3 px-4">EV Bike Model</th>
                          <th className="py-3 px-4 text-right">Simulated Token</th>
                          <th className="py-3 px-4 text-right">Voucher Applied</th>
                          <th className="py-3 px-4 text-right">Simulated Cash</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredBookings.length > 0 ? (
                          filteredBookings.map((b: any) => (
                            <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4 font-mono font-bold text-[#165DAD]">
                                {b.bookingNumber}
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-bold text-[#253247]">{b.memberName}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{b.memberId}</div>
                              </td>
                              <td className="py-3 px-4 font-semibold text-slate-700">
                                {b.bikeName}
                              </td>
                              <td className="py-3 px-4 text-right font-medium">
                                ₹{b.bookingAmountINR?.toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-[#165DAD]">
                                ₹{b.voucherAppliedINR?.toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-slate-800">
                                ₹{b.netCashPaidINR?.toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                    b.bookingStatus !== 'CANCELLED'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-red-50 text-red-700 border-red-200'
                                  }`}
                                >
                                  {b.bookingStatus}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                {b.bookingStatus !== 'CANCELLED' ? (
                                  <button
                                    onClick={() => setSelectedBookingToCancel(b)}
                                    className="px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[11px] font-bold transition-colors"
                                  >
                                    Cancel Booking
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">
                                    Voucher Restored
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-slate-400">
                              No EV bike bookings found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 8: FINANCIAL RECONCILIATION */}
            {activeTab === 'reconciliation' && (
              <div className="space-y-6">
                {/* Header Status Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-[#253247] flex items-center gap-2">
                      <Scale className="w-5 h-5 text-[#165DAD]" />
                      <span>Financial Ledger & Voucher Equilibrium Center</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Independent cross-check between member wallets, active voucher liabilities, and general ledger accounts.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                        reconciliation?.status === 'RECONCILED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}
                    >
                      {reconciliation?.status === 'RECONCILED'
                        ? '100% PERFECTLY RECONCILED'
                        : 'DISCREPANCY DETECTED'}
                    </span>
                    <button
                      onClick={fetchReconciliation}
                      disabled={loadingReconciliation}
                      className="px-3.5 py-1.5 rounded-lg bg-[#165DAD] text-white text-xs font-bold hover:bg-[#124b8c]"
                    >
                      Re-audit Now
                    </button>
                  </div>
                </div>

                {/* Reconciliation Comparison Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Earnings Reconciliation */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
                    <div className="text-xs font-bold text-slate-500 uppercase">
                      Member Earnings Payable (A/C 2000)
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-slate-500">Total Wallets Available:</span>
                      <span className="font-bold text-slate-800">
                        ₹{reconciliation?.earningsWallet?.walletTotalINR?.toLocaleString('en-IN') ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Ledger Net Payable:</span>
                      <span className="font-bold text-slate-800">
                        ₹{reconciliation?.earningsWallet?.ledgerLiabilityNetINR?.toLocaleString('en-IN') ?? 0}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                      <span>Variance / Discrepancy:</span>
                      <span
                        className={
                          reconciliation?.earningsWallet?.discrepancyINR === 0
                            ? 'text-emerald-700'
                            : 'text-red-700'
                        }
                      >
                        ₹{reconciliation?.earningsWallet?.discrepancyINR ?? 0}
                      </span>
                    </div>
                  </div>

                  {/* Voucher Reconciliation */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
                    <div className="text-xs font-bold text-slate-500 uppercase">
                      Shopping Voucher Liability (A/C 2100)
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-slate-500">Active Vouchers Balance:</span>
                      <span className="font-bold text-slate-800">
                        ₹{reconciliation?.shoppingVouchers?.activeVouchersTableINR?.toLocaleString('en-IN') ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Ledger Net Liability:</span>
                      <span className="font-bold text-slate-800">
                        ₹{reconciliation?.shoppingVouchers?.ledgerLiabilityNetINR?.toLocaleString('en-IN') ?? 0}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                      <span>Variance / Discrepancy:</span>
                      <span
                        className={
                          reconciliation?.shoppingVouchers?.discrepancyINR === 0
                            ? 'text-emerald-700'
                            : 'text-red-700'
                        }
                      >
                        ₹{reconciliation?.shoppingVouchers?.discrepancyINR ?? 0}
                      </span>
                    </div>
                  </div>

                  {/* Journal Balance Equilibrium */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
                    <div className="text-xs font-bold text-slate-500 uppercase">
                      Double-Entry Equilibrium
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-slate-500">Total Journal Entries:</span>
                      <span className="font-bold text-slate-800">
                        {reconciliation?.journals?.totalJournals ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Balanced (Debit === Credit):</span>
                      <span className="font-bold text-emerald-700">
                        {reconciliation?.journals?.balancedCount ?? 0}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                      <span>Unbalanced Journals:</span>
                      <span
                        className={
                          reconciliation?.journals?.unbalancedCount === 0
                            ? 'text-emerald-700'
                            : 'text-red-700'
                        }
                      >
                        {reconciliation?.journals?.unbalancedCount ?? 0} (Target: 0)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Per-Member Parity Audit Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-2">
                  <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-xs text-[#253247] uppercase tracking-wider">
                        Per-Member Financial Parity Audit ({reconciliation?.perMember?.totalMembersAudited ?? 0} Members Audited)
                      </h3>
                      <div className="text-[11px] text-slate-400">
                        Asserts wallet balance $\equiv$ ledger payable and wallet voucher $\equiv$ sum of active voucher rows.
                      </div>
                    </div>
                    <input
                      type="text"
                      placeholder="Search member in reconciliation audit..."
                      value={reconciliationSearch}
                      onChange={(e) => setReconciliationSearch(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 w-full sm:w-64"
                    />
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F7F9FC] text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Member ID</th>
                          <th className="py-3 px-4">Name</th>
                          <th className="py-3 px-4 text-right">Wallet Avail</th>
                          <th className="py-3 px-4 text-right">Ledger Payable</th>
                          <th className="py-3 px-4 text-right">Wallet Voucher</th>
                          <th className="py-3 px-4 text-right">Active Vouchers</th>
                          <th className="py-3 px-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredMemberReconciliation.slice(0, 30).map((m: any) => (
                          <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-4 font-mono font-bold text-[#165DAD]">
                              {m.memberId}
                            </td>
                            <td className="py-2.5 px-4 font-semibold text-[#253247]">{m.fullName}</td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-700">
                              ₹{m.walletAvailableINR?.toLocaleString('en-IN')}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-700">
                              ₹{m.ledgerEarningsINR?.toLocaleString('en-IN')}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-[#165DAD]">
                              ₹{m.walletVoucherINR?.toLocaleString('en-IN')}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-[#165DAD]">
                              ₹{m.activeVouchersINR?.toLocaleString('en-IN')}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              {m.isBalanced ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  MATCH
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                                  MISMATCH
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 9: AUDIT & SECURITY */}
            {activeTab === 'audit' && (
              <div className="space-y-4">
                {/* Suspicious Activity Warning Banner if any */}
                {suspiciousActivity?.status === 'DUPLICATES_DETECTED' ? (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-2">
                    <div className="font-bold flex items-center gap-2 text-sm text-amber-800">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Suspicious Duplicate Payment Reference Alert!</span>
                    </div>
                    <div>
                      Found {suspiciousActivity.duplicatePaymentReferences.length} duplicate payment references submitted across multiple bookings.
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="font-semibold">
                      Security Engine: Zero suspicious duplicate payment references detected. Platform clean.
                    </span>
                  </div>
                )}

                {/* Audit Logs Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-3.5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="relative w-full sm:w-72">
                      <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search audit action, entity..."
                        value={auditSearch}
                        onChange={(e) => setAuditSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchAuditLogs()}
                        className="text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-200 w-full"
                      />
                    </div>

                    <select
                      value={auditActionFilter}
                      onChange={(e) => {
                        setAuditActionFilter(e.target.value);
                        fetchAuditLogs();
                      }}
                      className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white"
                    >
                      <option value="">All Actions</option>
                      <option value="MEMBERSHIP_REQUEST_APPROVED">Membership Approved</option>
                      <option value="MEMBERSHIP_REQUEST_REJECTED">Membership Rejected</option>
                      <option value="BINARY_NODE_PLACED">Binary Placed</option>
                      <option value="EV_BOOKING_CANCELLED">Booking Cancelled</option>
                      <option value="BINARY_MATCHING_SETTLED">Matching Settled</option>
                    </select>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F7F9FC] text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Timestamp</th>
                          <th className="py-3 px-4">Action</th>
                          <th className="py-3 px-4">Actor ID</th>
                          <th className="py-3 px-4">Entity Type</th>
                          <th className="py-3 px-4">Entity ID</th>
                          <th className="py-3 px-4">Metadata</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {auditLogs.map((l: any) => (
                          <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                              {new Date(l.createdAt).toLocaleString('en-IN')}
                            </td>
                            <td className="py-2.5 px-4 font-bold text-[#165DAD]">
                              <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-[10px]">
                                {l.action}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 font-mono text-slate-700">
                              {l.actorId ? l.actorId.slice(0, 8) + '...' : 'System'}
                            </td>
                            <td className="py-2.5 px-4 font-semibold text-slate-600">
                              {l.entityType}
                            </td>
                            <td className="py-2.5 px-4 font-mono text-slate-500">
                              {l.entityId ? l.entityId.slice(0, 8) + '...' : 'N/A'}
                            </td>
                            <td className="py-2.5 px-4 text-slate-500 max-w-xs truncate text-[11px]">
                              {JSON.stringify(l.metadata || {})}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* 4. MODALS & DIALOGS */}

      {/* MODAL 1: MEMBER 360-DEGREE DETAILS DRAWER/MODAL */}
      {selectedMemberDetails && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl border border-slate-200 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-[#253247]">
                  Member Profile: {selectedMemberDetails.profile?.fullName}
                </h3>
                <div className="text-xs font-mono font-bold text-[#165DAD] mt-0.5">
                  ID: {selectedMemberDetails.profile?.memberId} • Joined:{' '}
                  {new Date(selectedMemberDetails.profile?.createdAt).toLocaleDateString('en-IN')}
                </div>
              </div>
              <button
                onClick={() => setSelectedMemberDetails(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Overview Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Package</div>
                <div className="font-bold text-xs text-[#253247] mt-1">
                  {selectedMemberDetails.profile?.currentPackage}
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Qualification</div>
                <div className="font-bold text-xs text-emerald-700 mt-1">
                  {selectedMemberDetails.profile?.isFullQualified ? 'Full Qualified' : 'Unqualified'}
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Direct Referrals</div>
                <div className="font-bold text-xs text-[#253247] mt-1">
                  {selectedMemberDetails.directReferrals?.length || 0} Members
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Direct Sponsor</div>
                <div className="font-bold text-xs text-[#165DAD] mt-1">
                  {selectedMemberDetails.sponsor?.memberId || 'None (Root)'}
                </div>
              </div>
            </div>

            {/* Financial Wallet Summary */}
            <div className="bg-blue-50/50 rounded-xl border border-blue-100 p-4 space-y-2">
              <div className="text-xs font-bold text-[#165DAD] uppercase tracking-wider">
                Simulated Financial Wallet Balances
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                <div>
                  <div className="text-slate-500 text-[10px]">Available Earnings:</div>
                  <div className="font-bold text-emerald-700 text-sm">
                    ₹{selectedMemberDetails.wallet?.availableEarningsINR?.toLocaleString('en-IN') ?? 0}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 text-[10px]">Held Reserve:</div>
                  <div className="font-bold text-amber-700 text-sm">
                    ₹{selectedMemberDetails.wallet?.heldCommissionsINR?.toLocaleString('en-IN') ?? 0}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 text-[10px]">Pending Recovery:</div>
                  <div className="font-bold text-red-600 text-sm">
                    ₹{selectedMemberDetails.wallet?.pendingRecoveryINR?.toLocaleString('en-IN') ?? 0}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 text-[10px]">Shopping Voucher:</div>
                  <div className="font-bold text-[#165DAD] text-sm">
                    ₹{selectedMemberDetails.wallet?.shoppingVoucherINR?.toLocaleString('en-IN') ?? 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Shopping Vouchers List */}
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Shopping Vouchers ({selectedMemberDetails.vouchers?.length || 0})
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-2 px-3">Voucher Code</th>
                      <th className="py-2 px-3">Source</th>
                      <th className="py-2 px-3 text-right">Initial</th>
                      <th className="py-2 px-3 text-right">Balance</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedMemberDetails.vouchers?.length > 0 ? (
                      selectedMemberDetails.vouchers.map((v: any) => (
                        <tr key={v.id}>
                          <td className="py-2 px-3 font-mono font-bold text-[#165DAD]">{v.voucherCode}</td>
                          <td className="py-2 px-3 text-[11px] text-slate-600">{v.issuedReason}</td>
                          <td className="py-2 px-3 text-right">₹{v.initialValueINR}</td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-700">₹{v.remainingBalanceINR}</td>
                          <td className="py-2 px-3">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                              {v.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-slate-400">
                          No vouchers issued for this member.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* EV Bookings List */}
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                EV Bookings ({selectedMemberDetails.bookings?.length || 0})
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-2 px-3">Booking #</th>
                      <th className="py-2 px-3">Model</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                      <th className="py-2 px-3 text-right">Voucher Applied</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedMemberDetails.bookings?.length > 0 ? (
                      selectedMemberDetails.bookings.map((b: any) => (
                        <tr key={b.id}>
                          <td className="py-2 px-3 font-mono font-bold text-[#165DAD]">{b.bookingNumber}</td>
                          <td className="py-2 px-3 font-medium">{b.bikeName}</td>
                          <td className="py-2 px-3 text-right font-semibold">₹{b.bookingAmountINR}</td>
                          <td className="py-2 px-3 text-right font-bold text-[#165DAD]">₹{b.voucherAppliedINR}</td>
                          <td className="py-2 px-3">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                              {b.bookingStatus}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-slate-400">
                          No EV bookings for this member.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Direct Referrals List */}
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Direct Referrals ({selectedMemberDetails.directReferrals?.length || 0})
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-2 px-3">Member ID</th>
                      <th className="py-2 px-3">Name</th>
                      <th className="py-2 px-3">Package</th>
                      <th className="py-2 px-3">Full Qualified</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedMemberDetails.directReferrals?.length > 0 ? (
                      selectedMemberDetails.directReferrals.map((r: any) => (
                        <tr key={r.id}>
                          <td className="py-2 px-3 font-mono font-bold text-[#165DAD]">{r.memberId}</td>
                          <td className="py-2 px-3">{r.fullName}</td>
                          <td className="py-2 px-3">{r.currentPackage}</td>
                          <td className="py-2 px-3">
                            {r.isFullQualified ? (
                              <span className="text-emerald-700 font-bold">Yes</span>
                            ) : (
                              <span className="text-slate-400">No</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-slate-400">
                          No direct referrals.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedMemberDetails(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: MEMBERSHIP REVIEW / APPROVE / REJECT MODAL */}
      {selectedRequestToReview && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-[#253247]">
                {reviewMode === 'APPROVE' ? 'Approve Membership Request' : 'Reject Membership Request'}
              </h3>
              <button
                onClick={() => setSelectedRequestToReview(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Member:</span>
                <span className="font-bold text-[#253247]">
                  {selectedRequestToReview.user?.fullName} ({selectedRequestToReview.user?.memberId})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Request Type:</span>
                <span className="font-bold text-slate-800">
                  {selectedRequestToReview.requestType}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Simulated Fee:</span>
                <span className="font-bold text-[#165DAD]">
                  ₹{selectedRequestToReview.feeINR?.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Reference:</span>
                <span className="font-mono text-slate-700">
                  {selectedRequestToReview.paymentReference}
                </span>
              </div>
            </div>

            {reviewMode === 'APPROVE' ? (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                Approving this request will atomically upgrade the member package, issue any qualified shopping vouchers, and execute double-entry sponsor commission settlements.
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Rejection Reason / Admin Notes:</label>
                <textarea
                  rows={3}
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  placeholder="State the reason for rejecting this simulated request..."
                  className="w-full p-2.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-red-500"
                />
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedRequestToReview(null)}
                className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleReviewMembershipRequest}
                disabled={isSubmittingReview}
                className={`px-4 py-2 rounded-lg text-white text-xs font-bold shadow-xs ${
                  reviewMode === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isSubmittingReview
                  ? 'Processing...'
                  : reviewMode === 'APPROVE'
                  ? 'Confirm Approval'
                  : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: RUN BINARY MATCHING SETTLEMENT TRIGGER */}
      {settleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-[#253247] flex items-center gap-2">
                <Play className="w-4 h-4 text-purple-700 fill-current" />
                <span>Execute Administrative Binary Settlement</span>
              </h3>
              <button
                onClick={() => setSettleModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-purple-50 border border-purple-200 text-purple-900">
                Binary matching settlements disburse financial rewards (₹3,000/match up to 15 matches/day = ₹45,000). Beneficiary must be Full Qualified. Unmatched volume remains preserved.
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Target Member User ID:
                </label>
                <input
                  type="text"
                  value={settleTargetUserId}
                  onChange={(e) => setSettleTargetUserId(e.target.value)}
                  placeholder="Enter User ID to evaluate and settle"
                  className="w-full p-2 text-xs font-mono rounded-lg border border-slate-200 focus:outline-none focus:border-purple-600"
                />
              </div>

              {settleResult && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-1 text-xs">
                  <div className="font-bold">Settlement Result:</div>
                  <div>Matches Settled: {settleResult.matchesSettled}</div>
                  <div>Reward Credited: ₹{settleResult.rewardINR}</div>
                  <div>Carry Left: {settleResult.carryLeft} • Carry Right: {settleResult.carryRight}</div>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setSettleModalOpen(false)}
                className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
              >
                Close
              </button>
              <button
                onClick={handleExecuteBinaryMatching}
                disabled={isSettlingBinary || !settleTargetUserId}
                className="px-4 py-2 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold disabled:opacity-50"
              >
                {isSettlingBinary ? 'Settling...' : 'Run Settlement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CANCEL EV BOOKING MODAL */}
      {selectedBookingToCancel && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-[#253247] flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-600" />
                <span>Cancel EV Bike Booking</span>
              </h3>
              <button
                onClick={() => setSelectedBookingToCancel(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Booking Number:</span>
                <span className="font-bold font-mono text-[#253247]">
                  {selectedBookingToCancel.bookingNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Member:</span>
                <span className="font-bold text-slate-800">
                  {selectedBookingToCancel.memberName} ({selectedBookingToCancel.memberId})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Model:</span>
                <span className="font-bold text-slate-800">
                  {selectedBookingToCancel.bikeName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Voucher To Restore:</span>
                <span className="font-bold text-[#165DAD]">
                  ₹{selectedBookingToCancel.voucherAppliedINR?.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Cancellation Reason:</label>
              <input
                type="text"
                value={cancelReasonInput}
                onChange={(e) => setCancelReasonInput(e.target.value)}
                placeholder="Reason for booking cancellation..."
                className="w-full p-2.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
              Cancelling will atomically restore ₹{selectedBookingToCancel.voucherAppliedINR?.toLocaleString('en-IN')} back to the member's Shopping Voucher balance, reverse the ledger liability entry, and record an audit entry.
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedBookingToCancel(null)}
                className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
              >
                Keep Booking
              </button>
              <button
                onClick={handleCancelBooking}
                disabled={isCancellingBooking}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
              >
                {isCancellingBooking ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
