// API Route: /api/commodities
// Fetch commodity prices for direct play correlations

import { NextResponse } from 'next/server';

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

// Yahoo Finance symbols for commodities
const COMMODITY_SYMBOLS: Record<string, { symbol: string; name: string; currency: string }> = {
  // Crude Oil
  crude: { symbol: 'CL=F', name: 'Crude Oil (WTI)', currency: 'USD' },
  brent: { symbol: 'BZ=F', name: 'Brent Crude', currency: 'USD' },

  // Precious Metals
  gold: { symbol: 'GC=F', name: 'Gold', currency: 'USD' },
  silver: { symbol: 'SI=F', name: 'Silver', currency: 'USD' },

  // Base Metals (LME proxies via futures)
  copper: { symbol: 'HG=F', name: 'Copper', currency: 'USD' },
  aluminium: { symbol: 'ALI=F', name: 'Aluminium', currency: 'USD' },

  // Energy
  naturalgas: { symbol: 'NG=F', name: 'Natural Gas', currency: 'USD' },

  // Currency
  usdinr: { symbol: 'INR=X', name: 'USD/INR', currency: 'INR' },

  // Shipping Index (proxy)
  baltic: { symbol: 'BDIY', name: 'Baltic Dry Index', currency: 'USD' },

  // Rubber (proxy via Singapore)
  rubber: { symbol: 'RUBUSD.SW', name: 'Rubber', currency: 'USD' },
};

// Indian stock symbols to track
const INDIAN_STOCKS: Record<string, { symbol: string; name: string }> = {
  // Oil & Gas
  ongc: { symbol: 'ONGC.NS', name: 'ONGC' },
  oilindia: { symbol: 'OIL.NS', name: 'Oil India' },
  bpcl: { symbol: 'BPCL.NS', name: 'BPCL' },
  hpcl: { symbol: 'HINDPETRO.NS', name: 'HPCL' },
  ioc: { symbol: 'IOC.NS', name: 'Indian Oil' },

  // Silver/Zinc
  hindzinc: { symbol: 'HINDZINC.NS', name: 'Hindustan Zinc' },

  // Aluminium
  hindalco: { symbol: 'HINDALCO.NS', name: 'Hindalco' },
  nalco: { symbol: 'NATIONALUM.NS', name: 'NALCO' },

  // Copper
  hindcopper: { symbol: 'HINDCOPPER.NS', name: 'Hindustan Copper' },

  // IT (Rupee plays)
  tcs: { symbol: 'TCS.NS', name: 'TCS' },
  infy: { symbol: 'INFY.NS', name: 'Infosys' },
  wipro: { symbol: 'WIPRO.NS', name: 'Wipro' },

  // Airlines
  indigo: { symbol: 'INDIGO.NS', name: 'IndiGo' },
  spicejet: { symbol: 'SPICEJET.NS', name: 'SpiceJet' },

  // Tyres
  mrf: { symbol: 'MRF.NS', name: 'MRF' },
  apollotyres: { symbol: 'APOLLOTYRE.NS', name: 'Apollo Tyres' },
  ceat: { symbol: 'CEAT.NS', name: 'CEAT' },

  // Shipping
  sci: { symbol: 'SCI.NS', name: 'SCI' },
  geship: { symbol: 'GESHIP.NS', name: 'GE Shipping' },

  // Paints
  asianpaints: { symbol: 'ASIANPAINT.NS', name: 'Asian Paints' },
  berger: { symbol: 'BERGEPAINT.NS', name: 'Berger Paints' },
};

// Cache for commodity data
const commodityCache: Map<string, { data: CommodityData; timestamp: number }> = new Map();
const CACHE_TTL = 60 * 1000; // 1 minute cache

