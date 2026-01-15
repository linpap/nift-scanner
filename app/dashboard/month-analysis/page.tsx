'use client';

import { useState, useEffect } from 'react';

interface StockRecommendation {
  symbol: string;
  sector: string;
  sectorName: string;
  currentPrice: number;
  confidence: number;
  expectedReturn: number;
  winRate: number;
  dataPoints: number;
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
  };
  avgReturn: number;
  winRate: number;
  stocksAnalyzed: number;
  topStocks: StockRecommendation[];
  insight: string;
}

interface MonthAnalysisResponse {
  month: number;
  monthName: string;
  year: number;
  marketEvents: string[];
  sectors: SectorAnalysis[];
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
    if (value >= 70) return 'bg-green-500';
    if (value >= 50) return 'bg-yellow-500';
    if (value >= 30) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getLabel = () => {
    if (value >= 70) return 'High';
    if (value >= 50) return 'Moderate';
    if (value >= 30) return 'Low';
    return 'Very Low';
  };

  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor()} transition-all duration-300`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className={`text-xs font-medium ${
        value >= 70 ? 'text-green-400' : value >= 50 ? 'text-yellow-400' : 'text-red-400'
      }`}>
        {value}%
      </span>
    </div>
  );
}

function SectorCard({ sector, expanded, onToggle }: {
  sector: SectorAnalysis;
  expanded: boolean;
  onToggle: () => void;
}) {
  const getReturnColor = (val: number) => {
    if (val > 2) return 'text-green-400';
    if (val > 0) return 'text-green-300';
    if (val > -2) return 'text-yellow-400';
    return 'text-red-400';
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
          <div className="text-right">
            <div className={`text-lg font-bold ${getReturnColor(sector.avgReturn)}`}>
              {sector.avgReturn >= 0 ? '+' : ''}{sector.avgReturn.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-400">avg return</div>
          </div>
        </div>

        <p className="text-sm text-gray-300 mb-2">{sector.insight}</p>

        <div className="flex gap-4 text-xs text-gray-400">
          <span>Win Rate: <span className={sector.winRate >= 50 ? 'text-green-400' : 'text-red-400'}>
            {sector.winRate.toFixed(0)}%
          </span></span>
          <span>Stocks Analyzed: {sector.stocksAnalyzed}</span>
        </div>

        <div className="mt-2 text-xs text-gray-500">
          {expanded ? '▼ Click to collapse' : '▶ Click to see top stocks'}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-700 p-4 bg-gray-850">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Top Stocks (by confidence):</h4>
          <div className="space-y-3">
            {sector.topStocks.map((stock) => (
              <div key={stock.symbol} className="bg-gray-900 rounded p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-mono font-bold text-emerald-400">{stock.symbol}</span>
                  <ConfidenceMeter value={stock.confidence} />
                </div>
                <div className="flex gap-4 text-xs text-gray-400 mb-2">
                  <span>Avg Return: <span className={stock.expectedReturn >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {stock.expectedReturn >= 0 ? '+' : ''}{stock.expectedReturn.toFixed(1)}%
                  </span></span>
                  <span>Win Rate: {stock.winRate.toFixed(0)}%</span>
                  <span>Data: {stock.dataPoints} yr{stock.dataPoints > 1 ? 's' : ''}</span>
                  {stock.currentPrice > 0 && (
                    <span>Price: ₹{stock.currentPrice.toFixed(0)}</span>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {stock.rationale.slice(0, 2).map((r, i) => (
                    <div key={i} className="flex items-start gap-1 mt-1">
                      <span className="text-gray-400">•</span>
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
                {/* Historical returns */}
                {stock.historicalData.length > 0 && (
                  <div className="mt-2 flex gap-1 flex-wrap">
                    {stock.historicalData.map((h, i) => (
                      <span
                        key={i}
                        className={`px-1.5 py-0.5 rounded text-xs ${
                          h.return >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {h.year}: {h.return >= 0 ? '+' : ''}{h.return.toFixed(1)}%
                      </span>
                    ))}
                  </div>
                )}
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
          <span className={stock.winRate >= 50 ? 'text-green-400' : 'text-red-400'}>
            {stock.winRate.toFixed(0)}%
          </span>
        </td>
        <td className="py-3 px-4 text-gray-400 text-sm">
          {stock.dataPoints}yr
        </td>
        <td className="py-3 px-4 text-gray-400">
          {expanded ? '▼' : '▶'}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-gray-850">
          <td colSpan={8} className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Analysis:</h4>
                <ul className="text-xs text-gray-400 space-y-1">
                  {stock.rationale.map((r, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-gray-500">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Historical Returns:</h4>
                <div className="flex flex-wrap gap-2">
                  {stock.historicalData.length > 0 ? (
                    stock.historicalData.map((h, i) => (
                      <span
                        key={i}
                        className={`px-2 py-1 rounded text-xs ${
                          h.return >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {h.year}: {h.return >= 0 ? '+' : ''}{h.return.toFixed(1)}%
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500 text-xs">No data for this month</span>
                  )}
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

  // Get high confidence stocks
  const highConfidenceStocks = data?.allRecommendations.filter(s => s.confidence >= 70) || [];
  const positiveReturnStocks = data?.allRecommendations.filter(s => s.expectedReturn > 0 && s.winRate >= 50) || [];

  return (
    <>
      {/* Page Header */}
        <div className="bg-gray-900 border-b border-gray-800 py-6">
          <div className="max-w-[1400px] mx-auto px-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white">Seasonal Analysis</h1>
                <p className="text-gray-400 text-sm">
                  100% data-driven • 2-year historical patterns • No assumptions
                </p>
              </div>
              <div className="flex items-center gap-4">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <button
                  onClick={() => fetchAnalysis(true)}
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  {loading ? 'Analyzing...' : 'Refresh'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1400px] mx-auto p-4">
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
              <h2 className="text-xl font-bold mb-3">
                Analysis for {data.monthName} {data.year}
              </h2>
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <ul className="space-y-2">
                  {data.keyObservations.map((obs, i) => (
                    <li key={i} className="text-gray-300 flex items-start gap-2">
                      <span className="text-gray-500 mt-0.5">→</span>
                      <span>{obs}</span>
                    </li>
                  ))}
                </ul>
                {data.marketEvents.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Calendar Events:</h4>
                    <div className="flex flex-wrap gap-2">
                      {data.marketEvents.map((event, i) => (
                        <span key={i} className="bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-sm">
                          {event}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Top 5 Picks for the Month */}
            <section className="mb-6">
              <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
                <span className="text-yellow-400">★</span>
                Top 5 Picks for {data.monthName}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {data.allRecommendations.slice(0, 5).map((stock, index) => (
                  <div
                    key={stock.symbol}
                    className={`bg-gradient-to-br ${
                      index === 0 ? 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/50' :
                      index === 1 ? 'from-gray-400/20 to-gray-500/10 border-gray-400/50' :
                      index === 2 ? 'from-orange-500/20 to-orange-600/10 border-orange-500/50' :
                      'from-gray-700/50 to-gray-800/50 border-gray-600/50'
                    } rounded-lg p-4 border`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-lg font-bold ${
                        index === 0 ? 'text-yellow-400' :
                        index === 1 ? 'text-gray-300' :
                        index === 2 ? 'text-orange-400' :
                        'text-white'
                      }`}>
                        #{index + 1}
                      </span>
                      <span className="font-mono font-bold text-emerald-400 text-lg">
                        {stock.symbol}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mb-2">{stock.sectorName}</div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Confidence:</span>
                        <span className={`font-medium ${
                          stock.confidence >= 70 ? 'text-green-400' :
                          stock.confidence >= 50 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {stock.confidence}%
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Avg Return:</span>
                        <span className={stock.expectedReturn >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {stock.expectedReturn >= 0 ? '+' : ''}{stock.expectedReturn.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Win Rate:</span>
                        <span className={stock.winRate >= 50 ? 'text-green-400' : 'text-red-400'}>
                          {stock.winRate.toFixed(0)}%
                        </span>
                      </div>
                      {stock.currentPrice > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Price:</span>
                          <span className="text-white">₹{stock.currentPrice.toFixed(0)}</span>
                        </div>
                      )}
                    </div>
                    {/* Historical mini-chart */}
                    <div className="mt-3 pt-2 border-t border-gray-700">
                      <div className="text-xs text-gray-500 mb-1">Historical:</div>
                      <div className="flex gap-1">
                        {stock.historicalData.slice(-3).map((h, i) => (
                          <span
                            key={i}
                            className={`px-1.5 py-0.5 rounded text-xs flex-1 text-center ${
                              h.return >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {h.return >= 0 ? '+' : ''}{h.return.toFixed(0)}%
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="text-2xl font-bold text-emerald-400">{data.sectors.length}</div>
                <div className="text-gray-400 text-sm">Sectors Analyzed</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="text-2xl font-bold text-blue-400">{data.totalStocksAnalyzed}</div>
                <div className="text-gray-400 text-sm">Stocks Analyzed</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="text-2xl font-bold text-green-400">
                  {highConfidenceStocks.length}
                </div>
                <div className="text-gray-400 text-sm">High Confidence (70%+)</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="text-2xl font-bold text-yellow-400">
                  {positiveReturnStocks.length}
                </div>
                <div className="text-gray-400 text-sm">Positive Historical</div>
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
                By Sector ({data.sectors.length})
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
                  Sectors Ranked by Historical Average Return
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.sectors.map((sector) => (
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
                    All Stocks Ranked by Confidence
                  </h2>
                  <select
                    value={sectorFilter}
                    onChange={(e) => setSectorFilter(e.target.value)}
                    className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm"
                  >
                    <option value="all">All Sectors</option>
                    {data.sectors.map((s) => (
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
                          <th className="text-left py-3 px-4">Avg Return</th>
                          <th className="text-left py-3 px-4">Win Rate</th>
                          <th className="text-left py-3 px-4">Data</th>
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
          </>
        )}
      </div>
    </>
  );
}
