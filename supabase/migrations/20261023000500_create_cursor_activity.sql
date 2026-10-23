create table if not exists public.cursor_activity (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  repository text not null,
  source text not null check (source in ('cursor_agent', 'cursor_tab')),
  model text,
  conversation_id text,
  generation_id text,
  edits_count integer not null default 0 check (edits_count >= 0),
  changed_chars integer not null default 0 check (changed_chars >= 0),
  created_at timestamptz not null default now()
);

create index if not exists cursor_activity_user_repo_created_idx
  on public.cursor_activity (user_id, repository, created_at desc);

alter table public.cursor_activity enable row level security;
drop policy if exists "Users can read their cursor activity" on public.cursor_activity;
create policy "Users can read their cursor activity"
  on public.cursor_activity for select to authenticated
  using (user_id = (select auth.uid()));
grant select on public.cursor_activity to authenticated;
revoke all on public.cursor_activity from anon;
revoke insert, update, delete on public.cursor_activity from authenticated;
