'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';

type Account = { id: string; name: string; institution: string; type: string; balance: number; currency?: string | null; native_balance?: number | null; fx_rate?: number | null; notes: string | null };
type Snapshot = { id: string; snapshot_date: string; balance: number; notes: string | null };
const currencies = ['MYR', 'USD', 'USDT', 'SGD', 'EUR', 'BTC', 'ETH'];
function today() { return new Date().toISOString().slice(0, 10); }
function money(value: number) { return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: 2 }).format(value || 0); }
function compact(value: number) { return new Intl.NumberFormat('en-MY', { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0); }

export default function AccountDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [account, setAccount] = useState<Account | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [nativeBalance, setNativeBalance] = useState('');
  const [currency, setCurrency] = useState('MYR');
  const [fxRate, setFxRate] = useState('1');
  const [snapshotDate, setSnapshotDate] = useState(today());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const myrValue = useMemo(() => Number(nativeBalance || 0) * Number(fxRate || 0), [nativeBalance, fxRate]);

  useEffect(() => {
    async function loadAccount() {
      const session = await supabase.auth.getSession();
      if (!session.data.session) { router.push('/login'); return; }
      let result = await supabase.from('accounts').select('id,name,institution,type,balance,currency,native_balance,fx_rate,notes').eq('id', params.id).single();
      if (result.error && result.error.message.toLowerCase().includes('native_balance')) result = await supabase.from('accounts').select('id,name,institution,type,balance,currency,notes').eq('id', params.id).single();
      if (result.error) { setError(result.error.message); return; }
      const item = result.data as Account;
      setAccount(item);
      setCurrency(item.currency || 'MYR');
      setNativeBalance(String(item.native_balance ?? item.balance ?? 0));
      setFxRate(String(item.fx_rate ?? 1));
      setNotes(item.notes || '');
      const history = await supabase.from('account_snapshots').select('id,snapshot_date,balance,notes').eq('account_id', params.id).order('snapshot_date', { ascending: true });
      if (!history.error && history.data) setSnapshots(history.data as Snapshot[]);
    }
    loadAccount();
  }, [params.id, router]);
  useEffect(() => { if (currency === 'MYR') setFxRate('1'); }, [currency]);

  const chart = useMemo(() => {
    const preview = { id: 'preview', snapshot_date: snapshotDate, balance: myrValue, notes };
    const merged = [...snapshots.filter((s) => s.snapshot_date !== snapshotDate), preview].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
    const points = merged.length ? merged : [preview];
    const max = Math.max(...points.map((p) => Number(p.balance)), 1);
    const min = Math.min(...points.map((p) => Number(p.balance)), 0);
    const range = Math.max(max - min, 1);
    const coords = points.map((point, index) => { const x = points.length === 1 ? 350 : 35 + (index * 630) / (points.length - 1); const y = 185 - ((Number(point.balance) - min) / range) * 135; return { ...point, x, y: Math.max(35, Math.min(185, y)) }; });
    const path = coords.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join(' ');
    const last = coords[coords.length - 1];
    const previous = coords[coords.length - 2];
    const change = previous ? Number(last.balance) - Number(previous.balance) : 0;
    return { coords, path, max, min, active: activeIndex !== null ? coords[activeIndex] : last, change };
  }, [snapshots, snapshotDate, myrValue, notes, activeIndex]);

  async function save() {
    setSaving(true); setError('');
    const session = await supabase.auth.getSession();
    const userId = session.data.session?.user.id;
    if (!userId) { router.push('/login'); return; }
    const fullUpdate = { balance: myrValue, currency, native_balance: Number(nativeBalance), fx_rate: Number(fxRate), notes };
    const fallbackUpdate = { balance: myrValue, currency, notes };
    let update = await supabase.from('accounts').update(fullUpdate).eq('id', params.id);
    if (update.error && update.error.message.toLowerCase().includes('native_balance')) update = await supabase.from('accounts').update(fallbackUpdate).eq('id', params.id);
    if (update.error) { setSaving(false); setError(update.error.message); return; }
    await supabase.from('account_snapshots').delete().eq('account_id', params.id).eq('snapshot_date', snapshotDate);
    const snapshot = await supabase.from('account_snapshots').insert({ user_id: userId, account_id: params.id, snapshot_date: snapshotDate, balance: myrValue, notes });
    setSaving(false);
    if (snapshot.error) { setError(snapshot.error.message); return; }
    router.push('/');
  }

  async function removeAccount() { const confirmed = window.confirm('Delete this entry? This cannot be undone.'); if (!confirmed) return; setDeleting(true); setError(''); const result = await supabase.from('accounts').delete().eq('id', params.id); setDeleting(false); if (result.error) { setError(result.error.message); return; } router.push('/'); }
  if (!account) return <main className="min-h-screen bg-[#080b08] flex items-center justify-center text-[#d8ded2]">Loading...</main>;

  const active = chart.active;
  const activeIndexSafe = chart.coords.findIndex((p) => p.id === active?.id && p.snapshot_date === active?.snapshot_date);
  const previous = activeIndexSafe > 0 ? chart.coords[activeIndexSafe - 1] : null;
  const activeChange = previous ? Number(active.balance) - Number(previous.balance) : 0;
  const activePct = previous && Number(previous.balance) !== 0 ? (activeChange / Number(previous.balance)) * 100 : 0;

  return <main className="min-h-screen bg-[#080b08] text-[#f4f5ef]"><div className="mx-auto max-w-[720px] min-h-screen relative overflow-hidden"><div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_-10%,rgba(148,255,97,0.12),transparent_36%),linear-gradient(180deg,#11170f_0%,#080b08_42%)]"/><div className="relative px-5 pt-7 pb-10"><header className="flex items-center justify-between mb-8"><button onClick={() => router.push('/')} className="h-11 w-11 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center"><ArrowLeft className="h-5 w-5"/></button><span className="text-sm text-[#a8aca3] capitalize">{account.type}</span><button onClick={removeAccount} disabled={deleting} className="h-11 w-11 rounded-full bg-red-500/10 border border-red-500/20 text-red-200 flex items-center justify-center disabled:opacity-50"><Trash2 className="h-5 w-5"/></button></header><section className="mb-7"><h1 className="text-3xl font-semibold tracking-tight">{account.name}</h1><p className="text-[#a8aca3] mt-1">{account.institution}</p><p className="text-4xl font-light tracking-tight mt-6">{money(myrValue)}</p><p className="text-[#a8aca3] mt-2">{Number(nativeBalance || 0).toLocaleString()} {currency} · Current MYR value</p></section><div className="h-[250px] -mx-5 mb-6 border-y border-white/10 relative"><svg viewBox="0 0 700 220" className="w-full h-full"><defs><linearGradient id="detailLine" x1="0" x2="1"><stop offset="0%" stopColor="#35bdf5"/><stop offset="100%" stopColor="#69f0c2"/></linearGradient></defs>{[70,130,190].map((y) => <line key={y} x1="0" x2="700" y1={y} y2={y} stroke="rgba(255,255,255,0.08)"/>)}<path d={chart.path} fill="none" stroke="url(#detailLine)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>{chart.coords.map((point, index) => <circle key={`${point.snapshot_date}-${index}`} onClick={() => setActiveIndex(index)} cx={point.x} cy={point.y} r={point.id === 'preview' ? 7 : 5} fill={point.id === 'preview' ? '#f4f5ef' : '#69f0c2'} className="cursor-pointer"/>)}</svg><div className="absolute left-5 top-4 rounded-2xl bg-black/45 border border-white/10 px-3 py-2 backdrop-blur"><p className="text-xs text-[#a8aca3]">{active?.snapshot_date}</p><p className="text-sm font-mono">{money(Number(active?.balance || 0))}</p><p className={activeChange >= 0 ? 'text-xs text-[#75efad]' : 'text-xs text-red-200'}>{activeChange >= 0 ? '+' : ''}{money(activeChange)} {previous ? `(${activePct.toFixed(1)}%)` : ''}</p></div><div className="absolute right-5 top-5 text-right text-xs text-[#8d9188]"><p>{compact(chart.max)}</p><p className="mt-12">{compact((chart.max + chart.min) / 2)}</p><p className="mt-12">{compact(chart.min)}</p></div></div><section className="grid grid-cols-3 gap-3 mb-5"><div className="rounded-2xl bg-white/[0.05] border border-white/8 p-3 text-center"><p className="text-sm">{snapshots.length}</p><p className="text-xs text-[#a8aca3] mt-1">History</p></div><div className="rounded-2xl bg-white/[0.05] border border-white/8 p-3 text-center"><p className="text-sm">{activeChange >= 0 ? '+' : ''}{activePct.toFixed(1)}%</p><p className="text-xs text-[#a8aca3] mt-1">Selected</p></div><div className="rounded-2xl bg-white/[0.05] border border-white/8 p-3 text-center"><p className="text-sm">{money(myrValue)}</p><p className="text-xs text-[#a8aca3] mt-1">Preview</p></div></section><section className="rounded-[28px] bg-white/[0.05] border border-white/8 p-5 mb-5"><label className="block text-sm text-[#a8aca3] mb-2">Update date</label><input className="w-full rounded-2xl bg-black/25 border border-white/10 px-4 py-4 outline-none text-base mb-4" type="date" value={snapshotDate} onChange={(e) => setSnapshotDate(e.target.value)}/><label className="block text-sm text-[#a8aca3] mb-2">Currency</label><select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full rounded-2xl bg-black/25 border border-white/10 px-4 py-4 outline-none mb-4">{currencies.map((item) => <option key={item} value={item}>{item}</option>)}</select><label className="block text-sm text-[#a8aca3] mb-2">Balance in {currency}</label><div className="flex items-center gap-3 rounded-2xl bg-black/25 border border-white/10 px-4 py-4 mb-4"><span className="text-[#a8aca3]">{currency}</span><input className="w-full bg-transparent outline-none text-2xl font-light" type="number" step="0.000001" value={nativeBalance} onChange={(e) => setNativeBalance(e.target.value)}/></div><label className="block text-sm text-[#a8aca3] mb-2">MYR rate per 1 {currency}</label><div className="flex items-center gap-3 rounded-2xl bg-black/25 border border-white/10 px-4 py-4 mb-4"><span className="text-[#a8aca3]">RM</span><input className="w-full bg-transparent outline-none text-2xl font-light" type="number" step="0.000001" value={fxRate} onChange={(e) => setFxRate(e.target.value)} disabled={currency === 'MYR'}/></div><div className="rounded-2xl border border-[#a7ff4f]/20 bg-[#a7ff4f]/10 px-4 py-3"><p className="text-xs text-[#a8aca3]">MYR value used in net worth</p><p className="text-xl font-semibold">{money(myrValue)}</p></div></section><section className="rounded-[28px] bg-white/[0.05] border border-white/8 p-5 mb-5"><h2 className="text-2xl mb-3">Notes</h2><textarea className="w-full min-h-28 rounded-2xl bg-black/25 border border-white/10 px-4 py-4 outline-none text-base" placeholder="Add notes, account purpose, banking links, reminders, or context." value={notes} onChange={(e) => setNotes(e.target.value)}/></section>{error && <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 mb-5">{error}</p>}<button onClick={save} disabled={saving} className="w-full h-16 rounded-[24px] bg-[#a7ff4f] text-[#071006] font-bold text-lg disabled:opacity-50 flex items-center justify-center gap-2"><Save className="h-5 w-5"/>{saving ? 'Saving...' : 'Update'}</button></div></div></main>;
}
