'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Save } from 'lucide-react';

type Account = {
  id: string;
  name: string;
  institution: string;
  type: string;
  balance: number;
  notes: string | null;
};

function money(value: number) {
  return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: 2 }).format(value || 0);
}

export default function AccountDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [account, setAccount] = useState<Account | null>(null);
  const [balance, setBalance] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadAccount() {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        router.push('/login');
        return;
      }

      const result = await supabase
        .from('accounts')
        .select('id,name,institution,type,balance,notes')
        .eq('id', params.id)
        .single();

      if (result.error) {
        setError(result.error.message);
        return;
      }

      const item = result.data as Account;
      setAccount(item);
      setBalance(String(item.balance || 0));
      setNotes(item.notes || '');
    }

    loadAccount();
  }, [params.id, router]);

  async function save() {
    setSaving(true);
    setError('');

    const result = await supabase
      .from('accounts')
      .update({ balance: Number(balance), notes })
      .eq('id', params.id);

    setSaving(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    router.push('/');
  }

  if (!account) {
    return <main className="min-h-screen bg-[#080b08] flex items-center justify-center text-[#d8ded2]">Loading...</main>;
  }

  return (
    <main className="min-h-screen bg-[#080b08] text-[#f4f5ef]">
      <div className="mx-auto max-w-[720px] min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_-10%,rgba(148,255,97,0.12),transparent_36%),linear-gradient(180deg,#11170f_0%,#080b08_42%)]" />
        <div className="relative px-5 pt-7 pb-10">
          <header className="flex items-center justify-between mb-8">
            <button onClick={() => router.push('/')} className="h-11 w-11 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <span className="text-sm text-[#a8aca3] capitalize">{account.type}</span>
            <div className="h-11 w-11" />
          </header>

          <section className="mb-7">
            <h1 className="text-3xl font-semibold tracking-tight">{account.name}</h1>
            <p className="text-[#a8aca3] mt-1">{account.institution}</p>
            <p className="text-4xl font-light tracking-tight mt-6">{money(Number(account.balance))}</p>
            <p className="text-[#a8aca3] mt-2">Current saved value</p>
          </section>

          <div className="h-[220px] -mx-5 mb-6 border-y border-white/10 relative">
            <svg viewBox="0 0 700 220" className="w-full h-full">
              <path d="M30 150 C150 130,260 100,390 82 C500 68,590 70,660 55" fill="none" stroke="#69f0c2" strokeWidth="4" strokeLinecap="round" />
              <circle cx="660" cy="55" r="7" fill="#f4f5ef" />
            </svg>
          </div>

          <section className="rounded-[28px] bg-white/[0.05] border border-white/8 p-5 mb-5">
            <label className="block text-sm text-[#a8aca3] mb-2">New balance</label>
            <div className="flex items-center gap-3 rounded-2xl bg-black/25 border border-white/10 px-4 py-4">
              <span className="text-[#a8aca3]">RM</span>
              <input className="w-full bg-transparent outline-none text-2xl font-light" type="number" step="0.01" value={balance} onChange={(e) => setBalance(e.target.value)} />
            </div>
          </section>

          <section className="rounded-[28px] bg-white/[0.05] border border-white/8 p-5 mb-5">
            <h2 className="text-2xl mb-3">Notes</h2>
            <textarea className="w-full min-h-28 rounded-2xl bg-black/25 border border-white/10 px-4 py-4 outline-none text-base" placeholder="Add notes, account purpose, banking links, reminders, or context." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </section>

          {error && <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 mb-5">{error}</p>}

          <button onClick={save} disabled={saving} className="w-full h-16 rounded-[24px] bg-[#a7ff4f] text-[#071006] font-bold text-lg disabled:opacity-50 flex items-center justify-center gap-2">
            <Save className="h-5 w-5" />
            {saving ? 'Saving...' : 'Update'}
          </button>
        </div>
      </div>
    </main>
  );
}
