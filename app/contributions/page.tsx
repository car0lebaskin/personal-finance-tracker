'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import AppLock from '@/components/AppLock';

const KEY = 'vault_contributions_v1';
const categories = ['EPF', 'Unit trust DCA', 'BTC DCA', 'ETH DCA', 'Bonus injection', 'Mortgage repayment', 'Cash savings', 'Other'];

type Entry = { id: string; date: string; category: string; amount: number; note: string };

function today() { return new Date().toISOString().slice(0, 10); }
function money(value: number, compact = false) { return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: compact ? 1 : 0, notation: compact ? 'compact' : 'standard' }).format(value || 0); }
function readEntries(): Entry[] { try { return JSON.parse(localStorage.getItem(KEY) || '[]') as Entry[]; } catch { return []; } }
function writeEntries(entries: Entry[]) { localStorage.setItem(KEY, JSON.stringify(entries)); }

function ContributionsContent() {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [date, setDate] = useState(today());
  const [category, setCategory] = useState(categories[0]);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => { setEntries(readEntries()); }, []);

  const monthlyTotal = useMemo(() => {
    const month = today().slice(0, 7);
    return entries.filter((entry) => entry.date.startsWith(month)).reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  }, [entries]);
  const categoryTotals = useMemo(() => categories.map((item) => ({ category: item, total: entries.filter((entry) => entry.category === item).reduce((sum, entry) => sum + entry.amount, 0) })).filter((item) => item.total > 0), [entries]);

  function addEntry() {
    const value = Number(amount || 0);
    if (!value) return;
    const next = [{ id: crypto.randomUUID(), date, category, amount: value, note }, ...entries];
    setEntries(next);
    writeEntries(next);
    setAmount('');
    setNote('');
  }

  function removeEntry(id: string) {
    const next = entries.filter((entry) => entry.id !== id);
    setEntries(next);
    writeEntries(next);
  }

  return <main className="min-h-screen bg-[#080b08] text-[#f4f5ef]"><div className="mx-auto max-w-[720px] min-h-screen relative overflow-hidden"><div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_-10%,rgba(148,255,97,0.12),transparent_34%),linear-gradient(180deg,#182016_0%,#080b08_42%)]"/><div className="relative px-4 pt-6 pb-10"><header className="flex items-center justify-between mb-6"><button onClick={() => router.push('/')} className="h-10 w-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center"><ArrowLeft className="h-5 w-5"/></button><div className="text-center"><h1 className="text-xl font-semibold tracking-tight">Contributions</h1><p className="text-xs text-[#8d9188]">DCA, EPF, bonus and repayment log</p></div><div className="h-10 w-10"/></header><section className="rounded-[28px] bg-white/[0.05] border border-white/8 p-5 mb-4"><p className="text-xs text-[#a8aca3]">This month logged</p><p className="text-3xl font-light mt-1">{money(monthlyTotal)}</p><p className="text-xs text-[#8d9188] mt-2">This is stored on this device for now. It helps you separate market movement from money you added.</p></section><section className="rounded-[24px] bg-white/[0.05] border border-white/8 p-4 mb-4"><h2 className="font-semibold mb-3">Add contribution</h2><div className="grid grid-cols-2 gap-2 mb-2"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-2xl bg-black/25 border border-white/10 px-3 py-3 outline-none"/><select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-2xl bg-black/25 border border-white/10 px-3 py-3 outline-none">{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></div><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount in MYR" className="w-full rounded-2xl bg-black/25 border border-white/10 px-3 py-3 outline-none mb-2"/><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" className="w-full rounded-2xl bg-black/25 border border-white/10 px-3 py-3 outline-none mb-3"/><button onClick={addEntry} className="w-full rounded-2xl bg-[#a7ff4f] text-[#071006] py-3 font-bold flex items-center justify-center gap-2"><Plus className="h-4 w-4"/>Add entry</button></section>{categoryTotals.length > 0 && <section className="rounded-[24px] bg-white/[0.05] border border-white/8 p-4 mb-4"><h2 className="font-semibold mb-3">Contribution mix</h2><div className="space-y-3">{categoryTotals.map((item) => <div key={item.category}><div className="flex justify-between text-sm mb-1"><span>{item.category}</span><span className="font-mono">{money(item.total, true)}</span></div><div className="h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-[#a7ff4f] rounded-full" style={{ width: `${Math.min((item.total / Math.max(...categoryTotals.map((c) => c.total), 1)) * 100, 100)}%` }}/></div></div>)}</div></section>}<section className="space-y-2">{entries.map((entry) => <div key={entry.id} className="rounded-[20px] bg-white/[0.05] border border-white/8 px-4 py-3 flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-sm font-semibold truncate">{entry.category}</p><p className="text-xs text-[#8d9188] truncate">{entry.date}{entry.note ? ` · ${entry.note}` : ''}</p></div><div className="flex items-center gap-3"><p className="text-sm font-mono">{money(entry.amount, true)}</p><button onClick={() => removeEntry(entry.id)} className="h-8 w-8 rounded-full bg-red-500/10 text-red-100 flex items-center justify-center"><Trash2 className="h-4 w-4"/></button></div></div>)}</section></div></div></main>;
}

export default function ContributionsPage() { return <AppLock><ContributionsContent /></AppLock>; }
