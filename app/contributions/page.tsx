'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Play, Plus, Repeat, Trash2 } from 'lucide-react';
import AppLock from '@/components/AppLock';

const KEY = 'vault_contributions_v1';
const RECURRING_KEY = 'vault_recurring_contributions_v1';
const categories = ['EPF', 'Unit trust DCA', 'BTC DCA', 'ETH DCA', 'Bonus injection', 'Mortgage repayment', 'Cash savings', 'Other'];

type Entry = { id: string; date: string; category: string; amount: number; note: string; recurringId?: string };
type Recurring = { id: string; category: string; amount: number; day: number; note: string; active: boolean; lastRunMonth?: string };

function today() { return new Date().toISOString().slice(0, 10); }
function monthKey(value = new Date()) { return value.toISOString().slice(0, 7); }
function money(value: number, compact = false) { return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: compact ? 1 : 0, notation: compact ? 'compact' : 'standard' }).format(value || 0); }
function readEntries(): Entry[] { try { return JSON.parse(localStorage.getItem(KEY) || '[]') as Entry[]; } catch { return []; } }
function writeEntries(entries: Entry[]) { localStorage.setItem(KEY, JSON.stringify(entries)); }
function readRecurring(): Recurring[] { try { return JSON.parse(localStorage.getItem(RECURRING_KEY) || '[]') as Recurring[]; } catch { return []; } }
function writeRecurring(items: Recurring[]) { localStorage.setItem(RECURRING_KEY, JSON.stringify(items)); }
function runDateFor(month: string, day: number) { const [year, rawMonth] = month.split('-').map(Number); const lastDay = new Date(year, rawMonth, 0).getDate(); return `${month}-${String(Math.min(Math.max(day, 1), lastDay)).padStart(2, '0')}`; }

function autorun(entries: Entry[], recurring: Recurring[]) {
  const currentMonth = monthKey();
  const nextEntries = [...entries];
  const nextRecurring = recurring.map((item) => {
    if (!item.active || item.lastRunMonth === currentMonth) return item;
    const exists = nextEntries.some((entry) => entry.recurringId === item.id && entry.date.startsWith(currentMonth));
    if (!exists) nextEntries.unshift({ id: crypto.randomUUID(), date: runDateFor(currentMonth, item.day), category: item.category, amount: item.amount, note: item.note || 'Auto monthly contribution', recurringId: item.id });
    return { ...item, lastRunMonth: currentMonth };
  });
  return { entries: nextEntries, recurring: nextRecurring, created: nextEntries.length - entries.length };
}

