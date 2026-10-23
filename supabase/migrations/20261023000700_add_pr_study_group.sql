alter table public.pull_requests
  add column if not exists study_group text
  check (study_group is null or study_group in ('ai-assisted', 'human-only'));
