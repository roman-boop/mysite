import React from 'react';
import CurriculumBlock from './CurriculumBlock';

const CURRICULUM = [
  {
    title: 'Введение в крипту',
    subtitle: 'Начни здесь.',
    description: 'Всё, что нужно знать перед первой сделкой. Понимание основ криптоэкосистемы: от механики блокчейна до первого кошелька.',
    accentColor: '#f59e0b',
    lessons: [
      { title: 'Что такое криптовалюта', duration: '12 мин', youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      { title: 'Как работает блокчейн', duration: '18 мин', youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      { title: 'Виды криптоактивов', duration: '15 мин', youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      { title: 'Кошельки и биржи', duration: '20 мин', youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      { title: 'Как купить первую крипту', duration: '14 мин', youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    ],
  },
  {
    title: 'Smart Money Основы',
    subtitle: 'Думай как институционал.',
    description: 'Научитесь читать рынок так, как это делают профессиональные трейдеры и институции. Определяйте ордер-блоки, зоны ликвидности и структурные сдвиги раньше розничных трейдеров.',
    accentColor: '#8b5cf6',
    lessons: [
      { title: 'Кто такие Smart Money', duration: '16 мин', youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      { title: 'Ордер-блоки', duration: '24 мин', youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      { title: 'Fair Value Gaps', duration: '19 мин', youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      { title: 'Зоны ликвидности', duration: '22 мин', youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      { title: 'Break of Structure и Change of Character', duration: '28 мин', youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    ],
  },
  {
    title: 'Психология трейдинга',
    subtitle: 'Управляй своим разумом.',
    description: 'Самое недооценённое преимущество в трейдинге. Выстройте психологическую базу, которая отличает прибыльных трейдеров от 95% проигрывающих. Дисциплина — это навык, а не черта характера.',
    accentColor: '#06b6d4',
    lessons: [
      { title: 'Основы психологии трейдинга', duration: '20 мин', youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      { title: 'Управление страхом и жадностью', duration: '18 мин', youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      { title: 'Построение торговой рутины', duration: '15 мин', youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      { title: 'Работа с убытками', duration: '22 мин', youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      { title: 'Дисциплина и терпение в трейдинге', duration: '17 мин', youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    ],
  },
  {
    title: 'Построение стратегии',
    subtitle: 'Создай своё преимущество.',
    description: 'Постройте полноценную торговую стратегию с нуля. Определите каждый вход, выход и параметр риска, чтобы система работала на логике, а не на эмоциях.',
    accentColor: '#22c55e',
    lessons: [
      { title: 'Определение торгового стиля', duration: '16 мин', youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      { title: 'Правила входа и выхода', duration: '25 мин', youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      { title: 'Соотношение риск/прибыль', duration: '18 мин', youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      { title: 'Составление торгового плана', duration: '30 мин', youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      { title: 'Комбинирование индикаторов с прайс экшн', duration: '27 мин', youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    ],
  },
  {
    title: 'Развитие навыков',
    subtitle: 'Оттачивай мастерство.',
    description: 'Повысьте скорость исполнения и анализа. От ведения торгового журнала до продвинутого чтения потока ордеров — привычки, которые складываются в долгосрочную прибыльность.',
    accentColor: '#f97316',
    lessons: [
      { title: 'Быстрое чтение графиков', duration: '14 мин', youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      { title: 'Ведение торгового журнала', duration: '20 мин', youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      { title: 'Разбор ошибок', duration: '18 мин', youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      { title: 'Адаптация к рыночным условиям', duration: '23 мин', youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      { title: 'Продвинутое чтение потока ордеров', duration: '32 мин', youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    ],
  },
  {
    title: 'Бэктестинг',
    subtitle: 'Проверяй перед риском.',
    description: 'Докажите, что стратегия работает, прежде чем рисковать реальным капиталом. Изучите методы ручного и автоматического бэктестинга, статистический анализ и оптимизацию стратегий.',
    accentColor: '#ec4899',
    lessons: [
      { title: 'Что такое бэктестинг', duration: '12 мин', youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      { title: 'Ручной vs автоматический бэктестинг', duration: '20 мин', youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      { title: 'Настройка среды для бэктестинга', duration: '35 мин', youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      { title: 'Анализ результатов бэктеста', duration: '28 мин', youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      { title: 'Оптимизация стратегии на основе данных', duration: '30 мин', youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    ],
  },
];

export default function LearningGrid() {
  return (
    <section className="py-16 px-6 md:px-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-12">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-[1px] bg-amber-400/60" />
              <span className="text-[11px] tracking-[0.25em] uppercase text-zinc-500 font-semibold">Программа</span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl text-white font-light">
              6 модулей <span className="italic text-zinc-500">· 30 уроков</span>
            </h2>
          </div>
          <div className="hidden md:flex items-center gap-2 text-[11px] text-zinc-600 uppercase tracking-widest">
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            Бесплатно
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.04]">
          {CURRICULUM?.map((block, i) => (
            <CurriculumBlock
              key={i}
              index={i + 1}
              title={block?.title}
              subtitle={block?.subtitle}
              description={block?.description}
              lessons={block?.lessons}
              accentColor={block?.accentColor}
              isLarge={false}
            />
          ))}
        </div>

        <div className="mt-12 p-8 border border-white/[0.06] bg-amber-400/[0.02] flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="font-display text-xl text-white mb-1">Хотите углубиться?</h3>
            <p className="text-sm text-zinc-500 font-light">Смотрите полную видеосерию на YouTube и присоединяйтесь к Telegram-сообществу.</p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <a
              href="https://www.youtube.com/@crypto_maniacdt/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 bg-amber-400 text-black text-xs font-bold uppercase tracking-widest hover:bg-amber-300 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
              YouTube
            </a>
            <a
              href="https://t.me/crypto_maniacdt"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 border border-white/20 text-white text-xs font-bold uppercase tracking-widest hover:border-amber-400/40 hover:text-amber-400 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
              Telegram
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}