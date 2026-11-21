'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, AlertCircle, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import Navbar from '../../../components/Navbar';
import Footer from '../../../components/Footer';
import { fetchApi } from '../../../lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const queryToken = searchParams.get('token');
    if (queryToken) {
      setToken(queryToken);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      setLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      setLoading(false);
      return;
    }

    try {
      await fetchApi('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: token.trim(),
          newPassword,
          confirmPassword,
        }),
      });

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Password reset failed. The link may have expired or already been used.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F7F9FC]">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 p-8 shadow-sm space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold text-[#253247]">Reset Password</h1>
            <p className="text-xs text-slate-500">
              Set a new secure password for your ASKR EV member account
            </p>
          </div>

          {success ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Password Successfully Reset</span>
              </div>
              <p className="text-xs text-emerald-700 leading-relaxed">
                Your password has been changed and all previous active sessions have been revoked for your security.
              </p>
              <div className="pt-2">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#165DAD] text-white text-xs font-semibold hover:bg-[#124B8D] transition-colors"
                >
                  Sign In with New Password <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#253247] mb-1">
                  Reset Token
                </label>
                <input
                  type="text"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste reset token if not filled"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-[#165DAD] focus:outline-none text-xs text-[#253247] font-mono placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#253247] mb-1">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 focus:border-[#165DAD] focus:outline-none text-xs text-[#253247] placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#253247] mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 focus:border-[#165DAD] focus:outline-none text-xs text-[#253247] placeholder:text-slate-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-[#165DAD] hover:bg-[#124B8D] text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Resetting Password...' : 'Reset Password & Revoke Sessions'}
              </button>

              <div className="text-center pt-2">
                <Link
                  href="/auth/login"
                  className="text-xs text-slate-500 hover:text-[#165DAD] transition-colors"
                >
                  Return to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
