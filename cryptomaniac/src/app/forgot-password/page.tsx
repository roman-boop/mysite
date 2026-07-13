'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import AppLogo from '@/components/ui/AppLogo';

function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      setError(err?.message || 'Не удалось отправить письмо. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="bg-[#030303] min-h-screen flex items-center justify-center px-6">
      <div className="noise-overlay" />
      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-12">
          <Link href="/homepage" className="flex items-center gap-2 group">
            <AppLogo size={32} />
            <span className="font-display font-medium text-lg tracking-tight text-white group-hover:opacity-70 transition-opacity">
              crypto_maniac
            </span>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-[1px] bg-amber-400/60" />
            <span className="text-[11px] tracking-[0.25em] uppercase text-zinc-500 font-semibold">
              Восстановление доступа
            </span>
          </div>
          <h1 className="font-display text-4xl text-white font-light">
            Сброс <span className="italic text-zinc-500">пароля</span>
          </h1>
        </div>

        {sent ? (
          <div className="space-y-6">
            <div className="border border-amber-400/30 bg-amber-400/5 px-4 py-4 text-sm text-amber-300">
              Письмо со ссылкой для сброса пароля отправлено на <strong>{email}</strong>. Проверьте почту.
            </div>
            <Link
              href="/login"
              className="block w-full text-center bg-white text-black text-[11px] font-bold uppercase tracking-[0.2em] py-3.5 hover:bg-amber-400 transition-all duration-300"
            >
              Вернуться к входу
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <p className="text-sm text-zinc-500">
              Введите email, указанный при регистрации. Мы отправим ссылку для сброса пароля.
            </p>

            <div>
              <label className="block text-[11px] uppercase tracking-widest text-zinc-500 mb-2 font-semibold">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className="w-full bg-transparent border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-amber-400/50 transition-colors placeholder:text-zinc-700"
              />
            </div>

            {error && (
              <div className="border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black text-[11px] font-bold uppercase tracking-[0.2em] py-3.5 hover:bg-amber-400 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Отправка...' : 'Отправить ссылку'}
            </button>

            <p className="text-sm text-zinc-600 text-center">
              <Link href="/login" className="text-amber-400 hover:text-amber-300 transition-colors">
                ← Вернуться к входу
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={
      <main className="bg-[#030303] min-h-screen flex items-center justify-center">
        <div className="noise-overlay" />
        <div className="relative z-10 text-zinc-600 text-sm uppercase tracking-widest animate-pulse">Loading...</div>
      </main>
    }>
      <ForgotPasswordForm />
    </Suspense>
  );
}
