#!/usr/bin/env python3
"""
Deep Analysis of Nifty 100 Stocks - Finding Hidden Patterns
Analyzes 2 years of daily data to find concrete, actionable patterns
"""

import json
import time
from datetime import datetime, timedelta
from collections import defaultdict
import statistics

try:
    import yfinance as yf
    import pandas as pd
    import numpy as np
except ImportError:
    print("Installing required packages...")
    import subprocess
    subprocess.check_call(['pip', 'install', 'yfinance', 'pandas', 'numpy'])
    import yfinance as yf
    import pandas as pd
    import numpy as np

# Nifty 100 stocks (NSE symbols)
NIFTY_100 = [
    # Top 50
    "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "ICICIBANK.NS", "BHARTIARTL.NS",
    "INFY.NS", "SBIN.NS", "ITC.NS", "HINDUNILVR.NS", "LICI.NS",
    "BAJFINANCE.NS", "LT.NS", "KOTAKBANK.NS", "HCLTECH.NS", "AXISBANK.NS",
    "MARUTI.NS", "SUNPHARMA.NS", "TITAN.NS", "ASIANPAINT.NS", "ADANIENT.NS",
    "DMART.NS", "NTPC.NS", "ONGC.NS", "TATAMOTORS.NS", "ULTRACEMCO.NS",
    "COALINDIA.NS", "BAJAJFINSV.NS", "POWERGRID.NS", "WIPRO.NS", "NESTLEIND.NS",
    "M&M.NS", "JSWSTEEL.NS", "TATASTEEL.NS", "ADANIPORTS.NS", "HINDALCO.NS",
    "TECHM.NS", "INDUSINDBK.NS", "GRASIM.NS", "DIVISLAB.NS", "DRREDDY.NS",
    "BRITANNIA.NS", "CIPLA.NS", "BPCL.NS", "EICHERMOT.NS", "APOLLOHOSP.NS",
    "HEROMOTOCO.NS", "TATACONSUM.NS", "SBILIFE.NS", "HDFCLIFE.NS", "BAJAJ-AUTO.NS",
    # Next 50
    "VEDL.NS", "HINDZINC.NS", "ADANIGREEN.NS", "INDIGO.NS", "BANKBARODA.NS",
    "IOC.NS", "JINDALSTEL.NS", "HAVELLS.NS", "DLF.NS", "GODREJCP.NS",
    "PIDILITIND.NS", "DABUR.NS", "SIEMENS.NS", "BOSCHLTD.NS", "ABB.NS",
    "AMBUJACEM.NS", "SHREECEM.NS", "TRENT.NS", "ICICIPRULI.NS", "HDFCAMC.NS",
    "COLPAL.NS", "BERGEPAINT.NS", "MARICO.NS", "NAUKRI.NS", "MUTHOOTFIN.NS",
    "TORNTPHARM.NS", "ZYDUSLIFE.NS", "LUPIN.NS", "MANKIND.NS", "MAXHEALTH.NS",
    "CHOLAFIN.NS", "SHRIRAMFIN.NS", "PFC.NS", "RECLTD.NS", "CANBK.NS",
    "PNB.NS", "IDBI.NS", "FEDERALBNK.NS", "IDFCFIRSTB.NS", "BANDHANBNK.NS",
    "TATAPOWER.NS", "ADANIPOWER.NS", "NHPC.NS", "IRFC.NS", "IRCTC.NS",
    "ZOMATO.NS", "PAYTM.NS", "POLICYBZR.NS", "NYKAA.NS", "HAL.NS"
]

