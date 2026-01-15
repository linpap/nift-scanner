// Monthly seasonal pattern analysis
// 100% DATA-DRIVEN - No hardcoded assumptions

import { HistoricalData } from './data-fetcher';
import { SECTORS, SectorInfo, MONTHLY_EVENTS } from './sector-stocks';

export interface MonthlyReturn {
  month: number; // 1-12
  year: number;
  openPrice: number;
  closePrice: number;
  highPrice: number;
  lowPrice: number;
  returnPercent: number;
  totalVolume: number;
}

export interface StockMonthlyPattern {
  symbol: string;
  monthlyReturns: MonthlyReturn[];
  averageReturnByMonth: Record<number, number>; // month -> avg return %
  winRateByMonth: Record<number, number>; // month -> % of positive months
  dataPointsByMonth: Record<number, number>; // month -> count of data points
  bestMonth: number;
  worstMonth: number;
}

export interface StockRecommendation {
  symbol: string;
  sector: string;
  sectorName: string;
  currentPrice: number;
  confidence: number; // 0-100 - CALCULATED FROM DATA
  expectedReturn: number; // historical avg return for this month
  winRate: number; // % times positive in this month
  dataPoints: number; // how many years of data
  rationale: string[];
  historicalData: {
    month: number;
    year: number;
    return: number;
  }[];
}

export interface SectorAnalysis {
  sector: SectorInfo;
  avgReturn: number; // CALCULATED from stock data
  winRate: number; // CALCULATED from stock data
  stocksAnalyzed: number;
  topStocks: StockRecommendation[];
  insight: string; // Generated from actual data
}

export interface MonthAnalysisResult {
  month: number;
  monthName: string;
  year: number;
  marketEvents: string[];
  sectors: SectorAnalysis[];
  allRecommendations: StockRecommendation[];
  keyObservations: string[];
}

// Calculate monthly returns from historical data
export function calculateMonthlyReturns(historicalData: HistoricalData[]): MonthlyReturn[] {
  if (!historicalData || historicalData.length === 0) return [];

  // Sort by date ascending
  const sorted = [...historicalData].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Group by month-year
  const monthlyGroups: Record<string, HistoricalData[]> = {};

  sorted.forEach(candle => {
    const date = new Date(candle.date);
    const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
    if (!monthlyGroups[key]) {
      monthlyGroups[key] = [];
    }
    monthlyGroups[key].push(candle);
  });

  // Calculate returns for each month
  const monthlyReturns: MonthlyReturn[] = [];

  Object.entries(monthlyGroups).forEach(([key, candles]) => {
    if (candles.length < 10) return; // Need at least 10 trading days for reliable data

    const [yearStr, monthStr] = key.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);

    const firstCandle = candles[0];
    const lastCandle = candles[candles.length - 1];

    const openPrice = firstCandle.open;
    const closePrice = lastCandle.close;
    const highPrice = Math.max(...candles.map(c => c.high));
    const lowPrice = Math.min(...candles.map(c => c.low));
    const totalVolume = candles.reduce((sum, c) => sum + c.volume, 0);

    const returnPercent = ((closePrice - openPrice) / openPrice) * 100;

    monthlyReturns.push({
      month,
      year,
      openPrice,
      closePrice,
      highPrice,
      lowPrice,
      returnPercent,
      totalVolume
    });
  });

  return monthlyReturns.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });
}

