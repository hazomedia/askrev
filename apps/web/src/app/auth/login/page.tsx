'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Zap,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Bike,
  Sparkles,
} from 'lucide-react';
import { fetchApi, setAuthSession } from '../../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data: any = await fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      setAuthSession(data.tokens.accessToken, data.user);

      if (['SUPER_ADMIN', 'ADMIN_OPERATIONS', 'FINANCE_MANAGER'].includes(data.user.role)) {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative min-h-[calc(100vh-140px)]">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-96 gradient-glow pointer-events-none opacity-50" />

      <div className="max-w-md w-full space-y-8 card-gradient p-8 sm:p-10 rounded-3xl border border-navy-700/80 shadow-2xl relative z-10">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-4 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-electric-600 to-electric-400 flex items-center justify-center text-white shadow-lg shadow-electric-500/25 group-hover:scale-105 transition-transform">
              <Zap className="w-7 h-7 fill-white text-white" />
            </div>
          </Link>
          <h2 className="text-3xl font-black text-white">Sign In to ASKR EV</h2>
          <p className="mt-2 text-xs text-slate-400">
            Access your Member Portal, EV bookings, and shopping voucher balances.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="member@askrev.local"
                className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-navy-950 border border-navy-700 focus:border-electric-500 focus:outline-none text-white text-sm placeholder:text-slate-600"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">Password</label>
              <span className="text-[11px] text-slate-500">Secured via Bcrypt</span>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-navy-950 border border-navy-700 focus:border-electric-500 focus:outline-none text-white text-sm placeholder:text-slate-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-electric-600 via-electric-500 to-emerald-500 hover:from-electric-500 hover:to-emerald-400 shadow-xl shadow-electric-500/25 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            <Zap className="w-4 h-4 fill-white" />
            <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
          </button>
        </form>

        {/* Demo Fast Login Switcher for QA */}
        <div className="pt-4 border-t border-navy-800">
          <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-2.5 flex items-center justify-between">
            <span>Quick Demo Accounts (QA)</span>
            <span className="text-emerald-400 font-normal">Click to Autofill</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => fillDemo('superadmin@askrev.local', 'SuperAdmin@AskREV2026!')}
              className="p-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 border border-navy-700 text-left transition-colors"
            >
              <div className="font-bold text-amber-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Super Admin
              </div>
              <div className="text-[10px] text-slate-400 truncate">superadmin@askrev.local</div>
            </button>

            <button
              type="button"
              onClick={() => fillDemo('member.a@askrev.local', 'MemberA@AskREV2026!')}
              className="p-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 border border-navy-700 text-left transition-colors"
            >
              <div className="font-bold text-electric-400 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5" /> Active Member
              </div>
              <div className="text-[10px] text-slate-400 truncate">member.a@askrev.local</div>
            </button>

            <button
              type="button"
              onClick={() => fillDemo('ops@askrev.local', 'OpsAdmin@AskREV2026!')}
              className="p-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 border border-navy-700 text-left transition-colors"
            >
              <div className="font-bold text-slate-300">Operations Admin</div>
              <div className="text-[10px] text-slate-400 truncate">ops@askrev.local</div>
            </button>

            <button
              type="button"
              onClick={() => fillDemo('user.free@askrev.local', 'FreeUser@AskREV2026!')}
              className="p-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 border border-navy-700 text-left transition-colors"
            >
              <div className="font-bold text-slate-400">Free Registered</div>
              <div className="text-[10px] text-slate-400 truncate">user.free@askrev.local</div>
            </button>
          </div>
        </div>

        <div className="text-center text-xs text-slate-400">
          Don't have an ASKR EV account yet?{' '}
          <Link href="/auth/register" className="text-electric-400 hover:text-electric-300 font-bold underline">
            Register for Free
          </Link>
        </div>
      </div>
    </div>
  );
}
