'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createChart, ColorType, IChartApi, LineSeries } from 'lightweight-charts';

interface Trade {
  entryDate: string;
  entryPrice: number;
  exitDate: string;
  exitPrice: number;
  type: 'LONG' | 'SHORT';
  pnlPercent: number;
  pnl: number;
}

interface BacktestResult {
  symbol: string;
  strategy: string;
  period: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  trades: Trade[];
  equityCurve: { date: string; value: number }[];
}

const STRATEGIES = [
  { id: 'supertrend', name: 'Hybrid Supertrend', description: 'Triple supertrend confluence strategy' },
  { id: 'ema_crossover', name: 'EMA 9/21 Crossover', description: 'Short-term EMA crossover signals' },
  { id: 'rsi', name: 'RSI Oversold/Overbought', description: 'RSI 30/70 reversal signals' },
  { id: 'sma_crossover', name: 'SMA 50/200 Golden Cross', description: 'Long-term trend following' },
];

const POPULAR_STOCKS = [
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
  'HINDUNILVR', 'ITC', 'SBIN', 'BHARTIARTL', 'KOTAKBANK',
  'LT', 'AXISBANK', 'BAJFINANCE', 'ASIANPAINT', 'MARUTI',
  'TATAMOTORS', 'SUNPHARMA', 'TITAN', 'ULTRACEMCO', 'WIPRO',
  'JINDALSTEL', 'TATASTEEL', 'NMDC', 'SRF', 'HDFCLIFE',
];

