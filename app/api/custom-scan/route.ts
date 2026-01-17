import { NextRequest, NextResponse } from 'next/server';
import { FO_STOCKS } from '@/lib/fo-stocks';

interface FilterCondition {
  indicator: string;
  operator: string;
  value: string;
  value2?: string;
}

interface StockData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  avgVolume: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
}

interface IndicatorData {
  rsi: number;
  ema9: number;
  ema21: number;
  sma50: number;
  sma200: number;
  atr: number;
  volumeRatio: number;
}

// Calculate RSI
function calculateRSI(closes: number[], period: number = 14): number {
  if (closes.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = closes.length - period; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// Calculate EMA
function calculateEMA(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1];

  const multiplier = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < data.length; i++) {
    ema = (data[i] - ema) * multiplier + ema;
  }

  return ema;
}

// Calculate SMA
function calculateSMA(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1];
  return data.slice(-period).reduce((a, b) => a + b, 0) / period;
}

// Calculate ATR
function calculateATR(highs: number[], lows: number[], closes: number[], period: number = 14): number {
  if (highs.length < period + 1) return 0;

  const trs: number[] = [];
  for (let i = 1; i < highs.length; i++) {
    const hl = highs[i] - lows[i];
    const hc = Math.abs(highs[i] - closes[i - 1]);
    const lc = Math.abs(lows[i] - closes[i - 1]);
    trs.push(Math.max(hl, hc, lc));
  }

  return trs.slice(-period).reduce((a, b) => a + b, 0) / period;
}

