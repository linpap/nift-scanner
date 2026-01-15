// Sector-wise stock mapping for NSE F&O stocks
// Used for monthly seasonal analysis

export interface SectorInfo {
  id: string;
  name: string;
  description: string;
  seasonalHint: string; // When this sector typically performs well
  stocks: string[];
}

export const SECTORS: SectorInfo[] = [
  {
    id: 'psu',
    name: 'PSU (Public Sector)',
    description: 'Government-owned companies across banking, oil & gas, power, mining',
    seasonalHint: 'Budget session (Feb), Disinvestment announcements',
    stocks: [
      'SBIN', 'BANKBARODA', 'PNB', 'CANBK', 'UNIONBANK', // PSU Banks
      'ONGC', 'IOC', 'BPCL', 'HINDPETRO', 'GAIL', 'PETRONET', // Oil & Gas
      'NTPC', 'POWERGRID', 'NHPC', 'SJVN', 'IRFC', 'PFC', 'RECLTD', // Power
      'COALINDIA', 'NMDC', 'NATIONALUM', 'SAIL', // Mining/Metals
      'BEL', 'HAL', 'BHEL', // Defence/Capital Goods
      'IRCTC', 'CONCOR', 'NBCC', 'NCC', // Infrastructure
    ]
  },
  {
    id: 'psu_banks',
    name: 'PSU Banks',
    description: 'Public sector banking institutions',
    seasonalHint: 'Budget (Feb), Q4 results (Apr-May), Credit growth seasons',
    stocks: ['SBIN', 'BANKBARODA', 'PNB', 'CANBK', 'UNIONBANK', 'INDIANB']
  },
  {
    id: 'private_banks',
    name: 'Private Banks',
    description: 'Private sector banking leaders',
    seasonalHint: 'Festive season (Oct-Nov), Q3 results, RBI policy meets',
    stocks: [
      'HDFCBANK', 'ICICIBANK', 'KOTAKBANK', 'AXISBANK', 'INDUSINDBK',
      'FEDERALBNK', 'IDFCFIRSTB', 'BANDHANBNK', 'AUBANK', 'CUB'
    ]
  },
  {
    id: 'nbfc',
    name: 'NBFC & Financial Services',
    description: 'Non-banking financial companies, insurance, AMCs',
    seasonalHint: 'Festive lending (Oct-Dec), Year-end (Mar)',
    stocks: [
      'BAJFINANCE', 'BAJAJFINSV', 'CHOLAFIN', 'SHRIRAMFIN', 'MUTHOOTFIN',
      'MANAPPURAM', 'LICHSGFIN', 'LTF', 'HDFCAMC', 'ICICIPRULI', 'ICICIGI',
      'SBILIFE', 'HDFCLIFE', 'SBICARD', 'STARHEALTH'
    ]
  },
  {
    id: 'it',
    name: 'IT & Technology',
    description: 'Software services, IT consulting, digital services',
    seasonalHint: 'Q1 (Apr-Jun) deal wins, US earnings season correlation',
    stocks: [
      'TCS', 'INFY', 'WIPRO', 'HCLTECH', 'TECHM', 'LTIM',
      'PERSISTENT', 'COFORGE', 'MPHASIS', 'LTTS', 'TATAELXSI',
      'OFSS', 'NAUKRI'
    ]
  },
  {
    id: 'pharma',
    name: 'Pharma & Healthcare',
    description: 'Pharmaceutical companies, hospitals, diagnostics',
    seasonalHint: 'Monsoon (Jul-Sep) for acute illness, Q4 for chronic',
    stocks: [
      'SUNPHARMA', 'DRREDDY', 'CIPLA', 'DIVISLAB', 'LUPIN',
      'TORNTPHARM', 'ALKEM', 'IPCALAB', 'AUROPHARMA', 'BIOCON',
      'GLENMARK', 'GRANULES', 'LAURUSLABS', 'ZYDUSLIFE', 'SYNGENE',
      'APOLLOHOSP', 'METROPOLIS'
    ]
  },
  {
    id: 'fmcg',
    name: 'FMCG (Consumer Staples)',
    description: 'Fast-moving consumer goods, daily essentials',
    seasonalHint: 'Festive season (Oct-Nov), Rural demand post-monsoon',
    stocks: [
      'HINDUNILVR', 'ITC', 'NESTLEIND', 'BRITANNIA', 'DABUR',
      'MARICO', 'GODREJCP', 'COLPAL', 'TATACONSUM', 'VBL',
      'MCDOWELL-N', 'UBL', 'UNITDSPR'
    ]
  },
  {
    id: 'consumer_durables',
    name: 'Consumer Durables & Appliances',
    description: 'Home appliances, electronics, consumer goods',
    seasonalHint: 'Summer (Mar-Jun) for ACs, Festive (Oct-Nov) for all appliances',
    stocks: [
      'VOLTAS', 'HAVELLS', 'WHIRLPOOL', 'DIXON', 'CROMPTON',
      'TITAN', 'BATAINDIA', 'PAGEIND', 'TRENT', 'DMART'
    ]
  },
  {
    id: 'auto',
    name: 'Automobiles',
    description: 'Cars, two-wheelers, commercial vehicles',
    seasonalHint: 'Festive (Oct-Nov), Year-end (Mar), New model launches',
    stocks: [
      'MARUTI', 'TATAMOTORS', 'M&M', 'BAJAJ-AUTO', 'HEROMOTOCO',
      'EICHERMOT', 'TVSMOTOR', 'ASHOKLEY', 'ESCORTS', 'MRF',
      'BALKRISIND', 'MOTHERSON', 'BOSCHLTD'
    ]
  },
  {
    id: 'auto_ancillary',
    name: 'Auto Ancillaries',
    description: 'Auto parts, tyres, components suppliers',
    seasonalHint: 'Follows auto cycle + exports demand',
    stocks: ['MOTHERSON', 'BOSCHLTD', 'MRF', 'BALKRISIND', 'EXIDEIND']
  },
  {
    id: 'metals',
    name: 'Metals & Mining',
    description: 'Steel, aluminium, copper, mining companies',
    seasonalHint: 'Infrastructure push (Budget Feb), China demand cycles',
    stocks: [
      'TATASTEEL', 'JSWSTEEL', 'HINDALCO', 'VEDL', 'SAIL',
      'JINDALSTEL', 'NMDC', 'NATIONALUM', 'COALINDIA'
    ]
  },
  {
    id: 'oil_gas',
    name: 'Oil & Gas',
    description: 'Exploration, refining, marketing, gas distribution',
    seasonalHint: 'Winter demand (Nov-Feb), Crude price correlation',
    stocks: [
      'RELIANCE', 'ONGC', 'IOC', 'BPCL', 'HINDPETRO',
      'GAIL', 'PETRONET', 'IGL', 'MGL', 'GSPL'
    ]
  },
  {
    id: 'power',
    name: 'Power & Utilities',
    description: 'Power generation, transmission, distribution',
    seasonalHint: 'Summer demand (Mar-Jun), Budget allocations (Feb)',
    stocks: [
      'NTPC', 'POWERGRID', 'TATAPOWER', 'ADANIPOWER', 'ADANIGREEN',
      'TORNTPOWER', 'NHPC', 'SJVN', 'PFC', 'RECLTD', 'IRFC'
    ]
  },
  {
    id: 'infra',
    name: 'Infrastructure & Construction',
    description: 'Engineering, construction, capital goods',
    seasonalHint: 'Budget allocation (Feb-Mar), Q4 order inflows',
    stocks: [
      'LT', 'ADANIPORTS', 'SIEMENS', 'ABB', 'CUMMINSIND',
      'BHEL', 'GMRINFRA', 'NBCC', 'NCC', 'IRCON'
    ]
  },
  {
    id: 'cement',
    name: 'Cement & Building Materials',
    description: 'Cement manufacturers, building materials',
    seasonalHint: 'Construction season (Oct-Mar), Pre-monsoon rush',
    stocks: [
      'ULTRACEMCO', 'SHREECEM', 'AMBUJACEM', 'ACC', 'RAMCOCEM',
      'JKCEMENT', 'PIDILITIND', 'BERGEPAINT', 'ASIANPAINT'
    ]
  },
  {
    id: 'realty',
    name: 'Real Estate',
    description: 'Residential, commercial real estate developers',
    seasonalHint: 'Festive season (Oct-Nov), Rate cut cycles',
    stocks: ['DLF', 'GODREJPROP', 'OBEROIRLTY', 'PRESTIGE', 'BRIGADE']
  },
  {
    id: 'telecom',
    name: 'Telecom & Media',
    description: 'Telecom operators, media, entertainment',
    seasonalHint: 'Tariff hike cycles, 5G rollouts',
    stocks: [
      'BHARTIARTL', 'IDEA', 'INDUSTOWER', 'TATACOMM',
      'ZEEL', 'SUNTV', 'PVRINOX'
    ]
  },
  {
    id: 'chemicals',
    name: 'Chemicals & Specialty',
    description: 'Specialty chemicals, agrochemicals, fertilizers',
    seasonalHint: 'Pre-Kharif (Apr-Jun), Pre-Rabi (Oct-Nov) for agrochem',
    stocks: [
      'PIIND', 'UPL', 'SRF', 'ATUL', 'DEEPAKNTR',
      'NAVINFLUOR', 'GNFC', 'TATACHEM'
    ]
  },
  {
    id: 'defence',
    name: 'Defence & Aerospace',
    description: 'Defence manufacturing, aerospace',
    seasonalHint: 'Budget allocation (Feb), Order announcements',
    stocks: ['HAL', 'BEL', 'BHEL']
  },
  {
    id: 'new_age',
    name: 'New Age Tech',
    description: 'Internet companies, fintech, e-commerce',
    seasonalHint: 'Festive GMV (Oct-Nov), Q4 profitability focus',
    stocks: ['ZOMATO', 'PAYTM', 'POLICYBZR', 'NYKAA', 'DMART']
  },
  {
    id: 'travel',
    name: 'Travel & Hospitality',
    description: 'Airlines, hotels, travel services',
    seasonalHint: 'Holiday seasons (Oct-Jan), Summer vacations (May-Jun)',
    stocks: ['INDIGO', 'IRCTC', 'INDHOTEL', 'LEMON']
  }
];

