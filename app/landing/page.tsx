'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const FEATURES = [
  {
    icon: '📊',
    title: 'Real-Time Scanner',
    description: 'Scan 180+ F&O stocks with 10+ technical strategies. Find opportunities in seconds, not hours.',
    stat: '180+ Stocks',
  },
  {
    icon: '🎯',
    title: 'F&O Strategy Builder',
    description: '70%+ win rate strategies with position sizing calculator. Know exactly how many lots to trade.',
    stat: '70% Win Rate',
  },
  {
    icon: '📅',
    title: 'Seasonal Patterns',
    description: 'Which sectors work in which months? PSU in Feb, IT in Q4. Data from 2 years of analysis.',
    stat: '2 Years Data',
  },
  {
    icon: '🔮',
    title: 'Hidden Patterns',
    description: '52-week low = 80% bounce rate. Gap fills, sector correlations. Patterns most traders miss.',
    stat: '48K+ Data Points',
  },
];

const STATS = [
  { value: '180+', label: 'F&O Stocks Tracked' },
  { value: '2 Years', label: 'Historical Data' },
  { value: '70%+', label: 'Strategy Win Rate' },
  { value: '48,000+', label: 'Data Points Analyzed' },
];

const TESTIMONIALS = [
  {
    text: "Finally, a tool that doesn't just give tips but explains WHY with data. My win rate improved significantly.",
    author: 'Rajesh Sharma',
    role: 'Mumbai',
  },
  {
    text: "The seasonal analysis is gold. I never knew PSU banks rally in Feb before budget. Now I plan ahead.",
    author: 'Priya Venkatesh',
    role: 'Bangalore',
  },
  {
    text: "Position sizing calculator alone is worth it. No more over-leveraging and blowing up accounts.",
    author: 'Amit Patel',
    role: 'Delhi',
  },
];

