// API Route: /api/indices
// Fetch historical data for indices (Nifty, Bank Nifty)

import { NextRequest, NextResponse } from 'next/server';

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
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchIndexData(symbol: string, days: number = 100): Promise<YahooQuote[]> {
  const cacheKey = `${symbol}-${days}`;
  const cached = indexCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const period2 = Math.floor(Date.now() / 1000);
    const period1 = period2 - (days * 24 * 60 * 60);

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=1d`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
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

  // Validate symbol - only allow known indices
  const allowedSymbols = ['^NSEI', '^NSEBANK', '^BSESN'];
  if (!allowedSymbols.includes(symbol)) {
    return NextResponse.json(
      {
        error: 'Invalid index symbol',
        allowed: allowedSymbols,
        usage: '/api/indices?symbol=^NSEI&days=100'
      },
      { status: 400 }
    );
  }

  try {
    const data = await fetchIndexData(symbol, days);

    // Format data for the chart
    const formattedData = data.map((item) => ({
      date: item.date.toISOString().split('T')[0],
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume,
    }));

    return NextResponse.json({
      success: true,
      symbol,
      data: formattedData,
      count: formattedData.length,
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
