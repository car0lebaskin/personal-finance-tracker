'use client';

import { TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react';
import { accounts, netWorthHistory, formatCurrency, formatCompact } from '@/lib/data';

export function NetWorthCard() {
  const totalAssets = accounts.filter(a => a.balance > 0).reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = Math.abs(accounts.filter(a => a.balance < 0).reduce((s, a) => s + a.balance, 0));
  const netWorth = totalAssets - totalLiabilities;

  const prev = netWorthHistory[netWorthHistory.length - 2];
  const change = netWorth - prev.netWorth;
  const changePct = (change / prev.netWorth) * 100;
  const isUp = change >= 0;

  const ytdStart = netWorthHistory[0].netWorth;
  const ytdChange = netWorth - ytdStart;
  const ytdPct = (ytdChange / ytdStart) * 100;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 col-span-2 lg:col-span-1">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-emerald-500/5 pointer-events-none rounded-2xl" />
      <div className="relative">
        <div className="flex items-start justify-between mb-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Net Worth</p>
          <span className="text-xs text-muted-foreground border border-border/60 rounded px-2 py-0.5">All time</span>
        </div>

        <div className="flex items-end gap-3 mt-2">
          <h2 className="text-4xl font-bold tracking-tight text-foreground tabular-nums">
            {formatCompact(netWorth)}
          </h2>
          <div className={`flex items-center gap-1 text-sm font-semibold mb-1.5 ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
            {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {isUp ? '+' : ''}{changePct.toFixed(2)}%
          </div>
        </div>

        <p className="text-sm text-muted-foreground mt-0.5">
          {isUp ? '+' : ''}{formatCurrency(change)} this month
        </p>

        <div className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-border/40">
          <div>
            <p className="text-[11px] text-muted-foreground mb-1">Total Assets</p>
            <p className="text-sm font-bold text-foreground">{formatCompact(totalAssets)}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground mb-1">Liabilities</p>
            <p className="text-sm font-bold text-red-400">{formatCompact(totalLiabilities)}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground mb-1">YTD Gain</p>
            <div className="flex items-center gap-1">
              <p className="text-sm font-bold text-emerald-400">+{formatCompact(ytdChange)}</p>
              <ArrowUpRight className="w-3 h-3 text-emerald-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
