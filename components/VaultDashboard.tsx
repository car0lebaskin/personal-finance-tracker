'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ElementType } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, Coins, CreditCard, Eye, EyeOff, Home, Landmark, Lightbulb, Plus, RefreshCw, Save, Sparkles, Target, Trophy, UserCircle, Wallet, Waves, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getBreakdown, getTotals, nativeDisplay } from '@/lib/finance';
import type { Account } from '@/lib/finance';
import { buildPortfolioCoach, type CoachAction } from '@/lib/coach';
import { getMyrRate, prettyRateTime } from '@/lib/fx';

type Tab = 'accounts' | 'insights' | 'portfolio';
type Filter = 'all' | 'cash' | 'investment' | 'crypto' | 'retirement' | 'property' | 'loan';
type Snapshot = { account_id: string; snapshot_date: string; balance: number };
type VaultAccount = Account & { liquidity?: number | null };
type CoachResponse = { mode?: string; actions?: CoachAction[]; error?: string };

const filters: { value: Filter; label: string; types?: string[] }[] = [
  { value: 'all', label: 'All' },
  { value: 'cash', label: 'Cash', types: ['checking', 'savings', 'cash'] },
  { value: 'investment', label: 'Invest', types: ['investment'] },
  { value: 'crypto', label: 'Crypto', types: ['crypto'] },
  { value: 'retirement', label: 'EPF', types: ['retirement'] },
  { value: 'property', label: 'Property', types: ['property'] },
  { value: 'loan', label: 'Debt', types: ['loan', 'credit'] },
];
const currencies = ['MYR', 'USD', 'USDT', 'SGD', 'EUR', 'BTC', 'ETH'];
const typeIcon: Record<string, ElementType> = { checking: Landmark, savings: Landmark, cash: Wallet, investment: BarChart3, crypto: Coins, retirement: Trophy, property: Home, loan: CreditCard, credit: CreditCard };
const typeLabel: Record<string, string> = { checking: 'Checking', savings: 'Savings', cash: 'Cash', investment: 'Investment', crypto: 'Crypto', retirement: 'Retirement', property: 'Property', loan: 'Loan', credit: 'Credit' };
const COACH_LIMIT_KEY = 'vault_coach_ai_limit_v1';
const COACH_DAILY_LIMIT = 3;

function today() { return new Date().toISOString().slice(0, 10); }
function money(value: number, compact = false) { return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: compact ? 1 : 0, notation: compact ? 'compact' : 'standard' }).format(value || 0); }
function nativeAmount(value: string, currency: string) { return `${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 6 })} ${currency}`; }
function pct(value: number, base: number) { return base > 0 ? (value / base) * 100 : 0; }
function coachUsage() { try { return JSON.parse(localStorage.getItem(COACH_LIMIT_KEY) || '{}') as { date?: string; count?: number }; } catch { return {}; } }
function liquidityScore(account: VaultAccount) {
  if (typeof account.liquidity === 'number') return account.liquidity;
  if (['checking', 'savings', 'cash'].includes(account.type)) return 1;
  if (['crypto', 'investment'].includes(account.type)) return 2;
  if (account.type === 'retirement') return 4;
  if (account.type === 'property') return 5;
  if (['loan', 'credit'].includes(account.type)) return 6;
  return 3;
}
function liquidityLabel(score: number) {
  if (score <= 1) return 'Immediate';
  if (score === 2) return 'Market liquid';
  if (score === 3) return 'Medium-term';
  if (score <= 5) return 'Locked / illiquid';
  return 'Liabilities';
}
function isDebt(account: VaultAccount) { return ['loan', 'credit'].includes(account.type); }

