import { NextResponse } from 'next/server';

const BINGX_BASE = 'https://open-api.bingx.com';
const FUNDING_THRESHOLD = 0.001;

async function bingxGet(path: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `${BINGX_BASE}${path}${qs ? '?' + qs : ''}`;
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
      console.error(`[Market/Funding] bingxGet HTTP ${res.status} for ${path}: ${body}`);
      return null;
    }
    return res.json();
  } catch (err: any) {
    clearTimeout(timeout);
    if (err?.name === 'AbortError') {
      console.error(`[Market/Funding] bingxGet timeout for ${path}`);
    } else {
      console.error(`[Market/Funding] bingxGet error for ${path}:`, err?.message ?? err);
    }
    return null;
  }
}

async function getAllTickers(): Promise<string[]> {
  console.log('[Market/Funding] Fetching all tickers from BingX');
  const data = await bingxGet('/openApi/swap/v2/quote/contracts');
  if (!data) {
    console.error('[Market/Funding] getAllTickers: BingX contracts returned null');
    return [];
  }
  if (data.code !== 0) {
    console.error(`[Market/Funding] getAllTickers: BingX returned code=${data.code} msg=${data.msg}`);
    return [];
  }
  if (!Array.isArray(data.data)) {
    console.error('[Market/Funding] getAllTickers: data.data is not an array:', JSON.stringify(data).slice(0, 200));
    return [];
  }
  const symbols = data.data.map((item: any) => item.symbol as string);
  console.log(`[Market/Funding] getAllTickers: found ${symbols.length} symbols`);
  return symbols;
}

async function getPremiumIndex(symbol: string): Promise<{ fundingRate: number; markPrice: number } | null> {
  const data = await bingxGet('/openApi/swap/v2/quote/premiumIndex', { symbol });
  if (!data) return null;
  if (data.code !== 0) {
    console.error(`[Market/Funding] getPremiumIndex ${symbol}: code=${data.code} msg=${data.msg}`);
    return null;
  }
  if (!data.data) {
    console.error(`[Market/Funding] getPremiumIndex ${symbol}: missing data field`);
    return null;
  }
  const item = Array.isArray(data.data) ? data.data[0] : data.data;
  if (!item) {
    console.error(`[Market/Funding] getPremiumIndex ${symbol}: empty item`);
    return null;
  }
  return {
    fundingRate: parseFloat(item.lastFundingRate ?? '0'),
    markPrice: parseFloat(item.markPrice ?? '0'),
  };
}

export async function GET() {
  try {
    console.log('[Market/Funding] GET /api/market/funding-signals called');
    const symbols = await getAllTickers();
    if (!symbols.length) {
      console.error('[Market/Funding] No tickers returned from BingX — cannot proceed');
      return NextResponse.json({ signals: [], scanned: 0, elapsed_ms: 0, error: 'No tickers from BingX' });
    }

    const start = Date.now();
    const BATCH = 30;
    const MAX_SYMBOLS = 300;
    const results: any[] = [];

    console.log(`[Market/Funding] Scanning ${Math.min(symbols.length, MAX_SYMBOLS)} symbols in batches of ${BATCH}`);

    for (let i = 0; i < Math.min(symbols.length, MAX_SYMBOLS); i += BATCH) {
      const batch = symbols.slice(i, i + BATCH);
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
          };
        })
      );
      for (const r of batchResults) {
        if (r.status === 'fulfilled' && r.value) results.push(r.value);
        if (r.status === 'rejected') {
          console.error('[Market/Funding] batch promise rejected:', r.reason);
        }
      }
    }

    results.sort((a, b) => b.abs_rate - a.abs_rate);

    const elapsed = Date.now() - start;
    console.log(`[Market/Funding] Scan complete: ${results.length} signals found in ${elapsed}ms`);

    return NextResponse.json({
      signals: results.slice(0, 10),
      scanned: Math.min(symbols.length, MAX_SYMBOLS),
      elapsed_ms: elapsed,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[Market/Funding] GET handler fatal error:', err?.message ?? err, err?.stack ?? '');
    return NextResponse.json({ error: `Internal server error: ${err?.message ?? 'unknown'}` }, { status: 500 });
  }
}
