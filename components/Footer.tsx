import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-900 border-t border-gray-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center font-bold text-white text-xl">
                N
              </div>
              <div>
                <div className="font-bold text-white text-lg">STOCK Scanner</div>
                <div className="text-xs text-gray-500">Professional NSE F&O Analytics</div>
              </div>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Data-driven stock analysis for NSE F&O traders. Identify opportunities using
              technical scanners, seasonal patterns, and commodity correlations.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-white mb-4">Tools</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-gray-400 hover:text-emerald-400 transition-colors">
                  Stock Scanner
                </Link>
              </li>
              <li>
                <Link href="/month-analysis" className="text-gray-400 hover:text-emerald-400 transition-colors">
                  Seasonal Analysis
                </Link>
              </li>
              <li>
                <Link href="/direct-plays" className="text-gray-400 hover:text-emerald-400 transition-colors">
                  Commodity Plays
                </Link>
              </li>
              <li>
                <Link href="/secrets" className="text-gray-400 hover:text-emerald-400 transition-colors">
                  Pattern Library
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold text-white mb-4">Resources</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/docs" className="text-gray-400 hover:text-emerald-400 transition-colors">
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="/docs#scanners" className="text-gray-400 hover:text-emerald-400 transition-colors">
                  Scanner Guide
                </Link>
              </li>
              <li>
                <Link href="/docs#seasonal" className="text-gray-400 hover:text-emerald-400 transition-colors">
                  Seasonal Guide
                </Link>
              </li>
              <li>
                <Link href="/docs#faq" className="text-gray-400 hover:text-emerald-400 transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-gray-500 text-sm">
            © {new Date().getFullYear()} STOCK Scanner. For educational purposes only.
          </div>
          <div className="flex items-center gap-6 text-sm">
            <span className="text-gray-500">
              Data: Yahoo Finance (~15 min delay)
            </span>
            <span className="text-yellow-500/80 text-xs">
              ⚠️ Not financial advice
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
