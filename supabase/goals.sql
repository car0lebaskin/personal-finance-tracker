-- Run this in Supabase SQL Editor to store Vault goals per user.

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('networth', 'retirement', 'emergency', 'debt')),
  target numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table public.goals enable row level security;

drop policy if exists "Users can read own goals" on public.goals;
create policy "Users can read own goals"
on public.goals for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own goals" on public.goals;
create policy "Users can insert own goals"
on public.goals for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own goals" on public.goals;
create policy "Users can update own goals"
on public.goals for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own goals" on public.goals;
create policy "Users can delete own goals"
on public.goals for delete
using (auth.uid() = user_id);
