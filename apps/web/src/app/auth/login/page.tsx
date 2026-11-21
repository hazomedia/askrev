'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, KeyRound, AlertCircle, ShieldCheck } from 'lucide-react';
import Navbar from '../../../components/Navbar';
import Footer from '../../../components/Footer';
import { fetchApi, setAuthSession } from '../../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload: any = {
        email,
        password,
      };

      if (mfaRequired) {
        if (useRecoveryCode) {
          payload.recoveryCode = recoveryCode.trim();
        } else {
          payload.totpCode = totpCode.trim();
        }
      }

      const data: any = await fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Secure session: Admin tokens are stored strictly in HttpOnly cookies, never localStorage
      setAuthSession(data.tokens?.accessToken, data.user, data.tokens?.refreshToken, data.csrfToken);

      if (['SUPER_ADMIN', 'ADMIN_OPERATIONS', 'FINANCE_MANAGER'].includes(data.user.role)) {
        if (
          typeof window !== 'undefined' &&
          (window.location.hostname === 'askrevdrive.com' || window.location.hostname.startsWith('www.'))
        ) {
          window.location.href = 'https://admin.askrevdrive.com/admin';
        } else {
          router.push('/admin');
        }
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      const message = err.message || 'Login failed. Please verify your credentials.';
      if (message.includes('MFA_REQUIRED')) {
        setMfaRequired(true);
        setError('Two-Factor Authentication is enabled for this account. Please enter your 6-digit authenticator code.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setMfaRequired(false);
    setTotpCode('');
    setRecoveryCode('');
    setError(null);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F7F9FC]">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 p-8 shadow-sm space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold text-[#253247]">Member Login</h1>
            <p className="text-xs text-slate-500">
              Access your ASKR EV customer portal and reservations
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-[#253247] mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 focus:border-[#165DAD] focus:outline-none text-xs text-[#253247] placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[#253247]">
                  Password
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-[11px] text-[#165DAD] hover:underline font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 focus:border-[#165DAD] focus:outline-none text-xs text-[#253247] placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* MFA Verification Challenge */}
            {mfaRequired && (
              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#165DAD]">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Two-Factor Authentication Required</span>
                </div>

                {!useRecoveryCode ? (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      6-Digit Authenticator Code
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        maxLength={6}
                        autoFocus
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:border-[#165DAD] focus:outline-none text-xs text-[#253247] font-mono tracking-widest text-center"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Backup Recovery Code
                    </label>
                    <input
                      type="text"
                      autoFocus
                      value={recoveryCode}
                      onChange={(e) => setRecoveryCode(e.target.value)}
                      placeholder="XXXX-XXXX-XX"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-[#165DAD] focus:outline-none text-xs text-[#253247] font-mono text-center"
                    />
                  </div>
                )}

                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setUseRecoveryCode(!useRecoveryCode)}
                    className="text-[11px] text-[#165DAD] hover:underline"
                  >
                    {useRecoveryCode ? 'Use 6-digit Authenticator Code' : 'Use Backup Recovery Code'}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-[#165DAD] hover:bg-[#124B8D] text-white text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : mfaRequired ? 'Verify & Continue' : 'Sign In'}
            </button>
          </form>

          {/* Quick Demo Autofill Switcher for QA (Non-production environments only) */}
          {process.env.NODE_ENV !== 'production' && (
            <div className="pt-4 border-t border-slate-100">
              <div className="text-[11px] font-semibold text-slate-400 mb-2">
                Quick QA Accounts:
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => fillDemo('admin@askrev.com', 'Admin@123456')}
                  className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-left hover:border-slate-300 transition-colors"
                >
                  <div className="font-semibold text-[#253247]">Super Admin</div>
                  <div className="text-[10px] text-slate-400 truncate">admin@askrev.com</div>
                </button>
                <button
                  type="button"
                  onClick={() => fillDemo('member.a@askrev.local', 'MemberA@AskREV2026!')}
                  className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-left hover:border-slate-300 transition-colors"
                >
                  <div className="font-semibold text-[#253247]">Active Member</div>
                  <div className="text-[10px] text-slate-400 truncate">member.a@...</div>
                </button>
              </div>
            </div>
          )}

          <div className="text-center text-xs text-slate-500">
            Do not have an account?{' '}
            <Link href="/auth/register" className="text-[#165DAD] hover:underline font-semibold">
              Register Free
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
