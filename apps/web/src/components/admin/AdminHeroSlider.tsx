'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Sliders,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Edit3,
  Trash2,
  Copy,
  CheckCircle2,
  XCircle,
  Eye,
  Upload,
  ArrowUp,
  ArrowDown,
  Image as ImageIcon,
  ExternalLink,
  Sparkles,
  Calendar,
  Smartphone,
  Monitor,
  Link2,
  Tag,
  Check,
  X,
  Layers,
  AlertCircle,
  Clock,
} from 'lucide-react';
import {
  adminFetchHeroSlides,
  adminCreateHeroSlide,
  adminUpdateHeroSlide,
  adminReorderHeroSlides,
  adminPublishHeroSlide,
  adminUnpublishHeroSlide,
  adminDuplicateHeroSlide,
  adminDeleteHeroSlide,
  adminUploadHeroImage,
  fetchPublishedCatalog,
} from '../../lib/api';

interface HeroSlide {
  id: string;
  internalName: string;
  heading: string;
  subheading?: string | null;
  description?: string | null;
  eyebrowText?: string | null;
  desktopImageUrl: string;
  mobileImageUrl?: string | null;
  desktopFocalX: number;
  desktopFocalY: number;
  mobileFocalX: number;
  mobileFocalY: number;
  desktopAltText?: string | null;
  mobileAltText?: string | null;
  primaryCtaLabel?: string | null;
  primaryCtaUrl?: string | null;
  primaryCtaStyle: 'PRIMARY' | 'SECONDARY' | 'OUTLINE';
  primaryCtaEnabled: boolean;
  secondaryCtaLabel?: string | null;
  secondaryCtaUrl?: string | null;
  secondaryCtaStyle: 'PRIMARY' | 'SECONDARY' | 'OUTLINE';
  secondaryCtaEnabled: boolean;
  linkedProductId?: string | null;
  linkedProduct?: any | null;
  showPrice: boolean;
  showRange: boolean;
  showTopSpeed: boolean;
  showBattery: boolean;
  showSpecifications: boolean;
  sortOrder: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishStartAt?: string | null;
  publishEndAt?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export function AdminHeroSlider() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PUBLISHED' | 'DRAFT' | 'ARCHIVED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Editor Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState<HeroSlide | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeEditorTab, setActiveEditorTab] = useState<'content' | 'media' | 'cta' | 'link' | 'settings'>('content');

  // Form Fields
  const [formInternalName, setFormInternalName] = useState('');
  const [formHeading, setFormHeading] = useState('');
  const [formEyebrowText, setFormEyebrowText] = useState('');
  const [formSubheading, setFormSubheading] = useState('');
  const [formDescription, setFormDescription] = useState('');

  // Media
  const [formDesktopImageUrl, setFormDesktopImageUrl] = useState('');
  const [formMobileImageUrl, setFormMobileImageUrl] = useState('');
  const [formUseCustomMobile, setFormUseCustomMobile] = useState(false);
  const [formDesktopFocalX, setFormDesktopFocalX] = useState(50);
  const [formDesktopFocalY, setFormDesktopFocalY] = useState(50);
  const [formMobileFocalX, setFormMobileFocalX] = useState(50);
  const [formMobileFocalY, setFormMobileFocalY] = useState(50);
  const [formDesktopAltText, setFormDesktopAltText] = useState('');
  const [formMobileAltText, setFormMobileAltText] = useState('');
  const [uploadingDesktop, setUploadingDesktop] = useState(false);
  const [uploadingMobile, setUploadingMobile] = useState(false);

  // CTAs
  const [formPrimaryEnabled, setFormPrimaryEnabled] = useState(true);
  const [formPrimaryLabel, setFormPrimaryLabel] = useState('EXPLORE VEHICLES');
  const [formPrimaryUrl, setFormPrimaryUrl] = useState('/scooters');
  const [formPrimaryStyle, setFormPrimaryStyle] = useState<'PRIMARY' | 'SECONDARY' | 'OUTLINE'>('PRIMARY');

  const [formSecondaryEnabled, setFormSecondaryEnabled] = useState(false);
  const [formSecondaryLabel, setFormSecondaryLabel] = useState('BOOK TEST DRIVE');
  const [formSecondaryUrl, setFormSecondaryUrl] = useState('/test-ride');
  const [formSecondaryStyle, setFormSecondaryStyle] = useState<'PRIMARY' | 'SECONDARY' | 'OUTLINE'>('SECONDARY');

  // Vehicle Link & Overlays
  const [formLinkedProductId, setFormLinkedProductId] = useState<string>('');
  const [formShowPrice, setFormShowPrice] = useState(false);
  const [formShowRange, setFormShowRange] = useState(false);
  const [formShowTopSpeed, setFormShowTopSpeed] = useState(false);
  const [formShowBattery, setFormShowBattery] = useState(false);
  const [formShowSpecifications, setFormShowSpecifications] = useState(false);

  // Status & Ordering
  const [formStatus, setFormStatus] = useState<'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>('DRAFT');
  const [formSortOrder, setFormSortOrder] = useState(1);
  const [formPublishStartAt, setFormPublishStartAt] = useState('');
  const [formPublishEndAt, setFormPublishEndAt] = useState('');

  // Initial Load
  useEffect(() => {
    loadData();
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [fetchedSlides, products] = await Promise.all([
        adminFetchHeroSlides(),
        fetchPublishedCatalog({ preview: true }).catch(() => []),
      ]);
      setSlides(fetchedSlides || []);
      setCatalogProducts(products || []);
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to load hero slides');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingSlide(null);
    setFormInternalName('');
    setFormHeading('');
    setFormEyebrowText('');
    setFormSubheading('');
    setFormDescription('');
    setFormDesktopImageUrl('');
    setFormMobileImageUrl('');
    setFormUseCustomMobile(false);
    setFormDesktopFocalX(50);
    setFormDesktopFocalY(50);
    setFormMobileFocalX(50);
    setFormMobileFocalY(50);
    setFormDesktopAltText('');
    setFormMobileAltText('');
    setFormPrimaryEnabled(true);
    setFormPrimaryLabel('EXPLORE VEHICLES');
    setFormPrimaryUrl('/scooters');
    setFormPrimaryStyle('PRIMARY');
    setFormSecondaryEnabled(false);
    setFormSecondaryLabel('BOOK TEST DRIVE');
    setFormSecondaryUrl('/test-ride');
    setFormSecondaryStyle('SECONDARY');
    setFormLinkedProductId('');
    setFormShowPrice(false);
    setFormShowRange(false);
    setFormShowTopSpeed(false);
    setFormShowBattery(false);
    setFormShowSpecifications(false);
    setFormStatus('DRAFT');
    setFormSortOrder(slides.length + 1);
    setFormPublishStartAt('');
    setFormPublishEndAt('');
    setActiveEditorTab('content');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (slide: HeroSlide) => {
    setEditingSlide(slide);
    setFormInternalName(slide.internalName || '');
    setFormHeading(slide.heading || '');
    setFormEyebrowText(slide.eyebrowText || '');
    setFormSubheading(slide.subheading || '');
    setFormDescription(slide.description || '');
    setFormDesktopImageUrl(slide.desktopImageUrl || '');
    setFormMobileImageUrl(slide.mobileImageUrl || '');
    setFormUseCustomMobile(Boolean(slide.mobileImageUrl && slide.mobileImageUrl !== slide.desktopImageUrl));
    setFormDesktopFocalX(slide.desktopFocalX ?? 50);
    setFormDesktopFocalY(slide.desktopFocalY ?? 50);
    setFormMobileFocalX(slide.mobileFocalX ?? 50);
    setFormMobileFocalY(slide.mobileFocalY ?? 50);
    setFormDesktopAltText(slide.desktopAltText || '');
    setFormMobileAltText(slide.mobileAltText || '');
    setFormPrimaryEnabled(slide.primaryCtaEnabled ?? true);
    setFormPrimaryLabel(slide.primaryCtaLabel || 'EXPLORE VEHICLES');
    setFormPrimaryUrl(slide.primaryCtaUrl || '/scooters');
    setFormPrimaryStyle(slide.primaryCtaStyle || 'PRIMARY');
    setFormSecondaryEnabled(slide.secondaryCtaEnabled ?? false);
    setFormSecondaryLabel(slide.secondaryCtaLabel || 'BOOK TEST DRIVE');
    setFormSecondaryUrl(slide.secondaryCtaUrl || '/test-ride');
    setFormSecondaryStyle(slide.secondaryCtaStyle || 'SECONDARY');
    setFormLinkedProductId(slide.linkedProductId || '');
    setFormShowPrice(slide.showPrice ?? false);
    setFormShowRange(slide.showRange ?? false);
    setFormShowTopSpeed(slide.showTopSpeed ?? false);
    setFormShowBattery(slide.showBattery ?? false);
    setFormShowSpecifications(slide.showSpecifications ?? false);
    setFormStatus(slide.status || 'DRAFT');
    setFormSortOrder(slide.sortOrder || 1);
    setFormPublishStartAt(slide.publishStartAt ? slide.publishStartAt.slice(0, 16) : '');
    setFormPublishEndAt(slide.publishEndAt ? slide.publishEndAt.slice(0, 16) : '');
    setActiveEditorTab('content');
    setIsModalOpen(true);
  };

  // Upload Handlers
  const handleUploadDesktop = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingDesktop(true);
      const res = await adminUploadHeroImage(file, 'desktop', formInternalName || 'hero-desktop');
      setFormDesktopImageUrl(res.url);
      if (!formDesktopAltText) {
        setFormDesktopAltText(formHeading || file.name.replace(/\.[^/.]+$/, ''));
      }
      showNotification('success', 'Desktop photograph uploaded securely');
    } catch (err: any) {
      showNotification('error', err.message || 'Desktop image upload failed');
    } finally {
      setUploadingDesktop(false);
    }
  };

  const handleUploadMobile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingMobile(true);
      const res = await adminUploadHeroImage(file, 'mobile', formInternalName || 'hero-mobile');
      setFormMobileImageUrl(res.url);
      if (!formMobileAltText) {
        setFormMobileAltText(formHeading || file.name.replace(/\.[^/.]+$/, ''));
      }
      showNotification('success', 'Mobile photograph uploaded securely');
    } catch (err: any) {
      showNotification('error', err.message || 'Mobile image upload failed');
    } finally {
      setUploadingMobile(false);
    }
  };

  // Submit Save
  const handleSaveSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formInternalName.trim()) {
      showNotification('error', 'Internal slide name is required');
      setActiveEditorTab('content');
      return;
    }
    if (!formHeading.trim()) {
      showNotification('error', 'Slide heading is required');
      setActiveEditorTab('content');
      return;
    }
    if (!formDesktopImageUrl.trim()) {
      showNotification('error', 'Desktop hero photograph is required');
      setActiveEditorTab('media');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: any = {
        internalName: formInternalName.trim(),
        heading: formHeading.trim(),
        eyebrowText: formEyebrowText.trim() || null,
        subheading: formSubheading.trim() || null,
        description: formDescription.trim() || null,
        desktopImageUrl: formDesktopImageUrl.trim(),
        mobileImageUrl: formUseCustomMobile && formMobileImageUrl.trim() ? formMobileImageUrl.trim() : null,
        desktopFocalX: Number(formDesktopFocalX),
        desktopFocalY: Number(formDesktopFocalY),
        mobileFocalX: Number(formMobileFocalX),
        mobileFocalY: Number(formMobileFocalY),
        desktopAltText: formDesktopAltText.trim() || null,
        mobileAltText: formMobileAltText.trim() || null,
        primaryCtaEnabled: formPrimaryEnabled,
        primaryCtaLabel: formPrimaryLabel.trim() || 'EXPLORE VEHICLES',
        primaryCtaUrl: formPrimaryUrl.trim() || '/scooters',
        primaryCtaStyle: formPrimaryStyle,
        secondaryCtaEnabled: formSecondaryEnabled,
        secondaryCtaLabel: formSecondaryLabel.trim() || null,
        secondaryCtaUrl: formSecondaryUrl.trim() || null,
        secondaryCtaStyle: formSecondaryStyle,
        linkedProductId: formLinkedProductId || null,
        showPrice: formShowPrice,
        showRange: formShowRange,
        showTopSpeed: formShowTopSpeed,
        showBattery: formShowBattery,
        showSpecifications: formShowSpecifications,
        sortOrder: Number(formSortOrder) || 1,
        status: formStatus,
        publishStartAt: formPublishStartAt ? new Date(formPublishStartAt).toISOString() : null,
        publishEndAt: formPublishEndAt ? new Date(formPublishEndAt).toISOString() : null,
      };

      if (editingSlide) {
        await adminUpdateHeroSlide(editingSlide.id, payload);
        showNotification('success', `Hero slide "${payload.internalName}" updated successfully`);
      } else {
        await adminCreateHeroSlide(payload);
        showNotification('success', `Hero slide "${payload.internalName}" created successfully`);
      }

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to save hero slide');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reorder Actions
  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= filteredSlides.length) return;

    const newOrder = [...filteredSlides];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(targetIndex, 0, moved);

    // Optimistic UI update
    setSlides((prev) => {
      const remaining = prev.filter((s) => !newOrder.some((n) => n.id === s.id));
      return [...newOrder, ...remaining];
    });

    try {
      const slideIds = newOrder.map((s) => s.id);
      await adminReorderHeroSlides(slideIds);
      showNotification('success', 'Slide display order updated');
      loadData();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to reorder slides');
      loadData();
    }
  };

  // Publish / Unpublish Toggle
  const handleTogglePublish = async (slide: HeroSlide) => {
    try {
      if (slide.status === 'PUBLISHED') {
        await adminUnpublishHeroSlide(slide.id);
        showNotification('success', `Slide "${slide.internalName}" moved to Draft`);
      } else {
        await adminPublishHeroSlide(slide.id);
        showNotification('success', `Slide "${slide.internalName}" published live to homepage`);
      }
      loadData();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to update slide status');
    }
  };

  // Duplicate Action
  const handleDuplicate = async (slide: HeroSlide) => {
    try {
      await adminDuplicateHeroSlide(slide.id);
      showNotification('success', `Duplicated slide "${slide.internalName}"`);
      loadData();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to duplicate slide');
    }
  };

  // Delete Action
  const handleDelete = async (slide: HeroSlide) => {
    const isHard = slide.status === 'ARCHIVED';
    const msg = isHard
      ? `Permanently delete archived slide "${slide.internalName}"? This action cannot be undone.`
      : `Archive slide "${slide.internalName}"? It will be removed from display.`;
    if (!window.confirm(msg)) return;

    try {
      await adminDeleteHeroSlide(slide.id);
      showNotification('success', isHard ? 'Slide permanently deleted' : 'Slide archived');
      loadData();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to delete slide');
    }
  };

  // Filtered Slides
  const filteredSlides = useMemo(() => {
    return slides.filter((slide) => {
      const matchesStatus = statusFilter === 'ALL' || slide.status === statusFilter;
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        slide.internalName?.toLowerCase().includes(term) ||
        slide.heading?.toLowerCase().includes(term) ||
        slide.subheading?.toLowerCase().includes(term) ||
        slide.linkedProduct?.name?.toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [slides, statusFilter, searchTerm]);

  return (
    <div className="space-y-6">
      {/* 1. SECTION HEADER WITH QUICK ACTIONS */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#165DAD]/10 text-[#165DAD] flex items-center justify-center shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-[#253247]">Homepage Hero Slider Management</h1>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-[#165DAD] border border-blue-200">
                  Live System
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage hero slides, responsive images, call-to-actions, and live homepage placement.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/?preview=true"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-[#253247] transition-colors border border-slate-200"
              title="Open Homepage with Admin Preview Mode enabled"
            >
              <Eye className="w-3.5 h-3.5 text-[#165DAD]" />
              <span>Preview Homepage</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </Link>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-lg text-slate-500 hover:text-[#253247] hover:bg-slate-100 border border-slate-200 transition-colors"
              title="Refresh slides"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-[#165DAD] hover:bg-[#134b8c] text-white shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New Hero Slide</span>
            </button>
          </div>
        </div>

        {/* NOTIFICATION BANNER */}
        {notification && (
          <div
            className={`mt-4 p-3 rounded-lg text-xs font-medium flex items-center justify-between ${
              notification.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 2. FILTERS & SEARCH BAR */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'PUBLISHED', 'DRAFT', 'ARCHIVED'] as const).map((tab) => {
            const count =
              tab === 'ALL'
                ? slides.length
                : slides.filter((s) => s.status === tab).length;
            const active = statusFilter === tab;
            return (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  active
                    ? 'bg-[#165DAD] text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{tab === 'ALL' ? 'All Slides' : tab}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    active ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search headline or product..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#165DAD]/20 focus:border-[#165DAD]"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. SLIDES LIST TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-[#165DAD]" />
            <span>Loading homepage hero slides...</span>
          </div>
        ) : filteredSlides.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs space-y-3">
            <Sliders className="w-8 h-8 mx-auto text-slate-300" />
            <p className="font-semibold text-slate-700">No Hero Slides found</p>
            <p className="text-slate-400 max-w-sm mx-auto">
              {searchTerm || statusFilter !== 'ALL'
                ? 'No slides match your active filters. Try resetting the search or filter.'
                : 'Click "New Hero Slide" to create your first customizable homepage slide.'}
            </p>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#165DAD] text-white hover:bg-[#134b8c]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Slide</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-3 w-12 text-center">Order</th>
                  <th className="py-3 px-3 w-32">Image</th>
                  <th className="py-3 px-4">Internal Name & Headline</th>
                  <th className="py-3 px-3">Linked Vehicle</th>
                  <th className="py-3 px-3">Primary CTA</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSlides.map((slide, index) => {
                  const isPublished = slide.status === 'PUBLISHED';
                  const isDraft = slide.status === 'DRAFT';
                  const isArchived = slide.status === 'ARCHIVED';

                  return (
                    <tr
                      key={slide.id}
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      {/* Order & Move buttons */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          <button
                            onClick={() => handleMove(index, 'up')}
                            disabled={index === 0}
                            className={`p-0.5 rounded text-slate-400 hover:text-[#165DAD] hover:bg-slate-100 ${
                              index === 0 ? 'opacity-20 cursor-not-allowed' : ''
                            }`}
                            title="Move Up"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                            {slide.sortOrder || index + 1}
                          </span>
                          <button
                            onClick={() => handleMove(index, 'down')}
                            disabled={index === filteredSlides.length - 1}
                            className={`p-0.5 rounded text-slate-400 hover:text-[#165DAD] hover:bg-slate-100 ${
                              index === filteredSlides.length - 1 ? 'opacity-20 cursor-not-allowed' : ''
                            }`}
                            title="Move Down"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* Image Thumbnail */}
                      <td className="py-3 px-3">
                        <div className="relative w-28 h-16 rounded-lg bg-slate-900 border border-slate-200 overflow-hidden shadow-2xs group-hover:border-[#165DAD]/40 transition-colors">
                          {slide.desktopImageUrl ? (
                            <img
                              src={slide.desktopImageUrl}
                              alt={slide.desktopAltText || slide.heading}
                              className="w-full h-full object-cover"
                              style={{
                                objectPosition: `${slide.desktopFocalX ?? 50}% ${slide.desktopFocalY ?? 50}%`,
                              }}
                              onError={(e) => {
                                (e.target as any).src = '/images/real/real-jatayu-orange-studio.jpg';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500">
                              <ImageIcon className="w-5 h-5 text-slate-400" />
                            </div>
                          )}

                          {slide.mobileImageUrl && slide.mobileImageUrl !== slide.desktopImageUrl && (
                            <span
                              className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/70 text-[9px] text-white font-medium flex items-center gap-0.5"
                              title="Custom mobile image active"
                            >
                              <Smartphone className="w-2.5 h-2.5" />
                              <span>M</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Title & Headline */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#253247] text-xs">
                              {slide.internalName}
                            </span>
                            {slide.eyebrowText && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-[#165DAD] border border-blue-200">
                                {slide.eyebrowText}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-semibold text-slate-600 line-clamp-1">
                            {slide.heading}
                          </p>
                          {slide.subheading && (
                            <p className="text-[10px] text-slate-400 line-clamp-1">
                              {slide.subheading}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Linked Vehicle */}
                      <td className="py-3 px-3">
                        {slide.linkedProduct ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                              <img
                                src={slide.linkedProduct.heroImage || '/images/real/real-jatayu-orange-studio.jpg'}
                                alt={slide.linkedProduct.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <span className="font-semibold text-slate-800 text-[11px] block">
                                {slide.linkedProduct.name}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {slide.linkedProduct.category}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">
                            Standalone Slide
                          </span>
                        )}
                      </td>

                      {/* Primary CTA */}
                      <td className="py-3 px-3">
                        {slide.primaryCtaEnabled ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-[#165DAD] border border-slate-200">
                              {slide.primaryCtaLabel || 'EXPLORE'}
                            </span>
                            <span className="text-[9px] text-slate-400 block truncate max-w-[120px]">
                              {slide.primaryCtaUrl || '/scooters'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Disabled</span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-3">
                        <button
                          onClick={() => handleTogglePublish(slide)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors ${
                            isPublished
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : isDraft
                              ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          }`}
                          title={`Click to ${isPublished ? 'unpublish' : 'publish'}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isPublished
                                ? 'bg-emerald-500'
                                : isDraft
                                ? 'bg-amber-500'
                                : 'bg-slate-400'
                            }`}
                          />
                          <span>{slide.status}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(slide)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#165DAD] hover:bg-blue-50 transition-colors"
                            title="Edit Slide"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDuplicate(slide)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                            title="Duplicate Slide"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDelete(slide)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title={isArchived ? 'Permanent Delete' : 'Archive Slide'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. SLIDE EDITOR DRAWER / MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full my-8 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#165DAD]/10 text-[#165DAD] flex items-center justify-center">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#253247]">
                    {editingSlide ? `Edit Slide: ${editingSlide.internalName}` : 'Create New Hero Slide'}
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Configure headings, responsive photographs, buttons, and display behavior.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex items-center border-b border-slate-200 px-6 gap-2 bg-white overflow-x-auto">
              {[
                { id: 'content', label: '1. Text & Headings', icon: Tag },
                { id: 'media', label: '2. Hero Photographs', icon: ImageIcon },
                { id: 'cta', label: '3. Call-to-Actions', icon: ExternalLink },
                { id: 'link', label: '4. Linked Vehicle', icon: Link2 },
                { id: 'settings', label: '5. Display & Status', icon: Calendar },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = activeEditorTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveEditorTab(tab.id as any)}
                    className={`py-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                      active
                        ? 'border-[#165DAD] text-[#165DAD]'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSaveSlide} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* TAB 1: CONTENT */}
              {activeEditorTab === 'content' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Internal Slide Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formInternalName}
                      onChange={(e) => setFormInternalName(e.target.value)}
                      placeholder="e.g. Festival Hero - Jatayu Sunset Orange"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#165DAD]/20 focus:border-[#165DAD]"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Used internally in the admin panel to organize slides.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Eyebrow Text (Badge above headline)
                    </label>
                    <input
                      type="text"
                      value={formEyebrowText}
                      onChange={(e) => setFormEyebrowText(e.target.value)}
                      placeholder="e.g. NEXT-GEN EV PLATFORM or ZERO EMISSIONS"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#165DAD]/20 focus:border-[#165DAD]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Main Heading <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formHeading}
                      onChange={(e) => setFormHeading(e.target.value)}
                      placeholder="e.g. DRIVE THE FUTURE. DRIVE ELECTRIC."
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#165DAD]/20 focus:border-[#165DAD]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Subheading
                    </label>
                    <input
                      type="text"
                      value={formSubheading}
                      onChange={(e) => setFormSubheading(e.target.value)}
                      placeholder="e.g. Engineered for Performance. Designed for Bharat."
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#165DAD]/20 focus:border-[#165DAD]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Detailed Description
                    </label>
                    <textarea
                      rows={3}
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Brief customer-facing copy highlighting power, range, and ride quality..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#165DAD]/20 focus:border-[#165DAD]"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: MEDIA (DESKTOP & MOBILE) */}
              {activeEditorTab === 'media' && (
                <div className="space-y-6">
                  {/* Desktop Photograph */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-[#165DAD]" />
                        <span className="text-xs font-bold text-[#253247]">
                          Desktop Hero Photograph <span className="text-red-500">*</span>
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">Recommended 1920×1080 (16:9)</span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 items-center">
                      <div className="relative w-full sm:w-44 h-24 rounded-lg bg-slate-900 border border-slate-200 overflow-hidden shrink-0">
                        {formDesktopImageUrl ? (
                          <img
                            src={formDesktopImageUrl}
                            alt="Desktop preview"
                            className="w-full h-full object-cover"
                            style={{
                              objectPosition: `${formDesktopFocalX}% ${formDesktopFocalY}%`,
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-500 text-[10px]">
                            No Image Selected
                          </div>
                        )}
                      </div>

                      <div className="flex-1 w-full space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#165DAD] text-white hover:bg-[#134b8c] cursor-pointer shadow-xs transition-colors">
                            <Upload className="w-3.5 h-3.5" />
                            <span>{uploadingDesktop ? 'Uploading...' : 'Upload Image'}</span>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              onChange={handleUploadDesktop}
                              disabled={uploadingDesktop}
                              className="hidden"
                            />
                          </label>
                          <span className="text-[10px] text-slate-400">or paste direct URL below</span>
                        </div>
                        <input
                          type="text"
                          value={formDesktopImageUrl}
                          onChange={(e) => setFormDesktopImageUrl(e.target.value)}
                          placeholder="/images/real/real-jatayu-orange-studio.jpg or R2 URL"
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Focal Alignment X: {formDesktopFocalX}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={formDesktopFocalX}
                          onChange={(e) => setFormDesktopFocalX(Number(e.target.value))}
                          className="w-full accent-[#165DAD]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Focal Alignment Y: {formDesktopFocalY}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={formDesktopFocalY}
                          onChange={(e) => setFormDesktopFocalY(Number(e.target.value))}
                          className="w-full accent-[#165DAD]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Desktop Alt Text (SEO & Accessibility)
                      </label>
                      <input
                        type="text"
                        value={formDesktopAltText}
                        onChange={(e) => setFormDesktopAltText(e.target.value)}
                        placeholder="e.g. ASKR EV Sunset Orange Electric Motorcycle"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                      />
                    </div>
                  </div>

                  {/* Mobile Photograph */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-[#165DAD]" />
                        <span className="text-xs font-bold text-[#253247]">
                          Mobile Hero Photograph
                        </span>
                      </div>
                      <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formUseCustomMobile}
                          onChange={(e) => setFormUseCustomMobile(e.target.checked)}
                          className="rounded text-[#165DAD] focus:ring-[#165DAD]"
                        />
                        <span>Use dedicated mobile crop/photo</span>
                      </label>
                    </div>

                    {formUseCustomMobile ? (
                      <div className="space-y-3 pt-2 border-t border-slate-200">
                        <div className="flex flex-col sm:flex-row gap-3 items-center">
                          <div className="relative w-24 h-32 rounded-lg bg-slate-900 border border-slate-200 overflow-hidden shrink-0">
                            {formMobileImageUrl ? (
                              <img
                                src={formMobileImageUrl}
                                alt="Mobile preview"
                                className="w-full h-full object-cover"
                                style={{
                                  objectPosition: `${formMobileFocalX}% ${formMobileFocalY}%`,
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-500 text-[9px] text-center p-2">
                                No Mobile Image Selected
                              </div>
                            )}
                          </div>

                          <div className="flex-1 w-full space-y-2">
                            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#165DAD] text-white hover:bg-[#134b8c] cursor-pointer shadow-xs transition-colors">
                              <Upload className="w-3.5 h-3.5" />
                              <span>{uploadingMobile ? 'Uploading...' : 'Upload Mobile Image'}</span>
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handleUploadMobile}
                                disabled={uploadingMobile}
                                className="hidden"
                              />
                            </label>
                            <input
                              type="text"
                              value={formMobileImageUrl}
                              onChange={(e) => setFormMobileImageUrl(e.target.value)}
                              placeholder="Mobile image URL or R2 link"
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Mobile Focal X: {formMobileFocalX}%
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={formMobileFocalX}
                              onChange={(e) => setFormMobileFocalX(Number(e.target.value))}
                              className="w-full accent-[#165DAD]"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Mobile Focal Y: {formMobileFocalY}%
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={formMobileFocalY}
                              onChange={(e) => setFormMobileFocalY(Number(e.target.value))}
                              className="w-full accent-[#165DAD]"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 italic">
                        Using responsive desktop photo for mobile viewports with auto-centering.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: CTAs */}
              {activeEditorTab === 'cta' && (
                <div className="space-y-5">
                  {/* Primary CTA */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#253247]">Primary Call-to-Action Button</span>
                      <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formPrimaryEnabled}
                          onChange={(e) => setFormPrimaryEnabled(e.target.checked)}
                          className="rounded text-[#165DAD] focus:ring-[#165DAD]"
                        />
                        <span>Enable Primary CTA</span>
                      </label>
                    </div>

                    {formPrimaryEnabled && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Button Label
                          </label>
                          <input
                            type="text"
                            value={formPrimaryLabel}
                            onChange={(e) => setFormPrimaryLabel(e.target.value)}
                            placeholder="e.g. EXPLORE VEHICLES"
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Destination URL
                          </label>
                          <input
                            type="text"
                            value={formPrimaryUrl}
                            onChange={(e) => setFormPrimaryUrl(e.target.value)}
                            placeholder="/scooters or https://..."
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Button Style
                          </label>
                          <select
                            value={formPrimaryStyle}
                            onChange={(e) => setFormPrimaryStyle(e.target.value as any)}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                          >
                            <option value="PRIMARY">Solid Electric Blue (Primary)</option>
                            <option value="SECONDARY">White Contrast (Secondary)</option>
                            <option value="OUTLINE">Subtle Outline</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Secondary CTA */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#253247]">Secondary Call-to-Action Button</span>
                      <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formSecondaryEnabled}
                          onChange={(e) => setFormSecondaryEnabled(e.target.checked)}
                          className="rounded text-[#165DAD] focus:ring-[#165DAD]"
                        />
                        <span>Enable Secondary CTA</span>
                      </label>
                    </div>

                    {formSecondaryEnabled && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Button Label
                          </label>
                          <input
                            type="text"
                            value={formSecondaryLabel}
                            onChange={(e) => setFormSecondaryLabel(e.target.value)}
                            placeholder="e.g. BOOK TEST DRIVE"
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Destination URL
                          </label>
                          <input
                            type="text"
                            value={formSecondaryUrl}
                            onChange={(e) => setFormSecondaryUrl(e.target.value)}
                            placeholder="/test-ride or /contact"
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Button Style
                          </label>
                          <select
                            value={formSecondaryStyle}
                            onChange={(e) => setFormSecondaryStyle(e.target.value as any)}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                          >
                            <option value="SECONDARY">White Contrast (Secondary)</option>
                            <option value="OUTLINE">Subtle Outline</option>
                            <option value="PRIMARY">Solid Electric Blue (Primary)</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: LINKED VEHICLE & OVERLAYS */}
              {activeEditorTab === 'link' && (
                <div className="space-y-5">
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <label className="block text-xs font-bold text-[#253247]">
                      Connect Slide to an Existing Vehicle Model
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Linking a vehicle allows you to display live specifications (Range, Speed, Price) directly on the hero overlay.
                    </p>
                    <select
                      value={formLinkedProductId}
                      onChange={(e) => setFormLinkedProductId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white font-medium"
                    >
                      <option value="">No Linked Vehicle (Standalone Brand Hero)</option>
                      {catalogProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.category}) — {p.formattedSellingPrice || 'Contact for Price'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Overlay Toggles */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                    <span className="text-xs font-bold text-[#253247] block">
                      Hero Overlay Metric Badges
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Choose which verified specifications to display over the hero banner:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formShowRange}
                          onChange={(e) => setFormShowRange(e.target.checked)}
                          className="rounded text-[#165DAD] focus:ring-[#165DAD]"
                        />
                        <span className="text-xs font-semibold text-slate-700">Display Range Metric (km)</span>
                      </label>

                      <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formShowTopSpeed}
                          onChange={(e) => setFormShowTopSpeed(e.target.checked)}
                          className="rounded text-[#165DAD] focus:ring-[#165DAD]"
                        />
                        <span className="text-xs font-semibold text-slate-700">Display Top Speed (km/h)</span>
                      </label>

                      <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formShowBattery}
                          onChange={(e) => setFormShowBattery(e.target.checked)}
                          className="rounded text-[#165DAD] focus:ring-[#165DAD]"
                        />
                        <span className="text-xs font-semibold text-slate-700">Display Battery Spec (kWh)</span>
                      </label>

                      <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formShowPrice}
                          onChange={(e) => setFormShowPrice(e.target.checked)}
                          className="rounded text-[#165DAD] focus:ring-[#165DAD]"
                        />
                        <span className="text-xs font-semibold text-slate-700">Display Price Badge</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: DISPLAY SETTINGS & STATUS */}
              {activeEditorTab === 'settings' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Publishing Status
                      </label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold bg-white"
                      >
                        <option value="DRAFT">DRAFT (Hidden from public, visible in Admin Preview)</option>
                        <option value="PUBLISHED">PUBLISHED (Active on live website)</option>
                        <option value="ARCHIVED">ARCHIVED (Inactive archive)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Display Order Priority
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formSortOrder}
                        onChange={(e) => setFormSortOrder(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Lower numbers appear earlier in the slider rotation.</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <span className="text-xs font-bold text-[#253247] block">
                      Optional Scheduling Window (Automated Launch & Expiry)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Publish Start Time
                        </label>
                        <input
                          type="datetime-local"
                          value={formPublishStartAt}
                          onChange={(e) => setFormPublishStartAt(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Publish End Time (Expiry)
                        </label>
                        <input
                          type="datetime-local"
                          value={formPublishEndAt}
                          onChange={(e) => setFormPublishEndAt(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Footer Controls */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-[#165DAD] text-white hover:bg-[#134b8c] shadow-xs disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>{editingSlide ? 'Save Changes' : 'Create Slide'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
