// Backtest Script for Hybrid Supertrend Strategy on NIFTY 50
// Tests: Daily, 15m, 5m timeframes over 3 months
// Uses pure Hybrid Supertrend direction changes (without EMA filters for more trades)

import { calculateSupertrend, OHLCV } from '../lib/chart-indicators';

interface Trade {
  type: 'SELL' | 'BUY';
  entryDate: string;
  entryPrice: number;
  exitDate: string | null;
  exitPrice: number | null;
  pnl: number | null;
  pnlPercent: number | null;
  holdingPeriod: number;
}

interface BacktestResult {
  timeframe: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnl: number;
  totalPnlPercent: number;
  avgTradeReturn: number;
  maxWin: number;
  maxLoss: number;
  trades: Trade[];
}

async function fetchStockData(symbol: string, interval: string, days: number): Promise<OHLCV[]> {
  let url: string;

  if (interval === '5m') {
    url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=5d&interval=5m`;
  } else if (interval === '15m') {
    url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=60d&interval=15m`;
  } else {
    const period2 = Math.floor(Date.now() / 1000);
    const period1 = period2 - (days * 24 * 60 * 60);
    url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${period1}&period2=${period2}&interval=1d`;
  }

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  const data = await response.json();
  const chart = data.chart?.result?.[0];
  if (!chart) throw new Error('Failed to fetch data');

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
      const date = new Date(timestamps[i] * 1000);
      candles.push({
        date: interval === '1d'
          ? date.toISOString().split('T')[0]
          : date.toISOString(),
        open: quote.open[i],
        high: quote.high[i],
        low: quote.low[i],
        close: quote.close[i],
        volume: quote.volume?.[i] || 0,
      });
    }
  }

  return candles;
}

// Calculate raw hybrid signals without EMA filters
function calculateHybridSignals(candles: OHLCV[]): { buySignals: boolean[]; sellSignals: boolean[]; direction: string[] } {
  const st1 = calculateSupertrend(candles, 1.0, 1);
  const st2 = calculateSupertrend(candles, 2.0, 2);
  const st3 = calculateSupertrend(candles, 3.0, 3);

  const buySignals: boolean[] = [];
  const sellSignals: boolean[] = [];
  const direction: string[] = [];

  for (let i = 0; i < candles.length; i++) {
    const isBullish = st1.direction[i] < 0 && st2.direction[i] < 0 && st3.direction[i] < 0;
    const isBearish = st1.direction[i] > 0 && st2.direction[i] > 0 && st3.direction[i] > 0;

    const wasBullish = i > 0 && st1.direction[i - 1] < 0 && st2.direction[i - 1] < 0 && st3.direction[i - 1] < 0;
    const wasBearish = i > 0 && st1.direction[i - 1] > 0 && st2.direction[i - 1] > 0 && st3.direction[i - 1] > 0;

    // Pure trend direction change signals (no EMA filter)
    buySignals.push(isBullish && !wasBullish);
    sellSignals.push(isBearish && !wasBearish);
    direction.push(isBullish ? 'bullish' : isBearish ? 'bearish' : 'neutral');
  }

  return { buySignals, sellSignals, direction };
}

function runBacktest(candles: OHLCV[], timeframe: string): BacktestResult {
  const signals = calculateHybridSignals(candles);
  const trades: Trade[] = [];

  let position: 'none' | 'long' | 'short' = 'none';
  let currentTrade: Trade | null = null;

  // Strategy: Enter on FIRST signal, hold until OPPOSITE signal (like the chart shows)
  // BUY = go long, hold until SELL. SELL = go short, hold until BUY.
  for (let i = 10; i < candles.length; i++) {
    const sellSignal = signals.sellSignals[i];
    const buySignal = signals.buySignals[i];

    // SELL signal - only act if we're long or not in position
    if (sellSignal && position !== 'short') {
      // Close long if we have one
      if (position === 'long' && currentTrade) {
        const exitPrice = candles[i].close;
        const pnl = exitPrice - currentTrade.entryPrice;
        const pnlPercent = (pnl / currentTrade.entryPrice) * 100;
        currentTrade.exitDate = candles[i].date;
        currentTrade.exitPrice = exitPrice;
        currentTrade.pnl = pnl;
        currentTrade.pnlPercent = pnlPercent;
        trades.push(currentTrade);
      }

      // Open short position
      currentTrade = {
        type: 'SELL',
        entryDate: candles[i].date,
        entryPrice: candles[i].close,
        exitDate: null,
        exitPrice: null,
        pnl: null,
        pnlPercent: null,
        holdingPeriod: 0,
      };
      position = 'short';
    }

    // BUY signal - only act if we're short or not in position
    if (buySignal && position !== 'long') {
      // Close short if we have one
      if (position === 'short' && currentTrade) {
        const exitPrice = candles[i].close;
        const pnl = currentTrade.entryPrice - exitPrice; // Short P&L is reversed
        const pnlPercent = (pnl / currentTrade.entryPrice) * 100;
        currentTrade.exitDate = candles[i].date;
        currentTrade.exitPrice = exitPrice;
        currentTrade.pnl = pnl;
        currentTrade.pnlPercent = pnlPercent;
        trades.push(currentTrade);
      }

      // Open long position
      currentTrade = {
        type: 'BUY',
        entryDate: candles[i].date,
        entryPrice: candles[i].close,
        exitDate: null,
        exitPrice: null,
        pnl: null,
        pnlPercent: null,
        holdingPeriod: 0,
      };
      position = 'long';
    }
  }

  // Close any open trade at the end
  if (position !== 'none' && currentTrade) {
    const lastCandle = candles[candles.length - 1];
    const exitPrice = lastCandle.close;
    const pnl = position === 'long'
      ? exitPrice - currentTrade.entryPrice
      : currentTrade.entryPrice - exitPrice;
    const pnlPercent = (pnl / currentTrade.entryPrice) * 100;

    currentTrade.exitDate = lastCandle.date + ' (OPEN)';
    currentTrade.exitPrice = exitPrice;
    currentTrade.pnl = pnl;
    currentTrade.pnlPercent = pnlPercent;
    trades.push(currentTrade);
  }

  // Calculate statistics
  const winningTrades = trades.filter(t => (t.pnl || 0) > 0);
  const losingTrades = trades.filter(t => (t.pnl || 0) < 0);
  const totalPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const totalPnlPercent = trades.reduce((sum, t) => sum + (t.pnlPercent || 0), 0);

  return {
    timeframe,
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate: trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0,
    totalPnl,
    totalPnlPercent,
    avgTradeReturn: trades.length > 0 ? totalPnlPercent / trades.length : 0,
    maxWin: Math.max(...trades.map(t => t.pnlPercent || 0), 0),
    maxLoss: Math.min(...trades.map(t => t.pnlPercent || 0), 0),
    trades,
  };
}

async function runBacktestForStock(stockSymbol: string, stockName: string) {
  console.log('\n' + '='.repeat(80));
  console.log(`HYBRID SUPERTREND STRATEGY BACKTEST - ${stockName}`);
  console.log('Strategy: Enter on signal, HOLD until opposite signal (like the chart)');
  console.log('Supertrend settings: ST1(1.0, 1), ST2(2.0, 2), ST3(3.0, 3)');
  console.log('='.repeat(80));

  // Only run 15-min for speed (main timeframe of interest)
  const timeframes = [
    { interval: '15m', days: 60, name: '15-Minute (60 days)' },
  ];

  const summaryResults: { timeframe: string; trades: number; winRate: number; pnl: number }[] = [];

  for (const tf of timeframes) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`TIMEFRAME: ${tf.name}`);
    console.log('='.repeat(60));

    try {
      const candles = await fetchStockData(stockSymbol, tf.interval, tf.days);
      console.log(`Data points: ${candles.length}`);
      console.log(`Period: ${candles[0]?.date} to ${candles[candles.length - 1]?.date}`);

      const result = runBacktest(candles, tf.name);

      console.log(`\n--- RESULTS ---`);
      console.log(`Total Trades: ${result.totalTrades}`);
      console.log(`Winning Trades: ${result.winningTrades}`);
      console.log(`Losing Trades: ${result.losingTrades}`);
      console.log(`Win Rate: ${result.winRate.toFixed(1)}%`);
      console.log(`Total P&L: ${result.totalPnl.toFixed(2)} points (${result.totalPnlPercent.toFixed(2)}%)`);
      console.log(`Avg Return per Trade: ${result.avgTradeReturn.toFixed(2)}%`);
      console.log(`Max Win: ${result.maxWin.toFixed(2)}%`);
      console.log(`Max Loss: ${result.maxLoss.toFixed(2)}%`);

      summaryResults.push({
        timeframe: tf.name,
        trades: result.totalTrades,
        winRate: result.winRate,
        pnl: result.totalPnlPercent,
      });

      // Only show trade log for 15-min (to keep output manageable)
      if (tf.interval === '15m') {
        console.log(`\n--- TRADE LOG (15-Min) ---`);
        result.trades.slice(0, 10).forEach((t, i) => {
          console.log(
            `${i + 1}. ${t.type} @ ${t.entryPrice.toFixed(2)} (${t.entryDate.split('T')[0]}) -> ` +
            `${t.exitPrice?.toFixed(2)} = ${t.pnlPercent?.toFixed(2)}%`
          );
        });
        if (result.trades.length > 10) {
          console.log(`... and ${result.trades.length - 10} more trades`);
        }
      }
    } catch (error) {
      console.error(`Error for ${tf.name}:`, error);
    }
  }

  return summaryResults;
}

async function main() {
  // Top F&O stocks (100+ stocks from NIFTY 200)
  const stocks = [
    // Indices
    { symbol: '^NSEI', name: 'NIFTY 50' },
    { symbol: '^NSEBANK', name: 'BANK NIFTY' },
    // NIFTY 50 - Banks
    { symbol: 'HDFCBANK.NS', name: 'HDFC BANK' },
    { symbol: 'ICICIBANK.NS', name: 'ICICI BANK' },
    { symbol: 'SBIN.NS', name: 'SBI' },
    { symbol: 'KOTAKBANK.NS', name: 'KOTAK BANK' },
    { symbol: 'AXISBANK.NS', name: 'AXIS BANK' },
    { symbol: 'INDUSINDBK.NS', name: 'INDUSIND BANK' },
    { symbol: 'BANDHANBNK.NS', name: 'BANDHAN BANK' },
    { symbol: 'FEDERALBNK.NS', name: 'FEDERAL BANK' },
    { symbol: 'IDFCFIRSTB.NS', name: 'IDFC FIRST' },
    { symbol: 'PNB.NS', name: 'PNB' },
    { symbol: 'AUBANK.NS', name: 'AU BANK' },
    // IT
    { symbol: 'TCS.NS', name: 'TCS' },
    { symbol: 'INFY.NS', name: 'INFOSYS' },
    { symbol: 'WIPRO.NS', name: 'WIPRO' },
    { symbol: 'HCLTECH.NS', name: 'HCL TECH' },
    { symbol: 'TECHM.NS', name: 'TECH MAHINDRA' },
    { symbol: 'LTIM.NS', name: 'LTI MINDTREE' },
    { symbol: 'PERSISTENT.NS', name: 'PERSISTENT' },
    { symbol: 'COFORGE.NS', name: 'COFORGE' },
    { symbol: 'MPHASIS.NS', name: 'MPHASIS' },
    { symbol: 'LTTS.NS', name: 'L&T TECH' },
    // Large Caps
    { symbol: 'RELIANCE.NS', name: 'RELIANCE' },
    { symbol: 'BHARTIARTL.NS', name: 'BHARTI AIRTEL' },
    { symbol: 'ITC.NS', name: 'ITC' },
    { symbol: 'HINDUNILVR.NS', name: 'HUL' },
    { symbol: 'LT.NS', name: 'L&T' },
    { symbol: 'NESTLEIND.NS', name: 'NESTLE' },
    { symbol: 'BRITANNIA.NS', name: 'BRITANNIA' },
    { symbol: 'DABUR.NS', name: 'DABUR' },
    { symbol: 'MARICO.NS', name: 'MARICO' },
    { symbol: 'COLPAL.NS', name: 'COLGATE' },
    { symbol: 'GODREJCP.NS', name: 'GODREJ CP' },
    // Auto
    { symbol: 'MARUTI.NS', name: 'MARUTI' },
    { symbol: 'TATAMOTORS.NS', name: 'TATA MOTORS' },
    { symbol: 'M%26M.NS', name: 'M&M' },
    { symbol: 'BAJAJ-AUTO.NS', name: 'BAJAJ AUTO' },
    { symbol: 'HEROMOTOCO.NS', name: 'HERO MOTO' },
    { symbol: 'EICHERMOT.NS', name: 'EICHER' },
    { symbol: 'TVSMOTOR.NS', name: 'TVS MOTOR' },
    { symbol: 'ASHOKLEY.NS', name: 'ASHOK LEYLAND' },
    { symbol: 'MOTHERSON.NS', name: 'MOTHERSON' },
    { symbol: 'BALKRISIND.NS', name: 'BALKRISHNA' },
    { symbol: 'MRF.NS', name: 'MRF' },
    { symbol: 'BOSCHLTD.NS', name: 'BOSCH' },
    // Financials
    { symbol: 'BAJFINANCE.NS', name: 'BAJAJ FINANCE' },
    { symbol: 'BAJAJFINSV.NS', name: 'BAJAJ FINSERV' },
    { symbol: 'HDFCLIFE.NS', name: 'HDFC LIFE' },
    { symbol: 'SBILIFE.NS', name: 'SBI LIFE' },
    { symbol: 'ICICIPRULI.NS', name: 'ICICI PRU LIFE' },
    { symbol: 'CHOLAFIN.NS', name: 'CHOLA FIN' },
    { symbol: 'SHRIRAMFIN.NS', name: 'SHRIRAM FIN' },
    { symbol: 'MUTHOOTFIN.NS', name: 'MUTHOOT FIN' },
    { symbol: 'MANAPPURAM.NS', name: 'MANAPPURAM' },
    { symbol: 'LICHSGFIN.NS', name: 'LIC HSG FIN' },
    // Metals & Mining
    { symbol: 'TATASTEEL.NS', name: 'TATA STEEL' },
    { symbol: 'JSWSTEEL.NS', name: 'JSW STEEL' },
    { symbol: 'HINDALCO.NS', name: 'HINDALCO' },
    { symbol: 'VEDL.NS', name: 'VEDANTA' },
    { symbol: 'JINDALSTEL.NS', name: 'JINDAL STEEL' },
    { symbol: 'SAIL.NS', name: 'SAIL' },
    { symbol: 'NMDC.NS', name: 'NMDC' },
    { symbol: 'COALINDIA.NS', name: 'COAL INDIA' },
    // Energy & Power
    { symbol: 'ONGC.NS', name: 'ONGC' },
    { symbol: 'NTPC.NS', name: 'NTPC' },
    { symbol: 'POWERGRID.NS', name: 'POWER GRID' },
    { symbol: 'TATAPOWER.NS', name: 'TATA POWER' },
    { symbol: 'ADANIGREEN.NS', name: 'ADANI GREEN' },
    { symbol: 'BPCL.NS', name: 'BPCL' },
    { symbol: 'IOC.NS', name: 'IOC' },
    { symbol: 'GAIL.NS', name: 'GAIL' },
    { symbol: 'PETRONET.NS', name: 'PETRONET' },
    { symbol: 'IGL.NS', name: 'IGL' },
    // Pharma
    { symbol: 'SUNPHARMA.NS', name: 'SUN PHARMA' },
    { symbol: 'DRREDDY.NS', name: 'DR REDDY' },
    { symbol: 'CIPLA.NS', name: 'CIPLA' },
    { symbol: 'DIVISLAB.NS', name: 'DIVIS LAB' },
    { symbol: 'APOLLOHOSP.NS', name: 'APOLLO HOSP' },
    { symbol: 'LUPIN.NS', name: 'LUPIN' },
    { symbol: 'TORNTPHARM.NS', name: 'TORRENT PHARMA' },
    { symbol: 'AUROPHARMA.NS', name: 'AUROBINDO' },
    { symbol: 'BIOCON.NS', name: 'BIOCON' },
    // Cement & Infra
    { symbol: 'ULTRACEMCO.NS', name: 'ULTRATECH' },
    { symbol: 'GRASIM.NS', name: 'GRASIM' },
    { symbol: 'SHREECEM.NS', name: 'SHREE CEMENT' },
    { symbol: 'AMBUJACEM.NS', name: 'AMBUJA' },
    { symbol: 'ACC.NS', name: 'ACC' },
    { symbol: 'DLF.NS', name: 'DLF' },
    { symbol: 'GODREJPROP.NS', name: 'GODREJ PROP' },
    { symbol: 'OBEROIRLTY.NS', name: 'OBEROI REALTY' },
    // Consumer & Retail
    { symbol: 'TITAN.NS', name: 'TITAN' },
    { symbol: 'ASIANPAINT.NS', name: 'ASIAN PAINTS' },
    { symbol: 'PIDILITIND.NS', name: 'PIDILITE' },
    { symbol: 'BERGEPAINT.NS', name: 'BERGER PAINTS' },
    { symbol: 'DMART.NS', name: 'DMART' },
    { symbol: 'TRENT.NS', name: 'TRENT' },
    { symbol: 'PAGEIND.NS', name: 'PAGE IND' },
    { symbol: 'BATAINDIA.NS', name: 'BATA' },
    { symbol: 'JUBLFOOD.NS', name: 'JUBILANT FOOD' },
    { symbol: 'ZOMATO.NS', name: 'ZOMATO' },
    // Defence & Industrial
    { symbol: 'HAL.NS', name: 'HAL' },
    { symbol: 'BEL.NS', name: 'BEL' },
    { symbol: 'SIEMENS.NS', name: 'SIEMENS' },
    { symbol: 'ABB.NS', name: 'ABB' },
    { symbol: 'HAVELLS.NS', name: 'HAVELLS' },
    { symbol: 'VOLTAS.NS', name: 'VOLTAS' },
    { symbol: 'CROMPTON.NS', name: 'CROMPTON' },
    { symbol: 'POLYCAB.NS', name: 'POLYCAB' },
    { symbol: 'DIXON.NS', name: 'DIXON' },
    // Telecom & Others
    { symbol: 'IDEA.NS', name: 'VODAFONE IDEA' },
    { symbol: 'INDUSTOWER.NS', name: 'INDUS TOWERS' },
    { symbol: 'TATACOMM.NS', name: 'TATA COMM' },
    // Adani Group
    { symbol: 'ADANIENT.NS', name: 'ADANI ENT' },
    { symbol: 'ADANIPORTS.NS', name: 'ADANI PORTS' },
    // Others
    { symbol: 'INDIGO.NS', name: 'INDIGO' },
    { symbol: 'IRCTC.NS', name: 'IRCTC' },
    { symbol: 'NAUKRI.NS', name: 'NAUKRI' },
    { symbol: 'TATAELXSI.NS', name: 'TATA ELXSI' },
    { symbol: 'TATACONSUM.NS', name: 'TATA CONSUMER' },
    { symbol: 'UPL.NS', name: 'UPL' },
    { symbol: 'SRF.NS', name: 'SRF' },
    { symbol: 'PIIND.NS', name: 'PI IND' },
    { symbol: 'MCX.NS', name: 'MCX' },
    { symbol: 'CANBK.NS', name: 'CANARA BANK' },
    { symbol: 'RECLTD.NS', name: 'REC' },
    { symbol: 'PFC.NS', name: 'PFC' },
  ];

  const allResults: { stock: string; results: { timeframe: string; trades: number; winRate: number; pnl: number }[] }[] = [];

  for (const stock of stocks) {
    const results = await runBacktestForStock(stock.symbol, stock.name);
    allResults.push({ stock: stock.name, results });
    // Small delay between stocks
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Sort by P&L for summary
  const sortedResults = allResults
    .map(({ stock, results }) => {
      const r15m = results.find(r => r.timeframe.includes('15-Minute'));
      return { stock, ...r15m };
    })
    .filter(r => r.pnl !== undefined)
    .sort((a, b) => (b.pnl || 0) - (a.pnl || 0));

  // Print summary table
  console.log('\n\n' + '='.repeat(100));
  console.log('SUMMARY - ALL STOCKS (15-Minute Timeframe - Sorted by P&L)');
  console.log('='.repeat(100));
  console.log('| Stock              | Trades | Win Rate | Total P&L | Rating     |');
  console.log('|--------------------|--------|----------|-----------|------------|');

  for (const r of sortedResults) {
    const pnlSign = (r.pnl || 0) >= 0 ? '+' : '';
    let rating = '';
    if ((r.pnl || 0) >= 5 && (r.winRate || 0) >= 50) rating = 'RECOMMENDED';
    else if ((r.pnl || 0) >= 5) rating = 'GOOD';
    else if ((r.pnl || 0) >= 0) rating = 'OK';
    else rating = 'AVOID';

    console.log(`| ${r.stock.padEnd(18)} | ${String(r.trades || 0).padStart(6)} | ${(r.winRate || 0).toFixed(1).padStart(6)}% | ${pnlSign}${(r.pnl || 0).toFixed(2).padStart(8)}% | ${rating.padEnd(10)} |`);
  }
  console.log('='.repeat(100));

  // Print recommended stocks
  const recommended = sortedResults.filter(r => (r.pnl || 0) >= 5 && (r.winRate || 0) >= 50);
  const good = sortedResults.filter(r => (r.pnl || 0) >= 5 && (r.winRate || 0) < 50);
  const avoid = sortedResults.filter(r => (r.pnl || 0) < 0);

  console.log('\n' + '='.repeat(100));
  console.log('RECOMMENDED STOCKS FOR THIS STRATEGY (15-Min Timeframe)');
  console.log('='.repeat(100));

  console.log('\n✅ HIGHLY RECOMMENDED (P&L >= 5% AND Win Rate >= 50%):');
  if (recommended.length > 0) {
    recommended.forEach(r => console.log(`   • ${r.stock} - ${r.pnl?.toFixed(2)}% return, ${r.winRate?.toFixed(1)}% win rate`));
  } else {
    console.log('   None in this period');
  }

  console.log('\n👍 GOOD (P&L >= 5% but lower win rate):');
  if (good.length > 0) {
    good.forEach(r => console.log(`   • ${r.stock} - ${r.pnl?.toFixed(2)}% return, ${r.winRate?.toFixed(1)}% win rate`));
  } else {
    console.log('   None in this period');
  }

  console.log('\n❌ AVOID (Negative P&L):');
  if (avoid.length > 0) {
    avoid.forEach(r => console.log(`   • ${r.stock} - ${r.pnl?.toFixed(2)}% return`));
  } else {
    console.log('   None');
  }

  console.log('\n' + '='.repeat(100));
}

main().catch(console.error);
