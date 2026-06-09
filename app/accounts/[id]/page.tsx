'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';

type Account = {
  id: string;
  name: string;
  institution: string;
  type: string;
  balance: number;
  notes: string | null;
};

function money(value: number) {
  return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: 2 }).format(value || 0);
}

function compact(value: number) {
  return new Intl.NumberFormat('en-MY', { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0);
}

export default function AccountDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [account, setAccount] = useState<Account | null>(null);
  const [balance, setBalance] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadAccount() {
      const session = await supabase.auth.getSession();
      if (!session.data.session) { router.push('/login'); return; }
      const result = await supabase.from('accounts').select('id,name,institution,type,balance,notes').eq('id', params.id).single();
      if (result.error) { setError(result.error.message); return; }
      const item = result.data as Account;
      setAccount(item);
      setBalance(String(item.balance || 0));
      setNotes(item.notes || '');
    }
    loadAccount();
  }, [params.id, router]);

  const chart = useMemo(() => {
    const current = Number(balance || account?.balance || 0);
    const original = Number(account?.balance || 0);
    const base = Math.max(original, current, 1);
    const points = [
      Math.max(original * 0.72, 0),
      Math.max(original * 0.82, 0),
      Math.max(original * 0.91, 0),
      original,
      current,
    ];
    const coords = points.map((value, index) => {
      const x = 35 + index * 155;
      const y = 185 - (value / base) * 135;
      return { x, y: Math.max(35, Math.min(185, y)), value };
    });
    const path = coords.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join(' ');
    return { coords, path, current, original, change: current - original };
  }, [account, balance]);

  async function save() {
    setSaving(true);
    setError('');
    const result = await supabase.from('accounts').update({ balance: Number(balance), notes }).eq('id', params.id);
    setSaving(false);
    if (result.error) { setError(result.error.message); return; }
    router.push('/');
  }

  async function removeAccount() {
    const confirmed = window.confirm('Delete this entry? This cannot be undone.');
    if (!confirmed) return;
    setDeleting(true);
    setError('');
    const result = await supabase.from('accounts').delete().eq('id', params.id);
    setDeleting(false);
    if (result.error) { setError(result.error.message); return; }
    router.push('/');
  }

  if (!account) return <main className="min-h-screen bg-[#080b08] flex items-center justify-center text-[#d8ded2]">Loading...</main>;

  return (
    <main className="min-h-screen bg-[#080b08] text-[#f4f5ef]">
      <div className="mx-auto max-w-[720px] min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_-10%,rgba(148,255,97,0.12),transparent_36%),linear-gradient(180deg,#11170f_0%,#080b08_42%)]" />
        <div className="relative px-5 pt-7 pb-10">
          <header className="flex items-center justify-between mb-8">
            <button onClick={() => router.push('/')} className="h-11 w-11 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center"><ArrowLeft className="h-5 w-5" /></button>
            <span className="text-sm text-[#a8aca3] capitalize">{account.type}</span>
            <button onClick={removeAccount} disabled={deleting} className="h-11 w-11 rounded-full bg-red-500/10 border border-red-500/20 text-red-200 flex items-center justify-center disabled:opacity-50"><Trash2 className="h-5 w-5" /></button>
          </header>

          <section className="mb-7">
            <h1 className="text-3xl font-semibold tracking-tight">{account.name}</h1>
            <p className="text-[#a8aca3] mt-1">{account.institution}</p>
            <p className="text-4xl font-light tracking-tight mt-6">{money(Number(account.balance))}</p>
            <p className="text-[#a8aca3] mt-2">Current saved value</p>
          </section>

          <div className="h-[240px] -mx-5 mb-6 border-y border-white/10 relative">
            <svg viewBox="0 0 700 220" className="w-full h-full">
              <defs><linearGradient id="detailLine" x1="0" x2="1"><stop offset="0%" stopColor="#35bdf5"/><stop offset="100%" stopColor="#69f0c2"/></linearGradient></defs>
              {[70,130,190].map((y) => <line key={y} x1="0" x2="700" y1={y} y2={y} stroke="rgba(255,255,255,0.08)" />)}
              {chart.coords.map((point) => <line key={point.x} x1={point.x} x2={point.x} y1="25" y2="195" stroke="rgba(255,255,255,0.06)" />)}
              <path d={chart.path} fill="none" stroke="url(#detailLine)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              {chart.coords.map((point, index) => <circle key={point.x} cx={point.x} cy={point.y} r={index === chart.coords.length - 1 ? 7 : 4} fill={index === chart.coords.length - 1 ? '#f4f5ef' : '#69f0c2'} />)}
            </svg>
            <div className="absolute right-5 top-5 text-right text-xs text-[#8d9188]"><p>{compact(Math.max(chart.current, chart.original))}</p><p className="mt-12">{compact(Math.max(chart.current, chart.original) / 2)}</p><p className="mt-12">0</p></div>
            <div className="absolute bottom-3 left-5 right-5 flex justify-between text-xs text-[#8d9188]"><span>Start</span><span>Previous</span><span>Now</span></div>
          </div>

          <section className="grid grid-cols-3 gap-3 mb-5">
            <div className="rounded-2xl bg-white/[0.05] border border-white/8 p-3 text-center"><p className="text-sm">{money(Math.abs(chart.change))}</p><p className="text-xs text-[#a8aca3] mt-1">Change</p></div>
            <div className="rounded-2xl bg-white/[0.05] border border-white/8 p-3 text-center"><p className="text-sm">{chart.change >= 0 ? '+' : '-'}{account.balance ? Math.abs((chart.change / Number(account.balance)) * 100).toFixed(1) : '0'}%</p><p className="text-xs text-[#a8aca3] mt-1">Percent</p></div>
            <div className="rounded-2xl bg-white/[0.05] border border-white/8 p-3 text-center"><p className="text-sm">{money(chart.current)}</p><p className="text-xs text-[#a8aca3] mt-1">Preview</p></div>
          </section>

          <section className="rounded-[28px] bg-white/[0.05] border border-white/8 p-5 mb-5">
            <label className="block text-sm text-[#a8aca3] mb-2">New balance</label>
            <div className="flex items-center gap-3 rounded-2xl bg-black/25 border border-white/10 px-4 py-4"><span className="text-[#a8aca3]">RM</span><input className="w-full bg-transparent outline-none text-2xl font-light" type="number" step="0.01" value={balance} onChange={(e) => setBalance(e.target.value)} /></div>
          </section>

          <section className="rounded-[28px] bg-white/[0.05] border border-white/8 p-5 mb-5">
            <h2 className="text-2xl mb-3">Notes</h2>
            <textarea className="w-full min-h-28 rounded-2xl bg-black/25 border border-white/10 px-4 py-4 outline-none text-base" placeholder="Add notes, account purpose, banking links, reminders, or context." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </section>

          {error && <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 mb-5">{error}</p>}
          <button onClick={save} disabled={saving} className="w-full h-16 rounded-[24px] bg-[#a7ff4f] text-[#071006] font-bold text-lg disabled:opacity-50 flex items-center justify-center gap-2"><Save className="h-5 w-5" />{saving ? 'Saving...' : 'Update'}</button>
        </div>
      </div>
    </main>
  );
}