// Analyze stock's monthly patterns
export function analyzeStockPattern(symbol: string, historicalData: HistoricalData[]): StockMonthlyPattern | null {
  const monthlyReturns = calculateMonthlyReturns(historicalData);

  if (monthlyReturns.length < 12) return null; // Need at least 1 year of data

  // Calculate average return and win rate by month
  const returnsByMonth: Record<number, number[]> = {};

  for (let m = 1; m <= 12; m++) {
    returnsByMonth[m] = [];
  }

  monthlyReturns.forEach(mr => {
    returnsByMonth[mr.month].push(mr.returnPercent);
  });

  const averageReturnByMonth: Record<number, number> = {};
  const winRateByMonth: Record<number, number> = {};
  const dataPointsByMonth: Record<number, number> = {};

  for (let m = 1; m <= 12; m++) {
    const returns = returnsByMonth[m];
    dataPointsByMonth[m] = returns.length;

    if (returns.length > 0) {
      averageReturnByMonth[m] = returns.reduce((a, b) => a + b, 0) / returns.length;
      winRateByMonth[m] = (returns.filter(r => r > 0).length / returns.length) * 100;
    } else {
      averageReturnByMonth[m] = 0;
      winRateByMonth[m] = 0;
    }
  }

  // Find best and worst months
  let bestMonth = 1, worstMonth = 1;
  let bestReturn = averageReturnByMonth[1], worstReturn = averageReturnByMonth[1];

  for (let m = 2; m <= 12; m++) {
    if (averageReturnByMonth[m] > bestReturn) {
      bestReturn = averageReturnByMonth[m];
      bestMonth = m;
    }
    if (averageReturnByMonth[m] < worstReturn) {
      worstReturn = averageReturnByMonth[m];
      worstMonth = m;
    }
  }

  return {
    symbol,
    monthlyReturns,
    averageReturnByMonth,
    winRateByMonth,
    dataPointsByMonth,
    bestMonth,
    worstMonth
  };
}

// Calculate confidence score PURELY from data
function calculateConfidence(
  avgReturn: number,
  winRate: number,
  dataPoints: number
): number {
  // Confidence is based on:
  // 1. Win rate (most important) - 50 points max
  // 2. Consistency of positive returns - 30 points max
  // 3. Data reliability (more data = more confident) - 20 points max

  let confidence = 0;

  // Win rate component (0-50 points)
  // 100% win rate = 50 points, 50% = 25, 0% = 0
  confidence += winRate * 0.5;

  // Return magnitude bonus/penalty (0-30 points)
  // Strong positive returns add confidence, negative returns reduce it
  if (avgReturn > 0) {
    // +5% avg return = 30 points, +2% = 12 points
    confidence += Math.min(avgReturn * 6, 30);
  } else {
    // Negative returns penalize confidence
    // -5% = -15 points penalty
    confidence += Math.max(avgReturn * 3, -20);
  }

  // Data reliability (0-20 points)
  // 2 data points = 10, 3+ = 20
  if (dataPoints >= 3) {
    confidence += 20;
  } else if (dataPoints >= 2) {
    confidence += 10;
  } else if (dataPoints >= 1) {
    confidence += 5;
  }

  return Math.max(0, Math.min(100, Math.round(confidence)));
}

// Generate rationale based ONLY on actual data
function generateRationale(
  symbol: string,
  pattern: StockMonthlyPattern,
  month: number
): string[] {
  const rationale: string[] = [];
  const avgReturn = pattern.averageReturnByMonth[month] || 0;
  const winRate = pattern.winRateByMonth[month] || 0;
  const dataPoints = pattern.dataPointsByMonth[month] || 0;
  const monthData = pattern.monthlyReturns.filter(mr => mr.month === month);

  const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Data-based statements only
  if (dataPoints > 0) {
    rationale.push(`Based on ${dataPoints} year${dataPoints > 1 ? 's' : ''} of data`);
  }

  // Performance description
  if (avgReturn > 5) {
    rationale.push(`Strong avg return of +${avgReturn.toFixed(1)}% in ${monthNames[month]}`);
  } else if (avgReturn > 2) {
    rationale.push(`Positive avg return of +${avgReturn.toFixed(1)}% in ${monthNames[month]}`);
  } else if (avgReturn > 0) {
    rationale.push(`Slight positive bias: +${avgReturn.toFixed(1)}% avg in ${monthNames[month]}`);
  } else if (avgReturn > -2) {
    rationale.push(`Near flat: ${avgReturn.toFixed(1)}% avg in ${monthNames[month]}`);
  } else {
    rationale.push(`Negative historical: ${avgReturn.toFixed(1)}% avg in ${monthNames[month]}`);
  }

  // Win rate description
  if (winRate >= 80 && dataPoints >= 2) {
    rationale.push(`High consistency: ${winRate.toFixed(0)}% of ${monthNames[month]} months were positive`);
  } else if (winRate >= 60 && dataPoints >= 2) {
    rationale.push(`Moderate consistency: ${winRate.toFixed(0)}% positive months`);
  } else if (winRate < 50 && dataPoints >= 2) {
    rationale.push(`Low consistency: only ${winRate.toFixed(0)}% positive months`);
  }

  // Recent trend
  if (monthData.length >= 2) {
    const recent = monthData.slice(-2);
    const positiveRecent = recent.filter(d => d.returnPercent > 0).length;
    if (positiveRecent === 2) {
      rationale.push(`Last 2 years: both positive`);
    } else if (positiveRecent === 0) {
      rationale.push(`Last 2 years: both negative`);
    }
  }

  // Best/worst month for this stock
  if (pattern.bestMonth === month && avgReturn > 0) {
    rationale.push(`${monthNames[month]} is historically this stock's best month`);
  } else if (pattern.worstMonth === month && avgReturn < 0) {
    rationale.push(`${monthNames[month]} is historically this stock's worst month`);
  }

  return rationale;
}

