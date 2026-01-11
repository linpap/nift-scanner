// Real-time NSE Data Fetcher with Fallback Support
// Providers: 1. stock-nse-india (NSE lib) -> 2. Direct NSE API -> 3. Yahoo Finance (delayed)

import { NseIndia } from 'stock-nse-india';

export interface IndexQuote {
  symbol: string;
  name: string;
  last: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  change: number;
  changePercent: number;
  timestamp: number;
  source: 'nse' | 'nse-direct' | 'yahoo';
}

export interface IntradayCandle {
  timestamp: number;
  value: number;
}

export interface OHLCCandle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// NSE Index symbol mappings
const INDEX_SYMBOLS: Record<string, { nse: string; nseApi: string; yahoo: string; name: string }> = {
  'NIFTY': { nse: 'NIFTY 50', nseApi: 'NIFTY%2050', yahoo: '^NSEI', name: 'NIFTY 50' },
  'NIFTY50': { nse: 'NIFTY 50', nseApi: 'NIFTY%2050', yahoo: '^NSEI', name: 'NIFTY 50' },
  '^NSEI': { nse: 'NIFTY 50', nseApi: 'NIFTY%2050', yahoo: '^NSEI', name: 'NIFTY 50' },
  'BANKNIFTY': { nse: 'NIFTY BANK', nseApi: 'NIFTY%20BANK', yahoo: '^NSEBANK', name: 'BANK NIFTY' },
  'NIFTYBANK': { nse: 'NIFTY BANK', nseApi: 'NIFTY%20BANK', yahoo: '^NSEBANK', name: 'BANK NIFTY' },
  '^NSEBANK': { nse: 'NIFTY BANK', nseApi: 'NIFTY%20BANK', yahoo: '^NSEBANK', name: 'BANK NIFTY' },
};

// Normalize symbol to standard format
function normalizeSymbol(symbol: string): { nse: string; nseApi: string; yahoo: string; name: string } | null {
  const upperSymbol = symbol.toUpperCase().replace(/\s+/g, '');
  return INDEX_SYMBOLS[upperSymbol] || null;
}

// Create NSE India instance (singleton)
let nseInstance: NseIndia | null = null;
function getNseInstance(): NseIndia {
  if (!nseInstance) {
    nseInstance = new NseIndia();
  }
  return nseInstance;
}

// Provider 1: NSE India (stock-nse-india package)
async function fetchFromNSELib(symbol: string): Promise<IndexQuote | null> {
  try {
    const symbolInfo = normalizeSymbol(symbol);
    if (!symbolInfo) return null;

    const nse = getNseInstance();
    const indices = await nse.getAllIndices();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const indexData = indices.data.find((i: any) =>
      i.index === symbolInfo.nse || i.indexName === symbolInfo.nse
    );

    if (!indexData) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = indexData as any;
    return {
      symbol: symbolInfo.yahoo,
      name: symbolInfo.name,
      last: data.last,
      open: data.open,
      high: data.high,
      low: data.low,
      previousClose: data.previousClose,
      change: data.variation ?? data.change ?? 0,
      changePercent: data.percentChange ?? data.percChange ?? 0,
      timestamp: Date.now(),
      source: 'nse',
    };
  } catch (error) {
    console.error('NSE lib fetch error:', error);
    return null;
  }
}

// Provider 1b: NSE India Intraday Data (from lib)
async function fetchIntradayFromNSELib(symbol: string): Promise<IntradayCandle[] | null> {
  try {
    const symbolInfo = normalizeSymbol(symbol);
    if (!symbolInfo) return null;

    const nse = getNseInstance();
    const intraday = await nse.getIndexIntradayData(symbolInfo.nse);

    if (!intraday.grapthData || intraday.grapthData.length === 0) return null;

    return intraday.grapthData.map((point: [number, number, string]) => ({
      timestamp: point[0],
      value: point[1],
    }));
  } catch (error) {
    console.error('NSE lib intraday fetch error:', error);
    return null;
  }
}

