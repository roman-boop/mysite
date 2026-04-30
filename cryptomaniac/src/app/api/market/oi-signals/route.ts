import { NextResponse } from 'next/server';

const BINANCE_FAPI = 'https://fapi.binance.com';

const CONFIG = {
  oi_4h_threshold: 8.0,
  oi_24h_threshold: 12.0,
  price_oi_ratio: 0.4,
  min_oi_usdt: 5_000_000,
  max_symbols: 80,        // сильно уменьшили
  batch_size: 8,
};

async function binanceGet(endpoint: string, params: any = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `${BINANCE_FAPI}${endpoint}?${qs}`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(7000),
      headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    // Для OI пока возвращаем заглушку, чтобы не падала вся страница
    return NextResponse.json({
      signals: [],
      scanned: 0,
      message: "OI scanner temporarily disabled due to Binance restrictions",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ error: 'OI service unavailable' }, { status: 503 });
  }
}