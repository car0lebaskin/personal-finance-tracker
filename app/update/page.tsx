'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, RefreshCw, Save } from 'lucide-react';
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
type Draft = { native: string; rate: string; note: string; rateMeta: string; loading?: boolean };

function today() { return new Date().toISOString().slice(0, 10); }
function money(value: number, compact = false) { return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: compact ? 1 : 0, notation: compact ? 'compact' : 'standard' }).format(value || 0); }
function isDebt(account: Account) { return ['loan', 'credit'].includes(account.type); }
function netValue(account: Account, draft: Draft) { const value = Number(draft.native || 0) * Number(draft.rate || 0); return isDebt(account) ? -Math.abs(value) : value; }

function TodayUpdateContent() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    async function load() {
      const session = await supabase.auth.getSession();
      if (!session.data.session) { router.push('/login'); return; }
      let result = await supabase.from('accounts').select('id,name,institution,type,balance,currency,native_balance,fx_rate').order('created_at', { ascending: false });
      if (result.error && result.error.message.toLowerCase().includes('native_balance')) result = await supabase.from('accounts').select('id,name,institution,type,balance,currency').order('created_at', { ascending: false });
      if (!result.error && result.data) {
        const items = result.data as Account[];
        setAccounts(items);
        const next: Record<string, Draft> = {};
        items.forEach((account) => {
          next[account.id] = {
            native: String(account.native_balance ?? Math.abs(Number(account.balance || 0))),
            rate: String(account.fx_rate ?? 1),
            note: '',
            rateMeta: account.currency === 'MYR' ? 'MYR base currency' : supportsLiveCrypto(account.currency) ? 'Live crypto available' : 'Saved rate',
          };
        });
        setDrafts(next);
      }
      setLoading(false);
    }
    load();
  }, [router]);

  const totals = useMemo(() => accounts.reduce((sum, account) => sum + netValue(account, drafts[account.id] || { native: '0', rate: '1', note: '', rateMeta: '' }), 0), [accounts, drafts]);

  function updateDraft(id: string, patch: Partial<Draft>) {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  }

  async function refreshCrypto(account: Account) {
    const currency = account.currency || 'MYR';
    if (!supportsLiveCrypto(currency)) return;
    updateDraft(account.id, { loading: true });
    setStatus('');
    try {
      const result = await getCryptoMyrRate(currency);
      updateDraft(account.id, { rate: String(result.myrRate), rateMeta: `${result.source} · ${prettyCryptoTime(result.updatedAt)}`, loading: false });
    } catch (error) {
      updateDraft(account.id, { loading: false, rateMeta: 'Manual rate' });
      setStatus(error instanceof Error ? error.message : 'Unable to refresh crypto rate.');
    }
  }

  async function refreshAllCrypto() {
    const cryptoAccounts = accounts.filter((account) => supportsLiveCrypto(account.currency));
    for (const account of cryptoAccounts) await refreshCrypto(account);
  }

  async function saveAll() {
    setSaving(true);
    setStatus('');
    const session = await supabase.auth.getSession();
    const userId = session.data.session?.user.id;
    if (!userId) { router.push('/login'); return; }
    const date = today();
    const ids = accounts.map((account) => account.id);
    await supabase.from('account_snapshots').delete().eq('snapshot_date', date).in('account_id', ids);

    for (const account of accounts) {
      const draft = drafts[account.id];
      const myr = Math.abs(Number(draft.native || 0) * Number(draft.rate || 0));
      let update = await supabase.from('accounts').update({ balance: myr, native_balance: Number(draft.native || 0), fx_rate: Number(draft.rate || 0), currency: account.currency || 'MYR' }).eq('id', account.id);
      if (update.error && update.error.message.toLowerCase().includes('native_balance')) update = await supabase.from('accounts').update({ balance: myr, currency: account.currency || 'MYR' }).eq('id', account.id);
      if (update.error) { setSaving(false); setStatus(update.error.message); return; }
    }

    let snapshot = await supabase.from('account_snapshots').insert(accounts.map((account) => {
      const draft = drafts[account.id];
      return { user_id: userId, account_id: account.id, snapshot_date: date, balance: Math.abs(Number(draft.native || 0) * Number(draft.rate || 0)), native_balance: Number(draft.native || 0), currency: account.currency || 'MYR', fx_rate: Number(draft.rate || 0), notes: draft.note || 'Today update' };
    }));
    if (snapshot.error && snapshot.error.message.toLowerCase().includes('native_balance')) snapshot = await supabase.from('account_snapshots').insert(accounts.map((account) => {
      const draft = drafts[account.id];
      return { user_id: userId, account_id: account.id, snapshot_date: date, balance: Math.abs(Number(draft.native || 0) * Number(draft.rate || 0)), notes: draft.note || 'Today update' };
    }));
    setSaving(false);
    if (snapshot.error) { setStatus(snapshot.error.message); return; }
    setStatus(`Saved ${accounts.length} accounts and created today's snapshot.`);
  }

  if (loading) return <main className="min-h-screen bg-[#080b08] flex items-center justify-center text-[#d8ded2] text-sm">Loading...</main>;

  return <main className="min-h-screen bg-[#080b08] text-[#f4f5ef]"><div className="mx-auto max-w-[720px] min-h-screen relative overflow-hidden"><div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_-10%,rgba(148,255,97,0.12),transparent_34%),linear-gradient(180deg,#182016_0%,#080b08_42%)]"/><div className="relative px-4 pt-6 pb-28"><header className="flex items-center justify-between mb-6"><button onClick={() => router.push('/')} className="h-10 w-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center"><ArrowLeft className="h-5 w-5"/></button><div className="text-center"><h1 className="text-xl font-semibold tracking-tight">Today’s Update</h1><p className="text-xs text-[#8d9188]">{today()}</p></div><button onClick={refreshAllCrypto} className="h-10 w-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center"><RefreshCw className="h-5 w-5"/></button></header><section className="rounded-[28px] bg-white/[0.05] border border-white/8 p-5 mb-4"><p className="text-xs text-[#a8aca3]">Preview net worth</p><p className="text-3xl font-light mt-1">{money(totals)}</p><p className="text-xs text-[#8d9188] mt-2">Crypto accounts can refresh live MYR rates. Other accounts use your manual balance.</p></section><div className="space-y-3">{accounts.map((account) => { const draft = drafts[account.id] || { native: '0', rate: '1', note: '', rateMeta: '' }; const currency = account.currency || 'MYR'; const myr = Math.abs(Number(draft.native || 0) * Number(draft.rate || 0)); const live = supportsLiveCrypto(currency); return <section key={account.id} className="rounded-[24px] bg-white/[0.05] border border-white/8 p-4"><div className="flex items-start justify-between gap-3 mb-3"><div className="min-w-0"><p className="font-semibold truncate">{account.name}</p><p className="text-xs text-[#8d9188] truncate">{isDebt(account) ? '- Liability' : '+ Asset'} · {account.institution}</p></div><p className={isDebt(account) ? 'text-sm text-red-200 font-mono' : 'text-sm font-mono'}>{isDebt(account) ? '-' : '+'}{money(myr, true)}</p></div><div className="grid grid-cols-[1fr_90px] gap-2 mb-2"><div className="rounded-2xl bg-black/25 border border-white/10 px-3 py-3"><p className="text-[10px] text-[#8d9188] mb-1">Balance in {currency}</p><input className="w-full bg-transparent outline-none text-lg" type="number" step="0.000001" value={draft.native} onChange={(e) => updateDraft(account.id, { native: e.target.value })}/></div><div className="rounded-2xl bg-black/25 border border-white/10 px-3 py-3"><p className="text-[10px] text-[#8d9188] mb-1">Rate</p><input className="w-full bg-transparent outline-none text-lg" type="number" step="0.000001" value={draft.rate} onChange={(e) => updateDraft(account.id, { rate: e.target.value, rateMeta: 'Manual rate' })}/></div></div><div className="flex items-center justify-between gap-2 mb-2"><p className="text-[11px] text-[#8d9188] truncate">{draft.rateMeta}</p>{live && <button onClick={() => refreshCrypto(account)} disabled={draft.loading} className="rounded-full border border-[#a7ff4f]/20 bg-[#a7ff4f]/10 px-3 py-1 text-[11px] text-[#dfffc6] disabled:opacity-50 flex items-center gap-1"><RefreshCw className="h-3 w-3"/>{draft.loading ? 'Refreshing' : 'Live price'}</button>}</div><input className="w-full rounded-2xl bg-black/20 border border-white/8 px-3 py-2 outline-none text-sm" placeholder="Optional note" value={draft.note} onChange={(e) => updateDraft(account.id, { note: e.target.value })}/></section>})}</div>{status && <p className="text-xs text-[#a8aca3] mt-4">{status}</p>}<div className="fixed left-4 right-4 bottom-5 z-50 mx-auto max-w-[680px]"><button onClick={saveAll} disabled={saving || !accounts.length} className="w-full rounded-[24px] bg-[#a7ff4f] text-[#071006] py-4 font-bold disabled:opacity-50 flex items-center justify-center gap-2 shadow-2xl">{saving ? <RefreshCw className="h-5 w-5 animate-spin"/> : <Save className="h-5 w-5"/>}{saving ? 'Saving...' : 'Save all + snapshot'}</button></div>{status.includes('Saved') && <div className="fixed right-5 top-5 rounded-full bg-[#a7ff4f] text-[#071006] px-4 py-2 text-sm font-bold flex items-center gap-2"><CheckCircle2 className="h-4 w-4"/>Saved</div>}</div></div></main>;
}

export default function TodayUpdatePage() { return <AppLock><TodayUpdateContent /></AppLock>; }
