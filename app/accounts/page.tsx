'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const accountTypes = ['checking', 'savings', 'cash', 'investment', 'crypto', 'retirement', 'property', 'loan', 'credit'];

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

      if (!data.session) {
        router.push('/login');
        return;
      }

      setUserId(data.session.user.id);
    }

    checkAuth();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    if (!userId) {
      setError('Not logged in.');
      setSaving(false);
      return;
    }

    const { error } = await supabase.from('accounts').insert({
      user_id: userId,
      name,
      institution,
      type,
      balance: Number(balance),
      currency: 'MYR',
      notes,
    });

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push('/');
  }

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-xl">
        <button onClick={() => router.push('/')} className="mb-6 text-sm text-muted-foreground">
          Back to dashboard
        </button>

        <form onSubmit={handleSubmit} className="rounded-2xl border bg-card p-6 space-y-4">
          <div>
            <h1 className="text-2xl font-semibold">Add account</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Add manual balances for banks, investments, EPF, crypto, property, and loans.
            </p>
          </div>

          <input className="w-full rounded-lg border bg-background px-3 py-2" placeholder="Account name, e.g. Maybank Savings" value={name} onChange={(e) => setName(e.target.value)} required />
          <input className="w-full rounded-lg border bg-background px-3 py-2" placeholder="Institution, e.g. Maybank" value={institution} onChange={(e) => setInstitution(e.target.value)} required />

          <select className="w-full rounded-lg border bg-background px-3 py-2" value={type} onChange={(e) => setType(e.target.value)}>
            {accountTypes.map((accountType) => (
              <option key={accountType} value={accountType}>{accountType}</option>
            ))}
          </select>

          <input className="w-full rounded-lg border bg-background px-3 py-2" type="number" step="0.01" placeholder="Balance in MYR" value={balance} onChange={(e) => setBalance(e.target.value)} required />
          <textarea className="w-full rounded-lg border bg-background px-3 py-2" placeholder="Notes, optional" value={notes} onChange={(e) => setNotes(e.target.value)} />

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button className="w-full rounded-lg bg-primary text-primary-foreground py-2 font-medium disabled:opacity-50" disabled={saving}>
            {saving ? 'Saving...' : 'Save account'}
          </button>
        </form>
      </div>
    </main>
  );
}
