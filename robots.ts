'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';

export default function CabinetPage() {
  const router = useRouter();
  const { user, loading, profile, hasLearningAccess, updateBingxUid } = useAuth();

  const [bingxUid, setBingxUid] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login?redirect=/cabinet');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <main className="bg-[#030303] min-h-screen flex items-center justify-center">
        <div className="noise-overlay" />
        <div className="relative z-10 text-zinc-600 text-sm uppercase tracking-widest animate-pulse">Loading...</div>
      </main>
    );
  }

  if (!user) return null;

  const handleSubmitUid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bingxUid.trim()) return;
    setMessage(null);
    setSubmitting(true);
    try {
      const result = await updateBingxUid(bingxUid.trim());
      setMessage({ type: result.success ? 'success' : 'error', text: result.message });
      if (result.success) setBingxUid('');
    } catch {
      setMessage({ type: 'error', text: 'Something went wrong. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const hasAccess = hasLearningAccess();

  return (
    <main className="bg-[#030303] min-h-screen">
      <div className="noise-overlay" />
      <Header />

      <section className="relative pt-32 pb-20 px-6 md:px-12">
        <div className="max-w-3xl mx-auto">

          {/* Page header */}
          <div className="mb-12 fade-in-up">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-[1px] bg-amber-400/60" />
              <span className="text-[11px] tracking-[0.25em] uppercase text-zinc-500 font-semibold">
                Мой аккаунт
              </span>
            </div>
            <h1 className="font-display text-5xl md:text-6xl text-white font-light leading-tight">
              Личный <span className="italic text-zinc-500">кабинет</span>
            </h1>
          </div>

          {/* Profile info card */}
          <div className="border border-white/[0.08] p-8 mb-8 fade-in-up delay-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-6 h-[1px] bg-amber-400/60" />
              <span className="text-[11px] tracking-[0.2em] uppercase text-zinc-500 font-semibold">Профиль</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-[11px] uppercase tracking-widest text-zinc-600 mb-1 font-semibold">Имя</p>
                <p className="text-white text-sm font-light">{profile?.full_name || '—'}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest text-zinc-600 mb-1 font-semibold">Email</p>
                <p className="text-white text-sm font-light">{user?.email || '—'}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest text-zinc-600 mb-1 font-semibold">Дата регистрации</p>
                <p className="text-white text-sm font-light">
                  {profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest text-zinc-600 mb-1 font-semibold">Доступ к обучению</p>
                {hasAccess ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                    Разблокировано
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 inline-block" />
                    Нет доступа
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* BingX UID section */}
          <div className="border border-white/[0.08] p-8 fade-in-up delay-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-6 h-[1px] bg-amber-400/60" />
              <span className="text-[11px] tracking-[0.2em] uppercase text-zinc-500 font-semibold">BingX UID</span>
            </div>

            {hasAccess ? (
              <div>
                <p className="text-sm text-zinc-400 font-light leading-relaxed mb-4">
                  Ваш BingX UID привязан и подтверждён.
                </p>
                <div className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] px-4 py-3">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-amber-400 flex-shrink-0">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-sm font-mono text-white">{profile?.bingx_uid}</span>
                </div>
                <p className="mt-3 text-[11px] text-zinc-600">
                  UID подтверждён — у вас полный доступ к разделу Learning.
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-zinc-400 font-light leading-relaxed mb-6">
                  Введите ваш BingX UID для разблокировки раздела Learning. Ваш UID должен быть в списке одобренных рефералов. Если его там нет — свяжитесь с администратором.
                </p>

                <form onSubmit={handleSubmitUid} className="space-y-4">
                  <div>
                    <label className="block text-[11px] uppercase tracking-widest text-zinc-500 mb-2 font-semibold">
                      BingX UID
                    </label>
                    <input
                      type="text"
                      value={bingxUid}
                      onChange={(e) => setBingxUid(e.target.value)}
                      placeholder="Введите ваш BingX UID"
                      className="w-full bg-transparent border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-amber-400/50 transition-colors placeholder:text-zinc-700 font-mono"
                    />
                  </div>

                  {message && (
                    <div className={`px-4 py-3 text-sm border ${message.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400' : 'border-red-500/30 bg-red-500/5 text-red-400'}`}>
                      {message.text}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || !bingxUid.trim()}
                    className="bg-white text-black text-[11px] font-bold uppercase tracking-[0.2em] px-8 py-3 hover:bg-amber-400 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Проверка...' : 'Привязать BingX UID'}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Quick links */}
          <div className="mt-8 flex items-center gap-6 fade-in-up delay-300">
            <Link
              href="/learning"
              className={`text-[11px] font-bold uppercase tracking-widest transition-colors ${
                hasAccess ? 'text-amber-400 hover:text-amber-300' : 'text-zinc-600 cursor-not-allowed pointer-events-none'
              }`}
            >
              {hasAccess ? '→ Перейти к обучению' : 'Learning (заблокировано)'}
            </Link>
            <Link
              href="/homepage"
              className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
            >
              ← На главную
            </Link>
          </div>

        </div>
      </section>

      <Footer />
    </main>
  );
}
