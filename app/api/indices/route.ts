// API Route: /api/indices
// Fetch historical data for indices and F&O stocks

import { NextRequest, NextResponse } from 'next/server';
import { FO_STOCKS } from '@/lib/fo-stocks';

interface YahooQuote {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjClose?: number;
}

// In-memory cache for index data
const indexCache: Map<string, { data: YahooQuote[]; timestamp: number }> = new Map();
const CACHE_TTL = 10 * 1000; // 10 seconds for real-time updates

type Interval = '5m' | '15m' | '1d';

async function fetchIndexData(symbol: string, days: number = 100, interval: Interval = '1d', skipCache: boolean = false): Promise<YahooQuote[]> {
  const cacheKey = `${symbol}-${days}-${interval}`;
  const cached = indexCache.get(cacheKey);

  if (!skipCache && cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    let url: string;

    if (interval === '5m' || interval === '15m') {
      // For intraday, use range parameter (Yahoo Finance limitation)
      const range = interval === '5m' ? '5d' : '60d';
      url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;
    } else {
      // Daily data
      const period2 = Math.floor(Date.now() / 1000);
      const period1 = period2 - (days * 24 * 60 * 60);
      url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=1d`;
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`);
    }

    const data = await response.json();

    const chart = data.chart?.result?.[0];
    if (!chart) {
      throw new Error('No chart data available');
    }

    const timestamps = chart.timestamp || [];
    const quote = chart.indicators?.quote?.[0] || {};
    const adjClose = chart.indicators?.adjclose?.[0]?.adjclose || [];

    const quotes: YahooQuote[] = [];

    for (let i = 0; i < timestamps.length; i++) {
      if (
        quote.open?.[i] != null &&
        quote.high?.[i] != null &&
        quote.low?.[i] != null &&
        quote.close?.[i] != null
      ) {
        quotes.push({
          date: new Date(timestamps[i] * 1000),
          open: quote.open[i],
          high: quote.high[i],
          low: quote.low[i],
          close: quote.close[i],
          volume: quote.volume?.[i] || 0,
          adjClose: adjClose[i],
        });
      }
    }

    // Cache the result
    indexCache.set(cacheKey, { data: quotes, timestamp: Date.now() });

    return quotes;
  } catch (error) {
    console.error(`Error fetching index data for ${symbol}:`, error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol') || '^NSEI';
  const days = parseInt(searchParams.get('days') || '100');
  const interval = (searchParams.get('interval') || '1d') as Interval;
  const live = searchParams.get('live') === 'true'; // For real-time updates, skip cache

  // Validate symbol - allow indices and F&O stocks
  const allowedIndices = ['^NSEI', '^NSEBANK', '^BSESN'];
  const allowedStocks = FO_STOCKS.map(s => `${s}.NS`);
  const isValidSymbol = allowedIndices.includes(symbol) ||
                        allowedStocks.includes(symbol) ||
                        symbol.endsWith('.NS'); // Allow any .NS suffix for flexibility

  if (!isValidSymbol) {
    return NextResponse.json(
      {
        error: 'Invalid symbol',
        hint: 'Use ^NSEI for NIFTY, ^NSEBANK for Bank Nifty, or SYMBOL.NS for stocks',
        usage: '/api/indices?symbol=RELIANCE.NS&days=100&interval=1d'
      },
      { status: 400 }
    );
  }

  // Validate interval
  const allowedIntervals: Interval[] = ['5m', '15m', '1d'];
  if (!allowedIntervals.includes(interval)) {
    return NextResponse.json(
      {
        error: 'Invalid interval',
        allowed: allowedIntervals,
      },
      { status: 400 }
    );
  }

  try {
    const data = await fetchIndexData(symbol, days, interval, live);

    // Format data for the chart
    const formattedData = data.map((item) => ({
      date: interval === '1d'
        ? item.date.toISOString().split('T')[0]
        : item.date.toISOString(),
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume,
    }));

    return NextResponse.json({
      success: true,
      symbol,
      interval,
      data: formattedData,
      count: formattedData.length,
      timestamp: Date.now(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch index data',
        details: String(error)
      },
      { status: 500 }
    );
  }
}
