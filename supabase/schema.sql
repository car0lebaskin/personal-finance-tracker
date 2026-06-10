-- Vault advanced schema
-- Run this in Supabase SQL Editor.
-- Existing accounts/account_snapshots tables are not recreated here.

create table if not exists public.contribution_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  category text not null,
  amount numeric not null default 0,
  note text,
  recurring_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.recurring_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  amount numeric not null default 0,
  run_day int not null default 1 check (run_day between 1 and 31),
  note text,
  active boolean not null default true,
  last_run_month text,
  created_at timestamptz not null default now()
);

create table if not exists public.account_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_account_id uuid not null,
  liability_account_id uuid not null,
  label text,
  created_at timestamptz not null default now(),
  unique(user_id, asset_account_id, liability_account_id)
);

create table if not exists public.crypto_price_cache (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  myr_rate numeric not null,
  source text not null,
  fetched_at timestamptz not null default now(),
  unique(symbol)
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric not null default 0,
  current_amount numeric not null default 0,
  target_date date,
  category text default 'Other',
  monthly_contribution numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table public.contribution_entries enable row level security;
alter table public.recurring_contributions enable row level security;
alter table public.account_links enable row level security;
alter table public.goals enable row level security;

-- crypto_price_cache contains public market prices. It is intentionally readable.
alter table public.crypto_price_cache enable row level security;

create policy if not exists "Users can read own contribution entries" on public.contribution_entries for select using (auth.uid() = user_id);
create policy if not exists "Users can insert own contribution entries" on public.contribution_entries for insert with check (auth.uid() = user_id);
create policy if not exists "Users can update own contribution entries" on public.contribution_entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy if not exists "Users can delete own contribution entries" on public.contribution_entries for delete using (auth.uid() = user_id);

create policy if not exists "Users can read own recurring contributions" on public.recurring_contributions for select using (auth.uid() = user_id);
create policy if not exists "Users can insert own recurring contributions" on public.recurring_contributions for insert with check (auth.uid() = user_id);
create policy if not exists "Users can update own recurring contributions" on public.recurring_contributions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy if not exists "Users can delete own recurring contributions" on public.recurring_contributions for delete using (auth.uid() = user_id);

create policy if not exists "Users can read own account links" on public.account_links for select using (auth.uid() = user_id);
create policy if not exists "Users can insert own account links" on public.account_links for insert with check (auth.uid() = user_id);
create policy if not exists "Users can update own account links" on public.account_links for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy if not exists "Users can delete own account links" on public.account_links for delete using (auth.uid() = user_id);

create policy if not exists "Users can read own goals" on public.goals for select using (auth.uid() = user_id);
create policy if not exists "Users can insert own goals" on public.goals for insert with check (auth.uid() = user_id);
create policy if not exists "Users can update own goals" on public.goals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy if not exists "Users can delete own goals" on public.goals for delete using (auth.uid() = user_id);

create policy if not exists "Anyone can read crypto price cache" on public.crypto_price_cache for select using (true);

create index if not exists contribution_entries_user_date_idx on public.contribution_entries(user_id, entry_date desc);
create index if not exists recurring_contributions_user_active_idx on public.recurring_contributions(user_id, active);
create index if not exists account_links_user_asset_idx on public.account_links(user_id, asset_account_id);
create index if not exists goals_user_category_idx on public.goals(user_id, category);
