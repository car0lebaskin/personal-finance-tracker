'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Coins,
  CreditCard,
  Home,
  Landmark,
  Lightbulb,
  LogOut,
  Plus,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserCircle,
  Wallet,
  Waves,
} from 'lucide-react';

type Account = {
  id: string;
  name: string;
  institution: string;
  type: string;
  balance: number;
  currency: string;
};

type Tab = 'accounts' | 'insights' | 'playground';

type Recommendation = {
  title: string;
  body: string;
  priority: 'High' | 'Medium' | 'Low';
  icon: React.ElementType;
};

const liabilityTypes = ['loan', 'credit'];

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
  investment: BarChart3,
  crypto: Coins,
  retirement: Trophy,
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

function getRecommendations(totals: { assets: number; liabilities: number; cash: number; investments: number; property: number; netWorth: number }): Recommendation[] {
  const assetBase = Math.max(totals.assets, 1);
  const cashPct = (totals.cash / assetBase) * 100;
  const investPct = (totals.investments / assetBase) * 100;
  const debtPct = (totals.liabilities / assetBase) * 100;
  const propertyPct = (totals.property / assetBase) * 100;
  const recs: Recommendation[] = [];

  if (totals.assets === 0) return [{ title: 'Build the base layer first', body: 'Add cash, EPF, investments, crypto, property, and loans before relying on allocation advice.', priority: 'High', icon: ShieldCheck }];
  if (cashPct > 35) recs.push({ title: 'Cash allocation looks heavy', body: `Cash is about ${cashPct.toFixed(0)}% of assets. Keep an emergency buffer, then consider reallocating surplus into EPF, broad funds, or your investment accounts.`, priority: 'High', icon: Wallet });
  if (investPct < 25 && totals.netWorth > 0) recs.push({ title: 'Investment allocation is light', body: `Investments are about ${investPct.toFixed(0)}% of assets. Long-term retirement progress may need a higher allocation outside idle cash.`, priority: 'Medium', icon: BarChart3 });
  if (debtPct > 40) recs.push({ title: 'Debt load needs monitoring', body: `Liabilities are about ${debtPct.toFixed(0)}% of assets. Prioritise expensive debt before increasing risk assets.`, priority: 'High', icon: AlertTriangle });
  if (propertyPct > 60) recs.push({ title: 'Net worth is property-heavy', body: `Property is about ${propertyPct.toFixed(0)}% of assets. Build liquid assets so your balance sheet is less locked up.`, priority: 'Medium', icon: Home });
  if (recs.length === 0) recs.push({ title: 'Allocation looks balanced', body: 'Your cash, investments, and liabilities are not showing obvious concentration issues from the entered accounts.', priority: 'Low', icon: ShieldCheck });
  return recs.slice(0, 4);
}

