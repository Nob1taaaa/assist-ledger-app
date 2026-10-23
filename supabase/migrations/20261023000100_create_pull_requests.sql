create table if not exists public.pull_requests (
  id bigint generated always as identity primary key,
  repository text not null,
  github_number integer not null,
  title text not null,
  author text not null,
  state text not null check (state in ('open', 'closed')),
  draft boolean not null default false,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  merged_at timestamptz,
  additions integer not null default 0,
  deletions integer not null default 0,
  url text not null,
  imported_at timestamptz not null default now(),
  unique (repository, github_number)
);

create index if not exists pull_requests_repository_updated_idx
  on public.pull_requests (repository, updated_at desc);

alter table public.pull_requests enable row level security;

-- PR fields are public on GitHub. Browser clients can read, but writes stay server-side.
drop policy if exists "Anyone can read imported public repository PRs" on public.pull_requests;
create policy "Anyone can read imported public repository PRs"
  on public.pull_requests for select to anon, authenticated using (true);

grant select on public.pull_requests to anon, authenticated;
revoke insert, update, delete on public.pull_requests from anon, authenticated;
