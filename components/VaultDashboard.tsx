'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ElementType } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, Coins, CreditCard, Eye, EyeOff, Home, Landmark, Lightbulb, Plus, Sparkles, Trophy, UserCircle, Wallet, Waves } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getBreakdown, getTotals, nativeDisplay } from '@/lib/finance';
import type { Account } from '@/lib/finance';
import { buildPortfolioCoach, type CoachAction } from '@/lib/coach';
import { readCache, writeCache, cacheAgeLabel } from '@/lib/cache';
import { accountPairSuggestions, buildTrend, filterTrend, monthlyReview, type SnapshotPoint } from '@/lib/insights';
import DashboardActionCards from '@/components/DashboardActionCards';

type Tab = 'accounts' | 'insights' | 'portfolio';
type Filter = 'all' | 'cash' | 'investment' | 'crypto' | 'retirement' | 'property' | 'loan';
type Range = '1M' | '3M' | '6M' | '1Y' | 'All';
type VaultAccount = Account & { liquidity?: number | null; native_balance?: number | null; fx_rate?: number | null; currency?: string | null };
type CacheData = { accounts: VaultAccount[]; snapshots: SnapshotPoint[] };
type CoachResponse = { mode?: string; actions?: CoachAction[]; error?: string };

const CACHE_KEY = 'vault_dashboard_cache_v2';
const PRIVACY_DEFAULT_KEY = 'vault_privacy_default';
const COACH_LIMIT_KEY = 'vault_coach_ai_limit_v1';
const COACH_DAILY_LIMIT = 3;
const filters: { value: Filter; label: string; types?: string[] }[] = [
  { value: 'all', label: 'All' },
  { value: 'cash', label: 'Cash', types: ['checking', 'savings', 'cash'] },
  { value: 'investment', label: 'Invest', types: ['investment'] },
  { value: 'crypto', label: 'Crypto', types: ['crypto'] },
  { value: 'retirement', label: 'EPF', types: ['retirement'] },
  { value: 'property', label: 'Property', types: ['property'] },
  { value: 'loan', label: 'Debt', types: ['loan', 'credit'] },
];
const ranges: Range[] = ['1M', '3M', '6M', '1Y', 'All'];
const typeIcon: Record<string, ElementType> = { checking: Landmark, savings: Landmark, cash: Wallet, investment: BarChart3, crypto: Coins, retirement: Trophy, property: Home, loan: CreditCard, credit: CreditCard };
const typeLabel: Record<string, string> = { checking: 'Checking', savings: 'Savings', cash: 'Cash', investment: 'Investment', crypto: 'Crypto', retirement: 'Retirement', property: 'Property', loan: 'Loan', credit: 'Credit' };

