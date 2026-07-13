import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service-level Supabase client (bypasses RLS for cache writes)
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

const BINGX_BASE = 'https://open-api.bingx.com';
const FUNDING_THRESHOLD = 0.001;
const OI_CHANGE_MIN_PCT = 5.0;
const PRICE_OI_RATIO_MAX = 0.7;
const MIN_OI_VALUE = 500_000;

// In-memory OI history for this serverless instance
const OI_HISTORY: Map<string, Array<{ ts_ms: number; oi: number; price: number }>> = new Map();
const MAX_HISTORY = 120;

async function bingxGet(path: string, params: Record<string, string | number> = {}): Promise<any> {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
  const url = `${BINGX_BASE}${path}${qs ? '?' + qs : ''}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return res.json();
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

async function getAllTickers(): Promise<string[]> {
  const data = await bingxGet('/openApi/swap/v2/quote/contracts');
  if (!data || data.code !== 0 || !Array.isArray(data.data)) return [];
  return (data.data as any[]).map((item) => item.symbol as string);
}

async function getOpenInterest(symbol: string): Promise<number | null> {
  const data = await bingxGet('/openApi/swap/v2/quote/openInterest', { symbol });
  if (!data || data.code !== 0 || !data.data) return null;
  const resData = data.data;
  if (Array.isArray(resData) && resData.length > 0) {
    const oi = resData[0]?.openInterest;
    return oi != null ? parseFloat(oi) : null;
  } else if (typeof resData === 'object') {
    const oi = resData?.openInterest;
    return oi != null ? parseFloat(oi) : null;
  }
  return null;
}

async function getPremiumIndex(symbol: string): Promise<{ fundingRate: number; markPrice: number } | null> {
  const data = await bingxGet('/openApi/swap/v2/quote/premiumIndex', { symbol });
  if (!data || data.code !== 0 || !data.data) return null;
  const item = Array.isArray(data.data) ? data.data[0] : data.data;
  if (!item) return null;
  const fundingRate = parseFloat(item.lastFundingRate ?? '0');
  const markPrice = parseFloat(item.markPrice ?? '0');
  if (isNaN(fundingRate) || isNaN(markPrice)) return null;
  return { fundingRate, markPrice };
}

function addToHistory(symbol: string, oi: number, price: number): void {
  const ts_ms = Date.now();
  if (!OI_HISTORY.has(symbol)) OI_HISTORY.set(symbol, []);
  const hist = OI_HISTORY.get(symbol)!;
  hist.push({ ts_ms, oi, price });
  if (hist.length > MAX_HISTORY) hist.splice(0, hist.length - MAX_HISTORY);
}

function checkOiFilter(symbol: string, currentOi: number, currentPrice: number) {
  const hist = OI_HISTORY.get(symbol);
  if (!hist || hist.length < 2) return null;
  const now_ms = Date.now();
  const target_ms = now_ms - 3_600_000;
  let bestOld = hist[0];
  for (const entry of hist) {
    if (Math.abs(entry.ts_ms - target_ms) < Math.abs(bestOld.ts_ms - target_ms)) bestOld = entry;
  }
  const old_oi = bestOld.oi;
  const old_price = bestOld.price;
  if (old_oi === 0) return null;
  const oi_change_pct = ((currentOi - old_oi) / old_oi) * 100;
  const price_change_pct = old_price !== 0 ? ((currentPrice - old_price) / old_price) * 100 : 0;
  if (oi_change_pct <= OI_CHANGE_MIN_PCT) return { passes: false, oi_change_pct, price_change_pct, ratio: 0 };
  const ratio = oi_change_pct !== 0 ? Math.abs(price_change_pct / oi_change_pct) : 0;
  return { passes: ratio < PRICE_OI_RATIO_MAX, oi_change_pct, price_change_pct, ratio };
}

async function generateOISignals() {
  const symbols = await getAllTickers();
  if (!symbols.length) return { signals: [], scanned: 0, elapsed_ms: 0 };
  const start = Date.now();
  const BATCH_SIZE = 20;
  const MAX_SYMBOLS = 150;
  const results: any[] = [];
  const symbolsToScan = symbols.slice(0, MAX_SYMBOLS);

  for (let i = 0; i < symbolsToScan.length; i += BATCH_SIZE) {
    const batch = symbolsToScan.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map(async (symbol) => {
        try {
          const [oi, price] = await Promise.all([getOpenInterest(symbol), getPremiumIndex(symbol).then(r => r?.markPrice ?? null)]);
          if (oi == null || price == null) return null;
          if (oi < MIN_OI_VALUE) return null;
          addToHistory(symbol, oi, price);
          const filterResult = checkOiFilter(symbol, oi, price);
          if (!filterResult || !filterResult.passes) return null;
          return {
            symbol,
            period: '1h',
            oi_change_pct: Math.round(filterResult.oi_change_pct * 100) / 100,
            price_change_pct: Math.round(filterResult.price_change_pct * 100) / 100,
            price_oi_ratio: Math.round(filterResult.ratio * 1000) / 1000,
            price_now: price,
            oi_now: oi,
            timestamp: new Date().toISOString(),
          };
        } catch { return null; }
      })
    );
    for (const r of batchResults) {
      if (r.status === 'fulfilled' && r.value) results.push(r.value);
    }
    if (i + BATCH_SIZE < symbolsToScan.length) {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  results.sort((a, b) => b.oi_change_pct - a.oi_change_pct);
  return { signals: results.slice(0, 20), scanned: symbolsToScan.length, elapsed_ms: Date.now() - start };
}

async function generateFundingSignals() {
  const symbols = await getAllTickers();
  if (!symbols.length) return { signals: [], scanned: 0, elapsed_ms: 0 };
  const start = Date.now();
  const BATCH = 25;
  const MAX_SYMBOLS = 300;
  const results: any[] = [];
  const symbolsToScan = symbols.slice(0, MAX_SYMBOLS);

  for (let i = 0; i < symbolsToScan.length; i += BATCH) {
    const batch = symbolsToScan.slice(i, i + BATCH);
    const batchResults = await Promise.allSettled(
      batch.map(async (symbol) => {
        const info = await getPremiumIndex(symbol);
        if (!info) return null;
        const { fundingRate, markPrice } = info;
        if (Math.abs(fundingRate) < FUNDING_THRESHOLD) return null;
        return {
          symbol,
          funding_rate: Math.round(fundingRate * 1000000) / 1000000,
          mark_price: markPrice,
          direction: fundingRate < 0 ? 'LONG' : 'SHORT',
          abs_rate: Math.abs(fundingRate),
          timestamp: new Date().toISOString(),
        };
      })
    );
    for (const r of batchResults) {
      if (r.status === 'fulfilled' && r.value) results.push(r.value);
    }
    if (i + BATCH < symbolsToScan.length) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  results.sort((a, b) => b.abs_rate - a.abs_rate);
  return { signals: results.slice(0, 10), scanned: symbolsToScan.length, elapsed_ms: Date.now() - start };
}

export async function GET(request: Request) {
  // Optional: protect with a secret header to prevent abuse
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');
  const expectedSecret = process.env.CRON_SECRET;
  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[Market/Refresh] Starting signal generation...');
  const supabase = getSupabaseAdmin();

  try {
    // Generate both signal types in parallel
    const [oiResult, fundingResult] = await Promise.all([
      generateOISignals(),
      generateFundingSignals(),
    ]);

    const now = new Date().toISOString();

    // Upsert OI signals into cache
    const { error: oiError } = await supabase
      .from('market_signals_cache')
      .insert({
        signal_type: 'oi',
        signals: oiResult.signals,
        scanned: oiResult.scanned,
        elapsed_ms: oiResult.elapsed_ms,
        generated_at: now,
      });

    if (oiError) {
      console.error('[Market/Refresh] OI cache insert error:', oiError.message);
    }

    // Upsert funding signals into cache
    const { error: fundingError } = await supabase
      .from('market_signals_cache')
      .insert({
        signal_type: 'funding',
        signals: fundingResult.signals,
        scanned: fundingResult.scanned,
        elapsed_ms: fundingResult.elapsed_ms,
        generated_at: now,
      });

    if (fundingError) {
      console.error('[Market/Refresh] Funding cache insert error:', fundingError.message);
    }

    // Clean up old cache entries (keep only last 5 per type)
    const { data: oldOI } = await supabase
      .from('market_signals_cache')
      .select('id, generated_at')
      .eq('signal_type', 'oi')
      .order('generated_at', { ascending: false })
      .range(5, 1000);

    if (oldOI && oldOI.length > 0) {
      await supabase
        .from('market_signals_cache')
        .delete()
        .in('id', oldOI.map((r: any) => r.id));
    }

    const { data: oldFunding } = await supabase
      .from('market_signals_cache')
      .select('id, generated_at')
      .eq('signal_type', 'funding')
      .order('generated_at', { ascending: false })
      .range(5, 1000);

    if (oldFunding && oldFunding.length > 0) {
      await supabase
        .from('market_signals_cache')
        .delete()
        .in('id', oldFunding.map((r: any) => r.id));
    }

    console.log(`[Market/Refresh] Done. OI: ${oiResult.signals.length} signals, Funding: ${fundingResult.signals.length} signals`);

    return NextResponse.json({
      success: true,
      oi: { signals: oiResult.signals.length, scanned: oiResult.scanned, elapsed_ms: oiResult.elapsed_ms },
      funding: { signals: fundingResult.signals.length, scanned: fundingResult.scanned, elapsed_ms: fundingResult.elapsed_ms },
      generated_at: now,
    });
  } catch (err: any) {
    console.error('[Market/Refresh] Fatal error:', err?.message ?? err);
    return NextResponse.json({ error: err?.message ?? 'Unknown error' }, { status: 500 });
  }
}
