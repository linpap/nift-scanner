'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamic imports for chart components to avoid SSR issues
const StockChart = dynamic(() => import('@/components/StockChart'), { ssr: false });
const IndexCharts = dynamic(() => import('@/components/IndexCharts'), { ssr: false });

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

interface NewsItem {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  timestamp: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  sentimentScore: number;
}

interface NewsResponse {
  success: boolean;
  news: NewsItem[];
  count: number;
  lastUpdated: string;
  cacheAge: number;
  nextRefresh: number;
}

const SCANNERS = [
  // Intraday Scanners (for 9:30 AM)
  { id: 'gap_up', name: 'Gap-Up Momentum', description: 'INTRADAY: 1-5% gap up + volume spike' },
  { id: 'gap_down_reversal', name: 'Gap-Down Reversal', description: 'INTRADAY: Gap down recovering' },
  { id: 'intraday_momentum', name: 'Intraday Momentum', description: 'INTRADAY: High volume + near HOD' },
  // MACD Scanners
  { id: 'macd_bullish', name: 'MACD Bullish Crossover', description: 'MACD (12,26,9) crossing above signal' },
  { id: 'macd_bearish', name: 'MACD Bearish Crossover', description: 'MACD (12,26,9) crossing below signal' },
  // Swing Scanners
  { id: 'range_expansion', name: 'Range Expansion + Trend', description: 'SWING: Range > 5/7 days + SMA trend' },
  { id: 'range_expansion_v2', name: 'Range Expansion v2 (Chartink)', description: 'SWING: Range > ALL 7 days + SMA stack' },
  { id: 'ema_crossover', name: '5/20 EMA Crossover', description: 'SWING: EMA crossover signals' },
  { id: 'breakout', name: '20-Day Breakout', description: 'SWING: Momentum breakouts' },
  { id: 'ema_8_21', name: 'EMA 8/21 + RSI', description: 'SWING: Short-term momentum' },
];

