'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Menu,
  X,
  User,
  LogOut,
  LayoutDashboard,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import { getStoredUser, logoutSession } from '../lib/api';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  useEffect(() => {
    setCurrentUser(getStoredUser());
  }, [pathname]);

  const handleLogout = async () => {
    await logoutSession();
    setCurrentUser(null);
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
    router.push('/auth/login');
  };

  const isAdmin =
    currentUser?.role &&
    ['SUPER_ADMIN', 'ADMIN_OPERATIONS', 'FINANCE_MANAGER'].includes(currentUser.role);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#165DAD] flex items-center justify-center text-white font-black text-xl shadow-sm">
              A
            </div>
            <div>
              <div className="text-xl font-bold tracking-tight text-[#253247] leading-tight">
                ASKR <span className="text-[#165DAD]">EV</span>
              </div>
              <span className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Mobility
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className={`text-sm font-medium transition-colors ${
                pathname === '/' ? 'text-[#165DAD] font-semibold' : 'text-slate-600 hover:text-[#165DAD]'
              }`}
            >
              Home
            </Link>
            <Link
              href="/bikes"
              className={`text-sm font-medium transition-colors ${
                pathname.startsWith('/bikes') ? 'text-[#165DAD] font-semibold' : 'text-slate-600 hover:text-[#165DAD]'
              }`}
            >
              EV Bikes
            </Link>
            <Link
              href="/#membership"
              className="text-sm font-medium text-slate-600 hover:text-[#165DAD] transition-colors"
            >
              Membership
            </Link>
            {currentUser && (
              <Link
                href="/dashboard"
                className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  pathname.startsWith('/dashboard')
                    ? 'text-[#165DAD] font-semibold'
                    : 'text-slate-600 hover:text-[#165DAD]'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Member Portal</span>
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/admin"
                className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  pathname.startsWith('/admin')
                    ? 'text-[#165DAD] font-semibold'
                    : 'text-slate-600 hover:text-[#165DAD]'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-slate-500" />
                <span>Admin Hub</span>
              </Link>
            )}
          </nav>

          {/* User Account / Auth Actions */}
          <div className="hidden md:flex items-center gap-4">
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white transition-colors text-left"
                >
                  <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-[#165DAD] font-bold text-xs">
                    {currentUser.fullName ? currentUser.fullName[0].toUpperCase() : 'M'}
                  </div>
                  <div className="text-xs">
                    <div className="font-semibold text-[#253247]">{currentUser.memberId}</div>
                    <div className="text-[10px] text-slate-500">{currentUser.currentPackage || 'FREE'}</div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-52 rounded-lg bg-white border border-slate-200 shadow-md py-1.5 z-50">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <div className="text-xs font-semibold text-[#253247] truncate">
                        {currentUser.fullName || currentUser.email}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {currentUser.memberId}
                      </div>
                    </div>
                    <div className="py-1">
                      <Link
                        href="/dashboard"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-[#165DAD]"
                      >
                        <LayoutDashboard className="w-3.5 h-3.5 text-slate-400" />
                        <span>Member Dashboard</span>
                      </Link>
                      {isAdmin && (
                        <Link
                          href="/admin"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-[#165DAD]"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                          <span>Admin Console</span>
                        </Link>
                      )}
                    </div>
                    <div className="pt-1 border-t border-slate-100">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 text-left"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/auth/login"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-[#165DAD] transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/auth/register"
                  className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-[#165DAD] hover:bg-[#124B8D] transition-colors shadow-sm"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-2">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-3 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50 min-h-[44px] flex items-center"
          >
            Home
          </Link>
          <Link
            href="/bikes"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-3 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50 min-h-[44px] flex items-center"
          >
            EV Bikes
          </Link>
          <Link
            href="/#membership"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-3 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50 min-h-[44px] flex items-center"
          >
            Membership
          </Link>
          {currentUser && (
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-3 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50 min-h-[44px] flex items-center"
            >
              Member Portal
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-3 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50 min-h-[44px] flex items-center"
            >
              Admin Hub
            </Link>
          )}

          <div className="pt-3 border-t border-slate-100">
            {currentUser ? (
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 min-h-[48px] py-3 rounded-lg border border-red-200 text-red-600 text-base font-medium hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <Link
                  href="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="min-h-[46px] flex items-center justify-center text-center rounded-lg border border-slate-200 text-slate-700 text-base font-medium hover:bg-slate-50"
                >
                  Login
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="min-h-[46px] flex items-center justify-center text-center rounded-lg bg-[#165DAD] text-white text-base font-medium hover:bg-[#124B8D] shadow-sm"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
