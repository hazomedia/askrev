'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  QrCode,
  Smartphone,
  LogOut,
  Info,
  ExternalLink,
  Shield,
  Layers,
} from 'lucide-react';
import {
  authChangePassword,
  authSetupMfa,
  authEnableMfa,
  authDisableMfa,
  authRevokeAllSessions,
  fetchCurrentUserProfile,
  logoutSession,
  clearAuthSession,
} from '../../lib/api';

interface AdminSecuritySettingsProps {
  currentUser: any;
  onUserUpdated?: () => void;
}

export function AdminSecuritySettings({ currentUser: initialUser, onUserUpdated }: AdminSecuritySettingsProps) {
  const router = useRouter();
  const [user, setUser] = useState<any>(initialUser);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordTotpCode, setPasswordTotpCode] = useState('');
  const [passwordRecoveryCode, setPasswordRecoveryCode] = useState('');
  const [useRecoveryCodeForPassword, setUseRecoveryCodeForPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // MFA Setup State
  const [setupStep, setSetupStep] = useState<'idle' | 'scanning' | 'recovery'>('idle');
  const [setupData, setSetupData] = useState<any>(null);
  const [verifyTotpCode, setVerifyTotpCode] = useState('');
  const [enablingMfa, setEnablingMfa] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaSuccess, setMfaSuccess] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedRecovery, setCopiedRecovery] = useState(false);

  // MFA Disable State
  const [disableModalOpen, setDisableModalOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableTotpCode, setDisableTotpCode] = useState('');
  const [disablingMfa, setDisablingMfa] = useState(false);
  const [disableError, setDisableError] = useState<string | null>(null);

  // Revoke Sessions State
  const [revokingSessions, setRevokingSessions] = useState(false);
  const [revokeSuccess, setRevokeSuccess] = useState<string | null>(null);

  const refreshProfile = async () => {
    try {
      setLoadingProfile(true);
      const updated = await fetchCurrentUserProfile();
      if (updated) {
        setUser(updated);
        if (onUserUpdated) onUserUpdated();
      }
    } catch {
      // User might be unauthenticated if sessions were revoked
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
    }
    refreshProfile();
  }, [initialUser]);

  // Real-time password strength validation rules
  const passwordRules = [
    { label: 'At least 12 characters', valid: newPassword.length >= 12 },
    { label: 'At least one uppercase letter (A-Z)', valid: /[A-Z]/.test(newPassword) },
    { label: 'At least one lowercase letter (a-z)', valid: /[a-z]/.test(newPassword) },
    { label: 'At least one number (0-9)', valid: /[0-9]/.test(newPassword) },
    { label: 'At least one special character (!@#$%^&*)', valid: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword) },
  ];
  const isPasswordStrong = passwordRules.every((r) => r.valid);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!isPasswordStrong) {
      setPasswordError('Please ensure your new password satisfies all strength criteria below.');
      return;
    }
    if (!passwordsMatch) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }
    if (user?.twoFactorEnabled) {
      if (useRecoveryCodeForPassword && !passwordRecoveryCode.trim()) {
        setPasswordError('Please enter your backup recovery code.');
        return;
      }
      if (!useRecoveryCodeForPassword && !passwordTotpCode.trim()) {
        setPasswordError('Two-Factor Authentication is active. Please enter your 6-digit authenticator code.');
        return;
      }
    }

    try {
      setChangingPassword(true);
      const res = await authChangePassword({
        currentPassword,
        newPassword,
        confirmPassword,
        totpCode: user?.twoFactorEnabled && !useRecoveryCodeForPassword ? passwordTotpCode.trim() : undefined,
        recoveryCode: user?.twoFactorEnabled && useRecoveryCodeForPassword ? passwordRecoveryCode.trim() : undefined,
      });

      setPasswordSuccess(
        res.message || 'Password changed successfully. All active sessions have been revoked. Redirecting to login...'
      );
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordTotpCode('');
      setPasswordRecoveryCode('');

      // Per security specification, all sessions are terminated; redirect to fresh login
      setTimeout(() => {
        clearAuthSession();
        router.push('/auth/login');
      }, 2500);
    } catch (err: any) {
      const msg = err.message || 'Failed to change password. Please verify your current credentials.';
      if (msg.includes('MFA_REQUIRED') || msg.includes('Two-Factor')) {
        setUser((prev: any) => ({ ...prev, twoFactorEnabled: true }));
      }
      setPasswordError(msg);
    } finally {
      setChangingPassword(false);
    }
  };

  // Start MFA Setup Flow
  const handleStartMfaSetup = async () => {
    setMfaError(null);
    setMfaSuccess(null);
    setVerifyTotpCode('');
    try {
      setEnablingMfa(true);
      const data = await authSetupMfa();
      setSetupData(data);
      setSetupStep('scanning');
    } catch (err: any) {
      setMfaError(err.message || 'Could not initialize MFA setup. Please try again.');
    } finally {
      setEnablingMfa(false);
    }
  };

  // Confirm MFA Verification
  const handleConfirmMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaError(null);
    if (!verifyTotpCode.trim() || verifyTotpCode.trim().length !== 6) {
      setMfaError('Please enter a valid 6-digit verification code.');
      return;
    }

    try {
      setEnablingMfa(true);
      const res = await authEnableMfa(verifyTotpCode.trim(), setupData?.secret);
      setRecoveryCodes(res.recoveryCodes || []);
      setSetupStep('recovery');
      setMfaSuccess(res.message || 'Two-Factor Authentication enabled successfully!');
      await refreshProfile();
    } catch (err: any) {
      setMfaError(err.message || 'Verification failed. Please check the 6-digit code from your authenticator app.');
    } finally {
      setEnablingMfa(false);
    }
  };

  // Handle MFA Disable
  const handleDisableMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setDisableError(null);
    if (!disablePassword) {
      setDisableError('Current password is required to disable Two-Factor Authentication.');
      return;
    }
    if (!disableTotpCode.trim() || disableTotpCode.trim().length !== 6) {
      setDisableError('A valid 6-digit verification code is required.');
      return;
    }

    try {
      setDisablingMfa(true);
      await authDisableMfa(disablePassword, disableTotpCode.trim());
      setDisableModalOpen(false);
      setDisablePassword('');
      setDisableTotpCode('');
      setMfaSuccess('Two-Factor Authentication has been successfully disabled.');
      await refreshProfile();
    } catch (err: any) {
      setDisableError(err.message || 'Failed to disable MFA. Verify your password and TOTP code.');
    } finally {
      setDisablingMfa(false);
    }
  };

  // Handle Revoke All Sessions
  const handleRevokeAllSessions = async () => {
    if (!window.confirm('Are you sure you want to sign out of all active devices? You will be logged out of this session.')) {
      return;
    }
    try {
      setRevokingSessions(true);
      await authRevokeAllSessions();
      setRevokeSuccess('All active sessions have been revoked. Redirecting to login...');
      setTimeout(() => {
        clearAuthSession();
        router.push('/auth/login');
      }, 1500);
    } catch (err: any) {
      alert(`Error revoking sessions: ${err.message}`);
    } finally {
      setRevokingSessions(false);
    }
  };

  const copyToClipboard = (text: string, isRecovery: boolean = false) => {
    navigator.clipboard.writeText(text);
    if (isRecovery) {
      setCopiedRecovery(true);
      setTimeout(() => setCopiedRecovery(false), 2000);
    } else {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & ACCOUNT SECURITY STATUS SUMMARY */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-[#253247]">Admin Account Security</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider bg-slate-100 text-slate-700 uppercase">
                {user?.role || 'SUPER_ADMIN'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Manage cryptographic password credentials, RFC 6238 TOTP Two-Factor Authentication, and active sessions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {user?.twoFactorEnabled ? (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>2FA Protected</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>2FA Recommended</span>
              </div>
            )}
            <button
              onClick={refreshProfile}
              disabled={loadingProfile}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
              title="Refresh security profile"
            >
              <RefreshCw className={`w-4 h-4 ${loadingProfile ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Super Admin MFA Notice Banner */}
        {user?.role === 'SUPER_ADMIN' && !user?.twoFactorEnabled && (
          <div className="mt-4 p-3.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold">Production Super Admin Requirement</p>
              <p className="text-[11px] text-indigo-700">
                To protect Bharat’s next-generation EV fleet controls, Super Admin accounts are required to configure Two-Factor Authentication (TOTP). Please complete enrollment below.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 2. TWO-COLUMN GRID: CHANGE PASSWORD & MFA STATUS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ========================================================================= */}
        {/* A. CHANGE PASSWORD CARD */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <KeyRound className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="text-sm font-bold text-[#253247]">Change Password</h3>
                <p className="text-[11px] text-slate-500">Update your primary administrative password</p>
              </div>
            </div>

            {passwordError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-xs font-semibold text-[#253247] mb-1">
                  Current Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    placeholder="Enter current password"
                    className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold text-[#253247] mb-1">
                  New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Min 12 chars, upper, lower, digit & symbol"
                    className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Checklist */}
                <div className="mt-2.5 p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Security Requirements
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
                    {passwordRules.map((rule, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-1.5 ${
                          rule.valid ? 'text-emerald-700 font-medium' : 'text-slate-400'
                        }`}
                      >
                        {rule.valid ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-1 shrink-0" />
                        )}
                        <span>{rule.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-semibold text-[#253247] mb-1">
                  Confirm New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Re-enter new password"
                    className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && !passwordsMatch && (
                  <p className="text-[11px] text-red-600 mt-1">Passwords do not match.</p>
                )}
              </div>

              {/* TOTP / Recovery Code Challenge if MFA Enabled */}
              {user?.twoFactorEnabled && (
                <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-amber-900">
                      {useRecoveryCodeForPassword ? 'Backup Recovery Code' : 'Two-Factor Authentication Code'}{' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setUseRecoveryCodeForPassword(!useRecoveryCodeForPassword)}
                      className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 underline"
                    >
                      {useRecoveryCodeForPassword ? 'Use 6-Digit App Code' : 'Use Recovery Code'}
                    </button>
                  </div>
                  <p className="text-[11px] text-amber-700">
                    {useRecoveryCodeForPassword
                      ? 'Enter one of your 8-character emergency backup recovery codes.'
                      : 'Enter the current 6-digit verification code from your authenticator app.'}
                  </p>
                  {useRecoveryCodeForPassword ? (
                    <input
                      type="text"
                      maxLength={12}
                      value={passwordRecoveryCode}
                      onChange={(e) => setPasswordRecoveryCode(e.target.value.trim().toUpperCase())}
                      placeholder="e.g. A1B2C3D4"
                      required
                      className="w-48 text-center font-mono tracking-widest text-sm px-3 py-2 rounded-lg border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                    />
                  ) : (
                    <input
                      type="text"
                      maxLength={6}
                      value={passwordTotpCode}
                      onChange={(e) => setPasswordTotpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      required
                      className="w-40 text-center font-mono tracking-widest text-sm px-3 py-2 rounded-lg border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                    />
                  )}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={changingPassword || !isPasswordStrong || !passwordsMatch}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#253247] hover:bg-[#1a2332] text-white text-xs font-semibold shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Lock className="w-4 h-4" />
                  <span>{changingPassword ? 'Verifying & Updating...' : 'Update Password & Revoke Sessions'}</span>
                </button>
                <p className="text-[10px] text-slate-400 text-center mt-2">
                  Notice: Changing your password revokes all active sessions. You will be prompted to log in again.
                </p>
              </div>
            </form>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* B. TWO-FACTOR AUTHENTICATION (TOTP) MANAGEMENT */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-bold text-[#253247]">Two-Factor Authentication (TOTP)</h3>
                  <p className="text-[11px] text-slate-500">Industry-standard RFC 6238 time-based one-time passwords</p>
                </div>
              </div>
              <div>
                {user?.twoFactorEnabled ? (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    ACTIVE
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                    INACTIVE
                  </span>
                )}
              </div>
            </div>

            {mfaError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{mfaError}</span>
              </div>
            )}

            {mfaSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{mfaSuccess}</span>
              </div>
            )}

            {/* STATE 1: MFA IS CURRENTLY DISABLED */}
            {!user?.twoFactorEnabled && setupStep === 'idle' && (
              <div className="space-y-4 text-xs text-slate-600">
                <p>
                  Two-Factor Authentication adds an uncompromising second layer of defense. In addition to your password, you will be required to provide a 6-digit code generated by an authenticator application.
                </p>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                  <div className="font-semibold text-[#253247] flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-indigo-600" />
                    <span>Compatible Authenticator Apps:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-500 text-[11px]">
                    <li>Google Authenticator (Android / iOS)</li>
                    <li>Microsoft Authenticator (Android / iOS)</li>
                    <li>1Password / Bitwarden / Apple Passwords</li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={handleStartMfaSetup}
                  disabled={enablingMfa}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
                >
                  <QrCode className="w-4 h-4" />
                  <span>{enablingMfa ? 'Generating Cryptographic Keys...' : 'Set Up Two-Factor Authentication'}</span>
                </button>
              </div>
            )}

            {/* STATE 2: SCANNING QR CODE & CODE VERIFICATION */}
            {setupStep === 'scanning' && setupData && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-indigo-50/70 border border-indigo-200 text-indigo-900 text-xs">
                  <p className="font-semibold">Step 1: Scan QR Code or Enter Key Manually</p>
                  <p className="text-[11px] text-indigo-700 mt-0.5">
                    Open your authenticator app and scan this barcode, or copy the Base32 setup key below.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  {setupData.qrCodeDataUrl ? (
                    <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm shrink-0">
                      <img
                        src={setupData.qrCodeDataUrl}
                        alt="TOTP QR Code"
                        className="w-40 h-40 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-40 h-40 bg-slate-200 rounded-lg flex items-center justify-center text-xs text-slate-500">
                      QR Code Pending
                    </div>
                  )}

                  <div className="space-y-2 flex-1 w-full text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Manual Setup Key
                      </span>
                      <div className="flex items-center gap-2">
                        <code className="bg-white border border-slate-200 px-2.5 py-1.5 rounded text-[11px] font-mono text-[#253247] break-all select-all flex-1">
                          {setupData.secret}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(setupData.secret)}
                          className="p-1.5 rounded border border-slate-200 hover:bg-white text-slate-600"
                          title="Copy setup key"
                        >
                          {copiedKey ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-500 space-y-0.5">
                      <p><strong>Account:</strong> {setupData.accountName}</p>
                      <p><strong>Issuer:</strong> {setupData.issuer}</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleConfirmMfa} className="space-y-3">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                    <label className="block text-xs font-semibold text-[#253247]">
                      Step 2: Enter 6-digit Code from Authenticator
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        maxLength={6}
                        value={verifyTotpCode}
                        onChange={(e) => setVerifyTotpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                        required
                        className="w-36 text-center font-mono tracking-widest text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                      <button
                        type="submit"
                        disabled={enablingMfa || verifyTotpCode.length !== 6}
                        className="py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
                      >
                        {enablingMfa ? 'Verifying...' : 'Verify & Activate'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSetupStep('idle')}
                        className="py-2 px-3 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* STATE 3: DISPLAY BACKUP RECOVERY CODES */}
            {setupStep === 'recovery' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    Two-Factor Authentication is Now Active!
                  </p>
                  <p className="text-[11px] text-emerald-700">
                    Save these 8 one-time emergency backup recovery codes in a secure password vault. If you ever lose access to your authenticator device, each code can be used exactly once to log in.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-sans font-bold">
                      One-Time Recovery Codes (8 Total)
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(recoveryCodes.join('\n'), true)}
                      className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-sans"
                    >
                      {copiedRecovery ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedRecovery ? 'Copied All' : 'Copy All Codes'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center text-emerald-400 tracking-wider">
                    {recoveryCodes.map((code, idx) => (
                      <div key={idx} className="bg-slate-800/60 py-1.5 px-2 rounded border border-slate-700">
                        {code}
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSetupStep('idle')}
                  className="w-full py-2.5 px-4 rounded-lg bg-[#253247] hover:bg-[#1a2332] text-white text-xs font-semibold shadow-sm transition"
                >
                  I Have Safely Stored My Recovery Codes
                </button>
              </div>
            )}

            {/* STATE 4: MFA IS ACTIVATED */}
            {user?.twoFactorEnabled && setupStep === 'idle' && (
              <div className="space-y-4 text-xs text-slate-600">
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <span>Your Account is Fully Protected</span>
                  </div>
                  <p className="text-[11px] text-emerald-700 leading-relaxed">
                    Two-Factor Authentication is currently active on this account. Every sign-in attempt and password modification requires verification through your authenticator application.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDisableError(null);
                      setDisableModalOpen(true);
                    }}
                    className="py-2 px-3 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-medium transition"
                  >
                    Disable Two-Factor Authentication
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. ACTIVE SESSIONS & DEVICE MANAGEMENT */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <LogOut className="w-5 h-5 text-red-600" />
              <h3 className="text-sm font-bold text-[#253247]">Active Sessions & Sign Out</h3>
            </div>
            <p className="text-xs text-slate-500">
              Admin sessions are protected by server-managed HttpOnly cryptographic tokens. If you suspect unauthorized activity, you can terminate all other active devices immediately.
            </p>
          </div>

          <div>
            <button
              type="button"
              onClick={handleRevokeAllSessions}
              disabled={revokingSessions}
              className="py-2.5 px-4 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-semibold transition"
            >
              {revokingSessions ? 'Revoking All Sessions...' : 'Sign Out All Devices & Revoke Sessions'}
            </button>
          </div>
        </div>

        {revokeSuccess && (
          <div className="mt-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{revokeSuccess}</span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. MODAL: DISABLE TWO-FACTOR AUTHENTICATION */}
      {/* ========================================================================= */}
      {disableModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-red-600 pb-2 border-b border-slate-100">
              <ShieldAlert className="w-5 h-5" />
              <h4 className="text-sm font-bold text-[#253247]">Disable Two-Factor Authentication</h4>
            </div>

            <p className="text-xs text-slate-600">
              Disabling 2FA lowers your administrative security. To confirm this action, you must provide both your current password and a valid 6-digit authenticator code.
            </p>

            {disableError && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{disableError}</span>
              </div>
            )}

            <form onSubmit={handleDisableMfa} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#253247] mb-1">
                  Current Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#253247] mb-1">
                  6-digit Authenticator Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={disableTotpCode}
                  onChange={(e) => setDisableTotpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  required
                  className="w-36 text-center font-mono tracking-widest text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setDisableModalOpen(false)}
                  className="py-2 px-3 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={disablingMfa || !disablePassword || disableTotpCode.length !== 6}
                  className="py-2 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {disablingMfa ? 'Disabling...' : 'Confirm Disable 2FA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
