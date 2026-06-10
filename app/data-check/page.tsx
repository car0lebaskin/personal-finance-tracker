'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import AppLock from '@/components/AppLock';
import { supabase } from '@/lib/supabase';

type Account = { id: string; name: string; institution: string; type: string; balance: number; currency?: string | null; native_balance?: number | null };
type Snapshot = { account_id: string; snapshot_date: string; balance: number };
type Recurring = { id: string; category: string; amount: number; active: boolean; last_run_month?: string | null };
type Finding = { title: string; body: string; level: 'High' | 'Medium' | 'Low' };
function monthKey() { return new Date().toISOString().slice(0, 7); }
function isCrypto(account: Account) { return account.type === 'crypto' || ['BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'SOL', 'XRP'].includes(String(account.currency || '').toUpperCase()); }
function isDebt(account: Account) { return ['loan', 'credit'].includes(account.type); }

function DataCheckContent() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [recurring, setRecurring] = useState<Recurring[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const session = await supabase.auth.getSession();
      if (!session.data.session) { router.push('/login'); return; }
      const accountResult = await supabase.from('accounts').select('id,name,institution,type,balance,currency,native_balance').order('created_at', { ascending: false });
      const snapshotResult = await supabase.from('account_snapshots').select('account_id,snapshot_date,balance').order('snapshot_date', { ascending: true });
      const recurringResult = await supabase.from('recurring_contributions').select('id,category,amount,active,last_run_month').eq('active', true);
      if (!accountResult.error && accountResult.data) setAccounts(accountResult.data as Account[]);
      if (!snapshotResult.error && snapshotResult.data) setSnapshots(snapshotResult.data as Snapshot[]);
      if (!recurringResult.error && recurringResult.data) setRecurring(recurringResult.data as Recurring[]);
      setLoading(false);
    }
    load();
  }, [router]);

  const findings = useMemo(() => {
    const list: Finding[] = [];
    const currentMonth = monthKey();
    if (!snapshots.some((snap) => snap.snapshot_date.startsWith(currentMonth))) list.push({ title: 'No snapshot this month', body: 'Create a snapshot so trends and reports stay accurate.', level: 'High' });
    accounts.filter(isCrypto).forEach((account) => { if (!account.native_balance || Number(account.native_balance) === Number(account.balance)) list.push({ title: `${account.name} may be missing coin amount`, body: 'Crypto works best when native balance stores the coin amount and MYR balance stores live value.', level: 'Medium' }); });
    accounts.forEach((account) => { if (isDebt(account) && Number(account.balance) < 0) list.push({ title: `${account.name} debt value is negative`, body: 'Vault treats loan and credit balances as liabilities automatically. Store them as positive values.', level: 'Low' }); });
    accounts.forEach((account) => {
      const rows = snapshots.filter((snap) => snap.account_id === account.id).sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
      if (!rows.length) list.push({ title: `${account.name} has no snapshots`, body: 'Update or snapshot this account at least once.', level: 'Medium' });
      const latest = rows[rows.length - 1];
      if (latest) {
        const days = Math.floor((Date.now() - new Date(`${latest.snapshot_date}T00:00:00`).getTime()) / 86400000);
        if (days > 30) list.push({ title: `${account.name} not updated in ${days} days`, body: 'Review this account balance.', level: 'Low' });
      }
      for (let i = 1; i < rows.length; i += 1) {
        const previous = Number(rows[i - 1].balance || 0);
        const current = Number(rows[i].balance || 0);
        if (previous > 0 && Math.abs(current - previous) / previous > 0.5) list.push({ title: `${account.name} has a large jump`, body: `${rows[i - 1].snapshot_date} to ${rows[i].snapshot_date} changed more than 50%. Check if it is real.`, level: 'Medium' });
      }
    });
    recurring.forEach((item) => { if (item.active && item.last_run_month !== currentMonth) list.push({ title: `${item.category} auto rule not run`, body: 'Open Contributions or tap run to auto-add this month.', level: 'Medium' }); });
    const seen = new Set<string>();
    snapshots.forEach((snap) => { const key = `${snap.account_id}:${snap.snapshot_date}`; if (seen.has(key)) list.push({ title: 'Duplicate snapshot detected', body: `An account has multiple snapshots on ${snap.snapshot_date}.`, level: 'Low' }); seen.add(key); });
    return list;
  }, [accounts, snapshots, recurring]);

  if (loading) return <main className="min-h-screen bg-[#080b08] flex items-center justify-center text-[#d8ded2] text-sm">Loading...</main>;

  return <main className="min-h-screen bg-[#080b08] text-[#f4f5ef]"><div className="mx-auto max-w-[720px] min-h-screen relative overflow-hidden"><div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_-10%,rgba(148,255,97,0.12),transparent_34%),linear-gradient(180deg,#182016_0%,#080b08_42%)]"/><div className="relative px-4 pt-6 pb-10"><header className="flex items-center justify-between mb-8"><button onClick={() => router.push('/accounts/profile')} className="h-10 w-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center"><ArrowLeft className="h-5 w-5"/></button><div className="text-center"><h1 className="text-xl font-semibold tracking-tight">Data Check</h1><p className="text-xs text-[#8d9188]">Manual data quality review</p></div><div className="h-10 w-10"/></header><section className="rounded-[28px] bg-white/[0.05] border border-white/8 p-5 mb-4"><div className="flex items-center gap-3"><div className="h-12 w-12 rounded-2xl bg-[#a7ff4f]/15 flex items-center justify-center">{findings.length ? <AlertTriangle className="h-6 w-6 text-[#a7ff4f]"/> : <CheckCircle2 className="h-6 w-6 text-[#a7ff4f]"/>}</div><div><p className="text-3xl font-light">{findings.length}</p><p className="text-sm text-[#a8aca3]">{findings.length ? 'items to review' : 'No obvious data issues found'}</p></div></div></section><section className="space-y-3">{findings.map((finding, index) => <div key={`${finding.title}-${index}`} className="rounded-[22px] bg-white/[0.05] border border-white/8 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-sm">{finding.title}</h3><p className="text-sm text-[#a8aca3] mt-1 leading-relaxed">{finding.body}</p></div><span className="rounded-full bg-white/[0.06] border border-white/10 px-2 py-1 text-[10px] text-[#cdd3c8]">{finding.level}</span></div></div>)}{!findings.length && <div className="rounded-[22px] bg-white/[0.05] border border-white/8 p-4 text-sm text-[#a8aca3]">Your snapshots, accounts and recurring rules look clean.</div>}</section></div></div></main>;
}

export default function DataCheckPage() { return <AppLock><DataCheckContent /></AppLock>; }
