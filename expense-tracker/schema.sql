-- Run once in Supabase: SQL Editor → New query → paste → Run.

create table transactions (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  kind        text not null check (kind in ('income', 'expense', 'transfer', 'adjust')),
  account     text not null check (account in ('online', 'cash')),
  to_account  text check (to_account in ('online', 'cash')),
  amount      numeric(12, 2) not null,
  category    text,
  note        text,
  date        date not null,
  created_at  timestamptz not null default now(),
  -- transfers move money to the other account; nothing else has a destination
  check ((kind = 'transfer') = (to_account is not null and to_account <> account)),
  -- 'adjust' (from "Set balance") may be negative; everything else is positive
  check (case when kind = 'adjust' then amount <> 0 else amount > 0 end)
);

create index on transactions (user_id, date);

-- Each user sees and changes only their own rows.
alter table transactions enable row level security;

create policy "own rows" on transactions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
