'use client';

import { holdings, formatCurrency } from '@/lib/data';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useState } from 'react';

const typeColors: Record<string, string> = {
  etf: 'bg-blue-500/15 text-blue-400',
  stock: 'bg-purple-500/15 text-purple-400',
  bond: 'bg-amber-500/15 text-amber-400',
  crypto: 'bg-orange-500/15 text-orange-400',
  reit: 'bg-pink-500/15 text-pink-400',
};

type SortKey = 'value' | 'dayChangePct' | 'totalReturnPct' | 'allocation';

export function HoldingsTable() {
  const [sort, setSort] = useState<SortKey>('value');

  const sorted = [...holdings].sort((a, b) => b[sort] - a[sort]);

  const totalValue = holdings.reduce((s, h) => s + h.value, 0);
  const totalDayChange = holdings.reduce((s, h) => s + h.dayChange, 0);
  const totalReturn = holdings.reduce((s, h) => s + h.totalReturn, 0);
  const totalDayPct = (totalDayChange / (totalValue - totalDayChange)) * 100;

  const cols: { key: SortKey; label: string }[] = [
    { key: 'value', label: 'Value' },
    { key: 'dayChangePct', label: 'Day' },
    { key: 'totalReturnPct', label: 'Total Return' },
    { key: 'allocation', label: 'Allocation' },
  ];

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Holdings</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{holdings.length} positions · {formatCurrency(totalValue, true)}</p>
        </div>
        <div className="flex gap-1 p-1 bg-secondary/60 rounded-lg">
          {cols.map((c) => (
            <button
              key={c.key}
              onClick={() => setSort(c.key)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                sort === c.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Header */}
      <div className="grid grid-cols-12 gap-2 px-2 pb-2 border-b border-border/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        <div className="col-span-4">Asset</div>
        <div className="col-span-2 text-right">Price</div>
        <div className="col-span-2 text-right">Value</div>
        <div className="col-span-2 text-right">Today</div>
        <div className="col-span-2 text-right">Total Return</div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border/30">
        {sorted.map((h) => {
          const dayUp = h.dayChange >= 0;
          const retUp = h.totalReturn >= 0;
          return (
            <div
              key={h.id}
              className="grid grid-cols-12 gap-2 px-2 py-3 hover:bg-white/[0.03] transition-colors cursor-pointer items-center"
            >
              {/* Asset */}
              <div className="col-span-4 flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-xs font-bold text-foreground shrink-0">
                  {h.ticker.slice(0, 3)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-foreground">{h.ticker}</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded uppercase tracking-wide ${typeColors[h.type]}`}>
                      {h.type}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{h.name.split(' ').slice(0, 3).join(' ')}</p>
                </div>
              </div>

              {/* Price */}
              <div className="col-span-2 text-right">
                <p className="text-sm font-medium text-foreground tabular-nums">
                  {formatCurrency(h.currentPrice)}
                </p>
                <p className="text-[11px] text-muted-foreground">{h.shares} shares</p>
              </div>

              {/* Value */}
              <div className="col-span-2 text-right">
                <p className="text-sm font-semibold text-foreground tabular-nums">{formatCurrency(h.value, true)}</p>
                <p className="text-[11px] text-muted-foreground">{h.allocation}%</p>
              </div>

              {/* Day */}
              <div className="col-span-2 text-right">
                <p className={`text-sm font-medium tabular-nums ${dayUp ? 'text-emerald-400' : 'text-red-400'}`}>
                  {dayUp ? '+' : ''}{formatCurrency(h.dayChange, true)}
                </p>
                <p className={`text-[11px] font-medium ${dayUp ? 'text-emerald-400' : 'text-red-400'}`}>
                  {dayUp ? '+' : ''}{h.dayChangePct.toFixed(2)}%
                </p>
              </div>

              {/* Total return */}
              <div className="col-span-2 text-right flex flex-col items-end justify-center gap-0.5">
                <div className={`flex items-center gap-1 text-sm font-semibold tabular-nums ${retUp ? 'text-emerald-400' : 'text-red-400'}`}>
                  {retUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {retUp ? '+' : ''}{formatCurrency(h.totalReturn, true)}
                </div>
                <p className={`text-[11px] font-medium ${retUp ? 'text-emerald-400' : 'text-red-400'}`}>
                  {retUp ? '+' : ''}{h.totalReturnPct.toFixed(1)}%
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer totals */}
      <div className="grid grid-cols-12 gap-2 px-2 pt-3 mt-1 border-t border-border/40 items-center">
        <div className="col-span-4 text-xs font-semibold text-muted-foreground">Total</div>
        <div className="col-span-2" />
        <div className="col-span-2 text-right text-sm font-bold text-foreground">{formatCurrency(totalValue, true)}</div>
        <div className={`col-span-2 text-right text-sm font-semibold ${totalDayChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {totalDayChange >= 0 ? '+' : ''}{formatCurrency(totalDayChange, true)}
        </div>
        <div className={`col-span-2 text-right text-sm font-bold ${totalReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {totalReturn >= 0 ? '+' : ''}{formatCurrency(totalReturn, true)}
        </div>
      </div>
    </div>
  );
}
