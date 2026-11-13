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
  ArrowRight,
} from 'lucide-react';
import AskrLogo from './AskrLogo';
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
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-neutral-200 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 sm:h-20">
          {/* Brand Logo - Official ASKR EV */}
          <AskrLogo theme="light" size="md" href="/" />

          {/* Desktop Navigation Links — Strictly Vehicle Focused (Ola Electric Style) */}
          <nav className="hidden md:flex items-center space-x-8" aria-label="Main Navigation">
            <Link
              href="/scooters"
              className={`text-sm tracking-normal transition-colors py-1 ${
                pathname === '/scooters'
                  ? 'text-black font-bold border-b-2 border-black'
                  : 'text-neutral-600 hover:text-black font-medium'
              }`}
            >
              Scooters
            </Link>

            <Link
              href="/bikes"
              className={`text-sm tracking-normal transition-colors py-1 ${
                pathname === '/bikes'
                  ? 'text-black font-bold border-b-2 border-black'
                  : 'text-neutral-600 hover:text-black font-medium'
              }`}
            >
              Bikes
            </Link>

            <Link
              href="/cycles"
              className={`text-sm tracking-normal transition-colors py-1 ${
                pathname === '/cycles'
                  ? 'text-black font-bold border-b-2 border-black'
                  : 'text-neutral-600 hover:text-black font-medium'
              }`}
            >
              Cycles
            </Link>

            <Link
              href="/jeeps"
              className={`text-sm tracking-normal transition-colors py-1 ${
                pathname === '/jeeps'
                  ? 'text-black font-bold border-b-2 border-black'
                  : 'text-neutral-600 hover:text-black font-medium'
              }`}
            >
              Jeeps
            </Link>
          </nav>

          {/* User Account / Auth & Book CTA */}
          <div className="hidden md:flex items-center gap-4">
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-neutral-200 hover:border-neutral-300 bg-neutral-50 transition-colors text-left"
                  aria-expanded={userDropdownOpen}
                >
                  <div className="w-6 h-6 rounded-full bg-[#165DAD] flex items-center justify-center text-white font-bold text-[11px]">
                    {currentUser.fullName ? currentUser.fullName[0].toUpperCase() : 'M'}
                  </div>
                  <div className="text-xs">
                    <span className="font-semibold text-neutral-900">{currentUser.memberId}</span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-neutral-200 shadow-xl py-2 z-50">
                    <div className="px-4 py-2 border-b border-neutral-100">
                      <div className="text-xs font-semibold text-neutral-900 truncate">
                        {currentUser.fullName || currentUser.email}
                      </div>
                      <div className="text-[11px] text-neutral-500 font-mono mt-0.5">
                        {currentUser.memberId}
                      </div>
                    </div>
                    <div className="py-1 text-xs">
                      <Link
                        href="/dashboard"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-neutral-700 hover:text-black hover:bg-neutral-50 transition-colors font-medium"
                      >
                        <LayoutDashboard className="w-4 h-4 text-[#165DAD]" />
                        <span>Member Dashboard</span>
                      </Link>
                      {isAdmin && (
                        <Link
                          href="/admin"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-neutral-700 hover:text-black hover:bg-neutral-50 transition-colors font-medium"
                        >
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span>Admin Control Center</span>
                        </Link>
                      )}
                    </div>
                    <div className="border-t border-neutral-100 pt-1">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/auth/login"
                className="text-sm font-semibold text-neutral-800 hover:text-black transition-colors px-3 py-2"
              >
                Login
              </Link>
            )}

            {/* Book Now Primary Pill Button */}
            <Link
              href="/bikes"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-black hover:bg-neutral-800 text-white text-xs font-semibold tracking-wide transition-all shadow-xs"
            >
              <span>Book Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-3 md:hidden">
            <Link
              href="/bikes"
              className="px-4 py-1.5 rounded-full bg-black text-white text-xs font-semibold"
            >
              Book
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-neutral-700 hover:bg-neutral-100 transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-neutral-200 px-4 pt-2 pb-6 space-y-3">
          <nav className="flex flex-col space-y-1 text-sm">
            <Link
              href="/scooters"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-3 py-2.5 rounded-xl font-medium transition-colors ${
                pathname === '/scooters' ? 'bg-neutral-100 text-black font-semibold' : 'text-neutral-700'
              }`}
            >
              Scooters
            </Link>

            <Link
              href="/bikes"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-3 py-2.5 rounded-xl font-medium transition-colors ${
                pathname === '/bikes' ? 'bg-neutral-100 text-black font-semibold' : 'text-neutral-700'
              }`}
            >
              Bikes
            </Link>

            <Link
              href="/cycles"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-3 py-2.5 rounded-xl font-medium transition-colors ${
                pathname === '/cycles' ? 'bg-neutral-100 text-black font-semibold' : 'text-neutral-700'
              }`}
            >
              Cycles
            </Link>

            <Link
              href="/jeeps"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-3 py-2.5 rounded-xl font-medium transition-colors ${
                pathname === '/jeeps' ? 'bg-neutral-100 text-black font-semibold' : 'text-neutral-700'
              }`}
            >
              Jeeps
            </Link>

            {currentUser ? (
              <>
                <div className="border-t border-neutral-200 my-2 pt-2" />
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2.5 rounded-xl font-semibold text-[#165DAD] hover:bg-blue-50 flex items-center gap-2"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Member Dashboard ({currentUser.memberId})</span>
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2.5 rounded-xl font-semibold text-emerald-700 hover:bg-emerald-50 flex items-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Admin Control Center</span>
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="px-3 py-2.5 rounded-xl text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <div className="pt-3 border-t border-neutral-200 flex flex-col gap-2">
                <Link
                  href="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-full border border-neutral-300 text-neutral-800 text-sm font-semibold hover:bg-neutral-50 transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/bikes"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-full bg-black text-white text-sm font-semibold hover:bg-neutral-800 transition-colors"
                >
                  Book Your EV
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
