import { NextResponse } from 'next/server';
import { buildPortfolioCoach } from '@/lib/coach';
import { getTotals } from '@/lib/finance';
import { monthlyReview, type SnapshotPoint } from '@/lib/insights';
import type { Account } from '@/lib/finance';

function safePercent(value: number, base: number) {
  if (!base) return 0;
  return Math.round((value / base) * 100);
}

function friendlyOpenAiError(status: number, bodyText: string) {
  const lower = bodyText.toLowerCase();
  if (status === 401) return 'OpenAI key rejected. Check that OPENAI_API_KEY is correct and redeploy Vercel.';
  if (status === 403) return 'OpenAI key does not have access to this model or project.';
  if (status === 404) return 'OpenAI model not found. Try removing OPENAI_MODEL or set it to gpt-4o-mini.';
  if (status === 429 && (lower.includes('quota') || lower.includes('billing'))) return 'OpenAI quota or billing is not active for this API key.';
  if (status === 429) return 'OpenAI rate limit reached. Try again later.';
  if (status >= 500) return 'OpenAI service issue. Try again later.';
  return `OpenAI request failed with status ${status}.`;
}

export async function POST(request: Request) {
  let accounts: Account[] = [];
  let snapshots: SnapshotPoint[] = [];
  try {
    const body = await request.json();
    accounts = Array.isArray(body?.accounts) ? body.accounts : [];
    snapshots = Array.isArray(body?.snapshots) ? body.snapshots : [];
  } catch {
    accounts = [];
    snapshots = [];
  }

  const fallback = buildPortfolioCoach(accounts);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ mode: 'local', actions: fallback, error: 'OPENAI_API_KEY is missing in Vercel Production environment variables.' });

  const totals = getTotals(accounts);
  const review = monthlyReview(accounts, snapshots);
  const summary = {
    accountCount: accounts.length,
    snapshotCount: review.snapshotCount,
    assetMixPercent: {
      cash: safePercent(totals.cash, totals.assets),
      diversifiedInvestments: safePercent(totals.investments, totals.assets),
      crypto: safePercent(totals.crypto, totals.assets),
      retirement: safePercent(totals.retirement, totals.assets),
      property: safePercent(totals.property, totals.assets),
      liabilities: safePercent(totals.liabilities, totals.assets),
      liquidAssets: safePercent(totals.cash + totals.investments + totals.crypto, totals.assets),
    },
    trend: {
      netWorthDirection: review.change > 0 ? 'up' : review.change < 0 ? 'down' : 'flat',
      liquidPercent: review.liquidPct,
      debtPercent: review.debtPct,
      hasPreviousSnapshot: Boolean(review.previous),
    },
    hasDebt: totals.liabilities > 0,
    hasProperty: totals.property > 0,
    hasCrypto: totals.crypto > 0,
  };

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: 'You are a cautious portfolio coach. Use only the summary data. Do not mention account names, specific securities, guaranteed returns, or regulated product recommendations. Return JSON only: {"actions":[{"title":"","body":"","priority":"High|Medium|Low","category":""}]}',
          },
          {
            role: 'user',
            content: JSON.stringify(summary),
          },
        ],
      }),
    });

    if (!response.ok) {
      const bodyText = await response.text();
      return NextResponse.json({ mode: 'local', actions: fallback, error: friendlyOpenAiError(response.status, bodyText) });
    }

    const data = await response.json();
    const text = String(data?.choices?.[0]?.message?.content || '');
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) throw new Error('OpenAI responded, but did not return readable JSON.');
    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    if (!Array.isArray(parsed.actions)) throw new Error('OpenAI response did not include actions.');
    return NextResponse.json({ mode: 'ai', actions: parsed.actions.slice(0, 5) });
  } catch (error) {
    return NextResponse.json({ mode: 'local', actions: fallback, error: error instanceof Error ? error.message : 'AI request failed.' });
  }
}
