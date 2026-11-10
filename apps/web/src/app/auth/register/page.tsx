'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Zap,
  Lock,
  Mail,
  User,
  Phone,
  ArrowRight,
  Share2,
  CheckCircle2,
  ShieldCheck,
  Ticket,
} from 'lucide-react';
import { fetchApi, setAuthSession } from '../../../lib/api';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [sponsorMemberId, setSponsorMemberId] = useState('');
  const [initialPackage, setInitialPackage] = useState<'FREE' | 'BASIC' | 'FULL'>('FREE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setSponsorMemberId(refCode.toUpperCase().trim());
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data: any = await fetchApi('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          fullName,
          email,
          password,
          phone: phone || undefined,
          sponsorMemberId: sponsorMemberId ? sponsorMemberId.trim() : undefined,
          initialPackage,
        }),
      });

      setAuthSession(data.tokens.accessToken, data.user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative min-h-[calc(100vh-140px)]">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-96 gradient-glow pointer-events-none opacity-50" />

      <div className="max-w-xl w-full space-y-6 card-gradient p-8 sm:p-10 rounded-3xl border border-navy-700/80 shadow-2xl relative z-10">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-3 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-electric-600 to-electric-400 flex items-center justify-center text-white shadow-lg shadow-electric-500/25 group-hover:scale-105 transition-transform">
              <Zap className="w-7 h-7 fill-white text-white" />
            </div>
          </Link>
          <h2 className="text-3xl font-black text-white">Create Member Account</h2>
          <p className="mt-1.5 text-xs text-slate-400">
            Generate your unique Member ID, browse EV bikes, and access member benefits.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Full Legal Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Rohit Verma"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-navy-950 border border-navy-700 focus:border-electric-500 focus:outline-none text-white text-sm placeholder:text-slate-600"
              />
            </div>
          </div>

          {/* Email & Phone Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rohit@example.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-navy-950 border border-navy-700 focus:border-electric-500 focus:outline-none text-white text-sm placeholder:text-slate-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Mobile Number (Optional)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-navy-950 border border-navy-700 focus:border-electric-500 focus:outline-none text-white text-sm placeholder:text-slate-600"
                />
              </div>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-navy-950 border border-navy-700 focus:border-electric-500 focus:outline-none text-white text-sm placeholder:text-slate-600"
              />
            </div>
          </div>

          {/* Sponsor Member ID */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-slate-300">
                Sponsor Member ID (Optional)
              </label>
              {sponsorMemberId && (
                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Referral Linked
                </span>
              )}
            </div>
            <div className="relative">
              <Share2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={sponsorMemberId}
                onChange={(e) => setSponsorMemberId(e.target.value.toUpperCase())}
                placeholder="e.g. ASKR-100001"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-navy-950 border border-navy-700 focus:border-electric-500 focus:outline-none text-white text-sm font-mono placeholder:text-slate-600 uppercase"
              />
            </div>
          </div>

          {/* Initial Membership Package Selector */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Select Initial Package
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {/* Free */}
              <button
                type="button"
                onClick={() => setInitialPackage('FREE')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  initialPackage === 'FREE'
                    ? 'bg-navy-800 border-electric-400 ring-2 ring-electric-400/30'
                    : 'bg-navy-950 border-navy-700 hover:border-navy-600'
                }`}
              >
                <div className="text-[10px] uppercase font-bold text-slate-400">Starter</div>
                <div className="text-sm font-black text-white mt-0.5">Free</div>
                <div className="text-xs font-bold text-electric-400">₹0</div>
              </button>

              {/* Basic */}
              <button
                type="button"
                onClick={() => setInitialPackage('BASIC')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  initialPackage === 'BASIC'
                    ? 'bg-navy-800 border-electric-400 ring-2 ring-electric-400/30'
                    : 'bg-navy-950 border-navy-700 hover:border-navy-600'
                }`}
              >
                <div className="text-[10px] uppercase font-bold text-electric-400">Network</div>
                <div className="text-sm font-black text-white mt-0.5">Basic</div>
                <div className="text-xs font-bold text-electric-400">₹3,000</div>
              </button>

              {/* Full */}
              <button
                type="button"
                onClick={() => setInitialPackage('FULL')}
                className={`p-3 rounded-2xl border text-left transition-all relative ${
                  initialPackage === 'FULL'
                    ? 'bg-navy-800 border-purple-400 ring-2 ring-purple-400/30'
                    : 'bg-navy-950 border-navy-700 hover:border-navy-600'
                }`}
              >
                <div className="text-[10px] uppercase font-bold text-purple-400">Qualified</div>
                <div className="text-sm font-black text-white mt-0.5">Full</div>
                <div className="text-xs font-bold text-purple-400">₹33,000</div>
              </button>
            </div>

            {initialPackage === 'FULL' && (
              <div className="mt-2.5 p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-xs text-purple-300 flex items-center gap-2">
                <Ticket className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Includes <strong>₹30,000 Shopping Voucher</strong> credited immediately upon activation!</span>
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-electric-600 via-electric-500 to-emerald-500 hover:from-electric-500 hover:to-emerald-400 shadow-xl shadow-electric-500/25 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
          >
            <Zap className="w-4 h-4 fill-white" />
            <span>{loading ? 'Creating Member Account...' : 'Complete Registration'}</span>
          </button>
        </form>

        <div className="pt-2 text-center text-xs text-slate-400">
          Already registered as a member?{' '}
          <Link href="/auth/login" className="text-electric-400 hover:text-electric-300 font-bold underline">
            Sign In Here
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center py-20 text-slate-400 text-xs">
          Loading registration...
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
