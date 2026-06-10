import { NextResponse } from 'next/server';
import { getTotals } from '@/lib/finance';
import { monthlyReview, type SnapshotPoint } from '@/lib/insights';
import type { Account } from '@/lib/finance';

type Contribution = { amount?: number; category?: string };
type Goal = { name?: string; category?: string; target_amount?: number; monthly_contribution?: number };
type Recurring = { amount?: number; category?: string; active?: boolean; last_run_month?: string | null };
type LinkRow = { id?: string };

function friendlyOpenAiError(status: number) {
  if (status === 401) return 'OpenAI key rejected. Check OPENAI_API_KEY in Vercel.';
  if (status === 429) return 'OpenAI quota or rate limit reached. Local report is shown instead.';
  if (status >= 500) return 'OpenAI service issue. Local report is shown instead.';
  return `OpenAI request failed with status ${status}.`;
}
function currentMonth() { return new Date().toISOString().slice(0, 7); }
function isCrypto(account: Account) { return account.type === 'crypto' || ['BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'SOL', 'XRP'].includes(String(account.currency || '').toUpperCase()); }

function localReport(accounts: Account[], snapshots: SnapshotPoint[], contributions: Contribution[], goals: Goal[], recurring: Recurring[], links: LinkRow[]) {
  const totals = getTotals(accounts);
  const review = monthlyReview(accounts, snapshots);
  const direction = review.change > 0 ? 'increased' : review.change < 0 ? 'decreased' : 'stayed flat';
  const monthlyAuto = recurring.filter((item) => item.active !== false).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const contributionTotal = contributions.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  return {
    mode: 'local',
    headline: `Net worth ${direction} since the previous snapshot.`,
    sections: [
      { title: 'What changed', body: `Net worth moved by ${Math.round(review.change).toLocaleString('en-MY')} MYR. Logged contributions total about ${Math.round(contributionTotal).toLocaleString('en-MY')} MYR.` },
      { title: 'Goals and commitments', body: `${goals.length} goals are tracked. Recurring monthly commitments are about ${Math.round(monthlyAuto).toLocaleString('en-MY')} MYR.` },
      { title: 'Property and debt structure', body: `${links.length} account link${links.length === 1 ? '' : 's'} are set. Debt ratio is about ${review.debtPct}%.` },
      { title: 'What to check', body: `Liquidity is about ${review.liquidPct}% of assets. Crypto accounts found: ${accounts.filter(isCrypto).length}.` },
      { title: 'Next action', body: 'Update stale balances, check data warnings, refresh crypto, then run the report again at month end.' },
    ],
  };
}

export async function POST(request: Request) {
  let accounts: Account[] = [];
  let snapshots: SnapshotPoint[] = [];
  let contributions: Contribution[] = [];
  let goals: Goal[] = [];
  let recurring: Recurring[] = [];
  let links: LinkRow[] = [];
  try {
    const body = await request.json();
    accounts = Array.isArray(body?.accounts) ? body.accounts : [];
    snapshots = Array.isArray(body?.snapshots) ? body.snapshots : [];
    contributions = Array.isArray(body?.contributions) ? body.contributions : [];
    goals = Array.isArray(body?.goals) ? body.goals : [];
    recurring = Array.isArray(body?.recurring) ? body.recurring : [];
    links = Array.isArray(body?.links) ? body.links : [];
  } catch {
    accounts = [];
    snapshots = [];
  }

  const fallback = localReport(accounts, snapshots, contributions, goals, recurring, links);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ ...fallback, error: 'OPENAI_API_KEY is missing in Vercel Production environment variables.' });

  const totals = getTotals(accounts);
  const review = monthlyReview(accounts, snapshots);
  const monthlyAuto = recurring.filter((item) => item.active !== false).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const recurringNotRun = recurring.filter((item) => item.active !== false && item.last_run_month !== currentMonth()).length;
  const contributionTotal = contributions.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const summary = {
    accountCount: accounts.length,
    snapshotCount: review.snapshotCount,
    contributionCount: contributions.length,
    contributionTotalApproxMYR: Math.round(contributionTotal),
    goalCount: goals.length,
    recurringMonthlyApproxMYR: Math.round(monthlyAuto),
    recurringNotRunThisMonth: recurringNotRun,
    accountLinkCount: links.length,
    cryptoAccountCount: accounts.filter(isCrypto).length,
    netWorthDirection: review.change > 0 ? 'up' : review.change < 0 ? 'down' : 'flat',
    liquidPercent: review.liquidPct,
    debtPercent: review.debtPct,
    assetMix: {
      cash: Math.round((totals.cash / Math.max(totals.assets, 1)) * 100),
      investments: Math.round((totals.investments / Math.max(totals.assets, 1)) * 100),
      crypto: Math.round((totals.crypto / Math.max(totals.assets, 1)) * 100),
      retirement: Math.round((totals.retirement / Math.max(totals.assets, 1)) * 100),
      property: Math.round((totals.property / Math.max(totals.assets, 1)) * 100),
    },
    goals: goals.slice(0, 8).map((goal) => ({ name: goal.name, category: goal.category, target: goal.target_amount, monthly: goal.monthly_contribution })),
  };

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.2,
        messages: [
          { role: 'system', content: 'You are a cautious personal finance analyst. Use only the summary. Do not provide regulated product recommendations, guarantees, or specific securities advice. Return JSON only: {"headline":"","sections":[{"title":"What changed","body":""},{"title":"Goals and commitments","body":""},{"title":"Property, debt and liquidity","body":""},{"title":"Data quality","body":""},{"title":"What to do next","body":""}]}' },
          { role: 'user', content: JSON.stringify(summary) },
        ],
      }),
    });
    if (!response.ok) return NextResponse.json({ ...fallback, error: friendlyOpenAiError(response.status) });
    const data = await response.json();
    const text = String(data?.choices?.[0]?.message?.content || '');
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) throw new Error('AI report was not readable.');
    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    return NextResponse.json({ mode: 'ai', headline: parsed.headline, sections: Array.isArray(parsed.sections) ? parsed.sections.slice(0, 5) : fallback.sections });
  } catch (error) {
    return NextResponse.json({ ...fallback, error: error instanceof Error ? error.message : 'AI report failed.' });
  }
}