export default function Home() {
  const [selectedScanner, setSelectedScanner] = useState('gap_up');
  const [results, setResults] = useState<ScanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stockLimit, setStockLimit] = useState(30);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [nextScanRefresh, setNextScanRefresh] = useState(0);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedStock, setSelectedStock] = useState<string | null>(null);

  const toggleExpand = (symbol: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(symbol)) {
        newSet.delete(symbol);
      } else {
        newSet.add(symbol);
      }
      return newSet;
    });
  };

  // News state
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsLastUpdated, setNewsLastUpdated] = useState<string | null>(null);
  const [nextNewsRefresh, setNextNewsRefresh] = useState(0);
  const [lastSeenNewsCount, setLastSeenNewsCount] = useState(0);
  const [newsAlertEnabled, setNewsAlertEnabled] = useState(true);
  const [shakeNews, setShakeNews] = useState(false);

  // Play notification sound
  const playNotificationSound = () => {
    try {
      // Create audio context for a simple beep
      const audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800; // Hz
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.2); // 200ms beep
    } catch (e) {
      console.log('Audio not supported');
    }
  };

  // Trigger shake animation
  const triggerShake = () => {
    setShakeNews(true);
    setTimeout(() => setShakeNews(false), 500);
  };

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

  const fetchNews = async (refresh: boolean = false) => {
    setNewsLoading(true);
    try {
      const response = await fetch(`/api/news?action=list&limit=15${refresh ? '&refresh=true' : ''}`);
      const data: NewsResponse = await response.json();

      if (data.success) {
        // Check for new bullish news
        if (newsAlertEnabled && lastSeenNewsCount > 0) {
          const newBullishNews = data.news.filter(
            (item, index) => index < (data.news.length - lastSeenNewsCount) && item.sentiment === 'bullish'
          );

          if (newBullishNews.length > 0) {
            playNotificationSound();
            triggerShake();
            // Show browser notification if permitted
            if (Notification.permission === 'granted') {
              new Notification('Bullish News Alert!', {
                body: newBullishNews[0].title,
                icon: '/favicon.ico'
              });
            }
          }
        }

        setNews(data.news);
        setLastSeenNewsCount(data.news.length);
        setNewsLastUpdated(data.lastUpdated);
        setNextNewsRefresh(data.nextRefresh);
      }
    } catch (err) {
      console.error('Failed to fetch news:', err);
    } finally {
      setNewsLoading(false);
    }
  };

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Fetch news on mount and auto-refresh every 10 minutes
  useEffect(() => {
    fetchNews();

    const interval = setInterval(() => {
      fetchNews();
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(interval);
  }, []);

  // Countdown timer for next refresh
  useEffect(() => {
    if (nextNewsRefresh <= 0) return;

    const timer = setInterval(() => {
      setNextNewsRefresh((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [nextNewsRefresh]);

  // Auto-refresh scanner every 5 minutes if enabled
  useEffect(() => {
    if (!autoRefresh) {
      setNextScanRefresh(0);
      return;
    }

    // Run scan immediately when auto-refresh is enabled
    runScan();
    setNextScanRefresh(300); // 5 minutes = 300 seconds

    const interval = setInterval(() => {
      runScan();
      setNextScanRefresh(300);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, selectedScanner, stockLimit]);

  // Countdown timer for next scan refresh
  useEffect(() => {
    if (nextScanRefresh <= 0 || !autoRefresh) return;

    const timer = setInterval(() => {
      setNextScanRefresh((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [nextScanRefresh, autoRefresh]);

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

  const formatNewsTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
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

      {/* Main Grid - Scanner and News */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scanner Section - Takes 2 columns */}
        <div className="lg:col-span-2">
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
                <label className="flex items-center gap-3 cursor-pointer bg-gray-800 border border-gray-700 rounded px-3 py-2">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 cursor-pointer"
                  />
                  <span className={autoRefresh ? 'text-emerald-400' : 'text-gray-400'}>
                    {autoRefresh
                      ? `Next: ${Math.floor(nextScanRefresh / 60)}:${(nextScanRefresh % 60).toString().padStart(2, '0')}`
                      : 'OFF'}
                  </span>
                </label>
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
                    <p className="text-xl font-bold text-white truncate">{results.scanner}</p>
                    <p className="text-sm text-gray-400">Scanner Used</p>
                  </div>
                </div>
              </div>

              {/* Results Table */}
              {results.results.length > 0 ? (
                <div className="bg-gray-900 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-800 text-left">
                          <th className="px-2 py-2 font-semibold text-gray-400">#</th>
                          <th className="px-2 py-2 font-semibold text-gray-400">Symbol</th>
                          <th className="px-2 py-2 font-semibold text-gray-400 text-right">Price</th>
                          <th className="px-2 py-2 font-semibold text-gray-400 text-right">Chg%</th>
                          <th className="px-2 py-2 font-semibold text-gray-400 text-right" title="Volume vs 20-day Avg">Vol/Avg</th>
                          <th className="px-2 py-2 font-semibold text-gray-400 text-right">RSI</th>
                          <th className="px-2 py-2 font-semibold text-gray-400">Signals</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.results.map((stock, index) => (
                          <tr
                            key={stock.symbol}
                            className="border-t border-gray-800 hover:bg-gray-800/50 stock-card"
                          >
                            <td className="px-2 py-2 text-gray-500">{index + 1}</td>
                            <td className="px-2 py-2">
                              <button
                                onClick={() => setSelectedStock(stock.symbol)}
                                className="font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                              >
                                {stock.symbol}
                              </button>
                            </td>
                            <td className="px-2 py-2 text-right font-mono">
                              {stock.close.toFixed(2)}
                            </td>
                            <td className={`px-2 py-2 text-right font-mono ${stock.changePercent >= 0 ? 'text-profit' : 'text-loss'}`}>
                              {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                            </td>
                            <td className="px-2 py-2 text-right font-mono" title={`Vol: ${formatVolume(stock.volume)} | Avg: ${formatVolume(stock.avgVolume)}`}>
                              <span className={stock.volumeRatio >= 1.5 ? 'text-emerald-400' : stock.volumeRatio >= 1 ? 'text-white' : 'text-gray-500'}>
                                {stock.volumeRatio.toFixed(1)}x
                              </span>
                            </td>
                            <td className="px-2 py-2 text-right font-mono">
                              <span className={stock.rsi > 70 ? 'text-red-400' : stock.rsi < 30 ? 'text-emerald-400' : 'text-white'}>
                                {stock.rsi.toFixed(0)}
                              </span>
                            </td>
                            <td className="px-2 py-2">
                              <div className="flex items-center gap-1">
                                {/* Show first 2 signals always */}
                                {stock.reason.slice(0, 2).map((r, i) => (
                                  <span
                                    key={i}
                                    className="bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap"
                                  >
                                    {r}
                                  </span>
                                ))}
                                {/* Show expand button if more than 2 signals */}
                                {stock.reason.length > 2 && (
                                  <button
                                    onClick={() => toggleExpand(stock.symbol)}
                                    className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap"
                                  >
                                    {expandedRows.has(stock.symbol) ? '−' : `+${stock.reason.length - 2}`}
                                  </button>
                                )}
                                {/* Show remaining signals when expanded */}
                                {expandedRows.has(stock.symbol) && stock.reason.slice(2).map((r, i) => (
                                  <span
                                    key={i + 2}
                                    className="bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap"
                                  >
                                    {r}
                                  </span>
                                ))}
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
        </div>

        {/* Right Column - Index Charts & News */}
        <div className="lg:col-span-1 space-y-6">
          {/* Index Charts */}
          <div className="bg-gray-900 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-white mb-4">Market Indices</h2>
            <IndexCharts />
            <p className="text-xs text-gray-500 mt-3 text-center">Click chart to expand</p>
          </div>

          {/* News Section */}
          <div className={`bg-gray-900 rounded-lg p-4 sticky top-4 ${shakeNews ? 'shake' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <span>Breaking News</span>
                {newsLoading && (
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-emerald-500 border-t-transparent"></span>
                )}
              </h2>
              <div className="flex items-center gap-2">
                {/* Sound Alert Toggle */}
                <label className="flex items-center gap-1 cursor-pointer" title="Sound alert for bullish news">
                  <input
                    type="checkbox"
                    checked={newsAlertEnabled}
                    onChange={(e) => setNewsAlertEnabled(e.target.checked)}
                    className="w-3 h-3 accent-emerald-500 cursor-pointer"
                  />
                  <span className="text-[10px] text-gray-400">Sound</span>
                </label>
                <button
                  onClick={() => fetchNews(true)}
                  disabled={newsLoading}
                  className="text-xs text-emerald-400 hover:text-emerald-300 disabled:text-gray-500"
                >
                  Refresh
                </button>
              </div>
            </div>

            {/* Next refresh countdown */}
            {nextNewsRefresh > 0 && (
              <p className="text-xs text-gray-500 mb-3">
                Next auto-refresh in {Math.floor(nextNewsRefresh / 60)}:{(nextNewsRefresh % 60).toString().padStart(2, '0')}
              </p>
            )}

            {/* News List */}
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {news.length > 0 ? (
                news.map((item, index) => (
                  <a
                    key={index}
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition"
                  >
                    <div className="flex items-start gap-2">
                      {/* Sentiment Icon */}
                      <span className="text-lg flex-shrink-0 mt-0.5" title={`${item.sentiment} (${(item.sentimentScore * 100).toFixed(0)}%)`}>
                        {item.sentiment === 'bullish' && '👍'}
                        {item.sentiment === 'bearish' && '👎'}
                        {item.sentiment === 'neutral' && '➖'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-200 leading-tight mb-2 line-clamp-2">
                          {item.title}
                        </p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{item.source}</span>
                          <span>{formatNewsTime(item.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  </a>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  {newsLoading ? 'Loading news...' : 'No news available'}
                </div>
              )}
            </div>

            {/* News footer */}
            {news.length > 0 && (
              <p className="text-xs text-gray-600 mt-3 text-center">
                Sources: Google News, Economic Times, Moneycontrol
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 text-center text-gray-600 text-sm">
        <p>Data source: Yahoo Finance (15-min delayed during market hours)</p>
        <p className="mt-1">For paper trading only. Not financial advice.</p>
      </footer>

      {/* Stock Chart Modal */}
      {selectedStock && (
        <StockChart
          symbol={selectedStock}
          onClose={() => setSelectedStock(null)}
        />
      )}
    </main>
  );
}
