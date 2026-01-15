# STOCK Scanner - NSE F&O Stock Scanner

Real-time stock scanner for NSE F&O stocks. Replicates Chartink-style technical scanners for swing trading.

## Features

- **4 Built-in Scanners:**
  - Range Expansion + Trend (from your Chartink screenshot)
  - 5/20 EMA Crossover
  - 20-Day Breakout
  - EMA 8/21 + RSI

- **Technical Indicators:** EMA, SMA, RSI, Volume analysis
- **Data Source:** Yahoo Finance (free, no API key needed)
- **Auto-refresh:** 5-minute intervals during market hours
- **Vercel Cron:** Automatic scans at 9:30 AM IST

## Quick Start

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Open http://localhost:3000
```

## Deploy to Vercel

1. Push to GitHub
2. Import in Vercel
3. Deploy (no env vars needed)

Cron jobs will run automatically at:
- 9:30 AM IST (market open)
- 9:45 AM IST (first 30 min volatility)

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/scan?scanner=range_expansion&limit=50` | Run scanner |
| `GET /api/stocks?action=list` | List all F&O stocks |
| `GET /api/stocks?action=quote&symbol=RELIANCE` | Get stock quote |
| `GET /api/stocks?action=analysis&symbol=RELIANCE` | Technical analysis |
| `GET /api/cron` | Trigger cron scan manually |

## Scanner Types

| Scanner | ID | Use Case |
|---------|----|---------|
| Range Expansion | `range_expansion` | Volatility breakouts |
| EMA Crossover | `ema_crossover` | Trend following |
| 20-Day Breakout | `breakout` | Momentum plays |
| EMA 8/21 | `ema_8_21` | Short-term signals |

## Data Limitations

- Yahoo Finance data is ~15 minutes delayed during market hours
- End-of-day data is accurate for swing trading
- No intraday (1-min, 5-min) data available free

## For Paper Trading Only

This tool is for educational and paper trading purposes. Not financial advice.
