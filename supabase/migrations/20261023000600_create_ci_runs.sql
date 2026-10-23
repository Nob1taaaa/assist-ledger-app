create table if not exists public.ci_runs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  repository text not null,
  pull_request_number integer not null check (pull_request_number > 0),
  workflow_run_id bigint not null,
  workflow_name text not null,
  conclusion text not null check (conclusion in ('success', 'failure', 'cancelled', 'skipped', 'timed_out', 'action_required', 'neutral', 'stale', 'startup_failure')),
  duration_seconds integer not null check (duration_seconds >= 0),
  url text not null,
  completed_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (user_id, repository, workflow_run_id, pull_request_number)
);

create index if not exists ci_runs_user_repo_pr_completed_idx
  on public.ci_runs (user_id, repository, pull_request_number, completed_at desc);

alter table public.ci_runs enable row level security;
drop policy if exists "Users can read their CI runs" on public.ci_runs;
create policy "Users can read their CI runs"
  on public.ci_runs for select to authenticated
  using (user_id = (select auth.uid()));
grant select on public.ci_runs to authenticated;
revoke all on public.ci_runs from anon;
revoke insert, update, delete on public.ci_runs from authenticated;
