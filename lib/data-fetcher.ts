// Data fetcher using Yahoo Finance API with retry logic
// Includes timeout handling and exponential backoff

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

// Fetch with timeout helper
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Retry with exponential backoff
async function fetchWithRetry<T>(
  fetchFn: () => Promise<T | null>,
  maxRetries: number = 3,
  baseDelayMs: number = 500
): Promise<T | null> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await fetchFn();
      if (result !== null) return result;
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
    }

    if (attempt < maxRetries - 1) {
      await delay(baseDelayMs * Math.pow(2, attempt));
    }
  }
  return null;
}

// Yahoo Finance API for current stock data
async function fetchFromYahoo(symbol: string): Promise<StockData | null> {
  try {
    const yahooSymbol = `${symbol}.NS`;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=5d`;

    const response = await fetchWithTimeout(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      cache: 'no-store',
    }, 8000);

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
    // Silently fail - retry logic will handle
    return null;
  }
}

// Fetch historical data from Yahoo Finance with retry
export async function fetchHistoricalData(
  symbol: string,
  days: number = 250
): Promise<HistoricalData[]> {
  const fetchOnce = async (): Promise<HistoricalData[] | null> => {
    try {
      const yahooSymbol = `${symbol}.NS`;
      const range = days > 365 ? '2y' : '1y';
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=${range}&interval=1d`;

      const response = await fetchWithTimeout(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
        cache: 'no-store',
      }, 10000);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const result = data?.chart?.result?.[0];

      if (!result || !result.timestamp) {
        return null;
      }

      const timestamps = result.timestamp;
      const quote = result.indicators?.quote?.[0] || {};
      const historical: HistoricalData[] = [];

      for (let i = 0; i < timestamps.length; i++) {
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

      return historical.length > 0 ? historical : null;
    } catch {
      return null;
    }
  };

  const result = await fetchWithRetry(fetchOnce, 2, 300);
  if (!result) {
    console.log(`Failed to fetch historical data for ${symbol} after retries`);
    return [];
  }
  return result;
}

// Main fetch function with retry
export async function fetchStockData(symbol: string): Promise<StockData | null> {
  const result = await fetchWithRetry(() => fetchFromYahoo(symbol), 2, 300);
  return result;
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
