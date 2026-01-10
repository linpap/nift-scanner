'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, CandlestickData, Time, HistogramData, CandlestickSeries, HistogramSeries } from 'lightweight-charts';

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

export default function StockChart({ symbol, onClose }: StockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stockData, setStockData] = useState<{
    price: number;
    change: number;
    changePercent: number;
  } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/stocks?action=historical&symbol=${symbol}&days=100`);
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

        // Create chart
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
                bottom: 0.2,
              },
            },
            timeScale: {
              borderColor: '#2d2d2d',
              timeVisible: true,
              secondsVisible: false,
            },
            width: chartContainerRef.current.clientWidth,
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

          // Format data for chart - convert date strings to YYYY-MM-DD format
          const candleData: CandlestickData<Time>[] = historical.map((item) => ({
            time: (typeof item.date === 'string' ? item.date.split('T')[0] : new Date(item.date).toISOString().split('T')[0]) as Time,
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
          }));

          const volumeData: HistogramData<Time>[] = historical.map((item) => ({
            time: (typeof item.date === 'string' ? item.date.split('T')[0] : new Date(item.date).toISOString().split('T')[0]) as Time,
            value: item.volume,
            color: item.close >= item.open ? '#10b98140' : '#ef444440',
          }));

          candleSeries.setData(candleData);
          volumeSeries.setData(volumeData);

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

          return () => {
            window.removeEventListener('resize', handleResize);
          };
        }
      } catch (err) {
        setError(`Failed to load chart: ${err}`);
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
  }, [symbol]);

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
            <h2 className="text-xl font-bold text-emerald-400">{symbol}</h2>
            {stockData && (
              <div className="flex items-center gap-3">
                <span className="text-lg font-mono text-white">₹{stockData.price.toFixed(2)}</span>
                <span className={`text-sm font-mono ${stockData.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {stockData.changePercent >= 0 ? '+' : ''}{stockData.change.toFixed(2)} ({stockData.changePercent.toFixed(2)}%)
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`https://www.tradingview.com/chart/?symbol=NSE:${symbol}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition"
            >
              TradingView
            </a>
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
        <div className="p-4">
          {loading && (
            <div className="flex items-center justify-center h-[400px]">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent"></div>
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center h-[400px] text-red-400">
              {error}
            </div>
          )}
          <div ref={chartContainerRef} className={loading || error ? 'hidden' : ''} />
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 text-xs text-gray-500 text-center">
          Press ESC or click outside to close
        </div>
      </div>
    </div>
  );
}
