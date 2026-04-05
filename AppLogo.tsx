import React from 'react';
import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HeroSection from './components/HeroSection';
import AboutSection from './components/AboutSection';
import CryptoPrices from './components/CryptoPrices';

export const metadata: Metadata = {
  title: 'CryptoManiac — Algotrading & Crypto Education',
  description: "crypto_maniac's personal hub for algorithmic trading projects, crypto education, and live market data.",
};

export default function HomePage() {
  return (
    <main className="bg-[#030303] min-h-screen">
      <div className="noise-overlay" />
      <div className="grid-lines hidden lg:flex">
        <div className="grid-line" />
        <div className="grid-line" />
        <div className="grid-line" />
      </div>

      <Header />
      <HeroSection />
      <CryptoPrices />
      <AboutSection />
      <Footer />
    </main>
  );
}