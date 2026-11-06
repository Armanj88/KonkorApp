-- Run this once in Supabase: SQL Editor > New query > paste > Run.

-- Notes and questions
create table if not exists public.items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind       text not null check (kind in ('note', 'q')),
  subject    text not null,
  chapter    text not null,
  sub        text not null default '',
  imp        smallint not null default 2 check (imp between 1 and 3),
  text       text not null default '',
  answer     text not null default '',
  files      jsonb not null default '[]'::jsonb,
  reviewed   boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists items_user_created_idx on public.items (user_id, created_at desc);

alter table public.items enable row level security;
create policy "items_select_own" on public.items for select to authenticated using (user_id = (select auth.uid()));
create policy "items_insert_own" on public.items for insert to authenticated with check (user_id = (select auth.uid()));
create policy "items_update_own" on public.items for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "items_delete_own" on public.items for delete to authenticated using (user_id = (select auth.uid()));

-- Chapters and sub-topics you add yourself
create table if not exists public.user_meta (
  user_id  uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  chapters jsonb not null default '[]'::jsonb,
  subs     jsonb not null default '[]'::jsonb
);

alter table public.user_meta enable row level security;
create policy "meta_select_own" on public.user_meta for select to authenticated using (user_id = (select auth.uid()));
create policy "meta_insert_own" on public.user_meta for insert to authenticated with check (user_id = (select auth.uid()));
create policy "meta_update_own" on public.user_meta for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "meta_delete_own" on public.user_meta for delete to authenticated using (user_id = (select auth.uid()));

-- Private bucket for photos and PDFs (20 MB per file), one folder per user
insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', false, 20971520)
on conflict (id) do nothing;

create policy "files_select_own" on storage.objects for select to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "files_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "files_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