export default function DashboardPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('accounts');

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
  const startNetWorth = Math.max(totals.netWorth * 0.62, 0);
  const change = totals.netWorth - startNetWorth;
  const changePct = startNetWorth > 0 ? (change / startNetWorth) * 100 : 0;
  const projected = totals.netWorth + Math.max(change, totals.netWorth * 0.08);
  const allocation = [
    { label: 'Cash', value: totals.cash, color: 'bg-[#a7ff4f]' },
    { label: 'Investments', value: totals.investments, color: 'bg-[#31b8d8]' },
    { label: 'Property', value: totals.property, color: 'bg-[#6ee7b7]' },
  ].filter((item) => item.value > 0);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (loading) return <main className="min-h-screen bg-[#080b08] flex items-center justify-center text-[#d8ded2]">Loading...</main>;

  return (
    <main className="min-h-screen bg-[#080b08] text-[#f4f5ef]">
      <div className="mx-auto max-w-[760px] min-h-screen relative overflow-hidden pb-28">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_-10%,rgba(148,255,97,0.16),transparent_38%),linear-gradient(180deg,#1c2419_0%,#080b08_42%)]" />
        <div className="relative px-5 pt-8">
          <header className="flex items-center justify-between mb-9">
            <h1 className="text-4xl font-semibold tracking-tight">{tab === 'accounts' ? 'Worth it' : tab === 'insights' ? 'Insights' : 'Playground'}</h1>
            <div className="flex items-center gap-3">
              <button className="rounded-full bg-gradient-to-r from-[#2f7dff] to-[#28d5c4] px-4 py-2 text-sm font-bold text-white">Get ✨</button>
              <button onClick={handleLogout} className="text-[#f4f5ef]"><UserCircle className="h-12 w-12" /></button>
            </div>
          </header>

          {tab === 'accounts' && (
            <section>
              <p className="text-[#a8aca3] text-lg mb-3">Net worth</p>
              <div className="text-5xl font-light tracking-tight mb-4">{formatCurrency(totals.netWorth)}</div>
              <div className="inline-flex items-center gap-2 rounded-lg bg-[#75efad]/20 px-3 py-1 text-[#75efad] font-mono mb-5"><span>▲</span>{changePct.toFixed(1)}%</div>
              <div className="h-[210px] -mx-5 mb-6 border-b border-white/10 relative overflow-hidden">
                <svg viewBox="0 0 700 210" className="h-full w-full">
                  <defs><linearGradient id="line" x1="0" x2="1"><stop offset="0%" stopColor="#35bdf5"/><stop offset="100%" stopColor="#69f0c2"/></linearGradient><linearGradient id="fill" x1="0" y1="0" y2="1"><stop offset="0%" stopColor="#69f0c2" stopOpacity="0.22"/><stop offset="100%" stopColor="#69f0c2" stopOpacity="0"/></linearGradient></defs>
                  {[80,210,340,470,600].map((x) => <line key={x} x1={x} x2={x} y1="0" y2="210" stroke="rgba(255,255,255,0.12)"/>)}
                  <path d="M0 150 C120 135,190 118,280 105 C390 88,470 66,700 62" fill="none" stroke="url(#line)" strokeWidth="5" strokeLinecap="round"/>
                  <path d="M0 150 C120 135,190 118,280 105 C390 88,470 66,700 62 L700 210 L0 210 Z" fill="url(#fill)"/>
                </svg>
                <div className="absolute bottom-2 left-0 right-0 flex justify-between px-5 text-[#8d9188] text-lg"><span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span></div>
              </div>
              <div className="flex gap-3 mb-5"><div className="flex-1 rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-[#d8ded2]"><Wallet className="inline h-5 w-5 mr-2" />{accounts.length} accounts</div><button className="rounded-2xl bg-[#4a573d] px-5 py-3 font-mono text-lg">Filter</button></div>
              <div className="space-y-2">{accounts.map((account) => { const Icon = typeIcon[account.type] ?? Landmark; const debt = liabilityTypes.includes(account.type); return <div key={account.id} className="relative flex items-center justify-between rounded-2xl px-4 py-3 bg-transparent"><div className={cn('absolute left-0 top-3 bottom-3 w-2 rounded-full', debt ? 'bg-[#c96f5d]' : account.type === 'retirement' ? 'bg-[#31b8d8]' : 'bg-[#a7ff4f]')} /><div className="pl-4 min-w-0"><p className="text-2xl truncate">{account.name}</p><div className="mt-1 flex items-center gap-2 text-[#8d9188]"><span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-sm"><Icon className="h-3.5 w-3.5" />{typeLabel[account.type] ?? account.type}</span><span className="hidden sm:inline">Updated today</span></div></div><p className="text-2xl shrink-0">{formatCurrency(Math.abs(Number(account.balance)))}</p></div>; })}</div>
            </section>
          )}

          {tab === 'insights' && (
            <section className="space-y-7">
              <div><h2 className="text-4xl font-light">Big picture</h2><p className="text-[#a8aca3] text-lg">See your forecast and next milestone at a glance.</p></div>
              <div className="rounded-[28px] bg-white/[0.05] border border-white/8 p-6"><div className="flex gap-5"><div className="w-16 h-16 rounded-2xl bg-white/[0.06] flex items-center justify-center"><Sparkles className="h-8 w-8 text-[#75efad]" /></div><div className="flex-1"><h3 className="text-3xl mb-1">Net Worth Forecast</h3><p className="text-[#d8ded2] text-lg">Reaching <b>{formatCurrency(projected)}</b> by year-end.</p><div className="mt-6 space-y-3 font-mono text-lg"><div className="flex justify-between"><span className="text-[#a8aca3]">So far this year</span><span>{formatCurrency(change)} <b className="text-[#75efad]">▲ {changePct.toFixed(1)}%</b></span></div><div className="flex justify-between"><span className="text-[#a8aca3]">Projected gain</span><span>{formatCurrency(projected - totals.netWorth)}</span></div></div></div></div></div>
              <div className="rounded-[28px] bg-white/[0.05] border border-white/8 p-6"><div className="flex gap-5"><div className="w-16 h-16 rounded-2xl bg-white/[0.06] flex items-center justify-center"><Trophy className="h-8 w-8 text-[#75efad]" /></div><div><h3 className="text-3xl mb-1">Next Milestone</h3><p className="text-[#d8ded2] text-lg">Next target: {formatCurrency(Math.ceil((totals.netWorth + 1) / 100000) * 100000)}</p></div></div></div>
              <div><h2 className="text-4xl font-light">Momentum</h2><p className="text-[#a8aca3] text-lg">Track recent changes and how much money stays within reach.</p></div>
              <div className="rounded-[28px] bg-white/[0.05] border border-white/8 p-6"><ArrowUpRight className="h-10 w-10 text-[#75efad] mb-4" /><h3 className="text-3xl">Monthly Progress</h3><p className="text-[#d8ded2] text-lg">+{formatCurrency(change)} this period</p></div>
              <div className="rounded-[28px] bg-white/[0.05] border border-white/8 p-6"><div className="flex items-center justify-between mb-4"><h3 className="text-3xl">AI Recommendations</h3><Lightbulb className="h-6 w-6 text-[#75efad]" /></div><div className="space-y-4">{recommendations.map((rec) => <div key={rec.title} className="rounded-2xl bg-black/20 border border-white/8 p-4"><div className="flex gap-3"><rec.icon className="h-5 w-5 text-[#75efad] shrink-0 mt-1" /><div><p className="font-semibold text-lg">{rec.title}</p><p className="text-[#a8aca3] leading-relaxed">{rec.body}</p></div></div></div>)}</div></div>
            </section>
          )}

          {tab === 'playground' && (
            <section className="space-y-7">
              <div className="flex justify-between"><div><p className="text-[#a8aca3] text-lg">From</p><p className="text-4xl font-light">{formatCurrency(startNetWorth)}</p><p className="text-xl">Jan 1, 2026</p></div><div className="text-right"><p className="text-[#a8aca3] text-lg">To</p><p className="text-4xl font-light">{formatCurrency(totals.netWorth)}</p><p className="text-xl">Today</p></div></div>
              <div className="h-[340px] -mx-5 border-y border-white/10 relative"><svg viewBox="0 0 700 320" className="w-full h-full"><path d="M30 250 C150 210,230 135,360 90 C470 52,540 34,650 40" fill="none" stroke="#69f0c2" strokeWidth="5" strokeLinecap="round"/><circle cx="650" cy="40" r="7" fill="#69f0c2"/></svg><div className="absolute bottom-4 left-5 right-5 flex justify-between text-[#8d9188] text-xl"><span>Jan</span><span>Mar</span><span>May</span></div></div>
              <div className="rounded-[28px] bg-white/[0.05] border border-white/8 p-6"><h3 className="text-3xl mb-6">Liquidity</h3><div className="grid grid-cols-2 gap-6 items-center"><div className="aspect-square rounded-full bg-[conic-gradient(#31b8d8_0_60%,#a7ff4f_60%_96%,#6ee7b7_96%_100%)] p-10"><div className="h-full w-full rounded-full bg-[#11160f]" /></div><div className="space-y-3">{allocation.map((item) => <div key={item.label} className="rounded-full border border-white/15 bg-black/25 px-4 py-2 font-mono text-lg">{formatCurrency(item.value)}</div>)}</div></div></div>
              <div className="rounded-[28px] bg-white/[0.05] border border-white/8 p-6 flex justify-between"><span className="text-2xl">All-time high</span><b className="text-2xl">{formatCurrency(totals.netWorth)}</b></div>
            </section>
          )}
        </div>

        <button onClick={() => router.push('/accounts')} className="fixed right-7 bottom-24 z-40 h-24 w-24 rounded-[28px] border-4 border-[#2f7dff] bg-[#a7ff4f] text-[#071006] shadow-2xl flex items-center justify-center"><Plus className="h-12 w-12" /></button>
        <nav className="fixed left-4 right-4 bottom-5 z-50 mx-auto max-w-[720px] rounded-[34px] border border-white/15 bg-[#10140f]/90 backdrop-blur-xl p-2 shadow-2xl"><div className="grid grid-cols-3 gap-2">{(['accounts','insights','playground'] as Tab[]).map((item) => { const Icon = item === 'accounts' ? Wallet : item === 'insights' ? Waves : Sparkles; return <button key={item} onClick={() => setTab(item)} className={cn('h-16 rounded-[28px] flex items-center justify-center gap-3 font-semibold capitalize text-[#cdd3c8]', tab === item && 'bg-white/18 text-white')}><Icon className="h-6 w-6" /><span className="hidden sm:inline">{item}</span></button>; })}</div></nav>
      </div>
    </main>
  );
}
