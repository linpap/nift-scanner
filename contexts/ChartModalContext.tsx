'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface ChartModalContextType {
  selectedStock: { symbol: string; name: string } | null;
  openChart: (symbol: string, name?: string) => void;
  closeChart: () => void;
}

const ChartModalContext = createContext<ChartModalContextType | undefined>(undefined);

export function ChartModalProvider({ children }: { children: ReactNode }) {
  const [selectedStock, setSelectedStock] = useState<{ symbol: string; name: string } | null>(null);

  const openChart = useCallback((symbol: string, name?: string) => {
    // Convert stock symbol to Yahoo format if needed
    let yahooSymbol = symbol;
    let displayName = name || symbol;

    // Handle NSE indices
    if (symbol === 'NIFTY' || symbol === 'NIFTY50') {
      yahooSymbol = '^NSEI';
      displayName = 'NIFTY 50';
    } else if (symbol === 'BANKNIFTY' || symbol === 'NIFTYBANK') {
      yahooSymbol = '^NSEBANK';
      displayName = 'BANK NIFTY';
    } else if (!symbol.startsWith('^') && !symbol.endsWith('.NS')) {
      // Regular NSE stock - add .NS suffix for Yahoo
      yahooSymbol = `${symbol}.NS`;
      displayName = name || symbol;
    }

    setSelectedStock({ symbol: yahooSymbol, name: displayName });
  }, []);

  const closeChart = useCallback(() => {
    setSelectedStock(null);
  }, []);

  return (
    <ChartModalContext.Provider value={{ selectedStock, openChart, closeChart }}>
      {children}
    </ChartModalContext.Provider>
  );
}

export function useChartModal() {
  const context = useContext(ChartModalContext);
  if (context === undefined) {
    throw new Error('useChartModal must be used within a ChartModalProvider');
  }
  return context;
}
