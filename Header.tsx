import React from 'react';
import AppImage from '@/components/ui/AppImage';

const STATS = [
{ value: '4+', label: 'Лет в трейдинге' },
{ value: '20+', label: 'Open Source проектов' },
{ value: '5K+', label: 'Участников сообщества' },
{ value: '100+', label: 'Обучающих видео' }];


export default function AboutSection() {
  return (
    <section className="py-32 px-6 md:px-12 border-b border-white/[0.06]">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
        {/* Image column */}
        <div className="relative group">
          <div className="aspect-[3/4] overflow-hidden bg-zinc-900 relative arch-image">
            <AppImage
              src="https://img.rocket.new/generatedImages/rocket_gen_img_1d38e1156-1765120170275.png"
              alt="Trader analyzing cryptocurrency charts on multiple monitors in a dark trading room"
              width={600}
              height={800}
              className="object-cover w-full h-full opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-1000" />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
            <div className="absolute bottom-8 left-8">
              <p className="font-display text-2xl italic text-white">crypto_maniac</p>
              <p className="text-[11px] uppercase tracking-widest text-zinc-400 mt-1">Algotrader & Educator</p>
            </div>
          </div>
          {/* Decorative offset border */}
          <div className="absolute top-4 -right-3 w-full h-full border border-amber-400/10 arch-image pointer-events-none transition-all duration-500 group-hover:top-2 group-hover:-right-2" />
        </div>

        {/* Text column */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-[1px] bg-amber-400/60" />
            <span className="text-[11px] tracking-[0.25em] uppercase text-zinc-500 font-semibold">Обо мне</span>
          </div>
          <h2 className="font-display text-5xl md:text-6xl text-white mb-8 leading-[0.9]">
            Искусство <br />
            <span className="italic text-zinc-600 font-light">системной</span>
            <br />торговли.
          </h2>
          <div className="space-y-5 border-l border-white/10 pl-8 mb-12">
            <p className="text-base text-zinc-400 font-light leading-relaxed">
              Я создаю алгоритмические торговые системы, которые убирают эмоции из уравнения. Каждая стратегия протестирована, каждое правило явно, каждый риск измерен.
            </p>
            <p className="text-base text-zinc-400 font-light leading-relaxed">
              Мой фокус: Smart Money Concepts, анализ потока ордеров и автоматизация на Python. Я делюсь всем открыто — код, исследования и уроки из дорогостоящих ошибок.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-6 pt-10 border-t border-white/[0.06]">
            {[
              { value: '4+', label: 'Лет в трейдинге' },
              { value: '20+', label: 'Open Source проектов' },
              { value: '5K+', label: 'Участников сообщества' },
              { value: '100+', label: 'Обучающих видео' },
            ]?.map((stat) =>
            <div key={stat?.label}>
                <div className="font-display text-4xl text-white font-normal mb-1">
                  {stat?.value}
                </div>
                <div className="text-[11px] text-zinc-500 uppercase tracking-widest">{stat?.label}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>);

}