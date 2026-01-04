// Scanner Logic - Replicates the Chartink scanner from the screenshot
// Matches the exact conditions shown in the image

import { TechnicalAnalysis } from './indicators';

export interface ScanResult {
  symbol: string;
  name?: string;
  close: number;
  change: number;
  changePercent: number;
  volume: number;
  avgVolume: number;
  volumeRatio: number; // e.g., 1.5 = 50% above average
  rsi: number;
  reason: string[];
  score: number; // Higher = more conditions met
}

// Scanner condition type
type ScanCondition = (ta: TechnicalAnalysis) => { pass: boolean; reason?: string };

// ============================================
// SCANNER 1: Range Expansion + Trend Scanner
// (Based on your screenshot)
// ============================================

export function rangeExpansionScanner(ta: TechnicalAnalysis): ScanResult | null {
  const reasons: string[] = [];
  let score = 0;

  // Condition 1-7: Daily range > Previous days ranges (expanding volatility)
  const currentRange = ta.dailyRange;
  const prevRanges = ta.previousDailyRanges;

  let rangeExpansionCount = 0;
  for (let i = 0; i < Math.min(7, prevRanges.length); i++) {
    if (currentRange > prevRanges[prevRanges.length - 1 - i]) {
      rangeExpansionCount++;
    }
  }

  if (rangeExpansionCount < 5) {
    return null; // Need at least 5 days of range expansion
  }
  reasons.push(`Range expanding (${rangeExpansionCount}/7 days)`);
  score += rangeExpansionCount;

  // Condition: Daily Close > Daily Open (bullish candle)
  if (ta.close <= ta.open) {
    return null;
  }
  reasons.push('Bullish candle (Close > Open)');
  score += 1;

  // Condition: Daily Close > Previous Day Close
  if (ta.close <= ta.previousClose) {
    return null;
  }
  reasons.push('Higher close vs yesterday');
  score += 1;

  // Condition: Weekly Close > Weekly Open (bullish week)
  if (ta.weeklyClose <= ta.weeklyOpen) {
    return null;
  }
  reasons.push('Bullish weekly trend');
  score += 1;

  // Condition: Monthly Close > Monthly Open (bullish month)
  if (ta.monthlyClose <= ta.monthlyOpen) {
    return null;
  }
  reasons.push('Bullish monthly trend');
  score += 1;

  // Condition: Volume > 10000
  if (ta.volume < 10000) {
    return null;
  }
  reasons.push(`Volume: ${(ta.volume / 1000).toFixed(0)}K`);
  score += 1;

  // Condition: SMA 20 > SMA 50
  if (ta.sma20 <= ta.sma50) {
    return null;
  }
  reasons.push('SMA20 > SMA50 (short-term trend up)');
  score += 2;

  // Condition: SMA 50 > SMA 200
  if (ta.sma50 <= ta.sma200) {
    return null;
  }
  reasons.push('SMA50 > SMA200 (long-term trend up)');
  score += 2;

  return {
    symbol: ta.symbol,
    close: ta.close,
    change: ta.close - ta.previousClose,
    changePercent: ((ta.close - ta.previousClose) / ta.previousClose) * 100,
    volume: ta.volume,
    avgVolume: ta.avgVolume20,
    volumeRatio: ta.volumeRatio,
    rsi: ta.rsi14,
    reason: reasons,
    score,
  };
}

// ============================================
// SCANNER 2: 5/20 EMA Crossover Scanner
// ============================================

