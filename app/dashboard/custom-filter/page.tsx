'use client';

import { useState } from 'react';

interface FilterCondition {
  id: string;
  indicator: string;
  operator: string;
  value: string;
  value2?: string; // For BETWEEN operator
}

interface ScanResult {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  rsi?: number;
  matchedConditions: string[];
}

const INDICATORS = [
  { id: 'rsi', name: 'RSI (14)', description: 'Relative Strength Index' },
  { id: 'price', name: 'Price', description: 'Current stock price' },
  { id: 'change_percent', name: 'Change %', description: 'Daily price change percentage' },
  { id: 'volume_ratio', name: 'Volume Ratio', description: 'Volume vs 20-day average' },
  { id: 'ema_9', name: 'EMA (9)', description: '9-period Exponential MA' },
  { id: 'ema_21', name: 'EMA (21)', description: '21-period Exponential MA' },
  { id: 'sma_50', name: 'SMA (50)', description: '50-period Simple MA' },
  { id: 'sma_200', name: 'SMA (200)', description: '200-period Simple MA' },
  { id: 'atr', name: 'ATR (14)', description: 'Average True Range' },
];

const OPERATORS = [
  { id: 'gt', name: '>', description: 'Greater than' },
  { id: 'gte', name: '>=', description: 'Greater than or equal' },
  { id: 'lt', name: '<', description: 'Less than' },
  { id: 'lte', name: '<=', description: 'Less than or equal' },
  { id: 'eq', name: '=', description: 'Equal to' },
  { id: 'between', name: 'BETWEEN', description: 'Between two values' },
  { id: 'crosses_above', name: 'Crosses Above', description: 'Indicator crosses above value' },
  { id: 'crosses_below', name: 'Crosses Below', description: 'Indicator crosses below value' },
];

const EXAMPLE_QUERIES = [
  'RSI below 30',
  'RSI between 30 and 70',
  'Price above 200 SMA',
  'Volume ratio greater than 2',
  'Change percent above 3%',
  'EMA 9 crosses above EMA 21',
  'RSI oversold with high volume',
];

