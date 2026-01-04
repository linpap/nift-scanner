'use client';

import { useState, useEffect } from 'react';

interface ScanResult {
  symbol: string;
  close: number;
  change: number;
  changePercent: number;
  volume: number;
  rsi: number;
  reason: string[];
  score: number;
}

interface ScanResponse {
  success: boolean;
  scanner: string;
  timestamp: string;
  results: ScanResult[];
  totalScanned: number;
  matchCount: number;
  meta: {
    scanTime: number;
    errors?: string[];
  };
}

const SCANNERS = [
  { id: 'range_expansion', name: 'Range Expansion + Trend', description: 'From your Chartink screenshot' },
  { id: 'ema_crossover', name: '5/20 EMA Crossover', description: 'Swing trading signals' },
  { id: 'breakout', name: '20-Day Breakout', description: 'Momentum breakouts' },
  { id: 'ema_8_21', name: 'EMA 8/21 + RSI', description: 'Short-term momentum' },
];

export default function Home() {
  const [selectedScanner, setSelectedScanner] = useState('range_expansion');
  const [results, setResults] = useState<ScanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stockLimit, setStockLimit] = useState(30);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const runScan = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/scan?scanner=${selectedScanner}&limit=${stockLimit}`);
      const data = await response.json();

      if (data.success) {
        setResults(data);
        setLastScanTime(new Date());
      } else {
        setError(data.error || 'Scan failed');
      }
    } catch (err) {
      setError(`Failed to run scan: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh every 5 minutes if enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      runScan();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, selectedScanner, stockLimit]);

  // Check if market is open (9:15 AM - 3:30 PM IST)
  const isMarketOpen = () => {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const ist = new Date(now.getTime() + istOffset);
    const hours = ist.getUTCHours();
    const minutes = ist.getUTCMinutes();
    const time = hours * 60 + minutes;
    const day = ist.getUTCDay();

    // Weekday and between 9:15 AM and 3:30 PM
    return day >= 1 && day <= 5 && time >= 555 && time <= 930;
  };

  const formatVolume = (vol: number) => {
    if (vol >= 10000000) return `${(vol / 10000000).toFixed(2)} Cr`;
    if (vol >= 100000) return `${(vol / 100000).toFixed(2)} L`;
    if (vol >= 1000) return `${(vol / 1000).toFixed(1)} K`;
    return vol.toString();
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  return (
    <main className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-emerald-400 mb-2">NIFT Scanner</h1>
        <p className="text-gray-400">NSE F&O Stock Scanner for Swing Trading</p>
        <div className="flex items-center gap-4 mt-2 text-sm">
          <span className={`px-2 py-1 rounded ${isMarketOpen() ? 'bg-emerald-900 text-emerald-400' : 'bg-red-900 text-red-400'}`}>
            Market {isMarketOpen() ? 'Open' : 'Closed'}
          </span>
          {lastScanTime && (
            <span className="text-gray-500">
              Last scan: {formatTime(lastScanTime)}
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-900 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Scanner Selection */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Scanner</label>
            <select
              value={selectedScanner}
              onChange={(e) => setSelectedScanner(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
            >
              {SCANNERS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {SCANNERS.find((s) => s.id === selectedScanner)?.description}
            </p>
          </div>

          {/* Stock Limit */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Stocks to Scan</label>
            <select
              value={stockLimit}
              onChange={(e) => setStockLimit(Number(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value={20}>Top 20 F&O</option>
              <option value={30}>Top 30 F&O</option>
              <option value={50}>Top 50 F&O</option>
              <option value={100}>Top 100 F&O</option>
            </select>
          </div>

          {/* Auto Refresh */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Auto Refresh</label>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`w-full px-3 py-2 rounded border ${
                autoRefresh
                  ? 'bg-emerald-900 border-emerald-600 text-emerald-400'
                  : 'bg-gray-800 border-gray-700 text-gray-400'
              }`}
            >
              {autoRefresh ? 'ON (5 min)' : 'OFF'}
            </button>
          </div>

          {/* Run Scan Button */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">&nbsp;</label>
            <button
              onClick={runScan}
              disabled={loading}
              className={`w-full px-4 py-2 rounded font-semibold transition ${
                loading
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {loading ? 'Scanning...' : 'Run Scan'}
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6 text-red-400">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-400">Fetching data and running scanner...</p>
          <p className="text-sm text-gray-500">This may take 30-60 seconds</p>
        </div>
      )}

      {/* Results */}
      {results && !loading && (
        <div>
          {/* Summary */}
          <div className="bg-gray-900 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-emerald-400">{results.matchCount}</p>
                <p className="text-sm text-gray-400">Matches Found</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{results.totalScanned}</p>
                <p className="text-sm text-gray-400">Stocks Scanned</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{(results.meta.scanTime / 1000).toFixed(1)}s</p>
                <p className="text-sm text-gray-400">Scan Time</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{results.scanner}</p>
                <p className="text-sm text-gray-400">Scanner Used</p>
              </div>
            </div>
          </div>

          {/* Results Table */}
          {results.results.length > 0 ? (
            <div className="bg-gray-900 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-800 text-left">
                      <th className="px-4 py-3 text-sm font-semibold text-gray-400">#</th>
                      <th className="px-4 py-3 text-sm font-semibold text-gray-400">Symbol</th>
                      <th className="px-4 py-3 text-sm font-semibold text-gray-400 text-right">Price</th>
                      <th className="px-4 py-3 text-sm font-semibold text-gray-400 text-right">Change</th>
                      <th className="px-4 py-3 text-sm font-semibold text-gray-400 text-right">Volume</th>
                      <th className="px-4 py-3 text-sm font-semibold text-gray-400 text-right">RSI</th>
                      <th className="px-4 py-3 text-sm font-semibold text-gray-400 text-right">Score</th>
                      <th className="px-4 py-3 text-sm font-semibold text-gray-400">Signals</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.results.map((stock, index) => (
                      <tr
                        key={stock.symbol}
                        className="border-t border-gray-800 hover:bg-gray-800/50 stock-card"
                      >
                        <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                        <td className="px-4 py-3">
                          <a
                            href={`https://www.tradingview.com/chart/?symbol=NSE:${stock.symbol}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-emerald-400 hover:text-emerald-300"
                          >
                            {stock.symbol}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {stock.close.toFixed(2)}
                        </td>
                        <td className={`px-4 py-3 text-right font-mono ${stock.changePercent >= 0 ? 'text-profit' : 'text-loss'}`}>
                          {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-gray-400">
                          {formatVolume(stock.volume)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          <span className={stock.rsi > 70 ? 'text-red-400' : stock.rsi < 30 ? 'text-emerald-400' : 'text-white'}>
                            {stock.rsi.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="bg-emerald-900 text-emerald-400 px-2 py-1 rounded text-sm font-semibold">
                            {stock.score}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {stock.reason.slice(0, 3).map((r, i) => (
                              <span
                                key={i}
                                className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded text-xs"
                              >
                                {r}
                              </span>
                            ))}
                            {stock.reason.length > 3 && (
                              <span className="text-gray-500 text-xs">
                                +{stock.reason.length - 3} more
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-gray-900 rounded-lg p-12 text-center">
              <p className="text-gray-400 text-lg">No stocks match the scanner criteria</p>
              <p className="text-gray-500 text-sm mt-2">Try a different scanner or wait for market conditions to change</p>
            </div>
          )}
        </div>
      )}

      {/* Initial State */}
      {!results && !loading && !error && (
        <div className="bg-gray-900 rounded-lg p-12 text-center">
          <p className="text-gray-400 text-lg mb-4">Click &quot;Run Scan&quot; to start scanning stocks</p>
          <p className="text-gray-500 text-sm">
            The scanner will fetch real-time data from Yahoo Finance and analyze {stockLimit} F&O stocks
          </p>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-12 text-center text-gray-600 text-sm">
        <p>Data source: Yahoo Finance (15-min delayed during market hours)</p>
        <p className="mt-1">For paper trading only. Not financial advice.</p>
      </footer>
    </main>
  );
}
