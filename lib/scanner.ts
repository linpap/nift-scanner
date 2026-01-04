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
    rsi: ta.rsi21,
    reason: reasons,
    score,
  };
}

// ============================================
// Master Scanner - Run all scanners
// ============================================

export type ScannerType = 'range_expansion' | 'ema_crossover' | 'breakout' | 'ema_8_21' | 'all';

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

  const scanners: ScannerType[] = ['range_expansion', 'ema_crossover', 'breakout', 'ema_8_21'];

  for (const scanner of scanners) {
    allResults.set(scanner, runScanner(scanner, technicalData));
  }

  return allResults;
}
