alter table public.pull_requests
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

drop policy if exists "Anyone can read imported public repository PRs" on public.pull_requests;
drop policy if exists "Users can read their imported repository PRs" on public.pull_requests;

create policy "Users can read their imported repository PRs"
  on public.pull_requests for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.pull_requests from anon;
revoke insert, update, delete on public.pull_requests from authenticated;
grant select on public.pull_requests to authenticated;