async function fetchYahooQuote(symbol: string): Promise<{
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
} | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`Yahoo API error for ${symbol}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const result = data.chart?.result?.[0];

    if (!result) return null;

    const meta = result.meta;
    const quote = result.indicators?.quote?.[0];

    if (!meta || !quote) return null;

    const price = meta.regularMarketPrice || quote.close?.[quote.close.length - 1] || 0;
    const previousClose = meta.chartPreviousClose || meta.previousClose || quote.close?.[0] || price;
    const change = price - previousClose;
    const changePercent = previousClose ? (change / previousClose) * 100 : 0;

    return {
      price,
      change,
      changePercent,
      previousClose,
    };
  } catch (error) {
    console.error(`Error fetching ${symbol}:`, error);
    return null;
  }
}

async function fetchCommodityData(key: string, config: { symbol: string; name: string; currency: string }): Promise<CommodityData | null> {
  const cacheKey = key;
  const cached = commodityCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const quote = await fetchYahooQuote(config.symbol);

  if (!quote) return null;

  const data: CommodityData = {
    symbol: config.symbol,
    name: config.name,
    price: quote.price,
    change: quote.change,
    changePercent: quote.changePercent,
    previousClose: quote.previousClose,
    currency: config.currency,
    lastUpdated: new Date().toISOString(),
  };

  commodityCache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}

export async function GET() {
  try {
    // Fetch all commodities in parallel
    const commodityPromises = Object.entries(COMMODITY_SYMBOLS).map(async ([key, config]) => {
      const data = await fetchCommodityData(key, config);
      return [key, data] as const;
    });

    // Fetch key Indian stocks in parallel
    const stockPromises = Object.entries(INDIAN_STOCKS).map(async ([key, config]) => {
      const quote = await fetchYahooQuote(config.symbol);
      if (!quote) return [key, null] as const;

      return [key, {
        symbol: config.symbol,
        name: config.name,
        price: quote.price,
        change: quote.change,
        changePercent: quote.changePercent,
        previousClose: quote.previousClose,
        currency: 'INR',
        lastUpdated: new Date().toISOString(),
      }] as const;
    });

    const [commodityResults, stockResults] = await Promise.all([
      Promise.all(commodityPromises),
      Promise.all(stockPromises),
    ]);

    const commodities: Record<string, CommodityData | null> = {};
    commodityResults.forEach(([key, data]) => {
      commodities[key] = data;
    });

    const stocks: Record<string, CommodityData | null> = {};
    stockResults.forEach(([key, data]) => {
      stocks[key] = data;
    });

    // Calculate direct play signals
    const signals = calculateSignals(commodities, stocks);

    return NextResponse.json({
      success: true,
      timestamp: Date.now(),
      lastUpdated: new Date().toISOString(),
      commodities,
      stocks,
      signals,
    });
  } catch (error) {
    console.error('Commodities API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch commodity data', details: String(error) },
      { status: 500 }
    );
  }
}

interface Signal {
  factor: string;
  direction: 'up' | 'down' | 'neutral';
  change: number;
  beneficiaries: string[];
  losers: string[];
  insight: string;
}

function calculateSignals(
  commodities: Record<string, CommodityData | null>,
  stocks: Record<string, CommodityData | null>
): Signal[] {
  const signals: Signal[] = [];
  const threshold = 0.5; // 0.5% threshold for significant moves

  // Crude Oil signal
  const crude = commodities.crude || commodities.brent;
  if (crude) {
    const direction = crude.changePercent > threshold ? 'up' : crude.changePercent < -threshold ? 'down' : 'neutral';
    signals.push({
      factor: 'Crude Oil',
      direction,
      change: crude.changePercent,
      beneficiaries: direction === 'up' ? ['ONGC', 'Oil India'] : ['BPCL', 'HPCL', 'IOC', 'Asian Paints', 'IndiGo'],
      losers: direction === 'up' ? ['BPCL', 'HPCL', 'IOC', 'Asian Paints', 'IndiGo'] : ['ONGC', 'Oil India'],
      insight: direction === 'up'
        ? 'Upstream oil producers benefit, refiners & airlines under pressure'
        : direction === 'down'
        ? 'Refiners, airlines & paint stocks benefit from lower input costs'
        : 'Crude stable, no clear directional play',
    });
  }

  // Silver signal
  const silver = commodities.silver;
  if (silver) {
    const direction = silver.changePercent > threshold ? 'up' : silver.changePercent < -threshold ? 'down' : 'neutral';
    signals.push({
      factor: 'Silver',
      direction,
      change: silver.changePercent,
      beneficiaries: direction === 'up' ? ['Hindustan Zinc'] : [],
      losers: direction === 'down' ? ['Hindustan Zinc'] : [],
      insight: direction === 'up'
        ? '88% of silver gains flow to Hindustan Zinc EBITDA'
        : direction === 'down'
        ? 'Silver weakness pressures Hindustan Zinc'
        : 'Silver stable',
    });
  }

  // USD/INR signal
  const usdinr = commodities.usdinr;
  if (usdinr) {
    const direction = usdinr.changePercent > 0.2 ? 'up' : usdinr.changePercent < -0.2 ? 'down' : 'neutral';
    signals.push({
      factor: 'USD/INR (Rupee)',
      direction,
      change: usdinr.changePercent,
      beneficiaries: direction === 'up' ? ['TCS', 'Infosys', 'Wipro', 'HCL Tech'] : [],
      losers: direction === 'down' ? ['IT exporters'] : [],
      insight: direction === 'up'
        ? 'Rupee weakness = ~1% revenue boost per 1% depreciation for IT'
        : direction === 'down'
        ? 'Rupee strength reduces IT export earnings'
        : 'Currency stable',
    });
  }

  // Aluminium signal
  const aluminium = commodities.aluminium;
  if (aluminium) {
    const direction = aluminium.changePercent > threshold ? 'up' : aluminium.changePercent < -threshold ? 'down' : 'neutral';
    signals.push({
      factor: 'Aluminium (LME)',
      direction,
      change: aluminium.changePercent,
      beneficiaries: direction === 'up' ? ['Hindalco', 'NALCO', 'Vedanta'] : [],
      losers: direction === 'down' ? ['Hindalco', 'NALCO'] : [],
      insight: direction === 'up'
        ? 'Direct LME price pass-through to Indian aluminium stocks'
        : 'Lower aluminium prices pressure margins',
    });
  }

  // Copper signal
  const copper = commodities.copper;
  if (copper) {
    const direction = copper.changePercent > threshold ? 'up' : copper.changePercent < -threshold ? 'down' : 'neutral';
    signals.push({
      factor: 'Copper',
      direction,
      change: copper.changePercent,
      beneficiaries: direction === 'up' ? ['Hindustan Copper', 'Hindalco'] : [],
      losers: direction === 'down' ? ['Hindustan Copper'] : [],
      insight: direction === 'up'
        ? 'Copper rally benefits Indian copper producers'
        : 'Copper weakness',
    });
  }

  // Natural Gas signal
  const natgas = commodities.naturalgas;
  if (natgas) {
    const direction = natgas.changePercent > threshold ? 'up' : natgas.changePercent < -threshold ? 'down' : 'neutral';
    signals.push({
      factor: 'Natural Gas',
      direction,
      change: natgas.changePercent,
      beneficiaries: direction === 'up' ? ['ONGC', 'GAIL'] : ['Gujarat Gas', 'IGL', 'MGL'],
      losers: direction === 'up' ? ['Gujarat Gas', 'IGL', 'MGL'] : [],
      insight: direction === 'up'
        ? 'CGD companies face margin pressure from higher gas costs'
        : 'Lower gas benefits CGD companies',
    });
  }

  return signals;
}
