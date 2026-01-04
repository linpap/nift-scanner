// Notification services - Telegram and WhatsApp (via Twilio/free alternatives)

export interface NotificationResult {
  success: boolean;
  message: string;
  platform: 'telegram' | 'whatsapp';
}

// Telegram Bot API
export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  message: string,
  parseMode: 'HTML' | 'Markdown' = 'HTML'
): Promise<NotificationResult> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: parseMode,
        disable_web_page_preview: true,
      }),
    });

    const data = await response.json();

    if (data.ok) {
      return {
        success: true,
        message: 'Message sent successfully',
        platform: 'telegram',
      };
    } else {
      return {
        success: false,
        message: data.description || 'Failed to send message',
        platform: 'telegram',
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Telegram error: ${error}`,
      platform: 'telegram',
    };
  }
}

// WhatsApp via CallMeBot (Free, no API key needed for personal use)
// User needs to first send a message to get their API key
// Instructions: https://www.callmebot.com/blog/free-api-whatsapp-messages/
export async function sendWhatsAppMessage(
  phoneNumber: string,
  apiKey: string,
  message: string
): Promise<NotificationResult> {
  try {
    const encodedMessage = encodeURIComponent(message);
    const url = `https://api.callmebot.com/whatsapp.php?phone=${phoneNumber}&text=${encodedMessage}&apikey=${apiKey}`;

    const response = await fetch(url);

    if (response.ok) {
      return {
        success: true,
        message: 'WhatsApp message sent',
        platform: 'whatsapp',
      };
    } else {
      return {
        success: false,
        message: `WhatsApp API error: ${response.status}`,
        platform: 'whatsapp',
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `WhatsApp error: ${error}`,
      platform: 'whatsapp',
    };
  }
}

// Format scan results for notification
export function formatScanResultsForNotification(
  scannerName: string,
  results: Array<{
    symbol: string;
    close: number;
    changePercent: number;
    rsi: number;
    score: number;
  }>,
  maxResults: number = 10
): string {
  if (results.length === 0) {
    return `📊 <b>${scannerName}</b>\n\n❌ No stocks match the criteria.`;
  }

  const topResults = results.slice(0, maxResults);
  const timestamp = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
  });

  let message = `📊 <b>${scannerName}</b>\n`;
  message += `🕐 ${timestamp} IST\n`;
  message += `✅ ${results.length} stocks found\n\n`;

  topResults.forEach((stock, index) => {
    const changeIcon = stock.changePercent >= 0 ? '🟢' : '🔴';
    const changeStr = stock.changePercent >= 0
      ? `+${stock.changePercent.toFixed(2)}%`
      : `${stock.changePercent.toFixed(2)}%`;

    message += `${index + 1}. <b>${stock.symbol}</b>\n`;
    message += `   ${changeIcon} ₹${stock.close.toFixed(2)} (${changeStr})\n`;
    message += `   RSI: ${stock.rsi.toFixed(1)} | Score: ${stock.score}\n\n`;
  });

  if (results.length > maxResults) {
    message += `\n... and ${results.length - maxResults} more`;
  }

  message += `\n\n<a href="https://nift-eta.vercel.app">View Full Results</a>`;

  return message;
}

// Format for WhatsApp (plain text, no HTML)
export function formatScanResultsForWhatsApp(
  scannerName: string,
  results: Array<{
    symbol: string;
    close: number;
    changePercent: number;
    rsi: number;
    score: number;
  }>,
  maxResults: number = 10
): string {
  if (results.length === 0) {
    return `📊 ${scannerName}\n\n❌ No stocks match the criteria.`;
  }

  const topResults = results.slice(0, maxResults);
  const timestamp = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
  });

  let message = `📊 *${scannerName}*\n`;
  message += `🕐 ${timestamp} IST\n`;
  message += `✅ ${results.length} stocks found\n\n`;

  topResults.forEach((stock, index) => {
    const changeIcon = stock.changePercent >= 0 ? '🟢' : '🔴';
    const changeStr = stock.changePercent >= 0
      ? `+${stock.changePercent.toFixed(2)}%`
      : `${stock.changePercent.toFixed(2)}%`;

    message += `${index + 1}. *${stock.symbol}*\n`;
    message += `   ${changeIcon} ₹${stock.close.toFixed(2)} (${changeStr})\n`;
    message += `   RSI: ${stock.rsi.toFixed(1)} | Score: ${stock.score}\n\n`;
  });

  if (results.length > maxResults) {
    message += `\n... and ${results.length - maxResults} more`;
  }

  return message;
}
