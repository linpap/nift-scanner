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

interface Opportunity {
  stock: string;
  stockKey: string;
  action: 'LONG' | 'SHORT';
  confidence: number;
  reason: string;
  trigger: string;
  triggerChange: number;
  priceTarget?: string;
  riskReward: string;
}

interface ApiResponse {
  success: boolean;
  timestamp: number;
  lastUpdated: string;
  commodities: Record<string, CommodityData | null>;
  stocks: Record<string, CommodityData | null>;
  signals: Signal[];
  opportunities: Opportunity[];
}

// Static correlation data
const CORRELATIONS = [
  { factor: 'Silver ↑', stocks: 'Hindustan Zinc', direction: '88% of price gains flow to EBITDA', type: 'positive', commodityKey: 'silver' },
  { factor: 'Crude ↑', stocks: 'ONGC, Oil India', direction: '7-9% EPS for every $5/barrel', type: 'positive', commodityKey: 'crude' },
  { factor: 'Crude ↓', stocks: 'BPCL, HPCL, IOC', direction: 'Refiners rally on lower input costs', type: 'inverse', commodityKey: 'crude' },
  { factor: 'ATF ↓', stocks: 'IndiGo, SpiceJet', direction: 'ATF = 40% of airline costs', type: 'inverse', commodityKey: 'crude' },
  { factor: 'Rupee ↓', stocks: 'TCS, Infosys, Wipro', direction: 'Every 1% depreciation = ~1% revenue boost', type: 'inverse-inr', commodityKey: 'usdinr' },
  { factor: 'Aluminium ↑', stocks: 'Hindalco, Nalco', direction: 'Direct LME price pass-through', type: 'positive', commodityKey: 'aluminium' },
  { factor: 'BDI ↑', stocks: 'SCI, GE Shipping', direction: 'Higher freight = direct revenue boost', type: 'positive', commodityKey: 'baltic' },
  { factor: 'Rubber ↓', stocks: 'MRF, Apollo, CEAT', direction: '40-50% raw material is rubber', type: 'inverse', commodityKey: 'rubber' },
  { factor: 'Copper ↑', stocks: 'Hind Copper, Hindalco', direction: 'Direct LME correlation', type: 'positive', commodityKey: 'copper' },
  { factor: 'Gold ↑', stocks: 'Titan, Kalyan (mixed)', direction: 'Volume pressure but higher ticket size', type: 'mixed', commodityKey: 'gold' },
  { factor: 'Nat Gas ↑', stocks: 'Gujarat Gas, IGL, MGL', direction: 'CGD margin squeeze (negative)', type: 'negative', commodityKey: 'naturalgas' },
  { factor: 'Soda Ash ↑', stocks: 'GHCL, Tata Chemicals', direction: 'Direct price pass-through to earnings', type: 'positive', commodityKey: 'sodaash' },
];

