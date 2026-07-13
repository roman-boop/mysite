'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  oi_change_pct: number;
  price_change_pct: number;
  price_oi_ratio: number;
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
  cached?: boolean;
  generated_at?: string;
}

// screenshot state per signal key (signalType:symbol)
interface ScreenshotState {
  url: string | null;
  loading: boolean;
  uploading: boolean;
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

function fmtPrice(p: number): string {
  if (!p || p === 0) return '—';
  if (p < 0.001) return p.toFixed(8);
  if (p < 1) return p.toFixed(6);
  if (p < 100) return p.toFixed(4);
  if (p < 10000) return p.toFixed(2);
  return p.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function signalKey(signalType: string, symbol: string): string {
  return `${signalType}:${symbol}`;
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
  index, label, badge, lastUpdated, loading, interval, generatedAt,
}: {
  index: string; label: string; badge?: string;
  lastUpdated: Date | null; loading: boolean; interval: string; generatedAt?: string;
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
          <span className="text-[9px] text-amber-400/60 font-mono animate-pulse">loading…</span>
        )}
        {!loading && generatedAt && (
          <span className="text-[9px] text-white/20 font-mono" title="Server generation time">
            gen {new Date(generatedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
          </span>
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

// ─── Error Banner ─────────────────────────────────────────────────────────────

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="px-5 py-4 flex items-start gap-3">
      <span className="text-red-400/60 text-[10px] font-mono mt-0.5">ERR</span>
      <span className="text-xs text-red-400/70 font-mono">{message}</span>
    </div>
  );
}

// ─── Screenshot Button ────────────────────────────────────────────────────────

function ScreenshotButton({
  signalType,
  symbol,
  screenshotState,
  onUpload,
  onView,
}: {
  signalType: string;
  symbol: string;
  screenshotState: ScreenshotState | undefined;
  onUpload: (signalType: string, symbol: string, file: File) => void;
  onView: (url: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasScreenshot = screenshotState?.url != null;
  const isUploading = screenshotState?.uploading ?? false;

  return (
    <div className="flex items-center gap-1.5">
      {hasScreenshot && (
        <button
          onClick={() => onView(screenshotState!.url!)}
          title="View screenshot"
          className="text-[9px] font-mono text-blue-400/70 hover:text-blue-400 border border-blue-400/20 hover:border-blue-400/50 px-1.5 py-0.5 transition-colors"
        >
          📷
        </button>
      )}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        title={hasScreenshot ? 'Replace screenshot' : 'Attach screenshot'}
        className={`text-[9px] font-mono border px-1.5 py-0.5 transition-colors ${
          isUploading
            ? 'text-white/20 border-white/10 cursor-not-allowed'
            : hasScreenshot
            ? 'text-white/30 hover:text-white/60 border-white/10 hover:border-white/25' :'text-white/40 hover:text-white/70 border-white/15 hover:border-white/35'
        }`}
      >
        {isUploading ? '…' : hasScreenshot ? '↑' : '+'}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(signalType, symbol, file);
          e.target.value = '';
        }}
      />
    </div>
  );
}

// ─── Screenshot Viewer Modal ──────────────────────────────────────────────────

function ScreenshotModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl max-h-[90vh] border border-white/10 bg-[#0d0d0d] p-2"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-white/40 hover:text-white/80 text-xs font-mono z-10 bg-[#0d0d0d] px-2 py-1"
        >
          ✕
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="Signal screenshot"
          className="max-w-full max-h-[85vh] object-contain"
        />
      </div>
    </div>
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

  // Screenshots: key = "signalType:symbol"
  const [screenshots, setScreenshots] = useState<Record<string, ScreenshotState>>({});
  const [viewingScreenshot, setViewingScreenshot] = useState<string | null>(null);

  const fetchAnalysis = useCallback(async () => {
    setAnalysis((p) => ({ ...p, loading: true, error: null }));
    try {
      const res = await fetch('/api/market/analysis');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
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
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      setOiResult({
        data: json.signals ?? [],
        loading: false,
        error: null,
        lastUpdated: new Date(),
        scanned: json.scanned,
        elapsed_ms: json.elapsed_ms,
        cached: json.cached,
        generated_at: json.generated_at,
      });
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
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      setFundingResult({
        data: json.signals ?? [],
        loading: false,
        error: null,
        lastUpdated: new Date(),
        scanned: json.scanned,
        elapsed_ms: json.elapsed_ms,
        cached: json.cached,
        generated_at: json.generated_at,
      });
    } catch (e: any) {
      console.error('[Market] Funding signals fetch error:', e);
      setFundingResult((p) => ({ ...p, loading: false, error: e.message }));
    }
  }, []);

  // Trigger server-side signal refresh every 10 minutes
  const triggerRefresh = useCallback(async () => {
    try {
      await fetch('/api/market/refresh-signals');
      // After refresh, reload cached data
      await Promise.all([fetchOI(), fetchFunding()]);
    } catch (e) {
      console.error('[Market] Refresh trigger error:', e);
    }
  }, [fetchOI, fetchFunding]);

  // Initial fetch
  useEffect(() => {
    fetchAnalysis();
    // On first load, trigger a refresh to populate cache, then fetch
    triggerRefresh();
  }, [fetchAnalysis, triggerRefresh]);

  // Auto-refresh intervals
  useEffect(() => {
    const t = setInterval(fetchAnalysis, 4 * 60 * 60 * 1000); // 4h
    return () => clearInterval(t);
  }, [fetchAnalysis]);

  // Every 10 minutes: trigger server-side signal generation
  useEffect(() => {
    const t = setInterval(triggerRefresh, 10 * 60 * 1000); // 10min
    return () => clearInterval(t);
  }, [triggerRefresh]);

  // Load screenshots for visible signals
  const loadScreenshot = useCallback(async (signalType: string, symbol: string) => {
    const key = signalKey(signalType, symbol);
    setScreenshots((prev) => ({
      ...prev,
      [key]: { url: prev[key]?.url ?? null, loading: true, uploading: false },
    }));
    try {
      const res = await fetch(`/api/market/signal-screenshot?signal_type=${signalType}&symbol=${encodeURIComponent(symbol)}`);
      const json = await res.json();
      setScreenshots((prev) => ({
        ...prev,
        [key]: { url: json.screenshot?.screenshot_url ?? null, loading: false, uploading: false },
      }));
    } catch {
      setScreenshots((prev) => ({
        ...prev,
        [key]: { url: null, loading: false, uploading: false },
      }));
    }
  }, []);

  // Load screenshots when signals arrive
  useEffect(() => {
    if (!oiResult.data) return;
    oiResult.data.forEach((sig) => {
      const key = signalKey('oi', sig.symbol);
      if (!(key in screenshots)) loadScreenshot('oi', sig.symbol);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oiResult.data]);

  useEffect(() => {
    if (!fundingResult.data) return;
    fundingResult.data.forEach((sig) => {
      const key = signalKey('funding', sig.symbol);
      if (!(key in screenshots)) loadScreenshot('funding', sig.symbol);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fundingResult.data]);

  // Upload screenshot: convert to base64 data URL and save
  const handleUpload = useCallback(async (signalType: string, symbol: string, file: File) => {
    const key = signalKey(signalType, symbol);
    setScreenshots((prev) => ({
      ...prev,
      [key]: { url: prev[key]?.url ?? null, loading: false, uploading: true },
    }));
    try {
      // Convert file to base64 data URL (stored directly, no external storage needed)
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/market/signal-screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signal_type: signalType, symbol, screenshot_url: dataUrl }),
      });
      const json = await res.json();
      setScreenshots((prev) => ({
        ...prev,
        [key]: { url: json.screenshot?.screenshot_url ?? null, loading: false, uploading: false },
      }));
    } catch {
      setScreenshots((prev) => ({
        ...prev,
        [key]: { url: prev[key]?.url ?? null, loading: false, uploading: false },
      }));
    }
  }, []);

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

  const conditionColor =
    analysis.data?.condition === 'BULLISH' ? 'text-green-400' :
    analysis.data?.condition === 'BEARISH' ? 'text-red-400' :
    analysis.data?.condition === 'CONSOLIDATION' ? 'text-white/50' : 'text-white/40';

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Header />

      {viewingScreenshot && (
        <ScreenshotModal url={viewingScreenshot} onClose={() => setViewingScreenshot(null)} />
      )}

      <main className="max-w-7xl mx-auto px-6 md:px-12 pt-32 pb-24">
        {/* Page title */}
        <div className="mb-12">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/25 mb-2">Analytics · BingX</p>
          <h1 className="text-3xl md:text-4xl font-display font-medium tracking-tight">Market</h1>
          <p className="text-xs text-white/25 mt-2 font-mono">Powered by BingX Perpetual Swaps API · Signals cached every 10 min</p>
        </div>

        {/* ── Section 1: Market Analyzer ── */}
        <section className="mb-12">
          <SectionLabel
            index="01"
            label="Market Analyzer"
            badge="BingX · 4h"
            lastUpdated={analysis.lastUpdated}
            loading={analysis.loading}
            interval="4h"
          />

          <div className="border border-white/[0.07] bg-[#0d0d0d]">
            {analysis.error ? (
              <ErrorBanner message={analysis.error} />
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
                    <p className="text-[9px] uppercase tracking-[0.25em] text-white/25 mb-3">Indicators · BingX 4h</p>
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

        {/* ── Section 2: BingX Funding Rate Scanner ── */}
        <section className="mb-12">
          <SectionLabel
            index="02"
            label="Funding Rate Scanner"
            badge={fundingResult.data ? `${fundingResult.data.length} signals` : undefined}
            lastUpdated={fundingResult.lastUpdated}
            loading={fundingResult.loading}
            interval="10min"
            generatedAt={fundingResult.generated_at}
          />

          <div className="border border-white/[0.07] bg-[#0d0d0d] overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1.4fr_0.9fr_0.7fr_1fr_auto] gap-0 border-b border-white/[0.07] px-5 py-2.5">
              {['Token', 'Funding Rate', 'Signal', 'Mark Price', ''].map((h, i) => (
                <span key={i} className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/20">{h}</span>
              ))}
            </div>

            {fundingResult.loading && !fundingResult.data ? (
              <SkeletonRows count={5} cols={4} />
            ) : fundingResult.error ? (
              <ErrorBanner message={fundingResult.error} />
            ) : !fundingResult.data?.length ? (
              <div className="px-5 py-6 text-xs text-white/25 font-mono">
                {(fundingResult as any).cached === false
                  ? 'Signals are being generated… refresh in a moment' :'No funding rates above threshold (0.1%)'}
              </div>
            ) : (
              fundingResult.data.map((sig, i) => {
                const isLong = sig.direction === 'LONG';
                const key = signalKey('funding', sig.symbol);
                return (
                  <div
                    key={sig.symbol}
                    className={`grid grid-cols-[1.4fr_0.9fr_0.7fr_1fr_auto] items-center gap-0 px-5 py-3 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${
                      i % 2 !== 0 ? 'bg-white/[0.01]' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-white/20 w-4">{i + 1}</span>
                      <span className="text-xs font-mono font-semibold text-white/75">{cleanSymbol(sig.symbol)}</span>
                    </div>
                    <span className={`text-xs font-mono font-semibold tabular-nums ${isLong ? 'text-green-400/80' : 'text-red-400/80'}`}>
                      {fmtFunding(sig.funding_rate)}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-[0.12em] px-1.5 py-0.5 w-fit ${
                      isLong ? 'bg-green-400/10 text-green-400/70' : 'bg-red-400/10 text-red-400/70'
                    }`}>
                      {sig.direction}
                    </span>
                    <span className="text-[11px] font-mono text-white/35 tabular-nums">
                      ${fmtPrice(sig.mark_price)}
                    </span>
                    <div className="flex justify-end pr-1">
                      <ScreenshotButton
                        signalType="funding"
                        symbol={sig.symbol}
                        screenshotState={screenshots[key]}
                        onUpload={handleUpload}
                        onView={setViewingScreenshot}
                      />
                    </div>
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
                {fundingResult.cached && (
                  <span className="text-[9px] text-white/15 font-mono">cached</span>
                )}
                <span className="text-[9px] text-white/15 font-mono ml-auto">threshold ≥ 0.1%</span>
              </div>
            ) : null}
          </div>
        </section>

        {/* ── Section 3: BingX Open Interest Scanner ── */}
        <section className="mb-12">
          <SectionLabel
            index="03"
            label="Open Interest Anomaly Scanner"
            badge={oiResult.data ? `${oiResult.data.length} anomalies` : undefined}
            lastUpdated={oiResult.lastUpdated}
            loading={oiResult.loading}
            interval="10min"
            generatedAt={oiResult.generated_at}
          />

          <div className="border border-white/[0.07] bg-[#0d0d0d] overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1.4fr_0.8fr_0.9fr_0.8fr_0.9fr_auto] gap-0 border-b border-white/[0.07] px-5 py-2.5">
              {['Token', 'OI Δ 1h', 'Price Δ 1h', 'P/OI Ratio', 'Price', ''].map((h, i) => (
                <span key={i} className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/20">{h}</span>
              ))}
            </div>

            {oiResult.loading && !oiResult.data ? (
              <SkeletonRows count={6} cols={5} />
            ) : oiResult.error ? (
              <ErrorBanner message={oiResult.error} />
            ) : !oiResult.data?.length ? (
              <div className="px-5 py-6 text-xs text-white/25 font-mono">
                {(oiResult as any).cached === false
                  ? 'Signals are being generated… refresh in a moment' :'No OI anomalies found — scanner accumulating history, check back in ~1 min'}
              </div>
            ) : (
              oiResult.data.map((sig, i) => {
                const key = signalKey('oi', sig.symbol);
                return (
                  <div
                    key={sig.symbol}
                    className={`grid grid-cols-[1.4fr_0.8fr_0.9fr_0.8fr_0.9fr_auto] items-center gap-0 px-5 py-3 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${
                      i % 2 !== 0 ? 'bg-white/[0.01]' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-white/20 w-4">{i + 1}</span>
                      <span className="text-xs font-mono font-semibold text-white/75">{cleanSymbol(sig.symbol)}</span>
                    </div>
                    <span className="text-xs font-mono font-semibold text-green-400/80 tabular-nums">
                      +{sig.oi_change_pct.toFixed(2)}%
                    </span>
                    <span className={`text-xs font-mono tabular-nums ${sig.price_change_pct >= 0 ? 'text-green-400/60' : 'text-red-400/60'}`}>
                      {sig.price_change_pct >= 0 ? '+' : ''}{sig.price_change_pct.toFixed(2)}%
                    </span>
                    <span className={`text-xs font-mono tabular-nums ${sig.price_oi_ratio < 0.4 ? 'text-amber-400/80' : 'text-white/40'}`}>
                      {sig.price_oi_ratio.toFixed(3)}
                    </span>
                    <span className="text-[11px] font-mono text-white/50 tabular-nums">
                      ${fmtPrice(sig.price_now)}
                    </span>
                    <div className="flex justify-end pr-1">
                      <ScreenshotButton
                        signalType="oi"
                        symbol={sig.symbol}
                        screenshotState={screenshots[key]}
                        onUpload={handleUpload}
                        onView={setViewingScreenshot}
                      />
                    </div>
                  </div>
                );
              })
            )}

            {/* Footer */}
            <div className="px-5 py-2.5 border-t border-white/[0.04] flex items-center gap-4">
              {oiResult.scanned ? (
                <span className="text-[9px] text-white/20 font-mono">scanned {oiResult.scanned} symbols</span>
              ) : null}
              {oiResult.elapsed_ms ? (
                <span className="text-[9px] text-white/20 font-mono">{(oiResult.elapsed_ms / 1000).toFixed(1)}s</span>
              ) : null}
              {oiResult.cached && (
                <span className="text-[9px] text-white/15 font-mono">cached</span>
              )}
              <span className="text-[9px] text-white/15 font-mono ml-auto">OI Δ &gt; 5% · P/OI ratio &lt; 0.7</span>
            </div>
          </div>
        </section>

        {/* ── Section 4: BingX Scanner Info ── */}
        <section className="mb-4">
          <div className="border border-white/[0.05] bg-[#0d0d0d] px-6 py-5">
            <p className="text-[9px] uppercase tracking-[0.25em] text-white/20 mb-3">Scanner Configuration · BingX</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Data Source', value: 'BingX Perpetual Swaps' },
                { label: 'Funding Threshold', value: '≥ 0.1% (8h)' },
                { label: 'OI Change Threshold', value: '> 5% per hour' },
                { label: 'Cache Interval', value: 'Every 10 minutes' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[9px] text-white/20 uppercase tracking-[0.15em] mb-1">{label}</p>
                  <p className="text-[11px] font-mono text-white/50">{value}</p>
                </div>
              ))}
            </div>
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
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-5 flex items-center justify-center gap-4">
          <div className="flex flex-col items-center gap-1">
            <span className="text-[12px] text-white/40 tracking-wide text-center">
              Торгуйте криптовалютами и другими рынками с самой низкой комиссией на{' '}
              <span className="text-white/70 font-semibold">BingX</span>
            </span>
            <span className="text-[10px] text-white/20 font-mono tracking-widest uppercase">Открыть счёт →</span>
          </div>
        </div>
      </a>

      <Footer />
    </div>
  );
}
