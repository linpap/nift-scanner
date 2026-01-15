// Sector-wise stock mapping for NSE F&O stocks
// Used for monthly seasonal analysis

export interface SectorInfo {
  id: string;
  name: string;
  description: string;
  stocks: string[];
}

export const SECTORS: SectorInfo[] = [
  {
    id: 'psu',
    name: 'PSU (Public Sector)',
    description: 'Government-owned companies across banking, oil & gas, power, mining',
    stocks: [
      'SBIN', 'BANKBARODA', 'PNB', 'CANBK', 'UNIONBANK', // PSU Banks
      'ONGC', 'IOC', 'BPCL', 'HINDPETRO', 'GAIL', 'PETRONET', // Oil & Gas
      'NTPC', 'POWERGRID', 'NHPC', 'SJVN', 'IRFC', 'PFC', 'RECLTD', // Power Finance
      'COALINDIA', 'NMDC', 'NATIONALUM', 'SAIL', // Mining/Metals
      'BEL', 'HAL', 'BHEL', // Defence/Capital Goods
      'IRCTC', 'CONCOR', 'NBCC', 'NCC', // Infrastructure
    ]
  },
  {
    id: 'psu_banks',
    name: 'PSU Banks',
    description: 'Public sector banking institutions',
    stocks: ['SBIN', 'BANKBARODA', 'PNB', 'CANBK', 'UNIONBANK', 'INDIANB']
  },
  {
    id: 'power_finance',
    name: 'Power Finance & Infrastructure',
    description: 'Power financing, rural electrification, infrastructure lending',
    stocks: ['PFC', 'RECLTD', 'IRFC', 'POWERGRID', 'NHPC', 'SJVN']
  },
  {
    id: 'private_banks',
    name: 'Private Banks',
    description: 'Private sector banking leaders',
    stocks: [
      'HDFCBANK', 'ICICIBANK', 'KOTAKBANK', 'AXISBANK', 'INDUSINDBK',
      'FEDERALBNK', 'IDFCFIRSTB', 'BANDHANBNK', 'AUBANK', 'CUB'
    ]
  },
  {
    id: 'nbfc',
    name: 'NBFC & Financial Services',
    description: 'Non-banking financial companies, insurance, AMCs',
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
    stocks: [
      'VOLTAS', 'HAVELLS', 'WHIRLPOOL', 'DIXON', 'CROMPTON',
      'TITAN', 'BATAINDIA', 'PAGEIND', 'TRENT', 'DMART',
      'BLUESTARCO', 'AMBER'
    ]
  },
  {
    id: 'auto',
    name: 'Automobiles',
    description: 'Cars, two-wheelers, commercial vehicles',
    stocks: [
      'MARUTI', 'TATAMOTORS', 'M&M', 'BAJAJ-AUTO', 'HEROMOTOCO',
      'EICHERMOT', 'TVSMOTOR', 'ASHOKLEY', 'ESCORTS', 'MRF',
      'BALKRISIND', 'MOTHERSON', 'BOSCHLTD'
    ]
  },
  {
    id: 'metals',
    name: 'Metals & Mining',
    description: 'Steel, aluminium, copper, mining companies',
    stocks: [
      'TATASTEEL', 'JSWSTEEL', 'HINDALCO', 'VEDL', 'SAIL',
      'JINDALSTEL', 'NMDC', 'NATIONALUM', 'COALINDIA'
    ]
  },
  {
    id: 'oil_gas',
    name: 'Oil & Gas',
    description: 'Exploration, refining, marketing, gas distribution',
    stocks: [
      'RELIANCE', 'ONGC', 'IOC', 'BPCL', 'HINDPETRO',
      'GAIL', 'PETRONET', 'IGL', 'MGL', 'GSPL'
    ]
  },
  {
    id: 'power',
    name: 'Power & Utilities',
    description: 'Power generation, transmission, distribution',
    stocks: [
      'NTPC', 'POWERGRID', 'TATAPOWER', 'ADANIPOWER', 'ADANIGREEN',
      'TORNTPOWER', 'NHPC', 'SJVN', 'PFC', 'RECLTD', 'IRFC', 'JSW ENERGY'
    ]
  },
  {
    id: 'infra',
    name: 'Infrastructure & Construction',
    description: 'Engineering, construction, capital goods',
    stocks: [
      'LT', 'ADANIPORTS', 'SIEMENS', 'ABB', 'CUMMINSIND',
      'BHEL', 'GMRINFRA', 'NBCC', 'NCC', 'IRCON'
    ]
  },
  {
    id: 'cement',
    name: 'Cement & Building Materials',
    description: 'Cement manufacturers, building materials',
    stocks: [
      'ULTRACEMCO', 'SHREECEM', 'AMBUJACEM', 'ACC', 'RAMCOCEM',
      'JKCEMENT', 'PIDILITIND', 'BERGEPAINT', 'ASIANPAINT'
    ]
  },
  {
    id: 'realty',
    name: 'Real Estate',
    description: 'Residential, commercial real estate developers',
    stocks: ['DLF', 'GODREJPROP', 'OBEROIRLTY', 'PRESTIGE', 'BRIGADE', 'SOBHA']
  },
  {
    id: 'telecom',
    name: 'Telecom & Media',
    description: 'Telecom operators, media, entertainment',
    stocks: [
      'BHARTIARTL', 'IDEA', 'INDUSTOWER', 'TATACOMM',
      'ZEEL', 'SUNTV', 'PVRINOX'
    ]
  },
  {
    id: 'chemicals',
    name: 'Chemicals & Specialty',
    description: 'Specialty chemicals, agrochemicals, fertilizers',
    stocks: [
      'PIIND', 'UPL', 'SRF', 'ATUL', 'DEEPAKNTR',
      'NAVINFLUOR', 'GNFC', 'TATACHEM'
    ]
  },
  {
    id: 'defence',
    name: 'Defence & Aerospace',
    description: 'Defence manufacturing, aerospace',
    stocks: ['HAL', 'BEL', 'BHEL', 'BEML', 'GRSE']
  },
  {
    id: 'new_age',
    name: 'New Age Tech',
    description: 'Internet companies, fintech, e-commerce',
    stocks: ['ZOMATO', 'PAYTM', 'POLICYBZR', 'NYKAA', 'DMART']
  },
  {
    id: 'travel',
    name: 'Travel & Hospitality',
    description: 'Airlines, hotels, travel services',
    stocks: ['INDIGO', 'IRCTC', 'INDHOTEL', 'LEMONTREE', 'EIHOTEL']
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

// Key market events by month (factual, not performance predictions)
export const MONTHLY_EVENTS: Record<number, string[]> = {
  1: ['Q3 Results Season', 'Year-end portfolio adjustments'],
  2: ['Union Budget presentation', 'Railway Budget'],
  3: ['Financial Year End', 'Advance tax deadlines'],
  4: ['New Financial Year', 'Q4 Results begin'],
  5: ['Q4 Results Season'],
  6: ['Monsoon onset', 'Kharif sowing begins'],
  7: ['Monsoon progress', 'Q1 Results begin'],
  8: ['Q1 Results Season', 'Independence Day'],
  9: ['Festival season preparation'],
  10: ['Festive Season (Navratri/Diwali)', 'Q2 Results'],
  11: ['Diwali period', 'Wedding season'],
  12: ['Year-end', 'FII rebalancing']
};
