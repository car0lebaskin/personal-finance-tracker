'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Account = {
  id: string;
  name: string;
  institution: string;
  type: string;
  balance: number;
  currency: string;
};

const liabilityTypes = ['loan', 'credit'];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function DashboardPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAccounts() {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        router.push('/login');
        return;
      }

      setEmail(sessionData.session.user.email || '');

      const { data, error } = await supabase
        .from('accounts')
        .select('id, name, institution, type, balance, currency')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setAccounts(data as Account[]);
      }

      setLoading(false);
    }

    loadAccounts();
  }, [router]);

  const totals = useMemo(() => {
    const assets = accounts
      .filter((account) => !liabilityTypes.includes(account.type))
      .reduce((sum, account) => sum + Number(account.balance), 0);

    const liabilities = accounts
      .filter((account) => liabilityTypes.includes(account.type))
      .reduce((sum, account) => sum + Number(account.balance), 0);

    const cash = accounts
      .filter((account) => ['checking', 'savings', 'cash'].includes(account.type))
      .reduce((sum, account) => sum + Number(account.balance), 0);

    const investments = accounts
      .filter((account) => ['investment', 'crypto', 'retirement'].includes(account.type))
      .reduce((sum, account) => sum + Number(account.balance), 0);

    return { assets, liabilities, cash, investments, netWorth: assets - liabilities };
  }, [accounts]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{email}</p>
            <h1 className="text-3xl font-semibold tracking-tight">Personal Finance Tracker</h1>
          </div>

          <div className="flex gap-2">
            <button onClick={() => router.push('/accounts')} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground font-medium">
              Add account
            </button>
            <button onClick={handleLogout} className="rounded-lg border px-4 py-2 font-medium">
              Logout
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">Net worth</p>
            <p className="text-3xl font-semibold mt-2">{formatCurrency(totals.netWorth)}</p>
          </div>
          <div className="rounded-2xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">Assets</p>
            <p className="text-2xl font-semibold mt-2">{formatCurrency(totals.assets)}</p>
          </div>
          <div className="rounded-2xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">Liabilities</p>
            <p className="text-2xl font-semibold mt-2">{formatCurrency(totals.liabilities)}</p>
          </div>
          <div className="rounded-2xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">Cash</p>
            <p className="text-2xl font-semibold mt-2">{formatCurrency(totals.cash)}</p>
          </div>
        </section>

        <section className="rounded-2xl border bg-card">
          <div className="p-5 border-b">
            <h2 className="text-xl font-semibold">Accounts</h2>
            <p className="text-sm text-muted-foreground mt-1">Manual balances from your Supabase database.</p>
          </div>
          <div className="divide-y">
            {accounts.length === 0 ? (
              <div className="p-5 text-muted-foreground">
                No accounts yet. Add Maybank, UOB, EPF, Moomoo, Luno, Binance, Unit Trusts, Property, or Loans.
              </div>
            ) : (
              accounts.map((account) => (
                <div key={account.id} className="p-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{account.name}</p>
                    <p className="text-sm text-muted-foreground">{account.institution} · {account.type}</p>
                  </div>
                  <p className="font-semibold">{formatCurrency(Number(account.balance))}</p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-5">
          <h2 className="text-xl font-semibold">Investments</h2>
          <p className="text-3xl font-semibold mt-2">{formatCurrency(totals.investments)}</p>
          <p className="text-sm text-muted-foreground mt-1">Includes investment, crypto, and retirement account types.</p>
        </section>
      </div>
    </main>
  );
}
