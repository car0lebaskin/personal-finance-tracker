'use client';

import { ChangeEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, Upload } from 'lucide-react';
import AppLock from '@/components/AppLock';
import { supabase } from '@/lib/supabase';

type TableName = 'accounts' | 'account_snapshots' | 'contribution_entries' | 'recurring_contributions' | 'goals' | 'account_links';
type Backup = { version: 1; exported_at: string; tables: Partial<Record<TableName, Record<string, unknown>[]>> };
const tables: TableName[] = ['accounts', 'account_snapshots', 'contribution_entries', 'recurring_contributions', 'goals', 'account_links'];

function downloadJson(filename: string, data: Backup) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function BackupContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function load() {
      const session = await supabase.auth.getSession();
      const uid = session.data.session?.user.id;
      if (!uid) { router.push('/login'); return; }
      setUserId(uid);
      setLoading(false);
    }
    load();
  }, [router]);

  async function exportBackup() {
    setBusy(true);
    setStatus('');
    const backup: Backup = { version: 1, exported_at: new Date().toISOString(), tables: {} };
    for (const table of tables) {
      const result = await supabase.from(table).select('*');
      if (!result.error && result.data) backup.tables[table] = result.data as Record<string, unknown>[];
    }
    downloadJson(`vault-full-backup-${new Date().toISOString().slice(0, 10)}.json`, backup);
    setBusy(false);
    setStatus('Full backup downloaded. Keep it somewhere private.');
  }

  async function restoreBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setStatus('');
    try {
      const text = await file.text();
      const backup = JSON.parse(text) as Backup;
      if (!backup.tables) throw new Error('This does not look like a Vault backup file.');
      for (const table of tables) {
        const rows = backup.tables[table] || [];
        if (!rows.length) continue;
        const cleaned = rows.map((row) => ({ ...row, user_id: userId }));
        const result = await supabase.from(table).upsert(cleaned);
        if (result.error) throw new Error(`${table}: ${result.error.message}`);
      }
      setStatus('Backup restored. Refresh Vault to see the latest data.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Restore failed.');
    }
    setBusy(false);
    event.target.value = '';
  }

  if (loading) return <main className="min-h-screen bg-[#080b08] flex items-center justify-center text-[#d8ded2] text-sm">Loading...</main>;

  return <main className="min-h-screen bg-[#080b08] text-[#f4f5ef]"><div className="mx-auto max-w-[680px] min-h-screen relative overflow-hidden"><div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_-10%,rgba(148,255,97,0.12),transparent_34%),linear-gradient(180deg,#182016_0%,#080b08_42%)]"/><div className="relative px-4 pt-6 pb-10"><header className="flex items-center justify-between mb-8"><button onClick={() => router.push('/accounts/profile')} className="h-10 w-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center"><ArrowLeft className="h-5 w-5"/></button><div className="text-center"><h1 className="text-xl font-semibold tracking-tight">Full Backup</h1><p className="text-xs text-[#8d9188]">Accounts, snapshots, goals, links and contributions</p></div><div className="h-10 w-10"/></header><section className="rounded-[28px] bg-white/[0.05] border border-white/8 p-5 mb-4"><h2 className="text-lg font-semibold mb-2">Export everything</h2><p className="text-sm text-[#a8aca3] mb-5">Downloads a private JSON file with your Vault data. Store it safely because it contains financial balances.</p><button onClick={exportBackup} disabled={busy} className="w-full rounded-2xl bg-[#a7ff4f] text-[#071006] py-3 font-bold flex items-center justify-center gap-2 disabled:opacity-50"><Download className="h-4 w-4"/>Download full backup</button></section><section className="rounded-[28px] bg-white/[0.05] border border-white/8 p-5 mb-4"><h2 className="text-lg font-semibold mb-2">Restore backup</h2><p className="text-sm text-[#a8aca3] mb-5">Restores a Vault JSON backup into Supabase. It uses upsert, so matching IDs are updated.</p><label className="w-full rounded-2xl bg-white/[0.08] border border-white/10 py-3 font-bold flex items-center justify-center gap-2 cursor-pointer"><Upload className="h-4 w-4"/>Choose backup file<input type="file" accept="application/json" onChange={restoreBackup} className="hidden" disabled={busy}/></label></section>{status && <p className="rounded-2xl border border-[#a7ff4f]/20 bg-[#a7ff4f]/10 px-4 py-3 text-xs text-[#dfffc6]">{status}</p>}</div></div></main>;
}

export default function BackupPage() { return <AppLock><BackupContent /></AppLock>; }
