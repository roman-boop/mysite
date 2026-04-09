'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import { useAuth } from '@/contexts/AuthContext';

const navLinks = [
  { label: 'Home', href: '/homepage' },
  { label: 'Algotrading', href: '/algotrading' },
  { label: 'Learning', href: '/learning' },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { user, signOut, loading } = useAuth();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setMenuOpen(false);
    try {
      await signOut();
      router?.push('/homepage');
    } catch (err) {
      console.error('Sign out error:', err);
      // Force redirect even if signOut threw
      router?.push('/homepage');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <>
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-500 mix-blend-difference ${
          scrolled ? 'py-4' : 'py-6'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
          {/* Logo */}
          <Link href="/homepage" className="flex items-center gap-2 group">
            <AppLogo size={32} />
            <span className="font-display font-medium text-lg tracking-tight text-white group-hover:opacity-70 transition-opacity hidden sm:block">
              crypto_maniac
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-10 text-[11px] font-semibold tracking-[0.2em] uppercase text-white/60">
            {navLinks?.map((link) => (
              <Link
                key={link?.href}
                href={link?.href}
                className={`hover-underline hover:text-white transition-colors duration-300 ${
                  pathname === link?.href ? 'text-white' : ''
                }`}
              >
                {link?.label}
              </Link>
            ))}
          </div>

          {/* CTA — auth-aware */}
          <div className="hidden md:flex items-center gap-3">
            {!loading && user ? (
              <>
                <Link
                  href="/cabinet"
                  className={`text-[11px] font-bold uppercase tracking-[0.2em] transition-colors duration-300 ${
                    pathname === '/cabinet' ? 'text-amber-400' : 'text-white/60 hover:text-white'
                  }`}
                >
                  Кабинет
                </Link>
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="text-[11px] font-bold uppercase tracking-[0.2em] border border-white/20 text-white px-5 py-2.5 hover:border-amber-400/60 hover:text-amber-400 transition-all duration-300 disabled:opacity-50"
                >
                  {signingOut ? '...' : 'Выйти'}
                </button>
              </>
            ) : !loading ? (
              <>
                <Link
                  href="/login"
                  className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60 hover:text-white transition-colors duration-300"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="text-[11px] font-bold uppercase tracking-[0.2em] bg-white text-black px-6 py-2.5 hover:bg-amber-400 transition-all duration-300"
                >
                  Sign Up
                </Link>
              </>
            ) : null}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden flex flex-col gap-1.5 group w-8"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Открыть меню"
          >
            <div className={`w-full h-px bg-white transition-all duration-500 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <div className={`w-2/3 h-px bg-white transition-all duration-500 ${menuOpen ? 'opacity-0' : ''}`} />
            <div className={`w-full h-px bg-white transition-all duration-500 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>
      </nav>

      {/* Mobile Menu — outside mix-blend-difference nav to preserve solid background */}
      {menuOpen && (
        <div className="md:hidden fixed top-0 left-0 w-full h-screen z-40 bg-[#0a0a0a]" style={{ isolation: 'isolate' }}>
          <div className="flex flex-col h-full px-6 pt-24 pb-10 gap-6 overflow-y-auto">
            {navLinks?.map((link) => (
              <Link
                key={link?.href}
                href={link?.href}
                onClick={() => setMenuOpen(false)}
                className={`text-sm font-semibold uppercase tracking-widest transition-colors ${
                  pathname === link?.href ? 'text-white' : 'text-white/70 hover:text-white'
                }`}
              >
                {link?.label}
              </Link>
            ))}
            <div className="border-t border-white/10 pt-6 flex flex-col gap-6">
              {!loading && user ? (
                <>
                  <Link
                    href="/cabinet"
                    onClick={() => setMenuOpen(false)}
                    className="text-sm font-semibold uppercase tracking-widest text-amber-400/80 hover:text-amber-400 transition-colors"
                  >
                    Кабинет
                  </Link>
                  <button
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="text-sm font-bold uppercase tracking-widest text-amber-400 text-left disabled:opacity-50"
                  >
                    {signingOut ? 'Выход...' : 'Выйти →'}
                  </button>
                </>
              ) : !loading ? (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="text-sm font-semibold uppercase tracking-widest text-white/70 hover:text-white transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMenuOpen(false)}
                    className="text-sm font-bold uppercase tracking-widest text-amber-400"
                  >
                    Sign Up →
                  </Link>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
}