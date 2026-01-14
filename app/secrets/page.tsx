'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface MarketData {
  vix?: number;
  vixChange?: number;
  giftNifty?: number;
  giftNiftyChange?: number;
  dowChange?: number;
  nasdaqChange?: number;
}

// Secret patterns data
const SECRETS = {
  momentum: {
    title: '🚀 Momentum Continuation Secret',
    description: 'Winners keep winning for 6-12 months',
    patterns: [
      { rule: 'Stocks up more than 20% in 3 months', action: 'Continue to outperform for next 6-12 months', confidence: 75, source: 'Academic research on Indian markets' },
      { rule: 'Weekly momentum winners', action: 'Generate significant positive returns in following weeks', confidence: 70, source: 'SSRN Weekly Momentum Study' },
      { rule: '52-week high breakout', action: '65% probability of continuing higher for 1-3 months', confidence: 65, source: 'Technical analysis studies' },
    ],
  },
  sectorRotation: {
    title: '🔄 Sector Rotation Secret',
    description: 'When cyclicals rally, defensives suffer',
    patterns: [
      { rule: 'Metals rally strongly (+10%+)', action: 'IT & FMCG typically underperform', confidence: 80, source: 'Smallcase sector rotation study' },
      { rule: 'PSU Banks rally', action: 'Private banks may lag short-term', confidence: 65, source: 'Market observations 2024-25' },
      { rule: 'Real Estate + Metals up', action: "Pharma & Healthcare defensive, don't chase", confidence: 70, source: 'Sector rotation patterns' },
      { rule: 'Risk-on sentiment (cyclicals up)', action: 'Reduce FMCG, Media exposure', confidence: 75, source: 'FY25 market data' },
    ],
  },
  vixSecret: {
    title: '😱 VIX Fear Gauge Secret',
    description: 'Inverse correlation is asymmetric',
    patterns: [
      { rule: 'VIX spikes above 20', action: 'Market correction likely, shift to large-caps', confidence: 80, source: 'Motilal Oswal VIX study' },
      { rule: 'Nifty falls 5%+', action: 'VIX shoots up ~9.3% on average', confidence: 85, source: 'Historical data analysis' },
      { rule: 'Nifty rises 5%+', action: 'VIX drops only ~1.5% (asymmetric!)', confidence: 80, source: 'VIX behavior study' },
      { rule: 'VIX hits extreme (above 50)', action: 'Best time to buy - market rebounds 50-80% in 12 months', confidence: 90, source: '2008 & 2020 crash data' },
      { rule: 'VIX mean reverts', action: 'Extreme VIX levels (high/low) don\'t persist long', confidence: 85, source: 'Statistical analysis' },
    ],
  },
  calendarEffects: {
    title: '📅 Calendar Anomalies Secret',
    description: 'Day of week matters in India',
    patterns: [
      { rule: 'Monday trading', action: 'Shows POSITIVE returns in India (unlike US)', confidence: 65, source: 'Academic research on NSE/BSE' },
      { rule: 'Tuesday trading', action: 'Often shows NEGATIVE returns', confidence: 60, source: 'GARCH model studies' },
      { rule: 'Friday positions', action: 'Historically higher returns than other days', confidence: 60, source: 'Global market studies' },
      { rule: 'Last week of month', action: 'FII window dressing can boost large-caps', confidence: 55, source: 'Institutional behavior patterns' },
    ],
  },
  globalCorrelation: {
    title: '🌍 Global Correlation Secret',
    description: 'US sneeze, India catches cold',
    patterns: [
      { rule: 'Dow Jones closes -2%+', action: 'Nifty likely opens gap-down (0.54 correlation)', confidence: 75, source: 'Winvesta correlation study' },
      { rule: 'NASDAQ tech sell-off', action: 'Indian IT stocks (TCS, Infy) likely to fall', confidence: 80, source: 'Sector correlation analysis' },
      { rule: 'GIFT Nifty up pre-market', action: 'NSE Nifty likely gap-up open', confidence: 85, source: 'Pre-market indicator reliability' },
      { rule: '3-year correlation', action: '0.64 correlation between Dow & Sensex', confidence: 70, source: 'Recent 3-year data' },
    ],
  },
  heavyweightEffect: {
    title: '🐘 Heavyweight Stock Secret',
    description: 'Big stocks move the index',
    patterns: [
      { rule: 'Reliance falls 3%+', action: 'Nifty likely to fall (highest weightage ~10%)', confidence: 85, source: 'Index composition analysis' },
      { rule: 'HDFC Bank + ICICI Bank both down', action: 'Bank Nifty falls hard (60% combined weight)', confidence: 90, source: 'Bank Nifty composition' },
      { rule: 'Top 5 Nifty stocks rally', action: 'Index can rally even if breadth is weak', confidence: 75, source: 'Market structure observation' },
      { rule: 'TCS + Infosys diverge from Nifty', action: 'IT sector rotation signal', confidence: 70, source: 'Sector analysis' },
    ],
  },
  bankNiftySecret: {
    title: '🏦 Bank Nifty / Nifty Ratio Secret',
    description: '0.88 correlation but Bank Nifty leads volatility',
    patterns: [
      { rule: 'Bank Nifty outperforms Nifty', action: 'Risk-on sentiment, expect broad rally', confidence: 70, source: 'Ratio chart analysis' },
      { rule: 'Bank Nifty underperforms Nifty', action: 'Defensive rotation, expect choppiness', confidence: 70, source: 'Market breadth studies' },
      { rule: 'Bank Nifty breaks key level first', action: 'Nifty follows 60-70% of time', confidence: 65, source: 'Technical correlation' },
      { rule: 'Bank Nifty higher beta', action: 'Moves faster in both directions than Nifty', confidence: 90, source: 'Statistical volatility analysis' },
    ],
  },
  expirySecret: {
    title: '⏰ F&O Expiry Day Secret',
    description: 'Expiry creates predictable volatility',
    patterns: [
      { rule: 'Weekly expiry day (now Monday)', action: 'Expect higher intraday volatility', confidence: 80, source: 'F&O market structure' },
      { rule: 'Monthly expiry (last Tuesday)', action: 'Maximum gamma, wild swings near strike prices', confidence: 85, source: 'Options mechanics' },
      { rule: 'Day before expiry', action: 'Option sellers defend strikes aggressively', confidence: 75, source: 'Market maker behavior' },
      { rule: 'Expiry morning vs afternoon', action: 'Morning volatile, afternoon tends to stabilize', confidence: 65, source: 'Intraday patterns' },
    ],
  },
  gapFillSecret: {
    title: '📊 Gap Fill Secret',
    description: '90% of common gaps fill within days',
    patterns: [
      { rule: 'Small gap (0.5-1%) down', action: '78% fill at least half the gap same day', confidence: 78, source: 'Gap analysis studies' },
      { rule: 'Low volume gap', action: '85% fill within 2 days', confidence: 85, source: 'Volume-gap correlation' },
      { rule: 'High volume gap', action: 'Only 45% fill in 5+ days (breakaway gap)', confidence: 60, source: 'Breakaway gap theory' },
      { rule: 'Gap + volume spike', action: 'Likely continuation, don\'t fade it', confidence: 70, source: 'Technical analysis' },
    ],
  },
  fiiDiiSecret: {
    title: '💰 FII/DII Flow Secret',
    description: 'Institutional money moves markets',
    patterns: [
      { rule: 'FII selling >₹5000 Cr in a week', action: 'Market likely under pressure, wait for DII absorption', confidence: 70, source: 'Historical flow analysis' },
      { rule: 'DII buying > FII selling', action: 'Market finds support, selloff limited', confidence: 75, source: 'Flow divergence studies' },
      { rule: 'Both FII + DII selling', action: 'Rare but dangerous, reduce exposure', confidence: 85, source: 'Market crash precursors' },
      { rule: 'FII buying after prolonged selling', action: 'Potential trend reversal signal', confidence: 70, source: 'Flow reversal patterns' },
    ],
  },
  pvtBankSecret: {
    title: '🏛️ HDFC vs ICICI Divergence Secret',
    description: 'When one leads, the other catches up',
    patterns: [
      { rule: 'ICICI outperforms HDFC for 3+ months', action: 'HDFC may catch up (mean reversion)', confidence: 65, source: 'Private bank pair analysis' },
      { rule: 'HDFC merger news/updates', action: 'Short-term volatility, funding cost concerns', confidence: 70, source: 'Recent merger dynamics' },
      { rule: 'ICICI digital/efficiency gains', action: 'Tends to outperform in growth phases', confidence: 65, source: 'Q4 FY25 analysis' },
      { rule: 'Both private banks lag PSU banks', action: 'Sector rotation away from quality to value', confidence: 70, source: 'FY25 sector rotation' },
    ],
  },
};