# Sector mapping
SECTOR_MAP = {
    "IT": ["TCS.NS", "INFY.NS", "HCLTECH.NS", "WIPRO.NS", "TECHM.NS", "NAUKRI.NS"],
    "BANKS": ["HDFCBANK.NS", "ICICIBANK.NS", "SBIN.NS", "KOTAKBANK.NS", "AXISBANK.NS", "INDUSINDBK.NS", "BANKBARODA.NS", "PNB.NS", "CANBK.NS", "FEDERALBNK.NS", "IDFCFIRSTB.NS", "BANDHANBNK.NS", "IDBI.NS"],
    "OIL_GAS": ["RELIANCE.NS", "ONGC.NS", "BPCL.NS", "IOC.NS"],
    "METALS": ["TATASTEEL.NS", "JSWSTEEL.NS", "HINDALCO.NS", "VEDL.NS", "HINDZINC.NS", "JINDALSTEL.NS", "COALINDIA.NS"],
    "AUTO": ["MARUTI.NS", "TATAMOTORS.NS", "M&M.NS", "BAJAJ-AUTO.NS", "EICHERMOT.NS", "HEROMOTOCO.NS"],
    "PHARMA": ["SUNPHARMA.NS", "DIVISLAB.NS", "DRREDDY.NS", "CIPLA.NS", "TORNTPHARM.NS", "ZYDUSLIFE.NS", "LUPIN.NS", "MANKIND.NS"],
    "FMCG": ["HINDUNILVR.NS", "ITC.NS", "NESTLEIND.NS", "BRITANNIA.NS", "TATACONSUM.NS", "GODREJCP.NS", "DABUR.NS", "MARICO.NS", "COLPAL.NS"],
    "FINANCE": ["BAJFINANCE.NS", "BAJAJFINSV.NS", "SBILIFE.NS", "HDFCLIFE.NS", "ICICIPRULI.NS", "HDFCAMC.NS", "CHOLAFIN.NS", "SHRIRAMFIN.NS", "PFC.NS", "RECLTD.NS", "MUTHOOTFIN.NS"],
    "INFRA": ["LT.NS", "ADANIPORTS.NS", "ADANIENT.NS", "DLF.NS", "NTPC.NS", "POWERGRID.NS", "TATAPOWER.NS", "ADANIPOWER.NS", "NHPC.NS"],
    "CEMENT": ["ULTRACEMCO.NS", "GRASIM.NS", "AMBUJACEM.NS", "SHREECEM.NS"],
}

def fetch_stock_data(symbol, period="2y"):
    """Fetch historical data for a stock"""
    try:
        stock = yf.Ticker(symbol)
        df = stock.history(period=period)
        if len(df) > 0:
            df['Symbol'] = symbol
            df['Returns'] = df['Close'].pct_change() * 100
            df['Gap'] = ((df['Open'] - df['Close'].shift(1)) / df['Close'].shift(1)) * 100
            df['Intraday'] = ((df['Close'] - df['Open']) / df['Open']) * 100
            df['Volume_Ratio'] = df['Volume'] / df['Volume'].rolling(20).mean()
            return df
    except Exception as e:
        print(f"Error fetching {symbol}: {e}")
    return None

