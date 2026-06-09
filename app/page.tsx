'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Coins,
  CreditCard,
  Crown,
  Home,
  Landmark,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  PieChart,
  Plus,
  ShieldCheck,
  Settings,
  TrendingUp,
  Wallet,
} from 'lucide-react';

type Account = {
  id: string;
  name: string;
  institution: string;
  type: string;
  balance: number;
  currency: string;
};

type Recommendation = {
  title: string;
  body: string;
  priority: 'High' | 'Medium' | 'Low';
  icon: React.ElementType;
};

const liabilityTypes = ['loan', 'credit'];

const navItems = [
  { icon: LayoutDashboard, label: 'Overview', active: true },
  { icon: Wallet, label: 'Accounts' },
  { icon: PieChart, label: 'Net Worth' },
  { icon: BarChart3, label: 'Investments' },
  { icon: Lightbulb, label: 'Recommendations' },
];

const accountGroups: { key: string; label: string; types: string[] }[] = [
  { key: 'cash', label: 'Cash & Savings', types: ['checking', 'savings', 'cash'] },
  { key: 'investments', label: 'Investments', types: ['investment', 'crypto', 'retirement'] },
  { key: 'property', label: 'Property', types: ['property'] },
  { key: 'debt', label: 'Liabilities', types: ['credit', 'loan'] },
];

const typeLabel: Record<string, string> = {
  checking: 'Checking',
  savings: 'Savings',
  cash: 'Cash',
  investment: 'Investment',
  crypto: 'Crypto',
  retirement: 'Retirement',
  property: 'Property',
  loan: 'Loan',
  credit: 'Credit',
};

const typeIcon: Record<string, React.ElementType> = {
  checking: Landmark,
  savings: Landmark,
  cash: Wallet,
  investment: TrendingUp,
  crypto: Coins,
  retirement: BarChart3,
  property: Home,
  loan: CreditCard,
  credit: CreditCard,
};

function formatCurrency(value: number, compact = false) {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    maximumFractionDigits: compact ? 1 : 0,
    notation: compact ? 'compact' : 'standard',
  }).format(value || 0);
}

function initials(email: string) {
  return email ? email.slice(0, 2).toUpperCase() : 'DG';
}

function getRecommendations(totals: { assets: number; liabilities: number; cash: number; investments: number; property: number; netWorth: number }): Recommendation[] {
  const assetBase = Math.max(totals.assets, 1);
  const cashPct = (totals.cash / assetBase) * 100;
  const investPct = (totals.investments / assetBase) * 100;
  const debtPct = (totals.liabilities / assetBase) * 100;
  const propertyPct = (totals.property / assetBase) * 100;
  const recs: Recommendation[] = [];

  if (totals.assets === 0) {
    return [{ title: 'Build the base layer first', body: 'Add your main cash, EPF, investment, crypto, property, and loan accounts. Recommendations become useful only after the balance sheet is complete.', priority: 'High', icon: ShieldCheck }];
  }

  if (cashPct > 35) recs.push({ title: 'Cash allocation looks heavy', body: `Cash is about ${cashPct.toFixed(0)}% of assets. Keep an emergency buffer, then consider moving surplus into EPF top-ups, broad-market funds, or your existing investment accounts.`, priority: 'High', icon: Wallet });
  if (investPct < 25 && totals.netWorth > 0) recs.push({ title: 'Investment allocation is light', body: `Investments are about ${investPct.toFixed(0)}% of assets. A higher long-term allocation may improve retirement progress if cash flow is stable and near-term obligations are covered.`, priority: 'Medium', icon: TrendingUp });
  if (debtPct > 40) recs.push({ title: 'Debt load needs monitoring', body: `Liabilities are about ${debtPct.toFixed(0)}% of assets. Prioritise high-interest debt first, then decide whether excess cash should reduce debt or be invested.`, priority: 'High', icon: AlertTriangle });
  if (propertyPct > 60) recs.push({ title: 'Net worth is property-heavy', body: `Property is about ${propertyPct.toFixed(0)}% of assets. That can be normal, but liquidity risk rises. Build liquid assets outside property over time.`, priority: 'Medium', icon: Home });
  if (cashPct >= 10 && cashPct <= 35 && investPct >= 25 && debtPct <= 40) recs.push({ title: 'Allocation looks balanced', body: 'Cash, investments, and liabilities are within a reasonable range based on the accounts entered. Next improvement is tracking monthly change and retirement target progress.', priority: 'Low', icon: ShieldCheck });

  return recs.slice(0, 4);
}

