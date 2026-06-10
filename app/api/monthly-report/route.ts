import { NextResponse } from 'next/server';
import { getTotals } from '@/lib/finance';
import { monthlyReview, type SnapshotPoint } from '@/lib/insights';
import type { Account } from '@/lib/finance';

function friendlyOpenAiError(status: number) {
  if (status === 401) return 'OpenAI key rejected. Check OPENAI_API_KEY in Vercel.';
  if (status === 429) return 'OpenAI quota or rate limit reached. Local report is shown instead.';
  if (status >= 500) return 'OpenAI service issue. Local report is shown instead.';
  return `OpenAI request failed with status ${status}.`;
}

function localReport(accounts: Account[], snapshots: SnapshotPoint[]) {
  const totals = getTotals(accounts);
  const review = monthlyReview(accounts, snapshots);
  const direction = review.change > 0 ? 'increased' : review.change < 0 ? 'decreased' : 'stayed flat';
  return {
    mode: 'local',
    headline: `Net worth ${direction} since the previous snapshot.`,
    sections: [
      { title: 'What changed', body: `Net worth moved by ${Math.round(review.change).toLocaleString('en-MY')} MYR. Assets are ${Math.round(totals.assets).toLocaleString('en-MY')} MYR and liabilities are ${Math.round(totals.liabilities).toLocaleString('en-MY')} MYR.` },
      { title: 'What improved', body: review.change >= 0 ? 'Overall momentum is positive. Keep snapshotting monthly so the trend becomes more reliable.' : 'You have a clean baseline to identify whether the drop came from markets, debt, or missing updates.' },
      { title: 'What to check', body: `Liquidity is about ${review.liquidPct}% of assets and debt ratio is about ${review.debtPct}%. Review these before making large commitments.` },
      { title: 'Next action', body: 'Update any stale accounts, log contributions, then run the report again at month end.' },
    ],
  };
}

export async function POST(request: Request) {
  let accounts: Account[] = [];
  let snapshots: SnapshotPoint[] = [];
  let contributions: unknown[] = [];
  try {
    const body = await request.json();
    accounts = Array.isArray(body?.accounts) ? body.accounts : [];
    snapshots = Array.isArray(body?.snapshots) ? body.snapshots : [];
    contributions = Array.isArray(body?.contributions) ? body.contributions : [];
  } catch {
    accounts = [];
    snapshots = [];
  }

  const fallback = localReport(accounts, snapshots);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ ...fallback, error: 'OPENAI_API_KEY is missing in Vercel Production environment variables.' });

  const totals = getTotals(accounts);
  const review = monthlyReview(accounts, snapshots);
  const summary = {
    accountCount: accounts.length,
    snapshotCount: review.snapshotCount,
    contributionCount: contributions.length,
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
  };

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.2,
        messages: [
          { role: 'system', content: 'You are a cautious personal finance analyst. Use only the summary. Do not provide regulated product recommendations, guarantees, or specific securities advice. Return JSON only: {"headline":"","sections":[{"title":"What changed","body":""},{"title":"What improved","body":""},{"title":"What worsened","body":""},{"title":"What to do next","body":""}]}' },
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
