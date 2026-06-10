'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { BarChart3, Coins, CreditCard, Home, Landmark, Lightbulb, Plus, Sparkles, Target, Trophy, UserCircle, Wallet, Waves } from 'lucide-react';
import { getBreakdown, getRecommendations, getTotals, Account } from '@/lib/finance';

type Tab = 'accounts' | 'insights' | 'portfolio';
type Filter = 'all' | 'cash' | 'investment' | 'crypto' | 'retirement' | 'property' | 'loan';
type Snapshot = { account_id: string; snapshot_date: string; balance: number };
type NetWorthPoint = { date: string; value: number; x: number; y: number };

const filters: { value: Filter; label: string; types?: string[] }[] = [{ value: 'all', label: 'All' },{ value: 'cash', label: 'Cash', types: ['checking', 'savings', 'cash'] },{ value: 'investment', label: 'Invest', types: ['investment'] },{ value: 'crypto', label: 'Crypto', types: ['crypto'] },{ value: 'retirement', label: 'EPF', types: ['retirement'] },{ value: 'property', label: 'Property', types: ['property'] },{ value: 'loan', label: 'Debt', types: ['loan', 'credit'] }];
const typeLabel: Record<string, string> = { checking: 'Checking', savings: 'Savings', cash: 'Cash', investment: 'Investment', crypto: 'Crypto', retirement: 'Retirement', property: 'Property', loan: 'Loan', credit: 'Credit' };
const typeIcon: Record<string, React.ElementType> = { checking: Landmark, savings: Landmark, cash: Wallet, investment: BarChart3, crypto: Coins, retirement: Landmark, property: Home, loan: CreditCard, credit: CreditCard };
function today() { return new Date().toISOString().slice(0, 10); }
function money(value: number, compact = false) { return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: compact ? 1 : 0, notation: compact ? 'compact' : 'standard' }).format(value || 0); }
function prettyDate(value: string) { if (value === 'Current') return 'Current'; return new Date(`${value}T00:00:00`).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }); }

