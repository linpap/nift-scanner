'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface CommodityData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  currency: string;
  lastUpdated: string;
}

interface Signal {
  factor: string;
  direction: 'up' | 'down' | 'neutral';
  change: number;
  beneficiaries: string[];
  losers: string[];
  insight: string;
}

interface ApiResponse {
  success: boolean;
  timestamp: number;
  lastUpdated: string;
  commodities: Record<string, CommodityData | null>;
  stocks: Record<string, CommodityData | null>;
  signals: Signal[];
}

// Static correlation data
const CORRELATIONS = [
  {
    factor: 'Silver ↑',
    stocks: 'Hindustan Zinc',
    direction: '88% of price gains flow to EBITDA',
    type: 'positive',
    commodityKey: 'silver',
  },
  {
    factor: 'Crude ↑',
    stocks: 'ONGC, Oil India',
    direction: '7-9% EPS for every $5/barrel',
    type: 'positive',
    commodityKey: 'crude',
  },
  {
    factor: 'Crude ↓',
    stocks: 'BPCL, HPCL, IOC',
    direction: 'Refiners rally on lower input costs',
    type: 'inverse',
    commodityKey: 'crude',
  },
  {
    factor: 'ATF ↓',
    stocks: 'IndiGo, SpiceJet',
    direction: 'ATF = 40% of airline costs',
    type: 'inverse',
    commodityKey: 'crude',
  },
  {
    factor: 'Rupee ↓',
    stocks: 'TCS, Infosys, Wipro',
    direction: 'Every 1% depreciation = ~1% revenue boost',
    type: 'inverse-inr',
    commodityKey: 'usdinr',
  },
  {
    factor: 'Aluminium ↑',
    stocks: 'Hindalco, Nalco',
    direction: 'Direct LME price pass-through',
    type: 'positive',
    commodityKey: 'aluminium',
  },
  {
    factor: 'BDI ↑',
    stocks: 'SCI, GE Shipping',
    direction: 'Higher freight = direct revenue boost',
    type: 'positive',
    commodityKey: 'baltic',
  },
  {
    factor: 'Rubber ↓',
    stocks: 'MRF, Apollo, CEAT',
    direction: '80%+ raw material is rubber',
    type: 'inverse',
    commodityKey: 'rubber',
  },
  {
    factor: 'Copper ↑',
    stocks: 'Hind Copper, Hindalco',
    direction: 'Direct LME correlation',
    type: 'positive',
    commodityKey: 'copper',
  },
  {
    factor: 'Gold ↑',
    stocks: 'Titan, Kalyan (mixed)',
    direction: 'Volume pressure but higher ticket size',
    type: 'mixed',
    commodityKey: 'gold',
  },
  {
    factor: 'Nat Gas ↑',
    stocks: 'Gujarat Gas, IGL, MGL',
    direction: 'CGD margin squeeze (negative)',
    type: 'negative',
    commodityKey: 'naturalgas',
  },
];

