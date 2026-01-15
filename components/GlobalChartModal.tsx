'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, ColorType, IChartApi, CandlestickData, Time, CandlestickSeries, LineSeries, HistogramSeries, HistogramData, ISeriesApi } from 'lightweight-charts';
import { useChartModal } from '@/contexts/ChartModalContext';
import { useDataSource, DataSourceType } from '@/contexts/DataSourceContext';

interface IndexData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

type Timeframe = '5m' | '15m' | '1d';

const TIMEFRAME_OPTIONS: { value: Timeframe; label: string }[] = [
  { value: '5m', label: '5 Min' },
  { value: '15m', label: '15 Min' },
  { value: '1d', label: 'Daily' },
];

export default function GlobalChartModal() {
  const { selectedStock, closeChart } = useChartModal();
  const { setDataSource: setGlobalDataSource, setLastUpdated: setGlobalLastUpdated } = useDataSource();

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>('1d');
  const [priceInfo, setPriceInfo] = useState<{ price: number; change: number; changePercent: number } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [dataSource, setDataSource] = useState<DataSourceType>(null);
  const [isLive, setIsLive] = useState(true);

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch and render chart
  const fetchData = useCallback(async () => {
    if (!selectedStock) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch chart data
      const response = await fetch(`/api/indices?symbol=${selectedStock.symbol}&days=100&interval=${timeframe}`);
      const data = await response.json();

      if (!data.success || !data.data || data.data.length === 0) {
        setError('Failed to fetch chart data');
        return;
      }

      const historical: IndexData[] = data.data;

      // Calculate price info
      const latest = historical[historical.length - 1];
      const previous = historical[historical.length - 2];
      if (latest && previous) {
        setPriceInfo({
          price: latest.close,
          change: latest.close - previous.close,
          changePercent: ((latest.close - previous.close) / previous.close) * 100,
        });
      }

      setLastUpdated(new Date());

      // Clear existing chart
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
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
            scaleMargins: { top: 0.1, bottom: 0.2 },
          },
          timeScale: {
            borderColor: '#2d2d2d',
            timeVisible: true,
            secondsVisible: false,
          },
          width: chartContainerRef.current.clientWidth || 1200,
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
        candleSeriesRef.current = candleSeries;

        const getTime = (item: IndexData): Time => {
          if (timeframe === '1d') {
            return (typeof item.date === 'string' ? item.date.split('T')[0] : new Date(item.date).toISOString().split('T')[0]) as Time;
          } else {
            return Math.floor(new Date(item.date).getTime() / 1000) as Time;
          }
        };

        const candleData: CandlestickData<Time>[] = historical.map((item) => ({
          time: getTime(item),
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
        }));

        candleSeries.setData(candleData);

        // Volume series
        const volumeSeries = chart.addSeries(HistogramSeries, {
          color: '#26a69a',
          priceFormat: { type: 'volume' },
          priceScaleId: '',
        });

        volumeSeries.priceScale().applyOptions({
          scaleMargins: { top: 0.85, bottom: 0 },
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
  }, [selectedStock, timeframe]);

  // Auto-refresh for live data
  useEffect(() => {
    if (!selectedStock || !isLive) {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      return;
    }

    const refreshData = async () => {
      try {
        // Fetch real-time quote
        const quoteResponse = await fetch(`/api/realtime?action=quote&symbol=${selectedStock.symbol}`);
        const quoteData = await quoteResponse.json();

        if (quoteData.success && quoteData.data) {
          const quote = quoteData.data;
          setDataSource(quote.source);
          setGlobalDataSource(quote.source);
          setLastUpdated(new Date(quoteData.timestamp));
          setGlobalLastUpdated(new Date(quoteData.timestamp));
          setPriceInfo({
            price: quote.last,
            change: quote.change,
            changePercent: quote.changePercent,
          });
        }
      } catch (err) {
        console.error('Auto-refresh error:', err);
      }
    };

    refreshData();
    refreshIntervalRef.current = setInterval(refreshData, 10000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [selectedStock, isLive, setGlobalDataSource, setGlobalLastUpdated]);

  // Fetch data when stock or timeframe changes
  useEffect(() => {
    if (selectedStock) {
      fetchData();
    }
  }, [selectedStock, timeframe, fetchData]);

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

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeChart();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [closeChart]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, []);

  if (!selectedStock) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={closeChart}>
      <div
        className="bg-gray-900 rounded-lg w-[95vw] max-w-[1200px] mx-4 overflow-hidden shadow-2xl border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-emerald-400">{selectedStock.name}</h2>
            {priceInfo && (
              <div className="flex items-center gap-3">
                <span className="text-lg font-mono text-white">{priceInfo.price.toFixed(2)}</span>
                <span className={`text-sm font-mono ${priceInfo.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {priceInfo.changePercent >= 0 ? '+' : ''}{priceInfo.change.toFixed(2)} ({priceInfo.changePercent.toFixed(2)}%)
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Live/Pause Toggle */}
            <button
              onClick={() => setIsLive(!isLive)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition ${
                isLive
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                  : 'bg-gray-700/50 text-gray-400 border border-gray-600/50'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'}`}></span>
              {isLive ? 'LIVE' : 'PAUSED'}
            </button>
            {/* Last Updated & Data Source */}
            {lastUpdated && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{lastUpdated.toLocaleTimeString()}</span>
                {dataSource && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase ${
                    dataSource === 'nse'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : dataSource === 'nse-direct'
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  }`}>
                    {dataSource === 'nse' ? 'NSE' : dataSource === 'nse-direct' ? 'NSE-DIRECT' : 'DELAYED'}
                  </span>
                )}
              </div>
            )}
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
              onClick={closeChart}
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
        <div className="px-4 pb-3 text-xs text-gray-500 text-center">
          Press ESC or click outside to close
        </div>
      </div>
    </div>
  );
}
