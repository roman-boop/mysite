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

// Кэширование для уменьшения количества запросов
let oiCache: {
  data: any;
  timestamp: number;
} | null = null;
const CACHE_TTL = 60 * 1000; // 60 секунд кэша

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
    
    // Проверка ответа BingX
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
  // Получаем все контракты с BingX
  const data = await bingxGet('/openApi/swap/v2/quote/contracts');
  
  if (!data || !data.data) {
    console.error('Failed to fetch symbols from BingX');
    return [];
  }
  
  // Фильтруем только USDT-контракты
  const symbols = data.data
    .filter((contract: any) => contract.symbol.endsWith('USDT'))
    .map((contract: any) => contract.symbol);
  
  console.log(`Fetched ${symbols.length} USDT symbols from BingX`);
  return symbols;
}

async function getOpenInterest(symbol: string) {
  // Получаем open interest для конкретного символа
  const data = await bingxGet('/openApi/swap/v2/quote/openInterest', { symbol });
  
  if (!data || !data.data) {
    return null;
  }
  
  return {
    symbol: symbol,
    openInterest: parseFloat(data.data.openInterest),
    timestamp: data.data.timestamp,
  };
}

async function get24hChange(symbol: string) {
  // Получаем 24-часовые изменения для расчета OI change
  const data = await bingxGet('/openApi/swap/v2/quote/ticker', { symbol });
  
  if (!data || !data.data) {
    return null;
  }
  
  const ticker = data.data;
  const currentOI = parseFloat(ticker.openInterest || '0');
  const volume24h = parseFloat(ticker.volume || '0');
  const priceChangePercent = parseFloat(ticker.priceChangePercent || '0');
  
  // Для расчета изменения OI нам нужны исторические данные
  // BingX не предоставляет прямого эндпоинта для исторического OI
  // Поэтому используем volume как прокси-метрику или возвращаем null
  
  return {
    currentOI,
    volume24h,
    priceChangePercent,
    // TODO: Для точного OI change нужна история
  };
}

// Альтернативный метод: получаем OI через klines
async function getOpenInterestFromKlines(symbol: string) {
  // Некоторые биржи предоставляют OI в данных по фандингу
  const data = await bingxGet('/openApi/swap/v2/quote/premiumIndex', { symbol });
  
  if (!data || !data.data) {
    return null;
  }
  
  const premiumData = data.data[0] || data.data;
  // OI не всегда доступен в этом эндпоинте
  
  return {
    symbol,
    openInterest: premiumData.openInterest ? parseFloat(premiumData.openInterest) : null,
    fundingRate: premiumData.lastFundingRate ? parseFloat(premiumData.lastFundingRate) : null,
    markPrice: premiumData.markPrice ? parseFloat(premiumData.markPrice) : null,
  };
}