export function emaCrossoverScanner(ta: TechnicalAnalysis): ScanResult | null {
  const reasons: string[] = [];
  let score = 0;

  // EMA 5 > EMA 20 (bullish)
  if (ta.ema5 <= ta.ema20) {
    return null;
  }
  reasons.push('EMA5 > EMA20');
  score += 2;

  // RSI > 50 (bullish momentum)
  if (ta.rsi14 <= 50) {
    return null;
  }
  reasons.push(`RSI: ${ta.rsi14.toFixed(1)}`);
  score += 1;

  // RSI < 70 (not overbought)
  if (ta.rsi14 >= 70) {
    return null;
  }
  reasons.push('Not overbought');
  score += 1;

  // Volume > Previous day volume
  if (ta.volume <= ta.previousVolume) {
    return null;
  }
  reasons.push('Volume increasing');
  score += 1;

  // Close > 50 (filter penny stocks)
  if (ta.close < 50) {
    return null;
  }
  score += 1;

  return {
    symbol: ta.symbol,
    close: ta.close,
    change: ta.close - ta.previousClose,
    changePercent: ((ta.close - ta.previousClose) / ta.previousClose) * 100,
    volume: ta.volume,
    avgVolume: ta.avgVolume20,
    volumeRatio: ta.volumeRatio,
    rsi: ta.rsi14,
    reason: reasons,
    score,
  };
}

// ============================================
// SCANNER 3: 20-Day Breakout Scanner
// ============================================

export function breakoutScanner(ta: TechnicalAnalysis): ScanResult | null {
  const reasons: string[] = [];
  let score = 0;

  // Close at or near 20-day high
  if (ta.close < ta.high20d * 0.98) {
    return null;
  }
  reasons.push('At 20-day high');
  score += 3;

  // RSI between 55-75 (momentum but not overbought)
  if (ta.rsi14 < 55 || ta.rsi14 > 75) {
    return null;
  }
  reasons.push(`RSI: ${ta.rsi14.toFixed(1)}`);
  score += 1;

  // Volume spike (> 1.5x average)
  // Approximating with previous day comparison
  if (ta.volume < ta.previousVolume * 1.3) {
    return null;
  }
  reasons.push('Volume spike');
  score += 2;

  // Close > SMA 200 (long-term bullish)
  if (ta.close <= ta.sma200) {
    return null;
  }
  reasons.push('Above 200 SMA');
  score += 1;

  // Close > 100
  if (ta.close < 100) {
    return null;
  }
  score += 1;

  return {
    symbol: ta.symbol,
    close: ta.close,
    change: ta.close - ta.previousClose,
    changePercent: ((ta.close - ta.previousClose) / ta.previousClose) * 100,
    volume: ta.volume,
    avgVolume: ta.avgVolume20,
    volumeRatio: ta.volumeRatio,
    rsi: ta.rsi14,
    reason: reasons,
    score,
  };
}

// ============================================
// SCANNER 4: EMA 8/21 with RSI (from screenshot)
// ============================================

export function ema8_21Scanner(ta: TechnicalAnalysis): ScanResult | null {
  const reasons: string[] = [];
  let score = 0;

  // EMA 8 > EMA 21
  if (ta.ema8 <= ta.ema21) {
    return null;
  }
  reasons.push('EMA8 > EMA21');
  score += 2;

  // RSI 21 > 50
  if (ta.rsi21 <= 50) {
    return null;
  }
  reasons.push(`RSI21: ${ta.rsi21.toFixed(1)} > 50`);
  score += 1;

  // Volume > Previous day volume
  if (ta.volume <= ta.previousVolume) {
    return null;
  }
  reasons.push('Volume increasing');
  score += 1;

  // Close > Previous day High (breakout)
  if (ta.close <= ta.previousClose) {
    return null;
  }
  reasons.push('Close > Prev Close');
  score += 1;

  return {
    symbol: ta.symbol,
    close: ta.close,
    change: ta.close - ta.previousClose,
    changePercent: ((ta.close - ta.previousClose) / ta.previousClose) * 100,
    volume: ta.volume,
    avgVolume: ta.avgVolume20,
    volumeRatio: ta.volumeRatio,
    rsi: ta.rsi21,
    reason: reasons,
    score,
  };
}

// ============================================
// SCANNER 5: Range Expansion v2 (Exact Chartink Match)
// From user's screenshot - stricter version with all 7 days
// ============================================

