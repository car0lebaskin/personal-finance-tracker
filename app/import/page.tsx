'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AppLock from '@/components/AppLock';

type Row = Record<string, string>;
function parseCsv(text: string): Row[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.replace(/^"|"$/g, ''));
  return lines.slice(1).map((line) => {
    const values = line.match(/("([^"]|"")*"|[^,]+)/g) || [];
    const row: Row = {};
    headers.forEach((header, i) => row[header] = (values[i] || '').replace(/^"|"$/g, '').replace(/""/g, '"'));
    return row;
  });
}
function num(value: string) { return value === '' || value === undefined ? null : Number(value); }

function ImportContent() {
  const router = useRouter();
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  async function importAccounts(file?: File) {
    if (!file) return;
    setBusy(true); setStatus('');
    const session = await supabase.auth.getSession();
    const userId = session.data.session?.user.id;
    if (!userId) { router.push('/login'); return; }
    const rows = parseCsv(await file.text()).map((row) => ({
      id: row.id || undefined,
      user_id: userId,
      name: row.name,
      institution: row.institution,
      type: row.type,
      balance: Number(row.balance || 0),
      currency: row.currency || 'MYR',
      notes: row.notes || null,
      native_balance: num(row.native_balance),
      fx_rate: num(row.fx_rate),
    }));
    const result = await supabase.from('accounts').upsert(rows, { onConflict: 'id' });
    setBusy(false);
    setStatus(result.error ? result.error.message : `Imported ${rows.length} accounts.`);
  }

  async function importSnapshots(file?: File) {
    if (!file) return;
    setBusy(true); setStatus('');
    const session = await supabase.auth.getSession();
    const userId = session.data.session?.user.id;
    if (!userId) { router.push('/login'); return; }
    const rows = parseCsv(await file.text()).map((row) => ({
      id: row.id || undefined,
      user_id: userId,
      account_id: row.account_id,
      snapshot_date: row.snapshot_date,
      balance: Number(row.balance || 0),
      notes: row.notes || null,
      native_balance: num(row.native_balance),
      currency: row.currency || null,
      fx_rate: num(row.fx_rate),
    }));
    const result = await supabase.from('account_snapshots').upsert(rows, { onConflict: 'id' });
    setBusy(false);
    setStatus(result.error ? result.error.message : `Imported ${rows.length} snapshots.`);
  }

  return <main className="min-h-screen bg-[#080b08] text-[#f4f5ef]"><div className="mx-auto max-w-[680px] min-h-screen relative overflow-hidden"><div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_-10%,rgba(148,255,97,0.12),transparent_34%),linear-gradient(180deg,#182016_0%,#080b08_42%)]"/><div className="relative px-4 pt-6 pb-10"><header className="flex items-center justify-between mb-8"><button onClick={() => router.push('/accounts/profile')} className="h-10 w-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center"><ArrowLeft className="h-5 w-5"/></button><h1 className="text-xl font-semibold tracking-tight">Restore CSV</h1><div className="h-10 w-10"/></header><section className="rounded-[24px] bg-white/[0.05] border border-white/8 p-4 mb-4"><h2 className="text-base font-medium mb-2">Import accounts first</h2><p className="text-sm text-[#a8aca3] mb-4">Use your exported vault-accounts CSV. This restores or updates accounts by ID.</p><label className="w-full rounded-2xl bg-[#a7ff4f] text-[#071006] py-4 font-bold flex items-center justify-center gap-2"><Upload className="h-4 w-4"/>Choose accounts CSV<input type="file" accept=".csv" className="hidden" disabled={busy} onChange={(e) => importAccounts(e.target.files?.[0])}/></label></section><section className="rounded-[24px] bg-white/[0.05] border border-white/8 p-4 mb-4"><h2 className="text-base font-medium mb-2">Then import snapshots</h2><p className="text-sm text-[#a8aca3] mb-4">Snapshots reference account IDs, so import accounts before snapshots.</p><label className="w-full rounded-2xl bg-white/[0.06] border border-white/10 py-4 font-bold flex items-center justify-center gap-2"><Upload className="h-4 w-4"/>Choose snapshots CSV<input type="file" accept=".csv" className="hidden" disabled={busy} onChange={(e) => importSnapshots(e.target.files?.[0])}/></label></section>{status && <p className="rounded-2xl bg-white/[0.05] border border-white/8 p-3 text-sm text-[#d8ded2]">{status}</p>}</div></div></main>;
}

export default function ImportPage() { return <AppLock><ImportContent /></AppLock>; }
