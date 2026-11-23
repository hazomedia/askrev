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
  const [side, setSide] = useState<'LEFT' | 'RIGHT' | undefined>(undefined);
  const [sponsorMemberId, setSponsorMemberId] = useState('');
  const [sponsorInfo, setSponsorInfo] = useState<{ memberId: string; fullName: string } | null>(null);
  const [sponsorChecking, setSponsorChecking] = useState(false);
  const [sponsorError, setSponsorError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [registrationSuccess, setRegistrationSuccess] = useState<any | null>(null);

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
    if (sideParam === 'RIGHT') {
      setSide('RIGHT');
    } else if (sideParam === 'LEFT') {
      setSide('LEFT');
    } else {
      setSide(undefined);
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
          side: side || undefined,
        }),
      });

      setAuthSession(data.user, data.csrfToken);
      setRegistrationSuccess({
        user: data.user,
        memberId: data.user.memberId,
        fullName,
        email,
        side: data.user.intendedBinarySide || side || 'AUTO',
        sponsorName: sponsorInfo?.fullName,
        sponsorId: sponsorMemberId.trim().toUpperCase(),
      });
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
        {registrationSuccess ? (
          <div className="max-w-lg w-full bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center border border-emerald-200 shadow-xs">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-widest text-[#165DAD]">
                Registration Confirmed
              </span>
              <h1 className="text-2xl font-black text-[#253247]">
                Welcome to ASKR EV!
              </h1>
              <p className="text-xs text-slate-500">
                Your official membership credentials have been registered in the system.
              </p>
            </div>

            {/* Credential Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-2 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500">Assigned Member ID:</span>
                <span className="font-mono text-sm font-black text-[#165DAD] bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                  {registrationSuccess.memberId}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Member Name:</span>
                <span className="font-bold text-[#253247]">{registrationSuccess.fullName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Registered Email:</span>
                <span className="font-medium text-[#253247]">{registrationSuccess.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Sponsor:</span>
                <span className="font-medium text-[#253247]">{registrationSuccess.sponsorName || registrationSuccess.sponsorId}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                <span className="text-slate-500">Placement Side:</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                  {registrationSuccess.side} LEG
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => router.push('/dashboard?book=true')}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#165DAD] to-[#1D4ED8] hover:from-[#134e94] hover:to-[#1742b6] text-white text-xs sm:text-sm font-bold uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2"
              >
                <span>Book EV / Activate Package</span>
                <span className="text-blue-200">→</span>
              </button>

              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
              >
                Continue to Member Dashboard
              </button>
            </div>
          </div>
        ) : (
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
      )}
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
