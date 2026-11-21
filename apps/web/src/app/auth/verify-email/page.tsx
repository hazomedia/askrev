'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Mail, CheckCircle2, AlertCircle, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import Navbar from '../../../components/Navbar';
import Footer from '../../../components/Footer';
import { fetchApi } from '../../../lib/api';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoAttempted, setAutoAttempted] = useState(false);

  const performVerification = async (verifyToken: string) => {
    if (!verifyToken.trim()) {
      setError('A valid verification token is required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await fetchApi('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token: verifyToken.trim() }),
      });
      setSuccess(true);
    } catch (err: any) {
      setError(
        err.message ||
          'Email verification failed. The verification link may have expired or has already been used.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken && !autoAttempted) {
      setToken(urlToken);
      setAutoAttempted(true);
      performVerification(urlToken);
    }
  }, [searchParams, autoAttempted]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performVerification(token);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F7F9FC]">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 p-8 shadow-sm space-y-6">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-[#165DAD] flex items-center justify-center mx-auto mb-3">
              <Mail className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-[#253247]">Verify Email Address</h1>
            <p className="text-xs text-slate-500">
              Confirm your email address to activate all member privileges
            </p>
          </div>

          {loading && (
            <div className="py-8 flex flex-col items-center justify-center space-y-3 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-[#165DAD]" />
              <p className="text-xs font-medium">Verifying your email address with ASKR EV...</p>
            </div>
          )}

          {!loading && success && (
            <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Email Address Verified!</span>
              </div>
              <p className="text-xs text-emerald-700 leading-relaxed">
                Thank you! Your email address has been successfully verified. Your account security
                is now enhanced and you will receive transactional notices.
              </p>
              <div className="pt-2">
                <Link
                  href="/auth/login"
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#165DAD] hover:bg-[#124B8D] text-white text-xs font-semibold transition-colors"
                >
                  <span>Sign In to Member Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}

          {!loading && !success && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{error}</div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#253247] mb-1">
                  Verification Token
                </label>
                <input
                  type="text"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste verification token"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-[#165DAD] focus:outline-none text-xs text-[#253247] font-mono placeholder:text-slate-400"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-[#165DAD] hover:bg-[#124B8D] text-white text-xs font-semibold transition-colors disabled:opacity-50"
              >
                Verify Email
              </button>

              <div className="text-center pt-2">
                <Link
                  href="/auth/login"
                  className="text-xs text-[#165DAD] hover:underline font-medium"
                >
                  Return to Member Login
                </Link>
              </div>
            </form>
          )}

          <div className="border-t border-slate-100 pt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>Secured by ASKR EV Member Protection</span>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center text-slate-500">
          <div className="flex items-center gap-3">
            <div className="animate-spin w-6 h-6 border-2 border-[#165DAD] border-t-transparent rounded-full" />
            <span className="text-sm font-medium">Loading Verification...</span>
          </div>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