export default function DashboardPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAccounts() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) { router.push('/login'); return; }
      setEmail(sessionData.session.user.email || '');
      const { data, error } = await supabase.from('accounts').select('id, name, institution, type, balance, currency').order('created_at', { ascending: false });
      if (!error && data) setAccounts(data as Account[]);
      setLoading(false);
    }
    loadAccounts();
  }, [router]);

  const totals = useMemo(() => {
    const assets = accounts.filter((a) => !liabilityTypes.includes(a.type)).reduce((s, a) => s + Number(a.balance), 0);
    const liabilities = accounts.filter((a) => liabilityTypes.includes(a.type)).reduce((s, a) => s + Math.abs(Number(a.balance)), 0);
    const cash = accounts.filter((a) => ['checking', 'savings', 'cash'].includes(a.type)).reduce((s, a) => s + Number(a.balance), 0);
    const investments = accounts.filter((a) => ['investment', 'crypto', 'retirement'].includes(a.type)).reduce((s, a) => s + Number(a.balance), 0);
    const property = accounts.filter((a) => a.type === 'property').reduce((s, a) => s + Number(a.balance), 0);
    return { assets, liabilities, cash, investments, property, netWorth: assets - liabilities };
  }, [accounts]);

  const recommendations = useMemo(() => getRecommendations(totals), [totals]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (loading) {
    return <main className="min-h-screen bg-[#060504] flex items-center justify-center"><div className="rounded-2xl border border-[#3a2d17] bg-[#0f0d0a] px-5 py-4 text-sm text-[#b8aa8a]">Loading dashboard...</div></main>;
  }

  const stats = [
    { label: 'Cash Balance', value: totals.cash, sub: 'Checking, savings, cash', icon: Wallet, accent: 'text-[#d6b56d]', bg: 'bg-[#d6b56d]/10', up: true },
    { label: 'Investments', value: totals.investments, sub: 'Investment, crypto, EPF', icon: TrendingUp, accent: 'text-[#f0d28a]', bg: 'bg-[#f0d28a]/10', up: true },
    { label: 'Liabilities', value: totals.liabilities, sub: 'Loans and credit', icon: CreditCard, accent: 'text-[#c96f5d]', bg: 'bg-[#c96f5d]/10', up: false },
  ];

  const allocation = [
    { label: 'Cash', value: totals.cash },
    { label: 'Investments', value: totals.investments },
    { label: 'Property', value: totals.property },
  ].filter((item) => item.value > 0);

  return (
    <main className="min-h-screen bg-[#060504] text-[#f4efe5]">
      <div className="flex min-h-screen">
        <aside className="hidden md:flex w-[228px] flex-col h-screen sticky top-0 border-r border-[#2b2418] bg-[#080706] shrink-0">
          <div className="flex items-center gap-3 px-4 h-16 border-b border-[#2b2418]"><div className="w-8 h-8 rounded-xl border border-[#d6b56d]/40 bg-[#151108] flex items-center justify-center shrink-0"><Crown className="w-4 h-4 text-[#d6b56d]" /></div><div><span className="font-semibold tracking-tight text-sm text-[#f4efe5]">Vault</span><p className="text-[10px] text-[#8f8266] leading-none mt-0.5">Private Finance</p></div></div>
          <nav className="flex-1 py-5 px-3 space-y-0.5">{navItems.map((item) => <button key={item.label} className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150', item.active ? 'bg-[#d6b56d]/12 text-[#d6b56d]' : 'text-[#8f8266] hover:bg-white/5 hover:text-[#f4efe5]')}><item.icon className="w-4 h-4 shrink-0" /><span>{item.label}</span></button>)}</nav>
          <div className="py-4 px-3 border-t border-[#2b2418] space-y-0.5"><button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#8f8266] hover:bg-white/5 hover:text-[#f4efe5] transition-colors"><Settings className="w-4 h-4 shrink-0" /><span>Settings</span></button><button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#8f8266] hover:bg-white/5 hover:text-[#f4efe5] transition-colors"><LogOut className="w-4 h-4 shrink-0" /><span>Logout</span></button></div>
        </aside>
        <div className="flex-1 min-w-0">
          <header className="sticky top-0 z-30 h-16 border-b border-[#2b2418] bg-[#060504]/90 backdrop-blur-xl"><div className="flex items-center justify-between h-full px-4 md:px-6"><div className="flex items-center gap-3"><div className="md:hidden w-8 h-8 rounded-xl border border-[#d6b56d]/40 bg-[#151108] flex items-center justify-center"><Crown className="w-4 h-4 text-[#d6b56d]" /></div><div><p className="text-[11px] uppercase tracking-[0.24em] text-[#8f8266]">Private Dashboard</p><p className="text-sm text-[#d8cfbd]">{email}</p></div></div><div className="flex items-center gap-2"><button onClick={() => router.push('/accounts')} className="inline-flex items-center gap-2 rounded-lg bg-[#d6b56d] px-3 py-2 text-sm font-semibold text-[#080706] hover:bg-[#f0d28a]"><Plus className="w-4 h-4" /><span className="hidden sm:inline">Add Account</span></button><div className="w-8 h-8 rounded-full border border-[#d6b56d]/30 bg-[#151108] flex items-center justify-center text-xs font-bold text-[#d6b56d]">{initials(email)}</div></div></div></header>
          <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
            <div className="mb-6"><p className="text-sm text-[#8f8266]">Live Supabase balance sheet</p><h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1 text-[#f4efe5]">Overview</h1></div>
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4"><div className="relative overflow-hidden rounded-2xl border border-[#3a2d17] bg-[#0f0d0a] p-6 lg:col-span-1 shadow-[0_24px_80px_rgba(0,0,0,0.35)]"><div className="absolute inset-0 bg-gradient-to-br from-[#d6b56d]/14 via-transparent to-transparent pointer-events-none rounded-2xl" /><div className="relative"><div className="flex items-start justify-between mb-1"><p className="text-xs font-semibold text-[#8f8266] uppercase tracking-widest">Net Worth</p><span className="text-xs text-[#b8aa8a] border border-[#3a2d17] rounded px-2 py-0.5">Live</span></div><div className="flex items-end gap-3 mt-2"><h2 className="text-4xl font-bold tracking-tight tabular-nums text-[#f4efe5]">{formatCurrency(totals.netWorth, true)}</h2><div className="flex items-center gap-1 text-sm font-semibold mb-1.5 text-[#d6b56d]"><TrendingUp className="w-4 h-4" />Active</div></div><p className="text-sm text-[#8f8266] mt-0.5">Based on {accounts.length} manual account{accounts.length === 1 ? '' : 's'}</p><div className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-[#2b2418]"><div><p className="text-[11px] text-[#8f8266] mb-1">Assets</p><p className="text-sm font-bold text-[#f4efe5]">{formatCurrency(totals.assets, true)}</p></div><div><p className="text-[11px] text-[#8f8266] mb-1">Debt</p><p className="text-sm font-bold text-[#c96f5d]">{formatCurrency(totals.liabilities, true)}</p></div><div><p className="text-[11px] text-[#8f8266] mb-1">Invested</p><p className="text-sm font-bold text-[#d6b56d]">{formatCurrency(totals.investments, true)}</p></div></div></div></div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:col-span-2">{stats.map((stat) => <div key={stat.label} className="rounded-2xl border border-[#3a2d17] bg-[#0f0d0a] p-5 hover:border-[#5b4625] transition-colors"><div className="flex items-center justify-between mb-3"><span className="text-xs font-semibold text-[#8f8266] uppercase tracking-wider">{stat.label}</span><div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', stat.bg)}><stat.icon className={cn('w-4 h-4', stat.accent)} /></div></div><p className="text-2xl font-bold tracking-tight tabular-nums text-[#f4efe5]">{formatCurrency(stat.value, true)}</p><div className={cn('flex items-center gap-1 mt-1.5 text-xs font-medium', stat.up ? 'text-[#d6b56d]' : 'text-[#c96f5d]')}>{stat.up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}<span>{stat.sub}</span></div></div>)}</div></section>
            <section className="grid grid-cols-1 xl:grid-cols-3 gap-4"><div className="xl:col-span-2 rounded-2xl border border-[#3a2d17] bg-[#0f0d0a] p-6"><div className="flex items-center justify-between mb-5"><div><h3 className="text-sm font-semibold text-[#f4efe5]">Accounts</h3><p className="text-xs text-[#8f8266] mt-1">Live balances from Supabase</p></div><button onClick={() => router.push('/accounts')} className="text-xs text-[#d6b56d] hover:underline font-medium">Manage</button></div><div className="space-y-5">{accounts.length === 0 ? <div className="rounded-xl border border-dashed border-[#3a2d17] p-6 text-sm text-[#8f8266]">No accounts yet. Add Maybank, UOB, EPF, Moomoo, Luno, Binance, Unit Trusts, Property, or Loans.</div> : accountGroups.map(({ key, label, types }) => { const items = accounts.filter((a) => types.includes(a.type)); if (!items.length) return null; const groupTotal = items.reduce((s, a) => s + Math.abs(Number(a.balance)), 0); const isDebt = key === 'debt'; return <div key={key}><div className="flex items-center justify-between mb-2"><p className="text-[11px] font-semibold text-[#8f8266] uppercase tracking-widest">{label}</p><p className={cn('text-[11px] font-bold tabular-nums', isDebt ? 'text-[#c96f5d]' : 'text-[#8f8266]')}>{formatCurrency(groupTotal, true)}</p></div><div className="space-y-0.5">{items.map((account) => { const Icon = typeIcon[account.type] ?? Landmark; return <div key={account.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-white/[0.04] transition-colors"><div className="flex items-center gap-3 min-w-0"><div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', isDebt ? 'bg-[#c96f5d]/10' : 'bg-[#d6b56d]/10')}><Icon className={cn('w-4 h-4', isDebt ? 'text-[#c96f5d]' : 'text-[#d6b56d]')} /></div><div className="min-w-0"><p className="text-sm font-medium text-[#f4efe5] truncate">{account.name}</p><p className="text-[11px] text-[#8f8266] truncate">{account.institution} · {typeLabel[account.type] ?? account.type}</p></div></div><p className={cn('text-sm font-semibold tabular-nums', isDebt ? 'text-[#c96f5d]' : 'text-[#f4efe5]')}>{formatCurrency(Math.abs(Number(account.balance)), true)}</p></div>; })}</div></div>; })}</div></div>
              <div className="space-y-4"><div className="rounded-2xl border border-[#3a2d17] bg-[#0f0d0a] p-6"><div className="flex items-center justify-between mb-5"><h3 className="text-sm font-semibold text-[#f4efe5]">Asset Allocation</h3><PieChart className="w-4 h-4 text-[#8f8266]" /></div><div className="space-y-4">{allocation.length === 0 ? <p className="text-sm text-[#8f8266]">Add accounts to see allocation.</p> : allocation.map((item) => { const pct = totals.assets > 0 ? (item.value / totals.assets) * 100 : 0; return <div key={item.label}><div className="flex items-center justify-between text-sm mb-2"><span className="text-[#8f8266]">{item.label}</span><span className="font-semibold text-[#f4efe5]">{pct.toFixed(1)}%</span></div><div className="h-2 rounded-full bg-white/5 overflow-hidden"><div className="h-full rounded-full bg-[#d6b56d]" style={{ width: `${Math.min(pct, 100)}%` }} /></div></div>; })}</div></div><div className="rounded-2xl border border-[#3a2d17] bg-[#0f0d0a] p-6"><div className="flex items-center justify-between mb-5"><div><h3 className="text-sm font-semibold text-[#f4efe5]">AI Recommendations</h3><p className="text-xs text-[#8f8266] mt-1">Rule-based allocation guidance</p></div><Lightbulb className="w-4 h-4 text-[#d6b56d]" /></div><div className="space-y-3">{recommendations.map((rec) => <div key={rec.title} className="rounded-xl border border-[#2b2418] bg-[#151108] p-4"><div className="flex items-start gap-3"><div className="w-8 h-8 rounded-lg bg-[#d6b56d]/10 flex items-center justify-center shrink-0"><rec.icon className="w-4 h-4 text-[#d6b56d]" /></div><div><div className="flex items-center gap-2 mb-1"><p className="text-sm font-semibold text-[#f4efe5]">{rec.title}</p><span className="text-[10px] px-1.5 py-0.5 rounded border border-[#3a2d17] text-[#b8aa8a]">{rec.priority}</span></div><p className="text-xs leading-relaxed text-[#8f8266]">{rec.body}</p></div></div></div>)}</div></div></div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
