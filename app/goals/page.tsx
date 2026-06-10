'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Target, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getTotals } from '@/lib/finance';
import type { Account } from '@/lib/finance';

type Goal = { id: string; name: string; type: 'networth' | 'retirement' | 'emergency'; target: number };
const KEY = 'vault_goals_v1';
function money(value: number, compact = false) { return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: compact ? 1 : 0, notation: compact ? 'compact' : 'standard' }).format(value || 0); }

export default function GoalsPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [type, setType] = useState<Goal['type']>('networth');
  const [loading, setLoading] = useState(true);
  const totals = useMemo(() => getTotals(accounts), [accounts]);

  useEffect(() => {
    async function load() {
      const session = await supabase.auth.getSession();
      if (!session.data.session) { router.push('/login'); return; }
      const result = await supabase.from('accounts').select('id,name,institution,type,balance,currency').order('created_at', { ascending: false });
      if (!result.error && result.data) setAccounts(result.data as Account[]);
      const saved = localStorage.getItem(KEY);
      setGoals(saved ? JSON.parse(saved) : [
        { id: 'networth', name: 'Net Worth Goal', type: 'networth', target: 1000000 },
        { id: 'retirement', name: 'Retirement Goal', type: 'retirement', target: 2000000 },
        { id: 'emergency', name: 'Emergency Fund', type: 'emergency', target: 100000 },
      ]);
      setLoading(false);
    }
    load();
  }, [router]);

  useEffect(() => { if (!loading) localStorage.setItem(KEY, JSON.stringify(goals)); }, [goals, loading]);
  function current(goal: Goal) { if (goal.type === 'retirement') return totals.retirement; if (goal.type === 'emergency') return totals.cash; return totals.netWorth; }
  function addGoal() { if (!name || !Number(target)) return; setGoals([{ id: crypto.randomUUID(), name, type, target: Number(target) }, ...goals]); setName(''); setTarget(''); }

  if (loading) return <main className="min-h-screen bg-[#080b08] flex items-center justify-center text-[#d8ded2] text-sm">Loading...</main>;

  return <main className="min-h-screen bg-[#080b08] text-[#f4f5ef]"><div className="mx-auto max-w-[680px] min-h-screen relative overflow-hidden"><div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_-10%,rgba(148,255,97,0.12),transparent_34%),linear-gradient(180deg,#182016_0%,#080b08_42%)]"/><div className="relative px-4 pt-6 pb-10"><header className="flex items-center justify-between mb-8"><button onClick={() => router.push('/')} className="h-10 w-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center"><ArrowLeft className="h-5 w-5"/></button><h1 className="text-xl font-semibold tracking-tight">Goals</h1><div className="h-10 w-10"/></header><section className="rounded-[24px] bg-white/[0.05] border border-white/8 p-4 mb-4"><h2 className="text-base font-medium mb-3">Add goal</h2><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Goal name" className="w-full rounded-2xl bg-black/25 border border-white/10 px-4 py-3 outline-none mb-3"/><select value={type} onChange={(e) => setType(e.target.value as Goal['type'])} className="w-full rounded-2xl bg-black/25 border border-white/10 px-4 py-3 outline-none mb-3"><option value="networth">Net worth</option><option value="retirement">Retirement</option><option value="emergency">Emergency fund</option></select><div className="flex items-center gap-3 rounded-2xl bg-black/25 border border-white/10 px-4 py-3 mb-3"><span className="text-[#a8aca3]">RM</span><input value={target} onChange={(e) => setTarget(e.target.value)} type="number" placeholder="Target amount" className="w-full bg-transparent outline-none"/></div><button onClick={addGoal} className="w-full rounded-2xl bg-[#a7ff4f] text-[#071006] py-3 font-bold flex items-center justify-center gap-2"><Save className="h-4 w-4"/>Save goal</button></section><section className="space-y-3">{goals.map((goal) => { const value = current(goal); const pct = Math.min(100, (value / Math.max(goal.target, 1)) * 100); const gap = Math.max(goal.target - value, 0); return <div key={goal.id} className="rounded-[24px] bg-white/[0.05] border border-white/8 p-4"><div className="flex items-start justify-between gap-3"><div><Target className="h-5 w-5 text-[#a7ff4f] mb-2"/><h3 className="font-semibold">{goal.name}</h3><p className="text-xs text-[#a8aca3] capitalize">{goal.type}</p></div><button onClick={() => setGoals(goals.filter((item) => item.id !== goal.id))} className="h-9 w-9 rounded-full bg-red-500/10 border border-red-500/20 text-red-100 flex items-center justify-center"><Trash2 className="h-4 w-4"/></button></div><div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-2xl bg-black/20 p-2"><p className="text-xs text-[#a8aca3]">Current</p><p className="text-sm font-mono">{money(value, true)}</p></div><div className="rounded-2xl bg-black/20 p-2"><p className="text-xs text-[#a8aca3]">Target</p><p className="text-sm font-mono">{money(goal.target, true)}</p></div><div className="rounded-2xl bg-black/20 p-2"><p className="text-xs text-[#a8aca3]">Gap</p><p className="text-sm font-mono">{money(gap, true)}</p></div></div><div className="mt-4 h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full bg-[#a7ff4f]" style={{ width: `${pct}%` }}/></div><p className="text-xs text-[#a8aca3] mt-2">{pct.toFixed(1)}% complete</p></div>})}</section></div></div></main>;
}