// Simple NLP parser for natural language queries
function parseNaturalLanguage(query: string): FilterCondition[] {
  const conditions: FilterCondition[] = [];
  const lowerQuery = query.toLowerCase();

  // RSI patterns
  if (lowerQuery.includes('rsi')) {
    if (lowerQuery.includes('below') || lowerQuery.includes('under') || lowerQuery.includes('less than')) {
      const match = lowerQuery.match(/(\d+)/);
      if (match) {
        conditions.push({
          id: `rsi_${Date.now()}`,
          indicator: 'rsi',
          operator: 'lt',
          value: match[1],
        });
      }
    } else if (lowerQuery.includes('above') || lowerQuery.includes('over') || lowerQuery.includes('greater than')) {
      const match = lowerQuery.match(/(\d+)/);
      if (match) {
        conditions.push({
          id: `rsi_${Date.now()}`,
          indicator: 'rsi',
          operator: 'gt',
          value: match[1],
        });
      }
    } else if (lowerQuery.includes('between')) {
      const matches = lowerQuery.match(/(\d+)\s*(?:and|to|-)\s*(\d+)/);
      if (matches) {
        conditions.push({
          id: `rsi_${Date.now()}`,
          indicator: 'rsi',
          operator: 'between',
          value: matches[1],
          value2: matches[2],
        });
      }
    } else if (lowerQuery.includes('oversold')) {
      conditions.push({
        id: `rsi_${Date.now()}`,
        indicator: 'rsi',
        operator: 'lt',
        value: '30',
      });
    } else if (lowerQuery.includes('overbought')) {
      conditions.push({
        id: `rsi_${Date.now()}`,
        indicator: 'rsi',
        operator: 'gt',
        value: '70',
      });
    }
  }

  // Volume patterns
  if (lowerQuery.includes('volume') || lowerQuery.includes('vol')) {
    if (lowerQuery.includes('high') || lowerQuery.includes('spike')) {
      conditions.push({
        id: `vol_${Date.now()}`,
        indicator: 'volume_ratio',
        operator: 'gt',
        value: '1.5',
      });
    } else {
      const match = lowerQuery.match(/(\d+(?:\.\d+)?)/);
      if (match) {
        conditions.push({
          id: `vol_${Date.now()}`,
          indicator: 'volume_ratio',
          operator: 'gt',
          value: match[1],
        });
      }
    }
  }

  // Price patterns
  if (lowerQuery.includes('price')) {
    if (lowerQuery.includes('above') && lowerQuery.includes('200')) {
      conditions.push({
        id: `price_${Date.now()}`,
        indicator: 'price',
        operator: 'crosses_above',
        value: 'sma_200',
      });
    } else if (lowerQuery.includes('above') && lowerQuery.includes('50')) {
      conditions.push({
        id: `price_${Date.now()}`,
        indicator: 'price',
        operator: 'crosses_above',
        value: 'sma_50',
      });
    } else {
      const match = lowerQuery.match(/(\d+)/);
      if (match) {
        if (lowerQuery.includes('above') || lowerQuery.includes('greater')) {
          conditions.push({
            id: `price_${Date.now()}`,
            indicator: 'price',
            operator: 'gt',
            value: match[1],
          });
        } else if (lowerQuery.includes('below') || lowerQuery.includes('less')) {
          conditions.push({
            id: `price_${Date.now()}`,
            indicator: 'price',
            operator: 'lt',
            value: match[1],
          });
        }
      }
    }
  }

  // Change percent patterns
  if (lowerQuery.includes('change') || lowerQuery.includes('%') || lowerQuery.includes('percent')) {
    const match = lowerQuery.match(/(\d+(?:\.\d+)?)\s*%?/);
    if (match) {
      if (lowerQuery.includes('above') || lowerQuery.includes('greater') || lowerQuery.includes('up')) {
        conditions.push({
          id: `change_${Date.now()}`,
          indicator: 'change_percent',
          operator: 'gt',
          value: match[1],
        });
      } else if (lowerQuery.includes('below') || lowerQuery.includes('less') || lowerQuery.includes('down')) {
        conditions.push({
          id: `change_${Date.now()}`,
          indicator: 'change_percent',
          operator: 'lt',
          value: `-${match[1]}`,
        });
      }
    }
  }

  // EMA crossover patterns
  if (lowerQuery.includes('ema') && lowerQuery.includes('cross')) {
    if (lowerQuery.includes('9') && lowerQuery.includes('21')) {
      if (lowerQuery.includes('above')) {
        conditions.push({
          id: `ema_${Date.now()}`,
          indicator: 'ema_9',
          operator: 'crosses_above',
          value: 'ema_21',
        });
      } else if (lowerQuery.includes('below')) {
        conditions.push({
          id: `ema_${Date.now()}`,
          indicator: 'ema_9',
          operator: 'crosses_below',
          value: 'ema_21',
        });
      }
    }
  }

  return conditions;
}

