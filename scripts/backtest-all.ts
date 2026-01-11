// Backtest all F&O stocks with Hybrid Supertrend strategy
// Run with: npx tsx scripts/backtest-all.ts

import { FO_STOCKS } from '../lib/fo-stocks';

interface OHLCV {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface BacktestResult {
  symbol: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnlPercent: number;
  avgTradeReturn: number;
  maxWin: number;
  maxLoss: number;
}

// Calculate ATR (Average True Range)
function calculateATR(candles: OHLCV[], period: number): number[] {
  const atr: number[] = [];
  const tr: number[] = [];

  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      tr.push(candles[i].high - candles[i].low);
    } else {
      const hl = candles[i].high - candles[i].low;
      const hpc = Math.abs(candles[i].high - candles[i - 1].close);
      const lpc = Math.abs(candles[i].low - candles[i - 1].close);
      tr.push(Math.max(hl, hpc, lpc));
    }

    if (i < period) {
      atr.push(tr.reduce((a, b) => a + b, 0) / tr.length);
    } else {
      atr.push((atr[i - 1] * (period - 1) + tr[i]) / period);
    }
  }

  return atr;
}

// Calculate single Supertrend
function calculateSupertrend(candles: OHLCV[], factor: number, period: number): { upperBand: number[]; lowerBand: number[]; supertrend: number[]; direction: number[] } {
  const atr = calculateATR(candles, period);
  const upperBand: number[] = [];
  const lowerBand: number[] = [];
  const supertrend: number[] = [];
  const direction: number[] = []; // 1 = bullish, -1 = bearish

  for (let i = 0; i < candles.length; i++) {
    const hl2 = (candles[i].high + candles[i].low) / 2;
    const basicUpperBand = hl2 + factor * atr[i];
    const basicLowerBand = hl2 - factor * atr[i];

    if (i === 0) {
      upperBand.push(basicUpperBand);
      lowerBand.push(basicLowerBand);
      supertrend.push(basicUpperBand);
      direction.push(-1);
    } else {
      // Upper band
      if (basicUpperBand < upperBand[i - 1] || candles[i - 1].close > upperBand[i - 1]) {
        upperBand.push(basicUpperBand);
      } else {
        upperBand.push(upperBand[i - 1]);
      }

      // Lower band
      if (basicLowerBand > lowerBand[i - 1] || candles[i - 1].close < lowerBand[i - 1]) {
        lowerBand.push(basicLowerBand);
      } else {
        lowerBand.push(lowerBand[i - 1]);
      }

      // Direction and supertrend
      if (supertrend[i - 1] === upperBand[i - 1]) {
        if (candles[i].close > upperBand[i]) {
          supertrend.push(lowerBand[i]);
          direction.push(1);
        } else {
          supertrend.push(upperBand[i]);
          direction.push(-1);
        }
      } else {
        if (candles[i].close < lowerBand[i]) {
          supertrend.push(upperBand[i]);
          direction.push(-1);
        } else {
          supertrend.push(lowerBand[i]);
          direction.push(1);
        }
      }
    }
  }

  return { upperBand, lowerBand, supertrend, direction };
}

// Calculate Hybrid Supertrend signals
function calculateHybridSignals(candles: OHLCV[]): { buySignals: boolean[]; sellSignals: boolean[]; direction: string[] } {
  const st1 = calculateSupertrend(candles, 1.0, 1);
  const st2 = calculateSupertrend(candles, 2.0, 2);
  const st3 = calculateSupertrend(candles, 3.0, 3);

  const buySignals: boolean[] = [];
  const sellSignals: boolean[] = [];
  const direction: string[] = [];

  for (let i = 0; i < candles.length; i++) {
    const allBullish = st1.direction[i] === 1 && st2.direction[i] === 1 && st3.direction[i] === 1;
    const allBearish = st1.direction[i] === -1 && st2.direction[i] === -1 && st3.direction[i] === -1;

    if (i === 0) {
      buySignals.push(false);
      sellSignals.push(false);
      direction.push(allBullish ? 'bullish' : allBearish ? 'bearish' : 'neutral');
    } else {
      const prevAllBullish = st1.direction[i - 1] === 1 && st2.direction[i - 1] === 1 && st3.direction[i - 1] === 1;
      const prevAllBearish = st1.direction[i - 1] === -1 && st2.direction[i - 1] === -1 && st3.direction[i - 1] === -1;

      buySignals.push(allBullish && !prevAllBullish);
      sellSignals.push(allBearish && !prevAllBearish);
      direction.push(allBullish ? 'bullish' : allBearish ? 'bearish' : 'neutral');
    }
  }

  return { buySignals, sellSignals, direction };
}

