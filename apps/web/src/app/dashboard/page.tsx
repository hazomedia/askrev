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
  Crown,
  Zap,
  TrendingUp,
  Layers,
  Filter,
  ArrowDownToLine,
  MessageCircle,
  ArrowLeft,
  Download,
  Smartphone,
} from 'lucide-react';
import QRCode from 'qrcode';
import { fetchApi, getStoredUser, logoutSession } from '../../lib/api';
import AskrLogo from '../../components/AskrLogo';

type TabType = 'overview' | 'membership' | 'team' | 'binary' | 'wallets' | 'vouchers' | 'bookings' | 'profile';

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

  // Withdrawal & Email Verification States
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [emailVerifyModalOpen, setEmailVerifyModalOpen] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawResult, setWithdrawResult] = useState<any | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [sendingWithdrawVerify, setSendingWithdrawVerify] = useState(false);
  const [withdrawVerifyNotice, setWithdrawVerifyNotice] = useState<string | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(1000);
  const [withdrawPayoutType, setWithdrawPayoutType] = useState<'BANK_ACCOUNT' | 'UPI'>('BANK_ACCOUNT');
  const [withdrawAccountHolder, setWithdrawAccountHolder] = useState('');
  const [withdrawBankName, setWithdrawBankName] = useState('');
  const [withdrawAccountNumber, setWithdrawAccountNumber] = useState('');
  const [withdrawConfirmAccountNumber, setWithdrawConfirmAccountNumber] = useState('');
  const [withdrawIfscCode, setWithdrawIfscCode] = useState('');
  const [withdrawUpiId, setWithdrawUpiId] = useState('');
  const [withdrawValidationError, setWithdrawValidationError] = useState<string | null>(null);

  // Dashboard-Only Mobile PWA Installation States
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showInstallGuideModal, setShowInstallGuideModal] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  // Team Filter State
  const [teamFilter, setTeamFilter] = useState<'ALL' | 'LEFT' | 'RIGHT'>('ALL');

  // Expanded Transaction IDs for Detailed Audit Ledger view
  const [expandedTxIds, setExpandedTxIds] = useState<Record<string, boolean>>({});

  const [copiedLeft, setCopiedLeft] = useState(false);
  const [copiedRight, setCopiedRight] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState<string | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedRequestType, setSelectedRequestType] = useState<
    'BASIC_ACTIVATION' | 'FULL_ACTIVATION' | 'BASIC_TO_FULL_UPGRADE' | null
  >(null);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'GATEWAY'>('UPI');
  const [paymentUtr, setPaymentUtr] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState<{
    isConfigured: boolean;
    enabled?: boolean;
    merchantUpiVpa: string | null;
    merchantName: string;
    isVerified: boolean;
    pricing?: { BASIC_ACTIVATION: number; FULL_ACTIVATION: number; BASIC_TO_FULL_UPGRADE: number };
  } | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<{
    upi: {
      enabled?: boolean;
      isEnabled?: boolean;
      isConfigured?: boolean;
      isVerified?: boolean;
      merchantUpiVpa: string | null;
      merchantName: string;
      manualReviewRequired: boolean;
    };
    gateways: Array<{
      provider: string;
      isSandbox: boolean;
      name?: string;
      displayName?: string;
    }>;
    pricing: {
      BASIC_ACTIVATION: number;
      FULL_ACTIVATION: number;
      BASIC_TO_FULL_UPGRADE: number;
    };
  } | null>(null);
  const [selectedGatewayProvider, setSelectedGatewayProvider] = useState<string>('PINELABS');
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
        'bookings',
        'profile',
      ].includes(tabParam)
    ) {
      setActiveTab(tabParam);
    }

    const bookParam = searchParams.get('book');
    if (bookParam === 'true') {
      setSelectedRequestType('BASIC_ACTIVATION');
      setPaymentModalOpen(true);
    }
  }, [searchParams]);

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
      router.push('/auth/login?redirect=/dashboard');
      return;
    }
    loadData();

    // 1. Detect if running standalone mode (already installed PWA)
    const checkStandalone = () => {
      if (typeof window === 'undefined') return false;
      return (
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://')
      );
    };

    const standaloneActive = checkStandalone();
    setIsStandalone(standaloneActive);

    // 2. Detect iOS platform
    const isAppleDevice =
      typeof navigator !== 'undefined' &&
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as any).MSStream;
    setIsIOS(isAppleDevice);

    // 3. Register Minimal Service Worker (scoped strictly to '/', never caches sensitive API/auth)
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      (window.location.protocol === 'https:' || window.location.hostname === 'localhost')
    ) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
    }

    // If already running in standalone mode, do not register install prompts
    if (standaloneActive) {
      return;
    }

    // 4. Android / Chrome beforeinstallprompt event handling
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault(); // Stop automatic mini-infobar prompt
      setDeferredPrompt(e);
      const isDismissed = sessionStorage.getItem('askrev_pwa_dismissed') === 'true';
      if (!isDismissed) {
        setShowInstallBanner(true);
      }
    };

    // 5. App installed event handler
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowInstallBanner(false);
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // On iOS Safari where beforeinstallprompt does not fire:
    if (isAppleDevice && !standaloneActive) {
      const isDismissed = sessionStorage.getItem('askrev_pwa_dismissed') === 'true';
      if (!isDismissed) {
        setShowInstallBanner(true);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      try {
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setShowInstallBanner(false);
        }
      } catch {}
      setDeferredPrompt(null);
    } else {
      setShowInstallGuideModal(true);
    }
  };

  const handleDismissInstallBanner = () => {
    setShowInstallBanner(false);
    try {
      sessionStorage.setItem('askrev_pwa_dismissed', 'true');
    } catch {}
  };

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

  const formatISTDateTime = (dateStr: string | Date | null | undefined) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(d);
    } catch {
      return String(dateStr);
    }
  };

  const getReferralLink = (leg?: 'LEFT' | 'RIGHT') => {
    if (!user || !user.memberId) return '';
    if (typeof window === 'undefined') return '';
    const base = `${window.location.origin}/auth/register?ref=${user.memberId}`;
    return leg ? `${base}&position=${leg}&side=${leg}` : base;
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

    if (hasGateways) {
      setPaymentMethod('GATEWAY');
    } else {
      setPaymentMethod('UPI');
    }
    setPaymentModalOpen(true);
  };

  useEffect(() => {
    const isUpiActive = Boolean(
      (paymentMethods?.upi?.enabled && paymentMethods?.upi?.merchantUpiVpa) ||
      (paymentMethods?.upi?.isEnabled && paymentMethods?.upi?.merchantUpiVpa) ||
      (paymentConfig?.isConfigured && paymentConfig?.merchantUpiVpa)
    );
    const upiVpa = paymentMethods?.upi?.merchantUpiVpa || paymentConfig?.merchantUpiVpa;
    const upiName = paymentMethods?.upi?.merchantName || paymentConfig?.merchantName || 'ASKR EV Mobility';

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

      // If Pine Labs or gateway provides a hosted checkout redirect URL, open it
      if (orderData?.clientPayload?.redirectUrl && typeof window !== 'undefined') {
        window.open(orderData.clientPayload.redirectUrl, '_blank', 'noopener,noreferrer');
      }

      // Check if Razorpay Checkout script is loaded on window
      if (selectedGatewayProvider === 'RAZORPAY' && typeof window !== 'undefined' && (window as any).Razorpay && orderData?.keyId) {
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
    mode: 'UPI' | 'GATEWAY' | 'SIMULATED' = 'UPI',
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

  const handleInitiateWithdrawal = () => {
    setWithdrawError(null);
    setWithdrawResult(null);
    setWithdrawValidationError(null);
    if (user?.fullName && !withdrawAccountHolder) {
      setWithdrawAccountHolder(user.fullName);
    }
    const isVerified = Boolean(walletOverview?.isEmailVerified ?? user?.isEmailVerified);
    if (!isVerified) {
      setEmailVerifyModalOpen(true);
      return;
    }
    setWithdrawModalOpen(true);
  };

  const handleSendWithdrawVerification = async () => {
    setSendingWithdrawVerify(true);
    setWithdrawVerifyNotice(null);
    try {
      const res: any = await fetchApi<any>('/auth/send-verification', {
        method: 'POST',
      });
      setWithdrawVerifyNotice(res.message || 'Verification link sent to your registered email.');
    } catch (err: any) {
      setWithdrawVerifyNotice(err.message || 'Failed to send verification link.');
    } finally {
      setSendingWithdrawVerify(false);
    }
  };

  const handleExecuteWithdrawalWithDetails = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setWithdrawValidationError(null);
    setWithdrawError(null);
    setWithdrawResult(null);

    const availablePaise = Math.round(Number(walletOverview?.availableEarningsINR ?? user?.wallet?.availableEarningsINR ?? 0) * 100);
    const amountNum = Number(withdrawAmount);

    if (isNaN(amountNum) || amountNum < 1000) {
      setWithdrawValidationError('Minimum withdrawal amount is ₹1,000.');
      return;
    }

    const requestedPaise = Math.round(amountNum * 100);
    if (requestedPaise > availablePaise) {
      setWithdrawValidationError(`Withdrawal amount (₹${amountNum.toLocaleString('en-IN')}) cannot exceed your available earnings balance (₹${(availablePaise / 100).toLocaleString('en-IN')}).`);
      return;
    }

    if (withdrawPayoutType === 'BANK_ACCOUNT') {
      if (!withdrawAccountHolder.trim()) {
        setWithdrawValidationError('Account holder name is required.');
        return;
      }
      if (!withdrawBankName.trim()) {
        setWithdrawValidationError('Bank name is required.');
        return;
      }
      const acc = withdrawAccountNumber.trim();
      const confirmAcc = withdrawConfirmAccountNumber.trim();
      if (!acc) {
        setWithdrawValidationError('Bank account number is required.');
        return;
      }
      if (acc !== confirmAcc) {
        setWithdrawValidationError('Account numbers do not match. Please verify carefully.');
        return;
      }
      if (!/^\d{9,18}$/.test(acc)) {
        setWithdrawValidationError('Account number must be between 9 and 18 numeric digits.');
        return;
      }
      const ifsc = withdrawIfscCode.trim().toUpperCase();
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
        setWithdrawValidationError('Invalid IFSC format. Must be 4 letters, 0, followed by 6 alphanumeric characters (e.g. HDFC0001234).');
        return;
      }
    } else {
      if (!withdrawAccountHolder.trim()) {
        setWithdrawValidationError('Account / VPA holder name is required.');
        return;
      }
      const upi = withdrawUpiId.trim();
      if (!upi || !/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upi)) {
        setWithdrawValidationError('Invalid UPI ID format (e.g. name@okhdfcbank or 9876543210@paytm).');
        return;
      }
    }

    setWithdrawing(true);
    try {
      const payload: any = {
        amountPaise: requestedPaise,
        payoutType: withdrawPayoutType,
        accountHolderName: withdrawAccountHolder.trim(),
      };
      if (withdrawPayoutType === 'BANK_ACCOUNT') {
        payload.bankName = withdrawBankName.trim();
        payload.accountNumber = withdrawAccountNumber.trim();
        payload.confirmAccountNumber = withdrawConfirmAccountNumber.trim();
        payload.ifscCode = withdrawIfscCode.trim().toUpperCase();
      } else {
        payload.upiId = withdrawUpiId.trim();
      }

      const res = await fetchApi<any>('/wallet/request-withdrawal', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setWithdrawResult(res);
      await loadData();
    } catch (err: any) {
      setWithdrawError(err.message || 'Withdrawal request failed.');
    } finally {
      setWithdrawing(false);
    }
  };

  const handleExecuteWithdrawal = async (amountPaise?: number) => {
    return handleExecuteWithdrawalWithDetails();
  };

  const toggleTxExpanded = (refId: string) => {
    setExpandedTxIds((prev) => ({ ...prev, [refId]: !prev[refId] }));
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

  const handleBinaryNavigateBack = () => {
    if (binaryBreadcrumb.length <= 1) return;
    const parentCrumb = binaryBreadcrumb[binaryBreadcrumb.length - 2];
    handleInspectBinarySubtree(parentCrumb.memberId, parentCrumb.fullName);
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

  const navItems: {
    id: TabType | 'withdraw_action';
    label: string;
    icon: any;
    count?: number;
    isAction?: boolean;
    onClick?: () => void;
  }[] = [
      { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'membership', label: 'EV Booking Tiers', icon: Sparkles },
      { id: 'withdraw_action', label: 'Withdraw', icon: ArrowDownToLine, isAction: true, onClick: handleInitiateWithdrawal },
      { id: 'team', label: 'My Direct Team', icon: Users, count: directTeam?.directs?.length },
      { id: 'binary', label: 'My Binary Tree', icon: GitBranch },
      { id: 'wallets', label: 'Earnings Wallet', icon: Wallet },
      { id: 'vouchers', label: 'Shopping Vouchers', icon: Ticket, count: userVouchers.length },
      { id: 'bookings', label: 'My Bookings', icon: Bike, count: membershipRequests.length + userBookings.length },
      { id: 'profile', label: 'Profile', icon: User },
    ];

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#253247]">
      {/* =========================================================================
          TOP HEADER
          Features official ASKR EV branding, navigation, and user controls
          ========================================================================= */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Mobile trigger & ASKR EV Logo */}
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-slate-500 hover:text-[#253247] hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Toggle navigation"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <AskrLogo href="/dashboard" size="sm" />

              <span className="text-slate-300 hidden sm:inline">/</span>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs sm:text-sm text-[#253247] hidden sm:inline">Member Dashboard</span>
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
                  onClick={() => {
                    if (item.onClick) {
                      item.onClick();
                    } else if (item.id !== 'withdraw_action') {
                      setActiveTab(item.id as TabType);
                    }
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
                          setMobileMenuOpen(false);
                          if (item.onClick) {
                            item.onClick();
                          } else if (item.id !== 'withdraw_action') {
                            setActiveTab(item.id as TabType);
                          }
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
                  {!isStandalone && (
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleInstallApp();
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-gradient-to-r from-[#0C2348] to-[#165DAD] text-white text-xs font-semibold shadow hover:opacity-95 transition-opacity"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-200" />
                      <span>Install ASKR EV App</span>
                    </button>
                  )}
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
                {/* Dashboard-Only PWA Installation Banner (Mobile Only, Hidden if already installed) */}
                {!isStandalone && showInstallBanner && (
                  <div className="md:hidden bg-gradient-to-r from-[#0A1128] via-[#0C2348] to-[#165DAD] text-white p-3.5 rounded-2xl shadow-lg border border-blue-400/20 relative overflow-hidden">
                    <div className="flex items-center justify-between gap-3 relative z-10">
                      <div className="flex items-center gap-3">
                        <img
                          src="/brand/askrev-icon.webp"
                          alt="ASKR EV App"
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-xl object-contain shadow-xs border border-white/20 bg-white/5 shrink-0"
                        />
                        <div>
                          <div className="font-bold text-xs text-white flex items-center gap-1.5">
                            <span>Install ASKR EV App</span>
                            <span className="bg-blue-400/30 text-blue-200 text-[10px] px-1.5 py-0.5 rounded font-medium">PWA</span>
                          </div>
                          <p className="text-[11px] text-blue-100/90 leading-tight">Instant home screen access & standalone mode</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={handleInstallApp}
                          className="px-3 py-1.5 bg-white text-[#0A1128] font-bold text-xs rounded-xl shadow-xs hover:bg-blue-50 active:scale-95 transition-all flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5 text-[#165DAD]" />
                          <span>Install</span>
                        </button>
                        <button
                          onClick={handleDismissInstallBanner}
                          className="p-1.5 text-blue-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                          aria-label="Dismiss banner"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* =========================================================================
                    SECTION 4 — COMPACT PREMIUM WELCOME BACK CARD
                    ========================================================================= */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Welcome Context */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>Welcome back,</span>
                        <span className="font-bold text-[#0C2348] text-sm">{user.fullName}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        <h1 className="text-lg sm:text-xl font-black text-[#0C2348] tracking-tight">
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
                      </div>
                    </div>

                    {/* Prominent Book EV Button */}
                    <div className="flex items-center gap-2 shrink-0">
                      {user.isFullQualified || user.currentPackage === 'FULL' ? (
                        <div className="px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[#15803D] text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Qualified EV ULTRA Member</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedRequestType(
                              user.currentPackage === 'BASIC'
                                ? 'BASIC_TO_FULL_UPGRADE'
                                : 'BASIC_ACTIVATION'
                            );
                            setPaymentModalOpen(true);
                          }}
                          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#165DAD] to-[#1D4ED8] hover:from-[#12498a] hover:to-[#1742b6] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                        >
                          <Bike className="w-4 h-4" />
                          <span>{user.currentPackage === 'BASIC' ? 'Upgrade to ULTRA' : 'Book EV'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* =========================================================================
                    DESKTOP & MOBILE SPONSOR REFERRAL LINKS (REQUIREMENT 1)
                    Left & Right referral links with Copy, WhatsApp and Native Share
                    ========================================================================= */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Share2 className="w-4 h-4 text-[#165DAD]" />
                        <h3 className="text-sm font-bold text-[#253247]">Your Sponsor Referral Links</h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Share your direct referral link with new members to place them automatically in your Left or Right binary team.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="text-xs text-slate-500 font-medium">Sponsor ID:</span>
                      <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-blue-50 text-[#165DAD] border border-blue-200">
                        {user.memberId}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left Team Card */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-blue-200/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#165DAD]" />
                          <span className="text-xs font-bold text-[#0C2348] uppercase tracking-wide">LEFT Team Referral Link</span>
                        </div>
                        <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                          Left Subtree
                        </span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs font-mono text-slate-700 select-all truncate">
                        {getReferralLink('LEFT')}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyLink('LEFT')}
                          className="flex-1 py-2 px-3 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                        >
                          {copiedLeft ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-500" />
                              <span>Copy Link</span>
                            </>
                          )}
                        </button>
                        <a
                          href={getWhatsAppShareUrl('LEFT')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2 px-3 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                          title="Share via WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => handleShareLink('LEFT')}
                          className="py-2 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#165DAD] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-blue-200 shadow-2xs"
                          title="Share"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Share</span>
                        </button>
                      </div>
                    </div>

                    {/* Right Team Card */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-emerald-200/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#15803D]" />
                          <span className="text-xs font-bold text-[#0C2348] uppercase tracking-wide">RIGHT Team Referral Link</span>
                        </div>
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                          Right Subtree
                        </span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs font-mono text-slate-700 select-all truncate">
                        {getReferralLink('RIGHT')}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyLink('RIGHT')}
                          className="flex-1 py-2 px-3 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                        >
                          {copiedRight ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-500" />
                              <span>Copy Link</span>
                            </>
                          )}
                        </button>
                        <a
                          href={getWhatsAppShareUrl('RIGHT')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2 px-3 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                          title="Share via WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => handleShareLink('RIGHT')}
                          className="py-2 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#15803D] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-emerald-200 shadow-2xs"
                          title="Share"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Share</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* =========================================================================
                    SECTION 1 & 6 — PREMIUM GRADIENT EARNINGS CARDS (5 COORDINATED CARDS)
                    Order: Total Earnings, EV Crown Bonus, EV Royal Match, EV Legacy, EV Club Fund
                    ========================================================================= */}
                {(() => {
                  const totalEarnedINR = Number(walletOverview?.totalEarnedINR ?? user?.wallet?.totalEarnedINR ?? 0);
                  const royalMatchINR = Number(
                    walletOverview?.breakdown?.royalMatchINR ??
                    binaryTree?.node?.totalRewardEarnedINR ??
                    user?.binaryPlacement?.totalRewardEarnedINR ??
                    0
                  );
                  const crownBonusINR = Number(
                    walletOverview?.breakdown?.crownBonusINR ??
                    Math.max(0, totalEarnedINR - royalMatchINR)
                  );
                  const activeDirectsCount = Number(directTeam?.metrics?.totalActivatedDirects ?? 0);
                  const totalDirectsCount = Number(directTeam?.metrics?.totalDirects ?? 0);
                  const proDirectsCount = Number(
                    directTeam?.metrics?.totalProDirects ??
                    directTeam?.directs?.filter((d: any) => d.currentPackage === 'BASIC').length ??
                    0
                  );
                  const ultraDirectsCount = Number(
                    directTeam?.metrics?.totalUltraDirects ??
                    directTeam?.directs?.filter((d: any) => d.currentPackage === 'FULL').length ??
                    0
                  );

                  return (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                        {/* 1. Total Earnings: Deep Navy -> Royal Blue */}
                        <div className="col-span-2 lg:col-span-1 rounded-2xl p-5 bg-gradient-to-br from-[#0C2348] via-[#103062] to-[#1D4ED8] text-white shadow-md shadow-slate-900/10 border border-white/10 flex flex-col justify-between min-h-[148px] transition-transform duration-200 hover:-translate-y-0.5">
                          <div className="flex items-center justify-between text-white/80">
                            <span className="text-xs font-bold uppercase tracking-wider">Total Earnings</span>
                            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                              <Wallet className="w-4 h-4 text-white" />
                            </div>
                          </div>
                          <div className="my-2">
                            <div className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                              ₹{totalEarnedINR.toLocaleString('en-IN')}
                            </div>
                            <div className="text-[11px] text-blue-200/90 font-medium mt-0.5">
                              Lifetime Settled
                            </div>
                          </div>
                          <div className="text-[10px] text-white/60 font-medium">
                            Reconciled with Ledger
                          </div>
                        </div>

                        {/* 2. EV Crown Bonus: Royal Blue -> Electric Blue */}
                        <div className="rounded-2xl p-5 bg-gradient-to-br from-[#155EBA] via-[#1070C5] to-[#0891D2] text-white shadow-md shadow-blue-900/10 border border-white/10 flex flex-col justify-between min-h-[148px] transition-transform duration-200 hover:-translate-y-0.5">
                          <div className="flex items-center justify-between text-white/80">
                            <span className="text-xs font-bold uppercase tracking-wider">EV Crown Bonus</span>
                            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                              <Crown className="w-4 h-4 text-white" />
                            </div>
                          </div>
                          <div className="my-2">
                            <div className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                              ₹{crownBonusINR.toLocaleString('en-IN')}
                            </div>
                            <div className="text-[11px] text-cyan-100/90 font-medium mt-0.5">
                              Sponsor Direct
                            </div>
                          </div>
                          <div className="text-[10px] text-white/70 font-medium">
                            Direct Member Referrals
                          </div>
                        </div>

                        {/* 3. EV Royal Match: Teal Blue -> Emerald Teal */}
                        <div className="rounded-2xl p-5 bg-gradient-to-br from-[#087E8B] via-[#0B7A7C] to-[#0F766E] text-white shadow-md shadow-teal-900/10 border border-white/10 flex flex-col justify-between min-h-[148px] transition-transform duration-200 hover:-translate-y-0.5">
                          <div className="flex items-center justify-between text-white/80">
                            <span className="text-xs font-bold uppercase tracking-wider">EV Royal Match</span>
                            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                              <GitBranch className="w-4 h-4 text-white" />
                            </div>
                          </div>
                          <div className="my-2">
                            <div className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                              ₹{royalMatchINR.toLocaleString('en-IN')}
                            </div>
                            <div className="text-[11px] text-emerald-100/90 font-medium mt-0.5">
                              Matching Income
                            </div>
                          </div>
                          <div className="text-[10px] text-white/70 font-medium">
                            1:1 Pair Settlement
                          </div>
                        </div>

                        {/* 4. EV Legacy Income: Indigo -> Muted Violet */}
                        <div className="rounded-2xl p-5 bg-gradient-to-br from-[#354D9B] via-[#484A9F] to-[#6546A3] text-white shadow-md shadow-indigo-900/10 border border-white/10 flex flex-col justify-between min-h-[148px] transition-transform duration-200 hover:-translate-y-0.5">
                          <div className="flex items-center justify-between text-white/80">
                            <span className="text-xs font-bold uppercase tracking-wider">EV Legacy Income</span>
                            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                              <Layers className="w-4 h-4 text-white" />
                            </div>
                          </div>
                          <div className="my-2">
                            <div className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                              ₹0
                            </div>
                            <div className="text-[11px] text-purple-200/90 font-medium mt-0.5">
                              Level Income
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-purple-200/80">{Math.min(activeDirectsCount, 3)}/3 Active</span>
                            <span className="px-1.5 py-0.5 rounded bg-white/15 text-white font-bold text-[9px] uppercase">
                              {activeDirectsCount >= 3 ? 'Qualified' : 'Pending'}
                            </span>
                          </div>
                        </div>

                        {/* 5. EV Club Fund: Emerald Green -> Deep Teal */}
                        <div className="rounded-2xl p-5 bg-gradient-to-br from-[#126F61] via-[#0E5E4D] to-[#064E3B] text-white shadow-md shadow-emerald-900/10 border border-white/10 flex flex-col justify-between min-h-[148px] transition-transform duration-200 hover:-translate-y-0.5">
                          <div className="flex items-center justify-between text-white/80">
                            <span className="text-xs font-bold uppercase tracking-wider">EV Club Fund</span>
                            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                              <Globe className="w-4 h-4 text-white" />
                            </div>
                          </div>
                          <div className="my-2">
                            <div className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                              ₹0
                            </div>
                            <div className="text-[11px] text-teal-200/90 font-medium mt-0.5">
                              Leadership Pool
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-teal-200/80">Status</span>
                            <span className="px-1.5 py-0.5 rounded bg-white/15 text-white font-bold text-[9px] uppercase">
                              Leadership Pool
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* =========================================================================
                          SECTION 7 — QUALIFICATION & ELIGIBILITY METRICS
                          ========================================================================= */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* 1. EV Legacy Qualification Dynamic Card */}
                        <div className="bg-white rounded-2xl border-2 border-indigo-100 p-5 shadow-xs flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-indigo-900">
                              <span>EV Legacy Eligibility</span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 whitespace-nowrap shrink-0">
                                {Math.min(activeDirectsCount, 3)} / 3 Active
                              </span>
                            </div>
                            <div className="mt-2.5">
                              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all"
                                  style={{ width: `${Math.min(100, (activeDirectsCount / 3) * 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-100">
                            {activeDirectsCount >= 3
                              ? '✓ Qualified for EV Legacy Generation Income'
                              : `Need ${3 - activeDirectsCount} more active direct referral(s) to unlock.`}
                          </div>
                        </div>

                        {/* 2. Referral Summary */}
                        <div className="bg-white rounded-2xl border-2 border-blue-100 p-5 shadow-xs flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-blue-900">
                              <span>Referral Summary</span>
                              <Users className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="grid grid-cols-2 gap-3 mt-2">
                              <div>
                                <span className="text-[11px] text-slate-500 font-medium">Total</span>
                                <div className="text-xl font-black text-[#0C2348]">{totalDirectsCount}</div>
                              </div>
                              <div>
                                <span className="text-[11px] text-slate-500 font-medium">Active</span>
                                <div className="text-xl font-black text-emerald-600">{activeDirectsCount}</div>
                              </div>
                            </div>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-100">
                            {totalDirectsCount > 0
                              ? `${Math.round((activeDirectsCount / totalDirectsCount) * 100)}% activation rate`
                              : 'No direct referrals registered yet'}
                          </div>
                        </div>

                        {/* 3. Direct Package Counts (Requirement 5) */}
                        <div className="bg-white rounded-2xl border-2 border-cyan-100 p-5 shadow-xs flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-cyan-900">
                              <span>Direct Packages</span>
                              <Sparkles className="w-4 h-4 text-cyan-600" />
                            </div>
                            <div className="space-y-2 mt-2">
                              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                <span className="text-xs text-slate-600 font-medium">EV PRO (₹3k)</span>
                                <span className="text-base font-black text-[#165DAD]">{proDirectsCount}</span>
                              </div>
                              <div className="flex items-center justify-between py-1">
                                <span className="text-xs text-slate-600 font-medium">EV ULTRA (₹33k)</span>
                                <span className="text-base font-black text-purple-700">{ultraDirectsCount}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-100">
                            Based on approved membership packages
                          </div>
                        </div>

                        {/* 4. Binary Team Summary (Requirement 6) */}
                        <div className="bg-white rounded-2xl border-2 border-teal-100 p-5 shadow-xs flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-teal-900">
                              <span>Binary Team</span>
                              <GitBranch className="w-4 h-4 text-teal-600" />
                            </div>
                            <div className="grid grid-cols-2 gap-3 mt-2">
                              <div>
                                <span className="text-[11px] text-slate-500 font-medium">Left Team</span>
                                <div className="text-xl font-black text-[#165DAD]">{binaryTree?.node?.leftCount ?? 0}</div>
                              </div>
                              <div>
                                <span className="text-[11px] text-slate-500 font-medium">Right Team</span>
                                <div className="text-xl font-black text-emerald-600">{binaryTree?.node?.rightCount ?? 0}</div>
                              </div>
                            </div>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                            <span>Matched: <strong>{binaryTree?.node?.totalMatchesConsumed ?? 0}</strong> pairs</span>
                            <span className="font-semibold text-amber-700">Cap: {binaryTree?.node?.todayMatchesSettled ?? 0} / 15</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

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

                {/* =========================================================================
                    TASK 7 & REQUIREMENT 8 — RECENT DIRECT REFERRALS TABLE
                    Includes Member ID, Name, Membership Status, Joining Date in IST & My Team CTA
                    ========================================================================= */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[#253247]">Recent Direct Referrals</h3>
                    </div>
                    <button
                      onClick={() => setActiveTab('team')}
                      className="text-xs font-semibold text-[#165DAD] hover:underline flex items-center gap-1 min-h-[36px]"
                    >
                      <span>My Team</span>
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
                              <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                                {formatISTDateTime(d.createdAt)}
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
                {/* Sponsor Referral Links on My Team (Requirement 1) */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Share2 className="w-4 h-4 text-[#165DAD]" />
                        <h3 className="text-sm font-bold text-[#253247]">Your Sponsor Referral Links</h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Share your direct referral link with new members to place them automatically in your Left or Right binary team.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="text-xs text-slate-500 font-medium">Sponsor ID:</span>
                      <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-blue-50 text-[#165DAD] border border-blue-200">
                        {user.memberId}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left Team Card */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-blue-200/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#165DAD]" />
                          <span className="text-xs font-bold text-[#0C2348] uppercase tracking-wide">LEFT Team Referral Link</span>
                        </div>
                        <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                          Left Subtree
                        </span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs font-mono text-slate-700 select-all truncate">
                        {getReferralLink('LEFT')}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyLink('LEFT')}
                          className="flex-1 py-2 px-3 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                        >
                          {copiedLeft ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-500" />
                              <span>Copy Link</span>
                            </>
                          )}
                        </button>
                        <a
                          href={getWhatsAppShareUrl('LEFT')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2 px-3 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                          title="Share via WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => handleShareLink('LEFT')}
                          className="py-2 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#165DAD] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-blue-200 shadow-2xs"
                          title="Share"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Share</span>
                        </button>
                      </div>
                    </div>

                    {/* Right Team Card */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-emerald-200/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#15803D]" />
                          <span className="text-xs font-bold text-[#0C2348] uppercase tracking-wide">RIGHT Team Referral Link</span>
                        </div>
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                          Right Subtree
                        </span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs font-mono text-slate-700 select-all truncate">
                        {getReferralLink('RIGHT')}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyLink('RIGHT')}
                          className="flex-1 py-2 px-3 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                        >
                          {copiedRight ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-500" />
                              <span>Copy Link</span>
                            </>
                          )}
                        </button>
                        <a
                          href={getWhatsAppShareUrl('RIGHT')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2 px-3 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                          title="Share via WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => handleShareLink('RIGHT')}
                          className="py-2 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#15803D] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-emerald-200 shadow-2xs"
                          title="Share"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Share</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Metric Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm">
                    <div className="text-xs text-slate-500 font-medium">Total Direct Referrals</div>
                    <div className="text-2xl font-bold text-[#253247] mt-1">
                      {directTeam?.metrics?.totalDirects ?? 0}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm">
                    <div className="text-xs text-[#165DAD] font-medium">EV PRO Directs (₹3k)</div>
                    <div className="text-2xl font-bold text-[#165DAD] mt-1">
                      {directTeam?.metrics?.totalProDirects ?? 0}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm">
                    <div className="text-xs text-purple-700 font-medium">EV ULTRA Directs (₹33k)</div>
                    <div className="text-2xl font-bold text-purple-700 mt-1">
                      {directTeam?.metrics?.totalUltraDirects ?? 0}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm">
                    <div className="text-xs text-[#15803D] font-medium">Full Qualified Directs</div>
                    <div className="text-2xl font-bold text-[#15803D] mt-1">
                      {directTeam?.metrics?.totalFullQualifiedDirects ?? 0}
                    </div>
                  </div>
                </div>

                {/* Direct Team Table with Leg Filters */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-[#253247]">Direct Lineage & Placement Roster</h3>
                      <p className="text-xs text-slate-500">Members registered using your referral code and their binary placement</p>
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs font-semibold self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setTeamFilter('ALL')}
                        className={`px-3 py-1.5 rounded-md transition-colors ${teamFilter === 'ALL'
                          ? 'bg-white text-[#165DAD] shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                          }`}
                      >
                        ALL ({directTeam?.directs?.length ?? 0})
                      </button>
                      <button
                        type="button"
                        onClick={() => setTeamFilter('LEFT')}
                        className={`px-3 py-1.5 rounded-md transition-colors ${teamFilter === 'LEFT'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                          }`}
                      >
                        LEFT LEG ({(directTeam?.directs || []).filter((d: any) => d.placementLeg === 'LEFT').length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setTeamFilter('RIGHT')}
                        className={`px-3 py-1.5 rounded-md transition-colors ${teamFilter === 'RIGHT'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                          }`}
                      >
                        RIGHT LEG ({(directTeam?.directs || []).filter((d: any) => d.placementLeg === 'RIGHT').length})
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                        <tr>
                          <th className="py-3 px-4">Member Name</th>
                          <th className="py-3 px-4">Member ID</th>
                          <th className="py-3 px-4">Sponsor ID</th>
                          <th className="py-3 px-4">Placement Parent ID</th>
                          <th className="py-3 px-4">Placement Leg</th>
                          <th className="py-3 px-4">Package Tier</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Joined Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[#253247]">
                        {(() => {
                          const list = (directTeam?.directs || []).filter((d: any) => {
                            if (teamFilter === 'ALL') return true;
                            return d.placementLeg === teamFilter;
                          });

                          if (list.length === 0) {
                            return (
                              <tr>
                                <td colSpan={8} className="py-8 text-center text-slate-400">
                                  {teamFilter === 'ALL'
                                    ? 'No direct referrals found. Use your referral link to invite members.'
                                    : `No direct members placed on ${teamFilter} LEG.`}
                                </td>
                              </tr>
                            );
                          }

                          return list.map((d: any) => (
                            <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4 font-medium text-slate-900">{d.fullName}</td>
                              <td className="py-3 px-4 font-mono font-medium text-[#165DAD]">
                                {d.memberId}
                              </td>
                              <td className="py-3 px-4 font-mono text-slate-600">
                                {d.sponsorId || user.memberId}
                              </td>
                              <td className="py-3 px-4 font-mono text-slate-600">
                                {d.placementParentId ? (
                                  <span>{d.placementParentId}</span>
                                ) : (
                                  <span className="text-slate-400 italic">Pending Placement</span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                {d.placementLeg === 'LEFT' ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                    LEFT LEG
                                  </span>
                                ) : d.placementLeg === 'RIGHT' ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    RIGHT LEG
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
                                    Unassigned
                                  </span>
                                )}
                              </td>
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
                                {d.status === 'ACTIVE' || d.currentPackage === 'BASIC' || d.currentPackage === 'FULL' ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    Active
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-1 w-fit">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                    Inactive
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                                {formatISTDateTime(d.createdAt)}
                              </td>
                            </tr>
                          ));
                        })()}
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
                {/* Header & Clean Placement Status Banner */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-[#253247] flex items-center gap-2">
                      <GitBranch className="w-5 h-5 text-[#165DAD]" />
                      <span>Binary Matching Tree</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Track left and right leg placement, carry units, and daily 1:1 matched pairs
                    </p>
                  </div>
                  <span
                    className={`self-start sm:self-auto text-xs font-semibold px-3 py-1 rounded-full border ${binaryTree?.node?.isPlaced
                      ? 'bg-emerald-50 text-[#15803D] border-emerald-200'
                      : user?.role === 'SUPER_ADMIN'
                        ? 'bg-blue-50 text-[#165DAD] border-blue-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                  >
                    {binaryTree?.node?.isPlaced
                      ? `Placed (${binaryTree.node.parent?.leg || 'Assigned'} Leg)`
                      : user?.role === 'SUPER_ADMIN'
                        ? 'Company Binary Root'
                        : 'Pending Placement'}
                  </span>
                </div>

                {/* 4 Compact Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm">
                    <span className="text-xs font-semibold uppercase text-slate-400">Left Carry</span>
                    <div className="text-2xl font-bold text-[#165DAD] mt-1">
                      {binaryTree?.node?.carryLeftUnits ?? 0} <span className="text-xs font-medium text-slate-500">Units</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Team: {binaryTree?.node?.leftCount ?? 0} • Volume: {binaryTree?.node?.leftVolumeUnits ?? 0}u
                    </p>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm">
                    <span className="text-xs font-semibold uppercase text-slate-400">Right Carry</span>
                    <div className="text-2xl font-bold text-[#15803D] mt-1">
                      {binaryTree?.node?.carryRightUnits ?? 0} <span className="text-xs font-medium text-slate-500">Units</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Team: {binaryTree?.node?.rightCount ?? 0} • Volume: {binaryTree?.node?.rightVolumeUnits ?? 0}u
                    </p>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm">
                    <span className="text-xs font-semibold uppercase text-slate-400">Total Matches</span>
                    <div className="text-2xl font-bold text-[#253247] mt-1">
                      {binaryTree?.node?.totalMatchesConsumed ?? 0} <span className="text-xs font-medium text-slate-500">Pairs</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Reward: ₹{(binaryTree?.node?.totalRewardEarnedINR ?? 0).toLocaleString('en-IN')}
                    </p>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm">
                    <span className="text-xs font-semibold uppercase text-slate-400">Daily Cap (IST)</span>
                    <div className="text-2xl font-bold text-amber-700 mt-1">
                      {binaryTree?.node?.todayMatchesSettled ?? 0} / {binaryTree?.node?.dailyMaxMatches ?? 15}
                    </div>
                    <p className="text-xs text-emerald-700 font-medium mt-1">
                      Remaining: {binaryTree?.node?.dailyCapRemaining ?? 15} pairs
                    </p>
                  </div>
                </div>

                {/* Graphical Binary Tree Visualizer with Visible Connector Lines */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-[#253247]">Graphical Binary Downline</h3>
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

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      {binaryBreadcrumb.length > 1 && (
                        <button
                          type="button"
                          onClick={handleBinaryNavigateBack}
                          className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1 shadow-2xs"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>Back</span>
                        </button>
                      )}
                      {binaryBreadcrumb.length > 1 && user?.memberId && (
                        <button
                          type="button"
                          onClick={() => handleInspectBinarySubtree(user.memberId, user.fullName || 'Me', true)}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
                        >
                          Reset to Root
                        </button>
                      )}
                    </div>
                  </div>

                  {binaryTreeError && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                      {binaryTreeError}
                    </div>
                  )}

                  {loadingBinarySubtree ? (
                    <div className="py-12 text-center text-xs text-slate-500">Loading binary subtree...</div>
                  ) : inspectedBinaryTree?.node ? (
                    <div className="overflow-x-auto pb-4">
                      <div className="min-w-[680px] flex flex-col items-center">
                        {/* Parent Node (Top of Tree) */}
                        <div className="w-64 bg-slate-50 border-2 border-[#165DAD] rounded-xl p-3.5 shadow-sm text-center relative z-10">
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#165DAD] text-white uppercase">
                              {inspectedBinaryTree.node.user.memberId === user.memberId ? 'You (Root)' : 'Subtree Root'}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[9px] font-semibold bg-white text-[#253247] border border-slate-200">
                              {getTierDisplayName(inspectedBinaryTree.node.user.currentPackage)}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-semibold ${inspectedBinaryTree.node.user.isFullQualified
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                              {inspectedBinaryTree.node.user.isFullQualified ? 'Active' : 'Pending'}
                            </span>
                          </div>
                          <div className="font-bold text-xs text-[#253247] mt-1.5 truncate">
                            {inspectedBinaryTree.node.user.fullName}
                          </div>
                          <div className="text-[11px] font-mono font-bold text-[#165DAD]">
                            {inspectedBinaryTree.node.user.memberId}
                          </div>
                          <div className="mt-2 pt-2 border-t border-slate-200 grid grid-cols-2 gap-1 text-[10px]">
                            <div className="text-blue-700 font-medium">
                              L: {inspectedBinaryTree.node.leftCount} ({inspectedBinaryTree.node.carryLeftUnits}u carry)
                            </div>
                            <div className="text-emerald-700 font-medium">
                              R: {inspectedBinaryTree.node.rightCount} ({inspectedBinaryTree.node.carryRightUnits}u carry)
                            </div>
                          </div>
                        </div>

                        {/* Root-to-Level 1 Connecting Lines */}
                        <div className="w-full max-w-[480px] h-8 relative flex justify-center">
                          <div className="w-0.5 h-4 bg-slate-300" />
                          <div className="absolute top-4 left-[25%] right-[25%] h-0.5 bg-slate-300" />
                          <div className="absolute top-4 left-[25%] w-0.5 h-4 bg-slate-300" />
                          <div className="absolute top-4 right-[25%] w-0.5 h-4 bg-slate-300" />
                        </div>

                        {/* Level 1: Left & Right Branches */}
                        <div className="grid grid-cols-2 gap-8 w-full max-w-[680px]">
                          {/* LEFT BRANCH */}
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1">
                              LEFT BRANCH
                            </span>
                            {inspectedBinaryTree.leftChild ? (
                              <div className="w-full bg-white border border-blue-200 hover:border-blue-400 rounded-xl shadow-xs transition-all overflow-hidden space-y-0">
                                <button
                                  type="button"
                                  onClick={() => handleInspectBinarySubtree(inspectedBinaryTree.leftChild.memberId, inspectedBinaryTree.leftChild.fullName)}
                                  className="w-full text-left p-3.5 space-y-2 focus:outline-none focus:ring-2 focus:ring-blue-400 group cursor-pointer transition-colors hover:bg-blue-50/30"
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-bold text-xs text-[#253247] truncate group-hover:text-[#165DAD] transition-colors">
                                      {inspectedBinaryTree.leftChild.fullName}
                                    </span>
                                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                                      {getTierDisplayName(inspectedBinaryTree.leftChild.currentPackage)}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-mono font-bold text-blue-700">
                                      {inspectedBinaryTree.leftChild.memberId}
                                    </span>
                                    {inspectedBinaryTree.leftChild.isFullQualified && (
                                      <span className="text-[9px] text-[#15803D] font-semibold flex items-center gap-0.5">
                                        <Check className="w-2.5 h-2.5" /> Qualified
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1.5 border-t border-slate-100">
                                    <span>Team: {inspectedBinaryTree.leftChild.leftCount ?? 0}L : {inspectedBinaryTree.leftChild.rightCount ?? 0}R</span>
                                    <span className="text-[10px] font-semibold text-blue-600 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                                      <span>Tap to open</span>
                                      <ChevronRight className="w-3 h-3" />
                                    </span>
                                  </div>
                                </button>

                                {/* Level 2 Slots Under Left Child */}
                                <div className="p-3 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 bg-slate-50/50">
                                  {inspectedBinaryTree.leftChild.leftChild ? (
                                    <button
                                      type="button"
                                      onClick={() => handleInspectBinarySubtree(inspectedBinaryTree.leftChild.leftChild.memberId, inspectedBinaryTree.leftChild.leftChild.fullName)}
                                      className="p-2 rounded-lg bg-blue-50/60 border border-blue-100 text-left hover:border-blue-300 transition-colors cursor-pointer group"
                                    >
                                      <div className="text-[8px] font-bold text-blue-600 uppercase">LEFT SLOT</div>
                                      <div className="text-[10px] font-bold text-[#253247] truncate group-hover:text-blue-700">{inspectedBinaryTree.leftChild.leftChild.fullName}</div>
                                      <div className="text-[9px] font-mono text-blue-700">{inspectedBinaryTree.leftChild.leftChild.memberId}</div>
                                    </button>
                                  ) : (
                                    <div className="p-2 rounded-lg bg-white border border-dashed border-slate-200 text-center text-[9px] text-slate-400">
                                      Vacant Left
                                    </div>
                                  )}

                                  {inspectedBinaryTree.leftChild.rightChild ? (
                                    <button
                                      type="button"
                                      onClick={() => handleInspectBinarySubtree(inspectedBinaryTree.leftChild.rightChild.memberId, inspectedBinaryTree.leftChild.rightChild.fullName)}
                                      className="p-2 rounded-lg bg-blue-50/60 border border-blue-100 text-left hover:border-blue-300 transition-colors cursor-pointer group"
                                    >
                                      <div className="text-[8px] font-bold text-blue-600 uppercase">RIGHT SLOT</div>
                                      <div className="text-[10px] font-bold text-[#253247] truncate group-hover:text-blue-700">{inspectedBinaryTree.leftChild.rightChild.fullName}</div>
                                      <div className="text-[9px] font-mono text-blue-700">{inspectedBinaryTree.leftChild.rightChild.memberId}</div>
                                    </button>
                                  ) : (
                                    <div className="p-2 rounded-lg bg-white border border-dashed border-slate-200 text-center text-[9px] text-slate-400">
                                      Vacant Right
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="w-full p-6 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-2">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vacant Left Branch</div>
                                <p className="text-[11px] text-slate-500">No member placed on Left leg yet.</p>
                                <button
                                  type="button"
                                  onClick={() => handleCopyLink('LEFT')}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:text-[#165DAD] hover:border-blue-300 transition-colors shadow-2xs"
                                >
                                  <Copy className="w-3 h-3" />
                                  <span>Copy Left Link</span>
                                </button>
                              </div>
                            )}
                          </div>

                          {/* RIGHT BRANCH */}
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1">
                              RIGHT BRANCH
                            </span>
                            {inspectedBinaryTree.rightChild ? (
                              <div className="w-full bg-white border border-emerald-200 hover:border-emerald-400 rounded-xl shadow-xs transition-all overflow-hidden space-y-0">
                                <button
                                  type="button"
                                  onClick={() => handleInspectBinarySubtree(inspectedBinaryTree.rightChild.memberId, inspectedBinaryTree.rightChild.fullName)}
                                  className="w-full text-left p-3.5 space-y-2 focus:outline-none focus:ring-2 focus:ring-emerald-400 group cursor-pointer transition-colors hover:bg-emerald-50/30"
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-bold text-xs text-[#253247] truncate group-hover:text-emerald-700 transition-colors">
                                      {inspectedBinaryTree.rightChild.fullName}
                                    </span>
                                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                      {getTierDisplayName(inspectedBinaryTree.rightChild.currentPackage)}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-mono font-bold text-emerald-700">
                                      {inspectedBinaryTree.rightChild.memberId}
                                    </span>
                                    {inspectedBinaryTree.rightChild.isFullQualified && (
                                      <span className="text-[9px] text-[#15803D] font-semibold flex items-center gap-0.5">
                                        <Check className="w-2.5 h-2.5" /> Qualified
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1.5 border-t border-slate-100">
                                    <span>Team: {inspectedBinaryTree.rightChild.leftCount ?? 0}L : {inspectedBinaryTree.rightChild.rightCount ?? 0}R</span>
                                    <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                                      <span>Tap to open</span>
                                      <ChevronRight className="w-3 h-3" />
                                    </span>
                                  </div>
                                </button>

                                {/* Level 2 Slots Under Right Child */}
                                <div className="p-3 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 bg-slate-50/50">
                                  {inspectedBinaryTree.rightChild.leftChild ? (
                                    <button
                                      type="button"
                                      onClick={() => handleInspectBinarySubtree(inspectedBinaryTree.rightChild.leftChild.memberId, inspectedBinaryTree.rightChild.leftChild.fullName)}
                                      className="p-2 rounded-lg bg-emerald-50/60 border border-emerald-100 text-left hover:border-emerald-300 transition-colors cursor-pointer group"
                                    >
                                      <div className="text-[8px] font-bold text-emerald-600 uppercase">LEFT SLOT</div>
                                      <div className="text-[10px] font-bold text-[#253247] truncate group-hover:text-emerald-700">{inspectedBinaryTree.rightChild.leftChild.fullName}</div>
                                      <div className="text-[9px] font-mono text-emerald-700">{inspectedBinaryTree.rightChild.leftChild.memberId}</div>
                                    </button>
                                  ) : (
                                    <div className="p-2 rounded-lg bg-white border border-dashed border-slate-200 text-center text-[9px] text-slate-400">
                                      Vacant Left
                                    </div>
                                  )}

                                  {inspectedBinaryTree.rightChild.rightChild ? (
                                    <button
                                      type="button"
                                      onClick={() => handleInspectBinarySubtree(inspectedBinaryTree.rightChild.rightChild.memberId, inspectedBinaryTree.rightChild.rightChild.fullName)}
                                      className="p-2 rounded-lg bg-emerald-50/60 border border-emerald-100 text-left hover:border-emerald-300 transition-colors cursor-pointer group"
                                    >
                                      <div className="text-[8px] font-bold text-emerald-600 uppercase">RIGHT SLOT</div>
                                      <div className="text-[10px] font-bold text-[#253247] truncate group-hover:text-emerald-700">{inspectedBinaryTree.rightChild.rightChild.fullName}</div>
                                      <div className="text-[9px] font-mono text-emerald-700">{inspectedBinaryTree.rightChild.rightChild.memberId}</div>
                                    </button>
                                  ) : (
                                    <div className="p-2 rounded-lg bg-white border border-dashed border-slate-200 text-center text-[9px] text-slate-400">
                                      Vacant Right
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="w-full p-6 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-2">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vacant Right Branch</div>
                                <p className="text-[11px] text-slate-500">No member placed on Right leg yet.</p>
                                <button
                                  type="button"
                                  onClick={() => handleCopyLink('RIGHT')}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:text-[#15803D] hover:border-emerald-300 transition-colors shadow-2xs"
                                >
                                  <Copy className="w-3 h-3" />
                                  <span>Copy Right Link</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
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
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-semibold uppercase text-slate-400">
                        Available Balance
                      </span>
                      <div className="text-2xl font-bold text-[#15803D] mt-2">
                        ₹{(walletOverview?.availableEarningsINR ?? user.wallet?.availableEarningsINR ?? 0).toLocaleString('en-IN')}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Authoritative ledger balance ready for withdrawal clearance.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleInitiateWithdrawal}
                      className="mt-4 w-full py-2.5 px-4 bg-[#15803D] hover:bg-[#126F61] text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors min-h-[44px]"
                    >
                      <ArrowDownToLine className="w-4 h-4" />
                      <span>Withdraw Earnings</span>
                    </button>
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

                {/* Authoritative Wallet Ledger Transactions Table with Clean Rows & Expandable Details */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[#253247]">Authoritative Wallet Transactions</h3>
                      <p className="text-xs text-slate-500">Double-entry accounting journal entries associated with your wallet</p>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">{walletTransactions.length} Total</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                        <tr>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4">Income Type</th>
                          <th className="py-3 px-4">Amount</th>
                          <th className="py-3 px-4">Source Member ID</th>
                          <th className="py-3 px-4">Short Description</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-center">Technical Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[#253247]">
                        {walletTransactions.length > 0 ? (
                          walletTransactions.map((tx: any) => {
                            const isExpanded = Boolean(expandedTxIds[tx.id || tx.referenceId]);
                            const incomeTypeDisplay =
                              tx.transactionType === 'BINARY_MATCH'
                                ? 'EV Royal Match'
                                : tx.transactionType === 'DIRECT_SPONSOR'
                                  ? 'EV Crown Bonus'
                                  : tx.transactionType === 'VOUCHER_ALLOCATION'
                                    ? 'Shopping Voucher'
                                    : tx.transactionType;

                            return (
                              <React.Fragment key={tx.id || tx.referenceId}>
                                <tr className="hover:bg-slate-50/80 transition-colors">
                                  <td className="py-3 px-4 text-slate-600 font-medium">
                                    {new Date(tx.date).toLocaleDateString('en-IN')}
                                  </td>
                                  <td className="py-3 px-4 font-semibold text-slate-900">
                                    {incomeTypeDisplay}
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
                                  <td className="py-3 px-4 font-mono text-slate-600">
                                    {tx.sourceMemberId || tx.referenceUserMemberId || '—'}
                                  </td>
                                  <td className="py-3 px-4 text-slate-700 max-w-xs truncate">
                                    {tx.description}
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-[#15803D] border border-emerald-200">
                                      Completed (Simulation)
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <button
                                      type="button"
                                      onClick={() => toggleTxExpanded(tx.id || tx.referenceId)}
                                      className="px-2.5 py-1 text-[11px] font-medium text-[#165DAD] hover:bg-blue-50 rounded border border-blue-200 transition-colors"
                                    >
                                      {isExpanded ? 'Hide Details' : 'View Details'}
                                    </button>
                                  </td>
                                </tr>
                                {isExpanded && (
                                  <tr className="bg-slate-50/90 text-slate-600 border-b border-slate-200">
                                    <td colSpan={7} className="px-4 py-3">
                                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                                        <div>
                                          <span className="text-slate-400 uppercase text-[9px] font-bold block">Reference ID</span>
                                          <span className="font-mono text-slate-800 break-all">{tx.referenceId}</span>
                                        </div>
                                        <div>
                                          <span className="text-slate-400 uppercase text-[9px] font-bold block">Journal ID</span>
                                          <span className="font-mono text-slate-800 break-all">{tx.journalId || 'N/A'}</span>
                                        </div>
                                        <div>
                                          <span className="text-slate-400 uppercase text-[9px] font-bold block">Ledger Account</span>
                                          <span className="font-mono text-slate-800">{tx.ledgerAccount || 'EARNINGS_WALLET'}</span>
                                        </div>
                                        <div>
                                          <span className="text-slate-400 uppercase text-[9px] font-bold block">Accounting Type</span>
                                          <span className="font-semibold text-slate-800">{tx.isCredit ? 'CREDIT' : 'DEBIT'}</span>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-400">
                              No wallet transactions found. Refer members or complete binary matches to earn commissions.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Withdrawal Request & Compliance Safeguard Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-[#253247]">Withdrawal Request & Clearance</h3>
                      <p className="text-xs text-slate-500">Payout processing status and compliance threshold verification</p>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-semibold self-start">
                      Compliance Simulation Mode
                    </span>
                  </div>

                  <div className="p-4 rounded-lg bg-[#F7F9FC] border border-slate-200 text-xs text-slate-600 space-y-2">
                    <div>
                      <strong>Email Verification Requirement:</strong>{' '}
                      {Boolean(walletOverview?.isEmailVerified ?? user.isEmailVerified) ? (
                        <span className="text-emerald-700 font-semibold">Verified</span>
                      ) : (
                        <span className="text-amber-700 font-semibold">Verification Required Before Payout</span>
                      )}
                    </div>
                    <div>
                      <strong>Compliance Notice:</strong> In compliance simulation mode, payouts are simulated and live bank debits or wire transfers are strictly disabled until supervisory admin clearance.
                    </div>
                    <div>Minimum withdrawal threshold: ₹1,000. Maximum processing window: 24-48 business hours.</div>
                  </div>

                  <button
                    type="button"
                    onClick={handleInitiateWithdrawal}
                    className="px-5 py-2.5 rounded-lg bg-[#165DAD] hover:bg-[#12498a] text-white font-medium text-xs flex items-center gap-2 transition-colors min-h-[44px]"
                  >
                    <ArrowDownToLine className="w-4 h-4" />
                    <span>Request Withdrawal</span>
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

            {/* TAB 6: MY EV BOOKINGS & PAYMENT HISTORY (REQUIREMENT 11) */}
            {activeTab === 'bookings' && (
              <div className="space-y-6">
                {/* 1. PRIMARY SECTION: MEMBERSHIP BOOKING & UPGRADE PAYMENT HISTORY */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-slate-200">
                    <h3 className="text-sm font-bold text-[#253247]">EV Booking & Membership Payment History</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Record of your EV PRO / EV ULTRA bookings, upgrade payments, UTR submissions, and administrative verification status.
                    </p>
                  </div>

                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                        <tr>
                          <th className="py-3 px-4">Date & Time</th>
                          <th className="py-3 px-4">Booking Type</th>
                          <th className="py-3 px-4">Package / Tier</th>
                          <th className="py-3 px-4">Amount</th>
                          <th className="py-3 px-4">Payment Method</th>
                          <th className="py-3 px-4">UTR / Reference</th>
                          <th className="py-3 px-4">Verification</th>
                          <th className="py-3 px-4">Approval Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[#253247]">
                        {membershipRequests.length > 0 ? (
                          membershipRequests.map((req: any) => {
                            const amountFormatted =
                              req.requestType === 'BASIC_ACTIVATION'
                                ? '₹3,000'
                                : req.requestType === 'FULL_ACTIVATION'
                                  ? '₹33,000'
                                  : '₹30,000';
                            const bookingTypeLabel =
                              req.requestType === 'BASIC_ACTIVATION'
                                ? 'EV PRO Booking'
                                : req.requestType === 'FULL_ACTIVATION'
                                  ? 'EV ULTRA Booking'
                                  : 'EV ULTRA Upgrade';
                            const tierBadge =
                              req.packageCode === 'BASIC' || req.requestType === 'BASIC_ACTIVATION'
                                ? 'bg-emerald-50 text-[#15803D] border-emerald-200'
                                : 'bg-purple-50 text-purple-700 border-purple-200';
                            return (
                              <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                                  {formatISTDateTime(req.createdAt)}
                                </td>
                                <td className="py-3 px-4 font-bold text-[#0C2348]">
                                  {bookingTypeLabel}
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${tierBadge}`}>
                                    {req.packageCode === 'BASIC' || req.requestType === 'BASIC_ACTIVATION' ? 'EV PRO' : 'EV ULTRA'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 font-black text-[#165DAD]">
                                  {amountFormatted}
                                </td>
                                <td className="py-3 px-4">
                                  <span className="font-semibold text-slate-700">
                                    {req.paymentMode || 'UPI Manual'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                                  {req.paymentReference || '—'}
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${req.isVerified ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                    {req.isVerified ? 'VERIFIED' : 'PENDING'}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${req.status === 'APPROVED' ? 'bg-emerald-50 text-[#15803D] border-emerald-200' : req.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
                                    {req.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-slate-400">
                              No EV booking requests found. You can book an EV package anytime.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden divide-y divide-slate-100">
                    {membershipRequests.length > 0 ? (
                      membershipRequests.map((req: any) => {
                        const amountFormatted =
                          req.requestType === 'BASIC_ACTIVATION'
                            ? '₹3,000'
                            : req.requestType === 'FULL_ACTIVATION'
                              ? '₹33,000'
                              : '₹30,000';
                        const bookingTypeLabel =
                          req.requestType === 'BASIC_ACTIVATION'
                            ? 'EV PRO Booking'
                            : req.requestType === 'FULL_ACTIVATION'
                              ? 'EV ULTRA Booking'
                              : 'EV ULTRA Upgrade';
                        return (
                          <div key={req.id} className="p-4 space-y-2.5 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[#0C2348] text-sm">{bookingTypeLabel}</span>
                              <span className="font-black text-[#165DAD] text-sm">{amountFormatted}</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-500">
                              <span>{formatISTDateTime(req.createdAt)}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${req.status === 'APPROVED' ? 'bg-emerald-50 text-[#15803D] border-emerald-200' : req.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
                                {req.status}
                              </span>
                            </div>
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                              <span>Mode: <strong>{req.paymentMode || 'UPI'}</strong></span>
                              <span className="font-mono">UTR: <strong>{req.paymentReference || '—'}</strong></span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-6 text-center text-slate-400 text-xs">
                        No EV booking requests found.
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. SECONDARY SECTION: VEHICLE FLEET RESERVATIONS (WITHOUT BROWSE FLEET) */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-slate-200">
                    <h3 className="text-sm font-bold text-[#253247]">EV Vehicle Fleet Reservations</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Simulated booking deposits, vehicle orders and cancellation management (SIMULATION_ONLY)</p>
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
                                <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                                  {formatISTDateTime(b.createdAt)}
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

          </main>
        </div>
      </div>

      {/* =========================================================================
          MOBILE BOTTOM NAVIGATION BAR (REQUIREMENT 12)
          Fixed 5-item bar: HOME | EARNINGS | WALLET | BINARY | MENU
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
          onClick={() => setActiveTab('wallets')}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-semibold transition-colors ${activeTab === 'wallets' ? 'text-[#165DAD]' : 'text-slate-500 hover:text-slate-700'
            }`}
        >
          <Crown className={`w-5 h-5 mb-0.5 ${activeTab === 'wallets' ? 'text-[#165DAD]' : 'text-slate-400'}`} />
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
          onClick={() => setActiveTab('binary')}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-semibold transition-colors ${activeTab === 'binary' ? 'text-[#165DAD]' : 'text-slate-500 hover:text-slate-700'
            }`}
        >
          <GitBranch className={`w-5 h-5 mb-0.5 ${activeTab === 'binary' ? 'text-[#165DAD]' : 'text-slate-400'}`} />
          <span>Binary</span>
        </button>

        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-semibold text-slate-500 hover:text-[#165DAD] transition-colors"
        >
          <Menu className="w-5 h-5 mb-0.5 text-slate-400" />
          <span>Menu</span>
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

            {/* QUALIFIED NOTICE IF ALREADY FULL QUALIFIED */}
            {(user.isFullQualified || user.currentPackage === 'FULL') ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <div className="font-bold text-[#15803D] text-sm">Qualified EV ULTRA Member</div>
                <p className="text-xs text-slate-600">
                  Your account is fully activated with max tier privileges and ₹30,000 vehicle shopping voucher credit. No additional membership booking is required.
                </p>
              </div>
            ) : (
              <>
                {/* PENDING BOOKING WARNING IF ANY */}
                {membershipRequests.some((r) => r.status === 'PENDING') && (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>
                      You already have a booking request pending admin verification. New submissions are disabled until your current request is resolved.
                    </span>
                  </div>
                )}

                {/* TIER SELECTION TOGGLE FOR FREE USERS (REQUIREMENT 3) */}
                {user.currentPackage === 'FREE' && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#253247]">Select Booking Package</label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setSelectedRequestType('BASIC_ACTIVATION')}
                        className={`p-3 rounded-xl border text-left transition-all ${selectedRequestType === 'BASIC_ACTIVATION'
                          ? 'border-[#165DAD] bg-blue-50/70 text-[#165DAD] ring-1 ring-[#165DAD]'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                          }`}
                      >
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#165DAD]">Starter Tier</div>
                        <div className="text-sm font-bold text-[#0C2348] mt-0.5">EV PRO</div>
                        <div className="text-base font-black text-[#165DAD] mt-1">₹3,000</div>
                        <div className="text-[10px] text-slate-500 mt-1">Direct referral rewards eligible</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedRequestType('FULL_ACTIVATION')}
                        className={`p-3 rounded-xl border text-left transition-all ${selectedRequestType === 'FULL_ACTIVATION'
                          ? 'border-purple-600 bg-purple-50/70 text-purple-700 ring-1 ring-purple-600'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                          }`}
                      >
                        <div className="text-[10px] font-bold uppercase tracking-wider text-purple-700">Full Qualified Tier</div>
                        <div className="text-sm font-bold text-[#0C2348] mt-0.5">EV ULTRA</div>
                        <div className="text-base font-black text-purple-700 mt-1">₹33,000</div>
                        <div className="text-[10px] text-slate-500 mt-1">₹30k voucher + 1:1 binary rewards</div>
                      </button>
                    </div>
                  </div>
                )}

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
                      : selectedRequestType === 'FULL_ACTIVATION'
                        ? 'Includes ₹30,000 vehicle shopping voucher credit towards bike reservations and fully qualifies for 1:1 binary matching (₹3,000/pair).'
                        : 'Upgrade from EV PRO to EV ULTRA. Includes ₹30,000 vehicle shopping voucher credit and full binary matching qualification.'}
                  </p>
                </div>
              </>
            )}

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#253247]">Select Payment Mode</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {(paymentMethods?.gateways && paymentMethods.gateways.length > 0) && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('GATEWAY')}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${paymentMethod === 'GATEWAY'
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

                <button
                  type="button"
                  onClick={() => setPaymentMethod('UPI')}
                  className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${paymentMethod === 'UPI'
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
              </div>

              {/* Notice if neither UPI nor Gateway is available */}
              {!(paymentMethods?.gateways && paymentMethods.gateways.length > 0) &&
                !(Boolean(
                  (paymentMethods?.upi?.enabled && paymentMethods?.upi?.merchantUpiVpa) ||
                  (paymentMethods?.upi?.isEnabled && paymentMethods?.upi?.merchantUpiVpa) ||
                  (paymentConfig?.isConfigured && paymentConfig?.merchantUpiVpa)
                )) && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Online booking payments are currently undergoing maintenance. Please contact support.</span>
                  </div>
                )}
            </div>

            {/* Payment Method Details */}
            {paymentMethod === 'GATEWAY' ? (
              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-4 text-xs">
                {/* Gateway Provider Selection (if multiple enabled) */}
                {paymentMethods?.gateways && paymentMethods.gateways.length > 1 && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Select Online Gateway Provider
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {paymentMethods.gateways.map((gw) => {
                        const isSelected = selectedGatewayProvider === gw.provider;
                        const isPrimary = gw.provider === 'PINELABS';
                        return (
                          <button
                            key={gw.provider}
                            type="button"
                            onClick={() => {
                              setSelectedGatewayProvider(gw.provider);
                              setGatewayOrder(null);
                            }}
                            className={`p-2.5 rounded-lg border text-left transition-all ${isSelected
                              ? 'border-[#165DAD] bg-white ring-1 ring-[#165DAD] shadow-xs'
                              : 'border-slate-200 bg-white/70 hover:bg-white'
                              }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[#253247]">{gw.displayName || gw.name || gw.provider}</span>
                              {isPrimary && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-[#165DAD]">
                                  PRIMARY
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500">
                              {gw.isSandbox ? 'Sandbox Mode' : 'Live Production'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-[#165DAD]" />
                    <span className="font-bold text-[#253247]">
                      {selectedGatewayProvider === 'PINELABS'
                        ? 'Pine Labs (Plural) Payment Gateway'
                        : selectedGatewayProvider === 'RAZORPAY'
                          ? 'Razorpay Secure Checkout'
                          : 'Online Payment Gateway'}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-[#165DAD] border border-blue-200">
                    {paymentMethods?.gateways?.find((g) => g.provider === selectedGatewayProvider)?.isSandbox
                      ? 'Sandbox Mode'
                      : 'Production'}
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
                    {selectedGatewayProvider === 'PINELABS'
                      ? 'Official Primary Gateway: Instant processing via UPI, Credit/Debit Cards, NetBanking, and Wallets on Pine Labs Plural.'
                      : 'Seamless online payment via Cards, UPI, NetBanking, and Wallets.'}
                  </p>
                </div>

                {gatewayOrder ? (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-emerald-800 text-xs">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Order Created Successfully</span>
                    </div>
                    <div className="text-[11px] text-emerald-700 font-mono">
                      Order Reference: <strong>{gatewayOrder.orderId}</strong>
                    </div>
                    {gatewayOrder.clientPayload?.redirectUrl && (
                      <div className="pt-1">
                        <a
                          href={gatewayOrder.clientPayload.redirectUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#165DAD] underline hover:text-[#12498a]"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open Pine Labs Hosted Payment Page</span>
                        </a>
                      </div>
                    )}
                    <p className="text-[10px] text-emerald-600">
                      After completing payment on the gateway page, click below to confirm your booking for audit reconciliation.
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
                      {isProcessingGateway
                        ? 'Connecting to Gateway...'
                        : selectedGatewayProvider === 'PINELABS'
                          ? 'Pay Online via Pine Labs (Primary)'
                          : 'Pay Online via Gateway'}
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
              Boolean(
                (paymentMethods?.upi?.enabled && paymentMethods?.upi?.merchantUpiVpa) ||
                (paymentMethods?.upi?.isEnabled && paymentMethods?.upi?.merchantUpiVpa) ||
                (paymentConfig?.isConfigured && paymentConfig?.merchantUpiVpa)
              ) && (paymentMethods?.upi?.merchantUpiVpa || paymentConfig?.merchantUpiVpa) ? (
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
                          {paymentMethods?.upi?.merchantUpiVpa || paymentConfig?.merchantUpiVpa}
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
                        Payee: <strong>{paymentMethods?.upi?.merchantName || paymentConfig?.merchantName || 'ASKR EV Mobility'}</strong>
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
                    Please contact support for booking payment assistance.
                  </p>
                </div>
              )
            ) : null}

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
                  membershipRequests.some((r) => r.status === 'PENDING') ||
                  (paymentMethod === 'UPI' &&
                    (!Boolean(
                      (paymentMethods?.upi?.enabled && paymentMethods?.upi?.merchantUpiVpa) ||
                      (paymentMethods?.upi?.isEnabled && paymentMethods?.upi?.merchantUpiVpa) ||
                      (paymentConfig?.isConfigured && paymentConfig?.merchantUpiVpa)
                    ) || !paymentUtr.trim()))
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

      {/* EMAIL VERIFICATION REQUIRED MODAL */}
      {emailVerifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setEmailVerifyModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>Email Verification Required</span>
              </div>
              <button
                type="button"
                onClick={() => setEmailVerifyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Email verification is strictly required before submitting a withdrawal request to protect your accumulated earnings.
            </p>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
              <span className="text-slate-500 block text-[10px] font-semibold uppercase">Registered Email</span>
              <span className="font-medium text-slate-800">{user.email}</span>
            </div>

            {withdrawVerifyNotice && (
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-[#165DAD] font-medium">
                {withdrawVerifyNotice}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEmailVerifyModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendWithdrawVerification}
                disabled={sendingWithdrawVerify}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#165DAD] hover:bg-[#12498a] flex items-center gap-2 transition-colors min-h-[40px]"
              >
                <Mail className="w-4 h-4" />
                <span>{sendingWithdrawVerify ? 'Sending Link...' : 'Send Verification Email'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WITHDRAWAL REQUEST & COMPLIANCE MODAL (REQUIREMENT 10) */}
      {withdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => !withdrawing && setWithdrawModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-[#253247] font-bold text-sm">
                <ArrowDownToLine className="w-5 h-5 text-[#15803D]" />
                <span>Earnings Withdrawal Request</span>
              </div>
              <button
                type="button"
                onClick={() => !withdrawing && setWithdrawModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Available Balance Card */}
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs flex items-center justify-between">
              <div>
                <span className="text-slate-500 block text-[10px] font-semibold uppercase tracking-wider">Available Earnings</span>
                <span className="text-2xl font-black text-[#15803D]">
                  ₹{(walletOverview?.availableEarningsINR ?? user.wallet?.availableEarningsINR ?? 0).toLocaleString('en-IN')}
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Email Verified
              </span>
            </div>

            {/* Compliance Restricted Notice */}
            <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Compliance Simulation Safeguard</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Platform operates under compliance simulation mode (COMPLIANCE_MODE=SIMULATION_ONLY). Live bank payouts are disabled until supervisory admin clearance. Minimum withdrawal: ₹1,000.
              </p>
            </div>

            {withdrawResult ? (
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-3 text-xs">
                <div className="flex items-center gap-2 text-[#165DAD] font-bold">
                  <CheckCircle2 className="w-5 h-5 text-[#165DAD]" />
                  <span>Withdrawal Request Registered (Simulation)</span>
                </div>
                <div className="space-y-1 text-slate-700 text-[11px]">
                  <div><strong>Status:</strong> {withdrawResult.status || 'PROCESSED'}</div>
                  <div><strong>Transaction Reference:</strong> <span className="font-mono">{withdrawResult.reference || withdrawResult.id || 'WTH-SIMULATED'}</span></div>
                  <div><strong>Amount:</strong> ₹{(withdrawResult.amountINR || (withdrawResult.amountPaise ? withdrawResult.amountPaise / 100 : withdrawAmount)).toLocaleString('en-IN')}</div>
                  {withdrawResult.payoutDestination && (
                    <div><strong>Destination:</strong> {withdrawResult.payoutDestination.type === 'BANK_ACCOUNT' ? `Bank (${withdrawResult.payoutDestination.maskedAccount})` : `UPI (${withdrawResult.payoutDestination.maskedUpi})`}</div>
                  )}
                  <p className="pt-1 text-slate-500 italic">{withdrawResult.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setWithdrawModalOpen(false);
                    setWithdrawResult(null);
                  }}
                  className="w-full py-2 rounded-lg bg-[#165DAD] text-white font-semibold text-xs transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleExecuteWithdrawalWithDetails} className="space-y-4">
                {/* Withdrawal Amount Input */}
                <div>
                  <label className="block text-xs font-semibold text-[#253247] mb-1">
                    Withdrawal Amount (₹) <span className="text-slate-400 font-normal">(Min: ₹1,000)</span>
                  </label>
                  <input
                    type="number"
                    min="1000"
                    step="500"
                    max={walletOverview?.availableEarningsINR ?? user.wallet?.availableEarningsINR ?? 100000}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-[#253247] focus:border-[#165DAD] focus:outline-hidden font-bold text-base"
                    placeholder="1000"
                    required
                  />
                </div>

                {/* Payout Destination Selector */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#253247]">Payout Method</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setWithdrawPayoutType('BANK_ACCOUNT')}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${withdrawPayoutType === 'BANK_ACCOUNT'
                        ? 'border-[#165DAD] bg-blue-50/50 text-[#165DAD] font-semibold ring-1 ring-[#165DAD]'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[#165DAD]" />
                        <span>Bank Transfer</span>
                      </div>
                      {withdrawPayoutType === 'BANK_ACCOUNT' && <Check className="w-3.5 h-3.5 text-[#165DAD]" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setWithdrawPayoutType('UPI')}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${withdrawPayoutType === 'UPI'
                        ? 'border-[#165DAD] bg-blue-50/50 text-[#165DAD] font-semibold ring-1 ring-[#165DAD]'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <QrCode className="w-4 h-4 text-[#165DAD]" />
                        <span>Instant UPI</span>
                      </div>
                      {withdrawPayoutType === 'UPI' && <Check className="w-3.5 h-3.5 text-[#165DAD]" />}
                    </button>
                  </div>
                </div>

                {/* Form Fields: Bank Account */}
                {withdrawPayoutType === 'BANK_ACCOUNT' ? (
                  <div className="space-y-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Account Holder Name (as in bank passbook) *
                      </label>
                      <input
                        type="text"
                        value={withdrawAccountHolder}
                        onChange={(e) => setWithdrawAccountHolder(e.target.value)}
                        placeholder="e.g. Ramesh Kumar"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-[#253247] focus:border-[#165DAD] focus:outline-hidden"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Bank Name *
                      </label>
                      <input
                        type="text"
                        value={withdrawBankName}
                        onChange={(e) => setWithdrawBankName(e.target.value)}
                        placeholder="e.g. HDFC Bank, SBI, ICICI"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-[#253247] focus:border-[#165DAD] focus:outline-hidden"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Account Number *
                        </label>
                        <input
                          type="password"
                          value={withdrawAccountNumber}
                          onChange={(e) => setWithdrawAccountNumber(e.target.value)}
                          placeholder="9-18 digits"
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-mono text-[#253247] focus:border-[#165DAD] focus:outline-hidden"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Confirm Account Number *
                        </label>
                        <input
                          type="text"
                          value={withdrawConfirmAccountNumber}
                          onChange={(e) => setWithdrawConfirmAccountNumber(e.target.value)}
                          placeholder="Re-enter account number"
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-mono text-[#253247] focus:border-[#165DAD] focus:outline-hidden"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Bank IFSC Code *
                      </label>
                      <input
                        type="text"
                        value={withdrawIfscCode}
                        onChange={(e) => setWithdrawIfscCode(e.target.value.toUpperCase())}
                        placeholder="e.g. HDFC0001234"
                        maxLength={11}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-mono uppercase text-[#253247] focus:border-[#165DAD] focus:outline-hidden"
                        required
                      />
                    </div>
                  </div>
                ) : (
                  /* Form Fields: UPI */
                  <div className="space-y-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        VPA / Account Holder Name *
                      </label>
                      <input
                        type="text"
                        value={withdrawAccountHolder}
                        onChange={(e) => setWithdrawAccountHolder(e.target.value)}
                        placeholder="e.g. Ramesh Kumar"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-[#253247] focus:border-[#165DAD] focus:outline-hidden"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        UPI ID (VPA) *
                      </label>
                      <input
                        type="text"
                        value={withdrawUpiId}
                        onChange={(e) => setWithdrawUpiId(e.target.value.trim())}
                        placeholder="e.g. username@okhdfcbank or 9876543210@paytm"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-mono text-[#253247] focus:border-[#165DAD] focus:outline-hidden"
                        required
                      />
                    </div>
                  </div>
                )}

                {withdrawValidationError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{withdrawValidationError}</span>
                  </div>
                )}

                {withdrawError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{withdrawError}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setWithdrawModalOpen(false)}
                    disabled={withdrawing}
                    className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={withdrawing}
                    className="px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-[#15803D] hover:bg-[#126F61] flex items-center gap-2 transition-colors min-h-[40px] shadow-2xs disabled:opacity-50"
                  >
                    <ArrowDownToLine className="w-4 h-4" />
                    <span>{withdrawing ? 'Submitting Request...' : `Submit Withdrawal (₹${withdrawAmount.toLocaleString('en-IN')})`}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* DASHBOARD-ONLY PWA INSTALL INSTRUCTIONS MODAL (FOR IOS / UNSUPPORTED BROWSERS) */}
      {showInstallGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setShowInstallGuideModal(false)}
          />
          <div className="relative bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 z-10 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <img
                  src="/brand/askrev-icon.webp"
                  alt="ASKR EV"
                  className="w-9 h-9 rounded-xl object-contain border border-slate-100 shadow-2xs"
                />
                <div>
                  <h3 className="font-bold text-sm text-[#0A1128]">Install ASKR EV App</h3>
                  <p className="text-[11px] text-slate-500">Fast access from your home screen</p>
                </div>
              </div>
              <button
                onClick={() => setShowInstallGuideModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600 mb-5">
              {isIOS ? (
                <>
                  <p className="font-semibold text-slate-700">Follow these steps in Safari on iOS:</p>
                  <div className="flex items-start gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="w-5 h-5 rounded-full bg-[#165DAD] text-white flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                    <span>Tap the <strong className="text-slate-800">Share</strong> button in Safari's bottom toolbar.</span>
                  </div>
                  <div className="flex items-start gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="w-5 h-5 rounded-full bg-[#165DAD] text-white flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                    <span>Scroll down and tap <strong className="text-slate-800">Add to Home Screen</strong>.</span>
                  </div>
                  <div className="flex items-start gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="w-5 h-5 rounded-full bg-[#165DAD] text-white flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
                    <span>Tap <strong className="text-slate-800">Add</strong> in the top-right corner to install.</span>
                  </div>
                </>
              ) : (
                <>
                  <p className="font-semibold text-slate-700">Follow these steps in your mobile browser:</p>
                  <div className="flex items-start gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="w-5 h-5 rounded-full bg-[#165DAD] text-white flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                    <span>Tap the browser menu button (<strong className="text-slate-800">⋮</strong> or Share icon).</span>
                  </div>
                  <div className="flex items-start gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="w-5 h-5 rounded-full bg-[#165DAD] text-white flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                    <span>Select <strong className="text-slate-800">Install app</strong> or <strong className="text-slate-800">Add to Home screen</strong>.</span>
                  </div>
                  <div className="flex items-start gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="w-5 h-5 rounded-full bg-[#165DAD] text-white flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
                    <span>Confirm <strong className="text-slate-800">Install</strong> to complete setup.</span>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setShowInstallGuideModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#165DAD] hover:bg-[#124B8D] text-white font-semibold text-xs transition-colors"
            >
              Got it
            </button>
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
