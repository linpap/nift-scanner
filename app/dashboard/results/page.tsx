'use client';

import { useState, useEffect } from 'react';
import StockLink from '@/components/StockLink';

interface StockData {
  symbol: string;
  company: string;
  purpose: string;
  description: string;
  date: string;
  parsedDate: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  weekChange: number | null;
  weekChangePercent: number | null;
  marketCap: number | null;
  peRatio: number | null;
  eps: number | null;
  volume: number | null;
  avgVolume: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  isResultAnnounced: boolean;
  resultSentiment: 'good' | 'bad' | 'neutral' | null;
}

interface ResultsByDate {
  [date: string]: StockData[];
}

interface ApiResponse {
  success: boolean;
  timestamp: number;
  lastUpdated: string;
  resultsByDate: ResultsByDate;
  dates: string[];
  totalResults: number;
}

// Analysis Modal Component
function AnalysisModal({ stock, onClose }: { stock: StockData; onClose: () => void }) {
  const getAnalysis = () => {
    const insights: { label: string; value: string; sentiment: 'positive' | 'negative' | 'neutral' }[] = [];

    // Price momentum
    if (stock.changePercent !== null) {
      if (stock.changePercent > 2) {
        insights.push({ label: 'Day Momentum', value: `Strong bullish (+${stock.changePercent.toFixed(2)}%)`, sentiment: 'positive' });
      } else if (stock.changePercent > 0) {
        insights.push({ label: 'Day Momentum', value: `Mildly bullish (+${stock.changePercent.toFixed(2)}%)`, sentiment: 'positive' });
      } else if (stock.changePercent < -2) {
        insights.push({ label: 'Day Momentum', value: `Strong bearish (${stock.changePercent.toFixed(2)}%)`, sentiment: 'negative' });
      } else if (stock.changePercent < 0) {
        insights.push({ label: 'Day Momentum', value: `Mildly bearish (${stock.changePercent.toFixed(2)}%)`, sentiment: 'negative' });
      } else {
        insights.push({ label: 'Day Momentum', value: 'Flat', sentiment: 'neutral' });
      }
    }

    // Week momentum
    if (stock.weekChangePercent !== null) {
      if (stock.weekChangePercent > 5) {
        insights.push({ label: 'Week Trend', value: `Strong rally (+${stock.weekChangePercent.toFixed(2)}%)`, sentiment: 'positive' });
      } else if (stock.weekChangePercent > 0) {
        insights.push({ label: 'Week Trend', value: `Positive (+${stock.weekChangePercent.toFixed(2)}%)`, sentiment: 'positive' });
      } else if (stock.weekChangePercent < -5) {
        insights.push({ label: 'Week Trend', value: `Sharp decline (${stock.weekChangePercent.toFixed(2)}%)`, sentiment: 'negative' });
      } else if (stock.weekChangePercent < 0) {
        insights.push({ label: 'Week Trend', value: `Negative (${stock.weekChangePercent.toFixed(2)}%)`, sentiment: 'negative' });
      }
    }

    // P/E Analysis
    if (stock.peRatio !== null && stock.peRatio > 0) {
      if (stock.peRatio < 15) {
        insights.push({ label: 'Valuation (P/E)', value: `Undervalued (${stock.peRatio.toFixed(1)}x)`, sentiment: 'positive' });
      } else if (stock.peRatio < 25) {
        insights.push({ label: 'Valuation (P/E)', value: `Fair value (${stock.peRatio.toFixed(1)}x)`, sentiment: 'neutral' });
      } else if (stock.peRatio < 40) {
        insights.push({ label: 'Valuation (P/E)', value: `Premium (${stock.peRatio.toFixed(1)}x)`, sentiment: 'neutral' });
      } else {
        insights.push({ label: 'Valuation (P/E)', value: `Expensive (${stock.peRatio.toFixed(1)}x)`, sentiment: 'negative' });
      }
    }

    // 52-week position
    if (stock.price && stock.fiftyTwoWeekHigh && stock.fiftyTwoWeekLow) {
      const range = stock.fiftyTwoWeekHigh - stock.fiftyTwoWeekLow;
      const position = ((stock.price - stock.fiftyTwoWeekLow) / range) * 100;
      if (position > 90) {
        insights.push({ label: '52W Position', value: `Near 52W high (${position.toFixed(0)}%)`, sentiment: 'positive' });
      } else if (position > 70) {
        insights.push({ label: '52W Position', value: `Upper range (${position.toFixed(0)}%)`, sentiment: 'positive' });
      } else if (position < 20) {
        insights.push({ label: '52W Position', value: `Near 52W low (${position.toFixed(0)}%)`, sentiment: 'negative' });
      } else if (position < 40) {
        insights.push({ label: '52W Position', value: `Lower range (${position.toFixed(0)}%)`, sentiment: 'negative' });
      } else {
        insights.push({ label: '52W Position', value: `Mid range (${position.toFixed(0)}%)`, sentiment: 'neutral' });
      }
    }

    // Volume analysis
    if (stock.volume && stock.avgVolume && stock.avgVolume > 0) {
      const volumeRatio = stock.volume / stock.avgVolume;
      if (volumeRatio > 2) {
        insights.push({ label: 'Volume', value: `High interest (${volumeRatio.toFixed(1)}x avg)`, sentiment: 'positive' });
      } else if (volumeRatio > 1.2) {
        insights.push({ label: 'Volume', value: `Above average (${volumeRatio.toFixed(1)}x)`, sentiment: 'neutral' });
      } else if (volumeRatio < 0.5) {
        insights.push({ label: 'Volume', value: `Low interest (${volumeRatio.toFixed(1)}x avg)`, sentiment: 'negative' });
      }
    }

    return insights;
  };

  const insights = getAnalysis();

  // Overall sentiment
  const positiveCount = insights.filter(i => i.sentiment === 'positive').length;
  const negativeCount = insights.filter(i => i.sentiment === 'negative').length;
  let overallSentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (positiveCount > negativeCount + 1) overallSentiment = 'bullish';
  else if (negativeCount > positiveCount + 1) overallSentiment = 'bearish';

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold">{stock.symbol}</h2>
              <p className="text-gray-400 text-sm">{stock.company}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
          </div>
          <div className="mt-3 flex items-baseline gap-3">
            {stock.price && (
              <span className="text-2xl font-bold">
                ₹{stock.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
            )}
            {stock.changePercent !== null && (
              <span className={`text-lg ${stock.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
              </span>
            )}
          </div>
        </div>

        {/* Results Info */}
        <div className="p-4 bg-blue-900/30 border-b border-gray-700">
          <div className="text-sm text-blue-400 font-semibold">📅 Results Date: {stock.date}</div>
          <div className="text-sm text-gray-300 mt-1">{stock.description}</div>
        </div>

        {/* Overall Sentiment */}
        <div className="p-4 border-b border-gray-700">
          <div className="text-sm text-gray-400 mb-2">Pre-Results Analysis</div>
          <div className={`inline-block px-4 py-2 rounded-lg font-bold ${
            overallSentiment === 'bullish' ? 'bg-green-600 text-white' :
            overallSentiment === 'bearish' ? 'bg-red-600 text-white' :
            'bg-gray-600 text-white'
          }`}>
            {overallSentiment === 'bullish' ? '📈 BULLISH SETUP' :
             overallSentiment === 'bearish' ? '📉 BEARISH SETUP' :
             '➡️ NEUTRAL'}
          </div>
        </div>

        {/* Insights */}
        <div className="p-4">
          <div className="text-sm text-gray-400 mb-3">Key Indicators</div>
          <div className="space-y-3">
            {insights.map((insight, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <span className="text-gray-300">{insight.label}</span>
                <span className={`font-medium ${
                  insight.sentiment === 'positive' ? 'text-green-400' :
                  insight.sentiment === 'negative' ? 'text-red-400' :
                  'text-gray-300'
                }`}>
                  {insight.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Key Stats */}
        <div className="p-4 bg-gray-900 rounded-b-xl">
          <div className="text-sm text-gray-400 mb-3">Quick Stats</div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {stock.marketCap && (
              <div>
                <span className="text-gray-500">Market Cap</span>
                <div className="font-medium">₹{(stock.marketCap / 10000000).toFixed(0)} Cr</div>
              </div>
            )}
            {stock.eps && (
              <div>
                <span className="text-gray-500">EPS (TTM)</span>
                <div className="font-medium">₹{stock.eps.toFixed(2)}</div>
              </div>
            )}
            {stock.fiftyTwoWeekHigh && (
              <div>
                <span className="text-gray-500">52W High</span>
                <div className="font-medium">₹{stock.fiftyTwoWeekHigh.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
              </div>
            )}
            {stock.fiftyTwoWeekLow && (
              <div>
                <span className="text-gray-500">52W Low</span>
                <div className="font-medium">₹{stock.fiftyTwoWeekLow.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Format number with Indian notation
function formatMarketCap(value: number | null): string {
  if (!value) return '-';
  const crores = value / 10000000;
  if (crores >= 100000) return `${(crores / 100000).toFixed(2)}L Cr`;
  if (crores >= 1000) return `${(crores / 1000).toFixed(2)}K Cr`;
  return `${crores.toFixed(0)} Cr`;
}

function formatVolume(value: number | null): string {
  if (!value) return '-';
  if (value >= 10000000) return `${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `${(value / 100000).toFixed(2)} L`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)} K`;
  return value.toString();
}

export default function ResultsCalendarPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/results-calendar?t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('Failed to fetch');
      const result = await response.json();
      setData(result);
      // Select today or first available date
      if (result.dates?.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        const todayOrFirst = result.dates.includes(today) ? today : result.dates[0];
        setSelectedDate(todayOrFirst);
      }
      setError(null);
    } catch (err) {
      setError('Failed to fetch results calendar');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatDateTab = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    const isToday = dateOnly.getTime() === today.getTime();
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });

    return {
      isToday,
      label: isToday ? 'Today' : `${month} ${dayNum}`,
      subLabel: isToday ? `${month} ${dayNum}` : dayName,
    };
  };

  const currentResults = selectedDate && data?.resultsByDate?.[selectedDate] || [];

  return (
    <>
      {/* Page Header */}
      <div className="bg-gray-900 border-b border-gray-800 py-6">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Upcoming Results Calendar</h1>
              <p className="text-gray-400 text-sm">
                Q3 FY26 earnings announcements with pre-results analysis
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500">
                Total: {data?.totalResults || 0} results
              </div>
              <button
                onClick={fetchData}
                disabled={loading}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  loading ? 'bg-gray-700 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-900/30 border border-red-500 text-red-400 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Date Tabs */}
        {data?.dates && data.dates.length > 0 && (
          <div className="mb-6 overflow-x-auto">
            <div className="flex gap-2 pb-2">
              {data.dates.slice(0, 14).map((dateStr) => {
                const { isToday, label, subLabel } = formatDateTab(dateStr);
                const count = data.resultsByDate[dateStr]?.length || 0;
                const isSelected = selectedDate === dateStr;

                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`flex-shrink-0 px-4 py-3 rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : isToday
                        ? 'bg-blue-900/30 border-blue-500 text-blue-400 hover:bg-blue-900/50'
                        : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                    }`}
                  >
                    <div className="text-sm font-semibold">{label}</div>
                    <div className="text-xs opacity-70">{count} Results</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Results Table */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading results calendar...</p>
          </div>
        ) : currentResults.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-800 text-left">
                  <th className="border border-gray-700 px-4 py-3 text-sm font-semibold text-gray-300">Company</th>
                  <th className="border border-gray-700 px-4 py-3 text-sm font-semibold text-gray-300 text-center">Result</th>
                  <th className="border border-gray-700 px-4 py-3 text-sm font-semibold text-gray-300 text-right">Price (₹)</th>
                  <th className="border border-gray-700 px-4 py-3 text-sm font-semibold text-gray-300 text-right">1D Change</th>
                  <th className="border border-gray-700 px-4 py-3 text-sm font-semibold text-gray-300 text-right">1W Change</th>
                  <th className="border border-gray-700 px-4 py-3 text-sm font-semibold text-gray-300 text-right">Market Cap</th>
                  <th className="border border-gray-700 px-4 py-3 text-sm font-semibold text-gray-300 text-center">Analysis</th>
                </tr>
              </thead>
              <tbody>
                {currentResults.map((stock, idx) => (
                  <tr
                    key={stock.symbol}
                    className={`${idx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800/50'} hover:bg-gray-700/50 transition-colors`}
                  >
                    <td className="border border-gray-700 px-4 py-3">
                      <div className="font-semibold text-blue-400">
                        <StockLink symbol={stock.symbol} name={stock.company}>
                          {stock.symbol}
                        </StockLink>
                      </div>
                      <div className="text-xs text-gray-500 truncate max-w-[200px]">{stock.company}</div>
                    </td>
                    <td className="border border-gray-700 px-4 py-3 text-center">
                      {stock.isResultAnnounced ? (
                        <span className={`text-2xl ${
                          stock.resultSentiment === 'good' ? 'text-green-400' :
                          stock.resultSentiment === 'bad' ? 'text-red-400' :
                          'text-yellow-400'
                        }`} title={
                          stock.resultSentiment === 'good' ? 'Good Results - Stock up >2%' :
                          stock.resultSentiment === 'bad' ? 'Weak Results - Stock down >2%' :
                          'Mixed Results'
                        }>
                          {stock.resultSentiment === 'good' ? '👍' :
                           stock.resultSentiment === 'bad' ? '👎' : '➡️'}
                        </span>
                      ) : (
                        <span className="text-gray-500 text-xs">Pending</span>
                      )}
                    </td>
                    <td className="border border-gray-700 px-4 py-3 text-right font-medium">
                      {stock.price ? `₹${stock.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '-'}
                    </td>
                    <td className="border border-gray-700 px-4 py-3 text-right">
                      {stock.changePercent !== null ? (
                        <span className={stock.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                        </span>
                      ) : '-'}
                    </td>
                    <td className="border border-gray-700 px-4 py-3 text-right">
                      {stock.weekChangePercent !== null ? (
                        <span className={stock.weekChangePercent >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {stock.weekChangePercent >= 0 ? '+' : ''}{stock.weekChangePercent.toFixed(2)}%
                        </span>
                      ) : '-'}
                    </td>
                    <td className="border border-gray-700 px-4 py-3 text-right text-sm">
                      {formatMarketCap(stock.marketCap)}
                    </td>
                    <td className="border border-gray-700 px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedStock(stock)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-full transition-colors"
                      >
                        Analyze
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-20 bg-gray-800/50 rounded-lg">
            <span className="text-4xl mb-4 block">📅</span>
            <h3 className="text-xl font-semibold mb-2">No Results Scheduled</h3>
            <p className="text-gray-400">
              {selectedDate ? `No corporate results announced for this date.` : 'Select a date to view results.'}
            </p>
          </div>
        )}

        {/* Analysis Modal */}
        {selectedStock && (
          <AnalysisModal stock={selectedStock} onClose={() => setSelectedStock(null)} />
        )}

        {/* Legend */}
        <div className="mt-8 p-4 bg-gray-800 rounded-lg">
          <h3 className="font-semibold mb-3">How to Use This</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-300">
            <div>
              <span className="text-emerald-400 font-semibold">Pre-Results Rally:</span> Stocks up &gt;5% in the week before results often have high expectations priced in.
            </div>
            <div>
              <span className="text-red-400 font-semibold">Pre-Results Weakness:</span> Stocks down before results might rally on decent numbers (low expectations).
            </div>
            <div>
              <span className="text-blue-400 font-semibold">High P/E + Results:</span> Expensive stocks need to beat estimates to sustain valuations.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
