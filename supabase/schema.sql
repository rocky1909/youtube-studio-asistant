-- Team infrastructure for optional Supabase-backed auth, storage, and history.
-- The app can run without these env vars; this schema is for when Supabase is connected.

create extension if not exists pgcrypto;

create table if not exists public.team_projects (
  id uuid primary key default gen_random_uuid(),
  project_id text not null unique,
  name text not null default '',
  owner_user_id uuid null references auth.users (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_project_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references public.team_projects (project_id) on delete cascade,
  snapshot_type text not null default 'default',
  payload jsonb not null,
  created_by text null,
  origin text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_project_history (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references public.team_projects (project_id) on delete cascade,
  event_type text not null,
  payload jsonb not null,
  created_by text null,
  origin text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists team_project_snapshots_project_id_created_at_idx
  on public.team_project_snapshots (project_id, created_at desc);

create index if not exists team_project_history_project_id_created_at_idx
  on public.team_project_history (project_id, created_at desc);

create or replace function public.team_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists team_projects_touch_updated_at on public.team_projects;
create trigger team_projects_touch_updated_at
before update on public.team_projects
for each row execute function public.team_touch_updated_at();

drop trigger if exists team_project_snapshots_touch_updated_at on public.team_project_snapshots;
create trigger team_project_snapshots_touch_updated_at
before update on public.team_project_snapshots
for each row execute function public.team_touch_updated_at();

drop trigger if exists team_project_history_touch_updated_at on public.team_project_history;
create trigger team_project_history_touch_updated_at
before update on public.team_project_history
for each row execute function public.team_touch_updated_at();

alter table public.team_projects enable row level security;
alter table public.team_project_snapshots enable row level security;
alter table public.team_project_history enable row level security;

drop policy if exists "team_projects_select_own" on public.team_projects;
create policy "team_projects_select_own"
  on public.team_projects
  for select
  using (auth.uid() = owner_user_id);

drop policy if exists "team_projects_write_own" on public.team_projects;
create policy "team_projects_write_own"
  on public.team_projects
  for insert
  with check (auth.uid() = owner_user_id);

drop policy if exists "team_projects_update_own" on public.team_projects;
create policy "team_projects_update_own"
  on public.team_projects
  for update
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

drop policy if exists "team_project_snapshots_select_own" on public.team_project_snapshots;
create policy "team_project_snapshots_select_own"
  on public.team_project_snapshots
  for select
  using (
    exists (
      select 1
      from public.team_projects p
      where p.project_id = team_project_snapshots.project_id
        and p.owner_user_id = auth.uid()
    )
  );

drop policy if exists "team_project_snapshots_write_own" on public.team_project_snapshots;
create policy "team_project_snapshots_write_own"
  on public.team_project_snapshots
  for insert
  with check (
    exists (
      select 1
      from public.team_projects p
      where p.project_id = team_project_snapshots.project_id
        and p.owner_user_id = auth.uid()
    )
  );

drop policy if exists "team_project_history_select_own" on public.team_project_history;
create policy "team_project_history_select_own"
  on public.team_project_history
  for select
  using (
    exists (
      select 1
      from public.team_projects p
      where p.project_id = team_project_history.project_id
        and p.owner_user_id = auth.uid()
    )
  );

drop policy if exists "team_project_history_write_own" on public.team_project_history;
create policy "team_project_history_write_own"
  on public.team_project_history
  for insert
  with check (
    exists (
      select 1
      from public.team_projects p
      where p.project_id = team_project_history.project_id
        and p.owner_user_id = auth.uid()
    )
  );
