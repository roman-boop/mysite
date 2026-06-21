import React from 'react';
import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProjectsGrid from './components/ProjectsGrid';
import AppImage from '@/components/ui/AppImage';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Algotrading — CryptoManiac',
  description: 'Открытые алгоритмические торговые проекты crypto_maniac на GitHub — Python-боты, фреймворки бэктестинга, индикаторы Pine Script и инструменты анализа потока ордеров.'
};

const INTRO_VIDEOS = [
  {
    id: 1,
    title: 'Полное введение в алготрейдинг',
    href: 'https://www.youtube.com/watch?v=ffpx16FlvQo',
    duration: null,
    wip: false,
  },
  {
    id: 2,
    title: 'Реальная торговая система, следящая за открытым интересом',
    href: 'https://www.youtube.com/watch?v=eb5ywYlw6E4&t=1121s',
    duration: null,
    wip: false,
  },
  {
    id: 3,
    title: 'Бот сам ищет зоны сопротивления и поддержки',
    href: 'https://www.youtube.com/watch?v=ilSpSqKWkRg&t=1s',
    duration: null,
    wip: false,
  },
  {
    id: 4,
    title: 'Основы бектеста — как тестировать стратегии?',
    href: 'https://www.youtube.com/@crypto_maniacdt/',
    duration: null,
    wip: true,
  },
  {
    id: 5,
    title: 'Создаём бота, который автоматически открывает позиции. Полная автоматизация и финальная система.',
    href: 'https://www.youtube.com/@crypto_maniacdt/',
    duration: null,
    wip: true,
  },
];

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

      {/* ── Введение в алготрейдинг ── */}
      <section className="px-6 md:px-12 py-16 border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto">
          {/* Section header */}
          <div className="flex items-center gap-4 mb-10">
            <div className="w-10 h-[1px] bg-amber-400/60" />
            <span className="text-[11px] tracking-[0.3em] uppercase text-zinc-500 font-semibold">Серия уроков</span>
          </div>
          <h2 className="font-display text-3xl md:text-4xl text-white mb-2 leading-tight">
            Введение в <span className="italic text-zinc-500 font-light">алготрейдинг</span>
          </h2>
          <p className="text-sm text-zinc-500 font-light mb-10 max-w-xl">
            Пошаговый курс от основ до создания полностью автоматизированной торговой системы
          </p>

          {/* Video cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {INTRO_VIDEOS.map((video) => (
              <a
                key={video.id}
                href={video.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex flex-col border border-white/[0.08] bg-[#0d0d0d] hover:border-amber-400/30 hover:bg-[#111] transition-all duration-300 overflow-hidden"
              >
                {/* Thumbnail placeholder with play icon */}
                <div className="relative aspect-video bg-zinc-900 overflow-hidden flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-400/5 to-transparent" />
                  {/* Channel avatar */}
                  <div className="relative w-12 h-12 rounded-full overflow-hidden border border-white/10 group-hover:border-amber-400/40 transition-colors">
                    <Image
                      src="/assets/images/image-1782043739335.png"
                      alt="crypto_maniac канал"
                      fill
                      className="object-cover"
                    />
                  </div>
                  {/* Play button overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-10 h-10 rounded-full bg-amber-400/90 flex items-center justify-center">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#000">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                  {/* Episode number */}
                  <div className="absolute top-2 left-2 w-6 h-6 bg-amber-400 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-black">{video.id}</span>
                  </div>
                  {/* WIP badge */}
                  {video.wip && (
                    <div className="absolute top-2 right-2 bg-zinc-800/90 border border-white/10 px-2 py-0.5">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">В разработке</span>
                    </div>
                  )}
                </div>

                {/* Card body */}
                <div className="flex flex-col flex-1 p-4">
                  <p className="text-xs text-white/70 font-medium leading-snug group-hover:text-white transition-colors line-clamp-3">
                    {video.title}
                  </p>
                  <div className="mt-auto pt-3 flex items-center gap-1.5">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-red-500/70 flex-shrink-0">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                    <span className="text-[9px] text-zinc-600 uppercase tracking-widest">YouTube</span>
                    <svg width="8" height="8" viewBox="0 0 24 24" className="ml-auto text-zinc-700 group-hover:text-amber-400/60 transition-colors">
                      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 17L17 7M7 7h10v10" />
                    </svg>
                  </div>
                </div>
              </a>
            ))}
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
    </main>
  );
}