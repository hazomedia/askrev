'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Zap, Lock, Mail, User, Phone, ArrowRight, Share2, CheckCircle2 } from 'lucide-react';
import { fetchApi, setAuthSession } from '../../../lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [sponsorMemberId, setSponsorMemberId] = useState('');
  const [initialPackage, setInitialPackage] = useState('FREE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          sponsorMemberId: sponsorMemberId || undefined,
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
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-lg w-full space-y-6 card-gradient p-8 rounded-2xl border-navy-700 shadow-2xl relative">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-electric-600 to-electric-400 flex items-center justify-center text-white shadow-lg shadow-electric-500/20 mb-3">
            <Zap className="w-7 h-7 fill-white text-white" />
          </div>
          <h2 className="text-2xl font-black text-white">Create ASKR EV Account</h2>
          <p className="mt-1 text-xs text-slate-400">
            Instant unique Member ID • Referral system • Direct Selling compliance
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Full Legal Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Rahul Sharma"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-navy-950 border border-navy-700 focus:border-electric-500 focus:outline-none text-white text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rahul@example.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-navy-950 border border-navy-700 focus:border-electric-500 focus:outline-none text-white text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number (Optional)</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-navy-950 border border-navy-700 focus:border-electric-500 focus:outline-none text-white text-sm"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-navy-950 border border-navy-700 focus:border-electric-500 focus:outline-none text-white text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Sponsor Member ID (Optional)
            </label>
            <div className="relative">
              <Share2 className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              <input
                type="text"
                value={sponsorMemberId}
                onChange={(e) => setSponsorMemberId(e.target.value)}
                placeholder="e.g. ASKR-100001"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-navy-950 border border-navy-700 focus:border-electric-500 focus:outline-none text-white text-sm"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Leave blank if you were not referred by a sponsor.</p>
          </div>

          {/* Package Selection */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-300 mb-2">Initial Package Choice</label>
            <div className="grid grid-cols-3 gap-2">
              <label
                className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                  initialPackage === 'FREE'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                    : 'border-navy-700 bg-navy-950 text-slate-400 hover:border-slate-500'
                }`}
              >
                <input
                  type="radio"
                  name="package"
                  value="FREE"
                  checked={initialPackage === 'FREE'}
                  onChange={() => setInitialPackage('FREE')}
                  className="sr-only"
                />
                <div className="text-xs font-bold">Free</div>
                <div className="text-sm font-black mt-0.5">₹0</div>
              </label>

              <label
                className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                  initialPackage === 'BASIC'
                    ? 'border-electric-500 bg-electric-500/10 text-electric-300'
                    : 'border-navy-700 bg-navy-950 text-slate-400 hover:border-slate-500'
                }`}
              >
                <input
                  type="radio"
                  name="package"
                  value="BASIC"
                  checked={initialPackage === 'BASIC'}
                  onChange={() => setInitialPackage('BASIC')}
                  className="sr-only"
                />
                <div className="text-xs font-bold">Basic</div>
                <div className="text-sm font-black mt-0.5">₹3,000</div>
              </label>

              <label
                className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                  initialPackage === 'FULL'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                    : 'border-navy-700 bg-navy-950 text-slate-400 hover:border-slate-500'
                }`}
              >
                <input
                  type="radio"
                  name="package"
                  value="FULL"
                  checked={initialPackage === 'FULL'}
                  onChange={() => setInitialPackage('FULL')}
                  className="sr-only"
                />
                <div className="text-xs font-bold">Full Qualified</div>
                <div className="text-sm font-black mt-0.5">₹33,000</div>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-electric-600 to-electric-500 hover:from-electric-500 hover:to-electric-400 shadow-lg shadow-electric-600/25 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
          >
            {loading ? 'Creating Member Account...' : 'Complete Free Registration'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center text-xs text-slate-400">
          Already registered?{' '}
          <Link href="/auth/login" className="text-electric-400 hover:underline font-semibold">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
