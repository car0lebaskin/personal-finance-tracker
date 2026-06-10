'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Coins, FileText, RefreshCw, Repeat, Target, Trophy } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Account } from '@/lib/finance';

type Props = {
  accounts: Account[];
  snapshots: { account_id: string; snapshot_date: string; balance: number }[];
  nextMilestone: number;
  milestoneGap: number;
  hidden?: string | null;
};
type Goal = { id: string; name: string; category: string; target_amount: number; current_amount: number; target_date?: string | null; monthly_contribution: number };
type Recurring = { id: string; amount: number; active: boolean };

function money(value: number, compact = true) {
  return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: compact ? 1 : 0, notation: compact ? 'compact' : 'standard' }).format(value || 0);
}
function isCrypto(account: Account) { return account.type === 'crypto' || ['BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'SOL', 'XRP'].includes(String(account.currency || '').toUpperCase()); }
function readLocalRecurring(): Recurring[] { try { return JSON.parse(localStorage.getItem('vault_recurring_contributions_v1') || '[]') as Recurring[]; } catch { return []; } }

export default function DashboardActionCards({ accounts, snapshots, nextMilestone, milestoneGap, hidden }: Props) {
  const router = useRouter();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [recurring, setRecurring] = useState<Recurring[]>([]);

  useEffect(() => {
    async function loadSignals() {
      const goalResult = await supabase.from('goals').select('id,name,category,target_amount,current_amount,target_date,monthly_contribution').limit(20);
      if (!goalResult.error && goalResult.data) setGoals(goalResult.data as Goal[]);
      const recurringResult = await supabase.from('recurring_contributions').select('id,amount,active').eq('active', true).limit(50);
      if (!recurringResult.error && recurringResult.data) setRecurring(recurringResult.data as Recurring[]);
      else setRecurring(readLocalRecurring().filter((item) => item.active));
    }
    loadSignals();
  }, []);

  const snapshotDates = Array.from(new Set(snapshots.map((snap) => snap.snapshot_date))).sort();
  const latestSnapshotDate = snapshotDates.length ? snapshotDates[snapshotDates.length - 1] : undefined;
  const needsUpdate = latestSnapshotDate ? accounts.filter((account) => !snapshots.some((snap) => snap.account_id === account.id && snap.snapshot_date === latestSnapshotDate)).length : accounts.length;
  const cryptoCount = accounts.filter(isCrypto).length;
  const monthlyRecurring = recurring.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const nearestGoal = useMemo(() => {
    if (!goals.length) return null;
    return [...goals].sort((a, b) => Number(a.target_amount || 0) - Number(b.target_amount || 0))[0];
  }, [goals]);
  const goalText = nearestGoal ? `${nearestGoal.name}: ${money(Number(nearestGoal.target_amount || 0), true)}` : `Next target ${hidden || money(nextMilestone)}`;

  const actions = useMemo(() => [
    {
      title: needsUpdate > 0 ? `${needsUpdate} accounts need updating` : 'Accounts are up to date',
      body: latestSnapshotDate ? `Last snapshot ${latestSnapshotDate}` : 'Create your first snapshot',
      icon: RefreshCw,
      href: '/update',
      highlight: needsUpdate > 0,
    },
    {
      title: cryptoCount > 0 ? 'Refresh live crypto' : 'Add crypto account',
      body: cryptoCount > 0 ? `${cryptoCount} crypto account${cryptoCount === 1 ? '' : 's'} found` : 'BTC, ETH, USDT supported',
      icon: Coins,
      href: cryptoCount > 0 ? '/crypto' : '/accounts',
      highlight: cryptoCount > 0,
    },
    {
      title: monthlyRecurring > 0 ? `${money(monthlyRecurring)} monthly auto` : 'Set monthly auto rules',
      body: monthlyRecurring > 0 ? `${recurring.length} active recurring contribution${recurring.length === 1 ? '' : 's'}` : 'DCA, EPF, mortgage and savings',
      icon: Repeat,
      href: '/contributions',
      highlight: monthlyRecurring > 0,
    },
    {
      title: nearestGoal ? 'Goal in focus' : `${hidden || money(milestoneGap)} to milestone`,
      body: goalText,
      icon: nearestGoal ? Target : Trophy,
      href: '/goals',
      highlight: false,
    },
    {
      title: 'Run monthly report',
      body: 'Summarise trend, contribution and action items',
      icon: FileText,
      href: '/report',
      highlight: false,
    },
  ], [needsUpdate, latestSnapshotDate, cryptoCount, monthlyRecurring, recurring.length, nearestGoal, milestoneGap, hidden, goalText]);

  return <section className="mb-4 -mx-4 overflow-x-auto no-scrollbar"><div className="flex gap-3 px-4 py-1 w-max min-w-full">{actions.map((action) => { const Icon = action.icon; return <button key={action.title} onClick={() => router.push(action.href)} className={`w-[220px] shrink-0 rounded-[22px] border p-4 text-left ${action.highlight ? 'bg-[#a7ff4f]/12 border-[#a7ff4f]/25' : 'bg-white/[0.05] border-white/8'}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-semibold truncate">{action.title}</p><p className="text-xs text-[#8d9188] mt-1 leading-relaxed">{action.body}</p></div><div className={action.highlight ? 'h-9 w-9 rounded-2xl bg-[#a7ff4f]/15 text-[#a7ff4f] flex items-center justify-center shrink-0' : 'h-9 w-9 rounded-2xl bg-white/[0.06] text-[#a7ff4f] flex items-center justify-center shrink-0'}>{action.highlight && action.href === '/update' ? <AlertTriangle className="h-4 w-4"/> : <Icon className="h-4 w-4"/>}</div></div></button>})}</div></section>;
}
