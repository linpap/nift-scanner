// API Route: /api/results-calendar
// Fetch upcoming corporate results from NSE and enrich with stock data

import { NextResponse } from 'next/server';

interface NSEEvent {
  symbol: string;
  company: string;
  purpose: string;
  bm_desc: string;
  date: string;
}

interface StockData {
  symbol: string;
  company: string;
  purpose: string;
  description: string;
  date: string;
  parsedDate: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  weekChange: number | null;
  weekChangePercent: number | null;
  marketCap: number | null;
  peRatio: number | null;
  eps: number | null;
  volume: number | null;
  avgVolume: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
}

interface ResultsByDate {
  [date: string]: StockData[];
}

async function fetchNSECalendar(): Promise<NSEEvent[]> {
  try {
    const response = await fetch('https://www.nseindia.com/api/event-calendar', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.nseindia.com/',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`NSE API error: ${response.status}`);
      return [];
    }

    const data = await response.json();

    // Filter for financial results only
    return data.filter((event: NSEEvent) =>
      event.purpose?.toLowerCase().includes('financial results') ||
      event.purpose?.toLowerCase().includes('quarterly results') ||
      event.bm_desc?.toLowerCase().includes('financial results')
    );
  } catch (error) {
    console.error('Error fetching NSE calendar:', error);
    return [];
  }
}

async function fetchYahooQuote(symbol: string): Promise<{
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  peRatio: number;
  eps: number;
  volume: number;
  avgVolume: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  weekOpen: number;
} | null> {
  try {
    // Fetch 5-day data to calculate week change
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}.NS?interval=1d&range=7d`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      cache: 'no-store',
    });

    if (!response.ok) return null;

    const data = await response.json();
    const result = data.chart?.result?.[0];

    if (!result) return null;

    const meta = result.meta;
    const quote = result.indicators?.quote?.[0];

    if (!meta || !quote) return null;

    const closes = quote.close?.filter((c: number | null) => c !== null) || [];
    const price = meta.regularMarketPrice || closes[closes.length - 1] || 0;
    const previousClose = closes.length >= 2 ? closes[closes.length - 2] : price;
    const weekOpen = closes[0] || price;

    return {
      price,
      change: price - previousClose,
      changePercent: previousClose ? ((price - previousClose) / previousClose) * 100 : 0,
      marketCap: meta.marketCap || 0,
      peRatio: meta.trailingPE || 0,
      eps: meta.epsTrailingTwelveMonths || 0,
      volume: meta.regularMarketVolume || 0,
      avgVolume: meta.averageDailyVolume10Day || 0,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh || 0,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow || 0,
      weekOpen,
    };
  } catch (error) {
    console.error(`Error fetching ${symbol}:`, error);
    return null;
  }
}

function parseDate(dateStr: string): Date {
  // Parse "24-Jan-2026" format
  const parts = dateStr.split('-');
  if (parts.length !== 3) return new Date();

  const day = parseInt(parts[0]);
  const monthStr = parts[1];
  const year = parseInt(parts[2]);

  const months: Record<string, number> = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
  };

  return new Date(year, months[monthStr] || 0, day);
}

function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

export async function GET() {
  try {
    // Fetch NSE calendar
    const nseEvents = await fetchNSECalendar();

    if (nseEvents.length === 0) {
      return NextResponse.json({
        success: true,
        timestamp: Date.now(),
        resultsByDate: {},
        dates: [],
        totalResults: 0,
      });
    }

    // Get unique symbols
    const symbols = [...new Set(nseEvents.map(e => e.symbol))];

    // Fetch stock data for all symbols in parallel (limit to 30 for performance)
    const limitedSymbols = symbols.slice(0, 50);
    const stockDataPromises = limitedSymbols.map(async (symbol) => {
      const quote = await fetchYahooQuote(symbol);
      return { symbol, quote };
    });

    const stockDataResults = await Promise.all(stockDataPromises);
    const stockDataMap: Record<string, typeof stockDataResults[0]['quote']> = {};
    stockDataResults.forEach(({ symbol, quote }) => {
      stockDataMap[symbol] = quote;
    });

    // Group results by date and enrich with stock data
    const resultsByDate: ResultsByDate = {};

    for (const event of nseEvents) {
      const parsedDate = parseDate(event.date);
      const dateKey = formatDateKey(parsedDate);
      const quote = stockDataMap[event.symbol];

      const stockData: StockData = {
        symbol: event.symbol,
        company: event.company,
        purpose: event.purpose,
        description: event.bm_desc,
        date: event.date,
        parsedDate: dateKey,
        price: quote?.price || null,
        change: quote?.change || null,
        changePercent: quote?.changePercent || null,
        weekChange: quote ? quote.price - quote.weekOpen : null,
        weekChangePercent: quote && quote.weekOpen ? ((quote.price - quote.weekOpen) / quote.weekOpen) * 100 : null,
        marketCap: quote?.marketCap || null,
        peRatio: quote?.peRatio || null,
        eps: quote?.eps || null,
        volume: quote?.volume || null,
        avgVolume: quote?.avgVolume || null,
        fiftyTwoWeekHigh: quote?.fiftyTwoWeekHigh || null,
        fiftyTwoWeekLow: quote?.fiftyTwoWeekLow || null,
      };

      if (!resultsByDate[dateKey]) {
        resultsByDate[dateKey] = [];
      }
      resultsByDate[dateKey].push(stockData);
    }

    // Sort results within each date by market cap (largest first)
    for (const dateKey of Object.keys(resultsByDate)) {
      resultsByDate[dateKey].sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
    }

    // Get sorted date keys
    const dates = Object.keys(resultsByDate).sort();

    return NextResponse.json({
      success: true,
      timestamp: Date.now(),
      lastUpdated: new Date().toISOString(),
      resultsByDate,
      dates,
      totalResults: nseEvents.length,
    });
  } catch (error) {
    console.error('Results Calendar API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch results calendar', details: String(error) },
      { status: 500 }
    );
  }
}
