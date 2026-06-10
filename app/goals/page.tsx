'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Target, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getTotals } from '@/lib/finance';
import type { Account } from '@/lib/finance';

type Goal = { id: string; name: string; category: string; target_amount: number; current_amount: number; target_date?: string | null; monthly_contribution: number };
type LegacyGoal = { id: string; name: string; type: string; target: number };
const KEY = 'vault_goals_v1';
const categories = ['Net worth', 'Retirement', 'Emergency fund', 'Renovation', 'Child / family', 'Debt reduction', 'Other'];
function money(value: number, compact = false) { return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: compact ? 1 : 0, notation: compact ? 'compact' : 'standard' }).format(value || 0); }
function today() { return new Date().toISOString().slice(0, 10); }
function monthsUntil(date?: string | null) { if (!date) return 0; const target = new Date(`${date}T00:00:00`).getTime(); const now = new Date(`${today()}T00:00:00`).getTime(); return Math.max(1, Math.ceil((target - now) / (1000 * 60 * 60 * 24 * 30.44))); }
function legacyToGoal(goal: LegacyGoal): Goal { return { id: goal.id, name: goal.name, category: goal.type === 'networth' ? 'Net worth' : goal.type === 'retirement' ? 'Retirement' : goal.type === 'emergency' ? 'Emergency fund' : goal.type === 'debt' ? 'Debt reduction' : 'Other', target_amount: goal.target, current_amount: 0, target_date: '', monthly_contribution: 0 }; }