def analyze_gap_patterns(all_data):
    """Analyze what happens after gaps of different sizes"""
    print("\n" + "="*60)
    print("GAP ANALYSIS - What happens after gaps?")
    print("="*60)

    results = {
        'gap_up_small': {'next_day': [], 'next_3_days': [], 'gap_fill_same_day': 0, 'total': 0},  # 0.5-1%
        'gap_up_medium': {'next_day': [], 'next_3_days': [], 'gap_fill_same_day': 0, 'total': 0},  # 1-2%
        'gap_up_large': {'next_day': [], 'next_3_days': [], 'gap_fill_same_day': 0, 'total': 0},  # 2-3%
        'gap_up_huge': {'next_day': [], 'next_3_days': [], 'gap_fill_same_day': 0, 'total': 0},  # >3%
        'gap_down_small': {'next_day': [], 'next_3_days': [], 'gap_fill_same_day': 0, 'total': 0},
        'gap_down_medium': {'next_day': [], 'next_3_days': [], 'gap_fill_same_day': 0, 'total': 0},
        'gap_down_large': {'next_day': [], 'next_3_days': [], 'gap_fill_same_day': 0, 'total': 0},
        'gap_down_huge': {'next_day': [], 'next_3_days': [], 'gap_fill_same_day': 0, 'total': 0},
    }

    for symbol, df in all_data.items():
        if df is None or len(df) < 10:
            continue

        for i in range(1, len(df) - 3):
            gap = df['Gap'].iloc[i]
            if pd.isna(gap):
                continue

            # Determine category
            if 0.5 <= gap < 1:
                cat = 'gap_up_small'
            elif 1 <= gap < 2:
                cat = 'gap_up_medium'
            elif 2 <= gap < 3:
                cat = 'gap_up_large'
            elif gap >= 3:
                cat = 'gap_up_huge'
            elif -1 < gap <= -0.5:
                cat = 'gap_down_small'
            elif -2 < gap <= -1:
                cat = 'gap_down_medium'
            elif -3 < gap <= -2:
                cat = 'gap_down_large'
            elif gap <= -3:
                cat = 'gap_down_huge'
            else:
                continue

            results[cat]['total'] += 1

            # Next day return
            if i + 1 < len(df):
                results[cat]['next_day'].append(df['Returns'].iloc[i + 1])

            # Next 3 days cumulative return
            if i + 3 < len(df):
                cum_return = ((1 + df['Returns'].iloc[i+1:i+4]/100).prod() - 1) * 100
                results[cat]['next_3_days'].append(cum_return)

            # Gap fill same day (for gap ups, low goes below prev close; for gap downs, high goes above prev close)
            prev_close = df['Close'].iloc[i-1]
            if gap > 0 and df['Low'].iloc[i] <= prev_close:
                results[cat]['gap_fill_same_day'] += 1
            elif gap < 0 and df['High'].iloc[i] >= prev_close:
                results[cat]['gap_fill_same_day'] += 1

    # Print results
    for cat, data in results.items():
        if data['total'] < 50:
            continue
        avg_next_day = statistics.mean(data['next_day']) if data['next_day'] else 0
        avg_next_3 = statistics.mean(data['next_3_days']) if data['next_3_days'] else 0
        fill_rate = (data['gap_fill_same_day'] / data['total'] * 100) if data['total'] > 0 else 0
        pos_next_day = len([x for x in data['next_day'] if x > 0]) / len(data['next_day']) * 100 if data['next_day'] else 0

        print(f"\n{cat.upper().replace('_', ' ')} ({data['total']} occurrences):")
        print(f"  Next Day Avg Return: {avg_next_day:.2f}%")
        print(f"  Next Day Positive: {pos_next_day:.1f}%")
        print(f"  Next 3 Days Avg Return: {avg_next_3:.2f}%")
        print(f"  Gap Fill Same Day: {fill_rate:.1f}%")

    return results

def analyze_consecutive_days(all_data):
    """Analyze what happens after consecutive up/down days"""
    print("\n" + "="*60)
    print("CONSECUTIVE DAYS ANALYSIS")
    print("="*60)

    results = {}
    for streak in range(2, 6):
        results[f'up_{streak}'] = {'next_day': [], 'reversal_rate': 0, 'total': 0}
        results[f'down_{streak}'] = {'next_day': [], 'reversal_rate': 0, 'total': 0}

    for symbol, df in all_data.items():
        if df is None or len(df) < 10:
            continue

        for i in range(5, len(df) - 1):
            # Check for consecutive up days
            for streak in range(2, 6):
                if i - streak >= 0:
                    returns = df['Returns'].iloc[i-streak+1:i+1].dropna()
                    if len(returns) == streak:
                        if all(r > 0 for r in returns):
                            results[f'up_{streak}']['total'] += 1
                            next_ret = df['Returns'].iloc[i + 1]
                            if not pd.isna(next_ret):
                                results[f'up_{streak}']['next_day'].append(next_ret)
                                if next_ret < 0:
                                    results[f'up_{streak}']['reversal_rate'] += 1
                        elif all(r < 0 for r in returns):
                            results[f'down_{streak}']['total'] += 1
                            next_ret = df['Returns'].iloc[i + 1]
                            if not pd.isna(next_ret):
                                results[f'down_{streak}']['next_day'].append(next_ret)
                                if next_ret > 0:
                                    results[f'down_{streak}']['reversal_rate'] += 1

    for key, data in results.items():
        if data['total'] < 100:
            continue
        avg_next = statistics.mean(data['next_day']) if data['next_day'] else 0
        reversal = data['reversal_rate'] / len(data['next_day']) * 100 if data['next_day'] else 0

        print(f"\n{key.upper().replace('_', ' ')} DAYS ({data['total']} occurrences):")
        print(f"  Next Day Avg Return: {avg_next:.2f}%")
        print(f"  Reversal Rate: {reversal:.1f}%")

