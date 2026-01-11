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
  const [isExpanded, setIsExpanded] = useState(true);

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
    } catch (err) {
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
            className={`w-1.5 h-3 rounded-sm ${
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

  const OpportunityCard = ({ opp, type }: { opp: Opportunity; type: 'buy' | 'sell' }) => (
    <div
      className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-700/50 transition cursor-pointer"
      onClick={() => handleStockClick(opp.symbol)}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center text-xs font-bold ${
            type === 'buy'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}
        >
          <span>{type === 'buy' ? 'BUY' : 'SELL'}</span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white hover:text-emerald-400 transition">{opp.symbol}</span>
            <span className={`text-[9px] px-1 py-0.5 rounded ${
              opp.daysAgo === 0 ? 'bg-emerald-500/30 text-emerald-300' : 'bg-gray-600/50 text-gray-400'
            }`}>
              {formatDaysAgo(opp.daysAgo)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="font-mono">{opp.price.toFixed(2)}</span>
            <span className={opp.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}>
              {opp.changePercent >= 0 ? '+' : ''}{opp.changePercent.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500 uppercase">Strength</span>
          {renderStrengthBars(opp.strength)}
        </div>
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-medium ${
            opp.trend === 'bullish'
              ? 'bg-emerald-500/20 text-emerald-400'
              : opp.trend === 'bearish'
              ? 'bg-red-500/20 text-red-400'
              : 'bg-gray-500/20 text-gray-400'
          }`}
        >
          {opp.trend}
        </span>
      </div>
    </div>
  );

  const ExpandCollapseIcon = () => (
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
  );

  return (
    <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ExpandCollapseIcon />
          <div>
            <h2 className="text-lg font-bold text-white">Top Opportunities</h2>
            {isExpanded && (
              <p className="text-xs text-gray-500">
                Signals from last 7 days across 180+ F&O stocks
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isExpanded && scannedAt && (
            <span className="text-[10px] text-gray-500">
              Scanned: {formatTime(scannedAt)}
            </span>
          )}
          <button
            onClick={() => fetchOpportunities(true)}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition text-gray-400 hover:text-white disabled:opacity-50"
            title="Refresh scan"
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Buy Signals */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-sm font-semibold text-emerald-400">Buy Signals</span>
                    <span className="text-xs text-gray-500">({data?.buy.length || 0})</span>
                  </div>
                  <div className="space-y-2">
                    {data?.buy && data.buy.length > 0 ? (
                      data.buy.map((opp) => (
                        <OpportunityCard key={opp.symbol} opp={opp} type="buy" />
                      ))
                    ) : (
                      <div className="text-center text-gray-500 py-4 text-sm">
                        No buy signals found
                      </div>
                    )}
                  </div>
                </div>

                {/* Sell Signals */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span className="text-sm font-semibold text-red-400">Sell Signals</span>
                    <span className="text-xs text-gray-500">({data?.sell.length || 0})</span>
                  </div>
                  <div className="space-y-2">
                    {data?.sell && data.sell.length > 0 ? (
                      data.sell.map((opp) => (
                        <OpportunityCard key={opp.symbol} opp={opp} type="sell" />
                      ))
                    ) : (
                      <div className="text-center text-gray-500 py-4 text-sm">
                        No sell signals found
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-800">
                <p className="text-[10px] text-gray-600 text-center">
                  Signals based on Hybrid Supertrend + EMA crossover strategy. Not financial advice.
                </p>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
