// API Route: /api/cron
// Vercel Cron Job endpoint - runs at 9:30 AM IST
// Configure in vercel.json

import { NextRequest, NextResponse } from 'next/server';
import { FO_STOCKS } from '@/lib/fo-stocks';
import { fetchHistoricalData } from '@/lib/data-fetcher';
import { calculateTechnicalAnalysis, TechnicalAnalysis } from '@/lib/indicators';
import { runAllScanners, ScannerResults, ScannerType } from '@/lib/scanner';

// Store latest results in memory (for demo - use Redis/DB in production)
let latestResults: {
  timestamp: Date;
  scanners: Record<string, ScannerResults>;
} | null = null;

export async function GET(request: NextRequest) {
  // Verify cron secret (optional security)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const technicalData: TechnicalAnalysis[] = [];
  const errors: string[] = [];

  // Scan top 50 F&O stocks
  const stocksToScan = FO_STOCKS.slice(0, 50);

  console.log(`[CRON] Starting scan at ${new Date().toISOString()}`);
  console.log(`[CRON] Scanning ${stocksToScan.length} stocks`);

  // Process in batches
  const batchSize = 5;
  for (let i = 0; i < stocksToScan.length; i += batchSize) {
    const batch = stocksToScan.slice(i, i + batchSize);

    const results = await Promise.all(
      batch.map(async (symbol) => {
        try {
          const historical = await fetchHistoricalData(symbol, 250);
          if (historical.length < 50) {
            console.warn(`[CRON] Insufficient data for ${symbol}`);
            return null;
          }
          return calculateTechnicalAnalysis(symbol, historical);
        } catch (err) {
          errors.push(`${symbol}: ${err}`);
          return null;
        }
      })
    );

    results.forEach(r => {
      if (r) technicalData.push(r);
    });

    // Delay between batches
    if (i + batchSize < stocksToScan.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  // Run all scanners
  const allResults = runAllScanners(technicalData);

  // Convert Map to object
  const resultsObj: Record<string, ScannerResults> = {};
  allResults.forEach((value, key) => {
    resultsObj[key] = value;
  });

  // Store results
  latestResults = {
    timestamp: new Date(),
    scanners: resultsObj,
  };

  const scanTime = Date.now() - startTime;
  console.log(`[CRON] Scan complete in ${scanTime}ms`);
  console.log(`[CRON] Analyzed ${technicalData.length} stocks`);

  // Log summary
  Object.entries(resultsObj).forEach(([scanner, result]) => {
    console.log(`[CRON] ${scanner}: ${result.matchCount} matches`);
  });

  return NextResponse.json({
    success: true,
    message: 'Cron scan completed',
    timestamp: new Date().toISOString(),
    stats: {
      stocksScanned: stocksToScan.length,
      stocksAnalyzed: technicalData.length,
      scanTimeMs: scanTime,
      errors: errors.length,
    },
    summary: Object.entries(resultsObj).map(([scanner, result]) => ({
      scanner,
      matches: result.matchCount,
    })),
  });
}

// Get latest cron results
export async function POST(request: NextRequest) {
  if (!latestResults) {
    return NextResponse.json({
      success: false,
      message: 'No scan results available. Run the cron job first.',
    });
  }

  return NextResponse.json({
    success: true,
    ...latestResults,
  });
}
