import { NextResponse } from 'next/server';

const BINANCE_FAPI = 'https://fapi.binance.com';

const CONFIG = {
  oi_4h_threshold: 8.0,
  oi_24h_threshold: 12.0,
  price_oi_ratio: 0.4,
  min_oi_usdt: 5_000_000,
};

async function binanceGet(endpoint: string, params: Record<string, string | number> = {}) {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
  const url = `${BINANCE_FAPI}${endpoint}${qs ? '?' + qs : ''}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeout);
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`[Market/OI] binanceGet HTTP ${res.status} for ${endpoint} params=${JSON.stringify(params)}: ${body}`);
      return null;
    }
    return res.json();
  } catch (err: any) {
    clearTimeout(timeout);
    if (err?.name === 'AbortError') {
      console.error(`[Market/OI] binanceGet timeout for ${endpoint} params=${JSON.stringify(params)}`);
    } else {
      console.error(`[Market/OI] binanceGet error for ${endpoint} params=${JSON.stringify(params)}:`, err?.message ?? err);
    }
    return null;
  }
}

async function getSymbols(): Promise<string[]> {
  console.log('[Market/OI] Fetching symbols from Binance FAPI exchangeInfo');
  const data = await binanceGet('/fapi/v1/exchangeInfo');
  if (!data) {
    console.error('[Market/OI] getSymbols: exchangeInfo returned null');
    return [];
  }
  if (!data.symbols) {
    console.error('[Market/OI] getSymbols: exchangeInfo response missing symbols field:', JSON.stringify(data).slice(0, 200));
    return [];
  }
  const symbols = data.symbols
    .filter((s: any) => s.contractType === 'PERPETUAL' && s.quoteAsset === 'USDT' && s.status === 'TRADING')
    .map((s: any) => s.symbol);
  console.log(`[Market/OI] getSymbols: found ${symbols.length} USDT perpetual symbols`);
  return symbols;
}

function pct(now: number, past: number): number {
  if (past === 0) return 0;
  return ((now - past) / past) * 100;
}

async function checkSymbol(symbol: string) {
  try {
    const [oi4h, oi24h, klines4h, klines24h] = await Promise.all([
      binanceGet('/futures/data/openInterestHist', { symbol, period: '5m', limit: 48 }),
      binanceGet('/futures/data/openInterestHist', { symbol, period: '5m', limit: 288 }),
      binanceGet('/fapi/v1/klines', { symbol, interval: '5m', limit: 48 }),
      binanceGet('/fapi/v1/klines', { symbol, interval: '5m', limit: 288 }),
    ]);

    if (!oi4h || !Array.isArray(oi4h) || oi4h.length === 0) {
      console.error(`[Market/OI] checkSymbol ${symbol}: oi4h data missing or empty`);
      return null;
    }
    if (!oi24h || !Array.isArray(oi24h) || oi24h.length < 288) {
      console.error(`[Market/OI] checkSymbol ${symbol}: oi24h insufficient data (got ${oi24h?.length ?? 0}, need 288)`);
      return null;
    }
    if (!klines4h || !Array.isArray(klines4h) || klines4h.length === 0) {
      console.error(`[Market/OI] checkSymbol ${symbol}: klines4h data missing`);
      return null;
    }
    if (!klines24h || !Array.isArray(klines24h) || klines24h.length === 0) {
      console.error(`[Market/OI] checkSymbol ${symbol}: klines24h data missing`);
      return null;
    }

    const oiNow = parseFloat(oi4h[oi4h.length - 1].sumOpenInterestValue);
    const oi4hAgo = parseFloat(oi4h[0].sumOpenInterestValue);
    const oi24hAgo = parseFloat(oi24h[0].sumOpenInterestValue);

    if (oiNow < CONFIG.min_oi_usdt) return null;

    const oiGrowth4h = pct(oiNow, oi4hAgo);
    const oiGrowth24h = pct(oiNow, oi24hAgo);

    const priceNow = parseFloat(klines4h[klines4h.length - 1][4]);
    const price4hAgo = parseFloat(klines4h[0][4]);
    const price24hAgo = parseFloat(klines24h[0][4]);

    const priceGrowth4h = pct(priceNow, price4hAgo);
    const priceGrowth24h = pct(priceNow, price24hAgo);

    const signal4h =
      oiGrowth4h >= CONFIG.oi_4h_threshold &&
      priceGrowth4h <= oiGrowth4h * CONFIG.price_oi_ratio;

    const signal24h =
      oiGrowth24h >= CONFIG.oi_24h_threshold &&
      priceGrowth24h <= oiGrowth24h * CONFIG.price_oi_ratio;

    if (!signal4h && !signal24h) return null;

    console.log(`[Market/OI] Signal found for ${symbol}: period=${signal4h ? '4h' : '24h'} oi4h=${oiGrowth4h.toFixed(2)}% oi24h=${oiGrowth24h.toFixed(2)}%`);

    return {
      symbol,
      period: signal4h ? '4h' : '24h',
      oi_growth_4h: Math.round(oiGrowth4h * 10) / 10,
      oi_growth_24h: Math.round(oiGrowth24h * 10) / 10,
      price_growth_4h: Math.round(priceGrowth4h * 10) / 10,
      price_growth_24h: Math.round(priceGrowth24h * 10) / 10,
      price_now: priceNow,
      oi_now: oiNow,
    };
  } catch (err: any) {
    console.error(`[Market/OI] checkSymbol fatal error for ${symbol}:`, err?.message ?? err);
    return null;
  }
}

export async function GET() {
  try {
    console.log('[Market/OI] GET /api/market/oi-signals called');
    const symbols = await getSymbols();
    if (!symbols.length) {
      console.error('[Market/OI] No symbols returned — cannot proceed with OI scan');
      return NextResponse.json({ signals: [], scanned: 0, elapsed_ms: 0, error: 'No symbols from Binance FAPI' });
    }

    const start = Date.now();
    const BATCH = 20;
    const MAX_SYMBOLS = 200;
    const results: any[] = [];

    console.log(`[Market/OI] Scanning ${Math.min(symbols.length, MAX_SYMBOLS)} symbols in batches of ${BATCH}`);

    for (let i = 0; i < Math.min(symbols.length, MAX_SYMBOLS); i += BATCH) {
      const batch = symbols.slice(i, i + BATCH);
      const batchResults = await Promise.allSettled(batch.map(checkSymbol));
      for (const r of batchResults) {
        if (r.status === 'fulfilled' && r.value) results.push(r.value);
        if (r.status === 'rejected') {
          console.error('[Market/OI] batch promise rejected:', r.reason);
        }
      }
    }

    results.sort((a, b) => Math.max(b.oi_growth_4h, b.oi_growth_24h) - Math.max(a.oi_growth_4h, a.oi_growth_24h));

    const elapsed = Date.now() - start;
    console.log(`[Market/OI] Scan complete: ${results.length} signals found in ${elapsed}ms across ${Math.min(symbols.length, MAX_SYMBOLS)} symbols`);

    return NextResponse.json({
      signals: results.slice(0, 15),
      scanned: Math.min(symbols.length, MAX_SYMBOLS),
      elapsed_ms: elapsed,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[Market/OI] GET handler fatal error:', err?.message ?? err, err?.stack ?? '');
    return NextResponse.json({ error: `Internal server error: ${err?.message ?? 'unknown'}` }, { status: 500 });
  }
}
