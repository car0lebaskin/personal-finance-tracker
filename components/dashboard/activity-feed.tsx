'use client';

import { TrendingUp, Briefcase, Building, Coins, BarChart3, Laptop, DollarSign } from 'lucide-react';
import { transactions, formatCurrency } from '@/lib/data';

const iconMap: Record<string, React.ElementType> = {
  TrendingUp, Briefcase, Building, Coins, BarChart3, Laptop, DollarSign,
};

export function ActivityFeed() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Investments & income</p>
        </div>
        <button className="text-xs text-primary hover:underline font-medium">View all</button>
      </div>
      <div className="space-y-1">
        {transactions.map((tx) => {
          const Icon = iconMap[tx.icon] ?? TrendingUp;
          const isIncome = tx.amount > 0;
          const date = new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          return (
            <div
              key={tx.id}
              className="flex items-center justify-between py-3 px-3 rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isIncome ? 'bg-emerald-500/10' : 'bg-secondary'}`}>
                  <Icon className={`w-4 h-4 ${isIncome ? 'text-emerald-400' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{tx.merchant}</p>
                  <p className="text-[11px] text-muted-foreground">{tx.category} · {date}</p>
                </div>
              </div>
              <p className={`text-sm font-semibold tabular-nums ${isIncome ? 'text-emerald-400' : 'text-foreground'}`}>
                {isIncome ? '+' : ''}{formatCurrency(tx.amount)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
