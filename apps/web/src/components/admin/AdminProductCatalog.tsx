'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Package,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Edit3,
  Trash2,
  Star,
  CheckCircle2,
  XCircle,
  Eye,
  Upload,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Image as ImageIcon,
  AlertCircle,
  Check,
  X,
  ExternalLink,
  Zap,
  BatteryCharging,
  Gauge,
  Tag,
  Sparkles,
} from 'lucide-react';
import { fetchApi, uploadProductImageApi } from '../../lib/api';

interface ProductItem {
  id: string;
  name: string;
  slug: string;
  category: 'SCOOTER' | 'BIKE' | 'CYCLE' | 'JEEP' | 'UTILITY';
  categoryLabel: string;
  brand: string;
  tagline?: string;
  shortDescription?: string;
  fullDescription?: string;
  sellingPriceINR?: number;
  regularPriceINR?: number;
  bookingAmountINR?: number;
  voucherRedeemLimitINR?: number;
  rangeKm?: number;
  topSpeedKmh?: number;
  batteryCapacityKwh?: number;
  chargingTimeHours?: number;
  motorPower?: string;
  acceleration?: string;
  warranty?: string;
  powertrain?: string;
  colors?: {
    name: string;
    hex: string;
    accentHex?: string;
    description?: string;
    images?: { url: string; isPrimary?: boolean; order?: number }[];
    primaryImage?: string;
    sku?: string;
    isAvailable?: boolean;
  }[];
  specifications?: { label: string; value: string; sub?: string }[];
  highlights?: string[];
  images?: { url: string; isPrimary: boolean; order: number; caption?: string }[];
  heroImage?: string;
  thumbnailImage?: string;
  isHero?: boolean;
  heroMobileImage?: string | null;
  heroHeading?: string | null;
  heroDescription?: string | null;
  heroCtaText?: string | null;
  heroCtaLink?: string | null;
  heroSlideOrder?: number | null;
  isFeatured: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  displayOrder: number;
  oemManufacturer?: string | null;
  oemModelName?: string | null;
  oemReference?: string | null;
  internalNotes?: string | null;
  slugAliases?: string[];
  isRebranded?: boolean;
}

