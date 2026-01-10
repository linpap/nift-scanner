'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, ColorType, IChartApi, CandlestickData, Time, AreaSeries, CandlestickSeries, LineSeries, HistogramSeries, HistogramData, ISeriesApi } from 'lightweight-charts';
import { calculateAllIndicators, type OHLCV, type IndicatorData } from '@/lib/chart-indicators';

// Signal label data
interface SignalLabel {
  time: Time;
  price: number;
  type: 'buy' | 'sell';
}

interface IndexData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface IndexInfo {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

type Timeframe = '5m' | '15m' | '1d';

const TIMEFRAME_OPTIONS: { value: Timeframe; label: string }[] = [
  { value: '5m', label: '5 Min' },
  { value: '15m', label: '15 Min' },
  { value: '1d', label: 'Daily' },
];

interface MiniChartProps {
  symbol: string;
  yahooSymbol: string;
  name: string;
  onExpand: (symbol: string, name: string) => void;
}

function MiniChart({ symbol, yahooSymbol, name, onExpand }: MiniChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [indexInfo, setIndexInfo] = useState<IndexInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/indices?symbol=${yahooSymbol}&days=30`);
        const data = await response.json();

        if (!data.success || !data.data || data.data.length === 0) {
          setError('No data');
          return;
        }

        const historical: IndexData[] = data.data;

        // Set index info
        const latest = historical[historical.length - 1];
        const previous = historical[historical.length - 2];
        if (latest && previous) {
          setIndexInfo({
            symbol,
            name,
            price: latest.close,
            change: latest.close - previous.close,
            changePercent: ((latest.close - previous.close) / previous.close) * 100,
          });
        }

        // Create mini chart
        if (chartContainerRef.current && !chartRef.current) {
          const chart = createChart(chartContainerRef.current, {
            layout: {
              background: { type: ColorType.Solid, color: 'transparent' },
              textColor: '#6b7280',
            },
            grid: {
              vertLines: { visible: false },
              horzLines: { visible: false },
            },
            rightPriceScale: {
              visible: false,
            },
            leftPriceScale: {
              visible: false,
            },
            timeScale: {
              visible: false,
            },
            crosshair: {
              vertLine: { visible: false },
              horzLine: { visible: false },
            },
            handleScroll: false,
            handleScale: false,
            width: chartContainerRef.current.clientWidth,
            height: 60,
          });

          chartRef.current = chart;

          // Area series for mini chart
          const areaSeries = chart.addSeries(AreaSeries, {
            lineColor: latest.close >= previous.close ? '#10b981' : '#ef4444',
            topColor: latest.close >= previous.close ? '#10b98130' : '#ef444430',
            bottomColor: latest.close >= previous.close ? '#10b98105' : '#ef444405',
            lineWidth: 2,
          });

          const areaData = historical.map((item) => ({
            time: item.date as Time,
            value: item.close,
          }));

          areaSeries.setData(areaData);
          chart.timeScale().fitContent();

          // Handle resize
          const handleResize = () => {
            if (chartContainerRef.current && chartRef.current) {
              chartRef.current.applyOptions({
                width: chartContainerRef.current.clientWidth,
              });
            }
          };

          window.addEventListener('resize', handleResize);
          return () => window.removeEventListener('resize', handleResize);
        }
      } catch (err) {
        setError('Load failed');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [yahooSymbol, symbol, name]);

  return (
    <div
      className="bg-gray-800/50 rounded-lg p-3 cursor-pointer hover:bg-gray-700/50 transition"
      onClick={() => onExpand(yahooSymbol, name)}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold text-white">{name}</span>
        {indexInfo && (
          <span className={`text-xs font-mono ${indexInfo.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {indexInfo.changePercent >= 0 ? '+' : ''}{indexInfo.changePercent.toFixed(2)}%
          </span>
        )}
      </div>
      {indexInfo && (
        <div className="text-lg font-mono text-white mb-1">
          {indexInfo.price.toFixed(2)}
        </div>
      )}
      {loading && (
        <div className="h-[60px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-500 border-t-transparent"></div>
        </div>
      )}
      {error && (
        <div className="h-[60px] flex items-center justify-center text-xs text-gray-500">
          {error}
        </div>
      )}
      <div ref={chartContainerRef} className={loading || error ? 'hidden' : ''} />
    </div>
  );
}

interface ExpandedChartProps {
  symbol: string;
  name: string;
  onClose: () => void;
}

