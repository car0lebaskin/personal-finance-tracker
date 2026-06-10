'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getMyrRate, prettyRateTime } from '@/lib/fx';
import { getCryptoMyrRate, supportsLiveCrypto } from '@/lib/crypto';
import { ArrowLeft, BarChart3, Bitcoin, Building2, CreditCard, Home, Landmark, PiggyBank, Plus, RefreshCw, Trophy, Wallet } from 'lucide-react';

const accountTypes = [
  { value: 'savings', label: '+ Savings', icon: PiggyBank },
  { value: 'checking', label: '+ Checking', icon: Landmark },
  { value: 'cash', label: '+ Cash', icon: Wallet },
  { value: 'investment', label: '+ Investment', icon: BarChart3 },
  { value: 'crypto', label: '+ Crypto', icon: Bitcoin },
  { value: 'retirement', label: '+ Retirement', icon: Trophy },
  { value: 'property', label: '+ Property / Car', icon: Home },
  { value: 'loan', label: '- Loan / Mortgage', icon: Building2 },
  { value: 'credit', label: '- Credit', icon: CreditCard },
];

const currencies = ['MYR', 'USD', 'USDT', 'USDC', 'SGD', 'EUR', 'BTC', 'ETH', 'BNB', 'SOL', 'XRP'];
function money(value: number) { return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: 2 }).format(value || 0); }
function isDebt(type: string) { return ['loan', 'credit'].includes(type); }
function cryptoHint(currency: string) { return supportsLiveCrypto(currency) ? `Enter how many ${currency} you currently own. Vault will calculate MYR value using live price.` : 'Enter the native balance and MYR rate.'; }

