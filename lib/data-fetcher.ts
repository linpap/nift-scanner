// Multi-source data fetcher with fallback support
// Uses direct fetch to Yahoo Finance and Free Indian Stock Market API

export interface StockData {
  symbol: string;
  name: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  previousClose: number;
  change: number;
  changePercent: number;
  timestamp: Date;
}

export interface HistoricalData {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Delay function to avoid rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Primary: Free Indian Stock Market API
async function fetchFromFreeAPI(symbol: string): Promise<StockData | null> {
  try {
    const baseUrl = 'https://military-jobye-haiqstudios-14f59639.koyeb.app';
    const response = await fetch(`${baseUrl}/stock?symbol=${symbol}.NS&res=num`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'NIFT-Scanner/1.0',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`Free API response not ok for ${symbol}: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (!data || data.error) {
      console.error(`Free API error for ${symbol}:`, data?.error);
      return null;
    }

    return {
      symbol: symbol,
      name: data.name || data.shortName || symbol,
      open: data.open || 0,
      high: data.dayHigh || data.high || 0,
      low: data.dayLow || data.low || 0,
      close: data.price || data.regularMarketPrice || data.lastPrice || 0,
      volume: data.volume || data.regularMarketVolume || 0,
      previousClose: data.previousClose || data.regularMarketPreviousClose || 0,
      change: data.change || data.regularMarketChange || 0,
      changePercent: data.changePercent || data.regularMarketChangePercent || 0,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error(`Free API error for ${symbol}:`, error);
    return null;
  }
}

// Fallback: Direct Yahoo Finance API
async function fetchFromYahooDirect(symbol: string): Promise<StockData | null> {
  try {
    const yahooSymbol = `${symbol}.NS`;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=5d`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const result = data?.chart?.result?.[0];

    if (!result) return null;

    const meta = result.meta;
    const quote = result.indicators?.quote?.[0];
    const lastIndex = (quote?.close?.length || 1) - 1;

    return {
      symbol: symbol,
      name: meta?.shortName || meta?.longName || symbol,
      open: quote?.open?.[lastIndex] || meta?.regularMarketPrice || 0,
      high: quote?.high?.[lastIndex] || meta?.regularMarketDayHigh || 0,
      low: quote?.low?.[lastIndex] || meta?.regularMarketDayLow || 0,
      close: meta?.regularMarketPrice || quote?.close?.[lastIndex] || 0,
      volume: quote?.volume?.[lastIndex] || meta?.regularMarketVolume || 0,
      previousClose: meta?.previousClose || meta?.chartPreviousClose || 0,
      change: (meta?.regularMarketPrice || 0) - (meta?.previousClose || 0),
      changePercent: meta?.previousClose ?
        ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100 : 0,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error(`Yahoo Direct error for ${symbol}:`, error);
    return null;
  }
}

// Fetch historical data from Yahoo Finance
export async function fetchHistoricalData(
  symbol: string,
  days: number = 250
): Promise<HistoricalData[]> {
  try {
    const yahooSymbol = `${symbol}.NS`;
    const endDate = Math.floor(Date.now() / 1000);
    const startDate = endDate - (days * 24 * 60 * 60);

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?period1=${startDate}&period2=${endDate}&interval=1d`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`Yahoo historical fetch failed for ${symbol}: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const result = data?.chart?.result?.[0];

    if (!result) {
      console.error(`No chart result for ${symbol}`);
      return [];
    }

    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};

    const historical: HistoricalData[] = [];

    for (let i = 0; i < timestamps.length; i++) {
      // Skip if any value is null
      if (
        quote.open?.[i] == null ||
        quote.high?.[i] == null ||
        quote.low?.[i] == null ||
        quote.close?.[i] == null
      ) {
        continue;
      }

      historical.push({
        date: new Date(timestamps[i] * 1000),
        open: quote.open[i],
        high: quote.high[i],
        low: quote.low[i],
        close: quote.close[i],
        volume: quote.volume?.[i] || 0,
      });
    }

    return historical;
  } catch (error) {
    console.error(`Historical data error for ${symbol}:`, error);
    return [];
  }
}

// Main fetch function with fallback
export async function fetchStockData(symbol: string): Promise<StockData | null> {
  // Try Free API first
  let data = await fetchFromFreeAPI(symbol);

  // Fallback to Yahoo Direct if Free API fails
  if (!data || data.close === 0) {
    await delay(100);
    data = await fetchFromYahooDirect(symbol);
  }

  return data;
}

// Batch fetch with rate limiting
export async function fetchMultipleStocks(
  symbols: string[],
  batchSize: number = 5,
  delayBetweenBatches: number = 500
): Promise<Map<string, StockData>> {
  const results = new Map<string, StockData>();

  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(symbol => fetchStockData(symbol))
    );

    batchResults.forEach((data, index) => {
      if (data && data.close > 0) {
        results.set(batch[index], data);
      }
    });

    // Delay between batches to avoid rate limiting
    if (i + batchSize < symbols.length) {
      await delay(delayBetweenBatches);
    }
  }

  return results;
}

// Fetch historical data for multiple stocks
export async function fetchMultipleHistorical(
  symbols: string[],
  days: number = 250,
  batchSize: number = 3,
  delayBetweenBatches: number = 1000
): Promise<Map<string, HistoricalData[]>> {
  const results = new Map<string, HistoricalData[]>();

  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(symbol => fetchHistoricalData(symbol, days))
    );

    batchResults.forEach((data, index) => {
      if (data.length > 0) {
        results.set(batch[index], data);
      }
    });

    // Delay between batches
    if (i + batchSize < symbols.length) {
      await delay(delayBetweenBatches);
    }
  }

  return results;
}
