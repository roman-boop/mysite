import React from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.06] py-16 px-6 md:px-12">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Logo + Brand */}
        <Link href="/homepage" className="flex items-center gap-2 group">
          <AppLogo size={28} />
          <span className="font-display text-base tracking-tight text-white/60 group-hover:text-white transition-colors hidden sm:block">
            crypto_maniac
          </span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-8 text-[13px] font-medium text-zinc-500">
          <Link href="/homepage" className="hover:text-white transition-colors">Home</Link>
          <Link href="/algotrading" className="hover:text-white transition-colors">Algotrading</Link>
          <Link href="/learning" className="hover:text-white transition-colors">Learning</Link>
          <a href="https://t.me/crypto_maniacdt" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Telegram</a>
        </div>

        {/* Copyright */}
        <div className="text-[12px] text-zinc-700 tracking-wider uppercase">
          © 2026 crypto_maniac · <a href="/homepage" className="hover:text-zinc-500 transition-colors">Конфиденциальность</a>
        </div>
      </div>
    </footer>
  );
}