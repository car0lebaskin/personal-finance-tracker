-- Optional but recommended for richer monthly reviews.
-- Run this in Supabase SQL Editor.
-- Existing snapshots continue to work. New snapshots can store both MYR and native currency data.

alter table public.account_snapshots
add column if not exists native_balance numeric,
add column if not exists currency text,
add column if not exists fx_rate numeric;
