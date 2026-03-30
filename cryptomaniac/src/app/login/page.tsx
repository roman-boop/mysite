'use client';

import React, { Suspense } from 'react';
import LoginForm from './LoginForm';

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="bg-[#030303] min-h-screen flex items-center justify-center">
        <div className="noise-overlay" />
        <div className="relative z-10 text-zinc-600 text-sm uppercase tracking-widest animate-pulse">Loading...</div>
      </main>
    }>
      <LoginForm />
    </Suspense>
  );
}
