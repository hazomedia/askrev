'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Upload,
  Eye,
  CheckCircle2,
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
  ArrowUp,
  ArrowDown,
  Play,
} from 'lucide-react';
import {
  adminFetchSlides,
  adminCreateSlide,
  adminUpdateSlide,
  adminPublishSlide,
  adminDisableSlide,
  adminDeleteSlide,
  adminReorderSlides,
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

type BannerSubTab = 'carousel-slides' | 'popup-campaigns';

export function AdminBannerManagement() {
  const [subTab, setSubTab] = useState<BannerSubTab>('carousel-slides');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Carousel Slides States
  // ---------------------------------------------------------------------------
  const [slides, setSlides] = useState<any[]>([]);
  const [editingSlide, setEditingSlide] = useState<any | null>(null);
  const [isCreatingSlide, setIsCreatingSlide] = useState(false);
  const [slideUploading, setSlideUploading] = useState(false);
  const [slideSaving, setSlideSaving] = useState(false);
  const [slidePreviewMode, setSlidePreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  // Slide Form Fields
  const [slideTitle, setSlideTitle] = useState('');
  const [slideSubtitle, setSlideSubtitle] = useState('');
  const [slideBadgeText, setSlideBadgeText] = useState('ELECTRIC MOBILITY');
  const [slideButtonText, setSlideButtonText] = useState('EXPLORE FLEET');
  const [slideDesktopImg, setSlideDesktopImg] = useState('');
  const [slideMobileImg, setSlideMobileImg] = useState('');
  const [slideLinkUrl, setSlideLinkUrl] = useState('/dashboard');
  const [slideAltText, setSlideAltText] = useState('');
  const [slideAutoplayInterval, setSlideAutoplayInterval] = useState(5000);
  const [slideStatus, setSlideStatus] = useState<'PUBLISHED' | 'DRAFT' | 'DISABLED'>('PUBLISHED');
  const [slideIsEnabled, setSlideIsEnabled] = useState(true);
  const [slideStartDate, setSlideStartDate] = useState('');
  const [slideEndDate, setSlideEndDate] = useState('');

  // ---------------------------------------------------------------------------
  // Popup Campaigns States
  // ---------------------------------------------------------------------------
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [editingCampaign, setEditingCampaign] = useState<any | null>(null);
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
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
  const [formFrequency, setFormFrequency] = useState<'ONCE_PER_CAMPAIGN' | 'ONCE_DAILY' | 'EVERY_VISIT'>('EVERY_VISIT');
  const [formStatus, setFormStatus] = useState<'DRAFT' | 'PUBLISHED' | 'DISABLED'>('PUBLISHED');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [popupUploading, setPopupUploading] = useState(false);
  const [popupSaving, setPopupSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [slidesData, campaignsData] = await Promise.all([
        adminFetchSlides().catch(() => []),
        adminFetchPopupCampaigns().catch(() => []),
      ]);

      setSlides(Array.isArray(slidesData) ? slidesData : []);
      setCampaigns(Array.isArray(campaignsData) ? campaignsData : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load banner and slider data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ---------------------------------------------------------------------------
  // Carousel Slide Handlers
  // ---------------------------------------------------------------------------
  const handleOpenCreateSlide = () => {
    setEditingSlide(null);
    setIsCreatingSlide(true);
    setSlideTitle('');
    setSlideSubtitle('');
    setSlideBadgeText('ELECTRIC MOBILITY');
    setSlideButtonText('EXPLORE FLEET');
    setSlideDesktopImg('');
    setSlideMobileImg('');
    setSlideLinkUrl('/dashboard');
    setSlideAltText('');
    setSlideAutoplayInterval(5000);
    setSlideStatus('PUBLISHED');
    setSlideIsEnabled(true);
    setSlideStartDate('');
    setSlideEndDate('');
  };

  const handleEditSlide = (slide: any) => {
    setIsCreatingSlide(false);
    setEditingSlide(slide);
    setSlideTitle(slide.title || '');
    setSlideSubtitle(slide.subtitle || '');
    setSlideBadgeText(slide.badgeText || '');
    setSlideButtonText(slide.buttonText || 'EXPLORE FLEET');
    setSlideDesktopImg(slide.desktopImageUrl || '');
    setSlideMobileImg(slide.mobileImageUrl || '');
    setSlideLinkUrl(slide.linkUrl || '/dashboard');
    setSlideAltText(slide.altText || '');
    setSlideAutoplayInterval(slide.autoplayInterval || 5000);
    setSlideStatus(slide.status || 'PUBLISHED');
    setSlideIsEnabled(slide.isEnabled !== false);
    setSlideStartDate(slide.startDate ? new Date(slide.startDate).toISOString().slice(0, 16) : '');
    setSlideEndDate(slide.endDate ? new Date(slide.endDate).toISOString().slice(0, 16) : '');
  };

  const handleSlideImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, kind: 'desktop' | 'mobile') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSlideUploading(true);
    setError(null);
    try {
      const res = await adminUploadBannerImage(file, 'top');
      if (kind === 'desktop') {
        setSlideDesktopImg(res.url);
      } else {
        setSlideMobileImg(res.url);
      }
      setSuccess(`Uploaded ${kind} slide image to persistent storage`);
    } catch (err: any) {
      setError(err.message || `Failed to upload ${kind} slide image`);
    } finally {
      setSlideUploading(false);
      e.target.value = '';
    }
  };

  const handleSaveSlide = async () => {
    if (!slideDesktopImg.trim()) {
      setError('Desktop slide image is required (Recommended: 1920 × 600 px).');
      return;
    }

    setSlideSaving(true);
    setError(null);
    setSuccess(null);

    const payload = {
      title: slideTitle.trim() || null,
      subtitle: slideSubtitle.trim() || null,
      badgeText: slideBadgeText.trim() || null,
      buttonText: slideButtonText.trim() || null,
      desktopImageUrl: slideDesktopImg.trim(),
      mobileImageUrl: slideMobileImg.trim() || null,
      linkUrl: slideLinkUrl.trim() || '/dashboard',
      altText: slideAltText.trim() || null,
      autoplayInterval: Number(slideAutoplayInterval) || 5000,
      status: slideStatus,
      isEnabled: slideIsEnabled,
      startDate: slideStartDate ? new Date(slideStartDate).toISOString() : null,
      endDate: slideEndDate ? new Date(slideEndDate).toISOString() : null,
    };

    try {
      if (isCreatingSlide) {
        await adminCreateSlide(payload);
        setSuccess('Created new carousel slide successfully!');
      } else if (editingSlide) {
        await adminUpdateSlide(editingSlide.id, payload);
        setSuccess('Updated carousel slide successfully!');
      }

      setIsCreatingSlide(false);
      setEditingSlide(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to save slide');
    } finally {
      setSlideSaving(false);
    }
  };

  const handleTogglePublishSlide = async (slide: any) => {
    setError(null);
    setSuccess(null);
    try {
      if (slide.status === 'PUBLISHED') {
        await adminDisableSlide(slide.id);
        setSuccess(`Disabled slide "${slide.title || slide.id}"`);
      } else {
        await adminPublishSlide(slide.id);
        setSuccess(`Published slide "${slide.title || slide.id}"`);
      }
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to toggle slide status');
    }
  };

  const handleDeleteSlide = async (id: string, title?: string) => {
    const slideName = title || 'this slide';
    if (!confirm(`Are you sure you want to delete ${slideName}? This action cannot be undone.`)) {
      return;
    }

    setError(null);
    try {
      await adminDeleteSlide(id);
      setSuccess(`Deleted slide "${slideName}"`);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete slide');
    }
  };

  const handleMoveSlide = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= slides.length) return;

    const newSlides = [...slides];
    const temp = newSlides[index];
    newSlides[index] = newSlides[targetIndex];
    newSlides[targetIndex] = temp;

    setSlides(newSlides);
    setError(null);

    try {
      const slideIds = newSlides.map((s) => s.id);
      await adminReorderSlides(slideIds);
      setSuccess('Slide order updated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to reorder slides');
      await loadData();
    }
  };

  // ---------------------------------------------------------------------------
  // Popup Campaign Handlers
  // ---------------------------------------------------------------------------
  const handleOpenCreateCampaign = () => {
    setEditingCampaign(null);
    setIsCreatingCampaign(true);
    setFormName('');
    setFormHeading('');
    setFormSubheading('');
    setFormMessage('');
    setFormBtnText('EXPLORE DASHBOARD');
    setFormBtnLink('/dashboard');
    setFormFooter('SMART MOBILITY • CONNECTED FUTURE');
    setFormImageUrl('/brand/askrev-full-logo.webp');
    setFormFrequency('EVERY_VISIT');
    setFormStatus('PUBLISHED');
    setFormStartDate('');
    setFormEndDate('');
  };

  const handleEditCampaign = (camp: any) => {
    setIsCreatingCampaign(false);
    setEditingCampaign(camp);
    setFormName(camp.name);
    setFormHeading(camp.heading);
    setFormSubheading(camp.subheading || '');
    setFormMessage(camp.message);
    setFormBtnText(camp.buttonText || 'EXPLORE DASHBOARD');
    setFormBtnLink(camp.buttonLink || '/dashboard');
    setFormFooter(camp.footerText || '');
    setFormImageUrl(camp.imageUrl || '');
    setFormFrequency(camp.frequency || 'EVERY_VISIT');
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
      if (isCreatingCampaign) {
        await adminCreatePopupCampaign(payload);
        setSuccess('Created new popup campaign successfully!');
      } else if (editingCampaign) {
        await adminUpdatePopupCampaign(editingCampaign.id, payload);
        setSuccess('Updated popup campaign successfully!');
      }

      setIsCreatingCampaign(false);
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

  // Preview helper slide object
  const currentFormSlide = {
    title: slideTitle.trim() || 'ASKR EV Urban Mobility Fleet',
    subtitle: slideSubtitle.trim() || 'Smart • Connected • Sustainable Electric Mobility',
    badgeText: slideBadgeText.trim() || 'ELECTRIC MOBILITY',
    buttonText: slideButtonText.trim() || 'EXPLORE FLEET',
    desktopImageUrl:
      slideDesktopImg.trim() ||
      '/uploads/hero/desktop/urban-fleet-hero---harsil-leo-_1795105582720_1e863ffb12443fbf.webp',
    mobileImageUrl: slideMobileImg.trim() || undefined,
    linkUrl: slideLinkUrl.trim() || '/dashboard',
    isEnabled: slideIsEnabled,
    autoplayInterval: Number(slideAutoplayInterval) || 5000,
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#0C2348] tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#165DAD]" />
            <span>Dashboard Banner & Welcome Popup Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Super Admin controls for promotional multi-slide carousel and visitor welcome popup campaigns
          </p>
        </div>

        <div className="flex items-center gap-2">
          {subTab === 'carousel-slides' && (
            <button
              onClick={handleOpenCreateSlide}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#165DAD] to-[#1D4ED8] hover:from-[#12498a] hover:to-[#1742b6] text-white text-xs font-bold transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Slide</span>
            </button>
          )}

          {subTab === 'popup-campaigns' && (
            <button
              onClick={handleOpenCreateCampaign}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#165DAD] to-[#1D4ED8] hover:from-[#12498a] hover:to-[#1742b6] text-white text-xs font-bold transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>New Popup Campaign</span>
            </button>
          )}

          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-[#0C2348] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
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
          onClick={() => setSubTab('carousel-slides')}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            subTab === 'carousel-slides'
              ? 'border-[#165DAD] text-[#165DAD]'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Monitor className="w-4 h-4" />
          <span>Dashboard Carousel Slides</span>
          {slides.length > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
              {slides.length}
            </span>
          )}
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
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
              {campaigns.length}
            </span>
          )}
        </button>
      </div>

      {/* =========================================================================
          SUB-TAB 1: CAROUSEL SLIDES MANAGEMENT
          ========================================================================= */}
      {subTab === 'carousel-slides' && (
        <div className="space-y-6">
          {/* Dimension Guidelines Card */}
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 p-4 rounded-2xl border border-blue-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-[#0C2348]">
              <Sparkles className="w-4 h-4 text-[#165DAD] shrink-0" />
              <div>
                <span className="font-bold">Recommended Asset Dimensions: </span>
                <span className="text-slate-600">
                  Desktop: <strong>1920 × 600 px</strong> (visible: ~300–360px) • Mobile: <strong>1080 × 520 px</strong> (visible: ~190–240px)
                </span>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Auto-responsive cropping • Cloudflare R2 Persistent Storage
            </div>
          </div>

          {/* Slides List */}
          <div className="space-y-4">
            {slides.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <Monitor className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-700">No Carousel Slides Configured</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Add your first promotional slide to engage sales executives and members on the dashboard.
                </p>
                <button
                  onClick={handleOpenCreateSlide}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#165DAD] text-white text-xs font-bold shadow-xs hover:bg-[#12498a] transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create First Slide</span>
                </button>
              </div>
            ) : (
              slides.map((slide, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === slides.length - 1;

                return (
                  <div
                    key={slide.id}
                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5"
                  >
                    {/* Left: Order, Thumbnail, Details */}
                    <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
                      {/* Order and Reorder Buttons */}
                      <div className="flex flex-col items-center justify-center gap-1 shrink-0">
                        <button
                          onClick={() => handleMoveSlide(idx, 'up')}
                          disabled={isFirst}
                          className={`p-1 rounded-md border ${
                            isFirst
                              ? 'border-slate-100 text-slate-200 cursor-not-allowed'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                          title="Move Slide Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-mono text-xs font-bold text-slate-500">#{idx + 1}</span>
                        <button
                          onClick={() => handleMoveSlide(idx, 'down')}
                          disabled={isLast}
                          className={`p-1 rounded-md border ${
                            isLast
                              ? 'border-slate-100 text-slate-200 cursor-not-allowed'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                          title="Move Slide Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Thumbnail Preview */}
                      <div className="relative w-32 sm:w-44 h-20 sm:h-24 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                        <img
                          src={slide.desktopImageUrl}
                          alt={slide.altText || slide.title || 'Slide Thumbnail'}
                          className="w-full h-full object-cover select-none"
                        />
                        {slide.mobileImageUrl && (
                          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-mono flex items-center gap-0.5">
                            <Smartphone className="w-2.5 h-2.5" />
                            <span>Mobile</span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(
                              slide.computedStatus || slide.status
                            )}`}
                          >
                            {slide.computedStatus || slide.status}
                          </span>

                          {slide.badgeText && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                              {slide.badgeText}
                            </span>
                          )}

                          <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{(slide.autoplayInterval || 5000) / 1000}s</span>
                          </span>
                        </div>

                        <h3 className="text-sm sm:text-base font-bold text-[#0C2348] truncate">
                          {slide.title || 'Untitled Slide'}
                        </h3>

                        {slide.subtitle && (
                          <p className="text-xs text-slate-500 line-clamp-1 max-w-md">{slide.subtitle}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 font-mono pt-0.5">
                          <span>Link: {slide.linkUrl || '/dashboard'}</span>
                          {slide.startDate && (
                            <span>Starts: {new Date(slide.startDate).toLocaleDateString()}</span>
                          )}
                          {slide.endDate && <span>Ends: {new Date(slide.endDate).toLocaleDateString()}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
                      <button
                        onClick={() => handleTogglePublishSlide(slide)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                          slide.status === 'PUBLISHED'
                            ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {slide.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                      </button>

                      <button
                        onClick={() => handleEditSlide(slide)}
                        className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-[#0C2348] transition-colors"
                        title="Edit Slide"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteSlide(slide.id, slide.title)}
                        className="p-2 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                        title="Delete Slide"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          SLIDE EDITOR MODAL (CREATE / EDIT)
          ========================================================================= */}
      {(isCreatingSlide || editingSlide) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-[#0C2348]">
                  {isCreatingSlide ? 'Add New Carousel Slide' : 'Edit Carousel Slide'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure visual assets, text copy, CTA button, and autoplay intervals
                </p>
              </div>
              <button
                onClick={() => {
                  setIsCreatingSlide(false);
                  setEditingSlide(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Interactive Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Live Preview</span>
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                  <button
                    onClick={() => setSlidePreviewMode('desktop')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                      slidePreviewMode === 'desktop'
                        ? 'bg-white text-[#165DAD] shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Desktop (1920×600)</span>
                  </button>
                  <button
                    onClick={() => setSlidePreviewMode('mobile')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                      slidePreviewMode === 'mobile'
                        ? 'bg-white text-[#165DAD] shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Mobile (1080×520)</span>
                  </button>
                </div>
              </div>

              <div
                className={`mx-auto transition-all duration-300 ${
                  slidePreviewMode === 'mobile' ? 'max-w-sm' : 'w-full'
                }`}
              >
                <DashboardTopBanner banner={currentFormSlide} />
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Slide Title</label>
                <input
                  type="text"
                  value={slideTitle}
                  onChange={(e) => setSlideTitle(e.target.value)}
                  placeholder="e.g. ASKR EV Urban Mobility Fleet"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#165DAD] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Badge Text (Pill)</label>
                <input
                  type="text"
                  value={slideBadgeText}
                  onChange={(e) => setSlideBadgeText(e.target.value)}
                  placeholder="e.g. ELECTRIC MOBILITY or SPECIAL LAUNCH"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#165DAD] focus:outline-hidden"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subtitle / Description</label>
                <input
                  type="text"
                  value={slideSubtitle}
                  onChange={(e) => setSlideSubtitle(e.target.value)}
                  placeholder="e.g. Smart • Connected • Sustainable Electric Mobility"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#165DAD] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">CTA Button Text</label>
                <input
                  type="text"
                  value={slideButtonText}
                  onChange={(e) => setSlideButtonText(e.target.value)}
                  placeholder="e.g. EXPLORE FLEET or BOOK NOW"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#165DAD] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Destination Route Link</label>
                <input
                  type="text"
                  value={slideLinkUrl}
                  onChange={(e) => setSlideLinkUrl(e.target.value)}
                  placeholder="/dashboard, /bookings, /profile"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#165DAD] focus:outline-hidden"
                />
              </div>

              {/* Desktop Image Upload */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">Desktop Image URL *</label>
                  <span className="text-[10px] text-blue-600 font-bold">1920 × 600 px (~300–360px height)</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={slideDesktopImg}
                    onChange={(e) => setSlideDesktopImg(e.target.value)}
                    placeholder="https://... or /uploads/..."
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#165DAD] focus:outline-hidden"
                  />
                  <label className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => handleSlideImageUpload(e, 'desktop')}
                      disabled={slideUploading}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Mobile Image Upload */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">Mobile Image URL (Optional)</label>
                  <span className="text-[10px] text-blue-600 font-bold">1080 × 520 px (~190–240px height)</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={slideMobileImg}
                    onChange={(e) => setSlideMobileImg(e.target.value)}
                    placeholder="Defaults to desktop image if blank"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#165DAD] focus:outline-hidden"
                  />
                  <label className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => handleSlideImageUpload(e, 'mobile')}
                      disabled={slideUploading}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Autoplay & Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Autoplay Interval</label>
                <select
                  value={slideAutoplayInterval}
                  onChange={(e) => setSlideAutoplayInterval(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#165DAD] focus:outline-hidden"
                >
                  <option value={3000}>3 Seconds</option>
                  <option value={4000}>4 Seconds</option>
                  <option value={5000}>5 Seconds (Recommended)</option>
                  <option value={6000}>6 Seconds</option>
                  <option value={8000}>8 Seconds</option>
                  <option value={10000}>10 Seconds</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={slideStatus}
                  onChange={(e) => setSlideStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#165DAD] focus:outline-hidden"
                >
                  <option value="PUBLISHED">Published (Active)</option>
                  <option value="DRAFT">Draft (Hidden)</option>
                  <option value="DISABLED">Disabled</option>
                </select>
              </div>

              {/* Start & End Dates */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Schedule Start Date (Optional)</label>
                <input
                  type="datetime-local"
                  value={slideStartDate}
                  onChange={(e) => setSlideStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#165DAD] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Schedule End Date (Optional)</label>
                <input
                  type="datetime-local"
                  value={slideEndDate}
                  onChange={(e) => setSlideEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#165DAD] focus:outline-hidden"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => {
                  setIsCreatingSlide(false);
                  setEditingSlide(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSlide}
                disabled={slideSaving || slideUploading}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-[#165DAD] to-[#1D4ED8] hover:from-[#12498a] hover:to-[#1742b6] text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
              >
                {slideSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isCreatingSlide ? 'Create Slide' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 2: WELCOME POPUP CAMPAIGNS
          ========================================================================= */}
      {subTab === 'popup-campaigns' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 p-4 rounded-2xl border border-emerald-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-[#0C2348]">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold">Welcome Campaign Frequency: </span>
                <span className="text-slate-600">
                  Default campaign is set to <strong>EVERY_VISIT</strong> to greet members on every login, fresh browser visit, or PWA launch.
                </span>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Dismissal persists per session • Zero duplicate triggers
            </div>
          </div>

          <div className="space-y-4">
            {campaigns.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <Layers className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-700">No Popup Campaigns Found</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Create your first welcome campaign to display important notices, greetings, or offers.
                </p>
                <button
                  onClick={handleOpenCreateCampaign}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#165DAD] text-white text-xs font-bold shadow-xs hover:bg-[#12498a] transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Campaign</span>
                </button>
              </div>
            ) : (
              campaigns.map((camp) => (
                <div
                  key={camp.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(
                          camp.computedStatus
                        )}`}
                      >
                        {camp.computedStatus}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        {camp.frequency}
                      </span>
                      {camp.dismissalCount !== undefined && (
                        <span className="text-[10px] font-mono text-slate-400">
                          Dismissals: {camp.dismissalCount}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-[#0C2348] truncate">{camp.name}</h3>
                    <p className="text-xs text-slate-500 line-clamp-1">{camp.heading} — {camp.message}</p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 font-mono pt-1">
                      <span>Button: &quot;{camp.buttonText}&quot; → {camp.buttonLink}</span>
                      {camp.startDate && <span>Starts: {new Date(camp.startDate).toLocaleDateString()}</span>}
                      {camp.endDate && <span>Ends: {new Date(camp.endDate).toLocaleDateString()}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setPreviewCampaign(camp)}
                      className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-[#0C2348] transition-colors"
                      title="Preview Popup"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleTogglePublishCampaign(camp)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                        camp.status === 'PUBLISHED'
                          ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      {camp.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                    </button>

                    <button
                      onClick={() => handleEditCampaign(camp)}
                      className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-[#0C2348] transition-colors"
                      title="Edit Campaign"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteCampaign(camp.id, camp.name)}
                      className="p-2 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                      title="Delete Campaign"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          CAMPAIGN EDITOR MODAL (CREATE / EDIT)
          ========================================================================= */}
      {(isCreatingCampaign || editingCampaign) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg sm:text-xl font-black text-[#0C2348]">
                {isCreatingCampaign ? 'New Welcome Popup Campaign' : 'Edit Welcome Popup Campaign'}
              </h2>
              <button
                onClick={() => {
                  setIsCreatingCampaign(false);
                  setEditingCampaign(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Campaign Name (Internal)</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. ASKR EV Welcome or Diwali Special"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#165DAD] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Popup Heading</label>
                  <input
                    type="text"
                    value={formHeading}
                    onChange={(e) => setFormHeading(e.target.value)}
                    placeholder="e.g. WELCOME TO ASKR EV"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#165DAD] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subheading (Optional)</label>
                  <input
                    type="text"
                    value={formSubheading}
                    onChange={(e) => setFormSubheading(e.target.value)}
                    placeholder="e.g. DRIVE THE ELECTRIC FUTURE"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#165DAD] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Message Body</label>
                <textarea
                  rows={4}
                  value={formMessage}
                  onChange={(e) => setFormMessage(e.target.value)}
                  placeholder="Welcome message copy..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#165DAD] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Button Text</label>
                  <input
                    type="text"
                    value={formBtnText}
                    onChange={(e) => setFormBtnText(e.target.value)}
                    placeholder="EXPLORE DASHBOARD"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#165DAD] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Button Destination Link</label>
                  <input
                    type="text"
                    value={formBtnLink}
                    onChange={(e) => setFormBtnLink(e.target.value)}
                    placeholder="/dashboard"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#165DAD] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Photograph / Asset Image URL</label>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Frequency Rule</label>
                  <select
                    value={formFrequency}
                    onChange={(e) => setFormFrequency(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#165DAD] focus:outline-hidden"
                  >
                    <option value="EVERY_VISIT">Every Visit (New Login / App Launch / Fresh Visit)</option>
                    <option value="ONCE_PER_CAMPAIGN">Once Per Campaign (Permanent Dismissal)</option>
                    <option value="ONCE_DAILY">Once Daily (One Display Per Calendar Day)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#165DAD] focus:outline-hidden"
                  >
                    <option value="PUBLISHED">Published (Active)</option>
                    <option value="DRAFT">Draft</option>
                    <option value="DISABLED">Disabled</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date (Optional)</label>
                  <input
                    type="datetime-local"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#165DAD] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">End Date (Optional)</label>
                  <input
                    type="datetime-local"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#165DAD] focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => {
                  setIsCreatingCampaign(false);
                  setEditingCampaign(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveCampaign()}
                disabled={popupSaving || popupUploading}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-[#165DAD] to-[#1D4ED8] hover:from-[#12498a] hover:to-[#1742b6] text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
              >
                {popupSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isCreatingCampaign ? 'Create Campaign' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal for Popup Campaign */}
      {previewCampaign && (
        <WelcomePopupModal
          isOpen={true}
          onClose={() => setPreviewCampaign(null)}
          onExplore={() => setPreviewCampaign(null)}
          campaign={previewCampaign}
        />
      )}
    </div>
  );
}
export default AdminBannerManagement;