export default function LandingPage() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-lg border-b border-gray-800">
        <div className="max-w-[1400px] mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center font-bold text-white text-xl">
              S
            </div>
            <div>
              <div className="font-bold text-white text-lg">STOCK Scanner</div>
              <div className="text-xs text-gray-500">NSE F&O Analytics</div>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/login" className="text-gray-400 hover:text-white transition px-4 py-2">
              Login
            </Link>
            <Link
              href="/signup"
              className="bg-emerald-500 hover:bg-emerald-400 text-white px-5 py-2 rounded-lg font-medium transition"
            >
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-[1400px] mx-auto">
          <div className={`text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-emerald-400 text-sm font-medium">Live Market Data</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              Stop Guessing.
              <br />
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                Start Trading with Data.
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-gray-400 mb-8 max-w-3xl mx-auto">
              F&O strategies with <span className="text-emerald-400 font-semibold">70%+ win rate</span>, backed by 2 years of Nifty 100 data.
              <br className="hidden md:block" />
              No tips. No guesswork. Just data-driven trading.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Link
                href="/signup"
                className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-4 rounded-xl font-semibold text-lg transition shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
              >
                Get Started Free
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                href="#features"
                className="w-full sm:w-auto bg-gray-800 hover:bg-gray-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition flex items-center justify-center gap-2"
              >
                See How It Works
              </Link>
            </div>

            {/* Hero Image - Scanner Screenshot Placeholder */}
            <div className="relative max-w-5xl mx-auto">
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent z-10 pointer-events-none"></div>
              <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden shadow-2xl">
                {/* Mock Browser Header */}
                <div className="bg-gray-800 px-4 py-3 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <div className="flex-1 bg-gray-700 rounded-lg px-3 py-1 text-xs text-gray-400 text-center">
                    stockscanner.app/dashboard
                  </div>
                </div>
                {/* Scanner UI Mockup */}
                <div className="p-6 bg-gray-900">
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    {['NIFTY 50', 'BANK NIFTY', 'VIX', 'F&O Stocks'].map((item, i) => (
                      <div key={i} className="bg-gray-800 rounded-lg p-3 text-center">
                        <div className="text-xs text-gray-500 mb-1">{item}</div>
                        <div className={`text-lg font-bold ${i === 2 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                          {i === 0 ? '24,150' : i === 1 ? '51,230' : i === 2 ? '13.2' : '180+'}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white font-semibold">Top Buy Signals</span>
                      <span className="text-xs text-emerald-400">Live</span>
                    </div>
                    {['HDFCBANK', 'TCS', 'RELIANCE'].map((stock, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
                        <div className="flex items-center gap-3">
                          <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-xs font-bold">BUY</span>
                          <span className="text-white">{stock}</span>
                        </div>
                        <span className="text-emerald-400">+{(2 + Math.random() * 2).toFixed(2)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 px-4 bg-gray-900/50">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                <span className="text-red-400">90% of traders lose money.</span>
                <br />
                Here&apos;s why...
              </h2>
              <div className="space-y-4">
                {[
                  'Trading on WhatsApp tips & "expert" calls',
                  'No clear entry/exit rules - emotional decisions',
                  'Over-leveraging without position sizing',
                  'Chasing every stock instead of quality setups',
                ].map((problem, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-red-400 mt-1">✗</span>
                    <span className="text-gray-400">{problem}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                <span className="text-emerald-400">What winners do differently</span>
              </h2>
              <div className="space-y-4">
                {[
                  'Trade setups with proven historical edge',
                  'Clear rules - 30 delta, 50% profit target, 2x stop',
                  'Risk only 2-3% per trade, never blow up',
                  'Focus on high-probability, data-backed patterns',
                ].map((solution, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-emerald-400 mt-1">✓</span>
                    <span className="text-gray-300">{solution}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 border-y border-gray-800">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-emerald-400 mb-2">{stat.value}</div>
                <div className="text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Everything you need to trade
              <span className="text-emerald-400"> smarter</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Built by traders, for traders. No fluff, just tools that actually work.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {FEATURES.map((feature, i) => (
              <div
                key={i}
                className="bg-gray-900 rounded-2xl border border-gray-800 p-8 hover:border-emerald-500/50 transition group"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{feature.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition">
                        {feature.title}
                      </h3>
                      <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full">
                        {feature.stat}
                      </span>
                    </div>
                    <p className="text-gray-400">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* F&O Strategy Highlight */}
      <section className="py-20 px-4 bg-gradient-to-br from-emerald-900/20 to-cyan-900/20">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-emerald-400 font-semibold mb-4 block">MOST POPULAR</span>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                F&O Strategy Builder with
                <span className="text-emerald-400"> 70% Win Rate</span>
              </h2>
              <p className="text-gray-400 mb-6 text-lg">
                Stop guessing strike prices. Our delta-based system tells you exactly which strikes to sell
                and how many lots to trade based on your capital.
              </p>
              <div className="space-y-3">
                {[
                  'VIX-based trade signals (when to trade)',
                  '16/30 Delta strike selection (70-84% win probability)',
                  'Position sizing calculator (never over-leverage)',
                  'Entry, exit & risk rules (systematic trading)',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <span className="text-emerald-400 text-sm">✓</span>
                    </div>
                    <span className="text-gray-300">{item}</span>
                  </div>
                ))}
              </div>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-3 rounded-lg font-semibold mt-8 transition"
              >
                Try F&O Strategy Builder
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
              {/* Strategy Calculator Mockup */}
              <div className="text-white font-semibold mb-4">Position Calculator</div>
              <div className="space-y-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-xs text-gray-500 mb-1">Your Capital</div>
                  <div className="text-2xl font-bold text-white">₹5,00,000</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-800 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-500 mb-1">Risk Per Trade</div>
                    <div className="text-lg font-bold text-yellow-400">2%</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-500 mb-1">Max Risk</div>
                    <div className="text-lg font-bold text-white">₹10,000</div>
                  </div>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-xs text-emerald-400 mb-1">Recommended Lots</div>
                    <div className="text-4xl font-bold text-emerald-400">3</div>
                    <div className="text-xs text-gray-400 mt-1">Bank Nifty Weekly</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4">
        <div className="max-w-[1400px] mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Traders love STOCK Scanner
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((testimonial, i) => (
              <div key={i} className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <span key={j} className="text-yellow-400">★</span>
                  ))}
                </div>
                <p className="text-gray-300 mb-4">&quot;{testimonial.text}&quot;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold">
                    {testimonial.author[0]}
                  </div>
                  <div>
                    <div className="text-white font-medium">{testimonial.author}</div>
                    <div className="text-gray-500 text-sm">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 bg-gray-900/50">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-xl text-gray-400">
              Start free. Upgrade when you&apos;re ready.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8">
              <div className="text-lg font-semibold text-gray-400 mb-2">Free</div>
              <div className="text-4xl font-bold text-white mb-1">₹0</div>
              <div className="text-gray-500 mb-6">Forever free</div>

              <ul className="space-y-3 mb-8">
                {[
                  'All scanner strategies',
                  'F&O Strategy Builder',
                  'Seasonal analysis',
                  'Pattern library',
                  '5 scans per day',
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-300">
                    <span className="text-emerald-400">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href="/signup"
                className="block w-full bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-lg font-semibold text-center transition"
              >
                Get Started Free
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="bg-gradient-to-br from-emerald-900/50 to-cyan-900/50 rounded-2xl border border-emerald-500/50 p-8 relative">
              <div className="absolute top-4 right-4 bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded">
                POPULAR
              </div>
              <div className="text-lg font-semibold text-emerald-400 mb-2">Pro</div>
              <div className="text-4xl font-bold text-white mb-1">
                ₹499<span className="text-lg text-gray-400">/month</span>
              </div>
              <div className="text-gray-500 mb-6">Billed monthly</div>

              <ul className="space-y-3 mb-8">
                {[
                  'Everything in Free',
                  'Unlimited scans',
                  'Real-time alerts (Telegram)',
                  'Priority support',
                  'Early access to new features',
                  'Custom watchlists',
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-300">
                    <span className="text-emerald-400">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                disabled
                className="block w-full bg-emerald-500/50 text-white/50 py-3 rounded-lg font-semibold text-center cursor-not-allowed"
              >
                Coming Soon
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Fun Section */}
      <section className="py-16 px-4">
        <div className="max-w-[1400px] mx-auto">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 text-center">
            <div className="text-4xl mb-4">🎰</div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Trading shouldn&apos;t feel like gambling
            </h3>
            <p className="text-gray-400 max-w-xl mx-auto">
              When you have data on your side, every trade becomes a calculated decision.
              70% win rate means you can be wrong 3 out of 10 times and still be profitable.
              <span className="text-emerald-400"> That&apos;s the power of statistics.</span>
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4">
        <div className="max-w-[1400px] mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Ready to trade with an edge?
          </h2>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Join traders who&apos;ve stopped guessing and started winning with data-driven strategies.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-4 rounded-xl font-semibold text-lg transition shadow-lg shadow-emerald-500/25"
          >
            Create Free Account
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <p className="text-gray-500 mt-4 text-sm">No credit card required • Free forever plan available</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12 px-4">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center font-bold text-white">
                S
              </div>
              <span className="font-semibold text-white">STOCK Scanner</span>
            </div>
            <div className="text-gray-500 text-sm text-center">
              For educational purposes only. Not financial advice. Past performance doesn&apos;t guarantee future results.
            </div>
            <div className="text-gray-500 text-sm">
              © {new Date().getFullYear()} STOCK Scanner
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