async function calculateOISignals() {
  const symbols = await getAllSymbols();
  
  if (!symbols.length) {
    throw new Error('No symbols fetched from BingX');
  }
  
  // Ограничиваем количество символов для обработки
  const symbolsToProcess = symbols.slice(0, CONFIG.max_symbols);
  const signals = [];
  
  console.log(`Processing ${symbolsToProcess.length} symbols...`);
  
  // Обрабатываем пачками для избежания rate limit
  for (let i = 0; i < symbolsToProcess.length; i += CONFIG.batch_size) {
    const batch = symbolsToProcess.slice(i, i + CONFIG.batch_size);
    
    const batchPromises = batch.map(async (symbol) => {
      try {
        // Пытаемся получить OI несколькими способами
        let oiData = await getOpenInterest(symbol);
        
        if (!oiData || oiData.openInterest === 0) {
          // Fallback на klines/premium index
          const fallbackData = await getOpenInterestFromKlines(symbol);
          if (fallbackData && fallbackData.openInterest) {
            oiData = fallbackData as any;
          }
        }
        
        if (!oiData || !oiData.openInterest || oiData.openInterest < CONFIG.min_oi_usdt) {
          return null; // Пропускаем символы с низким OI
        }
        
        // Получаем дополнительные данные
        const tickerData = await bingxGet('/openApi/swap/v2/quote/ticker', { symbol });
        
        if (!tickerData || !tickerData.data) {
          return null;
        }
        
        const ticker = tickerData.data;
        const currentPrice = parseFloat(ticker.lastPrice);
        const volume24h = parseFloat(ticker.volume);
        const priceChange24h = parseFloat(ticker.priceChangePercent);
        
        // Для расчета процентного изменения OI, используем volume как индикатор активности
        // В реальном сценарии нужно хранить исторические данные в БД
        const oiChange24h = 0; // TODO: Требуется исторические данные
        const oiChange4h = 0;  // TODO: Требуется исторические данные
        
        // Расчет сигналов на основе доступных метрик
        let signal = 'NEUTRAL';
        let signalReason = '';
        
        // Используем объем и изменение цены как прокси для силы тренда
        const volumeStrength = volume24h / CONFIG.min_oi_usdt;
        const isVolumeSpike = volumeStrength > 5; // Объем в 5+ раз выше минимального
        
        if (isVolumeSpike && Math.abs(priceChange24h) > 5) {
          if (priceChange24h > 0) {
            signal = 'BULLISH';
            signalReason = `High volume (${(volumeStrength).toFixed(1)}x min) + price up ${priceChange24h.toFixed(1)}%`;
          } else {
            signal = 'BEARISH';
            signalReason = `High volume (${(volumeStrength).toFixed(1)}x min) + price down ${Math.abs(priceChange24h).toFixed(1)}%`;
          }
        } else if (Math.abs(priceChange24h) > 10) {
          signal = priceChange24h > 0 ? 'BULLISH' : 'BEARISH';
          signalReason = `Strong price movement: ${priceChange24h.toFixed(1)}%`;
        } else if (oiData.openInterest > CONFIG.min_oi_usdt * 2) {
          signal = 'NEUTRAL';
          signalReason = `High OI (${(oiData.openInterest / 1000000).toFixed(1)}M USDT) but volume normal`;
        }
        
        return {
          symbol,
          currentOI: oiData.openInterest,
          oiChange24h,
          oiChange4h,
          currentPrice,
          volume24h,
          priceChange24h,
          signal,
          signalReason,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        console.error(`Error processing ${symbol}:`, error);
        return null;
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    const validResults = batchResults.filter(r => r !== null);
    signals.push(...validResults);
    
    // Небольшая пауза между батчами для избежания rate limit
    if (i + CONFIG.batch_size < symbolsToProcess.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // Сортируем по текущему OI (desc)
  signals.sort((a, b) => b.currentOI - a.currentOI);
  
  // Добавляем топ-20 сигналов с пояснениями
  const enhancedSignals = signals.slice(0, 20).map(signal => ({
    ...signal,
    oiFormatted: `${(signal.currentOI / 1000000).toFixed(2)}M USDT`,
    volumeFormatted: `${(signal.volume24h / 1000000).toFixed(2)}M USDT`,
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
    // Проверяем кэш
    if (oiCache && (Date.now() - oiCache.timestamp) < CACHE_TTL) {
      console.log('Returning cached OI data');
      return NextResponse.json(oiCache.data);
    }
    
    console.log('Fetching fresh OI data from BingX...');
    const oiData = await calculateOISignals();
    
    // Сохраняем в кэш
    oiCache = {
      data: oiData,
      timestamp: Date.now(),
    };
    
    return NextResponse.json(oiData);
  } catch (error) {
    console.error('OI scanner error:', error);
    
    // Возвращаем ошибку с деталями
    return NextResponse.json(
      { 
        error: 'OI service temporarily unavailable',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }, 
      { status: 503 }
    );
  }
}

// Добавляем POST метод для ручного обновления кэша
export async function POST() {
  // Сбрасываем кэш
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
      { error: 'Failed to refresh cache' },
      { status: 500 }
    );
  }
}