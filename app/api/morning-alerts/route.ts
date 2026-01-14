import { NextResponse } from 'next/server';

// Stock configurations with their specific patterns
const BOUNCE_STOCKS = ['BHARTIARTL', 'AXISBANK', 'SBIN', 'SBILIFE', 'GRASIM', 'NTPC', 'ADANIENT'];
const MEAN_REVERSION_STOCKS = ['ADANIENT', 'HINDALCO', 'INDUSINDBK'];
const GAP_FADE_STOCKS = ['SUNPHARMA', 'MARUTI', 'TITAN', 'AXISBANK'];
const GAP_MOMENTUM_STOCKS = ['INFY', 'RELIANCE', 'TCS', 'ICICIBANK'];
const VOLUME_UP_STOCKS = ['M&M', 'RELIANCE', 'SBILIFE', 'BAJFINANCE'];
const VOLUME_DOWN_STOCKS = ['ADANIENT', 'NTPC', 'HINDALCO', 'ONGC', 'BHARTIARTL'];
const MONDAY_AVOID = ['TCS', 'ITC', 'DABUR'];

// Pair trading relationships
const PAIRS = [
  { leader: 'HDFCBANK', follower: 'ICICIBANK', winRate: 81, avgReturn: 0.39 },
  { leader: 'HINDALCO', follower: 'VEDL', winRate: 68, avgReturn: 0.65 },
  { leader: 'TCS', follower: 'INFY', winRate: 33, avgReturn: -0.13, inverse: true },
  { leader: 'SUNPHARMA', follower: 'CIPLA', winRate: 41, avgReturn: -0.23, inverse: true },
];

// Sector mappings
const SECTORS: Record<string, string[]> = {
  Finance: ['HDFCBANK', 'ICICIBANK', 'SBIN', 'AXISBANK', 'KOTAKBANK', 'BAJFINANCE'],
  IT: ['TCS', 'INFY', 'WIPRO', 'HCLTECH', 'TECHM'],
  Metals: ['TATASTEEL', 'JSWSTEEL', 'HINDALCO', 'VEDL', 'COALINDIA'],
  Infra: ['LT', 'ULTRACEMCO', 'GRASIM', 'ADANIENT'],
  Auto: ['MARUTI', 'TATAMOTORS', 'M&M', 'BAJAJ-AUTO', 'EICHERMOT'],
};

interface Alert {
  type: 'BUY' | 'SELL' | 'AVOID' | 'WATCH';
  stock: string;
  action: string;
  logic: string;
  confidence: number;
  pattern: string;
  expectedReturn?: string;
}

interface StockData {
  symbol: string;
  name: string;
  close: number;
  prevClose: number;
  change: number;
  changePercent: number;
  gap: number;
  volume: number;
  avgVolume: number;
  volumeRatio: number;
  high52w: number;
  low52w: number;
  return5d: number;
}

