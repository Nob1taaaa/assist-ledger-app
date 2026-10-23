create table if not exists public.model_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  repository text not null,
  pull_request_number integer,
  provider text not null,
  model text not null,
  prompt_tokens integer not null default 0 check (prompt_tokens >= 0),
  completion_tokens integer not null default 0 check (completion_tokens >= 0),
  latency_ms bigint check (latency_ms is null or latency_ms >= 0),
  estimated_cost_usd numeric(12, 8) not null default 0 check (estimated_cost_usd >= 0),
  created_at timestamptz not null default now()
);

create index if not exists model_usage_user_repo_created_idx
  on public.model_usage (user_id, repository, created_at desc);

alter table public.model_usage enable row level security;
drop policy if exists "Users can read their model usage" on public.model_usage;
create policy "Users can read their model usage"
  on public.model_usage for select to authenticated
  using (user_id = (select auth.uid()));
grant select on public.model_usage to authenticated;
revoke all on public.model_usage from anon;
revoke insert, update, delete on public.model_usage from authenticated;
