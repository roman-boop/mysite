// app/api/oi/route.ts
import { NextResponse } from 'next/server';

const BINGX_FAPI = 'https://open-api.bingx.com';

const CONFIG = {
  oi_4h_threshold: 8.0,
  oi_24h_threshold: 12.0,
  price_oi_ratio: 0.4,
  min_oi_usdt: 5_000_000,
  max_symbols: 80,
  batch_size: 8,
};

// Кэширование
let oiCache: {
  data: any;
  timestamp: number;
} | null = null;
const CACHE_TTL = 60 * 1000;

async function bingxGet(endpoint: string, params: any = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `${BINGX_FAPI}${endpoint}${qs ? `?${qs}` : ''}`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { 
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      console.error(`BingX API error: ${res.status} ${res.statusText}`);
      return null;
    }
    
    const data = await res.json();
    
    if (data.code !== 0) {
      console.error(`BingX API error code: ${data.code}, msg: ${data.msg}`);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error(`BingX request failed for ${endpoint}:`, error);
    return null;
  }
}

async function getAllSymbols() {
  const data = await bingxGet('/openApi/swap/v2/quote/contracts');
  
  if (!data || !data.data) {
    console.error('Failed to fetch symbols from BingX');
    return [];
  }
  
  const symbols = data.data
    .filter((contract: any) => contract.symbol.endsWith('USDT'))
    .map((contract: any) => contract.symbol);
  
  console.log(`Fetched ${symbols.length} USDT symbols from BingX`);
  return symbols;
}

async function getOpenInterest(symbol: string) {
  const data = await bingxGet('/openApi/swap/v2/quote/openInterest', { symbol });
  
  if (!data || !data.data) {
    return null;
  }
  
  return {
    symbol: symbol,
    openInterest: parseFloat(data.data.openInterest || '0'),
    timestamp: data.data.timestamp || Date.now(),
  };
}

