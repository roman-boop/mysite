'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AppLogo from '@/components/ui/AppLogo';

export default function RegisterPage() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password, fullName);
      router.push('/homepage');
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="bg-[#030303] min-h-screen flex items-center justify-center px-6 py-16">
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
              Создать аккаунт
            </span>
          </div>
          <h1 className="font-display text-4xl text-white font-light">
            Sign <span className="italic text-zinc-500">up</span>
          </h1>
          <p className="mt-3 text-sm text-zinc-500 font-light leading-relaxed">
            Создайте аккаунт. Вы можете добавить BingX UID позже в кабинете для разблокировки раздела Learning.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[11px] uppercase tracking-widest text-zinc-500 mb-2 font-semibold">
              Имя
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="Ваше имя"
              className="w-full bg-transparent border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-amber-400/50 transition-colors placeholder:text-zinc-700"
            />
          </div>

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

          <div>
            <label className="block text-[11px] uppercase tracking-widest text-zinc-500 mb-2 font-semibold">
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Минимум 6 символов"
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
            {loading ? 'Создание аккаунта...' : 'Создать аккаунт'}
          </button>
        </form>

        {/* Footer link */}
        <p className="mt-8 text-sm text-zinc-600 text-center">
          Уже есть аккаунт?{' '}
          <Link href="/login" className="text-amber-400 hover:text-amber-300 transition-colors">
            Войти
          </Link>
        </p>
      </div>
    </main>
  );
}
