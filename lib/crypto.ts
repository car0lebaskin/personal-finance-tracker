export type CryptoPrice = {
  currency: string;
  myrRate: number;
  source: string;
  updatedAt: string;
};

const ids: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  USDT: 'tether',
  USDC: 'usd-coin',
  BNB: 'binancecoin',
  SOL: 'solana',
  XRP: 'ripple',
};

export function supportsLiveCrypto(currency?: string | null) {
  return Boolean(currency && ids[currency.toUpperCase()]);
}

export async function getCryptoMyrRate(currency: string): Promise<CryptoPrice> {
  const symbol = currency.toUpperCase();
  const id = ids[symbol];
  if (!id) throw new Error(`${symbol} live price is not supported yet.`);

  const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=myr`, {
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Unable to fetch live crypto price. Enter the MYR rate manually.');

  const data = await response.json();
  const myrRate = Number(data?.[id]?.myr || 0);
  if (!myrRate) throw new Error('Live crypto price was unavailable. Enter the MYR rate manually.');

  return {
    currency: symbol,
    myrRate,
    source: 'CoinGecko',
    updatedAt: new Date().toISOString(),
  };
}

export function prettyCryptoTime(value: string) {
  return new Date(value).toLocaleString('en-MY', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
