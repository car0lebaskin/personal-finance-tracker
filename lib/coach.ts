import type { Account } from '@/lib/finance';
import { getTotals } from '@/lib/finance';

export type CoachAction = {
  title: string;
  body: string;
  priority: 'High' | 'Medium' | 'Low';
  category: string;
};

function money(value: number) {
  return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: 0, notation: 'compact' }).format(value || 0);
}

export function buildPortfolioCoach(accounts: Account[]): CoachAction[] {
  const totals = getTotals(accounts);
  const assetBase = Math.max(totals.assets, 1);
  const cashPct = (totals.cash / assetBase) * 100;
  const cryptoPct = (totals.crypto / assetBase) * 100;
  const investPct = (totals.investments / assetBase) * 100;
  const retirementPct = (totals.retirement / assetBase) * 100;
  const propertyPct = (totals.property / assetBase) * 100;
  const debtPct = (totals.liabilities / assetBase) * 100;
  const liquid = totals.cash + totals.investments + totals.crypto;
  const liquidPct = (liquid / assetBase) * 100;
  const actions: CoachAction[] = [];

  if (!accounts.length || totals.assets === 0) {
    return [{ title: 'Finish your balance sheet first', body: 'Add your main bank, EPF, investment, crypto, property, and liability accounts before trusting the recommendations.', priority: 'High', category: 'Setup' }];
  }

  if (cashPct > 35) actions.push({ title: 'Put excess cash to work', body: `Cash is ${cashPct.toFixed(0)}% of assets (${money(totals.cash)}). Keep your emergency buffer, then consider moving surplus into diversified investments or debt reduction.`, priority: 'High', category: 'Cash' });
  if (cashPct < 8 && totals.liabilities > 0) actions.push({ title: 'Increase your liquidity buffer', body: `Cash is only ${cashPct.toFixed(0)}% of assets. Before taking more risk, build a stronger buffer for mortgage, insurance, and household costs.`, priority: 'High', category: 'Cash' });
  if (cryptoPct > 20) actions.push({ title: 'Crypto concentration is high', body: `Crypto is ${cryptoPct.toFixed(0)}% of assets (${money(totals.crypto)}). Consider capping new crypto buys until cash, EPF, and diversified investments catch up.`, priority: 'High', category: 'Risk' });
  if (cryptoPct > 0 && investPct < cryptoPct) actions.push({ title: 'Balance crypto with broader markets', body: `Crypto is larger than your investment bucket. A practical next step is directing new monthly contributions toward broad funds or ETFs before adding more crypto.`, priority: 'Medium', category: 'Allocation' });
  if (investPct < 15 && totals.netWorth > 0) actions.push({ title: 'Grow diversified investments', body: `Investments are ${investPct.toFixed(0)}% of assets. Your long-term plan may benefit from a larger diversified investment bucket outside EPF and property.`, priority: 'Medium', category: 'Growth' });
  if (retirementPct < 20 && totals.netWorth > 0) actions.push({ title: 'Check retirement progress', body: `Retirement assets are ${retirementPct.toFixed(0)}% of assets. Use the Contribution Planner to see how much you need monthly for your target retirement number.`, priority: 'Medium', category: 'Retirement' });
  if (propertyPct > 60) actions.push({ title: 'Your wealth is property-heavy', body: `Property is ${propertyPct.toFixed(0)}% of assets. Build liquid assets so net worth is not too locked into one illiquid asset.`, priority: 'Medium', category: 'Liquidity' });
  if (debtPct > 40) actions.push({ title: 'Debt load needs active monitoring', body: `Liabilities are ${debtPct.toFixed(0)}% of assets. Prioritise high-interest debt and keep a cash buffer before increasing risky investments.`, priority: 'High', category: 'Debt' });
  if (liquidPct < 20 && totals.property > 0) actions.push({ title: 'Improve liquid net worth', body: `Liquid assets are about ${liquidPct.toFixed(0)}% of assets. Consider making the next few contributions to cash or market investments rather than illiquid assets.`, priority: 'Medium', category: 'Liquidity' });

  if (actions.length === 0) actions.push({ title: 'Portfolio looks broadly balanced', body: 'No major concentration issue stands out. Your next step is to keep updating snapshots and use the planner to aim contributions toward specific goals.', priority: 'Low', category: 'Maintenance' });
  return actions.sort((a, b) => ({ High: 0, Medium: 1, Low: 2 }[a.priority] - { High: 0, Medium: 1, Low: 2 }[b.priority])).slice(0, 5);
}
