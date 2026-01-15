'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

export type DataSourceType = 'nse' | 'nse-direct' | 'yahoo' | null;

interface DataSourceContextType {
  dataSource: DataSourceType;
  setDataSource: (source: DataSourceType) => void;
  lastUpdated: Date | null;
  setLastUpdated: (date: Date | null) => void;
}

const DataSourceContext = createContext<DataSourceContextType | undefined>(undefined);

export function DataSourceProvider({ children }: { children: ReactNode }) {
  const [dataSource, setDataSource] = useState<DataSourceType>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  return (
    <DataSourceContext.Provider value={{ dataSource, setDataSource, lastUpdated, setLastUpdated }}>
      {children}
    </DataSourceContext.Provider>
  );
}

export function useDataSource() {
  const context = useContext(DataSourceContext);
  if (context === undefined) {
    throw new Error('useDataSource must be used within a DataSourceProvider');
  }
  return context;
}

// Helper to get display text for data source
export function getDataSourceDisplay(source: DataSourceType): { label: string; isRealtime: boolean; color: string } {
  switch (source) {
    case 'nse':
      return { label: 'NSE (Real-time)', isRealtime: true, color: 'text-emerald-400' };
    case 'nse-direct':
      return { label: 'NSE Direct (Real-time)', isRealtime: true, color: 'text-cyan-400' };
    case 'yahoo':
      return { label: 'Yahoo Finance (~15 min delay)', isRealtime: false, color: 'text-yellow-400' };
    default:
      return { label: 'Loading...', isRealtime: false, color: 'text-gray-500' };
  }
}