export default function GoalsPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [targetDate, setTargetDate] = useState('');
  const [monthly, setMonthly] = useState('');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [cloudReady, setCloudReady] = useState(true);
  const [status, setStatus] = useState('');
  const totals = useMemo(() => getTotals(accounts), [accounts]);

  async function load() {
    const session = await supabase.auth.getSession();
    const uid = session.data.session?.user.id;
    if (!uid) { router.push('/login'); return; }
    setUserId(uid);
    const result = await supabase.from('accounts').select('id,name,institution,type,balance,currency').order('created_at', { ascending: false });
    if (!result.error && result.data) setAccounts(result.data as Account[]);
    const cloud = await supabase.from('goals').select('id,name,category,target_amount,current_amount,target_date,monthly_contribution').order('created_at', { ascending: false });
    if (!cloud.error && cloud.data) { setGoals(cloud.data as Goal[]); setCloudReady(true); }
    else {
      const saved = localStorage.getItem(KEY);
      const fallback = saved ? (JSON.parse(saved) as LegacyGoal[]).map(legacyToGoal) : [
        { id: 'networth', name: 'Net Worth Goal', category: 'Net worth', target_amount: 1000000, current_amount: 0, target_date: '', monthly_contribution: 0 },
        { id: 'retirement', name: 'Retirement Goal', category: 'Retirement', target_amount: 2000000, current_amount: 0, target_date: '', monthly_contribution: 0 },
        { id: 'emergency', name: 'Emergency Fund', category: 'Emergency fund', target_amount: 100000, current_amount: 0, target_date: '', monthly_contribution: 0 },
      ];
      setGoals(fallback);
      setCloudReady(false);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { if (!loading && !cloudReady) localStorage.setItem(KEY, JSON.stringify(goals)); }, [goals, loading, cloudReady]);

  function current(goal: Goal) {
    if (goal.category === 'Retirement') return totals.retirement;
    if (goal.category === 'Emergency fund') return totals.cash;
    if (goal.category === 'Debt reduction') return totals.liabilities;
    if (goal.category === 'Net worth') return totals.netWorth;
    return Number(goal.current_amount || 0);
  }
  function statusFor(goal: Goal) {
    if (!goal.target_date) return 'No target date';
    const gap = goal.category === 'Debt reduction' ? Math.max(current(goal), 0) : Math.max(goal.target_amount - current(goal), 0);
    const needed = gap / monthsUntil(goal.target_date);
    if (Number(goal.monthly_contribution || 0) >= needed) return 'On track';
    return `Needs ${money(needed, true)}/mo`;
  }

  async function addGoal() {
    if (!name || !Number(target)) return;
    const item = { name, category, target_amount: Number(target), current_amount: 0, target_date: targetDate || null, monthly_contribution: Number(monthly || 0) };
    if (cloudReady) {
      const insert = await supabase.from('goals').insert({ user_id: userId, ...item });
      if (insert.error) setStatus(insert.error.message); else await load();
    } else setGoals([{ id: crypto.randomUUID(), ...item }, ...goals]);
    setName(''); setTarget(''); setTargetDate(''); setMonthly('');
  }
  async function deleteGoal(goal: Goal) { if (cloudReady) { await supabase.from('goals').delete().eq('id', goal.id); await load(); } else setGoals(goals.filter((item) => item.id !== goal.id)); }

  if (loading) return <main className="min-h-screen bg-[#080b08] flex items-center justify-center text-[#d8ded2] text-sm">Loading...</main>;

  return <main className="min-h-screen bg-[#080b08] text-[#f4f5ef]"><div className="mx-auto max-w-[680px] min-h-screen relative overflow-hidden"><div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_-10%,rgba(148,255,97,0.12),transparent_34%),linear-gradient(180deg,#182016_0%,#080b08_42%)]"/><div className="relative px-4 pt-6 pb-10"><header className="flex items-center justify-between mb-8"><button onClick={() => router.push('/')} className="h-10 w-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center"><ArrowLeft className="h-5 w-5"/></button><div className="text-center"><h1 className="text-xl font-semibold tracking-tight">Goals</h1><p className="text-xs text-[#8d9188]">{cloudReady ? 'Synced to Supabase' : 'Local fallback'}</p></div><div className="h-10 w-10"/></header>{!cloudReady && <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-3 mb-4 text-xs text-yellow-100">Goals are saved on this device until the Supabase goals table is available.</div>}{status && <p className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 mb-4 text-xs text-red-100">{status}</p>}<section className="rounded-[24px] bg-white/[0.05] border border-white/8 p-4 mb-4"><h2 className="text-base font-medium mb-3">Add goal</h2><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Goal name" className="w-full rounded-2xl bg-black/25 border border-white/10 px-4 py-3 outline-none mb-3"/><select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-2xl bg-black/25 border border-white/10 px-4 py-3 outline-none mb-3">{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select><div className="flex items-center gap-3 rounded-2xl bg-black/25 border border-white/10 px-4 py-3 mb-3"><span className="text-[#a8aca3]">RM</span><input value={target} onChange={(e) => setTarget(e.target.value)} type="number" placeholder="Target amount" className="w-full bg-transparent outline-none"/></div><div className="grid grid-cols-2 gap-3 mb-3"><input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="rounded-2xl bg-black/25 border border-white/10 px-4 py-3 outline-none"/><input type="number" value={monthly} onChange={(e) => setMonthly(e.target.value)} placeholder="Monthly RM" className="rounded-2xl bg-black/25 border border-white/10 px-4 py-3 outline-none"/></div><button onClick={addGoal} className="w-full rounded-2xl bg-[#a7ff4f] text-[#071006] py-3 font-bold flex items-center justify-center gap-2"><Save className="h-4 w-4"/>Save goal</button></section><section className="space-y-3">{goals.map((goal) => { const value = current(goal); const pct = goal.category === 'Debt reduction' ? Math.max(0, Math.min(100, 100 - (value / Math.max(goal.target_amount, 1)) * 100)) : Math.min(100, (value / Math.max(goal.target_amount, 1)) * 100); const gap = goal.category === 'Debt reduction' ? Math.max(value, 0) : Math.max(goal.target_amount - value, 0); return <div key={goal.id} className="rounded-[24px] bg-white/[0.05] border border-white/8 p-4"><div className="flex items-start justify-between gap-3"><div><Target className="h-5 w-5 text-[#a7ff4f] mb-2"/><h3 className="font-semibold">{goal.name}</h3><p className="text-xs text-[#a8aca3]">{goal.category} · {statusFor(goal)}</p></div><button onClick={() => deleteGoal(goal)} className="h-9 w-9 rounded-full bg-red-500/10 border border-red-500/20 text-red-100 flex items-center justify-center"><Trash2 className="h-4 w-4"/></button></div><div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-2xl bg-black/20 p-2"><p className="text-xs text-[#a8aca3]">Current</p><p className="text-sm font-mono">{money(value, true)}</p></div><div className="rounded-2xl bg-black/20 p-2"><p className="text-xs text-[#a8aca3]">Target</p><p className="text-sm font-mono">{money(goal.target_amount, true)}</p></div><div className="rounded-2xl bg-black/20 p-2"><p className="text-xs text-[#a8aca3]">Gap</p><p className="text-sm font-mono">{money(gap, true)}</p></div></div><div className="mt-4 h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full bg-[#a7ff4f]" style={{ width: `${pct}%` }}/></div><p className="text-xs text-[#a8aca3] mt-2">{pct.toFixed(1)}% complete{goal.monthly_contribution ? ` · ${money(goal.monthly_contribution, true)}/mo planned` : ''}</p></div>})}</section></div></div></main>;
}