// Generate sector insight from actual data
function generateSectorInsight(
  sectorName: string,
  avgReturn: number,
  winRate: number,
  stocksAnalyzed: number
): string {
  if (stocksAnalyzed === 0) {
    return 'Insufficient data for analysis';
  }

  if (avgReturn > 3 && winRate >= 60) {
    return `Data shows positive bias: +${avgReturn.toFixed(1)}% avg, ${winRate.toFixed(0)}% win rate`;
  } else if (avgReturn > 0 && winRate >= 50) {
    return `Slight positive tendency: +${avgReturn.toFixed(1)}% avg, ${winRate.toFixed(0)}% win rate`;
  } else if (avgReturn < -3 && winRate < 40) {
    return `Data shows negative bias: ${avgReturn.toFixed(1)}% avg, ${winRate.toFixed(0)}% win rate`;
  } else if (avgReturn < 0) {
    return `Mixed to negative: ${avgReturn.toFixed(1)}% avg, ${winRate.toFixed(0)}% win rate`;
  } else {
    return `Mixed signals: ${avgReturn.toFixed(1)}% avg, ${winRate.toFixed(0)}% win rate`;
  }
}

// Main analysis function - 100% data driven
export function analyzeMonth(
  month: number,
  year: number,
  stockPatterns: Map<string, StockMonthlyPattern>,
  currentPrices: Map<string, number>
): MonthAnalysisResult {
  const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];

  const events = MONTHLY_EVENTS[month] || [];
  const allRecommendations: StockRecommendation[] = [];
  const sectorAnalyses: SectorAnalysis[] = [];

  // Analyze each sector
  SECTORS.forEach(sector => {
    const sectorStocks: StockRecommendation[] = [];
    let totalReturn = 0;
    let totalWinRate = 0;
    let stockCount = 0;

    sector.stocks.forEach(symbol => {
      const pattern = stockPatterns.get(symbol);
      if (!pattern) return;

      const currentPrice = currentPrices.get(symbol) || 0;
      const avgReturn = pattern.averageReturnByMonth[month] || 0;
      const winRate = pattern.winRateByMonth[month] || 0;
      const dataPoints = pattern.dataPointsByMonth[month] || 0;

      if (dataPoints === 0) return; // Skip if no data for this month

      const confidence = calculateConfidence(avgReturn, winRate, dataPoints);
      const rationale = generateRationale(symbol, pattern, month);

      const historicalData = pattern.monthlyReturns
        .filter(mr => mr.month === month)
        .map(mr => ({
          month: mr.month,
          year: mr.year,
          return: mr.returnPercent
        }));

      const recommendation: StockRecommendation = {
        symbol,
        sector: sector.id,
        sectorName: sector.name,
        currentPrice,
        confidence,
        expectedReturn: avgReturn,
        winRate,
        dataPoints,
        rationale,
        historicalData
      };

      sectorStocks.push(recommendation);
      allRecommendations.push(recommendation);

      totalReturn += avgReturn;
      totalWinRate += winRate;
      stockCount++;
    });

    // Calculate sector-level metrics FROM DATA
    if (stockCount > 0) {
      const avgSectorReturn = totalReturn / stockCount;
      const avgWinRate = totalWinRate / stockCount;

      // Sort stocks by confidence (which is data-driven)
      const topStocks = [...sectorStocks]
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5);

      const insight = generateSectorInsight(sector.name, avgSectorReturn, avgWinRate, stockCount);

      sectorAnalyses.push({
        sector,
        avgReturn: avgSectorReturn,
        winRate: avgWinRate,
        stocksAnalyzed: stockCount,
        topStocks,
        insight
      });
    }
  });

  // Sort sectors by average return (actual performance)
  const sortedSectors = [...sectorAnalyses]
    .sort((a, b) => b.avgReturn - a.avgReturn);

  // Deduplicate recommendations (some stocks appear in multiple sectors)
  // Keep the one with highest confidence
  const uniqueRecommendations = new Map<string, StockRecommendation>();
  allRecommendations.forEach(rec => {
    const existing = uniqueRecommendations.get(rec.symbol);
    if (!existing || rec.confidence > existing.confidence) {
      uniqueRecommendations.set(rec.symbol, rec);
    }
  });

  // Sort all recommendations by confidence
  const sortedRecommendations = Array.from(uniqueRecommendations.values())
    .sort((a, b) => b.confidence - a.confidence);

  // Generate observations from actual data
  const keyObservations = generateDataDrivenObservations(month, sortedSectors, events);

  return {
    month,
    monthName: monthNames[month],
    year,
    marketEvents: events,
    sectors: sortedSectors,
    allRecommendations: sortedRecommendations,
    keyObservations
  };
}

