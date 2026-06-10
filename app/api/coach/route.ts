import { NextResponse } from 'next/server';
import { buildPortfolioCoach } from '@/lib/coach';
import type { Account } from '@/lib/finance';

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
  if (!apiKey) return NextResponse.json({ mode: 'rules', actions: fallback });

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
            content: 'You are a cautious personal finance portfolio coach for a Malaysian user. Do not give guaranteed returns. Do not recommend specific regulated financial products. Return only JSON with an actions array. Each action needs title, body, priority, and category.',
          },
          {
            role: 'user',
            content: JSON.stringify({ accounts }),
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
    return NextResponse.json({ mode: 'rules', actions: fallback });
  }
}