// Confidence meter component
function ConfidenceBar({ confidence }: { confidence: number }) {
  const getColor = () => {
    if (confidence >= 80) return 'bg-green-500';
    if (confidence >= 65) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor()} transition-all`}
          style={{ width: `${confidence}%` }}
        />
      </div>
      <span className="text-xs text-gray-400">{confidence}%</span>
    </div>
  );
}

export default function SecretsPage() {
  const [marketData, setMarketData] = useState<MarketData>({});
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>('momentum');

  useEffect(() => {
    // Fetch VIX and other indicators
    const fetchMarketData = async () => {
      try {
        // Fetch India VIX
        const vixResponse = await fetch(
          'https://query1.finance.yahoo.com/v8/finance/chart/%5EINDIAVIX?interval=1d&range=2d',
          { headers: { 'User-Agent': 'Mozilla/5.0' } }
        );
        const vixData = await vixResponse.json();
        const vixResult = vixData.chart?.result?.[0];
        if (vixResult) {
          const vixPrice = vixResult.meta?.regularMarketPrice || 0;
          const vixPrev = vixResult.meta?.chartPreviousClose || vixPrice;
          setMarketData(prev => ({
            ...prev,
            vix: vixPrice,
            vixChange: ((vixPrice - vixPrev) / vixPrev) * 100,
          }));
        }

        // Fetch GIFT Nifty
        const giftResponse = await fetch(
          'https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEI?interval=1d&range=2d',
          { headers: { 'User-Agent': 'Mozilla/5.0' } }
        );
        const giftData = await giftResponse.json();
        const giftResult = giftData.chart?.result?.[0];
        if (giftResult) {
          const niftyPrice = giftResult.meta?.regularMarketPrice || 0;
          const niftyPrev = giftResult.meta?.chartPreviousClose || niftyPrice;
          const niftyChange = niftyPrev ? ((niftyPrice - niftyPrev) / niftyPrev) * 100 : 0;
          setMarketData(prevData => ({
            ...prevData,
            giftNifty: niftyPrice,
            giftNiftyChange: niftyChange,
          }));
        }

        // Fetch US indices
        const dowResponse = await fetch(
          'https://query1.finance.yahoo.com/v8/finance/chart/%5EDJI?interval=1d&range=2d',
          { headers: { 'User-Agent': 'Mozilla/5.0' } }
        );
        const dowData = await dowResponse.json();
        const dowResult = dowData.chart?.result?.[0];
        if (dowResult) {
          const dowPrice = dowResult.meta?.regularMarketPrice || 0;
          const dowPrev = dowResult.meta?.chartPreviousClose || dowPrice;
          const dowChangeVal = dowPrev ? ((dowPrice - dowPrev) / dowPrev) * 100 : 0;
          setMarketData(prevData => ({
            ...prevData,
            dowChange: dowChangeVal,
          }));
        }
      } catch (error) {
        console.error('Error fetching market data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMarketData();
  }, []);

  const getVixSignal = () => {
    if (!marketData.vix) return null;
    if (marketData.vix > 25) return { text: 'HIGH FEAR - Expect volatility, shift to large-caps', color: 'text-red-400' };
    if (marketData.vix > 20) return { text: 'ELEVATED - Be cautious, reduce risky positions', color: 'text-yellow-400' };
    if (marketData.vix < 12) return { text: 'COMPLACENCY - Markets calm, good for mid/small caps', color: 'text-green-400' };
    return { text: 'NORMAL - Standard market conditions', color: 'text-gray-400' };
  };

  const getDayOfWeek = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  };

  const getDaySignal = () => {
    const day = new Date().getDay();
    if (day === 1) return { text: 'Monday: Historically POSITIVE in India (unlike US)', color: 'text-green-400' };
    if (day === 2) return { text: 'Tuesday: Often shows NEGATIVE returns', color: 'text-red-400' };
    if (day === 5) return { text: 'Friday: Historically higher returns', color: 'text-green-400' };
    return null;
  };

  const vixSignal = getVixSignal();
  const daySignal = getDaySignal();

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm mb-2 inline-block">
          ← Back to Scanner
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-4xl">🔮</span>
          <div>
            <h1 className="text-3xl font-bold">Market Secrets</h1>
            <p className="text-gray-400">Hidden patterns & correlations that actually work</p>
          </div>
        </div>
      </div>

      {/* Live Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {/* VIX Card */}
        <div className={`p-4 rounded-xl border-2 ${
          marketData.vix && marketData.vix > 20 ? 'border-red-500 bg-red-900/20' : 'border-gray-700 bg-gray-800'
        }`}>
          <div className="text-sm text-gray-400">India VIX (Fear Gauge)</div>
          <div className="text-2xl font-bold">
            {loading ? '...' : marketData.vix?.toFixed(2) || 'N/A'}
          </div>
          {marketData.vixChange !== undefined && (
            <div className={`text-sm ${marketData.vixChange >= 0 ? 'text-red-400' : 'text-green-400'}`}>
              {marketData.vixChange >= 0 ? '↑' : '↓'} {Math.abs(marketData.vixChange).toFixed(2)}%
            </div>
          )}
          {vixSignal && <div className={`text-xs mt-2 ${vixSignal.color}`}>{vixSignal.text}</div>}
        </div>

        {/* Day of Week */}
        <div className="p-4 rounded-xl border border-gray-700 bg-gray-800">
          <div className="text-sm text-gray-400">Today is</div>
          <div className="text-2xl font-bold">{getDayOfWeek()}</div>
          {daySignal && <div className={`text-xs mt-2 ${daySignal.color}`}>{daySignal.text}</div>}
        </div>

        {/* US Markets */}
        <div className="p-4 rounded-xl border border-gray-700 bg-gray-800">
          <div className="text-sm text-gray-400">Dow Jones (Overnight)</div>
          <div className={`text-2xl font-bold ${
            marketData.dowChange && marketData.dowChange >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {loading ? '...' : marketData.dowChange !== undefined
              ? `${marketData.dowChange >= 0 ? '+' : ''}${marketData.dowChange.toFixed(2)}%`
              : 'N/A'
            }
          </div>
          <div className="text-xs text-gray-400 mt-2">
            {marketData.dowChange && Math.abs(marketData.dowChange) > 1
              ? 'Strong move - expect Nifty impact'
              : 'Mild - limited impact expected'
            }
          </div>
        </div>

        {/* Nifty */}
        <div className="p-4 rounded-xl border border-gray-700 bg-gray-800">
          <div className="text-sm text-gray-400">Nifty 50</div>
          <div className="text-2xl font-bold">
            {loading ? '...' : marketData.giftNifty?.toLocaleString() || 'N/A'}
          </div>
          {marketData.giftNiftyChange !== undefined && (
            <div className={`text-sm ${marketData.giftNiftyChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {marketData.giftNiftyChange >= 0 ? '+' : ''}{marketData.giftNiftyChange.toFixed(2)}%
            </div>
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-4 mb-8">
        <div className="flex items-center gap-2 text-yellow-400 font-semibold mb-1">
          <span>⚠️</span> Important Disclaimer
        </div>
        <p className="text-sm text-gray-300">
          These patterns are based on historical data and research studies. Past performance doesn&apos;t guarantee future results.
          Markets evolve, correlations break down, and anomalies can disappear once widely known. Use as one input among many.
        </p>
      </div>

      {/* Secrets Accordion */}
      <div className="space-y-4">
        {Object.entries(SECRETS).map(([key, secret]) => (
          <div
            key={key}
            className="border border-gray-700 rounded-xl overflow-hidden"
          >
            {/* Header */}
            <button
              onClick={() => setExpandedSection(expandedSection === key ? null : key)}
              className="w-full p-5 bg-gray-800 hover:bg-gray-750 flex justify-between items-center transition-colors"
            >
              <div className="text-left">
                <h3 className="text-xl font-semibold">{secret.title}</h3>
                <p className="text-sm text-gray-400">{secret.description}</p>
              </div>
              <span className="text-2xl">{expandedSection === key ? '−' : '+'}</span>
            </button>

            {/* Content */}
            {expandedSection === key && (
              <div className="p-5 bg-gray-900/50 space-y-4">
                {secret.patterns.map((pattern, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-gray-800 rounded-lg border border-gray-700"
                  >
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2 mb-3">
                      <div className="flex-1">
                        <div className="text-yellow-400 font-medium mb-1">IF: {pattern.rule}</div>
                        <div className="text-green-400">THEN: {pattern.action}</div>
                      </div>
                      <ConfidenceBar confidence={pattern.confidence} />
                    </div>
                    <div className="text-xs text-gray-500">Source: {pattern.source}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick Reference */}
      <div className="mt-10 p-6 bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-xl border border-purple-500">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <span>⚡</span> Quick Morning Checklist
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="text-gray-300">
              <span className="text-yellow-400">1.</span> Check India VIX - Above 20 = cautious, Below 15 = aggressive
            </div>
            <div className="text-gray-300">
              <span className="text-yellow-400">2.</span> Check GIFT Nifty - Gap direction indicator
            </div>
            <div className="text-gray-300">
              <span className="text-yellow-400">3.</span> Check US overnight close - Strong move = Nifty impact
            </div>
            <div className="text-gray-300">
              <span className="text-yellow-400">4.</span> Check day of week - Monday positive, Tuesday caution
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-gray-300">
              <span className="text-yellow-400">5.</span> Check FII/DII data (6:30 PM previous day)
            </div>
            <div className="text-gray-300">
              <span className="text-yellow-400">6.</span> Check if expiry day - Higher volatility expected
            </div>
            <div className="text-gray-300">
              <span className="text-yellow-400">7.</span> Check Bank Nifty vs Nifty ratio for risk sentiment
            </div>
            <div className="text-gray-300">
              <span className="text-yellow-400">8.</span> Check sector rotation - Metals vs IT/FMCG
            </div>
          </div>
        </div>
      </div>

      {/* Most Reliable Secrets */}
      <div className="mt-8 p-6 bg-green-900/20 rounded-xl border border-green-600">
        <h2 className="text-xl font-bold mb-4 text-green-400">🎯 Highest Confidence Patterns (80%+)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-gray-800 rounded-lg">
            <div className="font-semibold text-yellow-400">VIX extreme (&gt;50) = Buy signal</div>
            <div className="text-sm text-gray-400">Market rebounds 50-80% within 12 months after extreme fear</div>
          </div>
          <div className="p-3 bg-gray-800 rounded-lg">
            <div className="font-semibold text-yellow-400">HDFC + ICICI both down = Bank Nifty falls</div>
            <div className="text-sm text-gray-400">60% combined weightage makes this near-certain</div>
          </div>
          <div className="p-3 bg-gray-800 rounded-lg">
            <div className="font-semibold text-yellow-400">Nifty -5% = VIX +9.3%</div>
            <div className="text-sm text-gray-400">Asymmetric fear - VIX spikes harder on down days</div>
          </div>
          <div className="p-3 bg-gray-800 rounded-lg">
            <div className="font-semibold text-yellow-400">Low volume gap = 85% fills in 2 days</div>
            <div className="text-sm text-gray-400">Don&apos;t chase low-volume gaps, wait for fill</div>
          </div>
          <div className="p-3 bg-gray-800 rounded-lg">
            <div className="font-semibold text-yellow-400">Monthly expiry = Max volatility</div>
            <div className="text-sm text-gray-400">Wild swings near option strikes, gamma risk</div>
          </div>
          <div className="p-3 bg-gray-800 rounded-lg">
            <div className="font-semibold text-yellow-400">GIFT Nifty pre-market = Gap direction</div>
            <div className="text-sm text-gray-400">Highly reliable for predicting NSE opening direction</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-10 text-center text-gray-500 text-sm">
        <p>Research compiled from academic papers, SSRN studies, and market observations.</p>
        <p className="mt-1">These patterns are for educational purposes only. Not financial advice.</p>
      </div>
    </div>
  );
}