// Provider 2: Direct NSE Website API (similar to nsetools approach)
async function fetchFromNSEDirect(symbol: string): Promise<IndexQuote | null> {
  try {
    const symbolInfo = normalizeSymbol(symbol);
    if (!symbolInfo) return null;

    // NSE India API endpoint for index data
    const url = `https://www.nseindia.com/api/allIndices`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.nseindia.com/market-data/live-equity-market',
        'Connection': 'keep-alive',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('NSE direct API response not ok:', response.status);
      return null;
    }

    const data = await response.json();

    if (!data.data || !Array.isArray(data.data)) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const indexData = data.data.find((i: any) =>
      i.index === symbolInfo.nse || i.indexSymbol === symbolInfo.nse
    );

    if (!indexData) return null;

    return {
      symbol: symbolInfo.yahoo,
      name: symbolInfo.name,
      last: indexData.last || indexData.lastPrice || 0,
      open: indexData.open || 0,
      high: indexData.high || 0,
      low: indexData.low || 0,
      previousClose: indexData.previousClose || indexData.previousDay || 0,
      change: indexData.variation || indexData.change || 0,
      changePercent: indexData.percentChange || indexData.pChange || 0,
      timestamp: Date.now(),
      source: 'nse-direct',
    };
  } catch (error) {
    console.error('NSE direct fetch error:', error);
    return null;
  }
}

// Provider 2b: Direct NSE Intraday Data
async function fetchIntradayFromNSEDirect(symbol: string): Promise<IntradayCandle[] | null> {
  try {
    const symbolInfo = normalizeSymbol(symbol);
    if (!symbolInfo) return null;

    // NSE India API endpoint for intraday chart data
    const url = `https://www.nseindia.com/api/chart-databyindex?index=${symbolInfo.nseApi}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.nseindia.com/',
      },
      cache: 'no-store',
    });

    if (!response.ok) return null;

    const data = await response.json();

    if (!data.grapthData || data.grapthData.length === 0) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.grapthData.map((point: any) => ({
      timestamp: point[0],
      value: point[1],
    }));
  } catch (error) {
    console.error('NSE direct intraday fetch error:', error);
    return null;
  }
}

// Provider 3: Yahoo Finance (fallback - 15min delayed)
async function fetchFromYahoo(symbol: string): Promise<IndexQuote | null> {
  try {
    const symbolInfo = normalizeSymbol(symbol);
    if (!symbolInfo) return null;

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbolInfo.yahoo)}?range=1d&interval=1m`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      cache: 'no-store',
    });

    if (!response.ok) return null;

    const data = await response.json();
    const chart = data.chart?.result?.[0];
    if (!chart) return null;

    const meta = chart.meta;
    const quote = chart.indicators?.quote?.[0];
    const timestamps = chart.timestamp || [];
    const lastIdx = timestamps.length - 1;

    return {
      symbol: symbolInfo.yahoo,
      name: symbolInfo.name,
      last: meta.regularMarketPrice || quote?.close?.[lastIdx] || 0,
      open: meta.regularMarketOpen || quote?.open?.[0] || 0,
      high: meta.regularMarketDayHigh || Math.max(...(quote?.high?.filter((h: number | null) => h !== null) || [0])),
      low: meta.regularMarketDayLow || Math.min(...(quote?.low?.filter((l: number | null) => l !== null && l > 0) || [0])),
      previousClose: meta.chartPreviousClose || meta.previousClose || 0,
      change: (meta.regularMarketPrice || 0) - (meta.chartPreviousClose || 0),
      changePercent: ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100,
      timestamp: Date.now(),
      source: 'yahoo',
    };
  } catch (error) {
    console.error('Yahoo fetch error:', error);
    return null;
  }
}

// Main function: Get real-time quote with fallback
export async function getRealtimeQuote(symbol: string): Promise<IndexQuote | null> {
  // Try NSE library first (real-time)
  let quote = await fetchFromNSELib(symbol);
  if (quote) {
    console.log(`[${symbol}] Using NSE lib data (real-time)`);
    return quote;
  }

  // Try direct NSE API second (real-time)
  quote = await fetchFromNSEDirect(symbol);
  if (quote) {
    console.log(`[${symbol}] Using NSE direct API (real-time)`);
    return quote;
  }

  // Fallback to Yahoo (15min delayed)
  quote = await fetchFromYahoo(symbol);
  if (quote) {
    console.log(`[${symbol}] Using Yahoo data (delayed)`);
    return quote;
  }

  return null;
}

