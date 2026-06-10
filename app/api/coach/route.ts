import { NextResponse } from 'next/server';
import { buildPortfolioCoach } from '@/lib/coach';
import type { Account } from '@/lib/finance';

export async function POST(request: Request) {
  const { accounts } = await request.json() as { accounts: Account[] };
  const fallback = buildPortfolioCoach(accounts || []);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ mode: 'rules', actions: fallback });

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.2,
        messages: [
          { role: 'system', content: 'You are a cautious personal finance portfolio coach for a Malaysian user. Do not give guaranteed returns. Do not recommend specific regulated financial products. Give practical next actions based only on the provided account data. Return valid JSON only: {"actions":[{"title":"","body":"","priority":"High|Medium|Low","category":""}]}' },
          { role: 'user', content: JSON.stringify({ accounts }) }
        ],
        response_format: { type: 'json_object' }
      })
    });
    if (!response.ok) throw new Error('AI coach unavailable.');
    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;
    const parsed = JSON.parse(text || '{}');
    if (!Array.isArray(parsed.actions)) throw new Error('Invalid AI response.');
    return NextResponse.json({ mode: 'ai', actions: parsed.actions.slice(0, 5) });
  } catch {
    return NextResponse.json({ mode: 'rules', actions: fallback });
  }
}
