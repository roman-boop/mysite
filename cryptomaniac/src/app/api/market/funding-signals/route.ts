import { NextResponse } from 'next/server';

const BINGX_BASE = 'https://open-api.bingx.com';
const FUNDING_THRESHOLD = 0.001;

async function getAllTickers(): Promise<string[]> {
  try {
    const res = await fetch(`${BINGX_BASE}/openApi/swap/v2/quote/contracts`, {
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (data?.code === 0) {
      return (data.data || []).map((item: any) => item.symbol as string);
    }
    console.error('[Market/Funding] getAllTickers: unexpected response code', data?.code, data?.msg);
    return [];
  } catch (err) {
    console.error('[Market/Funding] getAllTickers error:', err);
    return [];
  }
}

async function getPremiumIndex(symbol: string): Promise<{ fundingRate: number; markPrice: number } | null> {
  try {
    const res = await fetch(
      `${BINGX_BASE}/openApi/swap/v2/quote/premiumIndex?symbol=${encodeURIComponent(symbol)}`,
      { next: { revalidate: 0 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.code !== 0 || !data?.data) return null;
    const item = Array.isArray(data.data) ? data.data[0] : data.data;
    if (!item) return null;
    return {
      fundingRate: parseFloat(item.lastFundingRate ?? '0'),
      markPrice: parseFloat(item.markPrice ?? '0'),
    };
  } catch (err) {
    console.error(`[Market/Funding] getPremiumIndex error for ${symbol}:`, err);
    return null;
  }
}

export async function GET() {
  try {
    const symbols = await getAllTickers();
    if (!symbols.length) {
      console.error('[Market/Funding] No tickers returned from BingX');
      return NextResponse.json({ signals: [], scanned: 0, elapsed_ms: 0 });
    }

    const start = Date.now();

    // Process in batches of 30
    const BATCH = 30;
    const results: any[] = [];

    for (let i = 0; i < Math.min(symbols.length, 300); i += BATCH) {
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
      }
    }

    results.sort((a, b) => b.abs_rate - a.abs_rate);

    return NextResponse.json({
      signals: results.slice(0, 10),
      scanned: Math.min(symbols.length, 300),
      elapsed_ms: Date.now() - start,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Funding signals error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
