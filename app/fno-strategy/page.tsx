'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

interface MarketData {
  vix: number;
  vixChange: number;
  nifty: number;
  niftyChange: number;
  bankNifty: number;
  bankNiftyChange: number;
}

// Recommended stocks for option selling
const RECOMMENDED_STOCKS = {
  conservative: [
    { symbol: 'HDFCBANK', name: 'HDFC Bank', reason: 'High liquidity, tight spreads, predictable' },
    { symbol: 'ICICIBANK', name: 'ICICI Bank', reason: 'Banking leader, good OI' },
    { symbol: 'TCS', name: 'TCS', reason: 'IT stable, less volatile' },
    { symbol: 'INFY', name: 'Infosys', reason: 'Range-bound, good for selling' },
    { symbol: 'ITC', name: 'ITC', reason: 'Very stable, high OI' },
  ],
  moderate: [
    { symbol: 'RELIANCE', name: 'Reliance', reason: 'Highest liquidity, market leader' },
    { symbol: 'SBIN', name: 'SBI', reason: 'PSU bank, good volatility' },
    { symbol: 'AXISBANK', name: 'Axis Bank', reason: 'Good premium, liquid' },
    { symbol: 'KOTAKBANK', name: 'Kotak Bank', reason: 'Private bank, stable' },
    { symbol: 'HINDUNILVR', name: 'HUL', reason: 'FMCG stable, range-bound' },
  ],
  aggressive: [
    { symbol: 'TATASTEEL', name: 'Tata Steel', reason: 'Higher IV, more premium' },
    { symbol: 'BAJFINANCE', name: 'Bajaj Finance', reason: 'NBFC, volatile but liquid' },
    { symbol: 'BHARTIARTL', name: 'Bharti Airtel', reason: 'Telecom, trending' },
    { symbol: 'LT', name: 'L&T', reason: 'Infra, event-driven' },
    { symbol: 'MARUTI', name: 'Maruti', reason: 'Auto, cyclical' },
  ],
};

// Strategy templates
const STRATEGIES = [
  {
    id: 'bull-put-spread',
    name: 'Bull Put Spread',
    description: 'Sell OTM PUT, Buy lower PUT for protection',
    winRate: '70%',
    bestWhen: 'Bullish to neutral view',
    delta: '30 Delta',
    risk: 'Limited',
    icon: '📈',
  },
  {
    id: 'bear-call-spread',
    name: 'Bear Call Spread',
    description: 'Sell OTM CALL, Buy higher CALL for protection',
    winRate: '70%',
    bestWhen: 'Bearish to neutral view',
    delta: '30 Delta',
    risk: 'Limited',
    icon: '📉',
  },
  {
    id: 'iron-condor',
    name: 'Iron Condor',
    description: 'Sell both OTM PUT and CALL spreads',
    winRate: '68-86%',
    bestWhen: 'Range-bound, low VIX',
    delta: '16 Delta both sides',
    risk: 'Limited',
    icon: '🦅',
  },
  {
    id: 'short-strangle',
    name: 'Short Strangle',
    description: 'Sell OTM PUT and CALL (naked)',
    winRate: '84%',
    bestWhen: 'Low VIX, range-bound',
    delta: '16 Delta both sides',
    risk: 'Unlimited - Requires margin',
    icon: '⚡',
  },
];

