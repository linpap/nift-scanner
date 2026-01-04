// API Route: /api/news
// Fetches market news from multiple RSS sources with 10-minute caching

import { NextRequest, NextResponse } from 'next/server';
import {
  fetchMarketNews,
  fetchStockNews,
  formatNewsForTelegram,
} from '@/lib/news-fetcher';
import { sendTelegramMessage } from '@/lib/notifications';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action') || 'list';
  const symbol = searchParams.get('symbol');
  const refresh = searchParams.get('refresh') === 'true';
  const limit = parseInt(searchParams.get('limit') || '20');

  // Get news for specific stock
  if (action === 'stock' && symbol) {
    try {
      const news = await fetchStockNews(symbol.toUpperCase());
      return NextResponse.json({
        success: true,
        symbol: symbol.toUpperCase(),
        news: news.slice(0, limit),
        count: news.length,
      });
    } catch (error) {
      return NextResponse.json({
        error: 'Failed to fetch stock news',
        details: String(error),
      }, { status: 500 });
    }
  }

  // Get all market news
  if (action === 'list') {
    try {
      const cache = await fetchMarketNews(refresh);
      return NextResponse.json({
        success: true,
        news: cache.items.slice(0, limit),
        count: cache.items.length,
        lastUpdated: new Date(cache.lastUpdated).toISOString(),
        cacheAge: Math.round((Date.now() - cache.lastUpdated) / 1000),
        nextRefresh: Math.max(0, Math.round((600 - (Date.now() - cache.lastUpdated) / 1000))),
      });
    } catch (error) {
      return NextResponse.json({
        error: 'Failed to fetch news',
        details: String(error),
      }, { status: 500 });
    }
  }

  // Send news to Telegram
  if (action === 'notify') {
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramChatId = process.env.TELEGRAM_CHAT_ID;

    if (!telegramBotToken || !telegramChatId) {
      return NextResponse.json({
        error: 'Telegram credentials not configured',
      }, { status: 400 });
    }

    try {
      const cache = await fetchMarketNews();
      const message = formatNewsForTelegram(cache.items, 5);
      const result = await sendTelegramMessage(telegramBotToken, telegramChatId, message);

      return NextResponse.json({
        success: result.success,
        message: result.message,
        newsCount: cache.items.length,
      });
    } catch (error) {
      return NextResponse.json({
        error: 'Failed to send news notification',
        details: String(error),
      }, { status: 500 });
    }
  }

  return NextResponse.json({
    message: 'News API',
    usage: {
      listNews: '/api/news?action=list&limit=20',
      refreshNews: '/api/news?action=list&refresh=true',
      stockNews: '/api/news?action=stock&symbol=RELIANCE',
      notifyTelegram: '/api/news?action=notify',
    },
  });
}
