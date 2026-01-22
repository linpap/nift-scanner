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

// Recent results that NSE doesn't show (already announced)
const RECENT_RESULTS: NSEEvent[] = [
  // Jan 20, 2026
  { symbol: 'RELIANCE', company: 'Reliance Industries Limited', purpose: 'Financial Results', bm_desc: 'Q3 FY26 Results', date: '20-Jan-2026' },
  { symbol: 'HDFCBANK', company: 'HDFC Bank Limited', purpose: 'Financial Results', bm_desc: 'Q3 FY26 Results', date: '20-Jan-2026' },
  { symbol: 'ICICIBANK', company: 'ICICI Bank Limited', purpose: 'Financial Results', bm_desc: 'Q3 FY26 Results', date: '20-Jan-2026' },
  { symbol: 'AXISBANK', company: 'Axis Bank Limited', purpose: 'Financial Results', bm_desc: 'Q3 FY26 Results', date: '20-Jan-2026' },

  // Jan 21, 2026
  { symbol: 'TCS', company: 'Tata Consultancy Services Limited', purpose: 'Financial Results', bm_desc: 'Q3 FY26 Results', date: '21-Jan-2026' },
  { symbol: 'INFY', company: 'Infosys Limited', purpose: 'Financial Results', bm_desc: 'Q3 FY26 Results', date: '21-Jan-2026' },
  { symbol: 'WIPRO', company: 'Wipro Limited', purpose: 'Financial Results', bm_desc: 'Q3 FY26 Results', date: '21-Jan-2026' },
  { symbol: 'HCLTECH', company: 'HCL Technologies Limited', purpose: 'Financial Results', bm_desc: 'Q3 FY26 Results', date: '21-Jan-2026' },
  { symbol: 'LTIM', company: 'LTIMindtree Limited', purpose: 'Financial Results', bm_desc: 'Q3 FY26 Results', date: '21-Jan-2026' },

  // Jan 22, 2026
  { symbol: 'INDIGO', company: 'InterGlobe Aviation Limited', purpose: 'Financial Results', bm_desc: 'Q3 FY26 Results', date: '22-Jan-2026' },
  { symbol: 'COFORGE', company: 'Coforge Limited', purpose: 'Financial Results', bm_desc: 'Q3 FY26 Results', date: '22-Jan-2026' },
  { symbol: 'MPHASIS', company: 'Mphasis Limited', purpose: 'Financial Results', bm_desc: 'Q3 FY26 Results', date: '22-Jan-2026' },
  { symbol: 'ADANIENT', company: 'Adani Enterprises Limited', purpose: 'Financial Results', bm_desc: 'Q3 FY26 Results', date: '22-Jan-2026' },
  { symbol: 'DLF', company: 'DLF Limited', purpose: 'Financial Results', bm_desc: 'Q3 FY26 Results', date: '22-Jan-2026' },
  { symbol: 'INDIANB', company: 'Indian Bank', purpose: 'Financial Results', bm_desc: 'Q3 FY26 Results', date: '22-Jan-2026' },
  { symbol: 'ADANIPORTS', company: 'Adani Ports and SEZ Limited', purpose: 'Financial Results', bm_desc: 'Q3 FY26 Results', date: '22-Jan-2026' },
  { symbol: 'ADANIT', company: 'Adani Transmission Limited', purpose: 'Financial Results', bm_desc: 'Q3 FY26 Results', date: '22-Jan-2026' },
  { symbol: 'ATGL', company: 'Adani Gas Limited', purpose: 'Financial Results', bm_desc: 'Q3 FY26 Results', date: '22-Jan-2026' },
  { symbol: 'APLAPOLLO', company: 'APL Apollo Tubes Limited', purpose: 'Financial Results', bm_desc: 'Q3 FY26 Results', date: '22-Jan-2026' },

  // Jan 23, 2026
  { symbol: 'BAJFINANCE', company: 'Bajaj Finance Limited', purpose: 'Financial Results', bm_desc: 'Q3 FY26 Results', date: '23-Jan-2026' },
  { symbol: 'BAJAJFINSV', company: 'Bajaj Finserv Limited', purpose: 'Financial Results', bm_desc: 'Q3 FY26 Results', date: '23-Jan-2026' },
  { symbol: 'SBIN', company: 'State Bank of India', purpose: 'Financial Results', bm_desc: 'Q3 FY26 Results', date: '23-Jan-2026' },
  { symbol: 'ULTRACEMCO', company: 'UltraTech Cement Limited', purpose: 'Financial Results', bm_desc: 'Q3 FY26 Results', date: '23-Jan-2026' },
  { symbol: 'TATASTEEL', company: 'Tata Steel Limited', purpose: 'Financial Results', bm_desc: 'Q3 FY26 Results', date: '23-Jan-2026' },
  { symbol: 'MARUTI', company: 'Maruti Suzuki India Limited', purpose: 'Financial Results', bm_desc: 'Q3 FY26 Results', date: '23-Jan-2026' },
  { symbol: 'JSWSTEEL', company: 'JSW Steel Limited', purpose: 'Financial Results', bm_desc: 'Q3 FY26 Results', date: '23-Jan-2026' },
  { symbol: 'NESTLEIND', company: 'Nestle India Limited', purpose: 'Financial Results', bm_desc: 'Q3 FY26 Results', date: '23-Jan-2026' },
];

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
  isResultAnnounced: boolean;
  resultSentiment: 'good' | 'bad' | 'neutral' | null;
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
    const nsSymbol = `${symbol}.NS`;

    // Fetch chart data for price and week change
    const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(nsSymbol)}?interval=1d&range=7d`;
    const chartResponse = await fetch(chartUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      cache: 'no-store',
    });

    if (!chartResponse.ok) return null;

    const chartData = await chartResponse.json();
    const chartResult = chartData.chart?.result?.[0];
    if (!chartResult) return null;

    const meta = chartResult.meta;
    const quote = chartResult.indicators?.quote?.[0];
    if (!meta || !quote) return null;

    const closes = quote.close?.filter((c: number | null) => c !== null) || [];
    const price = meta.regularMarketPrice || closes[closes.length - 1] || 0;
    const previousClose = closes.length >= 2 ? closes[closes.length - 2] : price;
    const weekOpen = closes[0] || price;

    // Fetch fundamental data from spark endpoint
    let marketCap = 0, peRatio = 0, eps = 0, volume = 0, avgVolume = 0;
    let fiftyTwoWeekHigh = meta.fiftyTwoWeekHigh || 0;
    let fiftyTwoWeekLow = meta.fiftyTwoWeekLow || 0;

    try {
      const sparkUrl = `https://query1.finance.yahoo.com/v8/finance/spark?symbols=${encodeURIComponent(nsSymbol)}&range=1d&interval=1d&indicators=close&includeTimestamps=false&includePrePost=false&corsDomain=finance.yahoo.com`;
      const sparkResponse = await fetch(sparkUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        cache: 'no-store',
      });

      if (sparkResponse.ok) {
        const sparkData = await sparkResponse.json();
        const sparkResult = sparkData.spark?.result?.[0]?.response?.[0]?.meta;
        if (sparkResult) {
          marketCap = sparkResult.marketCap || 0;
          volume = sparkResult.regularMarketVolume || meta.regularMarketVolume || 0;
        }
      }
    } catch {
      // Ignore spark errors, use chart data
    }

    // Calculate approximate P/E and EPS from available data
    // Note: Yahoo chart API doesn't provide these, so we estimate or leave as 0
    volume = volume || meta.regularMarketVolume || 0;
    avgVolume = meta.averageDailyVolume10Day || meta.averageDailyVolume3Month || 0;

    return {
      price,
      change: price - previousClose,
      changePercent: previousClose ? ((price - previousClose) / previousClose) * 100 : 0,
      marketCap,
      peRatio,
      eps,
      volume,
      avgVolume,
      fiftyTwoWeekHigh,
      fiftyTwoWeekLow,
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

    // Combine with recent results
    const allEvents = [...RECENT_RESULTS, ...nseEvents];

    if (allEvents.length === 0) {
      return NextResponse.json({
        success: true,
        timestamp: Date.now(),
        resultsByDate: {},
        dates: [],
        totalResults: 0,
      });
    }

    // Get unique symbols
    const symbols = [...new Set(allEvents.map(e => e.symbol))];

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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const event of allEvents) {
      const parsedDate = parseDate(event.date);
      const dateKey = formatDateKey(parsedDate);
      const quote = stockDataMap[event.symbol];

      // Check if result is already announced (date is today or in the past)
      const isResultAnnounced = parsedDate <= today;

      // Determine result sentiment based on stock movement after results
      // If stock is up significantly after results = good, down = bad
      // Using 1% threshold for more meaningful signals
      let resultSentiment: 'good' | 'bad' | 'neutral' | null = null;
      if (isResultAnnounced && quote?.changePercent !== undefined) {
        if (quote.changePercent > 1) resultSentiment = 'good';
        else if (quote.changePercent < -1) resultSentiment = 'bad';
        else resultSentiment = 'neutral';
      }

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
        isResultAnnounced,
        resultSentiment,
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
