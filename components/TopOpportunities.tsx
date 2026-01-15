'use client';

import { useEffect, useState } from 'react';

interface Opportunity {
  symbol: string;
  name: string;
  signal: 'buy' | 'sell';
  price: number;
  change: number;
  changePercent: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  strength: number;
  timestamp: number;
  daysAgo?: number;
}

interface OpportunitiesData {
  buy: Opportunity[];
  sell: Opportunity[];
}

interface TopOpportunitiesProps {
  onStockClick?: (symbol: string) => void;
}

export default function TopOpportunities({ onStockClick }: TopOpportunitiesProps) {
  const [data, setData] = useState<OpportunitiesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scannedAt, setScannedAt] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');

  const fetchOpportunities = async (refresh = false) => {
    try {
      if (refresh) setIsRefreshing(true);
      else setLoading(true);

      const url = refresh ? '/api/opportunities?refresh=true&limit=5' : '/api/opportunities?limit=5';
      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setScannedAt(result.scannedAt);
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch opportunities');
      }
    } catch {
      setError('Failed to load opportunities');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const renderStrengthBars = (strength: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className={`w-1 h-2.5 rounded-sm ${
              level <= strength
                ? strength >= 4
                  ? 'bg-emerald-500'
                  : strength >= 2
                  ? 'bg-yellow-500'
                  : 'bg-gray-500'
                : 'bg-gray-700'
            }`}
          />
        ))}
      </div>
    );
  };

  const formatDaysAgo = (days?: number) => {
    if (days === undefined || days === 0) return 'Today';
    if (days === 1) return '1d ago';
    return `${days}d ago`;
  };

  const handleStockClick = (symbol: string) => {
    if (onStockClick) {
      onStockClick(symbol);
    }
  };

  const OpportunityRow = ({ opp, type }: { opp: Opportunity; type: 'buy' | 'sell' }) => (
    <div
      className="flex items-center justify-between py-3 px-4 hover:bg-gray-800/50 rounded-lg transition cursor-pointer border-b border-gray-800/50 last:border-0"
      onClick={() => handleStockClick(opp.symbol)}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-bold ${
            type === 'buy'
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-red-500/20 text-red-400'
          }`}
        >
          {type === 'buy' ? 'BUY' : 'SELL'}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white text-sm">{opp.symbol}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              opp.daysAgo === 0
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-gray-700 text-gray-400'
            }`}>
              {formatDaysAgo(opp.daysAgo)}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            <span className="font-mono">{opp.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className={`text-sm font-medium ${opp.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {opp.changePercent >= 0 ? '+' : ''}{opp.changePercent.toFixed(2)}%
        </div>
        <div className="flex flex-col items-end gap-1">
          {renderStrengthBars(opp.strength)}
          <span className="text-[9px] text-gray-500 uppercase">{opp.trend}</span>
        </div>
      </div>
    </div>
  );

  const buyCount = data?.buy?.length || 0;
  const sellCount = data?.sell?.length || 0;

  return (
    <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded hover:bg-gray-700 transition text-gray-400 hover:text-white"
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
            <h2 className="text-lg font-bold text-white">Top Opportunities</h2>
            <p className="text-xs text-gray-500">Last 7 days • 180+ F&O stocks</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {scannedAt && (
            <span className="text-[10px] text-gray-500 hidden sm:block">
              {formatTime(scannedAt)}
            </span>
          )}
          <button
            onClick={() => fetchOpportunities(true)}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition text-gray-400 hover:text-white disabled:opacity-50"
            title="Refresh"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent"></div>
            </div>
          ) : error ? (
            <div className="text-center text-red-400 py-8">{error}</div>
          ) : (
            <>
              {/* Tabs */}
              <div className="flex border-b border-gray-800">
                <button
                  onClick={() => setActiveTab('buy')}
                  className={`flex-1 py-3 px-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    activeTab === 'buy'
                      ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-500/5'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  Buy Signals
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    activeTab === 'buy' ? 'bg-emerald-500/20' : 'bg-gray-700'
                  }`}>
                    {buyCount}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('sell')}
                  className={`flex-1 py-3 px-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    activeTab === 'sell'
                      ? 'text-red-400 border-b-2 border-red-400 bg-red-500/5'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  Sell Signals
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    activeTab === 'sell' ? 'bg-red-500/20' : 'bg-gray-700'
                  }`}>
                    {sellCount}
                  </span>
                </button>
              </div>

              {/* Content */}
              <div className="divide-y divide-gray-800/50">
                {activeTab === 'buy' ? (
                  data?.buy && data.buy.length > 0 ? (
                    data.buy.map((opp) => (
                      <OpportunityRow key={opp.symbol} opp={opp} type="buy" />
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-8 text-sm">
                      No buy signals found
                    </div>
                  )
                ) : (
                  data?.sell && data.sell.length > 0 ? (
                    data.sell.map((opp) => (
                      <OpportunityRow key={opp.symbol} opp={opp} type="sell" />
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-8 text-sm">
                      No sell signals found
                    </div>
                  )
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 bg-gray-800/30 border-t border-gray-800">
                <p className="text-[10px] text-gray-500 text-center">
                  Based on Hybrid Supertrend + EMA crossover • Not financial advice
                </p>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