// Confidence Meter Component
function ConfidenceMeter({ confidence }: { confidence: number }) {
  const getColor = () => {
    if (confidence >= 80) return 'bg-green-500';
    if (confidence >= 60) return 'bg-emerald-500';
    if (confidence >= 40) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  const getLabel = () => {
    if (confidence >= 80) return 'Very High';
    if (confidence >= 60) return 'High';
    if (confidence >= 40) return 'Moderate';
    return 'Low';
  };

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">Confidence</span>
        <span className={`font-semibold ${confidence >= 60 ? 'text-green-400' : 'text-yellow-400'}`}>
          {confidence}% - {getLabel()}
        </span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor()} transition-all duration-500`}
          style={{ width: `${confidence}%` }}
        />
      </div>
    </div>
  );
}

// Opportunity Card Component
function OpportunityCard({ opp, stock }: { opp: Opportunity; stock: CommodityData | null }) {
  const isLong = opp.action === 'LONG';

  return (
    <div
      className={`p-5 rounded-xl border-2 ${
        isLong
          ? 'border-green-500 bg-gradient-to-br from-green-900/30 to-green-800/10'
          : 'border-red-500 bg-gradient-to-br from-red-900/30 to-red-800/10'
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <span
            className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
              isLong ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
            }`}
          >
            {opp.action}
          </span>
          <h3 className="text-xl font-bold mt-2">{opp.stock}</h3>
        </div>
        <div className="text-right">
          {stock && (
            <>
              <div className="text-lg font-bold">
                ₹{stock.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </div>
              <div className={`text-sm ${stock.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
              </div>
            </>
          )}
        </div>
      </div>

      {/* Confidence Meter */}
      <div className="mb-4">
        <ConfidenceMeter confidence={opp.confidence} />
      </div>

      {/* Trigger */}
      <div className="bg-gray-800/50 rounded-lg p-3 mb-3">
        <div className="text-xs text-gray-400 uppercase mb-1">Trigger</div>
        <div className={`font-semibold ${opp.triggerChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {opp.trigger}
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Reason:</span>
          <span className="text-gray-200">{opp.reason}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Expected Move:</span>
          <span className="text-blue-400">{opp.priceTarget}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Risk/Reward:</span>
          <span className={`${
            opp.riskReward === 'Favorable' ? 'text-green-400' :
            opp.riskReward === 'Moderate' ? 'text-yellow-400' : 'text-orange-400'
          }`}>
            {opp.riskReward}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function DirectPlaysPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = async () => {
    try {
      setLoading(true);
      // Add cache-busting timestamp to force fresh data
      const response = await fetch(`/api/commodities?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
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

  const getCorrelationBadge = (type: string, commodityData: CommodityData | null) => {
    if (!commodityData) return null;
    const change = commodityData.changePercent;
    let isActive = false;
    let badgeColor = 'bg-gray-700';

    if (type === 'positive' && change > 0.5) { isActive = true; badgeColor = 'bg-green-600'; }
    else if (type === 'inverse' && change < -0.5) { isActive = true; badgeColor = 'bg-green-600'; }
    else if (type === 'inverse-inr' && change > 0.2) { isActive = true; badgeColor = 'bg-green-600'; }
    else if (type === 'negative' && change > 0.5) { isActive = true; badgeColor = 'bg-red-600'; }

    return isActive ? (
      <span className={`${badgeColor} text-white text-xs px-2 py-1 rounded-full ml-2 animate-pulse`}>
        ACTIVE
      </span>
    ) : null;
  };

  const longOpps = data?.opportunities?.filter(o => o.action === 'LONG') || [];
  const shortOpps = data?.opportunities?.filter(o => o.action === 'SHORT') || [];

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
            Commodity-Stock Correlations & Trading Opportunities
          </p>
        </div>
        <div className="text-right flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <Link
              href="/secrets"
              className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              🔮 Secrets
            </Link>
            <button
              onClick={fetchData}
              disabled={loading}
              className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${
                loading
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 active:scale-95'
              }`}
            >
              {loading ? (
                <>
                  <span className="animate-spin">⟳</span>
                  Fetching...
                </>
              ) : (
                <>
                  <span>🔄</span>
                  Refresh Now
                </>
              )}
            </button>
          </div>
          <p className="text-gray-500 text-xs">
            Last fetched: {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          <p className="text-gray-600 text-xs">
            Auto-refreshes every 2 minutes
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-500 text-red-400 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* TRADING OPPORTUNITIES SECTION */}
      {data?.opportunities && data.opportunities.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">🎯</span>
            <div>
              <h2 className="text-2xl font-bold">Trading Opportunities</h2>
              <p className="text-gray-400 text-sm">Based on overnight commodity movements</p>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-green-900/30 border border-green-600 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-green-400">{longOpps.length}</div>
              <div className="text-sm text-gray-400">Long Opportunities</div>
            </div>
            <div className="bg-red-900/30 border border-red-600 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-red-400">{shortOpps.length}</div>
              <div className="text-sm text-gray-400">Short Opportunities</div>
            </div>
            <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-blue-400">
                {data.opportunities.filter(o => o.confidence >= 70).length}
              </div>
              <div className="text-sm text-gray-400">High Confidence</div>
            </div>
            <div className="bg-purple-900/30 border border-purple-600 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-purple-400">
                {Math.round(data.opportunities.reduce((acc, o) => acc + o.confidence, 0) / data.opportunities.length)}%
              </div>
              <div className="text-sm text-gray-400">Avg Confidence</div>
            </div>
          </div>

          {/* Long Opportunities */}
          {longOpps.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
                <span className="text-xl">📈</span> GO LONG - Buy These Stocks
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {longOpps.map((opp, idx) => (
                  <OpportunityCard
                    key={idx}
                    opp={opp}
                    stock={data.stocks[opp.stockKey] || null}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Short Opportunities */}
          {shortOpps.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
                <span className="text-xl">📉</span> GO SHORT - Sell/Avoid These Stocks
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {shortOpps.map((opp, idx) => (
                  <OpportunityCard
                    key={idx}
                    opp={opp}
                    stock={data.stocks[opp.stockKey] || null}
                  />
                ))}
              </div>
            </div>
          )}

          {/* No Opportunities */}
          {data.opportunities.length === 0 && (
            <div className="bg-gray-800 rounded-lg p-8 text-center">
              <span className="text-4xl mb-4 block">😴</span>
              <h3 className="text-xl font-semibold mb-2">No Strong Opportunities Today</h3>
              <p className="text-gray-400">
                Commodity markets are relatively stable. No significant moves detected overnight.
              </p>
            </div>
          )}
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
                    className={`${idx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800/50'} hover:bg-gray-700/50 transition-colors`}
                  >
                    <td className="border border-gray-700 px-4 py-3 font-medium">{corr.factor}</td>
                    <td className="border border-gray-700 px-4 py-3 text-blue-400">{corr.stocks}</td>
                    <td className="border border-gray-700 px-4 py-3 text-gray-300 text-sm">✅ {corr.direction}</td>
                    <td className="border border-gray-700 px-4 py-3 text-center">
                      {commodity ? (
                        <span className={commodity.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {commodity.changePercent >= 0 ? '+' : ''}{commodity.changePercent.toFixed(2)}%
                        </span>
                      ) : <span className="text-gray-500">-</span>}
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
                  stock.changePercent >= 1 ? 'border-green-500 bg-green-500/10' :
                  stock.changePercent <= -1 ? 'border-red-500 bg-red-500/10' :
                  'border-gray-700 bg-gray-800'
                }`}
              >
                <div className="font-semibold text-sm">{stock.name}</div>
                <div className="text-lg font-bold">
                  ₹{stock.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </div>
                <div className="text-sm">{formatChange(stock.change, stock.changePercent)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Reference */}
      <div className="bg-gray-800 rounded-lg p-6 mb-8">
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
      <div className="text-center text-gray-500 text-sm">
        <p>Data from Yahoo Finance. Prices may be delayed.</p>
        <p className="mt-1">For educational purposes only. Not financial advice.</p>
      </div>
    </div>
  );
}