async function calculateOISignals() {
  const symbols = await getAllSymbols();
  
  if (!symbols.length) {
    throw new Error('No symbols fetched from BingX');
  }
  
  const symbolsToProcess = symbols.slice(0, CONFIG.max_symbols);
  const signals = [];
  
  console.log(`Processing ${symbolsToProcess.length} symbols...`);
  
  for (let i = 0; i < symbolsToProcess.length; i += CONFIG.batch_size) {
    const batch = symbolsToProcess.slice(i, i + CONFIG.batch_size);
    
    const batchPromises = batch.map(async (symbol) => {
      try {
        // Получаем OI
        let oiData = await getOpenInterest(symbol);
        
        if (!oiData || oiData.openInterest === 0 || oiData.openInterest < CONFIG.min_oi_usdt) {
          return null;
        }
        
        // Получаем ticker данные
        const tickerData = await bingxGet('/openApi/swap/v2/quote/ticker', { symbol });
        
        if (!tickerData || !tickerData.data) {
          return null;
        }
        
        const ticker = tickerData.data;
        
        // Безопасное преобразование с значениями по умолчанию
        const currentPrice = parseFloat(ticker.lastPrice || '0');
        const volume24h = parseFloat(ticker.volume || '0');
        const priceChange24h = parseFloat(ticker.priceChangePercent || '0');
        const highPrice = parseFloat(ticker.highPrice || currentPrice);
        const lowPrice = parseFloat(ticker.lowPrice || currentPrice);
        
        // Пропускаем, если нет цены
        if (currentPrice === 0) {
          return null;
        }
        
        // Расчет сигналов
        let signal = 'NEUTRAL';
        let signalReason = '';
        let score = 0;
        
        // Используем volume как индикатор активности
        const volumeStrength = volume24h / CONFIG.min_oi_usdt;
        const isVolumeSpike = volumeStrength > 5;
        
        if (isVolumeSpike && Math.abs(priceChange24h) > 5) {
          if (priceChange24h > 0) {
            signal = 'BULLISH';
            signalReason = `High volume + price up ${priceChange24h.toFixed(1)}%`;
            score = 85;
          } else {
            signal = 'BEARISH';
            signalReason = `High volume + price down ${Math.abs(priceChange24h).toFixed(1)}%`;
            score = 85;
          }
        } else if (Math.abs(priceChange24h) > 10) {
          signal = priceChange24h > 0 ? 'BULLISH' : 'BEARISH';
          signalReason = `Strong price movement: ${priceChange24h.toFixed(1)}%`;
          score = 70;
        } else if (oiData.openInterest > CONFIG.min_oi_usdt * 2) {
          signal = 'NEUTRAL';
          signalReason = `High OI but normal volume`;
          score = 30;
        } else if (Math.abs(priceChange24h) > 3) {
          signal = priceChange24h > 0 ? 'BULLISH' : 'BEARISH';
          signalReason = `Moderate movement: ${priceChange24h.toFixed(1)}%`;
          score = 50;
        }
        
        // Всегда возвращаем объект с полными данными, без undefined
        return {
          symbol: symbol,
          currentOI: oiData.openInterest,
          oiChange24h: 0, // TODO: требуется история
          oiChange4h: 0,  // TODO: требуется история
          currentPrice: currentPrice,
          volume24h: volume24h,
          priceChange24h: priceChange24h,
          highPrice: highPrice,
          lowPrice: lowPrice,
          signal: signal,
          signalReason: signalReason,
          score: score,
          timestamp: new Date().toISOString(),
          // Форматированные строки для отображения
          oiFormatted: `${(oiData.openInterest / 1000000).toFixed(2)}M`,
          volumeFormatted: `${(volume24h / 1000000).toFixed(2)}M`,
          priceFormatted: currentPrice.toFixed(2),
        };
      } catch (error) {
        console.error(`Error processing ${symbol}:`, error);
        return null;
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    const validResults = batchResults.filter(r => r !== null);
    signals.push(...validResults);
    
    if (i + CONFIG.batch_size < symbolsToProcess.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // Сортируем по score
  signals.sort((a, b) => b.score - a.score);
  
  // Возвращаем только топ-20, гарантируя, что все поля есть
  const enhancedSignals = signals.slice(0, 20).map(signal => ({
    ...signal,
    // Дополнительная безопасность - убеждаемся, что все поля есть
    oiChange24h: signal.oiChange24h || 0,
    oiChange4h: signal.oiChange4h || 0,
    priceChange24h: signal.priceChange24h || 0,
    score: signal.score || 0,
  }));
  
  return {
    signals: enhancedSignals,
    totalScanned: symbolsToProcess.length,
    validSignals: signals.length,
    timestamp: new Date().toISOString(),
    config: CONFIG,
  };
}

export async function GET() {
  try {
    if (oiCache && (Date.now() - oiCache.timestamp) < CACHE_TTL) {
      console.log('Returning cached OI data');
      return NextResponse.json(oiCache.data);
    }
    
    console.log('Fetching fresh OI data from BingX...');
    const oiData = await calculateOISignals();
    
    oiCache = {
      data: oiData,
      timestamp: Date.now(),
    };
    
    return NextResponse.json(oiData);
  } catch (error) {
    console.error('OI scanner error:', error);
    
    // Возвращаем валидный JSON даже при ошибке
    return NextResponse.json(
      { 
        signals: [],
        totalScanned: 0,
        validSignals: 0,
        error: 'OI service temporarily unavailable',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        config: CONFIG,
      }, 
      { status: 200 } // Возвращаем 200, чтобы фронтенд не падал
    );
  }
}

export async function POST() {
  oiCache = null;
  
  try {
    const freshData = await calculateOISignals();
    oiCache = {
      data: freshData,
      timestamp: Date.now(),
    };
    
    return NextResponse.json({
      ...freshData,
      cacheRefreshed: true,
    });
  } catch (error) {
    return NextResponse.json(
      { 
        signals: [],
        error: 'Failed to refresh cache',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 200 }
    );
  }
}