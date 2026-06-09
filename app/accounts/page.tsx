'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Banknote, BarChart3, Bitcoin, Building2, CreditCard, Home, Landmark, PiggyBank, Plus, Trophy, Wallet } from 'lucide-react';

const accountTypes = [
  { value: 'savings', label: 'Savings', icon: PiggyBank },
  { value: 'checking', label: 'Checking', icon: Landmark },
  { value: 'cash', label: 'Cash', icon: Wallet },
  { value: 'investment', label: 'Investment', icon: BarChart3 },
  { value: 'crypto', label: 'Crypto', icon: Bitcoin },
  { value: 'retirement', label: 'Retirement', icon: Trophy },
  { value: 'property', label: 'Property', icon: Home },
  { value: 'loan', label: 'Loan', icon: Building2 },
  { value: 'credit', label: 'Credit', icon: CreditCard },
];

export default function AccountsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [type, setType] = useState('savings');
  const [balance, setBalance] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { router.push('/login'); return; }
      setUserId(data.session.user.id);
    }
    checkAuth();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    if (!userId) { setError('Not logged in.'); setSaving(false); return; }
    const { error } = await supabase.from('accounts').insert({ user_id: userId, name, institution, type, balance: Number(balance), currency: 'MYR', notes });
    setSaving(false);
    if (error) { setError(error.message); return; }
    router.push('/');
  }

  const selectedType = accountTypes.find((item) => item.value === type);
  const SelectedIcon = selectedType?.icon ?? Wallet;

  return (
    <main className="min-h-screen bg-[#080b08] text-[#f4f5ef]">
      <div className="mx-auto max-w-[720px] min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_-10%,rgba(148,255,97,0.14),transparent_36%),linear-gradient(180deg,#1b2318_0%,#080b08_42%)]" />
        <div className="relative px-5 pt-7 pb-10">
          <header className="flex items-center justify-between mb-7">
            <button onClick={() => router.push('/')} className="h-11 w-11 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <p className="text-sm text-[#a8aca3]">New asset</p>
            <div className="h-11 w-11" />
          </header>

          <section className="mb-7">
            <h1 className="text-3xl font-semibold tracking-tight mb-2">Add account</h1>
            <p className="text-[#a8aca3] text-base">Enter the current balance manually. You can update it anytime.</p>
          </section>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="rounded-[28px] bg-white/[0.05] border border-white/8 p-5">
              <div className="flex items-center gap-4 mb-5">
                <div className="h-14 w-14 rounded-2xl bg-[#a7ff4f]/12 flex items-center justify-center">
                  <SelectedIcon className="h-7 w-7 text-[#a7ff4f]" />
                </div>
                <div>
                  <p className="text-sm text-[#a8aca3]">Selected type</p>
                  <p className="text-xl font-medium">{selectedType?.label}</p>
                </div>
              </div>

              <label className="block text-sm text-[#a8aca3] mb-2">Balance</label>
              <div className="flex items-center gap-3 rounded-2xl bg-black/25 border border-white/10 px-4 py-4 mb-4">
                <span className="text-[#a8aca3] text-lg">RM</span>
                <input className="w-full bg-transparent outline-none text-3xl font-light tracking-tight" type="number" step="0.01" placeholder="0" value={balance} onChange={(e) => setBalance(e.target.value)} required />
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[1000, 5000, 10000].map((amount) => (
                  <button key={amount} type="button" onClick={() => setBalance(String(amount))} className="rounded-2xl bg-white/[0.06] border border-white/10 py-3 text-sm text-[#d8ded2]">
                    RM{amount.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] bg-white/[0.05] border border-white/8 p-5 space-y-4">
              <div>
                <label className="block text-sm text-[#a8aca3] mb-2">Account name</label>
                <input className="w-full rounded-2xl bg-black/25 border border-white/10 px-4 py-4 outline-none text-base" placeholder="Maybank Savings" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm text-[#a8aca3] mb-2">Institution or platform</label>
                <input className="w-full rounded-2xl bg-black/25 border border-white/10 px-4 py-4 outline-none text-base" placeholder="Maybank, EPF, Binance" value={institution} onChange={(e) => setInstitution(e.target.value)} required />
              </div>
            </div>

            <div>
              <p className="text-sm text-[#a8aca3] mb-3">Account type</p>
              <div className="grid grid-cols-3 gap-3">
                {accountTypes.map((item) => {
                  const Icon = item.icon;
                  const active = type === item.value;
                  return (
                    <button key={item.value} type="button" onClick={() => setType(item.value)} className={`rounded-[22px] border px-3 py-4 text-center transition ${active ? 'bg-[#a7ff4f] text-[#071006] border-[#a7ff4f]' : 'bg-white/[0.04] text-[#d8ded2] border-white/10'}`}>
                      <Icon className="h-5 w-5 mx-auto mb-2" />
                      <span className="text-xs font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[28px] bg-white/[0.05] border border-white/8 p-5">
              <label className="block text-sm text-[#a8aca3] mb-2">Notes</label>
              <textarea className="w-full min-h-24 rounded-2xl bg-black/25 border border-white/10 px-4 py-4 outline-none text-base" placeholder="Optional context, e.g. emergency fund, long-term holding" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            {error && <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}

            <button className="w-full h-16 rounded-[24px] bg-[#a7ff4f] text-[#071006] font-bold text-lg disabled:opacity-50 flex items-center justify-center gap-2" disabled={saving}>
              <Plus className="h-5 w-5" />
              {saving ? 'Saving...' : 'Save account'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
