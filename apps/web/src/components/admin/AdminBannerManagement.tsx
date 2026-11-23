'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Upload,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Plus,
  Edit3,
  Trash2,
  Calendar,
  Smartphone,
  Monitor,
  Check,
  X,
  Clock,
  Layers,
  ArrowRight,
  Zap,
} from 'lucide-react';
import {
  adminFetchTopBanner,
  adminUpdateTopBanner,
  adminUploadBannerImage,
  adminFetchPopupCampaigns,
  adminCreatePopupCampaign,
  adminUpdatePopupCampaign,
  adminPublishPopupCampaign,
  adminDisablePopupCampaign,
  adminDeletePopupCampaign,
} from '../../lib/api';
import WelcomePopupModal, { PopupCampaign } from '../WelcomePopupModal';
import DashboardTopBanner from '../DashboardTopBanner';

type BannerSubTab = 'top-banner' | 'popup-campaigns';

export function AdminBannerManagement() {
  const [subTab, setSubTab] = useState<BannerSubTab>('top-banner');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Top Banner States
  const [topBanner, setTopBanner] = useState<any>(null);
  const [topTitle, setTopTitle] = useState('');
  const [topBadge, setTopBadge] = useState('');
  const [topDesktopImg, setTopDesktopImg] = useState('');
  const [topMobileImg, setTopMobileImg] = useState('');
  const [topLink, setTopLink] = useState('/dashboard');
  const [topAlt, setTopAlt] = useState('');
  const [topEnabled, setTopEnabled] = useState(true);
  const [topUploading, setTopUploading] = useState(false);
  const [topSaving, setTopSaving] = useState(false);
  const [topPreviewMode, setTopPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  // Popup Campaigns States
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [editingCampaign, setEditingCampaign] = useState<any | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [previewCampaign, setPreviewCampaign] = useState<PopupCampaign | null>(null);

  // Popup Form Fields
  const [formName, setFormName] = useState('');
  const [formHeading, setFormHeading] = useState('');
  const [formSubheading, setFormSubheading] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formBtnText, setFormBtnText] = useState('EXPLORE DASHBOARD');
  const [formBtnLink, setFormBtnLink] = useState('/dashboard');
  const [formFooter, setFormFooter] = useState('SMART MOBILITY • CONNECTED FUTURE');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formFrequency, setFormFrequency] = useState<'ONCE_PER_CAMPAIGN' | 'ONCE_DAILY' | 'EVERY_VISIT'>('ONCE_PER_CAMPAIGN');
  const [formStatus, setFormStatus] = useState<'DRAFT' | 'PUBLISHED' | 'DISABLED'>('DRAFT');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [popupUploading, setPopupUploading] = useState(false);
  const [popupSaving, setPopupSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [topData, campaignsData] = await Promise.all([
        adminFetchTopBanner().catch(() => null),
        adminFetchPopupCampaigns().catch(() => []),
      ]);

      if (topData) {
        setTopBanner(topData);
        setTopTitle(topData.title || '');
        setTopBadge(topData.badgeText || '');
        setTopDesktopImg(topData.desktopImageUrl || '');
        setTopMobileImg(topData.mobileImageUrl || '');
        setTopLink(topData.linkUrl || '/dashboard');
        setTopAlt(topData.altText || '');
        setTopEnabled(topData.isEnabled !== false);
      }

      setCampaigns(Array.isArray(campaignsData) ? campaignsData : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load banner data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ---------------------------------------------------------------------------
  // Top Banner Handlers
  // ---------------------------------------------------------------------------
  const handleTopImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, kind: 'desktop' | 'mobile') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setTopUploading(true);
    setError(null);
    try {
      const res = await adminUploadBannerImage(file, 'top');
      if (kind === 'desktop') {
        setTopDesktopImg(res.url);
      } else {
        setTopMobileImg(res.url);
      }
      setSuccess(`Uploaded ${kind} banner image successfully`);
    } catch (err: any) {
      setError(err.message || `Failed to upload ${kind} image`);
    } finally {
      setTopUploading(false);
      e.target.value = '';
    }
  };

  const handleSaveTopBanner = async () => {
    if (!topDesktopImg) {
      setError('Desktop banner image URL is required.');
      return;
    }

    setTopSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await adminUpdateTopBanner({
        title: topTitle.trim() || null,
        badgeText: topBadge.trim() || null,
        desktopImageUrl: topDesktopImg.trim(),
        mobileImageUrl: topMobileImg.trim() || null,
        linkUrl: topLink.trim() || '/dashboard',
        altText: topAlt.trim() || null,
        isEnabled: topEnabled,
      });

      setTopBanner(updated);
      setSuccess('Dashboard Top Banner updated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to update top banner');
    } finally {
      setTopSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Popup Campaign Handlers
  // ---------------------------------------------------------------------------
  const openCreateCampaignModal = () => {
    setIsCreatingNew(true);
    setEditingCampaign(null);
    setFormName('');
    setFormHeading('WELCOME TO ASKR EV');
    setFormSubheading('DRIVE THE ELECTRIC FUTURE');
    setFormMessage(
      'Welcome to ASKR EV — your electric mobility journey starts here! Explore our EV solutions, discover your membership benefits, manage your bookings, and stay connected with your team — all in one place.'
    );
    setFormBtnText('EXPLORE DASHBOARD');
    setFormBtnLink('/dashboard');
    setFormFooter('SMART MOBILITY • CONNECTED FUTURE');
    setFormImageUrl('/brand/askrev-full-logo.webp');
    setFormFrequency('ONCE_PER_CAMPAIGN');
    setFormStatus('DRAFT');
    setFormStartDate('');
    setFormEndDate('');
  };

  const openEditCampaignModal = (camp: any) => {
    setEditingCampaign(camp);
    setIsCreatingNew(false);
    setFormName(camp.name || '');
    setFormHeading(camp.heading || '');
    setFormSubheading(camp.subheading || '');
    setFormMessage(camp.message || '');
    setFormBtnText(camp.buttonText || 'EXPLORE DASHBOARD');
    setFormBtnLink(camp.buttonLink || '/dashboard');
    setFormFooter(camp.footerText || '');
    setFormImageUrl(camp.imageUrl || '');
    setFormFrequency(camp.frequency || 'ONCE_PER_CAMPAIGN');
    setFormStatus(camp.status || 'DRAFT');
    setFormStartDate(camp.startDate ? new Date(camp.startDate).toISOString().slice(0, 16) : '');
    setFormEndDate(camp.endDate ? new Date(camp.endDate).toISOString().slice(0, 16) : '');
  };

  const handlePopupImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPopupUploading(true);
    setError(null);
    try {
      const res = await adminUploadBannerImage(file, 'popup');
      setFormImageUrl(res.url);
      setSuccess('Uploaded popup photograph successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to upload popup image');
    } finally {
      setPopupUploading(false);
      e.target.value = '';
    }
  };

  const handleSaveCampaign = async (statusOverride?: 'DRAFT' | 'PUBLISHED') => {
    if (!formName.trim() || !formHeading.trim() || !formMessage.trim()) {
      setError('Campaign Name, Heading, and Message are required.');
      return;
    }

    setPopupSaving(true);
    setError(null);
    setSuccess(null);

    const payload = {
      name: formName.trim(),
      heading: formHeading.trim(),
      subheading: formSubheading.trim() || null,
      message: formMessage.trim(),
      buttonText: formBtnText.trim() || 'EXPLORE DASHBOARD',
      buttonLink: formBtnLink.trim() || '/dashboard',
      footerText: formFooter.trim() || null,
      imageUrl: formImageUrl.trim() || null,
      frequency: formFrequency,
      status: statusOverride || formStatus,
      startDate: formStartDate ? new Date(formStartDate).toISOString() : null,
      endDate: formEndDate ? new Date(formEndDate).toISOString() : null,
    };

    try {
      if (isCreatingNew) {
        await adminCreatePopupCampaign(payload);
        setSuccess('Created new popup campaign successfully!');
      } else if (editingCampaign) {
        await adminUpdatePopupCampaign(editingCampaign.id, payload);
        setSuccess('Updated popup campaign successfully!');
      }

      setIsCreatingNew(false);
      setEditingCampaign(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to save campaign');
    } finally {
      setPopupSaving(false);
    }
  };

  const handleTogglePublishCampaign = async (camp: any) => {
    setError(null);
    setSuccess(null);
    try {
      if (camp.status === 'PUBLISHED') {
        await adminDisablePopupCampaign(camp.id);
        setSuccess(`Disabled campaign "${camp.name}"`);
      } else {
        await adminPublishPopupCampaign(camp.id);
        setSuccess(`Published campaign "${camp.name}"`);
      }
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to toggle campaign status');
    }
  };

  const handleDeleteCampaign = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete campaign "${name}"?`)) return;

    setError(null);
    try {
      await adminDeletePopupCampaign(id);
      setSuccess(`Deleted campaign "${name}"`);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete campaign');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'SCHEDULED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'EXPIRED':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'DISABLED':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'DRAFT':
      default:
        return 'bg-purple-50 text-purple-700 border-purple-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#0C2348] tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#165DAD]" />
            <span>Banner & Welcome Popup Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage top promotional banners and admin-controlled welcome popups for Member Dashboard
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-[#0C2348] transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-xs text-red-500 hover:text-red-700 font-bold">
            Dismiss
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-xs text-emerald-600 hover:text-emerald-800 font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Sub-Tabs Selector */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setSubTab('top-banner')}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            subTab === 'top-banner'
              ? 'border-[#165DAD] text-[#165DAD]'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Monitor className="w-4 h-4" />
          <span>Dashboard Top Banner</span>
        </button>

        <button
          onClick={() => setSubTab('popup-campaigns')}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            subTab === 'popup-campaigns'
              ? 'border-[#165DAD] text-[#165DAD]'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Welcome Popup Campaigns</span>
          {campaigns.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 font-bold">
              {campaigns.length}
            </span>
          )}
        </button>
      </div>

      {/* =========================================================================
          SUB-TAB 1: DASHBOARD TOP BANNER
          ========================================================================= */}
      {subTab === 'top-banner' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Settings */}
          <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-[#0C2348]">Banner Configuration</h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={topEnabled}
                  onChange={(e) => setTopEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-[#165DAD] focus:ring-[#165DAD]"
                />
                <span className="text-xs font-bold text-slate-700">
                  {topEnabled ? 'Banner Enabled' : 'Banner Disabled'}
                </span>
              </label>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Promotional Title (Optional)
                </label>
                <input
                  type="text"
                  value={topTitle}
                  onChange={(e) => setTopTitle(e.target.value)}
                  placeholder="e.g. ASKR EV Urban Mobility Fleet"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#165DAD] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Badge Pill Text (Optional)
                </label>
                <input
                  type="text"
                  value={topBadge}
                  onChange={(e) => setTopBadge(e.target.value)}
                  placeholder="e.g. ELECTRIC MOBILITY or SPECIAL OFFER"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#165DAD] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Destination Link (Safe internal route)
                </label>
                <input
                  type="text"
                  value={topLink}
                  onChange={(e) => setTopLink(e.target.value)}
                  placeholder="/dashboard, /bikes, /scooters, /bookings"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#165DAD] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Desktop Image URL (Approved Asset)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={topDesktopImg}
                    onChange={(e) => setTopDesktopImg(e.target.value)}
                    placeholder="/uploads/hero/desktop/... or https://..."
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#165DAD] focus:outline-hidden"
                  />
                  <label className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => handleTopImageUpload(e, 'desktop')}
                      disabled={topUploading}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mobile Image URL (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={topMobileImg}
                    onChange={(e) => setTopMobileImg(e.target.value)}
                    placeholder="Defaults to desktop image if blank"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#165DAD] focus:outline-hidden"
                  />
                  <label className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => handleTopImageUpload(e, 'mobile')}
                      disabled={topUploading}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <button
                onClick={handleSaveTopBanner}
                disabled={topSaving || topUploading}
                className="w-full py-2.5 px-4 rounded-xl bg-[#165DAD] hover:bg-[#124B8D] text-white font-bold text-xs shadow transition-colors flex items-center justify-center gap-2"
              >
                {topSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Top Banner Configuration</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Live Preview Pane */}
          <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-[#0C2348] flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#165DAD]" />
                <span>Live Responsive Preview</span>
              </h2>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setTopPreviewMode('desktop')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                    topPreviewMode === 'desktop' ? 'bg-white shadow-xs text-[#165DAD]' : 'text-slate-500'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Desktop</span>
                </button>
                <button
                  onClick={() => setTopPreviewMode('mobile')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                    topPreviewMode === 'mobile' ? 'bg-white shadow-xs text-[#165DAD]' : 'text-slate-500'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Mobile</span>
                </button>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-center min-h-[220px]">
              <div
                className={`transition-all duration-300 w-full ${
                  topPreviewMode === 'mobile' ? 'max-w-[390px] border-x border-slate-300 px-2 py-4 bg-white rounded-xl shadow-xs' : 'max-w-full'
                }`}
              >
                <DashboardTopBanner
                  banner={{
                    title: topTitle || null,
                    badgeText: topBadge || null,
                    desktopImageUrl:
                      topDesktopImg ||
                      '/uploads/hero/desktop/urban-fleet-hero---harsil-leo-_1795105582720_1e863ffb12443fbf.webp',
                    mobileImageUrl: topMobileImg || topDesktopImg || null,
                    linkUrl: topLink || '/dashboard',
                    altText: topAlt || 'ASKR EV Banner Preview',
                    isEnabled: topEnabled,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 2: WELCOME POPUP CAMPAIGNS
          ========================================================================= */}
      {subTab === 'popup-campaigns' && (
        <div className="space-y-6">
          {/* Header Action Bar */}
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#0C2348]">Member Welcome Campaigns</h2>
            <button
              onClick={openCreateCampaignModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#0C2348] to-[#165DAD] text-white text-xs font-bold shadow hover:opacity-95 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              <span>New Welcome Campaign</span>
            </button>
          </div>

          {/* Campaigns Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">Campaign Name</th>
                    <th className="py-3.5 px-4">Heading & Copy</th>
                    <th className="py-3.5 px-4">Frequency</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Schedule (IST)</th>
                    <th className="py-3.5 px-4 text-center">Dismissals</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {campaigns.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No popup campaigns found. Click "New Welcome Campaign" to create one.
                      </td>
                    </tr>
                  ) : (
                    campaigns.map((camp) => (
                      <tr key={camp.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800">{camp.name}</div>
                          <div className="font-mono text-[10px] text-slate-400">ID: {camp.id.slice(0, 8)}...</div>
                        </td>

                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="font-bold text-[#165DAD] truncate">{camp.heading}</div>
                          <div className="text-[11px] text-slate-500 line-clamp-1">{camp.message}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded font-semibold text-slate-700">
                            {camp.frequency}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                              camp.computedStatus
                            )}`}
                          >
                            {camp.computedStatus}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-[11px] text-slate-500 whitespace-nowrap">
                          {camp.startDate ? (
                            <div>
                              <span className="text-slate-400">Start:</span>{' '}
                              {new Date(camp.startDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                            </div>
                          ) : (
                            <span className="text-slate-400">Immediate</span>
                          )}
                          {camp.endDate && (
                            <div>
                              <span className="text-slate-400">End:</span>{' '}
                              {new Date(camp.endDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                          {camp.dismissalCount ?? 0}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setPreviewCampaign(camp)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-[#165DAD] hover:bg-blue-50 transition-colors"
                              title="Live Modal Preview"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => openEditCampaignModal(camp)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              title="Edit Campaign"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleTogglePublishCampaign(camp)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                camp.status === 'PUBLISHED'
                                  ? 'text-amber-500 hover:bg-amber-50'
                                  : 'text-emerald-500 hover:bg-emerald-50'
                              }`}
                              title={camp.status === 'PUBLISHED' ? 'Disable Campaign' : 'Publish Campaign'}
                            >
                              {camp.status === 'PUBLISHED' ? (
                                <XCircle className="w-4 h-4" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4" />
                              )}
                            </button>

                            <button
                              onClick={() => handleDeleteCampaign(camp.id, camp.name)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Delete Campaign"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          CREATE / EDIT POPUP CAMPAIGN MODAL
          ========================================================================= */}
      {(isCreatingNew || editingCampaign) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div
            className="fixed inset-0 bg-[#0C2348]/75 backdrop-blur-xs"
            onClick={() => {
              setIsCreatingNew(false);
              setEditingCampaign(null);
            }}
          />

          <div className="relative bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 z-10 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-[#0C2348]">
                {isCreatingNew ? 'Create Welcome Popup Campaign' : `Edit: ${formName}`}
              </h2>
              <button
                onClick={() => {
                  setIsCreatingNew(false);
                  setEditingCampaign(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Campaign Name (Internal identifier)
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. ASKR EV Welcome, Festive Onboarding"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#165DAD] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Heading</label>
                <input
                  type="text"
                  value={formHeading}
                  onChange={(e) => setFormHeading(e.target.value)}
                  placeholder="e.g. WELCOME TO ASKR EV"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#165DAD] focus:outline-hidden font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subheading</label>
                <input
                  type="text"
                  value={formSubheading}
                  onChange={(e) => setFormSubheading(e.target.value)}
                  placeholder="e.g. DRIVE THE ELECTRIC FUTURE"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#165DAD] focus:outline-hidden"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Welcome Message</label>
                <textarea
                  rows={4}
                  value={formMessage}
                  onChange={(e) => setFormMessage(e.target.value)}
                  placeholder="Welcome message copy..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#165DAD] focus:outline-hidden resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Button Label</label>
                <input
                  type="text"
                  value={formBtnText}
                  onChange={(e) => setFormBtnText(e.target.value)}
                  placeholder="e.g. EXPLORE DASHBOARD"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#165DAD] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Button Destination (Safe Route)
                </label>
                <input
                  type="text"
                  value={formBtnLink}
                  onChange={(e) => setFormBtnLink(e.target.value)}
                  placeholder="/dashboard, /bikes, /scooters"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#165DAD] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Footer Notice</label>
                <input
                  type="text"
                  value={formFooter}
                  onChange={(e) => setFormFooter(e.target.value)}
                  placeholder="e.g. SMART MOBILITY • CONNECTED FUTURE"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#165DAD] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Display Frequency</label>
                <select
                  value={formFrequency}
                  onChange={(e: any) => setFormFrequency(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#165DAD] focus:outline-hidden bg-white"
                >
                  <option value="ONCE_PER_CAMPAIGN">Once per Campaign (Default)</option>
                  <option value="ONCE_DAILY">Once Daily</option>
                  <option value="EVERY_VISIT">Every Dashboard Visit</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Banner / Vehicle Photograph URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formImageUrl}
                    onChange={(e) => setFormImageUrl(e.target.value)}
                    placeholder="/brand/askrev-full-logo.webp or upload image"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#165DAD] focus:outline-hidden"
                  />
                  <label className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePopupImageUpload}
                      disabled={popupUploading}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Start Date & Time (IST)
                </label>
                <input
                  type="datetime-local"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#165DAD] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  End Date & Time (IST)
                </label>
                <input
                  type="datetime-local"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#165DAD] focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() =>
                  setPreviewCampaign({
                    id: 'preview',
                    name: formName || 'Preview',
                    heading: formHeading,
                    subheading: formSubheading,
                    message: formMessage,
                    buttonText: formBtnText,
                    buttonLink: formBtnLink,
                    footerText: formFooter,
                    imageUrl: formImageUrl,
                    frequency: formFrequency,
                  })
                }
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5 text-[#165DAD]" />
                <span>Live Preview</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveCampaign('DRAFT')}
                  disabled={popupSaving}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                >
                  Save Draft
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveCampaign('PUBLISHED')}
                  disabled={popupSaving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#0C2348] to-[#165DAD] hover:opacity-95 text-white text-xs font-bold shadow transition-opacity flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Publish Campaign</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Preview Modal */}
      {previewCampaign && (
        <WelcomePopupModal
          campaign={previewCampaign}
          isOpen={Boolean(previewCampaign)}
          onClose={() => setPreviewCampaign(null)}
          onExplore={() => setPreviewCampaign(null)}
        />
      )}
    </div>
  );
}
