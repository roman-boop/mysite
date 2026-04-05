import React from 'react';
import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProjectsGrid from './components/ProjectsGrid';
import AppImage from '@/components/ui/AppImage';

export const metadata: Metadata = {
  title: 'Algotrading — CryptoManiac',
  description: 'Открытые алгоритмические торговые проекты crypto_maniac на GitHub — Python-боты, фреймворки бэктестинга, индикаторы Pine Script и инструменты анализа потока ордеров.'
};

export default function AlgotradingPage() {
  return (
    <main className="bg-[#030303] min-h-screen">
      <div className="noise-overlay" />

      <Header />

      {/* Page Hero */}
      <section className="relative pt-32 pb-20 px-6 md:px-12 border-b border-white/[0.06] overflow-hidden">
        {/* Background image */}
        <div className="absolute right-0 top-0 w-1/2 h-full opacity-10 hidden lg:block pointer-events-none">
          <AppImage
            src="https://images.unsplash.com/photo-1616156027751-fc9a850fdc9b"
            alt="Графики криптовалютной торговли и алгоритмические данные на тёмных экранах"
            fill
            className="object-cover object-center grayscale" />
          
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#030303]/70 to-[#030303]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-end">
          <div className="lg:col-span-8">
            <div className="flex items-center gap-4 mb-8 fade-in-up">
              <div className="w-10 h-[1px] bg-amber-400/60" />
              <span className="text-[11px] tracking-[0.3em] uppercase text-zinc-500 font-semibold">Открытый исходный код</span>
            </div>
            <h1 className="font-display text-6xl md:text-8xl text-white leading-[0.85] tracking-tight fade-in-up delay-100">
              <span className="block">Algo</span>
              <span className="block italic text-zinc-600 font-light">trading</span>
              <span className="block text-amber-400">Проекты</span>
            </h1>
          </div>

          <div className="lg:col-span-4 fade-in-up delay-200">
            <p className="text-sm text-zinc-400 font-light leading-relaxed mb-8 border-l border-white/10 pl-6">
              Все мои торговые системы, боты и исследовательские инструменты — в открытом доступе на GitHub. Написаны на Python, Pine Script с системным подходом.
            </p>
            <a
              href="https://github.com/roman-boop"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-3 border border-white/20 py-3 px-6 text-xs font-bold uppercase tracking-widest text-white hover:border-amber-400/60 hover:text-amber-400 transition-all duration-300">
              
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              roman-boop
              <svg width="12" height="12" viewBox="0 0 24 24" className="group-hover:translate-x-1 transition-transform">
                <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14m-7-7l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* Tech stack badges */}
      <div className="border-b border-white/[0.06] py-5 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex items-center gap-3 flex-wrap">
          <span className="text-[11px] text-zinc-600 uppercase tracking-widest mr-2">Стек:</span>
          {['Python', 'Pine Script', 'Pandas', 'NumPy', 'Binance API', 'ByBit API', 'PostgreSQL', 'Telegram Bot API'].map((tech) =>
          <span key={tech} className="text-[11px] px-3 py-1 border border-white/[0.08] text-zinc-400 font-medium tracking-wide hover:border-amber-400/30 hover:text-amber-400/80 transition-colors cursor-default">
              {tech}
            </span>
          )}
        </div>
      </div>

      <ProjectsGrid />

      <Footer />
    </main>);

}