// Run backtest
function runBacktest(candles: OHLCV[], symbol: string): BacktestResult | null {
  if (candles.length < 50) return null;

  const { buySignals, sellSignals } = calculateHybridSignals(candles);

  interface Trade {
    type: 'BUY' | 'SELL';
    entryPrice: number;
    exitPrice: number | null;
    pnlPercent: number | null;
  }

  const trades: Trade[] = [];
  let position: 'none' | 'long' | 'short' = 'none';
  let currentTrade: Trade | null = null;

  for (let i = 0; i < candles.length; i++) {
    const buySignal = buySignals[i];
    const sellSignal = sellSignals[i];

    // SELL signal
    if (sellSignal && position !== 'short') {
      if (position === 'long' && currentTrade) {
        const exitPrice = candles[i].close;
        const pnlPercent = ((exitPrice - currentTrade.entryPrice) / currentTrade.entryPrice) * 100;
        currentTrade.exitPrice = exitPrice;
        currentTrade.pnlPercent = pnlPercent;
        trades.push(currentTrade);
      }

      currentTrade = {
        type: 'SELL',
        entryPrice: candles[i].close,
        exitPrice: null,
        pnlPercent: null,
      };
      position = 'short';
    }

    // BUY signal
    if (buySignal && position !== 'long') {
      if (position === 'short' && currentTrade) {
        const exitPrice = candles[i].close;
        const pnlPercent = ((currentTrade.entryPrice - exitPrice) / currentTrade.entryPrice) * 100;
        currentTrade.exitPrice = exitPrice;
        currentTrade.pnlPercent = pnlPercent;
        trades.push(currentTrade);
      }

      currentTrade = {
        type: 'BUY',
        entryPrice: candles[i].close,
        exitPrice: null,
        pnlPercent: null,
      };
      position = 'long';
    }
  }

  // Close any open trade
  if (position !== 'none' && currentTrade) {
    const lastCandle = candles[candles.length - 1];
    const exitPrice = lastCandle.close;
    const pnlPercent = position === 'long'
      ? ((exitPrice - currentTrade.entryPrice) / currentTrade.entryPrice) * 100
      : ((currentTrade.entryPrice - exitPrice) / currentTrade.entryPrice) * 100;

    currentTrade.exitPrice = exitPrice;
    currentTrade.pnlPercent = pnlPercent;
    trades.push(currentTrade);
  }

  if (trades.length === 0) return null;

  const winningTrades = trades.filter(t => (t.pnlPercent || 0) > 0);
  const losingTrades = trades.filter(t => (t.pnlPercent || 0) < 0);
  const totalPnlPercent = trades.reduce((sum, t) => sum + (t.pnlPercent || 0), 0);

  return {
    symbol,
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate: (winningTrades.length / trades.length) * 100,
    totalPnlPercent,
    avgTradeReturn: totalPnlPercent / trades.length,
    maxWin: Math.max(...trades.map(t => t.pnlPercent || 0), 0),
    maxLoss: Math.min(...trades.map(t => t.pnlPercent || 0), 0),
  };
}

