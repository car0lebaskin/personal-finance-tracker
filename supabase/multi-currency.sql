-- Run this in Supabase SQL Editor to support native currency balances.
-- Vault will continue using balance as the MYR value for totals and charts.

alter table public.accounts
add column if not exists native_balance numeric,
add column if not exists fx_rate numeric;

-- Existing currency column is used as the native currency code, e.g. MYR, USD, USDT, SGD.
-- For MYR accounts: balance = native_balance, fx_rate = 1.
-- For USDT accounts: balance = native_balance * fx_rate.
