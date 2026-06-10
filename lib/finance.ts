import { AlertTriangle, BarChart3, Home, ShieldCheck, Wallet } from 'lucide-react';

export const liabilityTypes = ['loan', 'credit'];

export type Account = {
  id: string;
  name: string;
  institution: string;
  type: string;
  balance: number;
  currency: string;
  native_balance?: number | null;
  fx_rate?: number | null;
};

export type Totals = {
  assets: number;
  liabilities: number;
  cash: number;
  investments: number;
  crypto: number;
  retirement: number;
  property: number;
  netWorth: number;
};

export function nativeDisplay(account: Account) {
  const currency = account.currency || 'MYR';
  const native = account.native_balance ?? account.balance;
  if (currency === 'MYR') return null;
  return `${new Intl.NumberFormat('en-MY', { maximumFractionDigits: 6 }).format(Number(native || 0))} ${currency}`;
}

export function getTotals(accounts: Account[]): Totals {
  const assets = accounts.filter((a) => !liabilityTypes.includes(a.type)).reduce((s, a) => s + Number(a.balance), 0);
  const liabilities = accounts.filter((a) => liabilityTypes.includes(a.type)).reduce((s, a) => s + Math.abs(Number(a.balance)), 0);
  const cash = accounts.filter((a) => ['checking', 'savings', 'cash'].includes(a.type)).reduce((s, a) => s + Number(a.balance), 0);
  const investments = accounts.filter((a) => a.type === 'investment').reduce((s, a) => s + Number(a.balance), 0);
  const crypto = accounts.filter((a) => a.type === 'crypto').reduce((s, a) => s + Number(a.balance), 0);
  const retirement = accounts.filter((a) => a.type === 'retirement').reduce((s, a) => s + Number(a.balance), 0);
  const property = accounts.filter((a) => a.type === 'property').reduce((s, a) => s + Number(a.balance), 0);
  return { assets, liabilities, cash, investments, crypto, retirement, property, netWorth: assets - liabilities };
}

export function getBreakdown(totals: Totals) {
  const assetBase = Math.max(totals.assets, 1);
  return [
    { label: 'Cash', value: totals.cash, pct: (totals.cash / assetBase) * 100, hint: 'Bank, savings, cash' },
    { label: 'Investments', value: totals.investments, pct: (totals.investments / assetBase) * 100, hint: 'Stocks, funds, unit trusts' },
    { label: 'Crypto', value: totals.crypto, pct: (totals.crypto / assetBase) * 100, hint: 'BTC, ETH, stablecoins' },
    { label: 'EPF / Retirement', value: totals.retirement, pct: (totals.retirement / assetBase) * 100, hint: 'Retirement accounts' },
    { label: 'Property', value: totals.property, pct: (totals.property / assetBase) * 100, hint: 'Property assets' },
  ].filter((item) => item.value > 0);
}

export function getRecommendations(totals: Totals) {
  const assetBase = Math.max(totals.assets, 1);
  const cashPct = (totals.cash / assetBase) * 100;
  const investPct = ((totals.investments + totals.crypto + totals.retirement) / assetBase) * 100;
  const debtPct = (totals.liabilities / assetBase) * 100;
  const propertyPct = (totals.property / assetBase) * 100;
  const recs: { title: string; body: string; priority: 'High' | 'Medium' | 'Low'; icon: any }[] = [];

  if (totals.assets === 0) return [{ title: 'Build the base layer first', body: 'This is based on your entered accounts. Add cash, EPF, investments, crypto, property, and loans before relying on the breakdown.', priority: 'High' as const, icon: ShieldCheck }];
  if (cashPct > 35) recs.push({ title: 'Cash allocation looks heavy', body: `Based on your entered accounts, cash is ${cashPct.toFixed(0)}% of assets. Keep an emergency buffer, then consider reallocating surplus.`, priority: 'High', icon: Wallet });
  if (investPct < 25 && totals.netWorth > 0) recs.push({ title: 'Growth assets look light', body: `Investments, crypto, and EPF are ${investPct.toFixed(0)}% of assets. This may be light for long-term retirement growth.`, priority: 'Medium', icon: BarChart3 });
  if (debtPct > 40) recs.push({ title: 'Debt load needs monitoring', body: `Liabilities are ${debtPct.toFixed(0)}% of assets. Prioritise expensive debt before increasing risk assets.`, priority: 'High', icon: AlertTriangle });
  if (propertyPct > 60) recs.push({ title: 'Net worth is property-heavy', body: `Property is ${propertyPct.toFixed(0)}% of assets. Build liquid assets so your balance sheet is less locked up.`, priority: 'Medium', icon: Home });
  if (recs.length === 0) recs.push({ title: 'Allocation looks balanced', body: 'Based on your entered accounts, there are no obvious concentration issues yet.', priority: 'Low', icon: ShieldCheck });
  return recs.slice(0, 4);
}
