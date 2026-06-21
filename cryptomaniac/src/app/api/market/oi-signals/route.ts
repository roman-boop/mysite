import { NextResponse } from 'next/server';

const BINGX_BASE = 'https://open-api.bingx.com';

// ── FundingTrader thresholds (from Python script) ──────────────────────────
const OI_CHANGE_MIN_PCT = 5.0;   // OI must grow > 5% over last hour
const PRICE_OI_RATIO_MAX = 0.7;  // abs(price_change / oi_change) must be < 0.7
const MIN_OI_VALUE = 500_000;    // minimum OI in contracts to filter dust

// ── In-memory OI history: symbol → [{ts_ms, oi, price}] ──────────────────
// Matches Python: self.oi_history: Dict[str, deque] with maxlen=120
const OI_HISTORY: Map<string, Array<{ ts_ms: number; oi: number; price: number }>> = new Map();
const MAX_HISTORY = 120; // ~2 hours at 1-min intervals

// ─── BingX helpers ────────────────────────────────────────────────────────

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
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`[Market/OI] HTTP ${res.status} for ${path} params=${JSON.stringify(params)}: ${body}`);
      return null;
    }
    return res.json();
  } catch (err: any) {
    clearTimeout(timeout);
    if (err?.name === 'AbortError') {
      console.error(`[Market/OI] Timeout for ${path} params=${JSON.stringify(params)}`);
    } else {
      console.error(`[Market/OI] Fetch error for ${path}:`, err?.message ?? err);
    }
    return null;
  }
}

// Matches BingxClient.get_all_tikers
async function getAllTickers(): Promise<string[]> {
  const data = await bingxGet('/openApi/swap/v2/quote/contracts');
  if (!data || data.code !== 0 || !Array.isArray(data.data)) {
    console.error('[Market/OI] getAllTickers failed:', data?.code, data?.msg);
    return [];
  }
  return (data.data as any[]).map((item) => item.symbol as string);
}

// Matches BingxClient.get_open_insterest
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

// Matches BingxClient.get_mark_price via premiumIndex
async function getMarkPrice(symbol: string): Promise<number | null> {
  const data = await bingxGet('/openApi/swap/v2/quote/premiumIndex', { symbol });
  if (!data || data.code !== 0 || !data.data) return null;
  const item = Array.isArray(data.data) ? data.data[0] : data.data;
  if (!item) return null;
  const mp = item.markPrice;
  return mp != null ? parseFloat(mp) : null;
}

// ─── OI history management ────────────────────────────────────────────────

function addToHistory(symbol: string, oi: number, price: number): void {
  const ts_ms = Date.now();
  if (!OI_HISTORY.has(symbol)) {
    OI_HISTORY.set(symbol, []);
  }
  const hist = OI_HISTORY.get(symbol)!;
  hist.push({ ts_ms, oi, price });
  // Keep max 120 entries (matches Python deque maxlen=120)
  if (hist.length > MAX_HISTORY) {
    hist.splice(0, hist.length - MAX_HISTORY);
  }
}

/**
 * Implements FundingTrader.check_oi_filter():
 * - OI growth over last hour > +5%
 * - abs(price_change / oi_change) < 0.7
 */