export function AdminProductCatalog() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [stats, setStats] = useState({ total: 0, published: 0, draft: 0, archived: 0 });
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<'basic' | 'specs' | 'images' | 'colors' | 'hero' | 'oem' | 'publish'>('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Form State
  const [form, setForm] = useState<any>({
    name: '',
    slug: '',
    category: 'BIKE',
    brand: 'ASKR EV',
    tagline: '',
    shortDescription: '',
    fullDescription: '',
    sellingPriceINR: '',
    regularPriceINR: '',
    bookingAmountINR: '',
    voucherRedeemLimitINR: '',
    rangeKm: '',
    topSpeedKmh: '',
    batteryCapacityKwh: '',
    chargingTimeHours: '',
    motorPower: '',
    acceleration: '',
    warranty: '',
    powertrain: '',
    isHero: false,
    heroMobileImage: '',
    heroHeading: '',
    heroDescription: '',
    heroCtaText: '',
    heroCtaLink: '',
    heroSlideOrder: '',
    isFeatured: false,
    status: 'PUBLISHED',
    displayOrder: 1,
    oemManufacturer: '',
    oemModelName: '',
    oemReference: '',
    internalNotes: '',
    slugAliases: '',
    isRebranded: true,
    images: [] as { url: string; isPrimary: boolean; order: number; caption?: string }[],
    colors: [] as any[],
    specifications: [] as { label: string; value: string; sub?: string }[],
    highlights: [] as string[],
  });

  // Color inputs
  const [newColor, setNewColor] = useState({ name: '', hex: '#267DFF', description: '' });
  // Spec inputs
  const [newSpec, setNewSpec] = useState({ label: '', value: '', sub: '' });
  // Highlight input
  const [newHighlight, setNewHighlight] = useState('');
  // Custom manual URL input
  const [manualImageUrl, setManualImageUrl] = useState('');

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (categoryFilter !== 'ALL') q.append('category', categoryFilter);
      if (statusFilter !== 'ALL') q.append('status', statusFilter);
      if (searchQuery.trim()) q.append('search', searchQuery.trim());

      const res: any = await fetchApi(`/admin/products?${q.toString()}`);
      setProducts(res.items || []);
      setStats(res.stats || { total: 0, published: 0, draft: 0, archived: 0 });
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [categoryFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadProducts();
  };

  // ---------------------------------------------------------------------------
  // Action Handlers
  // ---------------------------------------------------------------------------

  const handleToggleStatus = async (product: ProductItem) => {
    const newStatus = product.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    try {
      await fetchApi(`/admin/products/${product.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      showFeedback('success', `Updated '${product.name}' status to ${newStatus}`);
      loadProducts();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to update status');
    }
  };

  const handleToggleFeatured = async (product: ProductItem) => {
    try {
      const res: any = await fetchApi(`/admin/products/${product.id}/featured`, {
        method: 'PATCH',
      });
      showFeedback('success', `'${product.name}' is now ${res.isFeatured ? 'FEATURED' : 'STANDARD'}`);
      loadProducts();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to toggle featured');
    }
  };

  const handleToggleHero = async (product: ProductItem) => {
    try {
      const res: any = await fetchApi(`/admin/products/${product.id}/hero`, {
        method: 'PATCH',
      });
      showFeedback('success', `'${product.name}' hero placement: ${res.isHero ? 'ACTIVE' : 'OFF'}`);
      loadProducts();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to toggle hero');
    }
  };

  const handleArchive = async (product: ProductItem) => {
    if (!confirm(`Are you sure you want to archive '${product.name}'? It will no longer appear on public pages.`)) {
      return;
    }
    try {
      await fetchApi(`/admin/products/${product.id}`, {
        method: 'DELETE',
      });
      showFeedback('success', `Archived '${product.name}'`);
      loadProducts();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to archive product');
    }
  };

  const handleMoveOrder = async (index: number, direction: 'UP' | 'DOWN') => {
    if ((direction === 'UP' && index === 0) || (direction === 'DOWN' && index === products.length - 1)) {
      return;
    }
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    const reordered = [...products];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    const payload = reordered.map((item, idx) => ({
      id: item.id,
      displayOrder: idx + 1,
    }));

    try {
      await fetchApi('/admin/products/reorder', {
        method: 'PATCH',
        body: JSON.stringify({ items: payload }),
      });
      loadProducts();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to reorder');
    }
  };

  // ---------------------------------------------------------------------------
  // Modal & Form Handlers
  // ---------------------------------------------------------------------------

  const openCreateModal = () => {
    setModalMode('CREATE');
    setEditingProductId(null);
    setForm({
      name: '',
      slug: '',
      category: 'BIKE',
      brand: 'ASKR EV',
      tagline: '',
      shortDescription: '',
      fullDescription: '',
      sellingPriceINR: '',
      regularPriceINR: '',
      bookingAmountINR: '',
      voucherRedeemLimitINR: '',
      rangeKm: '',
      topSpeedKmh: '',
      batteryCapacityKwh: '',
      chargingTimeHours: '',
      motorPower: '',
      acceleration: '',
      warranty: '',
      powertrain: '',
      isHero: false,
      heroMobileImage: '',
      heroHeading: '',
      heroDescription: '',
      heroCtaText: '',
      heroCtaLink: '',
      heroSlideOrder: '',
      isFeatured: false,
      status: 'PUBLISHED',
      displayOrder: (products.length || 0) + 1,
      oemManufacturer: '',
      oemModelName: '',
      oemReference: '',
      internalNotes: '',
      slugAliases: '',
      isRebranded: true,
      images: [],
      colors: [],
      specifications: [],
      highlights: [],
    });
    setModalTab('basic');
    setModalOpen(true);
  };

  const openEditModal = (product: ProductItem) => {
    setModalMode('EDIT');
    setEditingProductId(product.id);
    setForm({
      name: product.name,
      slug: product.slug,
      category: product.category,
      brand: product.brand || 'ASKR EV',
      tagline: product.tagline || '',
      shortDescription: product.shortDescription || '',
      fullDescription: product.fullDescription || '',
      sellingPriceINR: product.sellingPriceINR !== null && product.sellingPriceINR !== undefined ? String(product.sellingPriceINR) : '',
      regularPriceINR: product.regularPriceINR !== null && product.regularPriceINR !== undefined ? String(product.regularPriceINR) : '',
      bookingAmountINR: product.bookingAmountINR !== null && product.bookingAmountINR !== undefined ? String(product.bookingAmountINR) : '',
      voucherRedeemLimitINR: product.voucherRedeemLimitINR !== null && product.voucherRedeemLimitINR !== undefined ? String(product.voucherRedeemLimitINR) : '',
      rangeKm: product.rangeKm !== null && product.rangeKm !== undefined ? String(product.rangeKm) : '',
      topSpeedKmh: product.topSpeedKmh !== null && product.topSpeedKmh !== undefined ? String(product.topSpeedKmh) : '',
      batteryCapacityKwh: product.batteryCapacityKwh !== null && product.batteryCapacityKwh !== undefined ? String(product.batteryCapacityKwh) : '',
      chargingTimeHours: product.chargingTimeHours !== null && product.chargingTimeHours !== undefined ? String(product.chargingTimeHours) : '',
      motorPower: product.motorPower || '',
      acceleration: product.acceleration || '',
      warranty: product.warranty || '',
      powertrain: product.powertrain || '',
      isHero: Boolean(product.isHero),
      heroMobileImage: product.heroMobileImage || '',
      heroHeading: product.heroHeading || '',
      heroDescription: product.heroDescription || '',
      heroCtaText: product.heroCtaText || '',
      heroCtaLink: product.heroCtaLink || '',
      heroSlideOrder: product.heroSlideOrder !== null && product.heroSlideOrder !== undefined ? String(product.heroSlideOrder) : '',
      isFeatured: Boolean(product.isFeatured),
      status: product.status || 'PUBLISHED',
      displayOrder: product.displayOrder || 1,
      oemManufacturer: product.oemManufacturer || '',
      oemModelName: product.oemModelName || '',
      oemReference: product.oemReference || '',
      internalNotes: product.internalNotes || '',
      slugAliases: Array.isArray(product.slugAliases) ? product.slugAliases.join(', ') : '',
      isRebranded: product.isRebranded ?? true,
      images: Array.isArray(product.images) ? [...product.images] : [],
      colors: Array.isArray(product.colors) ? [...product.colors] : [],
      specifications: Array.isArray(product.specifications) ? [...product.specifications] : [],
      highlights: Array.isArray(product.highlights) ? [...product.highlights] : [],
    });
    setModalTab('basic');
    setModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const slugPrefix = form.slug || form.name || 'catalog';
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const res = await uploadProductImageApi(file, slugPrefix);
        setForm((prev: any) => {
          const currentImages = prev.images || [];
          const newOrder = currentImages.length + 1;
          const isPrimary = currentImages.length === 0;
          return {
            ...prev,
            images: [
              ...currentImages,
              {
                url: res.url,
                isPrimary,
                order: newOrder,
                caption: `${prev.name || 'Vehicle'} View ${newOrder}`,
                storageProvider: res.storageProvider,
              },
            ],
          };
        });
      }
      showFeedback('success', `Uploaded ${files.length} photo(s)`);
    } catch (err: any) {
      showFeedback('error', err.message || 'Image upload failed');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleAddManualImage = () => {
    if (!manualImageUrl.trim()) return;
    setForm((prev: any) => {
      const currentImages = prev.images || [];
      const newOrder = currentImages.length + 1;
      const isPrimary = currentImages.length === 0;
      return {
        ...prev,
        images: [
          ...currentImages,
          {
            url: manualImageUrl.trim(),
            isPrimary,
            order: newOrder,
            caption: `${prev.name || 'Vehicle'} View ${newOrder}`,
          },
        ],
      };
    });
    setManualImageUrl('');
  };

  const handleSetPrimaryImage = (index: number) => {
    setForm((prev: any) => {
      const updated = (prev.images || []).map((img: any, i: number) => ({
        ...img,
        isPrimary: i === index,
      }));
      return { ...prev, images: updated };
    });
  };

  const handleRemoveImage = (index: number) => {
    setForm((prev: any) => {
      const filtered = (prev.images || []).filter((_: any, i: number) => i !== index);
      // Re-assign primary if previous primary was deleted
      const hasPrimary = filtered.some((img: any) => img.isPrimary);
      const reindexed = filtered.map((img: any, i: number) => ({
        ...img,
        order: i + 1,
        isPrimary: hasPrimary ? img.isPrimary : i === 0,
      }));
      return { ...prev, images: reindexed };
    });
  };

  const handleMoveImage = (index: number, direction: 'UP' | 'DOWN') => {
    setForm((prev: any) => {
      const imgs = [...(prev.images || [])];
      const target = direction === 'UP' ? index - 1 : index + 1;
      if (target < 0 || target >= imgs.length) return prev;
      const temp = imgs[index];
      imgs[index] = imgs[target];
      imgs[target] = temp;
      return {
        ...prev,
        images: imgs.map((img, i) => ({ ...img, order: i + 1 })),
      };
    });
  };

  const handleAddColor = () => {
    if (!newColor.name.trim()) return;
    setForm((prev: any) => ({
      ...prev,
      colors: [...(prev.colors || []), { ...newColor }],
    }));
    setNewColor({ name: '', hex: '#267DFF', description: '' });
  };

  const handleRemoveColor = (idx: number) => {
    setForm((prev: any) => ({
      ...prev,
      colors: (prev.colors || []).filter((_: any, i: number) => i !== idx),
    }));
  };

  const handleAddSpec = () => {
    if (!newSpec.label.trim() || !newSpec.value.trim()) return;
    setForm((prev: any) => ({
      ...prev,
      specifications: [...(prev.specifications || []), { ...newSpec }],
    }));
    setNewSpec({ label: '', value: '', sub: '' });
  };

  const handleRemoveSpec = (idx: number) => {
    setForm((prev: any) => ({
      ...prev,
      specifications: (prev.specifications || []).filter((_: any, i: number) => i !== idx),
    }));
  };

  const handleAddHighlight = () => {
    if (!newHighlight.trim()) return;
    setForm((prev: any) => ({
      ...prev,
      highlights: [...(prev.highlights || []), newHighlight.trim()],
    }));
    setNewHighlight('');
  };

  const handleRemoveHighlight = (idx: number) => {
    setForm((prev: any) => ({
      ...prev,
      highlights: (prev.highlights || []).filter((_: any, i: number) => i !== idx),
    }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showFeedback('error', 'Product name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        name: form.name.trim(),
        slug: form.slug ? form.slug.trim() : undefined,
        category: form.category,
        brand: form.brand || 'ASKR EV',
        tagline: form.tagline,
        shortDescription: form.shortDescription,
        fullDescription: form.fullDescription,
        sellingPriceINR: form.sellingPriceINR !== '' ? Number(form.sellingPriceINR) : null,
        regularPriceINR: form.regularPriceINR !== '' ? Number(form.regularPriceINR) : null,
        bookingAmountINR: form.bookingAmountINR !== '' ? Number(form.bookingAmountINR) : null,
        voucherRedeemLimitINR: form.voucherRedeemLimitINR !== '' ? Number(form.voucherRedeemLimitINR) : null,
        rangeKm: form.rangeKm !== '' ? Number(form.rangeKm) : null,
        topSpeedKmh: form.topSpeedKmh !== '' ? Number(form.topSpeedKmh) : null,
        batteryCapacityKwh: form.batteryCapacityKwh !== '' ? Number(form.batteryCapacityKwh) : null,
        chargingTimeHours: form.chargingTimeHours !== '' ? Number(form.chargingTimeHours) : null,
        motorPower: form.motorPower,
        acceleration: form.acceleration,
        warranty: form.warranty,
        powertrain: form.powertrain,
        isHero: Boolean(form.isHero),
        heroMobileImage: form.heroMobileImage || null,
        heroHeading: form.heroHeading || null,
        heroDescription: form.heroDescription || null,
        heroCtaText: form.heroCtaText || null,
        heroCtaLink: form.heroCtaLink || null,
        heroSlideOrder: form.heroSlideOrder !== '' ? Number(form.heroSlideOrder) : null,
        isFeatured: form.isFeatured,
        status: form.status,
        displayOrder: Number(form.displayOrder) || 1,
        images: form.images || [],
        heroImage: (form.images && form.images.find((img: any) => img.isPrimary)?.url) || (form.images && form.images[0]?.url) || '',
        thumbnailImage: (form.images && form.images.find((img: any) => img.isPrimary)?.url) || (form.images && form.images[0]?.url) || '',
        colors: form.colors || [],
        specifications: form.specifications || [],
        highlights: form.highlights || [],
        oemManufacturer: form.oemManufacturer?.trim() || null,
        oemModelName: form.oemModelName?.trim() || null,
        oemReference: form.oemReference?.trim() || null,
        internalNotes: form.internalNotes?.trim() || null,
        slugAliases: form.slugAliases ? form.slugAliases.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean) : [],
        isRebranded: Boolean(form.isRebranded),
      };

      if (modalMode === 'CREATE') {
        await fetchApi('/admin/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showFeedback('success', `Product '${payload.name}' created successfully`);
      } else {
        await fetchApi(`/admin/products/${editingProductId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        showFeedback('success', `Product '${payload.name}' updated successfully`);
      }

      setModalOpen(false);
      loadProducts();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to save product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Summary Statistics */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-50 text-[#165DAD]">
                <Package className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Product Catalog Management</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Add, edit, reorder, and publish electric vehicle models for the live public showroom.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadProducts}
              className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              title="Refresh Catalog"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <a
              href="/?preview=true"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-300 flex items-center gap-2"
              title="Open Public Showroom in Admin Preview Mode"
            >
              <Eye className="w-4 h-4 text-blue-600" />
              <span>Preview Showroom</span>
            </a>

            <button
              onClick={openCreateModal}
              className="px-4 py-2.5 rounded-xl bg-[#165DAD] hover:bg-[#124B8C] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Product</span>
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Models</div>
            <div className="text-2xl font-black text-slate-800 mt-1">{stats.total}</div>
          </div>
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200/80">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Published Live</div>
            <div className="text-2xl font-black text-emerald-700 mt-1">{stats.published}</div>
          </div>
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/80">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Drafts (Hidden)</div>
            <div className="text-2xl font-black text-amber-700 mt-1">{stats.draft}</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-100 border border-slate-300/80">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Archived</div>
            <div className="text-2xl font-black text-slate-600 mt-1">{stats.archived}</div>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
        >
          <span>{feedbackMsg.text}</span>
          <button onClick={() => setFeedbackMsg(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Filter & Search Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { id: 'ALL', label: 'All Categories' },
            { id: 'SCOOTER', label: 'Scooters' },
            { id: 'BIKE', label: 'Motorcycles' },
            { id: 'CYCLE', label: 'Cycles' },
            { id: 'JEEP', label: 'Jeeps' },
            { id: 'UTILITY', label: 'Utility' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${categoryFilter === cat.id
                  ? 'bg-[#165DAD] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Status Filter & Search */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="PUBLISHED">Published Only</option>
            <option value="DRAFT">Drafts Only</option>
            <option value="ARCHIVED">Archived Only</option>
          </select>

          <form onSubmit={handleSearchSubmit} className="relative flex-1 md:w-56">
            <input
              type="text"
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </form>
        </div>
      </div>

      {/* 3. Product Catalog Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#165DAD]" />
            Loading catalog models...
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs space-y-2">
            <Package className="w-8 h-8 mx-auto text-slate-300" />
            <p className="font-semibold text-slate-600">No vehicle models match the current filter criteria</p>
            <p className="text-[11px]">Click "Add New Product" to create your first vehicle model</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">Order</th>
                  <th className="py-3 px-4">Vehicle Model</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Pricing (INR)</th>
                  <th className="py-3 px-4">Specifications</th>
                  <th className="py-3 px-4 text-center">Hero</th>
                  <th className="py-3 px-4 text-center">Featured</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Order Controls */}
                    <td className="py-3 px-2 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <button
                          onClick={() => handleMoveOrder(idx, 'UP')}
                          disabled={idx === 0}
                          className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                          title="Move Up"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[11px] font-extrabold text-slate-500">{p.displayOrder || idx + 1}</span>
                        <button
                          onClick={() => handleMoveOrder(idx, 'DOWN')}
                          disabled={idx === products.length - 1}
                          className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                          title="Move Down"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* Vehicle Info */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                          {p.heroImage ? (
                            <img src={p.heroImage} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-slate-500" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                            <span>{p.name}</span>
                            <span className="text-[10px] font-normal text-slate-400">({p.brand})</span>
                            {p.oemManufacturer && (
                              <span
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-purple-50 text-purple-700 border border-purple-200"
                                title={`Original Supplier: ${p.oemManufacturer} ${p.oemModelName || ''} (Internal Compliance Traceability)`}
                              >
                                OEM: {p.oemManufacturer} {p.oemModelName ? `• ${p.oemModelName}` : ''}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-xs">
                            {p.tagline || p.slug}
                            {p.slugAliases && p.slugAliases.length > 0 && (
                              <span className="text-[9px] text-slate-400 ml-1.5 font-mono" title={`Legacy URLs redirecting here: ${p.slugAliases.join(', ')}`}>
                                (alias: {p.slugAliases[0]})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#165DAD] border border-blue-200">
                        {p.categoryLabel || p.category}
                      </span>
                    </td>

                    {/* Pricing */}
                    <td className="py-3 px-4">
                      {p.sellingPriceINR ? (
                        <div>
                          <div className="font-black text-slate-900">
                            ₹{p.sellingPriceINR.toLocaleString('en-IN')}
                          </div>
                          {p.regularPriceINR && p.regularPriceINR > p.sellingPriceINR && (
                            <div className="text-[10px] text-slate-400 line-through">
                              ₹{p.regularPriceINR.toLocaleString('en-IN')}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          Contact for Price
                        </span>
                      )}
                    </td>

                    {/* Core Specs */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 text-[11px] text-slate-600">
                        {p.rangeKm && (
                          <span className="inline-flex items-center gap-0.5" title="Range">
                            <Zap className="w-3 h-3 text-amber-500" />
                            <span>{p.rangeKm} km</span>
                          </span>
                        )}
                        {p.topSpeedKmh && (
                          <span className="inline-flex items-center gap-0.5" title="Top Speed">
                            <Gauge className="w-3 h-3 text-cyan-600" />
                            <span>{p.topSpeedKmh} km/h</span>
                          </span>
                        )}
                        {p.batteryCapacityKwh && (
                          <span className="inline-flex items-center gap-0.5" title="Battery">
                            <BatteryCharging className="w-3 h-3 text-emerald-600" />
                            <span>{p.batteryCapacityKwh} kWh</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Hero Slider Toggle */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleHero(p)}
                        className={`p-1.5 rounded-lg transition-colors ${p.isHero
                            ? 'text-blue-600 bg-blue-50 hover:bg-blue-100 ring-1 ring-blue-300'
                            : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'
                          }`}
                        title={p.isHero ? 'Active in Homepage Hero Slider (Click to disable)' : 'Place in Homepage Hero Slider'}
                      >
                        <Sparkles className={`w-4 h-4 ${p.isHero ? 'fill-blue-500 text-blue-600' : ''}`} />
                      </button>
                    </td>

                    {/* Featured Toggle */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleFeatured(p)}
                        className={`p-1.5 rounded-lg transition-colors ${p.isFeatured
                            ? 'text-amber-500 bg-amber-50 hover:bg-amber-100'
                            : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'
                          }`}
                        title={p.isFeatured ? 'Featured on Homepage (Click to disable)' : 'Mark as Featured on Homepage'}
                      >
                        <Star className={`w-4 h-4 ${p.isFeatured ? 'fill-amber-500' : ''}`} />
                      </button>
                    </td>

                    {/* Publication Status Toggle */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(p)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${p.status === 'PUBLISHED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : p.status === 'DRAFT'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                              : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                          }`}
                        title={`Click to switch between Published and Draft`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${p.status === 'PUBLISHED' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                            }`}
                        />
                        <span>{p.status}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/bikes/${p.slug}?preview=true`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition-colors"
                          title="Preview in Showroom"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-[#165DAD] hover:border-blue-300 transition-colors"
                          title="Edit Vehicle Model"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleArchive(p)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 transition-colors"
                          title="Archive Model"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =======================================================================
          4. CREATE / EDIT PRODUCT MODAL
          ======================================================================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full my-8 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-blue-50 text-[#165DAD]">
                  <Package className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {modalMode === 'CREATE' ? 'Add New Electric Vehicle Model' : `Edit: ${form.name}`}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Configure technical specifications, pricing, gallery photos, and publishing options.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tab Navigator */}
            <div className="flex items-center border-b border-slate-200 px-5 bg-slate-50/50 gap-2 overflow-x-auto">
              {[
                { id: 'basic', label: '1. Basic & Pricing' },
                { id: 'specs', label: '2. Performance Specs' },
                { id: 'images', label: `3. Photos (${form.images?.length || 0})` },
                { id: 'colors', label: `4. Colors & Variants (${form.colors?.length || 0})` },
                { id: 'hero', label: '5. Hero Placement' },
                { id: 'oem', label: '6. OEM Traceability' },
                { id: 'publish', label: '7. Publishing' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setModalTab(tab.id as any)}
                  className={`py-2.5 px-3 border-b-2 text-xs font-bold transition-all whitespace-nowrap ${modalTab === tab.id
                      ? 'border-[#165DAD] text-[#165DAD]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleFormSubmit} className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">
              {/* TAB 1: BASIC & PRICING */}
              {modalTab === 'basic' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Vehicle Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. ASKR S1 Pro"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">URL Slug</label>
                      <input
                        type="text"
                        placeholder="Auto-generated if left empty"
                        value={form.slug}
                        onChange={(e) => setForm({ ...form, slug: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Category *</label>
                      <select
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 font-semibold"
                      >
                        <option value="SCOOTER">Electric Scooter</option>
                        <option value="BIKE">Electric Motorcycle</option>
                        <option value="CYCLE">Electric Cycle</option>
                        <option value="JEEP">Electric 4x4 Jeep</option>
                        <option value="UTILITY">Electric Utility Vehicle</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Brand Name</label>
                      <input
                        type="text"
                        value={form.brand}
                        onChange={(e) => setForm({ ...form, brand: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Tagline</label>
                    <input
                      type="text"
                      placeholder="e.g. Hyper-Performance Connected Electric Scooter"
                      value={form.tagline}
                      onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-700">Selling Price (Ex-Showroom ₹)</label>
                        <span className="text-[10px] text-slate-400">Leave empty for "Contact for Price"</span>
                      </div>
                      <input
                        type="number"
                        placeholder="e.g. 129999 (or empty)"
                        value={form.sellingPriceINR}
                        onChange={(e) => setForm({ ...form, sellingPriceINR: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 font-bold"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Regular / On-Road Price (₹)</label>
                      <input
                        type="number"
                        placeholder="e.g. 147500"
                        value={form.regularPriceINR}
                        onChange={(e) => setForm({ ...form, regularPriceINR: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Booking Deposit Amount (₹)</label>
                      <input
                        type="number"
                        placeholder="e.g. 4999"
                        value={form.bookingAmountINR}
                        onChange={(e) => setForm({ ...form, bookingAmountINR: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Max Shopping Voucher Redemption (₹)</label>
                      <input
                        type="number"
                        placeholder="e.g. 30000"
                        value={form.voucherRedeemLimitINR}
                        onChange={(e) => setForm({ ...form, voucherRedeemLimitINR: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Full Commercial Description</label>
                    <textarea
                      rows={3}
                      value={form.fullDescription}
                      onChange={(e) => setForm({ ...form, fullDescription: e.target.value })}
                      placeholder="Detailed vehicle features and commercial overview..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: PERFORMANCE & EV SPECS */}
              {modalTab === 'specs' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Certified Range (km)</label>
                      <input
                        type="number"
                        placeholder="e.g. 195"
                        value={form.rangeKm}
                        onChange={(e) => setForm({ ...form, rangeKm: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 font-bold"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Top Speed (km/h)</label>
                      <input
                        type="number"
                        placeholder="e.g. 120"
                        value={form.topSpeedKmh}
                        onChange={(e) => setForm({ ...form, topSpeedKmh: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Battery Capacity (kWh)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="e.g. 4.0"
                        value={form.batteryCapacityKwh}
                        onChange={(e) => setForm({ ...form, batteryCapacityKwh: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 font-bold"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Charging Time (Hours)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="e.g. 6.5"
                        value={form.chargingTimeHours}
                        onChange={(e) => setForm({ ...form, chargingTimeHours: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Peak Motor Power</label>
                      <input
                        type="text"
                        placeholder="e.g. 11 kW Peak (Mid-Drive IPM)"
                        value={form.motorPower}
                        onChange={(e) => setForm({ ...form, motorPower: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Acceleration 0–40 km/h</label>
                      <input
                        type="text"
                        placeholder="e.g. 2.6 sec"
                        value={form.acceleration}
                        onChange={(e) => setForm({ ...form, acceleration: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Warranty Period</label>
                      <input
                        type="text"
                        placeholder="e.g. 8-Year / 80,000 km Battery Warranty"
                        value={form.warranty}
                        onChange={(e) => setForm({ ...form, warranty: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Powertrain Architecture</label>
                      <input
                        type="text"
                        placeholder="e.g. Interior Permanent Magnet (IPM) Motor"
                        value={form.powertrain}
                        onChange={(e) => setForm({ ...form, powertrain: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: PHOTOS & GALLERY */}
              {modalTab === 'images' && (
                <div className="space-y-4">
                  {/* Upload Box */}
                  <div className="p-5 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 text-center space-y-2">
                    <Upload className="w-6 h-6 mx-auto text-[#165DAD]" />
                    <div className="font-bold text-slate-700">Upload Product Photos</div>
                    <p className="text-[11px] text-slate-400">
                      JPEG, PNG, or WebP up to 10 MB. High-resolution transparent or studio photos recommended.
                    </p>
                    <label className="inline-block px-4 py-2 rounded-xl bg-[#165DAD] hover:bg-[#124B8C] text-white text-xs font-bold cursor-pointer transition-colors shadow-xs">
                      <span>{isUploading ? 'Uploading...' : 'Choose Photos from Device'}</span>
                      <input
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Manual URL Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Or enter image URL (e.g. /images/vehicles/dark/model.jpg or https://...)"
                      value={manualImageUrl}
                      onChange={(e) => setManualImageUrl(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200"
                    />
                    <button
                      type="button"
                      onClick={handleAddManualImage}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700"
                    >
                      Add URL
                    </button>
                  </div>

                  {/* Image Gallery Cards */}
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold text-slate-500 uppercase">
                      Current Photos ({form.images?.length || 0})
                    </div>
                    {form.images?.length === 0 ? (
                      <div className="p-4 text-center text-slate-400 border border-slate-100 rounded-xl bg-slate-50/50">
                        No photos added yet
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {form.images.map((img: any, i: number) => (
                          <div
                            key={i}
                            className={`p-2.5 rounded-xl border relative flex flex-col justify-between gap-2 ${img.isPrimary
                                ? 'border-[#165DAD] bg-blue-50/40 shadow-xs'
                                : 'border-slate-200 bg-white'
                              }`}
                          >
                            <div className="h-28 rounded-lg bg-slate-900 overflow-hidden flex items-center justify-center">
                              <img src={img.url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <button
                                  type="button"
                                  onClick={() => handleSetPrimaryImage(i)}
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${img.isPrimary
                                      ? 'bg-[#165DAD] text-white'
                                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                    }`}
                                >
                                  {img.isPrimary ? 'Primary (Hero)' : 'Make Primary'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveImage(i)}
                                  className="text-rose-500 hover:text-rose-700 p-1"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="flex items-center justify-between text-[10px] text-slate-400">
                                <span>Order #{i + 1}</span>
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleMoveImage(i, 'UP')}
                                    disabled={i === 0}
                                    className="p-1 hover:text-slate-800 disabled:opacity-20"
                                  >
                                    <ChevronUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleMoveImage(i, 'DOWN')}
                                    disabled={i === form.images.length - 1}
                                    className="p-1 hover:text-slate-800 disabled:opacity-20"
                                  >
                                    <ChevronDown className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: COLORS & DETAILED SPECS */}
              {modalTab === 'colors' && (
                <div className="space-y-5">
                  {/* Colors Builder */}
                  <div className="space-y-3">
                    <div className="font-bold text-slate-700">Vehicle Color Swatches</div>
                    <div className="flex flex-wrap gap-2 items-center">
                      <input
                        type="color"
                        value={newColor.hex}
                        onChange={(e) => setNewColor({ ...newColor, hex: e.target.value })}
                        className="w-9 h-9 p-0.5 rounded-lg border border-slate-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        placeholder="Color Name (e.g. Glacier White)"
                        value={newColor.name}
                        onChange={(e) => setNewColor({ ...newColor, name: e.target.value })}
                        className="px-3 py-1.5 rounded-xl border border-slate-200"
                      />
                      <input
                        type="text"
                        placeholder="Finish (e.g. Pearl Gloss)"
                        value={newColor.description}
                        onChange={(e) => setNewColor({ ...newColor, description: e.target.value })}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 flex-1"
                      />
                      <button
                        type="button"
                        onClick={handleAddColor}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold"
                      >
                        Add Color
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {form.colors?.map((c: any, i: number) => (
                        <div
                          key={i}
                          className="flex flex-col gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 min-w-[260px]"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-4 h-4 rounded-full border border-black/20" style={{ backgroundColor: c.hex }} />
                              <span className="font-bold text-slate-800">{c.name}</span>
                            </div>
                            <button type="button" onClick={() => handleRemoveColor(i)} className="text-slate-400 hover:text-rose-500">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {c.description && <div className="text-[11px] text-slate-500">{c.description}</div>}

                          {/* Variant Specific Image Selection */}
                          <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                              Variant-Specific Image
                            </label>
                            {form.images && form.images.length > 0 ? (
                              <select
                                value={c.primaryImage || (c.images && c.images[0]?.url) || ''}
                                onChange={(e) => {
                                  const selectedUrl = e.target.value;
                                  setForm((prev: any) => {
                                    const updatedColors = [...(prev.colors || [])];
                                    updatedColors[i] = {
                                      ...updatedColors[i],
                                      primaryImage: selectedUrl,
                                      images: selectedUrl ? [{ url: selectedUrl, isPrimary: true, order: 1 }] : [],
                                    };
                                    return { ...prev, colors: updatedColors };
                                  });
                                }}
                                className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white"
                              >
                                <option value="">-- Use Default Model Gallery --</option>
                                {form.images.map((img: any, imgIdx: number) => (
                                  <option key={imgIdx} value={img.url}>
                                    Photo #{imgIdx + 1} {img.caption ? `(${img.caption})` : ''}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                placeholder="Image URL for this colour"
                                value={c.primaryImage || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setForm((prev: any) => {
                                    const updatedColors = [...(prev.colors || [])];
                                    updatedColors[i] = {
                                      ...updatedColors[i],
                                      primaryImage: val,
                                      images: val ? [{ url: val, isPrimary: true, order: 1 }] : [],
                                    };
                                    return { ...prev, colors: updatedColors };
                                  });
                                }}
                                className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200"
                              />
                            )}

                            {(c.primaryImage || (c.images && c.images[0]?.url)) && (
                              <div className="flex items-center gap-2 mt-1">
                                <div className="w-8 h-8 rounded bg-slate-900 overflow-hidden shrink-0">
                                  <img
                                    src={c.primaryImage || c.images[0]?.url}
                                    alt={c.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Variant photo linked
                                </span>
                              </div>
                            )}

                            {/* Direct Variant Photo Upload */}
                            <div className="pt-1">
                              <label className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[10px] font-semibold text-slate-700 cursor-pointer transition-colors">
                                <Upload className="w-2.5 h-2.5" />
                                <span>Upload Variant Photo</span>
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    try {
                                      const res = await uploadProductImageApi(
                                        file,
                                        `${form.slug || form.name || 'catalog'}-${c.name}`,
                                        'variant'
                                      );
                                      setForm((prev: any) => {
                                        const updatedColors = [...(prev.colors || [])];
                                        updatedColors[i] = {
                                          ...updatedColors[i],
                                          primaryImage: res.url,
                                          images: [{ url: res.url, isPrimary: true, order: 1 }],
                                        };
                                        return { ...prev, colors: updatedColors };
                                      });
                                      showFeedback('success', `Uploaded variant photo for ${c.name}`);
                                    } catch (err: any) {
                                      showFeedback('error', err.message || 'Variant upload failed');
                                    }
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Specifications Key-Value Builder */}
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <div className="font-bold text-slate-700">Detailed Technical Specifications</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Spec Label (e.g. True Urban Range)"
                        value={newSpec.label}
                        onChange={(e) => setNewSpec({ ...newSpec, label: e.target.value })}
                        className="px-3 py-1.5 rounded-xl border border-slate-200"
                      />
                      <input
                        type="text"
                        placeholder="Value (e.g. 143 km)"
                        value={newSpec.value}
                        onChange={(e) => setNewSpec({ ...newSpec, value: e.target.value })}
                        className="px-3 py-1.5 rounded-xl border border-slate-200"
                      />
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Sub-label (e.g. Normal City Traffic)"
                          value={newSpec.sub}
                          onChange={(e) => setNewSpec({ ...newSpec, sub: e.target.value })}
                          className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200"
                        />
                        <button
                          type="button"
                          onClick={handleAddSpec}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {form.specifications?.map((s: any, i: number) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100"
                        >
                          <div>
                            <span className="font-bold text-slate-800">{s.label}: </span>
                            <span className="text-slate-600 font-medium">{s.value}</span>
                            {s.sub && <span className="text-[10px] text-slate-400 ml-1">({s.sub})</span>}
                          </div>
                          <button type="button" onClick={() => handleRemoveSpec(i)} className="text-slate-400 hover:text-rose-500">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Highlights Bullet Points */}
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <div className="font-bold text-slate-700">Vehicle Highlights</div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. Dual-motor electric all-wheel drive with instant torque vectoring"
                        value={newHighlight}
                        onChange={(e) => setNewHighlight(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={handleAddHighlight}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold"
                      >
                        Add Highlight
                      </button>
                    </div>

                    <ul className="space-y-1">
                      {form.highlights?.map((h: string, i: number) => (
                        <li key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-slate-700">
                          <span>• {h}</span>
                          <button type="button" onClick={() => handleRemoveHighlight(i)} className="text-slate-400 hover:text-rose-500">
                            <X className="w-3 h-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* TAB 5: HERO PLACEMENT */}
              {modalTab === 'hero' && (
                <div className="space-y-5">
                  <div className="p-4 rounded-xl border border-slate-200 space-y-3 bg-blue-50/30">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.isHero}
                        onChange={(e) => setForm({ ...form, isHero: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-bold text-slate-800 text-sm">Feature in Homepage Hero Slider</span>
                    </label>
                    <p className="text-[11px] text-slate-500 pl-6.5">
                      When enabled, this vehicle model will be featured in the cinematic hero carousel at the top of the homepage.
                    </p>
                  </div>

                  {form.isHero && (
                    <div className="space-y-4 p-4 rounded-xl border border-slate-200 bg-white">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Hero Heading / Headline</label>
                        <input
                          type="text"
                          placeholder="e.g. Pure Electric Torque. Zero Compromise."
                          value={form.heroHeading}
                          onChange={(e) => setForm({ ...form, heroHeading: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 font-semibold"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Leave empty to use the vehicle's standard tagline.</p>
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Hero Subheading / Description</label>
                        <textarea
                          rows={2}
                          placeholder="e.g. High-torque urban electric streetfighter powered by permanent magnet synchronous mid-drive motor..."
                          value={form.heroDescription}
                          onChange={(e) => setForm({ ...form, heroDescription: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">CTA Button Text</label>
                          <input
                            type="text"
                            placeholder="e.g. Book Test Ride / Explore Specs"
                            value={form.heroCtaText}
                            onChange={(e) => setForm({ ...form, heroCtaText: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">CTA Target Link</label>
                          <input
                            type="text"
                            placeholder="e.g. /bikes/thunder-pro (default auto)"
                            value={form.heroCtaLink}
                            onChange={(e) => setForm({ ...form, heroCtaLink: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Mobile Hero Image (Optional)</label>
                          <input
                            type="text"
                            placeholder="e.g. /images/vehicles/dark/hero-mobile.jpg"
                            value={form.heroMobileImage}
                            onChange={(e) => setForm({ ...form, heroMobileImage: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200"
                          />
                          <p className="text-[10px] text-slate-400 mt-1">Defaults to desktop primary photo if left empty.</p>
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Hero Slide Order</label>
                          <input
                            type="number"
                            placeholder="e.g. 1, 2, 3..."
                            value={form.heroSlideOrder}
                            onChange={(e) => setForm({ ...form, heroSlideOrder: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: INTERNAL OEM TRACEABILITY */}
              {modalTab === 'oem' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/50 space-y-1">
                    <div className="flex items-center gap-2 text-purple-900 font-bold text-sm">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      <span>Internal Supplier & OEM Compliance Traceability</span>
                    </div>
                    <p className="text-[11px] text-purple-700 leading-relaxed">
                      This information is strictly reserved for Super Admin inspection (warranty, service, procurement, and legal compliance).
                      It is never disclosed to customer-facing showroom pages, metadata, or public catalog APIs.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.isRebranded}
                        onChange={(e) => setForm({ ...form, isRebranded: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-bold text-slate-800 text-xs">Authorized ASKR EV Rebrand</span>
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">OEM / Supplier Manufacturer</label>
                        <input
                          type="text"
                          placeholder="e.g. Harsil, Eko Tejas, Rilox, Jatayu EV"
                          value={form.oemManufacturer}
                          onChange={(e) => setForm({ ...form, oemManufacturer: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">OEM Original Model Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Leo, Sport, 3W Commercial Loader"
                          value={form.oemModelName}
                          onChange={(e) => setForm({ ...form, oemModelName: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">OEM Reference / Batch Identifier</label>
                      <input
                        type="text"
                        placeholder="e.g. Batch-H01-PriceSheet-Sage, FactorySpec-Batch1"
                        value={form.oemReference}
                        onChange={(e) => setForm({ ...form, oemReference: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Legacy URL Slug Aliases (Comma-separated)</label>
                      <input
                        type="text"
                        placeholder="e.g. harsil-leo, harsil-scooter"
                        value={form.slugAliases}
                        onChange={(e) => setForm({ ...form, slugAliases: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 font-mono text-[11px]"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Any customer visiting these old URLs will be automatically routed to this ASKR EV product without broken links.
                      </p>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Internal Notes & Compliance Records</label>
                      <textarea
                        rows={3}
                        placeholder="Internal notes regarding distributor authorization, supplier agreement, warranty obligations, or MLM commission rules..."
                        value={form.internalNotes}
                        onChange={(e) => setForm({ ...form, internalNotes: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 7: PUBLISHING */}
              {modalTab === 'publish' && (
                <div className="space-y-5">
                  <div className="p-4 rounded-xl border border-slate-200 space-y-3 bg-slate-50/50">
                    <label className="font-bold text-slate-800 block">Catalog Publication Status</label>
                    <div className="grid grid-cols-2 gap-3">
                      <label
                        className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${form.status === 'PUBLISHED'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                            : 'bg-white border-slate-200 text-slate-600'
                          }`}
                      >
                        <input
                          type="radio"
                          name="status"
                          value="PUBLISHED"
                          checked={form.status === 'PUBLISHED'}
                          onChange={() => setForm({ ...form, status: 'PUBLISHED' })}
                          className="hidden"
                        />
                        <CheckCircle2 className={`w-5 h-5 ${form.status === 'PUBLISHED' ? 'text-emerald-600' : 'text-slate-300'}`} />
                        <div>
                          <div>Published (Live)</div>
                          <div className="text-[10px] font-normal text-slate-500">Instantly visible in public showroom</div>
                        </div>
                      </label>

                      <label
                        className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${form.status === 'DRAFT'
                            ? 'bg-amber-50 border-amber-300 text-amber-800 font-bold'
                            : 'bg-white border-slate-200 text-slate-600'
                          }`}
                      >
                        <input
                          type="radio"
                          name="status"
                          value="DRAFT"
                          checked={form.status === 'DRAFT'}
                          onChange={() => setForm({ ...form, status: 'DRAFT' })}
                          className="hidden"
                        />
                        <XCircle className={`w-5 h-5 ${form.status === 'DRAFT' ? 'text-amber-600' : 'text-slate-300'}`} />
                        <div>
                          <div>Draft (Hidden)</div>
                          <div className="text-[10px] font-normal text-slate-500">Only visible inside Admin Dashboard</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 space-y-2 bg-slate-50/50">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.isFeatured}
                        onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-bold text-slate-800">Feature this model on Homepage</span>
                    </label>
                    <p className="text-[11px] text-slate-500 pl-6.5">
                      Featured vehicles appear prominently in the dynamic homepage showcases.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Display Order</label>
                      <input
                        type="number"
                        value={form.displayOrder}
                        onChange={(e) => setForm({ ...form, displayOrder: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Lower numbers appear first in the showroom listing.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancel
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      setForm((prev: any) => ({ ...prev, status: 'DRAFT' }));
                      setTimeout(() => {
                        const fakeEvent = { preventDefault: () => { } } as any;
                        handleFormSubmit(fakeEvent);
                      }, 50);
                    }}
                    className="px-4 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs transition-colors"
                  >
                    Save as Draft
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2 rounded-xl bg-[#165DAD] hover:bg-[#124B8C] text-white font-bold shadow-xs flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                    <span>{modalMode === 'CREATE' ? 'Create & Publish' : 'Save Changes'}</span>
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

export default AdminProductCatalog;