export default function VaultDashboard() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<VaultAccount[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('accounts');
  const [filter, setFilter] = useState<Filter>('all');
  const [privacy, setPrivacy] = useState(false);
  const [status, setStatus] = useState('');
  const [snapshotSaving, setSnapshotSaving] = useState(false);
  const [coach, setCoach] = useState<CoachAction[]>([]);
  const [coachMode, setCoachMode] = useState<'ai' | 'local'>('local');
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachMessage, setCoachMessage] = useState('Local review. AI runs only when you tap AI Refresh.');
  const [quickAccount, setQuickAccount] = useState<VaultAccount | null>(null);
  const [quickCurrency, setQuickCurrency] = useState('MYR');
  const [quickNative, setQuickNative] = useState('');
  const [quickRate, setQuickRate] = useState('1');
  const [quickDate, setQuickDate] = useState(today());
  const [quickNote, setQuickNote] = useState('');
  const [quickRateMeta, setQuickRateMeta] = useState('Saved rate');
  const [quickRateLoading, setQuickRateLoading] = useState(false);
  const [quickSaving, setQuickSaving] = useState(false);
  const hidden = privacy ? '••••••' : null;
  const quickMyr = Number(quickNative || 0) * Number(quickRate || 0);

  async function loadData() {
    const session = await supabase.auth.getSession();
    if (!session.data.session) { router.push('/login'); return; }
    const fullResult = await supabase.from('accounts').select('id,name,institution,type,balance,currency,native_balance,fx_rate,liquidity').order('created_at', { ascending: false });
    if (!fullResult.error && fullResult.data) setAccounts(fullResult.data as VaultAccount[]);
    else {
      const basicResult = await supabase.from('accounts').select('id,name,institution,type,balance,currency,native_balance,fx_rate').order('created_at', { ascending: false });
      if (!basicResult.error && basicResult.data) setAccounts(basicResult.data as VaultAccount[]);
      else {
        const finalResult = await supabase.from('accounts').select('id,name,institution,type,balance,currency').order('created_at', { ascending: false });
        if (!finalResult.error && finalResult.data) setAccounts(finalResult.data as VaultAccount[]);
      }
    }
    const snapshotResult = await supabase.from('account_snapshots').select('account_id,snapshot_date,balance').order('snapshot_date', { ascending: true });
    if (!snapshotResult.error && snapshotResult.data) setSnapshots(snapshotResult.data as Snapshot[]);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);
  useEffect(() => { setCoach(buildPortfolioCoach(accounts)); setCoachMode('local'); }, [accounts]);

  const totals = useMemo(() => getTotals(accounts), [accounts]);
  const breakdown = useMemo(() => getBreakdown(totals), [totals]);
  const visibleAccounts = useMemo(() => {
    const selected = filters.find((item) => item.value === filter);
    return selected?.types ? accounts.filter((item) => selected.types!.includes(item.type)) : accounts;
  }, [accounts, filter]);
  const cashPercent = pct(totals.cash, totals.assets);
  const investPercent = pct(totals.investments, totals.assets);
  const cryptoPercent = pct(totals.crypto, totals.assets);
  const liquidValue = totals.cash + totals.investments + totals.crypto;
  const liquidPercent = pct(liquidValue, totals.assets);
  const debtRatio = pct(totals.liabilities, totals.assets);
  const largestAccount = [...accounts].sort((a, b) => Math.abs(Number(b.balance)) - Math.abs(Number(a.balance)))[0];
  const largestPct = largestAccount ? pct(Math.abs(Number(largestAccount.balance)), totals.assets) : 0;
  const nextMilestone = Math.ceil((totals.netWorth + 1) / 100000) * 100000;
  const milestoneGap = Math.max(nextMilestone - totals.netWorth, 0);
  const forecast = totals.netWorth + Math.max(totals.netWorth * 0.06, 0);

  const latestChange = useMemo(() => {
    const dates = Array.from(new Set(snapshots.map((item) => item.snapshot_date))).sort();
    if (dates.length < 2) return 0;
    const valueAt = (date: string) => accounts.reduce((sum, account) => {
      const rows = snapshots.filter((snap) => snap.account_id === account.id && snap.snapshot_date <= date);
      const latest = rows[rows.length - 1];
      const amount = latest ? Number(latest.balance) : Number(account.balance || 0);
      return sum + (isDebt(account) ? -Math.abs(amount) : amount);
    }, 0);
    return valueAt(dates[dates.length - 1]) - valueAt(dates[dates.length - 2]);
  }, [accounts, snapshots]);

  const liquidityGroups = useMemo(() => {
    const buckets = [
      { title: 'Immediate', subtitle: 'Cash, bank, wallet', items: [] as VaultAccount[] },
      { title: 'Market liquid', subtitle: 'Investments and crypto', items: [] as VaultAccount[] },
      { title: 'Medium-term', subtitle: 'Accessible but not instant', items: [] as VaultAccount[] },
      { title: 'Locked / illiquid', subtitle: 'EPF, property, long-term assets', items: [] as VaultAccount[] },
      { title: 'Liabilities', subtitle: 'Loans and credit balances', items: [] as VaultAccount[] },
    ];
    accounts.forEach((account) => {
      const score = liquidityScore(account);
      if (score <= 1) buckets[0].items.push(account);
      else if (score === 2) buckets[1].items.push(account);
      else if (score === 3) buckets[2].items.push(account);
      else if (score <= 5) buckets[3].items.push(account);
      else buckets[4].items.push(account);
    });
    return buckets.filter((bucket) => bucket.items.length);
  }, [accounts]);

  async function refreshCoach() {
    const useDate = today();
    const usage = coachUsage();
    const count = usage.date === useDate ? usage.count || 0 : 0;
    if (count >= COACH_DAILY_LIMIT) { setCoachMessage(`Daily AI limit reached (${COACH_DAILY_LIMIT}). Local review is still active.`); setCoachMode('local'); return; }
    localStorage.setItem(COACH_LIMIT_KEY, JSON.stringify({ date: useDate, count: count + 1 }));
    setCoachLoading(true);
    setCoachMessage('Refreshing with privacy-limited AI summary...');
    try {
      const response = await fetch('/api/coach', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accounts }) });
      const data = await response.json() as CoachResponse;
      setCoach(Array.isArray(data.actions) ? data.actions : buildPortfolioCoach(accounts));
      setCoachMode(data.mode === 'ai' ? 'ai' : 'local');
      setCoachMessage(data.mode === 'ai' ? `AI mode active. ${COACH_DAILY_LIMIT - count - 1} AI refreshes left today.` : data.error || 'AI unavailable. Local review is active.');
    } catch (error) {
      setCoach(buildPortfolioCoach(accounts));
      setCoachMode('local');
      setCoachMessage(error instanceof Error ? error.message : 'AI unavailable. Local review is active.');
    }
    setCoachLoading(false);
  }

  function openQuickUpdate(account: VaultAccount) { setQuickAccount(account); setQuickCurrency(account.currency || 'MYR'); setQuickNative(String(account.native_balance ?? account.balance ?? 0)); setQuickRate(String(account.fx_rate ?? 1)); setQuickDate(today()); setQuickNote(''); setQuickRateMeta(account.currency === 'MYR' ? 'MYR base currency' : 'Saved rate'); }
  async function refreshQuickRate() { if (quickCurrency === 'MYR') return; setQuickRateLoading(true); setStatus(''); try { const result = await getMyrRate(quickCurrency); setQuickRate(String(result.rate)); setQuickRateMeta(`${result.source} · ${prettyRateTime(result.updatedAt)}`); } catch (error) { setStatus(error instanceof Error ? error.message : 'Unable to refresh rate.'); setQuickRateMeta('Manual rate'); } setQuickRateLoading(false); }
  async function saveQuickUpdate() { if (!quickAccount) return; setQuickSaving(true); setStatus(''); const session = await supabase.auth.getSession(); const userId = session.data.session?.user.id; if (!userId) { router.push('/login'); return; } let update = await supabase.from('accounts').update({ balance: quickMyr, currency: quickCurrency, native_balance: Number(quickNative), fx_rate: Number(quickRate) }).eq('id', quickAccount.id); if (update.error && update.error.message.toLowerCase().includes('native_balance')) update = await supabase.from('accounts').update({ balance: quickMyr, currency: quickCurrency }).eq('id', quickAccount.id); if (update.error) { setQuickSaving(false); setStatus(update.error.message); return; } await supabase.from('account_snapshots').delete().eq('account_id', quickAccount.id).eq('snapshot_date', quickDate); let snapshot = await supabase.from('account_snapshots').insert({ user_id: userId, account_id: quickAccount.id, snapshot_date: quickDate, balance: quickMyr, native_balance: Number(quickNative), currency: quickCurrency, fx_rate: Number(quickRate), notes: quickNote || 'Quick update' }); if (snapshot.error && snapshot.error.message.toLowerCase().includes('native_balance')) snapshot = await supabase.from('account_snapshots').insert({ user_id: userId, account_id: quickAccount.id, snapshot_date: quickDate, balance: quickMyr, notes: quickNote || 'Quick update' }); setQuickSaving(false); if (snapshot.error) { setStatus(snapshot.error.message); return; } setQuickAccount(null); setStatus(`${quickAccount.name} updated.`); await loadData(); }
  async function snapshotToday() { setStatus(''); if (!accounts.length) { setStatus('Add accounts before creating a snapshot.'); return; } setSnapshotSaving(true); const session = await supabase.auth.getSession(); const userId = session.data.session?.user.id; if (!userId) { router.push('/login'); return; } const date = today(); const ids = accounts.map((item) => item.id); await supabase.from('account_snapshots').delete().eq('snapshot_date', date).in('account_id', ids); let result = await supabase.from('account_snapshots').insert(accounts.map((account) => ({ user_id: userId, account_id: account.id, snapshot_date: date, balance: Number(account.balance), native_balance: Number(account.native_balance ?? account.balance), currency: account.currency || 'MYR', fx_rate: Number(account.fx_rate ?? 1), notes: 'Daily snapshot' }))); if (result.error && result.error.message.toLowerCase().includes('native_balance')) result = await supabase.from('account_snapshots').insert(accounts.map((account) => ({ user_id: userId, account_id: account.id, snapshot_date: date, balance: Number(account.balance), notes: 'Daily snapshot' }))); setSnapshotSaving(false); setStatus(result.error ? result.error.message : `Today's snapshot updated for ${accounts.length} accounts.`); await loadData(); }

  if (loading) return <main className="min-h-screen bg-[#080b08] flex items-center justify-center text-[#d8ded2] text-sm">Loading...</main>;
  return <main className="min-h-screen bg-[#080b08] text-[#f4f5ef]"><div className="mx-auto max-w-[680px] min-h-screen relative overflow-hidden pb-32"><div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_-10%,rgba(148,255,97,0.12),transparent_34%),linear-gradient(180deg,#182016_0%,#080b08_42%)]"/><div className="relative px-4 pt-6"><header className="flex items-center justify-between mb-6"><h1 className="text-xl font-semibold tracking-tight">{tab === 'accounts' ? 'Vault' : tab === 'insights' ? 'Insights' : 'Portfolio'}</h1><div className="flex gap-2"><button onClick={() => setPrivacy(!privacy)} className="h-9 w-9 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center">{privacy ? <EyeOff className="h-5 w-5"/> : <Eye className="h-5 w-5"/>}</button><button onClick={() => router.push('/accounts/profile')} className="h-9 w-9 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center"><UserCircle className="h-6 w-6"/></button></div></header>{tab === 'accounts' && <section><p className="text-[#a8aca3] text-xs mb-1.5">Net worth</p><div className="text-[1.7rem] leading-tight font-light tracking-tight mb-1">{hidden || money(totals.netWorth)}</div><p className={latestChange >= 0 ? 'text-xs text-[#75efad] mb-4' : 'text-xs text-red-200 mb-4'}>{latestChange >= 0 ? '+' : ''}{hidden || money(latestChange)} since previous snapshot</p><button onClick={snapshotToday} disabled={snapshotSaving} className="w-full rounded-2xl bg-[#a7ff4f] text-[#071006] font-semibold text-sm py-3 mb-3 disabled:opacity-60">{snapshotSaving ? 'Saving snapshot...' : 'Snapshot today'}</button>{status && <p className="text-xs text-[#a8aca3] mb-3">{status}</p>}<div className="mb-4 -mx-4 overflow-x-auto no-scrollbar"><div className="flex items-center gap-2 px-4 py-1 w-max min-w-full">{filters.map((item) => <button key={item.value} onClick={() => setFilter(item.value)} className={`shrink-0 rounded-full border px-4 py-2 text-xs leading-none whitespace-nowrap ${filter === item.value ? 'bg-[#a7ff4f] border-[#a7ff4f] text-[#071006]' : 'bg-white/[0.04] border-white/10 text-[#cdd3c8]'}`}>{item.label}</button>)}</div></div><div className="space-y-1">{visibleAccounts.map((account) => { const Icon = typeIcon[account.type] ?? Landmark; const native = nativeDisplay(account); return <button key={account.id} onClick={() => openQuickUpdate(account)} className="w-full flex items-center justify-between gap-3 rounded-2xl bg-white/[0.03] border border-white/8 px-4 py-3 text-left"><div className="flex items-center gap-3 min-w-0"><div className="h-10 w-10 rounded-2xl bg-white/[0.06] flex items-center justify-center shrink-0"><Icon className="h-5 w-5 text-[#a7ff4f]"/></div><div className="min-w-0"><p className="text-sm truncate">{account.name}</p><p className="text-xs text-[#8d9188] truncate">{account.institution}</p></div></div><div className="text-right shrink-0"><p className="text-sm font-medium">{hidden || money(Math.abs(Number(account.balance)))}</p>{native && <p className="text-[10px] text-[#8d9188]">{hidden || native}</p>}</div></button>})}</div></section>}{tab === 'insights' && <section className="space-y-4"><div className="rounded-[24px] bg-white/[0.05] border border-white/8 p-4"><p className="text-xs text-[#a8aca3] mb-3">Big picture</p><div className="grid grid-cols-2 gap-3"><div><p className="text-xs text-[#8d9188]">Forecast</p><p className="text-xl font-semibold">{hidden || money(forecast, true)}</p><p className="text-[10px] text-[#8d9188]">Simple 6% growth placeholder</p></div><div><p className="text-xs text-[#8d9188]">Next milestone</p><p className="text-xl font-semibold">{hidden || money(nextMilestone, true)}</p><p className="text-[10px] text-[#8d9188]">{hidden || money(milestoneGap, true)} to go</p></div></div></div><div className="rounded-[24px] bg-white/[0.05] border border-white/8 p-4"><p className="text-xs text-[#a8aca3] mb-3">Momentum</p><div className="grid grid-cols-2 gap-3"><div><p className="text-xs text-[#8d9188]">Recent change</p><p className={latestChange >= 0 ? 'text-xl font-semibold text-[#75efad]' : 'text-xl font-semibold text-red-200'}>{latestChange >= 0 ? '+' : ''}{hidden || money(latestChange, true)}</p></div><div><p className="text-xs text-[#8d9188]">Within reach</p><p className="text-xl font-semibold">{liquidPercent.toFixed(0)}%</p><p className="text-[10px] text-[#8d9188]">{hidden || money(liquidValue, true)} liquid</p></div></div></div><div className="rounded-[24px] bg-white/[0.05] border border-white/8 p-4"><p className="text-xs text-[#a8aca3] mb-3">What drives net worth</p><div className="flex items-center gap-4"><div className="h-24 w-24 rounded-full shrink-0" style={{ background: `conic-gradient(#a7ff4f 0 ${Math.min(largestPct, 100)}%, rgba(255,255,255,0.12) ${Math.min(largestPct, 100)}% 100%)` }}/><div className="min-w-0"><p className="text-sm text-[#8d9188]">Largest position</p><p className="text-lg font-semibold truncate">{largestAccount?.name || 'None yet'}</p><p className="text-xs text-[#a8aca3]">{largestPct.toFixed(0)}% of assets · Debt ratio {debtRatio.toFixed(0)}%</p><div className="flex flex-wrap gap-1 mt-2">{accounts.slice(0, 6).map((account) => <span key={account.id} className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] text-[#cdd3c8]">{typeLabel[account.type] || account.type}</span>)}</div></div></div></div><div className="rounded-[24px] bg-white/[0.05] border border-white/8 p-4"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">AI Coach</h2><p className="text-xs text-[#a8aca3]">{coachMode === 'ai' ? 'AI mode active. Privacy-limited summary only.' : coachMessage}</p></div><button onClick={refreshCoach} disabled={coachLoading} className="rounded-full bg-[#a7ff4f] text-[#071006] px-4 py-2 text-xs font-bold disabled:opacity-60">{coachLoading ? 'Thinking...' : 'AI Refresh'}</button></div></div>{coach.map((item) => <div key={item.title} className="rounded-[22px] bg-white/[0.05] border border-white/8 p-4"><div className="flex items-start gap-3"><Lightbulb className="h-5 w-5 text-[#a7ff4f] shrink-0 mt-0.5"/><div><div className="flex items-center gap-2 mb-1"><h3 className="font-semibold text-sm">{item.title}</h3><span className="rounded-full bg-white/[0.06] border border-white/10 px-2 py-0.5 text-[10px] text-[#cdd3c8]">{item.priority}</span></div><p className="text-xs leading-relaxed text-[#a8aca3]">{item.body}</p><p className="text-[10px] text-[#8d9188] mt-2">{item.category}</p></div></div></div>)}</section>}{tab === 'portfolio' && <section className="space-y-4"><div><h2 className="text-xl font-light">Liquidity Map</h2><p className="text-xs text-[#a8aca3]">Grouped by how easily each account can be accessed.</p></div>{liquidityGroups.map((group) => { const total = group.items.reduce((sum, account) => sum + Math.abs(Number(account.balance)), 0); return <div key={group.title} className="rounded-[24px] bg-white/[0.05] border border-white/8 p-4"><div className="flex items-center justify-between mb-3"><div><h3 className="font-semibold">{group.title}</h3><p className="text-xs text-[#8d9188]">{group.subtitle}</p></div><p className="text-sm font-mono">{hidden || money(total, true)}</p></div><div className="space-y-2">{group.items.map((account) => { const Icon = typeIcon[account.type] ?? Landmark; const native = nativeDisplay(account); return <div key={account.id} className="flex items-center justify-between rounded-2xl bg-black/20 border border-white/8 px-3 py-3"><div className="flex items-center gap-3 min-w-0"><Icon className="h-4 w-4 text-[#a7ff4f] shrink-0"/><div className="min-w-0"><p className="text-sm truncate">{account.name}</p><p className="text-[10px] text-[#8d9188]">{liquidityLabel(liquidityScore(account))}</p></div></div><div className="text-right"><p className="text-sm">{hidden || money(Math.abs(Number(account.balance)), true)}</p>{native && <p className="text-[10px] text-[#8d9188]">{hidden || native}</p>}</div></div>})}</div></div>})}<div className="rounded-[24px] bg-white/[0.05] border border-white/8 p-4 space-y-4"><h3 className="font-semibold">Asset mix</h3>{breakdown.map((item) => <div key={item.label}><div className="flex justify-between text-sm mb-2"><span>{item.label}</span><span className="font-mono">{hidden || money(item.value, true)} · {item.pct.toFixed(1)}%</span></div><div className="h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full bg-[#a7ff4f]" style={{ width: `${Math.min(item.pct, 100)}%` }}/></div></div>)}</div></section>}</div><button onClick={() => router.push('/accounts')} className="fixed right-5 bottom-24 z-[70] h-14 w-14 rounded-[18px] border-[3px] border-[#2f7dff] bg-[#a7ff4f] text-[#071006] shadow-2xl flex items-center justify-center"><Plus className="h-7 w-7"/></button><nav className="fixed left-4 right-4 bottom-5 z-50 mx-auto max-w-[640px] rounded-[24px] border border-white/15 bg-[#10140f]/90 backdrop-blur-xl p-1.5 shadow-2xl"><div className="grid grid-cols-3 gap-1.5">{(['accounts','insights','portfolio'] as Tab[]).map((item) => { const Icon = item === 'accounts' ? Wallet : item === 'insights' ? Waves : Sparkles; return <button key={item} onClick={() => setTab(item)} className={`h-11 rounded-[18px] flex items-center justify-center gap-2 font-semibold capitalize text-xs ${tab === item ? 'bg-white/18 text-white' : 'text-[#cdd3c8]'}`}><Icon className="h-4 w-4"/><span>{item}</span></button>})}</div></nav>{quickAccount && <div className="fixed inset-0 z-[90] bg-black/55 backdrop-blur-sm flex items-end"><div className="w-full max-w-[680px] mx-auto rounded-t-[28px] bg-[#11160f] border-t border-white/10 p-5 shadow-2xl max-h-[88vh] overflow-y-auto"><div className="flex items-start justify-between mb-5"><div><p className="text-xs text-[#a8aca3]">Quick update</p><h2 className="text-xl font-semibold">{quickAccount.name}</h2></div><button onClick={() => setQuickAccount(null)} className="h-10 w-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center"><X className="h-5 w-5"/></button></div><label className="block text-sm text-[#a8aca3] mb-2">Date</label><input type="date" value={quickDate} onChange={(e) => setQuickDate(e.target.value)} className="w-full rounded-2xl bg-black/25 border border-white/10 px-4 py-3 outline-none mb-4"/><label className="block text-sm text-[#a8aca3] mb-2">Currency</label><select value={quickCurrency} onChange={(e) => { setQuickCurrency(e.target.value); if (e.target.value === 'MYR') { setQuickRate('1'); setQuickRateMeta('MYR base currency'); } }} className="w-full rounded-2xl bg-black/25 border border-white/10 px-4 py-3 outline-none mb-4">{currencies.map((item) => <option key={item} value={item}>{item}</option>)}</select><label className="block text-sm text-[#a8aca3] mb-2">Balance in {quickCurrency}</label><div className="flex items-center gap-3 rounded-2xl bg-black/25 border border-white/10 px-4 py-4 mb-4"><span className="text-[#a8aca3]">{quickCurrency}</span><input className="w-full bg-transparent outline-none text-2xl font-light" type="number" step="0.000001" value={quickNative} onChange={(e) => setQuickNative(e.target.value)}/></div><div className="flex items-center justify-between mb-2"><label className="block text-sm text-[#a8aca3]">MYR rate per 1 {quickCurrency}</label><button type="button" onClick={refreshQuickRate} disabled={quickCurrency === 'MYR' || quickRateLoading} className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-[#d8ded2] disabled:opacity-40 flex items-center gap-1"><RefreshCw className="h-3 w-3"/>{quickRateLoading ? 'Refreshing' : 'Refresh'}</button></div><div className="flex items-center gap-3 rounded-2xl bg-black/25 border border-white/10 px-4 py-4 mb-2"><span className="text-[#a8aca3]">RM</span><input className="w-full bg-transparent outline-none text-2xl font-light" type="number" step="0.000001" value={quickRate} onChange={(e) => { setQuickRate(e.target.value); setQuickRateMeta('Manual override'); }} disabled={quickCurrency === 'MYR'}/></div><p className="text-xs text-[#8d9188] mb-4">{quickRateMeta}</p><div className="rounded-2xl border border-[#a7ff4f]/20 bg-[#a7ff4f]/10 px-4 py-3 mb-4"><p className="text-xs text-[#a8aca3]">MYR value used in net worth</p><p className="text-xl font-semibold">{money(quickMyr)}</p><p className="text-xs text-[#a8aca3] mt-1">{nativeAmount(quickNative, quickCurrency)} × RM{Number(quickRate || 0).toLocaleString()}</p></div><textarea value={quickNote} onChange={(e) => setQuickNote(e.target.value)} placeholder="Optional note" className="w-full min-h-20 rounded-2xl bg-black/25 border border-white/10 px-4 py-3 outline-none mb-4"/><div className="grid grid-cols-2 gap-3"><button onClick={() => router.push(`/accounts/${quickAccount.id}`)} className="rounded-2xl bg-white/[0.06] border border-white/10 py-4 font-semibold">View details</button><button onClick={saveQuickUpdate} disabled={quickSaving} className="rounded-2xl bg-[#a7ff4f] text-[#071006] py-4 font-bold disabled:opacity-60 flex items-center justify-center gap-2"><Save className="h-4 w-4"/>{quickSaving ? 'Saving...' : 'Save'}</button></div></div></div>}</div></main>;
}