export default function CustomFilterPage() {
  const [nlQuery, setNlQuery] = useState('');
  const [conditions, setConditions] = useState<FilterCondition[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleNlQuery = () => {
    const parsed = parseNaturalLanguage(nlQuery);
    if (parsed.length > 0) {
      setConditions(prev => [...prev, ...parsed]);
      setNlQuery('');
    }
  };

  const addCondition = () => {
    setConditions(prev => [
      ...prev,
      {
        id: `cond_${Date.now()}`,
        indicator: 'rsi',
        operator: 'lt',
        value: '',
      },
    ]);
  };

  const updateCondition = (id: string, field: string, value: string) => {
    setConditions(prev =>
      prev.map(c => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const removeCondition = (id: string) => {
    setConditions(prev => prev.filter(c => c.id !== id));
  };

  const runScan = async () => {
    if (conditions.length === 0) {
      setError('Add at least one filter condition');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build filter query
      const filterParams = conditions.map(c => {
        if (c.operator === 'between') {
          return `${c.indicator}:${c.operator}:${c.value}:${c.value2}`;
        }
        return `${c.indicator}:${c.operator}:${c.value}`;
      }).join(',');

      const response = await fetch(`/api/custom-scan?filters=${encodeURIComponent(filterParams)}`);
      const data = await response.json();

      if (data.success) {
        setResults(data.results || []);
      } else {
        setError(data.error || 'Scan failed');
      }
    } catch (err) {
      setError('Failed to run custom scan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Custom Filter Builder</h1>
        <p className="text-gray-400">
          Create custom stock filters using natural language or manual conditions
        </p>
      </div>

      {/* Natural Language Input */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span>🔮</span> Natural Language Filter
        </h3>
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={nlQuery}
            onChange={(e) => setNlQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNlQuery()}
            placeholder='Try: "RSI below 30" or "Volume ratio greater than 2"'
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
          />
          <button
            onClick={handleNlQuery}
            disabled={!nlQuery.trim()}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Parse
          </button>
        </div>

        {/* Example Queries */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-gray-500">Examples:</span>
          {EXAMPLE_QUERIES.map((ex, i) => (
            <button
              key={i}
              onClick={() => setNlQuery(ex)}
              className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white px-2 py-1 rounded transition"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Manual Conditions */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>⚙️</span> Filter Conditions
          </h3>
          <button
            onClick={addCondition}
            className="text-sm bg-gray-800 hover:bg-gray-700 text-emerald-400 px-3 py-1.5 rounded-lg transition"
          >
            + Add Condition
          </button>
        </div>

        {conditions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No conditions added yet.</p>
            <p className="text-sm mt-1">Use natural language above or click &quot;Add Condition&quot;</p>
          </div>
        ) : (
          <div className="space-y-3">
            {conditions.map((cond, idx) => (
              <div key={cond.id} className="flex items-center gap-3 bg-gray-800 rounded-lg p-3">
                <span className="text-gray-500 text-sm w-6">{idx + 1}.</span>

                {/* Indicator */}
                <select
                  value={cond.indicator}
                  onChange={(e) => updateCondition(cond.id, 'indicator', e.target.value)}
                  className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-emerald-500 focus:outline-none"
                >
                  {INDICATORS.map((ind) => (
                    <option key={ind.id} value={ind.id}>{ind.name}</option>
                  ))}
                </select>

                {/* Operator */}
                <select
                  value={cond.operator}
                  onChange={(e) => updateCondition(cond.id, 'operator', e.target.value)}
                  className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-emerald-500 focus:outline-none"
                >
                  {OPERATORS.map((op) => (
                    <option key={op.id} value={op.id}>{op.name}</option>
                  ))}
                </select>

                {/* Value */}
                <input
                  type="text"
                  value={cond.value}
                  onChange={(e) => updateCondition(cond.id, 'value', e.target.value)}
                  placeholder="Value"
                  className="w-24 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-emerald-500 focus:outline-none"
                />

                {/* Value 2 for BETWEEN */}
                {cond.operator === 'between' && (
                  <>
                    <span className="text-gray-500">and</span>
                    <input
                      type="text"
                      value={cond.value2 || ''}
                      onChange={(e) => updateCondition(cond.id, 'value2', e.target.value)}
                      placeholder="Value 2"
                      className="w-24 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </>
                )}

                {/* Remove */}
                <button
                  onClick={() => removeCondition(cond.id)}
                  className="text-red-400 hover:text-red-300 p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Run Scan Button */}
        <div className="mt-6">
          <button
            onClick={runScan}
            disabled={loading || conditions.length === 0}
            className={`w-full px-4 py-3 rounded-lg font-semibold transition ${
              loading || conditions.length === 0
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                Scanning...
              </span>
            ) : (
              `Run Scan (${conditions.length} condition${conditions.length !== 1 ? 's' : ''})`
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 mb-6 text-red-400">
          {error}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Scan Results ({results.length} matches)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-800">
                  <th className="text-left py-2 px-2">#</th>
                  <th className="text-left py-2 px-2">Symbol</th>
                  <th className="text-right py-2 px-2">Price</th>
                  <th className="text-right py-2 px-2">Change %</th>
                  <th className="text-right py-2 px-2">RSI</th>
                  <th className="text-left py-2 px-2">Matched</th>
                </tr>
              </thead>
              <tbody>
                {results.map((stock, idx) => (
                  <tr key={stock.symbol} className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="py-2 px-2 text-gray-500">{idx + 1}</td>
                    <td className="py-2 px-2">
                      <span className="font-semibold text-emerald-400">{stock.symbol}</span>
                    </td>
                    <td className="py-2 px-2 text-right text-white">₹{stock.price.toFixed(2)}</td>
                    <td className={`py-2 px-2 text-right ${stock.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                    </td>
                    <td className="py-2 px-2 text-right text-white">{stock.rsi?.toFixed(1) || '-'}</td>
                    <td className="py-2 px-2">
                      <div className="flex gap-1 flex-wrap">
                        {stock.matchedConditions.map((c, i) => (
                          <span key={i} className="text-xs bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded">
                            {c}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {results.length === 0 && !loading && conditions.length > 0 && (
        <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-8 text-center">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-white mb-2">No Results</h3>
          <p className="text-gray-400">
            No stocks matched your filter criteria. Try adjusting the conditions.
          </p>
        </div>
      )}
    </div>
  );
}
