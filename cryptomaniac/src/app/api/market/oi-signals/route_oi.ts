import { NextResponse } from 'next/server';

const BINANCE_FAPI = 'http://193.151.239.230/fapi';   // ← твой прокси

const CONFIG = {
  oi_4h_threshold: 8.0,
  oi_24h_threshold: 12.0,
  price_oi_ratio: 0.4,
  min_oi_usdt: 5_000_000,
  max_symbols: 180,
  batch_size: 12,
  request_delay_ms: 40,
};

async function binanceGet(endpoint: string, params: Record<string, string | number> = {}) {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
  const url = `${BINANCE_FAPI}${endpoint}${qs ? '?' + qs : ''}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);

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
      const body = await res.text().catch(() => '');
      console.error(`[Market/OI] HTTP ${res.status} for ${endpoint}: ${body.slice(0, 200)}`);
      return null;
    }

    return res.json();
  } catch (err: any) {
    clearTimeout(timeout);
    console.error(`[Market/OI] Fetch error ${endpoint}:`, err?.message || err);
    return null;
  }
}

async function getSymbols(): Promise<string[]> {
  console.log('[Market/OI] Fetching symbols from Binance...');
  const data = await binanceGet('/fapi/v1/exchangeInfo');
  
  if (!data || !data.symbols) {
    console.error('[Market/OI] getSymbols: No data or symbols field');
    return [];
  }

  const symbols = data.symbols
    .filter((s: any) => s.contractType === 'PERPETUAL' && s.quoteAsset === 'USDT' && s.status === 'TRADING')
    .map((s: any) => s.symbol);

  console.log(`[Market/OI] Found ${symbols.length} USDT perpetual symbols`);
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
  } catch (err: any) {
    console.error(`[Market/OI] checkSymbol ${symbol} error:`, err?.message);
    return null;
  }
}

// ====================== MAIN ROUTE ======================

export async function GET() {
  try {
    const symbols = await getSymbols();
    if (!symbols.length) {
      return NextResponse.json({ 
        signals: [], 
        scanned: 0, 
        error: 'No symbols from Binance' 
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

      // Задержка между батчами для снижения нагрузки
      if (i + batchSize < maxSymbols) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.request_delay_ms));
      }
    }

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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}