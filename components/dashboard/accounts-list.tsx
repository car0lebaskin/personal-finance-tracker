'use client';

import { Landmark, PiggyBank, CreditCard, TrendingUp, BarChart3, Home, Building, Car, Coins } from 'lucide-react';
import { accounts, formatCurrency } from '@/lib/data';

const iconMap: Record<string, React.ElementType> = {
  Landmark, PiggyBank, CreditCard, TrendingUp, BarChart3, Home, Building, Car, Coins,
};

const typeLabel: Record<string, string> = {
  checking: 'Checking',
  savings: 'Savings',
  credit: 'Credit',
  investment: 'Investment',
  loan: 'Loan',
  property: 'Property',
};

const groups: { key: string; label: string; types: string[] }[] = [
  { key: 'cash', label: 'Cash & Savings', types: ['checking', 'savings'] },
  { key: 'investments', label: 'Investments', types: ['investment'] },
  { key: 'property', label: 'Real Estate', types: ['property'] },
  { key: 'debt', label: 'Liabilities', types: ['credit', 'loan'] },
];

export function AccountsList() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-foreground">Accounts</h3>
        <button className="text-xs text-primary hover:underline font-medium">Manage</button>
      </div>
      <div className="space-y-5">
        {groups.map(({ key, label, types }) => {
          const items = accounts.filter(a => types.includes(a.type));
          if (!items.length) return null;
          const groupTotal = items.reduce((s, a) => s + a.balance, 0);
          const isDebt = key === 'debt';
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">{label}</p>
                <p className={`text-[11px] font-bold tabular-nums ${isDebt ? 'text-red-400' : 'text-muted-foreground'}`}>
                  {formatCurrency(groupTotal, true)}
                </p>
              </div>
              <div className="space-y-0.5">
                {items.map((acct) => {
                  const Icon = iconMap[acct.icon] ?? Landmark;
                  const isNeg = acct.balance < 0;
                  return (
                    <div
                      key={acct.id}
                      className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isNeg ? 'bg-red-500/10' : 'bg-primary/10'}`}>
                          <Icon className={`w-4 h-4 ${isNeg ? 'text-red-400' : 'text-primary'}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{acct.name}</p>
                          <p className="text-[11px] text-muted-foreground">{acct.institution} · {typeLabel[acct.type]}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold tabular-nums ${isNeg ? 'text-red-400' : 'text-foreground'}`}>
                          {formatCurrency(acct.balance, true)}
                        </p>
                        {acct.changeAmount !== 0 && (
                          <p className={`text-[11px] font-medium ${acct.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {acct.changePercent >= 0 ? '+' : ''}{acct.changePercent}%
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
