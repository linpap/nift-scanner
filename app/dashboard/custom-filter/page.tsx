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
  'RSI below 30 and volume above 1.5',
  'RSI between 30 and 70',
  'Price above 200 SMA and change above 2%',
  'Volume ratio greater than 2',
  'RSI oversold with high volume',
  'EMA 9 crosses above EMA 21',
  'Change percent above 3% and RSI below 70',
];

// Enhanced NLP parser for natural language queries - handles compound queries with AND
function parseNaturalLanguage(query: string): FilterCondition[] {
  const conditions: FilterCondition[] = [];
  const lowerQuery = query.toLowerCase();

  // Split by "and", "with", "&", "," to handle multiple conditions
  const parts = lowerQuery.split(/\s+(?:and|with|&)\s+|,\s*/);

  for (const part of parts) {
    const trimmedPart = part.trim();
    if (!trimmedPart) continue;

    // Generate unique ID for each condition
    const uniqueId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // RSI patterns
    if (trimmedPart.includes('rsi')) {
      if (trimmedPart.includes('below') || trimmedPart.includes('under') || trimmedPart.includes('less than') || trimmedPart.includes('<')) {
        const match = trimmedPart.match(/(\d+)/);
        if (match) {
          conditions.push({
            id: `rsi_${uniqueId}`,
            indicator: 'rsi',
            operator: 'lt',
            value: match[1],
          });
        }
      } else if (trimmedPart.includes('above') || trimmedPart.includes('over') || trimmedPart.includes('greater than') || trimmedPart.includes('>')) {
        const match = trimmedPart.match(/(\d+)/);
        if (match) {
          conditions.push({
            id: `rsi_${uniqueId}`,
            indicator: 'rsi',
            operator: 'gt',
            value: match[1],
          });
        }
      } else if (trimmedPart.includes('between')) {
        const matches = trimmedPart.match(/(\d+)\s*(?:and|to|-)\s*(\d+)/);
        if (matches) {
          conditions.push({
            id: `rsi_${uniqueId}`,
            indicator: 'rsi',
            operator: 'between',
            value: matches[1],
            value2: matches[2],
          });
        }
      } else if (trimmedPart.includes('oversold')) {
        conditions.push({
          id: `rsi_${uniqueId}`,
          indicator: 'rsi',
          operator: 'lt',
          value: '30',
        });
      } else if (trimmedPart.includes('overbought')) {
        conditions.push({
          id: `rsi_${uniqueId}`,
          indicator: 'rsi',
          operator: 'gt',
          value: '70',
        });
      }
      continue;
    }

    // Volume patterns
    if (trimmedPart.includes('volume') || trimmedPart.includes('vol')) {
      if (trimmedPart.includes('high') || trimmedPart.includes('spike')) {
        conditions.push({
          id: `vol_${uniqueId}`,
          indicator: 'volume_ratio',
          operator: 'gt',
          value: '1.5',
        });
      } else {
        const match = trimmedPart.match(/(\d+(?:\.\d+)?)/);
        if (match) {
          const op = (trimmedPart.includes('below') || trimmedPart.includes('less') || trimmedPart.includes('<')) ? 'lt' : 'gt';
          conditions.push({
            id: `vol_${uniqueId}`,
            indicator: 'volume_ratio',
            operator: op,
            value: match[1],
          });
        }
      }
      continue;
    }

    // Price patterns
    if (trimmedPart.includes('price')) {
      if (trimmedPart.includes('above') && trimmedPart.includes('200')) {
        conditions.push({
          id: `price_${uniqueId}`,
          indicator: 'price',
          operator: 'crosses_above',
          value: 'sma_200',
        });
      } else if (trimmedPart.includes('above') && trimmedPart.includes('50')) {
        conditions.push({
          id: `price_${uniqueId}`,
          indicator: 'price',
          operator: 'crosses_above',
          value: 'sma_50',
        });
      } else {
        const match = trimmedPart.match(/(\d+)/);
        if (match) {
          const op = (trimmedPart.includes('above') || trimmedPart.includes('greater') || trimmedPart.includes('>')) ? 'gt' : 'lt';
          conditions.push({
            id: `price_${uniqueId}`,
            indicator: 'price',
            operator: op,
            value: match[1],
          });
        }
      }
      continue;
    }

    // Change percent patterns
    if (trimmedPart.includes('change') || trimmedPart.includes('percent') || (trimmedPart.includes('%') && trimmedPart.match(/\d/))) {
      const match = trimmedPart.match(/(\d+(?:\.\d+)?)\s*%?/);
      if (match) {
        let op = 'gt';
        let value = match[1];
        if (trimmedPart.includes('below') || trimmedPart.includes('less') || trimmedPart.includes('down') || trimmedPart.includes('<') || trimmedPart.includes('negative')) {
          op = 'lt';
          if (!trimmedPart.includes('-')) {
            value = `-${value}`;
          }
        }
        conditions.push({
          id: `change_${uniqueId}`,
          indicator: 'change_percent',
          operator: op,
          value: value,
        });
      }
      continue;
    }

    // EMA crossover patterns
    if (trimmedPart.includes('ema') && trimmedPart.includes('cross')) {
      if (trimmedPart.includes('9') && trimmedPart.includes('21')) {
        const op = trimmedPart.includes('below') ? 'crosses_below' : 'crosses_above';
        conditions.push({
          id: `ema_${uniqueId}`,
          indicator: 'ema_9',
          operator: op,
          value: 'ema_21',
        });
      }
      continue;
    }

    // SMA patterns
    if (trimmedPart.includes('sma') || trimmedPart.includes('moving average')) {
      if (trimmedPart.includes('50') && trimmedPart.includes('200')) {
        const op = trimmedPart.includes('below') ? 'crosses_below' : 'crosses_above';
        conditions.push({
          id: `sma_${uniqueId}`,
          indicator: 'sma_50',
          operator: op,
          value: 'sma_200',
        });
      }
      continue;
    }
  }

  return conditions;
}

