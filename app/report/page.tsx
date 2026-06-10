'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText, RefreshCw } from 'lucide-react';
import AppLock from '@/components/AppLock';
import { supabase } from '@/lib/supabase';

type Account = { id: string; name: string; institution: string; type: string; balance: number; currency?: string | null };
type Snapshot = { account_id: string; snapshot_date: string; balance: number };
type Contribution = { id: string; date: string; category: string; amount: number; note: string };
type Report = { mode?: string; headline?: string; sections?: { title: string; body: string }[]; error?: string };
const CONTRIBUTIONS_KEY = 'vault_contributions_v1';

function readContributions(): Contribution[] { try { return JSON.parse(localStorage.getItem(CONTRIBUTIONS_KEY) || '[]') as Contribution[]; } catch { return []; } }

function ReportContent() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    async function load() {
      const session = await supabase.auth.getSession();
      if (!session.data.session) { router.push('/login'); return; }
      const accountResult = await supabase.from('accounts').select('id,name,institution,type,balance,currency').order('created_at', { ascending: false });
      const snapshotResult = await supabase.from('account_snapshots').select('account_id,snapshot_date,balance').order('snapshot_date', { ascending: true });
      if (!accountResult.error && accountResult.data) setAccounts(accountResult.data as Account[]);
      if (!snapshotResult.error && snapshotResult.data) setSnapshots(snapshotResult.data as Snapshot[]);
      setContributions(readContributions());
      setLoading(false);
    }
    load();
  }, [router]);

  async function generate() {
    setRunning(true);
    const response = await fetch('/api/monthly-report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accounts, snapshots, contributions }) });
    const data = await response.json() as Report;
    setReport(data);
    setRunning(false);
  }

  if (loading) return <main className="min-h-screen bg-[#080b08] flex items-center justify-center text-[#d8ded2] text-sm">Loading...</main>;

  return <main className="min-h-screen bg-[#080b08] text-[#f4f5ef]"><div className="mx-auto max-w-[720px] min-h-screen relative overflow-hidden"><div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_-10%,rgba(148,255,97,0.12),transparent_34%),linear-gradient(180deg,#182016_0%,#080b08_42%)]"/><div className="relative px-4 pt-6 pb-10"><header className="flex items-center justify-between mb-6"><button onClick={() => router.push('/')} className="h-10 w-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center"><ArrowLeft className="h-5 w-5"/></button><div className="text-center"><h1 className="text-xl font-semibold tracking-tight">Monthly AI Report</h1><p className="text-xs text-[#8d9188]">Trend, contribution and action summary</p></div><div className="h-10 w-10"/></header><section className="rounded-[28px] bg-white/[0.05] border border-white/8 p-5 mb-4"><div className="flex items-start gap-3"><div className="h-12 w-12 rounded-2xl bg-[#a7ff4f]/15 flex items-center justify-center shrink-0"><FileText className="h-6 w-6 text-[#a7ff4f]"/></div><div><h2 className="text-lg font-semibold">Generate your month-end readout</h2><p className="text-sm text-[#a8aca3] mt-1">Uses account totals, snapshots and your contribution log. If AI is unavailable, Vault shows a local report.</p></div></div><button onClick={generate} disabled={running} className="w-full rounded-2xl bg-[#a7ff4f] text-[#071006] py-3 font-bold mt-5 disabled:opacity-50 flex items-center justify-center gap-2">{running ? <RefreshCw className="h-4 w-4 animate-spin"/> : <FileText className="h-4 w-4"/>}{running ? 'Generating...' : 'Generate report'}</button></section>{report?.error && <p className="rounded-2xl bg-yellow-400/10 border border-yellow-400/20 p-3 text-xs text-yellow-100 mb-4">{report.error}</p>}{report && <section className="space-y-3"><div className="rounded-[24px] bg-white/[0.05] border border-white/8 p-4"><p className="text-xs text-[#a8aca3] mb-1">{report.mode === 'ai' ? 'AI report' : 'Local report'}</p><h2 className="text-xl font-semibold">{report.headline}</h2></div>{(report.sections || []).map((section) => <div key={section.title} className="rounded-[22px] bg-white/[0.05] border border-white/8 p-4"><h3 className="font-semibold text-sm mb-2">{section.title}</h3><p className="text-sm leading-relaxed text-[#a8aca3]">{section.body}</p></div>)}</section>}</div></div></main>;
}

export default function ReportPage() { return <AppLock><ReportContent /></AppLock>; }
