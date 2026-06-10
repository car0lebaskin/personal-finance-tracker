'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BarChart3, ShieldAlert, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AppLock from '@/components/AppLock';
import type { Account } from '@/lib/finance';
import { accountPairSuggestions, buildTrend, monthlyReview, type SnapshotPoint } from '@/lib/insights';

function money(value: number, compact = false) {
  return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: compact ? 1 : 0, notation: compact ? 'compact' : 'standard' }).format(value || 0);
}
function prettyDate(value: string) {
  if (value === 'Current') return 'Current';
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
}
function signed(value: number) { return `${value >= 0 ? '+' : ''}${money(value, true)}`; }

function ReviewContent() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [snapshots, setSnapshots] = useState<SnapshotPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const session = await supabase.auth.getSession();
      if (!session.data.session) { router.push('/login'); return; }
      const accountResult = await supabase.from('accounts').select('id,name,institution,type,balance,currency').order('created_at', { ascending: false });
      if (!accountResult.error && accountResult.data) setAccounts(accountResult.data as Account[]);
      const snapshotResult = await supabase.from('account_snapshots').select('account_id,snapshot_date,balance').order('snapshot_date', { ascending: true });
      if (!snapshotResult.error && snapshotResult.data) setSnapshots(snapshotResult.data as SnapshotPoint[]);
      setLoading(false);
    }
    load();
  }, [router]);

  const trend = useMemo(() => buildTrend(accounts, snapshots), [accounts, snapshots]);
  const review = useMemo(() => monthlyReview(accounts, snapshots), [accounts, snapshots]);
  const pairs = useMemo(() => accountPairSuggestions(accounts), [accounts]);
  const chart = useMemo(() => {
    const points = trend;
    const max = Math.max(...points.flatMap((p) => [p.assets, p.netWorth]), 1);
    const min = Math.min(...points.map((p) => p.netWorth), 0);
    const range = Math.max(max - min, 1);
    const coords = points.map((p, i) => ({ ...p, x: points.length === 1 ? 350 : 35 + (i * 630) / (points.length - 1), netY: 170 - ((p.netWorth - min) / range) * 125, assetY: 170 - ((p.assets - min) / range) * 125 }));
    return { coords, netPath: coords.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.netY}`).join(' '), assetPath: coords.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.assetY}`).join(' ') };
  }, [trend]);

  const biggestMove = trend.length > 1 ? trend[trend.length - 1].monthlyChange : 0;

  if (loading) return <main className="min-h-screen bg-[#080b08] flex items-center justify-center text-[#d8ded2] text-sm">Loading...</main>;

  return <main className="min-h-screen bg-[#080b08] text-[#f4f5ef]"><div className="mx-auto max-w-[680px] min-h-screen relative overflow-hidden"><div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_-10%,rgba(148,255,97,0.12),transparent_34%),linear-gradient(180deg,#182016_0%,#080b08_42%)]"/><div className="relative px-4 pt-6 pb-10"><header className="flex items-center justify-between mb-8"><button onClick={() => router.push('/')} className="h-10 w-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center"><ArrowLeft className="h-5 w-5"/></button><h1 className="text-xl font-semibold tracking-tight">Monthly Review</h1><div className="h-10 w-10"/></header>{trend.length < 2 && <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-3 mb-4 text-xs text-yellow-100">Add at least two saved snapshots to get a proper month-to-month report.</div>}<section className="rounded-[28px] bg-white/[0.05] border border-white/8 p-5 mb-4"><p className="text-xs text-[#a8aca3] mb-1">Net worth movement</p><div className="flex items-end justify-between gap-3"><div><p className="text-3xl font-light">{signed(review.change)}</p><p className="text-xs text-[#a8aca3] mt-1">{review.previous ? 'Since previous snapshot' : 'Snapshot history needed'}</p></div><div className={review.change >= 0 ? 'h-12 w-12 rounded-2xl bg-[#a7ff4f]/15 flex items-center justify-center text-[#a7ff4f]' : 'h-12 w-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-100'}>{review.change >= 0 ? <TrendingUp className="h-6 w-6"/> : <TrendingDown className="h-6 w-6"/>}</div></div><div className="h-[180px] -mx-5 mt-5 border-y border-white/10 relative"><svg viewBox="0 0 700 200" className="w-full h-full"><defs><linearGradient id="reviewNet" x1="0" x2="1"><stop offset="0%" stopColor="#35bdf5"/><stop offset="100%" stopColor="#69f0c2"/></linearGradient></defs>{[60,110,160].map((y) => <line key={y} x1="0" x2="700" y1={y} y2={y} stroke="rgba(255,255,255,0.08)"/>)}<path d={chart.assetPath} fill="none" stroke="rgba(255,255,255,0.24)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/><path d={chart.netPath} fill="none" stroke="url(#reviewNet)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>{chart.coords.map((p) => <circle key={p.date} cx={p.x} cy={p.netY} r="4" fill="#69f0c2"/>)}</svg><div className="absolute left-4 top-4 text-[10px] text-[#a8aca3]"><p><span className="text-[#69f0c2]">●</span> Net worth</p><p><span className="text-white/50">●</span> Assets</p></div></div><div className="mt-5 grid grid-cols-2 gap-3 text-sm"><div className="rounded-2xl bg-black/20 p-3"><p className="text-xs text-[#a8aca3]">Assets</p><p className="font-mono">{money(review.latest.assets, true)}</p></div><div className="rounded-2xl bg-black/20 p-3"><p className="text-xs text-[#a8aca3]">Liabilities</p><p className="font-mono text-red-100">-{money(review.latest.liabilities, true)}</p></div></div>{trend.length > 0 && <p className="text-xs text-[#8d9188] mt-3">Latest snapshot: {prettyDate(trend.at(-1)!.date)}</p>}</section><section className="grid grid-cols-2 gap-3 mb-4"><div className="rounded-[22px] bg-white/[0.05] border border-white/8 p-4"><p className="text-xs text-[#a8aca3]">Liquidity</p><p className="text-2xl font-semibold">{review.liquidPct}%</p><p className="text-[10px] text-[#8d9188]">Money within reach</p></div><div className="rounded-[22px] bg-white/[0.05] border border-white/8 p-4"><p className="text-xs text-[#a8aca3]">Debt ratio</p><p className="text-2xl font-semibold">{review.debtPct}%</p><p className="text-[10px] text-[#8d9188]">Debt vs assets</p></div></section><section className="rounded-[24px] bg-white/[0.05] border border-white/8 p-4 mb-4"><div className="flex items-center gap-2 mb-3"><BarChart3 className="h-4 w-4 text-[#a7ff4f]"/><h2 className="text-base font-medium">Report card</h2></div><div className="space-y-2"><div className="flex items-center justify-between rounded-2xl bg-black/20 px-3 py-3"><p className="text-sm">Biggest monthly movement</p><p className={biggestMove >= 0 ? 'text-sm font-mono text-[#a7ff4f]' : 'text-sm font-mono text-red-100'}>{signed(biggestMove)}</p></div><div className="flex items-center justify-between rounded-2xl bg-black/20 px-3 py-3"><p className="text-sm">Largest asset</p><p className="text-sm text-right truncate max-w-[48%]">{review.biggestAsset?.name || 'None'}</p></div><div className="flex items-center justify-between rounded-2xl bg-black/20 px-3 py-3"><p className="text-sm">Largest debt</p><p className="text-sm text-right truncate max-w-[48%]">{review.biggestDebt?.name || 'None'}</p></div></div></section>{pairs.length > 0 && <section className="rounded-[24px] bg-white/[0.05] border border-white/8 p-4 mb-4"><div className="flex items-center gap-2 mb-3"><ShieldAlert className="h-4 w-4 text-[#a7ff4f]"/><h2 className="text-base font-medium">Asset / debt pairing</h2></div><div className="space-y-2">{pairs.map((pair) => <div key={pair.asset.id} className="rounded-2xl bg-black/20 px-3 py-3"><div className="flex justify-between gap-3"><p className="text-sm truncate">{pair.asset.name}</p><p className="text-sm font-mono">Equity {money(pair.equity, true)}</p></div><p className="text-xs text-[#8d9188] mt-1">{pair.debt ? `Linked estimate: ${pair.debt.name} · LTV ${pair.loanToValue}%` : 'No obvious loan match yet. Rename related loan with house/car/mortgage for better pairing.'}</p></div>)}</div></section>}<section className="rounded-[24px] bg-white/[0.05] border border-white/8 p-4"><div className="flex items-center gap-2 mb-2"><Wallet className="h-4 w-4 text-[#a7ff4f]"/><h2 className="text-base font-medium">Snapshot quality</h2></div><p className="text-sm text-[#a8aca3]">{review.snapshotCount >= 3 ? 'Good. You have enough history for trend-based insights.' : 'Save monthly snapshots so Vault can compare changes over time.'}</p></section></div></div></main>;
}

export default function ReviewPage() { return <AppLock><ReviewContent /></AppLock>; }
