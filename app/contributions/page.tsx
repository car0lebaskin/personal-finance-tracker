'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Cloud, Play, Plus, Repeat, Trash2 } from 'lucide-react';
import AppLock from '@/components/AppLock';
import { supabase } from '@/lib/supabase';

const KEY = 'vault_contributions_v1';
const RECURRING_KEY = 'vault_recurring_contributions_v1';
const categories = ['EPF', 'Unit trust DCA', 'BTC DCA', 'ETH DCA', 'Bonus injection', 'Mortgage repayment', 'Cash savings', 'Other'];

type Entry = { id: string; date: string; category: string; amount: number; note: string; recurringId?: string };
type Recurring = { id: string; category: string; amount: number; day: number; note: string; active: boolean; lastRunMonth?: string };
type StorageMode = 'supabase' | 'local';

function today() { return new Date().toISOString().slice(0, 10); }
function monthKey(value = new Date()) { return value.toISOString().slice(0, 7); }
function money(value: number, compact = false) { return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: compact ? 1 : 0, notation: compact ? 'compact' : 'standard' }).format(value || 0); }
function readEntries(): Entry[] { try { return JSON.parse(localStorage.getItem(KEY) || '[]') as Entry[]; } catch { return []; } }
function writeEntries(entries: Entry[]) { localStorage.setItem(KEY, JSON.stringify(entries)); }
function readRecurring(): Recurring[] { try { return JSON.parse(localStorage.getItem(RECURRING_KEY) || '[]') as Recurring[]; } catch { return []; } }
function writeRecurring(items: Recurring[]) { localStorage.setItem(RECURRING_KEY, JSON.stringify(items)); }
function runDateFor(month: string, day: number) { const [year, rawMonth] = month.split('-').map(Number); const lastDay = new Date(year, rawMonth, 0).getDate(); return `${month}-${String(Math.min(Math.max(day, 1), lastDay)).padStart(2, '0')}`; }
function fromEntryRow(row: Record<string, unknown>): Entry { return { id: String(row.id), date: String(row.entry_date), category: String(row.category), amount: Number(row.amount || 0), note: String(row.note || ''), recurringId: row.recurring_id ? String(row.recurring_id) : undefined }; }
function fromRecurringRow(row: Record<string, unknown>): Recurring { return { id: String(row.id), category: String(row.category), amount: Number(row.amount || 0), day: Number(row.run_day || 1), note: String(row.note || ''), active: Boolean(row.active), lastRunMonth: row.last_run_month ? String(row.last_run_month) : undefined }; }

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
  const [storageMode, setStorageMode] = useState<StorageMode>('local');
  const [userId, setUserId] = useState('');
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
    async function load() {
      const session = await supabase.auth.getSession();
      const uid = session.data.session?.user.id;
      if (!uid) { router.push('/login'); return; }
      setUserId(uid);

      const entriesResult = await supabase.from('contribution_entries').select('id,entry_date,category,amount,note,recurring_id').order('entry_date', { ascending: false });
      const recurringResult = await supabase.from('recurring_contributions').select('id,category,amount,run_day,note,active,last_run_month').order('created_at', { ascending: false });

      if (!entriesResult.error && !recurringResult.error) {
        const loadedEntries = (entriesResult.data || []).map((row) => fromEntryRow(row as Record<string, unknown>));
        const loadedRecurring = (recurringResult.data || []).map((row) => fromRecurringRow(row as Record<string, unknown>));
        const result = autorun(loadedEntries, loadedRecurring);
        setEntries(result.entries);
        setRecurring(result.recurring);
        setStorageMode('supabase');
        if (result.created > 0) {
          const created = result.entries.filter((entry) => entry.recurringId && entry.date.startsWith(monthKey()) && !loadedEntries.some((old) => old.recurringId === entry.recurringId && old.date.startsWith(monthKey())));
          await supabase.from('contribution_entries').insert(created.map((entry) => ({ user_id: uid, entry_date: entry.date, category: entry.category, amount: entry.amount, note: entry.note, recurring_id: entry.recurringId })));
          await Promise.all(result.recurring.map((item) => supabase.from('recurring_contributions').update({ last_run_month: item.lastRunMonth }).eq('id', item.id)));
          setStatus(`Auto-added ${result.created} recurring contribution${result.created === 1 ? '' : 's'} for this month.`);
        }
        return;
      }

      const savedEntries = readEntries();
      const savedRecurring = readRecurring();
      const result = autorun(savedEntries, savedRecurring);
      setEntries(result.entries);
      setRecurring(result.recurring);
      setStorageMode('local');
      writeEntries(result.entries);
      writeRecurring(result.recurring);
      if (result.created > 0) setStatus(`Auto-added ${result.created} recurring contribution${result.created === 1 ? '' : 's'} for this month.`);
      else setStatus('Using local storage. Run supabase/schema.sql to sync contributions across devices.');
    }
    load();
  }, [router]);

  const monthlyTotal = useMemo(() => {
    const month = monthKey();
    return entries.filter((entry) => entry.date.startsWith(month)).reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  }, [entries]);
  const recurringMonthlyTotal = useMemo(() => recurring.filter((item) => item.active).reduce((sum, item) => sum + Number(item.amount || 0), 0), [recurring]);
  const categoryTotals = useMemo(() => categories.map((item) => ({ category: item, total: entries.filter((entry) => entry.category === item).reduce((sum, entry) => sum + entry.amount, 0) })).filter((item) => item.total > 0), [entries]);

  async function saveEntry(next: Entry) {
    if (storageMode === 'supabase') await supabase.from('contribution_entries').insert({ user_id: userId, entry_date: next.date, category: next.category, amount: next.amount, note: next.note, recurring_id: next.recurringId || null });
  }
  async function deleteEntry(id: string) { if (storageMode === 'supabase') await supabase.from('contribution_entries').delete().eq('id', id); }
  async function saveRecurringRow(item: Recurring) { if (storageMode === 'supabase') await supabase.from('recurring_contributions').insert({ user_id: userId, category: item.category, amount: item.amount, run_day: item.day, note: item.note, active: item.active, last_run_month: item.lastRunMonth || null }); }
  async function deleteRecurringRow(id: string) { if (storageMode === 'supabase') await supabase.from('recurring_contributions').delete().eq('id', id); }
  async function updateRecurringRow(item: Recurring) { if (storageMode === 'supabase') await supabase.from('recurring_contributions').update({ active: item.active, last_run_month: item.lastRunMonth || null }).eq('id', item.id); }
  function persistLocal(nextEntries = entries, nextRecurring = recurring) { writeEntries(nextEntries); writeRecurring(nextRecurring); }

  async function addEntry() {
    const value = Number(amount || 0);
    if (!value) return;
    const entry = { id: crypto.randomUUID(), date, category, amount: value, note };
    const next = [entry, ...entries];
    setEntries(next);
    if (storageMode === 'local') persistLocal(next, recurring);
    await saveEntry(entry);
    setAmount('');
    setNote('');
  }

  async function addRecurring() {
    const value = Number(recAmount || 0);
    const day = Math.min(Math.max(Number(recDay || 1), 1), 31);
    if (!value) return;
    const item = { id: crypto.randomUUID(), category: recCategory, amount: value, day, note: recNote, active: true };
    const next = [item, ...recurring];
    setRecurring(next);
    if (storageMode === 'local') persistLocal(entries, next);
    await saveRecurringRow(item);
    setRecAmount('');
    setRecNote('');
    setStatus('Recurring contribution added. It will auto-run monthly when you open Contributions.');
  }

  async function runRecurringNow() {
    const result = autorun(entries, recurring.map((item) => ({ ...item, lastRunMonth: item.lastRunMonth === monthKey() ? undefined : item.lastRunMonth })));
    setEntries(result.entries);
    setRecurring(result.recurring);
    if (storageMode === 'local') persistLocal(result.entries, result.recurring);
    if (storageMode === 'supabase') {
      const created = result.entries.filter((entry) => entry.recurringId && entry.date.startsWith(monthKey()) && !entries.some((old) => old.recurringId === entry.recurringId && old.date.startsWith(monthKey())));
      if (created.length) await supabase.from('contribution_entries').insert(created.map((entry) => ({ user_id: userId, entry_date: entry.date, category: entry.category, amount: entry.amount, note: entry.note, recurring_id: entry.recurringId })));
      await Promise.all(result.recurring.map(updateRecurringRow));
    }
    setStatus(result.created > 0 ? `Auto-added ${result.created} recurring contribution${result.created === 1 ? '' : 's'} for this month.` : 'Recurring contributions are already up to date for this month.');
  }

  async function removeEntry(id: string) { const next = entries.filter((entry) => entry.id !== id); setEntries(next); if (storageMode === 'local') persistLocal(next, recurring); await deleteEntry(id); }
  async function removeRecurring(id: string) { const next = recurring.filter((item) => item.id !== id); setRecurring(next); if (storageMode === 'local') persistLocal(entries, next); await deleteRecurringRow(id); }
  async function toggleRecurring(id: string) { const next = recurring.map((item) => item.id === id ? { ...item, active: !item.active } : item); setRecurring(next); if (storageMode === 'local') persistLocal(entries, next); const item = next.find((row) => row.id === id); if (item) await updateRecurringRow(item); }

  return <main className="min-h-screen bg-[#080b08] text-[#f4f5ef]"><div className="mx-auto max-w-[720px] min-h-screen relative overflow-hidden"><div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_-10%,rgba(148,255,97,0.12),transparent_34%),linear-gradient(180deg,#182016_0%,#080b08_42%)]"/><div className="relative px-4 pt-6 pb-10"><header className="flex items-center justify-between mb-6"><button onClick={() => router.push('/')} className="h-10 w-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center"><ArrowLeft className="h-5 w-5"/></button><div className="text-center"><h1 className="text-xl font-semibold tracking-tight">Contributions</h1><p className="text-xs text-[#8d9188]">{storageMode === 'supabase' ? 'Synced to Supabase' : 'Local fallback'} · auto monthly logs</p></div><button onClick={runRecurringNow} className="h-10 w-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center"><Play className="h-5 w-5"/></button></header><section className="rounded-[28px] bg-white/[0.05] border border-white/8 p-5 mb-4"><div className="flex items-center justify-between"><p className="text-xs text-[#a8aca3]">This month logged</p><span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-1 text-[10px] text-[#cdd3c8] flex items-center gap-1"><Cloud className="h-3 w-3"/>{storageMode}</span></div><p className="text-3xl font-light mt-1">{money(monthlyTotal)}</p><div className="grid grid-cols-2 gap-3 mt-4"><div className="rounded-2xl bg-black/20 p-3"><p className="text-xs text-[#8d9188]">Auto monthly</p><p className="font-mono">{money(recurringMonthlyTotal, true)}</p></div><div className="rounded-2xl bg-black/20 p-3"><p className="text-xs text-[#8d9188]">Rules active</p><p className="font-mono">{recurring.filter((item) => item.active).length}</p></div></div><p className="text-xs text-[#8d9188] mt-3">Recurring items auto-run once per month when this page opens.</p></section>{status && <p className="rounded-2xl border border-[#a7ff4f]/20 bg-[#a7ff4f]/10 px-4 py-3 text-xs text-[#dfffc6] mb-4">{status}</p>}<section className="rounded-[24px] bg-white/[0.05] border border-white/8 p-4 mb-4"><div className="flex items-center gap-2 mb-3"><Repeat className="h-4 w-4 text-[#a7ff4f]"/><h2 className="font-semibold">Recurring monthly</h2></div><div className="grid grid-cols-2 gap-2 mb-2"><select value={recCategory} onChange={(e) => setRecCategory(e.target.value)} className="rounded-2xl bg-black/25 border border-white/10 px-3 py-3 outline-none">{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select><input type="number" min="1" max="31" value={recDay} onChange={(e) => setRecDay(e.target.value)} placeholder="Day" className="rounded-2xl bg-black/25 border border-white/10 px-3 py-3 outline-none"/></div><input type="number" value={recAmount} onChange={(e) => setRecAmount(e.target.value)} placeholder="Monthly amount in MYR" className="w-full rounded-2xl bg-black/25 border border-white/10 px-3 py-3 outline-none mb-2"/><input value={recNote} onChange={(e) => setRecNote(e.target.value)} placeholder="Optional note" className="w-full rounded-2xl bg-black/25 border border-white/10 px-3 py-3 outline-none mb-3"/><button onClick={addRecurring} className="w-full rounded-2xl bg-[#a7ff4f] text-[#071006] py-3 font-bold flex items-center justify-center gap-2"><Plus className="h-4 w-4"/>Add recurring rule</button>{recurring.length > 0 && <div className="space-y-2 mt-4">{recurring.map((item) => <div key={item.id} className="rounded-2xl bg-black/20 border border-white/8 px-3 py-3 flex items-center justify-between gap-3"><button onClick={() => toggleRecurring(item.id)} className="min-w-0 text-left"><p className={item.active ? 'text-sm font-semibold truncate' : 'text-sm font-semibold truncate text-[#8d9188]'}>{item.category}</p><p className="text-xs text-[#8d9188] truncate">Day {item.day} · {money(item.amount, true)}{item.lastRunMonth ? ` · last ${item.lastRunMonth}` : ''}</p></button><button onClick={() => removeRecurring(item.id)} className="h-8 w-8 rounded-full bg-red-500/10 text-red-100 flex items-center justify-center"><Trash2 className="h-4 w-4"/></button></div>)}</div>}</section><section className="rounded-[24px] bg-white/[0.05] border border-white/8 p-4 mb-4"><h2 className="font-semibold mb-3">Add one-off contribution</h2><div className="grid grid-cols-2 gap-2 mb-2"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-2xl bg-black/25 border border-white/10 px-3 py-3 outline-none"/><select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-2xl bg-black/25 border border-white/10 px-3 py-3 outline-none">{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></div><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount in MYR" className="w-full rounded-2xl bg-black/25 border border-white/10 px-3 py-3 outline-none mb-2"/><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" className="w-full rounded-2xl bg-black/25 border border-white/10 px-3 py-3 outline-none mb-3"/><button onClick={addEntry} className="w-full rounded-2xl bg-white/[0.08] border border-white/10 py-3 font-bold flex items-center justify-center gap-2"><Plus className="h-4 w-4"/>Add one-off entry</button></section>{categoryTotals.length > 0 && <section className="rounded-[24px] bg-white/[0.05] border border-white/8 p-4 mb-4"><h2 className="font-semibold mb-3">Contribution mix</h2><div className="space-y-3">{categoryTotals.map((item) => <div key={item.category}><div className="flex justify-between text-sm mb-1"><span>{item.category}</span><span className="font-mono">{money(item.total, true)}</span></div><div className="h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-[#a7ff4f] rounded-full" style={{ width: `${Math.min((item.total / Math.max(...categoryTotals.map((c) => c.total), 1)) * 100, 100)}%` }}/></div></div>)}</div></section>}<section className="space-y-2">{entries.map((entry) => <div key={entry.id} className="rounded-[20px] bg-white/[0.05] border border-white/8 px-4 py-3 flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-sm font-semibold truncate">{entry.category}{entry.recurringId ? ' · Auto' : ''}</p><p className="text-xs text-[#8d9188] truncate">{entry.date}{entry.note ? ` · ${entry.note}` : ''}</p></div><div className="flex items-center gap-3"><p className="text-sm font-mono">{money(entry.amount, true)}</p><button onClick={() => removeEntry(entry.id)} className="h-8 w-8 rounded-full bg-red-500/10 text-red-100 flex items-center justify-center"><Trash2 className="h-4 w-4"/></button></div></div>)}</section></div></div></main>;
}

export default function ContributionsPage() { return <AppLock><ContributionsContent /></AppLock>; }
