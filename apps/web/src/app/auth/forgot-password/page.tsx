'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, AlertCircle, CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react';
import Navbar from '../../../components/Navbar';
import Footer from '../../../components/Footer';
import { fetchApi } from '../../../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data: any = await fetchApi('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      });

      setSubmitted(true);
      setMessage(data.message || 'If an account exists with this email, a reset link has been dispatched.');
    } catch (err: any) {
      setError(err.message || 'Failed to submit password reset request.');
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
            <h1 className="text-2xl font-bold text-[#253247]">Forgot Password</h1>
            <p className="text-xs text-slate-500">
              Enter your registered email address to receive password reset instructions
            </p>
          </div>

          {submitted ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Request Submitted</span>
              </div>
              <p className="text-xs text-emerald-700 leading-relaxed">
                {message}
              </p>
              <div className="pt-2">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-1.5 text-xs text-[#165DAD] font-semibold hover:underline"
                >
                  <ArrowLeft className="w-4 h-4" /> Return to Login
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
                  Registered Email Address
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

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-[#165DAD] hover:bg-[#124B8D] text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Submitting...' : 'Send Password Reset Link'}
              </button>

              <div className="text-center pt-2">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-[#165DAD] transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
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
