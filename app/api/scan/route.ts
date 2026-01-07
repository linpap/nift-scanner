// API Route: /api/scan
// Runs the stock scanner and returns matching stocks

import { NextRequest, NextResponse } from 'next/server';
import { FO_STOCKS } from '@/lib/fo-stocks';
import { fetchHistoricalData } from '@/lib/data-fetcher';
import { calculateTechnicalAnalysis, TechnicalAnalysis } from '@/lib/indicators';
import { runScanner, runAllScanners, ScannerType, ScannerResults } from '@/lib/scanner';

// Cache for historical data (in-memory, resets on cold start)
const dataCache = new Map<string, { data: TechnicalAnalysis; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getAnalysisWithCache(symbol: string): Promise<TechnicalAnalysis | null> {
  const cached = dataCache.get(symbol);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const historical = await fetchHistoricalData(symbol, 250);
    if (historical.length < 50) {
      console.warn(`Insufficient data for ${symbol}`);
      return null;
    }

    const analysis = calculateTechnicalAnalysis(symbol, historical);
    if (analysis) {
      dataCache.set(symbol, { data: analysis, timestamp: now });
    }
    return analysis;
  } catch (error) {
    console.error(`Error analyzing ${symbol}:`, error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const scannerType = (searchParams.get('scanner') || 'range_expansion') as ScannerType;
  const stocksParam = searchParams.get('stocks');
  const limit = parseInt(searchParams.get('limit') || '50');

  // Determine which stocks to scan
  let stocksToScan: string[];
  if (stocksParam) {
    stocksToScan = stocksParam.split(',').map(s => s.trim().toUpperCase());
  } else {
    stocksToScan = FO_STOCKS.slice(0, limit);
  }

  const startTime = Date.now();
  const technicalData: TechnicalAnalysis[] = [];
  const errors: string[] = [];

  // Process in batches to avoid overwhelming the API
  const batchSize = 5;
  for (let i = 0; i < stocksToScan.length; i += batchSize) {
    const batch = stocksToScan.slice(i, i + batchSize);

    const results = await Promise.all(
      batch.map(async (symbol) => {
        try {
          return await getAnalysisWithCache(symbol);
        } catch (err) {
          errors.push(`${symbol}: ${err}`);
          return null;
        }
      })
    );

    results.forEach(r => {
      if (r) technicalData.push(r);
    });

    // Small delay between batches
    if (i + batchSize < stocksToScan.length) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  // Debug: Log sample of technical data
  if (technicalData.length > 0) {
    const sample = technicalData[0];
    console.log(`[DEBUG] Sample ${sample.symbol}: close=${sample.close}, prevClose=${sample.previousClose}, ` +
      `change=${((sample.close - sample.previousClose) / sample.previousClose * 100).toFixed(2)}%, ` +
      `RSI=${sample.rsi14?.toFixed(1)}, EMA5=${sample.ema5?.toFixed(2)}, EMA20=${sample.ema20?.toFixed(2)}, ` +
      `macdCrossover=${sample.macdCrossover}`);
  }

  // Run the scanner
  let scannerResults: ScannerResults | Map<ScannerType, ScannerResults>;

  if (scannerType === 'all') {
    scannerResults = runAllScanners(technicalData);
    // Convert Map to object for JSON serialization
    const resultsObj: Record<string, ScannerResults> = {};
    scannerResults.forEach((value, key) => {
      resultsObj[key] = value;
    });

    return NextResponse.json({
      success: true,
      scanners: resultsObj,
      meta: {
        totalStocks: stocksToScan.length,
        analyzedStocks: technicalData.length,
        scanTime: Date.now() - startTime,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } else {
    scannerResults = runScanner(scannerType, technicalData);

    return NextResponse.json({
      success: true,
      ...scannerResults,
      meta: {
        totalStocks: stocksToScan.length,
        analyzedStocks: technicalData.length,
        scanTime: Date.now() - startTime,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  }
}

// POST endpoint for custom stock list
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stocks, scanner = 'range_expansion' } = body;

    if (!stocks || !Array.isArray(stocks)) {
      return NextResponse.json(
        { error: 'stocks array is required' },
        { status: 400 }
      );
    }

    const startTime = Date.now();
    const technicalData: TechnicalAnalysis[] = [];

    for (const symbol of stocks) {
      const analysis = await getAnalysisWithCache(symbol);
      if (analysis) {
        technicalData.push(analysis);
      }
      await new Promise(r => setTimeout(r, 200));
    }

    const results = runScanner(scanner as ScannerType, technicalData);

    return NextResponse.json({
      success: true,
      ...results,
      meta: {
        totalStocks: stocks.length,
        analyzedStocks: technicalData.length,
        scanTime: Date.now() - startTime,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process request', details: String(error) },
      { status: 500 }
    );
  }
}
