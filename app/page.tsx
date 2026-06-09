'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Coins,
  CreditCard,
  Home,
  Landmark,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  PieChart,
  Plus,
  RefreshCw,
  Search,
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

      if (!error && data) setAccounts(data as Account[]);
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
      .reduce((sum, account) => sum + Math.abs(Number(account.balance)), 0);

    const cash = accounts
      .filter((account) => ['checking', 'savings', 'cash'].includes(account.type))
      .reduce((sum, account) => sum + Number(account.balance), 0);

    const investments = accounts
      .filter((account) => ['investment', 'crypto', 'retirement'].includes(account.type))
      .reduce((sum, account) => sum + Number(account.balance), 0);

    const property = accounts
      .filter((account) => account.type === 'property')
      .reduce((sum, account) => sum + Number(account.balance), 0);

    return { assets, liabilities, cash, investments, property, netWorth: assets - liabilities };
  }, [accounts]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="rounded-2xl border border-border/60 bg-card px-5 py-4 text-sm text-muted-foreground">
          Loading dashboard...
        </div>
      </main>
    );
  }

  const stats = [
    { label: 'Cash Balance', value: totals.cash, sub: 'Checking, savings, cash', icon: Wallet, color: 'text-primary', bg: 'bg-primary/10', up: true },
    { label: 'Investments', value: totals.investments, sub: 'Investment, crypto, EPF', icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10', up: true },
    { label: 'Liabilities', value: totals.liabilities, sub: 'Loans and credit', icon: CreditCard, color: 'text-red-400', bg: 'bg-red-500/10', up: false },
  ];

  const allocation = [
    { label: 'Cash', value: totals.cash },
    { label: 'Investments', value: totals.investments },
    { label: 'Property', value: totals.property },
  ].filter((item) => item.value > 0);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className="hidden md:flex w-[220px] flex-col h-screen sticky top-0 border-r border-border/60 bg-[hsl(220_20%_7%)] shrink-0">
          <div className="flex items-center gap-3 px-4 h-16 border-b border-border/60">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-bold text-primary-foreground text-sm shrink-0">V</div>
            <div>
              <span className="font-semibold text-foreground tracking-tight text-sm">Vault</span>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Finance Dashboard</p>
            </div>
          </div>

          <nav className="flex-1 py-5 px-3 space-y-0.5">
            {navItems.map((item) => (
              <button
                key={item.label}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  item.active ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="py-4 px-3 border-t border-border/60 space-y-0.5">
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors">
              <Settings className="w-4 h-4 shrink-0" />
              <span>Settings</span>
            </button>
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors">
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <header className="sticky top-0 z-30 h-16 border-b border-border/60 bg-background/90 backdrop-blur-xl">
            <div className="flex items-center justify-between h-full px-4 md:px-6">
              <div className="flex items-center gap-3">
                <div className="md:hidden w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-bold text-primary-foreground text-sm">V</div>
                <div className="relative hidden sm:block">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input placeholder="Search accounts..." className="pl-10 h-9 w-60 lg:w-80 rounded-lg bg-white/5 border border-border/60 text-sm outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => router.push('/accounts')} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Account</span>
                </button>
                <span className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground border border-border/60 rounded-lg px-3 py-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Live
                </span>
                <button className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground transition-colors"><RefreshCw className="w-4 h-4" /></button>
                <button className="relative p-2 rounded-lg hover:bg-white/5 text-muted-foreground transition-colors"><Bell className="w-4 h-4" /><span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary" /></button>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center text-xs font-bold text-white">{initials(email)}</div>
              </div>
            </div>
          </header>

          <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
            <div className="mb-6">
              <p className="text-sm text-muted-foreground">{email}</p>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1">Overview</h1>
            </div>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
              <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 lg:col-span-1">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-emerald-500/5 pointer-events-none rounded-2xl" />
                <div className="relative">
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Net Worth</p>
                    <span className="text-xs text-muted-foreground border border-border/60 rounded px-2 py-0.5">Live</span>
                  </div>
                  <div className="flex items-end gap-3 mt-2">
                    <h2 className="text-4xl font-bold tracking-tight text-foreground tabular-nums">{formatCurrency(totals.netWorth, true)}</h2>
                    <div className="flex items-center gap-1 text-sm font-semibold mb-1.5 text-emerald-400"><TrendingUp className="w-4 h-4" />Active</div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">Based on {accounts.length} manual account{accounts.length === 1 ? '' : 's'}</p>
                  <div className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-border/40">
                    <div><p className="text-[11px] text-muted-foreground mb-1">Assets</p><p className="text-sm font-bold text-foreground">{formatCurrency(totals.assets, true)}</p></div>
                    <div><p className="text-[11px] text-muted-foreground mb-1">Debt</p><p className="text-sm font-bold text-red-400">{formatCurrency(totals.liabilities, true)}</p></div>
                    <div><p className="text-[11px] text-muted-foreground mb-1">Invested</p><p className="text-sm font-bold text-emerald-400">{formatCurrency(totals.investments, true)}</p></div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:col-span-2">
                {stats.map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-border/60 bg-card p-5 hover:border-border transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{stat.label}</span>
                      <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', stat.bg)}><stat.icon className={cn('w-4 h-4', stat.color)} /></div>
                    </div>
                    <p className="text-2xl font-bold text-foreground tracking-tight tabular-nums">{formatCurrency(stat.value, true)}</p>
                    <div className={cn('flex items-center gap-1 mt-1.5 text-xs font-medium', stat.up ? 'text-emerald-400' : 'text-red-400')}>
                      {stat.up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      <span>{stat.sub}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <div className="xl:col-span-2 rounded-2xl border border-border/60 bg-card p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Accounts</h3>
                    <p className="text-xs text-muted-foreground mt-1">Live balances from Supabase</p>
                  </div>
                  <button onClick={() => router.push('/accounts')} className="text-xs text-primary hover:underline font-medium">Manage</button>
                </div>

                <div className="space-y-5">
                  {accounts.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground">No accounts yet. Add Maybank, UOB, EPF, Moomoo, Luno, Binance, Unit Trusts, Property, or Loans.</div>
                  ) : (
                    accountGroups.map(({ key, label, types }) => {
                      const items = accounts.filter((account) => types.includes(account.type));
                      if (!items.length) return null;
                      const groupTotal = items.reduce((sum, account) => sum + Math.abs(Number(account.balance)), 0);
                      const isDebt = key === 'debt';
                      return (
                        <div key={key}>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">{label}</p>
                            <p className={cn('text-[11px] font-bold tabular-nums', isDebt ? 'text-red-400' : 'text-muted-foreground')}>{formatCurrency(groupTotal, true)}</p>
                          </div>
                          <div className="space-y-0.5">
                            {items.map((account) => {
                              const Icon = typeIcon[account.type] ?? Landmark;
                              return (
                                <div key={account.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-white/[0.04] transition-colors">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', isDebt ? 'bg-red-500/10' : 'bg-primary/10')}>
                                      <Icon className={cn('w-4 h-4', isDebt ? 'text-red-400' : 'text-primary')} />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-foreground truncate">{account.name}</p>
                                      <p className="text-[11px] text-muted-foreground truncate">{account.institution} · {typeLabel[account.type] ?? account.type}</p>
                                    </div>
                                  </div>
                                  <p className={cn('text-sm font-semibold tabular-nums', isDebt ? 'text-red-400' : 'text-foreground')}>{formatCurrency(Math.abs(Number(account.balance)), true)}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-card p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-sm font-semibold text-foreground">Asset Allocation</h3>
                  <PieChart className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="space-y-4">
                  {allocation.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Add accounts to see allocation.</p>
                  ) : (
                    allocation.map((item) => {
                      const pct = totals.assets > 0 ? (item.value / totals.assets) * 100 : 0;
                      return (
                        <div key={item.label}>
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-muted-foreground">{item.label}</span>
                            <span className="font-semibold">{pct.toFixed(1)}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
