'use client';

import React, { useState, useEffect } from 'react';
import {
  Sliders,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Save,
  Clock,
  History,
  Lock,
  Percent,
  IndianRupee,
  Layers,
  ShoppingBag,
  Ticket,
  ArrowDownToLine,
  CreditCard,
  Crown,
  GitBranch,
  Info,
} from 'lucide-react';
import {
  fetchAdminFinancialSettingsApi,
  updateAdminFinancialSettingsApi,
} from '../../lib/api';

interface AdminFinancialSettingsProps {
  currentUser: any;
}

export function AdminFinancialSettings({ currentUser }: AdminFinancialSettingsProps) {
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  // Form State
  const [crownBonusEnabled, setCrownBonusEnabled] = useState(true);
  const [royalMatchEnabled, setRoyalMatchEnabled] = useState(true);
  const [legacyIncomeEnabled, setLegacyIncomeEnabled] = useState(false);
  const [evClubFundEnabled, setEvClubFundEnabled] = useState(false);
  const [voucherUtilizationEnabled, setVoucherUtilizationEnabled] = useState(true);
  const [shoppingWalletUtilizationEnabled, setShoppingWalletUtilizationEnabled] = useState(false);
  const [withdrawalRequestsEnabled, setWithdrawalRequestsEnabled] = useState(false);
  const [payoutExecutionEnabled, setPayoutExecutionEnabled] = useState(false);

  const [minWithdrawalINR, setMinWithdrawalINR] = useState<number>(1000);
  const [maxWithdrawalINR, setMaxWithdrawalINR] = useState<string>('');
  const [adminChargePercent, setAdminChargePercent] = useState<number>(10);
  const [tdsEnabled, setTdsEnabled] = useState(false);
  const [tdsPercent, setTdsPercent] = useState<number>(5);
  const [withdrawalDisabledReason, setWithdrawalDisabledReason] = useState<string>('');
  const [changeReason, setChangeReason] = useState<string>('');

  const applySettingsToForm = (res: any) => {
    const s = res?.persistedSettings || res?.settings;
    if (s) {
      setData(res);
      setCrownBonusEnabled(s.crownBonusEnabled ?? true);
      setRoyalMatchEnabled(s.royalMatchEnabled ?? true);
      setLegacyIncomeEnabled(s.legacyIncomeEnabled ?? false);
      setEvClubFundEnabled(s.evClubFundEnabled ?? false);
      setVoucherUtilizationEnabled(s.voucherUtilizationEnabled ?? true);
      setShoppingWalletUtilizationEnabled(s.shoppingWalletUtilizationEnabled ?? false);
      setWithdrawalRequestsEnabled(s.withdrawalRequestsEnabled ?? false);
      setPayoutExecutionEnabled(s.payoutExecutionEnabled ?? false);

      setMinWithdrawalINR(s.minWithdrawalINR ?? 1000);
      setMaxWithdrawalINR(s.maxWithdrawalINR ? String(s.maxWithdrawalINR) : '');
      setAdminChargePercent(s.adminChargePercent ?? 10);
      setTdsEnabled(s.tdsEnabled ?? false);
      setTdsPercent(s.tdsRatePercent ?? s.tdsPercent ?? 5);
      setWithdrawalDisabledReason(s.withdrawalDisabledReason || '');
    }
  };

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminFinancialSettingsApi();
      applySettingsToForm(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load financial settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      setError('Only Super Admin is authorized to modify production financial settings.');
      return;
    }
    const trimmedReason = changeReason.trim();
    if (!trimmedReason || trimmedReason.length < 5) {
      setError('Change reason must be at least 5 characters explaining the modification for audit compliance.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        crownBonusEnabled,
        royalMatchEnabled,
        legacyIncomeEnabled,
        evClubFundEnabled,
        voucherUtilizationEnabled,
        shoppingWalletUtilizationEnabled,
        withdrawalRequestsEnabled,
        payoutExecutionEnabled,
        minWithdrawalINR: Number(minWithdrawalINR),
        maxWithdrawalINR: maxWithdrawalINR.trim() ? Number(maxWithdrawalINR) : null,
        adminChargePercent: Number(adminChargePercent),
        tdsEnabled,
        tdsRatePercent: Number(tdsPercent),
        tdsPercent: Number(tdsPercent),
        withdrawalDisabledReason: withdrawalDisabledReason.trim() || null,
        changeReason: trimmedReason,
      };

      const res = await updateAdminFinancialSettingsApi(payload);
      const newVersion = res?.persistedSettings?.version || res?.settings?.version || (s.version ? s.version + 1 : '');
      setSuccess(`Financial settings saved successfully to Database (Version ${newVersion}). Note: Features governed by compliance gates remain protected by environment authorization.`);
      setChangeReason('');
      applySettingsToForm(res);
    } catch (err: any) {
      setError(err.message || 'Failed to update financial settings.');
      // Do NOT reset user toggle selections on error
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-[#165DAD]" />
        <span>Loading production financial settings...</span>
      </div>
    );
  }

  const s = data?.persistedSettings || data?.settings || {};
  const op = data?.effectiveOperational || {};
  const overrides = data?.emergencyOverrides || {};
  const env = data?.effectiveEnvironment || {
    COMPLIANCE_MODE: overrides.complianceMode || 'SIMULATION_ONLY',
    ENABLE_LEGACY_SETTLEMENT: overrides.isLegacySettlementEnvEnabled,
    ENABLE_LIVE_PAYOUTS: overrides.isLivePayoutsEnvEnabled,
    ENABLE_MANUAL_WITHDRAWALS: overrides.isManualWithdrawalsEnvEnabled,
  };

  const auditHistory = Array.isArray(s.auditHistory) ? s.auditHistory : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#0C2348] tracking-tight">Financial Activation & Settings</h2>
          <p className="text-xs text-slate-500 mt-1">
            Independent stream controls, withdrawal rules, statutory deduction settings, and versioned audit history.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadSettings}
            disabled={loading || saving}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Fail-closed Environment Overrides Status Banner */}
      <div className="p-4 rounded-xl bg-slate-900 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Fail-Closed Compliance Gate
            </div>
            <div className="text-xs text-slate-300 mt-0.5">
              Production settings adhere to authoritative environment overrides. Live releases remain simulation-safe until compliance clearance.
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
          <span className="px-2.5 py-1 rounded-md bg-white/10 border border-white/20">
            COMPLIANCE: <strong className={env.COMPLIANCE_MODE === 'LIVE_PRODUCTION' ? 'text-emerald-400' : 'text-amber-300'}>{env.COMPLIANCE_MODE || 'SIMULATION_ONLY'}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-md bg-white/10 border border-white/20">
            SETTLEMENT: <strong className={env.ENABLE_LEGACY_SETTLEMENT ? 'text-emerald-400' : 'text-rose-400'}>{env.ENABLE_LEGACY_SETTLEMENT ? 'ENABLED' : 'PAUSED'}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-md bg-white/10 border border-white/20">
            PAYOUTS: <strong className={env.ENABLE_LIVE_PAYOUTS ? 'text-emerald-400' : 'text-rose-400'}>{env.ENABLE_LIVE_PAYOUTS ? 'LIVE' : 'SIMULATION'}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-md bg-white/10 border border-white/20">
            WITHDRAWALS: <strong className={env.ENABLE_MANUAL_WITHDRAWALS ? 'text-emerald-400' : 'text-rose-400'}>{env.ENABLE_MANUAL_WITHDRAWALS ? 'LIVE' : 'PAUSED'}</strong>
          </span>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: 8 Independent Feature Toggles */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#0C2348]">Independent Financial Feature Toggles</h3>
              <p className="text-xs text-slate-500">
                Manage database-persisted configuration independently. Operational execution is safely guarded by environment authorization.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
              Configuration Version {s.version ?? 1}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Toggle 1: Crown Bonus */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#0C2348]">
                    <Crown className="w-4 h-4 text-blue-600" />
                    <span>EV Crown Bonus</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={crownBonusEnabled}
                      onChange={(e) => setCrownBonusEnabled(e.target.checked)}
                      disabled={!isSuperAdmin || saving}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#165DAD]"></div>
                  </label>
                </div>
                <p className="text-[11px] text-slate-500">Direct sponsor commissions for EV sales</p>
              </div>
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                <span className="text-slate-400 font-mono">DB: {crownBonusEnabled ? 'ENABLED' : 'DISABLED'}</span>
                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${crownBonusEnabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
                  {crownBonusEnabled ? 'OPERATIONAL: ACTIVE' : 'INACTIVE'}
                </span>
              </div>
            </div>

            {/* Toggle 2: Royal Match */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#0C2348]">
                    <GitBranch className="w-4 h-4 text-teal-600" />
                    <span>EV Royal Match</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={royalMatchEnabled}
                      onChange={(e) => setRoyalMatchEnabled(e.target.checked)}
                      disabled={!isSuperAdmin || saving}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#165DAD]"></div>
                  </label>
                </div>
                <p className="text-[11px] text-slate-500">1:1 Binary pair matching bonuses</p>
              </div>
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                <span className="text-slate-400 font-mono">DB: {royalMatchEnabled ? 'ENABLED' : 'DISABLED'}</span>
                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${royalMatchEnabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
                  {royalMatchEnabled ? 'OPERATIONAL: ACTIVE' : 'INACTIVE'}
                </span>
              </div>
            </div>

            {/* Toggle 3: Legacy Income */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#0C2348]">
                    <Layers className="w-4 h-4 text-purple-600" />
                    <span>EV Legacy Income</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={legacyIncomeEnabled}
                      onChange={(e) => setLegacyIncomeEnabled(e.target.checked)}
                      disabled={!isSuperAdmin || saving}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#165DAD]"></div>
                  </label>
                </div>
                <p className="text-[11px] text-slate-500">Even matrix levels (2, 4, 6, 8) to Earnings</p>
              </div>
              <div className="pt-2 border-t border-slate-200/60 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-mono">DB: {legacyIncomeEnabled ? 'ENABLED' : 'DISABLED'}</span>
                  {legacyIncomeEnabled ? (
                    op.legacyIncomeLive ? (
                      <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                        OPERATIONAL: ACTIVE
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-amber-50 text-amber-700 border border-amber-200">
                        OPERATIONAL: PAUSED
                      </span>
                    )
                  ) : (
                    <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-slate-100 text-slate-500">
                      INACTIVE
                    </span>
                  )}
                </div>
                {legacyIncomeEnabled && !op.legacyIncomeLive && (
                  <p className="text-[9px] text-amber-600 leading-tight">
                    Requires ENABLE_LEGACY_SETTLEMENT=true in env
                  </p>
                )}
              </div>
            </div>

            {/* Toggle 4: EV Club Fund */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#0C2348]">
                    <ShoppingBag className="w-4 h-4 text-emerald-600" />
                    <span>EV Club Fund</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={evClubFundEnabled}
                      onChange={(e) => setEvClubFundEnabled(e.target.checked)}
                      disabled={!isSuperAdmin || saving}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#165DAD]"></div>
                  </label>
                </div>
                <p className="text-[11px] text-slate-500">Odd matrix levels (1, 3, 5, 7) to Shopping</p>
              </div>
              <div className="pt-2 border-t border-slate-200/60 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-mono">DB: {evClubFundEnabled ? 'ENABLED' : 'DISABLED'}</span>
                  {evClubFundEnabled ? (
                    op.evClubFundLive ? (
                      <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                        OPERATIONAL: ACTIVE
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-amber-50 text-amber-700 border border-amber-200">
                        OPERATIONAL: PAUSED
                      </span>
                    )
                  ) : (
                    <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-slate-100 text-slate-500">
                      INACTIVE
                    </span>
                  )}
                </div>
                {evClubFundEnabled && !op.evClubFundLive && (
                  <p className="text-[9px] text-amber-600 leading-tight">
                    Requires ENABLE_LEGACY_SETTLEMENT=true in env
                  </p>
                )}
              </div>
            </div>

            {/* Toggle 5: Voucher Utilization */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#0C2348]">
                    <Ticket className="w-4 h-4 text-amber-600" />
                    <span>Voucher Utilization</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={voucherUtilizationEnabled}
                      onChange={(e) => setVoucherUtilizationEnabled(e.target.checked)}
                      disabled={!isSuperAdmin || saving}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#165DAD]"></div>
                  </label>
                </div>
                <p className="text-[11px] text-slate-500">Shopping voucher discounts during booking</p>
              </div>
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                <span className="text-slate-400 font-mono">DB: {voucherUtilizationEnabled ? 'ENABLED' : 'DISABLED'}</span>
                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${voucherUtilizationEnabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
                  {voucherUtilizationEnabled ? 'OPERATIONAL: ACTIVE' : 'INACTIVE'}
                </span>
              </div>
            </div>

            {/* Toggle 6: Shopping Wallet Utilization */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#0C2348]">
                    <ShoppingBag className="w-4 h-4 text-blue-600" />
                    <span>Shopping Wallet Booking</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shoppingWalletUtilizationEnabled}
                      onChange={(e) => setShoppingWalletUtilizationEnabled(e.target.checked)}
                      disabled={!isSuperAdmin || saving}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#165DAD]"></div>
                  </label>
                </div>
                <p className="text-[11px] text-slate-500">Redeem Shopping Wallet at checkout</p>
              </div>
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                <span className="text-slate-400 font-mono">DB: {shoppingWalletUtilizationEnabled ? 'ENABLED' : 'DISABLED'}</span>
                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${shoppingWalletUtilizationEnabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
                  {shoppingWalletUtilizationEnabled ? 'OPERATIONAL: ACTIVE' : 'INACTIVE'}
                </span>
              </div>
            </div>

            {/* Toggle 7: Withdrawal Requests */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#0C2348]">
                    <ArrowDownToLine className="w-4 h-4 text-emerald-600" />
                    <span>Withdrawal Requests</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={withdrawalRequestsEnabled}
                      onChange={(e) => setWithdrawalRequestsEnabled(e.target.checked)}
                      disabled={!isSuperAdmin || saving}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#165DAD]"></div>
                  </label>
                </div>
                <p className="text-[11px] text-slate-500">Members can submit bank withdrawal requests</p>
              </div>
              <div className="pt-2 border-t border-slate-200/60 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-mono">DB: {withdrawalRequestsEnabled ? 'ENABLED' : 'DISABLED'}</span>
                  {withdrawalRequestsEnabled ? (
                    op.withdrawalRequestsLive ? (
                      <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                        OPERATIONAL: ACTIVE
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-amber-50 text-amber-700 border border-amber-200">
                        OPERATIONAL: RESTRICTED
                      </span>
                    )
                  ) : (
                    <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-slate-100 text-slate-500">
                      INACTIVE
                    </span>
                  )}
                </div>
                {withdrawalRequestsEnabled && !op.withdrawalRequestsLive && (
                  <p className="text-[9px] text-amber-600 leading-tight">
                    Requires ENABLE_MANUAL_WITHDRAWALS=true in env
                  </p>
                )}
              </div>
            </div>

            {/* Toggle 8: Payout Execution */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#0C2348]">
                    <CreditCard className="w-4 h-4 text-purple-600" />
                    <span>Live Payout Dispatches</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={payoutExecutionEnabled}
                      onChange={(e) => setPayoutExecutionEnabled(e.target.checked)}
                      disabled={!isSuperAdmin || saving}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#165DAD]"></div>
                  </label>
                </div>
                <p className="text-[11px] text-slate-500">Automated banking gateway disbursement</p>
              </div>
              <div className="pt-2 border-t border-slate-200/60 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-mono">DB: {payoutExecutionEnabled ? 'ENABLED' : 'DISABLED'}</span>
                  {payoutExecutionEnabled ? (
                    op.payoutExecutionLive ? (
                      <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                        OPERATIONAL: LIVE
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-amber-50 text-amber-700 border border-amber-200">
                        OPERATIONAL: SIMULATION
                      </span>
                    )
                  ) : (
                    <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-slate-100 text-slate-500">
                      INACTIVE
                    </span>
                  )}
                </div>
                {payoutExecutionEnabled && !op.payoutExecutionLive && (
                  <p className="text-[9px] text-amber-600 leading-tight">
                    Requires ENABLE_LIVE_PAYOUTS=true & LIVE_PRODUCTION
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Withdrawal Policy & Statutory Deductions */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-[#0C2348]">Withdrawal Rules, Limits & Statutory Taxes</h3>
            <p className="text-xs text-slate-500">Configure member withdrawal thresholds, business charges, and tax deduction compliance.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Minimum Withdrawal */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Minimum Withdrawal (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-xs">₹</span>
                <input
                  type="number"
                  required
                  min="100"
                  step="100"
                  value={minWithdrawalINR}
                  onChange={(e) => setMinWithdrawalINR(Number(e.target.value))}
                  disabled={!isSuperAdmin || saving}
                  className="w-full pl-7 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:border-[#165DAD] focus:outline-none font-semibold text-slate-800"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Default: ₹1,000 minimum threshold.</p>
            </div>

            {/* Maximum Withdrawal */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Maximum Withdrawal (₹) <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-xs">₹</span>
                <input
                  type="number"
                  min="1000"
                  step="500"
                  placeholder="Unlimited"
                  value={maxWithdrawalINR}
                  onChange={(e) => setMaxWithdrawalINR(e.target.value)}
                  disabled={!isSuperAdmin || saving}
                  className="w-full pl-7 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:border-[#165DAD] focus:outline-none font-semibold text-slate-800"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Leave empty for no upper cap.</p>
            </div>

            {/* Admin Charge Percent */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Admin Charges (%) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-xs">%</span>
                <input
                  type="number"
                  required
                  min="0"
                  max="50"
                  step="0.5"
                  value={adminChargePercent}
                  onChange={(e) => setAdminChargePercent(Number(e.target.value))}
                  disabled={!isSuperAdmin || saving}
                  className="w-full pl-7 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:border-[#165DAD] focus:outline-none font-semibold text-slate-800"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Standard business deduction (Default: 10%).</p>
            </div>

            {/* TDS Toggle & Percentage */}
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-700">Statutory TDS Deduction</span>
                  <p className="text-[10px] text-slate-400">Deduct TDS at source for bank settlements</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tdsEnabled}
                    onChange={(e) => setTdsEnabled(e.target.checked)}
                    disabled={!isSuperAdmin || saving}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#165DAD]"></div>
                </label>
              </div>

              {tdsEnabled && (
                <div className="pt-1">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">TDS Rate (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    step="0.5"
                    value={tdsPercent}
                    onChange={(e) => setTdsPercent(Number(e.target.value))}
                    disabled={!isSuperAdmin || saving}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                  />
                </div>
              )}
            </div>

            {/* Withdrawal Disabled Reason */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Withdrawal Maintenance / Disabled Reason
              </label>
              <input
                type="text"
                placeholder="e.g. Scheduled banking ledger reconciliation in progress. Resumes at 6:00 PM."
                value={withdrawalDisabledReason}
                onChange={(e) => setWithdrawalDisabledReason(e.target.value)}
                disabled={!isSuperAdmin || saving}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:border-[#165DAD] focus:outline-none text-slate-800"
              />
              <p className="text-[11px] text-slate-400 mt-1">Displayed to members when withdrawal requests are toggled off.</p>
            </div>
          </div>
        </div>

        {/* Section 3: Audit Compliance & Submission */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-[#0C2348]">Audit Trail & Change Authorization</h3>
            <p className="text-xs text-slate-500">Every change to production financial controls is logged with author, timestamp, and justification.</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Change Reason / Justification <span className="text-rose-500">*</span>
              </label>
              <span className={`text-[11px] font-mono ${changeReason.trim().length >= 5 ? 'text-emerald-600' : 'text-slate-400'}`}>
                {changeReason.trim().length}/5 characters minimum
              </span>
            </div>
            <input
              type="text"
              required
              minLength={5}
              placeholder="e.g. Authorized live legacy income settlement activation and 10% withdrawal policy approval"
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              disabled={!isSuperAdmin || saving}
              className={`w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-[#165DAD] focus:outline-none text-slate-900 ${
                changeReason.trim() && changeReason.trim().length < 5
                  ? 'border-rose-400 bg-rose-50/30'
                  : 'border-slate-300'
              }`}
            />
            {changeReason.trim() && changeReason.trim().length < 5 && (
              <p className="text-[11px] text-rose-600 mt-1">Please enter at least 5 characters for compliance audit requirements.</p>
            )}
          </div>

          {/* Contextual Save Error Alert right near Save button */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="text-[11px] text-slate-400">
              Last updated: {s.updatedAt ? new Date(s.updatedAt).toLocaleString('en-IN') : 'N/A'} by {s.updatedBy || 'SYSTEM'}
            </div>
            {isSuperAdmin ? (
              <button
                type="submit"
                disabled={saving || (changeReason.trim().length > 0 && changeReason.trim().length < 5)}
                className="px-6 py-2.5 rounded-xl bg-[#165DAD] hover:bg-[#12498a] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving Settings...' : 'Save Financial Settings'}</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                <Lock className="w-3.5 h-3.5" />
                <span>Super Admin privilege required to modify financial settings.</span>
              </div>
            )}
          </div>
        </div>
      </form>

      {/* Section 4: Audit History Log */}
      {auditHistory.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-[#0C2348]">Audit History Log</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Version</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Actor</th>
                  <th className="py-2.5 px-3">Reason</th>
                  <th className="py-2.5 px-3">Active Streams</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditHistory.map((item: any, idx: number) => {
                  const flags = item.flags || item.toggles || {};
                  return (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#165DAD]">v{item.version || idx + 1}</td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {item.updatedAt || item.timestamp ? new Date(item.updatedAt || item.timestamp).toLocaleString('en-IN') : 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{item.updatedBy || item.actor || 'SUPER_ADMIN'}</td>
                      <td className="py-2.5 px-3 text-slate-700">{item.changeReason || item.reason || 'No reason recorded'}</td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-500">
                        {Object.keys(flags).length > 0
                          ? Object.entries(flags)
                              .filter(([, v]) => Boolean(v))
                              .map(([k]) => k.replace('Enabled', ''))
                              .join(', ')
                          : 'N/A'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
