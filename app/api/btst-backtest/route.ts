import { NextRequest, NextResponse } from 'next/server';
import { NIFTY_200 } from '@/lib/nifty100';

interface OHLCV {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface BTSTTrade {
  symbol: string;
  entryDate: string;
  entryPrice: number;
  exitDate: string;
  exitPrice: number;
  pnlPercent: number;
  pnl: number;
  signal: string;
}

interface BTSTStockResult {
  symbol: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgReturn: number;
  totalReturn: number;
  maxWin: number;
  maxLoss: number;
  trades: BTSTTrade[];
}

interface BTSTBacktestResult {
  strategy: string;
  period: string;
  stocksAnalyzed: number;
  stocksWithTrades: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  overallWinRate: number;
  avgReturnPerTrade: number;
  totalReturn: number;
  bestStock: { symbol: string; return: number } | null;
  worstStock: { symbol: string; return: number } | null;
  stockResults: BTSTStockResult[];
  allTrades: BTSTTrade[];
}

// Calculate EMA
function ema(data: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push(data[0]);
    } else if (i < period - 1) {
      const slice = data.slice(0, i + 1);
      result.push(slice.reduce((a, b) => a + b, 0) / slice.length);
    } else if (i === period - 1) {
      const slice = data.slice(0, period);
      result.push(slice.reduce((a, b) => a + b, 0) / period);
    } else {
      result.push((data[i] - result[i - 1]) * multiplier + result[i - 1]);
    }
  }
  return result;
}

// Calculate SMA
function sma(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      result.push(slice.reduce((a, b) => a + b, 0) / period);
    }
  }
  return result;
}

// Calculate RSI
function rsi(close: number[], period: number = 14): number[] {
  const gains: number[] = [];
  const losses: number[] = [];
  const result: number[] = [];

  for (let i = 0; i < close.length; i++) {
    if (i === 0) {
      gains.push(0);
      losses.push(0);
      result.push(50);
      continue;
    }

    const change = close[i] - close[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);

    if (i < period) {
      result.push(50);
      continue;
    }

    const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;

    if (avgLoss === 0) {
      result.push(100);
    } else {
      const rs = avgGain / avgLoss;
      result.push(100 - (100 / (1 + rs)));
    }
  }

  return result;
}

// BTST Strategy Signals
// Entry conditions (based on user's Chartink criteria - daily version):
// 1. Close > EMA(100) - Strong uptrend
// 2. Close > Previous Day High - Breakout
// 3. RSI(14) > 55 - Momentum
// 4. Volume > 2x SMA(10 volume) - Volume spike
// 5. Close > SMA(50) - Above 50 DMA
// 6. Price > 100 - Liquidity filter
function runBTSTStrategy(ohlcv: OHLCV[]): boolean[] {
  const close = ohlcv.map(d => d.close);
  const high = ohlcv.map(d => d.high);
  const volume = ohlcv.map(d => d.volume);

  const ema100 = ema(close, 100);
  const sma50 = sma(close, 50);
  const rsi14 = rsi(close, 14);
  const volumeSma10 = sma(volume, 10);

  const signals: boolean[] = [];

  for (let i = 0; i < ohlcv.length; i++) {
    if (i < 100) {
      signals.push(false);
      continue;
    }

    const prevHigh = high[i - 1];
    const currentClose = close[i];
    const currentVolume = volume[i];

    // BTST Entry Conditions
    const condition1 = currentClose > ema100[i]; // Above EMA 100
    const condition2 = currentClose > prevHigh; // Breakout above previous high
    const condition3 = rsi14[i] > 55; // RSI momentum
    const condition4 = currentVolume > (volumeSma10[i] * 2); // 2x volume spike
    const condition5 = currentClose > sma50[i]; // Above SMA 50
    const condition6 = currentClose > 100; // Price filter

    const allConditionsMet = condition1 && condition2 && condition3 && condition4 && condition5 && condition6;
    signals.push(allConditionsMet);
  }

  return signals;
}

// Run BTST backtest for a single stock
// BTST = Buy at close today, Sell at close tomorrow
function runBTSTBacktest(ohlcv: OHLCV[], symbol: string, capital: number = 100000): BTSTStockResult {
  const signals = runBTSTStrategy(ohlcv);
  const trades: BTSTTrade[] = [];

  for (let i = 0; i < ohlcv.length - 1; i++) {
    if (signals[i]) {
      const entryPrice = ohlcv[i].close;
      const exitPrice = ohlcv[i + 1].close;
      const pnlPercent = ((exitPrice - entryPrice) / entryPrice) * 100;
      const pnl = capital * (pnlPercent / 100);

      trades.push({
        symbol,
        entryDate: ohlcv[i].date,
        entryPrice,
        exitDate: ohlcv[i + 1].date,
        exitPrice,
        pnlPercent,
        pnl,
        signal: 'BTST Breakout'
      });
    }
  }

  const winningTrades = trades.filter(t => t.pnlPercent > 0);
  const losingTrades = trades.filter(t => t.pnlPercent <= 0);
  const totalReturn = trades.reduce((sum, t) => sum + t.pnlPercent, 0);
  const avgReturn = trades.length > 0 ? totalReturn / trades.length : 0;
  const maxWin = trades.length > 0 ? Math.max(...trades.map(t => t.pnlPercent)) : 0;
  const maxLoss = trades.length > 0 ? Math.min(...trades.map(t => t.pnlPercent)) : 0;

  return {
    symbol,
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate: trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0,
    avgReturn,
    totalReturn,
    maxWin,
    maxLoss,
    trades
  };
}