// Fetch stock data
async function fetchStockData(symbol: string): Promise<OHLCV[] | null> {
  try {
    const yahooSymbol = `${symbol}.NS`;
    const period2 = Math.floor(Date.now() / 1000);
    const period1 = period2 - (60 * 24 * 60 * 60); // 60 days

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?period1=${period1}&period2=${period2}&interval=15m`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    const chart = data.chart?.result?.[0];
    if (!chart) return null;

    const timestamps = chart.timestamp || [];
    const quote = chart.indicators?.quote?.[0] || {};
    const candles: OHLCV[] = [];

    for (let i = 0; i < timestamps.length; i++) {
      if (
        quote.open?.[i] != null &&
        quote.high?.[i] != null &&
        quote.low?.[i] != null &&
        quote.close?.[i] != null
      ) {
        candles.push({
          date: new Date(timestamps[i] * 1000).toISOString(),
          open: quote.open[i],
          high: quote.high[i],
          low: quote.low[i],
          close: quote.close[i],
          volume: quote.volume?.[i] || 0,
        });
      }
    }

    return candles;
  } catch (error) {
    return null;
  }
}

// Main function
async function main() {
  console.log('='.repeat(80));
  console.log('HYBRID SUPERTREND BACKTEST - ALL F&O STOCKS (15-min, 60 days)');
  console.log('='.repeat(80));
  console.log(`Scanning ${FO_STOCKS.length} stocks...\n`);

  // Add indices
  const allSymbols = ['^NSEI', '^NSEBANK', ...FO_STOCKS];
  const results: BacktestResult[] = [];
  let processed = 0;
  let errors = 0;

  // Process in batches
  const batchSize = 10;
  for (let i = 0; i < allSymbols.length; i += batchSize) {
    const batch = allSymbols.slice(i, i + batchSize);

    const promises = batch.map(async (symbol) => {
      try {
        const isIndex = symbol.startsWith('^');
        const fetchSymbol = isIndex ? symbol.replace('^', '%5E') : symbol;

        let candles: OHLCV[] | null = null;

        if (isIndex) {
          // Fetch index differently
          const period2 = Math.floor(Date.now() / 1000);
          const period1 = period2 - (60 * 24 * 60 * 60);
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${fetchSymbol}?period1=${period1}&period2=${period2}&interval=15m`;

          const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          });

          if (response.ok) {
            const data = await response.json();
            const chart = data.chart?.result?.[0];
            if (chart) {
              const timestamps = chart.timestamp || [];
              const quote = chart.indicators?.quote?.[0] || {};
              candles = [];
              for (let j = 0; j < timestamps.length; j++) {
                if (quote.open?.[j] != null && quote.high?.[j] != null && quote.low?.[j] != null && quote.close?.[j] != null) {
                  candles.push({
                    date: new Date(timestamps[j] * 1000).toISOString(),
                    open: quote.open[j],
                    high: quote.high[j],
                    low: quote.low[j],
                    close: quote.close[j],
                    volume: quote.volume?.[j] || 0,
                  });
                }
              }
            }
          }
        } else {
          candles = await fetchStockData(symbol);
        }

        if (!candles || candles.length < 50) {
          errors++;
          return null;
        }

        const result = runBacktest(candles, symbol);
        processed++;
        return result;
      } catch (error) {
        errors++;
        return null;
      }
    });

    const batchResults = await Promise.all(promises);
    results.push(...batchResults.filter((r): r is BacktestResult => r !== null));

    // Progress
    process.stdout.write(`\rProcessed: ${processed}/${allSymbols.length} (${errors} errors)`);

    // Rate limit delay
    if (i + batchSize < allSymbols.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log('\n\n');

  // Sort by P&L
  results.sort((a, b) => b.totalPnlPercent - a.totalPnlPercent);

  // Categorize
  const recommended = results.filter(r => r.totalPnlPercent >= 5 && r.winRate >= 50);
  const good = results.filter(r => r.totalPnlPercent >= 5 && r.winRate < 50);
  const ok = results.filter(r => r.totalPnlPercent >= 0 && r.totalPnlPercent < 5);
  const avoid = results.filter(r => r.totalPnlPercent < 0);

  // Print results
  console.log('='.repeat(80));
  console.log('✅ HIGHLY RECOMMENDED (P&L >= 5% AND Win Rate >= 50%)');
  console.log('='.repeat(80));
  if (recommended.length === 0) {
    console.log('None found');
  } else {
    console.log('Symbol'.padEnd(15) + 'Win Rate'.padEnd(12) + 'P&L %'.padEnd(12) + 'Trades'.padEnd(10) + 'Avg Trade');
    console.log('-'.repeat(60));
    for (const r of recommended) {
      console.log(
        r.symbol.padEnd(15) +
        `${r.winRate.toFixed(1)}%`.padEnd(12) +
        `${r.totalPnlPercent >= 0 ? '+' : ''}${r.totalPnlPercent.toFixed(2)}%`.padEnd(12) +
        `${r.totalTrades}`.padEnd(10) +
        `${r.avgTradeReturn.toFixed(2)}%`
      );
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('👍 GOOD (P&L >= 5%)');
  console.log('='.repeat(80));
  if (good.length === 0) {
    console.log('None found');
  } else {
    console.log('Symbol'.padEnd(15) + 'Win Rate'.padEnd(12) + 'P&L %'.padEnd(12) + 'Trades'.padEnd(10) + 'Avg Trade');
    console.log('-'.repeat(60));
    for (const r of good) {
      console.log(
        r.symbol.padEnd(15) +
        `${r.winRate.toFixed(1)}%`.padEnd(12) +
        `${r.totalPnlPercent >= 0 ? '+' : ''}${r.totalPnlPercent.toFixed(2)}%`.padEnd(12) +
        `${r.totalTrades}`.padEnd(10) +
        `${r.avgTradeReturn.toFixed(2)}%`
      );
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('⚠️  OK (P&L 0% to 5%) - Top 20');
  console.log('='.repeat(80));
  console.log('Symbol'.padEnd(15) + 'Win Rate'.padEnd(12) + 'P&L %'.padEnd(12) + 'Trades'.padEnd(10) + 'Avg Trade');
  console.log('-'.repeat(60));
  for (const r of ok.slice(0, 20)) {
    console.log(
      r.symbol.padEnd(15) +
      `${r.winRate.toFixed(1)}%`.padEnd(12) +
      `${r.totalPnlPercent >= 0 ? '+' : ''}${r.totalPnlPercent.toFixed(2)}%`.padEnd(12) +
      `${r.totalTrades}`.padEnd(10) +
      `${r.avgTradeReturn.toFixed(2)}%`
    );
  }

  console.log('\n' + '='.repeat(80));
  console.log('❌ AVOID (Negative P&L) - Worst 20');
  console.log('='.repeat(80));
  console.log('Symbol'.padEnd(15) + 'Win Rate'.padEnd(12) + 'P&L %'.padEnd(12) + 'Trades'.padEnd(10) + 'Avg Trade');
  console.log('-'.repeat(60));
  for (const r of avoid.slice(-20).reverse()) {
    console.log(
      r.symbol.padEnd(15) +
      `${r.winRate.toFixed(1)}%`.padEnd(12) +
      `${r.totalPnlPercent >= 0 ? '+' : ''}${r.totalPnlPercent.toFixed(2)}%`.padEnd(12) +
      `${r.totalTrades}`.padEnd(10) +
      `${r.avgTradeReturn.toFixed(2)}%`
    );
  }

  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Stocks Analyzed: ${results.length}`);
  console.log(`Highly Recommended: ${recommended.length}`);
  console.log(`Good: ${good.length}`);
  console.log(`OK: ${ok.length}`);
  console.log(`Avoid: ${avoid.length}`);

  // Output for copy-paste into component
  console.log('\n\n// === COPY THIS TO RecommendedStocks.tsx ===');
  console.log('const RECOMMENDED_STOCKS: RecommendedStock[] = [');

  for (const r of recommended) {
    const cat = r.symbol.startsWith('^') ? 'Index' : 'Stock';
    console.log(`  { symbol: '${r.symbol}', name: '${r.symbol}', winRate: ${r.winRate.toFixed(1)}, totalReturn: ${r.totalPnlPercent.toFixed(2)}, trades: ${r.totalTrades}, rating: 'recommended', category: '${cat}' },`);
  }

  for (const r of good) {
    const cat = r.symbol.startsWith('^') ? 'Index' : 'Stock';
    console.log(`  { symbol: '${r.symbol}', name: '${r.symbol}', winRate: ${r.winRate.toFixed(1)}, totalReturn: ${r.totalPnlPercent.toFixed(2)}, trades: ${r.totalTrades}, rating: 'good', category: '${cat}' },`);
  }

  for (const r of ok.slice(0, 10)) {
    const cat = r.symbol.startsWith('^') ? 'Index' : 'Stock';
    console.log(`  { symbol: '${r.symbol}', name: '${r.symbol}', winRate: ${r.winRate.toFixed(1)}, totalReturn: ${r.totalPnlPercent.toFixed(2)}, trades: ${r.totalTrades}, rating: 'ok', category: '${cat}' },`);
  }

  console.log('];');
}

main().catch(console.error);