// Fetch stock data from Yahoo Finance
async function fetchStockData(symbol: string): Promise<{ stock: StockData; indicators: IndicatorData } | null> {
  try {
    const yahooSymbol = `${symbol}.NS`;
    const endDate = Math.floor(Date.now() / 1000);
    const startDate = endDate - (300 * 24 * 60 * 60); // 300 days for SMA200

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?period1=${startDate}&period2=${endDate}&interval=1d`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    const result = data.chart?.result?.[0];

    if (!result || !result.timestamp || result.timestamp.length < 50) return null;

    const quotes = result.indicators.quote[0];
    const closes: number[] = [];
    const highs: number[] = [];
    const lows: number[] = [];
    const volumes: number[] = [];

    for (let i = 0; i < result.timestamp.length; i++) {
      if (quotes.close[i] && quotes.high[i] && quotes.low[i]) {
        closes.push(quotes.close[i]);
        highs.push(quotes.high[i]);
        lows.push(quotes.low[i]);
        volumes.push(quotes.volume[i] || 0);
      }
    }

    if (closes.length < 50) return null;

    const lastIdx = closes.length - 1;
    const price = closes[lastIdx];
    const previousClose = closes[lastIdx - 1];
    const change = price - previousClose;
    const changePercent = (change / previousClose) * 100;

    const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const volumeRatio = avgVolume > 0 ? volumes[lastIdx] / avgVolume : 1;

    const indicators: IndicatorData = {
      rsi: calculateRSI(closes, 14),
      ema9: calculateEMA(closes, 9),
      ema21: calculateEMA(closes, 21),
      sma50: calculateSMA(closes, 50),
      sma200: closes.length >= 200 ? calculateSMA(closes, 200) : calculateSMA(closes, Math.min(closes.length, 50)),
      atr: calculateATR(highs, lows, closes, 14),
      volumeRatio,
    };

    return {
      stock: {
        symbol,
        price,
        change,
        changePercent,
        volume: volumes[lastIdx],
        avgVolume,
        high: highs[lastIdx],
        low: lows[lastIdx],
        open: quotes.open[result.timestamp.length - 1] || price,
        previousClose,
      },
      indicators,
    };
  } catch (error) {
    console.error(`Error fetching ${symbol}:`, error);
    return null;
  }
}

// Check if stock matches a filter condition
function matchesCondition(
  stock: StockData,
  indicators: IndicatorData,
  condition: FilterCondition
): { matches: boolean; description: string } {
  const { indicator, operator, value, value2 } = condition;

  let actualValue: number;
  let compareValue = parseFloat(value);
  let compareValue2 = value2 ? parseFloat(value2) : 0;

  // Get actual value based on indicator
  switch (indicator) {
    case 'rsi':
      actualValue = indicators.rsi;
      break;
    case 'price':
      actualValue = stock.price;
      // Handle price vs indicator comparisons
      if (value === 'sma_200') {
        compareValue = indicators.sma200;
      } else if (value === 'sma_50') {
        compareValue = indicators.sma50;
      } else if (value === 'ema_9') {
        compareValue = indicators.ema9;
      } else if (value === 'ema_21') {
        compareValue = indicators.ema21;
      }
      break;
    case 'change_percent':
      actualValue = stock.changePercent;
      break;
    case 'volume_ratio':
      actualValue = indicators.volumeRatio;
      break;
    case 'ema_9':
      actualValue = indicators.ema9;
      if (value === 'ema_21') compareValue = indicators.ema21;
      break;
    case 'ema_21':
      actualValue = indicators.ema21;
      break;
    case 'sma_50':
      actualValue = indicators.sma50;
      if (value === 'sma_200') compareValue = indicators.sma200;
      break;
    case 'sma_200':
      actualValue = indicators.sma200;
      break;
    case 'atr':
      actualValue = indicators.atr;
      break;
    default:
      return { matches: false, description: '' };
  }

  let matches = false;
  let description = '';

  switch (operator) {
    case 'gt':
      matches = actualValue > compareValue;
      description = `${indicator.toUpperCase()} > ${compareValue.toFixed(1)}`;
      break;
    case 'gte':
      matches = actualValue >= compareValue;
      description = `${indicator.toUpperCase()} >= ${compareValue.toFixed(1)}`;
      break;
    case 'lt':
      matches = actualValue < compareValue;
      description = `${indicator.toUpperCase()} < ${compareValue.toFixed(1)}`;
      break;
    case 'lte':
      matches = actualValue <= compareValue;
      description = `${indicator.toUpperCase()} <= ${compareValue.toFixed(1)}`;
      break;
    case 'eq':
      matches = Math.abs(actualValue - compareValue) < 0.1;
      description = `${indicator.toUpperCase()} = ${compareValue.toFixed(1)}`;
      break;
    case 'between':
      matches = actualValue >= compareValue && actualValue <= compareValue2;
      description = `${indicator.toUpperCase()} ${compareValue.toFixed(1)}-${compareValue2.toFixed(1)}`;
      break;
    case 'crosses_above':
      // Simplified: check if current value is above compare value
      matches = actualValue > compareValue;
      description = `${indicator.toUpperCase()} > ${value}`;
      break;
    case 'crosses_below':
      matches = actualValue < compareValue;
      description = `${indicator.toUpperCase()} < ${value}`;
      break;
  }

  return { matches, description };
}

// Parse filter string to conditions
function parseFilters(filterString: string): FilterCondition[] {
  const conditions: FilterCondition[] = [];
  const filters = filterString.split(',');

  for (const filter of filters) {
    const parts = filter.split(':');
    if (parts.length >= 3) {
      conditions.push({
        indicator: parts[0],
        operator: parts[1],
        value: parts[2],
        value2: parts[3],
      });
    }
  }

  return conditions;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const filtersParam = searchParams.get('filters');
  const limit = parseInt(searchParams.get('limit') || '50');

  if (!filtersParam) {
    return NextResponse.json({
      success: false,
      error: 'No filters provided',
    }, { status: 400 });
  }

  const conditions = parseFilters(filtersParam);

  if (conditions.length === 0) {
    return NextResponse.json({
      success: false,
      error: 'Invalid filter format',
    }, { status: 400 });
  }

  try {
    const stocks = FO_STOCKS.slice(0, limit);
    const results: {
      symbol: string;
      price: number;
      change: number;
      changePercent: number;
      volume: number;
      rsi?: number;
      matchedConditions: string[];
    }[] = [];

    // Process stocks in batches
    const batchSize = 10;
    for (let i = 0; i < stocks.length; i += batchSize) {
      const batch = stocks.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(symbol => fetchStockData(symbol))
      );

      for (const data of batchResults) {
        if (!data) continue;

        const matchedConditions: string[] = [];
        let allMatch = true;

        for (const condition of conditions) {
          const result = matchesCondition(data.stock, data.indicators, condition);
          if (result.matches) {
            matchedConditions.push(result.description);
          } else {
            allMatch = false;
            break;
          }
        }

        if (allMatch && matchedConditions.length === conditions.length) {
          results.push({
            symbol: data.stock.symbol,
            price: data.stock.price,
            change: data.stock.change,
            changePercent: data.stock.changePercent,
            volume: data.stock.volume,
            rsi: data.indicators.rsi,
            matchedConditions,
          });
        }
      }

      // Small delay between batches
      if (i + batchSize < stocks.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return NextResponse.json({
      success: true,
      results,
      totalScanned: stocks.length,
      matchCount: results.length,
      conditions: conditions.length,
    });
  } catch (error) {
    console.error('Custom scan error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to run custom scan',
    }, { status: 500 });
  }
}