// Get intraday data with fallback
export async function getIntradayData(symbol: string): Promise<{ candles: IntradayCandle[]; source: string } | null> {
  // Try NSE library first
  const nseLibData = await fetchIntradayFromNSELib(symbol);
  if (nseLibData && nseLibData.length > 0) {
    console.log(`[${symbol}] Using NSE lib intraday data`);
    return { candles: nseLibData, source: 'nse' };
  }

  // Try direct NSE API second
  const nseDirectData = await fetchIntradayFromNSEDirect(symbol);
  if (nseDirectData && nseDirectData.length > 0) {
    console.log(`[${symbol}] Using NSE direct intraday data`);
    return { candles: nseDirectData, source: 'nse-direct' };
  }

  // Fallback to Yahoo
  try {
    const symbolInfo = normalizeSymbol(symbol);
    if (!symbolInfo) return null;

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbolInfo.yahoo)}?range=1d&interval=1m`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      cache: 'no-store',
    });

    if (!response.ok) return null;

    const data = await response.json();
    const chart = data.chart?.result?.[0];
    if (!chart || !chart.timestamp) return null;

    const quote = chart.indicators?.quote?.[0];
    const candles: IntradayCandle[] = [];

    for (let i = 0; i < chart.timestamp.length; i++) {
      if (quote?.close?.[i] != null) {
        candles.push({
          timestamp: chart.timestamp[i] * 1000,
          value: quote.close[i],
        });
      }
    }

    console.log(`[${symbol}] Using Yahoo intraday data (delayed)`);
    return { candles, source: 'yahoo' };
  } catch (error) {
    console.error('Yahoo intraday fetch error:', error);
    return null;
  }
}

// Get historical OHLC data (Yahoo is best for this)
export async function getHistoricalData(
  symbol: string,
  days: number = 100,
  interval: '5m' | '15m' | '1d' = '1d'
): Promise<{ data: OHLCCandle[]; source: string } | null> {
  const symbolInfo = normalizeSymbol(symbol);
  if (!symbolInfo) return null;

  try {
    let url: string;

    if (interval === '5m' || interval === '15m') {
      const range = interval === '5m' ? '5d' : '60d';
      url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbolInfo.yahoo)}?range=${range}&interval=${interval}`;
    } else {
      const period2 = Math.floor(Date.now() / 1000);
      const period1 = period2 - (days * 24 * 60 * 60);
      url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbolInfo.yahoo)}?period1=${period1}&period2=${period2}&interval=1d`;
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      cache: 'no-store',
    });

    if (!response.ok) return null;

    const data = await response.json();
    const chart = data.chart?.result?.[0];
    if (!chart) return null;

    const timestamps = chart.timestamp || [];
    const quote = chart.indicators?.quote?.[0] || {};
    const candles: OHLCCandle[] = [];

    for (let i = 0; i < timestamps.length; i++) {
      if (
        quote.open?.[i] != null &&
        quote.high?.[i] != null &&
        quote.low?.[i] != null &&
        quote.close?.[i] != null
      ) {
        const date = new Date(timestamps[i] * 1000);
        candles.push({
          date: interval === '1d'
            ? date.toISOString().split('T')[0]
            : date.toISOString(),
          open: quote.open[i],
          high: quote.high[i],
          low: quote.low[i],
          close: quote.close[i],
          volume: quote.volume?.[i] || 0,
        });
      }
    }

    return { data: candles, source: 'yahoo' };
  } catch (error) {
    console.error('Historical data fetch error:', error);
    return null;
  }
}

// Get all major indices at once
export async function getAllIndicesQuotes(): Promise<IndexQuote[]> {
  const quotes: IndexQuote[] = [];

  // Try NSE library first
  try {
    const nse = getNseInstance();
    const indices = await nse.getAllIndices();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const indexData of indices.data as any[]) {
      const indexName = indexData.index || indexData.indexName;
      if (indexName === 'NIFTY 50' || indexName === 'NIFTY BANK') {
        const symbolInfo = indexName === 'NIFTY 50'
          ? INDEX_SYMBOLS['^NSEI']
          : INDEX_SYMBOLS['^NSEBANK'];

        quotes.push({
          symbol: symbolInfo.yahoo,
          name: symbolInfo.name,
          last: indexData.last,
          open: indexData.open,
          high: indexData.high,
          low: indexData.low,
          previousClose: indexData.previousClose,
          change: indexData.variation ?? indexData.change ?? 0,
          changePercent: indexData.percentChange ?? indexData.percChange ?? 0,
          timestamp: Date.now(),
          source: 'nse',
        });
      }
    }

    if (quotes.length > 0) {
      return quotes;
    }
  } catch (error) {
    console.error('NSE lib error, trying direct API:', error);
  }

  // Fallback to direct NSE API
  try {
    const niftyQuote = await fetchFromNSEDirect('^NSEI');
    const bankNiftyQuote = await fetchFromNSEDirect('^NSEBANK');

    if (niftyQuote) quotes.push(niftyQuote);
    if (bankNiftyQuote) quotes.push(bankNiftyQuote);
  } catch (error) {
    console.error('NSE direct API error:', error);
  }

  return quotes;
}