function ExpandedChart({ symbol, name, onClose }: ExpandedChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const [indexInfo, setIndexInfo] = useState<IndexInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>('1d');
  const [showIndicators, setShowIndicators] = useState(true);
  const [signals, setSignals] = useState<{ buy: number; sell: number }>({ buy: 0, sell: 0 });
  const [currentTrend, setCurrentTrend] = useState<'bullish' | 'bearish' | 'neutral'>('neutral');
  const [signalLabels, setSignalLabels] = useState<SignalLabel[]>([]);
  const [labelPositions, setLabelPositions] = useState<{ x: number; y: number; type: 'buy' | 'sell' }[]>([]);

  // Fetch data and create chart
  useEffect(() => {
    const fetchAndRenderChart = async () => {
      try {
        setLoading(true);
        setError(null);

        // Clear existing chart
        if (chartRef.current) {
          chartRef.current.remove();
          chartRef.current = null;
        }

        const response = await fetch(`/api/indices?symbol=${symbol}&days=100&interval=${timeframe}`);
        const data = await response.json();

        if (!data.success || !data.data || data.data.length === 0) {
          setError('Failed to fetch chart data');
          return;
        }

        const historical: IndexData[] = data.data;

        // Set index info
        const latest = historical[historical.length - 1];
        const previous = historical[historical.length - 2];
        if (latest && previous) {
          setIndexInfo({
            symbol: name,
            name,
            price: latest.close,
            change: latest.close - previous.close,
            changePercent: ((latest.close - previous.close) / previous.close) * 100,
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
          const buyCount = indicators.buySignals.filter(Boolean).length;
          const sellCount = indicators.sellSignals.filter(Boolean).length;
          setSignals({ buy: buyCount, sell: sellCount });
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
            width: chartContainerRef.current.clientWidth || 800,
            height: 450,
          });

          chartRef.current = chart;

          // Helper to get time
          const getTime = (item: IndexData): Time => {
            if (timeframe === '1d') {
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
              time: getTime(item),
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

          const candleData: CandlestickData<Time>[] = historical.map((item) => ({
            time: getTime(item),
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
                time: getTime(item),
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
                time: getTime(item),
                value: indicators!.ema50[i],
              })).filter(d => !isNaN(d.value));
              if (ema50Data.length > 0) ema50Series.setData(ema50Data);
            }

            // Hybrid Line (Supertrend average)
            if (!isNaN(indicators.hybridLine[indicators.hybridLine.length - 1])) {
              const hybridSeries = chart.addSeries(LineSeries, {
                color: '#10b981',
                lineWidth: 3,
                priceLineVisible: false,
                lastValueVisible: false,
              });

              const hybridData = historical.map((item, i) => ({
                time: getTime(item),
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
                  time: getTime(historical[i]),
                  price: historical[i].low * 0.993,
                  type: 'buy',
                });
              }
              if (indicators!.sellSignals[i]) {
                newSignalLabels.push({
                  time: getTime(historical[i]),
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

          const volumeData: HistogramData<Time>[] = historical.map((item) => ({
            time: getTime(item),
            value: item.volume,
            color: item.close >= item.open ? '#10b98140' : '#ef444440',
          }));

          volumeSeries.setData(volumeData);

          chart.timeScale().fitContent();
        }
      } catch (err) {
        setError(`Failed to load chart: ${err}`);
      } finally {
        setLoading(false);
      }
    };

    fetchAndRenderChart();

    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [symbol, name, timeframe, showIndicators]);

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
        className="bg-gray-900 rounded-lg w-full max-w-4xl mx-4 overflow-hidden shadow-2xl border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-emerald-400">{name}</h2>
            {indexInfo && (
              <div className="flex items-center gap-3">
                <span className="text-lg font-mono text-white">{indexInfo.price.toFixed(2)}</span>
                <span className={`text-sm font-mono ${indexInfo.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {indexInfo.changePercent >= 0 ? '+' : ''}{indexInfo.change.toFixed(2)} ({indexInfo.changePercent.toFixed(2)}%)
                </span>
              </div>
            )}
            {/* Trend Badge */}
            {showIndicators && currentTrend !== 'neutral' && (
              <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                currentTrend === 'bullish'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                  : 'bg-red-500/20 text-red-400 border border-red-500/50'
              }`}>
                {currentTrend.toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Indicator Toggle */}
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-400 hover:text-white">
              <input
                type="checkbox"
                checked={showIndicators}
                onChange={(e) => setShowIndicators(e.target.checked)}
                className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-gray-900"
              />
              <span>Indicators</span>
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
          <div ref={chartContainerRef} style={{ minHeight: '400px' }} className="relative">
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

        {/* Legend */}
        {showIndicators && (
          <div className="px-4 py-2 border-t border-gray-700/50 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-purple-500 rounded"></span>
                <span className="text-gray-400">EMA 20</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-yellow-500 rounded"></span>
                <span className="text-gray-400">EMA 50</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-gray-500 rounded"></span>
                <span className="text-gray-400">EMA 200 Cloud</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1 bg-emerald-500 rounded"></span>
                <span className="text-gray-400">Hybrid ST</span>
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-gray-400">Buy: {signals.buy}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                <span className="text-gray-400">Sell: {signals.sell}</span>
              </span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 pb-3 text-xs text-gray-500 text-center">
          Press ESC or click outside to close
        </div>
      </div>
    </div>
  );
}

export default function IndexCharts() {
  const [expandedIndex, setExpandedIndex] = useState<{ symbol: string; name: string } | null>(null);

  const handleExpand = (symbol: string, name: string) => {
    setExpandedIndex({ symbol, name });
  };

  const handleClose = () => {
    setExpandedIndex(null);
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <MiniChart
          symbol="NIFTY"
          yahooSymbol="^NSEI"
          name="NIFTY 50"
          onExpand={handleExpand}
        />
        <MiniChart
          symbol="BANKNIFTY"
          yahooSymbol="^NSEBANK"
          name="BANK NIFTY"
          onExpand={handleExpand}
        />
      </div>
      {expandedIndex && (
        <ExpandedChart
          symbol={expandedIndex.symbol}
          name={expandedIndex.name}
          onClose={handleClose}
        />
      )}
    </>
  );
}