// Get sector by ID
export function getSector(sectorId: string): SectorInfo | undefined {
  return SECTORS.find(s => s.id === sectorId);
}

// Get all sectors a stock belongs to
export function getStockSectors(symbol: string): SectorInfo[] {
  return SECTORS.filter(s => s.stocks.includes(symbol));
}

// Get all unique stocks across all sectors
export function getAllSectorStocks(): string[] {
  const allStocks = new Set<string>();
  SECTORS.forEach(s => s.stocks.forEach(stock => allStocks.add(stock)));
  return Array.from(allStocks);
}

// Month names for display
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Key market events by month
export const MONTHLY_EVENTS: Record<number, string[]> = {
  1: ['Q3 Results Season', 'Year-end portfolio adjustments'],
  2: ['Union Budget', 'Railway Budget', 'PSU disinvestment news'],
  3: ['Financial Year End', 'Tax-saving investments', 'Advance tax'],
  4: ['New Financial Year', 'Q4 Results begin', 'IT deal wins'],
  5: ['Q4 Results Season', 'Summer demand peak (AC/Coolers)', 'Elections (if any)'],
  6: ['Monsoon onset', 'Kharif sowing', 'Insurance renewals'],
  7: ['Monsoon progress', 'Auto sales recovery', 'Corporate earnings'],
  8: ['Independence Day', 'Festive inventory buildup', 'Q1 Results'],
  9: ['Navratri preparation', 'Auto new launches', 'Festival season begins'],
  10: ['Festive Season Peak (Navratri/Diwali)', 'Auto & FMCG boom', 'Q2 Results'],
  11: ['Diwali (usually)', 'Wedding season', 'Black Friday sales'],
  12: ['Year-end rally', 'FII flows', 'Portfolio rebalancing']
};

