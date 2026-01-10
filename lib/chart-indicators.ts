// Chart Indicators Library
// Implements EMA, ATR, Supertrend, and Hybrid Signal calculations

export interface OHLCV {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorData {
  ema20: number[];
  ema50: number[];
  ema200: number[];
  cloudEma: number[];
  hybridLine: number[];
  hybridDirection: ('bullish' | 'bearish' | 'neutral')[];
  buySignals: boolean[];
  sellSignals: boolean[];
  trendState: number[]; // 1 = bullish, -1 = bearish, 0 = neutral
}

// Calculate EMA
export function calculateEMA(data: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      ema.push(NaN);
    } else if (i === period - 1) {
      // First EMA is SMA
      const sma = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
      ema.push(sma);
    } else {
      const prevEma = ema[i - 1];
      const newEma = (data[i] - prevEma) * multiplier + prevEma;
      ema.push(newEma);
    }
  }

  return ema;
}

// Calculate True Range
function calculateTR(high: number, low: number, prevClose: number): number {
  return Math.max(
    high - low,
    Math.abs(high - prevClose),
    Math.abs(low - prevClose)
  );
}

// Calculate ATR
export function calculateATR(candles: OHLCV[], period: number): number[] {
  const atr: number[] = [];
  const tr: number[] = [];

  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      tr.push(candles[i].high - candles[i].low);
    } else {
      tr.push(calculateTR(candles[i].high, candles[i].low, candles[i - 1].close));
    }
  }

  // Calculate ATR using Wilder's smoothing
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      atr.push(NaN);
    } else if (i === period - 1) {
      const sum = tr.slice(0, period).reduce((a, b) => a + b, 0);
      atr.push(sum / period);
    } else {
      const prevAtr = atr[i - 1];
      const newAtr = (prevAtr * (period - 1) + tr[i]) / period;
      atr.push(newAtr);
    }
  }

  return atr;
}

// Calculate Supertrend
export function calculateSupertrend(
  candles: OHLCV[],
  factor: number,
  atrPeriod: number
): { value: number[]; direction: number[] } {
  const atr = calculateATR(candles, atrPeriod);
  const supertrend: number[] = [];
  const direction: number[] = []; // 1 = bearish (below price), -1 = bullish (above price)

  let prevUpperBand = 0;
  let prevLowerBand = 0;
  let prevSupertrend = 0;
  let prevDirection = 1;

  for (let i = 0; i < candles.length; i++) {
    if (isNaN(atr[i])) {
      supertrend.push(NaN);
      direction.push(0);
      continue;
    }

    const hl2 = (candles[i].high + candles[i].low) / 2;
    const basicUpperBand = hl2 + factor * atr[i];
    const basicLowerBand = hl2 - factor * atr[i];

    // Upper band
    let upperBand = basicUpperBand;
    if (i > 0 && !isNaN(prevUpperBand)) {
      upperBand = basicUpperBand < prevUpperBand || candles[i - 1].close > prevUpperBand
        ? basicUpperBand
        : prevUpperBand;
    }

    // Lower band
    let lowerBand = basicLowerBand;
    if (i > 0 && !isNaN(prevLowerBand)) {
      lowerBand = basicLowerBand > prevLowerBand || candles[i - 1].close < prevLowerBand
        ? basicLowerBand
        : prevLowerBand;
    }

    // Supertrend value and direction
    let st: number;
    let dir: number;

    if (i === 0 || isNaN(prevSupertrend)) {
      st = upperBand;
      dir = 1;
    } else if (prevSupertrend === prevUpperBand) {
      st = candles[i].close > upperBand ? lowerBand : upperBand;
      dir = candles[i].close > upperBand ? -1 : 1;
    } else {
      st = candles[i].close < lowerBand ? upperBand : lowerBand;
      dir = candles[i].close < lowerBand ? 1 : -1;
    }

    supertrend.push(st);
    direction.push(dir);

    prevUpperBand = upperBand;
    prevLowerBand = lowerBand;
    prevSupertrend = st;
    prevDirection = dir;
  }

  return { value: supertrend, direction };
}

// Calculate Zero Lag EMA (for trend dashboard)
export function calculateZLEMA(data: number[], period: number): number[] {
  const lag = Math.floor((period - 1) / 2);
  const adjustedData: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < lag) {
      adjustedData.push(data[i]);
    } else {
      adjustedData.push(data[i] + (data[i] - data[i - lag]));
    }
  }

  return calculateEMA(adjustedData, period);
}

// Calculate highest value over period
function highest(data: number[], period: number, index: number): number {
  const start = Math.max(0, index - period + 1);
  let max = data[start];
  for (let i = start; i <= index; i++) {
    if (!isNaN(data[i]) && data[i] > max) {
      max = data[i];
    }
  }
  return max;
}