export default function BacktestPage() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const [symbol, setSymbol] = useState('RELIANCE');
  const [strategy, setStrategy] = useState('supertrend');
  const [years, setYears] = useState(1);
  const [capital, setCapital] = useState(100000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [showTrades, setShowTrades] = useState(false);

  const runBacktest = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/backtest?symbol=${symbol}&strategy=${strategy}&years=${years}&capital=${capital}`
      );
      const data = await response.json();

      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error || 'Backtest failed');
      }
    } catch (err) {
      setError('Failed to run backtest');
    } finally {
      setLoading(false);
    }
  };

  // Render equity curve chart
  const renderChart = useCallback(() => {
    if (!chartContainerRef.current || !result?.equityCurve?.length) return;

    // Clear existing chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#1a1a1a' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: '#2d2d2d' },
        horzLines: { color: '#2d2d2d' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 300,
      rightPriceScale: {
        borderColor: '#2d2d2d',
      },
      timeScale: {
        borderColor: '#2d2d2d',
        timeVisible: true,
      },
    });

    chartRef.current = chart;

    const lineSeries = chart.addSeries(LineSeries, {
      color: result.totalReturn >= 0 ? '#10b981' : '#ef4444',
      lineWidth: 2,
    });

    const chartData = result.equityCurve.map((point) => ({
      time: point.date as string,
      value: point.value,
    }));

    lineSeries.setData(chartData);
    chart.timeScale().fitContent();
  }, [result]);

  useEffect(() => {
    renderChart();
  }, [renderChart]);

  useEffect(() => {
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Strategy Backtester</h1>
        <p className="text-gray-400">
          Test trading strategies on historical daily data (up to 3 years)
        </p>
      </div>

      {/* Controls */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Stock Symbol */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Stock Symbol</label>
            <div className="relative">
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="e.g. RELIANCE"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
              />
              <div className="absolute right-2 top-2">
                <select
                  onChange={(e) => setSymbol(e.target.value)}
                  className="bg-gray-700 text-gray-400 text-xs rounded px-1 py-0.5 cursor-pointer"
                >
                  <option value="">Quick Pick</option>
                  {POPULAR_STOCKS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Strategy */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Strategy</label>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
            >
              {STRATEGIES.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {STRATEGIES.find(s => s.id === strategy)?.description}
            </p>
          </div>

          {/* Years */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Period</label>
            <select
              value={years}
              onChange={(e) => setYears(parseInt(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value={1}>1 Year</option>
              <option value={2}>2 Years</option>
              <option value={3}>3 Years</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Daily timeframe only</p>
          </div>

          {/* Capital */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Initial Capital</label>
            <select
              value={capital}
              onChange={(e) => setCapital(parseInt(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value={50000}>₹50,000</option>
              <option value={100000}>₹1,00,000</option>
              <option value={500000}>₹5,00,000</option>
              <option value={1000000}>₹10,00,000</option>
            </select>
          </div>

          {/* Run Button */}
          <div className="flex items-end">
            <button
              onClick={runBacktest}
              disabled={loading || !symbol}
              className={`w-full px-4 py-2 rounded-lg font-semibold transition ${
                loading || !symbol
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                  Running...
                </span>
              ) : (
                'Run Backtest'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 mb-6 text-red-400">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
              <div className="text-xs text-gray-500 mb-1">Symbol</div>
              <div className="text-lg font-bold text-emerald-400">{result.symbol}</div>
            </div>
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
              <div className="text-xs text-gray-500 mb-1">Period</div>
              <div className="text-lg font-bold text-white">{result.period}</div>
            </div>
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
              <div className="text-xs text-gray-500 mb-1">Total Trades</div>
              <div className="text-lg font-bold text-white">{result.totalTrades}</div>
            </div>
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
              <div className="text-xs text-gray-500 mb-1">Win Rate</div>
              <div className={`text-lg font-bold ${result.winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
                {result.winRate.toFixed(1)}%
              </div>
            </div>
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
              <div className="text-xs text-gray-500 mb-1">Total Return</div>
              <div className={`text-lg font-bold ${result.totalReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {result.totalReturn >= 0 ? '+' : ''}{result.totalReturn.toFixed(2)}%
              </div>
            </div>
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
              <div className="text-xs text-gray-500 mb-1">Max Drawdown</div>
              <div className="text-lg font-bold text-red-400">-{result.maxDrawdown.toFixed(2)}%</div>
            </div>
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
              <div className="text-xs text-gray-500 mb-1">Winning</div>
              <div className="text-lg font-bold text-emerald-400">{result.winningTrades}</div>
            </div>
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
              <div className="text-xs text-gray-500 mb-1">Losing</div>
              <div className="text-lg font-bold text-red-400">{result.losingTrades}</div>
            </div>
          </div>

          {/* Equity Curve */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Equity Curve</h3>
            <div ref={chartContainerRef} className="w-full" />
          </div>

          {/* Trade List */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Recent Trades</h3>
              <button
                onClick={() => setShowTrades(!showTrades)}
                className="text-sm text-emerald-400 hover:text-emerald-300"
              >
                {showTrades ? 'Hide' : 'Show'} ({result.trades.length})
              </button>
            </div>

            {showTrades && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-800">
                      <th className="text-left py-2 px-2">Type</th>
                      <th className="text-left py-2 px-2">Entry Date</th>
                      <th className="text-right py-2 px-2">Entry Price</th>
                      <th className="text-left py-2 px-2">Exit Date</th>
                      <th className="text-right py-2 px-2">Exit Price</th>
                      <th className="text-right py-2 px-2">P&L %</th>
                      <th className="text-right py-2 px-2">P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.trades.map((trade, idx) => (
                      <tr key={idx} className="border-b border-gray-800 hover:bg-gray-800/50">
                        <td className="py-2 px-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            trade.type === 'LONG' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {trade.type}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-gray-300">{trade.entryDate}</td>
                        <td className="py-2 px-2 text-right text-white">₹{trade.entryPrice.toFixed(2)}</td>
                        <td className="py-2 px-2 text-gray-300">{trade.exitDate}</td>
                        <td className="py-2 px-2 text-right text-white">₹{trade.exitPrice.toFixed(2)}</td>
                        <td className={`py-2 px-2 text-right font-mono ${trade.pnlPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {trade.pnlPercent >= 0 ? '+' : ''}{trade.pnlPercent.toFixed(2)}%
                        </td>
                        <td className={`py-2 px-2 text-right font-mono ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {trade.pnl >= 0 ? '+' : ''}₹{trade.pnl.toFixed(0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Info */}
      {!result && !loading && (
        <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-8 text-center">
          <div className="text-4xl mb-4">📈</div>
          <h3 className="text-xl font-semibold text-white mb-2">Strategy Backtester</h3>
          <p className="text-gray-400 max-w-md mx-auto mb-4">
            Test trading strategies on historical data to see how they would have performed.
            Select a stock, strategy, and time period, then click &quot;Run Backtest&quot;.
          </p>
          <div className="text-xs text-gray-500 space-y-1">
            <p>• Daily timeframe data from Yahoo Finance</p>
            <p>• Up to 3 years of historical data available</p>
            <p>• Strategies: Supertrend, EMA Crossover, RSI, SMA Golden Cross</p>
          </div>
        </div>
      )}
    </div>
  );
}
