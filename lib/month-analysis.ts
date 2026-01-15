// Monthly seasonal pattern analysis
// Analyzes 2 years of data to find monthly patterns

import { HistoricalData } from './data-fetcher';
import { SECTORS, SectorInfo, SECTOR_MONTH_AFFINITY, MONTHLY_EVENTS } from './sector-stocks';

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
  bestMonth: number;
  worstMonth: number;
}

export interface StockRecommendation {
  symbol: string;
  sector: string;
  sectorName: string;
  currentPrice: number;
  confidence: number; // 0-100
  expectedReturn: number; // historical avg return for this month
  winRate: number; // % times positive in this month
  rationale: string[];
  historicalData: {
    month: number;
    year: number;
    return: number;
  }[];
}

export interface SectorAnalysis {
  sector: SectorInfo;
  affinityScore: number;
  avgReturn: number;
  winRate: number;
  topStocks: StockRecommendation[];
  keyInsight: string;
}

export interface MonthAnalysisResult {
  month: number;
  monthName: string;
  year: number;
  marketEvents: string[];
  topSectors: SectorAnalysis[];
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
    if (candles.length < 5) return; // Need at least 5 trading days

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

  // Calculate average return by month
  const returnsByMonth: Record<number, number[]> = {};

  for (let m = 1; m <= 12; m++) {
    returnsByMonth[m] = [];
  }

  monthlyReturns.forEach(mr => {
    returnsByMonth[mr.month].push(mr.returnPercent);
  });

  const averageReturnByMonth: Record<number, number> = {};
  const winRateByMonth: Record<number, number> = {};

  for (let m = 1; m <= 12; m++) {
    const returns = returnsByMonth[m];
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
    bestMonth,
    worstMonth
  };
}

// Generate confidence score for a stock in a given month
function calculateConfidence(
  pattern: StockMonthlyPattern,
  month: number,
  sectorAffinity: number
): number {
  const avgReturn = pattern.averageReturnByMonth[month] || 0;
  const winRate = pattern.winRateByMonth[month] || 0;
  const dataPoints = pattern.monthlyReturns.filter(mr => mr.month === month).length;

  // Base confidence from win rate (0-40 points)
  let confidence = Math.min(winRate * 0.4, 40);

  // Bonus for positive average return (0-25 points)
  if (avgReturn > 0) {
    confidence += Math.min(avgReturn * 5, 25);
  }

  // Sector affinity bonus (0-20 points)
  confidence += (sectorAffinity - 50) * 0.4; // Convert 50-90 to 0-16

  // Data reliability bonus (0-15 points)
  // More data points = more reliable
  confidence += Math.min(dataPoints * 7.5, 15);

  return Math.max(0, Math.min(100, Math.round(confidence)));
}

// Generate rationale for recommendation
function generateRationale(
  symbol: string,
  pattern: StockMonthlyPattern,
  month: number,
  sector: SectorInfo,
  events: string[]
): string[] {
  const rationale: string[] = [];
  const avgReturn = pattern.averageReturnByMonth[month] || 0;
  const winRate = pattern.winRateByMonth[month] || 0;
  const dataPoints = pattern.monthlyReturns.filter(mr => mr.month === month);

  const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Historical performance
  if (avgReturn > 3) {
    rationale.push(`Strong historical performer in ${monthNames[month]} with avg ${avgReturn.toFixed(1)}% return`);
  } else if (avgReturn > 0) {
    rationale.push(`Positive historical bias in ${monthNames[month]} (avg ${avgReturn.toFixed(1)}%)`);
  }

  // Win rate
  if (winRate >= 70) {
    rationale.push(`High win rate: ${winRate.toFixed(0)}% of past ${monthNames[month]} months were positive`);
  } else if (winRate >= 50) {
    rationale.push(`Moderate win rate: ${winRate.toFixed(0)}% positive months historically`);
  }

  // Sector seasonality
  rationale.push(`${sector.name}: ${sector.seasonalHint}`);

  // Recent performance
  if (dataPoints.length >= 2) {
    const recent = dataPoints.slice(-2);
    const recentAvg = recent.reduce((sum, d) => sum + d.returnPercent, 0) / recent.length;
    if (recentAvg > avgReturn) {
      rationale.push(`Recent years show improving trend`);
    }
  }

  // Market events
  if (events.length > 0) {
    rationale.push(`Key events: ${events.slice(0, 2).join(', ')}`);
  }

  return rationale;
}

