'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Zap,
  Menu,
  X,
  User,
  LogOut,
  LayoutDashboard,
  Bike,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  Ticket,
  ArrowRight,
} from 'lucide-react';
import { getStoredUser, clearAuthSession } from '../lib/api';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  useEffect(() => {
    setCurrentUser(getStoredUser());
  }, [pathname]);

  const handleLogout = () => {
    clearAuthSession();
    setCurrentUser(null);
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
    router.push('/auth/login');
  };

  const isAdmin =
    currentUser?.role &&
    ['SUPER_ADMIN', 'ADMIN_OPERATIONS', 'FINANCE_MANAGER'].includes(currentUser.role);

  const getPackageBadgeColor = (pkg?: string) => {
    switch (pkg) {
      case 'FULL':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'BASIC':
        return 'bg-electric-500/20 text-electric-300 border-electric-500/40';
      default:
        return 'bg-slate-700/50 text-slate-300 border-slate-600/50';
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-navy-950/85 backdrop-blur-md border-b border-navy-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-electric-600 to-electric-400 flex items-center justify-center text-white shadow-lg shadow-electric-500/25 group-hover:scale-105 transition-transform">
              <Zap className="w-6 h-6 fill-white text-white" />
            </div>
            <div>
              <div className="text-2xl font-black tracking-wider text-white flex items-center gap-1.5">
                <span>ASKR</span>
                <span className="text-electric-400">EV</span>
              </div>
              <span className="block text-[10px] tracking-widest text-slate-400 font-semibold uppercase -mt-0.5">
                Electric Mobility
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
            <Link
              href="/"
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                pathname === '/'
                  ? 'text-white bg-navy-800'
                  : 'text-slate-300 hover:text-white hover:bg-navy-900'
              }`}
            >
              Home
            </Link>
            <Link
              href="/bikes"
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 ${
                pathname.startsWith('/bikes')
                  ? 'text-electric-400 bg-navy-800'
                  : 'text-slate-300 hover:text-white hover:bg-navy-900'
              }`}
            >
              <Bike className="w-4 h-4" />
              <span>EV Superbikes</span>
            </Link>
            <Link
              href="/#membership"
              className="px-3.5 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-navy-900 transition-colors"
            >
              Membership Plans
            </Link>
            <Link
              href="/#ecosystem"
              className="px-3.5 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-navy-900 transition-colors"
            >
              Ecosystem & Specs
            </Link>
            {currentUser && (
              <Link
                href="/dashboard"
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                  pathname.startsWith('/dashboard')
                    ? 'text-electric-400 bg-navy-800'
                    : 'text-slate-300 hover:text-white hover:bg-navy-900'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Member Portal</span>
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/admin"
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                  pathname.startsWith('/admin')
                    ? 'text-amber-400 bg-navy-800'
                    : 'text-slate-300 hover:text-amber-400 hover:bg-navy-900'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Admin Hub</span>
              </Link>
            )}
          </div>

          {/* Right Action / Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-navy-900 border border-navy-700/80 hover:border-slate-500 transition-all text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-navy-800 to-navy-700 border border-navy-600 flex items-center justify-center text-electric-400 font-bold text-xs">
                    {currentUser.fullName ? currentUser.fullName[0].toUpperCase() : 'M'}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white leading-tight">
                      {currentUser.memberId}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded border uppercase ${getPackageBadgeColor(
                          currentUser.currentPackage
                        )}`}
                      >
                        {currentUser.currentPackage || 'FREE'}
                      </span>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-navy-900/95 border border-navy-700/80 shadow-2xl backdrop-blur-xl py-2 z-50">
                    <div className="px-4 py-2.5 border-b border-navy-800">
                      <div className="text-xs font-semibold text-slate-400">Signed in as</div>
                      <div className="text-sm font-bold text-white truncate">
                        {currentUser.fullName || currentUser.email}
                      </div>
                      <div className="text-[11px] text-electric-400 font-mono mt-0.5">
                        ID: {currentUser.memberId}
                      </div>
                    </div>
                    <div className="py-1">
                      <Link
                        href="/dashboard"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-navy-800 transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4 text-electric-400" />
                        <span>Member Portal</span>
                      </Link>
                      <Link
                        href="/bikes"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-navy-800 transition-colors"
                      >
                        <Bike className="w-4 h-4 text-emerald-400" />
                        <span>Book EV Superbike</span>
                      </Link>
                      {isAdmin && (
                        <Link
                          href="/admin"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-amber-400 hover:bg-navy-800 transition-colors"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span>Admin Hub</span>
                        </Link>
                      )}
                    </div>
                    <div className="pt-1 border-t border-navy-800">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <Link
                  href="/auth/login"
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-200 hover:text-white bg-navy-900 hover:bg-navy-800 border border-navy-700 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-electric-600 to-electric-500 hover:from-electric-500 hover:to-electric-400 shadow-md shadow-electric-500/20 transition-all flex items-center gap-1.5"
                >
                  <span>Free Register</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-navy-900 border border-navy-700 text-slate-300 hover:text-white"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Responsive Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-navy-950/98 border-b border-navy-800 px-4 pt-3 pb-6 space-y-3">
          {currentUser && (
            <div className="p-3.5 rounded-2xl bg-navy-900 border border-navy-700/80 flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-navy-800 to-navy-700 border border-navy-600 flex items-center justify-center text-electric-400 font-bold text-sm">
                  {currentUser.fullName ? currentUser.fullName[0].toUpperCase() : 'M'}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">{currentUser.fullName}</div>
                  <div className="text-[11px] text-electric-400 font-mono">
                    {currentUser.memberId}
                  </div>
                </div>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getPackageBadgeColor(
                  currentUser.currentPackage
                )}`}
              >
                {currentUser.currentPackage || 'FREE'}
              </span>
            </div>
          )}

          <div className="space-y-1">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3.5 py-2.5 rounded-xl text-base font-semibold ${
                pathname === '/' ? 'text-white bg-navy-800' : 'text-slate-300'
              }`}
            >
              Home
            </Link>
            <Link
              href="/bikes"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3.5 py-2.5 rounded-xl text-base font-semibold ${
                pathname.startsWith('/bikes') ? 'text-electric-400 bg-navy-800' : 'text-slate-300'
              }`}
            >
              EV Superbikes
            </Link>
            <Link
              href="/#membership"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3.5 py-2.5 rounded-xl text-base font-semibold text-slate-300"
            >
              Membership Plans
            </Link>
            <Link
              href="/#ecosystem"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3.5 py-2.5 rounded-xl text-base font-semibold text-slate-300"
            >
              Ecosystem & Specs
            </Link>

            {currentUser && (
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3.5 py-2.5 rounded-xl text-base font-semibold ${
                  pathname.startsWith('/dashboard')
                    ? 'text-electric-400 bg-navy-800'
                    : 'text-slate-300'
                }`}
              >
                Member Portal
              </Link>
            )}

            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3.5 py-2.5 rounded-xl text-base font-semibold ${
                  pathname.startsWith('/admin') ? 'text-amber-400 bg-navy-800' : 'text-slate-300'
                }`}
              >
                Admin Hub
              </Link>
            )}
          </div>

          <div className="pt-3 border-t border-navy-800 space-y-2">
            {currentUser ? (
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-semibold text-sm"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Link
                  href="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-3 text-center rounded-xl bg-navy-900 border border-navy-700 text-slate-200 font-semibold text-sm"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-3 text-center rounded-xl bg-gradient-to-r from-electric-600 to-electric-500 text-white font-bold text-sm shadow-md"
                >
                  Register Free
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
