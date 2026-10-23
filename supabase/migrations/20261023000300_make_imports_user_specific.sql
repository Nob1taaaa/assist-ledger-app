alter table public.pull_requests
  alter column user_id set not null;

alter table public.pull_requests
  drop constraint if exists pull_requests_repository_github_number_key;

alter table public.pull_requests
  add constraint pull_requests_user_repository_pr_key
  unique (user_id, repository, github_number);