// Sector-Month affinity scores (historical patterns)
// Higher score = historically better performance
export const SECTOR_MONTH_AFFINITY: Record<string, Record<number, number>> = {
  'psu': { 1: 60, 2: 90, 3: 75, 4: 55, 5: 50, 6: 45, 7: 50, 8: 55, 9: 60, 10: 55, 11: 50, 12: 55 },
  'psu_banks': { 1: 55, 2: 85, 3: 70, 4: 50, 5: 55, 6: 45, 7: 50, 8: 50, 9: 55, 10: 60, 11: 55, 12: 60 },
  'private_banks': { 1: 55, 2: 60, 3: 65, 4: 50, 5: 55, 6: 50, 7: 55, 8: 55, 9: 60, 10: 75, 11: 70, 12: 65 },
  'nbfc': { 1: 50, 2: 55, 3: 70, 4: 50, 5: 50, 6: 45, 7: 50, 8: 55, 9: 65, 10: 80, 11: 75, 12: 60 },
  'it': { 1: 60, 2: 55, 3: 50, 4: 75, 5: 70, 6: 60, 7: 65, 8: 55, 9: 55, 10: 60, 11: 55, 12: 55 },
  'pharma': { 1: 55, 2: 50, 3: 50, 4: 55, 5: 55, 6: 60, 7: 75, 8: 70, 9: 65, 10: 55, 11: 50, 12: 55 },
  'fmcg': { 1: 50, 2: 50, 3: 55, 4: 55, 5: 55, 6: 50, 7: 55, 8: 60, 9: 70, 10: 85, 11: 80, 12: 65 },
  'consumer_durables': { 1: 50, 2: 55, 3: 75, 4: 85, 5: 80, 6: 70, 7: 55, 8: 55, 9: 65, 10: 85, 11: 80, 12: 60 },
  'auto': { 1: 55, 2: 55, 3: 70, 4: 60, 5: 55, 6: 50, 7: 60, 8: 65, 9: 75, 10: 85, 11: 75, 12: 60 },
  'metals': { 1: 55, 2: 75, 3: 65, 4: 55, 5: 50, 6: 45, 7: 50, 8: 55, 9: 60, 10: 60, 11: 55, 12: 55 },
  'oil_gas': { 1: 55, 2: 60, 3: 55, 4: 50, 5: 50, 6: 50, 7: 50, 8: 50, 9: 55, 10: 55, 11: 65, 12: 70 },
  'power': { 1: 55, 2: 75, 3: 80, 4: 85, 5: 80, 6: 75, 7: 60, 8: 55, 9: 55, 10: 50, 11: 50, 12: 55 },
  'infra': { 1: 60, 2: 80, 3: 75, 4: 60, 5: 55, 6: 50, 7: 50, 8: 55, 9: 60, 10: 60, 11: 55, 12: 65 },
  'cement': { 1: 60, 2: 65, 3: 70, 4: 55, 5: 50, 6: 40, 7: 45, 8: 50, 9: 60, 10: 75, 11: 70, 12: 65 },
  'realty': { 1: 55, 2: 60, 3: 65, 4: 50, 5: 50, 6: 45, 7: 50, 8: 55, 9: 65, 10: 80, 11: 75, 12: 60 },
  'telecom': { 1: 55, 2: 55, 3: 55, 4: 55, 5: 55, 6: 55, 7: 55, 8: 55, 9: 55, 10: 55, 11: 55, 12: 55 },
  'chemicals': { 1: 55, 2: 55, 3: 60, 4: 75, 5: 70, 6: 65, 7: 55, 8: 55, 9: 65, 10: 75, 11: 65, 12: 55 },
  'defence': { 1: 60, 2: 85, 3: 70, 4: 55, 5: 55, 6: 55, 7: 60, 8: 70, 9: 60, 10: 55, 11: 55, 12: 60 },
  'new_age': { 1: 55, 2: 50, 3: 55, 4: 55, 5: 55, 6: 50, 7: 55, 8: 55, 9: 60, 10: 75, 11: 70, 12: 60 },
  'travel': { 1: 55, 2: 50, 3: 55, 4: 60, 5: 75, 6: 70, 7: 55, 8: 55, 9: 60, 10: 75, 11: 70, 12: 80 }
};
