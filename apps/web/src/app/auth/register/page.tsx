'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { User, Mail, Phone, Lock, Share2, AlertCircle, CheckCircle2, Loader2, UserCheck } from 'lucide-react';
import Navbar from '../../../components/Navbar';
import Footer from '../../../components/Footer';
import AskrLogo from '../../../components/AskrLogo';
import { fetchApi, setAuthSession } from '../../../lib/api';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [side, setSide] = useState<'LEFT' | 'RIGHT' | undefined>(undefined);
  const [isReferralLocked, setIsReferralLocked] = useState(false);
  const [sponsorMemberId, setSponsorMemberId] = useState('');
  const [sponsorInfo, setSponsorInfo] = useState<{ memberId: string; fullName: string } | null>(null);
  const [sponsorChecking, setSponsorChecking] = useState(false);
  const [sponsorError, setSponsorError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [registrationSuccess, setRegistrationSuccess] = useState<any | null>(null);
  const [isRegistrationPaused, setIsRegistrationPaused] = useState<boolean>(
    process.env.NEXT_PUBLIC_REGISTRATION_PAUSED === 'true'
  );

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
    const sideParam = (searchParams.get('side') || searchParams.get('position'))?.toUpperCase().trim();

    if (refCode && (sideParam === 'RIGHT' || sideParam === 'LEFT')) {
      // PERMANENT REFERRAL PLACEMENT LOCK: both sponsor and leg locked to sponsor's directional link
      setIsReferralLocked(true);
      setSide(sideParam as 'LEFT' | 'RIGHT');
      const clean = refCode.toUpperCase().trim();
      setSponsorMemberId(clean);
      lookupSponsor(clean);
    } else {
      setIsReferralLocked(false);
      if (refCode) {
        const clean = refCode.toUpperCase().trim();
        setSponsorMemberId(clean);
        lookupSponsor(clean);
      }
      if (sideParam === 'RIGHT') {
        setSide('RIGHT');
      } else if (sideParam === 'LEFT') {
        setSide('LEFT');
      } else {
        setSide(undefined);
      }
    }

    // Check dynamic registration pause status from API
    fetchApi('/auth/registration-status')
      .then((res: any) => {
        if (res?.registrationPaused !== undefined) {
          setIsRegistrationPaused(Boolean(res.registrationPaused));
        }
      })
      .catch(() => { });
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegistrationPaused) {
      setError("We're currently upgrading the ASKR EV experience. New member registrations will resume soon. Existing members can continue using their accounts normally.");
      return;
    }
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

    if (!side) {
      setError('Please select your placement team leg (LEFT or RIGHT). Team leg selection is mandatory.');
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

      setAuthSession(data.user, data.csrfToken);
      setRegistrationSuccess({
        user: data.user,
        memberId: data.user.memberId,
        fullName,
        email,
        side: data.user.intendedBinarySide || side,
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
            <div className="flex justify-center">
              <AskrLogo variant="full" size="md" href="/" />
            </div>

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
            <div className="flex justify-center">
              <AskrLogo variant="full" size="md" href="/" />
            </div>
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold text-[#253247]">Register Member Account</h1>
              <p className="text-xs text-slate-500">
                Create your account to access customer services and EV reservations
              </p>
            </div>

            {isRegistrationPaused && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2.5 shadow-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0 text-amber-700">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                    REGISTRATIONS TEMPORARILY PAUSED
                  </h2>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed pl-8">
                  We're currently upgrading the ASKR EV experience. New member registrations will resume soon. Existing members can continue using their accounts normally.
                </p>
                <div className="pt-1 pl-8 flex flex-wrap gap-2">
                  <Link
                    href="/auth/login"
                    className="inline-flex items-center px-3.5 py-1.5 rounded-lg bg-[#165DAD] hover:bg-[#124B8D] text-white text-xs font-semibold transition-colors shadow-xs"
                  >
                    Sign In to Existing Account
                  </Link>
                  <Link
                    href="/"
                    className="inline-flex items-center px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors"
                  >
                    Return Home
                  </Link>
                </div>
              </div>
            )}

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
                    disabled={loading || isRegistrationPaused}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Rahul Sharma"
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 focus:border-[#165DAD] focus:outline-none text-xs text-[#253247] placeholder:text-slate-400 disabled:bg-slate-100 disabled:text-slate-400"
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
                      disabled={loading || isRegistrationPaused}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 focus:border-[#165DAD] focus:outline-none text-xs text-[#253247] placeholder:text-slate-400 disabled:bg-slate-100 disabled:text-slate-400"
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
                      disabled={loading || isRegistrationPaused}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 focus:border-[#165DAD] focus:outline-none text-xs text-[#253247] placeholder:text-slate-400 disabled:bg-slate-100 disabled:text-slate-400"
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
                    disabled={loading || isRegistrationPaused}
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 focus:border-[#165DAD] focus:outline-none text-xs text-[#253247] placeholder:text-slate-400 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#253247]">
                    Sponsor Referral Code <span className="text-red-500">*</span>
                  </label>
                  {isReferralLocked ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-[#165DAD] font-bold bg-[#165DAD]/10 px-2 py-0.5 rounded-full">
                      <Lock className="w-2.5 h-2.5" /> Locked via Referral Link
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium">Mandatory</span>
                  )}
                </div>
                <div className="relative">
                  {isReferralLocked ? (
                    <Lock className="w-4 h-4 text-[#165DAD] absolute left-3 top-3" />
                  ) : (
                    <Share2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  )}
                  <input
                    type="text"
                    required
                    readOnly={isReferralLocked}
                    disabled={loading || isRegistrationPaused}
                    value={sponsorMemberId}
                    onChange={(e) => {
                      if (isReferralLocked) return;
                      const val = e.target.value.toUpperCase();
                      setSponsorMemberId(val);
                      if (val.length >= 6) {
                        lookupSponsor(val);
                      } else {
                        setSponsorInfo(null);
                        setSponsorError(null);
                      }
                    }}
                    onBlur={() => {
                      if (!isReferralLocked) lookupSponsor(sponsorMemberId);
                    }}
                    placeholder="e.g. ASKR-ADMIN-01"
                    className={`w-full pl-9 pr-9 py-2.5 rounded-lg border text-xs text-[#253247] font-mono uppercase placeholder:text-slate-400 focus:outline-none transition-colors ${
                      isReferralLocked
                        ? 'bg-slate-50/80 border-[#165DAD]/40 font-bold text-[#165DAD] cursor-not-allowed select-none'
                        : sponsorInfo
                        ? 'border-emerald-500 bg-emerald-50/20'
                        : sponsorError
                        ? 'border-red-400 bg-red-50/20'
                        : 'border-slate-200 focus:border-[#165DAD]'
                    } disabled:bg-slate-100 disabled:text-slate-400`}
                  />
                  <div className="absolute right-3 top-2.5">
                    {sponsorChecking ? (
                      <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                    ) : isReferralLocked ? (
                      <Lock className="w-4 h-4 text-[#165DAD]" />
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

              {/* Binary Placement Team Selector / Locked Display */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-[#253247]">
                    Placement Team (Power Leg) <span className="text-red-500">*</span>
                  </label>
                  {isReferralLocked ? (
                    <span className="text-[10px] text-[#165DAD] font-bold">Designated by Link</span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium">Mandatory</span>
                  )}
                </div>

                {isReferralLocked ? (
                  /* Permanent Locked Leg Badge Card */
                  <div className="p-3.5 rounded-xl border-2 border-[#165DAD] bg-gradient-to-r from-blue-50/90 to-indigo-50/50 flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#165DAD] text-white flex items-center justify-center shadow-xs shrink-0">
                        <Lock className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#165DAD] uppercase tracking-wide">
                            {side === 'LEFT' ? 'LEFT TEAM (Locked)' : 'RIGHT TEAM (Locked)'}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#165DAD] text-white flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> LOCKED
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Permanently designated by sponsor {sponsorInfo ? `(${sponsorInfo.fullName})` : ''} via direct directional referral link.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Standard Manual Selector for Direct Non-Directional Registrations */
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={loading || isRegistrationPaused}
                      onClick={() => setSide('LEFT')}
                      className={`py-2.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${side === 'LEFT'
                          ? 'border-[#165DAD] bg-[#165DAD]/10 text-[#165DAD] ring-2 ring-[#165DAD]/20 font-bold'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                      <span>LEFT TEAM</span>
                      {side === 'LEFT' && <CheckCircle2 className="w-3.5 h-3.5 text-[#165DAD] shrink-0" />}
                    </button>
                    <button
                      type="button"
                      disabled={loading || isRegistrationPaused}
                      onClick={() => setSide('RIGHT')}
                      className={`py-2.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${side === 'RIGHT'
                          ? 'border-[#165DAD] bg-[#165DAD]/10 text-[#165DAD] ring-2 ring-[#165DAD]/20 font-bold'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                      <span>RIGHT TEAM</span>
                      {side === 'RIGHT' && <CheckCircle2 className="w-3.5 h-3.5 text-[#165DAD] shrink-0" />}
                    </button>
                  </div>
                )}
                <p className="mt-1 text-[10px] text-slate-500">
                  {side
                    ? `Your account will be permanently placed on your sponsor's ${side} power leg immediately upon registration.`
                    : 'Select either LEFT or RIGHT team. Automatic balancing is disabled per direct-selling binary policy.'}
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || isRegistrationPaused}
                className="w-full py-2.5 rounded-lg bg-[#165DAD] hover:bg-[#124B8D] text-white text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {isRegistrationPaused
                  ? 'Registrations Temporarily Paused'
                  : loading
                    ? 'Creating Account...'
                    : 'Complete Registration'}
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
