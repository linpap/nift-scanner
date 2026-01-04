// Multi-source data fetcher with fallback support
// Primary: Yahoo Finance (via yahoo-finance2)
// Fallback: Free Indian Stock Market API

import yahooFinance from 'yahoo-finance2';

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

// Primary: Yahoo Finance
async function fetchFromYahooFinance(symbol: string): Promise<StockData | null> {
  try {
    const yahooSymbol = symbol.includes('.NS') ? symbol : `${symbol}.NS`;
    const quote = await yahooFinance.quote(yahooSymbol);

    if (!quote) return null;

    return {
      symbol: symbol.replace('.NS', ''),
      name: quote.shortName || quote.longName || symbol,
      open: quote.regularMarketOpen || 0,
      high: quote.regularMarketDayHigh || 0,
      low: quote.regularMarketDayLow || 0,
      close: quote.regularMarketPrice || 0,
      volume: quote.regularMarketVolume || 0,
      previousClose: quote.regularMarketPreviousClose || 0,
      change: quote.regularMarketChange || 0,
      changePercent: quote.regularMarketChangePercent || 0,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error(`Yahoo Finance error for ${symbol}:`, error);
    return null;
  }
}

// Fallback: Free Indian Stock Market API
async function fetchFromFreeAPI(symbol: string): Promise<StockData | null> {
  try {
    const baseUrl = 'https://military-jobye-haiqstudios-14f59639.koyeb.app';
    const response = await fetch(`${baseUrl}/stock?symbol=${symbol}.NS&res=num`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) return null;

    const data = await response.json();

    return {
      symbol: symbol,
      name: data.name || symbol,
      open: data.open || 0,
      high: data.dayHigh || 0,
      low: data.dayLow || 0,
      close: data.price || data.lastPrice || 0,
      volume: data.volume || 0,
      previousClose: data.previousClose || 0,
      change: data.change || 0,
      changePercent: data.changePercent || 0,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error(`Free API error for ${symbol}:`, error);
    return null;
  }
}

// Fetch historical data for technical analysis
export async function fetchHistoricalData(
  symbol: string,
  days: number = 250
): Promise<HistoricalData[]> {
  try {
    const yahooSymbol = symbol.includes('.NS') ? symbol : `${symbol}.NS`;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await yahooFinance.historical(yahooSymbol, {
      period1: startDate,
      period2: endDate,
      interval: '1d',
    });

    return result.map(item => ({
      date: item.date,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume,
    }));
  } catch (error) {
    console.error(`Historical data error for ${symbol}:`, error);
    return [];
  }
}

// Main fetch function with fallback
export async function fetchStockData(symbol: string): Promise<StockData | null> {
  // Try Yahoo Finance first
  let data = await fetchFromYahooFinance(symbol);

  // Fallback to free API if Yahoo fails
  if (!data) {
    await delay(100); // Small delay before fallback
    data = await fetchFromFreeAPI(symbol);
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
      if (data) {
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
