'use client';

import { useState } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

interface DocSection {
  id: string;
  title: string;
  icon: string;
  content: React.ReactNode;
}

const DOC_SECTIONS: DocSection[] = [
  {
    id: 'overview',
    title: 'Platform Overview',
    icon: '🎯',
    content: (
      <div className="space-y-4">
        <p className="text-gray-300">
          STOCK Scanner is a professional-grade analytics platform for NSE F&O (Futures & Options) stocks.
          It provides real-time scanning, seasonal pattern analysis, and commodity correlation insights.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h4 className="font-semibold text-emerald-400 mb-2">What You Get</h4>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• 10+ technical scanners</li>
              <li>• 180+ F&O stocks coverage</li>
              <li>• 2-year historical analysis</li>
              <li>• Commodity correlations</li>
              <li>• Real-time market data</li>
            </ul>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h4 className="font-semibold text-emerald-400 mb-2">Best For</h4>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Swing traders (2-10 days)</li>
              <li>• Positional traders</li>
              <li>• F&O option buyers</li>
              <li>• Pattern-based trading</li>
              <li>• Seasonal strategies</li>
            </ul>
          </div>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mt-4">
          <h4 className="font-semibold text-yellow-400 mb-2">⚠️ Important Disclaimer</h4>
          <p className="text-sm text-yellow-200/80">
            This platform is for educational and paper trading purposes only. Past performance does not
            guarantee future results. Always do your own research before making trading decisions.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'scanners',
    title: 'Stock Scanner',
    icon: '📊',
    content: (
      <div className="space-y-6">
        <p className="text-gray-300">
          The scanner identifies stocks matching specific technical criteria in real-time.
          Select a scanner type, set the number of stocks to scan, and click "Run Scan".
        </p>

        <h4 className="font-semibold text-white text-lg">Scanner Types</h4>

        <div className="space-y-4">
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-xs">INTRADAY</span>
              <h5 className="font-semibold text-white">Gap-Up Momentum</h5>
            </div>
            <p className="text-sm text-gray-400 mb-2">
              Finds stocks that opened 1-5% higher than previous close with volume spike.
              Best used at market open (9:15-9:30 AM).
            </p>
            <div className="text-xs text-gray-500">
              <strong>Criteria:</strong> Gap up 1-5%, holding above open, volume &gt; 1.5x average
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded text-xs">SWING</span>
              <h5 className="font-semibold text-white">Range Expansion + Trend</h5>
            </div>
            <p className="text-sm text-gray-400 mb-2">
              Identifies stocks with today's range larger than last 5-7 days, confirming breakout.
              Works best for 2-5 day swing trades.
            </p>
            <div className="text-xs text-gray-500">
              <strong>Criteria:</strong> Range &gt; 5/7 previous days, SMA20 &gt; SMA50 &gt; SMA200
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded text-xs">SWING</span>
              <h5 className="font-semibold text-white">EMA 5/20 Crossover</h5>
            </div>
            <p className="text-sm text-gray-400 mb-2">
              Detects when fast EMA (5-day) crosses above slow EMA (20-day).
              Classic trend-following signal.
            </p>
            <div className="text-xs text-gray-500">
              <strong>Criteria:</strong> EMA5 &gt; EMA20, RSI between 50-70, positive momentum
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-xs">MOMENTUM</span>
              <h5 className="font-semibold text-white">MACD Bullish Crossover</h5>
            </div>
            <p className="text-sm text-gray-400 mb-2">
              Finds stocks where MACD line crosses above signal line.
              Indicates potential trend reversal or continuation.
            </p>
            <div className="text-xs text-gray-500">
              <strong>Criteria:</strong> MACD (12,26,9) crossing above signal line
            </div>
          </div>
        </div>

        <h4 className="font-semibold text-white text-lg mt-6">How to Use</h4>
        <ol className="list-decimal list-inside text-gray-400 space-y-2 text-sm">
          <li>Select a scanner from the dropdown based on your trading style</li>
          <li>Choose stock limit (20-100) - more stocks = longer scan time</li>
          <li>Click "Run Scan" to execute</li>
          <li>Review results sorted by score (highest = strongest signal)</li>
          <li>Click on a stock row to see detailed signal reasons</li>
          <li>Enable auto-refresh for continuous monitoring during market hours</li>
        </ol>

        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
          <h5 className="font-semibold text-emerald-400 mb-2">💡 Pro Tips</h5>
          <ul className="text-sm text-emerald-200/80 space-y-1">
            <li>• Use Gap-Up scanner only in first 30 minutes of market</li>
            <li>• Range Expansion works best for swing trades (hold 2-5 days)</li>
            <li>• Higher volume ratio = stronger conviction</li>
            <li>• RSI between 50-70 is ideal for long entries</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 'seasonal',
    title: 'Seasonal Analysis',
    icon: '📅',
    content: (
      <div className="space-y-6">
        <p className="text-gray-300">
          Seasonal analysis identifies which stocks and sectors historically perform well in specific months.
          Based on 2 years of actual price data - no assumptions, 100% data-driven.
        </p>

        <h4 className="font-semibold text-white text-lg">Understanding the Metrics</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h5 className="font-semibold text-blue-400 mb-2">Confidence Score</h5>
            <p className="text-sm text-gray-400">
              Calculated from win rate + average return + data reliability.
              Higher is better. 70%+ = High confidence.
            </p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h5 className="font-semibold text-green-400 mb-2">Win Rate</h5>
            <p className="text-sm text-gray-400">
              Percentage of times the stock was positive in that month
              over the past 2 years. 60%+ is good.
            </p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h5 className="font-semibold text-yellow-400 mb-2">Average Return</h5>
            <p className="text-sm text-gray-400">
              Mean return for that month across all available years.
              Positive = historically bullish month.
            </p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h5 className="font-semibold text-purple-400 mb-2">Data Points</h5>
            <p className="text-sm text-gray-400">
              Number of years of data available.
              More data points = more reliable analysis.
            </p>
          </div>
        </div>

        <h4 className="font-semibold text-white text-lg mt-6">How to Use</h4>
        <ol className="list-decimal list-inside text-gray-400 space-y-2 text-sm">
          <li>Select the month you want to analyze</li>
          <li>Review the "Top 5 Picks" - highest confidence stocks</li>
          <li>Check sector rankings to identify strong/weak sectors</li>
          <li>Expand sectors to see individual stock analysis</li>
          <li>Use "All Stocks" tab to filter by sector</li>
          <li>Click on any stock to see year-by-year returns</li>
        </ol>

        <h4 className="font-semibold text-white text-lg mt-6">Common Seasonal Patterns</h4>
        <div className="space-y-3">
          <div className="flex items-start gap-3 text-sm">
            <span className="text-2xl">📊</span>
            <div>
              <strong className="text-white">February (Budget)</strong>
              <p className="text-gray-400">PSU stocks, infrastructure, and defense often see action due to budget announcements.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <span className="text-2xl">☀️</span>
            <div>
              <strong className="text-white">March-May (Summer)</strong>
              <p className="text-gray-400">Consumer durables (ACs, coolers) and power utilities typically perform well.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <span className="text-2xl">🎉</span>
            <div>
              <strong className="text-white">October-November (Festive)</strong>
              <p className="text-gray-400">Auto, FMCG, and retail stocks historically outperform during Diwali season.</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'commodities',
    title: 'Commodity Correlations',
    icon: '🛢️',
    content: (
      <div className="space-y-6">
        <p className="text-gray-300">
          Direct Plays shows how overnight commodity price movements affect related Indian stocks.
          Use this to plan your trades before market opens.
        </p>

        <h4 className="font-semibold text-white text-lg">Key Correlations</h4>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-gray-400 border-b border-gray-700">
              <tr>
                <th className="text-left py-2 px-3">Commodity</th>
                <th className="text-left py-2 px-3">Correlated Stocks</th>
                <th className="text-left py-2 px-3">Relationship</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              <tr className="border-b border-gray-800">
                <td className="py-2 px-3 font-medium">Gold</td>
                <td className="py-2 px-3">TITAN, MUTHOOTFIN, MANAPPURAM</td>
                <td className="py-2 px-3 text-green-400">Positive</td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-2 px-3 font-medium">Crude Oil</td>
                <td className="py-2 px-3">ONGC, RELIANCE, IOC, BPCL</td>
                <td className="py-2 px-3 text-green-400">Positive</td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-2 px-3 font-medium">Crude Oil</td>
                <td className="py-2 px-3">MARUTI, INDIGO (fuel cost)</td>
                <td className="py-2 px-3 text-red-400">Negative</td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-2 px-3 font-medium">Copper</td>
                <td className="py-2 px-3">HINDALCO, VEDL, TATASTEEL</td>
                <td className="py-2 px-3 text-green-400">Positive</td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-2 px-3 font-medium">Natural Gas</td>
                <td className="py-2 px-3">GAIL, IGL, MGL</td>
                <td className="py-2 px-3 text-green-400">Positive</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h4 className="font-semibold text-white text-lg mt-6">How to Use</h4>
        <ol className="list-decimal list-inside text-gray-400 space-y-2 text-sm">
          <li>Check commodity prices before market opens (8:30-9:00 AM)</li>
          <li>Look for significant moves (&gt;1% change)</li>
          <li>Identify "ACTIVE" correlations highlighted on the page</li>
          <li>Review "GO LONG" or "GO SHORT" opportunities</li>
          <li>Note the confidence level and suggested targets</li>
          <li>Wait for market open to confirm the move</li>
        </ol>

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <h5 className="font-semibold text-blue-400 mb-2">💡 Best Practices</h5>
          <ul className="text-sm text-blue-200/80 space-y-1">
            <li>• Correlations work best for opening 30 minutes</li>
            <li>• Stronger commodity moves (&gt;2%) = higher probability</li>
            <li>• Always confirm with stock's own price action</li>
            <li>• Use stop-losses - correlations can fail</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 'patterns',
    title: 'Pattern Library',
    icon: '🔮',
    content: (
      <div className="space-y-6">
        <p className="text-gray-300">
          The Secrets/Patterns section contains backtested market patterns identified from
          2+ years of Nifty 100 data. These are statistical tendencies, not guarantees.
        </p>

        <h4 className="font-semibold text-white text-lg">Pattern Categories</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h5 className="font-semibold text-green-400 mb-2">Day-of-Week Patterns</h5>
            <p className="text-sm text-gray-400">
              Historical tendencies for specific days (e.g., Monday reversals,
              Friday profit-booking).
            </p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h5 className="font-semibold text-blue-400 mb-2">Time-of-Day Patterns</h5>
            <p className="text-sm text-gray-400">
              Intraday patterns like opening hour volatility, lunch lull,
              and closing hour moves.
            </p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h5 className="font-semibold text-purple-400 mb-2">VIX-Based Patterns</h5>
            <p className="text-sm text-gray-400">
              How market behaves when India VIX is high (&gt;20) vs low (&lt;15).
              Volatility regime strategies.
            </p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h5 className="font-semibold text-yellow-400 mb-2">Gap Patterns</h5>
            <p className="text-sm text-gray-400">
              Behavior after gap-up/gap-down opens.
              Gap fill probabilities and timing.
            </p>
          </div>
        </div>

        <h4 className="font-semibold text-white text-lg mt-6">How to Use</h4>
        <ol className="list-decimal list-inside text-gray-400 space-y-2 text-sm">
          <li>Check morning indicators (VIX, GIFT Nifty, Dow) before market</li>
          <li>Review applicable patterns for the day</li>
          <li>Look for confluence - multiple patterns aligning</li>
          <li>Use patterns as a framework, not absolute rules</li>
          <li>Note the confidence percentage for each pattern</li>
        </ol>

        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <h5 className="font-semibold text-red-400 mb-2">⚠️ Important</h5>
          <p className="text-sm text-red-200/80">
            Patterns are historical tendencies with 55-75% accuracy. They are NOT guarantees.
            Always use proper risk management and stop-losses. Market conditions change.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'faq',
    title: 'FAQ',
    icon: '❓',
    content: (
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h5 className="font-semibold text-white mb-2">Where does the data come from?</h5>
            <p className="text-sm text-gray-400">
              Stock data is fetched from Yahoo Finance API. Data is approximately 15 minutes delayed
              during market hours. End-of-day data is accurate for swing trading analysis.
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h5 className="font-semibold text-white mb-2">Which stocks are covered?</h5>
            <p className="text-sm text-gray-400">
              All 180+ NSE F&O (Futures & Options) eligible stocks are covered. This includes
              NIFTY 50, Bank Nifty constituents, and NIFTY 200 stocks that have F&O contracts.
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h5 className="font-semibold text-white mb-2">How often is the scanner updated?</h5>
            <p className="text-sm text-gray-400">
              You can run scans on-demand anytime. Auto-refresh runs every 5 minutes when enabled.
              Seasonal analysis data is cached for 1 hour to reduce API load.
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h5 className="font-semibold text-white mb-2">Can I use this for live trading?</h5>
            <p className="text-sm text-gray-400">
              This platform is designed for educational and paper trading purposes. The signals
              should be used as a starting point for your own research, not as direct trading advice.
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h5 className="font-semibold text-white mb-2">What does confidence score mean?</h5>
            <p className="text-sm text-gray-400">
              Confidence is calculated from historical win rate, average returns, and data reliability.
              70%+ is high confidence, 50-70% is moderate, below 50% is low confidence.
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h5 className="font-semibold text-white mb-2">Why is seasonal analysis taking long?</h5>
            <p className="text-sm text-gray-400">
              First load fetches 2 years of data for 150+ stocks from Yahoo Finance. This takes
              60-90 seconds. Subsequent loads use cached data and are much faster.
            </p>
          </div>
        </div>
      </div>
    ),
  },
];

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('overview');

  const currentSection = DOC_SECTIONS.find(s => s.id === activeSection) || DOC_SECTIONS[0];

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Navigation />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Documentation</h1>
            <p className="text-gray-400">
              Learn how to use STOCK Scanner effectively for your trading analysis
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <nav className="bg-gray-900 rounded-lg border border-gray-800 p-4 sticky top-24">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                  Contents
                </h3>
                <ul className="space-y-1">
                  {DOC_SECTIONS.map((section) => (
                    <li key={section.id}>
                      <button
                        onClick={() => setActiveSection(section.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                          activeSection === section.id
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800'
                        }`}
                      >
                        <span>{section.icon}</span>
                        <span>{section.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>

            {/* Content */}
            <div className="lg:col-span-3">
              <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-800">
                  <span className="text-3xl">{currentSection.icon}</span>
                  <h2 className="text-2xl font-bold text-white">{currentSection.title}</h2>
                </div>
                {currentSection.content}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
