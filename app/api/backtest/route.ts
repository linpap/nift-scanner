import { NextRequest, NextResponse } from 'next/server';

interface OHLCV {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Trade {
  entryDate: string;
  entryPrice: number;
  exitDate: string;
  exitPrice: number;
  type: 'LONG' | 'SHORT';
  pnlPercent: number;
  pnl: number;
}

interface BacktestResult {
  symbol: string;
  strategy: string;
  period: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  trades: Trade[];
  equityCurve: { date: string; value: number }[];
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

// Calculate EMA
function ema(data: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push(data[0]);
    } else if (i < period - 1) {
      // Use SMA for initial values
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

// Calculate ATR
function atr(high: number[], low: number[], close: number[], period: number): number[] {
  const tr: number[] = [];
  for (let i = 0; i < high.length; i++) {
    if (i === 0) {
      tr.push(high[i] - low[i]);
    } else {
      const hl = high[i] - low[i];
      const hc = Math.abs(high[i] - close[i - 1]);
      const lc = Math.abs(low[i] - close[i - 1]);
      tr.push(Math.max(hl, hc, lc));
    }
  }

  // Use RMA (Wilder's smoothing) for ATR
  const result: number[] = [];
  for (let i = 0; i < tr.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else if (i === period - 1) {
      result.push(tr.slice(0, period).reduce((a, b) => a + b, 0) / period);
    } else {
      result.push((result[i - 1] * (period - 1) + tr[i]) / period);
    }
  }
  return result;
}

// Calculate Supertrend
function supertrend(ohlcv: OHLCV[], period: number, multiplier: number): { trend: number[]; direction: ('bullish' | 'bearish')[] } {
  const high = ohlcv.map(d => d.high);
  const low = ohlcv.map(d => d.low);
  const close = ohlcv.map(d => d.close);

  const atrValues = atr(high, low, close, period);
  const hl2 = ohlcv.map(d => (d.high + d.low) / 2);

  const upperBand: number[] = [];
  const lowerBand: number[] = [];
  const superTrend: number[] = [];
  const direction: ('bullish' | 'bearish')[] = [];

  for (let i = 0; i < ohlcv.length; i++) {
    if (isNaN(atrValues[i])) {
      upperBand.push(NaN);
      lowerBand.push(NaN);
      superTrend.push(NaN);
      direction.push('bullish');
      continue;
    }

    const basicUpper = hl2[i] + multiplier * atrValues[i];
    const basicLower = hl2[i] - multiplier * atrValues[i];

    if (i === 0 || isNaN(upperBand[i - 1])) {
      upperBand.push(basicUpper);
      lowerBand.push(basicLower);
      superTrend.push(basicLower);
      direction.push('bullish');
    } else {
      // Upper band
      if (basicUpper < upperBand[i - 1] || close[i - 1] > upperBand[i - 1]) {
        upperBand.push(basicUpper);
      } else {
        upperBand.push(upperBand[i - 1]);
      }

      // Lower band
      if (basicLower > lowerBand[i - 1] || close[i - 1] < lowerBand[i - 1]) {
        lowerBand.push(basicLower);
      } else {
        lowerBand.push(lowerBand[i - 1]);
      }

      // Direction and supertrend
      if (direction[i - 1] === 'bullish') {
        if (close[i] < lowerBand[i]) {
          direction.push('bearish');
          superTrend.push(upperBand[i]);
        } else {
          direction.push('bullish');
          superTrend.push(lowerBand[i]);
        }
      } else {
        if (close[i] > upperBand[i]) {
          direction.push('bullish');
          superTrend.push(lowerBand[i]);
        } else {
          direction.push('bearish');
          superTrend.push(upperBand[i]);
        }
      }
    }
  }

  return { trend: superTrend, direction };
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

// Strategy implementations
function runSupertrendStrategy(ohlcv: OHLCV[]): { buySignals: boolean[]; sellSignals: boolean[] } {
  const st1 = supertrend(ohlcv, 10, 1.0);
  const st2 = supertrend(ohlcv, 11, 2.0);
  const st3 = supertrend(ohlcv, 12, 3.0);

  const buySignals: boolean[] = [];
  const sellSignals: boolean[] = [];

  for (let i = 0; i < ohlcv.length; i++) {
    if (i === 0) {
      buySignals.push(false);
      sellSignals.push(false);
      continue;
    }

    const allBullish = st1.direction[i] === 'bullish' && st2.direction[i] === 'bullish' && st3.direction[i] === 'bullish';
    const allBearish = st1.direction[i] === 'bearish' && st2.direction[i] === 'bearish' && st3.direction[i] === 'bearish';

    const prevAllBullish = st1.direction[i-1] === 'bullish' && st2.direction[i-1] === 'bullish' && st3.direction[i-1] === 'bullish';
    const prevAllBearish = st1.direction[i-1] === 'bearish' && st2.direction[i-1] === 'bearish' && st3.direction[i-1] === 'bearish';

    buySignals.push(allBullish && !prevAllBullish);
    sellSignals.push(allBearish && !prevAllBearish);
  }

  return { buySignals, sellSignals };
}

function runEMACrossoverStrategy(ohlcv: OHLCV[], shortPeriod: number = 9, longPeriod: number = 21): { buySignals: boolean[]; sellSignals: boolean[] } {
  const close = ohlcv.map(d => d.close);
  const shortEma = ema(close, shortPeriod);
  const longEma = ema(close, longPeriod);

  const buySignals: boolean[] = [];
  const sellSignals: boolean[] = [];

  for (let i = 0; i < ohlcv.length; i++) {
    if (i === 0 || isNaN(shortEma[i]) || isNaN(longEma[i])) {
      buySignals.push(false);
      sellSignals.push(false);
      continue;
    }

    const crossAbove = shortEma[i] > longEma[i] && shortEma[i-1] <= longEma[i-1];
    const crossBelow = shortEma[i] < longEma[i] && shortEma[i-1] >= longEma[i-1];

    buySignals.push(crossAbove);
    sellSignals.push(crossBelow);
  }

  return { buySignals, sellSignals };
}

function runRSIStrategy(ohlcv: OHLCV[]): { buySignals: boolean[]; sellSignals: boolean[] } {
  const close = ohlcv.map(d => d.close);
  const rsiValues = rsi(close, 14);

  const buySignals: boolean[] = [];
  const sellSignals: boolean[] = [];

  for (let i = 0; i < ohlcv.length; i++) {
    if (i === 0) {
      buySignals.push(false);
      sellSignals.push(false);
      continue;
    }

    // Buy when RSI crosses above 30 from oversold
    const crossAbove30 = rsiValues[i] > 30 && rsiValues[i-1] <= 30;
    // Sell when RSI crosses below 70 from overbought
    const crossBelow70 = rsiValues[i] < 70 && rsiValues[i-1] >= 70;

    buySignals.push(crossAbove30);
    sellSignals.push(crossBelow70);
  }

  return { buySignals, sellSignals };
}

function runSMACrossoverStrategy(ohlcv: OHLCV[]): { buySignals: boolean[]; sellSignals: boolean[] } {
  const close = ohlcv.map(d => d.close);
  const sma50 = sma(close, 50);
  const sma200 = sma(close, 200);

  const buySignals: boolean[] = [];
  const sellSignals: boolean[] = [];

  for (let i = 0; i < ohlcv.length; i++) {
    if (i === 0 || isNaN(sma50[i]) || isNaN(sma200[i])) {
      buySignals.push(false);
      sellSignals.push(false);
      continue;
    }

    const goldenCross = sma50[i] > sma200[i] && sma50[i-1] <= sma200[i-1];
    const deathCross = sma50[i] < sma200[i] && sma50[i-1] >= sma200[i-1];

    buySignals.push(goldenCross);
    sellSignals.push(deathCross);
  }

  return { buySignals, sellSignals };
}

// Run backtest with signals
function runBacktest(ohlcv: OHLCV[], signals: { buySignals: boolean[]; sellSignals: boolean[] }, initialCapital: number = 100000): { trades: Trade[]; equityCurve: { date: string; value: number }[] } {
  const trades: Trade[] = [];
  const equityCurve: { date: string; value: number }[] = [];

  let position: 'none' | 'long' | 'short' = 'none';
  let entryPrice = 0;
  let entryDate = '';
  let capital = initialCapital;

  for (let i = 0; i < ohlcv.length; i++) {
    const candle = ohlcv[i];

    // Check for entry signals
    if (position === 'none') {
      if (signals.buySignals[i]) {
        position = 'long';
        entryPrice = candle.close;
        entryDate = candle.date;
      } else if (signals.sellSignals[i]) {
        position = 'short';
        entryPrice = candle.close;
        entryDate = candle.date;
      }
    }
    // Check for exit signals
    else if (position === 'long' && signals.sellSignals[i]) {
      const pnlPercent = ((candle.close - entryPrice) / entryPrice) * 100;
      const pnl = capital * (pnlPercent / 100);
      capital += pnl;

      trades.push({
        entryDate,
        entryPrice,
        exitDate: candle.date,
        exitPrice: candle.close,
        type: 'LONG',
        pnlPercent,
        pnl,
      });

      position = 'none';
    }
    else if (position === 'short' && signals.buySignals[i]) {
      const pnlPercent = ((entryPrice - candle.close) / entryPrice) * 100;
      const pnl = capital * (pnlPercent / 100);
      capital += pnl;

      trades.push({
        entryDate,
        entryPrice,
        exitDate: candle.date,
        exitPrice: candle.close,
        type: 'SHORT',
        pnlPercent,
        pnl,
      });

      position = 'none';
    }

    equityCurve.push({
      date: candle.date,
      value: capital,
    });
  }

  return { trades, equityCurve };
}

// Calculate max drawdown
function calculateMaxDrawdown(equityCurve: { date: string; value: number }[]): number {
  let maxDrawdown = 0;
  let peak = equityCurve[0]?.value || 0;

  for (const point of equityCurve) {
    if (point.value > peak) {
      peak = point.value;
    }
    const drawdown = ((peak - point.value) / peak) * 100;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return maxDrawdown;
}

// Fetch historical data from Yahoo Finance
async function fetchHistoricalData(symbol: string, years: number): Promise<OHLCV[]> {
  const endDate = Math.floor(Date.now() / 1000);
  const startDate = endDate - (years * 365 * 24 * 60 * 60);

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
  const symbol = searchParams.get('symbol');
  const strategy = searchParams.get('strategy') || 'supertrend';
  const years = parseInt(searchParams.get('years') || '1');
  const capital = parseInt(searchParams.get('capital') || '100000');

  if (!symbol) {
    return NextResponse.json({ success: false, error: 'Symbol is required' }, { status: 400 });
  }

  if (years < 1 || years > 3) {
    return NextResponse.json({ success: false, error: 'Years must be between 1 and 3' }, { status: 400 });
  }

  try {
    const ohlcv = await fetchHistoricalData(symbol, years);

    if (ohlcv.length < 50) {
      return NextResponse.json({ success: false, error: 'Not enough data for backtest' }, { status: 400 });
    }

    // Run strategy
    let signals: { buySignals: boolean[]; sellSignals: boolean[] };

    switch (strategy) {
      case 'supertrend':
        signals = runSupertrendStrategy(ohlcv);
        break;
      case 'ema_crossover':
        signals = runEMACrossoverStrategy(ohlcv);
        break;
      case 'rsi':
        signals = runRSIStrategy(ohlcv);
        break;
      case 'sma_crossover':
        signals = runSMACrossoverStrategy(ohlcv);
        break;
      default:
        signals = runSupertrendStrategy(ohlcv);
    }

    // Run backtest
    const { trades, equityCurve } = runBacktest(ohlcv, signals, capital);

    // Calculate statistics
    const winningTrades = trades.filter(t => t.pnlPercent > 0);
    const losingTrades = trades.filter(t => t.pnlPercent <= 0);
    const totalReturn = trades.length > 0
      ? ((equityCurve[equityCurve.length - 1].value - capital) / capital) * 100
      : 0;
    const maxDrawdown = calculateMaxDrawdown(equityCurve);

    // Simple Sharpe ratio approximation
    const returns = trades.map(t => t.pnlPercent);
    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const stdDev = returns.length > 1
      ? Math.sqrt(returns.map(r => Math.pow(r - avgReturn, 2)).reduce((a, b) => a + b, 0) / (returns.length - 1))
      : 0;
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

    const result: BacktestResult = {
      symbol,
      strategy,
      period: `${years} year${years > 1 ? 's' : ''}`,
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0,
      totalReturn,
      maxDrawdown,
      sharpeRatio,
      trades: trades.slice(-50), // Last 50 trades
      equityCurve: equityCurve.filter((_, i) => i % Math.max(1, Math.floor(equityCurve.length / 100)) === 0), // Sample 100 points
    };

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Backtest error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to run backtest'
    }, { status: 500 });
  }
}
