// News Fetcher - Uses multiple free sources with caching
// Primary: Google News RSS (no API key, no rate limits)
// Fallback: Economic Times RSS

export interface NewsItem {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  timestamp: number;
  category?: string;
}

export interface NewsCache {
  items: NewsItem[];
  lastUpdated: number;
}

// In-memory cache (10 minute TTL)
let newsCache: NewsCache | null = null;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Parse RSS XML to extract news items
function parseRSSItems(xml: string, source: string): NewsItem[] {
  const items: NewsItem[] = [];

  // Simple regex-based XML parsing (works for RSS feeds)
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  const titleRegex = /<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/;
  const linkRegex = /<link>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/link>/;
  const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/;

  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];

    const titleMatch = titleRegex.exec(itemXml);
    const linkMatch = linkRegex.exec(itemXml);
    const pubDateMatch = pubDateRegex.exec(itemXml);

    if (titleMatch && linkMatch) {
      const title = titleMatch[1]
        .replace(/<!\[CDATA\[|\]\]>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();

      const link = linkMatch[1]
        .replace(/<!\[CDATA\[|\]\]>/g, '')
        .trim();

      const pubDate = pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString();

      // Filter out non-market related news
      const isMarketRelated = /stock|market|nifty|sensex|share|trading|invest|rbi|sebi|ipo|fii|dii|rupee|economy|bank|reliance|tata|infosys|hdfc/i.test(title);

      if (isMarketRelated || source === 'Economic Times') {
        items.push({
          title,
          link,
          source,
          pubDate,
          timestamp: new Date(pubDate).getTime() || Date.now(),
        });
      }
    }
  }

  return items;
}

// Fetch from Google News RSS
async function fetchGoogleNews(): Promise<NewsItem[]> {
  const queries = [
    'Indian+stock+market',
    'NSE+BSE+Nifty',
    'Sensex+trading',
  ];

  const allItems: NewsItem[] = [];

  for (const query of queries) {
    try {
      const url = `https://news.google.com/rss/search?q=${query}&hl=en-IN&gl=IN&ceid=IN:en`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml',
        },
        cache: 'no-store',
      });

      if (response.ok) {
        const xml = await response.text();
        const items = parseRSSItems(xml, 'Google News');
        allItems.push(...items);
      }
    } catch (error) {
      console.error(`Google News fetch error for ${query}:`, error);
    }
  }

  return allItems;
}

// Fetch from Economic Times RSS
async function fetchEconomicTimesNews(): Promise<NewsItem[]> {
  const feeds = [
    'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms',
    'https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms',
  ];

  const allItems: NewsItem[] = [];

  for (const feedUrl of feeds) {
    try {
      const response = await fetch(feedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml',
        },
        cache: 'no-store',
      });

      if (response.ok) {
        const xml = await response.text();
        const items = parseRSSItems(xml, 'Economic Times');
        allItems.push(...items);
      }
    } catch (error) {
      console.error(`ET News fetch error:`, error);
    }
  }

  return allItems;
}

// Fetch from Moneycontrol RSS
async function fetchMoneycontrolNews(): Promise<NewsItem[]> {
  try {
    const url = 'https://www.moneycontrol.com/rss/latestnews.xml';

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
      cache: 'no-store',
    });

    if (response.ok) {
      const xml = await response.text();
      return parseRSSItems(xml, 'Moneycontrol');
    }
  } catch (error) {
    console.error('Moneycontrol fetch error:', error);
  }

  return [];
}

// Main function to fetch all news with caching
export async function fetchMarketNews(forceRefresh: boolean = false): Promise<NewsCache> {
  const now = Date.now();

  // Return cached data if valid and not forcing refresh
  if (!forceRefresh && newsCache && (now - newsCache.lastUpdated) < CACHE_TTL) {
    return newsCache;
  }

  console.log('[NEWS] Fetching fresh news...');

  // Fetch from all sources in parallel
  const [googleNews, etNews, mcNews] = await Promise.all([
    fetchGoogleNews(),
    fetchEconomicTimesNews(),
    fetchMoneycontrolNews(),
  ]);

  // Combine and deduplicate
  const allNews = [...googleNews, ...etNews, ...mcNews];

  // Deduplicate by title similarity
  const seen = new Set<string>();
  const uniqueNews = allNews.filter(item => {
    const normalizedTitle = item.title.toLowerCase().substring(0, 50);
    if (seen.has(normalizedTitle)) {
      return false;
    }
    seen.add(normalizedTitle);
    return true;
  });

  // Sort by timestamp (newest first)
  uniqueNews.sort((a, b) => b.timestamp - a.timestamp);

  // Keep only last 50 items
  const finalNews = uniqueNews.slice(0, 50);

  // Update cache
  newsCache = {
    items: finalNews,
    lastUpdated: now,
  };

  console.log(`[NEWS] Fetched ${finalNews.length} unique news items`);

  return newsCache;
}

// Get news for specific stock
export async function fetchStockNews(symbol: string): Promise<NewsItem[]> {
  try {
    const url = `https://news.google.com/rss/search?q=${symbol}+NSE+stock&hl=en-IN&gl=IN&ceid=IN:en`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
      cache: 'no-store',
    });

    if (response.ok) {
      const xml = await response.text();
      const items = parseRSSItems(xml, 'Google News');
      return items.slice(0, 10);
    }
  } catch (error) {
    console.error(`Stock news fetch error for ${symbol}:`, error);
  }

  return [];
}

// Format news for Telegram notification
export function formatNewsForTelegram(news: NewsItem[], maxItems: number = 5): string {
  if (news.length === 0) {
    return '📰 No market news available at the moment.';
  }

  const timestamp = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
  });

  let message = `📰 <b>Market News Update</b>\n`;
  message += `🕐 ${timestamp} IST\n\n`;

  const topNews = news.slice(0, maxItems);

  topNews.forEach((item, index) => {
    message += `${index + 1}. <a href="${item.link}">${item.title}</a>\n`;
    message += `   <i>${item.source}</i>\n\n`;
  });

  return message;
}
