'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowDownToLine,
  Search,
  Filter,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Download,
  AlertTriangle,
  Building2,
  CheckCircle2,
  IndianRupee,
  Layers,
  FileText,
  User,
} from 'lucide-react';
import {
  fetchAdminWithdrawalsApi,
  approveAdminWithdrawalApi,
  rejectAdminWithdrawalApi,
  settleAdminWithdrawalApi,
} from '../../lib/api';

interface AdminWithdrawalManagementProps {
  currentUser: any;
}

export function AdminWithdrawalManagement({ currentUser }: AdminWithdrawalManagementProps) {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filter & Search states
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(50);

  // Data states
  const [items, setItems] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [pagination, setPagination] = useState<any>({});

  // Action Modals State
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<any | null>(null);
  const [modalType, setModalType] = useState<'VIEW' | 'APPROVE' | 'REJECT' | 'SETTLE' | null>(null);

  // Form Inputs for Modals
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [utrNumber, setUtrNumber] = useState('');

  const loadWithdrawals = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminWithdrawalsApi({
        status: statusFilter,
        page,
        limit,
        search: searchQuery,
      });
      setItems(res?.items || []);
      setSummary(res?.summary || {});
      setPagination(res?.pagination || {});
    } catch (err: any) {
      setError(err.message || 'Failed to load withdrawal requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWithdrawals();
  }, [statusFilter, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadWithdrawals();
  };

  const handleOpenModal = (w: any, type: 'VIEW' | 'APPROVE' | 'REJECT' | 'SETTLE') => {
    setSelectedWithdrawal(w);
    setModalType(type);
    setAdminNotes(w.adminNotes || '');
    setRejectionReason('');
    setUtrNumber('');
    setError(null);
    setSuccess(null);
  };

  const handleCloseModal = () => {
    setSelectedWithdrawal(null);
    setModalType(null);
  };

  const handleApprove = async () => {
    if (!selectedWithdrawal) return;
    setActionLoading(true);
    setError(null);
    try {
      await approveAdminWithdrawalApi(selectedWithdrawal.id, adminNotes);
      setSuccess(`Withdrawal ${selectedWithdrawal.id} approved successfully.`);
      handleCloseModal();
      await loadWithdrawals();
    } catch (err: any) {
      setError(err.message || 'Failed to approve withdrawal.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedWithdrawal) return;
    if (!rejectionReason.trim()) {
      setError('Rejection reason is required.');
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      await rejectAdminWithdrawalApi(selectedWithdrawal.id, rejectionReason.trim(), adminNotes);
      setSuccess(`Withdrawal ${selectedWithdrawal.id} rejected and funds refunded to member.`);
      handleCloseModal();
      await loadWithdrawals();
    } catch (err: any) {
      setError(err.message || 'Failed to reject withdrawal.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSettle = async () => {
    if (!selectedWithdrawal) return;
    if (!utrNumber.trim()) {
      setError('Bank UTR / Transaction Reference number is mandatory.');
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      await settleAdminWithdrawalApi(selectedWithdrawal.id, utrNumber.trim(), adminNotes);
      setSuccess(`Withdrawal ${selectedWithdrawal.id} settled with UTR ${utrNumber.trim()}.`);
      handleCloseModal();
      await loadWithdrawals();
    } catch (err: any) {
      setError(err.message || 'Failed to record bank settlement.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!items.length) {
      alert('No records available to export.');
      return;
    }
    const headers = [
      'Request ID',
      'Created Date',
      'Member ID',
      'Member Name',
      'Email',
      'Gross Amount (INR)',
      'Withdrawal Charge (INR)',
      'Net Amount (INR)',
      'Status',
      'Destination',
      'UTR Number',
      'Settled At',
      'Rejection Reason',
    ];

    const rows = items.map((w) => [
      `"${w.id}"`,
      `"${w.createdAt}"`,
      `"${w.memberId}"`,
      `"${w.memberName}"`,
      `"${w.email}"`,
      w.grossAmountINR,
      w.withdrawalChargeINR,
      w.netAmountINR,
      `"${w.status}"`,
      `"${w.destinationMasked}"`,
      `"${w.utrNumber || ''}"`,
      `"${w.settledAt || ''}"`,
      `"${w.rejectionReason || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `askr_ev_withdrawals_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'APPROVED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'SETTLED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'REJECTED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#0C2348] tracking-tight">Bank Withdrawal Management</h2>
          <p className="text-xs text-slate-500 mt-1">
            Review member withdrawal requests, perform bank transfers, record UTR references, or refund rejected requests.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={loadWithdrawals}
            disabled={loading}
            className="px-3 py-2 text-xs font-semibold text-white bg-[#165DAD] hover:bg-[#12498a] rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {error && !modalType && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}
      {success && !modalType && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Pending Review</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600">{summary?.pendingCount ?? 0}</div>
          <p className="text-[10px] text-slate-400">Awaiting admin review</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Approved / Ready</span>
            <CheckCircle className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-blue-600">{summary?.approvedCount ?? 0}</div>
          <p className="text-[10px] text-slate-400">Approved for bank transfer</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Settled / Paid</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{summary?.settledCount ?? 0}</div>
          <p className="text-[10px] text-slate-400">Bank transfer completed</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Rejected / Refunded</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600">{summary?.rejectedCount ?? 0}</div>
          <p className="text-[10px] text-slate-400">Funds returned to wallet</p>
        </div>
      </div>

      {/* Financial Totals Bar */}
      <div className="p-4 rounded-xl bg-slate-900 text-white shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-slate-300">Page Financial Summary:</span>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <span className="text-slate-400 text-[11px] block">Gross Requested</span>
            <span className="font-mono font-bold text-white text-sm">
              ₹{Number(summary?.pageGrossTotalINR ?? 0).toLocaleString('en-IN')}
            </span>
          </div>
          <div>
            <span className="text-slate-400 text-[11px] block">10% Admin Charges</span>
            <span className="font-mono font-bold text-amber-400 text-sm">
              ₹{Number(summary?.pageWithdrawalChargeTotalINR ?? 0).toLocaleString('en-IN')}
            </span>
          </div>
          <div>
            <span className="text-slate-400 text-[11px] block">Net Payable to Members</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">
              ₹{Number(summary?.pageNetTotalINR ?? 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg bg-slate-50 text-slate-700 focus:outline-none focus:border-[#165DAD]"
          >
            <option value="ALL">All Requests</option>
            <option value="PENDING">Pending Only</option>
            <option value="APPROVED">Approved Only</option>
            <option value="SETTLED">Settled / Paid Only</option>
            <option value="REJECTED">Rejected Only</option>
          </select>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ID, member, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#165DAD]"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 text-xs font-semibold text-white bg-[#165DAD] hover:bg-[#12498a] rounded-lg transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#165DAD]" />
            <span className="text-xs">Loading withdrawal records...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <ArrowDownToLine className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">No withdrawal requests found</p>
            <p className="text-xs text-slate-400">There are no withdrawal requests matching the selected filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Request / Date</th>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4 text-right">Gross (₹)</th>
                  <th className="py-3 px-4 text-right">Charges (₹)</th>
                  <th className="py-3 px-4 text-right">Net Payable (₹)</th>
                  <th className="py-3 px-4">Destination</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">UTR / Settlement</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((w: any) => (
                  <tr key={w.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Request / Date */}
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-slate-800 text-[11px] truncate max-w-[120px]" title={w.id}>
                        {w.id.slice(0, 12)}...
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {w.createdAt ? new Date(w.createdAt).toLocaleDateString('en-IN') : 'N/A'}
                      </div>
                    </td>

                    {/* Member */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#0C2348]">{w.memberName}</div>
                      <div className="font-mono text-[10px] text-blue-700">{w.memberId}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{w.email}</div>
                    </td>

                    {/* Gross */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                      ₹{Number(w.grossAmountINR).toLocaleString('en-IN')}
                    </td>

                    {/* Charges */}
                    <td className="py-3 px-4 text-right font-mono text-amber-600 font-semibold">
                      -₹{Number(w.withdrawalChargeINR).toLocaleString('en-IN')}
                    </td>

                    {/* Net Payable */}
                    <td className="py-3 px-4 text-right font-mono font-black text-emerald-700 text-sm">
                      ₹{Number(w.netAmountINR).toLocaleString('en-IN')}
                    </td>

                    {/* Destination */}
                    <td className="py-3 px-4">
                      <div className="text-[11px] font-medium text-slate-700 truncate max-w-[180px]" title={w.destinationMasked}>
                        {w.destinationMasked}
                      </div>
                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold mt-0.5 inline-block">
                        {w.destinationType}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border inline-block ${getStatusBadge(w.status)}`}>
                        {w.status}
                      </span>
                    </td>

                    {/* UTR / Settlement */}
                    <td className="py-3 px-4">
                      {w.utrNumber ? (
                        <div className="font-mono text-[10px] font-bold text-emerald-700 break-all" title={w.utrNumber}>
                          UTR: {w.utrNumber}
                        </div>
                      ) : w.status === 'REJECTED' ? (
                        <div className="text-[10px] text-rose-600 font-medium truncate max-w-[140px]" title={w.rejectionReason}>
                          Reason: {w.rejectionReason}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">Pending</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenModal(w, 'VIEW')}
                          className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {w.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleOpenModal(w, 'APPROVE')}
                              className="px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-[10px] border border-blue-200"
                              title="Approve for Payment"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleOpenModal(w, 'REJECT')}
                              className="px-2 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold text-[10px] border border-rose-200"
                              title="Reject & Refund"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {w.status === 'APPROVED' && (
                          <>
                            <button
                              onClick={() => handleOpenModal(w, 'SETTLE')}
                              className="px-2.5 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-[10px] shadow-2xs"
                              title="Record UTR & Mark Paid"
                            >
                              Pay / UTR
                            </button>
                            <button
                              onClick={() => handleOpenModal(w, 'REJECT')}
                              className="px-2 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold text-[10px] border border-rose-200"
                              title="Reject & Refund"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =========================================================================
          ACTION MODALS
          ========================================================================= */}
      {modalType && selectedWithdrawal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-[#0C2348]">
                {modalType === 'VIEW' && 'Withdrawal Details'}
                {modalType === 'APPROVE' && 'Approve Withdrawal'}
                {modalType === 'REJECT' && 'Reject Withdrawal & Refund Balance'}
                {modalType === 'SETTLE' && 'Record Bank Transfer (UTR)'}
              </h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 text-sm">
                ✕
              </button>
            </div>

            {/* Error inside modal */}
            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Summary Information */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Member:</span>
                <span className="font-bold text-slate-800">
                  {selectedWithdrawal.memberName} ({selectedWithdrawal.memberId})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Gross Amount:</span>
                <span className="font-mono font-bold text-slate-800">
                  ₹{Number(selectedWithdrawal.grossAmountINR).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">10% Admin Charges:</span>
                <span className="font-mono font-semibold text-amber-600">
                  -₹{Number(selectedWithdrawal.withdrawalChargeINR).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5">
                <span className="font-bold text-slate-700">Net Transferable:</span>
                <span className="font-mono font-black text-emerald-700 text-sm">
                  ₹{Number(selectedWithdrawal.netAmountINR).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payout Destination:</span>
                <span className="font-medium text-slate-700 break-all">{selectedWithdrawal.destinationMasked}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Current Status:</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(selectedWithdrawal.status)}`}>
                  {selectedWithdrawal.status}
                </span>
              </div>
            </div>

            {/* Modal Specific Fields */}
            {modalType === 'APPROVE' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-600">
                  Approving this request confirms the member is eligible and moves the request to the approved queue for manual bank transfer.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Admin Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Verified member KYC and bank IFSC details"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#165DAD]"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={handleCloseModal} className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg">
                    Cancel
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50"
                  >
                    {actionLoading ? 'Approving...' : 'Confirm Approval'}
                  </button>
                </div>
              </div>
            )}

            {modalType === 'REJECT' && (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  <strong>Warning:</strong> Rejecting will automatically reverse the double-entry reservation and refund ₹
                  {Number(selectedWithdrawal.grossAmountINR).toLocaleString('en-IN')} back to the member's Available Earnings.
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Rejection Reason <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bank account number invalid or name mismatch"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Internal Admin Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Contacted member via phone to update IFSC"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={handleCloseModal} className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg">
                    Cancel
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={actionLoading}
                    className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm disabled:opacity-50"
                  >
                    {actionLoading ? 'Rejecting...' : 'Confirm Rejection & Refund'}
                  </button>
                </div>
              </div>
            )}

            {modalType === 'SETTLE' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-600">
                  Enter the Bank UTR / IMPS / NEFT reference number confirming the transfer has been executed. This will post the final settlement journal entry (clearing Commission Hold Reserve to Cash/Bank).
                </p>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bank UTR / Transaction Reference <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HDFC00192837465 or CMS9876543210"
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Admin Settlement Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Transferred via HDFC Corporate Net Banking"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#165DAD]"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={handleCloseModal} className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg">
                    Cancel
                  </button>
                  <button
                    onClick={handleSettle}
                    disabled={actionLoading}
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm disabled:opacity-50"
                  >
                    {actionLoading ? 'Recording...' : 'Record Payment & Mark Settled'}
                  </button>
                </div>
              </div>
            )}

            {modalType === 'VIEW' && (
              <div className="space-y-3">
                {selectedWithdrawal.utrNumber && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs">
                    <span className="text-slate-500 block text-[11px]">UTR Reference Number:</span>
                    <span className="font-mono font-bold text-emerald-800 text-sm">{selectedWithdrawal.utrNumber}</span>
                  </div>
                )}
                {selectedWithdrawal.rejectionReason && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs">
                    <span className="text-slate-500 block text-[11px]">Rejection Reason:</span>
                    <span className="text-rose-800 font-medium">{selectedWithdrawal.rejectionReason}</span>
                  </div>
                )}
                {selectedWithdrawal.adminNotes && (
                  <div className="p-3 rounded-lg bg-slate-100 border border-slate-200 text-xs">
                    <span className="text-slate-500 block text-[11px]">Admin Notes:</span>
                    <span className="text-slate-800">{selectedWithdrawal.adminNotes}</span>
                  </div>
                )}
                <div className="flex justify-end pt-2">
                  <button onClick={handleCloseModal} className="px-5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