export function rangeExpansionV2Scanner(ta: TechnicalAnalysis): ScanResult | null {
  const reasons: string[] = [];
  let score = 0;

  // Condition 1-7: Today's range > ALL previous 7 days' ranges
  // (Daily High - Daily Low) > (N days ago High - N days ago Low) for N=1 to 7
  const currentRange = ta.dailyRange;
  const prevRanges = ta.previousDailyRanges;

  // Must have at least 7 days of data
  if (prevRanges.length < 7) {
    return null;
  }

  // Check ALL 7 days - must expand beyond each one
  let allDaysExpanded = true;
  for (let i = 0; i < 7; i++) {
    const prevRange = prevRanges[prevRanges.length - 1 - i];
    if (currentRange <= prevRange) {
      allDaysExpanded = false;
      break;
    }
  }

  if (!allDaysExpanded) {
    return null;
  }
  reasons.push('Range > Last 7 days ranges');
  score += 7;

  // Condition: Daily Close > Daily Open (bullish candle)
  if (ta.close <= ta.open) {
    return null;
  }
  reasons.push('Bullish candle');
  score += 1;

  // Condition: Daily Close > 1 day ago Close
  if (ta.close <= ta.previousClose) {
    return null;
  }
  reasons.push('Close > Prev Close');
  score += 1;

  // Condition: Weekly Close > Weekly Open
  if (ta.weeklyClose <= ta.weeklyOpen) {
    return null;
  }
  reasons.push('Weekly bullish');
  score += 1;

  // Condition: Monthly Close > Monthly Open
  if (ta.monthlyClose <= ta.monthlyOpen) {
    return null;
  }
  reasons.push('Monthly bullish');
  score += 1;

  // Condition: 1 day ago Volume > 10000
  if (ta.previousVolume < 10000) {
    return null;
  }
  reasons.push(`Vol: ${(ta.volume / 1000).toFixed(0)}K`);
  score += 1;

  // Condition: SMA(close, 20) > SMA(close, 50)
  if (ta.sma20 <= ta.sma50) {
    return null;
  }
  reasons.push('SMA20 > SMA50');
  score += 2;

  // Condition: SMA(close, 50) > SMA(close, 200)
  if (ta.sma50 <= ta.sma200) {
    return null;
  }
  reasons.push('SMA50 > SMA200');
  score += 2;

  return {
    symbol: ta.symbol,
    close: ta.close,
    change: ta.close - ta.previousClose,
    changePercent: ((ta.close - ta.previousClose) / ta.previousClose) * 100,
    volume: ta.volume,
    avgVolume: ta.avgVolume20,
    volumeRatio: ta.volumeRatio,
    rsi: ta.rsi14,
    reason: reasons,
    score,
  };
}

// ============================================
// SCANNER 6: Gap-Up Momentum (Intraday 9:30 AM)
// Finds stocks gapping up with strong momentum
// ============================================

export function gapUpScanner(ta: TechnicalAnalysis): ScanResult | null {
  const reasons: string[] = [];
  let score = 0;

  // Calculate gap percentage (Open vs Previous Close)
  const gapPercent = ((ta.open - ta.previousClose) / ta.previousClose) * 100;

  // Condition: Gap up at least 1% (but not more than 5% to avoid crazy gaps)
  if (gapPercent < 1 || gapPercent > 5) {
    return null;
  }
  reasons.push(`Gap +${gapPercent.toFixed(1)}%`);
  score += Math.round(gapPercent * 2);

  // Condition: Currently trading above open (gap holding)
  if (ta.close < ta.open) {
    return null;
  }
  reasons.push('Gap holding');
  score += 2;

  // Condition: Volume > 1.2x average (interest in the stock)
  if (ta.volumeRatio < 1.2) {
    return null;
  }
  reasons.push(`Vol ${ta.volumeRatio.toFixed(1)}x avg`);
  score += Math.round(ta.volumeRatio);

  // Condition: RSI not overbought (< 75)
  if (ta.rsi14 > 75) {
    return null;
  }
  reasons.push(`RSI ${ta.rsi14.toFixed(0)}`);
  score += 1;

  // Condition: Above 20 SMA (short-term trend up)
  if (ta.close < ta.sma20) {
    return null;
  }
  reasons.push('Above SMA20');
  score += 1;

  // Condition: Price > 100 (avoid penny stocks)
  if (ta.close < 100) {
    return null;
  }

  return {
    symbol: ta.symbol,
    close: ta.close,
    change: ta.close - ta.previousClose,
    changePercent: ((ta.close - ta.previousClose) / ta.previousClose) * 100,
    volume: ta.volume,
    avgVolume: ta.avgVolume20,
    volumeRatio: ta.volumeRatio,
    rsi: ta.rsi14,
    reason: reasons,
    score,
  };
}

