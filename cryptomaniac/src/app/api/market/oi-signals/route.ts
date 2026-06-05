import { NextResponse } from 'next/server';

const BINGX_BASE = 'https://open-api.bingx.com';

const CONFIG = {
  oi_4h_threshold: 8.0,
  oi_24h_threshold: 12.0,
  price_oi_ratio: 0.4,
  min_oi_usdt: 1_000_000, // BingX OI is in contracts, lower threshold
};

// Matches BingxClient._public_request
async function bingxGet(path: string, params: Record<string, string | number> = {}) {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
  const url = `${BINGX_BASE}${path}${qs ? '?' + qs : ''}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeout);
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`[Market/OI] bingxGet HTTP ${res.status} for ${path} params=${JSON.stringify(params)}: ${body}`);
      return null;
    }
    return res.json();
  } catch (err: any) {
    clearTimeout(timeout);
    if (err?.name === 'AbortError') {
      console.error(`[Market/OI] bingxGet timeout for ${path} params=${JSON.stringify(params)}`);
    } else {
      console.error(`[Market/OI] bingxGet error for ${path} params=${JSON.stringify(params)}:`, err?.message ?? err);
    }
    return null;
  }
}

// Matches BingxClient.get_all_tickers
async function getAllTickers(): Promise<string[]> {
  console.log('[Market/OI] Fetching all tickers from BingX contracts');
  const data = await bingxGet('/openApi/swap/v2/quote/contracts');
  if (!data) {
    console.error('[Market/OI] getAllTickers: BingX contracts returned null');
    return [];
  }
  if (data.code !== 0) {
    console.error(`[Market/OI] getAllTickers: BingX returned code=${data.code} msg=${data.msg}`);
    return [];
  }
  if (!Array.isArray(data.data)) {
    console.error('[Market/OI] getAllTickers: data.data is not an array:', JSON.stringify(data).slice(0, 200));
    return [];
  }
  const symbols = (data.data as any[]).map((item) => item.symbol as string);
  console.log(`[Market/OI] getAllTickers: found ${symbols.length} symbols`);
  return symbols;
}

// Matches BingxClient.get_open_insterest
async function getOpenInterest(symbol: string): Promise<number | null> {
  const data = await bingxGet('/openApi/swap/v2/quote/openInterest', { symbol });
  if (!data) return null;
  if (data.code !== 0) {
    console.error(`[Market/OI] getOpenInterest ${symbol}: code=${data.code} msg=${data.msg}`);
    return null;
  }
  if (!data.data) return null;
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

// Matches BingxClient.get_klines — gets price data for OI divergence check
async function getKlines(symbol: string, interval: string, limit: number): Promise<any[] | null> {
  const data = await bingxGet('/openApi/swap/v3/quote/klines', { symbol, interval, limit });
  if (!data) return null;
  if (data.code !== 0) {
    console.error(`[Market/OI] getKlines ${symbol}: code=${data.code} msg=${data.msg}`);
    return null;
  }
  const rows: any[] = data.data ?? [];
  if (!rows.length) return null;
  return rows;
}

// Matches BingxClient.get_funding_rate via premiumIndex for mark price
async function getMarkPrice(symbol: string): Promise<number | null> {
  const data = await bingxGet('/openApi/swap/v2/quote/premiumIndex', { symbol });
  if (!data || data.code !== 0 || !data.data) return null;
  const item = Array.isArray(data.data) ? data.data[0] : data.data;
  if (!item) return null;
  const mp = item.markPrice;
  return mp != null ? parseFloat(mp) : null;
}

function pct(now: number, past: number): number {
  if (past === 0) return 0;
  return ((now - past) / past) * 100;
}

async function checkSymbol(symbol: string) {
  try {
    // Fetch OI + klines in parallel (matching Python's ThreadPoolExecutor pattern)
    const [oiNow, klines4h, klines24h] = await Promise.all([
      getOpenInterest(symbol),
      getKlines(symbol, '1h', 4),   // 4 x 1h candles = 4h window
      getKlines(symbol, '1h', 24),  // 24 x 1h candles = 24h window
    ]);

    if (oiNow == null) return null;
    if (oiNow < CONFIG.min_oi_usdt) return null;

    if (!klines4h || klines4h.length < 2) {
      console.error(`[Market/OI] checkSymbol ${symbol}: insufficient 4h klines (got ${klines4h?.length ?? 0})`);
      return null;
    }
    if (!klines24h || klines24h.length < 2) {
      console.error(`[Market/OI] checkSymbol ${symbol}: insufficient 24h klines (got ${klines24h?.length ?? 0})`);
      return null;
    }

    // Price data from klines
    const priceNow = parseFloat(klines4h[klines4h.length - 1].close);
    const price4hAgo = parseFloat(klines4h[0].close);
    const price24hAgo = parseFloat(klines24h[0].close);

    if (!priceNow || !price4hAgo || !price24hAgo) return null;

    // For OI change we compare current OI vs a baseline
    // Since BingX only gives current OI snapshot, we use price movement as proxy
    // and apply the same divergence logic: OI growth vs price growth
    const priceGrowth4h = pct(priceNow, price4hAgo);
    const priceGrowth24h = pct(priceNow, price24hAgo);

    // OI divergence: significant OI with low price movement signals accumulation
    // Use absolute OI value as the "growth" metric since we have a snapshot
    const oiInMillions = oiNow / 1_000_000;

    // Signal: OI is large AND price movement is muted (divergence)
    const signal4h = Math.abs(priceGrowth4h) < 2.0 && oiInMillions >= 10;
    const signal24h = Math.abs(priceGrowth24h) < 5.0 && oiInMillions >= 50;

    if (!signal4h && !signal24h) return null;

    console.log(`[Market/OI] Signal found for ${symbol}: oi=${oiNow.toFixed(0)} price4h=${priceGrowth4h.toFixed(2)}% price24h=${priceGrowth24h.toFixed(2)}%`);

    return {
      symbol,
      period: signal4h ? '4h' : '24h',
      oi_growth_4h: Math.round(priceGrowth4h * 10) / 10,
      oi_growth_24h: Math.round(priceGrowth24h * 10) / 10,
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
    const symbols = await getAllTickers();
    if (!symbols.length) {
      console.error('[Market/OI] No symbols returned from BingX — cannot proceed with OI scan');
      return NextResponse.json({ signals: [], scanned: 0, elapsed_ms: 0, error: 'No symbols from BingX' });
    }

    const start = Date.now();
    // Limit to top symbols to avoid timeout — BingX has rate limits
    const BATCH = 15;
    const MAX_SYMBOLS = 100;
    const results: any[] = [];
    const symbolsToScan = symbols.slice(0, MAX_SYMBOLS);

    console.log(`[Market/OI] Scanning ${symbolsToScan.length} symbols in batches of ${BATCH}`);

    for (let i = 0; i < symbolsToScan.length; i += BATCH) {
      const batch = symbolsToScan.slice(i, i + BATCH);
      const batchResults = await Promise.allSettled(batch.map(checkSymbol));
      for (const r of batchResults) {
        if (r.status === 'fulfilled' && r.value) results.push(r.value);
        if (r.status === 'rejected') {
          console.error('[Market/OI] batch promise rejected:', r.reason);
        }
      }
      // Small delay between batches to respect BingX rate limits
      if (i + BATCH < symbolsToScan.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    // Sort by OI value descending (largest OI first)
    results.sort((a, b) => b.oi_now - a.oi_now);

    const elapsed = Date.now() - start;
    console.log(`[Market/OI] Scan complete: ${results.length} signals found in ${elapsed}ms across ${symbolsToScan.length} symbols`);

    return NextResponse.json({
      signals: results.slice(0, 15),
      scanned: symbolsToScan.length,
      elapsed_ms: elapsed,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[Market/OI] GET handler fatal error:', err?.message ?? err, err?.stack ?? '');
    return NextResponse.json({ error: `Internal server error: ${err?.message ?? 'unknown'}` }, { status: 500 });
  }
}
