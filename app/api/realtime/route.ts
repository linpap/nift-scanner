// API Route: /api/realtime
// Real-time data for indices using NSE scraper with fallback

import { NextRequest, NextResponse } from 'next/server';
import {
  getRealtimeQuote,
  getIntradayData,
  getHistoricalData,
  getAllIndicesQuotes,
} from '@/lib/nse-realtime';

// Cache for rate limiting NSE requests
const lastFetchTime: Map<string, number> = new Map();
const MIN_FETCH_INTERVAL = 3000; // 3 seconds between same-symbol fetches

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action') || 'quote';
  const symbol = searchParams.get('symbol') || '^NSEI';

  // Rate limiting check
  const cacheKey = `${action}-${symbol}`;
  const lastFetch = lastFetchTime.get(cacheKey) || 0;
  const now = Date.now();

  if (now - lastFetch < MIN_FETCH_INTERVAL) {
    return NextResponse.json(
      { error: 'Rate limited. Please wait a few seconds.' },
      { status: 429 }
    );
  }

  lastFetchTime.set(cacheKey, now);

  try {
    // Get all indices quotes
    if (action === 'all') {
      const quotes = await getAllIndicesQuotes();
      return NextResponse.json({
        success: true,
        data: quotes,
        timestamp: Date.now(),
      });
    }

    // Get single index quote
    if (action === 'quote') {
      const quote = await getRealtimeQuote(symbol);
      if (!quote) {
        return NextResponse.json(
          { error: `Failed to fetch quote for ${symbol}` },
          { status: 500 }
        );
      }
      return NextResponse.json({
        success: true,
        data: quote,
        timestamp: Date.now(),
      });
    }

    // Get intraday data (minute-by-minute)
    if (action === 'intraday') {
      const result = await getIntradayData(symbol);
      if (!result) {
        return NextResponse.json(
          { error: `Failed to fetch intraday data for ${symbol}` },
          { status: 500 }
        );
      }
      return NextResponse.json({
        success: true,
        symbol,
        source: result.source,
        data: result.candles,
        count: result.candles.length,
        timestamp: Date.now(),
      });
    }

    // Get historical OHLC data
    if (action === 'historical') {
      const days = parseInt(searchParams.get('days') || '100');
      const interval = (searchParams.get('interval') || '1d') as '5m' | '15m' | '1d';

      const result = await getHistoricalData(symbol, days, interval);
      if (!result) {
        return NextResponse.json(
          { error: `Failed to fetch historical data for ${symbol}` },
          { status: 500 }
        );
      }
      return NextResponse.json({
        success: true,
        symbol,
        interval,
        source: result.source,
        data: result.data,
        count: result.data.length,
        timestamp: Date.now(),
      });
    }

    return NextResponse.json(
      {
        error: 'Invalid action',
        usage: {
          all: '/api/realtime?action=all',
          quote: '/api/realtime?action=quote&symbol=^NSEI',
          intraday: '/api/realtime?action=intraday&symbol=^NSEI',
          historical: '/api/realtime?action=historical&symbol=^NSEI&days=100&interval=1d',
        },
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Realtime API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
