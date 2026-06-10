'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CalendarDays, Calculator } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AppLock from '@/components/AppLock';
import { getTotals } from '@/lib/finance';
import type { Account } from '@/lib/finance';

type Goal = { id: string; name: string; type: 'networth' | 'retirement' | 'emergency' | 'debt'; target: number };
function money(value: number, compact = false) { return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: compact ? 1 : 0, notation: compact ? 'compact' : 'standard' }).format(value || 0); }
function monthsUntil(date: string) { const end = new Date(`${date}T00:00:00`); const now = new Date(); return Math.max(1, (end.getFullYear() - now.getFullYear()) * 12 + end.getMonth() - now.getMonth()); }

function PlannerContent() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [dates, setDates] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const totals = useMemo(() => getTotals(accounts), [accounts]);

  useEffect(() => {
    async function load() {
      const session = await supabase.auth.getSession();
      if (!session.data.session) { router.push('/login'); return; }
      const accountResult = await supabase.from('accounts').select('id,name,institution,type,balance,currency,native_balance,fx_rate').order('created_at', { ascending: false });
      if (!accountResult.error && accountResult.data) setAccounts(accountResult.data as Account[]);
      const goalResult = await supabase.from('goals').select('id,name,type,target').order('created_at', { ascending: false });
      if (!goalResult.error && goalResult.data) setGoals(goalResult.data as Goal[]);
      else {
        const saved = localStorage.getItem('vault_goals_v1');
        setGoals(saved ? JSON.parse(saved) : []);
      }
      const savedDates = localStorage.getItem('vault_goal_dates_v1');
      if (savedDates) setDates(JSON.parse(savedDates));
      setLoading(false);
    }
    load();
  }, [router]);

  useEffect(() => { if (!loading) localStorage.setItem('vault_goal_dates_v1', JSON.stringify(dates)); }, [dates, loading]);
  function current(goal: Goal) { if (goal.type === 'retirement') return totals.retirement; if (goal.type === 'emergency') return totals.cash; if (goal.type === 'debt') return totals.liabilities; return totals.netWorth; }
  function defaultDate() { const d = new Date(); d.setFullYear(d.getFullYear() + 5); return d.toISOString().slice(0, 10); }

  if (loading) return <main className="min-h-screen bg-[#080b08] flex items-center justify-center text-[#d8ded2] text-sm">Loading...</main>;

  return <main className="min-h-screen bg-[#080b08] text-[#f4f5ef]"><div className="mx-auto max-w-[680px] min-h-screen relative overflow-hidden"><div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_-10%,rgba(148,255,97,0.12),transparent_34%),linear-gradient(180deg,#182016_0%,#080b08_42%)]"/><div className="relative px-4 pt-6 pb-10"><header className="flex items-center justify-between mb-8"><button onClick={() => router.push('/accounts/profile')} className="h-10 w-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center"><ArrowLeft className="h-5 w-5"/></button><h1 className="text-xl font-semibold tracking-tight">Contribution Planner</h1><div className="h-10 w-10"/></header><section className="rounded-[24px] bg-white/[0.05] border border-white/8 p-4 mb-4"><div className="flex items-center gap-2 mb-2"><Calculator className="h-4 w-4 text-[#a7ff4f]"/><h2 className="text-base font-medium">Monthly amount needed</h2></div><p className="text-sm text-[#a8aca3]">Pick a target date for each goal. Vault calculates the monthly saving needed based on your current balance.</p></section><section className="space-y-3">{goals.length === 0 && <div className="rounded-[24px] bg-white/[0.05] border border-white/8 p-4 text-sm text-[#a8aca3]">Add goals first, then come back here.</div>}{goals.map((goal) => { const value = current(goal); const date = dates[goal.id] || defaultDate(); const months = monthsUntil(date); const gap = goal.type === 'debt' ? Math.max(value, 0) : Math.max(goal.target - value, 0); const monthly = gap / months; return <div key={goal.id} className="rounded-[24px] bg-white/[0.05] border border-white/8 p-4"><div className="flex items-start justify-between gap-3 mb-4"><div><h3 className="font-semibold">{goal.name}</h3><p className="text-xs text-[#a8aca3] capitalize">{goal.type}</p></div><div className="text-right"><p className="text-xs text-[#a8aca3]">Monthly needed</p><p className="text-lg font-semibold text-[#a7ff4f]">{money(monthly, true)}</p></div></div><label className="text-xs text-[#a8aca3] flex items-center gap-1 mb-2"><CalendarDays className="h-3 w-3"/>Target date</label><input type="date" value={date} onChange={(e) => setDates({ ...dates, [goal.id]: e.target.value })} className="w-full rounded-2xl bg-black/25 border border-white/10 px-4 py-3 outline-none mb-4"/><div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-2xl bg-black/20 p-2"><p className="text-xs text-[#a8aca3]">Current</p><p className="text-sm font-mono">{money(value, true)}</p></div><div className="rounded-2xl bg-black/20 p-2"><p className="text-xs text-[#a8aca3]">Gap</p><p className="text-sm font-mono">{money(gap, true)}</p></div><div className="rounded-2xl bg-black/20 p-2"><p className="text-xs text-[#a8aca3]">Months</p><p className="text-sm font-mono">{months}</p></div></div></div>})}</section></div></div></main>;
}

export default function PlannerPage() { return <AppLock><PlannerContent /></AppLock>; }
