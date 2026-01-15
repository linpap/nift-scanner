'use client';

import { useChartModal } from '@/contexts/ChartModalContext';

interface StockLinkProps {
  symbol: string;
  name?: string;
  className?: string;
  children?: React.ReactNode;
}

export default function StockLink({ symbol, name, className = '', children }: StockLinkProps) {
  const { openChart } = useChartModal();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    openChart(symbol, name || symbol);
  };

  return (
    <button
      onClick={handleClick}
      className={`font-mono font-bold text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer transition-colors ${className}`}
    >
      {children || symbol}
    </button>
  );
}
