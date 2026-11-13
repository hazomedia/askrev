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
  Zap,
} from 'lucide-react';
import AskrLogo from './AskrLogo';
import { getStoredUser, logoutSession } from '../lib/api';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const isHomePage = pathname === '/';

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setCurrentUser(getStoredUser());
  }, [pathname]);

  // Scroll listener for transparent -> solid transition
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 30) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  // Automotive Header style: transparent on hero top, sleek frosted graphite when scrolled
  const headerBgClass = isHomePage
    ? scrolled
      ? 'bg-[#101318]/95 backdrop-blur-md border-b border-white/10 shadow-lg'
      : 'bg-transparent border-b border-white/5'
    : 'bg-[#101318] border-b border-white/10 shadow-sm';

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${headerBgClass}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo - Official ASKR EV Identity */}
          <AskrLogo theme="dark" size="md" href="/" />

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-7" aria-label="Main Navigation">
            <Link
              href="/"
              className={`text-sm tracking-wide transition-colors ${
                pathname === '/'
                  ? 'text-white font-semibold'
                  : 'text-[#A7ADB5] hover:text-white'
              }`}
            >
              Home
            </Link>

            <Link
              href="/bikes?category=bikes"
              className={`text-sm tracking-wide transition-colors ${
                pathname.startsWith('/bikes') && !pathname.includes('cycles') && !pathname.includes('jeeps')
                  ? 'text-white font-semibold'
                  : 'text-[#A7ADB5] hover:text-white'
              }`}
            >
              Electric Bikes
            </Link>

            <Link
              href="/bikes?category=cycles"
              className="text-sm tracking-wide text-[#A7ADB5] hover:text-white transition-colors flex items-center gap-1.5"
            >
              <span>Electric Cycles</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-white/10 text-slate-300">
                Concept
              </span>
            </Link>

            <Link
              href="/bikes?category=jeeps"
              className="text-sm tracking-wide text-[#A7ADB5] hover:text-white transition-colors flex items-center gap-1.5"
            >
              <span>Electric Jeeps</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-white/10 text-slate-300">
                Concept
              </span>
            </Link>

            <Link
              href="/bikes"
              className="text-sm tracking-wide text-[#A7ADB5] hover:text-white transition-colors"
            >
              Explore Vehicles
            </Link>

            {currentUser && (
              <Link
                href="/dashboard"
                className={`text-sm tracking-wide transition-colors flex items-center gap-1.5 ${
                  pathname.startsWith('/dashboard')
                    ? 'text-[#C9FF36] font-semibold'
                    : 'text-[#A7ADB5] hover:text-[#C9FF36]'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Member Portal</span>
              </Link>
            )}

            {isAdmin && (
              <Link
                href="/admin"
                className={`text-sm tracking-wide transition-colors flex items-center gap-1.5 ${
                  pathname.startsWith('/admin')
                    ? 'text-[#38BDF8] font-semibold'
                    : 'text-[#A7ADB5] hover:text-[#38BDF8]'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Admin Hub</span>
              </Link>
            )}
          </nav>

          {/* User Account & Actions */}
          <div className="hidden lg:flex items-center gap-4">
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/25 bg-white/5 transition-colors text-left"
                  aria-expanded={userDropdownOpen}
                >
                  <div className="w-7 h-7 rounded-md bg-[#165DAD] flex items-center justify-center text-white font-bold text-xs">
                    {currentUser.fullName ? currentUser.fullName[0].toUpperCase() : 'M'}
                  </div>
                  <div className="text-xs">
                    <div className="font-semibold text-white">{currentUser.memberId}</div>
                    <div className="text-[10px] text-slate-400">{currentUser.currentPackage || 'FREE'}</div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#101318] border border-white/10 shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-4 py-2.5 border-b border-white/10">
                      <div className="text-xs font-semibold text-white truncate">
                        {currentUser.fullName || currentUser.email}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {currentUser.memberId}
                      </div>
                    </div>
                    <div className="py-1 text-xs">
                      <Link
                        href="/dashboard"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-[#A7ADB5] hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4 text-[#165DAD]" />
                        <span>Member Dashboard</span>
                      </Link>
                      {isAdmin && (
                        <Link
                          href="/admin"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-[#A7ADB5] hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <ShieldCheck className="w-4 h-4 text-[#38BDF8]" />
                          <span>Admin Control Center</span>
                        </Link>
                      )}
                    </div>
                    <div className="border-t border-white/10 pt-1">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full px-4 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
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
                className="text-sm font-medium text-[#A7ADB5] hover:text-white transition-colors px-3 py-2"
              >
                Login
              </Link>
            )}

            {/* Book Now Primary Automotive CTA */}
            <Link
              href="/bikes"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-[#101318] hover:bg-[#C9FF36] text-xs font-bold tracking-wider uppercase transition-all duration-200 shadow-md hover:shadow-lime/20"
            >
              <span>Book Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex items-center gap-2 lg:hidden">
            <Link
              href="/bikes"
              className="px-3 py-1.5 rounded-full bg-white text-[#101318] text-xs font-bold uppercase tracking-wider hover:bg-[#C9FF36] transition-colors"
            >
              Book
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer / Navigation Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#080A0D]/95 backdrop-blur-xl border-b border-white/10 px-4 pt-3 pb-6 space-y-4">
          <nav className="flex flex-col space-y-2 text-sm">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-lg text-white font-medium hover:bg-white/5 transition-colors"
            >
              Home
            </Link>
            <Link
              href="/bikes?category=bikes"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              Electric Bikes (Production)
            </Link>
            <Link
              href="/bikes?category=cycles"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors flex items-center justify-between"
            >
              <span>Electric Cycles</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-white/10 text-slate-300">
                Concept
              </span>
            </Link>
            <Link
              href="/bikes?category=jeeps"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors flex items-center justify-between"
            >
              <span>Electric Jeeps</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-white/10 text-slate-300">
                Concept
              </span>
            </Link>
            <Link
              href="/bikes"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              Explore All Vehicles
            </Link>

            {currentUser && (
              <>
                <div className="border-t border-white/10 my-2" />
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2.5 rounded-lg text-[#C9FF36] font-semibold hover:bg-white/5 transition-colors flex items-center gap-2"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Member Dashboard ({currentUser.memberId})</span>
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2.5 rounded-lg text-[#38BDF8] font-semibold hover:bg-white/5 transition-colors flex items-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Admin Hub</span>
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="px-3 py-2.5 rounded-lg text-left text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </>
            )}

            {!currentUser && (
              <div className="pt-3 border-t border-white/10 flex flex-col gap-2.5">
                <Link
                  href="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-semibold transition-colors"
                >
                  Login to Portal
                </Link>
                <Link
                  href="/bikes"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-lg bg-white text-[#101318] hover:bg-[#C9FF36] text-sm font-bold uppercase tracking-wider transition-colors"
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