export default function FNOStrategyPage() {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [capital, setCapital] = useState<number>(500000);
  const [riskPercent, setRiskPercent] = useState<number>(2);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('bull-put-spread');
  const [stockCategory, setStockCategory] = useState<'conservative' | 'moderate' | 'aggressive'>('moderate');

  // Calculator states
  const [premium, setPremium] = useState<number>(30);
  const [spreadWidth, setSpreadWidth] = useState<number>(100);
  const [lotSize, setLotSize] = useState<number>(25);

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        // Fetch VIX
        const vixResponse = await fetch(
          'https://query1.finance.yahoo.com/v8/finance/chart/%5EINDIAVIX?interval=1d&range=2d'
        );
        const vixData = await vixResponse.json();
        const vixResult = vixData.chart?.result?.[0];
        const vixPrice = vixResult?.meta?.regularMarketPrice || 0;
        const vixPrev = vixResult?.meta?.chartPreviousClose || vixPrice;

        // Fetch Nifty
        const niftyResponse = await fetch(
          'https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEI?interval=1d&range=2d'
        );
        const niftyData = await niftyResponse.json();
        const niftyResult = niftyData.chart?.result?.[0];
        const niftyPrice = niftyResult?.meta?.regularMarketPrice || 0;
        const niftyPrev = niftyResult?.meta?.chartPreviousClose || niftyPrice;

        // Fetch Bank Nifty
        const bnResponse = await fetch(
          'https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEBANK?interval=1d&range=2d'
        );
        const bnData = await bnResponse.json();
        const bnResult = bnData.chart?.result?.[0];
        const bnPrice = bnResult?.meta?.regularMarketPrice || 0;
        const bnPrev = bnResult?.meta?.chartPreviousClose || bnPrice;

        setMarketData({
          vix: vixPrice,
          vixChange: ((vixPrice - vixPrev) / vixPrev) * 100,
          nifty: niftyPrice,
          niftyChange: ((niftyPrice - niftyPrev) / niftyPrev) * 100,
          bankNifty: bnPrice,
          bankNiftyChange: ((bnPrice - bnPrev) / bnPrev) * 100,
        });
      } catch (error) {
        console.error('Error fetching market data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMarketData();
  }, []);

  // Calculate position size
  const maxRiskAmount = (capital * riskPercent) / 100;
  const maxLoss = (spreadWidth - premium) * lotSize;
  const maxLots = Math.floor(maxRiskAmount / maxLoss) || 1;
  const totalPremium = premium * lotSize * maxLots;
  const totalRisk = maxLoss * maxLots;
  const roi = ((totalPremium / totalRisk) * 100).toFixed(1);

  // VIX-based recommendation
  const getVixSignal = () => {
    if (!marketData) return null;
    if (marketData.vix > 20) {
      return {
        signal: 'CAUTION',
        color: 'text-red-400',
        bg: 'bg-red-500/10 border-red-500/30',
        message: 'High VIX - Reduce position size by 50%, wider stops',
        action: 'Avoid Iron Condors, prefer directional spreads',
      };
    }
    if (marketData.vix > 15) {
      return {
        signal: 'MODERATE',
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/10 border-yellow-500/30',
        message: 'Elevated VIX - Normal position size, be selective',
        action: 'Credit spreads OK, avoid short strangles',
      };
    }
    return {
      signal: 'FAVORABLE',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/30',
      message: 'Low VIX - Ideal for option selling strategies',
      action: 'All strategies OK - Iron Condors, Strangles work well',
    };
  };

  const getDaySignal = () => {
    const day = new Date().getDay();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    if (day === 4) {
      return { day: dayNames[day], signal: 'EXPIRY DAY', color: 'text-red-400', note: 'Avoid new positions, close existing' };
    }
    if (day === 3) {
      return { day: dayNames[day], signal: 'BEST DAY', color: 'text-emerald-400', note: 'Ideal for weekly credit spreads' };
    }
    if (day === 2) {
      return { day: dayNames[day], signal: 'GOOD', color: 'text-emerald-400', note: 'Good for 2-day theta plays' };
    }
    if (day === 1) {
      return { day: dayNames[day], signal: 'OK', color: 'text-yellow-400', note: 'Full week expiry, wider strikes' };
    }
    if (day === 5) {
      return { day: dayNames[day], signal: 'NEXT WEEK', color: 'text-blue-400', note: 'Plan for next week expiry' };
    }
    return { day: dayNames[day], signal: 'MARKET CLOSED', color: 'text-gray-400', note: 'Weekend - Plan your trades' };
  };

  const vixSignal = getVixSignal();
  const daySignal = getDaySignal();

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Navigation />

      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">🎯</span>
            <div>
              <h1 className="text-3xl font-bold text-white">F&O Strategy Builder</h1>
              <p className="text-gray-400">Data-driven option selling strategies with 70%+ win rate</p>
            </div>
          </div>
        </div>

        {/* Market Pulse */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {/* VIX */}
          <div className={`p-4 rounded-xl border ${vixSignal?.bg || 'border-gray-800 bg-gray-900'}`}>
            <div className="text-xs text-gray-400 mb-1">India VIX</div>
            <div className="text-2xl font-bold text-white">
              {loading ? '...' : marketData?.vix.toFixed(2)}
            </div>
            {marketData && (
              <div className={`text-xs ${marketData.vixChange >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {marketData.vixChange >= 0 ? '↑' : '↓'} {Math.abs(marketData.vixChange).toFixed(2)}%
              </div>
            )}
            {vixSignal && (
              <div className={`text-xs mt-1 font-medium ${vixSignal.color}`}>{vixSignal.signal}</div>
            )}
          </div>

          {/* Nifty */}
          <div className="p-4 rounded-xl border border-gray-800 bg-gray-900">
            <div className="text-xs text-gray-400 mb-1">Nifty 50</div>
            <div className="text-2xl font-bold text-white">
              {loading ? '...' : marketData?.nifty.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            {marketData && (
              <div className={`text-xs ${marketData.niftyChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {marketData.niftyChange >= 0 ? '+' : ''}{marketData.niftyChange.toFixed(2)}%
              </div>
            )}
          </div>

          {/* Bank Nifty */}
          <div className="p-4 rounded-xl border border-gray-800 bg-gray-900">
            <div className="text-xs text-gray-400 mb-1">Bank Nifty</div>
            <div className="text-2xl font-bold text-white">
              {loading ? '...' : marketData?.bankNifty.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            {marketData && (
              <div className={`text-xs ${marketData.bankNiftyChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {marketData.bankNiftyChange >= 0 ? '+' : ''}{marketData.bankNiftyChange.toFixed(2)}%
              </div>
            )}
          </div>

          {/* Day Signal */}
          <div className="p-4 rounded-xl border border-gray-800 bg-gray-900">
            <div className="text-xs text-gray-400 mb-1">Today</div>
            <div className="text-xl font-bold text-white">{daySignal.day}</div>
            <div className={`text-xs font-medium ${daySignal.color}`}>{daySignal.signal}</div>
            <div className="text-[10px] text-gray-500 mt-1">{daySignal.note}</div>
          </div>
        </div>

        {/* VIX Recommendation */}
        {vixSignal && (
          <div className={`p-4 rounded-xl border mb-6 ${vixSignal.bg}`}>
            <div className="flex items-start gap-3">
              <span className="text-2xl">{marketData && marketData.vix > 20 ? '⚠️' : marketData && marketData.vix > 15 ? '⚡' : '✅'}</span>
              <div>
                <div className={`font-semibold ${vixSignal.color}`}>{vixSignal.message}</div>
                <div className="text-sm text-gray-400 mt-1">{vixSignal.action}</div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Strategy Selection */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Select Strategy</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {STRATEGIES.map((strategy) => (
                <button
                  key={strategy.id}
                  onClick={() => setSelectedStrategy(strategy.id)}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    selectedStrategy === strategy.id
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{strategy.icon}</span>
                    <span className="font-semibold text-white">{strategy.name}</span>
                  </div>
                  <div className="text-xs text-gray-400 mb-2">{strategy.description}</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                      {strategy.winRate} Win Rate
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                      {strategy.delta}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Selected Strategy Details */}
            {selectedStrategy && (
              <div className="mt-4 p-4 bg-gray-800/50 rounded-lg">
                <div className="text-sm text-gray-400">
                  <strong className="text-white">Best When:</strong>{' '}
                  {STRATEGIES.find((s) => s.id === selectedStrategy)?.bestWhen}
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  <strong className="text-white">Risk:</strong>{' '}
                  {STRATEGIES.find((s) => s.id === selectedStrategy)?.risk}
                </div>
              </div>
            )}
          </div>

          {/* Position Calculator */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Position Calculator</h2>

            <div className="space-y-4">
              {/* Capital Input */}
              <div>
                <label className="text-sm text-gray-400 block mb-1">Trading Capital (₹)</label>
                <input
                  type="number"
                  value={capital}
                  onChange={(e) => setCapital(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Risk % */}
              <div>
                <label className="text-sm text-gray-400 block mb-1">Risk Per Trade (%)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 5].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setRiskPercent(pct)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                        riskPercent === pct
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Trade Params */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Premium (₹)</label>
                  <input
                    type="number"
                    value={premium}
                    onChange={(e) => setPremium(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Spread (₹)</label>
                  <input
                    type="number"
                    value={spreadWidth}
                    onChange={(e) => setSpreadWidth(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Lot Size</label>
                  <input
                    type="number"
                    value={lotSize}
                    onChange={(e) => setLotSize(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Results */}
              <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Max Risk Amount</span>
                  <span className="text-white font-semibold">₹{maxRiskAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Recommended Lots</span>
                  <span className="text-emerald-400 font-bold text-xl">{maxLots}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Max Profit</span>
                  <span className="text-emerald-400 font-semibold">₹{totalPremium.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Max Loss</span>
                  <span className="text-red-400 font-semibold">₹{totalRisk.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-700">
                  <span className="text-gray-400">ROI (if win)</span>
                  <span className="text-emerald-400 font-bold">{roi}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stock Recommendations */}
        <div className="mt-6 bg-gray-900 rounded-xl border border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Recommended Stocks for Option Selling</h2>
            <div className="flex gap-2">
              {(['conservative', 'moderate', 'aggressive'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setStockCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${
                    stockCategory === cat
                      ? cat === 'conservative'
                        ? 'bg-blue-500 text-white'
                        : cat === 'moderate'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-orange-500 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {RECOMMENDED_STOCKS[stockCategory].map((stock) => (
              <div
                key={stock.symbol}
                className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-gray-600 transition"
              >
                <div className="font-semibold text-white mb-1">{stock.symbol}</div>
                <div className="text-xs text-gray-500 mb-2">{stock.name}</div>
                <div className="text-[10px] text-gray-400">{stock.reason}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Delta Strike Guide */}
        <div className="mt-6 bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Strike Selection Guide (Delta-Based)</h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-sm text-gray-400 font-medium">Delta</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-400 font-medium">Win Probability</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-400 font-medium">Premium</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-400 font-medium">Best For</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-400 font-medium">Risk Level</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-800">
                  <td className="py-3 px-4 text-white font-mono">0.16 (16)</td>
                  <td className="py-3 px-4 text-emerald-400 font-semibold">~84%</td>
                  <td className="py-3 px-4 text-gray-400">Low</td>
                  <td className="py-3 px-4 text-gray-400">Iron Condors, Conservative</td>
                  <td className="py-3 px-4"><span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs">Low</span></td>
                </tr>
                <tr className="border-b border-gray-800 bg-emerald-500/5">
                  <td className="py-3 px-4 text-white font-mono">0.30 (30)</td>
                  <td className="py-3 px-4 text-emerald-400 font-semibold">~70%</td>
                  <td className="py-3 px-4 text-gray-400">Medium</td>
                  <td className="py-3 px-4 text-emerald-400 font-medium">Credit Spreads (Recommended)</td>
                  <td className="py-3 px-4"><span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-xs">Medium</span></td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="py-3 px-4 text-white font-mono">0.40 (40)</td>
                  <td className="py-3 px-4 text-yellow-400 font-semibold">~60%</td>
                  <td className="py-3 px-4 text-gray-400">High</td>
                  <td className="py-3 px-4 text-gray-400">Short Puts, Aggressive</td>
                  <td className="py-3 px-4"><span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 text-xs">Higher</span></td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-white font-mono">0.50 (50)</td>
                  <td className="py-3 px-4 text-red-400 font-semibold">~50%</td>
                  <td className="py-3 px-4 text-gray-400">Highest</td>
                  <td className="py-3 px-4 text-gray-400">ATM - Not recommended for selling</td>
                  <td className="py-3 px-4"><span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-xs">High</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Trade Rules */}
        <div className="mt-6 bg-gradient-to-br from-emerald-900/20 to-blue-900/20 rounded-xl border border-emerald-500/30 p-6">
          <h2 className="text-xl font-bold text-white mb-4">The 70% Win Rate Rules</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-gray-900/50 rounded-lg p-4">
              <div className="text-emerald-400 font-semibold mb-2">Entry Rules</div>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Trade Tuesday/Wednesday (Thu expiry)</li>
                <li>• Enter after 11 AM (volatility settles)</li>
                <li>• VIX below 18 for Iron Condors</li>
                <li>• Use 30 Delta strikes for 70% probability</li>
              </ul>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4">
              <div className="text-blue-400 font-semibold mb-2">Exit Rules</div>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Take profit at 50% of premium</li>
                <li>• Stop loss at 2x premium collected</li>
                <li>• Exit by Thursday 2 PM (expiry day)</li>
                <li>• Never hold through major events</li>
              </ul>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4">
              <div className="text-red-400 font-semibold mb-2">Risk Rules</div>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Max 2-3% capital per trade</li>
                <li>• No naked options (always hedge)</li>
                <li>• Reduce size when VIX &gt; 20</li>
                <li>• Skip trades before RBI/Budget/Elections</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-6 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div className="text-sm text-yellow-200/80">
              <strong>Disclaimer:</strong> Options trading involves significant risk. Past performance and backtested results don&apos;t guarantee future returns.
              The 70% win rate is based on historical data and proper execution. Always paper trade first and never risk money you can&apos;t afford to lose.
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
