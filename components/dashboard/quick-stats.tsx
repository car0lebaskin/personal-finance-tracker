'use client';

import { holdings, accounts, formatCurrency } from '@/lib/data';
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, BarChart3 } from 'lucide-react';

export function QuickStats() {
  const investablePortfolio = holdings.reduce((s, h) => s + h.value, 0);
  const totalDayChange = holdings.reduce((s, h) => s + h.dayChange, 0);
  const dayChangePct = (totalDayChange / (investablePortfolio - totalDayChange)) * 100;
  const totalReturn = holdings.reduce((s, h) => s + h.totalReturn, 0);
  const totalReturnPct = (totalReturn / (investablePortfolio - totalReturn)) * 100;

  const totalAssets = accounts.filter(a => a.balance > 0).reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = Math.abs(accounts.filter(a => a.balance < 0).reduce((s, a) => s + a.balance, 0));
  const debtToAsset = (totalLiabilities / totalAssets) * 100;

  const stats = [
    {
      label: 'Portfolio Value',
      value: formatCurrency(investablePortfolio, true),
      sub: `${totalDayChange >= 0 ? '+' : ''}${formatCurrency(totalDayChange, true)} today`,
      isUp: totalDayChange >= 0,
      changePct: dayChangePct,
      icon: TrendingUp,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Total Return',
      value: `${totalReturnPct >= 0 ? '+' : ''}${totalReturnPct.toFixed(1)}%`,
      sub: `${formatCurrency(totalReturn, true)} unrealized`,
      isUp: totalReturn >= 0,
      changePct: totalReturnPct,
      icon: BarChart3,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Debt-to-Asset',
      value: `${debtToAsset.toFixed(1)}%`,
      sub: `${formatCurrency(totalLiabilities, true)} liabilities`,
      isUp: false,
      changePct: -2.1,
      icon: Wallet,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 col-span-2 lg:col-span-1">
      {stats.map((s) => (
        <div key={s.label} className="rounded-2xl border border-border/60 bg-card p-5 hover:border-border transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{s.label}</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${s.bg}`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground tracking-tight tabular-nums">{s.value}</p>
          <div className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${s.isUp ? 'text-emerald-400' : 'text-red-400'}`}>
            {s.isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            <span>{s.sub}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
