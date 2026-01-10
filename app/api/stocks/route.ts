// API Route: /api/stocks
// Get stock data and technical analysis for individual stocks

import { NextRequest, NextResponse } from 'next/server';
import { FO_STOCKS } from '@/lib/fo-stocks';
import { fetchStockData, fetchHistoricalData } from '@/lib/data-fetcher';
import { calculateTechnicalAnalysis } from '@/lib/indicators';

interface IntradayData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Fetch intraday data from Yahoo Finance
async function fetchIntradayData(
  symbol: string,
  interval: '5m' | '15m' = '5m'
): Promise<IntradayData[]> {
  try {
    const yahooSymbol = `${symbol}.NS`;
    // For intraday, we can only get last 7 days for 5m and 60 days for 15m
    const range = interval === '5m' ? '5d' : '60d';
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=${range}&interval=${interval}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`Yahoo Finance API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const result = data?.chart?.result?.[0];

    if (!result || !result.timestamp) {
      return [];
    }

    const timestamps = result.timestamp;
    const quote = result.indicators?.quote?.[0] || {};
    const intradayData: IntradayData[] = [];

    for (let i = 0; i < timestamps.length; i++) {
      if (
        quote.open?.[i] == null ||
        quote.high?.[i] == null ||
        quote.low?.[i] == null ||
        quote.close?.[i] == null
      ) {
        continue;
      }

      intradayData.push({
        date: new Date(timestamps[i] * 1000).toISOString(),
        open: quote.open[i],
        high: quote.high[i],
        low: quote.low[i],
        close: quote.close[i],
        volume: quote.volume?.[i] || 0,
      });
    }

    return intradayData;
  } catch (error) {
    console.error(`Error fetching intraday data for ${symbol}:`, error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const action = searchParams.get('action') || 'quote';

  // List all F&O stocks
  if (action === 'list') {
    return NextResponse.json({
      success: true,
      stocks: FO_STOCKS,
      count: FO_STOCKS.length,
    });
  }

  // Get quote for a specific stock
  if (action === 'quote' && symbol) {
    try {
      const data = await fetchStockData(symbol.toUpperCase());
      if (!data) {
        return NextResponse.json(
          { error: `Stock ${symbol} not found` },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data });
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to fetch stock data', details: String(error) },
        { status: 500 }
      );
    }
  }

  // Get technical analysis for a stock
  if (action === 'analysis' && symbol) {
    try {
      const historical = await fetchHistoricalData(symbol.toUpperCase(), 250);
      if (historical.length < 50) {
        return NextResponse.json(
          { error: `Insufficient historical data for ${symbol}` },
          { status: 400 }
        );
      }

      const analysis = calculateTechnicalAnalysis(symbol.toUpperCase(), historical);
      if (!analysis) {
        return NextResponse.json(
          { error: `Could not calculate analysis for ${symbol}` },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, analysis });
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to calculate analysis', details: String(error) },
        { status: 500 }
      );
    }
  }

  // Get historical data (supports daily and intraday intervals)
  if (action === 'historical' && symbol) {
    try {
      const interval = searchParams.get('interval') || '1d';

      // Handle intraday intervals
      if (interval === '5m' || interval === '15m') {
        const intradayData = await fetchIntradayData(symbol.toUpperCase(), interval);
        return NextResponse.json({
          success: true,
          symbol: symbol.toUpperCase(),
          interval,
          data: intradayData,
          count: intradayData.length,
        });
      }

      // Daily data
      const days = parseInt(searchParams.get('days') || '100');
      const historical = await fetchHistoricalData(symbol.toUpperCase(), days);
      return NextResponse.json({
        success: true,
        symbol: symbol.toUpperCase(),
        interval: '1d',
        data: historical,
        count: historical.length,
      });
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to fetch historical data', details: String(error) },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    {
      error: 'Invalid request',
      usage: {
        list: '/api/stocks?action=list',
        quote: '/api/stocks?action=quote&symbol=RELIANCE',
        analysis: '/api/stocks?action=analysis&symbol=RELIANCE',
        historical: '/api/stocks?action=historical&symbol=RELIANCE&days=100',
        historicalIntraday: '/api/stocks?action=historical&symbol=RELIANCE&interval=5m',
      },
    },
    { status: 400 }
  );
}