// Generate observations based ONLY on actual data
function generateDataDrivenObservations(
  month: number,
  sectors: SectorAnalysis[],
  events: string[]
): string[] {
  const observations: string[] = [];
  const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];

  // Top performing sectors (if any have positive returns)
  const positiveSectors = sectors.filter(s => s.avgReturn > 0 && s.winRate >= 50);
  if (positiveSectors.length > 0) {
    const topNames = positiveSectors.slice(0, 3).map(s =>
      `${s.sector.name} (+${s.avgReturn.toFixed(1)}%)`
    ).join(', ');
    observations.push(`Historically positive sectors: ${topNames}`);
  }

  // Weak sectors
  const negativeSectors = sectors.filter(s => s.avgReturn < -2);
  if (negativeSectors.length > 0) {
    const weakNames = negativeSectors.slice(0, 2).map(s =>
      `${s.sector.name} (${s.avgReturn.toFixed(1)}%)`
    ).join(', ');
    observations.push(`Historically weak: ${weakNames}`);
  }

  // High confidence stocks across all sectors
  const highConfidenceCount = sectors.reduce((sum, s) =>
    sum + s.topStocks.filter(st => st.confidence >= 70).length, 0
  );
  if (highConfidenceCount > 0) {
    observations.push(`${highConfidenceCount} stocks show high confidence (70%+) based on historical patterns`);
  }

  // Overall market tendency for this month
  const totalStocks = sectors.reduce((sum, s) => sum + s.stocksAnalyzed, 0);
  const weightedReturn = sectors.reduce((sum, s) => sum + s.avgReturn * s.stocksAnalyzed, 0) / (totalStocks || 1);

  if (weightedReturn > 2) {
    observations.push(`${monthNames[month]} historically shows positive market bias (+${weightedReturn.toFixed(1)}% avg)`);
  } else if (weightedReturn < -2) {
    observations.push(`${monthNames[month]} historically shows negative market bias (${weightedReturn.toFixed(1)}% avg)`);
  } else {
    observations.push(`${monthNames[month]} shows mixed historical performance (${weightedReturn.toFixed(1)}% avg)`);
  }

  // Events (factual)
  if (events.length > 0) {
    observations.push(`Key events: ${events.join(', ')}`);
  }

  // Data warning
  observations.push(`Analysis based on ~2 years of data. Past performance ≠ future results`);

  return observations;
}

// Get confidence level label
export function getConfidenceLabel(confidence: number): { label: string; color: string } {
  if (confidence >= 70) return { label: 'High', color: 'green' };
  if (confidence >= 50) return { label: 'Moderate', color: 'yellow' };
  if (confidence >= 30) return { label: 'Low', color: 'orange' };
  return { label: 'Very Low', color: 'red' };
}
