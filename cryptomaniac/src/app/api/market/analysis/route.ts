import { NextResponse } from 'next/server';

const BINANCE_FAPI = 'http://YOUR_SERVER_IP:3000/fapi';

const CRYPTO_SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'DOTUSDT',
  'LINKUSDT', 'LTCUSDT', 'TRXUSDT', 'AVAXUSDT', 'DOGEUSDT',
];

const CONFIG = {
  vol_low: 0.01,
  vol_high: 0.05,
  trend_thr: 0.02,
  corr_weight: 0.30,
  adx_period: 14,
  rsi_period: 14,
  fractal_window: 5,
  regression_window: 48,
  lookback_limit: 180,
};

async function fetchOHLCV(symbol: string, interval = '4h', limit = 180) {
  const url = `${BINANCE_BASE}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
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
      console.error(`[Market/Analysis] fetchOHLCV HTTP ${res.status} for ${symbol}: ${await res.text().catch(() => '')}`);
      return null;
    }
    const raw: any[][] = await res.json();
    if (!Array.isArray(raw) || raw.length === 0) {
      console.error(`[Market/Analysis] fetchOHLCV empty response for ${symbol}`);
      return null;
    }
    return raw.map((c) => ({
      open: parseFloat(c[1]),
      high: parseFloat(c[2]),
      low: parseFloat(c[3]),
      close: parseFloat(c[4]),
      volume: parseFloat(c[5]),
    }));
  } catch (err: any) {
    clearTimeout(timeout);
    if (err?.name === 'AbortError') {
      console.error(`[Market/Analysis] fetchOHLCV timeout for ${symbol}`);
    } else {
      console.error(`[Market/Analysis] fetchOHLCV error for ${symbol}:`, err?.message ?? err);
    }
    return null;
  }
}

function calcRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function calcADX(candles: { high: number; low: number; close: number }[], period = 14): number {
  if (candles.length < period * 2) return 20;
  const plusDM: number[] = [];
  const minusDM: number[] = [];
  const tr: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const h = candles[i].high, l = candles[i].low, pc = candles[i - 1].close;
    const ph = candles[i - 1].high, pl = candles[i - 1].low;
    const upMove = h - ph;
    const downMove = pl - l;
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  const slice = (arr: number[]) => arr.slice(-period);
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const trSum = sum(slice(tr)) || 1e-12;
  const plusDI = (sum(slice(plusDM)) / trSum) * 100;
  const minusDI = (sum(slice(minusDM)) / trSum) * 100;
  const dx = (Math.abs(plusDI - minusDI) / (plusDI + minusDI + 1e-12)) * 100;
  return dx;
}

function calcVolRatio(volumes: number[]): number {
  if (volumes.length < 6) return 1;
  const last = volumes[volumes.length - 1];
  const avg = volumes.slice(-7, -1).reduce((a, b) => a + b, 0) / 6;
  return avg > 0 ? last / avg : 1;
}

function calcTrendStrength(closes: number[]): number {
  if (closes.length < 26) return 0;
  const ema = (arr: number[], span: number) => {
    const k = 2 / (span + 1);
    let e = arr[0];
    for (let i = 1; i < arr.length; i++) e = arr[i] * k + e * (1 - k);
    return e;
  };
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  return ema26 !== 0 ? (ema12 - ema26) / ema26 : 0;
}

function calcROC(closes: number[]): number {
  if (closes.length < 7) return 0;
  const prev = closes[closes.length - 7];
  const cur = closes[closes.length - 1];
  return prev !== 0 ? (cur - prev) / prev : 0;
}

function calcATRPct(candles: { high: number; low: number; close: number }[]): number {
  if (candles.length < 15) return 0.02;
  const trs = candles.slice(-15).map((c, i, arr) => {
    if (i === 0) return c.high - c.low;
    const pc = arr[i - 1].close;
    return Math.max(c.high - c.low, Math.abs(c.high - pc), Math.abs(c.low - pc));
  });
  const atr = trs.reduce((a, b) => a + b, 0) / trs.length;
  const lastClose = candles[candles.length - 1].close;
  return lastClose > 0 ? atr / lastClose : 0.02;
}

function calcFractalOverlap(candles: { high: number; low: number }[], window = 5): number {
  if (candles.length < window * 2) return 1;
  const frHighs: number[] = [];
  const frLows: number[] = [];
  for (let i = window; i < candles.length - window; i++) {
    const slice = candles.slice(i - window, i + window + 1);
    const maxH = Math.max(...slice.map((c) => c.high));
    const minL = Math.min(...slice.map((c) => c.low));
    if (candles[i].high === maxH) frHighs.push(candles[i].high);
    if (candles[i].low === minL) frLows.push(candles[i].low);
  }
  if (frHighs.length < 2 || frLows.length < 2) return 1;
  const hRange = Math.max(...frHighs) - Math.min(...frHighs);
  const lRange = Math.max(...frLows) - Math.min(...frLows);
  const maxRange = Math.max(hRange, lRange) + 1e-12;
  return Math.min(1, Math.max(0, Math.min(hRange, lRange) / maxRange));
}

function calcR2(closes: number[], window = 48): number {
  const y = closes.slice(-window);
  if (y.length < 4) return 0;
  const n = y.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const meanX = (n - 1) / 2;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    num += (x[i] - meanX) * (y[i] - meanY);
    denX += (x[i] - meanX) ** 2;
    denY += (y[i] - meanY) ** 2;
  }
  const r = denX > 0 && denY > 0 ? num / Math.sqrt(denX * denY) : 0;
  return r * r;
}

function assetIndicators(candles: { open: number; high: number; low: number; close: number; volume: number }[]) {
  if (!candles || candles.length < 30) return null;
  const closes = candles.map((c) => c.close);
  const volumes = candles.map((c) => c.volume);
  return {
    roc_24h: calcROC(closes),
    atr_pct: calcATRPct(candles),
    trend_strength: calcTrendStrength(closes),
    volume_ratio: calcVolRatio(volumes),
    rsi: calcRSI(closes, CONFIG.rsi_period),
    adx: calcADX(candles, CONFIG.adx_period),
    r2: calcR2(closes, CONFIG.regression_window),
    fractal_overlap: calcFractalOverlap(candles, CONFIG.fractal_window),
  };
}

function aggregate(rows: ReturnType<typeof assetIndicators>[]) {
  const valid = rows.filter(Boolean) as NonNullable<ReturnType<typeof assetIndicators>>[];
  if (valid.length === 0) return null;
  const keys = ['roc_24h', 'atr_pct', 'trend_strength', 'volume_ratio', 'rsi', 'adx', 'r2', 'fractal_overlap'] as const;
  const agg: Record<string, number> = {};
  for (const k of keys) {
    agg[k] = valid.reduce((sum, r) => sum + (r[k] ?? 0), 0) / valid.length;
  }
  return agg;
}

function forecast(ind: Record<string, number>): { upward: number; downward: number; consolidation: number } {
  let up = 1 / 3, down = 1 / 3, cons = 1 / 3;

  const roc = ind.roc_24h ?? 0;
  if (roc > CONFIG.trend_thr) { up += 0.20; down -= 0.10; cons -= 0.10; }
  else if (roc < -CONFIG.trend_thr) { down += 0.20; up -= 0.10; cons -= 0.10; }

  const vol = ind.atr_pct ?? 0;
  if (vol < CONFIG.vol_low) { cons += 0.20; up -= 0.10; down -= 0.10; }
  else if (vol > CONFIG.vol_high) {
    if ((ind.trend_strength ?? 0) > 0) up += 0.15; else down += 0.15;
    cons -= 0.15;
  }

  const adx = ind.adx ?? 0;
  if (adx < 20) cons += 0.15;
  else if (adx > 25) { if ((ind.trend_strength ?? 0) > 0) up += 0.15; else down += 0.15; }

  const rsi = ind.rsi ?? 50;
  if (rsi > 60) up += 0.10;
  else if (rsi < 40) down += 0.10;
  else cons += 0.05;

  const fo = ind.fractal_overlap ?? 1;
  if (fo > 0.7) cons += 0.20;
  else if (fo < 0.3) { if ((ind.trend_strength ?? 0) > 0) up += 0.20; else down += 0.20; }

  const r2 = ind.r2 ?? 0;
  up *= 0.5 + r2;
  down *= 0.5 + r2;

  const vratio = ind.volume_ratio ?? 1;
  if (vratio > 1.5) {
    if ((ind.trend_strength ?? 0) > 0) up += 0.10; else down += 0.10;
    cons -= 0.10;
  }

  const total = up + down + cons;
  if (total > 0) { up /= total; down /= total; cons /= total; }

  return {
    upward: Math.round(up * 1000) / 1000,
    downward: Math.round(down * 1000) / 1000,
    consolidation: Math.round(cons * 1000) / 1000,
  };
}

export async function GET() {
  try {
    console.log('[Market/Analysis] Starting market analysis fetch for', CRYPTO_SYMBOLS.length, 'symbols');

    const results = await Promise.allSettled(
      CRYPTO_SYMBOLS.map((sym) => fetchOHLCV(sym, '4h', CONFIG.lookback_limit))
    );

    const successCount = results.filter((r) => r.status === 'fulfilled' && r.value !== null).length;
    console.log(`[Market/Analysis] Fetched ${successCount}/${CRYPTO_SYMBOLS.length} symbols successfully`);

    if (successCount === 0) {
      console.error('[Market/Analysis] All symbol fetches failed — Binance API may be unreachable from this server');
      return NextResponse.json(
        { error: 'Failed to fetch market data — Binance API unreachable from server' },
        { status: 500 }
      );
    }

    const rows = results.map((r) =>
      r.status === 'fulfilled' && r.value ? assetIndicators(r.value) : null
    );

    const agg = aggregate(rows);
    if (!agg) {
      console.error('[Market/Analysis] aggregate() returned null — insufficient candle data from all symbols');
      return NextResponse.json(
        { error: 'Failed to fetch market data — insufficient candle data' },
        { status: 500 }
      );
    }

    console.log('[Market/Analysis] Aggregated indicators:', JSON.stringify(agg));

    const probs = forecast(agg);
    console.log('[Market/Analysis] Forecast probabilities:', JSON.stringify(probs));

    let condition: string;
    if (probs.upward > 0.5) condition = 'BULLISH';
    else if (probs.downward > 0.5) condition = 'BEARISH';
    else if (probs.consolidation > 0.5) condition = 'CONSOLIDATION';
    else condition = 'NEUTRAL';

    return NextResponse.json({
      probabilities: probs,
      indicators: {
        rsi: Math.round((agg.rsi ?? 0) * 10) / 10,
        adx: Math.round((agg.adx ?? 0) * 10) / 10,
        fractal_overlap: Math.round((agg.fractal_overlap ?? 0) * 100) / 100,
        r2: Math.round((agg.r2 ?? 0) * 1000) / 1000,
        volume_ratio: Math.round((agg.volume_ratio ?? 0) * 100) / 100,
      },
      condition,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[Market/Analysis] GET handler fatal error:', err?.message ?? err, err?.stack ?? '');
    return NextResponse.json({ error: `Internal server error: ${err?.message ?? 'unknown'}` }, { status: 500 });
  }
}
