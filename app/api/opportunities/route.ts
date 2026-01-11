// API Route: /api/opportunities
// Scan NIFTY 200 stocks for buy/sell signals using our indicator logic

import { NextRequest, NextResponse } from 'next/server';
import { FO_STOCKS } from '@/lib/fo-stocks';
import { calculateAllIndicators, type OHLCV } from '@/lib/chart-indicators';

interface Opportunity {
  symbol: string;
  name: string;
  signal: 'buy' | 'sell';
  price: number;
  change: number;
  changePercent: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  strength: number; // Signal strength 1-5
  timestamp: number;
}

interface CachedOpportunities {
  buy: Opportunity[];
  sell: Opportunity[];
  scannedAt: number;
  stocksScanned: number;
}

// In-memory cache for opportunities
let opportunitiesCache: CachedOpportunities | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour cache

// Fetch historical data for a stock
async function fetchStockData(symbol: string): Promise<OHLCV[] | null> {
  try {
    const yahooSymbol = `${symbol}.NS`;
    const period2 = Math.floor(Date.now() / 1000);
    const period1 = period2 - (100 * 24 * 60 * 60); // 100 days

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?period1=${period1}&period2=${period2}&interval=1d`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      cache: 'no-store',
    });

    if (!response.ok) return null;

    const data = await response.json();
    const chart = data.chart?.result?.[0];
    if (!chart) return null;

    const timestamps = chart.timestamp || [];
    const quote = chart.indicators?.quote?.[0] || {};
    const candles: OHLCV[] = [];

    for (let i = 0; i < timestamps.length; i++) {
      if (
        quote.open?.[i] != null &&
        quote.high?.[i] != null &&
        quote.low?.[i] != null &&
        quote.close?.[i] != null
      ) {
        candles.push({
          date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
          open: quote.open[i],
          high: quote.high[i],
          low: quote.low[i],
          close: quote.close[i],
          volume: quote.volume?.[i] || 0,
        });
      }
    }

    return candles;
  } catch (error) {
    console.error(`Error fetching ${symbol}:`, error);
    return null;
  }
}

// Calculate signal strength based on multiple factors
function calculateSignalStrength(
  candles: OHLCV[],
  indicators: ReturnType<typeof calculateAllIndicators>,
  signalType: 'buy' | 'sell'
): number {
  const lastIdx = candles.length - 1;
  let strength = 1;

  const close = candles[lastIdx].close;
  const ema20 = indicators.ema20[lastIdx];
  const ema50 = indicators.ema50[lastIdx];
  const ema200 = indicators.ema200[lastIdx];

  if (signalType === 'buy') {
    // Bullish strength factors
    if (close > ema20) strength++;
    if (close > ema50) strength++;
    if (close > ema200) strength++;
    if (ema20 > ema50) strength++;
  } else {
    // Bearish strength factors
    if (close < ema20) strength++;
    if (close < ema50) strength++;
    if (close < ema200) strength++;
    if (ema20 < ema50) strength++;
  }

  return Math.min(strength, 5);
}

// Scan all stocks for opportunities
async function scanForOpportunities(): Promise<CachedOpportunities> {
  const buyOpportunities: Opportunity[] = [];
  const sellOpportunities: Opportunity[] = [];
  let scannedCount = 0;

  // Process stocks in batches to avoid rate limiting
  const batchSize = 10;
  const stocks = FO_STOCKS;

  for (let i = 0; i < stocks.length; i += batchSize) {
    const batch = stocks.slice(i, i + batchSize);

    const promises = batch.map(async (symbol) => {
      try {
        const candles = await fetchStockData(symbol);
        if (!candles || candles.length < 50) return null;

        const indicators = calculateAllIndicators(candles);
        const lastIdx = candles.length - 1;

        // Check for recent signals (last 3 days)
        for (let j = Math.max(0, lastIdx - 2); j <= lastIdx; j++) {
          const isBuySignal = indicators.buySignals[j];
          const isSellSignal = indicators.sellSignals[j];

          if (isBuySignal || isSellSignal) {
            const signalType = isBuySignal ? 'buy' : 'sell';
            const strength = calculateSignalStrength(candles, indicators, signalType);

            const latest = candles[lastIdx];
            const previous = candles[lastIdx - 1];
            const change = latest.close - previous.close;
            const changePercent = (change / previous.close) * 100;

            return {
              symbol,
              name: symbol,
              signal: signalType as 'buy' | 'sell',
              price: latest.close,
              change,
              changePercent,
              trend: indicators.hybridDirection[lastIdx],
              strength,
              timestamp: Date.now(),
              signalDay: j === lastIdx ? 0 : lastIdx - j, // 0 = today, 1 = yesterday, etc.
            };
          }
        }

        return null;
      } catch (error) {
        console.error(`Error processing ${symbol}:`, error);
        return null;
      }
    });

    const results = await Promise.all(promises);

    for (const result of results) {
      if (result) {
        scannedCount++;
        if (result.signal === 'buy') {
          buyOpportunities.push(result);
        } else {
          sellOpportunities.push(result);
        }
      }
    }

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < stocks.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Sort by strength (highest first), then by signal recency
  buyOpportunities.sort((a, b) => b.strength - a.strength || a.timestamp - b.timestamp);
  sellOpportunities.sort((a, b) => b.strength - a.strength || a.timestamp - b.timestamp);

  return {
    buy: buyOpportunities.slice(0, 10), // Top 10 buy signals
    sell: sellOpportunities.slice(0, 10), // Top 10 sell signals
    scannedAt: Date.now(),
    stocksScanned: stocks.length,
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const refresh = searchParams.get('refresh') === 'true';
  const limit = parseInt(searchParams.get('limit') || '5');

  try {
    // Check cache
    if (!refresh && opportunitiesCache && Date.now() - opportunitiesCache.scannedAt < CACHE_TTL) {
      return NextResponse.json({
        success: true,
        data: {
          buy: opportunitiesCache.buy.slice(0, limit),
          sell: opportunitiesCache.sell.slice(0, limit),
        },
        scannedAt: opportunitiesCache.scannedAt,
        stocksScanned: opportunitiesCache.stocksScanned,
        cached: true,
        timestamp: Date.now(),
      });
    }

    // Scan for new opportunities
    console.log('Scanning for opportunities...');
    opportunitiesCache = await scanForOpportunities();

    return NextResponse.json({
      success: true,
      data: {
        buy: opportunitiesCache.buy.slice(0, limit),
        sell: opportunitiesCache.sell.slice(0, limit),
      },
      scannedAt: opportunitiesCache.scannedAt,
      stocksScanned: opportunitiesCache.stocksScanned,
      cached: false,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Opportunities scan error:', error);
    return NextResponse.json(
      { error: 'Failed to scan for opportunities', details: String(error) },
      { status: 500 }
    );
  }
}

// POST endpoint for cron job to trigger refresh
export async function POST(request: NextRequest) {
  // Verify cron secret if configured
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('Cron triggered: Scanning for opportunities...');
    opportunitiesCache = await scanForOpportunities();

    return NextResponse.json({
      success: true,
      message: 'Opportunities scan completed',
      buySignals: opportunitiesCache.buy.length,
      sellSignals: opportunitiesCache.sell.length,
      stocksScanned: opportunitiesCache.stocksScanned,
      scannedAt: opportunitiesCache.scannedAt,
    });
  } catch (error) {
    console.error('Cron scan error:', error);
    return NextResponse.json(
      { error: 'Scan failed', details: String(error) },
      { status: 500 }
    );
  }
}
