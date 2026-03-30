'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';

const SOCIAL_LINKS = [
  {
    label: 'YouTube',
    href: 'https://www.youtube.com/@crypto_maniacdt/',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
    color: '#FF0000',
  },
  {
    label: 'Telegram',
    href: 'https://t.me/crypto_maniacdt',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    ),
    color: '#2AABEE',
  },
  {
    label: 'GitHub',
    href: 'https://github.com/roman-boop',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
      </svg>
    ),
    color: '#ffffff',
  },
  {
    label: 'Habr',
    href: 'https://habr.com/ru/users/negrbluad/articles/',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13.12 11.9L9.4 6.54H6.87v10.92h2.54V12.1l3.72 5.36h2.54V6.54H13.12V11.9zm4.88-5.36v10.92H20.5V6.54H18zm-12 0H3.5v10.92H6V6.54z" />
      </svg>
    ),
    color: '#65A3BE',
  },
  {
    label: 'Rutube',
    href: 'https://rutube.ru',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
      </svg>
    ),
    color: '#FF4B00',
  },
];

export default function HeroSection() {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!heroRef.current) return;
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      const x = (clientX / innerWidth - 0.5) * 20;
      const y = (clientY / innerHeight - 0.5) * 20;
      heroRef.current.style.setProperty('--mouse-x', `${x}px`);
      heroRef.current.style.setProperty('--mouse-y', `${y}px`);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div
      ref={heroRef}
      className="relative min-h-screen flex flex-col justify-center pt-24 pb-16 px-6 md:px-12 border-b border-white/[0.06] overflow-hidden"
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 70% 40%, rgba(245,158,11,0.06) 0%, transparent 70%)',
        }}
      />

      {/* Rotating badge */}
      <div className="absolute top-28 right-6 md:right-12 z-20 pointer-events-none mix-blend-difference text-white hidden md:block">
        <div className="relative w-20 h-20 flex items-center justify-center">
          <svg className="animate-spin-slow w-full h-full" viewBox="0 0 100 100">
            <path
              id="heroBadgePath"
              d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"
              fill="transparent"
            />
            <text fontSize="10" fontFamily="Manrope" fontWeight="600" letterSpacing="2.5px" fill="currentColor">
              <textPath href="#heroBadgePath" startOffset="0%">
                ALGOTRADING • CRYPTO • EDUCATION •
              </textPath>
            </text>
          </svg>
          <div className="absolute w-2 h-2 bg-amber-400 rounded-full animate-pulse-glow" />
        </div>
      </div>

      {/* Main grid */}
      <div className="relative z-10 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-end">
        {/* Left: Headline */}
        <div className="lg:col-span-7">
          <div className="flex items-center gap-4 mb-8 fade-in-up">
            <div className="w-10 h-[1px] bg-amber-400/60" />
            <span className="text-[11px] tracking-[0.3em] uppercase text-zinc-500 font-semibold">
              С 2020 · crypto_maniac
            </span>
          </div>

          <h1 className="font-display text-6xl md:text-8xl lg:text-9xl text-white leading-[0.85] tracking-tight fade-in-up delay-100">
            <span className="block">Algo</span>
            <span className="block italic text-zinc-600 font-light">trading</span>
            <span className="block text-amber-400">&amp; Learn</span>
          </h1>
        </div>

        {/* Right: Bio + Links */}
        <div className="lg:col-span-5 fade-in-up delay-200">
          <p className="text-sm text-zinc-400 font-light leading-relaxed mb-8 border-l border-white/10 pl-6 max-w-sm">
            Алготрейдер, преподаватель и разработчик с открытым кодом. Создаю системные стратегии, делюсь знаниями о Smart Money концепциях и рыночной структуре.
          </p>

          {/* Social Links */}
          <div className="flex flex-col gap-3 mb-10">
            {SOCIAL_LINKS.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between border-b border-white/[0.08] pb-3 hover:border-amber-400/40 transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <span className="text-zinc-600 group-hover:text-white transition-colors duration-300">
                    {social.icon}
                  </span>
                  <span className="text-xs uppercase tracking-widest text-zinc-400 group-hover:text-white transition-colors">
                    {social.label}
                  </span>
                </div>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  className="text-zinc-600 group-hover:text-amber-400 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all duration-300"
                >
                  <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 17L17 7M7 7h10v10" />
                </svg>
              </a>
            ))}
          </div>

          {/* Page CTAs */}
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/algotrading"
              className="group flex items-center justify-center gap-2 border border-white/20 py-3 px-4 text-xs font-bold uppercase tracking-widest text-white hover:border-amber-400/60 hover:text-amber-400 transition-all duration-300"
            >
              Algotrading
              <svg width="12" height="12" viewBox="0 0 24 24" className="group-hover:translate-x-1 transition-transform">
                <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14m-7-7l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/learning"
              className="group flex items-center justify-center gap-2 bg-amber-400 text-black py-3 px-4 text-xs font-bold uppercase tracking-widest hover:bg-amber-300 transition-all duration-300"
            >
              Learning
              <svg width="12" height="12" viewBox="0 0 24 24" className="group-hover:translate-x-1 transition-transform">
                <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14m-7-7l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom scroll indicator */}
      <div className="absolute bottom-10 left-6 md:left-12 flex items-center gap-3 mix-blend-difference text-white">
        <div className="text-[10px] uppercase tracking-widest hidden md:block opacity-40">01 — Введение</div>
        <div className="w-[1px] h-8 bg-white/20 hidden md:block" />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          className="animate-bounce opacity-40"
        >
          <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 5v14m-6-6l6 6 6-6" />
        </svg>
      </div>
    </div>
  );
}