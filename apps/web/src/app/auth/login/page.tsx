'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import Navbar from '../../../components/Navbar';
import Footer from '../../../components/Footer';
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
      setError(err.message || 'Login failed. Please verify your credentials.');
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
              <label className="block text-xs font-semibold text-[#253247] mb-1">
                Password
              </label>
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-[#165DAD] hover:bg-[#124B8D] text-white text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          {/* Quick Demo Autofill Switcher for QA */}
          <div className="pt-4 border-t border-slate-100">
            <div className="text-[11px] font-semibold text-slate-400 mb-2">
              Quick QA Accounts:
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillDemo('superadmin@askrev.local', 'SuperAdmin@AskREV2026!')}
                className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-left hover:border-slate-300 transition-colors"
              >
                <div className="font-semibold text-[#253247]">Super Admin</div>
                <div className="text-[10px] text-slate-400 truncate">superadmin@...</div>
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