// Main analysis function
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
    const sectorAffinity = SECTOR_MONTH_AFFINITY[sector.id]?.[month] || 50;
    const sectorStocks: StockRecommendation[] = [];

    sector.stocks.forEach(symbol => {
      const pattern = stockPatterns.get(symbol);
      if (!pattern) return;

      const currentPrice = currentPrices.get(symbol) || 0;
      const avgReturn = pattern.averageReturnByMonth[month] || 0;
      const winRate = pattern.winRateByMonth[month] || 0;

      const confidence = calculateConfidence(pattern, month, sectorAffinity);
      const rationale = generateRationale(symbol, pattern, month, sector, events);

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
        rationale,
        historicalData
      };

      sectorStocks.push(recommendation);
      allRecommendations.push(recommendation);
    });

    // Calculate sector-level metrics
    if (sectorStocks.length > 0) {
      const avgSectorReturn = sectorStocks.reduce((sum, s) => sum + s.expectedReturn, 0) / sectorStocks.length;
      const avgWinRate = sectorStocks.reduce((sum, s) => sum + s.winRate, 0) / sectorStocks.length;

      // Sort stocks by confidence and take top 5
      const topStocks = [...sectorStocks]
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5);

      // Generate key insight
      let keyInsight = '';
      if (sectorAffinity >= 80) {
        keyInsight = `Historically strong month for ${sector.name}. ${sector.seasonalHint}`;
      } else if (sectorAffinity >= 65) {
        keyInsight = `Above average performance expected. ${sector.seasonalHint}`;
      } else if (sectorAffinity <= 45) {
        keyInsight = `Historically weak month. Consider reducing exposure.`;
      } else {
        keyInsight = `Mixed historical performance. Stock-specific analysis recommended.`;
      }

      sectorAnalyses.push({
        sector,
        affinityScore: sectorAffinity,
        avgReturn: avgSectorReturn,
        winRate: avgWinRate,
        topStocks,
        keyInsight
      });
    }
  });

  // Sort sectors by affinity score
  const topSectors = [...sectorAnalyses]
    .sort((a, b) => b.affinityScore - a.affinityScore)
    .slice(0, 8);

  // Sort all recommendations by confidence
  const sortedRecommendations = [...allRecommendations]
    .sort((a, b) => b.confidence - a.confidence);

  // Generate key observations
  const keyObservations = generateKeyObservations(month, topSectors, events);

  return {
    month,
    monthName: monthNames[month],
    year,
    marketEvents: events,
    topSectors,
    allRecommendations: sortedRecommendations,
    keyObservations
  };
}

// Generate key observations for the month
function generateKeyObservations(
  month: number,
  topSectors: SectorAnalysis[],
  events: string[]
): string[] {
  const observations: string[] = [];
  const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];

  // Top performing sectors
  const strongSectors = topSectors.filter(s => s.affinityScore >= 75);
  if (strongSectors.length > 0) {
    const names = strongSectors.slice(0, 3).map(s => s.sector.name).join(', ');
    observations.push(`🔥 Historically strong sectors: ${names}`);
  }

  // Budget month observation
  if (month === 2) {
    observations.push(`📊 Union Budget month - PSU stocks, Infrastructure, and Defence typically see action`);
  }

  // Festive season
  if (month === 10 || month === 11) {
    observations.push(`🎉 Festive season peak - Consumer Durables, Auto, and FMCG historically outperform`);
  }

  // Summer months
  if (month >= 3 && month <= 5) {
    observations.push(`☀️ Summer months - Appliances (AC/Coolers), Power utilities tend to perform well`);
  }

  // Monsoon
  if (month === 7 || month === 8) {
    observations.push(`🌧️ Monsoon season - Pharma (acute illness), Agrochem sectors see demand`);
  }

  // Q4 results
  if (month === 4 || month === 5) {
    observations.push(`📈 Q4 Results Season - IT sector deal wins and earnings typically boost sentiment`);
  }

  // Year-end
  if (month === 12) {
    observations.push(`📅 Year-end rally - FII flows and portfolio rebalancing often positive for markets`);
  }

  // Add event-based observations
  if (events.length > 0) {
    observations.push(`📌 Key events this month: ${events.join(', ')}`);
  }

  // Weak sectors warning
  const weakSectors = topSectors.filter(s => s.affinityScore <= 50);
  if (weakSectors.length > 0) {
    const names = weakSectors.slice(0, 2).map(s => s.sector.name).join(', ');
    observations.push(`⚠️ Historically weak: ${names} - exercise caution`);
  }

  return observations;
}

// Get confidence level label
export function getConfidenceLabel(confidence: number): { label: string; color: string } {
  if (confidence >= 80) return { label: 'Very High', color: 'emerald' };
  if (confidence >= 65) return { label: 'High', color: 'green' };
  if (confidence >= 50) return { label: 'Moderate', color: 'yellow' };
  if (confidence >= 35) return { label: 'Low', color: 'orange' };
  return { label: 'Very Low', color: 'red' };
}
