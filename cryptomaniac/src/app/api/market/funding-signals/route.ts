import { NextResponse } from 'next/server';

const BINGX_BASE = 'https://open-api.bingx.com';
const FUNDING_THRESHOLD = 0.001; // 0.1% — matches Python CONFIG["funding_threshold"]

// Matches BingxClient._public_request
async function bingxGet(path: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `${BINGX_BASE}${path}${qs ? '?' + qs : ''}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
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

// Matches BingxClient.get_all_tickers
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
  const symbols = (data.data as any[]).map((item) => item.symbol as string);
  console.log(`[Market/Funding] getAllTickers: found ${symbols.length} symbols`);
  return symbols;
}

// Matches BingxClient.get_funding_rate + get_mark_price via premiumIndex
// Fetches both funding rate and mark price in one call (matches get_premium_index)
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
  const fundingRate = parseFloat(item.lastFundingRate ?? '0');
  const markPrice = parseFloat(item.markPrice ?? '0');
  if (isNaN(fundingRate) || isNaN(markPrice)) {
    console.error(`[Market/Funding] getPremiumIndex ${symbol}: invalid values lastFundingRate=${item.lastFundingRate} markPrice=${item.markPrice}`);
    return null;
  }
  return { fundingRate, markPrice };
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
    const BATCH = 25; // Matches Python batch_size pattern
    const MAX_SYMBOLS = 300;
    const results: any[] = [];
    const symbolsToScan = symbols.slice(0, MAX_SYMBOLS);

    console.log(`[Market/Funding] Scanning ${symbolsToScan.length} symbols in batches of ${BATCH}`);

    for (let i = 0; i < symbolsToScan.length; i += BATCH) {
      const batch = symbolsToScan.slice(i, i + BATCH);
      const batchResults = await Promise.allSettled(
        batch.map(async (symbol) => {
          const info = await getPremiumIndex(symbol);
          if (!info) return null;
          const { fundingRate, markPrice } = info;
          // Matches Python: if abs(rate) < CONFIG["funding_threshold"]: return None
          if (Math.abs(fundingRate) < FUNDING_THRESHOLD) return null;
          // Matches Python: direction = "LONG" if rate < 0 else "SHORT"
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
      // Delay between batches — matches Python time.sleep(1.0) pattern
      if (i + BATCH < symbolsToScan.length) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    // Sort by abs_rate descending — matches Python results.sort(key=lambda x: x['abs_rate'], reverse=True)
    results.sort((a, b) => b.abs_rate - a.abs_rate);

    const elapsed = Date.now() - start;
    console.log(`[Market/Funding] Scan complete: ${results.length} signals found in ${elapsed}ms`);

    return NextResponse.json({
      // Top 10 — matches Python top_results = results[:30] but we show 10 in UI
      signals: results.slice(0, 10),
      scanned: symbolsToScan.length,
      elapsed_ms: elapsed,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[Market/Funding] GET handler fatal error:', err?.message ?? err, err?.stack ?? '');
    return NextResponse.json({ error: `Internal server error: ${err?.message ?? 'unknown'}` }, { status: 500 });
  }
}
