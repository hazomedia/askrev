'use client';

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Lock,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Sliders,
  Sparkles,
  Zap,
  Activity,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';
import QRCode from 'qrcode';
import { fetchApi } from '../../lib/api';

interface AdminPaymentSettingsProps {
  currentUser: any;
}

export function AdminPaymentSettings({ currentUser }: AdminPaymentSettingsProps) {
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  // Sub-tab selection: 'upi' | 'gateways' | 'logs'
  const [activeSection, setActiveSection] = useState<'upi' | 'gateways' | 'logs'>('upi');

  // Loading & Action feedback
  const [loading, setLoading] = useState(true);
  const [savingUpi, setSavingUpi] = useState(false);
  const [savingGateway, setSavingGateway] = useState<string | null>(null);
  const [testingGateway, setTestingGateway] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // UPI Settings State
  const [upiEnabled, setUpiEnabled] = useState(true);
  const [merchantUpiVpa, setMerchantUpiVpa] = useState('');
  const [merchantName, setMerchantName] = useState('ASKR EV Mobility');
  const [isUpiVerified, setIsUpiVerified] = useState(false);
  const [manualReviewRequired, setManualReviewRequired] = useState(true);
  const [upiNotes, setUpiNotes] = useState('');

  // UPI Preview QR State
  const [previewTier, setPreviewTier] = useState<'PRO' | 'ULTRA' | 'UPGRADE'>('PRO');
  const [previewQrUrl, setPreviewQrUrl] = useState<string | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Gateway Settings State
  const [gateways, setGateways] = useState<any[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('PINELABS');
  const [gatewayFormData, setGatewayFormData] = useState<Record<string, any>>({});
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});

  // Gateway Logs State
  const [logs, setLogs] = useState<any[]>([]);
  const [logFilterProvider, setLogFilterProvider] = useState('ALL');
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchApi<any>('/payments/admin/settings');
      if (data?.upi) {
        setUpiEnabled(Boolean(data.upi.upiEnabled));
        setMerchantUpiVpa(data.upi.merchantUpiVpa || '');
        setMerchantName(data.upi.merchantName || 'ASKR EV Mobility');
        setIsUpiVerified(Boolean(data.upi.isVerified));
        setManualReviewRequired(data.upi.manualReviewRequired ?? true);
        setUpiNotes(data.upi.notes || '');
      }

      if (Array.isArray(data?.gateways)) {
        setGateways(data.gateways);
        // Initialize form data map for each gateway
        const formMap: Record<string, any> = {};
        data.gateways.forEach((gw: any) => {
          formMap[gw.provider] = {
            isEnabled: gw.isEnabled,
            isSandbox: gw.isSandbox,
            merchantId: gw.merchantId || '',
            secretKey: gw.secretKeyMasked || '',
            webhookSecret: gw.webhookSecretMasked || '',
            webhookUrl: gw.webhookUrl || `/api/payments/webhook/${gw.provider.toLowerCase()}`,
          };
        });
        setGatewayFormData(formMap);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load payment settings.');
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      let url = '/payments/admin/logs?limit=50';
      if (logFilterProvider !== 'ALL') url += `&provider=${logFilterProvider}`;
      const data = await fetchApi<any[]>(url);
      setLogs(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to fetch gateway logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeSection === 'logs') {
      loadLogs();
    }
  }, [activeSection, logFilterProvider]);

  // Generate interactive QR Code for UPI Preview
  useEffect(() => {
    if (merchantUpiVpa.trim()) {
      const amount = previewTier === 'PRO' ? 3000 : previewTier === 'ULTRA' ? 33000 : 30000;
      const note = `ASKREV-TEST-${previewTier}`;
      const upiUri = `upi://pay?pa=${encodeURIComponent(merchantUpiVpa.trim())}&pn=${encodeURIComponent(
        merchantName || 'ASKR EV Mobility'
      )}&am=${amount}.00&cu=INR&tn=${encodeURIComponent(note)}`;

      QRCode.toDataURL(upiUri, { width: 200, margin: 1 })
        .then((url) => setPreviewQrUrl(url))
        .catch(() => setPreviewQrUrl(null));
    } else {
      setPreviewQrUrl(null);
    }
  }, [merchantUpiVpa, merchantName, previewTier]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleSaveUpi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    setSavingUpi(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await fetchApi('/payments/admin/upi', {
        method: 'PUT',
        body: JSON.stringify({
          upiEnabled,
          merchantUpiVpa: merchantUpiVpa.trim() || undefined,
          merchantName: merchantName.trim() || 'ASKR EV Mobility',
          isVerified: isUpiVerified,
          manualReviewRequired,
          notes: upiNotes.trim() || undefined,
        }),
      });
      setSuccessMessage('Official Merchant UPI settings updated successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
      await loadSettings();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update UPI settings.');
    } finally {
      setSavingUpi(false);
    }
  };

  const handleSaveGateway = async (provider: string) => {
    if (!isSuperAdmin) return;
    setSavingGateway(provider);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const form = gatewayFormData[provider];
      await fetchApi('/payments/admin/gateway', {
        method: 'PUT',
        body: JSON.stringify({
          provider,
          isEnabled: form.isEnabled,
          isSandbox: form.isSandbox,
          merchantId: form.merchantId,
          secretKey: form.secretKey,
          webhookSecret: form.webhookSecret,
          webhookUrl: form.webhookUrl,
        }),
      });
      setSuccessMessage(`${provider} gateway configuration saved and encrypted at rest.`);
      setTimeout(() => setSuccessMessage(null), 4000);
      await loadSettings();
    } catch (err: any) {
      setErrorMessage(err.message || `Failed to update ${provider} settings.`);
    } finally {
      setSavingGateway(null);
    }
  };

  const handleTestConnection = async (provider: string) => {
    setTestingGateway(provider);
    setTestResult(null);
    try {
      const form = gatewayFormData[provider];
      const res = await fetchApi<any>('/payments/admin/test-connection', {
        method: 'POST',
        body: JSON.stringify({
          provider,
          merchantId: form?.merchantId,
          secretKey: form?.secretKey,
          isSandbox: form?.isSandbox,
        }),
      });
      setTestResult({ provider, ...res });
    } catch (err: any) {
      setTestResult({
        provider,
        success: false,
        message: err.message || 'Connection test failed unexpectedly.',
      });
    } finally {
      setTestingGateway(null);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="p-8 rounded-xl bg-white border border-slate-200 text-center space-y-3">
        <Lock className="w-8 h-8 text-amber-500 mx-auto" />
        <h3 className="font-bold text-base text-[#253247]">Access Restricted</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Payment Settings and Gateway Credential Management are strictly restricted to Super Administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Super Admin Settings
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Encrypted At Rest
            </span>
          </div>
          <h2 className="text-lg font-bold text-[#253247] mt-1.5 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#165DAD]" />
            <span>Centralized Payment Settings & Gateway Integration</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure official merchant UPI collections, scannable QR generation, and payment gateway integrations (Pine Labs Primary, Razorpay, Cashfree, PhonePe).
          </p>
        </div>

        <button
          type="button"
          onClick={loadSettings}
          disabled={loading}
          className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Reload</span>
        </button>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Section Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveSection('upi')}
          className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${
            activeSection === 'upi'
              ? 'bg-[#165DAD] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>1. Official Merchant UPI</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('gateways')}
          className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${
            activeSection === 'gateways'
              ? 'bg-[#165DAD] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>2. Payment Gateways</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('logs')}
          className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${
            activeSection === 'logs'
              ? 'bg-[#165DAD] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>3. Gateway Logs</span>
        </button>
      </div>

      {/* =========================================================================
          SECTION 1: MANUAL MERCHANT UPI CONFIGURATION & LIVE QR PREVIEW
          ========================================================================= */}
      {activeSection === 'upi' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form Settings */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-[#253247] flex items-center gap-2">
                <QrCode className="w-4 h-4 text-[#165DAD]" />
                <span>UPI Configuration & Collection Settings</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Enable or disable manual UPI payments and configure the official merchant VPA. Payment instructions are strictly hidden from members until verified.
              </p>
            </div>

            <form onSubmit={handleSaveUpi} className="space-y-4 text-xs">
              {/* Enable / Disable UPI Payments */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-[#253247] block">Enable Manual UPI Payments</span>
                  <span className="text-[11px] text-slate-500">
                    When enabled, verified UPI VPA and scannable QR are offered on member booking screens.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={upiEnabled}
                    onChange={(e) => setUpiEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#165DAD]"></div>
                </label>
              </div>

              {/* Merchant UPI ID (VPA) */}
              <div>
                <label className="block font-semibold text-[#253247] mb-1">
                  Official Merchant UPI ID (VPA) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required={upiEnabled}
                  value={merchantUpiVpa}
                  onChange={(e) => setMerchantUpiVpa(e.target.value.trim())}
                  placeholder="e.g. askrev@icici or askrevmobility@hdfcbank"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs focus:outline-none focus:border-[#165DAD]"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Never hardcoded in frontend. Must be a valid Indian banking VPA (e.g. account@bank).
                </p>
              </div>

              {/* Merchant Display Name */}
              <div>
                <label className="block font-semibold text-[#253247] mb-1">
                  Payee / Business Display Name
                </label>
                <input
                  type="text"
                  value={merchantName}
                  onChange={(e) => setMerchantName(e.target.value)}
                  placeholder="ASKR EV Mobility Private Limited"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-[#165DAD]"
                />
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isUpiVerifiedCheck"
                    checked={isUpiVerified}
                    onChange={(e) => setIsUpiVerified(e.target.checked)}
                    className="rounded border-slate-300 text-[#165DAD] focus:ring-[#165DAD]"
                  />
                  <label htmlFor="isUpiVerifiedCheck" className="font-semibold text-slate-800 cursor-pointer">
                    Verify Merchant UPI VPA & Authorize Member QR Display
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="manualReviewCheck"
                    checked={manualReviewRequired}
                    onChange={(e) => setManualReviewRequired(e.target.checked)}
                    className="rounded border-slate-300 text-[#165DAD] focus:ring-[#165DAD]"
                  />
                  <label htmlFor="manualReviewCheck" className="text-slate-700 cursor-pointer">
                    Require Authorized Admin Bank Reconciliation (Booking stays PENDING until UTR verified)
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-semibold text-[#253247] mb-1">Internal Audit Notes</label>
                <input
                  type="text"
                  value={upiNotes}
                  onChange={(e) => setUpiNotes(e.target.value)}
                  placeholder="e.g. ICICI Bank primary collection current account ending in 9801"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-[#165DAD]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={savingUpi}
                  className="px-5 py-2 rounded-lg bg-[#165DAD] hover:bg-[#12498a] text-white text-xs font-semibold shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{savingUpi ? 'Saving UPI Settings...' : 'Save UPI Settings'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Live QR Preview & Testing */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#165DAD] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                Interactive Testing
              </span>
              <h3 className="font-bold text-sm text-[#253247] mt-1">Live UPI QR Code Preview</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Scan or verify the generated payment string for each vehicle booking tier.
              </p>
            </div>

            {/* Tier Selector */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setPreviewTier('PRO')}
                className={`flex-1 py-1.5 rounded-md font-bold text-center transition-all ${
                  previewTier === 'PRO' ? 'bg-white text-[#165DAD] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                EV PRO (₹3k)
              </button>
              <button
                type="button"
                onClick={() => setPreviewTier('ULTRA')}
                className={`flex-1 py-1.5 rounded-md font-bold text-center transition-all ${
                  previewTier === 'ULTRA' ? 'bg-white text-[#165DAD] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                EV ULTRA (₹33k)
              </button>
              <button
                type="button"
                onClick={() => setPreviewTier('UPGRADE')}
                className={`flex-1 py-1.5 rounded-md font-bold text-center transition-all ${
                  previewTier === 'UPGRADE' ? 'bg-white text-[#165DAD] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Upgrade (₹30k)
              </button>
            </div>

            {/* QR Card */}
            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 flex flex-col items-center justify-center text-center space-y-3">
              {merchantUpiVpa.trim() && previewQrUrl ? (
                <>
                  <div className="w-36 h-36 bg-white p-2 rounded-xl border border-blue-200 shadow-xs flex items-center justify-center">
                    <img src={previewQrUrl} alt="UPI QR Code Preview" className="w-32 h-32 object-contain" />
                  </div>
                  <div className="space-y-1">
                    <span className="font-mono font-bold text-xs text-[#165DAD] bg-white px-2 py-0.5 rounded border border-blue-200">
                      {merchantUpiVpa}
                    </span>
                    <div className="text-xs font-bold text-[#253247]">
                      Payable: {previewTier === 'PRO' ? '₹3,000' : previewTier === 'ULTRA' ? '₹33,000' : '₹30,000'}
                    </div>
                    <p className="text-[10px] text-slate-500">{merchantName || 'ASKR EV Mobility'}</p>
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-slate-400 space-y-2">
                  <QrCode className="w-12 h-12 mx-auto text-slate-300" />
                  <p className="text-xs">Configure a Merchant UPI VPA to preview the dynamic QR code.</p>
                </div>
              )}
            </div>

            {/* Status Indicator */}
            <div className="p-3 rounded-lg border text-xs space-y-1">
              <span className="text-[11px] text-slate-500 font-semibold block">Member Booking Visibility:</span>
              {upiEnabled && isUpiVerified && merchantUpiVpa ? (
                <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Visible to Members with Scannable QR & UTR Entry
                </span>
              ) : (
                <span className="text-amber-700 font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Temporarily Withheld (Pending verification or disabled)
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 2: EXTENSIBLE PAYMENT GATEWAY PROVIDER CONFIGURATION
          ========================================================================= */}
      {activeSection === 'gateways' && (
        <div className="space-y-6">
          {/* Provider Selection Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {gateways.map((gw) => {
              const isSelected = selectedProvider === gw.provider;
              const isPrimary = gw.provider === 'PINELABS';
              return (
                <button
                  key={gw.provider}
                  type="button"
                  onClick={() => {
                    setSelectedProvider(gw.provider);
                    setTestResult(null);
                  }}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-[#165DAD] bg-blue-50/50 shadow-xs ring-1 ring-[#165DAD]'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-[#253247]">{gw.name}</span>
                    {isPrimary ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-[#165DAD] border border-blue-300">
                        PRIMARY
                      </span>
                    ) : gw.isFunctional ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        OPTIONAL
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        CONFIG ONLY
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between">
                    <span>Status: {gw.isEnabled ? 'Enabled' : 'Disabled'}</span>
                    <span className="font-mono text-[10px]">{gw.isSandbox ? 'Sandbox' : 'Production'}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Provider Configuration Card */}
          {(() => {
            const gw = gateways.find((g) => g.provider === selectedProvider);
            if (!gw) return null;
            const form = gatewayFormData[gw.provider] || {};

            return (
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-[#253247]">{gw.name}</h3>
                      {gw.isFunctional ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active Provider Architecture
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Configuration-Only (Awaiting Onboarding)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {gw.isFunctional
                        ? 'Full order creation, HMAC-SHA256 signature verification, and server-side webhook ingestion active.'
                        : 'Credentials format and signature verification interfaces defined. Live checkout enabled upon completing merchant banking onboarding.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleTestConnection(gw.provider)}
                      disabled={testingGateway === gw.provider}
                      className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Zap className={`w-3.5 h-3.5 text-amber-600 ${testingGateway === gw.provider ? 'animate-bounce' : ''}`} />
                      <span>{testingGateway === gw.provider ? 'Testing Connection...' : 'Test Connection'}</span>
                    </button>
                  </div>
                </div>

                {/* Connection Test Result Banner */}
                {testResult && testResult.provider === gw.provider && (
                  <div
                    className={`p-4 rounded-xl border text-xs space-y-1 animate-in fade-in ${
                      testResult.success
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-red-50 border-red-200 text-red-900'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-2">
                      {testResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      )}
                      <span>Connection Test {testResult.success ? 'PASSED' : 'FAILED'}</span>
                    </div>
                    <p className="text-[11px]">{testResult.message}</p>
                    {testResult.details && (
                      <pre className="text-[10px] font-mono bg-white/70 p-2 rounded mt-1 overflow-x-auto">
                        {JSON.stringify(testResult.details, null, 2)}
                      </pre>
                    )}
                  </div>
                )}

                {/* Settings Form */}
                <div className="space-y-4 text-xs">
                  {/* Enable Switch & Sandbox Mode */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-[#253247] block">Enable Gateway Integration</span>
                        <span className="text-[11px] text-slate-500">
                          Activate for customer checkout when credentials and signature verification pass.
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.isEnabled || false}
                          onChange={(e) =>
                            setGatewayFormData({
                              ...gatewayFormData,
                              [gw.provider]: { ...form, isEnabled: e.target.checked },
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#165DAD]"></div>
                      </label>
                    </div>

                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-[#253247] block">Sandbox / Test Mode</span>
                        <span className="text-[11px] text-slate-500">
                          {form.isSandbox ? 'Testing against sandbox API keys' : 'Live production mode active'}
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.isSandbox ?? true}
                          onChange={(e) =>
                            setGatewayFormData({
                              ...gatewayFormData,
                              [gw.provider]: { ...form, isSandbox: e.target.checked },
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                      </label>
                    </div>
                  </div>

                  {/* Merchant ID & Secret Key */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-[#253247] mb-1">
                        {gw.provider === 'PINELABS'
                          ? 'Client ID (Plural Merchant ID)'
                          : gw.provider === 'RAZORPAY'
                          ? 'Key ID'
                          : 'Merchant Key ID / App ID'}{' '}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.merchantId || ''}
                        onChange={(e) =>
                          setGatewayFormData({
                            ...gatewayFormData,
                            [gw.provider]: { ...form, merchantId: e.target.value.trim() },
                          })
                        }
                        placeholder={
                          gw.provider === 'PINELABS'
                            ? 'Plural Client ID'
                            : gw.provider === 'RAZORPAY'
                            ? 'rzp_test_... or rzp_live_...'
                            : 'Merchant ID'
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs focus:outline-none focus:border-[#165DAD]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-[#253247] mb-1">
                        {gw.provider === 'PINELABS' ? 'Client Secret' : 'Merchant Key Secret'}{' '}
                        <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={revealedSecrets[gw.provider] ? 'text' : 'password'}
                          value={form.secretKey || ''}
                          onChange={(e) =>
                            setGatewayFormData({
                              ...gatewayFormData,
                              [gw.provider]: { ...form, secretKey: e.target.value.trim() },
                            })
                          }
                          placeholder="••••••••••••••••"
                          className="w-full pl-3 pr-9 py-2 rounded-lg border border-slate-300 font-mono text-xs focus:outline-none focus:border-[#165DAD]"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setRevealedSecrets({
                              ...revealedSecrets,
                              [gw.provider]: !revealedSecrets[gw.provider],
                            })
                          }
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                        >
                          {revealedSecrets[gw.provider] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Encrypted with AES-256-GCM at rest. Masked in browser responses.
                      </p>
                    </div>
                  </div>

                  {/* Webhook Secret & Webhook URL */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block font-semibold text-[#253247] mb-1">Webhook Secret Key</label>
                      <input
                        type="password"
                        value={form.webhookSecret || ''}
                        onChange={(e) =>
                          setGatewayFormData({
                            ...gatewayFormData,
                            [gw.provider]: { ...form, webhookSecret: e.target.value.trim() },
                          })
                        }
                        placeholder="••••••••••••••••"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs focus:outline-none focus:border-[#165DAD]"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Used to verify incoming HMAC SHA256 webhook signatures server-side.
                      </p>
                    </div>

                    <div>
                      <label className="block font-semibold text-[#253247] mb-1">Configured Webhook URL</label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          readOnly
                          value={form.webhookUrl || `/api/payments/webhook/${gw.provider.toLowerCase()}`}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 font-mono text-xs text-slate-600"
                        />
                        <button
                          type="button"
                          onClick={() => handleCopy(form.webhookUrl || `/api/payments/webhook/${gw.provider.toLowerCase()}`)}
                          className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
                          title="Copy Webhook URL"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Register this URL in your {gw.name} dashboard webhooks section.
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-mono">
                      Last Tested: {gw.lastTestedAt ? new Date(gw.lastTestedAt).toLocaleString('en-IN') : 'Never'}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleSaveGateway(gw.provider)}
                      disabled={savingGateway === gw.provider}
                      className="px-5 py-2 rounded-lg bg-[#165DAD] hover:bg-[#12498a] text-white text-xs font-semibold shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{savingGateway === gw.provider ? 'Encrypting & Saving...' : `Save ${gw.name} Settings`}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* =========================================================================
          SECTION 3: PAYMENT GATEWAY AUDIT & TRANSACTION LOGS
          ========================================================================= */}
      {activeSection === 'logs' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-[#253247] flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#165DAD]" />
                <span>Payment Gateway Transaction & Webhook Logs</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit trail for order creation, connection handshakes, webhook receipts, and signature validations.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={logFilterProvider}
                onChange={(e) => setLogFilterProvider(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700"
              >
                <option value="ALL">All Providers</option>
                <option value="PINELABS">Pine Labs (Primary)</option>
                <option value="RAZORPAY">Razorpay (Optional)</option>
                <option value="CASHFREE">Cashfree (Optional)</option>
                <option value="PHONEPE">PhonePe (Optional)</option>
              </select>

              <button
                type="button"
                onClick={loadLogs}
                disabled={loadingLogs}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
                title="Refresh Logs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7F9FC] text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Provider</th>
                  <th className="py-2.5 px-3">Event</th>
                  <th className="py-2.5 px-3">Order / Payment ID</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Message / Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                        {new Date(log.createdAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-700">{log.provider}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 border border-slate-200">
                          {log.event}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                        {log.orderId || log.paymentId || '—'}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-[#165DAD]">
                        {log.amountINR ? `₹${log.amountINR.toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                            log.status === 'SUCCESS'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px] max-w-xs truncate">
                        {log.errorMessage || 'OK'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No gateway logs recorded for this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
