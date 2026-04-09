'use client';

import React, { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LearningGrid from './components/LearningGrid';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

const PUBLIC_LESSONS = [
  { title: 'Полная теория для торговли FVG', duration: '', youtube: 'https://studio.youtube.com/video/tAU_QjDon2k/edit' },
  { title: 'Полная теория по квартальной теории (QT)', duration: '', youtube: 'https://youtu.be/Hdg-rezSoJE' },
  { title: 'Как работать с контекстом и строить прогнозы по HTF', duration: '', youtube: 'https://youtu.be/2ugI6coDNgk' },
  { title: 'Как строить трейдинг сценарии', duration: '', youtube: 'https://youtu.be/jgOTQx0ZF4I' },
  { title: 'AMD модель - одна из самых качественных торговых моделей', duration: '', youtube: 'https://youtu.be/mhOBEYpHL68' },
];

function PublicSmartMoneyBlock() {
  const [expanded, setExpanded] = useState(false);
  const [hoveredLesson, setHoveredLesson] = useState<number | null>(null);
  const accentColor = '#8b5cf6';

  return (
    <section className="py-16 px-6 md:px-12 border-b border-white/[0.06]">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-[1px] bg-amber-400/60" />
            <span className="text-[11px] tracking-[0.25em] uppercase text-zinc-500 font-semibold">Бесплатный доступ</span>
          </div>
          <h2 className="font-display text-3xl md:text-4xl text-white font-light">
            Smart Money <span className="italic text-zinc-500">Основы</span>
          </h2>
          <p className="mt-3 text-sm text-zinc-500 font-light max-w-xl">
            Публичные уроки доступны всем — без регистрации. Изучите основы торговли по Smart Money.
          </p>
        </div>

        <div className="max-w-2xl">
          <div className="group relative border border-white/[0.07] bg-[#0a0a0a] hover:bg-[#0f0f0f] transition-all duration-500">
            <div className="h-[2px] w-0 group-hover:w-full transition-all duration-700" style={{ backgroundColor: accentColor }} />
            <div className="p-8">
              <div className="flex items-start justify-between mb-6">
                <span className="text-[11px] font-bold tracking-[0.25em] uppercase" style={{ color: `${accentColor}80` }}>
                  Публичный
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 uppercase tracking-widest border" style={{ color: accentColor, borderColor: `${accentColor}30`, backgroundColor: `${accentColor}08` }}>
                  {PUBLIC_LESSONS?.length} урока
                </span>
              </div>
              <h3 className="font-display text-2xl md:text-3xl text-white font-light leading-tight mb-2">
                Smart Money Основы
              </h3>
              <p className="text-sm font-display italic text-zinc-600 mb-4">Думай как институционал.</p>
              <p className="text-sm text-zinc-500 font-light leading-relaxed mb-6">
                Научитесь читать рынок так, как это делают профессиональные трейдеры и институции. Определяйте зоны ликвидности, лучшие модели входа и освойте основы риск-менеджмента.
              </p>
              <div className={`space-y-0 overflow-hidden transition-all duration-500 ${expanded ? 'max-h-[400px]' : 'max-h-[200px]'}`}>
                {PUBLIC_LESSONS?.map((lesson, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-3 border-b border-white/[0.05] cursor-pointer transition-all duration-200"
                    onMouseEnter={() => setHoveredLesson(i)}
                    onMouseLeave={() => setHoveredLesson(null)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold font-mono w-6 transition-colors duration-200" style={{ color: hoveredLesson === i ? accentColor : '#3f3f46' }}>
                        {String(i + 1)?.padStart(2, '0')}
                      </span>
                      <span className="text-sm font-medium transition-all duration-200" style={{ color: hoveredLesson === i ? accentColor : '#a1a1aa', paddingLeft: hoveredLesson === i ? '4px' : '0px' }}>
                        {lesson?.title}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-700 font-mono flex-shrink-0 ml-2">{lesson?.duration}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest transition-colors duration-200 self-start"
                style={{ color: expanded ? '#52525b' : accentColor }}
              >
                {expanded ? 'Скрыть' : 'Показать все уроки'}
                <svg width="12" height="12" viewBox="0 0 24 24" className={`transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}>
                  <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 9l6 6 6-6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CryptoManiacAcademyBlock() {
  return (
    <section className="py-16 px-6 md:px-12 border-b border-white/[0.06]">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-[1px] bg-red-500/60" />
            <span className="text-[11px] tracking-[0.25em] uppercase text-zinc-500 font-semibold">YouTube · Бесплатно</span>
          </div>
          <h2 className="font-display text-3xl md:text-4xl text-white font-light">
            CryptoManiac <span className="italic text-zinc-500">Academy</span>
          </h2>
          <p className="mt-3 text-sm text-zinc-500 font-light max-w-xl">
            Образовательный YouTube-канал с видеоуроками по трейдингу, алготрейдингу и крипторынку. Доступен всем без регистрации.
          </p>
        </div>

        <div className="max-w-2xl">
          <div className="group relative border border-white/[0.07] bg-[#0a0a0a] hover:bg-[#0f0f0f] transition-all duration-500 overflow-hidden">
            <div className="h-[2px] w-0 group-hover:w-full transition-all duration-700 bg-red-500" />
            <div className="p-8">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white text-sm font-bold">CryptoManiac Academy</p>
                    <p className="text-zinc-500 text-xs">@cryptomaniac_academy</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 uppercase tracking-widest border border-red-500/30 text-red-400 bg-red-500/08">
                  YouTube
                </span>
              </div>

              <p className="text-sm text-zinc-400 font-light leading-relaxed mb-6">
                Видеоуроки по трейдингу, алготрейдингу, Smart Money концепциям и анализу крипторынка. Подписывайтесь, чтобы не пропустить новые материалы.
              </p>

              <a
                href="https://www.youtube.com/@cryptomaniac_academy"
                target="_blank"
                rel="noopener noreferrer"
                className="group/btn inline-flex items-center gap-3 bg-red-600 text-white text-xs font-bold uppercase tracking-widest py-3 px-6 hover:bg-red-500 transition-colors duration-300"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
                Перейти на канал
                <svg width="10" height="10" viewBox="0 0 24 24" className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform">
                  <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 17L17 7M7 7h10v10" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function LearningPage() {
  const { user, loading, hasLearningAccess } = useAuth();

  if (loading) {
    return (
      <main className="bg-[#030303] min-h-screen flex items-center justify-center">
        <div className="noise-overlay" />
        <div className="relative z-10 text-zinc-600 text-sm uppercase tracking-widest animate-pulse">
          Загрузка...
        </div>
      </main>
    );
  }

  const hasAccess = hasLearningAccess();

  return (
    <main className="bg-[#030303] min-h-screen">
      <div className="noise-overlay" />
      <Header />
      {/* Page Hero */}
      <section className="relative pt-32 pb-20 px-6 md:px-12 border-b border-white/[0.06] overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 50% 60% at 30% 60%, rgba(139,92,246,0.05) 0%, transparent 70%)' }}
        />
        <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-end">
          <div className="lg:col-span-8">
            <div className="flex items-center gap-4 mb-8 fade-in-up">
              <div className="w-10 h-[1px] bg-amber-400/60" />
              <span className="text-[11px] tracking-[0.3em] uppercase text-zinc-500 font-semibold">Программа обучения</span>
            </div>
            <h1 className="font-display text-6xl md:text-8xl text-white leading-[0.85] tracking-tight fade-in-up delay-100">
              <span className="block">Learn</span>
              <span className="block italic text-zinc-600 font-light">крипто</span>
              <span className="block text-amber-400">трейдинг</span>
            </h1>
          </div>
          <div className="lg:col-span-4 fade-in-up delay-200">
            <p className="text-sm text-zinc-400 font-light leading-relaxed mb-8 border-l border-white/10 pl-6">
              От основ блокчейна до автоматизированного бэктестинга — полный структурированный путь к системному крипто-трейдингу.
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Публичный', color: '#8b5cf6' },
                { label: 'Основы крипты', color: '#f59e0b' },
                { label: 'Smart Money', color: '#8b5cf6' },
                { label: 'Психология', color: '#06b6d4' },
                { label: 'Стратегия', color: '#22c55e' },
                { label: 'Бэктестинг', color: '#ec4899' },
              ]?.map((pill) => (
                <span
                  key={pill?.label}
                  className="text-[11px] px-3 py-1 font-semibold uppercase tracking-wider border"
                  style={{ color: pill?.color, borderColor: `${pill?.color}30`, backgroundColor: `${pill?.color}08` }}
                >
                  {pill?.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── CryptoManiac Academy Block (public) ─── */}
      <CryptoManiacAcademyBlock />

      {/* ─── Public Smart Money Basics Block ─── */}
      <PublicSmartMoneyBlock />

      {/* ─── Private Curriculum ─── */}
      {!user ? (
        <section className="py-20 px-6 md:px-12">
          <div className="max-w-7xl mx-auto">
            <div className="mb-4 flex items-center gap-3">
              <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest px-3 py-1 border border-amber-400/40 text-amber-400 bg-amber-400/[0.06]">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
                В разработке
              </span>
            </div>
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-[1px] bg-amber-400/60" />
                <span className="text-[11px] tracking-[0.25em] uppercase text-zinc-500 font-semibold">Приватная программа</span>
              </div>
              <h2 className="font-display text-3xl md:text-4xl text-white font-light">
                Полный <span className="italic text-zinc-500">курс</span>
              </h2>
            </div>
            <div className="border border-amber-400/20 bg-amber-400/[0.02] p-10 text-center max-w-lg mx-auto">
              <div className="w-10 h-10 border border-amber-400/30 flex items-center justify-center mx-auto mb-5">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-amber-400">
                  <path d="M12 2C9.24 2 7 4.24 7 7v2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V11a2 2 0 0 0-2-2h-2V7c0-2.76-2.24-5-5-5zm0 2c1.66 0 3 1.34 3 3v2H9V7c0-1.66 1.34-3 3-3zm0 9a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" fill="currentColor" />
                </svg>
              </div>
              <p className="text-sm text-zinc-400 font-light leading-relaxed mb-6">
                Войдите и привяжите ваш BingX UID для доступа к полной приватной программе — 6 модулей, 30 уроков.
              </p>
              <div className="flex gap-3 justify-center flex-wrap">
                <Link href="/login?redirect=/learning" className="inline-flex items-center gap-2 bg-white text-black text-xs font-bold uppercase tracking-widest py-3 px-6 hover:bg-amber-400 transition-all duration-300">
                  Sign In
                </Link>
                <Link href="/register" className="inline-flex items-center gap-2 border border-white/20 py-3 px-6 text-xs font-bold uppercase tracking-widest text-white hover:border-amber-400/60 hover:text-amber-400 transition-all duration-300">
                  Sign Up
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : !hasAccess ? (
        <section className="py-20 px-6 md:px-12">
          <div className="max-w-7xl mx-auto">
            <div className="mb-4 flex items-center gap-3">
              <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest px-3 py-1 border border-amber-400/40 text-amber-400 bg-amber-400/[0.06]">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
                В разработке
              </span>
            </div>
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-[1px] bg-amber-400/60" />
                <span className="text-[11px] tracking-[0.25em] uppercase text-zinc-500 font-semibold">Приватная программа</span>
              </div>
              <h2 className="font-display text-3xl md:text-4xl text-white font-light">
                Полный <span className="italic text-zinc-500">курс</span>
              </h2>
            </div>
            <div className="border border-amber-400/20 bg-amber-400/[0.02] p-10 text-center max-w-lg mx-auto">
              <div className="w-10 h-10 border border-amber-400/30 flex items-center justify-center mx-auto mb-5">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-amber-400">
                  <path d="M12 2C9.24 2 7 4.24 7 7v2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V11a2 2 0 0 0-2-2h-2V7c0-2.76-2.24-5-5-5zm0 2c1.66 0 3 1.34 3 3v2H9V7c0-1.66 1.34-3 3-3zm0 9a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" fill="currentColor" />
                </svg>
              </div>
              <p className="text-sm text-zinc-400 font-light leading-relaxed mb-6">
                Привяжите ваш BingX UID в кабинете для разблокировки полной программы обучения.
              </p>
              <Link href="/cabinet" className="inline-flex items-center gap-2 border border-amber-400/40 py-3 px-6 text-xs font-bold uppercase tracking-widest text-amber-400 hover:bg-amber-400/10 transition-all duration-300">
                Перейти в кабинет →
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="py-16 px-6 md:px-12">
          <div className="max-w-7xl mx-auto">
            <div className="mb-4 flex items-center gap-3">
              <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest px-3 py-1 border border-amber-400/40 text-amber-400 bg-amber-400/[0.06]">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
                В разработке
              </span>
            </div>
          </div>
          <LearningGrid />
        </section>
      )}

      <Footer />
    </main>
  );
}