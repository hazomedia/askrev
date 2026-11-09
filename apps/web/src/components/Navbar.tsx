'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Zap, Menu, X, ShieldAlert, User, LogOut, LayoutDashboard, Bike, Cpu, ShieldCheck } from 'lucide-react';
import { getStoredUser, clearAuthSession } from '../lib/api';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setCurrentUser(getStoredUser());
  }, [pathname]);

  const handleLogout = () => {
    clearAuthSession();
    setCurrentUser(null);
    router.push('/auth/login');
  };

  const isAdmin = currentUser?.role && ['SUPER_ADMIN', 'ADMIN_OPERATIONS', 'FINANCE_MANAGER'].includes(currentUser.role);

  return (
    <nav className="sticky top-0 z-50 bg-navy-950/80 backdrop-blur-md border-b border-navy-700/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-electric-600 to-electric-400 flex items-center justify-center text-white shadow-lg shadow-electric-500/20 group-hover:scale-105 transition-transform">
              <Zap className="w-6 h-6 fill-white text-white" />
            </div>
            <div>
              <span className="text-xl font-black tracking-wider text-white">ASKR <span className="text-electric-400">EV</span></span>
              <span className="block text-[10px] tracking-widest text-navy-600 font-semibold uppercase -mt-1">Next-Gen Mobility</span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
            <Link
              href="/"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/' ? 'text-electric-400 bg-navy-800' : 'text-slate-300 hover:text-white hover:bg-navy-800/60'
              }`}
            >
              Home
            </Link>
            <Link
              href="/bikes"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                pathname === '/bikes' ? 'text-electric-400 bg-navy-800' : 'text-slate-300 hover:text-white hover:bg-navy-800/60'
              }`}
            >
              <Bike className="w-4 h-4" />
              EV Bikes
            </Link>
            <Link
              href="/simulator"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                pathname === '/simulator' ? 'text-electric-400 bg-navy-800' : 'text-slate-300 hover:text-white hover:bg-navy-800/60'
              }`}
            >
              <Cpu className="w-4 h-4 text-emerald-400" />
              Simulation Engine
            </Link>
            {currentUser && (
              <Link
                href="/dashboard"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  pathname === '/dashboard' ? 'text-electric-400 bg-navy-800' : 'text-slate-300 hover:text-white hover:bg-navy-800/60'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/admin"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  pathname === '/admin' ? 'text-amber-400 bg-navy-800' : 'text-slate-300 hover:text-amber-400 hover:bg-navy-800/60'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                Admin Panel
              </Link>
            )}
          </div>

          {/* User Account / Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Phase 1 Sandbox
            </div>

            {currentUser ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-navy-800 border border-navy-700 hover:border-electric-500/50 transition-all text-xs text-slate-200"
                >
                  <div className="w-6 h-6 rounded-full bg-electric-500/20 flex items-center justify-center text-electric-400 font-bold">
                    {currentUser.fullName ? currentUser.fullName[0].toUpperCase() : 'U'}
                  </div>
                  <span className="font-medium truncate max-w-[120px]">{currentUser.fullName}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-navy-950 text-electric-400 border border-navy-700">
                    {currentUser.memberId}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-1.5 rounded-lg bg-navy-800 text-slate-400 hover:text-rose-400 hover:bg-navy-700 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/login"
                  className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-slate-200 hover:text-white hover:bg-navy-800 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  className="px-3.5 py-1.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-electric-600 to-electric-500 hover:from-electric-500 hover:to-electric-400 shadow-md shadow-electric-600/20 transition-all"
                >
                  Register Free
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-navy-800 text-slate-300 hover:text-white focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden px-4 pt-2 pb-4 bg-navy-900 border-b border-navy-700 space-y-2">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-navy-800"
          >
            Home
          </Link>
          <Link
            href="/bikes"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-navy-800"
          >
            EV Bikes Catalogue
          </Link>
          <Link
            href="/simulator"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-emerald-400 hover:bg-navy-800"
          >
            Commission Simulator
          </Link>
          {currentUser && (
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-navy-800"
            >
              Dashboard ({currentUser.memberId})
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-amber-400 hover:bg-navy-800"
            >
              Admin Operations Panel
            </Link>
          )}
          <div className="pt-2 border-t border-navy-800">
            {currentUser ? (
              <button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-rose-400 hover:bg-navy-800"
              >
                Sign Out ({currentUser.fullName})
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  href="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center px-3 py-2 rounded-md text-sm font-medium bg-navy-800 text-slate-200"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center px-3 py-2 rounded-md text-sm font-semibold bg-electric-600 text-white"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
