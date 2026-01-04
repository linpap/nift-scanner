// Technical Indicators Calculator
// Implements EMA, SMA, RSI, and other indicators needed for the scanner

export interface OHLCV {
  date?: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Simple Moving Average
export function calculateSMA(data: number[], period: number): number[] {
  const result: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      const sum = slice.reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
  }

  return result;
}

// Exponential Moving Average
export function calculateEMA(data: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);

  // Start with SMA for the first EMA value
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else if (i === period - 1) {
      result.push(ema);
    } else {
      ema = (data[i] - ema) * multiplier + ema;
      result.push(ema);
    }
  }

  return result;
}

// Relative Strength Index
export function calculateRSI(data: number[], period: number = 14): number[] {
  const result: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  // Calculate price changes
  for (let i = 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  // First RSI value using SMA
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  result.push(NaN); // First element has no change

  for (let i = 0; i < gains.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else if (i === period - 1) {
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result.push(100 - 100 / (1 + rs));
    } else {
      // Smoothed averages
      avgGain = (avgGain * (period - 1) + gains[i]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result.push(100 - 100 / (1 + rs));
    }
  }

  return result;
}

// Calculate Max (highest value over period)
export function calculateMax(data: number[], period: number): number[] {
  const result: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      result.push(Math.max(...slice));
    }
  }

  return result;
}

// Calculate Min (lowest value over period)
export function calculateMin(data: number[], period: number): number[] {
  const result: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      result.push(Math.min(...slice));
    }
  }

  return result;
}

// Check if value crossed above another value
export function crossedAbove(
  current: number,
  previous: number,
  currentRef: number,
  previousRef: number
): boolean {
  return previous <= previousRef && current > currentRef;
}

// Check if value crossed below another value
export function crossedBelow(
  current: number,
  previous: number,
  currentRef: number,
  previousRef: number
): boolean {
  return previous >= previousRef && current < currentRef;
}

// Calculate daily range (High - Low)
export function calculateDailyRange(candles: OHLCV[]): number[] {
  return candles.map(c => c.high - c.low);
}

// Get latest non-NaN value
export function getLatest(arr: number[]): number {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (!isNaN(arr[i])) return arr[i];
  }
  return NaN;
}

// Get value from n days ago (0 = latest, 1 = yesterday, etc.)
export function getValue(arr: number[], daysAgo: number = 0): number {
  const index = arr.length - 1 - daysAgo;
  if (index < 0 || index >= arr.length) return NaN;
  return arr[index];
}

// Complete technical analysis for a stock
export interface TechnicalAnalysis {
  symbol: string;
  close: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  previousClose: number;
  previousVolume: number;
  ema5: number;
  ema8: number;
  ema20: number;
  ema21: number;
  sma20: number;
  sma50: number;
  sma200: number;
  rsi14: number;
  rsi21: number;
  high20d: number;
  dailyRange: number;
  previousDailyRanges: number[];
  // Weekly/Monthly (approximations from daily)
  weeklyOpen: number;
  weeklyClose: number;
  monthlyOpen: number;
  monthlyClose: number;
}

export function calculateTechnicalAnalysis(
  symbol: string,
  candles: OHLCV[]
): TechnicalAnalysis | null {
  if (candles.length < 200) {
    console.warn(`Insufficient data for ${symbol}: ${candles.length} candles`);
    return null;
  }

  const closes = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const volumes = candles.map(c => c.volume);
  const ranges = calculateDailyRange(candles);

  // Calculate all indicators
  const ema5 = calculateEMA(closes, 5);
  const ema8 = calculateEMA(closes, 8);
  const ema20 = calculateEMA(closes, 20);
  const ema21 = calculateEMA(closes, 21);
  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, 50);
  const sma200 = calculateSMA(closes, 200);
  const rsi14 = calculateRSI(closes, 14);
  const rsi21 = calculateRSI(closes, 21);
  const high20d = calculateMax(closes, 20);
  const volumeSma20 = calculateSMA(volumes, 20);

  const latest = candles[candles.length - 1];
  const previous = candles[candles.length - 2];

  // Approximate weekly (last 5 trading days)
  const weekStart = candles.length >= 5 ? candles[candles.length - 5] : candles[0];

  // Approximate monthly (last 22 trading days)
  const monthStart = candles.length >= 22 ? candles[candles.length - 22] : candles[0];

  return {
    symbol,
    close: latest.close,
    open: latest.open,
    high: latest.high,
    low: latest.low,
    volume: latest.volume,
    previousClose: previous.close,
    previousVolume: previous.volume,
    ema5: getValue(ema5),
    ema8: getValue(ema8),
    ema20: getValue(ema20),
    ema21: getValue(ema21),
    sma20: getValue(sma20),
    sma50: getValue(sma50),
    sma200: getValue(sma200),
    rsi14: getValue(rsi14),
    rsi21: getValue(rsi21),
    high20d: getValue(high20d),
    dailyRange: latest.high - latest.low,
    previousDailyRanges: ranges.slice(-8, -1), // Last 7 days ranges
    weeklyOpen: weekStart.open,
    weeklyClose: latest.close,
    monthlyOpen: monthStart.open,
    monthlyClose: latest.close,
  };
}
