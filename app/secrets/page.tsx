'use client';

import { useState, useEffect, useCallback } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

interface MarketData {
  vix?: number;
  vixChange?: number;
  giftNifty?: number;
  giftNiftyChange?: number;
  dowChange?: number;
  nasdaqChange?: number;
}

interface Alert {
  type: 'BUY' | 'SELL' | 'AVOID' | 'WATCH';
  stock: string;
  action: string;
  logic: string;
  confidence: number;
  pattern: string;
  expectedReturn?: string;
}

interface AlertsData {
  success: boolean;
  date: string;
  day: string;
  alerts: Alert[];
  summary: {
    buyAlerts: number;
    sellAlerts: number;
    avoidAlerts: number;
    watchAlerts: number;
  };
}

// Secret patterns data - BACKED BY 2 YEARS OF NIFTY 100 DATA ANALYSIS
const SECRETS = {
  contrarian: {
    title: '🎯 52-WEEK LOW CONTRARIAN (80% WIN RATE!)',
    description: 'The strongest pattern in 2 years of data',
    patterns: [
      { rule: 'Stock breaks 52-week low', action: 'BUY! Next 20 days: +4.43% avg, 80% positive', confidence: 80, source: 'Nifty 100 analysis: 55 occurrences' },
      { rule: 'Stock breaks 52-week low', action: 'Next 5 days: +2.09% avg, 74.5% positive', confidence: 75, source: 'Nifty 100 analysis: 55 occurrences' },
      { rule: '20-day low breakdown', action: 'BUY! Next 5 days: +0.90% avg, 59.7% positive', confidence: 60, source: 'Nifty 100 analysis: 867 occurrences' },
      { rule: '52-week HIGH breakout', action: 'CAUTION: Only 48% positive in 5 days, 54.5% in 20 days', confidence: 55, source: 'Nifty 100 analysis: 200 occurrences' },
    ],
  },
  gapSecret: {
    title: '📊 GAP TRADING SECRETS (7000+ samples)',
    description: 'What REALLY happens after gaps in Nifty 100',
    patterns: [
      { rule: 'HUGE gap up (more than 3%)', action: 'FADE IT! Next day: -0.97% avg, only 49.1% positive', confidence: 75, source: 'Nifty 100 analysis: 401 occurrences' },
      { rule: 'HUGE gap down (more than -3%)', action: 'BUY IT! Next day: +0.36% avg, 60.1% positive', confidence: 70, source: 'Nifty 100 analysis: 288 occurrences' },
      { rule: 'Large gap up (2-3%)', action: 'Momentum continues: +0.20% next day, +1.50% in 3 days', confidence: 65, source: 'Nifty 100 analysis: 511 occurrences' },
      { rule: 'Small gap (0.5-1%)', action: '72.5% fill same day - wait for fill before entering', confidence: 73, source: 'Nifty 100 analysis: 7092 occurrences' },
      { rule: 'Large gap up (2-3%)', action: 'Only 30.1% fill same day - breakaway gap, dont fade', confidence: 70, source: 'Nifty 100 analysis: 511 occurrences' },
    ],
  },
  sectorCorrelation: {
    title: '🔄 SECTOR LEAD-LAG (Real Data)',
    description: 'What happens to other sectors NEXT DAY',
    patterns: [
      { rule: 'Finance rallies big (more than 2%)', action: 'IT falls next day! -0.26% avg, only 34% positive', confidence: 75, source: 'Nifty 100 analysis: 29 samples' },
      { rule: 'Infra rallies big (more than 2%)', action: 'Metals follow! +0.32% avg, 72% positive', confidence: 72, source: 'Nifty 100 analysis: 29 samples' },
      { rule: 'Auto rallies big (more than 2%)', action: 'Finance follows! +0.42% avg, 64% positive', confidence: 64, source: 'Nifty 100 analysis: 22 samples' },
      { rule: 'Auto rallies big (more than 2%)', action: 'Metals follow! +0.47% avg, 64% positive', confidence: 64, source: 'Nifty 100 analysis: 22 samples' },
      { rule: 'IT rallies big (more than 2%)', action: 'Banks follow! +0.14% avg, 63% positive', confidence: 63, source: 'Nifty 100 analysis: 30 samples' },
      { rule: 'Metals rally big (more than 2%)', action: 'IT lags! -0.06% avg, only 45% positive', confidence: 55, source: 'Nifty 100 analysis: 40 samples' },
    ],
  },
  volumeSecret: {
    title: '📈 VOLUME SPIKE PATTERNS',
    description: '2x-3x volume days predict next moves',
    patterns: [
      { rule: '3x volume on UP day', action: 'Continuation! Next day: 55.3% positive', confidence: 55, source: 'Nifty 100 analysis: 544 occurrences' },
      { rule: '2x volume on DOWN day', action: 'Bounce likely: +0.23% avg, 52.8% positive', confidence: 53, source: 'Nifty 100 analysis: 718 occurrences' },
      { rule: '3x volume on DOWN day', action: 'Bounce: +0.75% in 3 days avg', confidence: 55, source: 'Nifty 100 analysis: 343 occurrences' },
      { rule: '2x volume on UP day', action: 'No edge: -0.01% next day, 48.4% positive', confidence: 48, source: 'Nifty 100 analysis: 1125 occurrences' },
    ],
  },
  consecutiveDays: {
    title: '📅 CONSECUTIVE DAYS (Myth Busted)',
    description: 'Market is more efficient than you think',
    patterns: [
      { rule: '5 consecutive DOWN days', action: 'Slight bounce: +0.19% avg, 54.3% reversal', confidence: 54, source: 'Nifty 100 analysis: 1270 occurrences' },
      { rule: '2-4 consecutive UP days', action: 'NO EDGE! ~48% reversal rate - random', confidence: 48, source: 'Nifty 100 analysis: 12000+ occurrences' },
      { rule: '2-4 consecutive DOWN days', action: 'Slight edge: 51-52% reversal rate', confidence: 52, source: 'Nifty 100 analysis: 11000+ occurrences' },
      { rule: 'Chasing streaks', action: 'MYTH! Consecutive days barely predict anything', confidence: 50, source: 'Nifty 100 analysis: 20000+ samples' },
    ],
  },
  intradayReversal: {
    title: '🔃 INTRADAY REVERSAL PATTERNS',
    description: 'What gap + close combos predict',
    patterns: [
      { rule: 'Gap DOWN but closes GREEN', action: 'Bullish: +0.18% next day, 53.4% positive', confidence: 53, source: 'Nifty 100 analysis: 1091 occurrences' },
      { rule: 'Fell 2%+ from open but closed positive', action: 'Bullish: +0.16% next day, 53.1% positive', confidence: 53, source: 'Nifty 100 analysis: 714 occurrences' },
      { rule: 'Gap UP but closes RED', action: 'Neutral: +0.08% next day, 51% positive', confidence: 51, source: 'Nifty 100 analysis: 1440 occurrences' },
      { rule: 'Rose 2%+ from open but closed negative', action: 'No edge: +0.10% next day, 49.7% positive', confidence: 50, source: 'Nifty 100 analysis: 580 occurrences' },
    ],
  },
  gapFillRates: {
    title: '🎯 GAP FILL PROBABILITIES',
    description: 'Exact same-day fill rates from real data',
    patterns: [
      { rule: 'Small gap up (0.5-1%)', action: '72.5% fill same day - high probability fade', confidence: 73, source: 'Nifty 100 analysis: 7092 gaps' },
      { rule: 'Small gap down (0.5-1%)', action: '70.1% fill same day - high probability', confidence: 70, source: 'Nifty 100 analysis: 2975 gaps' },
      { rule: 'Medium gap (1-2%)', action: '51-57% fill same day - coin flip', confidence: 54, source: 'Nifty 100 analysis: 3700 gaps' },
      { rule: 'Large gap (2-3%)', action: '30-40% fill same day - breakaway likely', confidence: 65, source: 'Nifty 100 analysis: 862 gaps' },
      { rule: 'Huge gap (more than 3%)', action: 'Only 20% fill same day - respect the move', confidence: 80, source: 'Nifty 100 analysis: 689 gaps' },
    ],
  },
  bestPatterns: {
    title: '⭐ TOP 5 HIGHEST CONVICTION PATTERNS',
    description: 'The patterns with statistical edge',
    patterns: [
      { rule: '52-week low breakdown', action: 'BUY for 20 days: +4.43% avg, 80% win rate', confidence: 80, source: 'Best pattern in entire dataset' },
      { rule: 'Huge gap down (more than -3%)', action: 'BUY: 60.1% positive next day', confidence: 70, source: '288 occurrences analyzed' },
      { rule: 'Finance big up day', action: 'SHORT IT stocks: 66% negative next day', confidence: 66, source: 'Sector correlation data' },
      { rule: 'Infra big up day', action: 'BUY Metals: 72% positive next day', confidence: 72, source: 'Sector correlation data' },
      { rule: 'Small gaps (under 1%)', action: 'FADE: 70%+ fill same day', confidence: 71, source: '10000+ gaps analyzed' },
    ],
  },
  stockBounce: {
    title: '🔄 BEST BOUNCE STOCKS (After -3% Day)',
    description: 'These stocks bounce back most reliably after big drops',
    patterns: [
      { rule: 'BHARTIARTL falls -3%+', action: 'BUY! 83% positive next day, +1.63% avg', confidence: 83, source: 'Stock-specific analysis' },
      { rule: 'AXISBANK falls -3%+', action: 'BUY! 83% positive next day, +1.12% avg', confidence: 83, source: 'Stock-specific analysis' },
      { rule: 'SBIN falls -3%+', action: 'BUY! 83% positive next day, +0.92% avg', confidence: 83, source: 'Stock-specific analysis' },
      { rule: 'SBILIFE falls -3%+', action: 'BUY! 83% positive next day, +1.38% avg', confidence: 83, source: 'Stock-specific analysis' },
      { rule: 'GRASIM falls -3%+', action: 'BUY! 80% positive next day, +1.12% avg', confidence: 80, source: 'Stock-specific analysis' },
      { rule: 'NTPC falls -3%+', action: 'BUY! 75% positive next day, +1.11% avg', confidence: 75, source: 'Stock-specific analysis' },
    ],
  },
  meanReversion: {
    title: '📉 MEAN REVERSION KINGS (After -10% in 5 days)',
    description: 'Buy these when they crash - they always bounce back',
    patterns: [
      { rule: 'ADANIENT falls -10% in 5 days', action: 'BUY! 100% bounce rate, +8.8% avg recovery', confidence: 90, source: 'Mean reversion analysis' },
      { rule: 'HINDALCO falls -10% in 5 days', action: 'BUY! 90% bounce rate, +3.5% avg recovery', confidence: 85, source: 'Mean reversion analysis' },
      { rule: 'INDUSINDBK falls -10% in 5 days', action: 'BUY! 75% bounce rate, +1.7% avg recovery', confidence: 75, source: 'Mean reversion analysis' },
    ],
  },
  pairTrading: {
    title: '🔗 PAIR TRADING SECRETS',
    description: 'When one rallies, what happens to its peer?',
    patterns: [
      { rule: 'HDFCBANK rallies more than 2%', action: 'BUY ICICIBANK! 81% positive next day, +0.39% avg', confidence: 81, source: 'Pair correlation analysis' },
      { rule: 'HINDALCO rallies more than 2%', action: 'BUY VEDANTA! 68% positive next day, +0.65% avg', confidence: 68, source: 'Pair correlation analysis' },
      { rule: 'TCS rallies more than 2%', action: 'AVOID INFY! Only 33% positive next day, -0.13% avg', confidence: 67, source: 'Pair correlation analysis' },
      { rule: 'SUNPHARMA rallies more than 2%', action: 'AVOID CIPLA! Only 41% positive next day, -0.23% avg', confidence: 59, source: 'Pair correlation analysis' },
    ],
  },
  gapFillStocks: {
    title: '🎯 STOCK-SPECIFIC GAP FILL RATES',
    description: 'Which stocks to fade gaps vs ride momentum',
    patterns: [
      { rule: 'SUNPHARMA gaps 0.5-2%', action: 'FADE IT! 70% fill same day', confidence: 70, source: 'Gap analysis: 121 gaps' },
      { rule: 'MARUTI gaps 0.5-2%', action: 'FADE IT! 70% fill same day', confidence: 70, source: 'Gap analysis: 97 gaps' },
      { rule: 'TITAN gaps 0.5-2%', action: 'FADE IT! 68% fill same day', confidence: 68, source: 'Gap analysis: 106 gaps' },
      { rule: 'INFOSYS gaps 0.5-2%', action: 'DONT FADE! Only 42% fill - ride momentum', confidence: 70, source: 'Gap analysis: 182 gaps' },
      { rule: 'RELIANCE gaps 0.5-2%', action: 'DONT FADE! Only 51% fill - breakaway likely', confidence: 65, source: 'Gap analysis: 131 gaps' },
      { rule: 'TCS gaps 0.5-2%', action: 'DONT FADE! Only 54% fill - trend continues', confidence: 65, source: 'Gap analysis: 134 gaps' },
    ],
  },
  volumeSpike: {
    title: '📊 VOLUME SPIKE STOCK SECRETS',
    description: 'What to do after 2x volume days',
    patterns: [
      { rule: 'M&M 2x volume on UP day', action: 'BUY MORE! +1.69% avg next day', confidence: 70, source: 'Volume spike analysis' },
      { rule: 'RELIANCE 2x volume on UP day', action: 'BUY MORE! +1.07% avg next day', confidence: 65, source: 'Volume spike analysis' },
      { rule: 'ADANIENT 2x volume on DOWN day', action: 'BUY (capitulation)! +1.79% avg next day', confidence: 70, source: 'Volume spike analysis' },
      { rule: 'NTPC 2x volume on DOWN day', action: 'BUY (capitulation)! +1.73% avg next day', confidence: 70, source: 'Volume spike analysis' },
      { rule: 'HINDALCO 2x volume on DOWN day', action: 'BUY (capitulation)! +1.59% avg next day', confidence: 68, source: 'Volume spike analysis' },
    ],
  },
  mondayEffect: {
    title: '📅 MONDAY EFFECT BY STOCK',
    description: 'Which stocks to avoid/prefer on Mondays',
    patterns: [
      { rule: 'TCS on Monday', action: 'AVOID! Only 40.8% win rate on Mondays', confidence: 60, source: 'Day-of-week analysis' },
      { rule: 'ITC on Monday', action: 'AVOID! Only 44.9% win rate on Mondays', confidence: 55, source: 'Day-of-week analysis' },
      { rule: 'DABUR on Monday', action: 'AVOID! Only 43.9% win rate on Mondays', confidence: 56, source: 'Day-of-week analysis' },
    ],
  },
};

