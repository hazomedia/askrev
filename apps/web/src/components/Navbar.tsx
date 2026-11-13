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
    <header className="sticky top-0 z-50 bg-[#080B12]/92 backdrop-blur-md border-b border-white/10 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 sm:h-20">
          {/* Brand Logo - Official ASKR EV with Dark Theme */}
          <AskrLogo theme="dark" size="md" href="/" />

          {/* Desktop Navigation Links — High Contrast Midnight Electric */}
          <nav className="hidden md:flex items-center space-x-8" aria-label="Main Navigation">
            <Link
              href="/scooters"
              className={`text-sm tracking-normal transition-colors py-1 ${
                pathname === '/scooters'
                  ? 'text-[#50D9FF] font-bold border-b-2 border-[#267DFF]'
                  : 'text-[#AAB7C8] hover:text-[#F7FAFF] font-medium'
              }`}
            >
              Scooters
            </Link>

            <Link
              href="/bikes"
              className={`text-sm tracking-normal transition-colors py-1 ${
                pathname === '/bikes'
                  ? 'text-[#50D9FF] font-bold border-b-2 border-[#267DFF]'
                  : 'text-[#AAB7C8] hover:text-[#F7FAFF] font-medium'
              }`}
            >
              Bikes
            </Link>

            <Link
              href="/cycles"
              className={`text-sm tracking-normal transition-colors py-1 ${
                pathname === '/cycles'
                  ? 'text-[#50D9FF] font-bold border-b-2 border-[#267DFF]'
                  : 'text-[#AAB7C8] hover:text-[#F7FAFF] font-medium'
              }`}
            >
              Cycles
            </Link>

            <Link
              href="/jeeps"
              className={`text-sm tracking-normal transition-colors py-1 ${
                pathname === '/jeeps'
                  ? 'text-[#50D9FF] font-bold border-b-2 border-[#267DFF]'
                  : 'text-[#AAB7C8] hover:text-[#F7FAFF] font-medium'
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
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#F7FAFF] transition-colors"
                >
                  <div className="w-5 h-5 rounded-full bg-[#267DFF] text-white flex items-center justify-center text-[10px]">
                    <User className="w-3 h-3" />
                  </div>
                  <span>{currentUser.fullName || currentUser.username || 'Account'}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#AAB7C8]" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#101827] border border-white/10 shadow-2xl py-2 z-50 text-xs text-[#F7FAFF] backdrop-blur-md">
                    <div className="px-4 py-2 border-b border-white/10">
                      <p className="font-bold text-[#F7FAFF]">{currentUser.fullName}</p>
                      <p className="text-[11px] text-[#AAB7C8] truncate">{currentUser.email || currentUser.memberCode}</p>
                    </div>

                    <Link
                      href="/dashboard"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 hover:bg-white/10 text-[#F7FAFF] transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4 text-[#50D9FF]" />
                      <span>Member Dashboard</span>
                    </Link>

                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 hover:bg-white/10 text-[#50D9FF] font-semibold transition-colors"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Admin Portal</span>
                      </Link>
                    )}

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-rose-400 hover:bg-rose-500/10 border-t border-white/10 transition-colors mt-1"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/auth/login"
                  className="px-4 py-2 rounded-full text-xs font-semibold text-[#F7FAFF] hover:text-white transition-colors border border-white/15 hover:border-white/30 hover:bg-white/5"
                >
                  Sign In
                </Link>

                <Link
                  href="/bikes"
                  className="px-5 py-2.5 rounded-full bg-[#267DFF] hover:bg-[#1A6EEB] text-white text-xs font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(38,125,255,0.4)] hover:shadow-[0_0_25px_rgba(38,125,255,0.6)] flex items-center gap-1.5"
                >
                  <span>Book Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-[#F7FAFF] hover:bg-white/10 transition-colors"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#080B12]/98 px-4 pt-3 pb-6 space-y-4 shadow-2xl backdrop-blur-lg">
          <nav className="flex flex-col space-y-2">
            <Link
              href="/scooters"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                pathname === '/scooters' ? 'bg-[#267DFF]/20 text-[#50D9FF]' : 'text-[#AAB7C8] hover:text-white'
              }`}
            >
              Electric Scooters
            </Link>

            <Link
              href="/bikes"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                pathname === '/bikes' ? 'bg-[#267DFF]/20 text-[#50D9FF]' : 'text-[#AAB7C8] hover:text-white'
              }`}
            >
              Electric Motorcycles
            </Link>

            <Link
              href="/cycles"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                pathname === '/cycles' ? 'bg-[#267DFF]/20 text-[#50D9FF]' : 'text-[#AAB7C8] hover:text-white'
              }`}
            >
              Electric Cycles
            </Link>

            <Link
              href="/jeeps"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                pathname === '/jeeps' ? 'bg-[#267DFF]/20 text-[#50D9FF]' : 'text-[#AAB7C8] hover:text-white'
              }`}
            >
              Electric Jeeps
            </Link>
          </nav>

          <div className="pt-3 border-t border-white/10 flex flex-col gap-2.5">
            {currentUser ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 rounded-full bg-white/10 text-center text-xs font-semibold text-[#F7FAFF]"
                >
                  Member Dashboard
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full py-2.5 rounded-full bg-[#267DFF]/20 border border-[#267DFF]/40 text-center text-xs font-semibold text-[#50D9FF]"
                  >
                    Admin Control
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full py-2 text-center text-xs font-medium text-rose-400"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  href="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 rounded-full border border-white/20 text-center text-xs font-semibold text-[#F7FAFF]"
                >
                  Sign In
                </Link>
                <Link
                  href="/bikes"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 rounded-full bg-[#267DFF] text-center text-xs font-bold text-white shadow-md"
                >
                  Book Now
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
