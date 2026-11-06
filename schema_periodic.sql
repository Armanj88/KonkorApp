-- Run once in Supabase: SQL Editor > New query > paste > Run.
-- Notes for the periodic table tab (one row per element or category).

create table if not exists public.ptable_notes (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  key        text not null check (key ~ '^(cat-[a-z]+|[0-9]{1,3})$'),
  items      jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.ptable_notes enable row level security;
create policy "ptable_select_own" on public.ptable_notes for select to authenticated using (user_id = (select auth.uid()));
create policy "ptable_insert_own" on public.ptable_notes for insert to authenticated with check (user_id = (select auth.uid()));
create policy "ptable_update_own" on public.ptable_notes for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "ptable_delete_own" on public.ptable_notes for delete to authenticated using (user_id = (select auth.uid()));