def analyze_volume_patterns(all_data):
    """Analyze what happens after volume spikes"""
    print("\n" + "="*60)
    print("VOLUME SPIKE ANALYSIS")
    print("="*60)

    results = {
        'vol_2x_up': {'next_day': [], 'next_3_days': [], 'total': 0},  # 2x volume on up day
        'vol_2x_down': {'next_day': [], 'next_3_days': [], 'total': 0},  # 2x volume on down day
        'vol_3x_up': {'next_day': [], 'next_3_days': [], 'total': 0},
        'vol_3x_down': {'next_day': [], 'next_3_days': [], 'total': 0},
    }

    for symbol, df in all_data.items():
        if df is None or len(df) < 25:
            continue

        for i in range(21, len(df) - 3):
            vol_ratio = df['Volume_Ratio'].iloc[i]
            ret = df['Returns'].iloc[i]

            if pd.isna(vol_ratio) or pd.isna(ret):
                continue

            if vol_ratio >= 2 and ret > 0:
                cat = 'vol_2x_up' if vol_ratio < 3 else 'vol_3x_up'
            elif vol_ratio >= 2 and ret < 0:
                cat = 'vol_2x_down' if vol_ratio < 3 else 'vol_3x_down'
            else:
                continue

            results[cat]['total'] += 1

            if i + 1 < len(df):
                results[cat]['next_day'].append(df['Returns'].iloc[i + 1])

            if i + 3 < len(df):
                cum_ret = ((1 + df['Returns'].iloc[i+1:i+4]/100).prod() - 1) * 100
                results[cat]['next_3_days'].append(cum_ret)

    for key, data in results.items():
        if data['total'] < 50:
            continue
        avg_next = statistics.mean(data['next_day']) if data['next_day'] else 0
        avg_3d = statistics.mean(data['next_3_days']) if data['next_3_days'] else 0
        pos_rate = len([x for x in data['next_day'] if x > 0]) / len(data['next_day']) * 100 if data['next_day'] else 0

        print(f"\n{key.upper().replace('_', ' ')} ({data['total']} occurrences):")
        print(f"  Next Day Avg Return: {avg_next:.2f}%")
        print(f"  Next Day Positive Rate: {pos_rate:.1f}%")
        print(f"  Next 3 Days Avg Return: {avg_3d:.2f}%")

def analyze_sector_correlations(all_data):
    """Analyze sector lead-lag relationships"""
    print("\n" + "="*60)
    print("SECTOR CORRELATION ANALYSIS")
    print("="*60)

    # Calculate daily sector returns
    sector_returns = {}

    for sector, symbols in SECTOR_MAP.items():
        sector_df = None
        for symbol in symbols:
            if symbol in all_data and all_data[symbol] is not None:
                if sector_df is None:
                    sector_df = all_data[symbol][['Returns']].copy()
                    sector_df.columns = [symbol]
                else:
                    temp = all_data[symbol][['Returns']].copy()
                    temp.columns = [symbol]
                    sector_df = sector_df.join(temp, how='outer')

        if sector_df is not None and len(sector_df.columns) >= 2:
            sector_returns[sector] = sector_df.mean(axis=1).dropna()

    # Analyze when one sector moves big, what happens to others
    print("\nWhen a sector moves >2%, what happens to others NEXT DAY:")

    for sector1, returns1 in sector_returns.items():
        big_up_days = returns1[returns1 > 2].index
        big_down_days = returns1[returns1 < -2].index

        if len(big_up_days) < 20:
            continue

        print(f"\n{sector1} BIG UP (>2%):")
        for sector2, returns2 in sector_returns.items():
            if sector1 == sector2:
                continue
            next_day_returns = []
            for day in big_up_days:
                try:
                    idx = returns2.index.get_loc(day)
                    if idx + 1 < len(returns2):
                        next_day_returns.append(returns2.iloc[idx + 1])
                except:
                    pass
            if len(next_day_returns) >= 10:
                avg = statistics.mean(next_day_returns)
                pos_rate = len([x for x in next_day_returns if x > 0]) / len(next_day_returns) * 100
                print(f"  {sector2}: {avg:.2f}% avg, {pos_rate:.0f}% positive ({len(next_day_returns)} samples)")