export default function DashboardPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('accounts');
  const [filter, setFilter] = useState<Filter>('all');
  const [showAdd, setShowAdd] = useState(true);
  const [activeChartIndex, setActiveChartIndex] = useState<number | null>(null);
  const [snapshotSaving, setSnapshotSaving] = useState(false);
  const [status, setStatus] = useState('');

  async function loadData() {
    const session = await supabase.auth.getSession();
    if (!session.data.session) { router.push('/login'); return; }
    const accountResult = await supabase.from('accounts').select('id,name,institution,type,balance,currency').order('created_at', { ascending: false });
    if (!accountResult.error && accountResult.data) setAccounts(accountResult.data as Account[]);
    const snapshotResult = await supabase.from('account_snapshots').select('account_id,snapshot_date,balance').order('snapshot_date', { ascending: true });
    if (!snapshotResult.error && snapshotResult.data) setSnapshots(snapshotResult.data as Snapshot[]);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);
  useEffect(() => { let lastY = window.scrollY; function onScroll() { const y = window.scrollY; const nearBottom = window.innerHeight + y > document.documentElement.scrollHeight - 180; if (nearBottom || y > lastY + 8) setShowAdd(false); if (y < lastY - 8 || y < 80) setShowAdd(true); lastY = y; } window.addEventListener('scroll', onScroll, { passive: true }); return () => window.removeEventListener('scroll', onScroll); }, []);

  const totals = useMemo(() => getTotals(accounts), [accounts]);
  const breakdown = useMemo(() => getBreakdown(totals), [totals]);
  const recommendations = useMemo(() => getRecommendations(totals), [totals]);
  const visibleAccounts = useMemo(() => { const selected = filters.find((item) => item.value === filter); if (!selected?.types) return accounts; return accounts.filter((account) => selected.types!.includes(account.type)); }, [accounts, filter]);
  const netWorthHistory = useMemo(() => { if (!snapshots.length) return []; const dates = Array.from(new Set(snapshots.map((s) => s.snapshot_date))).sort(); const byAccount = new Map<string, Snapshot[]>(); snapshots.forEach((s) => byAccount.set(s.account_id, [...(byAccount.get(s.account_id) || []), s])); return dates.map((date) => { let value = 0; accounts.forEach((account) => { const list = byAccount.get(account.id) || []; const latest = list.filter((s) => s.snapshot_date <= date).at(-1); const amount = latest ? Number(latest.balance) : Number(account.balance || 0); value += ['loan', 'credit'].includes(account.type) ? -Math.abs(amount) : amount; }); return { date, value }; }); }, [accounts, snapshots]);
  const chartPoints = useMemo(() => { const source = netWorthHistory.length ? netWorthHistory : [{ date: 'Current', value: totals.netWorth }]; const max = Math.max(...source.map((p) => p.value), 1); const min = Math.min(...source.map((p) => p.value), 0); const range = Math.max(max - min, 1); const coords: NetWorthPoint[] = source.map((point, index) => ({ ...point, x: source.length === 1 ? 350 : 30 + (index * 640) / (source.length - 1), y: 130 - ((point.value - min) / range) * 90 })); return { coords, path: coords.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ') }; }, [netWorthHistory, totals.netWorth]);

  const selectedIndex = activeChartIndex ?? Math.max(chartPoints.coords.length - 1, 0);
  const selectedPoint = chartPoints.coords[selectedIndex];
  const previousPoint = selectedIndex > 0 ? chartPoints.coords[selectedIndex - 1] : null;
  const selectedChange = selectedPoint && previousPoint ? selectedPoint.value - previousPoint.value : 0;
  const selectedPct = previousPoint && previousPoint.value !== 0 ? (selectedChange / previousPoint.value) * 100 : 0;
  const debtRatio = totals.assets > 0 ? (totals.liabilities / totals.assets) * 100 : 0;
  const visibleTotal = visibleAccounts.reduce((sum, account) => sum + Math.abs(Number(account.balance)), 0);
  const largestAccount = [...accounts].sort((a, b) => Math.abs(Number(b.balance)) - Math.abs(Number(a.balance)))[0];
  const topDriver = breakdown[0];
  const nextMilestone = Math.ceil((totals.netWorth + 1) / 100000) * 100000;
  const milestoneGap = Math.max(nextMilestone - totals.netWorth, 0);
  const historyGain = netWorthHistory.length > 1 ? totals.netWorth - netWorthHistory[0].value : 0;
  const forecast = totals.netWorth + Math.max(historyGain, totals.netWorth * 0.06);

  async function snapshotToday() {
    setStatus('');
    if (!accounts.length) { setStatus('Add accounts before creating a snapshot.'); return; }
    setSnapshotSaving(true);
    const session = await supabase.auth.getSession();
    const userId = session.data.session?.user.id;
    if (!userId) { router.push('/login'); return; }
    const date = today();
    const accountIds = accounts.map((account) => account.id);
    const cleanup = await supabase.from('account_snapshots').delete().eq('snapshot_date', date).in('account_id', accountIds);
    if (cleanup.error) { setSnapshotSaving(false); setStatus(cleanup.error.message); return; }
    const rows = accounts.map((account) => ({ user_id: userId, account_id: account.id, snapshot_date: date, balance: Number(account.balance), notes: 'Daily snapshot' }));
    const result = await supabase.from('account_snapshots').insert(rows);
    setSnapshotSaving(false);
    if (result.error) { setStatus(result.error.message); return; }
    setStatus(`Today's snapshot updated for ${accounts.length} accounts.`);
    await loadData();
  }

  if (loading) return <main className="min-h-screen bg-[#080b08] flex items-center justify-center text-[#d8ded2] text-sm">Loading...</main>;

  return <main className="min-h-screen bg-[#080b08] text-[#f4f5ef]"><div className="mx-auto max-w-[680px] min-h-screen relative overflow-hidden pb-32"><div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_-10%,rgba(148,255,97,0.12),transparent_34%),linear-gradient(180deg,#182016_0%,#080b08_42%)]"/><div className="relative px-4 pt-6"><header className="flex items-center justify-between mb-6"><h1 className="text-xl font-semibold tracking-tight">{tab === 'accounts' ? 'Vault' : tab === 'insights' ? 'Insights' : 'Portfolio'}</h1><button onClick={() => router.push('/accounts/profile')} className="h-9 w-9 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center"><UserCircle className="h-6 w-6" /></button></header>{tab === 'accounts' && <section><p className="text-[#a8aca3] text-xs mb-1.5">Net worth</p><div className="text-[1.7rem] leading-tight font-light tracking-tight mb-2">{money(totals.netWorth)}</div><p className="text-[11px] text-[#a8aca3] mb-4">{netWorthHistory.length ? 'Based on saved account snapshots' : 'Add dated updates to build history'}</p><div className="h-[170px] -mx-4 mb-4 border-b border-white/10 relative"><svg viewBox="0 0 700 150" className="h-full w-full"><defs><linearGradient id="line" x1="0" x2="1"><stop offset="0%" stopColor="#35bdf5"/><stop offset="100%" stopColor="#69f0c2"/></linearGradient></defs><path d={chartPoints.path} fill="none" stroke="url(#line)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />{chartPoints.coords.map((p, index) => <circle key={`${p.date}-${index}`} onClick={() => setActiveChartIndex(index)} cx={p.x} cy={p.y} r={index === selectedIndex ? 7 : 4} fill={index === selectedIndex ? '#f4f5ef' : '#69f0c2'} className="cursor-pointer" />)}</svg>{selectedPoint && <div className="absolute left-4 top-3 rounded-2xl bg-black/45 border border-white/10 px-3 py-2 backdrop-blur"><p className="text-[11px] text-[#a8aca3]">{prettyDate(selectedPoint.date)}</p><p className="text-sm font-mono">{money(selectedPoint.value)}</p><p className={selectedChange >= 0 ? 'text-[11px] text-[#75efad]' : 'text-[11px] text-red-200'}>{previousPoint ? `${selectedChange >= 0 ? '+' : ''}${money(selectedChange)} (${selectedPct.toFixed(1)}%)` : 'First snapshot'}</p></div>}</div><button onClick={snapshotToday} disabled={snapshotSaving} className="w-full rounded-2xl bg-[#a7ff4f] text-[#071006] font-semibold text-sm py-3 mb-2 disabled:opacity-60">{snapshotSaving ? 'Saving snapshot...' : 'Snapshot today'}</button>{status && <p className="text-xs text-[#a8aca3] mb-3">{status}</p>}<div className="mb-4 overflow-x-auto no-scrollbar -mx-4 px-4"><div className="flex gap-2 w-max">{filters.map((item) => <button key={item.value} onClick={() => setFilter(item.value)} className={cn('rounded-full border px-3 py-2 text-xs transition', filter === item.value ? 'bg-[#a7ff4f] border-[#a7ff4f] text-[#071006]' : 'bg-white/[0.04] border-white/10 text-[#cdd3c8]')}>{item.label}</button>)}</div></div><div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-xs text-[#d8ded2] mb-3"><span><Wallet className="inline h-3.5 w-3.5 mr-1.5" />{visibleAccounts.length} shown</span><span className="font-mono">{money(visibleTotal, true)}</span></div><div className="space-y-0.5">{visibleAccounts.map((account) => { const Icon = typeIcon[account.type] ?? Landmark; const debt = ['loan','credit'].includes(account.type); return <button onClick={() => router.push(`/accounts/${account.id}`)} key={account.id} className="relative w-full flex items-center justify-between rounded-2xl px-3.5 py-3 text-left hover:bg-white/[0.03]"><div className={cn('absolute left-0 top-3 bottom-3 w-1 rounded-full', debt ? 'bg-[#c96f5d]' : account.type === 'retirement' ? 'bg-[#31b8d8]' : 'bg-[#a7ff4f]')} /><div className="pl-3 min-w-0"><p className="text-sm truncate">{account.name}</p><span className="mt-1 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] text-[#8d9188]"><Icon className="h-3 w-3" />{typeLabel[account.type] ?? account.type}</span></div><p className="text-sm shrink-0 font-medium">{money(Math.abs(Number(account.balance)))}</p></button>})}</div></section>}{tab === 'insights' && <section className="space-y-3.5"><div><h2 className="text-xl font-light">Smart Insights</h2><p className="text-[#a8aca3] text-xs">Based on your entered assets, liabilities, and snapshots.</p></div><div className="grid grid-cols-2 gap-3"><div className="rounded-[20px] bg-white/[0.05] border border-white/8 p-3.5"><Target className="h-5 w-5 text-[#a7ff4f] mb-2"/><p className="text-xs text-[#a8aca3]">Next milestone</p><p className="text-lg font-light">{money(nextMilestone, true)}</p><p className="text-[11px] text-[#8d9188]">{money(milestoneGap, true)} to go</p></div><div className="rounded-[20px] bg-white/[0.05] border border-white/8 p-3.5"><Trophy className="h-5 w-5 text-[#a7ff4f] mb-2"/><p className="text-xs text-[#a8aca3]">Largest position</p><p className="text-lg font-light truncate">{largestAccount?.name || 'None'}</p><p className="text-[11px] text-[#8d9188]">{largestAccount ? money(Math.abs(Number(largestAccount.balance)), true) : money(0)}</p></div></div><div className="rounded-[20px] bg-white/[0.05] border border-white/8 p-3.5"><h3 className="text-base mb-2">What drives net worth</h3><p className="text-xs text-[#a8aca3] mb-3">Largest category by current asset value.</p><div className="flex justify-between text-sm"><span>{topDriver?.label || 'No assets yet'}</span><span className="font-mono">{topDriver ? `${topDriver.pct.toFixed(1)}%` : '0%'}</span></div><div className="h-2 rounded-full bg-white/10 overflow-hidden mt-2"><div className="h-full rounded-full bg-[#a7ff4f]" style={{ width: `${Math.min(topDriver?.pct || 0, 100)}%` }}/></div></div><div className="rounded-[20px] bg-white/[0.05] border border-white/8 p-3.5"><Sparkles className="h-5 w-5 text-[#75efad] mb-2"/><h3 className="text-base mb-1">Forecast</h3><p className="text-xs text-[#a8aca3]">Simple forecast using snapshot growth when available, otherwise 6% placeholder growth.</p><p className="text-2xl font-light mt-2">{money(forecast)}</p></div><div className="rounded-[20px] bg-white/[0.05] border border-white/8 p-3.5"><h3 className="text-base mb-2">Calculation base</h3><div className="space-y-1.5 text-xs font-mono text-[#d8ded2]"><div className="flex justify-between"><span>Assets</span><span>{money(totals.assets, true)}</span></div><div className="flex justify-between"><span>Debt</span><span>{money(totals.liabilities, true)}</span></div><div className="flex justify-between"><span>Debt ratio</span><span>{debtRatio.toFixed(1)}%</span></div></div></div><div className="rounded-[20px] bg-white/[0.05] border border-white/8 p-3.5"><div className="flex items-center justify-between mb-3"><h3 className="text-base">Rule-based insights</h3><Lightbulb className="h-4 w-4 text-[#75efad]"/></div><div className="space-y-2.5">{recommendations.map((rec) => <div key={rec.title} className="rounded-2xl bg-black/20 border border-white/8 p-3"><div className="flex gap-2.5"><rec.icon className="h-4 w-4 text-[#75efad] shrink-0 mt-1"/><div><p className="font-semibold text-xs">{rec.title}</p><p className="text-[11px] text-[#a8aca3] leading-relaxed">{rec.body}</p></div></div></div>)}</div></div></section>}{tab === 'portfolio' && <section className="space-y-3.5"><div><h2 className="text-xl font-light">Asset Breakdown</h2><p className="text-[#a8aca3] text-xs">Real percentages from your account balances.</p></div><div className="rounded-[20px] bg-white/[0.05] border border-white/8 p-3.5 space-y-4">{breakdown.map((item) => <div key={item.label}><div className="flex justify-between text-sm mb-2"><span>{item.label}</span><span className="font-mono">{money(item.value, true)} · {item.pct.toFixed(1)}%</span></div><div className="h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full bg-[#a7ff4f]" style={{ width: `${Math.min(item.pct, 100)}%` }}/></div></div>)}</div><div className="rounded-[20px] bg-white/[0.05] border border-white/8 p-3.5 flex justify-between"><span className="text-sm">Debt-to-asset ratio</span><b className="text-sm">{debtRatio.toFixed(1)}%</b></div></section>}</div><button onClick={() => router.push('/accounts')} className={cn('fixed right-5 z-[70] h-14 w-14 rounded-[18px] border-[3px] border-[#2f7dff] bg-[#a7ff4f] text-[#071006] shadow-2xl flex items-center justify-center transition-all duration-300', showAdd ? 'bottom-24 opacity-100 translate-y-0 scale-100' : 'bottom-8 opacity-0 translate-y-8 scale-90 pointer-events-none')}><Plus className="h-7 w-7"/></button><nav className="fixed left-4 right-4 bottom-5 z-50 mx-auto max-w-[640px] rounded-[24px] border border-white/15 bg-[#10140f]/90 backdrop-blur-xl p-1.5 shadow-2xl"><div className="grid grid-cols-3 gap-1.5">{(['accounts','insights','portfolio'] as Tab[]).map((item) => { const Icon = item === 'accounts' ? Wallet : item === 'insights' ? Waves : Sparkles; return <button key={item} onClick={() => setTab(item)} className={cn('h-11 rounded-[18px] flex items-center justify-center gap-2 font-semibold capitalize text-[#cdd3c8] text-xs', tab === item && 'bg-white/18 text-white')}><Icon className="h-4 w-4"/><span className="hidden sm:inline">{item}</span></button> })}</div></nav></div></main>;
}
