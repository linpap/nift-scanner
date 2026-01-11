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
// Scanned 190+ F&O stocks
const RECOMMENDED_STOCKS: RecommendedStock[] = [
  // Highly Recommended (P&L >= 5% AND Win Rate >= 50%)
  { symbol: 'JINDALSTEL', name: 'Jindal Steel', winRate: 61.1, totalReturn: 20.98, trades: 18, rating: 'recommended', category: 'Metal' },
  { symbol: 'SRF', name: 'SRF Ltd', winRate: 50.0, totalReturn: 13.79, trades: 28, rating: 'recommended', category: 'Chemical' },
  { symbol: 'NMDC', name: 'NMDC', winRate: 50.0, totalReturn: 10.02, trades: 30, rating: 'recommended', category: 'Metal' },
  { symbol: 'GSPL', name: 'Gujarat State Petro', winRate: 50.0, totalReturn: 9.26, trades: 28, rating: 'recommended', category: 'Energy' },
  { symbol: 'HDFCLIFE', name: 'HDFC Life', winRate: 50.0, totalReturn: 9.04, trades: 26, rating: 'recommended', category: 'Insurance' },
  { symbol: 'INDHOTEL', name: 'Indian Hotels', winRate: 50.0, totalReturn: 8.26, trades: 28, rating: 'recommended', category: 'Hotel' },

  // Good (P&L >= 5%)
  { symbol: 'TATASTEEL', name: 'Tata Steel', winRate: 41.7, totalReturn: 12.86, trades: 24, rating: 'good', category: 'Metal' },
  { symbol: 'NBCC', name: 'NBCC India', winRate: 32.3, totalReturn: 11.27, trades: 31, rating: 'good', category: 'Infra' },
  { symbol: 'TATACHEM', name: 'Tata Chemicals', winRate: 48.0, totalReturn: 9.07, trades: 25, rating: 'good', category: 'Chemical' },
  { symbol: 'INDIGO', name: 'IndiGo Airlines', winRate: 48.3, totalReturn: 8.42, trades: 29, rating: 'good', category: 'Aviation' },
  { symbol: 'COALINDIA', name: 'Coal India', winRate: 36.0, totalReturn: 7.99, trades: 25, rating: 'good', category: 'Mining' },
  { symbol: 'HINDPETRO', name: 'HPCL', winRate: 33.3, totalReturn: 7.67, trades: 33, rating: 'good', category: 'Energy' },
  { symbol: 'MOTHERSON', name: 'Motherson Sumi', winRate: 43.5, totalReturn: 6.78, trades: 23, rating: 'good', category: 'Auto' },
  { symbol: 'TATAPOWER', name: 'Tata Power', winRate: 42.9, totalReturn: 6.65, trades: 28, rating: 'good', category: 'Power' },
  { symbol: 'SIEMENS', name: 'Siemens India', winRate: 31.3, totalReturn: 6.39, trades: 32, rating: 'good', category: 'Industrial' },
  { symbol: 'ADANIENT', name: 'Adani Enterprises', winRate: 42.9, totalReturn: 5.60, trades: 28, rating: 'good', category: 'Conglom' },
  { symbol: 'GODREJPROP', name: 'Godrej Properties', winRate: 39.3, totalReturn: 5.36, trades: 28, rating: 'good', category: 'Realty' },

  // OK (P&L 2-5%)
  { symbol: 'ULTRACEMCO', name: 'UltraTech Cement', winRate: 53.6, totalReturn: 4.70, trades: 28, rating: 'ok', category: 'Cement' },
  { symbol: 'BPCL', name: 'BPCL', winRate: 38.5, totalReturn: 4.38, trades: 26, rating: 'ok', category: 'Energy' },
  { symbol: 'IRCTC', name: 'IRCTC', winRate: 36.4, totalReturn: 4.09, trades: 33, rating: 'ok', category: 'Travel' },
  { symbol: 'POWERGRID', name: 'Power Grid Corp', winRate: 44.4, totalReturn: 4.08, trades: 27, rating: 'ok', category: 'Power' },
];

interface RecommendedStocksProps {
  onStockClick?: (symbol: string) => void;
}

export default function RecommendedStocks({ onStockClick }: RecommendedStocksProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleStockClick = (symbol: string) => {
    if (onStockClick) {
      onStockClick(symbol);
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
    if (ret >= 10) return 'text-emerald-400';
    if (ret >= 5) return 'text-emerald-300';
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
                Top performers from 190+ F&O stocks (15-min, 60 days)
              </p>
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Stocks List */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
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
                        {stock.symbol}
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
              Based on 60-day backtest with Hybrid Supertrend strategy (15-min). Past performance does not guarantee future results.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
