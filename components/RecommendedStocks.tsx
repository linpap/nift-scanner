'use client';

import { useState } from 'react';

interface RecommendedStock {
  symbol: string;
  name: string;
  winRate: number;
  totalReturn: number;
  trades: number;
  rating: 'recommended' | 'good' | 'ok';
  category: string;
}

// Based on backtest results with Hybrid Supertrend strategy (15-min timeframe, 60 days)
const RECOMMENDED_STOCKS: RecommendedStock[] = [
  // Highly Recommended (P&L >= 5% AND Win Rate >= 50%)
  { symbol: '^NSEI', name: 'NIFTY 50', winRate: 60.5, totalReturn: 8.55, trades: 38, rating: 'recommended', category: 'Index' },

  // Good (P&L >= 5%)
  { symbol: 'ICICIBANK', name: 'ICICI Bank', winRate: 38.5, totalReturn: 6.41, trades: 39, rating: 'good', category: 'Bank' },
  { symbol: 'TECHM', name: 'Tech Mahindra', winRate: 42.5, totalReturn: 6.04, trades: 40, rating: 'good', category: 'IT' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', winRate: 47.4, totalReturn: 5.21, trades: 38, rating: 'good', category: 'Bank' },
  { symbol: 'INFY', name: 'Infosys', winRate: 41.5, totalReturn: 4.93, trades: 41, rating: 'good', category: 'IT' },
  { symbol: 'INDUSINDBK', name: 'IndusInd Bank', winRate: 35.6, totalReturn: 4.47, trades: 45, rating: 'good', category: 'Bank' },

  // OK (P&L 0-5%)
  { symbol: 'BANDHANBNK', name: 'Bandhan Bank', winRate: 33.3, totalReturn: 1.90, trades: 54, rating: 'ok', category: 'Bank' },
  { symbol: 'HCLTECH', name: 'HCL Tech', winRate: 40.5, totalReturn: 1.83, trades: 42, rating: 'ok', category: 'IT' },
];

interface RecommendedStocksProps {
  onStockClick?: (symbol: string) => void;
}

export default function RecommendedStocks({ onStockClick }: RecommendedStocksProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleStockClick = (symbol: string) => {
    if (onStockClick) {
      // Convert index symbols for chart
      const chartSymbol = symbol === '^NSEI' ? 'NIFTY 50' : symbol;
      onStockClick(chartSymbol);
    }
  };

  const getRatingBadge = (rating: string) => {
    switch (rating) {
      case 'recommended':
        return (
          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-500/30 text-emerald-300 border border-emerald-500/50">
            BEST
          </span>
        );
      case 'good':
        return (
          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-blue-500/30 text-blue-300 border border-blue-500/50">
            GOOD
          </span>
        );
      case 'ok':
        return (
          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-gray-500/30 text-gray-300 border border-gray-500/50">
            OK
          </span>
        );
      default:
        return null;
    }
  };

  const getReturnColor = (ret: number) => {
    if (ret >= 5) return 'text-emerald-400';
    if (ret >= 2) return 'text-emerald-300';
    if (ret >= 0) return 'text-gray-300';
    return 'text-red-400';
  };

  const getWinRateColor = (rate: number) => {
    if (rate >= 50) return 'text-emerald-400';
    if (rate >= 40) return 'text-yellow-400';
    return 'text-gray-400';
  };

  return (
    <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded hover:bg-gray-700 transition text-gray-400 hover:text-white"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Recommended Stocks
              <span className="px-1.5 py-0.5 text-[9px] font-normal rounded bg-purple-500/30 text-purple-300">
                BACKTESTED
              </span>
            </h2>
            {isExpanded && (
              <p className="text-xs text-gray-500">
                Best performers with Hybrid Supertrend (15-min)
              </p>
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Stocks List */}
          <div className="space-y-2">
            {RECOMMENDED_STOCKS.map((stock) => (
              <div
                key={stock.symbol}
                className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-700/50 transition cursor-pointer"
                onClick={() => handleStockClick(stock.symbol)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-start gap-1">
                    {getRatingBadge(stock.rating)}
                    <span className="text-[9px] text-gray-500 uppercase">{stock.category}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white hover:text-emerald-400 transition">
                        {stock.symbol === '^NSEI' ? 'NIFTY 50' : stock.symbol}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">{stock.name}</div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className={`text-sm font-bold ${getReturnColor(stock.totalReturn)}`}>
                        +{stock.totalReturn.toFixed(1)}%
                      </span>
                      <span className="text-[9px] text-gray-500 block">P&L</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-bold ${getWinRateColor(stock.winRate)}`}>
                        {stock.winRate.toFixed(0)}%
                      </span>
                      <span className="text-[9px] text-gray-500 block">Win</span>
                    </div>
                  </div>
                  <span className="text-[9px] text-gray-600">{stock.trades} trades</span>
                </div>
              </div>
            ))}
          </div>

          {/* Footer Note */}
          <div className="mt-4 pt-3 border-t border-gray-800">
            <p className="text-[10px] text-gray-600 text-center">
              Based on 60-day backtest with Hybrid Supertrend strategy (15-min timeframe). Past performance does not guarantee future results.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
