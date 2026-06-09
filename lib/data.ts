export interface Account {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit' | 'investment' | 'loan' | 'property';
  balance: number;
  institution: string;
  icon: string;
  changePercent: number;
  changeAmount: number;
}

export interface Holding {
  id: string;
  ticker: string;
  name: string;
  type: 'etf' | 'stock' | 'bond' | 'crypto' | 'reit';
  shares: number;
  costBasis: number;
  currentPrice: number;
  value: number;
  dayChange: number;
  dayChangePct: number;
  totalReturn: number;
  totalReturnPct: number;
  allocation: number;
  account: string;
}

export interface NetWorthPoint {
  month: string;
  assets: number;
  liabilities: number;
  netWorth: number;
}

export interface AllocationSlice {
  name: string;
  value: number;
  fill: string;
  category: string;
}

export interface Recommendation {
  id: string;
  type: 'rebalance' | 'tax' | 'fee' | 'risk' | 'opportunity';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  action: string;
}

export interface Transaction {
  id: string;
  merchant: string;
  category: string;
  amount: number;
  date: string;
  icon: string;
  pending: boolean;
}

export const accounts: Account[] = [
  { id: '1', name: 'Chase Checking', type: 'checking', balance: 12450.83, institution: 'Chase', icon: 'Landmark', changePercent: 0, changeAmount: 0 },
  { id: '2', name: 'High-Yield Savings', type: 'savings', balance: 45200.00, institution: 'Marcus', icon: 'PiggyBank', changePercent: 4.5, changeAmount: 1944 },
  { id: '3', name: 'Sapphire Reserve', type: 'credit', balance: -2340.56, institution: 'Chase', icon: 'CreditCard', changePercent: 0, changeAmount: 0 },
  { id: '4', name: 'Vanguard Brokerage', type: 'investment', balance: 187340.22, institution: 'Vanguard', icon: 'TrendingUp', changePercent: 8.3, changeAmount: 14368 },
  { id: '5', name: 'Fidelity 401k', type: 'investment', balance: 124500.00, institution: 'Fidelity', icon: 'BarChart3', changePercent: 6.7, changeAmount: 7804 },
  { id: '6', name: 'Coinbase', type: 'investment', balance: 18420.00, institution: 'Coinbase', icon: 'Coins', changePercent: -3.2, changeAmount: -608 },
  { id: '7', name: 'Home — Estimated Value', type: 'property', balance: 620000.00, institution: 'Zillow Est.', icon: 'Home', changePercent: 3.1, changeAmount: 18600 },
  { id: '8', name: 'Mortgage', type: 'loan', balance: -285000.00, institution: 'Wells Fargo', icon: 'Building', changePercent: 0, changeAmount: 0 },
  { id: '9', name: 'Auto Loan', type: 'loan', balance: -14200.00, institution: 'Toyota Financial', icon: 'Car', changePercent: 0, changeAmount: 0 },
];

