import { NextResponse } from 'next/server';
import { buildPortfolioCoach } from '@/lib/coach';
import { getTotals } from '@/lib/finance';
import type { Account } from '@/lib/finance';

function safePercent(value: number, base: number) {
  if (!base) return 0;
  return Math.round((value / base) * 100);
}

export async function POST(request: Request) {
  let accounts: Account[] = [];
  try {
    const body = await request.json();
    accounts = Array.isArray(body?.accounts) ? body.accounts : [];
  } catch {
    accounts = [];
  }

  const fallback = buildPortfolioCoach(accounts);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ mode: 'local', actions: fallback });

  const totals = getTotals(accounts);
  const summary = {
    accountCount: accounts.length,
    assetMixPercent: {
      cash: safePercent(totals.cash, totals.assets),
      diversifiedInvestments: safePercent(totals.investments, totals.assets),
      crypto: safePercent(totals.crypto, totals.assets),
      retirement: safePercent(totals.retirement, totals.assets),
      property: safePercent(totals.property, totals.assets),
      liabilities: safePercent(totals.liabilities, totals.assets),
      liquidAssets: safePercent(totals.cash + totals.investments + totals.crypto, totals.assets),
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

    if (!response.ok) throw new Error('AI coach unavailable.');
    const data = await response.json();
    const text = String(data?.choices?.[0]?.message?.content || '');
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) throw new Error('Invalid AI response.');
    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    if (!Array.isArray(parsed.actions)) throw new Error('Invalid AI response.');
    return NextResponse.json({ mode: 'ai', actions: parsed.actions.slice(0, 5) });
  } catch {
    return NextResponse.json({ mode: 'local', actions: fallback });
  }
}
