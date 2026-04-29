'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MarketAnalysis {
  probabilities: { upward: number; downward: number; consolidation: number };
  indicators: { rsi: number; adx: number; fractal_overlap: number; r2: number; volume_ratio: number };
  condition: string;
  timestamp: string;
}

interface OISignal {
  symbol: string;
  period: string;
  oi_growth_4h: number;
  oi_growth_24h: number;
  price_growth_4h: number;
  price_growth_24h: number;
  price_now: number;
  oi_now: number;
}

interface FundingSignal {
  symbol: string;
  funding_rate: number;
  mark_price: number;
  direction: 'LONG' | 'SHORT';
  abs_rate: number;
}

interface ApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  scanned?: number;
  elapsed_ms?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function fmtPct(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

function fmtFunding(n: number): string {
  return `${n >= 0 ? '+' : ''}${(n * 100).toFixed(4)}%`;
}

function cleanSymbol(sym: string): string {
  return sym.replace('USDT', '').replace('-USDT', '').replace('_USDT', '');
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload?.length) {
    const { name, value, color } = payload[0].payload;
    return (
      <div className="bg-[#111] border border-white/10 px-3 py-1.5 text-xs">
        <span style={{ color }} className="font-semibold">{name}</span>
        <span className="text-white/50 ml-2">{(value * 100).toFixed(1)}%</span>
      </div>
    );
  }
  return null;
};

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionLabel({
  index, label, badge, lastUpdated, loading, interval,
}: {
  index: string; label: string; badge?: string;
  lastUpdated: Date | null; loading: boolean; interval: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-[10px] font-semibold text-white/20 tracking-[0.2em]">{index}</span>
      <h2 className="text-sm font-semibold tracking-tight text-white/75">{label}</h2>
      {badge && (
        <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/30 border border-white/10 px-2 py-0.5">
          {badge}
        </span>
      )}
      <div className="ml-auto flex items-center gap-3">
        <span className="text-[9px] text-white/20 font-mono">↻ {interval}</span>
        {loading && (
          <span className="text-[9px] text-amber-400/60 font-mono animate-pulse">scanning…</span>
        )}
        {!loading && lastUpdated && (
          <span className="text-[9px] text-white/20 font-mono">{fmtTime(lastUpdated)}</span>
        )}
      </div>
    </div>
  );
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRows({ count = 5, cols = 5 }: { count?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-white/5 animate-pulse">
          {Array.from({ length: cols }).map((__, j) => (
            <div key={j} className="h-2.5 bg-white/5 rounded flex-1" style={{ maxWidth: j === 0 ? 80 : j === cols - 1 ? 50 : 100 }} />
          ))}
        </div>
      ))}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MarketPage() {
  const [analysis, setAnalysis] = useState<ApiResult<MarketAnalysis>>({
    data: null, loading: true, error: null, lastUpdated: null,
  });
  const [oiResult, setOiResult] = useState<ApiResult<OISignal[]>>({
    data: null, loading: true, error: null, lastUpdated: null, scanned: 0, elapsed_ms: 0,
  });
  const [fundingResult, setFundingResult] = useState<ApiResult<FundingSignal[]>>({
    data: null, loading: true, error: null, lastUpdated: null, scanned: 0, elapsed_ms: 0,
  });

  const fetchAnalysis = useCallback(async () => {
    setAnalysis((p) => ({ ...p, loading: true, error: null }));
    try {
      const res = await fetch('/api/market/analysis');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      setAnalysis({ data: json, loading: false, error: null, lastUpdated: new Date() });
    } catch (e: any) {
      console.error('[Market] Analysis fetch error:', e);
      setAnalysis((p) => ({ ...p, loading: false, error: e.message }));
    }
  }, []);

  const fetchOI = useCallback(async () => {
    setOiResult((p) => ({ ...p, loading: true, error: null }));
    try {
      const res = await fetch('/api/market/oi-signals');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      setOiResult({ data: json.signals, loading: false, error: null, lastUpdated: new Date(), scanned: json.scanned, elapsed_ms: json.elapsed_ms });
    } catch (e: any) {
      console.error('[Market] OI signals fetch error:', e);
      setOiResult((p) => ({ ...p, loading: false, error: e.message }));
    }
  }, []);

  const fetchFunding = useCallback(async () => {
    setFundingResult((p) => ({ ...p, loading: true, error: null }));
    try {
      const res = await fetch('/api/market/funding-signals');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      setFundingResult({ data: json.signals, loading: false, error: null, lastUpdated: new Date(), scanned: json.scanned, elapsed_ms: json.elapsed_ms });
    } catch (e: any) {
      console.error('[Market] Funding signals fetch error:', e);
      setFundingResult((p) => ({ ...p, loading: false, error: e.message }));
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchAnalysis();
    fetchOI();
    fetchFunding();
  }, [fetchAnalysis, fetchOI, fetchFunding]);

  // Auto-refresh intervals
  useEffect(() => {
    const t = setInterval(fetchAnalysis, 4 * 60 * 60 * 1000); // 4h
    return () => clearInterval(t);
  }, [fetchAnalysis]);

  useEffect(() => {
    const t = setInterval(fetchOI, 3 * 60 * 1000); // 3min
    return () => clearInterval(t);
  }, [fetchOI]);

  useEffect(() => {
    const t = setInterval(fetchFunding, 5 * 60 * 1000); // 5min
    return () => clearInterval(t);
  }, [fetchFunding]);

  // Chart data
  const probs = analysis.data?.probabilities;
  const chartData = probs
    ? [
        { name: 'Uptrend', value: probs.upward, color: '#4ade80' },
        { name: 'Downtrend', value: probs.downward, color: '#f87171' },
        { name: 'Consolidation', value: probs.consolidation, color: '#737373' },
      ]
    : [
        { name: 'Uptrend', value: 0.33, color: '#4ade80' },
        { name: 'Downtrend', value: 0.33, color: '#f87171' },
        { name: 'Consolidation', value: 0.34, color: '#737373' },
      ];

  const dominant = chartData.reduce((a, b) => (a.value > b.value ? a : b));
  const conditionColor =
    analysis.data?.condition === 'BULLISH' ? 'text-green-400' :
    analysis.data?.condition === 'BEARISH' ? 'text-red-400' :
    analysis.data?.condition === 'CONSOLIDATION' ? 'text-white/50' : 'text-white/40';

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Header />

      <main className="max-w-7xl mx-auto px-6 md:px-12 pt-32 pb-24">
        {/* Page title */}
        <div className="mb-12">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/25 mb-2">Analytics</p>
          <h1 className="text-3xl md:text-4xl font-display font-medium tracking-tight">Market</h1>
        </div>

        {/* ── Section 1: Market Analyzer ── */}
        <section className="mb-12">
          <SectionLabel
            index="01"
            label="Market Analyzer"
            lastUpdated={analysis.lastUpdated}
            loading={analysis.loading}
            interval="4h"
          />

          <div className="border border-white/[0.07] bg-[#0d0d0d]">
            {analysis.error ? (
              <div className="px-6 py-8 text-xs text-red-400/70">{analysis.error}</div>
            ) : (
              <div className="flex flex-col md:flex-row">
                {/* Donut */}
                <div className="w-full md:w-56 h-48 flex-shrink-0 flex items-center justify-center border-b md:border-b-0 md:border-r border-white/[0.06]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={76}
                        paddingAngle={2}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {chartData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Stats */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.06]">
                  {/* Probabilities */}
                  <div className="px-6 py-5">
                    <p className="text-[9px] uppercase tracking-[0.25em] text-white/25 mb-3">Probabilities</p>
                    <div className="space-y-2.5">
                      {chartData.map((item) => (
                        <div key={item.name} className="flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="text-[11px] text-white/40 w-24">{item.name}</span>
                          <div className="flex-1 h-px bg-white/5 relative">
                            <div
                              className="absolute top-0 left-0 h-px transition-all duration-700"
                              style={{ width: `${item.value * 100}%`, backgroundColor: item.color, opacity: 0.5 }}
                            />
                          </div>
                          <span className="text-xs font-mono font-semibold" style={{ color: item.color }}>
                            {(item.value * 100).toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/[0.06]">
                      <span className="text-[9px] uppercase tracking-[0.2em] text-white/25 mr-2">Condition</span>
                      <span className={`text-xs font-semibold ${conditionColor}`}>
                        {analysis.loading ? '—' : (analysis.data?.condition ?? '—')}
                      </span>
                    </div>
                  </div>

                  {/* Indicators */}
                  <div className="px-6 py-5">
                    <p className="text-[9px] uppercase tracking-[0.25em] text-white/25 mb-3">Indicators</p>
                    {analysis.loading ? (
                      <div className="space-y-2">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="h-2.5 bg-white/5 rounded animate-pulse" />
                        ))}
                      </div>
                    ) : analysis.data ? (
                      <div className="space-y-2">
                        {[
                          { label: 'RSI', value: analysis.data.indicators.rsi.toFixed(1) },
                          { label: 'ADX', value: analysis.data.indicators.adx.toFixed(1) },
                          { label: 'Fractal Overlap', value: analysis.data.indicators.fractal_overlap.toFixed(2) },
                          { label: 'R²', value: analysis.data.indicators.r2.toFixed(3) },
                          { label: 'Volume Ratio', value: analysis.data.indicators.volume_ratio.toFixed(2) },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex items-center justify-between">
                            <span className="text-[11px] text-white/35">{label}</span>
                            <span className="text-[11px] font-mono text-white/60">{value}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Section 2: Open Interest Signals ── */}
        <section className="mb-12">
          <SectionLabel
            index="02"
            label="Open Interest Signals"
            badge={oiResult.data ? `${oiResult.data.length} tokens` : undefined}
            lastUpdated={oiResult.lastUpdated}
            loading={oiResult.loading}
            interval="3min"
          />

          <div className="border border-white/[0.07] bg-[#0d0d0d] overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr_0.7fr] gap-0 border-b border-white/[0.07] px-5 py-2.5">
              {['Token', 'Period', 'OI 4h', 'OI 24h', 'Price 4h', 'OI Value'].map((h) => (
                <span key={h} className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/20">{h}</span>
              ))}
            </div>

            {oiResult.loading && !oiResult.data ? (
              <SkeletonRows count={6} cols={6} />
            ) : oiResult.error ? (
              <div className="px-5 py-6 text-xs text-red-400/70">{oiResult.error}</div>
            ) : !oiResult.data?.length ? (
              <div className="px-5 py-6 text-xs text-white/25">No significant OI divergences found</div>
            ) : (
              oiResult.data.map((sig, i) => {
                const maxGrowth = Math.max(sig.oi_growth_4h, sig.oi_growth_24h);
                const isPositive = maxGrowth >= 0;
                return (
                  <div
                    key={sig.symbol}
                    className={`grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr_0.7fr] items-center gap-0 px-5 py-3 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${
                      i % 2 !== 0 ? 'bg-white/[0.01]' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-white/20 w-4">{i + 1}</span>
                      <span className="text-xs font-mono font-semibold text-white/75">{cleanSymbol(sig.symbol)}</span>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-[0.12em] px-1.5 py-0.5 w-fit ${
                      sig.period === '4h' ? 'bg-amber-400/10 text-amber-400/80' : 'bg-blue-400/10 text-blue-400/80'
                    }`}>
                      {sig.period}
                    </span>
                    <span className={`text-xs font-mono ${sig.oi_growth_4h >= 0 ? 'text-green-400/80' : 'text-red-400/80'}`}>
                      {fmtPct(sig.oi_growth_4h)}
                    </span>
                    <span className={`text-xs font-mono ${sig.oi_growth_24h >= 0 ? 'text-green-400/80' : 'text-red-400/80'}`}>
                      {fmtPct(sig.oi_growth_24h)}
                    </span>
                    <span className={`text-xs font-mono ${sig.price_growth_4h >= 0 ? 'text-white/50' : 'text-red-400/60'}`}>
                      {fmtPct(sig.price_growth_4h)}
                    </span>
                    <span className="text-[11px] font-mono text-white/30">
                      ${(sig.oi_now / 1e6).toFixed(1)}M
                    </span>
                  </div>
                );
              })
            )}

            {/* Footer */}
            {(oiResult.scanned || oiResult.elapsed_ms) ? (
              <div className="px-5 py-2.5 border-t border-white/[0.04] flex items-center gap-4">
                {oiResult.scanned ? (
                  <span className="text-[9px] text-white/20 font-mono">scanned {oiResult.scanned} symbols</span>
                ) : null}
                {oiResult.elapsed_ms ? (
                  <span className="text-[9px] text-white/20 font-mono">{(oiResult.elapsed_ms / 1000).toFixed(1)}s</span>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        {/* ── Section 3: Funding Rate Signals ── */}
        <section>
          <SectionLabel
            index="03"
            label="Funding Rate Signals"
            badge={fundingResult.data ? `${fundingResult.data.length} tokens` : undefined}
            lastUpdated={fundingResult.lastUpdated}
            loading={fundingResult.loading}
            interval="5min"
          />

          <div className="border border-white/[0.07] bg-[#0d0d0d] overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_1fr] gap-0 border-b border-white/[0.07] px-5 py-2.5">
              {['Token', 'Funding Rate', 'Direction', 'Mark Price'].map((h) => (
                <span key={h} className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/20">{h}</span>
              ))}
            </div>

            {fundingResult.loading && !fundingResult.data ? (
              <SkeletonRows count={5} cols={4} />
            ) : fundingResult.error ? (
              <div className="px-5 py-6 text-xs text-red-400/70">{fundingResult.error}</div>
            ) : !fundingResult.data?.length ? (
              <div className="px-5 py-6 text-xs text-white/25">No interesting funding rates found</div>
            ) : (
              fundingResult.data.map((sig, i) => {
                const isLong = sig.direction === 'LONG';
                return (
                  <div
                    key={sig.symbol}
                    className={`grid grid-cols-[1.2fr_0.8fr_0.8fr_1fr] items-center gap-0 px-5 py-3 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${
                      i % 2 !== 0 ? 'bg-white/[0.01]' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-white/20 w-4">{i + 1}</span>
                      <span className="text-xs font-mono font-semibold text-white/75">{cleanSymbol(sig.symbol)}</span>
                    </div>
                    <span className={`text-xs font-mono font-semibold ${isLong ? 'text-green-400/80' : 'text-red-400/80'}`}>
                      {fmtFunding(sig.funding_rate)}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-[0.12em] px-1.5 py-0.5 w-fit ${
                      isLong ? 'bg-green-400/10 text-green-400/70' : 'bg-red-400/10 text-red-400/70'
                    }`}>
                      {sig.direction}
                    </span>
                    <span className="text-[11px] font-mono text-white/35">
                      ${sig.mark_price > 0 ? sig.mark_price.toFixed(sig.mark_price < 1 ? 6 : sig.mark_price < 100 ? 4 : 2) : '—'}
                    </span>
                  </div>
                );
              })
            )}

            {/* Footer */}
            {(fundingResult.scanned || fundingResult.elapsed_ms) ? (
              <div className="px-5 py-2.5 border-t border-white/[0.04] flex items-center gap-4">
                {fundingResult.scanned ? (
                  <span className="text-[9px] text-white/20 font-mono">scanned {fundingResult.scanned} symbols</span>
                ) : null}
                {fundingResult.elapsed_ms ? (
                  <span className="text-[9px] text-white/20 font-mono">{(fundingResult.elapsed_ms / 1000).toFixed(1)}s</span>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
      </main>

      {/* ── BingX Banner ── */}
      <a
        href="https://bingxdao.com/partner/maniacdt/"
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full border-t border-white/[0.07] bg-[#0d0d0d] hover:bg-[#111] transition-colors"
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-4 flex items-center justify-center gap-3">
          <span className="text-[11px] text-white/35 tracking-wide text-center">
            Торгуйте криптовалютами и другими рынками с самой низкой комиссией на{' '}
            <span className="text-white/60 font-semibold">BingX</span>
          </span>
          <span className="text-[10px] text-white/20 font-mono flex-shrink-0">→</span>
        </div>
      </a>

      <Footer />
    </div>
  );
}
