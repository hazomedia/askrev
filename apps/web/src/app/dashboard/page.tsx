'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Wallet,
  Users,
  Copy,
  Check,
  Share2,
  Bike,
  Sparkles,
  AlertCircle,
  Ticket,
  ShieldCheck,
  User,
  GitBranch,
  ChevronRight,
  LogOut,
  LayoutDashboard,
  Menu,
  X,
  ExternalLink,
  RotateCcw,
  History,
  ArrowDownRight,
  ArrowUpRight,
  Mail,
  Edit3,
  CheckCircle,
  Cpu,
  ShieldAlert,
  Receipt,
  CheckCircle2,
  Lock,
  QrCode,
  Home,
  CreditCard,
  Building2,
  Globe,
} from 'lucide-react';
import QRCode from 'qrcode';
import { fetchApi, getStoredUser, logoutSession } from '../../lib/api';

type TabType = 'overview' | 'membership' | 'team' | 'binary' | 'wallets' | 'vouchers' | 'calculator' | 'bookings' | 'profile';

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [directTeam, setDirectTeam] = useState<any>(null);
  const [binaryTree, setBinaryTree] = useState<any>(null);
  const [inspectedBinaryTree, setInspectedBinaryTree] = useState<any>(null);
  const [binaryHistory, setBinaryHistory] = useState<any[]>([]);
  const [binaryBreadcrumb, setBinaryBreadcrumb] = useState<{ memberId: string; fullName: string }[]>([]);
  const [loadingBinarySubtree, setLoadingBinarySubtree] = useState(false);
  const [binaryTreeError, setBinaryTreeError] = useState<string | null>(null);
  const [userBookings, setUserBookings] = useState<any[]>([]);
  const [userVouchers, setUserVouchers] = useState<any[]>([]);
  const [walletOverview, setWalletOverview] = useState<any>(null);
  const [walletTransactions, setWalletTransactions] = useState<any[]>([]);
  const [voucherTransactions, setVoucherTransactions] = useState<any[]>([]);
  const [membershipRequests, setMembershipRequests] = useState<any[]>([]);
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const [copiedLeft, setCopiedLeft] = useState(false);
  const [copiedRight, setCopiedRight] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState<string | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedRequestType, setSelectedRequestType] = useState<
    'BASIC_ACTIVATION' | 'FULL_ACTIVATION' | 'BASIC_TO_FULL_UPGRADE' | null
  >(null);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'GATEWAY' | 'SIMULATED'>('UPI');
  const [paymentUtr, setPaymentUtr] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState<{
    isConfigured: boolean;
    merchantUpiVpa: string | null;
    merchantName: string;
    isVerified: boolean;
    pricing?: { BASIC_ACTIVATION: number; FULL_ACTIVATION: number; BASIC_TO_FULL_UPGRADE: number };
  } | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<{
    upi: {
      isEnabled: boolean;
      isConfigured: boolean;
      merchantUpiVpa: string | null;
      merchantName: string;
      manualReviewRequired: boolean;
    };
    gateways: Array<{
      provider: string;
      isSandbox: boolean;
      displayName: string;
    }>;
    pricing: {
      BASIC_ACTIVATION: number;
      FULL_ACTIVATION: number;
      BASIC_TO_FULL_UPGRADE: number;
    };
  } | null>(null);
  const [selectedGatewayProvider, setSelectedGatewayProvider] = useState<string>('RAZORPAY');
  const [isProcessingGateway, setIsProcessingGateway] = useState(false);
  const [gatewayOrder, setGatewayOrder] = useState<any | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [verificationNotice, setVerificationNotice] = useState<string | null>(null);

  // Change Password States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirm password do not match.');
      setPasswordSaving(false);
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long.');
      setPasswordSaving(false);
      return;
    }

    try {
      await fetchApi('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });
      setPasswordSuccess('Password successfully updated! All other active sessions have been revoked.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password. Please check your current password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  // Calculation Engine Simulator States
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);
  const [leftUnits, setLeftUnits] = useState(12);
  const [rightUnits, setRightUnits] = useState(25);
  const [prevCarryLeft, setPrevCarryLeft] = useState(0);
  const [prevCarryRight, setPrevCarryRight] = useState(0);
  const [binaryResult, setBinaryResult] = useState<any>(null);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as TabType;
    if (
      tabParam &&
      [
        'overview',
        'membership',
        'team',
        'binary',
        'wallets',
        'vouchers',
        'calculator',
        'bookings',
        'profile',
      ].includes(tabParam)
    ) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (activeTab === 'calculator' && !simulationResult) {
      runCanonicalSimulation();
      calculateBinaryMatching();
    }
  }, [activeTab]);

  const runCanonicalSimulation = async () => {
    setSimLoading(true);
    setSimError(null);
    try {
      const data: any = await fetchApi('/simulation/canonical-scenario');
      setSimulationResult(data);
    } catch (err: any) {
      setSimError(err.message || 'Simulation execution failed');
    } finally {
      setSimLoading(false);
    }
  };

  const calculateBinaryMatching = async () => {
    try {
      const res: any = await fetchApi('/simulation/binary-matching', {
        method: 'POST',
        body: JSON.stringify({
          leftUnits: Number(leftUnits),
          rightUnits: Number(rightUnits),
          previousCarryLeft: Number(prevCarryLeft),
          previousCarryRight: Number(prevCarryRight),
          isBeneficiaryQualified: true,
          todayMatchesAlreadySettled: 0,
        }),
      });
      setBinaryResult(res);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.push('/auth/login');
      return;
    }
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [
        profileData,
        teamData,
        binaryData,
        binaryHistoryData,
        bookingsData,
        vouchersData,
        walletData,
        walletTxData,
        voucherTxData,
        requestsData,
        paymentConfigData,
        paymentMethodsData,
      ] = await Promise.all([
        fetchApi<any>('/auth/me'),
        fetchApi<any>('/members/direct-team').catch(() => null),
        fetchApi<any>('/members/binary-tree').catch(() => null),
        fetchApi<any[]>('/members/binary/history').catch(() => []),
        fetchApi<any>('/ev-bikes/my-bookings').catch(() => []),
        fetchApi<any>('/vouchers/my-vouchers').catch(() => []),
        fetchApi<any>('/wallet/my-wallet').catch(() => null),
        fetchApi<any>('/wallet/transactions').catch(() => []),
        fetchApi<any>('/vouchers/transactions').catch(() => []),
        fetchApi<any>('/packages/my-requests').catch(() => []),
        fetchApi<any>('/packages/payment-config').catch(() => null),
        fetchApi<any>('/payments/methods').catch(() => null),
      ]);

      setUser(profileData);
      setDirectTeam(teamData);
      setBinaryTree(binaryData);
      setInspectedBinaryTree(binaryData);
      setBinaryHistory(Array.isArray(binaryHistoryData) ? binaryHistoryData : []);
      if (profileData?.memberId) {
        setBinaryBreadcrumb([{ memberId: profileData.memberId, fullName: profileData.fullName || 'Me' }]);
      }
      setUserBookings(bookingsData);
      setUserVouchers(vouchersData);
      setWalletOverview(walletData);
      setWalletTransactions(walletTxData);
      setVoucherTransactions(voucherTxData);
      setMembershipRequests(Array.isArray(requestsData) ? requestsData : []);
      setPaymentConfig(paymentConfigData);
      if (paymentMethodsData) {
        setPaymentMethods(paymentMethodsData);
        if (paymentMethodsData.gateways && paymentMethodsData.gateways.length > 0) {
          setSelectedGatewayProvider(paymentMethodsData.gateways[0].provider);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load member dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (
      !confirm(
        'Are you sure you want to cancel this simulated EV booking? Any redeemed shopping voucher value will be restored to your account.'
      )
    ) {
      return;
    }
    setCancellingBookingId(bookingId);
    try {
      await fetchApi(`/ev-bikes/bookings/${bookingId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ cancellationReason: 'Member requested simulated cancellation' }),
      });
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel booking');
    } finally {
      setCancellingBookingId(null);
    }
  };

  const getReferralLink = (leg?: 'LEFT' | 'RIGHT') => {
    if (!user || !user.memberId) return '';
    if (typeof window === 'undefined') return '';
    const base = `${window.location.origin}/auth/register?ref=${user.memberId}`;
    return leg ? `${base}&side=${leg}` : base;
  };

  const handleCopyLink = (leg?: 'LEFT' | 'RIGHT') => {
    const link = getReferralLink(leg);
    if (!link) return;
    navigator.clipboard.writeText(link);
    if (leg === 'RIGHT') {
      setCopiedRight(true);
      setTimeout(() => setCopiedRight(false), 2500);
    } else {
      setCopiedLeft(true);
      setTimeout(() => setCopiedLeft(false), 2500);
    }
  };

  const getWhatsAppShareUrl = (leg?: 'LEFT' | 'RIGHT') => {
    const link = getReferralLink(leg);
    if (!link || !user) return '#';
    const sideLabel = leg ? ` (${leg} Team)` : '';
    const text = `Join ASKR EV Mobility platform${sideLabel}. Register using my sponsor referral code ${user.memberId}: ${link}`;
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  };

  const handleShareLink = async (leg?: 'LEFT' | 'RIGHT') => {
    const link = getReferralLink(leg);
    if (!link || !user) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join ASKR EV Mobility',
          text: `Use my sponsor referral code ${user.memberId} to register with ASKR EV electric mobility platform:`,
          url: link,
        });
      } catch (err) {
        handleCopyLink(leg);
      }
    } else {
      handleCopyLink(leg);
    }
  };

  const openBookingPaymentModal = (
    requestType: 'BASIC_ACTIVATION' | 'FULL_ACTIVATION' | 'BASIC_TO_FULL_UPGRADE'
  ) => {
    setSelectedRequestType(requestType);
    setPaymentUtr('');
    setGatewayOrder(null);

    const hasGateways = !!(paymentMethods?.gateways && paymentMethods.gateways.length > 0);
    const hasUpi = paymentMethods
      ? paymentMethods.upi.isEnabled && paymentMethods.upi.isConfigured
      : !!paymentConfig?.isConfigured;

    if (hasGateways) {
      setPaymentMethod('GATEWAY');
    } else if (hasUpi) {
      setPaymentMethod('UPI');
    } else {
      setPaymentMethod('SIMULATED');
    }
    setPaymentModalOpen(true);
  };

  useEffect(() => {
    const upiVpa = paymentMethods?.upi?.merchantUpiVpa || paymentConfig?.merchantUpiVpa;
    const upiName = paymentMethods?.upi?.merchantName || paymentConfig?.merchantName || 'ASKR EV Mobility';
    const isUpiActive = paymentMethods
      ? paymentMethods.upi.isEnabled && paymentMethods.upi.isConfigured
      : !!paymentConfig?.isConfigured;

    if (isUpiActive && upiVpa && selectedRequestType) {
      const amount =
        selectedRequestType === 'BASIC_ACTIVATION'
          ? 3000
          : selectedRequestType === 'FULL_ACTIVATION'
            ? 33000
            : 30000;
      const note = `ASKREV-${selectedRequestType}-${user?.memberId || 'MEMBER'}`;
      const upiUri = `upi://pay?pa=${upiVpa}&pn=${encodeURIComponent(
        upiName
      )}&am=${amount}.00&cu=INR&tn=${encodeURIComponent(note)}`;

      QRCode.toDataURL(upiUri, { width: 220, margin: 1 })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => {
          console.error('Failed to generate UPI QR code:', err);
          setQrCodeDataUrl(null);
        });
    } else {
      setQrCodeDataUrl(null);
    }
  }, [paymentConfig, paymentMethods, selectedRequestType, user?.memberId]);

  const handleCopyUpi = () => {
    const upiVpa = paymentMethods?.upi?.merchantUpiVpa || paymentConfig?.merchantUpiVpa;
    if (upiVpa) {
      navigator.clipboard.writeText(upiVpa);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  };

  const handleInitiateGatewayPayment = async () => {
    if (!selectedRequestType) return;
    setIsProcessingGateway(true);
    setError(null);
    try {
      const amountPaise =
        selectedRequestType === 'BASIC_ACTIVATION'
          ? 300000
          : selectedRequestType === 'FULL_ACTIVATION'
          ? 3300000
          : 3000000;

      const orderRes = await fetchApi<any>('/payments/create-order', {
        method: 'POST',
        body: JSON.stringify({
          provider: selectedGatewayProvider,
          amountPaise,
          requestType: selectedRequestType,
        }),
      });

      const orderData = orderRes?.order;
      setGatewayOrder(orderData);

      // Check if Razorpay Checkout script is loaded on window
      if (typeof window !== 'undefined' && (window as any).Razorpay && orderData?.keyId) {
        const options = {
          key: orderData.keyId,
          amount: orderData.amountPaise,
          currency: orderData.currency || 'INR',
          name: 'ASKR EV Mobility',
          description: `Booking - ${selectedRequestType}`,
          order_id: orderData.orderId,
          handler: async function (response: any) {
            await handleMembershipRequest(
              selectedRequestType,
              'GATEWAY',
              response.razorpay_payment_id || response.razorpay_order_id || orderData.orderId
            );
          },
          prefill: {
            name: user?.fullName,
            email: user?.email,
            contact: user?.phone,
          },
          theme: { color: '#165DAD' },
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create payment gateway order');
    } finally {
      setIsProcessingGateway(false);
    }
  };

  const handleMembershipRequest = async (
    requestType: 'BASIC_ACTIVATION' | 'FULL_ACTIVATION' | 'BASIC_TO_FULL_UPGRADE',
    mode: 'UPI' | 'GATEWAY' | 'SIMULATED' = 'SIMULATED',
    refNumber?: string
  ) => {
    setUpgrading(true);
    setUpgradeSuccess(null);
    setError(null);
    try {
      const activeUpiVpa = paymentMethods?.upi?.merchantUpiVpa || paymentConfig?.merchantUpiVpa;
      const res: any = await fetchApi('/packages/request', {
        method: 'POST',
        body: JSON.stringify({
          requestType,
          paymentMode: mode === 'UPI' ? 'UPI' : mode === 'GATEWAY' ? 'PAYMENT_GATEWAY' : 'SIMULATED_PORTAL',
          paymentReference:
            mode === 'UPI'
              ? refNumber?.trim().toUpperCase() || 'UPI-REF'
              : mode === 'GATEWAY'
              ? refNumber?.trim() || gatewayOrder?.orderId || 'GW-REF'
              : 'SIMULATED-CLEARANCE',
          metadata: {
            compliance: 'SIMULATION_ONLY',
            source: 'member_dashboard_booking',
            ...(mode === 'UPI' && activeUpiVpa ? { merchantUpiVpa: activeUpiVpa } : {}),
            ...(mode === 'GATEWAY'
              ? {
                  provider: selectedGatewayProvider,
                  orderId: gatewayOrder?.orderId || refNumber,
                  amountPaise: gatewayOrder?.amountPaise,
                }
              : {}),
          },
        }),
      });
      setUpgradeSuccess(res.message || 'EV booking request submitted for administrative clearance.');
      setPaymentModalOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Booking request submission failed');
    } finally {
      setUpgrading(false);
    }
  };

  const handleConfirmPaymentRequest = async () => {
    if (!selectedRequestType) return;
    if (paymentMethod === 'UPI') {
      const trimmedUtr = paymentUtr.trim().toUpperCase();
      const utrRegex = /^([0-9]{12}|[A-Z0-9]{12,22})$/;
      if (!trimmedUtr) {
        setError('Please provide the UPI UTR / Transaction reference number.');
        return;
      }
      if (!utrRegex.test(trimmedUtr)) {
        setError('Invalid UTR format. Expected 12-digit numeric or 12-22 alphanumeric standard banking reference.');
        return;
      }
      await handleMembershipRequest(selectedRequestType, 'UPI', trimmedUtr);
    } else if (paymentMethod === 'GATEWAY') {
      if (gatewayOrder?.orderId) {
        await handleMembershipRequest(selectedRequestType, 'GATEWAY', gatewayOrder.orderId);
      } else {
        await handleInitiateGatewayPayment();
      }
    } else {
      await handleMembershipRequest(selectedRequestType, 'SIMULATED');
    }
  };

  const handleOpenEditProfile = () => {
    if (user) {
      setEditFullName(user.fullName || '');
      setEditPhone(user.phone || '');
      setProfileError(null);
      setProfileSuccess(null);
      setIsEditingProfile(true);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(null);
    try {
      const updated = await fetchApi<any>('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          fullName: editFullName.trim(),
          phone: editPhone.trim() ? editPhone.trim() : undefined,
        }),
      });
      setUser((prev: any) => ({ ...prev, ...updated }));
      setProfileSuccess('Profile updated successfully!');
      setIsEditingProfile(false);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSendVerification = async () => {
    setSendingVerification(true);
    setVerificationNotice(null);
    try {
      const res: any = await fetchApi<any>('/auth/send-verification', {
        method: 'POST',
      });
      setVerificationNotice(res.message || 'Verification link sent to your registered email.');
    } catch (err: any) {
      setVerificationNotice(err.message || 'Failed to send verification link.');
    } finally {
      setSendingVerification(false);
    }
  };

  const handleInspectBinarySubtree = async (targetMemberId: string, targetFullName: string, resetRoot = false) => {
    setLoadingBinarySubtree(true);
    setBinaryTreeError(null);
    try {
      const data = await fetchApi<any>(`/members/binary-tree?memberId=${encodeURIComponent(targetMemberId)}`);
      setInspectedBinaryTree(data);
      if (resetRoot) {
        setBinaryBreadcrumb([{ memberId: targetMemberId, fullName: targetFullName }]);
      } else {
        setBinaryBreadcrumb((prev) => {
          const existingIdx = prev.findIndex((b) => b.memberId === targetMemberId);
          if (existingIdx >= 0) return prev.slice(0, existingIdx + 1);
          return [...prev, { memberId: targetMemberId, fullName: targetFullName }];
        });
      }
    } catch (err: any) {
      setBinaryTreeError(err.message || 'Unable to inspect binary subtree.');
    } finally {
      setLoadingBinarySubtree(false);
    }
  };

  const handleLogout = async () => {
    await logoutSession();
    router.push('/auth/login');
  };

  if (loading && !user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-white text-slate-500">
        <div className="flex items-center gap-3">
          <div className="animate-spin w-6 h-6 border-2 border-[#165DAD] border-t-transparent rounded-full" />
          <span className="text-sm font-medium">Loading Member Portal...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const getPackageBadge = (pkg?: string) => {
    switch (pkg) {
      case 'FULL':
        return 'bg-blue-50 text-[#165DAD] border-blue-200';
      case 'BASIC':
        return 'bg-emerald-50 text-[#15803D] border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getTierDisplayName = (pkg?: string) => {
    switch (pkg) {
      case 'FULL':
        return 'EV ULTRA';
      case 'BASIC':
        return 'EV PRO';
      case 'FREE':
      default:
        return 'EV GO';
    }
  };

  const navItems: { id: TabType; label: string; icon: any; count?: number }[] = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'membership', label: 'EV Booking Tiers', icon: Sparkles },
    { id: 'team', label: 'My Team', icon: Users, count: directTeam?.directs?.length },
    { id: 'binary', label: 'My Binary Tree', icon: GitBranch },
    { id: 'wallets', label: 'Earnings Wallet', icon: Wallet },
    { id: 'vouchers', label: 'Shopping Vouchers', icon: Ticket, count: userVouchers.length },
    { id: 'calculator', label: 'Earnings Simulator', icon: Cpu },
    { id: 'bookings', label: 'My Bookings', icon: Bike, count: userBookings.length },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#253247]">
      {/* =========================================================================
          TASK 1 — TOP HEADER
          Features ASKR EV logo, Member ID, membership badge, and Logout
          ========================================================================= */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Mobile trigger & ASKR EV Logo + Title */}
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-slate-500 hover:text-[#253247] hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Toggle navigation"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <Link href="/" className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#165DAD] flex items-center justify-center text-white font-black text-sm shadow-xs">
                  A
                </div>
                <span className="text-base font-bold tracking-tight text-[#253247] hidden sm:inline">
                  ASKR <span className="text-[#165DAD]">EV</span>
                </span>
              </Link>

              <span className="text-slate-300 hidden sm:inline">/</span>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs sm:text-sm text-[#253247] hidden sm:inline">Member Portal</span>
                <span className="text-slate-300 hidden sm:inline">/</span>
                <span className="font-mono text-xs font-bold text-[#165DAD] bg-blue-50 px-2 py-0.5 rounded border border-blue-100 whitespace-nowrap">
                  {user.memberId}
                </span>
              </div>
            </div>

            {/* Right: Status badge & Logout */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              {user?.role && ['SUPER_ADMIN', 'ADMIN_OPERATIONS', 'FINANCE_MANAGER'].includes(user.role) && (
                <a
                  href={
                    typeof window !== 'undefined' && !window.location.hostname.startsWith('admin.')
                      ? 'https://admin.askrevdrive.com/admin'
                      : '/admin'
                  }
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full hover:bg-indigo-100 transition-colors"
                  title="Switch to Admin Console"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Admin Console</span>
                </a>
              )}

              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full border hidden sm:inline-flex ${getPackageBadge(
                  user.currentPackage
                )}`}
              >
                {getTierDisplayName(user.currentPackage)}
              </span>

              {user.isFullQualified && (
                <span className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-[#15803D] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <Check className="w-3.5 h-3.5" />
                  <span>Qualified</span>
                </span>
              )}

              <div className="h-5 w-px bg-slate-200 mx-1" />

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-[#DC2626] transition-colors px-2.5 py-1.5 rounded-lg hover:bg-slate-50 min-h-[36px]"
                title="Sign out of portal"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container with Sidebar + Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Desktop Left Sidebar Navigation */}
          <aside className="hidden md:block md:w-60 shrink-0 bg-white rounded-xl border border-slate-200 p-3 shadow-sm h-fit space-y-1">
            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Portal Menu
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${isActive
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
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isActive
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
                Support
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Mon - Sat: 9 AM - 6 PM IST
              </p>
              <a
                href="mailto:support@askrev.com"
                className="text-xs text-[#165DAD] hover:underline block mt-1 font-medium"
              >
                support@askrev.com
              </a>
            </div>
          </aside>

          {/* Mobile Overlay Drawer */}
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 md:hidden flex">
              <div
                className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
                onClick={() => setMobileMenuOpen(false)}
              />
              <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl p-4 flex flex-col z-10 overflow-y-auto">
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#165DAD] flex items-center justify-center text-white font-black text-sm">
                      A
                    </div>
                    <div>
                      <div className="font-bold text-sm text-[#253247]">ASKR EV</div>
                      <div className="font-mono text-[10px] text-slate-500">{user.memberId}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-1 flex-1 py-2">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Navigation
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
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${isActive
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
                            className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isActive
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
                </div>

                <div className="pt-4 border-t border-slate-100 px-2 space-y-2">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setShowShareModal(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#165DAD] text-white text-xs font-semibold"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share Referral Links</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <main className="flex-1 min-w-0 space-y-6">
            {/* System Notifications / Alerts */}
            {user && !user.isEmailVerified && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-amber-950">Email Verification Required</p>
                    <p className="text-[11px] text-amber-800">
                      Your registered email <span className="font-semibold">{user.email}</span> is unverified. Please verify your address to ensure secure access.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleSendVerification}
                    disabled={sendingVerification}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    {sendingVerification ? 'Sending...' : 'Resend Verification Email'}
                  </button>
                </div>
              </div>
            )}

            {verificationNotice && (
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-[#165DAD] text-xs font-medium flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#165DAD] shrink-0" />
                  <span>{verificationNotice}</span>
                </div>
                <button
                  onClick={() => setVerificationNotice(null)}
                  className="text-xs text-slate-400 hover:text-slate-600 font-semibold px-2"
                >
                  Dismiss
                </button>
              </div>
            )}

            {upgradeSuccess && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-[#15803D] text-xs font-medium flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0 text-[#15803D]" />
                  <span>{upgradeSuccess}</span>
                </div>
                <button
                  onClick={() => setUpgradeSuccess(null)}
                  className="text-xs text-slate-500 hover:text-slate-700 font-semibold"
                >
                  Dismiss
                </button>
              </div>
            )}

            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-[#DC2626] text-xs font-medium flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626]" />
                  <span>{error}</span>
                </div>
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
                {/* =========================================================================
                    TASK 1 & 2 — COMPACT WELCOME CARD & REFERRAL LINK SHARING
                    Includes Member Name, Member ID, Sponsor, Copy Link & WhatsApp Share
                    ========================================================================= */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Welcome Details */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>Welcome back,</span>
                        <span className="font-semibold text-[#253247] text-sm">{user.fullName}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        <h1 className="text-lg sm:text-xl font-bold text-[#253247]">
                          Member Dashboard
                        </h1>
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          ID: {user.memberId}
                        </span>
                        <span
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${getPackageBadge(
                            user.currentPackage
                          )}`}
                        >
                          {getTierDisplayName(user.currentPackage)}
                        </span>
                        {user.isFullQualified && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-[#15803D] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <Check className="w-3 h-3" />
                            <span>Qualified</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setShowShareModal(true)}
                        className="px-3.5 py-2 rounded-lg bg-[#165DAD] hover:bg-[#12498a] text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Share Links</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* =========================================================================
                    TASK 3 & 6 — FOUR PRIMARY SUMMARY CARDS WITH ACCURATE TERMINOLOGY
                    Values from authenticated API responses; no false withdrawable claims.
                    ========================================================================= */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* 1. Earnings Wallet */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                      <span>Earnings Wallet</span>
                      <Wallet className="w-4 h-4 text-[#15803D]" />
                    </div>
                    <div className="text-2xl font-bold text-[#253247] mt-2">
                      ₹{user.wallet?.availableEarningsINR?.toLocaleString('en-IN') ?? 0}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      <span>Available Balance (Simulation Mode)</span>
                    </div>
                  </div>

                  {/* 2. Shopping Vouchers */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                      <span>Shopping Vouchers</span>
                      <Ticket className="w-4 h-4 text-[#165DAD]" />
                    </div>
                    <div className="text-2xl font-bold text-[#165DAD] mt-2">
                      ₹{user.wallet?.shoppingVoucherINR?.toLocaleString('en-IN') ?? 0}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Redeemable on EV bookings
                    </div>
                  </div>

                  {/* 3. Direct Referrals */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                      <span>Direct Referrals</span>
                      <Users className="w-4 h-4 text-slate-600" />
                    </div>
                    <div className="text-2xl font-bold text-[#253247] mt-2">
                      {directTeam?.metrics?.totalDirects ?? 0}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {directTeam?.metrics?.totalActivatedDirects ?? 0} activated members
                    </div>
                  </div>

                  {/* 4. Active EV Bookings */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                      <span>EV Bookings</span>
                      <Bike className="w-4 h-4 text-[#165DAD]" />
                    </div>
                    <div className="text-2xl font-bold text-[#253247] mt-2">
                      {userBookings.length}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Verified reservations
                    </div>
                  </div>
                </div>

                {/* Upgrade Path for EV PRO (BASIC) */}
                {user.currentPackage === 'BASIC' && !user.isFullQualified && (
                  <div className="bg-blue-50/70 rounded-xl border border-blue-200 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#165DAD]">
                        <Sparkles className="w-3.5 h-3.5 text-[#165DAD]" />
                        <span>EV Booking Upgrade</span>
                      </div>
                      <h3 className="text-base font-bold text-[#253247]">
                        Upgrade to EV ULTRA (₹30,000)
                      </h3>
                      <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                        You booked EV PRO (₹3,000). Complete your next payment of ₹30,000 to upgrade to EV ULTRA (₹33,000 full plan) and receive a <strong>₹30,000 vehicle shopping voucher credit</strong> (redeemable on EV bookings) and full eligibility for binary matching rewards.
                      </p>
                    </div>
                    <button
                      onClick={() => openBookingPaymentModal('BASIC_TO_FULL_UPGRADE')}
                      disabled={upgrading || membershipRequests.some((r) => r.status === 'PENDING')}
                      className="shrink-0 px-5 py-2.5 rounded-lg font-semibold text-xs text-white bg-[#165DAD] hover:bg-[#12498a] transition-colors disabled:opacity-50 min-h-[44px] flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>
                        {membershipRequests.some((r) => r.status === 'PENDING')
                          ? 'Upgrade Pending Admin Review'
                          : upgrading
                            ? 'Submitting...'
                            : 'Upgrade to EV ULTRA (₹30,000)'}
                      </span>
                    </button>
                  </div>
                )}

                {/* MY BINARY TREE SUMMARY CARD */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <GitBranch className="w-4 h-4 text-[#165DAD]" />
                        <h3 className="text-sm font-bold text-[#253247]">Binary Tree & Matching Summary</h3>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${binaryTree?.node?.isPlaced
                            ? 'bg-emerald-50 text-[#15803D] border-emerald-200'
                            : user?.role === 'SUPER_ADMIN'
                              ? 'bg-blue-50 text-[#165DAD] border-blue-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                        >
                          {binaryTree?.node?.isPlaced
                            ? `Placed (${binaryTree.node.parent?.leg} under ${binaryTree.node.parent?.memberId})`
                            : user?.role === 'SUPER_ADMIN'
                              ? 'Company Root'
                              : 'Not Yet Placed'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        1:1 ratio (1 Left : 1 Right qualified unit) • ₹3,000 per match • Cap: 15/day (₹45,000)
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('binary')}
                      className="self-start sm:self-center text-xs font-semibold text-[#165DAD] hover:underline flex items-center gap-1 min-h-[36px]"
                    >
                      <span>Open My Binary Tree</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-[#F7F9FC] border border-slate-200">
                      <div className="text-[11px] text-slate-500">Left Leg (Cnt / Vol / Carry)</div>
                      <div className="font-bold text-[#253247] mt-1">
                        {binaryTree?.node?.leftCount ?? 0} / {binaryTree?.node?.leftVolumeUnits ?? 0}u /{' '}
                        <span className="text-[#165DAD]">{binaryTree?.node?.carryLeftUnits ?? 0}u</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-[#F7F9FC] border border-slate-200">
                      <div className="text-[11px] text-slate-500">Right Leg (Cnt / Vol / Carry)</div>
                      <div className="font-bold text-[#253247] mt-1">
                        {binaryTree?.node?.rightCount ?? 0} / {binaryTree?.node?.rightVolumeUnits ?? 0}u /{' '}
                        <span className="text-[#15803D]">{binaryTree?.node?.carryRightUnits ?? 0}u</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-[#F7F9FC] border border-slate-200">
                      <div className="text-[11px] text-slate-500">Total Matches / Reward</div>
                      <div className="font-bold text-[#253247] mt-1">
                        {binaryTree?.node?.totalMatchesConsumed ?? 0} pairs • ₹{(binaryTree?.node?.totalRewardEarnedINR ?? 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-[#F7F9FC] border border-slate-200">
                      <div className="text-[11px] text-slate-500">Daily Cap Status (Today)</div>
                      <div className="font-bold text-[#253247] mt-1">
                        {binaryTree?.node?.todayMatchesSettled ?? 0} / 15 settled
                      </div>
                    </div>
                  </div>
                </div>

                {/* =========================================================================
                    TASK 7 — RECENT DIRECT REFERRALS TABLE
                    Includes Member ID, Name, Membership Status, Joining Date & View All
                    ========================================================================= */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[#253247]">Recent Direct Referrals</h3>
                      <p className="text-xs text-slate-500">Latest members enrolled with your sponsor code</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('team')}
                      className="text-xs font-semibold text-[#165DAD] hover:underline flex items-center gap-1 min-h-[36px]"
                    >
                      <span>View All (My Team)</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                        <tr>
                          <th className="py-3 px-4">Member ID</th>
                          <th className="py-3 px-4">Name</th>
                          <th className="py-3 px-4">Membership Status</th>
                          <th className="py-3 px-4">Joining Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[#253247]">
                        {directTeam?.directs && directTeam.directs.length > 0 ? (
                          directTeam.directs.slice(0, 5).map((d: any) => (
                            <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4 font-mono font-medium text-[#165DAD]">
                                {d.memberId}
                              </td>
                              <td className="py-3 px-4 font-medium">{d.fullName}</td>
                              <td className="py-3 px-4">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getPackageBadge(
                                    d.currentPackage
                                  )}`}
                                >
                                  {getTierDisplayName(d.currentPackage)}
                                </span>
                                {d.isFullQualified && (
                                  <span className="ml-1.5 text-[10px] text-[#15803D] font-medium inline-flex items-center gap-0.5">
                                    <Check className="w-2.5 h-2.5" /> Qualified
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-slate-500">
                                {new Date(d.createdAt).toLocaleDateString('en-IN')}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-slate-400">
                              No direct team members registered yet. Share your referral link above to invite members.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: MY MEMBERSHIP / EV BOOKING TIERS */}
            {activeTab === 'membership' && (
              <div className="space-y-6">
                {/* Current Package Overview */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Current EV Booking Tier
                      </span>
                      <h3 className="text-xl font-bold text-[#253247] mt-1">
                        {getTierDisplayName(user.currentPackage)} Plan
                      </h3>
                    </div>
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full border self-start ${getPackageBadge(
                        user.currentPackage
                      )}`}
                    >
                      Status: {user.isFullQualified ? 'EV ULTRA Qualified' : user.currentPackage === 'BASIC' ? 'EV PRO Active' : 'EV GO Registered'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-xs">
                    <div className="p-4 rounded-lg bg-[#F7F9FC] border border-slate-200">
                      <span className="text-slate-500">Direct Booking Referral Reward:</span>
                      <div className="text-sm font-bold text-[#253247] mt-1">
                        {user.currentPackage === 'FREE' ? 'Not Eligible (Requires EV PRO)' : 'Eligible (₹1,000 / ₹10,000)'}
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-[#F7F9FC] border border-slate-200">
                      <span className="text-slate-500">Binary Matching Rewards:</span>
                      <div className="text-sm font-bold text-[#253247] mt-1">
                        {user.isFullQualified ? 'Eligible (1:1 • ₹3,000/match)' : 'Requires EV ULTRA Qualification'}
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-[#F7F9FC] border border-slate-200">
                      <span className="text-slate-500">Vehicle Shopping Voucher Credit:</span>
                      <div className="text-sm font-bold text-[#15803D] mt-1">
                        ₹{user.wallet?.shoppingVoucherINR?.toLocaleString('en-IN') ?? 0}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Activation / Upgrade Actions & Request History */}
                {membershipRequests.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
                    <h3 className="text-sm font-bold text-[#253247]">Recent EV Booking Request Status</h3>
                    <div className="space-y-2">
                      {membershipRequests.slice(0, 3).map((req: any) => (
                        <div
                          key={req.id}
                          className="p-3 rounded-lg bg-[#F7F9FC] border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                        >
                          <div>
                            <span className="font-bold text-[#253247]">
                              {req.requestType === 'BASIC_ACTIVATION'
                                ? 'EV PRO Booking (₹3,000)'
                                : req.requestType === 'FULL_ACTIVATION'
                                  ? 'EV ULTRA Booking (₹33,000)'
                                  : 'EV ULTRA Upgrade (₹30,000)'}
                            </span>
                            {req.paymentMode && (
                              <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 ml-2">
                                {req.paymentMode}
                              </span>
                            )}
                            {req.paymentReference && (
                              <span className="text-slate-500 ml-2 font-mono text-[11px]">
                                Ref: {req.paymentReference}
                              </span>
                            )}
                            {req.adminNotes && (
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                Admin Note: {req.adminNotes}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${req.status === 'APPROVED'
                                ? 'bg-emerald-50 text-[#15803D] border-emerald-200'
                                : req.status === 'REJECTED'
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}
                            >
                              {req.status}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(req.createdAt).toLocaleDateString('en-IN')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {user.currentPackage === 'FREE' ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-base font-bold text-[#253247]">
                        Submit EV Booking Tier Request
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Choose a tier below to submit your booking reservation and payment details for administrative clearance.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Basic Activation -> EV PRO */}
                      <div className="bg-white rounded-xl border border-emerald-200 p-6 shadow-sm flex flex-col justify-between space-y-4">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#15803D] uppercase tracking-wide">
                              Option 1 • Starter Booking
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                              Admin Review Required
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-[#253247] mt-1">EV PRO Booking</h4>
                          <div className="text-2xl font-bold text-[#253247] mt-2">₹3,000</div>
                          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                            Enables Direct Sponsor booking rewards (₹1,000 per EV PRO direct; ₹10,000 after EV ULTRA qualification). Upgradeable anytime for the ₹30,000 difference.
                          </p>
                        </div>

                        <button
                          onClick={() => openBookingPaymentModal('BASIC_ACTIVATION')}
                          disabled={upgrading || membershipRequests.some((r) => r.status === 'PENDING')}
                          className="w-full min-h-[44px] py-2.5 rounded-lg font-medium text-xs text-white bg-[#15803D] hover:bg-emerald-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>
                            {membershipRequests.some((r) => r.status === 'PENDING')
                              ? 'Request Pending Admin Review'
                              : upgrading
                                ? 'Submitting Request...'
                                : 'Book EV PRO (₹3,000)'}
                          </span>
                        </button>
                      </div>

                      {/* Full Activation -> EV ULTRA */}
                      <div className="bg-white rounded-xl border border-blue-200 p-6 shadow-sm flex flex-col justify-between space-y-4">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#165DAD] uppercase tracking-wide">
                              Option 2 • Full Qualified
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-[#165DAD] border border-blue-200">
                              Admin Review Required
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-[#253247] mt-1">EV ULTRA Booking</h4>
                          <div className="text-2xl font-bold text-[#253247] mt-2">₹33,000</div>
                          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                            Includes ₹3,000 platform fee + <strong>₹30,000 EV Shopping Voucher</strong> credit and unlocks full Binary Matching rewards (1:1 ratio, ₹3,000/match) upon approval.
                          </p>
                        </div>

                        <button
                          onClick={() => openBookingPaymentModal('FULL_ACTIVATION')}
                          disabled={upgrading || membershipRequests.some((r) => r.status === 'PENDING')}
                          className="w-full min-h-[44px] py-2.5 rounded-lg font-medium text-xs text-white bg-[#165DAD] hover:bg-[#12498a] disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>
                            {membershipRequests.some((r) => r.status === 'PENDING')
                              ? 'Request Pending Admin Review'
                              : upgrading
                                ? 'Submitting Request...'
                                : 'Book EV ULTRA (₹33,000)'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-base font-bold text-[#253247]">EV ULTRA Qualification Methods</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Choose between a direct upgrade request (subject to admin approval) or qualifying vehicle retail shopping.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Method 1: Direct Upgrade */}
                      <div className="bg-white rounded-xl border border-blue-200 p-6 shadow-sm flex flex-col justify-between space-y-4">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#165DAD] uppercase tracking-wide">
                              Method 1
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-[#165DAD] border border-blue-200">
                              {user.isFullQualified ? 'Completed' : 'Admin Review Required'}
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-[#253247] mt-1">Upgrade to EV ULTRA (₹30,000)</h4>
                          <div className="text-2xl font-bold text-[#253247] mt-2">₹30,000</div>
                          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                            You have booked EV PRO (₹3,000). Complete your next payment of ₹30,000 to upgrade to EV ULTRA (₹33,000 total plan). You receive a <strong>₹30,000 vehicle shopping voucher credit</strong> and full binary matching rewards upon clearance.
                          </p>
                        </div>

                        <button
                          onClick={() => openBookingPaymentModal('BASIC_TO_FULL_UPGRADE')}
                          disabled={
                            upgrading ||
                            user.isFullQualified ||
                            membershipRequests.some((r) => r.status === 'PENDING')
                          }
                          className="w-full min-h-[44px] py-2.5 rounded-lg font-medium text-xs text-white bg-[#165DAD] hover:bg-[#12498a] disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>
                            {user.isFullQualified
                              ? 'Already EV ULTRA Qualified'
                              : membershipRequests.some((r) => r.status === 'PENDING')
                                ? 'Upgrade Pending Admin Review'
                                : upgrading
                                  ? 'Submitting Request...'
                                  : 'Upgrade to EV ULTRA (₹30,000)'}
                          </span>
                        </button>
                      </div>

                      {/* Method 2: Shopping Upgrade */}
                      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between space-y-4">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                              Method 2
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                              Pending Approval
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-[#253247] mt-1">
                            Retail Shopping Qualification
                          </h4>
                          <div className="text-2xl font-bold text-slate-500 mt-2">₹60,000</div>
                          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                            Achieve ₹60,000 of verified qualifying retail shopping on ASKR EV vehicles and approved merchant merchandise.
                          </p>
                          <div className="mt-3 p-3 rounded-lg bg-[#F7F9FC] border border-slate-200 text-[11px] text-slate-500 leading-relaxed">
                            The ₹60,000 shopping qualification rules, voucher entitlement, and terms remain marked pending business approval.
                          </div>
                        </div>

                        <button
                          disabled
                          className="w-full min-h-[44px] py-2.5 rounded-lg font-medium text-xs text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed"
                        >
                          Pending Business Approval
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: MY TEAM */}
            {activeTab === 'team' && (
              <div className="space-y-6">
                {/* Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <div className="text-xs text-slate-500 font-medium">Total Direct Referrals</div>
                    <div className="text-2xl font-bold text-[#253247] mt-1">
                      {directTeam?.metrics?.totalDirects ?? 0}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <div className="text-xs text-[#165DAD] font-medium">Activated Directs (₹3k+)</div>
                    <div className="text-2xl font-bold text-[#165DAD] mt-1">
                      {directTeam?.metrics?.totalActivatedDirects ?? 0}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <div className="text-xs text-[#15803D] font-medium">Full Qualified Directs</div>
                    <div className="text-2xl font-bold text-[#15803D] mt-1">
                      {directTeam?.metrics?.totalFullQualifiedDirects ?? 0}
                    </div>
                  </div>
                </div>

                {/* Direct Team Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[#253247]">Direct Sponsor Lineage</h3>
                      <p className="text-xs text-slate-500">Members registered using your referral code</p>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">
                      {directTeam?.directs?.length ?? 0} Members
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                        <tr>
                          <th className="py-3 px-4">Member ID</th>
                          <th className="py-3 px-4">Full Name</th>
                          <th className="py-3 px-4">Package</th>
                          <th className="py-3 px-4">Full Qualification</th>
                          <th className="py-3 px-4">Joined Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[#253247]">
                        {directTeam?.directs && directTeam.directs.length > 0 ? (
                          directTeam.directs.map((d: any) => (
                            <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4 font-mono font-medium text-[#165DAD]">
                                {d.memberId}
                              </td>
                              <td className="py-3 px-4 font-medium">{d.fullName}</td>
                              <td className="py-3 px-4">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getPackageBadge(
                                    d.currentPackage
                                  )}`}
                                >
                                  {getTierDisplayName(d.currentPackage)}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                {d.isFullQualified ? (
                                  <span className="text-[#15803D] font-medium flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Qualified
                                  </span>
                                ) : (
                                  <span className="text-slate-500">Pending Upgrade</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-slate-500">
                                {new Date(d.createdAt).toLocaleDateString('en-IN')}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-400">
                              No direct referrals found. Use your referral link above to invite members.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Binary Placement Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-[#253247] flex items-center gap-2">
                        <GitBranch className="w-4 h-4 text-[#165DAD]" />
                        <span>Binary Placement & Business Volume</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Ratio: 1:1 (1 Left : 1 Right) • Reward: ₹3,000 per match • Daily Capping: 15 matches (₹45,000/day max)
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('binary')}
                      className="self-start sm:self-center text-xs font-semibold text-[#165DAD] hover:underline flex items-center gap-1"
                    >
                      <span>View Visual Binary Tree</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-[#F7F9FC] border border-slate-200">
                      <div className="text-xs font-bold text-[#165DAD] uppercase tracking-wider">
                        Left Leg Team
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase font-semibold">Members</div>
                          <div className="text-xl font-bold text-[#253247] mt-0.5">
                            {binaryTree?.node?.leftCount ?? 0}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase font-semibold">Carry Units</div>
                          <div className="text-xl font-bold text-[#165DAD] mt-0.5">
                            {binaryTree?.node?.carryLeftUnits ?? 0} Units
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-[#F7F9FC] border border-slate-200">
                      <div className="text-xs font-bold text-[#15803D] uppercase tracking-wider">
                        Right Leg Team
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase font-semibold">Members</div>
                          <div className="text-xl font-bold text-[#253247] mt-0.5">
                            {binaryTree?.node?.rightCount ?? 0}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase font-semibold">Carry Units</div>
                          <div className="text-xl font-bold text-[#15803D] mt-0.5">
                            {binaryTree?.node?.carryRightUnits ?? 0} Units
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3B: MY BINARY TREE (READ-ONLY MEMBER VIEW) */}
            {activeTab === 'binary' && (
              <div className="space-y-6">
                {/* Header & Read-Only Placement Status Banner */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-[#253247] flex items-center gap-2">
                        <GitBranch className="w-5 h-5 text-[#165DAD]" />
                        <span>My Binary Tree & Matching Volume</span>
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Approved 1:1 matching (1 Left : 1 Right Full-Qualified unit) • ₹3,000/pair • Daily Cap: 15 pairs (₹45,000/day)
                      </p>
                    </div>
                    <span
                      className={`self-start text-xs font-semibold px-3 py-1 rounded-full border ${binaryTree?.node?.isPlaced
                        ? 'bg-emerald-50 text-[#15803D] border-emerald-200'
                        : user?.role === 'SUPER_ADMIN'
                          ? 'bg-blue-50 text-[#165DAD] border-blue-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                    >
                      {binaryTree?.node?.isPlaced
                        ? `Placed (${binaryTree.node.parent?.leg} Leg)`
                        : user?.role === 'SUPER_ADMIN'
                          ? 'Company Binary Root'
                          : 'Pending Admin Placement'}
                    </span>
                  </div>

                  {/* Placement Identity Grid (Parent, Leg, Sponsor, Qualification) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
                    <div className="p-3.5 rounded-lg bg-[#F7F9FC] border border-slate-200">
                      <div className="text-[11px] font-semibold uppercase text-slate-400">Placement Status</div>
                      <div className="font-bold text-[#253247] mt-1">
                        {binaryTree?.node?.isPlaced
                          ? 'Placed in Binary Tree'
                          : user?.role === 'SUPER_ADMIN'
                            ? 'Root Node (Top of Tree)'
                            : 'Not Yet Placed in Binary Tree'}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Leg: <span className="font-semibold text-[#165DAD]">{binaryTree?.node?.parent?.leg || (user?.role === 'SUPER_ADMIN' ? 'Root' : 'Unassigned')}</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg bg-[#F7F9FC] border border-slate-200">
                      <div className="text-[11px] font-semibold uppercase text-slate-400">Binary Parent Node</div>
                      <div className="font-bold text-[#253247] mt-1">
                        {binaryTree?.node?.parent
                          ? binaryTree.node.parent.fullName
                          : user?.role === 'SUPER_ADMIN'
                            ? 'None (Company Root)'
                            : 'Awaiting Placement'}
                      </div>
                      <div className="text-[11px] font-mono text-[#165DAD] mt-0.5">
                        {binaryTree?.node?.parent
                          ? binaryTree.node.parent.memberId
                          : user?.role === 'SUPER_ADMIN'
                            ? 'Top-level origin node'
                            : 'No parent assigned yet'}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg bg-[#F7F9FC] border border-slate-200">
                      <div className="text-[11px] font-semibold uppercase text-slate-400">Direct Sponsor</div>
                      <div className="font-bold text-[#253247] mt-1">
                        {binaryTree?.node?.sponsor ? binaryTree.node.sponsor.fullName : 'Company Root'}
                      </div>
                      <div className="text-[11px] font-mono text-slate-600 mt-0.5">
                        {binaryTree?.node?.sponsor ? binaryTree.node.sponsor.memberId : 'N/A'}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg bg-[#F7F9FC] border border-slate-200">
                      <div className="text-[11px] font-semibold uppercase text-slate-400">Daily Cap Status (IST)</div>
                      <div className="font-bold text-[#253247] mt-1">
                        {binaryTree?.node?.todayMatchesSettled ?? 0} / {binaryTree?.node?.dailyMaxMatches ?? 15} matches today
                      </div>
                      <div className="text-[11px] text-[#15803D] font-medium mt-0.5">
                        Remaining: {binaryTree?.node?.dailyCapRemaining ?? 15} (₹{((binaryTree?.node?.dailyCapRemaining ?? 15) * 3000).toLocaleString('en-IN')})
                      </div>
                    </div>
                  </div>
                </div>

                {/* 6 Core Binary Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <div className="text-xs font-semibold uppercase text-slate-400">Left Leg Metrics</div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-xs text-slate-500">Team Members</span>
                      <span className="text-lg font-bold text-[#253247]">{binaryTree?.node?.leftCount ?? 0}</span>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-xs text-slate-500">Qualified Volume</span>
                      <span className="text-sm font-bold text-[#165DAD]">{binaryTree?.node?.leftVolumeUnits ?? 0} Units</span>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-xs text-slate-500">Carry Forward</span>
                      <span className="text-sm font-bold text-emerald-700">{binaryTree?.node?.carryLeftUnits ?? 0} Units</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <div className="text-xs font-semibold uppercase text-slate-400">Right Leg Metrics</div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-xs text-slate-500">Team Members</span>
                      <span className="text-lg font-bold text-[#253247]">{binaryTree?.node?.rightCount ?? 0}</span>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-xs text-slate-500">Qualified Volume</span>
                      <span className="text-sm font-bold text-[#15803D]">{binaryTree?.node?.rightVolumeUnits ?? 0} Units</span>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-xs text-slate-500">Carry Forward</span>
                      <span className="text-sm font-bold text-emerald-700">{binaryTree?.node?.carryRightUnits ?? 0} Units</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <div className="text-xs font-semibold uppercase text-slate-400">Total Matched Pairs</div>
                    <div className="text-2xl font-bold text-[#253247] mt-2">
                      {binaryTree?.node?.totalMatchesConsumed ?? 0}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Consumed: {binaryTree?.node?.matchedLeftUnits ?? 0} Left : {binaryTree?.node?.matchedRightUnits ?? 0} Right
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <div className="text-xs font-semibold uppercase text-slate-400">Binary Matching Reward</div>
                    <div className="text-2xl font-bold text-[#15803D] mt-2">
                      ₹{(binaryTree?.node?.totalRewardEarnedINR ?? 0).toLocaleString('en-IN')}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {user.isFullQualified ? 'EV ULTRA Qualified for Matching' : 'EV ULTRA required to settle'}
                    </div>
                  </div>
                </div>

                {/* Visual Multi-Level Binary Subtree Visualizer */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-[#253247]">Visual Binary Downline Subtree</h3>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 mt-1">
                        {binaryBreadcrumb.map((crumb, idx) => (
                          <React.Fragment key={crumb.memberId}>
                            {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-400" />}
                            <button
                              type="button"
                              onClick={() => handleInspectBinarySubtree(crumb.memberId, crumb.fullName, idx === 0)}
                              className={`font-medium hover:underline ${idx === binaryBreadcrumb.length - 1 ? 'text-[#165DAD] font-bold' : 'text-slate-600'
                                }`}
                            >
                              {crumb.fullName} ({crumb.memberId})
                            </button>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>

                    {binaryBreadcrumb.length > 1 && user?.memberId && (
                      <button
                        type="button"
                        onClick={() => handleInspectBinarySubtree(user.memberId, user.fullName || 'Me', true)}
                        className="self-start sm:self-center px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
                      >
                        Reset to My Root
                      </button>
                    )}
                  </div>

                  {binaryTreeError && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                      {binaryTreeError}
                    </div>
                  )}

                  {loadingBinarySubtree ? (
                    <div className="py-10 text-center text-xs text-slate-500">Loading binary subtree...</div>
                  ) : inspectedBinaryTree?.node ? (
                    <div className="space-y-6">
                      {/* Inspected Root Node */}
                      <div className="flex justify-center">
                        <div className="w-full max-w-xs bg-blue-50 border-2 border-[#165DAD] rounded-xl p-4 shadow-sm text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#165DAD] text-white uppercase">
                              {inspectedBinaryTree.node.user.memberId === user.memberId ? 'You (Root)' : 'Subtree Node'}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white text-[#253247] border border-blue-200">
                              {getTierDisplayName(inspectedBinaryTree.node.user.currentPackage)}
                            </span>
                          </div>
                          <div className="font-bold text-sm text-[#253247] mt-2">
                            {inspectedBinaryTree.node.user.fullName}
                          </div>
                          <div className="text-xs font-mono font-bold text-[#165DAD]">
                            {inspectedBinaryTree.node.user.memberId}
                          </div>
                          <div className="text-[11px] text-slate-600 mt-1">
                            {inspectedBinaryTree.node.user.isFullQualified ? 'EV ULTRA Qualified' : 'EV PRO (Qualification Pending)'}
                          </div>
                          <div className="mt-2.5 pt-2.5 border-t border-blue-200/70 grid grid-cols-2 gap-2 text-[11px]">
                            <div>
                              <div className="text-slate-500">Left</div>
                              <div className="font-bold text-slate-800">
                                {inspectedBinaryTree.node.leftCount} ({inspectedBinaryTree.node.carryLeftUnits}u carry)
                              </div>
                            </div>
                            <div>
                              <div className="text-slate-500">Right</div>
                              <div className="font-bold text-slate-800">
                                {inspectedBinaryTree.node.rightCount} ({inspectedBinaryTree.node.carryRightUnits}u carry)
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Level 1 & Level 2 Downline Branches */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {[
                          { label: 'LEFT BRANCH', child: inspectedBinaryTree.leftChild, accent: 'text-[#165DAD]', badge: 'bg-blue-50 text-[#165DAD] border-blue-200' },
                          { label: 'RIGHT BRANCH', child: inspectedBinaryTree.rightChild, accent: 'text-[#15803D]', badge: 'bg-emerald-50 text-[#15803D] border-emerald-200' },
                        ].map(({ label, child, accent, badge }) => (
                          <div key={label} className="bg-[#F7F9FC] border border-slate-200 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-bold ${accent}`}>{label}</span>
                              <span className="text-[10px] font-semibold uppercase text-slate-400">Level 1</span>
                            </div>

                            {child ? (
                              <div className="space-y-3">
                                <div className="bg-white rounded-lg border border-slate-200 p-3.5 space-y-1.5">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-bold text-xs text-[#253247]">{child.fullName}</span>
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${badge}`}>
                                      {getTierDisplayName(child.currentPackage)}
                                    </span>
                                  </div>
                                  <div className={`text-xs font-mono font-bold ${accent}`}>{child.memberId}</div>
                                  <div className="text-[11px] text-slate-500">
                                    {child.isFullQualified ? 'EV ULTRA Qualified' : 'EV PRO (Qualification Pending)'}
                                  </div>
                                  <div className="pt-2 mt-1 border-t border-slate-100 flex items-center justify-between text-[11px]">
                                    <span>L: {child.leftCount} ({child.leftVolumeUnits}u)</span>
                                    <span>R: {child.rightCount} ({child.rightVolumeUnits}u)</span>
                                    <button
                                      type="button"
                                      onClick={() => handleInspectBinarySubtree(child.memberId, child.fullName)}
                                      className={`${accent} font-bold hover:underline`}
                                    >
                                      Inspect Subtree →
                                    </button>
                                  </div>
                                </div>

                                {/* Level 2 Children */}
                                <div className="grid grid-cols-2 gap-2.5">
                                  {[
                                    { subLabel: 'LEFT SLOT', subChild: child.leftChild },
                                    { subLabel: 'RIGHT SLOT', subChild: child.rightChild },
                                  ].map(({ subLabel, subChild }) =>
                                    subChild ? (
                                      <button
                                        key={subLabel}
                                        type="button"
                                        onClick={() => handleInspectBinarySubtree(subChild.memberId, subChild.fullName)}
                                        className="p-2.5 rounded-lg bg-white border border-slate-200 hover:border-[#165DAD] text-left transition-colors"
                                      >
                                        <div className="text-[9px] font-bold text-slate-400 uppercase">{subLabel}</div>
                                        <div className="font-bold text-[11px] text-[#253247] truncate">{subChild.fullName}</div>
                                        <div className="text-[10px] font-mono text-[#165DAD]">{subChild.memberId}</div>
                                        <div className="text-[9px] text-slate-500 mt-0.5">
                                          {getTierDisplayName(subChild.currentPackage)} • {subChild.isFullQualified ? 'Qualified' : 'Pending'}
                                        </div>
                                      </button>
                                    ) : (
                                      <div
                                        key={subLabel}
                                        className="p-2.5 rounded-lg bg-white/80 border border-dashed border-slate-200 text-center text-[10px] text-slate-400 flex flex-col items-center justify-center min-h-[70px]"
                                      >
                                        <span className="font-semibold uppercase text-[9px]">{subLabel}</span>
                                        <span>Vacant Slot</span>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="p-6 rounded-lg bg-white border border-dashed border-slate-200 text-center text-xs text-slate-400">
                                {label === 'LEFT BRANCH' ? 'Vacant Left Slot' : 'Vacant Right Slot'}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Binary Match Settlement History */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-3">
                  <div>
                    <h3 className="text-sm font-bold text-[#253247]">Match Settlement History</h3>
                    <p className="text-xs text-slate-500">
                      Read-only record of your binary 1:1 matching evaluations, daily cap status, and carry-forward balances
                    </p>
                  </div>

                  {binaryHistory.length === 0 ? (
                    <div className="p-5 rounded-lg bg-[#F7F9FC] border border-slate-200 text-center text-xs text-slate-500">
                      No binary matching settlements recorded yet. Qualified 1:1 pairs appear here once settled.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-[#F7F9FC] text-slate-500 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="p-3">Match Date (IST)</th>
                            <th className="p-3">Pairs Evaluated</th>
                            <th className="p-3">Pairs Settled</th>
                            <th className="p-3">Capped</th>
                            <th className="p-3">Used (L : R)</th>
                            <th className="p-3">Carry Forward (L : R)</th>
                            <th className="p-3 text-right">
                              Simulated Reward
                              <span className="ml-1 px-1.5 py-0.5 text-[9px] font-semibold bg-blue-100 text-blue-700 rounded uppercase">
                                Simulated
                              </span>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {binaryHistory.map((ev: any) => (
                            <tr key={ev.id} className="hover:bg-slate-50">
                              <td className="p-3 font-mono">{ev.matchDate}</td>
                              <td className="p-3">{ev.matchesEvaluated}</td>
                              <td className="p-3 font-bold text-[#15803D]">{ev.matchesSettled}</td>
                              <td className="p-3 text-amber-700">{ev.cappedOutMatches}</td>
                              <td className="p-3">{ev.leftUnitsUsed} : {ev.rightUnitsUsed}</td>
                              <td className="p-3 font-medium">{ev.newCarryLeft} : {ev.newCarryRight}</td>
                              <td className="p-3 text-right font-bold text-[#15803D]">
                                ₹{(ev.rewardINR ?? 0).toLocaleString('en-IN')}
                                <span className="block text-[10px] font-normal text-slate-400">Simulation Only</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: EARNINGS WALLET */}
            {activeTab === 'wallets' && (
              <div className="space-y-6">
                {/* 4 Balances: Available, Held, Recovery, Total Earned */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <span className="text-xs font-semibold uppercase text-slate-400">
                      Available Balance
                    </span>
                    <div className="text-2xl font-bold text-[#15803D] mt-2">
                      ₹{(walletOverview?.availableEarningsINR ?? user.wallet?.availableEarningsINR ?? 0).toLocaleString('en-IN')}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Simulated earnings ledger balance (withdrawals disabled in SIMULATION_ONLY mode).
                    </p>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <span className="text-xs font-semibold uppercase text-slate-400">
                      Pending / On Hold
                    </span>
                    <div className="text-2xl font-bold text-amber-600 mt-2">
                      ₹{(walletOverview?.heldCommissionsINR ?? user.wallet?.heldCommissionsINR ?? 0).toLocaleString('en-IN')}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Commission hold reserve of ₹1,000 released upon 2nd qualified direct.
                    </p>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <span className="text-xs font-semibold uppercase text-slate-400">
                      Pending Recovery
                    </span>
                    <div className="text-2xl font-bold text-[#DC2626] mt-2">
                      ₹{(walletOverview?.pendingRecoveryINR ?? user.wallet?.pendingRecoveryINR ?? 0).toLocaleString('en-IN')}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Prior Basic commission recovery. Wallets never go negative.
                    </p>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <span className="text-xs font-semibold uppercase text-slate-400">
                      Total Earnings
                    </span>
                    <div className="text-2xl font-bold text-[#165DAD] mt-2">
                      ₹{(walletOverview?.totalEarnedINR ?? user.wallet?.totalEarnedINR ?? 0).toLocaleString('en-IN')}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Cumulative lifetime matching & direct sponsor commissions.
                    </p>
                  </div>
                </div>

                {/* Authoritative Wallet Ledger Transactions Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[#253247]">Authoritative Wallet Transactions</h3>
                      <p className="text-xs text-slate-500">Double-entry accounting journal entries associated with your wallet</p>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">{walletTransactions.length} Total</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                        <tr>
                          <th className="py-3 px-4">Transaction ID / Ref</th>
                          <th className="py-3 px-4">Date & Time</th>
                          <th className="py-3 px-4">Type</th>
                          <th className="py-3 px-4">Description</th>
                          <th className="py-3 px-4">Amount</th>
                          <th className="py-3 px-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[#253247]">
                        {walletTransactions.length > 0 ? (
                          walletTransactions.map((tx: any) => (
                            <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4 font-mono font-medium text-[#165DAD]">
                                {tx.referenceId}
                              </td>
                              <td className="py-3 px-4 text-slate-500">
                                {new Date(tx.date).toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                                {tx.transactionType}
                              </td>
                              <td className="py-3 px-4 text-slate-700 max-w-xs truncate">
                                {tx.description}
                              </td>
                              <td className="py-3 px-4 font-bold">
                                {tx.isCredit ? (
                                  <span className="text-[#15803D]">
                                    +₹{tx.amountINR.toLocaleString('en-IN')}
                                  </span>
                                ) : (
                                  <span className="text-[#DC2626]">
                                    -₹{tx.amountINR.toLocaleString('en-IN')}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-[#15803D] border border-emerald-200">
                                  SIMULATED_LEDGER
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400">
                              No wallet transactions found. Refer members or complete binary matches to earn commissions.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Withdrawal Request Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-[#253247]">Withdrawal Request</h3>
                      <p className="text-xs text-slate-500">Payout processing status</p>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-semibold self-start">
                      Simulation Mode — Withdrawals Unavailable
                    </span>
                  </div>

                  <div className="p-4 rounded-lg bg-[#F7F9FC] border border-slate-200 text-xs text-slate-600 space-y-1">
                    <div>
                      <strong>Compliance Notice:</strong> In compliance simulation mode, payouts are simulated and live bank debits or wire transfers are strictly disabled until supervisory admin clearance.
                    </div>
                    <div>Minimum withdrawal threshold: ₹1,000. Maximum processing window: 24-48 business hours.</div>
                  </div>

                  <button
                    disabled
                    className="px-5 py-2.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-400 font-medium text-xs cursor-not-allowed min-h-[44px]"
                  >
                    Withdrawals Unavailable (Simulation Only Mode)
                  </button>
                </div>
              </div>
            )}

            {/* TAB 5: SHOPPING VOUCHERS */}
            {activeTab === 'vouchers' && (
              <div className="space-y-6">
                {/* 3 Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <span className="text-xs font-semibold uppercase text-slate-400">
                      Total Issued Value
                    </span>
                    <div className="text-2xl font-bold text-[#165DAD] mt-2">
                      ₹{userVouchers.reduce((acc: number, v: any) => acc + (v.initialValueINR || 0), 0).toLocaleString('en-IN')}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Lifetime value of all shopping vouchers granted.
                    </p>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <span className="text-xs font-semibold uppercase text-slate-400">
                      Available Voucher Balance
                    </span>
                    <div className="text-2xl font-bold text-[#15803D] mt-2">
                      ₹{(walletOverview?.shoppingVoucherINR ?? user.wallet?.shoppingVoucherINR ?? 0).toLocaleString('en-IN')}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Active balance redeemable against EV bike booking deposits.
                    </p>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <span className="text-xs font-semibold uppercase text-slate-400">
                      Used / Redeemed Value
                    </span>
                    <div className="text-2xl font-bold text-slate-700 mt-2">
                      ₹{userVouchers.reduce((acc: number, v: any) => acc + (v.usedAmountINR || 0), 0).toLocaleString('en-IN')}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Voucher credits utilized across confirmed EV bookings.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-[#253247]">EV Bike Booking Redemption</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Shopping Vouchers are non-convertible to cash and can be redeemed exclusively against genuine EV bike reservations.
                    </p>
                  </div>
                  <Link
                    href="/bikes"
                    className="px-5 py-2.5 rounded-lg bg-[#165DAD] hover:bg-[#12498a] text-white font-medium text-xs transition-colors flex items-center gap-1.5 self-start md:self-auto min-h-[44px]"
                  >
                    <Bike className="w-4 h-4" />
                    <span>Browse & Redeem on EV Bikes</span>
                  </Link>
                </div>

                {/* Vouchers Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#253247]">Issued Shopping Vouchers</h3>
                    <span className="text-xs text-slate-500 font-mono">{userVouchers.length} Total</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                        <tr>
                          <th className="py-3 px-4">Voucher Code</th>
                          <th className="py-3 px-4">Initial Value</th>
                          <th className="py-3 px-4">Used Amount</th>
                          <th className="py-3 px-4">Remaining Balance</th>
                          <th className="py-3 px-4">Grant Reason</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Expires</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[#253247]">
                        {userVouchers.length > 0 ? (
                          userVouchers.map((v: any) => (
                            <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4 font-mono font-medium text-[#165DAD]">
                                {v.voucherCode}
                              </td>
                              <td className="py-3 px-4 font-medium">₹{v.initialValueINR.toLocaleString('en-IN')}</td>
                              <td className="py-3 px-4 text-slate-500">
                                ₹{(v.usedAmountINR || 0).toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4 font-bold text-[#15803D]">
                                ₹{v.remainingBalanceINR.toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">{v.issuedReason}</td>
                              <td className="py-3 px-4">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${v.status === 'ACTIVE'
                                    ? 'bg-emerald-50 text-[#15803D] border-emerald-200'
                                    : v.status === 'PARTIALLY_REDEEMED'
                                      ? 'bg-blue-50 text-[#165DAD] border-blue-200'
                                      : 'bg-slate-100 text-slate-500 border-slate-200'
                                    }`}
                                >
                                  {v.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-500">
                                {new Date(v.expiresAt).getFullYear() > 2090
                                  ? 'Lifetime (Policy Pending)'
                                  : new Date(v.expiresAt).toLocaleDateString('en-IN')}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-400">
                              No shopping vouchers found. Upgrade to EV ULTRA or qualify directs to receive ₹30,000 vouchers.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Voucher Transaction History Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[#253247]">Voucher Transaction History</h3>
                      <p className="text-xs text-slate-500">Audit trail of redemptions, booking applications and reversals</p>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">{voucherTransactions.length} Total</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                        <tr>
                          <th className="py-3 px-4">Voucher Code</th>
                          <th className="py-3 px-4">Action</th>
                          <th className="py-3 px-4">Amount</th>
                          <th className="py-3 px-4">Remaining Balance</th>
                          <th className="py-3 px-4">Reference / Booking</th>
                          <th className="py-3 px-4">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[#253247]">
                        {voucherTransactions.length > 0 ? (
                          voucherTransactions.map((vt: any) => (
                            <tr key={vt.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4 font-mono font-medium text-[#165DAD]">
                                {vt.voucherCode}
                              </td>
                              <td className="py-3 px-4 font-semibold">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${vt.transactionType === 'REDEMPTION'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : vt.transactionType === 'REVERSAL'
                                      ? 'bg-emerald-50 text-[#15803D] border-emerald-200'
                                      : 'bg-blue-50 text-[#165DAD] border-blue-200'
                                    }`}
                                >
                                  {vt.transactionType}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-bold">
                                {vt.transactionType === 'REDEMPTION' ? (
                                  <span className="text-amber-700">
                                    -₹{vt.amountINR.toLocaleString('en-IN')}
                                  </span>
                                ) : (
                                  <span className="text-[#15803D]">
                                    +₹{vt.amountINR.toLocaleString('en-IN')}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 font-bold text-slate-700">
                                ₹{vt.balanceAfterINR.toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4 font-mono text-slate-600">
                                {vt.referenceId || 'N/A'}
                              </td>
                              <td className="py-3 px-4 text-slate-500">
                                {new Date(vt.createdAt).toLocaleString('en-IN')}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400">
                              No voucher transactions recorded yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: MY EV BOOKINGS */}
            {activeTab === 'bookings' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[#253247]">My EV Bike Reservations</h3>
                      <p className="text-xs text-slate-500">Simulated booking deposits, vehicle orders and cancellation management (SIMULATION_ONLY)</p>
                    </div>
                    <Link
                      href="/bikes"
                      className="px-4 py-2 rounded-lg bg-[#165DAD] hover:bg-[#12498a] text-white font-medium text-xs transition-colors min-h-[40px] flex items-center"
                    >
                      Browse Fleet
                    </Link>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                        <tr>
                          <th className="py-3 px-4">Booking Number</th>
                          <th className="py-3 px-4">EV Model</th>
                          <th className="py-3 px-4">Booking Deposit</th>
                          <th className="py-3 px-4">Voucher Applied</th>
                          <th className="py-3 px-4">Simulated Cash Paid</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Booking Date</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[#253247]">
                        {userBookings.length > 0 ? (
                          userBookings.map((b: any) => {
                            const isCancelled = b.bookingStatus === 'CANCELLED';
                            return (
                              <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3 px-4 font-mono font-medium text-[#165DAD]">
                                  {b.bookingNumber}
                                </td>
                                <td className="py-3 px-4 font-medium">{b.bikeName}</td>
                                <td className="py-3 px-4">₹{b.bookingAmountINR.toLocaleString('en-IN')}</td>
                                <td className="py-3 px-4 text-[#15803D] font-medium">
                                  {b.voucherAppliedINR > 0 ? `-₹${b.voucherAppliedINR.toLocaleString('en-IN')}` : '₹0'}
                                </td>
                                <td className="py-3 px-4 font-bold text-[#253247]">
                                  ₹{b.netCashPaidINR.toLocaleString('en-IN')}
                                </td>
                                <td className="py-3 px-4">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${isCancelled
                                      ? 'bg-red-50 text-[#DC2626] border-red-200'
                                      : 'bg-emerald-50 text-[#15803D] border-emerald-200'
                                      }`}
                                  >
                                    {b.bookingStatus}
                                  </span>
                                  {isCancelled && b.cancellationReason && (
                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                      {b.cancellationReason}
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-slate-500">
                                  {new Date(b.createdAt).toLocaleDateString('en-IN')}
                                </td>
                                <td className="py-3 px-4 text-right">
                                  {!isCancelled ? (
                                    <button
                                      disabled={cancellingBookingId === b.id}
                                      onClick={() => handleCancelBooking(b.id)}
                                      className="px-3 py-1.5 rounded-lg border border-red-200 text-[#DC2626] hover:bg-red-50 text-[11px] font-medium transition-colors"
                                    >
                                      {cancellingBookingId === b.id ? 'Cancelling...' : 'Cancel Booking'}
                                    </button>
                                  ) : (
                                    <span className="text-[11px] text-slate-400 italic">
                                      Restored
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-slate-400">
                              No EV reservations found. Visit the EV bikes catalog to reserve a ride.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 7: PROFILE & SETTINGS */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                {profileSuccess && (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>{profileSuccess}</span>
                  </div>
                )}
                {profileError && (
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span>{profileError}</span>
                  </div>
                )}
                {verificationNotice && (
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-sm flex items-center gap-2">
                    <Mail className="w-5 h-5 text-blue-600 shrink-0" />
                    <span>{verificationNotice}</span>
                  </div>
                )}

                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-bold text-[#253247]">Member Profile & Credentials</h3>
                      <p className="text-xs text-slate-500">Personal membership details, contact information, and verification status</p>
                    </div>
                    {!isEditingProfile && (
                      <button
                        onClick={handleOpenEditProfile}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#165DAD] bg-blue-50 hover:bg-blue-100 rounded-lg transition border border-blue-200 shrink-0"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit Profile
                      </button>
                    )}
                  </div>

                  {isEditingProfile ? (
                    <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">Update Personal Information</div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Full Legal Name</label>
                        <input
                          type="text"
                          required
                          value={editFullName}
                          onChange={(e) => setEditFullName(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#165DAD] bg-white text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Mobile Phone Number</label>
                        <input
                          type="text"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          placeholder="e.g. +91 9876543210"
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#165DAD] bg-white text-slate-900"
                        />
                        <p className="text-[11px] text-slate-400 mt-1">10-15 digits. Used for order updates and verification.</p>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <button
                          type="submit"
                          disabled={profileSaving}
                          className="px-4 py-2 text-xs font-semibold text-white bg-[#165DAD] hover:bg-[#134e96] rounded-lg transition disabled:opacity-50"
                        >
                          {profileSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          type="button"
                          disabled={profileSaving}
                          onClick={() => setIsEditingProfile(false)}
                          className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="p-4 rounded-lg bg-[#F7F9FC] border border-slate-200 space-y-1">
                        <span className="text-slate-500">Unique Member ID</span>
                        <div className="text-sm font-mono font-bold text-[#165DAD]">{user.memberId}</div>
                      </div>

                      <div className="p-4 rounded-lg bg-[#F7F9FC] border border-slate-200 space-y-1">
                        <span className="text-slate-500">Full Legal Name</span>
                        <div className="text-sm font-bold text-[#253247]">{user.fullName}</div>
                      </div>

                      <div className="p-4 rounded-lg bg-[#F7F9FC] border border-slate-200 space-y-1">
                        <span className="text-slate-500">Registered Email</span>
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-medium text-[#253247] truncate">{user.email}</div>
                          {user.isEmailVerified ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
                              <CheckCircle className="w-3 h-3" /> Verified
                            </span>
                          ) : (
                            <button
                              onClick={handleSendVerification}
                              disabled={sendingVerification}
                              className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 underline shrink-0 disabled:opacity-50"
                            >
                              {sendingVerification ? 'Sending...' : 'Verify Email'}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="p-4 rounded-lg bg-[#F7F9FC] border border-slate-200 space-y-1">
                        <span className="text-slate-500">Mobile Number</span>
                        <div className="text-sm font-medium text-[#253247]">{user.phone || 'Not Provided'}</div>
                      </div>

                      <div className="p-4 rounded-lg bg-[#F7F9FC] border border-slate-200 space-y-1">
                        <span className="text-slate-500">Assigned Sponsor</span>
                        <div className="text-sm font-medium text-[#253247]">
                          {user.sponsorName ? `${user.sponsorName} (${user.sponsorMemberId})` : 'Direct Root Enrollment'}
                        </div>
                      </div>

                      <div className="p-4 rounded-lg bg-[#F7F9FC] border border-slate-200 space-y-1">
                        <span className="text-slate-500">Account Verification Tier</span>
                        <div className="text-sm font-bold text-[#15803D] flex items-center gap-1.5 mt-0.5">
                          <ShieldCheck className="w-4 h-4" />
                          <span>
                            {user.isFullQualified
                              ? 'EV ULTRA Qualified (Simulated)'
                              : user.currentPackage === 'BASIC'
                                ? 'EV PRO Activated (Simulated)'
                                : 'EV GO Starter Account'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Share & Referral Section inside Profile */}
                  <div className="mt-6 pt-6 border-t border-slate-200 space-y-4">
                    <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">Your Member Referral Links</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Left Team Link */}
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-[#165DAD]"></span>
                            <span>Left Team Link</span>
                          </span>
                        </div>
                        <div className="font-mono text-[11px] text-slate-700 break-all bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                          {getReferralLink('LEFT')}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopyLink('LEFT')}
                            className="px-2.5 py-1.5 text-xs font-semibold text-white bg-[#165DAD] hover:bg-[#134e96] rounded-lg transition inline-flex items-center gap-1"
                          >
                            {copiedLeft ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedLeft ? 'Copied' : 'Copy'}</span>
                          </button>
                          <a
                            href={getWhatsAppShareUrl('LEFT')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 text-xs font-semibold text-white bg-[#25D366] hover:bg-[#20ba59] rounded-lg transition inline-flex items-center gap-1"
                          >
                            WhatsApp
                          </a>
                        </div>
                      </div>

                      {/* Right Team Link */}
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                            <span>Right Team Link</span>
                          </span>
                        </div>
                        <div className="font-mono text-[11px] text-slate-700 break-all bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                          {getReferralLink('RIGHT')}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopyLink('RIGHT')}
                            className="px-2.5 py-1.5 text-xs font-semibold text-white bg-[#165DAD] hover:bg-[#134e96] rounded-lg transition inline-flex items-center gap-1"
                          >
                            {copiedRight ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedRight ? 'Copied' : 'Copy'}</span>
                          </button>
                          <a
                            href={getWhatsAppShareUrl('RIGHT')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 text-xs font-semibold text-white bg-[#25D366] hover:bg-[#20ba59] rounded-lg transition inline-flex items-center gap-1"
                          >
                            WhatsApp
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Security & Password Change Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#165DAD] flex items-center justify-center">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#253247]">Security & Password</h3>
                      <p className="text-xs text-slate-500">Update your account password and revoke other active sessions</p>
                    </div>
                  </div>

                  {passwordSuccess && (
                    <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{passwordSuccess}</span>
                    </div>
                  )}

                  {passwordError && (
                    <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{passwordError}</span>
                    </div>
                  )}

                  <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
                    <div>
                      <label className="block text-xs font-semibold text-[#253247] mb-1">
                        Current Password
                      </label>
                      <input
                        type="password"
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-[#165DAD] focus:outline-hidden text-xs text-[#253247]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#253247] mb-1">
                          New Password (min 8 chars)
                        </label>
                        <input
                          type="password"
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-[#165DAD] focus:outline-hidden text-xs text-[#253247]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#253247] mb-1">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-[#165DAD] focus:outline-hidden text-xs text-[#253247]"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={passwordSaving}
                      className="px-4 py-2 rounded-lg bg-[#165DAD] hover:bg-[#124B8D] text-white text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      {passwordSaving ? 'Updating Password...' : 'Update Password'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* TAB: EARNINGS SIMULATOR */}
            {activeTab === 'calculator' && (
              <div className="space-y-6">
                {/* Header Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[#15803D] text-xs font-semibold">
                      <Cpu className="w-3.5 h-3.5" />
                      <span>Calculation Engine Testbench</span>
                    </div>
                    <h2 className="text-lg font-bold text-[#253247] mt-2">
                      Commission Ledger & Binary Matching Simulator
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Simulates hold reserves, upgrade reconciliations, and double-entry accounting in SIMULATION_ONLY mode.
                    </p>
                  </div>

                  <button
                    onClick={runCanonicalSimulation}
                    disabled={simLoading}
                    className="px-4 py-2.5 rounded-lg font-medium text-xs text-white bg-[#165DAD] hover:bg-[#12498a] transition-colors flex items-center gap-2 self-start md:self-auto shrink-0 shadow-xs"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>{simLoading ? 'Simulating...' : 'Re-Run Scenario (A → B, C, D, E)'}</span>
                  </button>
                </div>

                {/* Compliance Advisory */}
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-800 leading-relaxed">
                    <span className="font-bold">Compliance & Safety Safeguard:</span> All calculations below are internal mathematical simulations. Live payouts, network commissions, and banking releases are strictly disabled under the Consumer Protection (Direct Selling) Rules, 2021.
                  </div>
                </div>

                {simError && (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-[#DC2626] text-xs font-medium">
                    {simError}
                  </div>
                )}

                {/* SECTION 1: Canonical Scenario Results */}
                {simulationResult && (
                  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
                      <div>
                        <span className="text-xs font-bold text-[#165DAD] uppercase tracking-wider">
                          Scenario Execution
                        </span>
                        <h3 className="text-base font-bold text-[#253247] mt-0.5">
                          Sponsor A Sponsoring 4 Members (B, C, D, E) & Upgrades
                        </h3>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 border border-emerald-200 text-[#15803D] flex items-center gap-1.5 self-start">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Double-Entry Balanced: 100%</span>
                      </span>
                    </div>

                    {/* Final State Counters */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 rounded-lg bg-[#F7F9FC] border border-slate-200">
                        <div className="text-[11px] font-semibold text-slate-500 uppercase">Available Earnings</div>
                        <div className="text-xl font-bold text-[#15803D] mt-1">
                          ₹{simulationResult.finalWalletState?.availableEarningsINR?.toLocaleString('en-IN') ?? 0}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">₹3k base + ₹9k D upgrade</div>
                      </div>

                      <div className="p-4 rounded-lg bg-[#F7F9FC] border border-slate-200">
                        <div className="text-[11px] font-semibold text-slate-500 uppercase">Hold Reserve Balance</div>
                        <div className="text-xl font-bold text-amber-600 mt-1">
                          ₹{simulationResult.finalWalletState?.heldCommissionsINR?.toLocaleString('en-IN') ?? 0}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">₹1,000 released on 2nd direct</div>
                      </div>

                      <div className="p-4 rounded-lg bg-[#F7F9FC] border border-slate-200">
                        <div className="text-[11px] font-semibold text-slate-500 uppercase">Shopping Voucher</div>
                        <div className="text-xl font-bold text-[#165DAD] mt-1">
                          ₹{simulationResult.finalWalletState?.shoppingVoucherINR?.toLocaleString('en-IN') ?? 0}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Issued on E upgrade</div>
                      </div>

                      <div className="p-4 rounded-lg bg-[#F7F9FC] border border-slate-200">
                        <div className="text-[11px] font-semibold text-slate-500 uppercase">Pending Recovery</div>
                        <div className="text-xl font-bold text-purple-600 mt-1">
                          ₹{simulationResult.finalWalletState?.pendingVoucherRecoveryINR?.toLocaleString('en-IN') ?? 0}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">₹4,000 auto-recovered</div>
                      </div>
                    </div>

                    {/* Step-by-Step Scenario Audit Log */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Scenario Event Execution Log
                      </h4>
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                        {simulationResult.steps?.map((step: any, idx: number) => (
                          <div
                            key={idx}
                            className="p-3 bg-white text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 transition"
                          >
                            <div>
                              <span className="font-mono font-bold text-slate-500 mr-2">#{step.step}</span>
                              <span className="font-semibold text-[#253247]">{step.description}</span>
                            </div>
                            <div className="flex items-center gap-3 text-[11px]">
                              <span className="text-slate-500">
                                Hold: ₹{step.heldBalanceINR?.toLocaleString('en-IN')}
                              </span>
                              <span className="font-bold text-[#15803D]">
                                Avail: ₹{step.availableEarningsINR?.toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* SECTION 2: Interactive Binary Matching Calculator */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
                  <div className="flex items-center gap-2 pb-4 border-b border-slate-200">
                    <GitBranch className="w-5 h-5 text-[#165DAD]" />
                    <h3 className="text-base font-bold text-[#253247]">
                      Interactive 1:1 Binary Matching Calculator
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Left Units Today
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={leftUnits}
                        onChange={(e) => setLeftUnits(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:outline-hidden focus:border-[#165DAD]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Right Units Today
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={rightUnits}
                        onChange={(e) => setRightUnits(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:outline-hidden focus:border-[#165DAD]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Prev Carry Left
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={prevCarryLeft}
                        onChange={(e) => setPrevCarryLeft(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:outline-hidden focus:border-[#165DAD]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Prev Carry Right
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={prevCarryRight}
                        onChange={(e) => setPrevCarryRight(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:outline-hidden focus:border-[#165DAD]"
                      />
                    </div>
                  </div>

                  <button
                    onClick={calculateBinaryMatching}
                    className="px-4 py-2 rounded-lg bg-[#165DAD] hover:bg-[#12498a] text-white text-xs font-semibold transition"
                  >
                    Calculate Binary Matching
                  </button>

                  {binaryResult && (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
                      <div>
                        <div className="text-[10px] uppercase font-semibold text-slate-500">Pairs Matched</div>
                        <div className="text-lg font-bold text-[#165DAD] mt-0.5">{binaryResult.matchedPairs}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-semibold text-slate-500">Daily Cap</div>
                        <div className="text-lg font-bold text-slate-700 mt-0.5">15 Pairs</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-semibold text-slate-500">Gross Reward</div>
                        <div className="text-lg font-bold text-slate-800 mt-0.5">
                          ₹{binaryResult.grossRewardINR?.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-semibold text-slate-500">TDS (5%)</div>
                        <div className="text-lg font-bold text-amber-600 mt-0.5">
                          ₹{binaryResult.tdsDeductionINR?.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-semibold text-slate-500">Admin (10%)</div>
                        <div className="text-lg font-bold text-amber-600 mt-0.5">
                          ₹{binaryResult.adminFeeDeductionINR?.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-semibold text-slate-500">Net Credit</div>
                        <div className="text-lg font-bold text-[#15803D] mt-0.5">
                          ₹{binaryResult.netCreditedINR?.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* =========================================================================
          MOBILE BOTTOM NAVIGATION BAR
          Fixed 5-item bar: Home, Earnings, Wallet, Booking / Products, Share
          ========================================================================= */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg flex items-center justify-around py-2 px-1"
      >
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-semibold transition-colors ${activeTab === 'overview' ? 'text-[#165DAD]' : 'text-slate-500 hover:text-slate-700'
            }`}
        >
          <Home className={`w-5 h-5 mb-0.5 ${activeTab === 'overview' ? 'text-[#165DAD]' : 'text-slate-400'}`} />
          <span>Home</span>
        </button>

        <button
          onClick={() => setActiveTab('binary')}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-semibold transition-colors ${activeTab === 'binary' ? 'text-[#165DAD]' : 'text-slate-500 hover:text-slate-700'
            }`}
        >
          <GitBranch className={`w-5 h-5 mb-0.5 ${activeTab === 'binary' ? 'text-[#165DAD]' : 'text-slate-400'}`} />
          <span>Earnings</span>
        </button>

        <button
          onClick={() => setActiveTab('wallets')}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-semibold transition-colors ${activeTab === 'wallets' ? 'text-[#165DAD]' : 'text-slate-500 hover:text-slate-700'
            }`}
        >
          <Wallet className={`w-5 h-5 mb-0.5 ${activeTab === 'wallets' ? 'text-[#165DAD]' : 'text-slate-400'}`} />
          <span>Wallet</span>
        </button>

        <button
          onClick={() => setActiveTab('bookings')}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-semibold transition-colors ${activeTab === 'bookings' ? 'text-[#165DAD]' : 'text-slate-500 hover:text-slate-700'
            }`}
        >
          <Bike className={`w-5 h-5 mb-0.5 ${activeTab === 'bookings' ? 'text-[#165DAD]' : 'text-slate-400'}`} />
          <span>Booking / Products</span>
        </button>

        <button
          onClick={() => setShowShareModal(true)}
          className="flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-semibold text-slate-500 hover:text-[#165DAD] transition-colors"
        >
          <Share2 className="w-5 h-5 mb-0.5 text-slate-400" />
          <span>Share</span>
        </button>
      </nav>

      {/* =========================================================================
          COMPACT SHARE MODAL / SHEET
          Separate Left & Right team actions: Copy, WhatsApp, Share without raw URLs
          ========================================================================= */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setShowShareModal(false)}
          />
          <div className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 z-10 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#165DAD] flex items-center justify-center">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#253247]">Share Sponsor Referral Links</h3>
                  <p className="text-[11px] text-slate-400">Invite new members directly to Left or Right team</p>
                </div>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Left Team Section */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#253247] flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#165DAD]" />
                  <span>Left Team Link</span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Automatic Left subtree placement</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  onClick={() => handleCopyLink('LEFT')}
                  className="py-2 px-3 rounded-lg bg-[#165DAD] hover:bg-[#12498a] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  {copiedLeft ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLeft ? 'Copied' : 'Copy'}</span>
                </button>
                <a
                  href={getWhatsAppShareUrl('LEFT')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 px-3 rounded-lg bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                  <span>WhatsApp</span>
                </a>
                <button
                  onClick={() => handleShareLink('LEFT')}
                  className="py-2 px-3 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </button>
              </div>
            </div>

            {/* Right Team Section */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#253247] flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  <span>Right Team Link</span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Automatic Right subtree placement</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  onClick={() => handleCopyLink('RIGHT')}
                  className="py-2 px-3 rounded-lg bg-[#165DAD] hover:bg-[#12498a] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  {copiedRight ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedRight ? 'Copied' : 'Copy'}</span>
                </button>
                <a
                  href={getWhatsAppShareUrl('RIGHT')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 px-3 rounded-lg bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                  <span>WhatsApp</span>
                </a>
                <button
                  onClick={() => handleShareLink('RIGHT')}
                  className="py-2 px-3 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          UPI BOOKING & PAYMENT CLEARANCE MODAL
          Direct UPI QR / VPA + UTR entry connected to administrative clearance
          ========================================================================= */}
      {paymentModalOpen && selectedRequestType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => !upgrading && setPaymentModalOpen(false)}
          />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 z-10 space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#165DAD] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                  EV Booking Payment
                </span>
                <h3 className="text-base font-bold text-[#253247] mt-1">
                  {selectedRequestType === 'BASIC_ACTIVATION'
                    ? 'Book EV PRO Tier (₹3,000)'
                    : selectedRequestType === 'FULL_ACTIVATION'
                      ? 'Book EV ULTRA Tier (₹33,000)'
                      : 'Upgrade to EV ULTRA Tier (₹30,000)'}
                </h3>
              </div>
              <button
                onClick={() => setPaymentModalOpen(false)}
                disabled={upgrading}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Booking Details Summary */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
              <div className="flex items-center justify-between font-semibold">
                <span className="text-slate-600">Booking Amount Payable:</span>
                <span className="text-base font-bold text-[#165DAD]">
                  {selectedRequestType === 'BASIC_ACTIVATION'
                    ? '₹3,000'
                    : selectedRequestType === 'FULL_ACTIVATION'
                      ? '₹33,000'
                      : '₹30,000'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {selectedRequestType === 'BASIC_ACTIVATION'
                  ? 'Starter EV booking tier. Qualifies for direct referral rewards (₹1,000) and keeps remaining ₹30,000 upgrade path open.'
                  : 'Includes ₹30,000 vehicle shopping voucher credit towards bike reservations and fully qualifies for 1:1 binary matching (₹3,000/pair).'}
              </p>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#253247]">Select Payment Mode</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                {(paymentMethods?.gateways && paymentMethods.gateways.length > 0) && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('GATEWAY')}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                      paymentMethod === 'GATEWAY'
                        ? 'border-[#165DAD] bg-blue-50/50 text-[#165DAD] font-semibold ring-1 ring-[#165DAD]'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-[#165DAD]" />
                      <div>
                        <div className="font-semibold">Online Gateway</div>
                        <div className="text-[10px] text-slate-400">Razorpay / Cards / UPI</div>
                      </div>
                    </div>
                    {paymentMethod === 'GATEWAY' && <Check className="w-4 h-4 text-[#165DAD]" />}
                  </button>
                )}

                {(paymentMethods ? paymentMethods.upi.isEnabled : paymentConfig?.isConfigured) && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('UPI')}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                      paymentMethod === 'UPI'
                        ? 'border-[#165DAD] bg-blue-50/50 text-[#165DAD] font-semibold ring-1 ring-[#165DAD]'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-[#165DAD]" />
                      <div>
                        <div className="font-semibold">UPI Transfer</div>
                        <div className="text-[10px] text-slate-400">QR / Manual UTR</div>
                      </div>
                    </div>
                    {paymentMethod === 'UPI' && <Check className="w-4 h-4 text-[#165DAD]" />}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setPaymentMethod('SIMULATED')}
                  className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${paymentMethod === 'SIMULATED'
                    ? 'border-[#165DAD] bg-blue-50/50 text-[#165DAD] font-semibold ring-1 ring-[#165DAD]'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#165DAD]" />
                    <div>
                      <div className="font-semibold">Simulation</div>
                      <div className="text-[10px] text-slate-400">Portal Test Mode</div>
                    </div>
                  </div>
                  {paymentMethod === 'SIMULATED' && <Check className="w-4 h-4 text-[#165DAD]" />}
                </button>
              </div>

              {/* Notice if neither UPI nor Gateway is available */}
              {!(paymentMethods?.gateways && paymentMethods.gateways.length > 0) &&
                !(paymentMethods ? (paymentMethods.upi.isEnabled && paymentMethods.upi.isConfigured) : paymentConfig?.isConfigured) && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Online booking payments are currently undergoing maintenance. Please contact support or use portal simulation clearance.</span>
                  </div>
                )}
            </div>

            {/* Payment Method Details */}
            {paymentMethod === 'GATEWAY' ? (
              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-[#165DAD]" />
                    <span className="font-bold text-[#253247]">Razorpay Secure Checkout</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-[#165DAD] border border-blue-200">
                    {paymentMethods?.gateways?.[0]?.isSandbox ? 'Sandbox Mode' : 'Production'}
                  </span>
                </div>

                <div className="p-3 bg-white rounded-lg border border-blue-100 space-y-1.5">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Payable Amount:</span>
                    <strong className="text-base font-bold text-[#165DAD]">
                      {selectedRequestType === 'BASIC_ACTIVATION'
                        ? '₹3,000'
                        : selectedRequestType === 'FULL_ACTIVATION'
                        ? '₹33,000'
                        : '₹30,000'}
                    </strong>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Seamless online payment via Cards, UPI, NetBanking, and Wallets through Razorpay.
                  </p>
                </div>

                {gatewayOrder ? (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-emerald-800 text-xs">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Order Created Successfully</span>
                    </div>
                    <div className="text-[11px] text-emerald-700 font-mono">
                      Order ID: <strong>{gatewayOrder.orderId}</strong>
                    </div>
                    <p className="text-[10px] text-emerald-600">
                      Click below to complete authorization and submit your booking request for audit reconciliation.
                    </p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleInitiateGatewayPayment}
                    disabled={isProcessingGateway}
                    className="w-full py-2.5 rounded-lg bg-[#165DAD] hover:bg-[#12498a] text-white text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>
                      {isProcessingGateway ? 'Initializing Secure Order...' : 'Pay Online via Razorpay'}
                    </span>
                  </button>
                )}

                <div className="p-2.5 rounded-lg bg-slate-100/80 border border-slate-200 text-[10px] text-slate-500 space-y-0.5">
                  <span className="font-bold text-slate-600">Compliance & Security Notice:</span>
                  <p>
                    All gateway payments are processed with server-side HMAC-SHA256 signature validation and isolated from MLM binary matching calculations per SIMULATION_ONLY rules.
                  </p>
                </div>
              </div>
            ) : paymentMethod === 'UPI' ? (
              paymentConfig?.isConfigured && paymentConfig.merchantUpiVpa ? (
                <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-4">
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="w-32 h-32 bg-white p-2 rounded-xl border border-blue-200 shadow-xs flex items-center justify-center shrink-0">
                      {qrCodeDataUrl ? (
                        <img
                          src={qrCodeDataUrl}
                          alt="Scan UPI QR Code to Pay"
                          className="w-28 h-28 object-contain"
                        />
                      ) : (
                        <div className="w-28 h-28 flex items-center justify-center text-slate-400">
                          <QrCode className="w-20 h-20 animate-pulse text-blue-400" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5 text-center sm:text-left text-xs flex-1">
                      <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                        <span className="font-bold text-[#253247]">Verified Company UPI ID</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Verified
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                        <code className="font-mono font-bold text-sm text-[#165DAD] bg-white px-2 py-0.5 rounded border border-blue-200">
                          {paymentConfig.merchantUpiVpa}
                        </code>
                        <button
                          type="button"
                          onClick={handleCopyUpi}
                          className="p-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-600"
                          title="Copy UPI ID"
                        >
                          {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        Payee: <strong>{paymentConfig.merchantName || 'ASKR EV Mobility'}</strong>
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Payable:{' '}
                        <strong className="text-[#165DAD]">
                          {selectedRequestType === 'BASIC_ACTIVATION'
                            ? '₹3,000'
                            : selectedRequestType === 'FULL_ACTIVATION'
                              ? '₹33,000'
                              : '₹30,000'}
                        </strong>
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Scan using Google Pay, PhonePe, Paytm, BHIM, or any banking app.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#253247] mb-1">
                      Enter UPI Reference / UTR Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={paymentUtr}
                      onChange={(e) => setPaymentUtr(e.target.value.toUpperCase())}
                      placeholder="e.g. 432109876543 (12-digit UTR)"
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 focus:border-[#165DAD] focus:outline-none text-xs font-mono text-[#253247] placeholder:text-slate-400"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Enter the 12-digit numeric or 12-22 alphanumeric UTR from your bank transaction receipt.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 text-[11px] text-amber-800 space-y-0.5">
                    <span className="font-bold">Verification Notice:</span>
                    <p className="text-[10px] text-amber-700 leading-relaxed">
                      Payment requests remain PENDING until authorized administrator verification against actual bank/PSP records. Submitting a UTR number is for audit reconciliation and does not guarantee activation until verified.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-amber-800">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Merchant UPI Payment Setup in Progress</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    The official company UPI VPA is pending verification by administration. Live UPI QR payment instructions are temporarily withheld until verified.
                  </p>
                  <p className="text-[11px] text-amber-700">
                    Please use <strong>Portal Simulation Clearance</strong> to test bookings or contact support.
                  </p>
                </div>
              )
            ) : (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                <span className="font-bold">Test & Demonstration Clearance</span>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Submits a simulated portal clearance request with SIMULATION_ONLY compliance safeguards. No real live financial debit or settlement occurs.
                </p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                disabled={upgrading || isProcessingGateway}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPaymentRequest}
                disabled={
                  upgrading ||
                  isProcessingGateway ||
                  (paymentMethod === 'UPI' && (!paymentConfig?.isConfigured || !paymentUtr.trim()))
                }
                className="px-5 py-2 rounded-lg bg-[#165DAD] hover:bg-[#12498a] text-white text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
              >
                {paymentMethod === 'GATEWAY' && !gatewayOrder ? (
                  <>
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>{isProcessingGateway ? 'Initializing Gateway...' : 'Initiate Online Payment'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{upgrading ? 'Submitting Request...' : 'Submit Booking Request'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center text-slate-500">
          <div className="flex items-center gap-3">
            <div className="animate-spin w-6 h-6 border-2 border-[#165DAD] border-t-transparent rounded-full" />
            <span className="text-sm font-medium">Loading Dashboard...</span>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
