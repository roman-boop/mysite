'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface PublicScript {
  name: string;
  repo: string;
  url: string;
  description: string;
  language: string;
}

interface PaidScript {
  name: string;
  description: string;
  language: string;
  tag?: string;
}

const PUBLIC_SCRIPTS: PublicScript[] = [
  {
    name: 'bingx_client',
    repo: 'roman-boop/bingx_client',
    url: 'https://github.com/roman-boop/bingx_client',
    description: 'Python-клиент для API биржи BingX. Предоставляет удобный интерфейс для размещения ордеров, получения рыночных данных и управления позициями на BingX.',
    language: 'Python',
  },
  {
    name: 'fibonachi_trading_system',
    repo: 'roman-boop/fibonachi_trading_system',
    url: 'https://github.com/roman-boop/fibonachi_trading_system',
    description: 'Автоматизированная торговая система на основе уровней коррекции Фибоначчи. Определяет ключевые зоны поддержки/сопротивления и исполняет сделки в точках разворота с высокой вероятностью.',
    language: 'Python',
  },
  {
    name: 'bollinger_bands-with-clusters',
    repo: 'roman-boop/bollinger_bands-with-clusters',
    url: 'https://github.com/roman-boop/bollinger_bands-with-clusters',
    description: 'Улучшенная стратегия полос Боллинджера в сочетании с анализом объёмных кластеров. Определяет зоны сжатия цены и сигналы пробоя с кластерным подтверждением.',
    language: 'Python',
  },
  {
    name: 'bomberman_indicator_tradingbot',
    repo: 'roman-boop/bomberman_indicator_tradingbot',
    url: 'https://github.com/roman-boop/bomberman_indicator_tradingbot',
    description: 'Торговый бот на основе индикатора Bomberman — кастомная сигнальная система, выявляющая взрывные импульсные сетапы и автоматизирующая вход/выход.',
    language: 'Python',
  },
  {
    name: 'openinterest_screener_telegram',
    repo: 'roman-boop/openinterest_screener_telegram',
    url: 'https://github.com/roman-boop/openinterest_screener_telegram',
    description: 'Telegram-бот для скрининга фьючерсных рынков крипты на значительные изменения открытого интереса. Отправляет оповещения в реальном времени при аномальных скачках или падениях OI.',
    language: 'Python',
  },
  {
    name: 'INDICATORS-PSP-SMT',
    repo: 'roman-boop/INDICATORS-PSP-SMT',
    url: 'https://github.com/roman-boop/INDICATORS-PSP-SMT',
    description: 'Коллекция Pine Script индикаторов, реализующих концепции PSP (Price Structure Points) и SMT (Smart Money Technique) для TradingView.',
    language: 'Pine Script',
  },
  {
    name: 'thirdeye_strategy_algo',
    repo: 'roman-boop/thirdeye_strategy_algo',
    url: 'https://github.com/roman-boop/thirdeye_strategy_algo',
    description: 'Алгоритм стратегии ThirdEye — многофакторная торговая система, объединяющая прайс экшн, анализ объёма и рыночную структуру для генерации качественных торговых сигналов.',
    language: 'Python',
  },
  {
    name: 'market_analyzer_crypto',
    repo: 'roman-boop/market_analyzer_crypto',
    url: 'https://github.com/roman-boop/market_analyzer_crypto',
    description: 'Комплексный инструмент анализа крипторынка. Сканирует несколько активов по таймфреймам, оценивает силу тренда, волатильность и импульс для ранжирования торговых возможностей.',
    language: 'Python',
  },
  {
    name: 'auction_theory_algo',
    repo: 'roman-boop/auction_theory_algo',
    url: 'https://github.com/roman-boop/auction_theory_algo',
    description: 'Алгоритмическая торговая система на основе теории аукционного рынка. Определяет зоны ценности, точки контроля и структуры рыночного профиля для выбора момента входа.',
    language: 'Python',
  },
  {
    name: 'quikpy-grid-bot-',
    repo: 'roman-boop/quikpy-grid-bot-',
    url: 'https://github.com/roman-boop/quikpy-grid-bot-',
    description: 'Сеточный торговый бот на QuikPy для терминала QUIK. Автоматизирует исполнение сеточной стратегии с настраиваемым шагом, размером позиции и контролем рисков.',
    language: 'Python',
  },
];

const PAID_SCRIPTS: PaidScript[] = [];

