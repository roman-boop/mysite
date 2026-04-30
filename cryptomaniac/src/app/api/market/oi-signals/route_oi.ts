import { NextResponse } from 'next/server';

const BINANCE_FAPI = 'https://fapi.binance.com'; // ← прямой публичный эндпоинт

const CONFIG = {
  oi_4h_threshold: 8.0,
  oi_24h_threshold: 12.0,
  price_oi_ratio: 0.4,
  min_oi_usdt: 5_000_000,
  max_symbols: 180,        // уменьшил, чтобы не таймаутить
  batch_size: 15,          // меньше параллельности
  request_delay_ms: 30,    // защита от rate limit
};

async function binanceGet(endpoint: string, params: Record<string, any> = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)])
  ).toString();

  const url = `${BINANCE_FAPI}${endpoint}${qs ? '?' + qs : ''}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
      headers: { 
        'Accept': 'application/json',
        'User-Agent': 'CryptoManiac-MarketMonitor/1.0' 
      },
    });

    clearTimeout(timeout);

    if (!res.ok) {
      if (res.status === 451) {
        console.error(`[Market/OI] Binance 451 Restricted Access — IP blocked`);
      }
      const body = await res.text().catch(() => '');
      console.error(`[Market/OI] HTTP ${res.status} ${endpoint}: ${body.slice(0, 300)}`);
      return null;
    }

    return await res.json();
  } catch (err: any) {
    clearTimeout(timeout);
    console.error(`[Market/OI] Fetch error ${endpoint}:`, err?.message || err);
    return null;
  }
}

async function getSymbols(): Promise<string[]> {
  const data = await binanceGet('/fapi/v1/exchangeInfo');
  if (!data?.symbols) return [];

  return data.symbols
    .filter((s: any) => 
      s.contractType === 'PERPETUAL' && 
      s.quoteAsset === 'USDT' && 
      s.status === 'TRADING'
    )
    .map((s: any) => s.symbol);
}

function pct(now: number, past: number): number {
  return past === 0 ? 0 : ((now - past) / past) * 100;
}

async function checkSymbol(symbol: string) {
  try {
    const [oi4h, oi24h, klines4h, klines24h] = await Promise.all([
      binanceGet('/futures/data/openInterestHist', { symbol, period: '5m', limit: 48 }),
      binanceGet('/futures/data/openInterestHist', { symbol, period: '5m', limit: 288 }),
      binanceGet('/fapi/v1/klines', { symbol, interval: '5m', limit: 48 }),
      binanceGet('/fapi/v1/klines', { symbol, interval: '5m', limit: 288 }),
    ]);

    if (!oi4h?.length || !oi24h?.length || !klines4h?.length || !klines24h?.length) {
      return null;
    }

    const oiNow = parseFloat(oi4h[oi4h.length - 1].sumOpenInterestValue);
    if (oiNow < CONFIG.min_oi_usdt) return null;

    const oi4hAgo = parseFloat(oi4h[0].sumOpenInterestValue);
    const oi24hAgo = parseFloat(oi24h[0].sumOpenInterestValue);

    const priceNow = parseFloat(klines4h[klines4h.length - 1][4]);
    const price4hAgo = parseFloat(klines4h[0][4]);
    const price24hAgo = parseFloat(klines24h[0][4]);

    const oiGrowth4h = pct(oiNow, oi4hAgo);
    const oiGrowth24h = pct(oiNow, oi24hAgo);
    const priceGrowth4h = pct(priceNow, price4hAgo);
    const priceGrowth24h = pct(priceNow, price24hAgo);

    const signal4h = oiGrowth4h >= CONFIG.oi_4h_threshold && priceGrowth4h <= oiGrowth4h * CONFIG.price_oi_ratio;
    const signal24h = oiGrowth24h >= CONFIG.oi_24h_threshold && priceGrowth24h <= oiGrowth24h * CONFIG.price_oi_ratio;

    if (!signal4h && !signal24h) return null;

    return {
      symbol,
      period: signal4h ? '4h' : '24h',
      oi_growth_4h: Math.round(oiGrowth4h * 10) / 10,
      oi_growth_24h: Math.round(oiGrowth24h * 10) / 10,
      price_growth_4h: Math.round(priceGrowth4h * 10) / 10,
      price_growth_24h: Math.round(priceGrowth24h * 10) / 10,
      price_now: priceNow,
      oi_now: Math.round(oiNow),
    };
  } catch (err) {
    console.error(`[Market/OI] checkSymbol ${symbol} error:`, err);
    return null;
  }
}

export async function GET() {
  try {
    const symbols = await getSymbols();
    if (!symbols.length) {
      return NextResponse.json({ signals: [], error: 'No symbols' }, { status: 503 });
    }

    const start = Date.now();
    const results: any[] = [];
    const batchSize = CONFIG.batch_size;
    const maxSymbols = Math.min(symbols.length, CONFIG.max_symbols);

    for (let i = 0; i < maxSymbols; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      
      const batchResults = await Promise.allSettled(
        batch.map(s => checkSymbol(s))
      );

      for (const r of batchResults) {
        if (r.status === 'fulfilled' && r.value) results.push(r.value);
      }

      // Небольшая задержка между батчами
      if (i + batchSize < maxSymbols) {
        await new Promise(res => setTimeout(res, CONFIG.request_delay_ms));
      }
    }

    results.sort((a, b) => 
      Math.max(b.oi_growth_4h, b.oi_growth_24h) - Math.max(a.oi_growth_4h, a.oi_growth_24h)
    );

    return NextResponse.json({
      signals: results.slice(0, 15),
      scanned: maxSymbols,
      elapsed_ms: Date.now() - start,
      timestamp: new Date().toISOString(),
    });

  } catch (err: any) {
    console.error('[Market/OI] Fatal:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}