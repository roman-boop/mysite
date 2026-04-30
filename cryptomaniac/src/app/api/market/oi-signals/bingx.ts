// types/bingx.ts
export interface BingXContract {
  symbol: string;
  pair: string;
  contractType: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
  pricePrecision: number;
  quantityPrecision: number;
  minQuantity: string;
  maxQuantity: string;
  minPrice: string;
  maxPrice: string;
  tickSize: string;
  minValue: string;
  maxValue: string;
}

export interface BingXOpenInterest {
  symbol: string;
  openInterest: string;
  timestamp: number;
}

export interface BingXTicker {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  lastPrice: string;
  volume: string;
  highPrice: string;
  lowPrice: string;
  openInterest?: string;
  openTime?: number;
}

export interface OISignal {
  symbol: string;
  currentOI: number;
  oiChange24h: number;
  oiChange4h: number;
  currentPrice: number;
  volume24h: number;
  priceChange24h: number;
  signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  signalReason: string;
  timestamp: string;
  oiFormatted?: string;
  volumeFormatted?: string;
}