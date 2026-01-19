'use client';

import { useState, useEffect } from 'react';
import { BTST_SAFE_STOCKS, BTST_AVOID_STOCKS } from '@/lib/nifty100';

interface ScanResult {
  symbol: string;
  close: number;
  change: number;
  changePercent: number;
  volume: number;
  avgVolume: number;
  volumeRatio: number;
  rsi: number;
  reason: string[];
  score: number;
}

interface BacktestResult {
  symbol: string;
  totalTrades: number;
  winRate: number;
  totalReturn: number;
}

export default function BTSTScanner() {
  const [results, setResults] = useState<ScanResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<Date | null>(null);
  const [backtestResults, setBacktestResults] = useState<BacktestResult[]>([]);
  const [backtestLoading, setBacktestLoading] = useState(false);

  const runScan = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/scan?scanner=btst&limit=200');
      const data = await response.json();
      if (data.success) {
        setResults(data.results);
        setLastScan(new Date());
      } else {
        setError(data.error || 'Scan failed');
      }
    } catch (err) {
      setError('Failed to run scan');
    } finally {
      setLoading(false);
    }
  };

  const runBacktest = async () => {
    setBacktestLoading(true);
    try {
      const response = await fetch('/api/btst-backtest?months=6&limit=200');
      const data = await response.json();
      if (data.success) {
        setBacktestResults(data.data.stockResults.slice(0, 20));
      }
    } catch (err) {
      console.error('Backtest failed:', err);
    } finally {
      setBacktestLoading(false);
    }
  };

  const isOptimalTime = () => {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const ist = new Date(now.getTime() + istOffset);
    const hours = ist.getUTCHours();
    const minutes = ist.getUTCMinutes();
    const time = hours * 60 + minutes;
    // 3:00 PM to 3:25 PM IST = 900 to 925 minutes
    return time >= 900 && time <= 925;
  };

  const formatVolume = (vol: number) => {
    if (vol >= 10000000) return `${(vol / 10000000).toFixed(2)} Cr`;
    if (vol >= 100000) return `${(vol / 100000).toFixed(2)} L`;
    return `${(vol / 1000).toFixed(1)} K`;
  };

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              BTST Scanner
              <span className="text-sm bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">
                Buy Today, Sell Tomorrow
              </span>
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Momentum breakout scanner for overnight trades
            </p>
          </div>
          <div className={`px-4 py-2 rounded-lg text-sm font-medium ${
            isOptimalTime()
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse'
              : 'bg-gray-800 text-gray-400'
          }`}>
            {isOptimalTime() ? '🟢 Optimal Time to Scan!' : 'Best time: 3:00 - 3:25 PM IST'}
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* When to Run */}
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
          <h3 className="text-emerald-400 font-semibold mb-2 flex items-center gap-2">
            <span>⏰</span> When to Run
          </h3>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• <strong>3:00 PM - 3:25 PM IST</strong> (before market close)</li>
            <li>• Buy at market close (3:25-3:30 PM)</li>
            <li>• Sell next day at open or close</li>
            <li>• Avoid on expiry days (Thursdays)</li>
          </ul>
        </div>

        {/* Strategy */}
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
          <h3 className="text-blue-400 font-semibold mb-2 flex items-center gap-2">
            <span>📊</span> Strategy Conditions
          </h3>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• Close &gt; EMA(20) - Short-term trend</li>
            <li>• Close &gt; Previous High - Breakout</li>
            <li>• RSI(14) between 55-75</li>
            <li>• Volume &gt; 1.5x Average</li>
            <li>• Close &gt; SMA(50)</li>
          </ul>
        </div>

        {/* Backtest Stats */}
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
          <h3 className="text-yellow-400 font-semibold mb-2 flex items-center gap-2">
            <span>📈</span> 6-Month Backtest
          </h3>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• Win Rate: <strong className="text-emerald-400">51.14%</strong></li>
            <li>• Avg Return/Trade: <strong className="text-emerald-400">+0.48%</strong></li>
            <li>• Total Return: <strong className="text-emerald-400">+85%</strong></li>
            <li>• 176 trades on Nifty 100</li>
          </ul>
        </div>
      </div>

      {/* Safe Stocks Section */}
      <div className="bg-gray-900 rounded-lg p-4 mb-6 border border-emerald-500/30">
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <span>✅</span> Top 5 Safe Stocks for BTST (Backtested)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {BTST_SAFE_STOCKS.map((stock, i) => (
            <div key={stock.symbol} className="bg-gray-800 rounded-lg p-3 text-center">
              <div className="text-emerald-400 font-bold text-lg">{i + 1}. {stock.symbol}</div>
              <div className="text-sm text-gray-400 mt-1">
                Win Rate: <span className="text-white">{stock.winRate}%</span>
              </div>
              <div className="text-sm text-gray-400">
                Avg: <span className="text-emerald-400">+{stock.avgReturn.toFixed(2)}%</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">{stock.bestFor}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Avoid Stocks */}
      <div className="bg-gray-900 rounded-lg p-4 mb-6 border border-red-500/30">
        <h3 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
          <span>⚠️</span> Stocks to AVOID (0% win rate in backtest)
        </h3>
        <div className="flex flex-wrap gap-2">
          {BTST_AVOID_STOCKS.map((symbol) => (
            <span key={symbol} className="bg-red-500/20 text-red-400 px-3 py-1 rounded text-sm">
              {symbol}
            </span>
          ))}
        </div>
      </div>

      {/* Scan Button */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={runScan}
          disabled={loading}
          className={`px-6 py-3 rounded-lg font-semibold text-lg transition ${
            loading
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
        >
          {loading ? 'Scanning 200 stocks...' : 'Run BTST Scan (200 Stocks)'}
        </button>
        <button
          onClick={runBacktest}
          disabled={backtestLoading}
          className="px-4 py-3 rounded-lg font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 transition"
        >
          {backtestLoading ? 'Running...' : 'Run 6-Month Backtest'}
        </button>
        {lastScan && (
          <span className="text-gray-500 text-sm">
            Last scan: {lastScan.toLocaleTimeString('en-IN')}
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6 text-red-400">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-400">Scanning 200 stocks for BTST signals...</p>
        </div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <div className="bg-gray-900 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h3 className="text-lg font-semibold text-white">
              {results.length} Stocks Found with BTST Signals
            </h3>
            <p className="text-sm text-gray-400">Sorted by score (higher = stronger signal)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-400">#</th>
                  <th className="px-4 py-3 font-semibold text-gray-400">Symbol</th>
                  <th className="px-4 py-3 font-semibold text-gray-400 text-right">Price</th>
                  <th className="px-4 py-3 font-semibold text-gray-400 text-right">Change</th>
                  <th className="px-4 py-3 font-semibold text-gray-400 text-right">Vol/Avg</th>
                  <th className="px-4 py-3 font-semibold text-gray-400 text-right">RSI</th>
                  <th className="px-4 py-3 font-semibold text-gray-400">Score</th>
                  <th className="px-4 py-3 font-semibold text-gray-400">Signals</th>
                  <th className="px-4 py-3 font-semibold text-gray-400">Safety</th>
                </tr>
              </thead>
              <tbody>
                {results.map((stock, index) => {
                  const isSafe = BTST_SAFE_STOCKS.some(s => s.symbol === stock.symbol);
                  const isAvoid = BTST_AVOID_STOCKS.includes(stock.symbol);
                  return (
                    <tr key={stock.symbol} className="border-t border-gray-800 hover:bg-gray-800/50">
                      <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${isSafe ? 'text-emerald-400' : isAvoid ? 'text-red-400' : 'text-white'}`}>
                          {stock.symbol}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-white">
                        {stock.close.toFixed(2)}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono ${stock.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        <span className={stock.volumeRatio >= 2 ? 'text-emerald-400' : 'text-white'}>
                          {stock.volumeRatio.toFixed(1)}x
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-white">
                        {stock.rsi.toFixed(0)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded text-xs font-bold">
                          {stock.score}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {stock.reason.slice(0, 3).map((r, i) => (
                            <span key={i} className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded text-xs">
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {isSafe && <span className="text-emerald-400 text-lg" title="Safe - High win rate">✅</span>}
                        {isAvoid && <span className="text-red-400 text-lg" title="Avoid - Low win rate">⚠️</span>}
                        {!isSafe && !isAvoid && <span className="text-gray-500">-</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No Results */}
      {!loading && results.length === 0 && lastScan && (
        <div className="bg-gray-900 rounded-lg p-12 text-center">
          <p className="text-gray-400 text-lg">No BTST signals found today</p>
          <p className="text-gray-500 text-sm mt-2">
            This means no stocks meet all the criteria. Try scanning during market hours.
          </p>
        </div>
      )}

      {/* Initial State */}
      {!loading && results.length === 0 && !lastScan && (
        <div className="bg-gray-900 rounded-lg p-12 text-center">
          <p className="text-gray-400 text-lg mb-4">Click &quot;Run BTST Scan&quot; to find opportunities</p>
          <p className="text-gray-500 text-sm">
            Best results when run between 3:00 PM - 3:25 PM IST
          </p>
        </div>
      )}

      {/* Backtest Results */}
      {backtestResults.length > 0 && (
        <div className="mt-6 bg-gray-900 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3">Top 20 Stocks by Backtest Performance</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {backtestResults.map((stock, i) => (
              <div key={stock.symbol} className={`p-3 rounded-lg ${stock.totalReturn > 0 ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                <div className="font-semibold text-white">{i + 1}. {stock.symbol}</div>
                <div className="text-sm text-gray-400">
                  Trades: {stock.totalTrades} | Win: {stock.winRate.toFixed(0)}%
                </div>
                <div className={`text-sm font-mono ${stock.totalReturn > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {stock.totalReturn > 0 ? '+' : ''}{stock.totalReturn.toFixed(2)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
