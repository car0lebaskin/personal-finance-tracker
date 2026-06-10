export type FxResult = { rate: number; source: string; updatedAt: string };

const coinIds: Record<string, string> = {
  USDT: 'tether',
  BTC: 'bitcoin',
  ETH: 'ethereum',
};

export async function getMyrRate(currency: string): Promise<FxResult> {
  const code = currency.toUpperCase();
  if (code === 'MYR') return { rate: 1, source: 'Manual', updatedAt: new Date().toISOString() };

  if (coinIds[code]) {
    const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinIds[code]}&vs_currencies=myr`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Unable to fetch crypto rate.');
    const data = await response.json();
    const rate = Number(data?.[coinIds[code]]?.myr);
    if (!rate) throw new Error('Crypto rate unavailable.');
    return { rate, source: 'CoinGecko', updatedAt: new Date().toISOString() };
  }

  const response = await fetch(`https://api.frankfurter.app/latest?from=${code}&to=MYR`, { cache: 'no-store' });
  if (!response.ok) throw new Error('Unable to fetch currency rate.');
  const data = await response.json();
  const rate = Number(data?.rates?.MYR);
  if (!rate) throw new Error('Currency rate unavailable.');
  return { rate, source: 'Frankfurter', updatedAt: new Date().toISOString() };
}

export function prettyRateTime(value?: string) {
  if (!value) return '';
  return new Date(value).toLocaleString('en-MY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