async function fetchStockData(symbol: string): Promise<StockData | null> {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.NS?interval=1d&range=10d`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 300 } // Cache for 5 minutes
      }
    );

    const data = await response.json();
    const result = data.chart?.result?.[0];

    if (!result) return null;

    const quotes = result.indicators?.quote?.[0];
    const meta = result.meta;
    const closes = quotes?.close?.filter((c: number | null) => c !== null) || [];
    const volumes = quotes?.volume?.filter((v: number | null) => v !== null) || [];
    const opens = quotes?.open?.filter((o: number | null) => o !== null) || [];

    if (closes.length < 2) return null;

    const currentClose = closes[closes.length - 1];
    const prevClose = closes[closes.length - 2];
    const currentOpen = opens[opens.length - 1];
    const currentVolume = volumes[volumes.length - 1];

    // Calculate 5-day return
    const close5dAgo = closes.length >= 6 ? closes[closes.length - 6] : closes[0];
    const return5d = ((currentClose - close5dAgo) / close5dAgo) * 100;

    // Average volume (last 5 days)
    const recentVolumes = volumes.slice(-5);
    const avgVolume = recentVolumes.reduce((a: number, b: number) => a + b, 0) / recentVolumes.length;

    // Gap calculation
    const gap = ((currentOpen - prevClose) / prevClose) * 100;

    return {
      symbol: symbol,
      name: symbol,
      close: currentClose,
      prevClose: prevClose,
      change: currentClose - prevClose,
      changePercent: ((currentClose - prevClose) / prevClose) * 100,
      gap: gap,
      volume: currentVolume,
      avgVolume: avgVolume,
      volumeRatio: currentVolume / avgVolume,
      high52w: meta?.fiftyTwoWeekHigh || currentClose * 1.5,
      low52w: meta?.fiftyTwoWeekLow || currentClose * 0.5,
      return5d: return5d,
    };
  } catch (error) {
    console.error(`Error fetching ${symbol}:`, error);
    return null;
  }
}

function generateAlerts(stocksData: Map<string, StockData>): Alert[] {
  const alerts: Alert[] = [];
  const today = new Date().getDay();
  const isMonday = today === 1;

  for (const [symbol, data] of stocksData) {
    // 1. BOUNCE PATTERN: Stock fell -3% yesterday
    if (BOUNCE_STOCKS.includes(symbol) && data.changePercent <= -3) {
      const bounceData: Record<string, { rate: number; avg: string }> = {
        'BHARTIARTL': { rate: 83, avg: '+1.63%' },
        'AXISBANK': { rate: 83, avg: '+1.12%' },
        'SBIN': { rate: 83, avg: '+0.92%' },
        'SBILIFE': { rate: 83, avg: '+1.38%' },
        'GRASIM': { rate: 80, avg: '+1.12%' },
        'NTPC': { rate: 75, avg: '+1.11%' },
        'ADANIENT': { rate: 70, avg: '+1.55%' },
      };
      const info = bounceData[symbol];
      if (info) {
        alerts.push({
          type: 'BUY',
          stock: symbol,
          action: `BUY ${symbol} at open`,
          logic: `${symbol} fell ${data.changePercent.toFixed(1)}% yesterday. Historical data shows ${info.rate}% chance of bounce with ${info.avg} avg return next day.`,
          confidence: info.rate,
          pattern: 'Bounce After Big Drop',
          expectedReturn: info.avg,
        });
      }
    }

    // 2. MEAN REVERSION: Stock fell -10% in 5 days
    if (MEAN_REVERSION_STOCKS.includes(symbol) && data.return5d <= -10) {
      const reversionData: Record<string, { rate: number; avg: string }> = {
        'ADANIENT': { rate: 100, avg: '+8.8%' },
        'HINDALCO': { rate: 90, avg: '+3.5%' },
        'INDUSINDBK': { rate: 75, avg: '+1.7%' },
      };
      const info = reversionData[symbol];
      if (info) {
        alerts.push({
          type: 'BUY',
          stock: symbol,
          action: `STRONG BUY ${symbol} for 5-day hold`,
          logic: `${symbol} is down ${data.return5d.toFixed(1)}% in 5 days. This stock has ${info.rate}% bounce rate after such drops with ${info.avg} avg recovery.`,
          confidence: info.rate,
          pattern: 'Mean Reversion',
          expectedReturn: info.avg,
        });
      }
    }

    // 3. GAP FADE: Stock gapped 0.5-2%
    const absGap = Math.abs(data.gap);
    if (absGap >= 0.5 && absGap <= 2) {
      if (GAP_FADE_STOCKS.includes(symbol)) {
        alerts.push({
          type: data.gap > 0 ? 'SELL' : 'BUY',
          stock: symbol,
          action: data.gap > 0
            ? `FADE ${symbol} gap - wait for fill to previous close ₹${data.prevClose.toFixed(0)}`
            : `BUY ${symbol} - gap likely to fill up to ₹${data.prevClose.toFixed(0)}`,
          logic: `${symbol} gapped ${data.gap > 0 ? 'up' : 'down'} ${data.gap.toFixed(1)}%. This stock has 68-70% same-day gap fill rate. Wait for price to return to ₹${data.prevClose.toFixed(0)}.`,
          confidence: 70,
          pattern: 'Gap Fill',
        });
      } else if (GAP_MOMENTUM_STOCKS.includes(symbol)) {
        alerts.push({
          type: 'WATCH',
          stock: symbol,
          action: `DONT FADE ${symbol} gap - ride the momentum`,
          logic: `${symbol} gapped ${data.gap > 0 ? 'up' : 'down'} ${data.gap.toFixed(1)}%. This stock only fills 42-54% of gaps. Let momentum continue.`,
          confidence: 65,
          pattern: 'Breakaway Gap',
        });
      }
    }

    // 4. VOLUME SPIKE
    if (data.volumeRatio >= 2) {
      if (data.changePercent > 0 && VOLUME_UP_STOCKS.includes(symbol)) {
        const volData: Record<string, string> = {
          'M&M': '+1.69%',
          'RELIANCE': '+1.07%',
          'SBILIFE': '+1.00%',
          'BAJFINANCE': '+0.67%',
        };
        alerts.push({
          type: 'BUY',
          stock: symbol,
          action: `BUY ${symbol} - volume spike on up day`,
          logic: `${symbol} had ${data.volumeRatio.toFixed(1)}x volume on an UP day (+${data.changePercent.toFixed(1)}%). Historical avg next day: ${volData[symbol] || '+0.5%'}.`,
          confidence: 65,
          pattern: 'Volume Spike Up',
          expectedReturn: volData[symbol],
        });
      } else if (data.changePercent < 0 && VOLUME_DOWN_STOCKS.includes(symbol)) {
        const volData: Record<string, string> = {
          'ADANIENT': '+1.79%',
          'NTPC': '+1.73%',
          'HINDALCO': '+1.59%',
          'ONGC': '+1.38%',
          'BHARTIARTL': '+0.84%',
        };
        alerts.push({
          type: 'BUY',
          stock: symbol,
          action: `BUY ${symbol} - capitulation signal`,
          logic: `${symbol} had ${data.volumeRatio.toFixed(1)}x volume on a DOWN day (${data.changePercent.toFixed(1)}%). This looks like capitulation. Historical avg bounce: ${volData[symbol] || '+1%'}.`,
          confidence: 70,
          pattern: 'Volume Capitulation',
          expectedReturn: volData[symbol],
        });
      }
    }

    // 5. 52-WEEK LOW
    const nearLow = data.close <= data.low52w * 1.02;
    if (nearLow) {
      alerts.push({
        type: 'BUY',
        stock: symbol,
        action: `STRONG BUY ${symbol} - near 52-week low`,
        logic: `${symbol} at ₹${data.close.toFixed(0)} is within 2% of 52-week low (₹${data.low52w.toFixed(0)}). This is the BEST pattern: 80% win rate, +4.43% avg in 20 days.`,
        confidence: 80,
        pattern: '52-Week Low',
        expectedReturn: '+4.43% (20 days)',
      });
    }

    // 6. MONDAY AVOID
    if (isMonday && MONDAY_AVOID.includes(symbol)) {
      alerts.push({
        type: 'AVOID',
        stock: symbol,
        action: `AVOID ${symbol} today (Monday)`,
        logic: `${symbol} has only 41-45% win rate on Mondays. Better to trade on other days.`,
        confidence: 55,
        pattern: 'Monday Effect',
      });
    }
  }

  // 7. PAIR TRADING
  for (const pair of PAIRS) {
    const leaderData = stocksData.get(pair.leader);
    if (leaderData && leaderData.changePercent >= 2) {
      if (pair.inverse) {
        alerts.push({
          type: 'AVOID',
          stock: pair.follower,
          action: `AVOID buying ${pair.follower}`,
          logic: `${pair.leader} rallied ${leaderData.changePercent.toFixed(1)}% yesterday. When this happens, ${pair.follower} is only ${pair.winRate}% positive next day (avg ${pair.avgReturn}%).`,
          confidence: 100 - pair.winRate,
          pattern: 'Inverse Pair',
        });
      } else {
        alerts.push({
          type: 'BUY',
          stock: pair.follower,
          action: `BUY ${pair.follower} - follows ${pair.leader}`,
          logic: `${pair.leader} rallied ${leaderData.changePercent.toFixed(1)}% yesterday. When this happens, ${pair.follower} is ${pair.winRate}% positive next day (avg +${pair.avgReturn}%).`,
          confidence: pair.winRate,
          pattern: 'Pair Trading',
          expectedReturn: `+${pair.avgReturn}%`,
        });
      }
    }
  }

  // 8. SECTOR ROTATION
  const sectorReturns: Record<string, number> = {};
  for (const [sector, stocks] of Object.entries(SECTORS)) {
    const returns = stocks
      .map(s => stocksData.get(s)?.changePercent)
      .filter((r): r is number => r !== undefined);
    if (returns.length > 0) {
      sectorReturns[sector] = returns.reduce((a, b) => a + b, 0) / returns.length;
    }
  }

  // Finance up -> IT down
  if (sectorReturns['Finance'] && sectorReturns['Finance'] >= 2) {
    alerts.push({
      type: 'SELL',
      stock: 'IT Sector',
      action: 'SHORT IT stocks (TCS, INFY, WIPRO)',
      logic: `Finance sector rallied ${sectorReturns['Finance'].toFixed(1)}% yesterday. Historical data shows IT falls 66% of the time next day (-0.26% avg) when this happens.`,
      confidence: 66,
      pattern: 'Sector Rotation',
    });
  }

  // Infra up -> Metals follow
  if (sectorReturns['Infra'] && sectorReturns['Infra'] >= 2) {
    alerts.push({
      type: 'BUY',
      stock: 'Metals Sector',
      action: 'BUY Metals (TATASTEEL, HINDALCO, VEDL)',
      logic: `Infra sector rallied ${sectorReturns['Infra'].toFixed(1)}% yesterday. Historical data shows Metals follow 72% of the time (+0.32% avg).`,
      confidence: 72,
      pattern: 'Sector Rotation',
    });
  }

  // Sort by confidence
  alerts.sort((a, b) => b.confidence - a.confidence);

  return alerts;
}

export async function GET() {
  try {
    // Stocks to analyze
    const stocksToFetch = [
      'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
      'BHARTIARTL', 'SBIN', 'AXISBANK', 'KOTAKBANK', 'ITC',
      'LT', 'BAJFINANCE', 'MARUTI', 'TITAN', 'SUNPHARMA',
      'TATASTEEL', 'HINDALCO', 'M&M', 'NTPC', 'ADANIENT',
      'GRASIM', 'SBILIFE', 'VEDL', 'WIPRO', 'HCLTECH',
      'CIPLA', 'JSWSTEEL', 'ONGC', 'INDUSINDBK', 'DABUR',
      'TECHM', 'COALINDIA', 'BAJAJ-AUTO', 'EICHERMOT', 'ULTRACEMCO'
    ];

    // Fetch all stock data in parallel
    const stockPromises = stocksToFetch.map(s => fetchStockData(s));
    const stockResults = await Promise.all(stockPromises);

    // Build map of stock data
    const stocksData = new Map<string, StockData>();
    stockResults.forEach((data, idx) => {
      if (data) {
        stocksData.set(stocksToFetch[idx], data);
      }
    });

    // Generate alerts
    const alerts = generateAlerts(stocksData);

    // Get today info
    const today = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return NextResponse.json({
      success: true,
      date: today.toISOString().split('T')[0],
      day: dayNames[today.getDay()],
      marketStatus: today.getDay() === 0 || today.getDay() === 6 ? 'CLOSED' : 'OPEN',
      totalStocksAnalyzed: stocksData.size,
      alerts: alerts,
      summary: {
        buyAlerts: alerts.filter(a => a.type === 'BUY').length,
        sellAlerts: alerts.filter(a => a.type === 'SELL').length,
        avoidAlerts: alerts.filter(a => a.type === 'AVOID').length,
        watchAlerts: alerts.filter(a => a.type === 'WATCH').length,
      },
    });
  } catch (error) {
    console.error('Error generating alerts:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate alerts',
      alerts: [],
    }, { status: 500 });
  }
}
