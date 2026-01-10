'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, CandlestickData, Time, AreaSeries, CandlestickSeries } from 'lightweight-charts';

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
  const [indexInfo, setIndexInfo] = useState<IndexInfo | null>(null);
  const [chartData, setChartData] = useState<IndexData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/indices?symbol=${symbol}&days=100`);
        const data = await response.json();

        if (!data.success || !data.data || data.data.length === 0) {
          setError('Failed to fetch chart data');
          return;
        }

        const historical: IndexData[] = data.data;
        setChartData(historical);

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
      } catch (err) {
        setError(`Failed to load chart: ${err}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol, name]);

  // Create chart after data is loaded and loading is false
  useEffect(() => {
    if (loading || !chartData || chartRef.current) return;

    // Small delay to ensure the container is visible and has dimensions
    const timer = setTimeout(() => {
      if (chartContainerRef.current && !chartRef.current) {
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
              bottom: 0.1,
            },
          },
          timeScale: {
            borderColor: '#2d2d2d',
            timeVisible: true,
            secondsVisible: false,
          },
          width: chartContainerRef.current.clientWidth || 800,
          height: 400,
        });

        chartRef.current = chart;

        // Candlestick series
        const candleSeries = chart.addSeries(CandlestickSeries, {
          upColor: '#10b981',
          downColor: '#ef4444',
          borderUpColor: '#10b981',
          borderDownColor: '#ef4444',
          wickUpColor: '#10b981',
          wickDownColor: '#ef4444',
        });

        const candleData: CandlestickData<Time>[] = chartData.map((item) => ({
          time: item.date as Time,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
        }));

        candleSeries.setData(candleData);
        chart.timeScale().fitContent();
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [loading, chartData]);

  // Handle resize
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

  // Cleanup chart on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, []);

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

        {/* Chart */}
        <div className="p-4 relative">
          <div ref={chartContainerRef} style={{ minHeight: '400px' }} />
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

        {/* Footer */}
        <div className="px-4 pb-4 text-xs text-gray-500 text-center">
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
