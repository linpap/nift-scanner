// Monthly Seasonal Analysis API
// 100% DATA-DRIVEN - Analyzes 2 years of historical data

import { NextRequest, NextResponse } from 'next/server';
import { fetchHistoricalData, fetchMultipleStocks } from '@/lib/data-fetcher';
import { SECTORS, getAllSectorStocks, getSector } from '@/lib/sector-stocks';
import {
  analyzeStockPattern,
  analyzeMonth,
  StockMonthlyPattern,
} from '@/lib/month-analysis';

// Cache for historical analysis (valid for 1 hour)
let analysisCache: {
  timestamp: number;
  stockPatterns: Map<string, StockMonthlyPattern>;
  currentPrices: Map<string, number>;
} | null = null;

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// Delay helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get('month');
    const sectorParam = searchParams.get('sector');
    const refreshParam = searchParams.get('refresh');
    const limitParam = searchParams.get('limit');

    // Default to current month
    const now = new Date();
    const month = monthParam ? parseInt(monthParam) : now.getMonth() + 1;
    const year = now.getFullYear();

    if (month < 1 || month > 12) {
      return NextResponse.json({ error: 'Invalid month (1-12)' }, { status: 400 });
    }

    // Check if we need to refresh cache
    const shouldRefresh = refreshParam === 'true' ||
      !analysisCache ||
      Date.now() - analysisCache.timestamp > CACHE_DURATION;

    if (shouldRefresh) {
      console.log('Building monthly analysis cache (data-driven)...');

      // Get all unique stocks from sectors
      const allStocks = getAllSectorStocks();
      const limit = limitParam ? parseInt(limitParam) : allStocks.length;
      const stocksToAnalyze = allStocks.slice(0, limit);

      console.log(`Analyzing ${stocksToAnalyze.length} stocks...`);

      // Fetch historical data for all stocks (2 years)
      const stockPatterns = new Map<string, StockMonthlyPattern>();
      const batchSize = 3;

      for (let i = 0; i < stocksToAnalyze.length; i += batchSize) {
        const batch = stocksToAnalyze.slice(i, i + batchSize);

        const batchResults = await Promise.all(
          batch.map(async (symbol) => {
            try {
              const historical = await fetchHistoricalData(symbol, 730); // 2 years
              if (historical.length >= 200) {
                const pattern = analyzeStockPattern(symbol, historical);
                return { symbol, pattern };
              }
              return { symbol, pattern: null };
            } catch (error) {
              console.log(`Error analyzing ${symbol}:`, error);
              return { symbol, pattern: null };
            }
          })
        );

        batchResults.forEach(({ symbol, pattern }) => {
          if (pattern) {
            stockPatterns.set(symbol, pattern);
          }
        });

        // Progress log
        if ((i + batchSize) % 15 === 0) {
          console.log(`Processed ${Math.min(i + batchSize, stocksToAnalyze.length)}/${stocksToAnalyze.length} stocks`);
        }

        // Delay between batches
        if (i + batchSize < stocksToAnalyze.length) {
          await delay(800);
        }
      }

      // Fetch current prices
      console.log('Fetching current prices...');
      const currentPrices = await fetchMultipleStocks(
        Array.from(stockPatterns.keys()),
        5,
        300
      );

      const priceMap = new Map<string, number>();
      currentPrices.forEach((data, symbol) => {
        priceMap.set(symbol, data.close);
      });

      // Update cache
      analysisCache = {
        timestamp: Date.now(),
        stockPatterns,
        currentPrices: priceMap
      };

      console.log(`Cache built with ${stockPatterns.size} stocks`);
    }

    // Run analysis for requested month
    const result = analyzeMonth(
      month,
      year,
      analysisCache!.stockPatterns,
      analysisCache!.currentPrices
    );

    // Filter by sector if specified
    if (sectorParam) {
      const sector = getSector(sectorParam);
      if (sector) {
        const sectorAnalysis = result.sectors.find(s => s.sector.id === sectorParam);
        if (sectorAnalysis) {
          return NextResponse.json({
            month: result.month,
            monthName: result.monthName,
            year: result.year,
            sector: sectorAnalysis,
            stocks: result.allRecommendations.filter(r => r.sector === sectorParam),
            marketEvents: result.marketEvents
          });
        }
      }
      return NextResponse.json({ error: 'Sector not found' }, { status: 404 });
    }

    // Return full analysis
    return NextResponse.json({
      ...result,
      cacheAge: analysisCache ? Math.round((Date.now() - analysisCache.timestamp) / 1000) : 0,
      totalStocksAnalyzed: analysisCache?.stockPatterns.size || 0
    });

  } catch (error) {
    console.error('Month analysis error:', error);
    return NextResponse.json({
      error: 'Analysis failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST endpoint for specific stocks/sectors analysis
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { month, stocks, sector } = body;

    if (!month || month < 1 || month > 12) {
      return NextResponse.json({ error: 'Valid month (1-12) required' }, { status: 400 });
    }

    // Determine which stocks to analyze
    let stocksToAnalyze: string[] = [];

    if (stocks && Array.isArray(stocks)) {
      stocksToAnalyze = stocks;
    } else if (sector) {
      const sectorInfo = getSector(sector);
      if (sectorInfo) {
        stocksToAnalyze = sectorInfo.stocks;
      }
    }

    if (stocksToAnalyze.length === 0) {
      return NextResponse.json({ error: 'No stocks to analyze' }, { status: 400 });
    }

    // Analyze stocks
    const stockPatterns = new Map<string, StockMonthlyPattern>();
    const priceMap = new Map<string, number>();

    for (const symbol of stocksToAnalyze) {
      try {
        const historical = await fetchHistoricalData(symbol, 730);
        if (historical.length >= 200) {
          const pattern = analyzeStockPattern(symbol, historical);
          if (pattern) {
            stockPatterns.set(symbol, pattern);
            priceMap.set(symbol, historical[historical.length - 1]?.close || 0);
          }
        }
        await delay(500); // Rate limit
      } catch (error) {
        console.log(`Error analyzing ${symbol}:`, error);
      }
    }

    // Run analysis
    const result = analyzeMonth(month, new Date().getFullYear(), stockPatterns, priceMap);

    return NextResponse.json({
      month: result.month,
      monthName: result.monthName,
      recommendations: result.allRecommendations,
      observations: result.keyObservations
    });

  } catch (error) {
    console.error('POST month analysis error:', error);
    return NextResponse.json({
      error: 'Analysis failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
