export type FxResult = { rate: number; source: string; updatedAt: string };

const coinIds: Record<string, string> = {
  USDT: 'tether',
  BTC: 'bitcoin',
  ETH: 'ethereum',
};

const fiatCodes = ['USD', 'SGD', 'EUR'];

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

  if (fiatCodes.includes(code)) {
    const response = await fetch(`https://open.er-api.com/v6/latest/${code}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Unable to fetch fiat rate.');
    const data = await response.json();
    const rate = Number(data?.rates?.MYR);
    if (!rate) throw new Error('MYR fiat rate unavailable.');
    return { rate, source: 'ExchangeRate-API', updatedAt: data?.time_last_update_utc ? new Date(data.time_last_update_utc).toISOString() : new Date().toISOString() };
  }

  throw new Error(`${code} live rate is not supported yet.`);
}

export function prettyRateTime(value?: string) {
  if (!value) return '';
  return new Date(value).toLocaleString('en-MY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
