'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  href?: string;
  label: string;
  icon: string;
  children?: { href: string; label: string }[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Scanner',
    icon: '📊',
    children: [
      { href: '/dashboard', label: 'Live Scanner' },
      { href: '/dashboard/custom-filter', label: 'Custom Filter' },
      { href: '/dashboard/backtest', label: 'Backtest' },
    ],
  },
  { href: '/dashboard/fno-strategy', label: 'F&O Strategy', icon: '🎯' },
  { href: '/dashboard/month-analysis', label: 'Seasonal', icon: '📅' },
  { href: '/dashboard/direct-plays', label: 'Commodities', icon: '🛢️' },
  { href: '/dashboard/secrets', label: 'Patterns', icon: '🔮' },
  { href: '/dashboard/docs', label: 'Guide', icon: '📖' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set(['Scanner']));

  const toggleMenu = (label: string) => {
    setExpandedMenus(prev => {
      const newSet = new Set(prev);
      if (newSet.has(label)) {
        newSet.delete(label);
      } else {
        newSet.add(label);
      }
      return newSet;
    });
  };

  const isChildActive = (children?: { href: string; label: string }[]) => {
    if (!children) return false;
    return children.some(child => pathname === child.href);
  };

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 min-h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto">
      <div className="p-4">
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isExpanded = expandedMenus.has(item.label);
            const hasChildren = item.children && item.children.length > 0;
            const isActive = item.href ? pathname === item.href : isChildActive(item.children);

            if (hasChildren) {
              return (
                <div key={item.label}>
                  <button
                    onClick={() => toggleMenu(item.label)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive || isExpanded
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    <svg
                      className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isExpanded && (
                    <div className="mt-1 ml-4 pl-4 border-l border-gray-700 space-y-1">
                      {item.children?.map((child) => {
                        const childActive = pathname === child.href;
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`block px-3 py-2 rounded-lg text-sm transition-all ${
                              childActive
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                            }`}
                          >
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href!}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Info Box */}
        <div className="mt-8 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
          <div className="text-xs text-gray-400 mb-2">Backtest Info</div>
          <div className="text-xs text-gray-500 space-y-1">
            <p>• Daily timeframe only</p>
            <p>• Up to 3 years history</p>
            <p>• Yahoo Finance data</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
