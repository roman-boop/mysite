'use client';

import React, { useEffect, useState, useCallback } from 'react';

interface CoinData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
}

const FALLBACK_PRICES: CoinData[] = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', current_price: 71240, price_change_percentage_24h: -1.82, market_cap: 1400000000000 },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', current_price: 2280, price_change_percentage_24h: 2.14, market_cap: 274000000000 },
  { id: 'solana', symbol: 'SOL', name: 'Solana', current_price: 88.96, price_change_percentage_24h: -0.74, market_cap: 42000000000 },
  { id: 'ripple', symbol: 'XRP', name: 'XRP', current_price: 1.44, price_change_percentage_24h: 1.23, market_cap: 83000000000 },
  { id: 'binancecoin', symbol: 'BNB', name: 'BNB', current_price: 646.29, price_change_percentage_24h: 0.45, market_cap: 94000000000 },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', current_price: 0.092, price_change_percentage_24h: -2.1, market_cap: 13500000000 },
];

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (price >= 1) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return price.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 4 });
}

function formatMarketCap(cap: number): string {
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(1)}B`;
  return `$${(cap / 1e6).toFixed(0)}M`;
}

export default function CryptoPrices() {
  const [coins, setCoins] = useState<CoinData[]>(FALLBACK_PRICES);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');

  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch(
        'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,ripple,binancecoin,dogecoin&order=market_cap_desc&per_page=6&page=1&sparkline=false&price_change_percentage=24h',
        { cache: 'no-store' }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setCoins(data.map((c: Record<string, unknown>) => ({
            id: c.id as string,
            symbol: (c.symbol as string).toUpperCase(),
            name: c.name as string,
            current_price: c.current_price as number,
            price_change_percentage_24h: c.price_change_percentage_24h as number,
            market_cap: c.market_cap as number,
          })));
          setLastUpdated(new Date().toLocaleTimeString());
        }
      }
    } catch {
      // Use fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  return (
    <section className="py-20 px-6 md:px-12 border-b border-white/[0.06]">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-[1px] bg-amber-400/60" />
              <span className="text-[11px] tracking-[0.25em] uppercase text-zinc-500 font-semibold">Live Market</span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl text-white font-light">
              Crypto <span className="italic text-zinc-500">Prices</span>
            </h2>
          </div>
          {lastUpdated && (
            <span className="text-[11px] text-zinc-600 uppercase tracking-widest hidden md:block">
              Updated {lastUpdated}
            </span>
          )}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.05]">
          {coins.map((coin, i) => {
            const isPositive = coin.price_change_percentage_24h >= 0;
            return (
              <div
                key={coin.id}
                className={`bg-[#030303] p-6 group hover:bg-[#0d0d0d] transition-all duration-500 ${loading ? 'animate-pulse' : ''}`}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-[11px] font-bold tracking-[0.2em] uppercase text-zinc-500 mb-1">
                      {coin.symbol}
                    </div>
                    <div className="text-sm text-zinc-400 font-medium">{coin.name}</div>
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2 py-1 tracking-wider ${
                      isPositive
                        ? 'text-green-400 bg-green-400/10' :'text-red-400 bg-red-400/10'
                    }`}
                  >
                    {isPositive ? '+' : ''}{coin.price_change_percentage_24h.toFixed(2)}%
                  </span>
                </div>

                <div className="text-2xl font-display font-light text-white mb-3">
                  ${formatPrice(coin.current_price)}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-zinc-600 uppercase tracking-widest">MCap</span>
                  <span className="text-[11px] text-zinc-500 font-medium">{formatMarketCap(coin.market_cap)}</span>
                </div>

                {/* Bottom bar */}
                <div className="mt-4 h-[1px] w-0 group-hover:w-full bg-amber-400/40 transition-all duration-700" />
              </div>
            );
          })}
        </div>

        {/* Bitcoin context note */}
        <div className="mt-6 p-4 border border-white/[0.06] bg-amber-400/[0.03]">
          <p className="text-[12px] text-zinc-500 leading-relaxed">
            <span className="text-amber-400 font-semibold">Market context:</span> BTC retreated from ATH above $100K in late 2024. The 20 millionth Bitcoin was mined on March 10, 2026. Citigroup 12-month BTC target: $112,000. ETH Glamsterdam upgrade planned May 2026 with ePBS for MEV resistance.
          </p>
        </div>
      </div>
    </section>
  );
}