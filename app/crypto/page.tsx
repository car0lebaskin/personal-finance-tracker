'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, Save, TrendingDown, TrendingUp } from 'lucide-react';
import AppLock from '@/components/AppLock';
import { supabase } from '@/lib/supabase';
import { getCryptoMyrRate, prettyCryptoTime, supportsLiveCrypto } from '@/lib/crypto';

type Account = {
  id: string;
  name: string;
  institution: string;
  type: string;
  balance: number;
  currency?: string | null;
  native_balance?: number | null;
  fx_rate?: number | null;
};
type LiveState = { rate: number; updatedAt: string; source: string; loading?: boolean; error?: string };

function today() { return new Date().toISOString().slice(0, 10); }
function money(value: number, compact = false) { return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: compact ? 1 : 0, notation: compact ? 'compact' : 'standard' }).format(value || 0); }
function amount(value: number, currency: string) { return `${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 8 })} ${currency}`; }

function CryptoContent() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [prices, setPrices] = useState<Record<string, LiveState>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    async function load() {
      const session = await supabase.auth.getSession();
      if (!session.data.session) { router.push('/login'); return; }
      const full = await supabase.from('accounts').select('id,name,institution,type,balance,currency,native_balance,fx_rate').order('created_at', { ascending: false });
      let rows: Account[] = [];
      if (!full.error && full.data) rows = full.data as Account[];
      else {
        const fallback = await supabase.from('accounts').select('id,name,institution,type,balance,currency').order('created_at', { ascending: false });
        if (!fallback.error && fallback.data) rows = fallback.data as Account[];
      }
      setAccounts(rows.filter((account) => account.type === 'crypto' || supportsLiveCrypto(account.currency)));
      setLoading(false);
    }
    load();
  }, [router]);

  async function refreshOne(account: Account) {
    const currency = account.currency || 'MYR';
    if (!supportsLiveCrypto(currency)) return;
    setPrices((current) => ({ ...current, [account.id]: { ...(current[account.id] || { rate: Number(account.fx_rate || 0), updatedAt: '', source: '' }), loading: true, error: '' } }));
    try {
      const result = await getCryptoMyrRate(currency);
      setPrices((current) => ({ ...current, [account.id]: { rate: result.myrRate, updatedAt: result.updatedAt, source: result.source, loading: false } }));
    } catch (error) {
      setPrices((current) => ({ ...current, [account.id]: { ...(current[account.id] || { rate: Number(account.fx_rate || 0), updatedAt: '', source: '' }), loading: false, error: error instanceof Error ? error.message : 'Price unavailable' } }));
    }
  }

  async function refreshAll() {
    setStatus('');
    for (const account of accounts) await refreshOne(account);
  }

  useEffect(() => { if (accounts.length) refreshAll(); }, [accounts.length]);

  const rows = useMemo(() => accounts.map((account) => {
    const currency = account.currency || 'MYR';
    const live = prices[account.id];
    const native = Number(account.native_balance ?? account.balance ?? 0);
    const savedRate = Number(account.fx_rate ?? 1);
    const savedValue = Math.abs(Number(account.balance || native * savedRate));
    const liveRate = live?.rate || savedRate;
    const liveValue = Math.abs(native * liveRate);
    const change = liveValue - savedValue;
    return { account, currency, native, savedValue, liveValue, change, live };
  }), [accounts, prices]);

  const totalLive = rows.reduce((sum, row) => sum + row.liveValue, 0);
  const totalSaved = rows.reduce((sum, row) => sum + row.savedValue, 0);
  const totalChange = totalLive - totalSaved;

  async function saveLiveValues() {
    setSaving(true);
    setStatus('');
    const session = await supabase.auth.getSession();
    const userId = session.data.session?.user.id;
    if (!userId) { router.push('/login'); return; }
    const date = today();
    for (const row of rows) {
      const liveRate = row.live?.rate || Number(row.account.fx_rate ?? 1);
      const liveValue = Math.abs(row.native * liveRate);
      let update = await supabase.from('accounts').update({ balance: liveValue, native_balance: row.native, fx_rate: liveRate, currency: row.currency }).eq('id', row.account.id);
      if (update.error && update.error.message.toLowerCase().includes('native_balance')) update = await supabase.from('accounts').update({ balance: liveValue, currency: row.currency }).eq('id', row.account.id);
      if (update.error) { setSaving(false); setStatus(update.error.message); return; }
      await supabase.from('account_snapshots').delete().eq('account_id', row.account.id).eq('snapshot_date', date);
    }
    let snapshot = await supabase.from('account_snapshots').insert(rows.map((row) => ({ user_id: userId, account_id: row.account.id, snapshot_date: date, balance: row.liveValue, native_balance: row.native, currency: row.currency, fx_rate: row.live?.rate || Number(row.account.fx_rate ?? 1), notes: 'Live crypto refresh' })));
    if (snapshot.error && snapshot.error.message.toLowerCase().includes('native_balance')) snapshot = await supabase.from('account_snapshots').insert(rows.map((row) => ({ user_id: userId, account_id: row.account.id, snapshot_date: date, balance: row.liveValue, notes: 'Live crypto refresh' })));
    setSaving(false);
    if (snapshot.error) { setStatus(snapshot.error.message); return; }
    setStatus('Live crypto values saved and snapshot updated.');
  }

  if (loading) return <main className="min-h-screen bg-[#080b08] flex items-center justify-center text-[#d8ded2] text-sm">Loading...</main>;

  return <main className="min-h-screen bg-[#080b08] text-[#f4f5ef]"><div className="mx-auto max-w-[720px] min-h-screen relative overflow-hidden"><div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_-10%,rgba(148,255,97,0.12),transparent_34%),linear-gradient(180deg,#182016_0%,#080b08_42%)]"/><div className="relative px-4 pt-6 pb-28"><header className="flex items-center justify-between mb-6"><button onClick={() => router.push('/')} className="h-10 w-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center"><ArrowLeft className="h-5 w-5"/></button><div className="text-center"><h1 className="text-xl font-semibold tracking-tight">Live Crypto</h1><p className="text-xs text-[#8d9188]">CoinGecko MYR prices</p></div><button onClick={refreshAll} className="h-10 w-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center"><RefreshCw className="h-5 w-5"/></button></header><section className="rounded-[28px] bg-white/[0.05] border border-white/8 p-5 mb-4"><p className="text-xs text-[#a8aca3]">Live crypto value</p><p className="text-3xl font-light mt-1">{money(totalLive)}</p><p className={totalChange >= 0 ? 'text-xs text-[#75efad] mt-2' : 'text-xs text-red-200 mt-2'}>{totalChange >= 0 ? '+' : ''}{money(totalChange)} versus saved value</p></section>{!rows.length && <section className="rounded-[24px] bg-white/[0.05] border border-white/8 p-4 text-sm text-[#a8aca3]">No crypto accounts found yet. Add an account with currency BTC, ETH, USDT, USDC, BNB, SOL, or XRP.</section>}<div className="space-y-3">{rows.map((row) => <section key={row.account.id} className="rounded-[24px] bg-white/[0.05] border border-white/8 p-4"><div className="flex items-start justify-between gap-3 mb-3"><div className="min-w-0"><p className="font-semibold truncate">{row.account.name}</p><p className="text-xs text-[#8d9188] truncate">{amount(row.native, row.currency)} · {row.account.institution}</p></div><div className="text-right"><p className="text-sm font-mono">{money(row.liveValue, true)}</p><p className={row.change >= 0 ? 'text-xs text-[#75efad]' : 'text-xs text-red-200'}>{row.change >= 0 ? '+' : ''}{money(row.change, true)}</p></div></div><div className="flex items-center justify-between gap-3 rounded-2xl bg-black/20 px-3 py-3"><div><p className="text-[10px] text-[#8d9188]">Live rate</p><p className="text-sm">RM{(row.live?.rate || Number(row.account.fx_rate || 0)).toLocaleString()}</p><p className="text-[10px] text-[#8d9188] mt-1">{row.live?.updatedAt ? `${row.live.source} · ${prettyCryptoTime(row.live.updatedAt)}` : 'Saved rate'}</p>{row.live?.error && <p className="text-[10px] text-red-200 mt-1">{row.live.error}</p>}</div><button onClick={() => refreshOne(row.account)} disabled={row.live?.loading} className="rounded-full border border-[#a7ff4f]/20 bg-[#a7ff4f]/10 px-3 py-2 text-xs text-[#dfffc6] disabled:opacity-50 flex items-center gap-1"><RefreshCw className="h-3 w-3"/>{row.live?.loading ? 'Refreshing' : 'Refresh'}</button></div></section>)}</div>{status && <p className="text-xs text-[#a8aca3] mt-4">{status}</p>}<div className="fixed left-4 right-4 bottom-5 z-50 mx-auto max-w-[680px]"><button onClick={saveLiveValues} disabled={saving || !rows.length} className="w-full rounded-[24px] bg-[#a7ff4f] text-[#071006] py-4 font-bold disabled:opacity-50 flex items-center justify-center gap-2 shadow-2xl">{saving ? <RefreshCw className="h-5 w-5 animate-spin"/> : <Save className="h-5 w-5"/>}{saving ? 'Saving...' : 'Save live values'}</button></div></div></div></main>;
}

export default function CryptoPage() { return <AppLock><CryptoContent /></AppLock>; }