export default function AccountsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [type, setType] = useState('savings');
  const [nativeBalance, setNativeBalance] = useState('');
  const [currency, setCurrency] = useState('MYR');
  const [fxRate, setFxRate] = useState('1');
  const [rateMeta, setRateMeta] = useState('Manual rate');
  const [rateLoading, setRateLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const myrValue = useMemo(() => Number(nativeBalance || 0) * Number(fxRate || 0), [nativeBalance, fxRate]);
  const isCryptoType = type === 'crypto';

  useEffect(() => { async function checkAuth() { const { data } = await supabase.auth.getSession(); if (!data.session) { router.push('/login'); return; } setUserId(data.session.user.id); } checkAuth(); }, [router]);
  useEffect(() => { if (type === 'crypto' && currency === 'MYR') setCurrency('BTC'); }, [type, currency]);
  useEffect(() => { if (currency === 'MYR') { setFxRate('1'); setRateMeta('MYR base currency'); } else { refreshRate(currency); } }, [currency]);

  async function refreshRate(nextCurrency = currency) {
    if (nextCurrency === 'MYR') return;
    setRateLoading(true); setError('');
    try {
      if (supportsLiveCrypto(nextCurrency)) {
        const result = await getCryptoMyrRate(nextCurrency);
        setFxRate(String(result.myrRate));
        setRateMeta(`${result.source} · ${new Date(result.updatedAt).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}`);
      } else {
        const result = await getMyrRate(nextCurrency);
        setFxRate(String(result.rate));
        setRateMeta(`${result.source} · ${prettyRateTime(result.updatedAt)}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to refresh rate.');
      setRateMeta('Manual rate');
    } finally {
      setRateLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    if (!userId) { setError('Not logged in.'); setSaving(false); return; }
    const base = { user_id: userId, name, institution, type, balance: Math.abs(myrValue), currency, notes };
    const full = { ...base, native_balance: Number(nativeBalance), fx_rate: Number(fxRate) };
    const result = await supabase.from('accounts').insert(full);
    if (result.error && result.error.message.toLowerCase().includes('native_balance')) {
      const fallback = await supabase.from('accounts').insert(base);
      setSaving(false);
      if (fallback.error) { setError(fallback.error.message); return; }
      router.push('/'); return;
    }
    setSaving(false);
    if (result.error) { setError(result.error.message); return; }
    router.push('/');
  }

  const selectedType = accountTypes.find((item) => item.value === type);
  const SelectedIcon = selectedType?.icon ?? Wallet;

  return <main className="min-h-screen bg-[#080b08] text-[#f4f5ef]"><div className="mx-auto max-w-[720px] min-h-screen relative overflow-hidden"><div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_-10%,rgba(148,255,97,0.14),transparent_36%),linear-gradient(180deg,#1b2318_0%,#080b08_42%)]"/><div className="relative px-5 pt-7 pb-10"><header className="flex items-center justify-between mb-7"><button onClick={() => router.push('/')} className="h-11 w-11 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center"><ArrowLeft className="h-5 w-5"/></button><p className="text-sm text-[#a8aca3]">New account</p><div className="h-11 w-11"/></header><section className="mb-7"><h1 className="text-3xl font-semibold tracking-tight mb-2">Add account</h1><p className="text-[#a8aca3] text-base">For crypto, enter the coin amount you own. Vault stores the coin amount and calculates the MYR value.</p></section><form onSubmit={handleSubmit} className="space-y-5"><div className="rounded-[28px] bg-white/[0.05] border border-white/8 p-5"><div className="flex items-center gap-4 mb-5"><div className="h-14 w-14 rounded-2xl bg-[#a7ff4f]/12 flex items-center justify-center"><SelectedIcon className="h-7 w-7 text-[#a7ff4f]"/></div><div><p className="text-sm text-[#a8aca3]">Selected type</p><p className={isDebt(type) ? 'text-xl font-medium text-red-200' : 'text-xl font-medium'}>{selectedType?.label}</p></div></div>{isCryptoType && <div className="rounded-2xl border border-[#a7ff4f]/20 bg-[#a7ff4f]/10 px-4 py-3 mb-4"><p className="text-sm font-semibold">Crypto amount mode</p><p className="text-xs text-[#a8aca3] mt-1">Input the coin amount you own, not the MYR value. Example: 0.25 BTC or 3.5 ETH.</p></div>}<label className="block text-sm text-[#a8aca3] mb-2">Currency / coin</label><select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full rounded-2xl bg-black/25 border border-white/10 px-4 py-4 outline-none mb-4">{currencies.map((item) => <option key={item} value={item}>{item}</option>)}</select><label className="block text-sm text-[#a8aca3] mb-2">{isCryptoType ? `Coin amount owned (${currency})` : `Balance in ${currency}`}</label><div className="flex items-center gap-3 rounded-2xl bg-black/25 border border-white/10 px-4 py-4 mb-2"><span className="text-[#a8aca3] text-lg">{currency}</span><input className="w-full bg-transparent outline-none text-3xl font-light tracking-tight" type="number" step="0.00000001" placeholder="0" value={nativeBalance} onChange={(e) => setNativeBalance(e.target.value)} required/></div><p className="text-xs text-[#8d9188] mb-4">{isCryptoType ? cryptoHint(currency) : 'This is the native amount before converting to MYR.'}</p><div className="flex items-center justify-between mb-2"><label className="block text-sm text-[#a8aca3]">MYR rate per 1 {currency}</label><button type="button" onClick={() => refreshRate()} disabled={currency === 'MYR' || rateLoading} className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-[#d8ded2] disabled:opacity-40 flex items-center gap-1"><RefreshCw className="h-3 w-3"/>{rateLoading ? 'Refreshing' : supportsLiveCrypto(currency) ? 'Live price' : 'Refresh'}</button></div><div className="flex items-center gap-3 rounded-2xl bg-black/25 border border-white/10 px-4 py-4 mb-2"><span className="text-[#a8aca3] text-lg">RM</span><input className="w-full bg-transparent outline-none text-2xl font-light tracking-tight" type="number" step="0.000001" value={fxRate} onChange={(e) => { setFxRate(e.target.value); setRateMeta('Manual override'); }} required disabled={currency === 'MYR'}/></div><p className="text-xs text-[#8d9188] mb-4">{rateMeta}</p><div className={isDebt(type) ? 'rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3' : 'rounded-2xl border border-[#a7ff4f]/20 bg-[#a7ff4f]/10 px-4 py-3'}><p className="text-xs text-[#a8aca3]">Current MYR value</p><p className={isDebt(type) ? 'text-xl font-semibold text-red-200' : 'text-xl font-semibold'}>{isDebt(type) ? '-' : '+'}{money(Math.abs(myrValue))}</p><p className="text-xs text-[#a8aca3] mt-1">{Number(nativeBalance || 0).toLocaleString(undefined, { maximumFractionDigits: 8 })} {currency} × RM{Number(fxRate || 0).toLocaleString()}</p></div></div><div className="rounded-[28px] bg-white/[0.05] border border-white/8 p-5 space-y-4"><div><label className="block text-sm text-[#a8aca3] mb-2">Account name</label><input className="w-full rounded-2xl bg-black/25 border border-white/10 px-4 py-4 outline-none text-base" placeholder={isCryptoType ? 'BTC, ETH, USDT' : 'House value, Mortgage, Car value, Car loan'} value={name} onChange={(e) => setName(e.target.value)} required/></div><div><label className="block text-sm text-[#a8aca3] mb-2">Institution or platform</label><input className="w-full rounded-2xl bg-black/25 border border-white/10 px-4 py-4 outline-none text-base" placeholder="Maybank, EPF, Binance, Luno" value={institution} onChange={(e) => setInstitution(e.target.value)} required/></div></div><div><p className="text-sm text-[#a8aca3] mb-3">Account type</p><div className="grid grid-cols-3 gap-3">{accountTypes.map((item) => { const Icon = item.icon; const active = type === item.value; const debt = isDebt(item.value); return <button key={item.value} type="button" onClick={() => setType(item.value)} className={`rounded-[22px] border px-3 py-4 text-center transition ${active ? 'bg-[#a7ff4f] text-[#071006] border-[#a7ff4f]' : debt ? 'bg-red-500/10 text-red-100 border-red-500/20' : 'bg-white/[0.04] text-[#d8ded2] border-white/10'}`}><Icon className="h-5 w-5 mx-auto mb-2"/><span className="text-xs font-medium">{item.label}</span></button>; })}</div></div><div className="rounded-[28px] bg-white/[0.05] border border-white/8 p-5"><label className="block text-sm text-[#a8aca3] mb-2">Notes</label><textarea className="w-full min-h-24 rounded-2xl bg-black/25 border border-white/10 px-4 py-4 outline-none text-base" placeholder="Optional context" value={notes} onChange={(e) => setNotes(e.target.value)}/></div>{error && <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}<button className="w-full h-16 rounded-[24px] bg-[#a7ff4f] text-[#071006] font-bold text-lg disabled:opacity-50 flex items-center justify-center gap-2" disabled={saving}><Plus className="h-5 w-5"/>{saving ? 'Saving...' : 'Save account'}</button></form></div></div></main>;
}