// ============================================
// SCANNER 7: Gap-Down Reversal (Intraday 9:30 AM)
// Finds stocks gapping down but showing recovery
// ============================================

export function gapDownReversalScanner(ta: TechnicalAnalysis): ScanResult | null {
  const reasons: string[] = [];
  let score = 0;

  // Calculate gap percentage
  const gapPercent = ((ta.open - ta.previousClose) / ta.previousClose) * 100;

  // Condition: Gap down at least 1% (but not more than 5%)
  if (gapPercent > -1 || gapPercent < -5) {
    return null;
  }
  reasons.push(`Gap ${gapPercent.toFixed(1)}%`);
  score += Math.abs(Math.round(gapPercent));

  // Condition: Currently trading above open (reversal/recovery)
  if (ta.close <= ta.open) {
    return null;
  }
  const recoveryPercent = ((ta.close - ta.open) / ta.open) * 100;
  reasons.push(`Recovery +${recoveryPercent.toFixed(1)}%`);
  score += Math.round(recoveryPercent * 2);

  // Condition: Volume spike (> 1.5x average)
  if (ta.volumeRatio < 1.5) {
    return null;
  }
  reasons.push(`Vol ${ta.volumeRatio.toFixed(1)}x`);
  score += Math.round(ta.volumeRatio);

  // Condition: RSI not oversold (> 30) - already bouncing
  if (ta.rsi14 < 25) {
    return null;
  }
  reasons.push(`RSI ${ta.rsi14.toFixed(0)}`);
  score += 1;

  // Condition: Price > 100
  if (ta.close < 100) {
    return null;
  }

  return {
    symbol: ta.symbol,
    close: ta.close,
    change: ta.close - ta.previousClose,
    changePercent: ((ta.close - ta.previousClose) / ta.previousClose) * 100,
    volume: ta.volume,
    avgVolume: ta.avgVolume20,
    volumeRatio: ta.volumeRatio,
    rsi: ta.rsi14,
    reason: reasons,
    score,
  };
}

// ============================================
// SCANNER 8: Intraday Momentum (9:30 AM)
// High volume + price momentum for quick trades
// ============================================

