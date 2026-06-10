'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calculator, Save } from 'lucide-react';
import AppLock from '@/components/AppLock';
import { supabase } from '@/lib/supabase';

type Recurring = { id: string; category: string; amount: number; active: boolean };
type Account = { id: string; type: string; balance: number };
const INCOME_KEY = 'vault_monthly_income_v1';
const EXPENSE_KEY = 'vault_monthly_expenses_v1';
function money(value: number, compact = false) { return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: compact ? 1 : 0, notation: compact ? 'compact' : 'standard' }).format(value || 0); }
function readNumber(key: string, fallback = 0) { if (typeof window === 'undefined') return fallback; return Number(localStorage.getItem(key) || fallback); }
function writeNumber(key: string, value: string) { localStorage.setItem(key, String(Number(value || 0))); }

function CashflowContent() {
  const router = useRouter();
  const [recurring, setRecurring] = useState<Recurring[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [income, setIncome] = useState('0');
  const [expenses, setExpenses] = useState('0');
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  useEffect(() => {
    async function load() {
      const session = await supabase.auth.getSession();
      if (!session.data.session) { router.push('/login'); return; }
      setIncome(String(readNumber(INCOME_KEY, 0)));
      setExpenses(String(readNumber(EXPENSE_KEY, 0)));
      const recurringResult = await supabase.from('recurring_contributions').select('id,category,amount,active').eq('active', true);
      const accountResult = await supabase.from('accounts').select('id,type,balance');
      if (!recurringResult.error && recurringResult.data) setRecurring(recurringResult.data as Recurring[]);
      if (!accountResult.error && accountResult.data) setAccounts(accountResult.data as Account[]);
      setLoading(false);
    }
    load();
  }, [router]);

  const monthlyAuto = recurring.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const monthlyIncome = Number(income || 0);
  const monthlyExpenses = Number(expenses || 0);
  const leftover = monthlyIncome - monthlyExpenses - monthlyAuto;
  const currentNetWorth = accounts.filter((account) => !['loan', 'credit'].includes(account.type)).reduce((sum, account) => sum + Number(account.balance || 0), 0) - accounts.filter((account) => ['loan', 'credit'].includes(account.type)).reduce((sum, account) => sum + Math.abs(Number(account.balance || 0)), 0);
  const projection = useMemo(() => Array.from({ length: 12 }, (_, index) => ({ month: index + 1, netWorth: currentNetWorth + leftover * (index + 1) })), [currentNetWorth, leftover]);

  function saveSettings() {
    writeNumber(INCOME_KEY, income);
    writeNumber(EXPENSE_KEY, expenses);
    setStatus('Cashflow assumptions saved on this device.');
  }

  if (loading) return <main className="min-h-screen bg-[#080b08] flex items-center justify-center text-[#d8ded2] text-sm">Loading...</main>;

  return <main className="min-h-screen bg-[#080b08] text-[#f4f5ef]"><div className="mx-auto max-w-[720px] min-h-screen relative overflow-hidden"><div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_-10%,rgba(148,255,97,0.12),transparent_34%),linear-gradient(180deg,#182016_0%,#080b08_42%)]"/><div className="relative px-4 pt-6 pb-10"><header className="flex items-center justify-between mb-8"><button onClick={() => router.push('/accounts/profile')} className="h-10 w-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center"><ArrowLeft className="h-5 w-5"/></button><div className="text-center"><h1 className="text-xl font-semibold tracking-tight">Cashflow Forecast</h1><p className="text-xs text-[#8d9188]">Income, expenses and auto contributions</p></div><div className="h-10 w-10"/></header><section className="rounded-[28px] bg-white/[0.05] border border-white/8 p-5 mb-4"><div className="flex items-center gap-3"><div className="h-12 w-12 rounded-2xl bg-[#a7ff4f]/15 flex items-center justify-center"><Calculator className="h-6 w-6 text-[#a7ff4f]"/></div><div><p className={leftover >= 0 ? 'text-3xl font-light text-[#f4f5ef]' : 'text-3xl font-light text-red-200'}>{money(leftover)}</p><p className="text-sm text-[#a8aca3]">Projected monthly leftover</p></div></div></section><section className="rounded-[24px] bg-white/[0.05] border border-white/8 p-4 mb-4"><h2 className="font-semibold mb-3">Assumptions</h2><label className="block text-xs text-[#a8aca3] mb-2">Monthly income</label><div className="flex items-center gap-3 rounded-2xl bg-black/25 border border-white/10 px-4 py-3 mb-3"><span className="text-[#a8aca3]">RM</span><input value={income} onChange={(e) => setIncome(e.target.value)} type="number" className="w-full bg-transparent outline-none"/></div><label className="block text-xs text-[#a8aca3] mb-2">Estimated monthly expenses before investments / debt extras</label><div className="flex items-center gap-3 rounded-2xl bg-black/25 border border-white/10 px-4 py-3 mb-3"><span className="text-[#a8aca3]">RM</span><input value={expenses} onChange={(e) => setExpenses(e.target.value)} type="number" className="w-full bg-transparent outline-none"/></div><button onClick={saveSettings} className="w-full rounded-2xl bg-[#a7ff4f] text-[#071006] py-3 font-bold flex items-center justify-center gap-2"><Save className="h-4 w-4"/>Save assumptions</button></section>{status && <p className="rounded-2xl border border-[#a7ff4f]/20 bg-[#a7ff4f]/10 px-4 py-3 text-xs text-[#dfffc6] mb-4">{status}</p>}<section className="rounded-[24px] bg-white/[0.05] border border-white/8 p-4 mb-4"><h2 className="font-semibold mb-3">Monthly pressure</h2><div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-2xl bg-black/20 p-2"><p className="text-xs text-[#a8aca3]">Income</p><p className="text-sm font-mono">{money(monthlyIncome, true)}</p></div><div className="rounded-2xl bg-black/20 p-2"><p className="text-xs text-[#a8aca3]">Expenses</p><p className="text-sm font-mono">{money(monthlyExpenses, true)}</p></div><div className="rounded-2xl bg-black/20 p-2"><p className="text-xs text-[#a8aca3]">Auto</p><p className="text-sm font-mono">{money(monthlyAuto, true)}</p></div></div></section><section className="rounded-[24px] bg-white/[0.05] border border-white/8 p-4"><h2 className="font-semibold mb-3">12-month projection</h2><div className="space-y-2">{projection.map((item) => <div key={item.month} className="flex items-center justify-between rounded-2xl bg-black/20 px-3 py-2"><span className="text-sm text-[#a8aca3]">Month {item.month}</span><span className="text-sm font-mono">{money(item.netWorth, true)}</span></div>)}</div></section></div></div></main>;
}

export default function CashflowPage() { return <AppLock><CashflowContent /></AppLock>; }
