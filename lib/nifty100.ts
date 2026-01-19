// Nifty 200 Stock List
// Top 200 stocks by market cap on NSE for BTST scanning

export const NIFTY_100 = [
  // Nifty 50 (1-50)
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
  'HINDUNILVR', 'SBIN', 'BHARTIARTL', 'KOTAKBANK', 'ITC',
  'LT', 'AXISBANK', 'BAJFINANCE', 'ASIANPAINT', 'MARUTI',
  'TITAN', 'SUNPHARMA', 'TATAMOTORS', 'ULTRACEMCO', 'NTPC',
  'WIPRO', 'POWERGRID', 'NESTLEIND', 'TECHM', 'HCLTECH',
  'ONGC', 'TATASTEEL', 'JSWSTEEL', 'ADANIENT', 'ADANIPORTS',
  'BAJAJFINSV', 'COALINDIA', 'HINDALCO', 'GRASIM', 'DRREDDY',
  'CIPLA', 'APOLLOHOSP', 'BPCL', 'DIVISLAB', 'EICHERMOT',
  'HEROMOTOCO', 'INDUSINDBK', 'BRITANNIA', 'SBILIFE', 'HDFCLIFE',
  'M&M', 'TATACONSUM', 'BAJAJ-AUTO', 'LTIM', 'TRENT',

  // Nifty Next 50 (51-100)
  'ADANIGREEN', 'ADANIPOWER', 'AMBUJACEM', 'AUROPHARMA', 'BAJAJHLDNG',
  'BANKBARODA', 'BERGEPAINT', 'BIOCON', 'BOSCHLTD', 'CANBK',
  'CHOLAFIN', 'COLPAL', 'CONCOR', 'DABUR', 'DLF',
  'DMART', 'GAIL', 'GODREJCP', 'HAVELLS', 'HDFCAMC',
  'ICICIPRULI', 'ICICIGI', 'INDHOTEL', 'INDIGO', 'IOC',
  'IRCTC', 'JINDALSTEL', 'JSWENERGY', 'LUPIN', 'MARICO',
  'MCDOWELL-N', 'MOTHERSON', 'MUTHOOTFIN', 'NAUKRI', 'NMDC',
  'OFSS', 'PAGEIND', 'PFC', 'PIDILITIND', 'POLYCAB',
  'RECLTD', 'SBICARD', 'SHREECEM', 'SHRIRAMFIN', 'SIEMENS',
  'TORNTPHARM', 'TVSMOTOR', 'VEDL', 'VBL', 'ZOMATO'
];

// Extended list for 200 stocks
export const NIFTY_200 = [
  ...NIFTY_100,

  // Nifty 200 Additional Stocks (101-200)
  'ABB', 'ACC', 'ALKEM', 'ASTRAL', 'ATUL',
  'AUBANK', 'BALKRISIND', 'BANDHANBNK', 'BATAINDIA', 'BEL',
  'BHEL', 'CANFINHOME', 'CGPOWER', 'COFORGE', 'CROMPTON',
  'CUB', 'CUMMINSIND', 'DEEPAKNTR', 'DIXON', 'ESCORTS',
  'EXIDEIND', 'FEDERALBNK', 'GLENMARK', 'GMRINFRA', 'GNFC',
  'GODREJPROP', 'GRANULES', 'GSPL', 'HAL', 'HINDPETRO',
  'IDFCFIRSTB', 'IDFC', 'IGL', 'INDUSTOWER', 'IPCALAB',
  'IRFC', 'JKCEMENT', 'JUBLFOOD', 'KALYANKJIL', 'KEI',
  'KPITTECH', 'LAURUSLABS', 'LICHSGFIN', 'LODHA', 'LTF',
  'LTTS', 'MANAPPURAM', 'MAXHEALTH', 'MCX', 'METROPOLIS',
  'MGL', 'MPHASIS', 'MRF', 'NAM-INDIA', 'NATIONALUM',
  'NAVINFLUOR', 'NBCC', 'NCC', 'NYKAA', 'OBEROIRLTY',
  'PAYTM', 'PEL', 'PERSISTENT', 'PETRONET', 'PIIND',
  'PNB', 'POLICYBZR', 'PVRINOX', 'RAMCOCEM', 'SAIL',
  'SOLARINDS', 'SONACOMS', 'SRF', 'STARHEALTH', 'SUPREMEIND',
  'SUNTV', 'SYNGENE', 'TATACHEM', 'TATACOMM', 'TATAELXSI',
  'TATAPOWER', 'TORNTPOWER', 'TTML', 'UBL', 'UNIONBANK',
  'UNITDSPR', 'UPL', 'VOLTAS', 'WHIRLPOOL', 'ZEEL',
  'ZYDUSLIFE', 'IDEA', 'ABCAPITAL', 'ABFRL', 'AJANTPHARM'
];

export function getNifty100Symbols(): string[] {
  return NIFTY_100;
}

export function getNifty200Symbols(): string[] {
  return NIFTY_200;
}

// BTST Safe Stocks - Based on 6-month backtest results
// These stocks showed consistent wins (>60% win rate) with positive returns
export const BTST_SAFE_STOCKS = [
  { symbol: 'SHRIRAMFIN', winRate: 86, avgReturn: 2.05, bestFor: 'High win rate, consistent' },
  { symbol: 'ASIANPAINT', winRate: 100, avgReturn: 1.41, bestFor: '100% win rate, blue chip' },
  { symbol: 'M&M', winRate: 100, avgReturn: 2.14, bestFor: '100% win rate, auto sector' },
  { symbol: 'CANBK', winRate: 80, avgReturn: 1.16, bestFor: 'PSU bank, high liquidity' },
  { symbol: 'NESTLEIND', winRate: 75, avgReturn: 1.40, bestFor: 'FMCG stable, defensive' },
];

// Stocks to AVOID for BTST (0% win rate in backtest)
export const BTST_AVOID_STOCKS = ['DABUR', 'WIPRO', 'TATACONSUM', 'BAJAJHLDNG', 'BERGEPAINT'];