export const holdings: Holding[] = [
  { id: 'h1', ticker: 'VTI', name: 'Vanguard Total Stock Market ETF', type: 'etf', shares: 140, costBasis: 210, currentPrice: 242.80, value: 33992, dayChange: 1.2, dayChangePct: 0.5, totalReturn: 4592, totalReturnPct: 15.6, allocation: 12.9, account: 'Vanguard Brokerage' },
  { id: 'h2', ticker: 'VXUS', name: 'Vanguard Total International ETF', type: 'etf', shares: 420, costBasis: 58.10, currentPrice: 64.40, value: 27048, dayChange: -84, dayChangePct: -0.31, totalReturn: 2646, totalReturnPct: 10.8, allocation: 10.3, account: 'Vanguard Brokerage' },
  { id: 'h3', ticker: 'BND', name: 'Vanguard Total Bond Market ETF', type: 'bond', shares: 320, costBasis: 80.20, currentPrice: 74.10, value: 23712, dayChange: -64, dayChangePct: -0.27, totalReturn: -1952, totalReturnPct: -7.6, allocation: 9.0, account: 'Vanguard Brokerage' },
  { id: 'h4', ticker: 'NVDA', name: 'NVIDIA Corporation', type: 'stock', shares: 45, costBasis: 480, currentPrice: 892.40, value: 40158, dayChange: 1204.2, dayChangePct: 3.09, totalReturn: 18558, totalReturnPct: 85.9, allocation: 15.3, account: 'Vanguard Brokerage' },
  { id: 'h5', ticker: 'AAPL', name: 'Apple Inc.', type: 'stock', shares: 80, costBasis: 145, currentPrice: 214.60, value: 17168, dayChange: -113.6, dayChangePct: -0.66, totalReturn: 5568, totalReturnPct: 47.9, allocation: 6.5, account: 'Vanguard Brokerage' },
  { id: 'h6', ticker: 'MSFT', name: 'Microsoft Corporation', type: 'stock', shares: 35, costBasis: 280, currentPrice: 432.80, value: 15148, dayChange: 210.7, dayChangePct: 1.41, totalReturn: 5348, totalReturnPct: 54.3, allocation: 5.8, account: 'Vanguard Brokerage' },
  { id: 'h7', ticker: 'QQQ', name: 'Invesco Nasdaq 100 ETF', type: 'etf', shares: 55, costBasis: 340, currentPrice: 472.60, value: 25993, dayChange: 330.0, dayChangePct: 1.29, totalReturn: 7293, totalReturnPct: 38.9, allocation: 9.9, account: 'Vanguard Brokerage' },
  { id: 'h8', ticker: 'VNQ', name: 'Vanguard Real Estate ETF', type: 'reit', shares: 180, costBasis: 88.40, currentPrice: 84.20, value: 15156, dayChange: -108, dayChangePct: -0.71, totalReturn: -756, totalReturnPct: -4.7, allocation: 5.8, account: 'Fidelity 401k' },
  { id: 'h9', ticker: 'SPY', name: 'SPDR S&P 500 ETF', type: 'etf', shares: 100, costBasis: 380, currentPrice: 526.40, value: 52640, dayChange: 420, dayChangePct: 0.8, totalReturn: 14640, totalReturnPct: 38.5, allocation: 20.0, account: 'Fidelity 401k' },
  { id: 'h10', ticker: 'BTC', name: 'Bitcoin', type: 'crypto', shares: 0.22, costBasis: 42000, currentPrice: 67500, value: 14850, dayChange: -297, dayChangePct: -1.96, totalReturn: 5610, totalReturnPct: 60.8, allocation: 5.6, account: 'Coinbase' },
  { id: 'h11', ticker: 'ETH', name: 'Ethereum', type: 'crypto', shares: 1.8, costBasis: 1800, currentPrice: 1983.33, value: 3570, dayChange: -71.4, dayChangePct: -1.96, totalReturn: 330, totalReturnPct: 10.2, allocation: 1.4, account: 'Coinbase' },
  { id: 'h12', ticker: 'SCHD', name: 'Schwab US Dividend ETF', type: 'etf', shares: 140, costBasis: 72.10, currentPrice: 79.40, value: 11116, dayChange: 56, dayChangePct: 0.51, totalReturn: 1022, totalReturnPct: 10.1, allocation: 4.2, account: 'Fidelity 401k' },
];

export const netWorthHistory: NetWorthPoint[] = [
  { month: 'Jan', assets: 955000, liabilities: 316000, netWorth: 639000 },
  { month: 'Feb', assets: 968000, liabilities: 314500, netWorth: 653500 },
  { month: 'Mar', assets: 981000, liabilities: 313000, netWorth: 668000 },
  { month: 'Apr', assets: 994000, liabilities: 311200, netWorth: 682800 },
  { month: 'May', assets: 1007000, liabilities: 302000, netWorth: 705000 },
  { month: 'Jun', assets: 1027910.05, liabilities: 301540.56, netWorth: 726370.49 },
];

export const monthlyNetWorthExtended = [
  { month: 'Jul \'25', netWorth: 580000 },
  { month: 'Aug', netWorth: 594000 },
  { month: 'Sep', netWorth: 603000 },
  { month: 'Oct', netWorth: 618000 },
  { month: 'Nov', netWorth: 628000 },
  { month: 'Dec', netWorth: 639000 },
  { month: 'Jan \'26', netWorth: 653500 },
  { month: 'Feb', netWorth: 668000 },
  { month: 'Mar', netWorth: 682800 },
  { month: 'Apr', netWorth: 705000 },
  { month: 'May', netWorth: 726370 },
];

export const allocationData: AllocationSlice[] = [
  { name: 'US Stocks', value: 32.1, fill: '#3b82f6', category: 'Equities' },
  { name: 'ETFs', value: 28.4, fill: '#60a5fa', category: 'Equities' },
  { name: 'International', value: 10.3, fill: '#22c55e', category: 'Equities' },
  { name: 'Bonds', value: 9.0, fill: '#f59e0b', category: 'Fixed Income' },
  { name: 'Real Estate', value: 5.8, fill: '#8b5cf6', category: 'Real Assets' },
  { name: 'Crypto', value: 7.0, fill: '#f97316', category: 'Alternative' },
  { name: 'Cash', value: 7.4, fill: '#6b7280', category: 'Cash' },
];