def analyze_price_levels(all_data):
    """Analyze what happens at key price levels"""
    print("\n" + "="*60)
    print("PRICE LEVEL BREAKOUT ANALYSIS")
    print("="*60)

    results = {
        '52w_high_breakout': {'next_5_days': [], 'next_20_days': [], 'total': 0},
        '52w_low_breakdown': {'next_5_days': [], 'next_20_days': [], 'total': 0},
        '20d_high_breakout': {'next_5_days': [], 'total': 0},
        '20d_low_breakdown': {'next_5_days': [], 'total': 0},
    }

    for symbol, df in all_data.items():
        if df is None or len(df) < 260:
            continue

        df['52w_high'] = df['High'].rolling(252).max().shift(1)
        df['52w_low'] = df['Low'].rolling(252).min().shift(1)
        df['20d_high'] = df['High'].rolling(20).max().shift(1)
        df['20d_low'] = df['Low'].rolling(20).min().shift(1)

        for i in range(260, len(df) - 20):
            # 52-week high breakout
            if df['Close'].iloc[i] > df['52w_high'].iloc[i] and df['Close'].iloc[i-1] <= df['52w_high'].iloc[i-1]:
                results['52w_high_breakout']['total'] += 1
                if i + 5 < len(df):
                    cum_5d = ((df['Close'].iloc[i+5] / df['Close'].iloc[i]) - 1) * 100
                    results['52w_high_breakout']['next_5_days'].append(cum_5d)
                if i + 20 < len(df):
                    cum_20d = ((df['Close'].iloc[i+20] / df['Close'].iloc[i]) - 1) * 100
                    results['52w_high_breakout']['next_20_days'].append(cum_20d)

            # 52-week low breakdown
            if df['Close'].iloc[i] < df['52w_low'].iloc[i] and df['Close'].iloc[i-1] >= df['52w_low'].iloc[i-1]:
                results['52w_low_breakdown']['total'] += 1
                if i + 5 < len(df):
                    cum_5d = ((df['Close'].iloc[i+5] / df['Close'].iloc[i]) - 1) * 100
                    results['52w_low_breakdown']['next_5_days'].append(cum_5d)
                if i + 20 < len(df):
                    cum_20d = ((df['Close'].iloc[i+20] / df['Close'].iloc[i]) - 1) * 100
                    results['52w_low_breakdown']['next_20_days'].append(cum_20d)

            # 20-day high/low
            if df['Close'].iloc[i] > df['20d_high'].iloc[i]:
                results['20d_high_breakout']['total'] += 1
                if i + 5 < len(df):
                    cum_5d = ((df['Close'].iloc[i+5] / df['Close'].iloc[i]) - 1) * 100
                    results['20d_high_breakout']['next_5_days'].append(cum_5d)

            if df['Close'].iloc[i] < df['20d_low'].iloc[i]:
                results['20d_low_breakdown']['total'] += 1
                if i + 5 < len(df):
                    cum_5d = ((df['Close'].iloc[i+5] / df['Close'].iloc[i]) - 1) * 100
                    results['20d_low_breakdown']['next_5_days'].append(cum_5d)

    for key, data in results.items():
        if data['total'] < 50:
            continue
        avg_5d = statistics.mean(data['next_5_days']) if data['next_5_days'] else 0
        pos_5d = len([x for x in data['next_5_days'] if x > 0]) / len(data['next_5_days']) * 100 if data['next_5_days'] else 0

        print(f"\n{key.upper().replace('_', ' ')} ({data['total']} occurrences):")
        print(f"  Next 5 Days Avg Return: {avg_5d:.2f}%")
        print(f"  Next 5 Days Positive Rate: {pos_5d:.1f}%")

        if 'next_20_days' in data and data['next_20_days']:
            avg_20d = statistics.mean(data['next_20_days'])
            pos_20d = len([x for x in data['next_20_days'] if x > 0]) / len(data['next_20_days']) * 100
            print(f"  Next 20 Days Avg Return: {avg_20d:.2f}%")
            print(f"  Next 20 Days Positive Rate: {pos_20d:.1f}%")

