import type { Account } from '@/lib/finance';
import { getTotals } from '@/lib/finance';

export type SnapshotPoint = { account_id: string; snapshot_date: string; balance: number };
export type TrendPoint = { date: string; assets: number; liabilities: number; netWorth: number; monthlyChange: number };

function isDebt(account: Account) {
  return ['loan', 'credit'].includes(account.type);
}

export function buildTrend(accounts: Account[], snapshots: SnapshotPoint[]): TrendPoint[] {
  const dates = Array.from(new Set(snapshots.map((item) => item.snapshot_date))).sort();
  const fallback = getTotals(accounts);
  if (!dates.length) return [{ date: 'Current', assets: fallback.assets, liabilities: fallback.liabilities, netWorth: fallback.netWorth, monthlyChange: 0 }];

  return dates.map((date, index) => {
    let assets = 0;
    let liabilities = 0;
    accounts.forEach((account) => {
      const rows = snapshots.filter((snap) => snap.account_id === account.id && snap.snapshot_date <= date);
      const latest = rows[rows.length - 1];
      const value = Math.abs(Number(latest?.balance ?? account.balance ?? 0));
      if (isDebt(account)) liabilities += value;
      else assets += value;
    });
    const netWorth = assets - liabilities;
    const previous = index > 0 ? dates[index - 1] : null;
    let monthlyChange = 0;
    if (previous) {
      const previousPoint = dates.slice(0, index).map((previousDate) => {
        let previousAssets = 0;
        let previousLiabilities = 0;
        accounts.forEach((account) => {
          const rows = snapshots.filter((snap) => snap.account_id === account.id && snap.snapshot_date <= previousDate);
          const latest = rows[rows.length - 1];
          const value = Math.abs(Number(latest?.balance ?? account.balance ?? 0));
          if (isDebt(account)) previousLiabilities += value;
          else previousAssets += value;
        });
        return previousAssets - previousLiabilities;
      }).pop() ?? netWorth;
      monthlyChange = netWorth - previousPoint;
    }
    return { date, assets, liabilities, netWorth, monthlyChange };
  });
}

export function filterTrend(points: TrendPoint[], range: '1M' | '3M' | '6M' | '1Y' | 'All') {
  if (range === 'All' || points.length < 2) return points;
  const count = range === '1M' ? 2 : range === '3M' ? 4 : range === '6M' ? 7 : 13;
  return points.slice(-count);
}

export function monthlyReview(accounts: Account[], snapshots: SnapshotPoint[]) {
  const trend = buildTrend(accounts, snapshots);
  const latest = trend[trend.length - 1];
  const previous = trend[trend.length - 2];
  const totals = getTotals(accounts);
  const liquid = totals.cash + totals.investments + totals.crypto;
  const liquidPct = totals.assets > 0 ? Math.round((liquid / totals.assets) * 100) : 0;
  const debtPct = totals.assets > 0 ? Math.round((totals.liabilities / totals.assets) * 100) : 0;
  const biggestAsset = [...accounts].filter((account) => !isDebt(account)).sort((a, b) => Math.abs(Number(b.balance)) - Math.abs(Number(a.balance)))[0];
  const biggestDebt = [...accounts].filter(isDebt).sort((a, b) => Math.abs(Number(b.balance)) - Math.abs(Number(a.balance)))[0];

  return {
    latest,
    previous,
    change: previous ? latest.netWorth - previous.netWorth : 0,
    liquidPct,
    debtPct,
    biggestAsset,
    biggestDebt,
    snapshotCount: trend.length,
  };
}

export function accountPairSuggestions(accounts: Account[]) {
  const assets = accounts.filter((account) => ['property'].includes(account.type));
  const debts = accounts.filter((account) => isDebt(account));
  return assets.slice(0, 5).map((asset) => {
    const lower = `${asset.name} ${asset.institution}`.toLowerCase();
    const match = debts.find((debt) => {
      const d = `${debt.name} ${debt.institution}`.toLowerCase();
      return lower.includes('house') && (d.includes('mortgage') || d.includes('home'))
        || lower.includes('car') && d.includes('car')
        || d.includes(asset.institution.toLowerCase());
    });
    const assetValue = Math.abs(Number(asset.balance || 0));
    const debtValue = Math.abs(Number(match?.balance || 0));
    return { asset, debt: match, equity: assetValue - debtValue, loanToValue: assetValue > 0 ? Math.round((debtValue / assetValue) * 100) : 0 };
  });
}