export default function DirectPlaysPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/commodities');
      if (!response.ok) throw new Error('Failed to fetch');
      const result = await response.json();
      setData(result);
      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      setError('Failed to fetch commodity data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Refresh every 2 minutes
    const interval = setInterval(fetchData, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatPrice = (price: number, currency: string) => {
    if (currency === 'INR') {
      return `₹${price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
    }
    return `$${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  };

  const formatChange = (change: number, percent: number) => {
    const sign = change >= 0 ? '+' : '';
    const color = change >= 0 ? 'text-green-400' : 'text-red-400';
    return (
      <span className={color}>
        {sign}{change.toFixed(2)} ({sign}{percent.toFixed(2)}%)
      </span>
    );
  };

  const getSignalColor = (direction: 'up' | 'down' | 'neutral') => {
    if (direction === 'up') return 'bg-green-500/20 border-green-500 text-green-400';
    if (direction === 'down') return 'bg-red-500/20 border-red-500 text-red-400';
    return 'bg-gray-500/20 border-gray-500 text-gray-400';
  };

  const getCorrelationBadge = (type: string, commodityData: CommodityData | null) => {
    if (!commodityData) return null;

    const change = commodityData.changePercent;
    let isActive = false;
    let badgeColor = 'bg-gray-700';

    if (type === 'positive' && change > 0.5) {
      isActive = true;
      badgeColor = 'bg-green-600';
    } else if (type === 'inverse' && change < -0.5) {
      isActive = true;
      badgeColor = 'bg-green-600';
    } else if (type === 'inverse-inr' && change > 0.2) {
      // Rupee depreciation (USD/INR going up)
      isActive = true;
      badgeColor = 'bg-green-600';
    } else if (type === 'negative' && change > 0.5) {
      isActive = true;
      badgeColor = 'bg-red-600';
    }

    return isActive ? (
      <span className={`${badgeColor} text-white text-xs px-2 py-1 rounded-full ml-2 animate-pulse`}>
        ACTIVE
      </span>
    ) : null;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm mb-2 inline-block">
            ← Back to Scanner
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold">Direct Plays Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">
            Commodity-Stock Correlations & Overnight Price Changes
          </p>
        </div>
        <div className="text-right">
          <button
            onClick={fetchData}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <p className="text-gray-500 text-xs mt-1">
            Last: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-500 text-red-400 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Active Signals */}
      {data?.signals && data.signals.filter(s => s.direction !== 'neutral').length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <span className="w-3 h-3 bg-yellow-400 rounded-full mr-2 animate-pulse"></span>
            Active Signals (Overnight Changes)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.signals
              .filter(s => s.direction !== 'neutral')
              .map((signal, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border ${getSignalColor(signal.direction)}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold">{signal.factor}</span>
                    <span className={`text-lg font-bold ${signal.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {signal.change >= 0 ? '+' : ''}{signal.change.toFixed(2)}%
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 mb-2">{signal.insight}</p>
                  {signal.beneficiaries.length > 0 && (
                    <div className="text-xs">
                      <span className="text-green-400">Beneficiaries: </span>
                      <span className="text-gray-300">{signal.beneficiaries.join(', ')}</span>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Commodity Prices Grid */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Overnight Commodity Prices</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {data?.commodities && Object.entries(data.commodities).map(([key, commodity]) => {
            if (!commodity) return null;
            return (
              <div
                key={key}
                className={`p-4 rounded-lg border ${
                  commodity.changePercent >= 0.5
                    ? 'border-green-500 bg-green-500/10'
                    : commodity.changePercent <= -0.5
                    ? 'border-red-500 bg-red-500/10'
                    : 'border-gray-700 bg-gray-800'
                }`}
              >
                <div className="text-xs text-gray-400 uppercase">{key}</div>
                <div className="font-semibold truncate">{commodity.name}</div>
                <div className="text-lg font-bold mt-1">
                  {formatPrice(commodity.price, commodity.currency)}
                </div>
                <div className="text-sm">
                  {formatChange(commodity.change, commodity.changePercent)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Correlation Table */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Strongest Correlations (Most Reliable)</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-800">
                <th className="border border-gray-700 px-4 py-3 text-left">Factor</th>
                <th className="border border-gray-700 px-4 py-3 text-left">Stock(s)</th>
                <th className="border border-gray-700 px-4 py-3 text-left">Direction</th>
                <th className="border border-gray-700 px-4 py-3 text-center">Overnight</th>
                <th className="border border-gray-700 px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {CORRELATIONS.map((corr, idx) => {
                const commodity = data?.commodities?.[corr.commodityKey];
                return (
                  <tr
                    key={idx}
                    className={`${
                      idx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800/50'
                    } hover:bg-gray-700/50 transition-colors`}
                  >
                    <td className="border border-gray-700 px-4 py-3 font-medium">
                      {corr.factor}
                    </td>
                    <td className="border border-gray-700 px-4 py-3 text-blue-400">
                      {corr.stocks}
                    </td>
                    <td className="border border-gray-700 px-4 py-3 text-gray-300 text-sm">
                      ✅ {corr.direction}
                    </td>
                    <td className="border border-gray-700 px-4 py-3 text-center">
                      {commodity ? (
                        <span className={commodity.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {commodity.changePercent >= 0 ? '+' : ''}
                          {commodity.changePercent.toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="border border-gray-700 px-4 py-3 text-center">
                      {getCorrelationBadge(corr.type, commodity || null)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Key Indian Stocks */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Key Stocks - Overnight Changes</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {data?.stocks && Object.entries(data.stocks).map(([key, stock]) => {
            if (!stock) return null;
            return (
              <div
                key={key}
                className={`p-3 rounded-lg border ${
                  stock.changePercent >= 1
                    ? 'border-green-500 bg-green-500/10'
                    : stock.changePercent <= -1
                    ? 'border-red-500 bg-red-500/10'
                    : 'border-gray-700 bg-gray-800'
                }`}
              >
                <div className="font-semibold text-sm">{stock.name}</div>
                <div className="text-lg font-bold">
                  ₹{stock.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </div>
                <div className="text-sm">
                  {formatChange(stock.change, stock.changePercent)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Reference */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Reference - What to Watch</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-green-400 font-semibold mb-2">If Markets Open Green</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Silver up → Buy Hindustan Zinc</li>
              <li>• Crude down → Buy BPCL, HPCL, Asian Paints, IndiGo</li>
              <li>• Rupee weak (USD/INR up) → Buy IT stocks</li>
              <li>• Aluminium up → Buy Hindalco, NALCO</li>
            </ul>
          </div>
          <div>
            <h3 className="text-red-400 font-semibold mb-2">If Markets Open Red</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Crude up → Buy ONGC, Oil India (upstream)</li>
              <li>• Rubber down → Buy tyre stocks (MRF, Apollo)</li>
              <li>• Gas down → Buy CGD stocks (Gujarat Gas)</li>
              <li>• Watch for inverse plays</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-gray-500 text-sm">
        <p>Data from Yahoo Finance. Prices may be delayed.</p>
        <p className="mt-1">For educational purposes only. Not financial advice.</p>
      </div>
    </div>
  );
}