def analyze_intraday_reversal(all_data):
    """Analyze intraday reversal patterns"""
    print("\n" + "="*60)
    print("INTRADAY REVERSAL ANALYSIS")
    print("="*60)

    results = {
        'gap_up_close_red': {'next_day': [], 'total': 0},  # Gap up but closed red
        'gap_down_close_green': {'next_day': [], 'total': 0},  # Gap down but closed green
        'big_intraday_reversal_up': {'next_day': [], 'total': 0},  # Low was 2%+ below open, closed positive
        'big_intraday_reversal_down': {'next_day': [], 'total': 0},  # High was 2%+ above open, closed negative
    }

    for symbol, df in all_data.items():
        if df is None or len(df) < 10:
            continue

        for i in range(1, len(df) - 1):
            gap = df['Gap'].iloc[i]
            intraday = df['Intraday'].iloc[i]
            open_price = df['Open'].iloc[i]
            high = df['High'].iloc[i]
            low = df['Low'].iloc[i]
            close = df['Close'].iloc[i]

            if pd.isna(gap) or pd.isna(intraday):
                continue

            # Gap up but closed red
            if gap > 1 and intraday < -0.5:
                results['gap_up_close_red']['total'] += 1
                results['gap_up_close_red']['next_day'].append(df['Returns'].iloc[i + 1])

            # Gap down but closed green
            if gap < -1 and intraday > 0.5:
                results['gap_down_close_green']['total'] += 1
                results['gap_down_close_green']['next_day'].append(df['Returns'].iloc[i + 1])

            # Big intraday reversal up
            low_from_open = ((low - open_price) / open_price) * 100
            if low_from_open < -2 and close > open_price:
                results['big_intraday_reversal_up']['total'] += 1
                results['big_intraday_reversal_up']['next_day'].append(df['Returns'].iloc[i + 1])

            # Big intraday reversal down
            high_from_open = ((high - open_price) / open_price) * 100
            if high_from_open > 2 and close < open_price:
                results['big_intraday_reversal_down']['total'] += 1
                results['big_intraday_reversal_down']['next_day'].append(df['Returns'].iloc[i + 1])

    for key, data in results.items():
        if data['total'] < 30:
            continue
        avg = statistics.mean(data['next_day']) if data['next_day'] else 0
        pos_rate = len([x for x in data['next_day'] if x > 0]) / len(data['next_day']) * 100 if data['next_day'] else 0

        print(f"\n{key.upper().replace('_', ' ')} ({data['total']} occurrences):")
        print(f"  Next Day Avg Return: {avg:.2f}%")
        print(f"  Next Day Positive Rate: {pos_rate:.1f}%")

def main():
    print("="*60)
    print("NIFTY 100 DEEP PATTERN ANALYSIS")
    print("Analyzing 2 years of daily data")
    print("="*60)

    # Fetch data for all stocks
    all_data = {}
    total = len(NIFTY_100)

    print(f"\nFetching data for {total} stocks...")
    for i, symbol in enumerate(NIFTY_100):
        print(f"  [{i+1}/{total}] {symbol}...", end=" ")
        df = fetch_stock_data(symbol)
        if df is not None:
            all_data[symbol] = df
            print(f"OK ({len(df)} days)")
        else:
            print("FAILED")
        time.sleep(0.1)  # Rate limiting

    print(f"\nSuccessfully fetched data for {len(all_data)} stocks")

    # Run analyses
    gap_results = analyze_gap_patterns(all_data)
    analyze_consecutive_days(all_data)
    analyze_volume_patterns(all_data)
    analyze_sector_correlations(all_data)
    analyze_price_levels(all_data)
    analyze_intraday_reversal(all_data)

    # Summary
    print("\n" + "="*60)
    print("KEY FINDINGS SUMMARY")
    print("="*60)

    print("""
Based on 2 years of Nifty 100 data, the most actionable patterns are:
(See detailed analysis above for statistics)
""")

if __name__ == "__main__":
    main()
