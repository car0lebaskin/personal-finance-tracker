'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BarChart3, Home, Landmark, Shield, Wallet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getBreakdown, getTotals, Account } from '@/lib/finance';

function money(value: number, compact = false) {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    maximumFractionDigits: compact ? 1 : 0,
    notation: compact ? 'compact' : 'standard',
  }).format(value || 0);
}

const icons: Record<string, React.ElementType> = {
  Cash: Wallet,
  Investments: BarChart3,
  Crypto: Shield,
  'EPF / Retirement': Landmark,
  Property: Home,
};

export default function PortfolioPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        router.push('/login');
        return;
      }
      const result = await supabase.from('accounts').select('id,name,institution,type,balance,currency');
      if (!result.error && result.data) setAccounts(result.data as Account[]);
      setLoading(false);
    }
    load();
  }, [router]);

  const totals = useMemo(() => getTotals(accounts), [accounts]);
  const breakdown = useMemo(() => getBreakdown(totals), [totals]);
  const debtRatio = totals.assets > 0 ? (totals.liabilities / totals.assets) * 100 : 0;
  const liquidAssets = totals.cash + accounts.filter((a) => a.type === 'crypto' && a.name.toLowerCase().includes('usdt')).reduce((s, a) => s + Number(a.balance), 0);
  const liquidityPct = totals.assets > 0 ? (liquidAssets / totals.assets) * 100 : 0;

  if (loading) return <main className="min-h-screen bg-[#080b08] flex items-center justify-center text-[#d8ded2] text-sm">Loading...</main>;

  return (
    <main className="min-h-screen bg-[#080b08] text-[#f4f5ef]">
      <div className="mx-auto max-w-[680px] min-h-screen relative overflow-hidden pb-10">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_-10%,rgba(148,255,97,0.12),transparent_34%),linear-gradient(180deg,#182016_0%,#080b08_42%)]" />
        <div className="relative px-4 pt-6">
          <header className="flex items-center justify-between mb-6">
            <button onClick={() => router.push('/')} className="h-10 w-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-semibold tracking-tight">Portfolio</h1>
            <div className="h-10 w-10" />
          </header>

          <section className="rounded-[22px] bg-white/[0.05] border border-white/8 p-4 mb-4">
            <p className="text-xs text-[#a8aca3] mb-1">Net worth composition</p>
            <p className="text-3xl font-light tracking-tight">{money(totals.netWorth)}</p>
            <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
              <div className="rounded-2xl bg-black/20 border border-white/8 p-3"><p className="text-[#a8aca3]">Assets</p><p className="font-mono mt-1">{money(totals.assets, true)}</p></div>
              <div className="rounded-2xl bg-black/20 border border-white/8 p-3"><p className="text-[#a8aca3]">Debt</p><p className="font-mono mt-1">{money(totals.liabilities, true)}</p></div>
              <div className="rounded-2xl bg-black/20 border border-white/8 p-3"><p className="text-[#a8aca3]">Ratio</p><p className="font-mono mt-1">{debtRatio.toFixed(0)}%</p></div>
            </div>
          </section>

          <section className="rounded-[22px] bg-white/[0.05] border border-white/8 p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-medium">Asset breakdown</h2>
                <p className="text-xs text-[#a8aca3]">Based on your entered account balances.</p>
              </div>
              <BarChart3 className="h-5 w-5 text-[#a7ff4f]" />
            </div>
            <div className="space-y-4">
              {breakdown.map((item) => {
                const Icon = icons[item.label] ?? Wallet;
                return (
                  <div key={item.label}>
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-8 w-8 rounded-xl bg-[#a7ff4f]/12 flex items-center justify-center shrink-0"><Icon className="h-4 w-4 text-[#a7ff4f]" /></div>
                        <div className="min-w-0">
                          <p className="text-sm truncate">{item.label}</p>
                          <p className="text-[11px] text-[#8d9188] truncate">{item.hint}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-mono">{money(item.value, true)}</p>
                        <p className="text-[11px] text-[#a7ff4f]">{item.pct.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full bg-[#a7ff4f]" style={{ width: `${Math.min(item.pct, 100)}%` }} /></div>
                  </div>
                );
              })}
              {breakdown.length === 0 && <p className="text-sm text-[#a8aca3]">Add accounts to see your breakdown.</p>}
            </div>
          </section>

          <section className="rounded-[22px] bg-white/[0.05] border border-white/8 p-4 mb-4">
            <h2 className="text-base font-medium mb-3">Liquidity score</h2>
            <div className="flex items-end justify-between mb-2">
              <div>
                <p className="text-2xl font-light">{liquidityPct.toFixed(0)}%</p>
                <p className="text-xs text-[#a8aca3]">Cash plus USDT-style liquid assets</p>
              </div>
              <p className="text-xs text-[#a7ff4f]">{liquidityPct >= 25 ? 'Healthy' : liquidityPct >= 10 ? 'Moderate' : 'Low'}</p>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full bg-[#a7ff4f]" style={{ width: `${Math.min(liquidityPct, 100)}%` }} /></div>
          </section>

          <section className="rounded-[22px] bg-white/[0.05] border border-white/8 p-4">
            <h2 className="text-base font-medium mb-2">Debt analysis</h2>
            <p className="text-xs text-[#a8aca3] mb-3">Debt is separated from assets so it does not distort allocation percentages.</p>
            <div className="flex items-center justify-between text-sm"><span>Total liabilities</span><span className="font-mono">{money(totals.liabilities)}</span></div>
            <div className="flex items-center justify-between text-sm mt-2"><span>Debt-to-asset ratio</span><span className="font-mono">{debtRatio.toFixed(1)}%</span></div>
          </section>
        </div>
      </div>
    </main>
  );
}