function ContributionsContent() {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [recurring, setRecurring] = useState<Recurring[]>([]);
  const [date, setDate] = useState(today());
  const [category, setCategory] = useState(categories[0]);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [recCategory, setRecCategory] = useState(categories[0]);
  const [recAmount, setRecAmount] = useState('');
  const [recDay, setRecDay] = useState('1');
  const [recNote, setRecNote] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    const savedEntries = readEntries();
    const savedRecurring = readRecurring();
    const result = autorun(savedEntries, savedRecurring);
    setEntries(result.entries);
    setRecurring(result.recurring);
    writeEntries(result.entries);
    writeRecurring(result.recurring);
    if (result.created > 0) setStatus(`Auto-added ${result.created} recurring contribution${result.created === 1 ? '' : 's'} for this month.`);
  }, []);

  const monthlyTotal = useMemo(() => {
    const month = monthKey();
    return entries.filter((entry) => entry.date.startsWith(month)).reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  }, [entries]);
  const recurringMonthlyTotal = useMemo(() => recurring.filter((item) => item.active).reduce((sum, item) => sum + Number(item.amount || 0), 0), [recurring]);
  const categoryTotals = useMemo(() => categories.map((item) => ({ category: item, total: entries.filter((entry) => entry.category === item).reduce((sum, entry) => sum + entry.amount, 0) })).filter((item) => item.total > 0), [entries]);

  function saveEntries(next: Entry[]) { setEntries(next); writeEntries(next); }
  function saveRecurring(next: Recurring[]) { setRecurring(next); writeRecurring(next); }

  function addEntry() {
    const value = Number(amount || 0);
    if (!value) return;
    const next = [{ id: crypto.randomUUID(), date, category, amount: value, note }, ...entries];
    saveEntries(next);
    setAmount('');
    setNote('');
  }

  function addRecurring() {
    const value = Number(recAmount || 0);
    const day = Math.min(Math.max(Number(recDay || 1), 1), 31);
    if (!value) return;
    const next = [{ id: crypto.randomUUID(), category: recCategory, amount: value, day, note: recNote, active: true }, ...recurring];
    saveRecurring(next);
    setRecAmount('');
    setRecNote('');
    setStatus('Recurring contribution added. It will auto-run monthly when you open Contributions.');
  }

  function runRecurringNow() {
    const result = autorun(entries, recurring.map((item) => ({ ...item, lastRunMonth: item.lastRunMonth === monthKey() ? undefined : item.lastRunMonth })));
    saveEntries(result.entries);
    saveRecurring(result.recurring);
    setStatus(result.created > 0 ? `Auto-added ${result.created} recurring contribution${result.created === 1 ? '' : 's'} for this month.` : 'Recurring contributions are already up to date for this month.');
  }

  function removeEntry(id: string) { saveEntries(entries.filter((entry) => entry.id !== id)); }
  function removeRecurring(id: string) { saveRecurring(recurring.filter((item) => item.id !== id)); }
  function toggleRecurring(id: string) { saveRecurring(recurring.map((item) => item.id === id ? { ...item, active: !item.active } : item)); }

  return <main className="min-h-screen bg-[#080b08] text-[#f4f5ef]"><div className="mx-auto max-w-[720px] min-h-screen relative overflow-hidden"><div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_-10%,rgba(148,255,97,0.12),transparent_34%),linear-gradient(180deg,#182016_0%,#080b08_42%)]"/><div className="relative px-4 pt-6 pb-10"><header className="flex items-center justify-between mb-6"><button onClick={() => router.push('/')} className="h-10 w-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center"><ArrowLeft className="h-5 w-5"/></button><div className="text-center"><h1 className="text-xl font-semibold tracking-tight">Contributions</h1><p className="text-xs text-[#8d9188]">One-off and auto monthly logs</p></div><button onClick={runRecurringNow} className="h-10 w-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center"><Play className="h-5 w-5"/></button></header><section className="rounded-[28px] bg-white/[0.05] border border-white/8 p-5 mb-4"><p className="text-xs text-[#a8aca3]">This month logged</p><p className="text-3xl font-light mt-1">{money(monthlyTotal)}</p><div className="grid grid-cols-2 gap-3 mt-4"><div className="rounded-2xl bg-black/20 p-3"><p className="text-xs text-[#8d9188]">Auto monthly</p><p className="font-mono">{money(recurringMonthlyTotal, true)}</p></div><div className="rounded-2xl bg-black/20 p-3"><p className="text-xs text-[#8d9188]">Rules active</p><p className="font-mono">{recurring.filter((item) => item.active).length}</p></div></div><p className="text-xs text-[#8d9188] mt-3">Recurring items auto-run once per month when this page opens.</p></section>{status && <p className="rounded-2xl border border-[#a7ff4f]/20 bg-[#a7ff4f]/10 px-4 py-3 text-xs text-[#dfffc6] mb-4">{status}</p>}<section className="rounded-[24px] bg-white/[0.05] border border-white/8 p-4 mb-4"><div className="flex items-center gap-2 mb-3"><Repeat className="h-4 w-4 text-[#a7ff4f]"/><h2 className="font-semibold">Recurring monthly</h2></div><div className="grid grid-cols-2 gap-2 mb-2"><select value={recCategory} onChange={(e) => setRecCategory(e.target.value)} className="rounded-2xl bg-black/25 border border-white/10 px-3 py-3 outline-none">{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select><input type="number" min="1" max="31" value={recDay} onChange={(e) => setRecDay(e.target.value)} placeholder="Day" className="rounded-2xl bg-black/25 border border-white/10 px-3 py-3 outline-none"/></div><input type="number" value={recAmount} onChange={(e) => setRecAmount(e.target.value)} placeholder="Monthly amount in MYR" className="w-full rounded-2xl bg-black/25 border border-white/10 px-3 py-3 outline-none mb-2"/><input value={recNote} onChange={(e) => setRecNote(e.target.value)} placeholder="Optional note" className="w-full rounded-2xl bg-black/25 border border-white/10 px-3 py-3 outline-none mb-3"/><button onClick={addRecurring} className="w-full rounded-2xl bg-[#a7ff4f] text-[#071006] py-3 font-bold flex items-center justify-center gap-2"><Plus className="h-4 w-4"/>Add recurring rule</button>{recurring.length > 0 && <div className="space-y-2 mt-4">{recurring.map((item) => <div key={item.id} className="rounded-2xl bg-black/20 border border-white/8 px-3 py-3 flex items-center justify-between gap-3"><button onClick={() => toggleRecurring(item.id)} className="min-w-0 text-left"><p className={item.active ? 'text-sm font-semibold truncate' : 'text-sm font-semibold truncate text-[#8d9188]'}>{item.category}</p><p className="text-xs text-[#8d9188] truncate">Day {item.day} · {money(item.amount, true)}{item.lastRunMonth ? ` · last ${item.lastRunMonth}` : ''}</p></button><button onClick={() => removeRecurring(item.id)} className="h-8 w-8 rounded-full bg-red-500/10 text-red-100 flex items-center justify-center"><Trash2 className="h-4 w-4"/></button></div>)}</div>}</section><section className="rounded-[24px] bg-white/[0.05] border border-white/8 p-4 mb-4"><h2 className="font-semibold mb-3">Add one-off contribution</h2><div className="grid grid-cols-2 gap-2 mb-2"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-2xl bg-black/25 border border-white/10 px-3 py-3 outline-none"/><select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-2xl bg-black/25 border border-white/10 px-3 py-3 outline-none">{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></div><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount in MYR" className="w-full rounded-2xl bg-black/25 border border-white/10 px-3 py-3 outline-none mb-2"/><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" className="w-full rounded-2xl bg-black/25 border border-white/10 px-3 py-3 outline-none mb-3"/><button onClick={addEntry} className="w-full rounded-2xl bg-white/[0.08] border border-white/10 py-3 font-bold flex items-center justify-center gap-2"><Plus className="h-4 w-4"/>Add one-off entry</button></section>{categoryTotals.length > 0 && <section className="rounded-[24px] bg-white/[0.05] border border-white/8 p-4 mb-4"><h2 className="font-semibold mb-3">Contribution mix</h2><div className="space-y-3">{categoryTotals.map((item) => <div key={item.category}><div className="flex justify-between text-sm mb-1"><span>{item.category}</span><span className="font-mono">{money(item.total, true)}</span></div><div className="h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-[#a7ff4f] rounded-full" style={{ width: `${Math.min((item.total / Math.max(...categoryTotals.map((c) => c.total), 1)) * 100, 100)}%` }}/></div></div>)}</div></section>}<section className="space-y-2">{entries.map((entry) => <div key={entry.id} className="rounded-[20px] bg-white/[0.05] border border-white/8 px-4 py-3 flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-sm font-semibold truncate">{entry.category}{entry.recurringId ? ' · Auto' : ''}</p><p className="text-xs text-[#8d9188] truncate">{entry.date}{entry.note ? ` · ${entry.note}` : ''}</p></div><div className="flex items-center gap-3"><p className="text-sm font-mono">{money(entry.amount, true)}</p><button onClick={() => removeEntry(entry.id)} className="h-8 w-8 rounded-full bg-red-500/10 text-red-100 flex items-center justify-center"><Trash2 className="h-4 w-4"/></button></div></div>)}</section></div></div></main>;
}

export default function ContributionsPage() { return <AppLock><ContributionsContent /></AppLock>; }
