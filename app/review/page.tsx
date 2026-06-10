'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BarChart3, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AppLock from '@/components/AppLock';
import type { Account } from '@/lib/finance';

type Snapshot = { account_id: string; snapshot_date: string; balance: number };
type ReviewPoint = { date: string; value: number };

function money(value: number, compact = false) {
  return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: compact ? 1 : 0, notation: compact ? 'compact' : 'standard' }).format(value || 0);
}
function prettyDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
}
function signed(value: number) {
  return `${value >= 0 ? '+' : ''}${money(value, true)}`;
}

function ReviewContent() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const session = await supabase.auth.getSession();
      if (!session.data.session) { router.push('/login'); return; }
      const accountResult = await supabase.from('accounts').select('id,name,institution,type,balance,currency').order('created_at', { ascending: false });
      if (!accountResult.error && accountResult.data) setAccounts(accountResult.data as Account[]);
      const snapshotResult = await supabase.from('account_snapshots').select('account_id,snapshot_date,balance').order('snapshot_date', { ascending: true });
      if (!snapshotResult.error && snapshotResult.data) setSnapshots(snapshotResult.data as Snapshot[]);
      setLoading(false);
    }
    load();
  }, [router]);

  const review = useMemo(() => {
    const dates = Array.from(new Set(snapshots.map((s) => s.snapshot_date))).sort();
    const byAccount = new Map<string, Snapshot[]>();
    snapshots.forEach((s) => byAccount.set(s.account_id, [...(byAccount.get(s.account_id) || []), s]));
    const history: ReviewPoint[] = dates.map((date) => {
      let value = 0;
      accounts.forEach((account) => {
        const list = byAccount.get(account.id) || [];
        const latest = list.filter((s) => s.snapshot_date <= date).at(-1);
        const amount = latest ? Number(latest.balance) : Number(account.balance || 0);
        value += ['loan', 'credit'].includes(account.type) ? -Math.abs(amount) : amount;
      });
      return { date, value };
    });
    const current = history.at(-1)?.value ?? 0;
    const previous = history.length > 1 ? history.at(-2)!.value : current;
    const change = current - previous;
    const pct = previous !== 0 ? (change / previous) * 100 : 0;

    const category = (types: string[], debt = false) => {
      let currentValue = 0;
      let previousValue = 0;
      accounts.filter((a) => types.includes(a.type)).forEach((account) => {
        const list = byAccount.get(account.id) || [];
        const last = history.at(-1)?.date;
        const prev = history.length > 1 ? history.at(-2)?.date : last;
        const lastSnap = list.filter((s) => s.snapshot_date <= last!).at(-1);
        const prevSnap = list.filter((s) => s.snapshot_date <= prev!).at(-1);
        const nowAmount = lastSnap ? Number(lastSnap.balance) : Number(account.balance || 0);
        const prevAmount = prevSnap ? Number(prevSnap.balance) : nowAmount;
        currentValue += debt ? Math.abs(nowAmount) : nowAmount;
        previousValue += debt ? Math.abs(prevAmount) : prevAmount;
      });
      return { currentValue, change: currentValue - previousValue };
    };

    return {
      history,
      current,
      previous,
      change,
      pct,
      categories: [
        { label: 'Cash', ...category(['checking', 'savings', 'cash']) },
        { label: 'Investments', ...category(['investment']) },
        { label: 'Crypto', ...category(['crypto']) },
        { label: 'Retirement', ...category(['retirement']) },
        { label: 'Property', ...category(['property']) },
        { label: 'Debt', ...category(['loan', 'credit'], true) },
      ],
    };
  }, [accounts, snapshots]);

  const biggestMove = review.categories.sort((a, b) => Math.abs(b.change) - Math.abs(a.change))[0];

  if (loading) return <main className="min-h-screen bg-[#080b08] flex items-center justify-center text-[#d8ded2] text-sm">Loading...</main>;

  return <main className="min-h-screen bg-[#080b08] text-[#f4f5ef]"><div className="mx-auto max-w-[680px] min-h-screen relative overflow-hidden"><div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_-10%,rgba(148,255,97,0.12),transparent_34%),linear-gradient(180deg,#182016_0%,#080b08_42%)]"/><div className="relative px-4 pt-6 pb-10"><header className="flex items-center justify-between mb-8"><button onClick={() => router.push('/')} className="h-10 w-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center"><ArrowLeft className="h-5 w-5"/></button><h1 className="text-xl font-semibold tracking-tight">Monthly Review</h1><div className="h-10 w-10"/></header>{review.history.length < 2 && <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-3 mb-4 text-xs text-yellow-100">Add at least two saved snapshots to get a proper monthly review.</div>}<section className="rounded-[28px] bg-white/[0.05] border border-white/8 p-5 mb-4"><p className="text-xs text-[#a8aca3] mb-1">Net worth movement</p><div className="flex items-end justify-between gap-3"><div><p className="text-3xl font-light">{signed(review.change)}</p><p className="text-xs text-[#a8aca3] mt-1">{review.pct >= 0 ? '+' : ''}{review.pct.toFixed(1)}% from previous snapshot</p></div><div className={review.change >= 0 ? 'h-12 w-12 rounded-2xl bg-[#a7ff4f]/15 flex items-center justify-center text-[#a7ff4f]' : 'h-12 w-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-100'}>{review.change >= 0 ? <TrendingUp className="h-6 w-6"/> : <TrendingDown className="h-6 w-6"/>}</div></div><div className="mt-5 grid grid-cols-2 gap-3 text-sm"><div className="rounded-2xl bg-black/20 p-3"><p className="text-xs text-[#a8aca3]">Previous</p><p className="font-mono">{money(review.previous, true)}</p></div><div className="rounded-2xl bg-black/20 p-3"><p className="text-xs text-[#a8aca3]">Current</p><p className="font-mono">{money(review.current, true)}</p></div></div>{review.history.length > 0 && <p className="text-xs text-[#8d9188] mt-3">Latest snapshot: {prettyDate(review.history.at(-1)!.date)}</p>}</section><section className="rounded-[24px] bg-white/[0.05] border border-white/8 p-4 mb-4"><div className="flex items-center gap-2 mb-3"><BarChart3 className="h-4 w-4 text-[#a7ff4f]"/><h2 className="text-base font-medium">Category changes</h2></div><div className="space-y-2">{review.categories.map((item) => <div key={item.label} className="flex items-center justify-between rounded-2xl bg-black/20 px-3 py-3"><div><p className="text-sm">{item.label}</p><p className="text-xs text-[#8d9188]">Current {money(item.currentValue, true)}</p></div><p className={item.change >= 0 ? 'text-sm font-mono text-[#a7ff4f]' : 'text-sm font-mono text-red-100'}>{signed(item.change)}</p></div>)}</div></section><section className="rounded-[24px] bg-white/[0.05] border border-white/8 p-4"><div className="flex items-center gap-2 mb-2"><Wallet className="h-4 w-4 text-[#a7ff4f]"/><h2 className="text-base font-medium">Biggest movement</h2></div><p className="text-sm text-[#a8aca3]">{biggestMove ? `${biggestMove.label} moved by ${signed(biggestMove.change)} since the previous snapshot.` : 'Save snapshots to see your biggest movement.'}</p></section></div></div></main>;
}

export default function ReviewPage() { return <AppLock><ReviewContent /></AppLock>; }
