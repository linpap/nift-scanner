// API Route: /api/stocks
// Get stock data and technical analysis for individual stocks

import { NextRequest, NextResponse } from 'next/server';
import { FO_STOCKS } from '@/lib/fo-stocks';
import { fetchStockData, fetchHistoricalData } from '@/lib/data-fetcher';
import { calculateTechnicalAnalysis } from '@/lib/indicators';

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

  // Get historical data
  if (action === 'historical' && symbol) {
    try {
      const days = parseInt(searchParams.get('days') || '100');
      const historical = await fetchHistoricalData(symbol.toUpperCase(), days);
      return NextResponse.json({
        success: true,
        symbol: symbol.toUpperCase(),
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
      },
    },
    { status: 400 }
  );
}