function today() { return new Date().toISOString().slice(0, 10); }
function money(value: number, compact = false) { return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: compact ? 1 : 0, notation: compact ? 'compact' : 'standard' }).format(value || 0); }
function pct(value: number, base: number) { return base > 0 ? (value / base) * 100 : 0; }
function isDebt(account: VaultAccount | Account) { return ['loan', 'credit'].includes(account.type); }
function signedValue(account: VaultAccount | Account) { const value = Math.abs(Number(account.balance || 0)); return isDebt(account) ? -value : value; }
function prettyDate(value: string) { if (value === 'Current') return 'Current'; return new Date(`${value}T00:00:00`).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' }); }
function greeting() { const hour = new Date().getHours(); if (hour < 12) return 'Good morning'; if (hour < 18) return 'Good afternoon'; return 'Good evening'; }
function coachUsage() { try { return JSON.parse(localStorage.getItem(COACH_LIMIT_KEY) || '{}') as { date?: string; count?: number }; } catch { return {}; } }
function liquidityScore(account: VaultAccount) { if (typeof account.liquidity === 'number') return account.liquidity; if (['checking', 'savings', 'cash'].includes(account.type)) return 1; if (['crypto', 'investment'].includes(account.type)) return 2; if (account.type === 'retirement') return 4; if (account.type === 'property') return 5; if (isDebt(account)) return 6; return 3; }
function liquidityLabel(score: number) { if (score <= 1) return 'Immediate'; if (score === 2) return 'Market liquid'; if (score === 3) return 'Medium-term'; if (score <= 5) return 'Locked / illiquid'; return 'Liabilities'; }

export default function VaultDashboard() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<VaultAccount[]>([]);
  const [snapshots, setSnapshots] = useState<SnapshotPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cacheLabel, setCacheLabel] = useState('');
  const [tab, setTab] = useState<Tab>('accounts');
  const [filter, setFilter] = useState<Filter>('all');
  const [range, setRange] = useState<Range>('6M');
  const [privacy, setPrivacy] = useState(false);
  const [activeChartIndex, setActiveChartIndex] = useState<number | null>(null);
  const [status, setStatus] = useState('');
  const [snapshotSaving, setSnapshotSaving] = useState(false);
  const [coach, setCoach] = useState<CoachAction[]>([]);
  const [coachMode, setCoachMode] = useState<'ai' | 'local'>('local');
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachMessage, setCoachMessage] = useState('Local review. AI runs only when you tap AI Refresh.');
  const hidden = privacy ? '••••••' : null;

  async function loadData(useCache = false) {
    if (useCache) {
      const cached = readCache<CacheData>(CACHE_KEY);
      if (cached) {
        setAccounts(cached.accounts);
        setSnapshots(cached.snapshots);
        setCacheLabel(cacheAgeLabel(CACHE_KEY));
        setLoading(false);
      }
    }
    setRefreshing(true);
    const session = await supabase.auth.getSession();
    if (!session.data.session) { router.push('/login'); return; }
    const fullResult = await supabase.from('accounts').select('id,name,institution,type,balance,currency,native_balance,fx_rate,liquidity').order('created_at', { ascending: false });
    let nextAccounts: VaultAccount[] = [];
    if (!fullResult.error && fullResult.data) nextAccounts = fullResult.data as VaultAccount[];
    else {
      const basicResult = await supabase.from('accounts').select('id,name,institution,type,balance,currency,native_balance,fx_rate').order('created_at', { ascending: false });
      if (!basicResult.error && basicResult.data) nextAccounts = basicResult.data as VaultAccount[];
      else {
        const fallback = await supabase.from('accounts').select('id,name,institution,type,balance,currency').order('created_at', { ascending: false });
        if (!fallback.error && fallback.data) nextAccounts = fallback.data as VaultAccount[];
      }
    }
    const snapshotResult = await supabase.from('account_snapshots').select('account_id,snapshot_date,balance').order('snapshot_date', { ascending: true });
    const nextSnapshots = !snapshotResult.error && snapshotResult.data ? snapshotResult.data as SnapshotPoint[] : [];
    setAccounts(nextAccounts);
    setSnapshots(nextSnapshots);
    writeCache(CACHE_KEY, { accounts: nextAccounts, snapshots: nextSnapshots });
    setCacheLabel('Updated just now');
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { setPrivacy(localStorage.getItem(PRIVACY_DEFAULT_KEY) === '1'); loadData(true); }, []);
  useEffect(() => { setCoach(buildPortfolioCoach(accounts)); setCoachMode('local'); }, [accounts]);

  const totals = useMemo(() => getTotals(accounts), [accounts]);
  const breakdown = useMemo(() => getBreakdown(totals), [totals]);
  const fullTrend = useMemo(() => buildTrend(accounts, snapshots), [accounts, snapshots]);
  const chartTrend = useMemo(() => filterTrend(fullTrend, range), [fullTrend, range]);
  const review = useMemo(() => monthlyReview(accounts, snapshots), [accounts, snapshots]);
  const pairs = useMemo(() => accountPairSuggestions(accounts), [accounts]);
  const visibleAccounts = useMemo(() => { const selected = filters.find((item) => item.value === filter); return selected?.types ? accounts.filter((item) => selected.types!.includes(item.type)) : accounts; }, [accounts, filter]);
  const liquidValue = totals.cash + totals.investments + totals.crypto;
  const liquidPercent = pct(liquidValue, totals.assets);
  const debtRatio = pct(totals.liabilities, totals.assets);
  const largestAccount = [...accounts].sort((a, b) => Math.abs(Number(b.balance)) - Math.abs(Number(a.balance)))[0];
  const largestPct = largestAccount ? pct(Math.abs(Number(largestAccount.balance)), totals.assets) : 0;
  const nextMilestone = Math.ceil((totals.netWorth + 1) / 100000) * 100000;
  const milestoneGap = Math.max(nextMilestone - totals.netWorth, 0);
  const forecast = totals.netWorth + Math.max(totals.netWorth * 0.06, 0);
  const latestChange = chartTrend.length > 1 ? chartTrend[chartTrend.length - 1].netWorth - chartTrend[chartTrend.length - 2].netWorth : 0;

  const chart = useMemo(() => {
    const source = chartTrend.length ? chartTrend : [{ date: 'Current', netWorth: totals.netWorth, assets: totals.assets, liabilities: totals.liabilities, monthlyChange: 0 }];
    const max = Math.max(...source.flatMap((p) => [p.netWorth, p.assets]), 1);
    const min = Math.min(...source.map((p) => p.netWorth), 0);
    const valueRange = Math.max(max - min, 1);
    const coords = source.map((point, index) => ({ ...point, x: source.length === 1 ? 350 : 35 + (index * 630) / (source.length - 1), netY: 150 - ((point.netWorth - min) / valueRange) * 105, assetY: 150 - ((point.assets - min) / valueRange) * 105 }));
    return { coords, netPath: coords.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.netY}`).join(' '), assetPath: coords.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.assetY}`).join(' '), max, min };
  }, [chartTrend, totals.netWorth, totals.assets, totals.liabilities]);
  const selectedIndex = Math.min(activeChartIndex ?? Math.max(chart.coords.length - 1, 0), Math.max(chart.coords.length - 1, 0));
  const selectedPoint = chart.coords[selectedIndex];

  const liquidityGroups = useMemo(() => {
    const buckets = [
      { title: 'Immediate', subtitle: 'Cash, bank, wallet', items: [] as VaultAccount[] },
      { title: 'Market liquid', subtitle: 'Investments and crypto', items: [] as VaultAccount[] },
      { title: 'Medium-term', subtitle: 'Accessible but not instant', items: [] as VaultAccount[] },
      { title: 'Locked / illiquid', subtitle: 'EPF, property, long-term assets', items: [] as VaultAccount[] },
      { title: 'Liabilities', subtitle: 'Loans and credit balances', items: [] as VaultAccount[] },
    ];
    accounts.forEach((account) => { const score = liquidityScore(account); if (score <= 1) buckets[0].items.push(account); else if (score === 2) buckets[1].items.push(account); else if (score === 3) buckets[2].items.push(account); else if (score <= 5) buckets[3].items.push(account); else buckets[4].items.push(account); });
    return buckets.filter((bucket) => bucket.items.length);
  }, [accounts]);

  async function refreshCoach() {
    const useDate = today(); const usage = coachUsage(); const count = usage.date === useDate ? usage.count || 0 : 0;
    if (count >= COACH_DAILY_LIMIT) { setCoachMessage(`Daily AI limit reached (${COACH_DAILY_LIMIT}). Local review is still active.`); setCoachMode('local'); return; }
    localStorage.setItem(COACH_LIMIT_KEY, JSON.stringify({ date: useDate, count: count + 1 })); setCoachLoading(true); setCoachMessage('Refreshing with privacy-limited AI summary...');
    try { const response = await fetch('/api/coach', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accounts, snapshots }) }); const data = await response.json() as CoachResponse; setCoach(Array.isArray(data.actions) ? data.actions : buildPortfolioCoach(accounts)); setCoachMode(data.mode === 'ai' ? 'ai' : 'local'); setCoachMessage(data.mode === 'ai' ? `AI mode active. ${COACH_DAILY_LIMIT - count - 1} AI refreshes left today.` : data.error || 'AI unavailable. Local review is active.'); }
    catch (error) { setCoach(buildPortfolioCoach(accounts)); setCoachMode('local'); setCoachMessage(error instanceof Error ? error.message : 'AI unavailable. Local review is active.'); }
    setCoachLoading(false);
  }

  async function snapshotToday() {
    setStatus('');
    if (!accounts.length) { setStatus('Add accounts before creating a snapshot.'); return; }
    setSnapshotSaving(true);
    const session = await supabase.auth.getSession();
    const userId = session.data.session?.user.id;
    if (!userId) { router.push('/login'); return; }
    const date = today();
    const ids = accounts.map((item) => item.id);
    await supabase.from('account_snapshots').delete().eq('snapshot_date', date).in('account_id', ids);
    let result = await supabase.from('account_snapshots').insert(accounts.map((account) => ({ user_id: userId, account_id: account.id, snapshot_date: date, balance: Math.abs(Number(account.balance)), native_balance: Number(account.native_balance ?? account.balance), currency: account.currency || 'MYR', fx_rate: Number(account.fx_rate ?? 1), notes: 'Daily snapshot' })));
    if (result.error && result.error.message.toLowerCase().includes('native_balance')) result = await supabase.from('account_snapshots').insert(accounts.map((account) => ({ user_id: userId, account_id: account.id, snapshot_date: date, balance: Math.abs(Number(account.balance)), notes: 'Daily snapshot' })));
    setSnapshotSaving(false);
    setStatus(result.error ? result.error.message : `Today's snapshot updated for ${accounts.length} accounts.`);
    await loadData();
  }

  if (loading) return <main className="min-h-screen bg-[#080b08] flex items-center justify-center text-[#d8ded2] text-sm">Loading...</main>;

  return <main className="min-h-screen bg-[#080b08] text-[#f4f5ef]"><div className="mx-auto max-w-[680px] min-h-screen relative overflow-hidden pb-40"><div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_-10%,rgba(148,255,97,0.12),transparent_34%),linear-gradient(180deg,#182016_0%,#080b08_42%)]"/><div className="relative px-4 pt-6"><header className="flex items-center justify-between mb-5"><div><h1 className="text-xl font-semibold tracking-tight">{tab === 'accounts' ? 'Vault' : tab === 'insights' ? 'Insights' : 'Portfolio'}</h1><p className="text-xs text-[#8d9188] mt-0.5">{greeting()}, Darian {refreshing ? '· syncing' : cacheLabel ? `· ${cacheLabel}` : ''}</p></div><div className="flex gap-2"><button onClick={() => setPrivacy(!privacy)} className="h-9 w-9 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center">{privacy ? <EyeOff className="h-5 w-5"/> : <Eye className="h-5 w-5"/>}</button><button onClick={() => router.push('/accounts/profile')} className="h-9 w-9 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center"><UserCircle className="h-6 w-6"/></button></div></header>{tab === 'accounts' && <section><div className="grid grid-cols-2 gap-3 mb-4"><div className="rounded-[24px] bg-white/[0.05] border border-white/8 p-4 col-span-2"><p className="text-[#a8aca3] text-xs mb-1.5">Net worth</p><div className="text-[1.85rem] leading-tight font-light tracking-tight mb-1">{hidden || money(totals.netWorth)}</div><p className={latestChange >= 0 ? 'text-xs text-[#75efad]' : 'text-xs text-red-200'}>{latestChange >= 0 ? '+' : ''}{hidden || money(latestChange)} over selected range</p></div></div><DashboardActionCards accounts={accounts} snapshots={snapshots} nextMilestone={nextMilestone} milestoneGap={milestoneGap} hidden={hidden}/><div className="h-[205px] -mx-4 mb-3 border-y border-white/10 relative"><svg viewBox="0 0 700 190" className="h-full w-full"><defs><linearGradient id="nwLine" x1="0" x2="1"><stop offset="0%" stopColor="#35bdf5"/><stop offset="100%" stopColor="#69f0c2"/></linearGradient></defs>{[50,95,140].map((y) => <line key={y} x1="0" x2="700" y1={y} y2={y} stroke="rgba(255,255,255,0.08)"/>)}<path d={chart.assetPath} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/><path d={chart.netPath} fill="none" stroke="url(#nwLine)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>{chart.coords.map((point, index) => <circle key={`${point.date}-${index}`} onClick={() => setActiveChartIndex(index)} cx={point.x} cy={point.netY} r={index === selectedIndex ? 7 : 4.5} fill={index === selectedIndex ? '#f4f5ef' : '#69f0c2'} className="cursor-pointer"/>)}</svg>{selectedPoint && <div className="absolute left-4 top-4 rounded-2xl bg-black/45 border border-white/10 px-3 py-2 backdrop-blur"><p className="text-[11px] text-[#a8aca3]">{prettyDate(selectedPoint.date)}</p><p className="text-sm font-mono">{hidden || money(selectedPoint.netWorth)}</p></div>}<div className="absolute right-4 top-4 text-right text-[10px] text-[#8d9188]"><p>{money(chart.max, true)}</p><p className="mt-24">{money(chart.min, true)}</p></div></div><div className="mb-4 -mx-4 overflow-x-auto no-scrollbar"><div className="flex gap-2 px-4 py-1 w-max min-w-full">{ranges.map((item) => <button key={item} onClick={() => { setRange(item); setActiveChartIndex(null); }} className={`shrink-0 rounded-full border px-4 py-2 text-xs leading-none ${range === item ? 'bg-[#a7ff4f] border-[#a7ff4f] text-[#071006]' : 'bg-white/[0.04] border-white/10 text-[#cdd3c8]'}`}>{item}</button>)}</div></div><button onClick={snapshotToday} disabled={snapshotSaving} className="w-full rounded-2xl bg-[#a7ff4f] text-[#071006] font-semibold text-sm py-3 mb-3 disabled:opacity-60">{snapshotSaving ? 'Saving snapshot...' : 'Snapshot today'}</button>{status && <p className="text-xs text-[#a8aca3] mb-3">{status}</p>}<div className="mb-4 -mx-4 overflow-x-auto no-scrollbar"><div className="flex items-center gap-2 px-4 py-1 w-max min-w-full">{filters.map((item) => <button key={item.value} onClick={() => setFilter(item.value)} className={`shrink-0 rounded-full border px-4 py-2 text-xs leading-none whitespace-nowrap ${filter === item.value ? 'bg-[#a7ff4f] border-[#a7ff4f] text-[#071006]' : 'bg-white/[0.04] border-white/10 text-[#cdd3c8]'}`}>{item.label}</button>)}</div></div><div className="space-y-1">{visibleAccounts.map((account) => { const Icon = typeIcon[account.type] ?? Landmark; const native = nativeDisplay(account); const signed = signedValue(account); return <button key={account.id} onClick={() => router.push(`/accounts/${account.id}`)} className="w-full flex items-center justify-between gap-3 rounded-2xl bg-white/[0.03] border border-white/8 px-4 py-3 text-left"><div className="flex items-center gap-3 min-w-0"><div className="h-10 w-10 rounded-2xl bg-white/[0.06] flex items-center justify-center shrink-0"><Icon className="h-5 w-5 text-[#a7ff4f]"/></div><div className="min-w-0"><p className="text-sm truncate">{account.name}</p><p className="text-xs text-[#8d9188] truncate">{isDebt(account) ? '- Liability' : '+ Asset'} · {account.institution}</p></div></div><div className="text-right shrink-0"><p className={signed < 0 ? 'text-sm font-medium text-red-200' : 'text-sm font-medium'}>{signed < 0 ? '-' : '+'}{hidden || money(Math.abs(signed))}</p>{native && <p className="text-[10px] text-[#8d9188]">{hidden || native}</p>}</div></button>})}</div></section>}{tab === 'insights' && <section className="space-y-4"><div className="rounded-[24px] bg-white/[0.05] border border-white/8 p-4"><p className="text-xs text-[#a8aca3] mb-3">Big picture</p><div className="grid grid-cols-2 gap-3"><div><p className="text-xs text-[#8d9188]">Forecast</p><p className="text-xl font-semibold">{hidden || money(forecast, true)}</p><p className="text-[10px] text-[#8d9188]">Simple 6% placeholder</p></div><div><p className="text-xs text-[#8d9188]">Next milestone</p><p className="text-xl font-semibold">{hidden || money(nextMilestone, true)}</p><p className="text-[10px] text-[#8d9188]">{hidden || money(milestoneGap, true)} to go</p></div></div></div><div className="rounded-[24px] bg-white/[0.05] border border-white/8 p-4"><p className="text-xs text-[#a8aca3] mb-3">Momentum</p><div className="grid grid-cols-2 gap-3"><div><p className="text-xs text-[#8d9188]">Recent change</p><p className={review.change >= 0 ? 'text-xl font-semibold text-[#75efad]' : 'text-xl font-semibold text-red-200'}>{review.change >= 0 ? '+' : ''}{hidden || money(review.change, true)}</p></div><div><p className="text-xs text-[#8d9188]">Within reach</p><p className="text-xl font-semibold">{liquidPercent.toFixed(0)}%</p><p className="text-[10px] text-[#8d9188]">{hidden || money(liquidValue, true)} liquid</p></div></div></div><div className="rounded-[24px] bg-white/[0.05] border border-white/8 p-4"><p className="text-xs text-[#a8aca3] mb-3">What drives net worth</p><div className="flex items-center gap-4"><div className="h-24 w-24 rounded-full shrink-0" style={{ background: `conic-gradient(#a7ff4f 0 ${Math.min(largestPct, 100)}%, rgba(255,255,255,0.12) ${Math.min(largestPct, 100)}% 100%)` }}/><div className="min-w-0"><p className="text-sm text-[#8d9188]">Largest position</p><p className="text-lg font-semibold truncate">{largestAccount?.name || 'None yet'}</p><p className="text-xs text-[#a8aca3]">{largestPct.toFixed(0)}% of assets · Debt ratio {debtRatio.toFixed(0)}%</p><div className="flex flex-wrap gap-1 mt-2">{accounts.slice(0, 6).map((account) => <span key={account.id} className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] text-[#cdd3c8]">{typeLabel[account.type] || account.type}</span>)}</div></div></div></div>{pairs.length > 0 && <div className="rounded-[24px] bg-white/[0.05] border border-white/8 p-4"><h2 className="text-base font-semibold mb-3">Asset / debt pairs</h2><div className="space-y-2">{pairs.map((pair) => <div key={pair.asset.id} className="rounded-2xl bg-black/20 px-3 py-3"><div className="flex justify-between gap-3"><p className="text-sm truncate">{pair.asset.name}</p><p className="text-sm font-mono">{hidden || money(pair.equity, true)}</p></div><p className="text-xs text-[#8d9188] mt-1">{pair.debt ? `${pair.debt.name} · LTV ${pair.loanToValue}%` : 'No matching loan yet'}</p></div>)}</div></div>}<div className="rounded-[24px] bg-white/[0.05] border border-white/8 p-4"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">AI Coach</h2><p className="text-xs text-[#a8aca3]">{coachMode === 'ai' ? 'AI mode active. Privacy-limited summary only.' : coachMessage}</p></div><button onClick={refreshCoach} disabled={coachLoading} className="rounded-full bg-[#a7ff4f] text-[#071006] px-4 py-2 text-xs font-bold disabled:opacity-60">{coachLoading ? 'Thinking...' : 'AI Refresh'}</button></div></div>{coach.map((item) => <div key={item.title} className="rounded-[22px] bg-white/[0.05] border border-white/8 p-4"><div className="flex items-start gap-3"><Lightbulb className="h-5 w-5 text-[#a7ff4f] shrink-0 mt-0.5"/><div><div className="flex items-center gap-2 mb-1"><h3 className="font-semibold text-sm">{item.title}</h3><span className="rounded-full bg-white/[0.06] border border-white/10 px-2 py-0.5 text-[10px] text-[#cdd3c8]">{item.priority}</span></div><p className="text-xs leading-relaxed text-[#a8aca3]">{item.body}</p><p className="text-[10px] text-[#8d9188] mt-2">{item.category}</p></div></div></div>)}</section>}{tab === 'portfolio' && <section className="space-y-4"><div><h2 className="text-xl font-light">Liquidity Map</h2><p className="text-xs text-[#a8aca3]">Grouped by how easily each account can be accessed.</p></div>{liquidityGroups.map((group) => { const total = group.items.reduce((sum, account) => sum + Math.abs(Number(account.balance)), 0); return <div key={group.title} className="rounded-[24px] bg-white/[0.05] border border-white/8 p-4"><div className="flex items-center justify-between mb-3"><div><h3 className="font-semibold">{group.title}</h3><p className="text-xs text-[#8d9188]">{group.subtitle}</p></div><p className="text-sm font-mono">{hidden || money(total, true)}</p></div><div className="space-y-2">{group.items.map((account) => { const Icon = typeIcon[account.type] ?? Landmark; const native = nativeDisplay(account); const signed = signedValue(account); return <div key={account.id} className="flex items-center justify-between rounded-2xl bg-black/20 border border-white/8 px-3 py-3"><div className="flex items-center gap-3 min-w-0"><Icon className="h-4 w-4 text-[#a7ff4f] shrink-0"/><div className="min-w-0"><p className="text-sm truncate">{account.name}</p><p className="text-[10px] text-[#8d9188]">{isDebt(account) ? '- Liability' : '+ Asset'} · {liquidityLabel(liquidityScore(account))}</p></div></div><div className="text-right"><p className={signed < 0 ? 'text-sm text-red-200' : 'text-sm'}>{signed < 0 ? '-' : '+'}{hidden || money(Math.abs(signed), true)}</p>{native && <p className="text-[10px] text-[#8d9188]">{hidden || native}</p>}</div></div>})}</div></div>})}<div className="rounded-[24px] bg-white/[0.05] border border-white/8 p-4 space-y-4"><h3 className="font-semibold">Asset mix</h3>{breakdown.map((item) => <div key={item.label}><div className="flex justify-between text-sm mb-2"><span>{item.label}</span><span className="font-mono">{hidden || money(item.value, true)} · {item.pct.toFixed(1)}%</span></div><div className="h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full bg-[#a7ff4f]" style={{ width: `${Math.min(item.pct, 100)}%` }}/></div></div>)}</div></section>}</div><button onClick={() => router.push('/accounts')} className="fixed right-5 bottom-24 z-[70] h-14 w-14 rounded-[18px] border-[3px] border-[#2f7dff] bg-[#a7ff4f] text-[#071006] shadow-2xl flex items-center justify-center"><Plus className="h-7 w-7"/></button><nav className="fixed left-4 right-4 bottom-5 z-50 mx-auto max-w-[640px] rounded-[24px] border border-white/15 bg-[#10140f]/90 backdrop-blur-xl p-1.5 shadow-2xl"><div className="grid grid-cols-3 gap-1.5">{(['accounts','insights','portfolio'] as Tab[]).map((item) => { const Icon = item === 'accounts' ? Wallet : item === 'insights' ? Waves : Sparkles; return <button key={item} onClick={() => setTab(item)} className={`h-11 rounded-[18px] flex items-center justify-center gap-2 font-semibold capitalize text-xs ${tab === item ? 'bg-white/18 text-white' : 'text-[#cdd3c8]'}`}><Icon className="h-4 w-4"/><span>{item}</span></button>})}</div></nav></div></main>;
}
