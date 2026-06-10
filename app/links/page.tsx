'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Link2, Plus, Trash2 } from 'lucide-react';
import AppLock from '@/components/AppLock';
import { supabase } from '@/lib/supabase';

type Account = { id: string; name: string; institution: string; type: string; balance: number; currency?: string | null };
type LinkRow = { id: string; asset_account_id: string; liability_account_id: string; label?: string | null };
function money(value: number, compact = false) { return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: compact ? 1 : 0, notation: compact ? 'compact' : 'standard' }).format(value || 0); }
function isDebt(account?: Account) { return Boolean(account && ['loan', 'credit'].includes(account.type)); }

function LinksContent() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [assetId, setAssetId] = useState('');
  const [liabilityId, setLiabilityId] = useState('');
  const [label, setLabel] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  async function load() {
    const session = await supabase.auth.getSession();
    const uid = session.data.session?.user.id;
    if (!uid) { router.push('/login'); return; }
    setUserId(uid);
    const accountResult = await supabase.from('accounts').select('id,name,institution,type,balance,currency').order('created_at', { ascending: false });
    const linkResult = await supabase.from('account_links').select('id,asset_account_id,liability_account_id,label').order('created_at', { ascending: false });
    if (!accountResult.error && accountResult.data) {
      const rows = accountResult.data as Account[];
      setAccounts(rows);
      const firstAsset = rows.find((account) => !isDebt(account));
      const firstDebt = rows.find((account) => isDebt(account));
      setAssetId(firstAsset?.id || '');
      setLiabilityId(firstDebt?.id || '');
    }
    if (!linkResult.error && linkResult.data) setLinks(linkResult.data as LinkRow[]);
    else setStatus('Account links table not ready. Run the latest Supabase schema if this persists.');
    setLoading(false);
  }

  useEffect(() => { load(); }, []);
  const assets = accounts.filter((account) => !isDebt(account));
  const debts = accounts.filter((account) => isDebt(account));
  const accountById = useMemo(() => Object.fromEntries(accounts.map((account) => [account.id, account])), [accounts]);

  async function addLink() {
    if (!assetId || !liabilityId) return;
    setStatus('');
    const result = await supabase.from('account_links').insert({ user_id: userId, asset_account_id: assetId, liability_account_id: liabilityId, label: label || null });
    if (result.error) { setStatus(result.error.message); return; }
    setLabel('');
    await load();
  }

  async function deleteLink(id: string) {
    await supabase.from('account_links').delete().eq('id', id);
    await load();
  }

  if (loading) return <main className="min-h-screen bg-[#080b08] flex items-center justify-center text-[#d8ded2] text-sm">Loading...</main>;

  return <main className="min-h-screen bg-[#080b08] text-[#f4f5ef]"><div className="mx-auto max-w-[720px] min-h-screen relative overflow-hidden"><div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_-10%,rgba(148,255,97,0.12),transparent_34%),linear-gradient(180deg,#182016_0%,#080b08_42%)]"/><div className="relative px-4 pt-6 pb-10"><header className="flex items-center justify-between mb-8"><button onClick={() => router.push('/accounts/profile')} className="h-10 w-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center"><ArrowLeft className="h-5 w-5"/></button><div className="text-center"><h1 className="text-xl font-semibold tracking-tight">Account Links</h1><p className="text-xs text-[#8d9188]">Asset to debt pairing</p></div><div className="h-10 w-10"/></header><section className="rounded-[28px] bg-white/[0.05] border border-white/8 p-5 mb-4"><div className="flex items-start gap-3"><div className="h-12 w-12 rounded-2xl bg-[#a7ff4f]/15 flex items-center justify-center shrink-0"><Link2 className="h-6 w-6 text-[#a7ff4f]"/></div><div><h2 className="text-lg font-semibold">Link assets to liabilities</h2><p className="text-sm text-[#a8aca3] mt-1">Example: link your home value to your mortgage so Vault can calculate equity and loan-to-value.</p></div></div></section><section className="rounded-[24px] bg-white/[0.05] border border-white/8 p-4 mb-4"><h2 className="font-semibold mb-3">Create link</h2><label className="block text-xs text-[#a8aca3] mb-2">Asset</label><select value={assetId} onChange={(e) => setAssetId(e.target.value)} className="w-full rounded-2xl bg-black/25 border border-white/10 px-4 py-3 outline-none mb-3">{assets.map((account) => <option key={account.id} value={account.id}>{account.name} · {money(Number(account.balance), true)}</option>)}</select><label className="block text-xs text-[#a8aca3] mb-2">Linked liability</label><select value={liabilityId} onChange={(e) => setLiabilityId(e.target.value)} className="w-full rounded-2xl bg-black/25 border border-white/10 px-4 py-3 outline-none mb-3">{debts.map((account) => <option key={account.id} value={account.id}>{account.name} · {money(Math.abs(Number(account.balance)), true)}</option>)}</select><input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Optional label, e.g. Home equity" className="w-full rounded-2xl bg-black/25 border border-white/10 px-4 py-3 outline-none mb-3"/><button onClick={addLink} disabled={!assetId || !liabilityId} className="w-full rounded-2xl bg-[#a7ff4f] text-[#071006] py-3 font-bold flex items-center justify-center gap-2 disabled:opacity-50"><Plus className="h-4 w-4"/>Save link</button></section>{status && <p className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 mb-4 text-xs text-red-100">{status}</p>}<section className="space-y-3">{links.map((link) => { const asset = accountById[link.asset_account_id]; const debt = accountById[link.liability_account_id]; const assetValue = Math.abs(Number(asset?.balance || 0)); const debtValue = Math.abs(Number(debt?.balance || 0)); const equity = assetValue - debtValue; const ltv = assetValue > 0 ? (debtValue / assetValue) * 100 : 0; return <div key={link.id} className="rounded-[24px] bg-white/[0.05] border border-white/8 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-semibold truncate">{link.label || asset?.name || 'Linked asset'}</h3><p className="text-xs text-[#a8aca3] truncate">{asset?.name || 'Missing asset'} → {debt?.name || 'Missing liability'}</p></div><button onClick={() => deleteLink(link.id)} className="h-9 w-9 rounded-full bg-red-500/10 border border-red-500/20 text-red-100 flex items-center justify-center"><Trash2 className="h-4 w-4"/></button></div><div className="grid grid-cols-3 gap-2 mt-4 text-center"><div className="rounded-2xl bg-black/20 p-2"><p className="text-xs text-[#a8aca3]">Equity</p><p className="text-sm font-mono">{money(equity, true)}</p></div><div className="rounded-2xl bg-black/20 p-2"><p className="text-xs text-[#a8aca3]">LTV</p><p className="text-sm font-mono">{ltv.toFixed(0)}%</p></div><div className="rounded-2xl bg-black/20 p-2"><p className="text-xs text-[#a8aca3]">Debt</p><p className="text-sm font-mono">{money(debtValue, true)}</p></div></div></div>})}</section></div></div></main>;
}

export default function LinksPage() { return <AppLock><LinksContent /></AppLock>; }