// Calculate all indicators for a stock
export function calculateAllIndicators(candles: OHLCV[]): IndicatorData {
  if (candles.length < 200) {
    // Return empty arrays if not enough data
    const emptyArray = new Array(candles.length).fill(NaN);
    return {
      ema20: emptyArray,
      ema50: emptyArray,
      ema200: emptyArray,
      cloudEma: emptyArray,
      hybridLine: emptyArray,
      hybridDirection: new Array(candles.length).fill('neutral'),
      buySignals: new Array(candles.length).fill(false),
      sellSignals: new Array(candles.length).fill(false),
      trendState: new Array(candles.length).fill(0),
    };
  }

  const closes = candles.map(c => c.close);

  // EMAs
  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  const ema200 = calculateEMA(closes, 200);
  const cloudEma = ema200; // Using same as EMA200

  // Supertrend calculations (Fast, Medium, Slow)
  const st1 = calculateSupertrend(candles, 1.0, 1);  // Fast
  const st2 = calculateSupertrend(candles, 2.0, 2);  // Medium
  const st3 = calculateSupertrend(candles, 3.0, 3);  // Slow

  // Hybrid line (average of 3 supertrends)
  const hybridLine: number[] = [];
  const hybridDirection: ('bullish' | 'bearish' | 'neutral')[] = [];
  const buySignals: boolean[] = [];
  const sellSignals: boolean[] = [];

  for (let i = 0; i < candles.length; i++) {
    // Hybrid value
    if (isNaN(st1.value[i]) || isNaN(st2.value[i]) || isNaN(st3.value[i])) {
      hybridLine.push(NaN);
      hybridDirection.push('neutral');
      buySignals.push(false);
      sellSignals.push(false);
      continue;
    }

    hybridLine.push((st1.value[i] + st2.value[i] + st3.value[i]) / 3);

    // Direction: bullish when all 3 supertrends are bullish (dir < 0)
    const isBullish = st1.direction[i] < 0 && st2.direction[i] < 0 && st3.direction[i] < 0;
    const isBearish = st1.direction[i] > 0 && st2.direction[i] > 0 && st3.direction[i] > 0;

    hybridDirection.push(isBullish ? 'bullish' : isBearish ? 'bearish' : 'neutral');

    // Buy signal: transition to bullish + price above EMAs
    const wasBullish = i > 0 && st1.direction[i - 1] < 0 && st2.direction[i - 1] < 0 && st3.direction[i - 1] < 0;
    const buySignal = isBullish && !wasBullish &&
                      closes[i] > ema200[i] &&
                      closes[i] > ema50[i];

    // Sell signal: transition to bearish + price below EMAs
    const wasBearish = i > 0 && st1.direction[i - 1] > 0 && st2.direction[i - 1] > 0 && st3.direction[i - 1] > 0;
    const sellSignal = isBearish && !wasBearish &&
                       closes[i] < ema200[i] &&
                       closes[i] < ema50[i];

    buySignals.push(buySignal);
    sellSignals.push(sellSignal);
  }

  // Trend state calculation (for dashboard)
  const dashLen = 70;
  const dashMult = 1.2;
  const zlema = calculateZLEMA(closes, dashLen);
  const atr = calculateATR(candles, dashLen);

  const trendState: number[] = [];
  let currentTrend = 0;

  for (let i = 0; i < candles.length; i++) {
    if (isNaN(zlema[i]) || isNaN(atr[i])) {
      trendState.push(0);
      continue;
    }

    const vol = highest(atr, dashLen * 3, i) * dashMult;
    const upperBand = zlema[i] + vol;
    const lowerBand = zlema[i] - vol;

    // Crossover detection
    if (i > 0 && closes[i] > upperBand && closes[i - 1] <= (zlema[i - 1] + vol)) {
      currentTrend = 1;
    } else if (i > 0 && closes[i] < lowerBand && closes[i - 1] >= (zlema[i - 1] - vol)) {
      currentTrend = -1;
    }

    trendState.push(currentTrend);
  }

  return {
    ema20,
    ema50,
    ema200,
    cloudEma,
    hybridLine,
    hybridDirection,
    buySignals,
    sellSignals,
    trendState,
  };
}

// Calculate indicators for multiple timeframes
export interface MTFTrendData {
  tf5m: 'bullish' | 'bearish' | 'neutral';
  tf15m: 'bullish' | 'bearish' | 'neutral';
  tf1h: 'bullish' | 'bearish' | 'neutral';
  tf4h: 'bullish' | 'bearish' | 'neutral';
  tf1d: 'bullish' | 'bearish' | 'neutral';
}

export function getTrendFromState(state: number): 'bullish' | 'bearish' | 'neutral' {
  if (state > 0) return 'bullish';
  if (state < 0) return 'bearish';
  return 'neutral';
}