const BINGX_COURSE_THEMES = [
  'Введение в алготрейдинг: что это и зачем',
  'Основы Python для трейдинга',
  'Подключение к биржевым API (BingX, Binance)',
  'Бэктестинг торговых стратегий',
  'Торговая система на основе Фибоначчи',
  'Стратегия с полосами Боллинджера и кластерами',
  'Стратегия ThirdEye',
  'Стратегия на основе теории аукциона',
  'Реальная торговля: деплой и мониторинг ботов',
];

const LANGUAGE_COLORS: Record<string, string> = {
  'Python': '#3572A5',
  'Pine Script': '#5F9EA0',
  'JavaScript': '#F7DF1E',
  'TypeScript': '#3178C6',
  'Rust': '#DEA584',
  'Go': '#00ADD8',
};

function GitHubIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function YouTubeCourseBlock() {
  const [playing, setPlaying] = useState(false);
  const videoId = 'uzWJfuxIUZs';
  const playlistId = 'PLPiSLsFKisboXUcNsspws3jHdMaMesZ1E';

  return (
    <section className="py-16 px-6 md:px-12 border-t border-white/[0.06]">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-[1px] bg-red-500/60" />
            <span className="text-[11px] tracking-[0.25em] uppercase text-zinc-500 font-semibold">Бесплатный курс</span>
          </div>
          <h2 className="font-display text-3xl md:text-4xl text-white font-light">
            Публичный курс по <span className="italic text-zinc-500">алгоритмической торговле</span>
          </h2>
          <p className="mt-3 text-sm text-zinc-500 font-light max-w-xl">
            Открытый видеокурс на YouTube — доступен всем без регистрации. Основы алготрейдинга, Python, стратегии и автоматизация.
          </p>
        </div>

        <div className="max-w-3xl">
          <div className="relative bg-black border border-white/[0.08] overflow-hidden group">
            {!playing ? (
              <div
                className="relative cursor-pointer"
                onClick={() => setPlaying(true)}
              >
                <img
                  src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                  alt="Публичный курс по алгоритмической торговле — превью"
                  className="w-full aspect-video object-cover opacity-70 group-hover:opacity-90 transition-opacity duration-300"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-white text-sm font-semibold">Публичный курс по алгоритмической торговле</p>
                  <p className="text-zinc-400 text-xs mt-1">Нажмите для воспроизведения</p>
                </div>
              </div>
            ) : (
              <div className="aspect-video">
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${videoId}?list=${playlistId}&autoplay=1&rel=0`}
                  title="Публичный курс по алгоритмической торговле"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-zinc-600 font-light">Полный плейлист доступен на YouTube</p>
            <a
              href={`https://www.youtube.com/watch?v=${videoId}&list=${playlistId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
              Открыть на YouTube
              <svg width="10" height="10" viewBox="0 0 24 24">
                <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 17L17 7M7 7h10v10" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function BingXCourseBlock() {
  const { hasLearningAccess, user } = useAuth();
  const hasAccess = hasLearningAccess();
  const [themesExpanded, setThemesExpanded] = useState(false);

  return (
    <section className="py-16 px-6 md:px-12 border-t border-white/[0.06]">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-[1px] bg-amber-400/60" />
            <span className="text-[11px] tracking-[0.25em] uppercase text-zinc-500 font-semibold">Эксклюзивный курс · BingX рефералы</span>
          </div>
          <h2 className="font-display text-3xl md:text-4xl text-white font-light">
            Полный курс по <span className="italic text-zinc-500">алготрейдингу</span>
          </h2>
          <p className="mt-3 text-sm text-zinc-500 font-light max-w-xl">
            Полный курс по алготрейдингу с разбором 9 торговых систем, полной теорией алготрейдинга: бэктесты и реальная торговля.
          </p>
        </div>

        {!user ? (
          <div className="border border-amber-400/20 bg-amber-400/[0.03] p-8 max-w-2xl">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 border border-amber-400/30 flex items-center justify-center flex-shrink-0 mt-1">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-amber-400">
                  <path d="M12 2C9.24 2 7 4.24 7 7v2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V11a2 2 0 0 0-2-2h-2V7c0-2.76-2.24-5-5-5zm0 2c1.66 0 3 1.34 3 3v2H9V7c0-1.66 1.34-3 3-3zm0 9a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" fill="currentColor" />
                </svg>
              </div>
              <div>
                <h3 className="text-white text-sm font-semibold mb-1">Доступ только для подтверждённых рефералов BingX</h3>
                <p className="text-sm text-zinc-400 font-light leading-relaxed">
                  Войдите в аккаунт и привяжите ваш BingX UID в кабинете, чтобы получить доступ к курсу.
                </p>
              </div>
            </div>
            <a href="/login" className="inline-flex items-center gap-2 border border-white/20 py-2.5 px-6 text-xs font-bold uppercase tracking-widest text-white hover:border-amber-400/60 hover:text-amber-400 transition-all duration-300">
              Sign In
            </a>
          </div>
        ) : !hasAccess ? (
          <div className="border border-amber-400/20 bg-amber-400/[0.03] p-8 max-w-2xl">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 border border-amber-400/30 flex items-center justify-center flex-shrink-0 mt-1">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-amber-400">
                  <path d="M12 2C9.24 2 7 4.24 7 7v2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V11a2 2 0 0 0-2-2h-2V7c0-2.76-2.24-5-5-5zm0 2c1.66 0 3 1.34 3 3v2H9V7c0-1.66 1.34-3 3-3zm0 9a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" fill="currentColor" />
                </svg>
              </div>
              <div>
                <h3 className="text-white text-sm font-semibold mb-1">Привяжите BingX UID для доступа</h3>
                <p className="text-sm text-zinc-400 font-light leading-relaxed">
                  Ваш аккаунт должен быть подтверждён как реферал BingX. Перейдите в кабинет и введите ваш BingX UID.
                </p>
              </div>
            </div>
            <a href="/cabinet" className="inline-flex items-center gap-2 border border-amber-400/40 py-2.5 px-6 text-xs font-bold uppercase tracking-widest text-amber-400 hover:bg-amber-400/10 transition-all duration-300">
              Перейти в кабинет →
            </a>
          </div>
        ) : (
          <div className="max-w-2xl border border-amber-400/20 bg-amber-400/[0.02] overflow-hidden">
            {/* Header */}
            <div className="h-[2px] bg-amber-400/60" />
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 border border-amber-400/30 px-2 py-0.5">
                  Эксклюзивный доступ
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  Разблокировано
                </span>
              </div>

              <h3 className="font-display text-2xl text-white font-light mb-3">
                Полный курс по алготрейдингу
              </h3>
              <p className="text-sm text-zinc-400 font-light leading-relaxed mb-6">
                Полный курс по алготрейдингу с разбором 9 торговых систем, полной теорией алготрейдинга: бэктесты и реальная торговля.
              </p>

              {/* Themes */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] uppercase tracking-widest text-zinc-500 font-semibold">Темы курса</span>
                  <span className="text-[11px] text-amber-400/60">{BINGX_COURSE_THEMES.length} модулей</span>
                </div>
                <div className={`space-y-0 overflow-hidden transition-all duration-500 ${themesExpanded ? 'max-h-[600px]' : 'max-h-[180px]'}`}>
                  {BINGX_COURSE_THEMES.map((theme, i) => (
                    <div key={i} className="flex items-center gap-3 py-2.5 border-b border-white/[0.05]">
                      <span className="text-[10px] font-bold font-mono text-zinc-700 w-5 flex-shrink-0">{String(i + 1).padStart(2, '0')}</span>
                      <span className="text-sm text-zinc-400 font-light">{theme}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setThemesExpanded(!themesExpanded)}
                  className="mt-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-amber-400/70 hover:text-amber-400 transition-colors"
                >
                  {themesExpanded ? 'Скрыть' : 'Показать все темы'}
                  <svg width="12" height="12" viewBox="0 0 24 24" className={`transition-transform duration-300 ${themesExpanded ? 'rotate-180' : ''}`}>
                    <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 9l6 6 6-6" />
                  </svg>
                </button>
              </div>

              {/* Links */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/[0.06]">
                <a
                  href="https://disk.yandex.ru/d/m4we62C0bC9GCw"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-amber-400 text-black text-xs font-bold uppercase tracking-widest py-3 px-6 hover:bg-amber-300 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2v13m-5-5l5 5 5-5M3 19h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Открыть курс
                </a>
                <a
                  href="https://teletype.in/@perpetual_god/37NjVB-T9tk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 border border-white/20 text-white text-xs font-bold uppercase tracking-widest py-3 px-6 hover:border-amber-400/40 hover:text-amber-400 transition-colors"
                >
                  Описание курса
                  <svg width="10" height="10" viewBox="0 0 24 24">
                    <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 17L17 7M7 7h10v10" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default function ProjectsGrid() {
  const { hasLearningAccess, user } = useAuth();
  const hasAccess = hasLearningAccess();

  return (
    <>
      {/* ─── Public YouTube Course Block ─── */}
      <YouTubeCourseBlock />

      {/* ─── BingX Exclusive Course Block ─── */}
      <BingXCourseBlock />

      {/* ─── Public Scripts Section ─── */}
      <section className="py-16 px-6 md:px-12 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-[1px] bg-amber-400/60" />
              <span className="text-[11px] tracking-[0.25em] uppercase text-zinc-500 font-semibold">Open Source</span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl text-white font-light">
              Публичные <span className="italic text-zinc-500">скрипты</span>
            </h2>
            <p className="mt-3 text-sm text-zinc-500 font-light max-w-xl">
              Бесплатные торговые скрипты с открытым исходным кодом на GitHub. Клонируйте, форкайте и развивайте их.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/[0.04]">
            {PUBLIC_SCRIPTS.map((script) => (
              <div
                key={script.name}
                className="group bg-[#030303] p-8 hover:bg-[#0d0d0d] transition-all duration-500"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-zinc-600 group-hover:text-amber-400 transition-colors flex-shrink-0">
                      <GitHubIcon />
                    </span>
                    <a
                      href={script.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors font-mono tracking-tight hover:underline truncate"
                    >
                      {script.name}
                    </a>
                  </div>
                  <a
                    href={script.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 ml-3"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" className="text-zinc-700 group-hover:text-amber-400 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all">
                      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 17L17 7M7 7h10v10" />
                    </svg>
                  </a>
                </div>

                <p className="text-sm text-zinc-500 font-light leading-relaxed mb-4">
                  {script.description}
                </p>

                <div className="flex items-center gap-2 pt-3 border-t border-white/[0.05]">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: LANGUAGE_COLORS[script.language] || '#888' }} />
                  <span className="text-[11px] text-zinc-500 font-medium">{script.language}</span>
                  <span className="text-[11px] text-zinc-700 ml-auto font-mono">{script.repo}</span>
                </div>

                <div className="mt-3 h-[1px] w-0 group-hover:w-full bg-amber-400/40 transition-all duration-700" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Exclusive Scripts Section ─── */}
      <section className="py-16 px-6 md:px-12 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-[1px] bg-amber-400/60" />
              <span className="text-[11px] tracking-[0.25em] uppercase text-zinc-500 font-semibold">Эксклюзивно</span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl text-white font-light">
              Эксклюзивные <span className="italic text-zinc-500">скрипты</span>
            </h2>
            <p className="mt-3 text-sm text-zinc-500 font-light max-w-xl">
              Премиум-скрипты доступны исключительно верифицированным рефералам BingX. Привяжите ваш BingX UID в кабинете для получения доступа.
            </p>
          </div>

          {PAID_SCRIPTS.length === 0 ? (
            <div className="border border-white/[0.06] border-dashed p-12 text-center">
              <div className="w-12 h-12 border border-white/10 flex items-center justify-center mx-auto mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-zinc-600">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <p className="text-sm text-zinc-600 font-light mb-1">Премиум-скрипты скоро появятся</p>
              <p className="text-[11px] text-zinc-700 uppercase tracking-widest">Доступно верифицированным рефералам BingX</p>
            </div>
          ) : !user ? (
            <div className="border border-amber-400/20 bg-amber-400/[0.03] p-8 text-center">
              <p className="text-sm text-zinc-400 font-light mb-4">Войдите и привяжите BingX UID для доступа к эксклюзивным скриптам.</p>
              <a href="/login" className="inline-flex items-center gap-2 border border-white/20 py-2.5 px-6 text-xs font-bold uppercase tracking-widest text-white hover:border-amber-400/60 hover:text-amber-400 transition-all duration-300">
                Sign In
              </a>
            </div>
          ) : !hasAccess ? (
            <div className="border border-amber-400/20 bg-amber-400/[0.03] p-8 text-center">
              <p className="text-sm text-zinc-400 font-light mb-4">Привяжите BingX UID в кабинете для разблокировки эксклюзивных скриптов.</p>
              <a href="/cabinet" className="inline-flex items-center gap-2 border border-amber-400/40 py-2.5 px-6 text-xs font-bold uppercase tracking-widest text-amber-400 hover:bg-amber-400/10 transition-all duration-300">
                Перейти в кабинет →
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/[0.04]">
              {PAID_SCRIPTS.map((script, i) => (
                <div key={i} className="group bg-[#030303] p-8 hover:bg-[#0d0d0d] transition-all duration-500">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-amber-400 flex-shrink-0">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      <span className="text-sm font-bold text-white font-mono tracking-tight">{script.name}</span>
                    </div>
                    {script.tag && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 border border-amber-400/30 px-2 py-0.5">
                        {script.tag}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-500 font-light leading-relaxed mb-4">{script.description}</p>
                  <div className="flex items-center gap-2 pt-3 border-t border-white/[0.05]">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: LANGUAGE_COLORS[script.language] || '#888' }} />
                    <span className="text-[11px] text-zinc-500 font-medium">{script.language}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}