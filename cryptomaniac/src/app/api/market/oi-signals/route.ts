// app/api/market/oi-signals/route.ts

import { NextResponse } from 'next/server';

const BINGX_BASE = 'https://open-api.bingx.com';

const CONFIG = {
  oi_4h_threshold: 8.0,
  oi_24h_threshold: 12.0,
  price_oi_ratio: 0.4,
  min_oi_usdt: 5_000_000,
  max_symbols: 180,
  batch_size: 15,        // BingX более чувствителен к нагрузке
  request_delay_ms: 80,
};

// ====================== HELPERS ======================

async function bingxGet(endpoint: string, params: Record<string, any> = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)])
  ).toString();

  const url = `${BINGX_BASE}${endpoint}${qs ? '?' + qs : ''}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8500);

    const res = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });

    clearTimeout(timeout);

    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

async function getSymbols(): Promise<string[]> {
  console.log('[Market/OI] Fetching symbols from BingX...');
  
  const data = await bingxGet('/openApi/swap/v2/quote/contracts');
  
  if (!data?.data || !Array.isArray(data.data)) {
    console.error('[Market/OI] Failed to fetch symbols from BingX');
    return [];
  }

  const symbols = data.data
    .filter((s: any) => s.symbol?.endsWith('USDT') && s.status === '1') // 1 = trading
    .map((s: any) => s.symbol);

  console.log(`[Market/OI] Found ${symbols.length} USDT perpetual symbols on BingX`);
  return symbols;
}

function pct(now: number, past: number): number {
  if (past === 0) return 0;
  return ((now - past) / past) * 100;
}

// ====================== CHECK SYMBOL (BingX) ======================

async function checkSymbol(symbol: string) {
  try {
    const [oiRes, klines4h, klines24h] = await Promise.all([
      bingxGet('/openApi/cswap/v1/market/openInterest', { symbol }),
      bingxGet('/openApi/swap/v3/quote/klines', { symbol, interval: '5m', limit: 60 }),
      bingxGet('/openApi/swap/v3/quote/klines', { symbol, interval: '5m', limit: 288 }),
    ]);

    // Current OI
    let oiNow = 0;
    if (oiRes?.data) {
      if (Array.isArray(oiRes.data) && oiRes.data.length > 0) {
        oiNow = parseFloat(oiRes.data[0]?.openInterest || 0);
      } else if (oiRes.data.openInterest) {
        oiNow = parseFloat(oiRes.data.openInterest);
      }
    }

    if (oiNow < CONFIG.min_oi_usdt) return null;
    if (!klines4h?.data?.length || !klines24h?.data?.length) return null;

    const c4 = klines4h.data;
    const c24 = klines24h.data;

    const priceNow = parseFloat(c4[c4.length - 1][4]);
    const price4hAgo = parseFloat(c4[Math.max(0, c4.length - 49)][4]); // ~4 часа назад
    const price24hAgo = parseFloat(c24[0][4]);

    // Volume surge (прокси OI)
    const recentVolumes = c4.slice(-12).map((c: any) => parseFloat(c[5])); // последний час
    const olderVolumes = c24.slice(0, 48).map((c: any) => parseFloat(c[5]));

    const avgRecent = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
    const avgOlder = olderVolumes.reduce((a, b) => a + b, 0) / olderVolumes.length;

    const volumeGrowthPct = avgOlder > 0 ? (avgRecent / avgOlder - 1) * 100 : 0;

    const priceGrowth4h = pct(priceNow, price4hAgo);
    const priceGrowth24h = pct(priceNow, price24hAgo);

    // Сигналы
    const signal4h = volumeGrowthPct >= 120 && priceGrowth4h < volumeGrowthPct * 0.45;
    const signal24h = volumeGrowthPct >= 70 && priceGrowth24h < volumeGrowthPct * 0.5;

    if (!signal4h && !signal24h) return null;

    return {
      symbol,
      period: signal4h ? '4h' : '24h',
      oi_growth_4h: Math.round(volumeGrowthPct * 10) / 10,
      oi_growth_24h: Math.round(volumeGrowthPct * 10) / 10,
      price_growth_4h: Math.round(priceGrowth4h * 10) / 10,
      price_growth_24h: Math.round(priceGrowth24h * 10) / 10,
      price_now: priceNow,
      oi_now: Math.round(oiNow / 1000) * 1000, // округление
      volume_growth: Math.round(volumeGrowthPct * 10) / 10,
    };
  } catch (err: any) {
    console.error(`[Market/OI] checkSymbol ${symbol} error:`, err?.message);
    return null;
  }
}

// ====================== MAIN GET ======================

export async function GET() {
  try {
    console.log('[Market/OI] GET /api/market/oi-signals called');

    const symbols = await getSymbols();
    if (!symbols.length) {
      return NextResponse.json({ 
        signals: [], 
        scanned: 0, 
        elapsed_ms: 0, 
        error: 'No symbols from BingX' 
      });
    }

    const start = Date.now();
    const results: any[] = [];
    const batchSize = CONFIG.batch_size;
    const maxSymbols = Math.min(symbols.length, CONFIG.max_symbols);

    console.log(`[Market/OI] Scanning ${maxSymbols} symbols in batches of ${batchSize}`);

    for (let i = 0; i < maxSymbols; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      
      const batchResults = await Promise.allSettled(batch.map(checkSymbol));

      for (const r of batchResults) {
        if (r.status === 'fulfilled' && r.value) {
          results.push(r.value);
        }
      }

      // Задержка между батчами
      if (i + batchSize < maxSymbols) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.request_delay_ms));
      }
    }

    // Сортировка
    results.sort((a, b) => 
      Math.max(b.oi_growth_4h || 0, b.oi_growth_24h || 0) - 
      Math.max(a.oi_growth_4h || 0, a.oi_growth_24h || 0)
    );

    const elapsed = Date.now() - start;

    console.log(`[Market/OI] Scan complete: ${results.length} signals found in ${elapsed}ms`);

    return NextResponse.json({
      signals: results.slice(0, 15),
      scanned: maxSymbols,
      elapsed_ms: elapsed,
      timestamp: new Date().toISOString(),
    });

  } catch (err: any) {
    console.error('[Market/OI] Fatal error:', err?.message ?? err);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: err?.message 
    }, { status: 500 });
  }
}