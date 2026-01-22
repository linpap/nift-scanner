// Nifty vs Bank Nifty Correlation Analysis
// Tests: If Bank Nifty runs but Nifty doesn't, does Nifty catch up next day?

const NIFTY_SYMBOL = '^NSEI';
const BANKNIFTY_SYMBOL = '^NSEBANK';

async function fetchIndexData(symbol, years = 2) {
  const range = years > 1 ? `${years}y` : '1y';
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=1d`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  const data = await response.json();
  const result = data?.chart?.result?.[0];

  if (!result || !result.timestamp) {
    throw new Error(`Failed to fetch ${symbol}`);
  }

  const timestamps = result.timestamp;
  const quote = result.indicators?.quote?.[0] || {};
  const historical = [];

  for (let i = 0; i < timestamps.length; i++) {
    if (quote.close?.[i] != null) {
      historical.push({
        date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
        close: quote.close[i],
      });
    }
  }

  return historical;
}

function calculateDailyChanges(data) {
  const changes = [];
  for (let i = 1; i < data.length; i++) {
    const prevClose = data[i - 1].close;
    const currClose = data[i].close;
    const changePercent = ((currClose - prevClose) / prevClose) * 100;
    changes.push({
      date: data[i].date,
      close: currClose,
      changePercent: changePercent,
    });
  }
  return changes;
}

function analyzeCorrelation(niftyChanges, bankNiftyChanges) {
  // Create a map for quick lookup
  const niftyMap = new Map(niftyChanges.map(d => [d.date, d]));
  const bankNiftyMap = new Map(bankNiftyChanges.map(d => [d.date, d]));

  // Find common dates
  const commonDates = [...niftyMap.keys()].filter(date => bankNiftyMap.has(date));
  commonDates.sort();

  // Thresholds for "significant move"
  const DIVERGENCE_THRESHOLD = 0.5; // Bank Nifty moves 0.5% more than Nifty
  const SIGNIFICANT_MOVE = 0.8; // Bank Nifty moves at least 0.8%

  const divergenceDays = [];

  for (let i = 0; i < commonDates.length - 1; i++) {
    const date = commonDates[i];
    const nextDate = commonDates[i + 1];

    const nifty = niftyMap.get(date);
    const bankNifty = bankNiftyMap.get(date);
    const niftyNext = niftyMap.get(nextDate);

    if (!nifty || !bankNifty || !niftyNext) continue;

    const bankNiftyMove = Math.abs(bankNifty.changePercent);
    const niftyMove = Math.abs(nifty.changePercent);
    const divergence = bankNiftyMove - niftyMove;

    // Bank Nifty moved significantly more than Nifty
    if (divergence >= DIVERGENCE_THRESHOLD && bankNiftyMove >= SIGNIFICANT_MOVE) {
      const bankNiftyDirection = bankNifty.changePercent > 0 ? 'UP' : 'DOWN';
      const niftyNextDirection = niftyNext.changePercent > 0 ? 'UP' : 'DOWN';
      const didCatchUp = bankNiftyDirection === niftyNextDirection;

      divergenceDays.push({
        date,
        nextDate,
        bankNiftyChange: bankNifty.changePercent.toFixed(2),
        niftyChange: nifty.changePercent.toFixed(2),
        divergence: divergence.toFixed(2),
        bankNiftyDirection,
        niftyNextDay: niftyNext.changePercent.toFixed(2),
        niftyNextDirection,
        caughtUp: didCatchUp,
      });
    }
  }

  return divergenceDays;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('   NIFTY vs BANK NIFTY DIVERGENCE ANALYSIS');
  console.log('   Does Nifty catch up when Bank Nifty runs ahead?');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('Fetching 2 years of historical data...\n');

  const [niftyData, bankNiftyData] = await Promise.all([
    fetchIndexData(NIFTY_SYMBOL, 2),
    fetchIndexData(BANKNIFTY_SYMBOL, 2),
  ]);

  console.log(`Nifty data points: ${niftyData.length}`);
  console.log(`Bank Nifty data points: ${bankNiftyData.length}\n`);

  const niftyChanges = calculateDailyChanges(niftyData);
  const bankNiftyChanges = calculateDailyChanges(bankNiftyData);

  const divergenceDays = analyzeCorrelation(niftyChanges, bankNiftyChanges);

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('DIVERGENCE ANALYSIS (Bank Nifty moved 0.5%+ more than Nifty)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Separate by Bank Nifty direction
  const upDivergences = divergenceDays.filter(d => d.bankNiftyDirection === 'UP');
  const downDivergences = divergenceDays.filter(d => d.bankNiftyDirection === 'DOWN');

  // Calculate catch-up rates
  const upCatchUpRate = upDivergences.filter(d => d.caughtUp).length / upDivergences.length * 100;
  const downCatchUpRate = downDivergences.filter(d => d.caughtUp).length / downDivergences.length * 100;
  const totalCatchUpRate = divergenceDays.filter(d => d.caughtUp).length / divergenceDays.length * 100;

  console.log(`Total divergence days found: ${divergenceDays.length}\n`);

  console.log('───────────────────────────────────────────────────────────────');
  console.log('SCENARIO 1: Bank Nifty UP, Nifty lagged');
  console.log('───────────────────────────────────────────────────────────────');
  console.log(`Occurrences: ${upDivergences.length}`);
  console.log(`Nifty went UP next day: ${upDivergences.filter(d => d.caughtUp).length} times`);
  console.log(`Catch-up rate: ${upCatchUpRate.toFixed(1)}%\n`);

  // Show average next-day move when Bank Nifty was up
  const avgNiftyNextWhenBNUp = upDivergences.reduce((sum, d) => sum + parseFloat(d.niftyNextDay), 0) / upDivergences.length;
  console.log(`Avg Nifty move next day: ${avgNiftyNextWhenBNUp.toFixed(2)}%`);

  console.log('\nRecent examples:');
  upDivergences.slice(-5).forEach(d => {
    console.log(`  ${d.date}: BN ${d.bankNiftyChange}% vs N ${d.niftyChange}% → Next day N: ${d.niftyNextDay}% ${d.caughtUp ? '✓' : '✗'}`);
  });

  console.log('\n───────────────────────────────────────────────────────────────');
  console.log('SCENARIO 2: Bank Nifty DOWN, Nifty lagged');
  console.log('───────────────────────────────────────────────────────────────');
  console.log(`Occurrences: ${downDivergences.length}`);
  console.log(`Nifty went DOWN next day: ${downDivergences.filter(d => d.caughtUp).length} times`);
  console.log(`Catch-up rate: ${downCatchUpRate.toFixed(1)}%\n`);

  const avgNiftyNextWhenBNDown = downDivergences.reduce((sum, d) => sum + parseFloat(d.niftyNextDay), 0) / downDivergences.length;
  console.log(`Avg Nifty move next day: ${avgNiftyNextWhenBNDown.toFixed(2)}%`);

  console.log('\nRecent examples:');
  downDivergences.slice(-5).forEach(d => {
    console.log(`  ${d.date}: BN ${d.bankNiftyChange}% vs N ${d.niftyChange}% → Next day N: ${d.niftyNextDay}% ${d.caughtUp ? '✓' : '✗'}`);
  });

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`\nOverall catch-up rate: ${totalCatchUpRate.toFixed(1)}%`);
  console.log(`(Nifty moved in same direction as Bank Nifty's previous move)\n`);

  if (totalCatchUpRate > 55) {
    console.log('📈 FINDING: There IS a tendency for Nifty to follow Bank Nifty!');
    console.log(`   When Bank Nifty diverges, Nifty catches up ${totalCatchUpRate.toFixed(0)}% of the time.`);
  } else if (totalCatchUpRate > 45) {
    console.log('📊 FINDING: No significant catch-up pattern detected.');
    console.log('   The catch-up rate is close to random (50%).');
  } else {
    console.log('📉 FINDING: Nifty tends to NOT follow Bank Nifty divergences.');
    console.log('   This could indicate mean reversion in Bank Nifty instead.');
  }

  // Additional analysis: Magnitude of catch-up
  console.log('\n───────────────────────────────────────────────────────────────');
  console.log('MAGNITUDE ANALYSIS');
  console.log('───────────────────────────────────────────────────────────────');

  const catchUpDays = divergenceDays.filter(d => d.caughtUp);
  const avgDivergence = divergenceDays.reduce((sum, d) => sum + parseFloat(d.divergence), 0) / divergenceDays.length;
  const avgCatchUpMove = catchUpDays.reduce((sum, d) => sum + Math.abs(parseFloat(d.niftyNextDay)), 0) / catchUpDays.length;

  console.log(`Average divergence amount: ${avgDivergence.toFixed(2)}%`);
  console.log(`Average catch-up move size: ${avgCatchUpMove.toFixed(2)}%`);

  // Correlation coefficient
  const niftyNextMoves = divergenceDays.map(d => parseFloat(d.niftyNextDay));
  const bankNiftyMoves = divergenceDays.map(d => parseFloat(d.bankNiftyChange));

  const correlation = calculateCorrelation(bankNiftyMoves, niftyNextMoves);
  console.log(`\nCorrelation (BN move vs N next day): ${correlation.toFixed(3)}`);

  if (correlation > 0.2) {
    console.log('→ Positive correlation suggests catch-up pattern exists');
  } else if (correlation < -0.2) {
    console.log('→ Negative correlation suggests mean reversion');
  } else {
    console.log('→ Weak correlation - no predictable pattern');
  }
}

function calculateCorrelation(x, y) {
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
  const sumX2 = x.reduce((total, xi) => total + xi * xi, 0);
  const sumY2 = y.reduce((total, yi) => total + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  return denominator === 0 ? 0 : numerator / denominator;
}

main().catch(console.error);