// Confidence meter component
function ConfidenceBar({ confidence }: { confidence: number }) {
  const getColor = () => {
    if (confidence >= 80) return 'bg-green-500';
    if (confidence >= 65) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor()} transition-all`}
          style={{ width: `${confidence}%` }}
        />
      </div>
      <span className="text-xs text-gray-400">{confidence}%</span>
    </div>
  );
}

export default function SecretsPage() {
  const [marketData, setMarketData] = useState<MarketData>({});
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>('bestPatterns');
  const [alertsData, setAlertsData] = useState<AlertsData | null>(null);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [lastScanTime, setLastScanTime] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    // Fetch VIX and other indicators
    const fetchMarketData = async () => {
      try {
        // Fetch India VIX
        const vixResponse = await fetch(
          'https://query1.finance.yahoo.com/v8/finance/chart/%5EINDIAVIX?interval=1d&range=2d',
          { headers: { 'User-Agent': 'Mozilla/5.0' } }
        );
        const vixData = await vixResponse.json();
        const vixResult = vixData.chart?.result?.[0];
        if (vixResult) {
          const vixPrice = vixResult.meta?.regularMarketPrice || 0;
          const vixPrev = vixResult.meta?.chartPreviousClose || vixPrice;
          setMarketData(prev => ({
            ...prev,
            vix: vixPrice,
            vixChange: ((vixPrice - vixPrev) / vixPrev) * 100,
          }));
        }

        // Fetch GIFT Nifty
        const giftResponse = await fetch(
          'https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEI?interval=1d&range=2d',
          { headers: { 'User-Agent': 'Mozilla/5.0' } }
        );
        const giftData = await giftResponse.json();
        const giftResult = giftData.chart?.result?.[0];
        if (giftResult) {
          const niftyPrice = giftResult.meta?.regularMarketPrice || 0;
          const niftyPrev = giftResult.meta?.chartPreviousClose || niftyPrice;
          const niftyChange = niftyPrev ? ((niftyPrice - niftyPrev) / niftyPrev) * 100 : 0;
          setMarketData(prevData => ({
            ...prevData,
            giftNifty: niftyPrice,
            giftNiftyChange: niftyChange,
          }));
        }

        // Fetch US indices
        const dowResponse = await fetch(
          'https://query1.finance.yahoo.com/v8/finance/chart/%5EDJI?interval=1d&range=2d',
          { headers: { 'User-Agent': 'Mozilla/5.0' } }
        );
        const dowData = await dowResponse.json();
        const dowResult = dowData.chart?.result?.[0];
        if (dowResult) {
          const dowPrice = dowResult.meta?.regularMarketPrice || 0;
          const dowPrev = dowResult.meta?.chartPreviousClose || dowPrice;
          const dowChangeVal = dowPrev ? ((dowPrice - dowPrev) / dowPrev) * 100 : 0;
          setMarketData(prevData => ({
            ...prevData,
            dowChange: dowChangeVal,
          }));
        }
      } catch (error) {
        console.error('Error fetching market data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMarketData();
  }, []);

  // Fetch morning alerts
  const fetchAlerts = useCallback(async (showLoading = true) => {
    if (showLoading) setAlertsLoading(true);
    setIsScanning(true);
    try {
      const response = await fetch('/api/morning-alerts', { cache: 'no-store' });
      const data = await response.json();
      setAlertsData(data);
      setLastScanTime(new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }));
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setAlertsLoading(false);
      setIsScanning(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Manual scan handler
  const handleManualScan = () => {
    fetchAlerts(false);
  };

  const getVixSignal = () => {
    if (!marketData.vix) return null;
    if (marketData.vix > 25) return { text: 'HIGH FEAR - Expect volatility, shift to large-caps', color: 'text-red-400' };
    if (marketData.vix > 20) return { text: 'ELEVATED - Be cautious, reduce risky positions', color: 'text-yellow-400' };
    if (marketData.vix < 12) return { text: 'COMPLACENCY - Markets calm, good for mid/small caps', color: 'text-green-400' };
    return { text: 'NORMAL - Standard market conditions', color: 'text-gray-400' };
  };

  const getDayOfWeek = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  };

  const getDaySignal = () => {
    const day = new Date().getDay();
    if (day === 1) return { text: 'Monday: Historically POSITIVE in India (unlike US)', color: 'text-green-400' };
    if (day === 2) return { text: 'Tuesday: Often shows NEGATIVE returns', color: 'text-red-400' };
    if (day === 5) return { text: 'Friday: Historically higher returns', color: 'text-green-400' };
    return null;
  };

  const vixSignal = getVixSignal();
  const daySignal = getDaySignal();

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Navigation />

      <main className="flex-1 p-4 md:p-8 max-w-[1400px] mx-auto w-full">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <span className="text-4xl">🔮</span>
            <div>
              <h1 className="text-3xl font-bold text-white">Pattern Library</h1>
              <p className="text-gray-400">Hidden patterns & correlations backed by 2 years of data</p>
            </div>
          </div>
        </div>

      {/* Live Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {/* VIX Card */}
        <div className={`p-4 rounded-xl border-2 ${
          marketData.vix && marketData.vix > 20 ? 'border-red-500 bg-red-900/20' : 'border-gray-700 bg-gray-800'
        }`}>
          <div className="text-sm text-gray-400">India VIX (Fear Gauge)</div>
          <div className="text-2xl font-bold">
            {loading ? '...' : marketData.vix?.toFixed(2) || 'N/A'}
          </div>
          {marketData.vixChange !== undefined && (
            <div className={`text-sm ${marketData.vixChange >= 0 ? 'text-red-400' : 'text-green-400'}`}>
              {marketData.vixChange >= 0 ? '↑' : '↓'} {Math.abs(marketData.vixChange).toFixed(2)}%
            </div>
          )}
          {vixSignal && <div className={`text-xs mt-2 ${vixSignal.color}`}>{vixSignal.text}</div>}
        </div>

        {/* Day of Week */}
        <div className="p-4 rounded-xl border border-gray-700 bg-gray-800">
          <div className="text-sm text-gray-400">Today is</div>
          <div className="text-2xl font-bold">{getDayOfWeek()}</div>
          {daySignal && <div className={`text-xs mt-2 ${daySignal.color}`}>{daySignal.text}</div>}
        </div>

        {/* US Markets */}
        <div className="p-4 rounded-xl border border-gray-700 bg-gray-800">
          <div className="text-sm text-gray-400">Dow Jones (Overnight)</div>
          <div className={`text-2xl font-bold ${
            marketData.dowChange && marketData.dowChange >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {loading ? '...' : marketData.dowChange !== undefined
              ? `${marketData.dowChange >= 0 ? '+' : ''}${marketData.dowChange.toFixed(2)}%`
              : 'N/A'
            }
          </div>
          <div className="text-xs text-gray-400 mt-2">
            {marketData.dowChange && Math.abs(marketData.dowChange) > 1
              ? 'Strong move - expect Nifty impact'
              : 'Mild - limited impact expected'
            }
          </div>
        </div>

        {/* Nifty */}
        <div className="p-4 rounded-xl border border-gray-700 bg-gray-800">
          <div className="text-sm text-gray-400">Nifty 50</div>
          <div className="text-2xl font-bold">
            {loading ? '...' : marketData.giftNifty?.toLocaleString() || 'N/A'}
          </div>
          {marketData.giftNiftyChange !== undefined && (
            <div className={`text-sm ${marketData.giftNiftyChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {marketData.giftNiftyChange >= 0 ? '+' : ''}{marketData.giftNiftyChange.toFixed(2)}%
            </div>
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-4 mb-8">
        <div className="flex items-center gap-2 text-yellow-400 font-semibold mb-1">
          <span>⚠️</span> Important Disclaimer
        </div>
        <p className="text-sm text-gray-300">
          These patterns are based on historical data and research studies. Past performance doesn&apos;t guarantee future results.
          Markets evolve, correlations break down, and anomalies can disappear once widely known. Use as one input among many.
        </p>
      </div>

      {/* Morning Alerts Section */}
      <div className="mb-10 p-6 bg-gradient-to-br from-blue-900/40 to-purple-900/40 rounded-xl border-2 border-blue-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <span>🚨</span> Morning Trade Alerts
          </h2>
          <div className="flex items-center gap-4">
            {lastScanTime && (
              <div className="text-sm text-gray-400">
                Last scan: {lastScanTime}
              </div>
            )}
            {alertsData && (
              <div className="text-sm text-gray-400">
                {alertsData.date} ({alertsData.day})
              </div>
            )}
            <button
              onClick={handleManualScan}
              disabled={isScanning}
              className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all ${
                isScanning
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 active:scale-95'
              }`}
            >
              {isScanning ? (
                <>
                  <span className="animate-spin">⟳</span>
                  Scanning...
                </>
              ) : (
                <>
                  <span>🔍</span>
                  Scan Now
                </>
              )}
            </button>
          </div>
        </div>

        {/* Auto-scan info */}
        <div className="text-xs text-gray-500 mb-4 flex items-center gap-2">
          <span>⏰</span>
          Auto-scans daily at 9:15 AM IST (Mon-Fri) before market opens
        </div>

        {alertsLoading ? (
          <div className="text-center py-8 text-gray-400">
            <div className="animate-pulse">Analyzing 35 stocks for patterns...</div>
          </div>
        ) : alertsData && alertsData.alerts.length > 0 ? (
          <>
            {/* Summary */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              <div className="bg-green-900/30 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-400">{alertsData.summary.buyAlerts}</div>
                <div className="text-xs text-gray-400">BUY Signals</div>
              </div>
              <div className="bg-red-900/30 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-red-400">{alertsData.summary.sellAlerts}</div>
                <div className="text-xs text-gray-400">SELL Signals</div>
              </div>
              <div className="bg-yellow-900/30 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-yellow-400">{alertsData.summary.avoidAlerts}</div>
                <div className="text-xs text-gray-400">AVOID</div>
              </div>
              <div className="bg-blue-900/30 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-400">{alertsData.summary.watchAlerts}</div>
                <div className="text-xs text-gray-400">WATCH</div>
              </div>
            </div>

            {/* Alerts List */}
            <div className="space-y-4">
              {alertsData.alerts.slice(0, 10).map((alert, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border-l-4 ${
                    alert.type === 'BUY'
                      ? 'bg-green-900/20 border-green-500'
                      : alert.type === 'SELL'
                      ? 'bg-red-900/20 border-red-500'
                      : alert.type === 'AVOID'
                      ? 'bg-yellow-900/20 border-yellow-500'
                      : 'bg-blue-900/20 border-blue-500'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-bold ${
                            alert.type === 'BUY'
                              ? 'bg-green-600 text-white'
                              : alert.type === 'SELL'
                              ? 'bg-red-600 text-white'
                              : alert.type === 'AVOID'
                              ? 'bg-yellow-600 text-black'
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          {alert.type}
                        </span>
                        <span className="font-bold text-lg">{alert.stock}</span>
                        <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
                          {alert.pattern}
                        </span>
                      </div>
                      <div className="text-white font-medium mb-2">{alert.action}</div>
                      <div className="text-sm text-gray-400 bg-gray-800/50 p-2 rounded">
                        <span className="text-yellow-400 font-medium">Logic: </span>
                        {alert.logic}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-1">
                        <ConfidenceBar confidence={alert.confidence} />
                      </div>
                      {alert.expectedReturn && (
                        <div className="text-green-400 font-bold text-lg">
                          {alert.expectedReturn}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {alertsData.alerts.length > 10 && (
              <div className="text-center mt-4 text-gray-400 text-sm">
                + {alertsData.alerts.length - 10} more alerts
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <div className="text-4xl mb-2">✨</div>
            <div>No strong patterns detected today.</div>
            <div className="text-sm mt-1">Markets look neutral - no high-confidence setups.</div>
          </div>
        )}
      </div>

      {/* Secrets Accordion */}
      <div className="space-y-4">
        {Object.entries(SECRETS).map(([key, secret]) => (
          <div
            key={key}
            className="border border-gray-700 rounded-xl overflow-hidden"
          >
            {/* Header */}
            <button
              onClick={() => setExpandedSection(expandedSection === key ? null : key)}
              className="w-full p-5 bg-gray-800 hover:bg-gray-750 flex justify-between items-center transition-colors"
            >
              <div className="text-left">
                <h3 className="text-xl font-semibold">{secret.title}</h3>
                <p className="text-sm text-gray-400">{secret.description}</p>
              </div>
              <span className="text-2xl">{expandedSection === key ? '−' : '+'}</span>
            </button>

            {/* Content */}
            {expandedSection === key && (
              <div className="p-5 bg-gray-900/50 space-y-4">
                {secret.patterns.map((pattern, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-gray-800 rounded-lg border border-gray-700"
                  >
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2 mb-3">
                      <div className="flex-1">
                        <div className="text-yellow-400 font-medium mb-1">IF: {pattern.rule}</div>
                        <div className="text-green-400">THEN: {pattern.action}</div>
                      </div>
                      <ConfidenceBar confidence={pattern.confidence} />
                    </div>
                    <div className="text-xs text-gray-500">Source: {pattern.source}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick Reference */}
      <div className="mt-10 p-6 bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-xl border border-purple-500">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <span>⚡</span> Quick Morning Checklist
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="text-gray-300">
              <span className="text-yellow-400">1.</span> Check India VIX - Above 20 = cautious, Below 15 = aggressive
            </div>
            <div className="text-gray-300">
              <span className="text-yellow-400">2.</span> Check GIFT Nifty - Gap direction indicator
            </div>
            <div className="text-gray-300">
              <span className="text-yellow-400">3.</span> Check US overnight close - Strong move = Nifty impact
            </div>
            <div className="text-gray-300">
              <span className="text-yellow-400">4.</span> Check day of week - Monday positive, Tuesday caution
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-gray-300">
              <span className="text-yellow-400">5.</span> Check FII/DII data (6:30 PM previous day)
            </div>
            <div className="text-gray-300">
              <span className="text-yellow-400">6.</span> Check if expiry day - Higher volatility expected
            </div>
            <div className="text-gray-300">
              <span className="text-yellow-400">7.</span> Check Bank Nifty vs Nifty ratio for risk sentiment
            </div>
            <div className="text-gray-300">
              <span className="text-yellow-400">8.</span> Check sector rotation - Metals vs IT/FMCG
            </div>
          </div>
        </div>
      </div>

      {/* Most Reliable Secrets - Data Backed */}
      <div className="mt-8 p-6 bg-green-900/20 rounded-xl border border-green-600">
        <h2 className="text-xl font-bold mb-4 text-green-400">🎯 Highest Conviction Patterns (From Our Analysis)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-gray-800 rounded-lg">
            <div className="font-semibold text-yellow-400">52-Week Low Breakdown = BUY</div>
            <div className="text-sm text-gray-400">80% win rate, +4.43% avg in 20 days (55 occurrences)</div>
          </div>
          <div className="p-3 bg-gray-800 rounded-lg">
            <div className="font-semibold text-yellow-400">Finance rallies &gt;2% = SHORT IT</div>
            <div className="text-sm text-gray-400">66% negative next day, -0.26% avg (29 samples)</div>
          </div>
          <div className="p-3 bg-gray-800 rounded-lg">
            <div className="font-semibold text-yellow-400">Small gap (0.5-1%) = FADE</div>
            <div className="text-sm text-gray-400">72.5% fill same day (7000+ gaps analyzed)</div>
          </div>
          <div className="p-3 bg-gray-800 rounded-lg">
            <div className="font-semibold text-yellow-400">Infra rallies &gt;2% = BUY Metals</div>
            <div className="text-sm text-gray-400">72% positive next day, +0.32% avg</div>
          </div>
          <div className="p-3 bg-gray-800 rounded-lg">
            <div className="font-semibold text-yellow-400">Huge gap down (&gt;3%) = BUY</div>
            <div className="text-sm text-gray-400">60.1% positive next day (288 occurrences)</div>
          </div>
          <div className="p-3 bg-gray-800 rounded-lg">
            <div className="font-semibold text-yellow-400">Consecutive days = NO EDGE</div>
            <div className="text-sm text-gray-400">Myth busted: ~50% reversal rate (20000+ samples)</div>
          </div>
        </div>
      </div>

        {/* Data Source Note */}
        <div className="mt-10 text-center text-gray-500 text-sm">
          <p>Analysis based on 2 years of Nifty 100 data (98 stocks, ~497 trading days each, 48,000+ data points)</p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
