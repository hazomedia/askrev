'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { User, Mail, Phone, Lock, Share2, AlertCircle, CheckCircle2, Loader2, UserCheck } from 'lucide-react';
import Navbar from '../../../components/Navbar';
import Footer from '../../../components/Footer';
import { fetchApi, setAuthSession } from '../../../lib/api';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [side, setSide] = useState<'LEFT' | 'RIGHT'>('LEFT');
  const [sponsorMemberId, setSponsorMemberId] = useState('');
  const [sponsorInfo, setSponsorInfo] = useState<{ memberId: string; fullName: string } | null>(null);
  const [sponsorChecking, setSponsorChecking] = useState(false);
  const [sponsorError, setSponsorError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookupSponsor = async (code: string) => {
    const clean = code.trim().toUpperCase();
    if (!clean) {
      setSponsorInfo(null);
      setSponsorError('Sponsor referral code is required.');
      return;
    }

    setSponsorChecking(true);
    setSponsorError(null);
    try {
      const data: any = await fetchApi(`/auth/sponsor-lookup/${encodeURIComponent(clean)}`);
      if (data?.valid) {
        setSponsorInfo({ memberId: data.memberId, fullName: data.fullName });
        setSponsorError(null);
      } else {
        setSponsorInfo(null);
        setSponsorError('Invalid or ineligible sponsor code.');
      }
    } catch (err: any) {
      setSponsorInfo(null);
      setSponsorError(err.message || 'Sponsor code was not found.');
    } finally {
      setSponsorChecking(false);
    }
  };

  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      const clean = refCode.toUpperCase().trim();
      setSponsorMemberId(clean);
      lookupSponsor(clean);
    }
    const sideParam = searchParams.get('side')?.toUpperCase().trim();
    if (sideParam === 'RIGHT' || sideParam === 'LEFT') {
      setSide(sideParam as 'LEFT' | 'RIGHT');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!sponsorMemberId.trim()) {
      setError('A valid sponsor referral code is mandatory to create a member account.');
      setLoading(false);
      return;
    }

    if (!sponsorInfo) {
      setError('Please provide a verified sponsor referral code.');
      setLoading(false);
      return;
    }

    try {
      const data: any = await fetchApi('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          fullName,
          email,
          password,
          phone: phone || undefined,
          sponsorMemberId: sponsorMemberId.trim().toUpperCase(),
          side,
        }),
      });

      setAuthSession(data.tokens.accessToken, data.user, data.tokens.refreshToken);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F7F9FC]">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg w-full bg-white rounded-xl border border-slate-200 p-8 shadow-sm space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold text-[#253247]">Register Member Account</h1>
            <p className="text-xs text-slate-500">
              Create your account to access customer services and EV reservations
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
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Rahul Sharma"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 focus:border-[#165DAD] focus:outline-none text-xs text-[#253247] placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <label className="block text-xs font-semibold text-[#253247] mb-1">
                  Phone (Optional)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 focus:border-[#165DAD] focus:outline-none text-xs text-[#253247] placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#253247] mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 focus:border-[#165DAD] focus:outline-none text-xs text-[#253247] placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[#253247]">
                  Sponsor Referral Code <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400 font-medium">Mandatory</span>
              </div>
              <div className="relative">
                <Share2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={sponsorMemberId}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setSponsorMemberId(val);
                    if (val.length >= 6) {
                      lookupSponsor(val);
                    } else {
                      setSponsorInfo(null);
                      setSponsorError(null);
                    }
                  }}
                  onBlur={() => lookupSponsor(sponsorMemberId)}
                  placeholder="e.g. ASKR-ADMIN-01"
                  className={`w-full pl-9 pr-9 py-2.5 rounded-lg border text-xs text-[#253247] font-mono uppercase placeholder:text-slate-400 focus:outline-none transition-colors ${
                    sponsorInfo
                      ? 'border-emerald-500 bg-emerald-50/20'
                      : sponsorError
                      ? 'border-red-400 bg-red-50/20'
                      : 'border-slate-200 focus:border-[#165DAD]'
                  }`}
                />
                <div className="absolute right-3 top-2.5">
                  {sponsorChecking ? (
                    <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                  ) : sponsorInfo ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : sponsorError ? (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  ) : null}
                </div>
              </div>

              {/* Verified Sponsor Identity Card */}
              {sponsorInfo && (
                <div className="mt-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-emerald-900 font-medium">
                    <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Sponsor: <strong>{sponsorInfo.fullName}</strong></span>
                  </div>
                  <span className="font-mono text-[11px] text-emerald-700 font-semibold px-2 py-0.5 rounded bg-white border border-emerald-200">
                    {sponsorInfo.memberId}
                  </span>
                </div>
              )}

              {sponsorError && (
                <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {sponsorError}
                </p>
              )}
            </div>

            {/* Team Placement Leg Selector */}
            <div>
              <label className="block text-xs font-semibold text-[#253247] mb-1">
                Team Placement Leg
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSide('LEFT')}
                  className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                    side === 'LEFT'
                      ? 'bg-blue-50 border-[#165DAD] text-[#165DAD] font-semibold ring-1 ring-[#165DAD]'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span>Left Team</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSide('RIGHT')}
                  className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                    side === 'RIGHT'
                      ? 'bg-blue-50 border-[#165DAD] text-[#165DAD] font-semibold ring-1 ring-[#165DAD]'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span>Right Team</span>
                </button>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Binary tree placement will target your sponsor&apos;s <strong>{side === 'LEFT' ? 'Left Team' : 'Right Team'}</strong> upon Full Membership activation.
              </p>
            </div>

            {/* Membership Activation Policy */}
            <div className="p-3.5 rounded-lg border border-blue-200 bg-blue-50/50 text-left space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#165DAD] uppercase tracking-wider">
                  Initial Account Tier: Free (₹0)
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white text-[#165DAD] border border-blue-200">
                  Admin Approval Required for Paid Plans
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                All new registrations begin as Free accounts. After signing in, submit a simulated{' '}
                <strong>Basic (₹3,000)</strong> or <strong>Full (₹33,000)</strong> activation request from your
                Member Dashboard for administrative clearance.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-[#165DAD] hover:bg-[#124B8D] text-white text-xs font-semibold transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? 'Creating Account...' : 'Complete Registration'}
            </button>
          </form>

          <div className="text-center text-xs text-slate-500">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-[#165DAD] hover:underline font-semibold">
              Sign In Here
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