// Get human-readable description of a condition
function getConditionDescription(cond: FilterCondition): string {
  const indicator = INDICATORS.find(i => i.id === cond.indicator)?.name || cond.indicator.toUpperCase();
  const operator = OPERATORS.find(o => o.id === cond.operator)?.name || cond.operator;

  if (cond.operator === 'between') {
    return `${indicator} ${operator} ${cond.value} and ${cond.value2}`;
  }

  // Handle indicator vs indicator comparisons
  if (cond.value.includes('_')) {
    const valueIndicator = INDICATORS.find(i => i.id === cond.value)?.name || cond.value.toUpperCase();
    return `${indicator} ${operator} ${valueIndicator}`;
  }

  return `${indicator} ${operator} ${cond.value}`;
}

export default function CustomFilterPage() {
  const [nlQuery, setNlQuery] = useState('');
  const [conditions, setConditions] = useState<FilterCondition[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [parseMessage, setParseMessage] = useState<string | null>(null);

  const handleNlQuery = () => {
    if (!nlQuery.trim()) return;

    const parsed = parseNaturalLanguage(nlQuery);
    if (parsed.length > 0) {
      setConditions(prev => [...prev, ...parsed]);
      setParseMessage(`Added ${parsed.length} condition${parsed.length > 1 ? 's' : ''}`);
      setNlQuery('');
      setTimeout(() => setParseMessage(null), 2000);
    } else {
      setParseMessage('Could not parse query. Try examples below or add manually.');
      setTimeout(() => setParseMessage(null), 3000);
    }
  };

  const addCondition = () => {
    setConditions(prev => [
      ...prev,
      {
        id: `cond_${Date.now()}`,
        indicator: 'rsi',
        operator: 'lt',
        value: '30',
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

  const clearAllConditions = () => {
    setConditions([]);
    setResults([]);
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
        if (data.results?.length === 0) {
          setError(`No stocks matched all ${conditions.length} conditions. Try relaxing some filters.`);
        }
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
          Create custom stock filters using natural language or manual conditions. All conditions use AND logic.
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
            placeholder='Try: "RSI below 30 and volume above 1.5" or "Change above 2% and RSI below 70"'
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
          />
          <button
            onClick={handleNlQuery}
            disabled={!nlQuery.trim()}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Add
          </button>
        </div>

        {/* Parse Message */}
        {parseMessage && (
          <div className={`text-sm mb-3 ${parseMessage.includes('Added') ? 'text-emerald-400' : 'text-yellow-400'}`}>
            {parseMessage}
          </div>
        )}

        {/* Example Queries */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-gray-500">Examples:</span>
          {EXAMPLE_QUERIES.map((ex, i) => (
            <button
              key={i}
              onClick={() => {
                setNlQuery(ex);
              }}
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
            {conditions.length > 0 && (
              <span className="text-sm font-normal text-gray-400">
                ({conditions.length} condition{conditions.length !== 1 ? 's' : ''} - ALL must match)
              </span>
            )}
          </h3>
          <div className="flex gap-2">
            {conditions.length > 0 && (
              <button
                onClick={clearAllConditions}
                className="text-sm bg-red-900/30 hover:bg-red-900/50 text-red-400 px-3 py-1.5 rounded-lg transition"
              >
                Clear All
              </button>
            )}
            <button
              onClick={addCondition}
              className="text-sm bg-gray-800 hover:bg-gray-700 text-emerald-400 px-3 py-1.5 rounded-lg transition"
            >
              + Add Condition
            </button>
          </div>
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

                {/* Condition Description */}
                <span className="flex-1 text-xs text-gray-500 truncate">
                  {getConditionDescription(cond)}
                </span>

                {/* Remove */}
                <button
                  onClick={() => removeCondition(cond.id)}
                  className="text-red-400 hover:text-red-300 p-1"
                  title="Remove condition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}

            {/* AND indicator between conditions */}
            {conditions.length > 1 && (
              <div className="text-center text-xs text-gray-500 py-1">
                ↑ All conditions above must match (AND logic) ↑
              </div>
            )}
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
                Scanning F&O stocks...
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
            Scan Results ({results.length} stocks match all {conditions.length} conditions)
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
                  <th className="text-left py-2 px-2">Matched Filters</th>
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
                          <span key={i} className="text-xs bg-emerald-900/30 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30">
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
      {results.length === 0 && !loading && conditions.length === 0 && (
        <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-8 text-center">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-white mb-2">Build Your Custom Filter</h3>
          <p className="text-gray-400 max-w-md mx-auto mb-4">
            Add multiple conditions to find stocks that match ALL your criteria.
            Use natural language or the manual builder.
          </p>
          <div className="text-xs text-gray-500 space-y-1">
            <p>• Type &quot;RSI below 30 and volume above 2&quot; to add two conditions at once</p>
            <p>• All conditions use AND logic - stocks must match every filter</p>
            <p>• Scans 50 F&O stocks from NSE</p>
          </div>
        </div>
      )}
    </div>
  );
}