function checkOiFilter(
  symbol: string,
  currentOi: number,
  currentPrice: number
): { passes: boolean; oi_change_pct: number; price_change_pct: number; ratio: number } | null {
  const hist = OI_HISTORY.get(symbol);
  if (!hist || hist.length < 2) return null;

  const now_ms = Date.now();
  const target_ms = now_ms - 3_600_000; // 1 hour ago

  // Find entry closest to "now - 1 hour" (matches Python logic)
  let bestOld = hist[0];
  for (const entry of hist) {
    if (Math.abs(entry.ts_ms - target_ms) < Math.abs(bestOld.ts_ms - target_ms)) {
      bestOld = entry;
    }
  }

  const old_oi = bestOld.oi;
  const old_price = bestOld.price;

  if (old_oi === 0) return null;

  const oi_change_pct = ((currentOi - old_oi) / old_oi) * 100;
  const price_change_pct = old_price !== 0 ? ((currentPrice - old_price) / old_price) * 100 : 0;

  // Condition 1: OI grew > 5%
  if (oi_change_pct <= OI_CHANGE_MIN_PCT) {
    return { passes: false, oi_change_pct, price_change_pct, ratio: 0 };
  }

  // Condition 2: price/OI ratio < 0.7
  const ratio = oi_change_pct !== 0 ? Math.abs(price_change_pct / oi_change_pct) : 0;
  const passes = ratio < PRICE_OI_RATIO_MAX;

  return { passes, oi_change_pct, price_change_pct, ratio };
}

// ─── Main scan ────────────────────────────────────────────────────────────

async function scanSymbol(symbol: string): Promise<any | null> {
  try {
    // Fetch OI and mark price in parallel (matches Python threading approach)
    const [oi, price] = await Promise.all([getOpenInterest(symbol), getMarkPrice(symbol)]);

    if (oi == null || price == null) return null;
    if (oi < MIN_OI_VALUE) return null;

    // Store snapshot in history
    addToHistory(symbol, oi, price);

    // Check OI filter (needs at least 2 history entries)
    const filterResult = checkOiFilter(symbol, oi, price);
    if (!filterResult || !filterResult.passes) return null;

    console.log(
      `[Market/OI] Anomaly: ${symbol} | OI Δ=${filterResult.oi_change_pct.toFixed(2)}% | Price Δ=${filterResult.price_change_pct.toFixed(2)}% | ratio=${filterResult.ratio.toFixed(3)}`
    );

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
  } catch (err: any) {
    console.error(`[Market/OI] scanSymbol error for ${symbol}:`, err?.message ?? err);
    return null;
  }
}

export async function GET() {
  try {
    console.log('[Market/OI] GET /api/market/oi-signals called');
    const symbols = await getAllTickers();
    if (!symbols.length) {
      console.error('[Market/OI] No symbols from BingX');
      return NextResponse.json({ signals: [], scanned: 0, elapsed_ms: 0, error: 'No symbols from BingX' });
    }

    const start = Date.now();
    const BATCH_SIZE = 20;
    const MAX_SYMBOLS = 150;
    const results: any[] = [];
    const symbolsToScan = symbols.slice(0, MAX_SYMBOLS);

    console.log(`[Market/OI] Scanning ${symbolsToScan.length} symbols in batches of ${BATCH_SIZE}`);

    for (let i = 0; i < symbolsToScan.length; i += BATCH_SIZE) {
      const batch = symbolsToScan.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(batch.map(scanSymbol));
      for (const r of batchResults) {
        if (r.status === 'fulfilled' && r.value) results.push(r.value);
        if (r.status === 'rejected') {
          console.error('[Market/OI] batch promise rejected:', r.reason);
        }
      }
      // Rate limit delay between batches (matches Python's time.sleep(0.15))
      if (i + BATCH_SIZE < symbolsToScan.length) {
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
    }

    // Sort by OI change % descending (largest anomaly first)
    results.sort((a, b) => b.oi_change_pct - a.oi_change_pct);

    const elapsed = Date.now() - start;
    const historySize = OI_HISTORY.size;
    console.log(
      `[Market/OI] Scan done: ${results.length} anomalies in ${elapsed}ms | history: ${historySize} symbols`
    );

    return NextResponse.json({
      signals: results.slice(0, 20),
      scanned: symbolsToScan.length,
      elapsed_ms: elapsed,
      history_symbols: historySize,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[Market/OI] GET handler fatal error:', err?.message ?? err, err?.stack ?? '');
    return NextResponse.json(
      { error: `Internal server error: ${err?.message ?? 'unknown'}` },
      { status: 500 }
    );
  }
}
