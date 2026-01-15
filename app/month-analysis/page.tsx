'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface StockRecommendation {
  symbol: string;
  sector: string;
  sectorName: string;
  currentPrice: number;
  confidence: number;
  expectedReturn: number;
  winRate: number;
  rationale: string[];
  historicalData: {
    month: number;
    year: number;
    return: number;
  }[];
}

interface SectorAnalysis {
  sector: {
    id: string;
    name: string;
    description: string;
    seasonalHint: string;
  };
  affinityScore: number;
  avgReturn: number;
  winRate: number;
  topStocks: StockRecommendation[];
  keyInsight: string;
}

interface MonthAnalysisResponse {
  month: number;
  monthName: string;
  year: number;
  marketEvents: string[];
  topSectors: SectorAnalysis[];
  allRecommendations: StockRecommendation[];
  keyObservations: string[];
  cacheAge: number;
  totalStocksAnalyzed: number;
}

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

function ConfidenceMeter({ value }: { value: number }) {
  const getColor = () => {
    if (value >= 80) return 'bg-emerald-500';
    if (value >= 65) return 'bg-green-500';
    if (value >= 50) return 'bg-yellow-500';
    if (value >= 35) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getLabel = () => {
    if (value >= 80) return 'Very High';
    if (value >= 65) return 'High';
    if (value >= 50) return 'Moderate';
    if (value >= 35) return 'Low';
    return 'Very Low';
  };

  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor()} transition-all duration-300`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className={`text-xs font-medium ${
        value >= 65 ? 'text-green-400' : value >= 50 ? 'text-yellow-400' : 'text-red-400'
      }`}>
        {value}% ({getLabel()})
      </span>
    </div>
  );
}

function SectorCard({ sector, expanded, onToggle }: {
  sector: SectorAnalysis;
  expanded: boolean;
  onToggle: () => void;
}) {
  const getAffinityColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 bg-emerald-500/20';
    if (score >= 65) return 'text-green-400 bg-green-500/20';
    if (score >= 50) return 'text-yellow-400 bg-yellow-500/20';
    return 'text-red-400 bg-red-500/20';
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      <div
        className="p-4 cursor-pointer hover:bg-gray-750"
        onClick={onToggle}
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-semibold text-white">{sector.sector.name}</h3>
            <p className="text-xs text-gray-400">{sector.sector.description}</p>
          </div>
          <span className={`px-2 py-1 rounded text-sm font-bold ${getAffinityColor(sector.affinityScore)}`}>
            {sector.affinityScore}%
          </span>
        </div>

        <p className="text-sm text-emerald-400 mb-2">{sector.keyInsight}</p>

        <div className="flex gap-4 text-xs text-gray-400">
          <span>Avg Return: <span className={sector.avgReturn >= 0 ? 'text-green-400' : 'text-red-400'}>
            {sector.avgReturn >= 0 ? '+' : ''}{sector.avgReturn.toFixed(1)}%
          </span></span>
          <span>Win Rate: <span className="text-blue-400">{sector.winRate.toFixed(0)}%</span></span>
          <span>Top Picks: {sector.topStocks.length}</span>
        </div>

        <div className="mt-2 text-xs text-gray-500">
          {expanded ? '▼ Click to collapse' : '▶ Click to see top stocks'}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-700 p-4 bg-gray-850">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Top Stocks for This Month:</h4>
          <div className="space-y-3">
            {sector.topStocks.map((stock) => (
              <div key={stock.symbol} className="bg-gray-900 rounded p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-mono font-bold text-emerald-400">{stock.symbol}</span>
                  <ConfidenceMeter value={stock.confidence} />
                </div>
                <div className="flex gap-4 text-xs text-gray-400 mb-2">
                  <span>Expected: <span className={stock.expectedReturn >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {stock.expectedReturn >= 0 ? '+' : ''}{stock.expectedReturn.toFixed(1)}%
                  </span></span>
                  <span>Win Rate: {stock.winRate.toFixed(0)}%</span>
                  {stock.currentPrice > 0 && (
                    <span>Price: ₹{stock.currentPrice.toFixed(0)}</span>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {stock.rationale.slice(0, 2).map((r, i) => (
                    <div key={i} className="flex items-start gap-1 mt-1">
                      <span className="text-emerald-500">•</span>
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StockRow({ stock, expanded, onToggle }: {
  stock: StockRecommendation;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className="border-b border-gray-700 hover:bg-gray-800 cursor-pointer"
        onClick={onToggle}
      >
        <td className="py-3 px-4">
          <span className="font-mono font-bold text-emerald-400">{stock.symbol}</span>
        </td>
        <td className="py-3 px-4">
          <span className="text-xs bg-gray-700 px-2 py-1 rounded">{stock.sectorName}</span>
        </td>
        <td className="py-3 px-4">
          {stock.currentPrice > 0 ? `₹${stock.currentPrice.toFixed(0)}` : '-'}
        </td>
        <td className="py-3 px-4">
          <ConfidenceMeter value={stock.confidence} />
        </td>
        <td className="py-3 px-4">
          <span className={stock.expectedReturn >= 0 ? 'text-green-400' : 'text-red-400'}>
            {stock.expectedReturn >= 0 ? '+' : ''}{stock.expectedReturn.toFixed(1)}%
          </span>
        </td>
        <td className="py-3 px-4">
          <span className="text-blue-400">{stock.winRate.toFixed(0)}%</span>
        </td>
        <td className="py-3 px-4 text-gray-400">
          {expanded ? '▼' : '▶'}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-gray-850">
          <td colSpan={7} className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Rationale:</h4>
                <ul className="text-xs text-gray-400 space-y-1">
                  {stock.rationale.map((r, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-emerald-500">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Historical Performance:</h4>
                <div className="flex flex-wrap gap-2">
                  {stock.historicalData.map((h, i) => (
                    <span
                      key={i}
                      className={`px-2 py-1 rounded text-xs ${
                        h.return >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {h.year}: {h.return >= 0 ? '+' : ''}{h.return.toFixed(1)}%
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function MonthAnalysisPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [data, setData] = useState<MonthAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSectors, setExpandedSectors] = useState<Set<string>>(new Set());
  const [expandedStocks, setExpandedStocks] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'sectors' | 'stocks'>('sectors');
  const [sectorFilter, setSectorFilter] = useState<string>('all');

  const fetchAnalysis = async (refresh = false) => {
    setLoading(true);
    setError(null);

    try {
      const url = `/api/month-analysis?month=${selectedMonth}${refresh ? '&refresh=true' : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch analysis');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [selectedMonth]);

  const toggleSector = (sectorId: string) => {
    setExpandedSectors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectorId)) {
        newSet.delete(sectorId);
      } else {
        newSet.add(sectorId);
      }
      return newSet;
    });
  };

  const toggleStock = (symbol: string) => {
    setExpandedStocks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(symbol)) {
        newSet.delete(symbol);
      } else {
        newSet.add(symbol);
      }
      return newSet;
    });
  };

  const filteredStocks = data?.allRecommendations.filter(
    s => sectorFilter === 'all' || s.sector === sectorFilter
  ) || [];

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <Link href="/" className="text-gray-400 hover:text-white text-sm">
              ← Back to Scanner
            </Link>
            <h1 className="text-2xl font-bold text-emerald-400 mt-1">
              Monthly Seasonal Analysis
            </h1>
            <p className="text-gray-400 text-sm">
              2-year historical patterns • Sector seasonality • Stock recommendations
            </p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <button
              onClick={() => fetchAnalysis(true)}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-4 py-2 rounded font-medium"
            >
              {loading ? 'Analyzing...' : 'Refresh Data'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4">
        {/* Loading State */}
        {loading && !data && (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4"></div>
            <p className="text-gray-400">Analyzing 2 years of historical data...</p>
            <p className="text-gray-500 text-sm mt-2">This may take a minute on first load</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 p-4 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Results */}
        {data && (
          <>
            {/* Key Observations */}
            <section className="mb-6">
              <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
                <span className="text-2xl">🔍</span>
                Key Observations for {data.monthName} {data.year}
              </h2>
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <ul className="space-y-2">
                  {data.keyObservations.map((obs, i) => (
                    <li key={i} className="text-gray-300 flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">→</span>
                      <span>{obs}</span>
                    </li>
                  ))}
                </ul>
                {data.marketEvents.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Market Events:</h4>
                    <div className="flex flex-wrap gap-2">
                      {data.marketEvents.map((event, i) => (
                        <span key={i} className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm">
                          {event}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="text-2xl font-bold text-emerald-400">{data.topSectors.length}</div>
                <div className="text-gray-400 text-sm">Sectors Analyzed</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="text-2xl font-bold text-blue-400">{data.totalStocksAnalyzed}</div>
                <div className="text-gray-400 text-sm">Stocks Analyzed</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="text-2xl font-bold text-yellow-400">
                  {data.allRecommendations.filter(s => s.confidence >= 65).length}
                </div>
                <div className="text-gray-400 text-sm">High Confidence Picks</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="text-2xl font-bold text-purple-400">
                  {Math.round(data.cacheAge / 60)}m ago
                </div>
                <div className="text-gray-400 text-sm">Data Updated</div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-4 border-b border-gray-700 pb-2">
              <button
                onClick={() => setActiveTab('sectors')}
                className={`px-4 py-2 rounded-t font-medium ${
                  activeTab === 'sectors'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                By Sector ({data.topSectors.length})
              </button>
              <button
                onClick={() => setActiveTab('stocks')}
                className={`px-4 py-2 rounded-t font-medium ${
                  activeTab === 'stocks'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                All Stocks ({data.allRecommendations.length})
              </button>
            </div>

            {/* Sectors View */}
            {activeTab === 'sectors' && (
              <section>
                <h2 className="text-lg font-bold mb-3 text-gray-300">
                  Sector Performance (Ranked by Historical Affinity)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.topSectors.map((sector) => (
                    <SectorCard
                      key={sector.sector.id}
                      sector={sector}
                      expanded={expandedSectors.has(sector.sector.id)}
                      onToggle={() => toggleSector(sector.sector.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Stocks View */}
            {activeTab === 'stocks' && (
              <section>
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-lg font-bold text-gray-300">
                    All Stock Recommendations (Ranked by Confidence)
                  </h2>
                  <select
                    value={sectorFilter}
                    onChange={(e) => setSectorFilter(e.target.value)}
                    className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm"
                  >
                    <option value="all">All Sectors</option>
                    {data.topSectors.map((s) => (
                      <option key={s.sector.id} value={s.sector.id}>{s.sector.name}</option>
                    ))}
                  </select>
                </div>

                <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-750 text-gray-400 text-sm">
                        <tr>
                          <th className="text-left py-3 px-4">Symbol</th>
                          <th className="text-left py-3 px-4">Sector</th>
                          <th className="text-left py-3 px-4">Price</th>
                          <th className="text-left py-3 px-4">Confidence</th>
                          <th className="text-left py-3 px-4">Exp. Return</th>
                          <th className="text-left py-3 px-4">Win Rate</th>
                          <th className="text-left py-3 px-4"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStocks.slice(0, 50).map((stock) => (
                          <StockRow
                            key={stock.symbol}
                            stock={stock}
                            expanded={expandedStocks.has(stock.symbol)}
                            onToggle={() => toggleStock(stock.symbol)}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {filteredStocks.length > 50 && (
                    <div className="p-4 text-center text-gray-400 text-sm">
                      Showing top 50 of {filteredStocks.length} stocks
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* February Special: PSU Focus */}
            {data.month === 2 && (
              <section className="mt-6 bg-gradient-to-r from-orange-500/20 to-yellow-500/20 rounded-lg p-6 border border-orange-500/30">
                <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
                  <span className="text-2xl">🏛️</span>
                  Budget Month Special: PSU Focus
                </h2>
                <p className="text-gray-300 mb-4">
                  February is historically the best month for PSU stocks due to Union Budget announcements,
                  disinvestment plans, and infrastructure spending allocations.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {data.topSectors
                    .filter(s => s.sector.id === 'psu' || s.sector.id === 'psu_banks' || s.sector.id === 'defence')
                    .map((sector) => (
                      <div key={sector.sector.id} className="bg-gray-800/50 rounded-lg p-4">
                        <h3 className="font-semibold text-orange-400">{sector.sector.name}</h3>
                        <p className="text-sm text-gray-400 mt-1">{sector.keyInsight}</p>
                        <div className="mt-2">
                          <span className="text-xs text-gray-500">Top picks: </span>
                          <span className="text-sm text-white">
                            {sector.topStocks.slice(0, 3).map(s => s.symbol).join(', ')}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </section>
            )}

            {/* October-November Special: Festive Season */}
            {(data.month === 10 || data.month === 11) && (
              <section className="mt-6 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg p-6 border border-purple-500/30">
                <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
                  <span className="text-2xl">🎉</span>
                  Festive Season Special
                </h2>
                <p className="text-gray-300 mb-4">
                  {data.month === 10 ? 'October' : 'November'} is peak festive season (Navratri/Diwali/Dhanteras).
                  Consumer Durables, Auto, and FMCG stocks historically outperform.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {data.topSectors
                    .filter(s => s.sector.id === 'consumer_durables' || s.sector.id === 'auto' || s.sector.id === 'fmcg')
                    .map((sector) => (
                      <div key={sector.sector.id} className="bg-gray-800/50 rounded-lg p-4">
                        <h3 className="font-semibold text-purple-400">{sector.sector.name}</h3>
                        <p className="text-sm text-gray-400 mt-1">{sector.keyInsight}</p>
                        <div className="mt-2">
                          <span className="text-xs text-gray-500">Top picks: </span>
                          <span className="text-sm text-white">
                            {sector.topStocks.slice(0, 3).map(s => s.symbol).join(', ')}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </section>
            )}

            {/* Summer Special: Power & Appliances */}
            {(data.month >= 3 && data.month <= 5) && (
              <section className="mt-6 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg p-6 border border-yellow-500/30">
                <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
                  <span className="text-2xl">☀️</span>
                  Summer Season Special
                </h2>
                <p className="text-gray-300 mb-4">
                  {MONTHS[data.month - 1].label} sees peak demand for ACs, coolers, and increased power consumption.
                  Consumer Durables and Power utilities typically perform well.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.topSectors
                    .filter(s => s.sector.id === 'consumer_durables' || s.sector.id === 'power')
                    .map((sector) => (
                      <div key={sector.sector.id} className="bg-gray-800/50 rounded-lg p-4">
                        <h3 className="font-semibold text-yellow-400">{sector.sector.name}</h3>
                        <p className="text-sm text-gray-400 mt-1">{sector.keyInsight}</p>
                        <div className="mt-2">
                          <span className="text-xs text-gray-500">Top picks: </span>
                          <span className="text-sm text-white">
                            {sector.topStocks.slice(0, 3).map(s => s.symbol).join(', ')}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 p-4 mt-8">
        <div className="max-w-7xl mx-auto text-center text-gray-400 text-sm">
          <p>Based on 2 years of historical data. Past performance does not guarantee future results.</p>
          <p className="mt-1">For educational and paper trading purposes only.</p>
        </div>
      </footer>
    </main>
  );
}