export const recommendations: Recommendation[] = [
  {
    id: 'r1',
    type: 'rebalance',
    priority: 'high',
    title: 'Portfolio Overweight in NVIDIA',
    description: 'NVDA has grown to 15.3% of your portfolio — far above the 5% single-stock guideline. A large unrealized gain of $18.5K means a correction could significantly impact net worth.',
    impact: 'Reduces single-stock risk by ~$12K',
    action: 'Consider trimming 20–25 shares and reallocating to VTI or BND.',
  },
  {
    id: 'r2',
    type: 'tax',
    priority: 'high',
    title: 'Tax-Loss Harvesting Opportunity',
    description: 'BND and VNQ are currently at a loss ($1,952 and $756 respectively). Harvesting these losses before year-end can offset capital gains from NVDA.',
    impact: 'Potential $2,708 tax deduction',
    action: 'Sell BND/VNQ positions and replace with similar (non-wash-sale) alternatives like AGG or IYR.',
  },
  {
    id: 'r3',
    type: 'fee',
    priority: 'medium',
    title: 'Consolidate Crypto on Lower-Fee Platform',
    description: 'Coinbase charges up to 1.5% per transaction. Your crypto holdings worth $18.4K incur unnecessary fees on every trade.',
    impact: 'Save up to $275/yr in fees',
    action: 'Consider moving to Coinbase Advanced Trade or Kraken Pro for significantly lower fees.',
  },
  {
    id: 'r4',
    type: 'opportunity',
    priority: 'medium',
    title: 'Maximize 401k Contribution',
    description: 'You\'ve contributed $18,200 YTD. The 2026 limit is $23,500. You have $5,300 remaining — maximizing this reduces taxable income.',
    impact: 'Up to $1,855 in tax savings (22% bracket)',
    action: 'Increase your payroll contribution by ~$441/month for the remaining 12 months.',
  },
  {
    id: 'r5',
    type: 'risk',
    priority: 'low',
    title: 'Emergency Fund Could Be Larger',
    description: 'Your cash position ($57.6K) is solid, but concentrated. With monthly expenses around $5K, you hold ~11.5 months — above the 6-month guideline.',
    impact: 'Deploying $20K could yield ~$700 more/yr',
    action: 'Consider moving $20K excess cash into a CD ladder or short-duration bond fund.',
  },
  {
    id: 'r6',
    type: 'rebalance',
    priority: 'low',
    title: 'Bond Allocation Below Target',
    description: 'Bonds represent only 9% of your investable assets vs. a suggested 15–20% for your risk profile. Rising rates could create an opportunity to buy.',
    impact: 'Improves portfolio Sharpe ratio',
    action: 'Gradually increase BND or AGG position as you rebalance gains.',
  },
];

export const transactions: Transaction[] = [
  { id: 't1', merchant: 'Vanguard — Buy VTI', category: 'Investment', amount: -2000.00, date: '2026-06-08', icon: 'TrendingUp', pending: false },
  { id: 't2', merchant: 'Salary Deposit', category: 'Income', amount: 8500.00, date: '2026-06-07', icon: 'Briefcase', pending: false },
  { id: 't3', merchant: 'Mortgage Payment', category: 'Loan', amount: -2340.00, date: '2026-06-05', icon: 'Building', pending: false },
  { id: 't4', merchant: 'Coinbase — Buy BTC', category: 'Investment', amount: -500.00, date: '2026-06-04', icon: 'Coins', pending: false },
  { id: 't5', merchant: '401k Contribution', category: 'Retirement', amount: -1960.00, date: '2026-06-03', icon: 'BarChart3', pending: false },
  { id: 't6', merchant: 'Freelance Payment', category: 'Income', amount: 2200.00, date: '2026-06-02', icon: 'Laptop', pending: false },
  { id: 't7', merchant: 'Fidelity — Dividend', category: 'Dividend', amount: 184.20, date: '2026-06-01', icon: 'DollarSign', pending: false },
];

export function formatCurrency(amount: number, compact = false): string {
  if (compact) {
    if (Math.abs(amount) >= 1000000) return `$${(amount / 1000000).toFixed(2)}M`;
    if (Math.abs(amount) >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
  }
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return amount < 0 ? `-${formatted}` : formatted;
}

export function formatCompact(amount: number): string {
  return formatCurrency(amount, true);
}