export function intradayMomentumScanner(ta: TechnicalAnalysis): ScanResult | null {
  const reasons: string[] = [];
  let score = 0;

  // Condition: Positive change today
  const changePercent = ((ta.close - ta.previousClose) / ta.previousClose) * 100;
  if (changePercent < 0.5) {
    return null;
  }
  reasons.push(`+${changePercent.toFixed(1)}%`);
  score += Math.round(changePercent * 2);

  // Condition: High volume (> 1.5x average)
  if (ta.volumeRatio < 1.5) {
    return null;
  }
  reasons.push(`Vol ${ta.volumeRatio.toFixed(1)}x`);
  score += Math.round(ta.volumeRatio * 2);

  // Condition: Bullish candle (close > open)
  if (ta.close <= ta.open) {
    return null;
  }
  reasons.push('Bullish');
  score += 1;

  // Condition: Close near high of day (within 1% of high)
  const nearHigh = (ta.high - ta.close) / ta.close * 100;
  if (nearHigh > 1) {
    return null;
  }
  reasons.push('Near HOD');
  score += 2;

  // Condition: RSI between 50-70 (momentum but not overbought)
  if (ta.rsi14 < 50 || ta.rsi14 > 70) {
    return null;
  }
  reasons.push(`RSI ${ta.rsi14.toFixed(0)}`);
  score += 1;

  // Condition: EMA 8 > EMA 21 (short-term uptrend)
  if (ta.ema8 <= ta.ema21) {
    return null;
  }
  reasons.push('EMA8>21');
  score += 2;

  // Condition: Price > 100
  if (ta.close < 100) {
    return null;
  }

  return {
    symbol: ta.symbol,
    close: ta.close,
    change: ta.close - ta.previousClose,
    changePercent,
    volume: ta.volume,
    avgVolume: ta.avgVolume20,
    volumeRatio: ta.volumeRatio,
    rsi: ta.rsi14,
    reason: reasons,
    score,
  };
}

// ============================================
// Master Scanner - Run all scanners
// ============================================

export type ScannerType = 'range_expansion' | 'range_expansion_v2' | 'ema_crossover' | 'breakout' | 'ema_8_21' | 'gap_up' | 'gap_down_reversal' | 'intraday_momentum' | 'all';

export interface ScannerResults {
  scanner: string;
  timestamp: Date;
  results: ScanResult[];
  totalScanned: number;
  matchCount: number;
}

export function runScanner(
  scannerType: ScannerType,
  technicalData: TechnicalAnalysis[]
): ScannerResults {
  let scannerFn: (ta: TechnicalAnalysis) => ScanResult | null;
  let scannerName: string;

  switch (scannerType) {
    case 'range_expansion':
      scannerFn = rangeExpansionScanner;
      scannerName = 'Range Expansion + Trend';
      break;
    case 'range_expansion_v2':
      scannerFn = rangeExpansionV2Scanner;
      scannerName = 'Range Expansion v2 (Chartink)';
      break;
    case 'ema_crossover':
      scannerFn = emaCrossoverScanner;
      scannerName = '5/20 EMA Crossover';
      break;
    case 'breakout':
      scannerFn = breakoutScanner;
      scannerName = '20-Day Breakout';
      break;
    case 'ema_8_21':
      scannerFn = ema8_21Scanner;
      scannerName = 'EMA 8/21 + RSI';
      break;
    case 'gap_up':
      scannerFn = gapUpScanner;
      scannerName = 'Gap-Up Momentum (Intraday)';
      break;
    case 'gap_down_reversal':
      scannerFn = gapDownReversalScanner;
      scannerName = 'Gap-Down Reversal (Intraday)';
      break;
    case 'intraday_momentum':
      scannerFn = intradayMomentumScanner;
      scannerName = 'Intraday Momentum';
      break;
    default:
      scannerFn = rangeExpansionScanner;
      scannerName = 'Range Expansion + Trend';
  }

  const results: ScanResult[] = [];

  for (const ta of technicalData) {
    const result = scannerFn(ta);
    if (result) {
      results.push(result);
    }
  }

  // Sort by score (highest first)
  results.sort((a, b) => b.score - a.score);

  return {
    scanner: scannerName,
    timestamp: new Date(),
    results,
    totalScanned: technicalData.length,
    matchCount: results.length,
  };
}

// Run all scanners and return combined results
export function runAllScanners(
  technicalData: TechnicalAnalysis[]
): Map<ScannerType, ScannerResults> {
  const allResults = new Map<ScannerType, ScannerResults>();

  const scanners: ScannerType[] = ['range_expansion', 'range_expansion_v2', 'ema_crossover', 'breakout', 'ema_8_21'];

  for (const scanner of scanners) {
    allResults.set(scanner, runScanner(scanner, technicalData));
  }

  return allResults;
}