// Fetch historical data from Yahoo Finance
async function fetchHistoricalData(symbol: string, months: number): Promise<OHLCV[]> {
  const endDate = Math.floor(Date.now() / 1000);
  const startDate = endDate - (months * 30 * 24 * 60 * 60);

  const yahooSymbol = symbol.includes('.') ? symbol : `${symbol}.NS`;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?period1=${startDate}&period2=${endDate}&interval=1d`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch data for ${symbol}`);
  }

  const data = await response.json();
  const result = data.chart?.result?.[0];

  if (!result || !result.timestamp) {
    throw new Error(`No data available for ${symbol}`);
  }

  const timestamps = result.timestamp;
  const quotes = result.indicators.quote[0];

  const ohlcv: OHLCV[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    if (quotes.open[i] && quotes.high[i] && quotes.low[i] && quotes.close[i]) {
      ohlcv.push({
        date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
        open: quotes.open[i],
        high: quotes.high[i],
        low: quotes.low[i],
        close: quotes.close[i],
        volume: quotes.volume[i] || 0,
      });
    }
  }

  return ohlcv;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const months = parseInt(searchParams.get('months') || '6');
  const limit = parseInt(searchParams.get('limit') || '100');
  const capital = parseInt(searchParams.get('capital') || '100000');

  if (months < 1 || months > 12) {
    return NextResponse.json({ success: false, error: 'Months must be between 1 and 12' }, { status: 400 });
  }

  try {
    const stocks = NIFTY_200.slice(0, limit);
    const stockResults: BTSTStockResult[] = [];
    const allTrades: BTSTTrade[] = [];
    let processed = 0;
    let failed = 0;

    // Process stocks in batches to avoid rate limiting
    const batchSize = 5;
    for (let i = 0; i < stocks.length; i += batchSize) {
      const batch = stocks.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async (symbol) => {
          try {
            const ohlcv = await fetchHistoricalData(symbol, months + 4); // Extra months for EMA100 warmup
            if (ohlcv.length < 120) {
              return null;
            }
            return runBTSTBacktest(ohlcv, symbol, capital);
          } catch (error) {
            console.error(`Error processing ${symbol}:`, error);
            return null;
          }
        })
      );

      for (const result of batchResults) {
        if (result) {
          stockResults.push(result);
          allTrades.push(...result.trades);
          processed++;
        } else {
          failed++;
        }
      }

      // Small delay between batches
      if (i + batchSize < stocks.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // Sort all trades by date
    allTrades.sort((a, b) => a.entryDate.localeCompare(b.entryDate));

    // Calculate overall statistics
    const stocksWithTrades = stockResults.filter(s => s.totalTrades > 0);
    const totalTrades = allTrades.length;
    const winningTrades = allTrades.filter(t => t.pnlPercent > 0).length;
    const losingTrades = totalTrades - winningTrades;
    const overallWinRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const totalReturn = allTrades.reduce((sum, t) => sum + t.pnlPercent, 0);
    const avgReturnPerTrade = totalTrades > 0 ? totalReturn / totalTrades : 0;

    // Find best and worst stocks
    const sortedByReturn = [...stocksWithTrades].sort((a, b) => b.totalReturn - a.totalReturn);
    const bestStock = sortedByReturn[0] ? { symbol: sortedByReturn[0].symbol, return: sortedByReturn[0].totalReturn } : null;
    const worstStock = sortedByReturn[sortedByReturn.length - 1] ? { symbol: sortedByReturn[sortedByReturn.length - 1].symbol, return: sortedByReturn[sortedByReturn.length - 1].totalReturn } : null;

    const result: BTSTBacktestResult = {
      strategy: 'BTST Breakout (Close>EMA100, Close>PrevHigh, RSI>55, Vol>2xAvg, Close>SMA50, Price>100)',
      period: `${months} months`,
      stocksAnalyzed: processed,
      stocksWithTrades: stocksWithTrades.length,
      totalTrades,
      winningTrades,
      losingTrades,
      overallWinRate,
      avgReturnPerTrade,
      totalReturn,
      bestStock,
      worstStock,
      stockResults: stockResults.sort((a, b) => b.totalReturn - a.totalReturn),
      allTrades: allTrades.slice(-100) // Last 100 trades
    };

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('BTST Backtest error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to run BTST backtest'
    }, { status: 500 });
  }
}
