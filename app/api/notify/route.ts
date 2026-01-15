// API Route: /api/notify
// Send notifications via Telegram or WhatsApp

import { NextRequest, NextResponse } from 'next/server';
import {
  sendTelegramMessage,
  sendWhatsAppMessage,
  formatScanResultsForNotification,
  formatScanResultsForWhatsApp,
} from '@/lib/notifications';

// Test notification endpoint
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const platform = searchParams.get('platform') || 'telegram';
  const test = searchParams.get('test') === 'true';

  // Get credentials from env or query params
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN || searchParams.get('bot_token');
  const telegramChatId = process.env.TELEGRAM_CHAT_ID || searchParams.get('chat_id');
  const whatsappPhone = process.env.WHATSAPP_PHONE || searchParams.get('phone');
  const whatsappApiKey = process.env.WHATSAPP_API_KEY || searchParams.get('api_key');

  if (test) {
    const testMessage = '🧪 STOCK Scanner Test Notification\n\nIf you see this, notifications are working!';

    if (platform === 'telegram') {
      if (!telegramBotToken || !telegramChatId) {
        return NextResponse.json({
          error: 'Missing Telegram credentials',
          required: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'],
          hint: 'Set as env vars or pass as query params: bot_token, chat_id',
        }, { status: 400 });
      }

      const result = await sendTelegramMessage(telegramBotToken, telegramChatId, testMessage);
      return NextResponse.json(result);
    }

    if (platform === 'whatsapp') {
      if (!whatsappPhone || !whatsappApiKey) {
        return NextResponse.json({
          error: 'Missing WhatsApp credentials',
          required: ['WHATSAPP_PHONE', 'WHATSAPP_API_KEY'],
          hint: 'Get API key from https://www.callmebot.com/blog/free-api-whatsapp-messages/',
        }, { status: 400 });
      }

      const result = await sendWhatsAppMessage(whatsappPhone, whatsappApiKey, testMessage);
      return NextResponse.json(result);
    }
  }

  return NextResponse.json({
    message: 'Notification API',
    usage: {
      testTelegram: '/api/notify?platform=telegram&test=true&bot_token=XXX&chat_id=YYY',
      testWhatsApp: '/api/notify?platform=whatsapp&test=true&phone=91XXXXXXXXXX&api_key=XXX',
    },
    setup: {
      telegram: {
        step1: 'Create bot via @BotFather on Telegram',
        step2: 'Get chat ID by messaging @userinfobot',
        step3: 'Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID env vars',
      },
      whatsapp: {
        step1: 'Send "I allow callmebot to send me messages" to +34 644 71 67 46',
        step2: 'You will receive your API key',
        step3: 'Set WHATSAPP_PHONE and WHATSAPP_API_KEY env vars',
      },
    },
  });
}

// Send scan results notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      platform = 'telegram',
      scannerName,
      results,
      // Credentials can come from body or env
      botToken = process.env.TELEGRAM_BOT_TOKEN,
      chatId = process.env.TELEGRAM_CHAT_ID,
      phone = process.env.WHATSAPP_PHONE,
      apiKey = process.env.WHATSAPP_API_KEY,
    } = body;

    if (!results || !Array.isArray(results)) {
      return NextResponse.json({ error: 'results array is required' }, { status: 400 });
    }

    if (platform === 'telegram') {
      if (!botToken || !chatId) {
        return NextResponse.json({
          error: 'Missing Telegram credentials',
          hint: 'Pass botToken and chatId in body or set env vars',
        }, { status: 400 });
      }

      const message = formatScanResultsForNotification(scannerName || 'Scanner', results);
      const result = await sendTelegramMessage(botToken, chatId, message);
      return NextResponse.json(result);
    }

    if (platform === 'whatsapp') {
      if (!phone || !apiKey) {
        return NextResponse.json({
          error: 'Missing WhatsApp credentials',
          hint: 'Pass phone and apiKey in body or set env vars',
        }, { status: 400 });
      }

      const message = formatScanResultsForWhatsApp(scannerName || 'Scanner', results);
      const result = await sendWhatsAppMessage(phone, apiKey, message);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid platform. Use telegram or whatsapp' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to send notification',
      details: String(error),
    }, { status: 500 });
  }
}
