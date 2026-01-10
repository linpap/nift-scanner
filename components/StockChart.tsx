'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, ColorType, IChartApi, CandlestickData, Time, HistogramData, CandlestickSeries, HistogramSeries, LineSeries, AreaSeries, ISeriesApi } from 'lightweight-charts';
import { calculateAllIndicators, type OHLCV, type IndicatorData } from '@/lib/chart-indicators';

// Signal label data
interface SignalLabel {
  time: Time;
  price: number;
  type: 'buy' | 'sell';
}

interface HistoricalData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface StockChartProps {
  symbol: string;
  onClose: () => void;
}

type Timeframe = '5m' | '15m' | '1d';

const TIMEFRAME_OPTIONS: { value: Timeframe; label: string }[] = [
  { value: '5m', label: '5 Min' },
  { value: '15m', label: '15 Min' },
  { value: '1d', label: 'Daily' },
];

interface MTFTrend {
  tf: string;
  trend: 'bullish' | 'bearish' | 'neutral';
}

export default function StockChart({ symbol, onClose }: StockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>('1d');
  const [showIndicators, setShowIndicators] = useState(true);
  const [stockData, setStockData] = useState<{
    price: number;
    change: number;
    changePercent: number;
  } | null>(null);
  const [signals, setSignals] = useState<{ buy: number; sell: number }>({ buy: 0, sell: 0 });
  const [currentTrend, setCurrentTrend] = useState<'bullish' | 'bearish' | 'neutral'>('neutral');
  const [mtfTrends, setMtfTrends] = useState<MTFTrend[]>([]);
  const [signalLabels, setSignalLabels] = useState<SignalLabel[]>([]);
  const [labelPositions, setLabelPositions] = useState<{ x: number; y: number; type: 'buy' | 'sell' }[]>([]);

  const fetchAndRenderChart = useCallback(async (tf: Timeframe) => {
    try {
      setLoading(true);
      setError(null);

      // Clear existing chart
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }

      const response = await fetch(`/api/stocks?action=historical&symbol=${symbol}&interval=${tf}`);
      const data = await response.json();

      if (!data.success || !data.data || data.data.length === 0) {
        setError('Failed to fetch chart data');
        return;
      }

      const historical: HistoricalData[] = data.data;

      // Set current price info
      const latest = historical[historical.length - 1];
      const previous = historical[historical.length - 2];
      if (latest && previous) {
        const change = latest.close - previous.close;
        const changePercent = (change / previous.close) * 100;
        setStockData({
          price: latest.close,
          change,
          changePercent
        });
      }

      // Calculate indicators
      const ohlcv: OHLCV[] = historical.map(h => ({
        date: h.date,
        open: h.open,
        high: h.high,
        low: h.low,
        close: h.close,
        volume: h.volume,
      }));

      let indicators: IndicatorData | null = null;
      if (showIndicators && historical.length >= 50) {
        indicators = calculateAllIndicators(ohlcv);

        // Count signals
        const buyCount = indicators.buySignals.filter(Boolean).length;
        const sellCount = indicators.sellSignals.filter(Boolean).length;
        setSignals({ buy: buyCount, sell: sellCount });

        // Get current trend
        const lastTrend = indicators.hybridDirection[indicators.hybridDirection.length - 1];
        setCurrentTrend(lastTrend);
      }

      // Create chart
      if (chartContainerRef.current) {
        const chart = createChart(chartContainerRef.current, {
          layout: {
            background: { type: ColorType.Solid, color: '#1a1a1a' },
            textColor: '#d1d5db',
          },
          grid: {
            vertLines: { color: '#2d2d2d' },
            horzLines: { color: '#2d2d2d' },
          },
          crosshair: {
            mode: 1,
          },
          rightPriceScale: {
            borderColor: '#2d2d2d',
            scaleMargins: {
              top: 0.1,
              bottom: 0.2,
            },
          },
          timeScale: {
            borderColor: '#2d2d2d',
            timeVisible: true,
            secondsVisible: false,
          },
          width: chartContainerRef.current.clientWidth,
          height: 450,
        });

        chartRef.current = chart;

        // Helper to get time
        const getTime = (item: HistoricalData, index: number): Time => {
          if (tf === '1d') {
            return (typeof item.date === 'string' ? item.date.split('T')[0] : new Date(item.date).toISOString().split('T')[0]) as Time;
          } else {
            return Math.floor(new Date(item.date).getTime() / 1000) as Time;
          }
        };

        // Add EMA Cloud (200 EMA area fill)
        if (showIndicators && indicators && !isNaN(indicators.ema200[indicators.ema200.length - 1])) {
          const cloudSeries = chart.addSeries(AreaSeries, {
            lineColor: '#6b7280',
            lineWidth: 2,
            topColor: 'rgba(16, 185, 129, 0.1)',
            bottomColor: 'rgba(239, 68, 68, 0.1)',
            priceLineVisible: false,
            lastValueVisible: false,
          });

          const cloudData = historical.map((item, i) => ({
            time: getTime(item, i),
            value: indicators!.cloudEma[i],
          })).filter(d => !isNaN(d.value));

          if (cloudData.length > 0) {
            cloudSeries.setData(cloudData);
          }
        }

        // Candlestick series
        const candleSeries = chart.addSeries(CandlestickSeries, {
          upColor: '#10b981',
          downColor: '#ef4444',
          borderUpColor: '#10b981',
          borderDownColor: '#ef4444',
          wickUpColor: '#10b981',
          wickDownColor: '#ef4444',
        });
        candleSeriesRef.current = candleSeries;

        const candleData: CandlestickData<Time>[] = historical.map((item, i) => ({
          time: getTime(item, i),
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
        }));

        candleSeries.setData(candleData);

        // Add EMAs
        if (showIndicators && indicators) {
          // EMA 20 (Purple)
          if (!isNaN(indicators.ema20[indicators.ema20.length - 1])) {
            const ema20Series = chart.addSeries(LineSeries, {
              color: '#a855f7',
              lineWidth: 1,
              priceLineVisible: false,
              lastValueVisible: false,
            });
            const ema20Data = historical.map((item, i) => ({
              time: getTime(item, i),
              value: indicators!.ema20[i],
            })).filter(d => !isNaN(d.value));
            if (ema20Data.length > 0) ema20Series.setData(ema20Data);
          }

          // EMA 50 (Yellow)
          if (!isNaN(indicators.ema50[indicators.ema50.length - 1])) {
            const ema50Series = chart.addSeries(LineSeries, {
              color: '#eab308',
              lineWidth: 1,
              priceLineVisible: false,
              lastValueVisible: false,
            });
            const ema50Data = historical.map((item, i) => ({
              time: getTime(item, i),
              value: indicators!.ema50[i],
            })).filter(d => !isNaN(d.value));
            if (ema50Data.length > 0) ema50Series.setData(ema50Data);
          }

          // Hybrid Line (Supertrend average)
          if (!isNaN(indicators.hybridLine[indicators.hybridLine.length - 1])) {
            const hybridSeries = chart.addSeries(LineSeries, {
              color: '#10b981', // Will be overridden by data
              lineWidth: 3,
              priceLineVisible: false,
              lastValueVisible: false,
            });

            const hybridData = historical.map((item, i) => ({
              time: getTime(item, i),
              value: indicators!.hybridLine[i],
              color: indicators!.hybridDirection[i] === 'bullish' ? '#10b981' :
                     indicators!.hybridDirection[i] === 'bearish' ? '#ef4444' : '#6b7280',
            })).filter(d => !isNaN(d.value));

            if (hybridData.length > 0) {
              hybridSeries.setData(hybridData);
            }
          }

          // Collect signal labels for HTML overlay rendering
          const newSignalLabels: SignalLabel[] = [];

          for (let i = 0; i < historical.length; i++) {
            if (indicators!.buySignals[i]) {
              newSignalLabels.push({
                time: getTime(historical[i], i),
                price: historical[i].low * 0.993,
                type: 'buy',
              });
            }
            if (indicators!.sellSignals[i]) {
              newSignalLabels.push({
                time: getTime(historical[i], i),
                price: historical[i].high * 1.007,
                type: 'sell',
              });
            }
          }

          setSignalLabels(newSignalLabels);
        }

        // Volume series
        const volumeSeries = chart.addSeries(HistogramSeries, {
          color: '#26a69a',
          priceFormat: {
            type: 'volume',
          },
          priceScaleId: '',
        });

        volumeSeries.priceScale().applyOptions({
          scaleMargins: {
            top: 0.85,
            bottom: 0,
          },
        });

        const volumeData: HistogramData<Time>[] = historical.map((item, i) => ({
          time: getTime(item, i),
          value: item.volume,
          color: item.close >= item.open ? '#10b98140' : '#ef444440',
        }));

        volumeSeries.setData(volumeData);

        chart.timeScale().fitContent();
      }

      // Fetch MTF trends
      fetchMTFTrends();

    } catch (err) {
      setError(`Failed to load chart: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [symbol, showIndicators]);

  // Fetch multi-timeframe trend data
  const fetchMTFTrends = async () => {
    try {
      const response = await fetch(`/api/stocks?action=mtf-trend&symbol=${symbol}`);
      const data = await response.json();
      if (data.success && data.trends) {
        setMtfTrends(data.trends);
      }
    } catch (err) {
      console.error('Failed to fetch MTF trends:', err);
    }
  };

  // Fetch data when timeframe changes
  useEffect(() => {
    fetchAndRenderChart(timeframe);

    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [timeframe, fetchAndRenderChart]);

  // Calculate label positions from chart coordinates
  const updateLabelPositions = useCallback(() => {
    if (!chartRef.current || !candleSeriesRef.current || signalLabels.length === 0) {
      setLabelPositions([]);
      return;
    }

    const chart = chartRef.current;
    const series = candleSeriesRef.current;
    const timeScale = chart.timeScale();

    const positions: { x: number; y: number; type: 'buy' | 'sell' }[] = [];

    for (const label of signalLabels) {
      const x = timeScale.timeToCoordinate(label.time);
      const y = series.priceToCoordinate(label.price);

      if (x !== null && y !== null) {
        positions.push({ x, y, type: label.type });
      }
    }

    setLabelPositions(positions);
  }, [signalLabels]);

  // Handle resize and update label positions
  useEffect(() => {
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
        updateLabelPositions();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateLabelPositions]);

  // Update label positions when chart changes
  useEffect(() => {
    if (!chartRef.current) return;

    const chart = chartRef.current;

    // Subscribe to time scale changes (pan/zoom)
    const timeScale = chart.timeScale();
    timeScale.subscribeVisibleLogicalRangeChange(() => {
      updateLabelPositions();
    });

    // Initial position calculation
    setTimeout(updateLabelPositions, 100);

    return () => {
      timeScale.unsubscribeVisibleLogicalRangeChange(() => {});
    };
  }, [signalLabels, updateLabelPositions]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-gray-900 rounded-lg w-full max-w-5xl mx-4 overflow-hidden shadow-2xl border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-emerald-400">{symbol}</h2>
            {stockData && (
              <div className="flex items-center gap-3">
                <span className="text-lg font-mono text-white">₹{stockData.price.toFixed(2)}</span>
                <span className={`text-sm font-mono ${stockData.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {stockData.changePercent >= 0 ? '+' : ''}{stockData.change.toFixed(2)} ({stockData.changePercent.toFixed(2)}%)
                </span>
              </div>
            )}
            {/* Trend Badge */}
            {showIndicators && (
              <span className={`px-2 py-1 text-xs font-semibold rounded ${
                currentTrend === 'bullish' ? 'bg-emerald-900 text-emerald-400' :
                currentTrend === 'bearish' ? 'bg-red-900 text-red-400' :
                'bg-gray-700 text-gray-400'
              }`}>
                {currentTrend.toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Indicator Toggle */}
            <label className="flex items-center gap-2 cursor-pointer mr-2">
              <input
                type="checkbox"
                checked={showIndicators}
                onChange={(e) => setShowIndicators(e.target.checked)}
                className="w-4 h-4 accent-emerald-500"
              />
              <span className="text-xs text-gray-400">Indicators</span>
            </label>
            {/* Timeframe Selector */}
            <div className="flex bg-gray-800 rounded overflow-hidden">
              {TIMEFRAME_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTimeframe(option.value)}
                  className={`px-3 py-1 text-sm font-medium transition ${
                    timeframe === option.value
                      ? 'bg-emerald-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded transition text-gray-400 hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {/* Chart */}
        <div className="p-4 relative">
          <div ref={chartContainerRef} style={{ minHeight: '450px' }} className="relative">
            {/* Signal Labels Overlay */}
            {showIndicators && labelPositions.length > 0 && (
              <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
                {labelPositions.map((pos, idx) => (
                  <div
                    key={idx}
                    className={`absolute text-[10px] font-bold px-1.5 py-0.5 rounded transform -translate-x-1/2 ${
                      pos.type === 'buy'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-red-500 text-white'
                    }`}
                    style={{
                      left: pos.x,
                      top: pos.type === 'buy' ? pos.y + 4 : pos.y - 18,
                    }}
                  >
                    {pos.type === 'buy' ? 'BUY' : 'SELL'}
                  </div>
                ))}
              </div>
            )}
          </div>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent"></div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Indicator Legend & MTF Dashboard */}
        {showIndicators && !loading && !error && (
          <div className="px-4 pb-4 flex flex-wrap gap-4 items-start justify-between">
            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-purple-500"></span>
                <span className="text-gray-400">EMA 20</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-yellow-500"></span>
                <span className="text-gray-400">EMA 50</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-gray-500"></span>
                <span className="text-gray-400">EMA 200 Cloud</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-1 bg-gradient-to-r from-emerald-500 to-red-500 rounded"></span>
                <span className="text-gray-400">Hybrid ST Line</span>
              </div>
              {signals.buy > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-emerald-400">▲</span>
                  <span className="text-gray-400">Buy ({signals.buy})</span>
                </div>
              )}
              {signals.sell > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-red-400">▼</span>
                  <span className="text-gray-400">Sell ({signals.sell})</span>
                </div>
              )}
            </div>

            {/* MTF Trend Dashboard */}
            {mtfTrends.length > 0 && (
              <div className="flex gap-1">
                {mtfTrends.map((t, i) => (
                  <div
                    key={i}
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      t.trend === 'bullish' ? 'bg-emerald-900/50 text-emerald-400' :
                      t.trend === 'bearish' ? 'bg-red-900/50 text-red-400' :
                      'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {t.tf}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-4 pb-4 text-xs text-gray-500 text-center">
          {timeframe === '1d' ? 'Daily data • ' : `${timeframe === '5m' ? '5-minute' : '15-minute'} candles • `}
          {showIndicators ? 'Hybrid ST/EMA • ' : ''}
          Press ESC or click outside to close
        </div>
      </div>
    </div>
  );
}
